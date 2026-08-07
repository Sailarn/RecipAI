#!/bin/bash
set -euo pipefail

PASS="✅"
FAIL="❌"
WARN="⚠️"
RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"

MODE="cloud"
SKIP_MIGRATION_CHECK=false

for arg in "$@"; do
  case "$arg" in
    --mode=cloud) MODE="cloud" ;;
    --mode=local) MODE="local" ;;
    --skip-migration-check) SKIP_MIGRATION_CHECK=true ;;
    -h|--help)
      echo "Usage: scripts/release.sh [--mode=cloud|local] [--skip-migration-check]"
      echo ""
      echo "  --mode=cloud   (default) push to main; GitHub Actions runs CI, bumps"
      echo "                 the version, and deploys to Vercel."
      echo "  --mode=local   run the same pipeline locally: CI checks, version bump,"
      echo "                 deploy to Vercel, deploy to the Pi. Use this only when"
      echo "                 GitHub Actions is unavailable."
      echo "  --skip-migration-check   bypass the pending-migration guard in local"
      echo "                 mode, e.g. if you already applied the migration by hand."
      exit 0
      ;;
    *)
      echo -e "${RED}${FAIL} Unknown argument: $arg${RESET}"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

fail() {
  echo -e "${RED}${BOLD}$1${RESET}"
  exit 1
}

step_header() {
  echo ""
  echo -e "${BOLD}$1${RESET}"
  echo "──────────────────────────"
}

preflight() {
  step_header "Preflight"

  local currentBranch
  currentBranch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$currentBranch" != "main" ]; then
    fail "${FAIL} On branch '$currentBranch' — release must run from main."
  fi
  echo -e "${GREEN}${PASS}${RESET} On main"

  if [ -n "$(git status --porcelain)" ]; then
    fail "${FAIL} Working tree is dirty — commit or stash changes first."
  fi
  echo -e "${GREEN}${PASS}${RESET} Working tree clean"

  git fetch origin main --quiet
  local localHead remoteHead
  localHead=$(git rev-parse HEAD)
  remoteHead=$(git rev-parse origin/main)
  if [ "$localHead" != "$remoteHead" ] && [ "$(git merge-base "$localHead" "$remoteHead")" = "$remoteHead" ]; then
    : # local is ahead of origin — expected, that's what we're about to push/release
  elif [ "$localHead" != "$remoteHead" ]; then
    fail "${FAIL} Local main has diverged from origin/main — pull/rebase first."
  fi
  echo -e "${GREEN}${PASS}${RESET} In sync with origin/main"
}

run_ci_checks() {
  step_header "CI checks (mirrors .github/workflows/ci.yml)"

  echo "Typecheck..."
  bun tsc --noEmit || fail "${FAIL} Typecheck failed"
  echo -e "${GREEN}${PASS}${RESET} Typecheck"

  echo "Lint (biome ci)..."
  bun biome ci . || fail "${FAIL} Biome ci failed"
  echo -e "${GREEN}${PASS}${RESET} Biome ci"

  echo "Tests..."
  bun run test -- --run || fail "${FAIL} Tests failed"
  echo -e "${GREEN}${PASS}${RESET} Tests"
}

check_pending_migrations() {
  step_header "Pending migration check"

  if [ "$SKIP_MIGRATION_CHECK" = true ]; then
    echo -e "${YELLOW}${WARN}${RESET} Skipped (--skip-migration-check)"
    return
  fi

  local lastTag newMigrations
  lastTag=$(git describe --tags --abbrev=0)
  newMigrations=$(git diff --name-only --diff-filter=A "$lastTag"..HEAD -- db/migrations/*.sql || true)

  if [ -z "$newMigrations" ]; then
    echo -e "${GREEN}${PASS}${RESET} No new migrations since $lastTag"
    return
  fi

  echo -e "${YELLOW}${WARN}${BOLD} New migration(s) since $lastTag:${RESET}"
  echo "$newMigrations" | sed 's/^/  /'
  echo ""
  echo "Apply it once, then re-run this script (Pi and Vercel share one database):"
  echo ""
  echo '  DATABASE_URL="$SUPABASE_MIGRATION_URL" bun run db:migrate'
  echo ""
  echo "Use the direct Supabase URL (port 5432) or the Supavisor session pooler"
  echo "for SUPABASE_MIGRATION_URL. See docs/how-to/deploy-vercel.md."
  echo ""
  echo "If you already applied it by hand, re-run with --skip-migration-check."
  fail "${FAIL} Stopping before version bump/deploy until the migration is applied"
}

version_bump() {
  step_header "Version bump (release-it --ci)"
  bunx release-it --ci || fail "${FAIL} release-it failed"
  echo -e "${GREEN}${PASS}${RESET} Version bumped, committed, tagged, pushed"
}

deploy_vercel() {
  step_header "Deploy: Vercel"

  local tokenArgs=()
  if [ -n "${VERCEL_TOKEN:-}" ]; then
    tokenArgs=(--token="$VERCEL_TOKEN")
  fi

  # macOS ships bash 3.2, where `"${arr[@]}"` on an *empty* array counts as an
  # unbound variable and `set -u` aborts — which killed the deploy after
  # release-it had already bumped, tagged and pushed. `${arr[@]+"${arr[@]}"}`
  # expands to nothing when empty and to the quoted elements otherwise.
  vercel pull --yes --environment=production ${tokenArgs[@]+"${tokenArgs[@]}"} || fail "${FAIL} vercel pull failed"
  vercel build --prod ${tokenArgs[@]+"${tokenArgs[@]}"} || fail "${FAIL} vercel build failed"
  vercel deploy --prebuilt --prod ${tokenArgs[@]+"${tokenArgs[@]}"} || fail "${FAIL} vercel deploy failed"
  echo -e "${GREEN}${PASS}${RESET} Deployed to Vercel"
}

deploy_pi() {
  step_header "Deploy: Pi"
  ssh recipai@recipai.local '~/deploy.sh' || fail "${FAIL} Pi deploy failed"
  echo -e "${GREEN}${PASS}${RESET} Deployed to Pi"
}

cloud_push() {
  step_header "Cloud mode"

  local localHead remoteHead
  localHead=$(git rev-parse HEAD)
  remoteHead=$(git rev-parse origin/main)
  if [ "$localHead" = "$remoteHead" ]; then
    echo -e "${GREEN}${PASS}${RESET} origin/main already up to date — nothing to push"
    return
  fi

  git push
  echo -e "${GREEN}${PASS}${RESET} Pushed to origin/main"
  echo "CI, version bump, and Vercel deploy will run automatically on GitHub Actions."
}

echo ""
echo -e "${BOLD}Release — mode: $MODE${RESET}"

preflight

if [ "$MODE" = "cloud" ]; then
  cloud_push
else
  run_ci_checks
  check_pending_migrations
  version_bump
  deploy_vercel
  deploy_pi
  echo ""
  echo -e "${GREEN}${BOLD}Release complete${RESET} 🚀"
fi
