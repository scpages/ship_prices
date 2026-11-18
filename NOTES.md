# Maintenance notes

## How the data flows

```
get_ships_from_rsi.js  ->  rsi_ships.json   (ship names + USD pledge price)
get_ships_from_uex.js  ->  uex_ships.json   (in-game aUEC buy/rent + locations)
relation_uex-rsi.json  ->  the curated master list + blacklist (hand-maintained)
generate_website.js    ->  index.html       (joins all three)
```

`relation_uex-rsi.json` is the single config file: it holds **which UEX vehicle is
the same ship as which RSI ship**, plus the **blacklist** of UEX entries that are
not ships we want to show. `rsi_ships.json` / `uex_ships.json` are raw source data,
safe to re-download anytime.

## relation_uex-rsi.json structure

```json
{
  "blacklist": [
    { "uex": 42, "name": "Drake Caterpillar Best In Show Edition" }
  ],
  "ships": [
    { "rsi": "Cutlass Black", "uex": 52 },        // in both: USD from RSI, aUEC from UEX
    { "rsi": null, "uex": 112, "usd": 1650 },      // UEX-only (Kraken): USD filled from pledge store
    { "rsi": "Some Concept", "uex": null }         // RSI-only: USD from RSI, aUEC "-"
  ]
}
```

**`ships[]`** — the master list; one entry per row on the site.
- **`rsi`** — ship `name` from `rsi_ships.json` (exact, trimmed), or `null` for UEX-only ships.
- **`uex`** — numeric `id` from `uex_ships.json`, or `null` for ships with no in-game data.
  UEX names are unreliable (infixes, duplicates) so we always join on the stable id.
- **`usd`** — optional manual price. Overrides the RSI price when set, and is
  **required** for UEX-only ships (`rsi: null`), which have no RSI price.

**`blacklist[]`** — UEX vehicles intentionally not shown: modules/pods (Endeavor,
Galaxy, Retaliator), ground vehicles (HM6, ATLS variants), paint/special editions
(Best In Show, Executive Edition), duplicates, and ships with no usable price.
`name` is kept for readability.

## Rules

- **Every ship must have a USD price.** No "$—" pledge cells. RSI ships get their
  price from `rsi_ships.json`; UEX-only ships must carry a manual `usd` sourced from
  the **normal RSI pledge store** (the ship's store page JSON-LD `offers.price`).
  If a ship has no pledge-store price, blacklist it instead of listing it.
- **Mustang Omega uses the Mustang Gamma price** (AMD promo, same value).

`generate_website.js` prints:
- a WARNING for any shown ship missing a USD price, and
- a NOTE listing any UEX vehicle that is neither mapped in `ships[]` nor in
  `blacklist[]` (i.e. a newly added UEX vehicle that needs a decision).

## Adding / updating a ship

1. `./update.sh` to refresh `rsi_ships.json` and `uex_ships.json`.
2. Run `./main.sh`; act on any WARNING/NOTE it prints.
3. For a new ship: find its RSI `name` and/or UEX `id`, add `{ "rsi": ..., "uex": ... }`
   to `ships[]` (with a `usd` if it has no RSI price). For a non-ship, add it to
   `blacklist[]` instead.
4. Review `git diff`, commit.

## Matching gotchas

- UEX wedges words into names, e.g. RSI `Ares Inferno` == UEX
  `Crusader Ares Star Fighter Inferno` (id 17). Match by **id**, not name.
- Some UEX names are duplicated (e.g. two `Aegis Sabre Raven EX`) — pick the right id.
- UEX-only rows take their display name from the UEX name; its first word is used
  as the manufacturer label (UEX names start with the maker).
