const fs = require("fs");

function load(f) {
  try { return JSON.parse(fs.readFileSync(f, "utf-8")); }
  catch { console.warn(`${f} not found`); return []; }
}

const rsiShips = load("rsi_prices.json");
const vehicles = load("vehicles.json");
const buyRaw   = load("buy_prices.json");
const rentRaw  = load("rent_prices.json");

const RSI_MFR_SHORT = {
  "Aegis Dynamics":          "Aegis",
  "Anvil Aerospace":         "Anvil",
  "Aopoa":                   "Aopoa",
  "Argo Astronautics":       "Argo",
  "Banu":                    "Banu",
  "Consolidated Outland":    "C.O.",
  "Crusader Industries":     "Crusader",
  "Drake Interplanetary":    "Drake",
  "Esperia":                 "Esperia",
  "Gatac Manufacture":       "Gatac",
  "Greycat Industrial":      "Greycat",
  "Grey's Market":           "Grey's Market",
  "Kruger Intergalactic":    "Kruger",
  "Mirai":                   "Mirai",
  "MISC":                    "MISC",
  "Origin Jumpworks":        "Origin",
  "Roberts Space Industries":"RSI",
  "Tumbril Land Systems":    "Tumbril",
  "Tumbril":                 "Tumbril",
  "Vanduul":                 "Vanduul",
  "Xi'An":                   "Xi'An",
};

// Explicit overrides for names that can't be matched automatically
const RSI_NAME_OVERRIDES = {
  "G12a":                     "Origin G12-A",
  "G12r":                     "Origin G12-R",
  "San’tok.yāi":    "Aopoa San tok.Yāi",
  "Carrack w/C8X":            "Anvil Carrack",
  "Carrack Expedition w/C8X": "Anvil Carrack Expedition",
  "Gladius Pirate Edition":   "Aegis Gladius Pirate",
  "Sabre Raven EX":           "Aegis Sabre Raven",
  "ATLS IKTI Akuma":          null,
};

// UEX lookup by normalized name_full
const uexByNorm = {};
for (const v of vehicles) uexByNorm[v.name_full.trim().toLowerCase()] = v;

function matchUEX(ship) {
  const raw = ship.name.trim();

  if (raw in RSI_NAME_OVERRIDES) {
    const override = RSI_NAME_OVERRIDES[raw];
    if (!override) return null;
    return uexByNorm[override.toLowerCase()] || null;
  }

  const mfrShort = RSI_MFR_SHORT[ship.manufacturer?.name] || ship.manufacturer?.name || "";
  // Some RSI ship names already include the manufacturer prefix — don't double it
  const candidate = raw.toLowerCase().startsWith(mfrShort.toLowerCase() + " ")
    ? raw.trim().toLowerCase()
    : (mfrShort + " " + raw).trim().toLowerCase();

  if (uexByNorm[candidate]) return uexByNorm[candidate];

  // Backward prefix: UEX name starts with candidate (e.g., "Crusader A2 Hercules Starlifter")
  let best = null, bestLen = Infinity;
  for (const [k, v] of Object.entries(uexByNorm)) {
    if (k.startsWith(candidate + " ") && k.length < bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  return best;
}

// Build buy/rent maps by UEX vehicle id
const buyMap = {};
for (const b of buyRaw) {
  if (!buyMap[b.id_vehicle]) buyMap[b.id_vehicle] = [];
  buyMap[b.id_vehicle].push(b);
}
const rentMap = {};
for (const r of rentRaw) {
  if (!rentMap[r.id_vehicle]) rentMap[r.id_vehicle] = [];
  rentMap[r.id_vehicle].push(r);
}

function fmtUSD(cents) {
  if (!cents) return "—";
  return "$" + (cents / 100).toLocaleString("en-US");
}
function fmtAUEC(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M aUEC`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K aUEC`;
  return `${n} aUEC`;
}
function locationLabel(e) {
  const parts = [];
  if (e.city_name)     parts.push(e.city_name);
  else if (e.moon_name)  parts.push(e.moon_name);
  else if (e.planet_name) parts.push(e.planet_name);
  if (e.terminal_name) parts.push(e.terminal_name);
  return parts.join(" · ") || "Unknown";
}
function priceCell(entries, priceKey) {
  if (!entries || !entries.length) return `<td class="no-data">—</td><td class="no-data">—</td>`;
  const sorted = [...entries].sort((a, b) => a[priceKey] - b[priceKey]);
  const prices = sorted.map(e => `<span class="price-val">${fmtAUEC(e[priceKey])}</span>`).join("");
  const locs   = sorted.map(e => `<span class="loc">${locationLabel(e)}</span>`).join("");
  return `<td>${prices}</td><td>${locs}</td>`;
}

// Enrich RSI ships with UEX aUEC data
const enriched = rsiShips.map(ship => {
  const uex  = matchUEX(ship);
  const mfr  = RSI_MFR_SHORT[ship.manufacturer?.name] || ship.manufacturer?.name || "";
  return { ...ship, uex, mfr, buys: uex ? buyMap[uex.id] : null, rents: uex ? rentMap[uex.id] : null };
});

// Sort by pledge price, then manufacturer, then name
enriched.sort((a, b) => {
  const pa = a.msrp || Infinity, pb = b.msrp || Infinity;
  if (pa !== pb) return pa - pb;
  return (a.mfr || "").localeCompare(b.mfr || "") || a.name.trim().localeCompare(b.name.trim());
});

const matchedCount  = enriched.filter(s => s.uex).length;
const buyCount      = enriched.filter(s => s.buys).length;
const rentCount     = enriched.filter(s => s.rents).length;

const priceRows = enriched.map(ship => `
    <tr>
      <td class="mfr-col">${ship.mfr}</td>
      <td class="ship-col">${ship.name.trim()}</td>
      <td>${ship.msrp ? `<span class="pledge-price">${fmtUSD(ship.msrp)}</span>` : `<span class="no-data">—</span>`}</td>
      ${priceCell(ship.buys, "price_buy")}
    </tr>`).join("");

const rentRows = enriched.filter(s => s.rents).map(ship => `
    <tr>
      <td class="mfr-col">${ship.mfr}</td>
      <td class="ship-col">${ship.name.trim()}</td>
      ${priceCell(ship.rents, "price_rent")}
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
    <div class="stat"><div class="stat-val">${enriched.length}</div><div class="stat-lbl">Ships</div></div>
    <div class="stat"><div class="stat-val">${matchedCount}</div><div class="stat-lbl">Matched to UEX</div></div>
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
console.log(`index.html generated (${enriched.length} ships, ${matchedCount} with UEX match, ${buyCount} buyable, ${rentCount} rentable)`);
