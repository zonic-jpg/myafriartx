#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# MyAfriArtX → GitHub Pages (static SPA) one-shot deploy.
#
# Publishes OUR ArtStage app to:  https://zonic-jpg.github.io/myafriartx/
# Repo:                           zonic-jpg/myafriartx  (created if missing)
# Method:                         gh-pages branch (root)  — no `workflow` scope
#                                 needed, unlike the Actions-based deploy.
#
# This is intentionally SEPARATE from the unrelated legacy myafriart.netlify.app
# site. It does NOT touch Netlify or the SSR/Supabase production path.
#
# Run it OUTSIDE the coding sandbox (it needs api.github.com + git push).
#   bash scripts/deploy-myafriartx.command
# or just double-click it in Finder.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

ROOT="/Users/olufemiadeagbo/Downloads/artstage-8"
OWNER="zonic-jpg"
REPO="myafriartx"
BASE_PATH="/myafriartx/"
PAGES_URL="https://${OWNER}.github.io/${REPO}/"
API="https://api.github.com"
cd "$ROOT"

# ── token: env → AdSpotX .env → this repo's git remote ───────────────────────
TOKEN="${GITHUB_TOKEN:-}"
if [[ -z "$TOKEN" && -f "/Users/olufemiadeagbo/Downloads/AdSpotX-COMPLETE/.env" ]]; then
  TOKEN="$(grep -E '^GITHUB_TOKEN=' /Users/olufemiadeagbo/Downloads/AdSpotX-COMPLETE/.env | head -1 | cut -d= -f2-)"
fi
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(git config --get remote.origin.url | sed -nE 's#https://x-access-token:([^@]+)@.*#\1#p' || true)"
fi
[[ -n "$TOKEN" ]] || { echo "ERROR: no GITHUB_TOKEN found"; exit 1; }
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
REMOTE="https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git"

echo "==> 1/5 Ensure repo ${OWNER}/${REPO} exists"
CODE=$(curl -s -o /tmp/mafx_repo.json -w '%{http_code}' "${AUTH[@]}" "${API}/repos/${OWNER}/${REPO}")
if [[ "$CODE" == "404" ]]; then
  echo "    creating (public, so Pages works on any plan)…"
  curl -s -o /tmp/mafx_create.json -w 'create=%{http_code}\n' "${AUTH[@]}" -X POST "${API}/user/repos" \
    -d "{\"name\":\"${REPO}\",\"private\":false,\"description\":\"MyAfriArtX — African art discovery, buy/bid & artstage room preview (static SPA demo).\",\"has_issues\":false,\"has_wiki\":false}"
else
  echo "    repo exists (HTTP ${CODE})"
fi

echo "==> 2/5 Build static SPA (${BASE_PATH})"
if [[ ! -d node_modules ]]; then npm ci; fi
rm -rf dist
npx vite build --config vite.config.static.ts
cp dist/client/_shell.html dist/client/index.html
cp dist/client/_shell.html dist/client/404.html
touch dist/client/.nojekyll

echo "==> 3/5 Push built site to gh-pages branch (root)"
PUB="$(mktemp -d)"
GD="${PUB}/gd"; WT="${PUB}/wt"; mkdir -p "$GD" "$WT"
export GIT_DIR="$GD" GIT_WORK_TREE="$WT"
git init -q
git symbolic-ref HEAD refs/heads/gh-pages
cp -R dist/client/. "$WT"/
touch "$WT/.nojekyll"
git add -A
git -c user.email="deploy@zonic.local" -c user.name="Zonic Deploy" commit -qm "Deploy MyAfriArtX static SPA ($(date -u +%Y%m%dT%H%M%SZ))"
git push -f "$REMOTE" gh-pages
unset GIT_DIR GIT_WORK_TREE
rm -rf "$PUB"

echo "==> 4/5 Enable GitHub Pages (source: gh-pages /)"
PCODE=$(curl -s -o /tmp/mafx_pages.json -w '%{http_code}' "${AUTH[@]}" "${API}/repos/${OWNER}/${REPO}/pages")
if [[ "$PCODE" == "404" ]]; then
  curl -s -o /tmp/mafx_pages_post.json -w 'pages_create=%{http_code}\n' "${AUTH[@]}" -X POST \
    "${API}/repos/${OWNER}/${REPO}/pages" -d '{"source":{"branch":"gh-pages","path":"/"}}'
else
  curl -s -o /tmp/mafx_pages_put.json -w 'pages_update=%{http_code}\n' "${AUTH[@]}" -X PUT \
    "${API}/repos/${OWNER}/${REPO}/pages" -d '{"source":{"branch":"gh-pages","path":"/"}}'
fi

echo "==> 5/5 Verify ${PAGES_URL} (Pages build can take 1-3 min)"
LIVE="no"
for i in $(seq 1 30); do
  HC=$(curl -s -o /tmp/mafx_home.html -w '%{http_code}' -L "$PAGES_URL" || echo 000)
  if [[ "$HC" == "200" ]] && grep -qa 'myafriartx' /tmp/mafx_home.html; then
    LIVE="yes"; echo "    LIVE ✅  HTTP 200 and renders (attempt $i)"; break
  fi
  echo "    waiting… attempt $i HTTP=$HC"; sleep 10
done

echo
echo "──────────── RESULT ────────────"
echo "repo      = https://github.com/${OWNER}/${REPO}"
echo "pages_url = ${PAGES_URL}"
echo "live      = ${LIVE}"
echo "admin     = orbit gate password (any email) · owner = oadeagbo@gmail.com"
[[ "$LIVE" == "yes" ]] || echo "NOTE: if still not 200, give Pages another minute then reload; 404 usually means the first build is still running."
