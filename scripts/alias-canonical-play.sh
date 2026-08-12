#!/usr/bin/env bash
# Point the branded canonical play URL at the latest production deployment.
# Usage:
#   ./scripts/alias-canonical-play.sh
#   ./scripts/alias-canonical-play.sh <deployment-url>
set -euo pipefail

SCOPE="${VERCEL_SCOPE:-brennen1}"
PROJECT="${VERCEL_PROJECT:-ivyward}"
CANONICAL_HOST="${CANONICAL_PLAY_HOST:-ivyward-brennen1.vercel.app}"

if [[ $# -ge 1 ]]; then
  DEPLOYMENT_URL="$1"
else
  # `vercel ls --prod` prints a table; extract the first ivyward deployment URL.
  DEPLOYMENT_URL="$(
    npx vercel@latest ls "$PROJECT" --prod --scope "$SCOPE" 2>/dev/null \
      | grep -oE 'https://ivyward-[a-z0-9]+-brennen1\.vercel\.app' \
      | head -1
  )"
fi

if [[ -z "${DEPLOYMENT_URL:-}" ]]; then
  echo "alias-canonical-play: could not resolve latest production deployment URL" >&2
  exit 1
fi

# Strip protocol if present
DEPLOYMENT_URL="${DEPLOYMENT_URL#https://}"
DEPLOYMENT_URL="${DEPLOYMENT_URL#http://}"

echo "Aliasing https://${CANONICAL_HOST} -> https://${DEPLOYMENT_URL}"
npx vercel@latest alias set "$DEPLOYMENT_URL" "$CANONICAL_HOST" --scope "$SCOPE"
echo "Done. Verify: curl -sL https://${CANONICAL_HOST}/ | head"
