#!/usr/bin/env node
// Download the vehicle list + in-game aUEC buy/rent prices from the UEX Corp API
// and write a clean uex_ships.json. Source of truth for aUEC prices & locations.
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

// "City · Terminal" style label, best available place name first.
function locationLabel(e) {
  const parts = [];
  if (e.city_name)        parts.push(e.city_name);
  else if (e.moon_name)   parts.push(e.moon_name);
  else if (e.planet_name) parts.push(e.planet_name);
  if (e.terminal_name)    parts.push(e.terminal_name);
  return parts.join(" · ") || "Unknown";
}

function priceList(records, priceKey) {
  return records
    .map(r => ({ price: r[priceKey], location: locationLabel(r) }))
    .sort((a, b) => a.price - b.price);
}

async function main() {
  console.log("Fetching vehicles from UEX...");
  const vehicles = await get("/vehicles");
  console.log(`  ${vehicles.length} vehicles`);

  console.log("Fetching in-game buy prices...");
  const buyRaw = await get("/vehicles_purchases_prices");
  console.log(`  ${buyRaw.length} buy records`);

  console.log("Fetching in-game rental prices...");
  const rentRaw = await get("/vehicles_rentals_prices");
  console.log(`  ${rentRaw.length} rental records`);

  const byId = id => r => r.id_vehicle === id;
  const ships = vehicles
    .map(v => ({
      id: v.id,
      name: (v.name_full || "").trim(),
      buy: priceList(buyRaw.filter(byId(v.id)), "price_buy"),
      rent: priceList(rentRaw.filter(byId(v.id)), "price_rent"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync("uex_ships.json", JSON.stringify(ships, null, 2) + "\n");
  console.log(`  wrote uex_ships.json (${ships.length} vehicles)`);
}

main().catch(e => { console.error(e); process.exit(1); });
