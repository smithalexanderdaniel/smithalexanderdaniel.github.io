// Loads a page's data, then its scripts. The page's <script src="scripts/load.js"> tag lists both:
//   data-json="GLOBAL:path,..."  each JSON file is fetched and set as window.GLOBAL
//   data-run="path,..."          then these scripts run, in order
//   data-v="..."                 a version, added to every request (?v=...) so a browser never runs an old copy after the site changes
// Paths are relative to data-base. Served over http(s) only: browsers refuse fetch() from file:// pages.
(() => {
  const me = document.currentScript, base = me.dataset.base || "", v = me.dataset.v ? "?v=" + me.dataset.v : "";
  const list = s => (s || "").split(",").map(x => x.trim()).filter(Boolean);
  const data = list(me.dataset.json).map(e => e.split(":"));
  const run = src => new Promise((ok, fail) => { const s = document.createElement("script"); s.src = base + src + v; s.async = false; s.onload = ok; s.onerror = () => fail(new Error("could not load " + src)); document.body.appendChild(s); });
  Promise.all(data.map(([name, path]) => fetch(base + path + v).then(r => { if (!r.ok) throw new Error(path + ": " + r.status); return r.json(); }).then(v => { window[name] = v; })))
    .then(() => { if (window.NIMJ && !window.NIMX) window.NIMX = window.NIMJ.nim;   // the census series, as the presentation reads it
      return list(me.dataset.run).reduce((p, src) => p.then(() => run(src)), Promise.resolve()); })
    .catch(err => { console.error(err); const d = document.createElement("p"); d.style.cssText = "position:fixed;inset:auto 0 0 0;margin:0;padding:12px 16px;font:14px sans-serif;background:#300;color:#fff;z-index:99";
      d.textContent = location.protocol === "file:" ? "Open this site through a web server (see README.md): browsers do not load data files from file:// pages." : "Could not load the data: " + err.message; document.body.appendChild(d); });
})();
