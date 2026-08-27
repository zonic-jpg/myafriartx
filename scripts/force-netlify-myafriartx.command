#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
ROOT="/Users/olufemiadeagbo/Downloads/artstage-8"
cd "$ROOT"
TOKEN="$(python3 -c "import json;print(json.load(open('$HOME/Library/Preferences/netlify/config.json'))['users']['69d9d210366e2998422ec62d']['auth']['token'])")"
export NETLIFY_AUTH_TOKEN="$TOKEN"
export NETLIFY_SITE_ID="7717c70f-3e72-444c-b7c0-9d96f705f60c"

echo "==> Build SPA (base /)"
rm -rf dist
npx vite build --config vite.config.netlify.ts
cp dist/client/_shell.html dist/client/index.html
cp dist/client/_shell.html dist/client/404.html
printf '/*    /index.html   200\n' > dist/client/_redirects

echo "==> Digest deploy"
node scripts/netlify-digest-deploy.mjs dist/client | tee /tmp/myafriartx-deploy.json

echo "==> Verify"
for i in $(seq 1 20); do
  HC=$(curl -s -o /tmp/mafx.html -w '%{http_code}' -L "https://myafriartx.netlify.app/" || echo 000)
  if [[ "$HC" == "200" ]] && grep -q 'index-DXa1z8xM.js' /tmp/mafx.html 2>/dev/null; then
    echo "LIVE OK attempt $i HTTP=$HC"
    exit 0
  fi
  echo "wait $i HTTP=$HC"; sleep 5
done
echo "VERIFY FAILED"; exit 1
