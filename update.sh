#!/bin/bash
set -e
cd "$(dirname "$0")"

# Refresh the two source exports. Curation of relation_uex-rsi.json is manual
# (see NOTES.md) — this script intentionally does NOT commit or push.
echo "Downloading ships from RSI..."
node get_ships_from_rsi.js
echo "Downloading ships from UEX..."
node get_ships_from_uex.js

echo ""
echo "Source exports refreshed. Next:"
echo "  1. Reconcile relation_uex-rsi.json for any added/removed ships (see NOTES.md)."
echo "  2. Run ./main.sh to regenerate index.html."
echo "  3. Review 'git diff', then commit."
