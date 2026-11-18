#!/usr/bin/env node
// Download the ship list + USD pledge prices from RSI's ship-upgrade form and
// write a clean rsi_ships.json. Source of truth for the dollar price of a ship.
const fs = require("fs");

const URL = "https://robertsspaceindustries.com/pledge-store/api/upgrade/v2/graphql";
const QUERY = [{
  operationName: "initShipUpgrade",
  variables: {},
  query: "query initShipUpgrade {\n  ships { id name manufacturer { id name } msrp }\n}",
}];

async function main() {
  console.log("Fetching ships from RSI ship-upgrade form...");
  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Referer": "https://robertsspaceindustries.com/en/pledge",
      "Origin": "https://robertsspaceindustries.com",
    },
    body: JSON.stringify(QUERY),
  });
  if (!resp.ok) throw new Error(`RSI HTTP ${resp.status}`);
  const json = await resp.json();
  const raw = json?.[0]?.data?.ships;
  if (!Array.isArray(raw)) throw new Error("Unexpected RSI response shape");

  const ships = raw
    .map(s => ({
      name: (s.name || "").trim(),
      manufacturer: (s.manufacturer?.name || "").trim(),
      usd: s.msrp ? s.msrp / 100 : null,  // msrp is in cents
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync("rsi_ships.json", JSON.stringify(ships, null, 2) + "\n");
  console.log(`  wrote rsi_ships.json (${ships.length} ships)`);
}

main().catch(e => { console.error(e); process.exit(1); });
