#!/usr/bin/env bash
set -euo pipefail

ENV=$1

# Enable debug mode if DEBUG=1
if [[ "${DEBUG:-0}" == "1" ]]; then
  set -x
  echo "🔎 Raw JOB_STATUS_JSON: $JOB_STATUS_JSON" >&2
fi

REPO="${GITHUB_REPOSITORY}"
OWNER="${GITHUB_REPOSITORY_OWNER}"
SHA_SHORT=$(echo "$GITHUB_SHA" | cut -c1-7)

# Ensure gh sees a token
export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
export GITHUB_TOKEN="$GH_TOKEN"

# --- Domain mapping ---
case "$ENV" in
  dev)    DOMAIN="https://forextoolsdev.americ.io.vn" ;;
  master) DOMAIN="https://forextools.americ.io.vn" ;;
  *)      DOMAIN="(unknown)" ;;
esac

IMAGE_NAME="forextools-${ENV}"
CURRENT_TAG="ghcr.io/${OWNER}/${IMAGE_NAME}:${GITHUB_SHA}"
RUN_URL="${GITHUB_SERVER_URL}/${REPO}/actions/runs/${GITHUB_RUN_ID}"
VAR_NAME="LAST_GOOD_SHA_${ENV^^}" # e.g. LAST_GOOD_SHA_DEV

# --- Parse results into Markdown table ---
TABLE="| Job | Result |"$'\n'"|-----|---------|"
ANY_FAIL=false
ANY_SKIP=false
DEPLOY_RESULT="skipped"

CLEAN_JSON="$JOB_STATUS_JSON"

if [[ "${DEBUG:-0}" == "1" ]]; then
  echo "🔎 Cleaned JSON: $CLEAN_JSON" >&2
fi

while IFS="=" read -r JOB RES; do
  case $RES in
    success)   ICON="✅" ;;
    failure)   ICON="❌"; ANY_FAIL=true ;;
    skipped)
      ICON="⚪"
      case $JOB in
        cleanup-*|build-release|build-preview|deploy) : ;; # ignore these skips
        *) ANY_SKIP=true ;;
      esac
      ;;
    cancelled) ICON="🛑"; ANY_FAIL=true ;;
    *)         ICON="❓" ;;
  esac
  [[ "$JOB" == "deploy" ]] && DEPLOY_RESULT="$RES"
  TABLE="${TABLE}"$'\n'"| ${JOB} | ${ICON} ${RES} |"
done < <(jq -r 'to_entries[] | "\(.key)=\(.value.result)"' <<<"$CLEAN_JSON")

# --- Determine rollback target ---
ROLLBACK_SHA=""
ROLLBACK_SOURCE=""

if [[ "$DEPLOY_RESULT" == "success" ]]; then
  if gh api "repos/${OWNER}/$(basename "$REPO")/actions/variables/${VAR_NAME}" --jq '.id' >/dev/null 2>&1; then
    gh api -X PATCH -H "Accept: application/vnd.github+json" \
      "repos/${OWNER}/$(basename "$REPO")/actions/variables/${VAR_NAME}" \
      -f value="$GITHUB_SHA" >/dev/null 2>&1 || echo "⚠️ Failed to update repo variable"
  else
    gh api -X POST -H "Accept: application/vnd.github+json" \
      "repos/${OWNER}/$(basename "$REPO")/actions/variables" \
      -f name="${VAR_NAME}" -f value="$GITHUB_SHA" >/dev/null 2>&1 || echo "⚠️ Failed to create repo variable"
  fi
  ROLLBACK_SHA="$GITHUB_SHA"
  ROLLBACK_SOURCE="(this successful deploy)"
else
  # Try repo variable first (safe)
  ROLLBACK_SHA=$(
    gh api -H "Accept: application/vnd.github+json" \
      "repos/${OWNER}/$(basename "$REPO")/actions/variables/${VAR_NAME}" \
      --jq '.value' 2>/dev/null || true
  )
  if [[ -n "$ROLLBACK_SHA" && "$ROLLBACK_SHA" != "null" && "$ROLLBACK_SHA" != *"Not Found"* && "$ROLLBACK_SHA" != *"message"* ]]; then
    ROLLBACK_SOURCE="(last known successful deploy from repo variable)"
  else
    ROLLBACK_SHA=""
    echo "ℹ️ Fetching last good image from GHCR history..."
    if [[ "$OWNER" == "$GITHUB_ACTOR" ]]; then
      BASE_PATH="/user/packages/container/${IMAGE_NAME}"
    else
      BASE_PATH="/orgs/${OWNER}/packages/container/${IMAGE_NAME}"
    fi

    ROLLBACK_SHA=$(gh api -H "Accept: application/vnd.github+json" \
      "$BASE_PATH/versions?per_page=100" --paginate \
      --jq '[.[] 
             | .metadata.container.tags[]? 
             | select(test("^[0-9a-f]{40}$"))] 
             | map(select(. != "'"${GITHUB_SHA}"'")) 
             | first' 2>/dev/null || true)

    # sanitize bad responses
    if [[ -z "$ROLLBACK_SHA" || "$ROLLBACK_SHA" == "null" || "$ROLLBACK_SHA" == *"Not Found"* || "$ROLLBACK_SHA" == *"message"* ]]; then
      echo "⚠️ No recorded successful deploy found in GHCR — using current commit as rollback fallback."
      ROLLBACK_SHA="$GITHUB_SHA"
      ROLLBACK_SOURCE="(⚠️ no recorded success, fallback to current — may be broken)"
    else
      ROLLBACK_SOURCE="(last known successful image from GHCR history)"
    fi
  fi
fi

ROLLBACK_SHA_SHORT=$(echo "$ROLLBACK_SHA" | cut -c1-7)
ROLLBACK_TAG="ghcr.io/${OWNER}/${IMAGE_NAME}:${ROLLBACK_SHA}"

ROLLBACK=$(cat <<EOF
\`\`\`bash
docker pull ${ROLLBACK_TAG}
docker tag ${ROLLBACK_TAG} ${IMAGE_NAME}
docker compose -f docker-compose.yml -f docker-compose.${ENV}.yml up -d --force-recreate
\`\`\`
EOF
)

# --- Status line ---
if [[ "$ANY_FAIL" == true ]]; then
  STATUS_LINE="❌ Some jobs failed in **${ENV}** (\`${SHA_SHORT}\`)."
elif [[ "$ANY_SKIP" == true ]]; then
  STATUS_LINE="⚪ Some jobs skipped in **${ENV}** (\`${SHA_SHORT}\`)."
else
  STATUS_LINE="✅ All jobs succeeded in **${ENV}** (\`${SHA_SHORT}\`)."
fi

# --- Build conclusion message ---
CONCLUSION="${STATUS_LINE}  
📜 [View Logs](${RUN_URL})

🖼 **Current Image:** \`${CURRENT_TAG}\`  
🔄 **Rollback to:** \`${ROLLBACK_SHA_SHORT}\` ${ROLLBACK_SOURCE}  
${ROLLBACK}"

if [[ "$ANY_FAIL" == false && "$ANY_SKIP" == false ]]; then
  CONCLUSION="✅ All jobs succeeded in **${ENV}** (\`${SHA_SHORT}\`).  
🔗 [Open App](${DOMAIN}) | 📜 [View Logs](${RUN_URL})

🖼 **Current Image:** \`${CURRENT_TAG}\`  
🔄 **Rollback to:** \`${ROLLBACK_SHA_SHORT}\` ${ROLLBACK_SOURCE}  
${ROLLBACK}"
fi

# --- Append to GitHub Step Summary ---
{
  echo "### 🚀 Workflow Summary"
  echo ""
  printf "%b\n" "$TABLE"
  echo ""
  echo "$CONCLUSION"
} >> "$GITHUB_STEP_SUMMARY"

# --- Sticky PR Comment ---
PR_NUMBER=$(jq --raw-output .pull_request.number "$GITHUB_EVENT_PATH" 2>/dev/null || true)
if [[ "$PR_NUMBER" != "null" && -n "$PR_NUMBER" ]]; then
  if ! command -v gh &>/dev/null; then
    echo "⚠️ GitHub CLI not available, skipping PR comment"
    exit 0
  fi

  COMMENT_BODY="### 🚀 Workflow Summary"$'\n\n'"$(printf "%b\n" "$TABLE")"$'\n\n'"$CONCLUSION"

  COMMENT_ID=$(gh api repos/${OWNER}/$(basename "$REPO")/issues/${PR_NUMBER}/comments \
    --jq '.[] | select(.user.type=="Bot" and (.body | contains("🚀 Workflow Summary"))).id' 2>/dev/null || true)

  if [[ -n "$COMMENT_ID" ]]; then
    gh api repos/${OWNER}/$(basename "$REPO")/issues/comments/${COMMENT_ID} \
      -X PATCH -f "body=$COMMENT_BODY" >/dev/null 2>&1 || echo "⚠️ Failed to update PR comment"
  else
    gh api repos/${OWNER}/$(basename "$REPO")/issues/${PR_NUMBER}/comments \
      -X POST -f "body=$COMMENT_BODY" >/dev/null 2>&1 || echo "⚠️ Failed to post PR comment"
  fi
fi
