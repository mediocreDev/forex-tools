#!/usr/bin/env bash
set -euo pipefail

ENV=$1
REPO="${GITHUB_REPOSITORY}"
OWNER="${GITHUB_REPOSITORY_OWNER}"
REPO_NAME=$(basename "$REPO")
SHA_SHORT=$(echo "$GITHUB_SHA" | cut -c1-7)

export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"

# ── Domain mapping ─────────────────────────────────────────
case "$ENV" in
  dev)    DOMAIN="https://forextoolsdev.americ.io.vn" ;;
  master) DOMAIN="https://forextools.americ.io.vn" ;;
  *)      DOMAIN="(unknown)" ;;
esac

IMAGE_NAME="forextools-${ENV}"
CURRENT_TAG="ghcr.io/${OWNER}/${IMAGE_NAME}:${GITHUB_SHA}"
RUN_URL="${GITHUB_SERVER_URL}/${REPO}/actions/runs/${GITHUB_RUN_ID}"
VAR_NAME="LAST_GOOD_SHA_${ENV^^}"

# ── Parse job results into Markdown table ──────────────────
TABLE="| Job | Result |"$'\n'"|-----|--------|"
ANY_FAIL=false
DEPLOY_RESULT="skipped"

while IFS="=" read -r JOB RES; do
  case $RES in
    success)   ICON="✅" ;;
    failure)   ICON="❌"; ANY_FAIL=true ;;
    skipped)   ICON="⚪" ;;
    cancelled) ICON="🛑"; ANY_FAIL=true ;;
    *)         ICON="❓" ;;
  esac
  [[ "$JOB" == "deploy" ]] && DEPLOY_RESULT="$RES"
  TABLE+=$'\n'"| ${JOB} | ${ICON} ${RES} |"
done < <(jq -r 'to_entries[] | "\(.key)=\(.value.result)"' <<<"$JOB_STATUS_JSON")

# ── Track last good SHA ────────────────────────────────────
ROLLBACK_SHA=""
ROLLBACK_SOURCE=""

if [[ "$DEPLOY_RESULT" == "success" ]]; then
  # Save current SHA as the last known good
  if gh api "repos/${OWNER}/${REPO_NAME}/actions/variables/${VAR_NAME}" --jq '.id' >/dev/null 2>&1; then
    gh api -X PATCH -H "Accept: application/vnd.github+json" \
      "repos/${OWNER}/${REPO_NAME}/actions/variables/${VAR_NAME}" \
      -f value="$GITHUB_SHA" >/dev/null 2>&1 || echo "⚠️ Failed to update $VAR_NAME"
  else
    gh api -X POST -H "Accept: application/vnd.github+json" \
      "repos/${OWNER}/${REPO_NAME}/actions/variables" \
      -f name="${VAR_NAME}" -f value="$GITHUB_SHA" >/dev/null 2>&1 || echo "⚠️ Failed to create $VAR_NAME"
  fi
  ROLLBACK_SHA="$GITHUB_SHA"
  ROLLBACK_SOURCE="(this deploy)"
else
  # Look up last known good SHA
  ROLLBACK_SHA=$(gh api -H "Accept: application/vnd.github+json" \
    "repos/${OWNER}/${REPO_NAME}/actions/variables/${VAR_NAME}" \
    --jq '.value' 2>/dev/null || true)

  if [[ -z "$ROLLBACK_SHA" || "$ROLLBACK_SHA" == "null" || "$ROLLBACK_SHA" == *"Not Found"* ]]; then
    ROLLBACK_SHA="$GITHUB_SHA"
    ROLLBACK_SOURCE="(⚠️ no recorded good deploy — fallback to current)"
  else
    ROLLBACK_SOURCE="(last successful deploy)"
  fi
fi

ROLLBACK_SHA_SHORT=$(echo "$ROLLBACK_SHA" | cut -c1-7)
ROLLBACK_TAG="ghcr.io/${OWNER}/${IMAGE_NAME}:${ROLLBACK_SHA}"

# ── Build conclusion message ───────────────────────────────
if [[ "$ANY_FAIL" == true ]]; then
  STATUS="❌ Some jobs failed in **${ENV}** (\`${SHA_SHORT}\`)."
else
  STATUS="✅ All jobs passed in **${ENV}** (\`${SHA_SHORT}\`)."
fi

if [[ "$ANY_FAIL" == false ]]; then
  HEADER="${STATUS}
🔗 [Open App](${DOMAIN}) | 📜 [View Logs](${RUN_URL})"
else
  HEADER="${STATUS}
📜 [View Logs](${RUN_URL})"
fi

CONCLUSION="${HEADER}

🖼 **Image:** \`${CURRENT_TAG}\`
🔄 **Rollback:** \`${ROLLBACK_SHA_SHORT}\` ${ROLLBACK_SOURCE}
\`\`\`bash
cd /opt/projects/forextools-${ENV}
export IMAGE_TAG=${ROLLBACK_TAG}
docker compose -f docker-compose.yml -f docker-compose.${ENV}.yml up -d --force-recreate
\`\`\`"

# ── Write to GitHub Step Summary ──────────────────────────
{
  echo "### 🚀 Workflow Summary"
  echo ""
  printf "%b\n" "$TABLE"
  echo ""
  echo "$CONCLUSION"
} >> "$GITHUB_STEP_SUMMARY"

# ── Sticky PR comment ─────────────────────────────────────
PR_NUMBER=$(jq --raw-output .pull_request.number "$GITHUB_EVENT_PATH" 2>/dev/null || true)
if [[ -n "$PR_NUMBER" && "$PR_NUMBER" != "null" ]]; then
  BODY="### 🚀 Workflow Summary"$'\n\n'"$(printf "%b\n" "$TABLE")"$'\n\n'"$CONCLUSION"

  COMMENT_ID=$(gh api "repos/${OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments" \
    --jq '.[] | select(.user.type=="Bot" and (.body | contains("🚀 Workflow Summary"))).id' 2>/dev/null || true)

  if [[ -n "$COMMENT_ID" ]]; then
    gh api "repos/${OWNER}/${REPO_NAME}/issues/comments/${COMMENT_ID}" \
      -X PATCH -f "body=$BODY" >/dev/null 2>&1 || echo "⚠️ Failed to update PR comment"
  else
    gh api "repos/${OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments" \
      -X POST -f "body=$BODY" >/dev/null 2>&1 || echo "⚠️ Failed to post PR comment"
  fi
fi
