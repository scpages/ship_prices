const fs = require("fs");

function load(f) {
  try { return JSON.parse(fs.readFileSync(f, "utf-8")); }
  catch { console.warn(`${f} not found`); return []; }
}

const vehicles    = load("vehicles.json");
const pledgeRaw   = load("pledge_prices.json");
const buyRaw      = load("buy_prices.json");
const rentRaw     = load("rent_prices.json");

// Latest pledge price per vehicle
const pledgeMap = {};
for (const p of pledgeRaw) {
  if (!p.date_modified) continue;
  const prev = pledgeMap[p.id_vehicle];
  if (!prev || p.date_modified > prev.date_modified) pledgeMap[p.id_vehicle] = p;
}

// Buy locations per vehicle
const buyMap = {};
for (const b of buyRaw) {
  if (!buyMap[b.id_vehicle]) buyMap[b.id_vehicle] = [];
  buyMap[b.id_vehicle].push(b);
}

// Rent locations per vehicle
const rentMap = {};
for (const r of rentRaw) {
  if (!rentMap[r.id_vehicle]) rentMap[r.id_vehicle] = [];
  rentMap[r.id_vehicle].push(r);
}

function fmtUSD(n) {
  return n ? `$${Number(n).toLocaleString("en-US")}` : "—";
}

function fmtAUEC(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M aUEC`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K aUEC`;
  return `${n} aUEC`;
}

function locationLabel(entry) {
  const parts = [];
  if (entry.city_name) parts.push(entry.city_name);
  else if (entry.moon_name) parts.push(entry.moon_name);
  else if (entry.planet_name) parts.push(entry.planet_name);
  if (entry.terminal_name) parts.push(entry.terminal_name);
  return parts.join(" · ") || "Unknown";
}

function priceCell(entries, priceKey) {
  if (!entries || !entries.length) return `<td class="no-data">—</td><td class="no-data">—</td>`;
  const sorted = [...entries].sort((a, b) => a[priceKey] - b[priceKey]);
  const prices = sorted.map(e => `<span class="price-val">${fmtAUEC(e[priceKey])}</span>`).join("");
  const locs   = sorted.map(e => `<span class="loc">${locationLabel(e)}</span>`).join("");
  return `<td>${prices}</td><td>${locs}</td>`;
}

const sorted = vehicles.sort((a, b) => a.name.localeCompare(b.name));

// Table 1: all ships — pledge + buy
const priceRows = sorted.map(v => {
  const pledge = pledgeMap[v.id];
  const buys   = buyMap[v.id];

  const pledgeHtml = pledge
    ? `<span class="pledge-price">${fmtUSD(pledge.price)}</span>`
    : `<span class="no-data">—</span>`;

  return `
    <tr>
      <td class="ship-name"><span class="name">${v.name}</span><span class="mfr">${v.company_name || ""}</span></td>
      <td>${pledgeHtml}</td>
      ${priceCell(buys, "price_buy")}
    </tr>`;
}).join("");

// Table 2: rentable ships only
const rentableVehicles = sorted.filter(v => rentMap[v.id]);
const rentRows = rentableVehicles.map(v => {
  const rents = rentMap[v.id];
  return `
    <tr>
      <td class="ship-name"><span class="name">${v.name}</span><span class="mfr">${v.company_name || ""}</span></td>
      ${priceCell(rents, "price_rent")}
    </tr>`;
}).join("");

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
    .ship-name{min-width:160px}
    .name{display:block;font-weight:600;color:#2a9fd6}
    .mfr{display:block;font-size:.75rem;color:#888;margin-top:2px}
    .pledge-price{font-weight:700;color:#4fc3f7}
    .sale-badge{display:inline-block;background:rgba(220,50,50,.2);color:#f44;border:1px solid rgba(220,50,50,.4);border-radius:3px;font-size:.7rem;padding:1px 5px;margin-left:4px;vertical-align:middle;font-weight:700}
    .wb-badge{display:inline-block;background:rgba(255,165,0,.15);color:#ffa500;border:1px solid rgba(255,165,0,.3);border-radius:3px;font-size:.7rem;padding:1px 5px;margin-left:4px;vertical-align:middle}
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
    <div class="stat"><div class="stat-val">${vehicles.length}</div><div class="stat-lbl">Ships</div></div>
    <div class="stat"><div class="stat-val">${Object.keys(pledgeMap).length}</div><div class="stat-lbl">Pledge Prices</div></div>
    <div class="stat"><div class="stat-val">${Object.keys(buyMap).length}</div><div class="stat-lbl">In-Game Buy</div></div>
    <div class="stat"><div class="stat-val">${rentableVehicles.length}</div><div class="stat-lbl">Rentable</div></div>
  </div>

  <div class="section-header">
    <h2>Ship Prices</h2>
    <p>Pledge (USD) and in-game purchase prices (aUEC)</p>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
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
    <p>${rentableVehicles.length} ships available for in-game rental</p>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
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
    Data from <a href="https://uexcorp.space" target="_blank">UEX Corp</a>
  </div>
</div>
</body>
</html>`;

fs.writeFileSync("index.html", html);
console.log(`index.html generated (${vehicles.length} ships, ${rentableVehicles.length} rentable)`);
