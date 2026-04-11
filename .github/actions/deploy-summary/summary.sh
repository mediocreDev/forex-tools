#!/usr/bin/env bash
set -euo pipefail

ENV="$1"
MODE="$2"
RELEASE_TAG="${3:-}"

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

if [[ "$MODE" == "release" && -n "$RELEASE_TAG" ]]; then
  RELEASE_IMAGE="ghcr.io/${OWNER}/${IMAGE_NAME}:${RELEASE_TAG}"
fi

# ── Parse job results into Markdown table ──────────────────
TABLE="| Job | Result |"$'\n'"|-----|--------|"
ANY_FAIL=false

while IFS="=" read -r JOB RES; do
  case $RES in
    success)   ICON="✅" ;;
    failure)   ICON="❌"; ANY_FAIL=true ;;
    skipped)   ICON="⚪" ;;
    cancelled) ICON="🛑"; ANY_FAIL=true ;;
    *)         ICON="❓" ;;
  esac
  TABLE+=$'\n'"| ${JOB} | ${ICON} ${RES} |"
done < <(jq -r 'to_entries[] | "\(.key)=\(.value.result)"' <<<"$JOB_STATUS_JSON")

# ── Build conclusion message ───────────────────────────────
if [[ "$ANY_FAIL" == true ]]; then
  STATUS_LINE="❌ Some jobs failed in **${ENV}** (\`${SHA_SHORT}\`)."
  LINKS="📜 [View Logs](${RUN_URL})"
else
  STATUS_LINE="✅ All jobs passed in **${ENV}** (\`${SHA_SHORT}\`)."
  LINKS="🔗 [Open App](${DOMAIN}) | 📜 [View Logs](${RUN_URL})"
fi

case "$MODE" in
  pr-preview)
    CONCLUSION="${STATUS_LINE}
${LINKS}

🖼 **Preview image:** \`${CURRENT_TAG}\`"
    ;;
  pr-deploy)
    CONCLUSION="${STATUS_LINE}
${LINKS}

🖼 **Image:** \`${CURRENT_TAG}\`"
    ;;
  release)
    TAGS_URL="${GITHUB_SERVER_URL}/${REPO}/tags"
    NEXT_PATCH=$(awk -F. -v t="$RELEASE_TAG" 'BEGIN{sub(/^v/,"",t); split(t,a,"."); printf "v%d.%d.%d", a[1], a[2], a[3]+1}')
    CONCLUSION="${STATUS_LINE}
${LINKS}

🏷 **Release:** \`${RELEASE_TAG}\`
🖼 **Image:** \`${RELEASE_IMAGE}\` (also \`${CURRENT_TAG}\`, \`:latest\`)
📜 **All tags:** [view](${TAGS_URL})

#### To roll back
Push a new, higher tag pointing at an older commit:
\`\`\`bash
git tag -a ${NEXT_PATCH} <older-good-commit-sha> -m \"Rollback\"
git push origin ${NEXT_PATCH}
\`\`\`"
    ;;
  *)
    echo "⚠️ Unknown mode: $MODE" >&2
    CONCLUSION="${STATUS_LINE}
${LINKS}

🖼 **Image:** \`${CURRENT_TAG}\`"
    ;;
esac

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
