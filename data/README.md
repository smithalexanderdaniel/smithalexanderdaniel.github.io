# Data

Each file is set as a global (`window.NAME`) by `scripts/load.js` before the page's scripts run.

| File | Global | Notes |
|---|---|---|
| `images.json` | `IMGS` | the photographs and slide images, by key (paths relative to index.html) |
| `core.json` | `D` | built by artifact/build_data.py; sources at the top of that file |
| `census-net-migration-2001-2025.json` | `NIMJ` | net international migration, 2001-2025, unchanged from the Census files (tools/build_census_nim.py) |
| `ice-detention.json` | `DET` | ICE detention: average daily population by facility (ZIP centroid), FY2019-FY2026 |
| `us-borders.json` | `USB` | US state and national borders: us-atlas 3.0.1 states-10m, simplified (tools/make_usb.js) |
| `green-cards-2024-counties.json` | `LPRG` | green cards 2024 (tools/build_lprg.py): every county x country flow of the 200 busiest counties, and the rest of each state x country |
| `green-cards-2024-rest.json` | `LPRG_REST` | — |
| `bps-removals-2024.json` | `BP` | removals after a border arrest (CBP), 2024, by sector and country (tools/build_bp.py) |
| `visa-ports-by-region-2024.json` | `PORTS_R` | visa ports of entry by world region, 2024 (tools/build_ports.py) |
| `states.json` | `STS` | every state and DC, 2001-2025: outlines, net arrivals, county series, green cards, removals; detention facilities by state (tools/build_states.py) |
| `world-series.json` | `D2` | taken from who-are-we-at-250-presentation 1.html: NIMJ (Census net international migration 2001-2025, by vintage), LPRG (green cards FY2024, country of birth -> county, DHS top 200 counties), DET (ICE detention, average daily population by facility, FY2019-FY2026), USB (US state borders) |
| `world-states.json` | `ST` | built by build_states.py: us-atlas states-10m outlines; county, green-card county and ICE facility -> state |
| `los-angeles.json` | `LA` | built by build_la.py from data source/US residents (+ Santa Monica Travel & Tourism 2024 profile) |
| `boston.json` | `BOS` | built by build_boston.py from data source/US residents |
| `cities-h1b-students.json` | `CY` | built by build_cities.py: H-1B approvals by employer ZIP and international students by college, 2019-2025, for each metro box |
| `green-cards-by-country.json` | `LPRC` | built by build_lpr.py: DHS Yearbook Table 3, green cards by country of birth, FY2011-2024 |
| `county-population-2024.json` | `D3` | built by artifact/build_pop.py: Census county population estimates, July 2024 (co-est2025-alldata), at Gazetteer 2023 interior points |
| `outlines.json` | `GEO` | built by build_geo.py: Census 1:500,000 state outlines and Natural Earth 1:50m countries |

`core.json` is shared by the presentation and `html/world.html`.
