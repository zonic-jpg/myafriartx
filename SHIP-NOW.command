#!/bin/bash
exec > /tmp/mafx-ship.log 2>&1
set -x
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
ROOT="/Users/olufemiadeagbo/Downloads/artstage-8"
cd "$ROOT"
TOKEN="$(python3 -c "import json;print(json.load(open('$HOME/Library/Preferences/netlify/config.json'))['users']['69d9d210366e2998422ec62d']['auth']['token'])")"
export NETLIFY_AUTH_TOKEN="$TOKEN"
export NETLIFY_SITE_ID="7717c70f-3e72-444c-b7c0-9d96f705f60c"
node scripts/netlify-digest-deploy.mjs dist/client | tee /tmp/myafriartx-deploy.json
# Git commit + push
STORE=$HOME/.myafriartx-gitstore
echo "gitdir: $STORE" > .git
git --git-dir="$STORE" config core.worktree "$(pwd)"
GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' /Users/olufemiadeagbo/Downloads/AdSpotX-COMPLETE/.env | head -1 | cut -d= -f2-)
git --git-dir="$STORE" add -A
git --git-dir="$STORE" status -sb
git --git-dir="$STORE" commit -m "$(cat <<'MSG'
Ship owner soft-session admin, Dotun Popoola editorial seed, media audit

Fix gate-mode admin logout (stub UI + Studio kick). Scrub disposable alice identities. Seed blog/discussions/auction/cert demos with rights-safe imagery. Deploy for mobile.
MSG
)" || true
git --git-dir="$STORE" remote remove origin 2>/dev/null || true
git --git-dir="$STORE" remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/zonic-jpg/myafriartx.git"
git --git-dir="$STORE" push -u origin HEAD:main --force
echo SHIP_DONE SHA=$(git --git-dir="$STORE" rev-parse HEAD)
