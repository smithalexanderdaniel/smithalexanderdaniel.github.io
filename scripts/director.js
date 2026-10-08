// =================================================================== the director: one clock drives everything
const TOTAL = 600;
const CAMS = {world: () => ({lon: -30, lat: 22, R: Math.min(W*.34, (H - 300)*.5, (H*.5 - 26)/1.52), cx: W/2, cy: H/2 - 26}), us: () => usCam()};
// the continental US, fitted to the screen between the heading and the captions, never larger than the original framing
const US_EDGE = [[-124.7,48.4],[-124.2,43],[-124.4,40.4],[-120.6,34.5],[-117.1,32.5],[-111,31.3],[-106.5,31.8],[-103,29],[-97.4,25.8],[-94,29.6],[-89.6,29.2],[-85,29.7],[-82.7,27.5],[-80.2,25.1],[-80,26.9],[-81,30.5],[-75.5,35.2],[-76,38],[-74,40.5],[-70,41.7],[-70.6,43],[-67,44.8],[-69.2,47.4],[-75,45],[-83,46],[-89,48],[-95,49],[-122,49]];
let USC = null, USCK = "";
function usCam() { const key = W + "x" + H; if (USCK === key) return {...USC}; const lon0 = -96.5, lat0 = 38.2, L0 = lon0*D2R, B0 = lat0*D2R; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [lo, la] of US_EDGE) { const p = v3(lo, la), cl = Math.cos(L0), sl = Math.sin(L0), cb = Math.cos(B0), sb = Math.sin(B0), x = cl*p[0] - sl*p[2], y = -sl*sb*p[0] + cb*p[1] - cl*sb*p[2]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const top = 130, bot = 170, side = 40, Rmax = W < 760 ? W*1.5 : Math.min(W*.8, H*1.75), R = Math.min(Rmax, (W - 2*side)/(x1 - x0), (H - top - bot)/(y1 - y0));
  USC = {lon: lon0, lat: lat0, R, cx: W/2 - (x0 + x1)/2*R, cy: top + (H - top - bot)/2 + (y0 + y1)/2*R}; USCK = key; return {...USC}; }
const camMix = (a, b, u) => { const dl = ((b.lon - a.lon + 540) % 360) - 180; return {lon: a.lon + dl*u, lat: lerp(a.lat, b.lat, u), R: Math.exp(lerp(Math.log(a.R), Math.log(b.R), u)), cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u)}; };
function mixRed(a, b, t) { if (!t) return a; const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v)*t)).join(",")})`; }
// visas issued per fiscal year, 2000-2025 (prototype-2/assets/data.js, D.cycle.visas, as on cycle.html)
const VIS0 = [7141726,7588778,5769437,4881634,5049099,5388951,5836730,6444285,6603076,5804182,6422751,7507939,8927090,9164349,9932480,10891745,10381491,9681913,9028026,8742068,4013210,2792083,6815120,10438327,10969936,10707238];
const visAt = x => { const f = clamp(x - 2000, 0, VIS0.length - 1.0001), i = Math.floor(f), u = f - i, s = u*u*(3 - 2*u); return VIS0[i] + (VIS0[Math.min(i + 1, VIS0.length - 1)] - VIS0[i])*s; };
const LCX = {x: 2014.25, span: 28.5};
const INFL = [{id: "pandemic", x: 2020, label: "Pandemic", side: 1, dy: 26}, {id: "rebound", x: 2024, label: "Rebound", side: -1, dy: -10}, {id: "decline", x: 2025, label: "2025", side: 1, dy: 4}];
const CLOTH = ["#1ea3b8", "#50b3c9", "#2a8fb8", "#d12f4f", "#e04460", "#a53949", "#e8647c", "#1b7f9e"];

// ---- the script. Strings are the speech, in your words. {@name} marks the instant a visual should fire (before the word, or after it when it trails a word).
// {b: seconds, name} is a visual-only beat: the speaker is quiet and the picture plays.
const SCRIPT = [
  {b: 3, name: "open"},
  "{@s1}This year marked the 250th birthday of the United States—a country which has become unrecognizable to its own people.",
  "Since 2020, America has experienced unprecedented cultural and political tumult, and a general discontent.",
  "America is in crisis, but it is an identity crisis.",
  "The country is unrecognizable to its own people.",
  "So we asked: who are these people?",
  {b: 7, name: "s1hold"},
  "{@s2}Immigrants, right? Because America is a country of immigrants.",
  "It’s worth pausing a moment to clarify what this means.",
  {b: 3, name: "mean"},
  "The reason we are a country of immigrants is that a few hundred years ago, {@s3}90% of the native population was killed by disease or force, and at the same time, huge numbers of migrants relocated to the Americas.",
  "By the time the country was formed, nearly its entire population was immigrants.",
  "Very unusual.",
  "So who are we?",
  "We are a country of immigrants.",
  {b: 6, name: "s3hold"},
  {b: 1.5, name: "globe"},
  "{@s4}Rather than study the past 250 years, we examined the most recent twenty-five.",
  "We looked at immigration data from 2000 to 2026, as it portrays the current generation.",
  {b: 1.5, name: "censnote"},
  "{@visas}We mapped where people immigrated from, and where they arrived.",
  {b: 24, name: "visasplay"},
  "We mapped the established paths to living in America: visas and {@lpr}greencards.",
  {b: 16, name: "lprplay"},
  "{@census}As well as the reality (or its closest measure): the census.",
  {b: 2, name: "cens"},
  "{@plot}When we plotted these numbers on a timeline, we noticed something unusual.",
  "What had been stable trends throughout the 2010s went off the rails {@y2020}in 2020, and they have stayed off the rails ever since.",
  "{@s5}During the pandemic, immigration enters into a crisis. Immigration effectively ceases, and the government passes numerous measures to block travel. All measures plummet, and indeed there are holes in the data, because of governmental disruption.",
  {b: 4, name: "pand"},
  "We expected this, but what we did not expect is that the immigration crisis does not stop with the pandemic. {@p2021}It continues to evolve.",
  "Immediately after the pandemic, there is an unprecedented surge in immigration—far beyond a mere {@rebound}rebound.",
  {b: 4, name: "reb"},
  "From 2022 to 2024 the foreign-born share of the U.S. population grew to its highest rate in more than a century{@src_brookings}.",
  "The very next year, the immigration rate {@decline}collapsed.",
  "This time, even more severely than during Covid.",
  "In 2026, just two years after this all-time high, we are {@fan}projected to have negative immigration—below even pandemic lows.",
  {b: 5, name: "fanhold"},
  "Since 2020, immigration, the very measure of American identity, has entered a destabilizing cycle.",
  "Who we are has been a story of continuous evolution throughout American history, but the rate and direction of this change has accelerated precipitously.",
  {b: 10, name: "hold5"},
  "{@s6}The shift in 2026 to negative immigration led us to rethink our immigration maps, mapping deportation and forced removal.",
  {b: 10, name: "red"},
  "In 2024, immigration increased 300% in about two years.",
  "{@ice}In 2025, ICE Arrests increased 300%, {@icefade}and the immigration increase completely reversed.{@src_krugman}",
  "{@gl6}To be clear, ICE was not the sole cause, but it had a severe chilling effect.",
  {b: 7, name: "detain"},
  "{@rem}The US has experienced high rates of deportation in the past, but the aggressive methods of ICE are unprecedented.",
  "In 2025, half the leadership of ICE was replaced{@src_aclu}, and the organization began using masked agents without badges to capture and deport Americans picked up off the street often without cause.{@src_nyt}",
  "These efforts, combined with other federal efforts to limit immigration, had a chilling effect, that may have led to the negative immigration we experience today.",
  {b: 16, name: "hold6"},
  "{@s7}So why does any of this matter?",
  "Unstable immigration hurts American culture and politics.",
  "Rapid demographic changes are distributed unevenly.",
  {b: 3, name: "uneven"},
  "Large numbers of immigrants arrive in a handful of states: Florida, Texas, New York, and California, and the rapid and concentrated change strains local cultures,{@src_houston}",
  "Governments turn to {@img5}reactionary policies, such as the intra-national bussing of migrants in Operation Lone Star{@src_ols}, the unlawful {@img6}detention of migrants and citizens in Minneapolis{@src_nyt2}, and persecution of migrants and citizens in a growing network of prison camps.{@src_aclu2}",
  "The {@fw0}sense of general discontent and unease Americans feel today is exacerbated by these external events, but there is an internal unease too.",
  "The burning question we started with was: {@fw1}who are we, and why is America unrecognizable to Americans?",
  "{@f0}Perhaps it is due to the rapidity of change in immigration {@f20}these past five years.",
  "Not due to an increase or due to a decrease, but to a massive {@fa}acceleration of change in immigration.",
  "As a country of immigrants, immigration is the measure of {@f25}our identity.",
  "Once stable, this metric has become erratic, and the rate of change {@fdisp}threatens the fracturing of our shared national identity.{@fend}",
  {b: 8, name: "end"}
];
const SRC = {
  brookings: ["Brookings Institution", "How did the post-pandemic migration surge affect labor and housing markets?"],
  krugman: ["Paul Krugman", "Iceing the US economy"],
  aclu: ["ACLU", "Border Patrol agents replace top leadership at ICE offices"],
  nyt: ["The New York Times · 12 Feb 2026", "Congress, Trump, ICE and masked agents"],
  houston: ["Houston Public Media · 31 Jan 2025", "Texans divided on immigration policies and border security"],
  ols: ["Office of the Texas Governor", "Texas transports over 100,000 migrants to sanctuary cities"],
  nyt2: ["The New York Times · 25 Sep 2026", "The ICE surge and immigration arrests"],
  aclu2: ["ACLU", "Detained immigrants detail physical abuse and inhumane conditions at the largest immigration detention center in the U.S."]
};
const CHAPTERS = [["s1", "1 · Unrecognizable"], ["s2", "2 · A country of immigrants"], ["s3", "3 · Who we are"], ["s4", "4 · The last twenty-five years"], ["plot", "5 · The line"], ["s6", "6 · Removal"], ["s7", "7 · Why it matters"]];

// ---- compile: words weighted by length, then fitted so the whole film is exactly TOTAL seconds
const M = {}, SENT = [], BEATS = []; let RATE = 1, PAUSE = .55;
function parseSent(raw) { const toks = raw.split(/\s+/).filter(Boolean), words = [];
  for (const tk of toks) { const pre = [], post = []; let m; const re = /\{@(\w+)\}/g; while ((m = re.exec(tk))) (m.index === 0 ? pre : post).push(m[1]); const w = tk.replace(/\{@\w+\}/g, "");
    words.push({w, pre, post, wt: .55 + Math.min(.9, w.replace(/[^\w]/g, "").length*.085) + (/[,;:]$/.test(w) ? .25 : 0) + (/[.?!—]$/.test(w) ? .1 : 0)}); }
  return words; }
function compile() { let Wt = 0, B = 0, n = 0; const items = SCRIPT.map(it => typeof it === "string" ? {words: parseSent(it)} : it);
  for (const it of items) { if (it.words) { it.sum = it.words.reduce((a, w) => a + w.wt, 0); Wt += it.sum; n++; } else B += it.b; }
  const R = Wt/(TOTAL - B - n*PAUSE); let t = 0; SENT.length = 0; BEATS.length = 0; for (const k in M) delete M[k];
  for (const it of items) { if (it.words) { const t0 = t, dur = it.sum/R; let c = t0; for (const w of it.words) { w.t0 = c; c += w.wt/R; w.t1 = c; for (const p of w.pre) M[p] = w.t0; for (const p of w.post) M[p] = w.t1; }
      SENT.push({t0, t1: t0 + dur, words: it.words}); t += dur + PAUSE; }
    else { M[it.name] = t; M[it.name + "_end"] = t + it.b; BEATS.push({name: it.name, t0: t, t1: t + it.b}); t += it.b; } }
  M.total = t; return {wps: 0, R, speechSec: Wt/R, beatSec: B, pauseSec: n*PAUSE, words: items.reduce((a, it) => a + (it.words ? it.words.filter(w => /\w/.test(w.w)).length : 0), 0)}; }
const INFO = compile();

// ---- helpers
const ramp = (t, a, b) => ease(clamp((t - a)/(b - a))), lin = (t, a, b) => clamp((t - a)/(b - a)), pulse = (t, a, b, c, d) => ramp(t, a, b)*(1 - ramp(t, c, d));
function kf(t, pts) { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, x0] = pts[i - 1], [t1, x1] = pts[i]; const u = t1 === t0 ? 1 : (t - t0)/(t1 - t0); return x0 + (x1 - x0)*u*u*(3 - 2*u)*.35 + (x1 - x0)*u*.65; } return pts[pts.length - 1][1]; }
const IMGS = window.IMGS;
const PH = {}; for (const k of ["p1", "p2", "p3", "p4", "p5", "p6", "ice"]) { const e = $("img_" + k); e.style.backgroundImage = `url(${IMGS[k]})`; PH[k] = e; }
const bgc = $("bgc"), wr = $("wash_r"), ww = $("wash_w"), finc = $("fin"), fin = finc.getContext("2d");
const USB = window.USB;
function drawBorders(a) { if (a < .01) return; ov.setTransform(DPR, 0, 0, DPR, 0, 0); ov.lineJoin = "round";
  const line = (L, w, al) => { ov.strokeStyle = `rgba(236,230,216,${al*a})`; ov.lineWidth = w; for (const l of L) { ov.beginPath(); let pen = false; for (const [lo, la] of l) { const q = proj(v3(lo, la)); if (q[2] < 0) { pen = false; continue; } pen ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); pen = true; } ov.stroke(); } };
  line(USB.s, .6, .16); line(USB.n, .9, .3); }
const CAMW = (lon) => ({...CAMS.world(), lon: lon, lat: 20}), CAMUS2 = () => ({lon: -95, lat: 33, R: Math.min(W*.62, H*1.25), cx: W/2, cy: H*.5});
const GOLD = ["#34d27b", "#5fe39a", "#22b863", "#8ff0b8"];   // green cards: green
// green cards, 2024: one dot per person, from country of birth to where they live (tools/build_lprg.py). Every county x country flow of the 200 busiest
// counties (window.LPRG), then the rest of each state x country (window.LPRG_REST), spread over the state's other counties by 2024 net arrivals.
// The buffer is written in place: about 1.36 million dots would be too many for an ordinary array
const LPRG = (() => { const lines = []; sd = 4242; const F = window.LPRG, RS = window.LPRG_REST, mx = Math.max(...F.map(f => f[3])); let cnt = 0;
  const total = F.reduce((s, f) => s + f[3], 0) + RS.flows.reduce((s, f) => s + f[2], 0), buf = new Float32Array(total*12); let o = 0;
  const cOf = (n, xy) => { const ci = C.findIndex(c => c.n === n); return [ci >= 0 ? C[ci] : {n, lon: xy[0], lat: xy[1], sid: -1}, Math.max(ci, 0)]; };
  const put = (c, ci, lon, lat) => { const to = v3(...cloudPt(c)), from = v3(lon + gauss()*.1, lat + gauss()*.08), col = hex(GOLD[Math.floor(rnd()*GOLD.length)]);
    buf.set(to, o); buf.set(from, o + 3); buf.set(col, o + 6); buf[o + 9] = ci; buf[o + 10] = 6; buf[o + 11] = rnd()*.5; o += 12; };
  for (const f of F) { const [n, lon, lat, v] = f, [c, ci] = cOf(n, f[4]); for (let k = 0; k < v; k++) put(c, ci, lon, lat);
    if (cnt++ < 260) { const nl = 1 + Math.round(9*Math.sqrt(v/mx)); for (let k = 0; k < nl; k++) { const to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.9), from = v3(lon + gauss()*.25, lat + gauss()*.2); strand(lines, from, to, ARC_HI(angle(from, to))*(.8 + rnd()*.4), hex("#3ddc84"), rnd()*.45); } } }
  const SP = {}; for (const ab in RS.spread) { const L = RS.spread[ab]; let t = 0; SP[ab] = {L, cum: L.map(p => t += p[2]), t}; }
  for (const f of RS.flows) { const [n, ab, v] = f, [c, ci] = cOf(n, f[3]), s = SP[ab];
    for (let k = 0; k < v; k++) { const r = rnd()*s.t; let lo = 0, hi = s.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (s.cum[m] < r) lo = m + 1; else hi = m; } put(c, ci, s.L[lo][0], s.L[lo][1]); } }
  return {dots: dotBuf(buf), lines: lnBuf(new Float32Array(lines))}; })();
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
    for (let k = 0; k < n; k++) { const pp = pickPort(c), from = v3(pp[0] + gauss()*.5, pp[1] + gauss()*.35), to = v3(c.lon + gauss()*1.4, c.lat + gauss()*1); strand(L, from, to, ARC_HI(angle(from, to))*(.82 + rnd()*.36), col, rnd()*.45); } }
  return TBUF[t] = {dots: dotBuf(new Float32Array(a)), lines: lnBuf(new Float32Array(L))}; }
for (let t = 0; t < 6; t++) typeBuf(t);
const NIV = t => C.reduce((s, c, i) => i === US ? s : s + c.v[VI][t], 0);
const PANELS = [[{t: 0, name: "Visitors · B-1/B-2"}, {t: 1, name: "Students · F-1 and M-1"}, {t: 3, name: "Skilled work · H-1B"}],
                [{t: 2, name: "Exchange · J"}, {t: 4, name: "Other work · H-2, L, O, E, TN"}, {gc: 1, name: "Green cards"}]];
const big = n => n >= 1e6 ? (n/1e6).toFixed(2) + "M" : Math.round(n/1e3) + "k";
let curPanel = -1;
function drawPanels(p) { const el = $("panels"); if (!p) { if (curPanel !== -1) { el.hidden = true; curPanel = -1; } return; }
  if (curPanel !== 1) { curPanel = 1; el.hidden = false; el.innerHTML = PANELS.map(S => `<div class="pset">` + S.map(q => { const col = q.gc ? "#3ddc84" : ARC_COL[q.t], n = q.gc ? D.lpr[VI] : NIV(q.t); return `<div class="pcol"><div class="pname" style="color:${col}">${q.name}</div><div class="pnum">${big(n)}</div></div>`; }).join("") + `</div>`).join(""); }
  const o2 = p.out*p.out, fade = 1 - p.out, sets = el.children; sets[0].style.opacity = (ease(clamp((p.k - .55)/.45))*(1 - p.x)*fade).toFixed(3); sets[1].style.opacity = (p.x*fade).toFixed(3);
  // into the graph: a quick fade to black
  const lon = p.lon, PR = Math.min(W/3*.4, H*.3), PCY = H*.58, w0 = CAMS.world(), k = ease(p.k); ov.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (p.k < 1) { // the rest of the visas stay on the one globe and fade as it separates
    CAM = {lon, lat: 20, R: w0.R, cx: w0.cx, cy: w0.cy}; ROT = rot(CAM); const keep = new Set(PANELS[0].map(q => q.t));
    for (let t = 0; t < 6; t++) if (!keep.has(t)) { const B = typeBuf(t); drawLines(B.lines, {tr: 2, alpha: .055*(1 - k)}); drawDots(B.dots, {tr: 2, alpha: .82*(1 - k), size: 1, glow: false}); } }
  for (let i = 0; i < 3; i++) { CAM = {lon, lat: 20, R: lerp(w0.R, PR, k), cx: lerp(w0.cx, W*(i + .5)/3, k), cy: lerp(w0.cy, PCY, k)}; ROT = rot(CAM);
    drawDots(LAND, {tr: 2, size: 1, alpha: .7*(i === 1 ? 1 : k)*fade, glow: false});
    [[PANELS[0][i], 1 - p.x], [PANELS[1][i], p.x]].forEach(([q, a]) => { if (a < .01) return; const B = q.gc ? LPRG : typeBuf(q.t);
      drawLines(B.lines, {tr: 2, alpha: (q.gc ? .05 : .055 + .03*k)*a*fade}); drawDots(B.dots, {tr: 2, alpha: .85*a*fade, size: 1, glow: false}); });
    const gr = ov.createRadialGradient(CAM.cx, CAM.cy, CAM.R*.92, CAM.cx, CAM.cy, CAM.R*1.04); gr.addColorStop(0, "rgba(127,192,220,0)"); gr.addColorStop(.6, `rgba(127,192,220,${.28*k*fade})`); gr.addColorStop(1, "rgba(127,192,220,0)");
    ov.fillStyle = gr; ov.beginPath(); ov.arc(CAM.cx, CAM.cy, CAM.R*1.04, 0, 6.283); ov.fill(); } }
visasFor(VI); arcsFor(VI);   /* the removals are built by iceRem() and bpb() below, from the map's own red */
// the two globes after the removals globe: it splits as the visa globe split into three: visas issued in 2024 by type (left), removals initiated
// by ICE in 2025 (right). Its own clock (PAIR.u); the globes keep the removals globe's turn
let PAIR = null; const PAIR_T = 2.6, REM_TOT = D.rem.years["2025"].reduce((s, r) => s + r[2], 0);
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
    const k0 = Math.round(3 + 28*Math.sqrt(v/mx)); for (let k = 0; k < k0; k++) { const from = pick(), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.8); strand(L, from, to, ARC_HI(angle(from, to))*.78*(.82 + rnd()*.36), hex(BPR[Math.floor(rnd()*BPR.length)]), rnd()*.5, 48); } }
  return BPB = {dots: dotBuf(buf.subarray(0, o)), lines: lnBuf(new Float32Array(L)), n: o/12}; }
function iceRem() { if (ICER) return ICER; sd = 500 + RI; const F = window.DET.f, yi = window.DET.years.indexOf(2025), fac = {}, L = [];
  F.forEach((f, k) => { const si = STS.detState[k]; if (si < 0 || !(f[2][yi] > 0)) return; const ab = STS.states[si].ab; (fac[ab] = fac[ab] || []).push(f); });
  const from = st => { const Fs = fac[st]; if (!Fs) { const o = D.rem.st[st]; return o ? v3(o[0] + gauss()*.3, o[1] + gauss()*.25) : null; }   /* no facility in the state: near its point */
    let t = 0; for (const f of Fs) t += f[2][yi]; let r = rnd()*t; for (const f of Fs) if ((r -= f[2][yi]) <= 0) return v3(f[0], f[1]); return v3(Fs[0][0], Fs[0][1]); };
  const rows = D.rem.years["2025"], total = rows.reduce((s, r) => s + Math.round(r[2]), 0), buf = new Float32Array(total*12); let o = 0; const byC = new Map();
  for (const [st, n, v] of rows) { const [c, ci] = remCountry(n); if (!c) continue; const e = byC.get(n) || {c, v: 0, st: {}}; e.v += v; e.st[st] = (e.st[st] || 0) + v; byC.set(n, e);
    for (let m = Math.round(v); m > 0; m--) { const fr = from(st); if (!fr) continue; buf.set(v3(...cloudPt(c)), o); buf.set(fr, o + 3); buf.set(hex(REDS[Math.floor(rnd()*REDS.length)]), o + 6); buf[o + 9] = ci; buf[o + 10] = 9; buf[o + 11] = rnd()*.5; o += 12; } }
  const top = [...byC.values()].sort((p, q) => q.v - p.v).slice(0, 22), mr = top[0].v;
  for (const e of top) { const st = Object.entries(e.st).sort((p, q) => q[1] - p[1])[0][0], k0 = Math.round(3 + 28*Math.sqrt(e.v/mr));
    for (let k = 0; k < k0; k++) { const fr = from(st); if (!fr) continue; const to = v3(e.c.lon + gauss()*1.2, e.c.lat + gauss()*.8); strand(L, fr, to, ARC_HI(angle(fr, to))*.78*(.82 + rnd()*.36), hex(REDS[Math.floor(rnd()*REDS.length)]), rnd()*.5, 48); } }
  return ICER = {dots: dotBuf(buf.subarray(0, o)), lines: lnBuf(new Float32Array(L)), n: o/12}; }
function drawPair(p) { const k = ease(clamp(p.u/PAIR_T)), w0 = CAMS.world(), PR = Math.min(W/2*.4, H*.3), PCY = H*.58, lon = p.lon0 + p.spin*p.u; ov.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (k < 1) drawBg(1 - k);
  for (let i = 0; i < 2; i++) { CAM = {lon, lat: 20, R: lerp(w0.R, PR, k), cx: lerp(w0.cx, W*(i + .5)/2, k), cy: lerp(w0.cy, PCY, k)}; ROT = rot(CAM);
    drawDots(LAND, {tr: 2, size: 1, alpha: .7*(i === 1 ? 1 : k), glow: false});
    if (i === 0) { for (let t = 0; t < 6; t++) drawLines(typeBuf(t).lines, {tr: 2, alpha: .055*k}); drawDots(visasFor(VI), {tr: 2, alpha: .82*k, size: 1, glow: false}); }
    else { const I = iceRem(), B = bpb(); drawLines(I.lines, {tr: 2, alpha: .5}); drawDots(I.dots, {tr: 2, alpha: .95, size: 1, glow: false}); drawLines(B.lines, {tr: 2, alpha: .5}); drawDots(B.dots, {tr: 2, alpha: .95, size: 1, glow: false}); }
    const gr = ov.createRadialGradient(CAM.cx, CAM.cy, CAM.R*.92, CAM.cx, CAM.cy, CAM.R*1.04); gr.addColorStop(0, "rgba(127,192,220,0)"); gr.addColorStop(.6, `rgba(127,192,220,${.28*k})`); gr.addColorStop(1, "rgba(127,192,220,0)");
    ov.fillStyle = gr; ov.beginPath(); ov.arc(CAM.cx, CAM.cy, CAM.R*1.04, 0, 6.283); ov.fill(); } }
let pairShown = false;
function pairHead(p) { const el = $("pairhd"); if (!p) { if (pairShown) { el.hidden = true; pairShown = false; } return; }
  if (!pairShown) { pairShown = true; el.hidden = false; const col = (c, name, n, sub) => `<div class="pcol"><div class="pname" style="color:${c}">${name}</div><div class="pnum">${n}</div><div class="psub">${sub}</div></div>`;
    el.innerHTML = col("#ece6d8", "Visas issued · 2024", big([0, 1, 2, 3, 4, 5].reduce((s, k) => s + NIV(k), 0)), "each dot = 50 visas")
      + `<div class="pcol" style="display:flex;gap:3vw">` + col("#ff5a40", "ICE Removals · 2025", big(REM_TOT), "each dot = 1 removal").replace('class="pcol"', 'class="pcol" style="padding:0;flex:none"')
      + col("#c41e3a", "BPS Removals · 2024", big(BP.border), "each dot = 1 removal").replace('class="pcol"', 'class="pcol" style="padding:0;flex:none"') + `</div>`; }
  el.style.opacity = ease(clamp((ease(clamp(p.u/PAIR_T)) - .55)/.45)).toFixed(3); }
// the census crowd: one particle per 5,000 people counted in 2024 and 2025, each in its county
for (const d of CROWD) { d.d = d.d || 0; d.cs = Math.sqrt(rnd()); d.ca = rnd()*6.2832; d.j = [gauss(), gauss()]; }
const VDOTS = []; { let q = 77; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296; for (let x = 2000, i = 0; x <= 2025; x += .07, i++) VDOTS.push({x, j: (r() - .5)*3, k: i % 8, ang: r()*6.2832, sp: .25 + r()*.75, rr: r()}); }
// ICE detention: one dot per 10 people held on an average day, gathered at each facility; a facility's first n dots are shown, so it swells and shrinks year to year
const DETY = window.DET.years, DETP = []; { let q = 991; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296, gs = () => Math.sqrt(-2*Math.log(r() + 1e-9))*Math.cos(6.2832*r());
  window.DET.f.forEach(([lon, lat, adp], fi) => { const mx = Math.round(Math.max(...adp)), sg = .05 + .018*Math.sqrt(mx/10); /* one dot per person held */ for (let j = 0; j < mx; j++) DETP.push({f: fi, j, p: v3(lon + gs()*sg/Math.cos(lat*D2R), lat + gs()*sg), k: Math.floor(r()*8), h: (j % 3) === 0}); }); }
const DET0 = 2021, DET1 = 2026;
function drawDetention(o) { if (!o || o.a < .01) return; const yf = o.yr - DETY[0], i0 = Math.floor(clamp(yf, 0, DETY.length - 1)), i1 = Math.min(DETY.length - 1, i0 + 1), u = clamp(yf - i0), F = window.DET.f;
  const by = Array.from({length: 8}, () => new Path2D()), halo = new Path2D();
  for (const d of DETP) { const a = F[d.f][2], c = a[i0] + (a[i1] - a[i0])*u; if (d.j >= c) continue; const q = proj(d.p); if (q[2] < 0) continue; const X = q[0]*DPR, Y = q[1]*DPR, r = .5*DPR;
    by[d.k].rect(X - r, Y - r, 2*r, 2*r); if (d.h) { halo.moveTo(X + 6*DPR, Y); halo.arc(X, Y, 6*DPR, 0, 6.283); } }
  
  fx.globalAlpha = .95*o.a; for (let k = 0; k < 8; k++) { fx.fillStyle = REDS[k]; fx.fill(by[k]); } fx.globalAlpha = 1; }
const CLUSTER = CROWD.map((d, i) => ({r: Math.sqrt((i + .5)/CROWD.length), a: i*2.39996}));

// the globe's turn: it starts from the US view and eases into half a turn per stage (one globe, three globes, three more)
let SPINX = 0;   /* extra turn while a globe slide is held: the globe keeps spinning */
function SPIN(t) { const HS = (M.cens - M.visas)/3, T = 5, s = 180/HS, u = Math.max(0, t - M.visas); return -96.5 + s*(u < T ? u*u/(2*T) : u - T/2); }
function camAt(t) { const us = CAMS.us(), cEnd = M.cens + .3*(M.cens_end - M.cens);
  // one full turn of the globe while the visas and green cards spread, and again while the removals leave
  const wv = CAMW(SPIN(t) + SPINX);
  if (t < M.gl6) return t < M.visas ? us : camMix(us, wv, ramp(t, M.visas, M.visas + .6*(M.cens - M.visas)/3));
  const wr = CAMW(-62 + 360*Math.max(0, t - (M.rem + 1))/(M.hold6_end - 2.8 - M.rem - 1) + SPINX); return camMix(us, wr, ramp(t, M.rem + .5, M.rem + 13)); }   // same framing and pull-back as the immigration map

// ---- the state of every layer at time t
function stateAt(t) {
  const s = {strands: 0, chart: 0, pen: 2000, fan: 0, op: 0, yo: 0, flyOut: 0, fly: 0, cens: 1, spotsHint: 0, disp: 0, red: 0, infl: {}};
  const o = {ph: {}, gl: 0, bg: "#05080d", wR: 0, wW: 0, ice: 0, cam: camAt(t), vis: 0, visTr: 0, lpr: 0, lprTr: 0, rem: 0, remTr: 0, cp: null, fin: null, cap: [], note: "", src: null, wob: 0};
  // ---- slides 1-3: photographs
  const on = (A, B) => t >= A && t < B ? 1 : 0;   // clean cuts, no zoom
  o.ph.p1 = {a: on(0, M.s2), k: 1}; o.ph.p2 = {a: on(M.s2, M.s3), k: 1}; o.ph.p3 = {a: on(M.s3, M.globe), k: 1};
  // ---- slide 4: the US first, immigrants by county year by year; then visas and green cards spread off the map to the world
  const c0 = M.cens, cl = M.cens_end - M.cens, cf = f => c0 + f*cl;
  o.gl = ramp(t, M.globe + .6, M.globe + 3.6)*(t < M.cens ? 1 : 0);   /* clean cut from the globe to the graph */
  if (t >= M.globe && t < M.census + 4) { const yr = 2001 + 24*lin(t, M.globe + .8, M.censnote - .2);
    o.cen = {yr, a: ramp(t, M.globe + 2, M.globe + 3.5)*(1 - .85*ramp(t, M.visas, M.visas + 6))*(1 - ramp(t, M.census, M.census + 3))};
    const Y0 = Math.floor(yr + 1e-6), Y = Y0 === 2010 || Y0 === 2020 ? Y0 + 1 : Y0;   /* the April-June years are not shown */
    if (t < M.censnote + 1.5) o.corner = {label: `Net International Immigration · ${Y}`, num: big(NIMX[Y - 2001]), color: "#8fd3ff"}; }
  if (t >= M.censnote && t < M.visas) { o.note = "The Census does not record immigrants’ country of origin, but visas and green cards paint a picture."; o.noteMid = 1; o.noteFade = 1; }   /* held on slide 7; fades over 1 s as slide 8 begins */
  o.bord = Math.max(ramp(t, M.globe + .6, M.globe + 3.6)*(1 - ramp(t, M.visas, M.visas + 1.5)),   /* gone before the US opens out into the globe: no state borders on a globe */ t >= M.gl6 && t < M.s7 ? ramp(t, M.gl6, M.gl6 + 2.6)*(1 - ramp(t, M.rem + .5, M.rem + 6)) : 0);
  const dimV = 1;   // the arcs stay until the globe itself fades
  const HS = (M.cens - M.visas)/3, P1 = M.visas + HS, P2 = M.visas + 2*HS;
  o.vis = t < P1 ? ramp(t, M.visas, M.visas + 1) : (t < P1 + 3 ? 1 - ramp(t, P1, P1 + 2.2) : 0); o.visTr = lin(t, M.visas, M.visas + .9*HS)*2; o.lpr = 0;
  if (t >= P1 && t < M.cens) { const P = t < P2 ? P1 : P2; o.pan = {lon: SPIN(t) + SPINX, k: ramp(t, P1, P1 + 3), x: ramp(t, P2 - .8, P2 + .8), out: lin(t, M.cens - 1, M.cens)};   /* a quick fade to black before the graph */ }
  if (t >= M.s5 - 1) { o.vis = 0; o.lpr = 0; }
  // ---- the lines dissolve into dots, which converge into the timeline
  if (false) o.conv = {a: ramp(t, M.census + .8, M.census + 3.5)*(1 - ramp(t, M.plot + .4, M.plot + 2.2)), g: ramp(t, cf(0), cf(.84))};
  s.chart = t >= M.cens ? 1 : 0;   // a clean cut to the timeline once the dots have landed
  // the line is drawn with the speech
  const PK = [[M.plot - .2, 2001], [M.plot + .6, 2001], [M.y2020 - .3, 2019.62], [M.y2020 + 2.0, 2020.0], [M.pand_end, 2020.0], [M.p2021, 2020.02], [M.p2021 + 5, 2024.0], [M.decline + .2, 2024.0],   /* one continuous climb from the pandemic to the 2024 peak (slide 12) */ [M.decline + 2.0, 2025.0], [M.fan + 2, 2025.0]];
  s.pen = t < M.plot ? 2000 : kf(t, PK);
  if (t >= M.fw0) s.pen = 2025;
  s.infl.pandemic = pulse(t, M.y2020 + 1.2, M.y2020 + 2.4, M.p2021, M.p2021 + 2) *.75 + .3*ramp(t, M.p2021 + 2, M.p2021 + 3);
  s.infl.rebound = pulse(t, M.p2021 + 4.6, M.p2021 + 5.6, M.decline, M.decline + 1.5)*.75 + .3*ramp(t, M.decline + 1.5, M.decline + 2.5);   /* appears as the line reaches the peak */
  s.infl.decline = pulse(t, M.decline + 1, M.decline + 2, M.fan, M.fan + 2)*.75 + .3*ramp(t, M.fan + 2, M.fan + 3);
  s.fan = ramp(t, M.fan, M.fan + 3.2);
  // ---- slide 6: the line comes apart into dots, which turn red
  const L6 = M.ice - M.s6;
  s.op = 0; s.disp = 0; s.red = 0; s.grow = 0;   // the timeline holds until the clean cut to the photograph
  o.wR = 0;
  if (t >= M.ice) { s.chart = 0; o.wR = 0; }
  if (t >= M.s5 + 0 && t < M.s6 + 0) s.chart = Math.max(s.chart, 1);
  if (t < M.cens) s.chart = 0;
  // ---- the ICE page, then plain blue, then the globe again
  if (t >= M.ice) { o.ice = t < M.gl6 ? 1 : 0; o.cap = []; }   // hard cut to the photograph, hard cut out to black; the globe fades up
  o.gl = Math.max(o.gl, ramp(t, M.gl6, M.gl6 + 2.6));
  if (t >= M.gl6 && t < M.s7 && !window.NO_DET) { const yr = DET0 + (DET1 - DET0)*lin(t, M.gl6 + 2.4, M.rem - .6); o.det = {yr, a: ramp(t, M.gl6 + 1.6, M.gl6 + 3)*(1 - .85*ramp(t, M.rem, M.rem + 6))*o.gl};
    const Y = Math.min(DET1, Math.floor(yr + 1e-6)), YI2 = DETY.indexOf(Y), nf = window.DET.n[YI2];
    if (t < M.rem + 3) { o.note = `ICE detention · ${Y}`; } }
  if (t >= M.gl6) { o.rem = ramp(t, M.rem, M.rem + 1); o.remTr = lin(t, M.rem, M.rem + 22.5)*2; }
  // globe out, hard cut to the photographs
  if (t >= M.hold6_end - 2.8) o.gl = o.gl*(1 - ramp(t, M.hold6_end - 2.8, M.hold6_end));
  if (t >= M.s7) { o.gl = 0; o.bg = "#05080d"; o.rem = 0; o.ice = 0; }
  const cut = (T) => t >= T ? 1 : 0;
  o.ph.p4 = {a: cut(M.s7)*(1 - cut(M.img5)), k: 1 + .045*ease(clamp((t - M.s7)/(M.img5 - M.s7)))};
  o.ph.p5 = {a: cut(M.img5)*(1 - cut(M.img6)), k: 1 + .045*ease(clamp((t - M.img5)/(M.img6 - M.img5)))};
  o.ph.p6 = {a: cut(M.img6), k: 1 + .045*ease(clamp((t - M.img6)/(M.fw0 - M.img6)))};
  // ---- the last page: fade to white, the dots come back in the colours of the clothes, the line is drawn again, then it scatters
  o.wW = ramp(t, M.fw0, M.fw1);
  // ---- captions
  const cap = (a, b, h) => { if (t >= a && t < b) o.cap.push(h); };
  if (t >= M.visas + 4.5 && t < M.visas + (M.cens - M.visas)/3) o.corner = {label: "Visas issued · 2024", num: big([0, 1, 2, 3, 4, 5].reduce((s, k) => s + NIV(k), 0)), sub: "each dot = 50 visas", color: "#ece6d8"};
  
  cap(M.rem + 1.2, M.hold6_end - 2.8, `<span style="color:#ff5a40">ICE Removals</span>, 2025 · each dot = 1 removal`);
  cap(M.rem + 1.2, M.hold6_end - 2.8, `<span style="color:#c41e3a">BPS Removals</span>, 2024 · each dot = 1 removal`);
  // ---- sources, a few seconds after each claim
  for (const k in SRC) { const a = M["src_" + k]; if (a != null && t >= a && t < a + 7) { o.src = k; o.srcA = Math.min(ramp(t, a, a + .6), 1 - ramp(t, a + 6.2, a + 7)); } }
  return [s, o]; }

// ---- render
const phEls = PH, capEl = $("cap"), noteEl = $("note"), srcEl = $("src"), notesEl = $("notes");
let curCap = "", curNote = "", curSrc = "", curCorner = "", noteFade = .8;
function render(t, now) {
  const [s, o] = stateAt(t); window.LASTO = o; LC = LCX; YOFF = 0; layout(); CAM = o.cam; ROT = rot(CAM);
  if (PAIR) { o.cap = []; o.note = ""; o.corner = null; o.pan = null; o.det = null; o.bord = 0; o.gl = 1; o.pair = PAIR; }   /* the two-globe slide draws only itself */
  if (window.NO_DET) o.bord = 0;   /* after the map the map's own outlines stay on top (smOverlay) */
  pairHead(o.pair);
  bgc.style.background = o.bg;
  for (const k of ["p1", "p2", "p3", "p4", "p5", "p6"]) { const e = PH[k], v = o.ph[k]; e.style.opacity = v.a.toFixed(3); e.style.transform = `scale(${v.k.toFixed(4)})`; e.hidden = v.a < .003; }
  PH.ice.style.opacity = o.ice.toFixed(3); PH.ice.hidden = o.ice < .003;
  wr.style.opacity = o.wR.toFixed(3); ww.style.opacity = o.wW.toFixed(3);
  // the globe
  glc.style.opacity = o.gl.toFixed(3); ov.setTransform(1, 0, 0, 1, 0, 0); ov.clearRect(0, 0, ovc.width, ovc.height); drawBorders(o.bord || 0);
  gl.clearColor(.0196, .0314, .051, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  if (o.pair) { drawPanels(null); drawPair(o.pair); } else if (o.pan) { if (o.pan.k < 1) drawBg(1 - ease(o.pan.k)); drawPanels(o.pan); } else { drawPanels(null); } if (!o.pan && !o.pair && o.gl > .01) { const la = window.NO_DET ? ramp(t, M.rem + 2, M.rem + 9) : 1;   /* after the map: the world comes in only as the US shrinks */
    drawBg(la); drawDots(LAND, {tr: 2, size: 1, alpha: .7*la, glow: false});
    if (o.vis > .01) { for (let t = 0; t < 6; t++) drawLines(typeBuf(t).lines, {tr: o.visTr, alpha: .055*o.vis}); drawDots(visasFor(VI), {tr: o.visTr, alpha: .82*o.vis, size: 1, glow: false}); }
    if (o.lpr > .01) { drawLines(LPRG.lines, {tr: o.lprTr, alpha: .3*o.lpr}); drawDots(LPRG.dots, {tr: o.lprTr, alpha: .9*o.lpr, size: 1, glow: false}); }
    if (o.rem > .01) { const I = iceRem(), B = bpb(); drawLines(I.lines, {tr: o.remTr, alpha: .5*o.rem}); drawDots(I.dots, {tr: o.remTr, alpha: .95*o.rem, size: 1, glow: false});
      drawLines(B.lines, {tr: o.remTr, alpha: .5*o.rem}); drawDots(B.dots, {tr: o.remTr, alpha: .95*o.rem, size: 1, glow: false}); } }   /* and the border removals, apart */
  // the line, and the county dots that become it
  drawLine(s, now); fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); drawCensus(o.cen); drawConverge(o.conv); drawDetention(o.det);
  drawFinal(o.fin, now);
  // words
  const ck = o.corner ? JSON.stringify(o.corner) : ""; if (ck !== curCorner) { curCorner = ck; const el = $("corner"); if (o.corner) el.innerHTML = `<div class="pname" style="color:${o.corner.color}">${o.corner.label}</div><div class="pnum">${o.corner.num}</div>` + (o.corner.sub ? `<div class="psub">${o.corner.sub}</div>` : ""); el.style.opacity = o.corner ? 1 : 0; }
  const ch = o.cap.join("<br>"); if (ch !== curCap) { curCap = ch; capEl.innerHTML = ch; capEl.style.opacity = ch ? 1 : 0; }
  if (o.note) noteEl.classList.toggle("mid", !!o.noteMid);   /* keep its place while it fades out */ if (o.note !== curNote) { curNote = o.note; noteEl.style.transition = `opacity ${o.note ? .8 : noteFade}s`; if (o.note) noteFade = o.noteFade || .8; noteEl.style.opacity = o.note ? 1 : 0; if (o.note) noteEl.textContent = o.note; }
  const sk = o.src || ""; if (sk !== curSrc) { curSrc = sk; if (sk) srcEl.innerHTML = `<i>Source</i> <b>${SRC[sk][0]}</b> · ${SRC[sk][1]}`; }
  srcEl.style.opacity = 0; $("appx").style.opacity = ramp(t, M.end + .5, M.end + 2).toFixed(3); }
// immigrants by county, 2001-2025, one dot per 100 people (window.STS, tools/build_states.py): each county keeps its own dots, on its census tracts, and shows
// its first n in a given year. 2010 and 2020 are stepped over (smVal): the county files have only April-June for them
const CENP = smDots(515);
function drawCensus(o) { if (!o || o.a < .01) return; const by = Array.from({length: 8}, () => new Path2D()), cv = window.STS.counties.map(cn => smVal(cn[3], o.yr)/100);
  for (let i = 0; i < CENP.n; i++) { if (CENP.j[i] >= cv[CENP.c[i]]) continue; const q = proj([CENP.p[3*i], CENP.p[3*i + 1], CENP.p[3*i + 2]]); if (q[2] < 0) continue; const X = q[0]*DPR, Y = q[1]*DPR, r = .5*DPR; by[CENP.k[i]].rect(X - r, Y - r, 2*r, 2*r); }
  fx.globalAlpha = o.a; for (let k = 0; k < 8; k++) { fx.fillStyle = TFAM[0][k]; fx.fill(by[k]); } fx.globalAlpha = 1; }
// the visa and green-card dots, sampled where they rest on the globe; they lift off and stream into the start of the census line
const CONV = []; { let q = 808; const r = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296; const tot = c => c.v[VI].reduce((s, v) => s + v, 0), W0 = C.map((c, i) => i === US ? 0 : tot(c)); let T0 = 0; const cum = W0.map(w => T0 += w);
  const LG = window.LPRG, LT = LG.reduce((s, f) => s + f[3], 0);
  for (let i = 0; i < 9000; i++) { let p, col; if (r() < .78) { const x = r()*T0; let k = cum.findIndex(c => c >= x); const c = C[k]; p = v3(...cloudPt(c)); col = TFAM[0][Math.floor(r()*8)]; }
    else { let x = r()*LT, k = 0; while ((x -= LG[k][3]) > 0) k++; const f = LG[k], ci = C.findIndex(c => c.n === f[0]); const c = ci >= 0 ? C[ci] : {lon: f[4][0], lat: f[4][1], sid: -1}; p = v3(...cloudPt(c)); col = GOLD[Math.floor(r()*4)]; }
    CONV.push({p, col, d: r()*.45, u: r(), jy: (r() - .5)}); } }
function drawConverge(o) { if (!o || o.a < .01) return; const tx0 = L.X(NY0), by = new Map();
  for (const d of CONV) { const q = proj(d.p); const g = ease(clamp((o.g*1.5 - d.d)/1.05)); if (q[2] < 0 && g < .05) continue; const tx = tx0 - 30 + d.u*30, ty = L.Y(nimAt(NY0)) + d.jy*1.5;
    const mid = [lerp(q[0], tx, .5), Math.min(q[1], ty) - 120*(1 - Math.abs(d.u - .5))]; const x = (1 - g)*(1 - g)*q[0] + 2*(1 - g)*g*mid[0] + g*g*tx, y = (1 - g)*(1 - g)*q[1] + 2*(1 - g)*g*mid[1] + g*g*ty;
    const col = g > .85 ? "#8fd0ee" : d.col; if (!by.has(col)) by.set(col, new Path2D()); const r = .5*DPR; by.get(col).rect(x*DPR - r, y*DPR - r, 2*r, 2*r); }
  fx.globalAlpha = o.a; for (const [c, p] of by) { fx.fillStyle = c; fx.fill(p); } fx.globalAlpha = 1; }
function drawFinal(f, now) { fin.setTransform(DPR, 0, 0, DPR, 0, 0); fin.clearRect(0, 0, W, H); if (!f) return; const ppy = L.ppy(), r0 = .95, by = Array.from({length: 8}, () => new Path2D()), sq = f.disp < .05;
  // faint axes, dark on white
  if (f.axes > .01) { fin.globalAlpha = f.axes*.5; fin.strokeStyle = "#1b2433"; fin.lineWidth = 1; fin.beginPath(); fin.moveTo(L.ax, L.Y(0)); fin.lineTo(W - 16, L.Y(0)); fin.stroke(); fin.fillStyle = "#5b6577"; fin.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; fin.textAlign = "center";
    for (let y = 2000; y <= 2026; y += 1) { const X = L.X(y); fin.fillRect(X, L.Y(0) + 6, 1, 4); if (y % 4 === 0) fin.fillText(String(y), X, L.Y(0) + 24); } fin.globalAlpha = 1; }
  const penP = [L.X(f.pen), f.pen < NY0 ? L.Y(visAt(f.pen)/4) : L.Y(nimAt(f.pen))];
  // visas issued, 2000-2025, redrawn as a finer thread of the same dots
  for (const v of VDOTS) { if (v.x > f.pen) break; let x = L.X(v.x), y = L.Y(visAt(v.x)/4) + v.j, r = 1.25;
    if (f.disp > 0) { const dist = (50 + v.sp*Math.max(W, H)*.8)*Math.pow(f.disp, 1.4); x += Math.cos(v.ang)*dist; y += Math.sin(v.ang)*dist; r += f.disp*(1.5 + v.rr*5); }
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue; by[v.k].moveTo(x + r, y); by[v.k].arc(x, y, r, 0, 6.283); }
  for (const d of DOTS) { const X = L.X(d.x), Y = L.Y(nimAt(d.x)) + d.v*ppy*VSQ*1.6, settle = ease(clamp((f.pen - d.x)/.5)); let x, y, r = r0;
    if (f.pen < d.x - .0001 && (f.pen > d.x - 1.15 || (f.pen < 2010.6 && d.x < 2011.7))) { // the cloud ahead of the pen; it first spirals in from the edges of the screen
      const e = ease(f.swirl), th = d.ang + now/(520 + d.sp*700) + (1 - e)*5.5, R = 18 + d.sp*70 + 26*d.rr + (1 - e)*Math.max(W, H)*.85*(.4 + d.sp); x = penP[0] + Math.cos(th)*R; y = penP[1] + Math.sin(th)*R*.8; r = r0*1.15; }
    else if (f.pen >= d.x - .0001) { const th = d.ang + now/(520 + d.sp*700), R = (18 + d.sp*70 + 26*d.rr)*(1 - settle); x = lerp(penP[0] + Math.cos(th)*R, X, settle); y = lerp(penP[1] + Math.sin(th)*R*.8, Y, settle); }
    else continue;
    if (f.disp > 0 && f.pen >= d.x - .0001) { const dist = (50 + d.sp*Math.max(W, H)*.8)*Math.pow(f.disp, 1.4); x += Math.cos(d.ang)*dist; y += Math.sin(d.ang)*dist; r += f.disp*(2 + d.rr*8); }
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue; if (f.disp > .05 && d.rr > Math.max(.04, 1 - .96*Math.pow(f.disp, .6))) continue; const p = by[d.k]; if (sq) p.rect(x - r, y - r, 2*r, 2*r); else { p.moveTo(x + r, y); p.arc(x, y, r, 0, 6.283); } }
  fin.globalAlpha = Math.max(0, f.fade)*Math.min(1, f.swirl*2.5 + (f.pen > NY0 ? 1 : 0)); for (let k = 0; k < 8; k++) { fin.fillStyle = CLOTH[k]; fin.fill(by[k]); } fin.globalAlpha = 1; }

// ---- transport
const Q0 = new URLSearchParams(location.search);
let T = 0, PLAYING = false, STARTED = false, last = 0, hideAt = 0, notesOn = Q0.has("notes");
const fmtT = t => { t = Math.max(0, Math.floor(t)); return Math.floor(t/60) + ":" + String(t % 60).padStart(2, "0"); };
function sentAt(t) { let lo = 0, hi = SENT.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (SENT[m].t0 <= t) lo = m; else hi = m - 1; } return lo; }
let lastSent = -1;
function notes(t) { if (!notesOn) { notesEl.hidden = true; return; } notesEl.hidden = false; const i = sentAt(t), cur = SENT[i], inS = t >= cur.t0 && t <= cur.t1 + PAUSE;
  if (i !== lastSent) { lastSent = i; const clean = ws => ws.map(w => `<span>${w.w}</span>`).join(" "); notesEl.innerHTML = `<p class="prev">${i > 0 ? SENT[i - 1].words.map(w => w.w).join(" ") : ""}</p><p class="cur">${clean(cur.words)}</p><p class="next">${i + 1 < SENT.length ? SENT[i + 1].words.map(w => w.w).join(" ") : ""}</p>`; notesEl.dataset.n = cur.words.length; }
  const sp = notesEl.querySelectorAll(".cur span"); cur.words.forEach((w, k) => { const on = t >= w.t0; sp[k] && sp[k].classList.toggle("on", on); });
  notesEl.classList.toggle("rest", !inS); }
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
/* the net-arrival dots, one per person (about 2.9 million): each county gets enough for its largest full year, placed on its census tracts in proportion
   to their foreign-born residents (ACS 2020-2024, STS.tt/tc) and scattered within each tract's footprint; a county shows its first n in a given year.
   Made once, the first time the slide opens, and drawn straight into a pixel buffer */
let SMD = null, smOff = null, smOx = null, smID = null, smU32 = null, SM_FAC = [];
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
const SM_ON = {nim: true, gc: false, h1b: false, stu: false, det: true, bp: true}, smLeg = $("smleg");   /* the heavier layers start switched off */
smLeg.innerHTML = [["nim", "#8fd3ff", "Net arrivals", "1 dot = 1 person"], ["gc", "#3ddc84", "New green cards, 2024", "1 dot = 1 person"],
                   ["h1b", "#ff45c5", "H-1B approvals", "1 dot = 1 approval"], ["stu", "#f2e640", "International students, 2024", "1 dot = 1 student"],
                   ["det", "#ff5a40", "Held by ICE, average day", "1 dot = 1 person"], ["bp", "#c41e3a", "BPS Removals, 2014–2024", "1 dot = 1 removal"]]
  .map(([k, col, t, u]) => `<button type="button" data-k="${k}" aria-pressed="${SM_ON[k]}" class="${SM_ON[k] ? "" : "off"}"><i style="background:${col}"></i><span>${t}</span><em>${u}</em></button>`).join("")
  + `<div class="sc"><input type="range" id="smscrub" min="2001" max="2025" step="0.01" value="2025" aria-label="Year"><b id="smyr">2025</b></div>`;
smLeg.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); const k = b.dataset.k; SM_ON[k] = !SM_ON[k]; b.classList.toggle("off", !SM_ON[k]); b.setAttribute("aria-pressed", SM_ON[k]); });
/* the timeline: dragging it stops the replay and sets the year for the whole map */
const smScrub = $("smscrub"), smYr = $("smyr"); let smPlay = false, smDrag = false;
smScrub.addEventListener("input", () => { smPlay = false; smYear = +smScrub.value; smShown = ""; });
smScrub.addEventListener("pointerdown", () => { smDrag = true; }); addEventListener("pointerup", () => { if (smDrag) { smDrag = false; smScrub.blur(); } });
const SM_DEF = {...SM_ON}, SM_KEEP = ["det", "bp"], SM_OFF = ["nim", "gc", "h1b", "stu"];   /* leaving, all but ICE detention and the border removals switch off, one by one */
function smSetLayer(k, on) { SM_ON[k] = on; const b = smLeg.querySelector(`[data-k="${k}"]`); if (b) { b.classList.toggle("off", !on); b.setAttribute("aria-pressed", on); } }
let smOffT = 0, smLineA = 1, smLastSel = -1;
const SM_YPS = 2, SM_FLY = 1.1;   /* two years a second once the camera has arrived (2001-2025 in 12 s); 1.1 s flights */
let smSel = -1, smHov = -1, smYear = 2025, smFrom = null, smTo = null, smU = 1, smCam = null, smMouse = null, smShown = "", smExit = 0, smHand = 0, smHandA = 0, smOverlay = false;
function smReset() { smSel = -1; smHov = -1; smYear = SY[0]; smPlay = true; smExit = 0; smOffT = .4; smLineA = 1; for (const k in SM_DEF) smSetLayer(k, SM_DEF[k]);   /* the slide opens in 2001 and plays forward, with the default layers */ smCam = usCam(); smFrom = smTo = smCam; smU = 1; smp.style.opacity = 0; smt.style.opacity = 0; smShown = ""; }
function smFly(to) { smFrom = smCam; smTo = to; smU = 0; }
function smSelect(si) { if (si === smSel) return; smSel = si; smYear = SY[0]; smPlay = true; smShown = ""; smFly(smCamFor(si)); smp.style.opacity = 1; }
function smBack() { if (smSel < 0) return; smLastSel = smSel; smSel = -1; smFly(usCam()); smp.style.opacity = 0; }
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
    if (smU < 1) { smU = Math.min(1, smU + dt/SM_FLY); smCam = camMix(smFrom, smTo, ease(smU)); } else if (smSel < 0) smCam = usCam();
    /* leaving: zoom out, run to 2025, switch off the other layers one by one (ICE detention and the border removals stay), then on to the globe */
    if (smExit) { if (smSel >= 0) smBack(); if (smU >= 1 && smSel < 0) { smPlay = false;
      if (smYear < 2025) smYear = Math.min(2025, smYear + dt*8);
      else { for (const k of SM_KEEP) if (!SM_ON[k]) smSetLayer(k, true); smOffT -= dt;
        if (smOffT <= 0) { const k = SM_OFF.find(k => SM_ON[k]); if (k) { smSetLayer(k, false); smOffT = .5; } else if (smLineA <= 0) smLeave(); } } } }   /* and the borders have gone */
    if (smPlay && smU >= 1) { smYear = Math.min(2025, smYear + dt*SM_YPS); if (smYear >= 2025) smPlay = false; }
    if (!smDrag) smScrub.value = smYear; smYr.textContent = Math.floor(smYear + 1e-6); }
  const c = overlay ? CAM : smCam, M = rot(c), x = smx; x.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (overlay) x.clearRect(0, 0, W, H); else { x.fillStyle = "#05080d"; x.fillRect(0, 0, W, H); }
  const ring = (si) => { x.beginPath(); for (const r of SM_V[si]) { let pen = false; for (const p of r) { const q = smPt(M, c, p); if (q[2] < 0) { pen = false; continue; } pen ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); pen = true; } } };
  /* outlines */
  /* the borders fade while the layers switch off on the way out of the map, and are gone by the time the removals spread; skipped with a second
     press, whatever is left fades in the first moment of the globe slide */
  if (!overlay && smExit) smLineA = Math.max(0, smLineA - dt/1.6);   /* from the moment the map is left; back to 1 only in smReset */
  const lineA = overlay ? smLineA*(1 - ramp(T, M.rem, M.rem + .8)) : smLineA;
  x.lineJoin = "round"; x.lineWidth = .6; x.strokeStyle = `rgba(236,230,216,${(smSel >= 0 ? .07 : .16)*lineA})`; if (lineA > .005) for (let i = 0; i < STS.states.length; i++) if (i !== smSel) { ring(i); x.stroke(); }
  /* county dots: the chosen state replays its years, the others stay at 2025, dimmed while a state is chosen */
  const sel = smSel >= 0, r0 = .5, off = (q) => q[2] < 0 || q[0] < -2 || q[0] > W + 2 || q[1] < -2 || q[1] > H + 2;
  if (SM_ON.nim || SM_ON.bp || SM_ON.gc || SM_ON.h1b || SM_ON.stu) {
    if (!smOff || smOff.width !== W || smOff.height !== H) { smOff = document.createElement("canvas"); smOff.width = W; smOff.height = H; smOx = smOff.getContext("2d"); smID = smOx.createImageData(W, H); smU32 = new Uint32Array(smID.data.buffer); }
    smU32.fill(0); const a0 = M[0]*c.R, a1 = M[1]*c.R, a2 = M[2]*c.R, b0 = M[3]*c.R, b1 = M[4]*c.R, b2 = M[5]*c.R;
    /* one pass per layer into the pixel buffer: 1 px squares, the chosen state's at full strength, the others dimmed */
    const pass = (S, lim, grp, col, dim) => { const P = S.p, CC = S.c, J = S.j, K = S.k;
      for (let i = 0, n = S.n; i < n; i++) { const ci = CC[i]; if (J[i] >= lim[ci]) continue; const px = P[3*i], py = P[3*i + 1], pz = P[3*i + 2]; if (M[6]*px + M[7]*py + M[8]*pz < 0) continue;
        const X = Math.floor(c.cx + a0*px + a1*py + a2*pz), Y = Math.floor(c.cy - b0*px - b1*py - b2*pz); if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        smU32[Y*W + X] = sel && grp(ci) !== smSel ? dim[K[i]] : col[K[i]]; } };
    if (SM_ON.nim) { if (!SMD) SMD = smMake(); const cv = new Float32Array(STS.counties.length); STS.counties.forEach((cn, ci) => { cv[ci] = smVal(cn[3], smYear); }); pass(SMD, cv, ci => SM_CS[ci], SM_COL, SM_DIM); }
    /* green cards and students have one year each (2024), so they appear when the timeline reaches it; H-1B runs 2009-2025 */
    if (SM_ON.gc && smYear >= 2024) { if (!SMG) SMG = smTracts(STS.gc24, 2024); pass(SMG, STS.gc24, ci => SM_CS[ci], SM_GCC, SM_GCD); }
    if (SM_ON.stu && smYear >= 2024) { if (!SMS) SMS = smPts(STS.stu, s => s[3], .8, 99); pass(SMS, STS.stu.map(s => s[3]), i => STS.stu[i][2], SM_SC, SM_SD); }
    if (SM_ON.h1b && smYear >= 2009) { if (!SMH) SMH = smPts(SM_H.z, (z, i) => SM_HMAX[i], 1.2, 77); pass(SMH, SM_HV.map(v => smSeries(v, SM_HY, smYear)), i => SM_H.z[i][2], SM_HC, SM_HD); }
    if (SM_ON.bp && smYear >= 2014) { if (!SMB) SMB = smMakeBP(); pass(SMB, SM_BP.map(b => smBPAt(b, smYear)), bi => SM_BP[bi].si, SM_BPC, SM_BPD); }
    smOx.putImageData(smID, 0, 0); x.imageSmoothingEnabled = false; x.drawImage(smOff, 0, 0, W, H); }
  /* the chosen state's county borders; leaving the map, the last chosen state's keep fading with the other lines while the map zooms out */
  const cty = sel ? smSel : smExit && !overlay ? smLastSel : -1, ctyA = (sel && !smExit ? 1 : smLineA)*.2;
  if (cty >= 0 && ctyA > .001) { x.lineWidth = .5; x.strokeStyle = `rgba(236,230,216,${ctyA})`; x.beginPath();
    for (const r of smCR(cty)) { let pen = false; for (const p of r) { const q = smPt(M, c, p); if (q[2] < 0) { pen = false; continue; } pen ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); pen = true; } }
    x.stroke(); }
  /* ICE detention, from 2019: a facility's first n dots, n = people held on an average day that year, packed in a tight disc (a sunflower spiral,
     one dot per person) on the facility's ZIP point, so the disc stays on the facility at any zoom */
  if (SM_ON.det && smYear >= 2019) { const F = window.DET.f, yf = Math.min(smYear, 2025) - DETY[0], i0 = Math.floor(clamp(yf, 0, DETY.length - 1)), i1 = Math.min(DETY.length - 1, i0 + 1), u = clamp(yf - i0), rd = Array.from({length: 16}, () => new Path2D());
    const fp = F.map(f => smPt(M, c, v3(f[0], f[1]))), ds = .8*Math.min(1, c.R/usCam().R); SM_FAC = [];   /* discs shrink when the view is wider than the US map's (the zoom-out to the globe) */
    F.forEach((f, k) => { const a = f[2], n = Math.round(a[i0] + (a[i1] - a[i0])*u); if (n > 0 && STS.detState[k] >= 0 && fp[k][2] > 0) SM_FAC.push({k, x: fp[k][0], y: fp[k][1], r: ds*Math.sqrt(n) + 3, n}); });
    for (const d of DETP) { if (STS.detState[d.f] < 0) continue; const mine = sel && STS.detState[d.f] === smSel, a = F[d.f][2];
      if (d.j >= a[i0] + (a[i1] - a[i0])*u) continue; const p = fp[d.f]; if (p[2] < 0) continue; const an = d.j*2.39996, rr = ds*Math.sqrt(d.j + .5), q = [p[0] + rr*Math.cos(an), p[1] + rr*Math.sin(an), 1];
      if (off(q)) continue; rd[d.k + (sel && !mine ? 8 : 0)].rect(q[0] - r0, q[1] - r0, 2*r0, 2*r0); }
    for (let k = 0; k < 16; k++) { x.globalAlpha = k < 8 ? .95 : .18; x.fillStyle = REDS[k % 8]; x.fill(rd[k]); } x.globalAlpha = 1; }
  /* glow: the chosen state, and the one under the mouse */
  for (const [si, a] of (smExit && !overlay ? [[smSel >= 0 ? smSel : smLastSel, smLineA]] : [[smSel, 1], [smHov !== smSel ? smHov : -1, .8]])) { if (si < 0 || a < .005) continue;   /* the glow fades with the lines when leaving */ ring(si); x.save(); x.shadowColor = `rgba(220,240,255,${a})`; x.shadowBlur = 14; x.strokeStyle = `rgba(255,255,255,${.85*a})`; x.lineWidth = 1.4; x.stroke(); x.stroke(); x.restore(); }
  if (sel && !overlay) smPanel(); }
smc.addEventListener("pointermove", e => { if (!smCam) return; const ll = smUn(smCam, e.offsetX, e.offsetY); smHov = ll ? smHit(ll[0], ll[1]) : -1; smc.classList.toggle("on", smHov >= 0);
  /* an ICE facility under the mouse: its name, as ICE publishes it, and the people held there on an average day in the year shown */
  let fac = null, best = 1e9; if (SM_ON.det && smYear >= 2019) for (const f of SM_FAC) { const d = Math.hypot(e.offsetX - f.x, e.offsetY - f.y); if (d < f.r && d < best) { best = d; fac = f; } }
  const tip = (html) => { smt.innerHTML = html; smt.style.left = (e.offsetX + 14) + "px"; smt.style.top = (e.offsetY - 8) + "px"; smt.style.opacity = 1; };
  let sec = null; if (!fac && SM_ON.bp && smYear >= 2014) { const M = rot(smCam), sg = Math.max(14, .3*D2R*smCam.R*2.2); let bd = 1e9;   /* a border city under the mouse */
    for (const b of SM_BP) { const q = smPt(M, smCam, v3(b.lon, b.lat)), d = Math.hypot(e.offsetX - q[0], e.offsetY - q[1]); if (q[2] > 0 && d < sg && d < bd) { bd = d; sec = b; } } }
  if (fac) tip(`${STS.detNames[fac.k] || "ICE facility (name not published for this point)"}<br>${fac.n.toLocaleString("en-US")} held on an average day, ${Math.min(Math.floor(smYear + 1e-6), 2025)}`);
  else if (sec) tip(`${sec.n.toUpperCase()} · Border Patrol sector and port of entry<br>~${(Math.round(smBPAt(sec, Math.floor(smYear + 1e-6))/100)*100).toLocaleString("en-US")} BPS removals, ${Math.min(Math.floor(smYear + 1e-6), 2024)} (estimated)`);
  else if (smHov >= 0 && smHov !== smSel) tip(STS.states[smHov].n); else smt.style.opacity = 0; });
smc.addEventListener("pointerleave", () => { smHov = -1; smt.style.opacity = 0; });
/* in a state: drag to pan, the wheel to zoom (out past the state's own framing returns to the full map), a click off the state returns too */
let smDragAt = null, smDragged = false;
smc.addEventListener("pointerdown", e => { if (smSel < 0 || smU < 1) return; smDragAt = [e.offsetX, e.offsetY]; smDragged = false; smc.setPointerCapture(e.pointerId); });
smc.addEventListener("pointermove", e => { if (!smDragAt || !(e.buttons & 1)) return; const dx = e.offsetX - smDragAt[0], dy = e.offsetY - smDragAt[1];
  if (!smDragged && Math.hypot(dx, dy) < 4) return; smDragged = true; smDragAt = [e.offsetX, e.offsetY]; smt.style.opacity = 0;
  smCam = {...smCam, lon: smCam.lon - dx/smCam.R/D2R/Math.max(.2, Math.cos(smCam.lat*D2R)), lat: clamp(smCam.lat + dy/smCam.R/D2R, -80, 80)}; });
smc.addEventListener("pointerup", () => { smDragAt = null; });
smc.addEventListener("wheel", e => { if (smSel < 0 || smU < 1) return; e.preventDefault(); const base = smCamFor(smSel).R, k = Math.exp(-e.deltaY*.0015), R = smCam.R*k;
  if (R < base*.8) { smBack(); return; }   /* scrolled out past the state */
  const nR = Math.min(R, base*8), f = nR/smCam.R; smCam = {...smCam, R: nR, cx: e.offsetX + (smCam.cx - e.offsetX)*f, cy: e.offsetY + (smCam.cy - e.offsetY)*f}; }, {passive: false});
smc.addEventListener("click", e => { e.stopPropagation(); smt.style.opacity = 0; if (smDragged) { smDragged = false; return; }
  if (smSel >= 0) { if (smHov !== smSel) smBack(); } else if (smHov >= 0) smSelect(smHov); });
addEventListener("keydown", e => { if (e.key === "Escape" && STARTED && SLIDES[CUR].states) smBack(); });

// ---- slides: each plays its part of the film once, then holds its last frame until you advance
function slideList() { const HS = (M.cens - M.visas)/3, P1 = M.visas + HS, P2 = M.visas + 2*HS, sv = 180/HS, sr = 360/(M.hold6_end - 2.8 - M.rem - 1);
  const S = [1, 2, 3, 4, 5, 6].map(n => ({img: "d" + n}));   /* the opening slides from the deck PDF */
  const L = [[M.globe, M.visas], [M.visas, P1, sv], [P1, P2 - .8, sv], [P2 - .8, M.cens - 1, sv], [M.cens - 1, M.y2020 + 2.5], [M.p2021, M.p2021 + 6],   /* line slides: to "Pandemic" and hold; then straight up to the peak and "Rebound" and hold */
    [M.decline, M.decline + 2.6], [M.fan - .2, M.fan + 3.4], [M.ice, M.gl6],   /* the rebound runs straight on to 2025 and holds; then 2025 opens into the projections and holds */ [M.gl6, M.rem], [M.rem, M.hold6_end - 2.8, sr], [M.s7, M.img5], [M.img5, M.img6], [M.img6, M.fw0], [M.fw0, M.fw1 + 1], [M.end, M.total]]
    .map(([a, b, spin]) => ({a, b, spin: spin || 0}));
  /* the interactive state map (tools/build_states.py), right after the last line slide; leaving it, the map zooms out and the ICE removals globe
     follows straight on (moved up from after the detention map; fromMap hides the detention layer it would otherwise open with) */
  L.splice(8, 0, {states: 1});
  const rem = L.splice(11, 1)[0]; rem.fromMap = 1; L.splice(9, 0, rem, {pair: 1, rot: rem.spin});   /* then the split into two globes: visas and removals */
  L.splice(11, 2);   /* the ICE photograph ("Reaction") and the ICE detention map after it are left out */
  L.splice(14, 1);   /* and the fade to white after "Escalating crisis": it cuts straight to the sources */
  L.splice(12, 1);   /* "Response" (Abbott) is left out: "Crisis" cuts to "Escalating crisis" */
  L.splice(L.length - 1, 0, {audit: 1});   /* the Algorithmic Forensics Appendix, a page of its own, before the sources */
  return S.concat(L); }
const SLIDES = slideList(); SLIDES.splice(10, 0, {embed: "world"}); SLIDES[11].a = M.plot - .8; SLIDES[6].rate = 5; let CUR = 0, END = 0;
function holdSpin(i) { return SLIDES[i].spin || 0; }   // degrees per second while a globe slide is held
function seek(t) { T = clamp(t, 0, M.total); }
function setPlaying(p) { PLAYING = p; }
function go(i, atEnd) { const from = SLIDES[CUR], XFADE = STARTED && xfWanted(from, SLIDES[clamp(i, 0, SLIDES.length - 1)]); if (XFADE) xfSnap(); if (artMode === "card") artClose(); CUR = clamp(i, 0, SLIDES.length - 1); const S = SLIDES[CUR], deck = $("deck"); RATE = S.rate || 1;
  /* a globe held and spinning carries its extra turn into the next slide when that slide continues the same stretch of the film, so it does not jump */
  if (atEnd || !from || from.a == null || S.a == null || Math.abs(from.b - S.a) > .05) SPINX = 0;
  window.NO_DET = !!S.fromMap; const stl = $("states");
  /* the map's layer: itself on the map slide; on the removals globe that follows, the same map as an overlay that zooms out with the film's camera
     (no fade, no second map); leaving the overlay it fades over the split into two globes */
  if (S.states) { stl.hidden = false; stl.style.opacity = 1; smHandA = 0; smOverlay = false; stl.classList.remove("ov"); }
  else if (S.fromMap) { stl.hidden = false; stl.style.opacity = 1; smHandA = 0; smHand = 0; smOverlay = true; stl.classList.add("ov"); for (const k of SM_OFF) smSetLayer(k, false); for (const k of SM_KEEP) smSetLayer(k, true); smSel = -1; smHov = -1; smExit = 0; smPlay = false; smYear = 2025; smp.style.opacity = 0; smt.style.opacity = 0; }
  else if (smOverlay || smHand) { smHand = 0; smOverlay = false; smHandA = 1; }
  else stl.hidden = true;
  PAIR = S.pair ? {u: atEnd ? PAIR_T : 0, lon0: CAM.lon, spin: S.rot} : null; auditShow(!!S.audit, XFADE); artSlide(S.embed || null);
  if (S.audit) { deck.hidden = true; PLAYING = false; T = M.end; END = T; }
  else if (S.pair) { deck.hidden = true; PLAYING = false; T = M.hold6_end - 2.82; END = T; }
  else if (S.states) { deck.hidden = true; PLAYING = false; T = M.globe; END = T; smReset(); }
  else if (S.embed) { deck.hidden = true; PLAYING = false; END = T; }
  else if (S.img) { deck.style.backgroundImage = `url(${IMGS[S.img]})`; deck.hidden = false; PLAYING = false; T = M.globe; END = T; }
  else { deck.hidden = true; END = S.b - .02; T = atEnd ? END : S.a; PLAYING = !atEnd; } $("count").textContent = `${CUR + 1} / ${SLIDES.length}`; if (XFADE) xfA = 1; if (S.img) deckT0 = performance.now(); }

// ---- transitions added for the review: a crossfade on every cut, a slow push-in on the photographs, the appendix fading in and out
const XF = document.createElement("canvas"); XF.id = "xfade"; XF.setAttribute("aria-hidden", "true"); XF.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:37;pointer-events:none;opacity:0"; document.body.appendChild(XF);
let xfA = 0, deckT0 = 0, deckK = 1; const XF_T = .8, DECK_STILL = {d1: 1}, XIMG = {};
/* no crossfade where the film simply runs on (one slide ends where the next begins, either way), on the map's own hand-offs,
   or out of the appendix and the artifact (they fade themselves) */
function xfWanted(a, b) { if (!a || !b || a === b || a.audit || a.embed) return false; if (a.xf || b.xf) return true;
  if (a.a != null && b.a != null && (Math.abs(a.b - b.a) < .05 || Math.abs(b.b - a.a) < .05)) return false;
  if ((a.states && b.fromMap) || (a.fromMap && b.states) || (a.fromMap && b.pair) || (a.pair && b.fromMap)) return false; return true; }
const xImg = src => { if (!XIMG[src]) { const im = new Image(); im.src = src; XIMG[src] = im; } return XIMG[src]; };
const xOp = el => el.hidden ? 0 : el.style.opacity === "" ? 1 : +el.style.opacity;
const xUrl = el => { const m = /url\(["']?(.*?)["']?\)\s*$/.exec(el.style.backgroundImage || ""); return m ? m[1] : null; };
const xScale = el => { const m = /scale\(([\d.]+)\)/.exec(el.style.transform || ""); return m ? +m[1] : 1; };
function xContain(x, im, w, h, k) { if (!im || !im.naturalWidth) return; const s = Math.min(w/im.naturalWidth, h/im.naturalHeight)*k, dw = im.naturalWidth*s, dh = im.naturalHeight*s; x.drawImage(im, (w - dw)/2, (h - dh)/2, dw, dh); }
/* the frame on screen, layer by layer as the page stacks them: ground, photographs, the globe (screen), overlay, line, effects, washes, end card, deck image, map */
function xfSnap() { const w = glc.width, h = glc.height; if (XF.width !== w || XF.height !== h) { XF.width = w; XF.height = h; } const x = XF.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.fillStyle = "#05080d"; x.fillRect(0, 0, w, h);
  for (const k in PH) { const e = PH[k], a = xOp(e); if (a < .01) continue; x.globalAlpha = a; x.fillStyle = "#000"; x.fillRect(0, 0, w, h); xContain(x, xImg(xUrl(e)), w, h, xScale(e)); }
  const ga = xOp(glc); if (ga > .005) { x.globalAlpha = ga; x.globalCompositeOperation = "screen"; x.drawImage(glc, 0, 0, w, h); x.globalCompositeOperation = "source-over"; }
  for (const c of [ovc, lnc, fxc]) { const a = xOp(c); if (a > .005) { x.globalAlpha = a; x.drawImage(c, 0, 0, w, h); } }
  for (const [el, col] of [[$("wash_r"), "#000"], [$("wash_w"), "#fff"]]) { const a = xOp(el); if (a > .005) { x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, w, h); } }
  { const a = xOp(finc); if (a > .005) { x.globalAlpha = a; x.drawImage(finc, 0, 0, w, h); } }
  const dk = $("deck"); if (!dk.hidden) { x.globalAlpha = 1; x.fillStyle = "#000"; x.fillRect(0, 0, w, h); xContain(x, xImg(xUrl(dk)), w, h, deckK); }
  const st = $("states"); if (!st.hidden && !st.classList.contains("ov")) { x.globalAlpha = xOp(st); x.fillStyle = "#05080d"; x.fillRect(0, 0, w, h); x.drawImage($("smc"), 0, 0, w, h); }
  x.globalAlpha = 1; }
function auditShow(on, instant) { const a = $("audit"); clearTimeout(a._t);
  if (on) { a.hidden = false; a.style.transition = "none"; a.style.opacity = instant ? 1 : 0; if (!instant) requestAnimationFrame(() => requestAnimationFrame(() => { a.style.transition = "opacity .6s"; a.style.opacity = 1; })); }
  else if (!a.hidden) { a.style.transition = "opacity .6s"; a.style.opacity = 0; a._t = setTimeout(() => { a.hidden = true; }, 620); } }
function xfTick(dt, now) { if (xfA > 0) { xfA = Math.max(0, xfA - dt/XF_T); XF.style.opacity = (xfA*xfA*(3 - 2*xfA)).toFixed(3); }
  const dk = $("deck"), S = SLIDES[CUR]; if (STARTED && !dk.hidden && S && S.img && !DECK_STILL[S.img]) { const u = Math.min(1, (now - deckT0)/16000); deckK = 1 + .04*(1 - (1 - u)*(1 - u)); dk.style.transform = `scale(${deckK.toFixed(4)})`; }
  else if (deckK !== 1) { deckK = 1; dk.style.transform = ""; } }

// ---- the live artifact, html/world.html, in one iframe: two slides you can use, and the event cards on the line
const ARTF = document.createElement("iframe"); ARTF.name = "pres-embed"; ARTF.title = "Interactive artifact"; ARTF.setAttribute("allowtransparency", "true");
ARTF.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:36;opacity:0;display:none;background:transparent;color-scheme:normal";
ARTF.src = "html/world.html"; document.body.appendChild(ARTF);
let artMode = null, artReady = false, artQ = [];
const artCmd = d => { if (artReady) ARTF.contentWindow.postMessage(d, "*"); else artQ.push(d); };
function artFade(on, ms) { clearTimeout(ARTF._t); if (on) { ARTF.style.display = "block"; ARTF.style.transition = "none"; ARTF.style.opacity = ms ? 0 : 1; if (ms) requestAnimationFrame(() => requestAnimationFrame(() => { ARTF.style.transition = `opacity ${ms}ms`; ARTF.style.opacity = 1; })); }
  else if (ARTF.style.display !== "none") { ARTF.style.transition = `opacity ${ms || 0}ms`; ARTF.style.opacity = 0; ARTF._t = setTimeout(() => { ARTF.style.display = "none"; }, ms || 0); } }
/* a slide that is the artifact itself: shown under the crossfade (so at once), left with a fade */
function artSlide(view) { if (view && artMode === "view") { artCmd({cmd: "view", view, fly: 1}); return; } if (view) { artMode = "view"; artCmd({cmd: "view", view}); clearTimeout(ARTF._t); ARTF.style.display = "block"; ARTF.style.transition = "none"; ARTF.style.opacity = 0; ARTF._t = setTimeout(() => { if (artMode === "view") ARTF.style.opacity = 1; }, 160); } else if (artMode === "view") { artMode = null; artFade(false, 500); ARTF.blur(); focus(); } }
/* an event card over the line: the artifact's own card, on a transparent page that dims what is behind it */
function artCard(ev) { artMode = "card"; artCmd({cmd: "card", ev}); artFade(true, 300); setTimeout(() => ARTF.focus(), 60); }
function artClose() { if (artMode !== "card") return; artMode = null; artCmd({cmd: "close"}); artFade(false, 300); ARTF.blur(); focus(); }
addEventListener("message", e => { const d = e.data || {}; if (e.source !== ARTF.contentWindow) return;
  if (d.artReady) { artReady = true; if (!artQ.length) artQ.push({cmd: "view", view: "world"}); for (const q of artQ.splice(0)) ARTF.contentWindow.postMessage(q, "*"); }
  if (d.artClosed && artMode === "card") { artMode = null; artFade(false, 300); ARTF.blur(); focus(); }
  if (d.presKey) presKey(d.presKey);
  if (d.presY != null) { hideAt = performance.now() + 2500; $("nav").classList.toggle("show", STARTED && d.presY > 1 - 150/innerHeight); } });
function presKey(k) { if (k === " " || k === "Enter" || k === "ArrowRight" || k === "PageDown") next(); else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") prev();
  else if (k === "f" || k === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } hideAt = performance.now() + 2500; }
/* Pandemic and Rebound on the line open their cards: where the line draws them (INFL_POS, this frame), once they glow */
const INFL_POS = {}, CARD_EV = {pandemic: "2020-03", rebound: "rebound", decline: "decline"};
function lineSpot(x, y) { const S = SLIDES[CUR]; if (!STARTED || artMode || !S || S.a == null) return null;
  for (const id in CARD_EV) { const p = INFL_POS[id]; if (p && p[2] > .15 && performance.now() - p[3] < 250 && Math.hypot(x - p[0], y - p[1]) < 30) return id; } return null; }
addEventListener("click", e => { if (e.target.closest && e.target.closest("button")) return; const id = lineSpot(e.clientX, e.clientY); if (id) { e.stopPropagation(); artCard(CARD_EV[id]); } }, true);
addEventListener("pointermove", e => { document.body.style.cursor = lineSpot(e.clientX, e.clientY) ? "pointer" : ""; });
function start(from) { STARTED = true; $("start").hidden = true; go(0); }
function next() { if (!STARTED) return start(); if (artMode === "card") return artClose();
  if (SLIDES[CUR].states) { if (!smExit) { smExit = 1; smOffT = .4; } else smLeave(); return; }   /* the map first zooms out and runs to 2025 (smTick); a second press skips that */
  if (CUR < SLIDES.length - 1) go(CUR + 1); }
function smLeave() { smExit = 0; smHand = 1; for (const k of SM_OFF) smSetLayer(k, false); for (const k of SM_KEEP) smSetLayer(k, true); if (CUR < SLIDES.length - 1) go(CUR + 1); }
function prev() { if (artMode === "card") return artClose(); if (STARTED && CUR > 0) go(CUR - 1, true); }
$("go").onclick = () => start(); $("navnext").onclick = e => { e.stopPropagation(); next(); }; $("navprev").onclick = e => { e.stopPropagation(); prev(); };
addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next(); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") { e.preventDefault(); prev(); }
  else if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
  hideAt = performance.now() + 2500; });
addEventListener("pointermove", e => { hideAt = performance.now() + 2500; $("nav").classList.toggle("show", STARTED && e.clientY > innerHeight - 150); });
document.addEventListener("pointerleave", () => $("nav").classList.remove("show"));
function resize2() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; for (const c of [glc, lnc, fxc, ovc, finc]) { c.width = Math.round(W*DPR); c.height = Math.round(H*DPR); } gl.viewport(0, 0, glc.width, glc.height); LC = LCX; layout(); }
addEventListener("resize", resize2); resize2(); gl.enable(gl.BLEND);
function frame(now) { const dt = last ? Math.min(.1, (now - last)/1000) : 0; last = now; if (PLAYING) { T += dt*RATE; if (T >= END) { T = END; PLAYING = false; } } else if (STARTED) SPINX += dt*holdSpin(CUR);
  if (STARTED && SLIDES[CUR].states) smTick(dt);
  if (STARTED && PAIR) PAIR.u += dt;
  if (smHandA > 0) { const stl = $("states"); smHandA = Math.max(0, smHandA - dt/.9); stl.style.opacity = smHandA; if (!smHandA) { stl.hidden = true; stl.style.opacity = 1; stl.classList.remove("ov"); } }
  xfTick(dt, now);
  if (!window.__FREEZE) render(T, now);
  if (STARTED && smOverlay) smTick(0, true);   /* after render, so CAM is this frame's camera */
  document.body.classList.toggle("idle", STARTED && performance.now() > hideAt); requestAnimationFrame(frame); }
const Q = new URLSearchParams(location.search);
window.PRES = {M, SENT, BEATS, INFO, seek, start, render, stateAt, go, next, prev, SLIDES, get T() { return T; }, setPlaying};
document.fonts.ready.then(() => { requestAnimationFrame(frame); if (Q.has("slide")) { start(); go(+Q.get("slide") - 1, Q.has("end")); } });

// =================================================================== export: record clips on this computer, in real time (1:1), at 1920x1080
const XW = 1920, XH = 1080, XFONT = "'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif";
function exportSize(on) { if (on) { DPR = 1; W = XW; H = XH; for (const c of [glc, lnc, fxc, ovc, finc]) { c.width = XW; c.height = XH; } gl.viewport(0, 0, XW, XH); LC = LCX; layout(); } else resize2(); }
function xText(x, s, X, Y, font, color, spacing = 0, align = "left") { x.font = font; x.fillStyle = color; x.letterSpacing = spacing + "px"; x.textAlign = align; x.textBaseline = "alphabetic"; x.fillText(s, X, Y); x.letterSpacing = "0px"; }
function xWrap(x, s, maxW) { const out = []; let line = ""; for (const w of s.split(" ")) { const tr = line ? line + " " + w : w; if (x.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; } if (line) out.push(line); return out; }
function xHeader(x, X, Y0, h, a) { if (a < .01) return; x.globalAlpha = a; const top = Y0 + XH*.06; xText(x, h.label.toUpperCase(), X, top + 14, `400 16px ${XFONT}`, h.color, 16*.14);
  xText(x, h.num, X, top + 14 + 12 + 58, `300 64px ${XFONT}`, "#ece6d8"); if (h.sub) xText(x, h.sub, X, top + 14 + 12 + 70 + 6 + 14, `400 14px ${XFONT}`, "#a7b0bf"); x.globalAlpha = 1; }
function composite(x, o) { x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.fillStyle = "#05080d"; x.fillRect(0, 0, XW, XH);
  const ga = +glc.style.opacity || 0; if (ga > .005) { x.globalAlpha = ga; x.globalCompositeOperation = "screen"; x.drawImage(glc, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; }
  for (const c of [ovc, lnc, fxc, finc]) x.drawImage(c, 0, 0);
  if (o.wR > .005) { x.globalAlpha = o.wR; x.fillStyle = "#000"; x.fillRect(0, 0, XW, XH); x.globalAlpha = 1; }
  if (o.corner) xHeader(x, XW*.024, 0, o.corner, 1);
  if (o.pan) { const p = o.pan, fade = 1 - p.out, a0 = ease(clamp((p.k - .55)/.45))*(1 - p.x)*fade, a1 = p.x*fade;
    PANELS.forEach((S, si) => S.forEach((q, i) => xHeader(x, XW*(i/3) + XW*.024, 0, {label: q.name, num: big(q.gc ? D.lpr[VI] : NIV(q.t)), color: q.gc ? "#3ddc84" : ARC_COL[q.t]}, si ? a1 : a0))); }
  if (o.note) { x.font = `400 50px ${XFONT}`; const L = xWrap(x, o.note, Math.min(900, XW - 40)), lh = 57.5, y0 = o.noteMid ? XH/2 - (L.length*lh)/2 + 42 : XH*.17 + 46;
    L.forEach((l, i) => xText(x, l, XW/2, y0 + i*lh, `400 50px ${XFONT}`, "#ffffff", 0, "center")); }
  if (o.cap && o.cap.length) o.cap.forEach((h, i) => xText(x, h.replace(/<[^>]+>/g, ""), XW/2, XH - 172 - (o.cap.length - 1 - i)*23, `400 14px ${XFONT}`, "#a7b0bf", 0, "center")); }
function clipList() { const HS = (M.cens - M.visas)/3, P1 = M.visas + HS;
  return [["1_us_immigration_map", M.globe, M.visas], ["2_map_to_globe", M.visas, P1], ["3_three_globes", P1, M.cens - 1], ["4_line_to_pandemic", M.cens, M.y2020 + 2],
          ["5_pandemic_to_rebound", M.y2020 + 2, M.src_brookings], ["6_rebound_to_2025", M.src_brookings, M.decline + 2], ["7_2025_to_projection", M.decline + 2, M.fan + 3.2]]; }
function recordClip(name, t0, t1, status) { return new Promise(res => {
  const cv = document.createElement("canvas"); cv.width = XW; cv.height = XH; const x = cv.getContext("2d");
  const types = ["video/mp4;codecs=avc1.640028", "video/mp4", "video/webm;codecs=vp9", "video/webm"], mime = types.find(m => MediaRecorder.isTypeSupported(m)), ext = mime.startsWith("video/mp4") ? ".mp4" : ".webm";
  const stream = cv.captureStream(30), track = {requestFrame() {}}, rec = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 20e6}), chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(chunks, {type: mime})); a.download = name + ext; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); res(); }, 1500); };
  render(t0, performance.now()); composite(x, window.LASTO); rec.start(); const start = performance.now();
  const step = now => { const t = t0 + (now - start)/1000; if (t >= t1) { render(t1, now); composite(x, window.LASTO); track.requestFrame(); setTimeout(() => rec.stop(), 100); return; }
    render(t, now); composite(x, window.LASTO); track.requestFrame(); status.textContent = `Recording ${name} · ${(t - t0).toFixed(1)} / ${(t1 - t0).toFixed(1)} s`; requestAnimationFrame(step); };
  requestAnimationFrame(step); }); }
async function exportClips() { const st = $("xstat"); st.hidden = false; $("start").hidden = true; STARTED = true; setPlaying(false); window.__FREEZE = true; notesOn = false; notesEl.hidden = true;
  exportSize(true); const list = window.PRES.clipList();
  for (let i = 0; i < list.length; i++) { const [n, a, b] = list[i]; st.textContent = `Clip ${i + 1} of ${list.length}: ${n}`; await recordClip(n, a, b, st); }
  exportSize(false); window.__FREEZE = false; st.textContent = `Done: ${list.length} clips saved to your Downloads folder.`; setTimeout(() => st.hidden = true, 6000); }
window.PRES.exportClips = exportClips; window.PRES.clipList = clipList;
