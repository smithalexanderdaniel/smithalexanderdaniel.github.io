# Immigration & Deportation in America, 2026

Twenty-five years of immigration and deportation in the United States, mapped and graphed from government data.
A static website: plain HTML, CSS and JavaScript, with the data as JSON.

```
index.html      About: the summary
data.html       Data: what the data can and cannot say, what each source shows, and every source in APA style
team.html       Team
map.html        Map: the US, then the world (drag to turn it; hover or click a country; scroll in to zoom up to 2x),
                then immigration v deportation on two globes (scroll to move between the levels)
graphs.html     Graphs: the census line, then stacked charts of where people settled, visas, ICE removals, BPS removals and ICE detention
methods.html    Methods: tech stack and data forensics
css/            site.css (every page), map.css, graphs.css
scripts/        load.js (loads a page's data, then its scripts)
                globe-core.js, map-layers.js, map.js   the Map page
                graphs.js                              the Graphs page
data/           the datasets, as JSON (see data/README.md)
images/         the team photographs
```

## Run it

The pages load their data with `fetch()`, so they must be served over http(s); opening a page straight from disk
shows an error. GitHub Pages works: put these files at the root of the repository and publish the `main` branch.
To view it locally, from this folder:

```
python -m http.server 8000
```

then open http://localhost:8000/.

After changing the site, give it a new version (the `?v=` on the stylesheets and `scripts/load.js`, and the loader's
`data-v`) so browsers fetch the new files instead of running cached copies.

Links can open a view directly: `map.html?z=1` (the world), `map.html?z=2` (immigration v deportation), `map.html?country=India`,
`graphs.html?open=visas:work`, `graphs.html?open=census:state:TX`, `graphs.html?open=ice:state:Texas`, `graphs.html?open=det:state:Texas`.
