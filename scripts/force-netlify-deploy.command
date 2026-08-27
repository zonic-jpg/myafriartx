#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "/Users/olufemiadeagbo/Downloads/artstage-8"
export NETLIFY_AUTH_TOKEN="$(python3 - <<'PY'
import json, os
p = os.path.expanduser('~/Library/Preferences/netlify/config.json')
d = json.load(open(p))
print(d['users'][d['userId']]['auth']['token'])
PY
)"
node scripts/netlify-digest-deploy.mjs
