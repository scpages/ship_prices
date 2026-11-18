# Ship Prices

Generates a static HTML page listing Star Citizen ships with their pledge (USD)
and in-game (aUEC) prices. Pledge data comes from RSI; aUEC data from UEX Corp.

Live at: **https://scpages.github.io/ship-prices/**

## How it works

Data is split into raw source exports and a human-curated master list:

| File | Produced by | Purpose |
|---|---|---|
| `rsi_ships.json` | `get_ships_from_rsi.js` | Ship names + USD pledge prices (RSI) |
| `uex_ships.json` | `get_ships_from_uex.js` | aUEC buy/rent prices + locations (UEX) |
| `relation_uex-rsi.json` | **hand-curated** | The master ship list; pairs each RSI ship with its UEX vehicle |
| `index.html` | `generate_website.js` | The rendered page |

`relation_uex-rsi.json` is the source of truth for which ships appear. It joins
the RSI ship `name` to the UEX vehicle `id`; either side may be `null`. This
replaces fragile automatic name-matching — the RSI↔UEX pairing is decided once by
a human and recorded. See `NOTES.md` for the schema, skip rules, and how to add a ship.

## Workflow

```bash
# Refresh the two source exports (does not commit)
bash update.sh

# ...manually reconcile relation_uex-rsi.json for any added/removed ships...

# Regenerate index.html from the three data files
bash main.sh
```

## Data Sources

- RSI ship-upgrade form (`initShipUpgrade` GraphQL) — ship list + pledge prices.
- [UEX Corp API](https://api.uexcorp.space/2.0/) — `/vehicles`,
  `/vehicles_purchases_prices`, `/vehicles_rentals_prices`.
