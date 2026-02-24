#!/usr/bin/env bash
set -euo pipefail

# One-shot production hotfix:
# 1) Validate DATABASE_URL format
# 2) Update GitHub repo secret DATABASE_URL (if gh is available/authenticated)
# 3) Update Azure Container App secret database-url
# 4) Re-apply DATABASE_URL secretref env var
# 5) Verify /api/v1/health/live responds with HTTP 200

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-questionnaire-prod}"
CONTAINER_APP_NAME="${CONTAINER_APP_NAME:-ca-questionnaire-api-prod}"
HEALTH_PATH="${HEALTH_PATH:-/api/v1/health/live}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-20}"

DATABASE_URL_INPUT="${1:-${DATABASE_URL:-}}"

if [[ -z "${DATABASE_URL_INPUT}" ]]; then
  echo "Usage:"
  echo "  DATABASE_URL='postgresql://user:pass@host:5432/db?sslmode=require' $0"
  echo "  or"
  echo "  $0 'postgresql://user:pass@host:5432/db?sslmode=require'"
  exit 2
fi

if ! echo "${DATABASE_URL_INPUT}" | grep -Eq '^postgres(ql)?://'; then
  echo "Error: DATABASE_URL must start with postgres:// or postgresql://"
  exit 2
fi

# Prevent accidental use of example placeholder values.
if echo "${DATABASE_URL_INPUT}" | grep -Eq '://USER:|:PASSWORD@|:REAL_PASSWORD@|:YOUR_PASSWORD@|@HOST:|/DB(\?|$)'; then
  echo "Error: Placeholder DATABASE_URL detected. Replace USER/PASSWORD/HOST/DB placeholders with real values."
  exit 2
fi

echo "DATABASE_URL format is valid."

if command -v gh >/dev/null 2>&1; then
  GH_REPO_TARGET="${GH_REPO:-}"
  if [[ -z "${GH_REPO_TARGET}" ]]; then
    GH_REPO_TARGET="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  fi

  echo "Updating GitHub repo secret DATABASE_URL..."
  if [[ -n "${GH_REPO_TARGET}" ]]; then
    gh secret set DATABASE_URL -b "${DATABASE_URL_INPUT}" -R "${GH_REPO_TARGET}"
  else
    gh secret set DATABASE_URL -b "${DATABASE_URL_INPUT}"
  fi
  echo "GitHub secret updated."
else
  echo "gh CLI not found; skipped GitHub secret update."
fi

echo "Updating Azure Container App secret database-url..."
az containerapp secret set \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --secrets "database-url=${DATABASE_URL_INPUT}" \
  --output none

echo "Re-applying DATABASE_URL env var to secretref..."
az containerapp update \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --set-env-vars "DATABASE_URL=secretref:database-url" \
  --output none

echo "Restarting active Container App revision(s) so secret changes take effect..."
ACTIVE_REVISIONS="$(
  az containerapp revision list \
    --name "${CONTAINER_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query "[?properties.active==\`true\`].name" \
    -o tsv 2>/dev/null || true
)"

if [[ -z "${ACTIVE_REVISIONS}" ]]; then
  echo "Warning: No active revisions found to restart."
else
  while IFS= read -r rev; do
    if [[ -n "${rev}" ]]; then
      echo "Restarting revision: ${rev}"
      az containerapp revision restart \
        --name "${CONTAINER_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --revision "${rev}" \
        --output none || true
    fi
  done <<< "${ACTIVE_REVISIONS}"
fi

APP_URL="$(az containerapp show \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query properties.configuration.ingress.fqdn \
  -o tsv)"

echo "Application URL: https://${APP_URL}"
echo "Verifying health endpoint ${HEALTH_PATH}..."

ATTEMPT=1
until [[ "${ATTEMPT}" -gt "${MAX_ATTEMPTS}" ]]; do
  set +e
  HTTP_STATUS="$(curl --connect-timeout 5 --max-time 15 -s -o /dev/null -w "%{http_code}" "https://${APP_URL}${HEALTH_PATH}")"
  CURL_EXIT=$?
  set -e

  if [[ "${CURL_EXIT}" -eq 0 && "${HTTP_STATUS}" == "200" ]]; then
    echo "Hotfix successful: health check passed."
    exit 0
  fi

  echo "Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: status=${HTTP_STATUS}, curl_exit=${CURL_EXIT}"
  ATTEMPT=$((ATTEMPT + 1))
  sleep 15
done

echo "Hotfix applied, but health check still failing."
echo "Gathering diagnostics..."

az containerapp revision list \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "[].{name:name,active:properties.active,health:properties.healthState,traffic:properties.trafficWeight}" \
  -o table || true

az containerapp logs show \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --tail 200 || true

exit 1
