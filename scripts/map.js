"use strict";
// The Map page. One view, three levels, moved between by scrolling (or the level buttons):
//   0  the United States: the interactive state map, 2001-2025 (map-layers.js), with its timeline
//   1  the world: the map shrinks into the globe and the visas, green cards and removals spread from it
//   2  by category: the globe splits into one small globe per category, immigration in one row, deportation in the next
// The legend is always on. Its bold Immigration and Deportation rows switch on every layer of that group and off every other.
const NAVH = () => $("states").getBoundingClientRect().top;
let ZOOM = 0, ZT = 0, SPINL = 0, SM_OVL = 1, LEVEL = -1, gDrag = null, wheelDir = 1, snapT = 0;
/* the world's own camera: SPINL turns it (longitude), TILT tips it (latitude), ZK zooms in on a chosen country; TGT is where a click is taking it */
let TILT = 22, ZK = 1, TGT = null, HOVC = -1, SELC = -1, FOCLIT = 0, FOCA = 0, LITF = -2;
const smooth = (a, b, x) => { const t = clamp((x - a)/(b - a)); return t*t*(3 - 2*t); };
const ovc = $("ov"), ov = ovc.getContext("2d");
/* the level buttons sit at the top and the legend runs along the bottom: the maps fit between them (heights measured, not guessed) */
const LEGW = () => 24, TOPM = () => Math.max(40, $("levels").getBoundingClientRect().bottom - NAVH() + 14), BOTM = () => $("legend").offsetHeight + 16;

// ---- cameras: the US fitted beside the legend; the world; a camera from one to the other
const US_EDGE = [[-124.7,48.4],[-124.2,43],[-124.4,40.4],[-120.6,34.5],[-117.1,32.5],[-111,31.3],[-106.5,31.8],[-103,29],[-97.4,25.8],[-94,29.6],[-89.6,29.2],[-85,29.7],[-82.7,27.5],[-80.2,25.1],[-80,26.9],[-81,30.5],[-75.5,35.2],[-76,38],[-74,40.5],[-70,41.7],[-70.6,43],[-67,44.8],[-69.2,47.4],[-75,45],[-83,46],[-89,48],[-95,49],[-122,49]];
let USC = null, USCK = "";
function usCam() { const key = W + "x" + H + "x" + TOPM() + "x" + BOTM(); if (USCK === key) return {...USC}; const lon0 = -96.5, lat0 = 38.2, L0 = lon0*D2R, B0 = lat0*D2R; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [lo, la] of US_EDGE) { const p = v3(lo, la), cl = Math.cos(L0), sl = Math.sin(L0), cb = Math.cos(B0), sb = Math.sin(B0), x = cl*p[0] - sl*p[2], y = -sl*sb*p[0] + cb*p[1] - cl*sb*p[2]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const top = TOPM(), bot = BOTM(), L = 30, Rr = LEGW() + 10, R = Math.min((W - L - Rr)/(x1 - x0), (H - top - bot)/(y1 - y0));
  USC = {lon: lon0, lat: lat0, R, cx: L + (W - L - Rr)/2 - (x0 + x1)/2*R, cy: top + (H - top - bot)/2 + (y0 + y1)/2*R}; USCK = key; return {...USC}; }
const camMix = (a, b, u) => { const dl = ((b.lon - a.lon + 540) % 360) - 180; return {lon: a.lon + dl*u, lat: lerp(a.lat, b.lat, u), R: Math.exp(lerp(Math.log(a.R), Math.log(b.R), u)), cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u)}; };
/* the world: clear of the legend, with room around it for the arcs that rise off the globe */
function worldCam() { const L = 30, Rr = LEGW(), top = TOPM() + 30, bot = BOTM() + 10, aw = W - L - Rr, ah = H - top - bot;
  return {lon: -96.5 + SPINL, lat: TILT, R: Math.max(50, Math.min(aw*.3, ah*.4))*ZK, cx: L + aw/2, cy: top + ah/2}; }

// ---- the categories of the globes: what each draws, its colour, total and unit
const REM25 = D.rem.years["2025"].reduce((s, r) => s + r[2], 0), DET25 = Math.round(window.DET.tot[window.DET.years.indexOf(2025)]);
let DETG = null;   /* the people held by ICE, 2025, as dots at their facilities on the globe (one per person, as on the US map) */
function detGL() { if (DETG) return DETG; const a = [], F = window.DET.f, yi = DETY.indexOf(2025);
  for (const d of DETP) { if (STS.detState[d.f] < 0 || d.j >= Math.round(F[d.f][2][yi])) continue; pushDot(a, d.p, d.p, hex(REDS[d.k]), 255, 7, 0); } return DETG = dotBuf(new Float32Array(a)); }
/* with a country in focus (hovered or chosen) every dot not going to or from it dims (FOCLIT), and the arcs, which cannot be told apart by country, fade (FOCA) */
const dots = (B, tr, a) => drawDots(B, {tr, alpha: a, size: 1, glow: false, lit: FOCLIT, dimA: .07}), lines = (B, tr, a) => drawLines(B, {tr, alpha: a*(1 - FOCA)});
const visaCat = (t, name) => ({k: "v" + t, g: "imm", name, col: TFAM[t][0], total: () => NIV(t), unit: "visas issued, 2024 · 1 dot = 50",
  draw: (a, tr) => { const B = typeBuf(t); lines(B.lines, tr, .055*a); dots(B.dots, tr, .85*a); }});
const CATS = [visaCat(0, "Visitors"), visaCat(1, "Students"), visaCat(2, "Exchange"), visaCat(3, "H-1B"), visaCat(4, "Other work"), visaCat(5, "Other visas"),
  {k: "gc", g: "imm", name: "Green cards", col: "#3ddc84", total: () => D.lpr[VI], unit: "new green cards, 2024 · 1 dot = 1 person",
   draw: (a, tr) => { const B = lprgBuf(); lines(B.lines, tr, .05*a); dots(B.dots, tr, .85*a); }},
  {k: "ice", g: "dep", name: "ICE removals", col: "#ff5a40", total: () => REM25, unit: "removals that began with an ICE arrest, 2025 · 1 dot = 1 removal",
   draw: (a, tr) => { const B = iceRem(); lines(B.lines, tr, .5*a); dots(B.dots, tr, .95*a); }},
  {k: "bp", g: "dep", name: "BPS removals", col: "#c41e3a", total: () => BP.border, unit: "removals after a border arrest, 2024 · 1 dot = 1 removal; destinations estimated",
   draw: (a, tr) => { const B = bpb(); lines(B.lines, tr, .5*a); dots(B.dots, tr, .95*a); }},
  {k: "det", g: "dep", name: "Held by ICE", col: "#ff7a62", total: () => DET25, unit: "held on an average day, 2025 · 1 dot = 1 person",
   draw: (a) => drawDots(detGL(), {tr: 2, alpha: .95*a, size: 1.3, glow: false, lit: FOCLIT, dimA: .07})}];
// the US map's own layers (map-layers.js draws them)
const US_ROWS = [["nim", "imm", "#8fd3ff", "Net arrivals since 2001"], ["gc", "imm", "#3ddc84", "New green cards"], ["h1b", "imm", "#ff45c5", "H-1B approvals"],
  ["stu", "imm", "#f2e640", "International students"], ["det", "dep", "#ff5a40", "Held by ICE, average day"], ["bp", "dep", "#c41e3a", "BPS removals"]];
const GROUP = {imm: ["nim", "gc", "h1b", "stu", "v0", "v1", "v2", "v3", "v4", "v5"], dep: ["det", "bp", "ice"]};

// ---- the legend, the map's one key and one table of numbers: at its top the place in view (a chosen state or country, else the US or the world),
//      then a row per layer with that place's number, which also switches the layer on and off. The group rows switch their group on and the other off.
const legRows = $("legrows"), LSUM = a => a.reduce((t, x) => t + (x || 0), 0);
/* the US map's numbers, for a state (si) or the nation, in year Y, as the state panel computed them */
function usVals(si, Y) { const sts = si >= 0 ? [STS.states[si]] : STS.states, yi = SY.indexOf(Y), gy = Math.min(Y, 2024), dy = Math.min(Y, 2025), hi = SM_HY.filter(y => y <= Y).length - 1;
  return {nim: LSUM(sts.map(s => LSUM(s.nim.slice(0, yi + 1)))), gc: Y >= 2004 ? LSUM(sts.map(s => s.gc[gy])) : null,
    h1b: hi >= 0 ? SM_H.z.reduce((t, z, i) => t + (si < 0 || z[2] === si ? SM_HV[i][hi] : 0), 0) : null, stu: Y >= 2024 ? STS.stu.reduce((t, s) => t + (si < 0 || s[2] === si ? s[3] : 0), 0) : null,
    det: Y >= 2019 ? (si >= 0 ? smDet(si, dy) : Math.round(window.DET.tot[window.DET.years.indexOf(dy)])) : null,
    bp: Y >= 2014 ? Math.round(SM_BP.filter(b => si < 0 || b.si === si).reduce((t, b) => t + b.v[Math.min(Y, 2024) - 2014], 0)) : null}; }
/* the globe's numbers, for a country (ci) or the world */
function worldVals(ci) { const o = {}; if (ci < 0) { for (let t = 0; t < 6; t++) o["v" + t] = NIV(t); return {...o, gc: D.lpr[VI], ice: REM25, bp: BP.border, det: DET25}; }
  const s = cStats(ci); s.types.forEach((v, t) => o["v" + t] = v); return {...o, gc: s.gc, ice: s.ice, bp: s.bp || null, det: null}; }   /* BPS: estimated for ten countries only, so no number elsewhere */
let LEGF = -1, LEGKEY = "";
function legendPaint() { const lvl = ZOOM < .5 ? 0 : 1, Y = Math.floor(smYear + 1e-6), F = LEGF;
  /* on the US map a row whose data end before the year shown says which year its number is from */
  const hi = SM_HY.filter(y => y <= Y).length - 1, YR = {gc: Math.min(Y, 2024), h1b: hi >= 0 ? SM_HY[hi] : Y, stu: 2024, det: Math.min(Y, 2025), bp: Math.min(Y, 2024)};
  const V = lvl ? worldVals(F) : usVals(smSel, Y), usName = (k, name) => { const est = k === "bp" && smSel >= 0, yr = YR[k] && YR[k] !== Y && V[k] != null ? YR[k] : null;
    return name + (est || yr ? ` (${[est ? "est." : "", yr || ""].filter(Boolean).join(", ")})` : ""); };
  const rows = lvl ? CATS.map(c => [c.k, c.g, c.col, c.k === "bp" && F >= 0 ? "BPS removals (est.)" : c.name]) : US_ROWS.map(([k, g, col, name]) => [k, g, col, usName(k, name)]);
  const title = lvl ? (F >= 0 ? C[F].n : "World") : smSel >= 0 ? STS.states[smSel].n : "United States", sub = lvl ? "2024–2025" : String(Y);
  const solo = g => GROUP[g].every(k => LAY[k]) && GROUP[g === "imm" ? "dep" : "imm"].every(k => !LAY[k]), num = v => v == null ? "–" : fmtBig(v);
  let h = `<div class="lh"><b>${title}</b><span>${sub}</span></div>`;
  for (const g of ["imm", "dep"]) { h += `<div class="lg"><button type="button" class="grp" data-g="${g}" aria-pressed="${solo(g)}" title="${solo(g) ? "Show every layer" : "Show only these"}"><b>${g === "imm" ? "Immigration" : "Deportation"}</b></button>`;
    for (const [k, gg, col, name] of rows) if (gg === g) h += `<button type="button" data-k="${k}" aria-pressed="${!!LAY[k]}" class="${LAY[k] ? "" : "off"}"><i style="background:${col}"></i><span>${name}</span><em>${num(V[k])}</em></button>`; h += `</div>`; }
  legRows.innerHTML = h; $("scwrap").hidden = lvl > 0;
  $("legunit").textContent = lvl ? "1 dot = 1 person · visas: 1 dot = 50" : "1 dot = 1 person"; }
/* repainted only when what it shows changes: the level, the place, the year or a layer */
function legendTick(F) { LEGF = F; const key = (ZOOM < .5 ? 0 : 1) + "|" + smSel + "|" + Math.floor(smYear + 1e-6) + "|" + F + "|" + Object.values(LAY).map(Number).join(""); if (key !== LEGKEY) { LEGKEY = key; legendPaint(); } }
legRows.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation();
  if (b.dataset.g) { const g = b.dataset.g, mine = GROUP[g], other = GROUP[g === "imm" ? "dep" : "imm"], was = mine.every(k => LAY[k]) && other.every(k => !LAY[k]);
    for (const k of mine) LAY[k] = true; for (const k of other) LAY[k] = was; }
  else LAY[b.dataset.k] = !LAY[b.dataset.k];
  legendPaint(); });

// ---- levels: the wheel moves the zoom target, which settles on the nearest level once the wheel stops
const levelBtns = [...$("levels").querySelectorAll("button")];
levelBtns.forEach(b => b.onclick = () => { if (smSel >= 0) smBack(); countryPick(-1); TGT = null; ZK = 1; ZT = +b.dataset.z; });
/* any scroll moves one level in its direction once it stops (a mouse wheel's lines and a trackpad's pixels alike) */
addEventListener("wheel", e => { if (e.target.closest && e.target.closest("#legend, #levels, .nav, #cpanel")) return; if (smSel >= 0 && ZOOM < .02) return;   /* in a state, the map zooms itself */
  e.preventDefault(); const dy = e.deltaY*(e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1); if (!dy) return;
  if (SELC >= 0) { if (dy < 0) return; countryPick(-1); }   /* with a country chosen on the globe, zooming in stays on it; zooming out lets it go */
  /* on the world the globe itself zooms first, up to twice as close; only then does scrolling in go on to the US map
     (and scrolling out first brings the globe back to its size before it splits in two) */
  if (Math.abs(ZT - 1) < .01 && !TGT) {
    if (dy < 0 && ZK < 2 - 1e-3) { ZK = Math.min(2, ZK*Math.exp(-dy*.0015)); clearTimeout(snapT); return; }
    if (dy > 0 && ZK > 1 + 1e-3) { ZK = Math.max(1, ZK*Math.exp(-dy*.0015)); clearTimeout(snapT); return; } }
  ZT = clamp(ZT + dy*.0016, 0, 2); wheelDir = Math.sign(dy); clearTimeout(snapT);
  snapT = setTimeout(() => { ZT = clamp(wheelDir > 0 ? Math.ceil(ZT - 1e-6) : Math.floor(ZT + 1e-6), 0, 2); if (ZT !== 1 && ZK !== 1) TGT = {k: 1}; }, 170); }, {passive: false, capture: true});   /* leaving the world, its own zoom eases back */
addEventListener("keydown", e => { if (e.key === "-" || e.key === "PageDown") ZT = Math.min(2, Math.round(ZT) + 1); if (e.key === "+" || e.key === "=" || e.key === "PageUp") ZT = Math.max(0, Math.round(ZT) - 1); if (e.key === "Escape") countryPick(-1); });

// ---- the world: drag to turn it any way; hover a country to see its numbers and only its dots; click to fly to it
const onWorld = () => Math.abs(ZOOM - 1) < .04, ctip = $("ctip"), cpanel = $("cpanel");
glc.addEventListener("pointerdown", e => { if (ZOOM < .3) return; gDrag = {x: e.clientX, y: e.clientY, s: SPINL, t: TILT, moved: false}; TGT = null; glc.setPointerCapture(e.pointerId); });
glc.addEventListener("pointermove", e => { if (gDrag) { const dx = e.clientX - gDrag.x, dy = e.clientY - gDrag.y; if (Math.abs(dx) + Math.abs(dy) > 4) gDrag.moved = true;
    if (gDrag.moved) { const R = Math.max(60, CAM.R); SPINL = gDrag.s - dx/R/D2R; TILT = clamp(gDrag.t + dy/R/D2R, -70, 80); ctip.style.opacity = 0; } return; }
  if (!onWorld()) { HOVC = -1; ctip.style.opacity = 0; return; } const ll = unproj(e.offsetX, e.offsetY), ci = ll ? BYSID.get(maskAt(ll[0], ll[1])) : undefined;
  HOVC = ci != null && ci !== US ? ci : -1; glc.style.cursor = HOVC >= 0 ? "pointer" : "grab";
  if (HOVC < 0 || HOVC === SELC) { ctip.style.opacity = 0; return; } const s = cStats(HOVC);
  ctip.innerHTML = `<b>${C[HOVC].n}</b>${fmtBig(s.vis)} visas issued, 2024${s.gc ? `<br>${fmtBig(s.gc)} green cards, 2024` : ""}${s.ice ? `<br><span class="r">${fmtBig(s.ice)} ICE removals, 2025</span>` : ""}<br><em>click to zoom in</em>`;
  ctip.style.left = Math.min(W - 240, e.offsetX + 16) + "px"; ctip.style.top = (e.offsetY + NAVH() + 12) + "px"; ctip.style.opacity = 1; });
glc.addEventListener("pointerup", () => { const d = gDrag; gDrag = null; if (d && !d.moved && onWorld()) countryPick(HOVC >= 0 && HOVC !== SELC ? HOVC : -1); });
glc.addEventListener("pointerleave", () => { if (!gDrag) { HOVC = -1; ctip.style.opacity = 0; } });
/* a country's numbers: visas issued by type and green cards by country of birth (2024), removals sent to it (ICE 2025; BPS 2024, estimated) */
const GCBY = new Map(); for (const f of window.LPRG) GCBY.set(f[0], (GCBY.get(f[0]) || 0) + f[3]); for (const f of window.LPRG_REST.flows) GCBY.set(f[0], (GCBY.get(f[0]) || 0) + f[2]);
function cStats(ci) { const c = C[ci], v = c.v[VI], rows = D.rem.years["2025"].filter(r => r[1] === c.n), bp = BP.countries.find(x => x[0] === c.n), st = new Map(); for (const r of rows) st.set(r[0], (st.get(r[0]) || 0) + r[2]);
  return {vis: v.reduce((s, x) => s + x, 0), types: v, gc: GCBY.get(c.n) || 0, ice: rows.reduce((s, r) => s + r[2], 0), iceSt: [...st].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]), bp: bp ? bp[1] : 0}; }
function countryPick(ci) { if (ci === SELC) return; SELC = ci; ctip.style.opacity = 0;
  if (ci < 0) { TGT = {k: 1}; cpanel.classList.remove("on"); return; }
  const c = C[ci], n = (CELLS[c.sid] || []).length; TGT = {lon: c.lon + 96.5, lat: clamp(c.lat, -55, 70), k: clamp(4.3 - .6*Math.log10(Math.max(n, 10)), 1.8, 3.6)};   /* closer for smaller countries */
  const s = cStats(ci), NM = ["Visitors", "Students", "Exchange", "H-1B", "Other work", "Other visas"], row = (col, t, v, on = true) => on ? `<div class="r on"><i style="background:${col}"></i><span>${t}</span><b>${Math.round(v).toLocaleString("en-US")}</b></div>` : "";
  cpanel.innerHTML = `<button type="button" class="x" aria-label="Close">✕</button><div class="n">${c.n}</div>` + row("#ece6d8", "visas issued, 2024", s.vis) + s.types.map((v, t) => row(TFAM[t][0], "&nbsp;&nbsp;" + NM[t], v, v > 0)).join("")
    + row("#3ddc84", "green cards, 2024", s.gc, s.gc > 0) + row("#ff5a40", "ICE removals sent here, 2025", s.ice, s.ice > 0) + row("#c41e3a", "BPS removals, 2024 (estimated)", s.bp, s.bp > 0)
    + (s.iceSt.length ? `<div class="t">Most ICE removals to ${c.n} began with an arrest in ${s.iceSt.join(", ")}.</div>` : "") + `<div class="f">Only this country’s dots are shown. Press Esc or click the globe to go back.</div>`;
  cpanel.querySelector(".x").onclick = () => countryPick(-1); cpanel.classList.add("on"); }
/* the dots of the country in focus stay lit; the rest dim (the engine's per-country switch, LIT) */
function focusLit(F) { if (F === LITF) return; LITF = F; for (let i = 0; i < 256; i++) LIT[i*4] = F < 0 || i === F ? 255 : 100; for (let t = 0; t < 256; t++) LIT[(256 + t)*4] = 255; pushLit(); }
function outlineCountry(ci, a) { const sh = SH[C[ci].sid]; if (!sh) return; ov.save(); ov.strokeStyle = `rgba(236,230,216,${a})`; ov.lineWidth = 1; ov.lineJoin = "round";
  for (const r of sh[1]) { ov.beginPath(); let pen = false; for (const [lo, la] of r) { const q = proj(v3(lo, la)); if (q[2] < 0) { pen = false; continue; } pen ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); pen = true; } ov.stroke(); } ov.restore(); }

// ---- immigration v deportation: two globes side by side (one above the other on a phone), each with its own group of layers
const SIDES = [{g: "imm", name: "Immigration", col: "#8fd3ff"}, {g: "dep", name: "Deportation", col: "#ff7a62"}];
function sideCell(i) { const L = 30, Rr = LEGW(), aw = W - L - Rr, top = TOPM() + 20, bot = BOTM() + 50, ah = H - top - bot;
  if (W < 760) { const R = Math.min(aw*.4, ah*.2); return {x: L + aw/2, y: top + ah*(i ? .76 : .24), R}; }
  const R = Math.min(aw*.2, ah*.45); return {x: L + aw*(i ? .74 : .26), y: top + ah/2, R}; }

// ---- each frame
let last = 0;
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = Math.max(200, innerHeight - NAVH());
  for (const c of [glc, ovc]) { c.width = Math.round(W*DPR); c.height = Math.round(H*DPR); } gl.viewport(0, 0, glc.width, glc.height); USCK = ""; if (smSel < 0) smCam = usCam(); legendPaint(); }
function frame(now) { const dt = last ? Math.min(.1, (now - last)/1000) : 0; last = now;
  if (Math.abs(ZT - ZOOM) > 1e-4) ZOOM += (ZT - ZOOM)*Math.min(1, dt*3.6); else ZOOM = ZT; const z = ZOOM;
  const lvl = z < .5 ? 0 : z < 1.5 ? 1 : 2; if (lvl !== LEVEL) { const was = LEVEL; LEVEL = lvl; levelBtns.forEach((b, i) => b.setAttribute("aria-pressed", i === lvl));    $("hint").textContent = lvl === 2 ? "Scroll in to go back" : "Scroll to zoom out"; if ((was === 0) !== (lvl === 0) || was < 0) legendPaint(); }
  if (SELC >= 0 && Math.abs(ZT - 1) > .01) countryPick(-1);   /* leaving the world lets go of the country */
  if (z < .03 && ZK !== 1 && !TGT) ZK = 1;   /* back on the US map, the globe's own zoom resets for next time */
  if (TGT) { const k = Math.min(1, dt*3); if (TGT.lon != null) { SPINL += (((TGT.lon - SPINL + 540) % 360) - 180)*k; TILT += (TGT.lat - TILT)*k; } else TILT += (22 - TILT)*k*.5; ZK += (TGT.k - ZK)*k;
    if (Math.abs(TGT.k - ZK) < .002 && (TGT.lon == null || Math.abs(((TGT.lon - SPINL + 540) % 360) - 180) < .05)) { ZK = TGT.k; TGT = null; } }
  if (z > .98 && !gDrag && !TGT && SELC < 0 && HOVC < 0) SPINL += dt*2.6;   /* the world turns slowly, and stops for a country in focus */
  const F = onWorld() ? (SELC >= 0 ? SELC : HOVC) : -1; FOCLIT = F >= 0 ? 1 : 0; if (F >= 0) focusLit(F); FOCA += ((F >= 0 ? 1 : 0) - FOCA)*Math.min(1, dt*6); legendTick(F);
  // the US map: on its own at level 0; zooming out, the same map is drawn with the shared camera while it shrinks into the globe
  const smc = $("smc"); smc.style.pointerEvents = z < .02 ? "auto" : "none"; glc.style.cursor = z < .3 ? "default" : gDrag ? "grabbing" : "grab";
  if (z < .002) { smc.style.opacity = 1; glc.style.opacity = 0; smTick(dt, false); ov.setTransform(1, 0, 0, 1, 0, 0); ov.clearRect(0, 0, ovc.width, ovc.height); requestAnimationFrame(frame); return; }
  if (smYear < 2025) smYear = Math.min(2025, smYear + dt*10); smPlay = false; smScrub.value = smYear; smYr.textContent = Math.floor(smYear + 1e-6);
  CAM = z <= 1 ? camMix(usCam(), worldCam(), ease(z)) : worldCam(); ROT = rot(CAM);
  SM_OVL = 1 - smooth(0, .45, z); const smA = 1 - smooth(.35, .8, z); smc.style.opacity = smA.toFixed(3); if (smA > .005) smTick(0, true);
  // the globe
  glc.style.opacity = 1; gl.clearColor(.0196, .0314, .051, 1); gl.clear(gl.COLOR_BUFFER_BIT); ov.setTransform(DPR, 0, 0, DPR, 0, 0); ov.clearRect(0, 0, W, H);
  if (z <= 1) { const gA = smooth(.2, .75, z), tr = 2*smooth(.3, 1, z); drawBg(gA); drawDots(LAND, {tr: 2, size: 1, alpha: .7*gA, glow: false});
    for (const c of CATS) if (LAY[c.k] && gA > .01) c.draw(gA, tr);
    if (F >= 0) outlineCountry(F, F === SELC ? .85 : .5); }
  else { const u = ease(z - 1), w0 = worldCam(); if (u < 1) { CAM = w0; ROT = rot(CAM); drawBg(1 - u); }
    // the world splits in two: immigration (visas and green cards) on the left, deportation (removals and detention) on the right
    SIDES.forEach((s, i) => { const p = sideCell(i), list = CATS.filter(c => c.g === s.g); CAM = {lon: w0.lon, lat: w0.lat, R: lerp(w0.R, p.R, u), cx: lerp(w0.cx, p.x, u), cy: lerp(w0.cy, p.y, u)}; ROT = rot(CAM);
      const gr = ov.createRadialGradient(CAM.cx, CAM.cy, CAM.R*.92, CAM.cx, CAM.cy, CAM.R*1.05); gr.addColorStop(0, "rgba(127,192,220,0)"); gr.addColorStop(.6, `rgba(127,192,220,${.3*u})`); gr.addColorStop(1, "rgba(127,192,220,0)");
      ov.fillStyle = gr; ov.beginPath(); ov.arc(CAM.cx, CAM.cy, CAM.R*1.05, 0, 6.283); ov.fill();   /* each globe's rim */
      drawDots(LAND, {tr: 2, size: 1, alpha: .7*(i === 0 ? 1 : u), glow: false}); for (const c of list) if (LAY[c.k]) c.draw(1, 2);
      // its heading and what it shows
      const la = smooth(.5, 1, u); if (la > .01) { const on = list.filter(c => LAY[c.k]), y = CAM.cy + CAM.R + 30; ov.globalAlpha = la; ov.textAlign = "center";
        ov.fillStyle = s.col; ov.font = `700 ${W < 760 ? 13 : 16}px ${CGF}`; ov.fillText(s.name.toUpperCase(), CAM.cx, y);
        ov.fillStyle = "#a7b0bf"; ov.font = `400 ${W < 760 ? 11 : 12.5}px ${CGF}`; ov.fillText(on.length ? on.map(c => c.name).join(" · ") : "every layer is off: switch them on in the legend", CAM.cx, y + 20, Math.max(120, p.R*2.4)); ov.globalAlpha = 1; } }); }
  requestAnimationFrame(frame); }
const CGF = "'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif";
const fmtBig = n => n >= 1e6 ? (n/1e6).toFixed(2) + "M" : n >= 1e4 ? Math.round(n/1e3) + "k" : Math.round(n).toLocaleString("en-US");

addEventListener("resize", resize); resize(); gl.enable(gl.BLEND); smReset(); legendPaint();
/* a link can open the map at a level: map.html?z=1 (the world) or ?z=2 (by category) */
{ const Q = new URLSearchParams(location.search), z = +Q.get("z"); if (z > 0) { ZT = ZOOM = clamp(z, 0, 2); smYear = 2025; }
  const cn = Q.get("country"), ci = cn ? C.findIndex(c => c.n.toLowerCase() === cn.toLowerCase()) : -1;   /* ...&country=India opens the world on that country */
  if (ci >= 0 && ci !== US) { ZT = ZOOM = 1; smYear = 2025; countryPick(ci); SPINL = TGT.lon; TILT = TGT.lat; ZK = TGT.k; TGT = null; } }
$("loading").hidden = true; requestAnimationFrame(frame);
