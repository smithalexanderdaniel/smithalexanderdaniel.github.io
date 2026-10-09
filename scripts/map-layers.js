"use strict";
// The globe's layers and the interactive US map, copied from the presentation's director (tools/extract_map_code.py).
// LAY, the layers switched on, is shared with map.js and its legend.
const LAY = {nim: true, gc: false, h1b: false, stu: false, det: true, bp: true, ice: true, v0: true, v1: true, v2: true, v3: true, v4: true, v5: true};
const GOLD = ["#34d27b", "#5fe39a", "#22b863", "#8ff0b8"];   // green cards: green
// green cards, 2024: one dot per person, from country of birth to where they live (tools/build_lprg.py). Every county x country flow of the 200 busiest
// counties (window.LPRG), then the rest of each state x country (window.LPRG_REST), spread over the state's other counties by 2024 net arrivals.
// The buffer is written in place: about 1.36 million dots would be too many for an ordinary array
let LPRG_B = null; const lprgBuf = () => LPRG_B || (LPRG_B = (() => { const lines = []; sd = 4242; const F = window.LPRG, RS = window.LPRG_REST, mx = Math.max(...F.map(f => f[3])); let cnt = 0;
  const total = F.reduce((s, f) => s + f[3], 0) + RS.flows.reduce((s, f) => s + f[2], 0), buf = new Float32Array(total*12); let o = 0;
  const cOf = (n, xy) => { const ci = C.findIndex(c => c.n === n); return [ci >= 0 ? C[ci] : {n, lon: xy[0], lat: xy[1], sid: -1}, Math.max(ci, 0)]; };
  const put = (c, ci, lon, lat) => { const to = v3(...cloudPt(c)), from = v3(lon + gauss()*.1, lat + gauss()*.08), col = hex(GOLD[Math.floor(rnd()*GOLD.length)]);
    buf.set(to, o); buf.set(from, o + 3); buf.set(col, o + 6); buf[o + 9] = ci; buf[o + 10] = 6; buf[o + 11] = rnd()*.5; o += 12; };
  for (const f of F) { const [n, lon, lat, v] = f, [c, ci] = cOf(n, f[4]); for (let k = 0; k < v; k++) put(c, ci, lon, lat);
    if (cnt++ < 260) { const nl = 1 + Math.round(9*Math.sqrt(v/mx)); for (let k = 0; k < nl; k++) { const to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.9), from = v3(lon + gauss()*.25, lat + gauss()*.2); strand(lines, from, to, ARC_HI(angle(from, to))*(.8 + rnd()*.4), hex("#3ddc84"), rnd()*.45, 24, ci); } } }
  const SP = {}; for (const ab in RS.spread) { const L = RS.spread[ab]; let t = 0; SP[ab] = {L, cum: L.map(p => t += p[2]), t}; }
  for (const f of RS.flows) { const [n, ab, v] = f, [c, ci] = cOf(n, f[3]), s = SP[ab];
    for (let k = 0; k < v; k++) { const r = rnd()*s.t; let lo = 0, hi = s.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (s.cum[m] < r) lo = m + 1; else hi = m; } put(c, ci, s.L[lo][0], s.L[lo][1]); } }
  return {dots: dotBuf(buf), lines: lnBuf(new Float32Array(lines))}; })());
const VI = YEARS.indexOf(2024), RI = YEARS.indexOf(2025);
// ports of entry for visa holders (tools/build_ports.py): each dot's port is drawn in proportion to that port's 2024 arrivals from the country's
// world region (NTTO I-94 Table J.2), replacing the engine's nearest-port weighting, which sent nearly every country to its closest large port
const PRW = window.PORTS_R;
function pickPort(c) { const w = PRW.w[PRW.country[c.n]] || PRW.w.All; let t = 0; for (const v of w) t += v; let r = rnd()*t, i = 0; while (i < w.length - 1 && (r -= w[i]) > 0) i++; const p = PRW.ports[i]; return [p[1], p[2], w[i]]; }
// visas of one type: dots from the port of entry to the country, and hairlines in the type's colour
const ARC_COL = ["#8fd3ff", "#f2e640", "#ffb347", "#ff45c5", "#b4a6ff", "#d0d0d8"], TBUF = {};
function typeBuf(t) { if (TBUF[t]) return TBUF[t]; const a = [], L = []; sd = 300 + t*7; const y = YEARS[VI];
  C.forEach((c, ci) => { if (ci === US) return; const v = c.v[VI][t]; let m = Math.floor(v/DUNIT) + (rnd() < (v/DUNIT) % 1 ? 1 : 0); if (!m) return; const fam = TFAM[t]; let port = null;
    while (m-- > 0) { if (!port || rnd() < .3) port = pickPort(c, y); pushDot(a, v3(...cloudPt(c)), v3(port[0] + gauss()*.3, port[1] + gauss()*.22), hex(fam[Math.floor(rnd()*fam.length)]), ci, t, rnd()*.45); } });
  const top = C.filter((c, i) => i !== US && c.v[VI][t] > 0).sort((p, q) => q.v[VI][t] - p.v[VI][t]).slice(0, 46), mx = top[0].v[VI][t], col = hex(ARC_COL[t]);
  for (const c of top) { const n = Math.round(3 + 34*Math.sqrt(c.v[VI][t]/mx));   /* each hairline from a port drawn as the dots' are */
    for (let k = 0; k < n; k++) { const pp = pickPort(c), from = v3(pp[0] + gauss()*.5, pp[1] + gauss()*.35), to = v3(c.lon + gauss()*1.4, c.lat + gauss()*1); strand(L, from, to, ARC_HI(angle(from, to))*(.82 + rnd()*.36), col, rnd()*.45, 24, C.indexOf(c)); } }
  return TBUF[t] = {dots: dotBuf(new Float32Array(a)), lines: lnBuf(new Float32Array(L))}; }
const NIV = t => C.reduce((s, c, i) => i === US ? s : s + c.v[VI][t], 0);
// removals after a border arrest (CBP: Border Patrol and ports of entry), 2024, one dot per removal (tools/build_bp.py). Kept apart from ICE, in a darker red.
// They start at the southwest border sectors in proportion to 2024 encounters and go to the ten countries DHS names, by all-DHS shares (both approximations)
const BP = window.BP, BPR = ["#b3122b", "#c41e3a", "#9e0f25", "#d12a45"];
/* every removal dot leaves from a red dot already on the map, so nothing is redrawn when the map gives way to the globe:
   a BPS removal from one of the map's own 2024 border dots (exactly that point), an ICE removal from an ICE detention facility in its state of arrest,
   by 2025 average daily population (a placement: the data give only the state), hidden under that facility's disc until it flies. Made on first use */
let BPB = null, ICER = null;
function bpb() { if (BPB) return BPB; if (!SMB) SMB = smMakeBP(); sd = 2024; const L = [];
  const vis = SM_BP.map(b => Math.round(b.v[10])), idx = SM_BP.map(() => []);   /* the border dots the map shows for 2024 */
  for (let i = 0; i < SMB.n; i++) if (SMB.j[i] < vis[SMB.c[i]]) idx[SMB.c[i]].push(i);
  let t = 0; const cum = vis.map(v => t += v), pick = () => { const r = rnd()*t; let s = 0; while (cum[s] < r) s++; const I = idx[s]; const i = I[Math.floor(rnd()*I.length)]; return [SMB.p[3*i], SMB.p[3*i + 1], SMB.p[3*i + 2]]; };
  const total = BP.countries.reduce((s, c) => s + c[1], 0), buf = new Float32Array(total*12), mx = BP.countries[0][1]; let o = 0;
  for (const [n, v] of BP.countries) { const ci = C.findIndex(c => c.n === n); if (ci < 0) continue; const c = C[ci];
    for (let k = 0; k < v; k++) { buf.set(v3(...cloudPt(c)), o); buf.set(pick(), o + 3); buf.set(hex(BPR[Math.floor(rnd()*BPR.length)]), o + 6); buf[o + 9] = ci; buf[o + 10] = 9; buf[o + 11] = rnd()*.5; o += 12; }
    const k0 = Math.round(3 + 28*Math.sqrt(v/mx)); for (let k = 0; k < k0; k++) { const from = pick(), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.8); strand(L, from, to, ARC_HI(angle(from, to))*.78*(.82 + rnd()*.36), hex(BPR[Math.floor(rnd()*BPR.length)]), rnd()*.5, 24, ci); } }
  return BPB = {dots: dotBuf(buf.subarray(0, o)), lines: lnBuf(new Float32Array(L)), n: o/12}; }
function iceRem() { if (ICER) return ICER; sd = 500 + RI; const F = window.DET.f, yi = window.DET.years.indexOf(2025), fac = {}, L = [];
  F.forEach((f, k) => { const si = STS.detState[k]; if (si < 0 || !(f[2][yi] > 0)) return; const ab = STS.states[si].ab; (fac[ab] = fac[ab] || []).push(f); });
  const from = st => { const Fs = fac[st]; if (!Fs) { const o = D.rem.st[st]; return o ? v3(o[0] + gauss()*.3, o[1] + gauss()*.25) : null; }   /* no facility in the state: near its point */
    let t = 0; for (const f of Fs) t += f[2][yi]; let r = rnd()*t; for (const f of Fs) if ((r -= f[2][yi]) <= 0) return v3(f[0], f[1]); return v3(Fs[0][0], Fs[0][1]); };
  const rows = D.rem.years["2025"], total = rows.reduce((s, r) => s + Math.round(r[2]), 0), buf = new Float32Array(total*12); let o = 0; const byC = new Map();
  for (const [st, n, v] of rows) { const [c, ci] = remCountry(n); if (!c) continue; const e = byC.get(n) || {c, ci, v: 0, st: {}}; e.v += v; e.st[st] = (e.st[st] || 0) + v; byC.set(n, e);
    for (let m = Math.round(v); m > 0; m--) { const fr = from(st); if (!fr) continue; buf.set(v3(...cloudPt(c)), o); buf.set(fr, o + 3); buf.set(hex(REDS[Math.floor(rnd()*REDS.length)]), o + 6); buf[o + 9] = ci; buf[o + 10] = 9; buf[o + 11] = rnd()*.5; o += 12; } }
  const top = [...byC.values()].sort((p, q) => q.v - p.v).slice(0, 22), mr = top[0].v;
  for (const e of top) { const st = Object.entries(e.st).sort((p, q) => q[1] - p[1])[0][0], k0 = Math.round(3 + 28*Math.sqrt(e.v/mr));
    for (let k = 0; k < k0; k++) { const fr = from(st); if (!fr) continue; const to = v3(e.c.lon + gauss()*1.2, e.c.lat + gauss()*.8); strand(L, fr, to, ARC_HI(angle(fr, to))*.78*(.82 + rnd()*.36), hex(REDS[Math.floor(rnd()*REDS.length)]), rnd()*.5, 24, e.ci); } }
  return ICER = {dots: dotBuf(buf.subarray(0, o)), lines: lnBuf(new Float32Array(L)), n: o/12}; }
// ICE detention: one dot per 10 people held on an average day, gathered at each facility; a facility's first n dots are shown, so it swells and shrinks year to year
const DETY = window.DET.years, DETP = []; { let q = 991; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296, gs = () => Math.sqrt(-2*Math.log(r() + 1e-9))*Math.cos(6.2832*r());
  window.DET.f.forEach(([lon, lat, adp], fi) => { const mx = Math.round(Math.max(...adp)), sg = .05 + .018*Math.sqrt(mx/10); /* one dot per person held */ for (let j = 0; j < mx; j++) DETP.push({f: fi, j, p: v3(lon + gs()*sg/Math.cos(lat*D2R), lat + gs()*sg), k: Math.floor(r()*8), h: (j % 3) === 0}); }); }
const DET0 = 2021, DET1 = 2026;
// ---- the interactive state map (tools/build_states.py): the US as on slide 7, at 2025. Hover a state and its outline glows; click it and the map flies to it,
// the other states dim, and its county dots replay 2001-2025 (1 dot = 100 people, as on slide 7) with ICE detention in red (1 dot = 1 person held), while the panel counts.
// Click outside the states or press Esc to fly back.
const STS = window.STS, SY = STS.years, smc = $("smc"), smx = smc.getContext("2d"), smp = $("smpanel"), smt = $("smtip");
const SM_VALID = SY.map(y => !STS.partial.includes(y)), SM_VY = SY.map((y, i) => i).filter(i => SM_VALID[i]);
const SM_BB = STS.states.map(s => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const r of s.r) for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return [a, b, c, d]; });
const SM_V = STS.states.map(s => s.r.map(r => r.map(([lo, la]) => v3(lo, la))));   /* outline points on the sphere */
function smIn(si, x, y) { const b = SM_BB[si]; if (x < b[0] || x > b[1] || y < b[2] || y > b[3]) return false; let k = false;
  for (const r of STS.states[si].r) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) k = !k; }
  return k; }
function smHit(lon, lat) { for (let i = 0; i < STS.states.length; i++) if (smIn(i, lon, lat)) return i; return -1; }
/* the map's three regions, each with its own camera: 0 the lower 48, 1 Alaska, 2 Hawaii (not shown: their cameras are off screen) */
const SM_AK = STS.states.findIndex(s => s.ab === "AK"), SM_HI = STS.states.findIndex(s => s.ab === "HI"), SM_RG = STS.states.map((s, i) => i === SM_AK ? 1 : i === SM_HI ? 2 : 0);
const smRegLL = (lon, lat) => lon < -129 || lon > 170 ? (lat > 30 ? 1 : 2) : 0;
function smRegs(P, n) { const g = new Uint8Array(n); for (let i = 0; i < n; i++) g[i] = smRegLL(Math.atan2(P[3*i], P[3*i + 2])/D2R, Math.asin(clamp(P[3*i + 1], -1, 1))/D2R); return g; }
/* the state under a point on screen, in whichever region's picture it falls */
function smPick(sx, sy) { for (const r of [1, 2, 0]) { const ll = smUn(smCams[r], sx, sy), si = ll ? smHit(ll[0], ll[1]) : -1; if (si >= 0 && SM_RG[si] === r) return si; } return -1; }
/* the net-arrival dots, one per person (about 2.9 million): each county gets enough for its largest full year, placed on its census tracts in proportion
   to their foreign-born residents (ACS 2020-2024, STS.tt/tc) and scattered within each tract's footprint; a county shows its first n in a given year.
   Made once, the first time the slide opens, and drawn straight into a pixel buffer */
let SMD = null, smOff = null, smOx = null, smID = null, smU32 = null, SM_FAC = [];
let SM_DK = "", SM_CAMC = null;   /* what the offscreen image of the dots shows (camera, year, layers, state), and the camera it was drawn with */
const SM_CS = Uint8Array.from(STS.counties.map(cn => cn[2]));
const smPack = (hx, a) => { const [r, g, b] = hex(hx).map(v => Math.round(v*255)); return ((Math.round(a*255) << 24) | (b << 16) | (g << 8) | r) >>> 0; };
const SM_COL = Uint32Array.from(TFAM[0].map(h => smPack(h, .95))), SM_DIM = Uint32Array.from(TFAM[0].map(h => smPack(h, .18)));
function smMake() { const need = STS.counties.map(cn => { let m = 0; cn[3].forEach((x, i) => { if (SM_VALID[i] && x > m) m = x; }); return m; }); return smTracts(need, 2001); }
/* dots for any per-county count, on the county's tracts in proportion to their foreign-born residents (net arrivals; green cards) */
function smTracts(needIn, seed) { const TT = STS.tt, TC = STS.tc, nC = STS.counties.length, need = new Uint32Array(nC); let total = 0;
  for (let ci = 0; ci < nC; ci++) { need[ci] = TC[2*ci + 1] ? Math.max(0, needIn[ci]) : 0; total += need[ci]; }
  const p = new Float32Array(3*total), c = new Uint16Array(total), j = new Uint32Array(total), k = new Uint8Array(total); let q = seed, o = 0;
  const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296;
  for (let ci = 0; ci < nC; ci++) { const n = need[ci]; if (!n) continue; const s0 = TC[2*ci], cnt = TC[2*ci + 1], cum = new Float64Array(cnt); let t = 0;
    for (let i = 0; i < cnt; i++) cum[i] = t += TT[4*(s0 + i) + 3];
    for (let jj = 0; jj < n; jj++) { const x = r()*t; let lo = 0, hi = cnt - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < x) lo = m + 1; else hi = m; }
      const b = 4*(s0 + lo), lat0 = TT[b + 1]/1e4, rr = TT[b + 2]/100*.8*Math.sqrt(-2*Math.log(r() + 1e-9)), an = r()*6.2832;   /* km, a 2D gaussian within the tract */
      const lon = TT[b]/1e4 + rr*Math.cos(an)/(111.32*Math.cos(lat0*D2R)), lat = lat0 + rr*Math.sin(an)/110.57, cl = Math.cos(lat*D2R);
      p[3*o] = cl*Math.sin(lon*D2R); p[3*o + 1] = Math.sin(lat*D2R); p[3*o + 2] = cl*Math.cos(lon*D2R); c[o] = ci; j[o] = jj; k[o] = Math.floor(r()*8); o++; } }
  return {p, c, j, k, n: total}; }
/* removals after a border arrest (CBP), 2014-2024, one dot per removal at the southwest border cities (tools/build_bp.py): each year's border removals
   split by that year's encounters, an estimate. Scattered as on the removals globe but kept inside the city's state; after 2024 it holds 2024 */
let SMB = null; const SM_BP = window.BP.sectors.map(s => ({n: s[0], lon: s[1], lat: s[2], si: STS.states.findIndex(x => x.ab === s[3]), v: s[4]}));
const SM_BPC = Uint32Array.from(BPR.map(h => smPack(h, .95))), SM_BPD = Uint32Array.from(BPR.map(h => smPack(h, .18)));
function smMakeBP() { let q = 2014; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296, gs = () => Math.sqrt(-2*Math.log(r() + 1e-9))*Math.cos(6.2832*r());
  const total = SM_BP.reduce((s, b) => s + Math.max(...b.v), 0), p = new Float32Array(3*total), c = new Uint8Array(total), j = new Uint32Array(total), k = new Uint8Array(total); let o = 0;
  SM_BP.forEach((b, bi) => { const mx = Math.max(...b.v); for (let jj = 0; jj < mx; jj++) { let lo = b.lon, la = b.lat;
    for (let t = 0; t < 12; t++) { const x = b.lon + gs()*.35, y = b.lat + gs()*.25; if (smIn(b.si, x, y)) { lo = x; la = y; break; } }
    p.set(v3(lo, la), 3*o); c[o] = bi; j[o] = jj; k[o] = Math.floor(r()*BPR.length); o++; } });
  return {p, c, j, k, n: o}; }
/* point layers, one dot per person: H-1B approvals at the employer's ZIP (2009-2023, 2025) and international students at their campus (fall 2024),
   scattered in a small gaussian (km) about the point */
function smPts(L, cnt, sigma, seed) { let q = seed; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296;
  const total = L.reduce((s, x, i) => s + cnt(x, i), 0), p = new Float32Array(3*total), c = new Uint32Array(total), j = new Uint32Array(total), k = new Uint8Array(total); let o = 0;
  L.forEach((x, i) => { const n = cnt(x, i), lon0 = x[0]/1e4, lat0 = x[1]/1e4;
    for (let jj = 0; jj < n; jj++) { const rr = sigma*Math.sqrt(-2*Math.log(r() + 1e-9)), an = r()*6.2832; p.set(v3(lon0 + rr*Math.cos(an)/(111.32*Math.cos(lat0*D2R)), lat0 + rr*Math.sin(an)/110.57), 3*o); c[o] = i; j[o] = jj; k[o] = Math.floor(r()*8); o++; } });
  return {p, c, j, k, n: o}; }
function smSeries(v, years, yf) { if (yf < years[0]) return 0; let a = 0; while (a < years.length - 1 && years[a + 1] <= yf) a++; if (a === years.length - 1) return v[a];
  return lerp(v[a], v[a + 1], clamp((yf - years[a])/(years[a + 1] - years[a]))); }
let SMG = null, SMH = null, SMS = null; const SM_H = STS.h1b, SM_HMAX = SM_H.z.map(z => Math.max(...z[3]));
const SM_HY = SM_H.years, SM_HV = SM_H.z.map(z => z[3]);   /* 2009-2025, every year */
const SM_GCC = Uint32Array.from(GOLD.concat(GOLD).map(h => smPack(h, .95))), SM_GCD = Uint32Array.from(GOLD.concat(GOLD).map(h => smPack(h, .18)));
const SM_HC = Uint32Array.from(TFAM[3].concat(TFAM[3], TFAM[3]).slice(0, 8).map(h => smPack(h, .95))), SM_HD = Uint32Array.from(TFAM[3].concat(TFAM[3], TFAM[3]).slice(0, 8).map(h => smPack(h, .18)));
const SM_SC = Uint32Array.from(TFAM[1].concat(TFAM[1], TFAM[1]).slice(0, 8).map(h => smPack(h, .95))), SM_SD = Uint32Array.from(TFAM[1].concat(TFAM[1], TFAM[1]).slice(0, 8).map(h => smPack(h, .18)));
/* county borders of the chosen state (Census cartographic counties 2024, 1:5m) on the sphere, made on first use */
const SM_CRV = {}; function smCR(si) { return SM_CRV[si] || (SM_CRV[si] = STS.cr[si].map(f => { const a = []; for (let i = 0; i < f.length; i += 2) a.push(v3(f[i]/1000, f[i + 1]/1000)); return a; })); }
function smBPAt(b, yr) { if (yr < 2014) return 0; const f = Math.min(yr, 2024) - 2014, i0 = Math.floor(f), i1 = Math.min(10, i0 + 1); return lerp(b.v[i0], b.v[i1], f - i0); }
function smDots(seed) { const T = window.STS.dots, n = T.length/3, p = new Float32Array(3*n), c = new Uint16Array(n), j = new Uint16Array(n), k = new Uint8Array(n), cnt = new Uint16Array(window.STS.counties.length);
  let q = seed; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296;
  for (let i = 0; i < n; i++) { const ci = T[3*i]; p.set(v3(T[3*i + 1]/1e4, T[3*i + 2]/1e4), 3*i); c[i] = ci; j[i] = cnt[ci]++; k[i] = Math.floor(r()*8); }
  return {p, c, j, k, n}; }
/* a county's value at a fractional year, stepping straight over the April-June years (2010, 2020) as slide 7 does */
function smVal(v, yf) { const t = yf - SY[0]; let a = SM_VY[0], b = a; for (const i of SM_VY) { if (i <= t) a = i; else { b = i; break; } }
  return b <= a ? Math.max(0, v[a] || 0) : Math.max(0, lerp(v[a] || 0, v[b] || 0, clamp((t - a)/(b - a)))); }
const smPt = (M, c, p) => [c.cx + (M[0]*p[0] + M[1]*p[1] + M[2]*p[2])*c.R, c.cy - (M[3]*p[0] + M[4]*p[1] + M[5]*p[2])*c.R, M[6]*p[0] + M[7]*p[1] + M[8]*p[2]];
function smUn(c, sx, sy) { const M = rot(c), x = (sx - c.cx)/c.R, y = (c.cy - sy)/c.R, r2 = x*x + y*y; if (r2 > 1) return null; const z = Math.sqrt(1 - r2);
  const px = M[0]*x + M[3]*y + M[6]*z, py = M[1]*x + M[4]*y + M[7]*z, pz = M[2]*x + M[5]*y + M[8]*z; return [Math.atan2(px, pz)/D2R, Math.asin(clamp(py, -1, 1))/D2R]; }
/* the camera for a state: centred in the space right of the panel, never closer than 14x the US view so the smallest states stay legible */
function smCamFor(si) { const b = SM_BB[si]; let lon0 = (b[0] + b[1])/2, lat0 = (b[2] + b[3])/2; if (b[1] - b[0] > 180) { lon0 = -152; lat0 = 62; }   /* Alaska crosses 180 degrees */
  const c0 = {lon: lon0, lat: lat0, R: 1, cx: 0, cy: 0}, M = rot(c0); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const r of SM_V[si]) for (const p of r) { const q = smPt(M, c0, p); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const L = Math.min(W*.36, 440), AW = W - L - W*.04, AH = H*.74, R = Math.min(usCam().R*14, AW/Math.max(x1 - x0, 1e-5), AH/Math.max(y1 - y0, 1e-5));
  return {lon: lon0, lat: lat0, R, cx: L + AW/2 - (x0 + x1)/2*R, cy: H/2 - (y0 + y1)/2*R}; }
/* the legend, bottom right: each row switches its layer on and off */
const SM_ON = LAY;
/* the timeline: dragging it stops the replay and sets the year for the whole map */
const smScrub = $("smscrub"), smYr = $("smyr"); let smPlay = false, smDrag = false;
smScrub.addEventListener("input", () => { smPlay = false; smYear = +smScrub.value; smShown = ""; });
smScrub.addEventListener("pointerdown", () => { smDrag = true; }); addEventListener("pointerup", () => { if (smDrag) { smDrag = false; smScrub.blur(); } });
const SM_DEF = {...SM_ON}, SM_KEEP = ["det", "bp"], SM_OFF = ["nim", "gc", "h1b", "stu"];   /* leaving, all but ICE detention and the border removals switch off, one by one */
function smSetLayer(k, on) { SM_ON[k] = on; legendPaint(); }
let smOffT = 0, smLineA = 1, smLastSel = -1;
const SM_YPS = 2, SM_FLY = 1.1;   /* two years a second once the camera has arrived (2001-2025 in 12 s); 1.1 s flights */
let smSel = -1, smHov = -1, smYear = 2025, smFrom = null, smTo = null, smU = 1, smCam = null, smCams = null, smMouse = null, smShown = "", smExit = 0, smHand = 0, smHandA = 0, smOverlay = false;
function smReset() { smSel = -1; smHov = -1; smYear = SY[0]; smPlay = true; smExit = 0; smOffT = .4; smLineA = 1; for (const k in SM_DEF) smSetLayer(k, SM_DEF[k]);   /* the slide opens in 2001 and plays forward, with the default layers */ smCams = usViews(); smCam = smCams[0]; smFrom = smTo = smCams; smU = 1; smp.style.opacity = 0; smt.style.opacity = 0; smShown = ""; }
function smFly(to) { smFrom = smCams; smTo = Array.isArray(to) ? to : [to, US_OFF, US_OFF]; smU = 0; }   /* each region flies on its own camera; Alaska and Hawaii stay off screen */
function smSelect(si) { if (si === smSel) return; smSel = si; smYear = SY[0]; smPlay = true; smShown = ""; smFly(smCamFor(si)); smp.style.opacity = 1; }
function smBack() { if (smSel < 0) return; smLastSel = smSel; smSel = -1; smFly(usViews()); smp.style.opacity = 0; }
const smFmt = n => { const a = Math.abs(n), s = n < 0 ? "−" : ""; return s + (a >= 1e6 ? (a/1e6).toFixed(2) + "M" : a >= 1e4 ? Math.round(a/1e3) + "k" : a >= 1e3 ? (a/1e3).toFixed(1) + "k" : String(Math.round(a))); };
function smDet(si, Y) { const yi = window.DET.years.indexOf(Y); if (yi < 0) return null; let t = 0; window.DET.f.forEach((f, k) => { if (STS.detState[k] === si) t += f[2][yi]; }); return Math.round(t); }
function smPanel() { const s = STS.states[smSel], Y = Math.floor(smYear + 1e-6), key = smSel + ":" + Y; if (key === smShown) return; smShown = key;
  const yi = SY.indexOf(Y), cum = s.nim.slice(0, yi + 1).reduce((a, v) => a + v, 0), gy = Math.min(Y, 2024), gc = s.gc[gy], dy = Math.min(Y, 2025), det = Y >= 2019 ? smDet(smSel, dy) : null, rem = Y >= 2022 ? s.rem[Math.min(Y, 2025)] : null,
    bpv = Y >= 2014 ? Math.round(SM_BP.filter(b => b.si === smSel).reduce((t, b) => t + b.v[Math.min(Y, 2024) - 2014], 0)) : 0,   /* only the three border states have any */
    hi = SM_HY.filter(y => y <= Y).length - 1, hy = hi >= 0 ? SM_HY[hi] : null, hv = hy != null ? SM_H.z.reduce((t, z, i) => t + (z[2] === smSel ? SM_HV[i][hi] : 0), 0) : 0,   /* the latest H-1B year on disk */
    sv = STS.stu.reduce((t, s) => t + (s[2] === smSel ? s[3] : 0), 0);
  const row = (on, col, label, v) => `<div class="r${on ? " on" : ""}"><i style="background:${col}"></i><span>${label}</span><b>${on ? smFmt(v) : ""}</b></div>`;
  smp.innerHTML = `<div class="n">${s.n}</div>` + row(true, "#8fd3ff", `net arrivals since 2001, to July ${Y}`, cum) + row(Y >= 2004 && gc != null, "#3ddc84", `new green cards, ${gy}`, gc)
    + row(det != null, "#ff5a40", `held by ICE, average day, ${dy}`, det) + row(rem != null, "#ff9a7a", `ICE removals, ${Math.min(Y, 2025)}`, rem)
    + (bpv ? row(true, "#c41e3a", `BPS removals, est., ${Math.min(Y, 2024)}`, bpv) : "")
    + row(hy != null, "#ff45c5", `H-1B approvals, ${hy}`, hv) + row(Y >= 2024, "#f2e640", "international students, 2024", sv); }
/* overlay: on the removals globe after the map, the same map is drawn on a clear canvas through the film's own camera (CAM), so the country stays
   as it was and only zooms out while the removals extend from it; the film draws nothing of the US underneath (NO_DET) */
function smTick(dt, overlay) { const w = Math.round(W*DPR), h = Math.round(H*DPR); if (smc.width !== w || smc.height !== h) { smc.width = w; smc.height = h; } if (!smCam) smReset();
  if (!overlay) {
    if (smU < 1) { smU = Math.min(1, smU + dt/SM_FLY); smCams = smFrom.map((f, i) => camMix(f, smTo[i], ease(smU))); smCam = smCams[0]; }
    else if (smSel < 0) { smCams = usViews(); smCam = smCams[0]; } else smCams = [smCam, US_OFF, US_OFF];
    /* leaving: zoom out, run to 2025, switch off the other layers one by one (ICE detention and the border removals stay), then on to the globe */
    if (smExit) { if (smSel >= 0) smBack(); if (smU >= 1 && smSel < 0) { smPlay = false;
      if (smYear < 2025) smYear = Math.min(2025, smYear + dt*8);
      else { for (const k of SM_KEEP) if (!SM_ON[k]) smSetLayer(k, true); smOffT -= dt;
        if (smOffT <= 0) { const k = SM_OFF.find(k => SM_ON[k]); if (k) { smSetLayer(k, false); smOffT = .5; } else if (smLineA <= 0) smLeave(); } } } }   /* and the borders have gone */
    if (smPlay && smU >= 1) { smYear = Math.min(2025, smYear + dt*SM_YPS); if (smYear >= 2025) smPlay = false; }
    if (!smDrag) smScrub.value = smYear; smYr.textContent = Math.floor(smYear + 1e-6); }
  const c = overlay ? CAM : smCam, M = rot(c), x = smx; x.setTransform(DPR, 0, 0, DPR, 0, 0);
  /* the regions' cameras; zooming out to the globe, the insets keep their place beside the lower 48, scaled and moved with it */
  let cs = smCams; if (overlay) { const u = smCams[0], k = c.R/u.R, ref = v3(-96.5, 38.2), q0 = smPt(rot(u), u, ref), q1 = smPt(M, c, ref), tx = q1[0] - q0[0]*k, ty = q1[1] - q0[1]*k;
    cs = [c, ...smCams.slice(1).map(q => ({...q, R: q.R*k, cx: q.cx*k + tx, cy: q.cy*k + ty}))]; }
  const Ms = cs.map(q => rot(q));
  if (overlay) x.clearRect(0, 0, W, H); else { x.fillStyle = "#05080d"; x.fillRect(0, 0, W, H); }
  const ring = (si) => { const g = SM_RG[si], m = Ms[g], cc = cs[g]; x.beginPath(); for (const r of SM_V[si]) { let pen = false; for (const p of r) { const q = smPt(m, cc, p); if (q[2] < 0) { pen = false; continue; } pen ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); pen = true; } } };
  /* outlines */
  /* the borders fade while the layers switch off on the way out of the map, and are gone by the time the removals spread; skipped with a second
     press, whatever is left fades in the first moment of the globe slide */
  if (!overlay && smExit) smLineA = Math.max(0, smLineA - dt/1.6);   /* from the moment the map is left; back to 1 only in smReset */
  const lineA = overlay ? SM_OVL : smLineA;
  x.lineJoin = "round"; x.lineWidth = .6; x.strokeStyle = `rgba(236,230,216,${(smSel >= 0 ? .07 : .16)*lineA})`; if (lineA > .005) for (let i = 0; i < STS.states.length; i++) if (i !== smSel) { ring(i); x.stroke(); }
  /* county dots: the chosen state replays its years, the others stay at 2025, dimmed while a state is chosen */
  const sel = smSel >= 0, r0 = .5, off = (q) => q[2] < 0 || q[0] < -2 || q[0] > W + 2 || q[1] < -2 || q[1] > H + 2;
  /* every dot layer and ICE detention go into one offscreen image, redrawn only when what it shows changes (the camera, the year, the layers,
     the chosen state); otherwise a frame just copies it. Each layer also keeps its dots' pixel positions for the current camera, so while the
     timeline plays only the year test runs. Zooming out to the globe (overlay), the last image is scaled and moved with the camera as it fades */
  const anyDots = SM_ON.nim || SM_ON.bp || SM_ON.gc || SM_ON.h1b || SM_ON.stu || (SM_ON.det && smYear >= 2019);
  if (overlay) {
    if (anyDots && smOff && SM_CAMC) { const u = SM_CAMC, k = c.R/u.R, ref = v3(-96.5, 38.2), q0 = smPt(rot(u), u, ref), q1 = smPt(M, c, ref);
      x.save(); x.translate(q1[0] - q0[0]*k, q1[1] - q0[1]*k); x.scale(k, k); x.imageSmoothingEnabled = true; x.drawImage(smOff, 0, 0, W, H); x.restore(); } }
  else if (anyDots) {
    if (!smOff || smOff.width !== W || smOff.height !== H) { smOff = document.createElement("canvas"); smOff.width = W; smOff.height = H; smOx = smOff.getContext("2d"); smID = smOx.createImageData(W, H); smU32 = new Uint32Array(smID.data.buffer); SM_DK = ""; }
    const camKey = cs.map(q => [q.lon, q.lat, q.R, q.cx, q.cy].join(",")).join(";") + "," + W + "," + H, dk = camKey + "|" + smYear.toFixed(3) + "|" + smSel + "|" + ["nim", "gc", "h1b", "stu", "det", "bp"].map(k => +!!SM_ON[k]).join("");
    if (dk !== SM_DK) { SM_DK = dk; SM_CAMC = {...c};
      smU32.fill(0); const CO = cs.map((q, g) => { const m = Ms[g]; return [m[0]*q.R, m[1]*q.R, m[2]*q.R, m[3]*q.R, m[4]*q.R, m[5]*q.R, m[6], m[7], m[8], q.cx, q.cy]; });
      /* one pass per layer into the pixel buffer: 1 px squares, the chosen state's at full strength, the others dimmed */
      const pass = (S, lim, grp, col, dim) => { const n = S.n, CC = S.c, J = S.j, K = S.k;
        if (S.pk !== camKey) { const P = S.p, RG = S.rg || (S.rg = smRegs(P, n)), pix = S.pix || (S.pix = new Int32Array(n));   /* where each dot lands for its region's camera, -1 if not on screen */
          for (let i = 0; i < n; i++) { const px = P[3*i], py = P[3*i + 1], pz = P[3*i + 2], o = CO[RG[i]]; if (o[6]*px + o[7]*py + o[8]*pz < 0) { pix[i] = -1; continue; }
            const X = Math.floor(o[9] + o[0]*px + o[1]*py + o[2]*pz), Y = Math.floor(o[10] - o[3]*px - o[4]*py - o[5]*pz); pix[i] = X < 0 || Y < 0 || X >= W || Y >= H ? -1 : Y*W + X; }
          S.pk = camKey; }
        const pix = S.pix; for (let i = 0; i < n; i++) { const p = pix[i]; if (p < 0) continue; const ci = CC[i]; if (J[i] >= lim[ci]) continue; smU32[p] = sel && grp(ci) !== smSel ? dim[K[i]] : col[K[i]]; } };
      if (SM_ON.nim) { if (!SMD) SMD = smMake(); const cv = new Float32Array(STS.counties.length); STS.counties.forEach((cn, ci) => { cv[ci] = smVal(cn[3], smYear); }); pass(SMD, cv, ci => SM_CS[ci], SM_COL, SM_DIM); }
      /* green cards and students have one year each (2024), so they appear when the timeline reaches it; H-1B runs 2009-2025 */
      if (SM_ON.gc && smYear >= 2024) { if (!SMG) SMG = smTracts(STS.gc24, 2024); pass(SMG, STS.gc24, ci => SM_CS[ci], SM_GCC, SM_GCD); }
      if (SM_ON.stu && smYear >= 2024) { if (!SMS) SMS = smPts(STS.stu, s => s[3], .8, 99); pass(SMS, STS.stu.map(s => s[3]), i => STS.stu[i][2], SM_SC, SM_SD); }
      if (SM_ON.h1b && smYear >= 2009) { if (!SMH) SMH = smPts(SM_H.z, (z, i) => SM_HMAX[i], 1.2, 77); pass(SMH, SM_HV.map(v => smSeries(v, SM_HY, smYear)), i => SM_H.z[i][2], SM_HC, SM_HD); }
      if (SM_ON.bp && smYear >= 2014) { if (!SMB) SMB = smMakeBP(); pass(SMB, SM_BP.map(b => smBPAt(b, smYear)), bi => SM_BP[bi].si, SM_BPC, SM_BPD); }
      smOx.putImageData(smID, 0, 0);
      /* ICE detention, from 2019: a facility's first n dots, n = people held on an average day that year, packed in a tight disc (a sunflower spiral,
         one dot per person) on the facility's ZIP point, so the disc stays on the facility at any zoom; drawn into the same image, over the dots */
      SM_FAC = [];
      if (SM_ON.det && smYear >= 2019) { const o = smOx, F = window.DET.f, yf = Math.min(smYear, 2025) - DETY[0], i0 = Math.floor(clamp(yf, 0, DETY.length - 1)), i1 = Math.min(DETY.length - 1, i0 + 1), u = clamp(yf - i0), rd = Array.from({length: 16}, () => new Path2D());
        const fp = F.map(f => { const g = smRegLL(f[0], f[1]); return smPt(Ms[g], cs[g], v3(f[0], f[1])); }), ds = .8*Math.min(1, c.R/usCam().R);
        F.forEach((f, k) => { const a = f[2], n = Math.round(a[i0] + (a[i1] - a[i0])*u); if (n > 0 && STS.detState[k] >= 0 && fp[k][2] > 0) SM_FAC.push({k, x: fp[k][0], y: fp[k][1], r: ds*Math.sqrt(n) + 3, n}); });
        for (const d of DETP) { if (STS.detState[d.f] < 0) continue; const mine = sel && STS.detState[d.f] === smSel, a = F[d.f][2];
          if (d.j >= a[i0] + (a[i1] - a[i0])*u) continue; const p = fp[d.f]; if (p[2] < 0) continue; const an = d.j*2.39996, rr = ds*Math.sqrt(d.j + .5), q = [p[0] + rr*Math.cos(an), p[1] + rr*Math.sin(an), 1];
          if (off(q)) continue; rd[d.k + (sel && !mine ? 8 : 0)].rect(q[0] - r0, q[1] - r0, 2*r0, 2*r0); }
        for (let k = 0; k < 16; k++) { o.globalAlpha = k < 8 ? .95 : .18; o.fillStyle = REDS[k % 8]; o.fill(rd[k]); } o.globalAlpha = 1; } }
    x.imageSmoothingEnabled = false; x.drawImage(smOff, 0, 0, W, H); }
  else SM_FAC = [];
  /* the chosen state's county borders; leaving the map, the last chosen state's keep fading with the other lines while the map zooms out */
  const cty = sel ? smSel : smExit && !overlay ? smLastSel : -1, ctyA = (sel && !smExit ? 1 : smLineA)*.2;
  if (cty >= 0 && ctyA > .001) { const g = SM_RG[cty]; x.lineWidth = .5; x.strokeStyle = `rgba(236,230,216,${ctyA})`; x.beginPath();
    for (const r of smCR(cty)) { let pen = false; for (const p of r) { const q = smPt(Ms[g], cs[g], p); if (q[2] < 0) { pen = false; continue; } pen ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); pen = true; } }
    x.stroke(); }
  /* glow: the chosen state, and the one under the mouse */
  for (const [si, a] of (smExit && !overlay ? [[smSel >= 0 ? smSel : smLastSel, smLineA]] : [[smSel, 1], [smHov !== smSel ? smHov : -1, .8]])) { if (si < 0 || a < .005) continue;   /* the glow fades with the lines when leaving */ ring(si); x.save(); x.shadowColor = `rgba(220,240,255,${a})`; x.shadowBlur = 14; x.strokeStyle = `rgba(255,255,255,${.85*a})`; x.lineWidth = 1.4; x.stroke(); x.stroke(); x.restore(); }
  if (sel && !overlay) smPanel(); }
smc.addEventListener("pointermove", e => { if (!smCam || ZOOM > .02) return; smHov = smPick(e.offsetX, e.offsetY); smc.classList.toggle("on", smHov >= 0); smc.classList.toggle("pan", smSel < 0 && USK > 1 + 1e-3);
  /* an ICE facility under the mouse: its name, as ICE publishes it, and the people held there on an average day in the year shown */
  let fac = null, best = 1e9; if (SM_ON.det && smYear >= 2019) for (const f of SM_FAC) { const d = Math.hypot(e.offsetX - f.x, e.offsetY - f.y); if (d < f.r && d < best) { best = d; fac = f; } }
  const tip = (html) => { smt.innerHTML = html; smt.style.left = (e.offsetX + 14) + "px"; smt.style.top = (e.offsetY - 8) + "px"; smt.style.opacity = 1; };
  let sec = null; if (!fac && SM_ON.bp && smYear >= 2014) { const M = rot(smCam), sg = Math.max(14, .3*D2R*smCam.R*2.2); let bd = 1e9;   /* a border city under the mouse */
    for (const b of SM_BP) { const q = smPt(M, smCam, v3(b.lon, b.lat)), d = Math.hypot(e.offsetX - q[0], e.offsetY - q[1]); if (q[2] > 0 && d < sg && d < bd) { bd = d; sec = b; } } }
  if (fac) tip(`${STS.detNames[fac.k] || "ICE facility (name not published for this point)"}<br>${fac.n.toLocaleString("en-US")} held on an average day, ${Math.min(Math.floor(smYear + 1e-6), 2025)}`);
  else if (sec) tip(`${sec.n.toUpperCase()} · Border Patrol sector and port of entry<br>~${(Math.round(smBPAt(sec, Math.floor(smYear + 1e-6))/100)*100).toLocaleString("en-US")} BPS removals, ${Math.min(Math.floor(smYear + 1e-6), 2024)} (estimated)`);
  else if (smHov >= 0 && smHov !== smSel) tip(STS.states[smHov].n); else smt.style.opacity = 0; });
smc.addEventListener("pointerleave", () => { smHov = -1; smt.style.opacity = 0; });
/* on the US map zoomed in, drag to pan. In a state: drag to pan, the wheel to zoom (out past the state's own framing returns to the full map), a click off the state returns too */
let smDragAt = null, smDragged = false;
smc.addEventListener("pointerdown", e => { if (smU < 1 || (smSel < 0 && USK <= 1 + 1e-3)) return; smDragAt = [e.offsetX, e.offsetY]; smDragged = false; smc.setPointerCapture(e.pointerId); });
smc.addEventListener("pointermove", e => { if (!smDragAt || !(e.buttons & 1)) return; const dx = e.offsetX - smDragAt[0], dy = e.offsetY - smDragAt[1];
  if (!smDragged && Math.hypot(dx, dy) < 4) return; smDragged = true; smDragAt = [e.offsetX, e.offsetY]; smt.style.opacity = 0;
  if (smSel < 0) { usPan(dx, dy); return; }
  smCam = {...smCam, lon: smCam.lon - dx/smCam.R/D2R/Math.max(.2, Math.cos(smCam.lat*D2R)), lat: clamp(smCam.lat + dy/smCam.R/D2R, -80, 80)}; });
smc.addEventListener("pointerup", () => { smDragAt = null; });
smc.addEventListener("wheel", e => { if (smSel < 0 || smU < 1) return; e.preventDefault(); const base = smCamFor(smSel).R, k = Math.exp(-e.deltaY*.0015), R = smCam.R*k;
  if (R < base*.8) { smBack(); return; }   /* scrolled out past the state */
  const nR = Math.min(R, base*8), f = nR/smCam.R; smCam = {...smCam, R: nR, cx: e.offsetX + (smCam.cx - e.offsetX)*f, cy: e.offsetY + (smCam.cy - e.offsetY)*f}; }, {passive: false});
smc.addEventListener("click", e => { e.stopPropagation(); smt.style.opacity = 0; if (smDragged) { smDragged = false; return; }
  if (smSel >= 0) { if (smHov !== smSel) smBack(); } else if (smHov >= 0) smSelect(smHov); });
addEventListener("keydown", e => { if (e.key === "Escape") smBack(); });
