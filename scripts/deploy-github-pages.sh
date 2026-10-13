#!/usr/bin/env bash
set -euo pipefail

# Uses the existing GitHub CLI login. Never force-pushes or changes visibility.
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repository="kimpeter/contxt"
command -v gh >/dev/null || { echo 'GitHub CLI (gh) is required.' >&2; exit 1; }
gh auth status --hostname github.com
python3 "$project_dir/scripts/build-site.py"
node "$project_dir/scripts/test-contact.mjs"

default_branch="$(gh api "repos/$repository" --jq .default_branch)"
checkout_dir="$(mktemp -d "${TMPDIR:-/tmp}/contxt-pages.XXXXXX")"
echo "Deploy checkout: $checkout_dir"
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
  clone "https://github.com/$repository.git" "$checkout_dir"
if git -C "$checkout_dir" rev-parse --verify HEAD >/dev/null 2>&1; then
  git -C "$checkout_dir" checkout "$default_branch"
else
  git -C "$checkout_dir" checkout --orphan "$default_branch"
fi

for site_file in index.html contxt.html CNAME .nojekyll; do
  cp "$project_dir/$site_file" "$checkout_dir/$site_file"
done
git -C "$checkout_dir" add -- index.html contxt.html CNAME .nojekyll
if ! git -C "$checkout_dir" diff --cached --quiet; then
  git -C "$checkout_dir" commit -m 'Publish CONTXT website with working contact form'
  git -C "$checkout_dir" -c credential.helper= \
    -c 'credential.helper=!gh auth git-credential' push origin "$default_branch"
fi

if gh api "repos/$repository/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$repository/pages" \
    -f build_type=legacy -f cname=contxt.im \
    -f "source[branch]=$default_branch" -f 'source[path]=/'
else
  gh api --method POST "repos/$repository/pages" \
    -f build_type=legacy -f "source[branch]=$default_branch" -f 'source[path]=/'
  gh api --method PUT "repos/$repository/pages" -f cname=contxt.im
fi
gh api "repos/$repository/pages" --jq '{status, html_url, cname, source, https_enforced}'
echo 'After DNS verification and certificate issuance, enable Enforce HTTPS in repository Settings > Pages.'
