#!/usr/bin/env node
// Build index.html from the three data files:
//   rsi_ships.json          - ship names + USD pledge prices (from RSI)
//   uex_ships.json          - in-game aUEC buy/rent prices   (from UEX)
//   relation_uex-rsi.json   - curated master list pairing RSI name <-> UEX id
// The relation file IS the ship list: one entry per row. See NOTES.md.
const fs = require("fs");

function load(f) {
  try { return JSON.parse(fs.readFileSync(f, "utf-8")); }
  catch { console.warn(`${f} not found`); return []; }
}

const rsiShips = load("rsi_ships.json");
const uexShips = load("uex_ships.json");
const config   = load("relation_uex-rsi.json");
const relation = config.ships || [];
const blacklist = config.blacklist || [];

const rsiByName = {};
for (const s of rsiShips) rsiByName[s.name.trim().toLowerCase()] = s;
const uexById = {};
for (const v of uexShips) uexById[v.id] = v;

// Short manufacturer label for the table. UEX-only rows fall back to the first
// token of the UEX name (which already starts with the maker, e.g. "Drake ...").
const MFR_SHORT = {
  "Aegis Dynamics": "Aegis", "Anvil Aerospace": "Anvil", "Aopoa": "Aopoa",
  "Argo Astronautics": "Argo", "Banu": "Banu", "Consolidated Outland": "C.O.",
  "Crusader Industries": "Crusader", "Drake Interplanetary": "Drake",
  "Esperia": "Esperia", "Gatac Manufacture": "Gatac", "Greycat Industrial": "Greycat",
  "Grey's Market": "Grey's Market", "Kruger Intergalactic": "Kruger", "Mirai": "Mirai",
  "MISC": "MISC", "Origin Jumpworks": "Origin", "Roberts Space Industries": "RSI",
  "Tumbril Land Systems": "Tumbril", "Tumbril": "Tumbril", "Vanduul": "Vanduul",
  "Xi'An": "Xi'An",
};

function fmtUSD(usd) {
  if (!usd) return "—";
  return "$" + usd.toLocaleString("en-US");
}
function fmtAUEC(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M aUEC`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K aUEC`;
  return `${n} aUEC`;
}
function priceCell(entries) {
  if (!entries || !entries.length) return `<td class="no-data">—</td><td class="no-data">—</td>`;
  const prices = entries.map(e => `<span class="price-val">${fmtAUEC(e.price)}</span>`).join("");
  const locs   = entries.map(e => `<span class="loc">${e.location}</span>`).join("");
  return `<td>${prices}</td><td>${locs}</td>`;
}

// Resolve each relation entry into a renderable row.
const rows = relation.map(rel => {
  const rsi = rel.rsi != null ? rsiByName[String(rel.rsi).trim().toLowerCase()] : null;
  const uex = rel.uex != null ? uexById[rel.uex] : null;
  const uexName = uex ? uex.name.trim() : "";
  const name = (rsi ? rsi.name.trim() : uexName).trim();
  const mfr = rsi ? (MFR_SHORT[rsi.manufacturer] || rsi.manufacturer || "")
                  : (uexName.split(" ")[0] || "");
  // For UEX-only rows, drop the maker prefix from the ship label.
  const ship = rsi ? name : name.replace(new RegExp("^" + mfr + "\\s+"), "");
  // USD: relation override wins, else the RSI price. Every ship must have one.
  const usd = rel.usd != null ? rel.usd : (rsi ? rsi.usd : null);
  return { mfr, ship, usd, buy: uex ? uex.buy : null, rent: uex ? uex.rent : null };
});

// Rule: every ship on the list must have a USD price (see NOTES.md).
const missingUsd = rows.filter(r => !r.usd).map(r => `${r.mfr} ${r.ship}`);
if (missingUsd.length) {
  console.warn(`WARNING: ${missingUsd.length} ship(s) have no USD price — add a "usd" to their relation_uex-rsi.json entry:`);
  for (const m of missingUsd) console.warn(`  - ${m}`);
}

// Coverage check: every UEX vehicle should be either mapped in ships[] or listed
// in blacklist[]. Anything else is a new UEX vehicle that needs a decision.
const accounted = new Set([
  ...relation.filter(r => r.uex != null).map(r => r.uex),
  ...blacklist.map(b => b.uex),
]);
const unaccounted = uexShips.filter(v => !accounted.has(v.id));
if (unaccounted.length) {
  console.warn(`NOTE: ${unaccounted.length} UEX vehicle(s) are neither mapped nor blacklisted — add to relation_uex-rsi.json:`);
  for (const v of unaccounted) console.warn(`  - ${v.id}: ${v.name}`);
}

rows.sort((a, b) => {
  const pa = a.usd || Infinity, pb = b.usd || Infinity;
  if (pa !== pb) return pa - pb;
  return (a.mfr || "").localeCompare(b.mfr || "") || a.ship.localeCompare(b.ship);
});

const buyCount  = rows.filter(r => r.buy && r.buy.length).length;
const rentCount = rows.filter(r => r.rent && r.rent.length).length;

const priceRows = rows.map(r => `
    <tr>
      <td class="mfr-col">${r.mfr}</td>
      <td class="ship-col">${r.ship}</td>
      <td>${r.usd ? `<span class="pledge-price">${fmtUSD(r.usd)}</span>` : `<span class="no-data">—</span>`}</td>
      ${priceCell(r.buy)}
    </tr>`).join("");

const rentRows = rows.filter(r => r.rent && r.rent.length).map(r => `
    <tr>
      <td class="mfr-col">${r.mfr}</td>
      <td class="ship-col">${r.ship}</td>
      ${priceCell(r.rent)}
    </tr>`).join("");

const CSS = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:linear-gradient(135deg,#0a0e27 0%,#1a1f3a 100%);color:#e8e8e8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;min-height:100vh}
    header{background:rgba(10,14,39,.8);backdrop-filter:blur(10px);border-bottom:2px solid #2a9fd6;padding:20px 0;margin-bottom:30px;box-shadow:0 4px 6px rgba(0,0,0,.3)}
    h1{color:#fff;font-size:2rem;font-weight:600;text-align:center;text-shadow:0 0 20px rgba(42,159,214,.5)}
    .subtitle{text-align:center;color:#a0a0a0;font-size:.9rem;margin-top:8px}
    .container{max-width:1400px;margin:0 auto;padding:20px}
    .section-header{background:rgba(42,159,214,.1);border-left:4px solid #2a9fd6;padding:14px 20px;margin:40px 0 16px;border-radius:4px}
    .section-header:first-of-type{margin-top:0}
    .section-header h2{color:#2a9fd6;font-size:1.3rem;font-weight:600}
    .section-header p{color:#888;font-size:.82rem;margin-top:4px}
    .table-wrap{overflow-x:auto;border-radius:8px;box-shadow:0 8px 16px rgba(0,0,0,.4)}
    table{width:100%;border-collapse:separate;border-spacing:0;background:rgba(20,25,45,.6)}
    th{background:linear-gradient(180deg,#1e3a5f 0%,#152840 100%);color:#fff;font-weight:600;text-transform:uppercase;font-size:.78rem;letter-spacing:.5px;padding:14px 12px;text-align:left;border-bottom:2px solid #2a9fd6;white-space:nowrap}
    td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:top;font-size:.85rem}
    tr:hover td{background:rgba(42,159,214,.08)}
    tr:last-child td{border-bottom:none}
    .mfr-col{font-size:.78rem;color:#6a8090;white-space:nowrap;min-width:60px}
    .ship-col{font-weight:600;color:#2a9fd6;min-width:160px}
    .pledge-price{font-weight:700;color:#4fc3f7}
    .price-val{display:block;font-weight:600;color:#e8e8e8;white-space:nowrap}
    .loc{display:block;color:#888;font-size:.78rem;white-space:nowrap}
    .no-data{color:#555;text-align:center}
    .stats{display:flex;gap:20px;justify-content:center;margin-bottom:30px;flex-wrap:wrap}
    .stat{background:rgba(42,159,214,.08);border:1px solid rgba(42,159,214,.2);border-radius:6px;padding:8px 20px;text-align:center}
    .stat-val{font-size:1.4rem;font-weight:700;color:#2a9fd6}
    .stat-lbl{font-size:.75rem;color:#888;margin-top:2px}
    .footer{margin-top:50px;padding:20px 0;border-top:1px solid rgba(42,159,214,.3);color:#888;font-size:.85rem;text-align:center}
    .footer a{color:#2a9fd6;text-decoration:none;margin:0 8px}
    .footer a:hover{color:#4fc3f7;text-decoration:underline}
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Ship Prices - Star Citizen</title>
  <style>${CSS}</style>
</head>
<body>
<header>
  <div class="container">
    <h1>Ship Prices</h1>
    <div class="subtitle">Star Citizen · Pledge, In-Game Buy &amp; Rental Prices</div>
  </div>
</header>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-val">${rows.length}</div><div class="stat-lbl">Ships</div></div>
    <div class="stat"><div class="stat-val">${buyCount}</div><div class="stat-lbl">In-Game Buy</div></div>
    <div class="stat"><div class="stat-val">${rentCount}</div><div class="stat-lbl">Rentable</div></div>
  </div>

  <div class="section-header">
    <h2>Ship Prices</h2>
    <p>Pledge prices from RSI · In-game aUEC prices from UEX Corp</p>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Mfr</th>
        <th>Ship</th>
        <th>Pledge (USD)</th>
        <th>Buy (aUEC)</th>
        <th>Buy Location</th>
      </tr></thead>
      <tbody>${priceRows}</tbody>
    </table>
  </div>

  <div class="section-header">
    <h2>Rentable Ships</h2>
    <p>${rentCount} ships available for in-game rental</p>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Mfr</th>
        <th>Ship</th>
        <th>Rent (aUEC)</th>
        <th>Rent Location</th>
      </tr></thead>
      <tbody>${rentRows}</tbody>
    </table>
  </div>

  <div class="footer">
    Generated: ${new Date().toUTCString()} ·
    <a href="https://github.com/scpages/ship_prices" target="_blank">GitHub</a> ·
    Pledge data from <a href="https://robertsspaceindustries.com" target="_blank">RSI</a> ·
    aUEC data from <a href="https://uexcorp.space" target="_blank">UEX Corp</a>
  </div>
</div>
</body>
</html>`;

fs.writeFileSync("index.html", html);
console.log(`index.html generated (${rows.length} ships, ${buyCount} buyable, ${rentCount} rentable)`);
