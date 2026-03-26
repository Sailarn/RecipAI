#!/bin/bash

PASS="✅"
FAIL="❌"
WARN="⚠️"
RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"

echo ""
echo -e "${BOLD}Running checks...${RESET}"
echo "──────────────────────────"

# TypeScript
TSC_OUTPUT=$(bun run typecheck 2>&1)
TSC_EXIT=$?
if [ $TSC_EXIT -eq 0 ]; then
  echo -e "${GREEN}${PASS} TypeScript${RESET}   no errors"
else
  echo -e "${RED}${FAIL} TypeScript${RESET}"
  echo "$TSC_OUTPUT" | grep "error TS" | head -5
fi

echo "──────────────────────────"

# Biome
BIOME_OUTPUT=$(bun run lint 2>&1)
BIOME_EXIT=$?
ERRORS=$(echo "$BIOME_OUTPUT" | grep -c "error" || true)
WARNINGS=$(echo "$BIOME_OUTPUT" | grep -c "warn" || true)
if [ $BIOME_EXIT -eq 0 ]; then
  echo -e "${GREEN}${PASS} Biome${RESET}         no errors"
else
  echo -e "${YELLOW}${WARN} Biome${RESET}         ${ERRORS} errors, ${WARNINGS} warnings"
  echo "$BIOME_OUTPUT" | grep "error" | head -5
fi

echo "──────────────────────────"

# Tests
TEST_OUTPUT=$(bun run test --run 2>&1)
TEST_EXIT=$?
PASSED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ pass' | grep -oE '[0-9]+' || echo "0")
FAILED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ fail' | grep -oE '[0-9]+' || echo "0")
if [ $TEST_EXIT -eq 0 ]; then
  echo -e "${GREEN}${PASS} Tests${RESET}         ${PASSED} passed"
else
  echo -e "${RED}${FAIL} Tests${RESET}         ${PASSED} passed, ${FAILED} failed"
  echo "$TEST_OUTPUT" | grep "FAIL" | head -5
fi

echo "──────────────────────────"

# Final verdict
if [ $TSC_EXIT -eq 0 ] && [ $BIOME_EXIT -eq 0 ] && [ $TEST_EXIT -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed${RESET} 🚀"
else
  echo -e "${RED}${BOLD}Some checks failed${RESET}"
  exit 1
fi

echo ""