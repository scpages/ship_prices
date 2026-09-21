#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Fetching ship price data from api.uexcorp.space..."
node fetch.js

echo ""
git add vehicles.json pledge_prices.json buy_prices.json rent_prices.json

if git diff --staged --quiet; then
  echo "No changes in price data."
  exit 0
fi

git commit -m "Update ship price data"
git push
echo "Price data updated and pushed."
