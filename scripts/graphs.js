"use strict";
// The Graphs page: the census line (static), then stacked-area charts, per year. Every category is drawn; none is folded into "Other".
// Hovering a category brightens it and dims the rest; clicking one (where it has parts) shrinks the others away, lets it fill the chart,
// and splits it into all of its parts, listed in the legend.
const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a)*t;
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const div = (cls, parent, html) => { const e = document.createElement("div"); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const full = n => Math.round(n).toLocaleString("en-US");
const short = n => { const a = Math.abs(n), s = n < 0 ? "−" : ""; return s + (a >= 1e6 ? (a/1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M" : a >= 1e3 ? Math.round(a/1e3) + "k" : String(Math.round(a))); };
const sum = a => a.reduce((s, x) => s + (x || 0), 0);
const debounce = (f, ms = 120) => { let h; return () => { clearTimeout(h); h = setTimeout(f, ms); }; };
const byTotal = list => [...list].sort((a, b) => sum(b.v) - sum(a.v));   /* the largest at the bottom of the stack */
/* a colour family for many bands: hues around the base colour, lightness alternating so neighbouring bands stay apart */
function family(base, n) { const [r, g, b] = [1, 3, 5].map(i => parseInt(base.slice(i, i + 2), 16)/255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = d === 0 ? 0 : mx === r ? ((g - b)/d) % 6 : mx === g ? (b - r)/d + 2 : (r - g)/d + 4; h = (h*60 + 360) % 360;
  const L = [62, 46, 74, 54, 68, 40], span = Math.min(34, 6 + n*1.2);
  return Array.from({length: n}, (_, i) => `hsl(${(h + (n > 1 ? (i/(n - 1) - .5)*span : 0) + 360) % 360},${i % 2 ? 62 : 74}%,${L[i % L.length]}%)`); }

// ================================================================ 1. the line
function lineChart() {
  const box = $("lineChart"), N = window.NIMJ, P = window.CENSUS.proj, Y0 = 2001, Y1 = 2026;
  const tip = div("tip", box);
  function draw() { [...box.querySelectorAll("svg")].forEach(s => s.remove());
    const W = box.clientWidth, nar = W < 700, H = Math.round(clamp(W*.46, 280, 470)), m = {l: 52, r: nar ? 64 : 200, t: 14, b: 34};
    const X = y => m.l + (y - Y0)/(Y1 - Y0)*(W - m.l - m.r), Y = v => m.t + (3e6 - v)/4e6*(H - m.t - m.b);
    const svg = svgEl("svg", {width: W, height: H, role: "img", "aria-label": "Line chart of net international migration to the United States, 2001 to 2025, with 2026 projections"}); box.prepend(svg);
    for (let v = -1e6; v <= 3e6; v += 5e5) { const major = v % 1e6 === 0; svgEl("line", {x1: m.l, x2: W - m.r + 40, y1: Y(v), y2: Y(v), stroke: v === 0 ? "rgba(236,230,216,.35)" : `rgba(236,230,216,${major ? .09 : .04})`}, svg);
      if (major) svgEl("text", {x: m.l - 8, y: Y(v) + 4, "text-anchor": "end"}, svg).textContent = v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v/1e6) + "M"; }
    for (let y = Y0; y <= Y1; y++) { const lab = nar ? y % 5 === 0 || y === Y0 : y % 2 === 1 || y === Y1; svgEl("line", {x1: X(y), x2: X(y), y1: H - m.b + 4, y2: H - m.b + (lab ? 9 : 6), stroke: "rgba(236,230,216,.3)"}, svg);
      if (lab) { const t = svgEl("text", {x: X(y), y: H - m.b + 24, "text-anchor": "middle"}, svg); t.textContent = y; if (y === Y1) t.setAttribute("fill", "#f2b950"); } }
    const pts = N.years.map((y, i) => [X(y), Y(N.nim[i])]);
    const area = `M${pts.map(p => p.join(",")).join("L")}L${X(2025)},${Y(0)}L${X(Y0)},${Y(0)}Z`;
    const gr = svgEl("linearGradient", {id: "lg", x1: 0, x2: 0, y1: 0, y2: 1}, svgEl("defs", {}, svg)); svgEl("stop", {offset: 0, "stop-color": "#8fd0ee", "stop-opacity": .22}, gr); svgEl("stop", {offset: 1, "stop-color": "#8fd0ee", "stop-opacity": 0}, gr);
    svgEl("path", {d: area, fill: "url(#lg)"}, svg);
    svgEl("path", {d: "M" + pts.map(p => p.join(",")).join("L"), fill: "none", stroke: "#8fd0ee", "stroke-width": 1.8, "stroke-linejoin": "round"}, svg);
    N.years.forEach((y, i) => { const p = N.aprilToJuneOnly[i]; svgEl("circle", {cx: pts[i][0], cy: pts[i][1], r: p ? 3.4 : 2.4, fill: p ? "#05080d" : "#e9f6ff", stroke: "#8fd0ee", "stroke-width": p ? 1.4 : 0}, svg); });
    // 2026: the three published projections, each drawn from the 2025 point
    const x25 = X(2025), y25 = Y(N.nim[N.nim.length - 1]), x26 = X(2026);
    const lab = (v, text, col, dy = 4) => { svgEl("path", {d: `M${x25},${y25}C${(x25 + x26)/2},${y25} ${(x25 + x26)/2},${Y(v)} ${x26},${Y(v)}`, fill: "none", stroke: col, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .8}, svg);
      svgEl("circle", {cx: x26, cy: Y(v), r: 3, fill: col}, svg); const t = svgEl("text", {x: x26 + 10, y: Y(v) + dy, fill: col}, svg); t.textContent = text; };
    const ce = P.find(p => /Census/.test(p.src)), cb = P.find(p => /Budget/.test(p.src)), br = P.find(p => p.lo !== p.hi);
    if (cb) lab(cb.lo, nar ? "CBO" : `CBO +${short(cb.lo)} (calendar year)`, "#f2b950", -2);
    if (ce) lab(ce.lo, nar ? "Census" : `Census Bureau +${short(ce.lo)}`, "#f2b950", 10);
    if (br) { svgEl("line", {x1: x26, x2: x26, y1: Y(br.hi), y2: Y(br.lo), stroke: "#9dd3ee", "stroke-width": 3, opacity: .7}, svg);
      for (const v of [br.hi, br.lo]) svgEl("path", {d: `M${x25},${y25}C${(x25 + x26)/2},${y25} ${(x25 + x26)/2},${Y(v)} ${x26},${Y(v)}`, fill: "none", stroke: "#9dd3ee", "stroke-width": .8, "stroke-dasharray": "2 4", opacity: .6}, svg);
      const t = svgEl("text", {x: x26 + 10, y: Y(br.lo) - 4, fill: "#9dd3ee"}, svg); t.textContent = nar ? "Brookings" : `Brookings/AEI ${short(br.lo)} to +${short(br.hi)}`; }
    // hover: the nearest year
    const guide = svgEl("line", {y1: m.t, y2: H - m.b, stroke: "rgba(236,230,216,.3)", "stroke-dasharray": "2 4", opacity: 0}, svg);
    const hit = svgEl("rect", {x: m.l, y: 0, width: X(2025) - m.l + 10, height: H, fill: "transparent"}, svg);
    hit.addEventListener("pointermove", e => { const r = svg.getBoundingClientRect(), y = clamp(Math.round(Y0 + (e.clientX - r.left - m.l)/(W - m.l - m.r)*(Y1 - Y0)), Y0, 2025), i = y - Y0;
      guide.setAttribute("x1", X(y)); guide.setAttribute("x2", X(y)); guide.setAttribute("opacity", 1);
      tip.innerHTML = `<b>${y}</b>${full(N.nim[i])} people<br><span>${N.source[i].replace(/ \(.*$/, "")}${N.aprilToJuneOnly[i] ? " · April–June only" : ""}</span>`;
      tip.style.opacity = 1; tip.style.left = Math.min(W - 190, X(y) + 14) + "px"; tip.style.top = Math.max(0, Y(N.nim[i]) - 60) + "px"; });
    hit.addEventListener("pointerleave", () => { tip.style.opacity = 0; guide.setAttribute("opacity", 0); }); }
  draw(); addEventListener("resize", debounce(draw)); }

// ================================================================ stacked charts that open into their parts
class Stack {
  /* cfg: {unit, unitShort, legTitle, aria, base (colour family when buckets have none), modes: [{k, label, build() -> {years, partial, note, buckets}}]}
     bucket: {k, label, color?, v, kids() -> {items: [{label, v}], note} | undefined}. A null value is a year the series does not cover: no band there. */
  constructor(sectionId, cfg) { this.cfg = cfg; this.mode = cfg.modes[0]; this.sel = null; this.t = 0; this.hov = null; this.cache = {};
    const sec = $(sectionId); if (cfg.modes.length > 1) { const ctrl = div("ctrl", sec), seg = div("seg", ctrl); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Group by");
      for (const md of cfg.modes) { const b = document.createElement("button"); b.type = "button"; b.textContent = md.label; b.onclick = () => this.setMode(md); seg.appendChild(b); md.btn = b; } }
    const body = div("body", sec); this.plot = div("plot chart", body); this.leg = div("leg", body); this.note = document.createElement("p"); this.note.className = "note"; sec.appendChild(this.note);
    this.backBtn = document.createElement("button"); this.backBtn.type = "button"; this.backBtn.className = "back"; this.backBtn.textContent = "← All categories"; this.backBtn.hidden = true; this.backBtn.onclick = () => this.close(); this.plot.appendChild(this.backBtn);
    this.tip = div("tip", this.plot); this.bands = new Map();
    addEventListener("keydown", e => { if (e.key === "Escape" && this.sel) this.close(); });
    addEventListener("resize", debounce(() => this.build()));
    this.paintCtl(); this.build(); }
  data() { if (!this.cache[this.mode.k]) { const D = this.mode.build(), cols = family(this.cfg.base || "#8fd3ff", D.buckets.length); D.buckets.forEach((b, i) => b.color = b.color || cols[i]); this.cache[this.mode.k] = D; } return this.cache[this.mode.k]; }
  setMode(md) { if (md === this.mode) return; this.mode = md; this.sel = null; this.t = 0; this.hov = null; this.paintCtl(); this.build(); }
  paintCtl() { for (const md of this.cfg.modes) if (md.btn) md.btn.setAttribute("aria-pressed", md === this.mode); }
  kids(b) { if (!b._kids) { const K = b.kids(), items = byTotal(K.items.filter(it => sum(it.v) > 0)), cols = family(b.color.startsWith("#") ? b.color : this.cfg.base || "#8fd3ff", items.length); items.forEach((it, i) => it.color = cols[i]); b._kids = {...K, items}; } return b._kids; }
  /* the svg is rebuilt on resize or a change of grouping; the bands and axes are redrawn every frame of a transition */
  build() { if (this.svg) this.svg.remove(); this.bands.clear(); const W = this.plot.clientWidth || 600, H = Math.round(clamp(W*.5, 280, 440));
    this.W = W; this.H = H; this.m = {l: 56, r: 12, t: 30, b: 34}; const m = this.m; this.svg = svgEl("svg", {width: W, height: H, role: "img", "aria-label": this.cfg.aria}); this.plot.prepend(this.svg);
    const clip = "clip-" + Math.random().toString(36).slice(2, 8); svgEl("rect", {x: m.l, y: 0, width: W - m.l - m.r, height: H - m.b + 1}, svgEl("clipPath", {id: clip}, svgEl("defs", {}, this.svg)));
    this.gAxis = svgEl("g", {}, this.svg); this.gBands = svgEl("g", {"clip-path": `url(#${clip})`}, this.svg); this.gX = svgEl("g", {}, this.svg);
    this.svg.addEventListener("pointermove", e => this.move(e)); this.svg.addEventListener("pointerleave", () => { this.hov = null; this.tip.style.opacity = 0; this.render(); });
    this.svg.addEventListener("click", () => { if (!this.sel && this.hov && this.hov.b) this.open(this.hov.b); });
    const D = this.data(); this.note.innerHTML = this.cfg.quiet ? "" : [D.note, D.partial && Object.keys(D.partial).length ? "* " + Object.entries(D.partial).map(([y, t]) => `${y}: ${t}`).join("; ") + "." : ""].filter(Boolean).join(" "); this.note.hidden = !this.note.innerHTML;
    this.legKey = null; this.render(); }
  /* this frame's layers: the categories (the others shrinking as the chosen one opens), then all of its parts fading in over it */
  layers() { const D = this.data(), k1 = ease(clamp(this.t/.55)), k2 = ease(clamp((this.t - .45)/.55)), L = [], tr = v => v.map(x => x == null ? null : Math.max(0, x));
    for (const b of byTotal(D.buckets)) { const f = this.sel && b !== this.sel ? 1 - k1 : 1; L.push({k: b.k, label: b.label, color: b.color, v: tr(b.v).map(x => x == null ? null : x*f), a: this.sel && b === this.sel ? 1 - k2 : this.sel ? 1 - k1 : 1, b, raw: tr(b.v)}); }
    if (this.sel && k2 > 0) this.kids(this.sel).items.forEach((it, i) => L.push({k: "kid:" + i, label: it.label, color: it.color, v: tr(it.v), a: k2, kid: true}));
    return {L, k1}; }
  stack(L) { const n = this.data().years.length, base = new Float64Array(n), kb = new Float64Array(n), out = [];
    for (const l of L) { const B = l.kid ? kb : base, y0 = Array.from(B), y1 = y0.map((x, i) => x + (l.v[i] || 0)); y1.forEach((x, i) => B[i] = x); out.push({...l, y0, y1}); } return out; }
  render() { const D = this.data(), ys = D.years, {L, k1} = this.layers(), S = this.stack(L), m = this.m, W = this.W, H = this.H;
    /* the years: all of them, narrowing to the years the opened category's parts cover as it opens */
    let c0 = 0, c1 = ys.length - 1; if (this.sel) { const K = this.kids(this.sel).items, cov = i => K.some(it => it.v[i] != null); while (c0 < c1 && !cov(c0)) c0++; while (c1 > c0 && !cov(c1)) c1--; }
    const xa = lerp(ys[0], ys[c0], k1), xb = Math.max(xa + 1, lerp(ys[ys.length - 1], ys[c1], k1)), X = y => m.l + (y - xa)/(xb - xa)*(W - m.l - m.r); this.xa = xa; this.xb = xb;
    this.gX.replaceChildren(); const span = xb - xa, every = span > 16 ? (W < 640 ? 5 : 2) : span > 8 && W < 640 ? 2 : 1;
    ys.forEach((y, i) => { if (y < xa - .01 || y > xb + .01) return; const lab = (y - ys[0]) % every === 0 || i === c1; svgEl("line", {x1: X(y), x2: X(y), y1: H - m.b + 2, y2: H - m.b + (lab ? 7 : 4), stroke: "rgba(236,230,216,.3)"}, this.gX);
      if (lab) svgEl("text", {x: X(y), y: H - m.b + 22, "text-anchor": "middle"}, this.gX).textContent = y + (D.partial && D.partial[y] && !this.cfg.quiet ? "*" : ""); });
    const inX = i => i >= c0 || !this.sel, colMax = (ls, i) => sum(ls.map(l => l.raw[i]));
    const maxAll = Math.max(1, ...ys.map((y, i) => colMax(L.filter(l => !l.kid), i))), maxSel = this.sel ? Math.max(1, ...ys.map((y, i) => i >= c0 && i <= c1 ? (L.find(l => l.b === this.sel).raw[i] || 0) : 0)) : maxAll;
    const ymax = niceMax(lerp(maxAll, maxSel, k1)), Y = this.Y = v => m.t + (1 - v/ymax)*(H - m.t - m.b);
    this.gAxis.replaceChildren(); const step = niceStep(ymax/4);
    for (let v = 0; v <= ymax + 1e-6; v += step) { svgEl("line", {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: v === 0 ? "rgba(236,230,216,.35)" : "rgba(236,230,216,.07)"}, this.gAxis);
      svgEl("text", {x: m.l - 8, y: Y(v) + 4, "text-anchor": "end"}, this.gAxis).textContent = short(v); }
    svgEl("text", {x: m.l, y: 14}, this.gAxis).textContent = "Per year, " + this.cfg.unit + (this.sel ? " · " + this.sel.label : "");
    const seen = new Set(), hv = this.hov && this.hov.k;
    for (const l of S) { seen.add(l.k); let p = this.bands.get(l.k); if (!p) { p = svgEl("path", {class: "band"}, this.gBands); this.bands.set(l.k, p); }
      const idx = ys.map((y, i) => i).filter(i => l.v[i] != null), top = idx.map(i => `${X(ys[i]).toFixed(1)},${Y(l.y1[i]).toFixed(1)}`), bot = idx.map(i => `${X(ys[i]).toFixed(1)},${Y(l.y0[i]).toFixed(1)}`).reverse();
      p.setAttribute("d", idx.length ? `M${top.join("L")}L${bot.join("L")}Z` : ""); p.setAttribute("fill", l.color);
      p.style.opacity = (l.a*(hv && hv !== l.k ? .28 : 1)*.94).toFixed(3); p.classList.toggle("hi", hv === l.k); p.classList.toggle("can", !this.sel && !l.kid && !!l.b.kids); p.style.display = l.a < .01 ? "none" : ""; }
    for (const [k, p] of this.bands) if (!seen.has(k)) { p.remove(); this.bands.delete(k); }
    this.S = S; this.legend(); this.backBtn.hidden = !this.sel || this.t < .5; }
  move(e) { if (this.t > 0 && this.t < 1) return; const r = this.svg.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, ys = this.data().years;
    const i = clamp(Math.round(this.xa + (x - this.m.l)/(this.W - this.m.l - this.m.r)*(this.xb - this.xa)) - ys[0], 0, ys.length - 1), want = this.sel ? l => l.kid : l => !l.kid;
    let hit = null; for (const l of this.S) { if (!want(l) || l.a < .5 || l.v[i] == null) continue; if (y <= this.Y(l.y0[i]) + 1 && y >= this.Y(l.y1[i]) - 1 && l.y1[i] > l.y0[i]) hit = l; }
    const was = this.hov && this.hov.k; this.hov = hit ? {k: hit.k, b: hit.kid ? null : hit.b} : null; if (was !== (this.hov && this.hov.k)) this.render();
    if (!hit) { this.tip.style.opacity = 0; return; } const v = hit.y1[i] - hit.y0[i], tot = sum(this.S.filter(q => q.kid === !!hit.kid && q.a > .5).map(q => q.y1[i] - q.y0[i])), P = this.data().partial || {};
    this.tip.innerHTML = `<b>${hit.label}</b>${ys[i]}${P[ys[i]] && !this.cfg.quiet ? "*" : ""} · ${full(v)} ${this.cfg.unitShort}<br><span>${tot ? (v/tot*100).toFixed(v/tot < .01 ? 1 : 0) + "% of the total shown" : ""}${!this.sel && hit.b.kids ? " · click to see its parts" : ""}</span>${this.cfg.quiet && P[ys[i]] ? `<br><span>${ys[i]}: ${P[ys[i]]}</span>` : ""}`;
    this.tip.style.opacity = 1; this.tip.style.left = Math.min(this.W - 230, x + 14) + "px"; this.tip.style.top = Math.max(0, y - 54) + "px"; }
  open(b) { if (!b || !b.kids) return; this.sel = b; this.hov = null; this.tip.style.opacity = 0; this.animate(1); }
  close() { if (!this.sel) return; this.hov = null; this.tip.style.opacity = 0; this.animate(0, () => { this.sel = null; this.render(); }); }
  animate(to, done) { const t0 = performance.now(), from = this.t, dur = 1300;
    const step = now => { const u = clamp((now - t0)/dur); this.t = lerp(from, to, u); this.render(); if (u < 1) requestAnimationFrame(step); else if (done) done(); }; requestAnimationFrame(step); }
  legend() { /* a chart may leave its categories unlisted (cfg.hideLegend): the legend then shows only once a category is opened, and the chart takes the width */
    const hideNow = !!(this.cfg.hideLegend && this.cfg.hideLegend(this.mode.k) && !this.sel); if (hideNow !== !!this.legHidden) { this.legHidden = hideNow; this.leg.hidden = hideNow; this.legKey = null; this.build(); return; }
    const D = this.data(), open = this.sel && (this.t >= .5 || this.legHidden === false && this.cfg.hideLegend && this.cfg.hideLegend(this.mode.k)), hv = this.hov && this.hov.k, key = (this.sel ? this.sel.k : "") + "|" + open + "|" + this.mode.k;
    const latest = v => { let i = v.length - 1; while (i > 0 && !(v[i] > 0)) i--; return `${full(v[i] || 0)} in ${D.years[i]}`; };   /* its last year with data */
    if (key !== this.legKey) { this.legKey = key; const items = open ? this.kids(this.sel).items.map((it, i) => ({k: "kid:" + i, color: it.color, label: it.label, sub: latest(it.v)}))
        : byTotal(D.buckets).map(b => ({k: b.k, color: b.color, label: b.label, sub: latest(b.v), b}));
      this.leg.innerHTML = `<h3>${open ? this.sel.label : this.cfg.legTitle}<span>${items.length} ${open ? "parts" : "categories"}</span></h3>`; const list = div("list", this.leg); this.legBtns = new Map();
      for (const it of items) { const b = document.createElement("button"); b.type = "button"; b.innerHTML = `<i style="background:${it.color}"></i><span>${it.label}<em>${it.sub}</em></span>`;
        b.onmouseenter = b.onfocus = () => { this.hov = {k: it.k, b: it.b || null}; this.render(); }; b.onmouseleave = b.onblur = () => { this.hov = null; this.render(); };
        b.onclick = () => { if (!this.sel && it.b) this.open(it.b); }; list.appendChild(b); this.legBtns.set(it.k, b); }
      const K = open ? this.kids(this.sel) : null, hint = open ? (K.note ? K.note + " " : "") + "Press Esc or ← All categories to go back." : "";
      if (hint) div("hint", this.leg).textContent = hint; }
    for (const [k, b] of this.legBtns) b.classList.toggle("dim", !!hv && hv !== k); }
}
const niceStep = x => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1)))), f = x/p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10)*p; };
const niceMax = x => { const s = niceStep(x/4); return Math.ceil(x/s)*s; };

// ---------------------------------------------------------------- census: by state (opening into its counties) or by region (opening into its states)
function censusChart() { const C = window.CENSUS, ys = C.years, ST = C.states, REG = C.regions;
  const stv = ab => ST.find(s => s.ab === ab), sumOf = list => ys.map((y, i) => sum(list.map(s => s.v[i])));
  const partial = {2010: "April–June only", 2020: "April–June only"}, note = "Census Bureau population estimates, Vintages 2009, 2020 and 2025. Years end 1 July. A year in which a place lost more people abroad than it gained is drawn as zero.";
  return new Stack("census", {unit: "net international migration", unitShort: "people", legTitle: "Net international migration", base: "#8fd3ff", aria: "Stacked area chart of net international migration by place",
    quiet: true,   /* no note, hint or asterisks */
    modes: [{k: "state", label: "States", build: () => ({years: ys, partial, note, buckets: ST.map((s, si) => ({k: s.ab, label: s.n, v: s.v, kids: () => ({items: C.counties.filter(c => c.s === si).map(c => ({label: c.n, v: c.v}))})}))})},
            {k: "region", label: "Regions", build: () => ({years: ys, partial, note, buckets: Object.keys(REG).map(r => ({k: r, label: r, color: {Northeast: "#5aa6cf", Midwest: "#3fc9b0", South: "#8fd3ff", West: "#9b8cff"}[r], v: sumOf(REG[r].map(stv)),
              kids: () => ({items: REG[r].map(ab => ({label: stv(ab).n, v: stv(ab).v}))})}))})}]}); }

// ---------------------------------------------------------------- visas: by category, opening into every visa class
const VCLASS = {"B1/B2": "Business and tourism (B-1/B-2)", "B1/B2/BCC": "Border crossing card (B-1/B-2/BCC)", "B2": "Tourism (B-2)", "B1": "Business (B-1)", "C1/D": "Transit and crew (C-1/D)", "B1/B2/BCV": "Border crossing visa (B-1/B-2/BCV)",
  "C1": "Transit (C-1)", "D": "Crew (D)", "BCC": "Border crossing card (BCC)", "DCREW": "Crew (D crew)", "C4": "Transit to the UN (C-4)", "F1": "Students (F-1)", "J1": "Exchange visitors (J-1)", "J2": "Families of exchange visitors (J-2)",
  "F2": "Families of students (F-2)", "M1": "Vocational students (M-1)", "Q1": "Cultural exchange (Q-1)", "M2": "Families of vocational students (M-2)", "F3": "Border commuter students (F-3)", "H1B": "Specialty occupations (H-1B)",
  "H2A": "Seasonal farm work (H-2A)", "H4": "Families of H workers (H-4)", "H2B": "Seasonal non-farm work (H-2B)", "L2": "Families of transferees (L-2)", "L1": "Intracompany transferees (L-1)", "E2": "Treaty investors (E-2)",
  "E1": "Treaty traders (E-1)", "P1": "Athletes and entertainers (P-1)", "P3": "Culturally unique artists (P-3)", "I": "Foreign media (I)", "O1": "Extraordinary ability (O-1)", "O2": "Assistants to O-1 (O-2)", "O3": "Families of O workers (O-3)",
  "TN": "NAFTA/USMCA professionals (TN)", "TD": "Families of TN workers (TD)", "R1": "Religious workers (R-1)", "R2": "Families of religious workers (R-2)", "H3": "Trainees (H-3)", "E3": "Australian professionals (E-3)",
  "E3D": "Families of E-3 workers (E-3D)", "A2": "Foreign officials (A-2)", "A1": "Diplomats (A-1)", "A3": "Staff of officials (A-3)", "G4": "International organizations (G-4)", "G2": "Representatives to international organizations (G-2)",
  "G1": "Government representatives (G-1)", "G5": "Staff of international organizations (G-5)", "C3": "Officials in transit (C-3)", "NATO2": "NATO representatives (NATO-2)", "K1": "Fiancé(e)s of citizens (K-1)", "K2": "Children of fiancé(e)s (K-2)",
  "K3": "Spouses of citizens (K-3)", "K4": "Children of K-3 holders (K-4)", "V1": "Spouses of residents (V-1)", "V2": "Children of residents (V-2)", "U1": "Victims of crime (U-1)", "U2": "Spouses of crime victims (U-2)", "U3": "Children of crime victims (U-3)",
  "U4": "Parents of crime victims (U-4)", "U5": "Siblings of crime victims (U-5)", "T2": "Spouses of trafficking victims (T-2)", "T3": "Children of trafficking victims (T-3)", "T4": "Parents of trafficking victims (T-4)", "T5": "Siblings of trafficking victims (T-5)"};
function visaChart() { const V = window.VISAS, CY = V.classYears, COL = {visitor: "#5aa6cf", work: "#ff45c5", student: "#f2e640", official: "#9b8cff", family: "#3fc9b0", humanitarian: "#ffb347"};
  const partial = {}; for (const y of V.derived) partial[y] = "summed from the State Department’s monthly reports";
  const onYears = v => V.years.map(y => { const i = CY.indexOf(y); return i < 0 ? null : v[i]; });
  return new Stack("visas", {unit: "visas issued", unitShort: "visas", legTitle: "Visa categories", aria: "Stacked area chart of visas issued by category",
    modes: [{k: "bucket", label: "Categories", build: () => ({years: V.years, partial, note: "U.S. Department of State, nonimmigrant visa issuances. Fiscal years end 30 September.",
      buckets: V.buckets.map(b => ({k: b.k, label: b.label, color: COL[b.k], v: b.total,
        kids: () => ({items: b.all.map(c => ({label: VCLASS[c.c] || c.c, v: onYears(c.v)})), note: `Every visa class, FY${CY[0]}–${CY[CY.length - 1]}, from the State Department’s monthly reports (the years with every class published); they agree with the annual totals to within 2%.`})}))})}]}); }

// ---------------------------------------------------------------- ICE removals, BPS removals and ICE detention: three charts, never stacked together
/* ICE publishes facility names in capitals ("STEWART DETENTION CENTER · Lumpkin, GA"): set them in title case, keeping the acronyms */
const KEEP = new Set(["ICE", "ICDC", "IPC", "CDF", "SPC", "USM", "BOP", "FDC", "MDC", "CCA", "II", "III", "LLC", "ICA", "DHS"]);
const facName = s => { const [nm, place] = s.split(" · "); return nm.split(/(\s+|-|\/|\()/).map(w => KEEP.has(w) || !/[A-Z]{2}/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join("") + (place ? ", " + place : ""); };
function iceChart() { const I = window.DEP.ice, ys = I.years, partial = {}; for (const [y, t] of Object.entries(I.partial || {})) partial[y] = t;
  const series = (rows, key) => { const o = new Map(); for (const r of rows) { const k = r[key]; if (!o.has(k)) o.set(k, ys.map(() => 0)); o.get(k)[ys.indexOf(r[0])] += r[3]; } return [...o].map(([label, v]) => ({label, v})); };
  const note = "Deportation Data Project, ICE arrests table: removals that began with an ICE arrest, by calendar year of departure.";
  return new Stack("ice", {unit: "removals", unitShort: "removals", legTitle: "", base: "#ff5a40", aria: "Stacked area chart of removals that began with an ICE arrest",
    modes: [{k: "country", label: "By destination", build: () => ({years: ys, partial, note, buckets: series(I.flows, 2).map(s => ({k: s.label, label: s.label, v: s.v,
              kids: () => ({items: series(I.flows.filter(f => f[2] === s.label), 1), note: "Split by the state where the arrest was made."})}))})},
            {k: "state", label: "By arrest", build: () => ({years: ys, partial, note, buckets: series(I.flows, 1).map(s => ({k: s.label, label: s.label, v: s.v,
              kids: () => ({items: series(I.flows.filter(f => f[1] === s.label), 2), note: "Split by the country each person was sent to."})}))})}]}); }
function bpsChart() { const B = window.DEP.bps;
  return new Stack("bps", {unit: "removals", unitShort: "removals", legTitle: "BPS removals by sector", base: "#c41e3a", aria: "Stacked area chart of removals after a border arrest, by Border Patrol sector",
    modes: [{k: "sector", label: "By sector", build: () => ({years: B.years, partial: {}, note: "DHS Office of Homeland Security Statistics, enforcement tables: removals after a border arrest, fiscal years. Each year’s total is split by Border Patrol sector in proportion to that year’s encounters, an estimate. DHS does not publish these removals by destination country.",
      buckets: Object.entries(B.bySector).map(([n, v]) => ({k: n, label: n, v}))})}]}); }
function detChart() { const T = window.DEP.det, ys = T.years, SN = Object.fromEntries(window.CENSUS.states.map(s => [s.ab, s.n])), F = T.facilities.map(f => ({label: facName(f.n), st: SN[f.st] || "State not identified", v: f.v})), states = [...new Set(F.map(f => f.st))];
  return new Stack("det", {unit: "people held, average day", unitShort: "people held", legTitle: "Held by ICE, by state", base: "#ff8a6a", aria: "Stacked area chart of people held in ICE detention by state",
    modes: [{k: "state", label: "By state", build: () => ({years: ys, partial: {[ys[ys.length - 1]]: "fiscal year to date"}, note: "ICE detention statistics: the average number of people held on any day of the fiscal year, by facility, grouped by the state the facility is in.",
      buckets: states.map(s => ({k: s, label: s, v: ys.map((y, i) => sum(F.filter(f => f.st === s).map(f => f.v[i]))), kids: () => ({items: F.filter(f => f.st === s).map(f => ({label: f.label, v: f.v})), note: "Every ICE facility in the state."})}))})}]}); }

lineChart(); const CH = [censusChart(), visaChart(), iceChart(), bpsChart(), detChart()];
/* a link can open a chart at a category: graphs.html?open=visas:work, ?open=census:CA, ?open=ice:state:Texas (add &still to skip the animation) */
setTimeout(() => { const q = new URLSearchParams(location.search).get("open"); if (!q) return; const [id, a, b] = q.split(":"), c = CH[["census", "visas", "ice", "bps", "det"].indexOf(id)]; if (!c) return;
  if (b) { const md = c.cfg.modes.find(m => m.k === a); if (md) c.setMode(md); } const bk = c.data().buckets.find(x => x.k === (b || a)); if (!bk) return; $(id).scrollIntoView();
  if (new URLSearchParams(location.search).has("still")) { c.sel = bk; c.t = 1; c.render(); } else c.open(bk); }, 300);
