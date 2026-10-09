# Data

Each file is set as a global (`window.NAME`) by `scripts/load.js` before a page's scripts run. The build scripts named
here are in `presentation_src/tools/` (and `prototype-2/src/` for `core.json`); each reads the raw government files
listed in `data/data/source data/source_manifest.csv`.

## Map page (`map.html`)

| File | Global | Notes |
|---|---|---|
| `core.json` | `D` | visas issued by country and type FY2011–2025, ports of entry, ICE removals by state of arrest and country (calendar years of departure, 2022 October–December only), world country shapes, 2026 projections (prototype-2/src/build_data.py) |
| `states.json` | `STS` | every state and DC, 2001–2025: outlines, net arrivals by state and county, census tracts for placing dots, green cards, H-1B approvals, international students, ICE facilities by state (build_states.py) |
| `ice-detention.json` | `DET` | ICE detention, average daily population by facility (ZIP centroid), FY2019–FY2026 (FY2026 to date) |
| `green-cards-2024-counties.json` | `LPRG` | green cards FY2024: every county × country flow of the 200 busiest counties (build_lprg.py) |
| `green-cards-2024-rest.json` | `LPRG_REST` | the rest of each state × country, spread over the state's other counties (build_lprg.py) |
| `bps-removals-2024.json` | `BP` | removals after a border arrest, FY2014–2024 by Border Patrol sector (split by encounters, an estimate); FY2024 destinations estimated from all-DHS citizenship shares (build_bp.py) |
| `visa-ports-by-region-2024.json` | `PORTS_R` | visa ports of entry by world region, 2024, NTTO I-94 arrivals (build_ports.py) |

## Graphs page (`graphs.html`)

| File | Global | Notes |
|---|---|---|
| `census-net-migration-2001-2025.json` | `NIMJ` | national net international migration, 2001–2025, as published, with the vintage of each year (build_census_nim.py) |
| `census-graph.json` | `CENSUS` | net international migration by state and county 2001–2025 with county names, the four Census regions, and the 2026 projections (build_site_data.py) |
| `visa-classes.json` | `VISAS` | visas issued FY2001–2025 by category and visa class; FY2025 summed from monthly reports (build_site_data.py) |
| `deportation.json` | `DEP` | ICE removals by country and state of arrest; BPS removals by sector; ICE detention by facility (build_site_data.py) |
