#!/usr/bin/env node
const fs = require("fs");

const BASE = "https://api.uexcorp.space/2.0";
const HEADERS = { "Accept": "application/json", "User-Agent": "scpages-ship-prices/1.0" };

async function get(path) {
  const resp = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${path}`);
  const d = await resp.json();
  if (d.status !== "ok") throw new Error(`API error for ${path}: ${d.message}`);
  return d.data;
}

async function main() {
  console.log("Fetching vehicles...");
  const vehicles = await get("/vehicles");
  console.log(`  ${vehicles.length} vehicles`);

  console.log("Fetching pledge prices...");
  const pledgePrices = await get("/vehicles_prices");
  console.log(`  ${pledgePrices.length} pledge price records`);

  console.log("Fetching in-game buy prices...");
  const buyPrices = await get("/vehicles_purchases_prices");
  console.log(`  ${buyPrices.length} buy price records`);

  console.log("Fetching in-game rental prices...");
  const rentPrices = await get("/vehicles_rentals_prices");
  console.log(`  ${rentPrices.length} rental price records`);

  fs.writeFileSync("vehicles.json",      JSON.stringify(vehicles, null, 2));
  fs.writeFileSync("pledge_prices.json", JSON.stringify(pledgePrices, null, 2));
  fs.writeFileSync("buy_prices.json",    JSON.stringify(buyPrices, null, 2));
  fs.writeFileSync("rent_prices.json",   JSON.stringify(rentPrices, null, 2));

  console.log("Fetching RSI pledge prices...");
  const RSI_URL = "https://robertsspaceindustries.com/pledge-store/api/upgrade/v2/graphql";
  const RSI_QUERY = [{"operationName":"initShipUpgrade","variables":{},"query":"query initShipUpgrade {\n  ships { id name link manufacturer { id name } focus type flyableStatus msrp\n    skus { id title available price }\n  }\n}"}];
  const rsiResp = await fetch(RSI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Referer": "https://robertsspaceindustries.com/en/pledge",
      "Origin": "https://robertsspaceindustries.com",
    },
    body: JSON.stringify(RSI_QUERY),
  });
  if (!rsiResp.ok) throw new Error(`RSI HTTP ${rsiResp.status}`);
  const rsiJson = await rsiResp.json();
  const rsiShips = rsiJson[0].data.ships;
  console.log(`  ${rsiShips.length} RSI ships`);
  fs.writeFileSync("rsi_prices.json", JSON.stringify(rsiShips, null, 2));
  console.log("Saved all data files.");
}

main().catch(e => { console.error(e); process.exit(1); });
