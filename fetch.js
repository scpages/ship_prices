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
  console.log("Saved all data files.");
}

main().catch(e => { console.error(e); process.exit(1); });
