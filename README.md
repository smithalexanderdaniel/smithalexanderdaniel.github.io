# Who Are We, at 250

A presentation on immigration to the United States, 2001–2026, as a static website.

```
index.html          the presentation (start here)
html/world.html     the interactive globe, map and cities, shown inside the presentation
css/                presentation.css, world.css
scripts/            load.js (loads the data, then the scripts), engine.js, director.js, world.js, world-embed.js
data/               the datasets, as JSON (see data/README.md)
images/             photographs and slide images
```

## Run it

The pages load their data with `fetch()`, so they must be served over http(s); opening `index.html`
straight from disk shows an error. Any static host works (GitHub Pages, Netlify, a university web space).
To view it locally, from this folder:

```
python -m http.server 8000
```

then open http://localhost:8000/.

Keys: Space or → next, ← back, F full screen.
