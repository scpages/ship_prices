#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Generating index.html from rsi_ships.json + uex_ships.json + relation_uex-rsi.json..."
node generate_website.js
echo "Done! Open index.html in your browser."
