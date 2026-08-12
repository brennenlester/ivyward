#!/usr/bin/env bash
# Point the branded canonical play URL at the latest READY production deployment.
# Usage:
#   ./scripts/alias-canonical-play.sh
#   ./scripts/alias-canonical-play.sh <deployment-url>
set -euo pipefail

SCOPE="${VERCEL_SCOPE:-brennen1}"
PROJECT="${VERCEL_PROJECT:-ivyward}"
CANONICAL_HOST="${CANONICAL_PLAY_HOST:-ivyward-brennen1.vercel.app}"

resolve_latest_ready_production_url() {
  npx vercel@latest ls "$PROJECT" --prod --status READY --scope "$SCOPE" --format json 2>/dev/null \
    | node -e '
      const fs = require("fs");
      const raw = fs.readFileSync(0, "utf8");
      const data = JSON.parse(raw);
      const deployments = Array.isArray(data) ? data : data.deployments || [];
      const first = deployments.find((d) => d && d.url) || deployments[0];
      if (!first || !first.url) process.exit(2);
      process.stdout.write(String(first.url).replace(/^https?:\/\//, ""));
    '
}

if [[ $# -ge 1 ]]; then
  DEPLOYMENT_URL="$1"
else
  DEPLOYMENT_URL="$(resolve_latest_ready_production_url || true)"
fi

if [[ -z "${DEPLOYMENT_URL:-}" ]]; then
  echo "alias-canonical-play: could not resolve latest READY production deployment URL" >&2
  exit 1
fi

# Strip protocol if present
DEPLOYMENT_URL="${DEPLOYMENT_URL#https://}"
DEPLOYMENT_URL="${DEPLOYMENT_URL#http://}"

echo "Aliasing https://${CANONICAL_HOST} -> https://${DEPLOYMENT_URL}"
npx vercel@latest alias set "$DEPLOYMENT_URL" "$CANONICAL_HOST" --scope "$SCOPE"
echo "Done. Verify: curl -sL https://${CANONICAL_HOST}/ | head"
