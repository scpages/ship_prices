# Ship Prices

Fetches ship price data from the [UEX Corp API](https://uexcorp.space) and generates a static HTML page listing all ships with their pledge and in-game prices.

Live at: **https://scpages.github.io/ship-prices/**

## What it shows

**Table 1 — All Ships** (sorted by pledge price ascending):

| Column | Description |
|---|---|
| Ship | Ship name & manufacturer |
| Pledge (USD) | Current pledge store price |
| Buy (aUEC) | In-game purchase price |
| Buy Location | City · Terminal |

**Table 2 — Rentable Ships:**

| Column | Description |
|---|---|
| Ship | Ship name & manufacturer |
| Rent (aUEC) | In-game rental price |
| Rent Location | City · Terminal |

## Workflow

```bash
# Generate HTML from local JSON data
bash main.sh

# Fetch fresh data from UEX Corp API, then commit + push
bash update.sh
```

`main.sh` only reads local JSON files and regenerates `index.html`.
`update.sh` fetches from the UEX API and pushes if data changed.

## Data Sources

All data from [UEX Corp API](https://api.uexcorp.space/2.0/):

- `/vehicles` — ship list
- `/vehicles_prices` — pledge store prices
- `/vehicles_purchases_prices` — in-game buy prices & locations
- `/vehicles_rentals_prices` — in-game rental prices & locations
