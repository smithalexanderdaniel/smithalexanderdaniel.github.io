"use strict";
const D = window.D, $ = id => document.getElementById(id), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a)*t;
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2, D2R = Math.PI/180, PI = Math.PI;
let sd = 7; const rnd = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0)/4294967296, gauss = () => Math.sqrt(-2*Math.log(rnd() + 1e-9))*Math.cos(6.2832*rnd());
const fmt = n => { const a = Math.abs(n), s = n < 0 ? "−" : ""; return s + (a >= 1e6 ? (a/1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M" : a >= 1e3 ? Math.round(a/1e3) + "k" : String(a)); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)/255);
const readSec = s => Math.max(4, s.replace(/<[^>]+>/g, "").split(/\s+/).length/3.1 + 1.6);
// ---- palette: Boston at night
const BLUES = ["#3d8fb3", "#5aa6cf", "#7fc0dc", "#2f7fa6", "#9dd3ee", "#4fb3c9"];
const TFAM = [["#3d8fb3", "#3fb8b0", "#5ac8e0", "#7fb2f0", "#8f9cf0", "#6f7fd8", "#4f8fc8", "#b4d8f0"], ["#f2e640", "#f2c43a", "#f7ee9a"], ["#ffb347", "#ff9f2e", "#ffc878"], ["#ff45c5", "#ff6fa8", "#d76aff"], ["#9b8cff", "#b4a6ff", "#7f72e0"], ["#c8c8d0", "#a9a9b5", "#e0e0e6"]];
const TKEY = ["#3d8fb3", "#f2e640", "#8fd45e", "#ff45c5", "#3fc9b0", "#9b8cff"], TNAME = ["Visitors", "Students", "Exchange", "H-1B", "Other work", "Other"], RED = "#ff5a40", REDS = ["#ff2d2d","#ff4a36","#e8243c","#ff6a4d","#d4163c","#ff3b3b","#ff5a40","#c8102e"];
const YEARS = D.vyears, C = D.countries, NC = C.length;

// =================================================================== geography
// sphere: lon 0, lat 0 faces the viewer (z toward us); the camera turns the globe so (lon0, lat0) faces us
const v3 = (lon, lat) => { const l = lon*D2R, f = lat*D2R, c = Math.cos(f); return [c*Math.sin(l), Math.sin(f), c*Math.cos(l)]; };
let CAM = {lon: -40, lat: 20, R: 300, cx: 0, cy: 0};
// R = Rx(lat0) * Ry(-lon0) written out: x' = x cos(lon0) - z sin(lon0); z' = x sin(lon0) + z cos(lon0); y'' = y cos(lat0) - z' sin(lat0); z'' = y sin(lat0) + z' cos(lat0)
function rot(c) { const L = c.lon*D2R, B = c.lat*D2R, cl = Math.cos(L), sl = Math.sin(L), cb = Math.cos(B), sb = Math.sin(B);
  return [cl, 0, -sl,   -sl*sb, cb, -cl*sb,   sl*cb, sb, cl*cb]; }   // rows: x'', y'', z''
let ROT = rot(CAM);
const proj = (p, h = 0) => { const k = 1 + h, x = (ROT[0]*p[0] + ROT[1]*p[1] + ROT[2]*p[2])*k, y = (ROT[3]*p[0] + ROT[4]*p[1] + ROT[5]*p[2])*k, z = (ROT[6]*p[0] + ROT[7]*p[1] + ROT[8]*p[2])*k; return [CAM.cx + x*CAM.R, CAM.cy - y*CAM.R, z]; };
function unproj(sx, sy) { const x = (sx - CAM.cx)/CAM.R, y = (CAM.cy - sy)/CAM.R, r2 = x*x + y*y; if (r2 > 1) return null; const z = Math.sqrt(1 - r2);
  const px = ROT[0]*x + ROT[3]*y + ROT[6]*z, py = ROT[1]*x + ROT[4]*y + ROT[7]*z, pz = ROT[2]*x + ROT[5]*y + ROT[8]*z; return [Math.atan2(px, pz)/D2R, Math.asin(clamp(py, -1, 1))/D2R]; }
// country raster (quarter degree), for placing dots inside countries and for hover
const MW = 1440, MH = 720, MASK = new Int16Array(MW*MH).fill(-1), SH = D.shapes;
{ const off = document.createElement("canvas"); off.width = MW; off.height = MH; const q = off.getContext("2d");
  SH.forEach(([n, rings], i) => { q.fillStyle = `rgb(${(i + 1) & 255},${(i + 1) >> 8},0)`; for (const r of rings) { const lons = r.map(p => p[0]), wrap = Math.max(...lons) - Math.min(...lons) > 180;
    for (const sh of wrap ? [0, 360] : [0]) { q.beginPath(); r.forEach((p, k) => { const lo = wrap && p[0] < 0 ? p[0] + 360 : p[0], x = (lo - sh + 180)/360*MW, y = (90 - p[1])/180*MH; k ? q.lineTo(x, y) : q.moveTo(x, y); }); q.closePath(); q.fill(); } } });
  const BB = SH.map(([, rings]) => { let a = 1e9, b = -1e9, c = 1e9, e = -1e9; for (const r of rings) for (const [lo, la] of r) { a = Math.min(a, lo); b = Math.max(b, lo); c = Math.min(c, la); e = Math.max(e, la); } return [a - 1, b + 1, c - 1, e + 1, b - a > 180]; });
  const d = q.getImageData(0, 0, MW, MH).data, idAt = k => d[k*4 + 3] === 255 ? d[k*4] + d[k*4 + 1]*256 - 1 : -1;
  for (let k = 0; k < MW*MH; k++) { const id = idAt(k); if (id < 0 || id >= SH.length) continue; const bb = BB[id], lo = ((k % MW) + .5)/MW*360 - 180, la = 90 - (Math.floor(k/MW) + .5)/MH*180;
    if (la < bb[2] || la > bb[3] || (!bb[4] && (lo < bb[0] || lo > bb[1]))) continue; if (idAt(k - 1) !== id && idAt(k + 1) !== id) continue; MASK[k] = id; } }
const AL = {"Dominican Republic": "Dominican Rep.", "Democratic Republic of Congo": "Dem. Rep. Congo", "Republic of the Congo": "Congo", "Bosnia and Herzegovina": "Bosnia and Herz.", "Central African Republic": "Central African Rep.", "South Sudan": "S. Sudan", "Eswatini": "eSwatini", "Equatorial Guinea": "Eq. Guinea", "North Macedonia": "Macedonia", "Solomon Islands": "Solomon Is.", "United States": "United States of America"};
const SHN = SH.map(s => s[0]); C.forEach(c => c.sid = SHN.indexOf(AL[c.n] || c.n)); const BYSID = new Map(C.map((c, i) => [c.sid, i]));
const US = C.findIndex(c => c.n === "United States"), USSID = SHN.indexOf("United States of America");   // the US is not among the visa countries
const CELLS = SH.map(() => []); for (let k = 0; k < MASK.length; k++) if (MASK[k] >= 0) CELLS[MASK[k]].push(k);
const maskAt = (lon, lat) => { const x = Math.floor((lon + 180)/360*MW), y = Math.floor((90 - lat)/180*MH); return x >= 0 && x < MW && y >= 0 && y < MH ? MASK[y*MW + x] : -1; };
function cloudPt(c) { const L = c.sid >= 0 ? CELLS[c.sid] : null; if (!L || !L.length) return [c.lon + gauss()*.5, c.lat + gauss()*.5];
  const sg = Math.max(.6, .42*Math.sqrt(L.length)/4), cl = Math.max(.25, Math.cos(c.lat*D2R));
  for (let t = 0; t < 14; t++) { const f = rnd() < .3 ? 2.2 : 1, lo = c.lon + gauss()*sg*f/cl, la = c.lat + gauss()*sg*f; if (maskAt(lo, la) === c.sid) return [lo, la]; }
  const k = L[Math.floor(rnd()*L.length)]; return [((k % MW) + rnd())/MW*360 - 180, 90 - (Math.floor(k/MW) + rnd())/MH*180]; }
const angle = (a, b) => Math.acos(clamp(a[0]*b[0] + a[1]*b[1] + a[2]*b[2], -1, 1));
const ARC_HI = d => .07 + .42*Math.pow(d/PI, .85), ARC_LO = d => .018 + .09*Math.pow(d/PI, .7);
function slerp(a, b, u) { const w = angle(a, b); if (w < 1e-5) return a; const s = Math.sin(w), ka = Math.sin((1 - u)*w)/s, kb = Math.sin(u*w)/s; return [a[0]*ka + b[0]*kb, a[1]*ka + b[1]*kb, a[2]*ka + b[2]*kb]; }
const portsFor = y => D.ports[String(clamp(y, 2015, 2025))];
function pickPort(c, y) { const ps = portsFor(y), a = v3(c.lon, c.lat); let t = 0; const w = ps.map(p => { t += p[2]/Math.pow(.35 + angle(a, v3(p[0], p[1])), 3); return t; }); const r = rnd()*t; let i = 0; while (w[i] < r) i++; return ps[i]; }

// =================================================================== WebGL: dots and hairlines on the globe
const glc = $("gl"), gl = glc.getContext("webgl", {antialias: true, alpha: false, preserveDrawingBuffer: true});
const VS_DOT = `attribute vec3 aTo, aFrom, aCol; attribute float aCi, aT, aD;
uniform vec3 uR0, uR1, uR2; uniform vec2 uC, uRes; uniform float uRad, uDPR, uTr, uSize, uLitOn; uniform sampler2D uLit;
varying vec3 vCol; varying float vLit, vVis;
void main(){ float u = clamp((uTr - aD)/.55, 0., 1.); u = u < .5 ? 4.*u*u*u : 1. - pow(-2.*u + 2., 3.)/2.;
  float w = acos(clamp(dot(aFrom, aTo), -1., 1.)); vec3 p = aTo; if (w > 1e-4 && u < .9999) { float s = sin(w); p = (aFrom*sin((1. - u)*w) + aTo*sin(u*w))/s; }
  float h = aT > 8.5 && aT < 9.5 ? .018 + .09*pow(w/3.14159, .7) : .07 + .42*pow(w/3.14159, .85); p = normalize(p)*(1. + h*sin(3.14159*u)*step(.0001, w));
  vec3 q = vec3(dot(uR0, p), dot(uR1, p), dot(uR2, p)); float lifted = length(p) - 1.; vVis = q.z > .0 || (lifted > .002 && length(q.xy) > 1.) ? 1. : 0.;
  vec2 sc = uC + vec2(q.x, -q.y)*uRad; gl_Position = vec4(sc.x/uRes.x*2. - 1., 1. - sc.y/uRes.y*2., 0., 1.); gl_PointSize = uSize*uDPR*vVis;
  float lc = texture2D(uLit, vec2((aCi + .5)/256., .25)).r, lt = texture2D(uLit, vec2((min(aT, 9.) + .5)/256., .75)).r; vLit = uLitOn > .5 ? lc*lt : 1.; vCol = aCol; }`;
const FS_DOT = `precision mediump float; uniform float uAlpha, uGlow, uDimA; varying vec3 vCol; varying float vLit, vVis;
void main(){ if (vVis < .5) discard; float a = uAlpha; vec3 c = vCol; if (vLit < .5) { c = vec3(.141, .251, .302); a = uGlow > .5 ? 0. : uDimA; }
  if (uGlow > .5) { float d = length(gl_PointCoord - .5); a *= 1. - smoothstep(.1, .5, d); } gl_FragColor = vec4(c, a); }`;
const VS_LN = `attribute vec3 aP, aCol; attribute float aS, aD;
uniform vec3 uR0, uR1, uR2; uniform vec2 uC, uRes; uniform float uRad, uTr; varying vec3 vCol; varying float vA;
void main(){ vec3 q = vec3(dot(uR0, aP), dot(uR1, aP), dot(uR2, aP)); float u = clamp((uTr - aD)/.55, 0., 1.); u = u < .5 ? 4.*u*u*u : 1. - pow(-2.*u + 2., 3.)/2.;
  float vis = (q.z > 0. || length(q.xy) > 1.) && aS <= u + .0001 ? 1. : 0.; vec2 sc = uC + vec2(q.x, -q.y)*uRad; gl_Position = vec4(sc.x/uRes.x*2. - 1., 1. - sc.y/uRes.y*2., 0., 1.); vCol = aCol; vA = vis*(.35 + .65*aS); }`;
const FS_LN = `precision mediump float; uniform float uAlpha; varying vec3 vCol; varying float vA; void main(){ if (vA < .01) discard; gl_FragColor = vec4(vCol, uAlpha*vA); }`;
const VS_BG = `attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }`;
const FS_BG = `precision mediump float; uniform vec2 uC, uRes; uniform float uRad, uDPR, uA; void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y*uDPR - gl_FragCoord.y)/uDPR; float d = length(p - uC)/uRad;
  vec3 bg = vec3(.0196, .0314, .051), disk = vec3(.027, .043, .067) + vec3(.03, .05, .08)*pow(clamp(d, 0., 1.), 6.); float limb = smoothstep(1.006, 1., d)*smoothstep(.985, 1., d)*.5;
  vec3 c = d < 1. ? mix(bg, disk, uA) : bg; c += vec3(.25, .35, .45)*limb*uA; gl_FragColor = vec4(c, 1.); }`;
function prog(vs, fs) { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); gl.attachShader(p, o); }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); U[u.name] = gl.getUniformLocation(p, u.name); }
  const A = {}, m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < m; i++) { const a = gl.getActiveAttrib(p, i); A[a.name] = gl.getAttribLocation(p, a.name); } return {p, U, A}; }
const PD = prog(VS_DOT, FS_DOT), PL = prog(VS_LN, FS_LN), PB = prog(VS_BG, FS_BG);
const QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const LIT = new Uint8Array(256*2*4).fill(255), LITT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, LITT); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
const pushLit = () => { gl.bindTexture(gl.TEXTURE_2D, LITT); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, LIT); }; pushLit();
// dot buffers: to(3) from(3) col(3) ci t d = 12 floats
function dotBuf(arr) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return {b, n: arr.length/12}; }
function lnBuf(arr) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return {b, n: arr.length/8}; }
const free = o => o && gl.deleteBuffer(o.b);
function pushDot(out, to, from, col, ci, t, d) { out.push(to[0], to[1], to[2], from[0], from[1], from[2], col[0], col[1], col[2], ci, t, d); }
// land speckle, once
const LAND = (() => { const a = []; sd = 3; const col = hex("#2b5466"); for (let k = 0; k < MASK.length; k += 2) { if (MASK[k] < 0 || rnd() > .55) continue; const y = Math.floor(k/MW); if (y > 610) continue;
  const p = v3(((k % MW) + rnd())/MW*360 - 180, 90 - (y + rnd())/MH*180); pushDot(a, p, p, col, 255, 7, 0); }
  return dotBuf(new Float32Array(a)); })();
// visas for a year: 1 dot = 50, each from its port of entry to a cloud in its country
const DUNIT = 50, VIS = {}, ARR = {};
function visasFor(yi) { if (VIS[yi]) return VIS[yi]; const a = []; sd = 100 + yi; const y = YEARS[yi];
  C.forEach((c, ci) => { if (ci === US) return; c.v[yi].forEach((v, t) => { let m = Math.floor(v/DUNIT) + (rnd() < (v/DUNIT) % 1 ? 1 : 0); if (!m) return; const fam = TFAM[t]; let port = null;
    while (m-- > 0) { if (!port || rnd() < .3) port = pickPort(c, y); const to = v3(...cloudPt(c)), from = v3(port[0] + gauss()*.3, port[1] + gauss()*.22); pushDot(a, to, from, hex(fam[Math.floor(rnd()*fam.length)]), ci, t, rnd()*.45); } }); });
  return VIS[yi] = dotBuf(new Float32Array(a)); }
// removals for a year (FY2022-2025): 1 dot = 50, from the US state of arrest to a cloud in the country sent to
const REMD = {}, REML = {};
function remCountry(n) { const i = C.findIndex(c => c.n === n); if (i >= 0) return [C[i], i]; const e = D.rem.ex[n]; return e ? [{n, lon: e[0], lat: e[1], sid: -1}, 254] : [null, -1]; }
function remsFor(yi) { const L = D.rem.years[YEARS[yi]]; if (!L) return null; if (REMD[yi]) return REMD[yi]; const a = []; sd = 500 + yi; const col = hex(RED);
  for (const [st, n, v] of L) { const [c, ci] = remCountry(n), o = D.rem.st[st]; if (!c || !o) continue; let m = Math.round(v); while (m-- > 0) pushDot(a, v3(...cloudPt(c)), v3(o[0] + gauss()*1.2, o[1] + gauss()*.9), hex(REDS[Math.floor(rnd()*REDS.length)]), ci, 9, rnd()*.5); }
  return REMD[yi] = dotBuf(new Float32Array(a)); }
// hairline bundles: arrivals climb high, removals stay low
function strand(out, a, b, h, col, d, N = 48) { for (let k = 0; k < N; k++) for (const j of [k, k + 1]) { const u = j/N, p = slerp(a, b, u), r = 1 + h*Math.sin(PI*u), m = Math.hypot(...p); out.push(p[0]/m*r, p[1]/m*r, p[2]/m*r, u, d, col[0], col[1], col[2]); } }
function arcsFor(yi) { if (ARR[yi]) return ARR[yi]; const a = [], y = YEARS[yi], tot = c => c.v[yi].reduce((s, v) => s + v, 0); sd = 900 + yi;
  const top = C.filter((c, i) => i !== US && tot(c) > 0).sort((p, q) => tot(q) - tot(p)).slice(0, 46), mx = tot(top[0]), col = [.84, .89, .97];
  for (const c of top) { const ps = portsFor(y), A0 = v3(c.lon, c.lat); let best = ps[0], bv = -1; for (const p of ps) { const v = p[2]/Math.pow(.35 + angle(A0, v3(p[0], p[1])), 3); if (v > bv) { bv = v; best = p; } }
    const n = Math.round(4 + 40*Math.sqrt(tot(c)/mx)); for (let k = 0; k < n; k++) { const from = v3(best[0] + gauss()*.5, best[1] + gauss()*.35), to = v3(c.lon + gauss()*1.4, c.lat + gauss()*1); strand(a, from, to, ARC_HI(angle(from, to))*(.82 + rnd()*.36), col, rnd()*.45); } }
  return ARR[yi] = lnBuf(new Float32Array(a)); }
function remArcsFor(yi) { const L = D.rem.years[YEARS[yi]]; if (!L) return null; if (REML[yi]) return REML[yi]; const a = [], by = new Map(); sd = 1300 + yi;
  for (const [st, n, v] of L) { const e = by.get(n) || {v: 0, st: {}}; e.v += v; e.st[st] = (e.st[st] || 0) + v; by.set(n, e); }
  const rows = [...by].sort((p, q) => q[1].v - p[1].v).slice(0, 22), mr = rows[0][1].v, col = hex(RED);
  for (const [n, e] of rows) { const col = hex(REDS[Math.floor(rnd()*REDS.length)]); const [c] = remCountry(n), o = D.rem.st[Object.entries(e.st).sort((p, q) => q[1] - p[1])[0][0]]; if (!c || !o) continue; const k0 = Math.round(3 + 28*Math.sqrt(e.v/mr));
    for (let k = 0; k < k0; k++) { const from = v3(o[0] + gauss()*.6, o[1] + gauss()*.4), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.8); strand(a, from, to, ARC_HI(angle(from, to))*.78*(.82 + rnd()*.36), col, rnd()*.5, 48); } }
  return REML[yi] = lnBuf(new Float32Array(a)); }
// where immigrants land: net international migration by county, 1 dot = 100 people
const CENS = {};
function censusFor(yi) { const ni = D.years.indexOf(String(YEARS[yi])); if (ni < 0) return null; if (CENS[yi]) return CENS[yi]; const a = []; sd = 1700 + yi;
  for (const [lon, lat, v] of D.counties) { let m = Math.floor(Math.max(0, v[ni])/100) + (rnd() < (Math.max(0, v[ni])/100) % 1 ? 1 : 0); while (m-- > 0) { const p = v3(lon + gauss()*.12, lat + gauss()*.09), col = hex(BLUES[Math.floor(rnd()*BLUES.length)]); pushDot(a, p, p, col, 254, 8, 0); } }
  return CENS[yi] = dotBuf(new Float32Array(a)); }
// draw
let W, H, DPR;
function bindDots(o) { gl.bindBuffer(gl.ARRAY_BUFFER, o.b); const A = PD.A, st = 48; const at = (n, sz, off) => { if (A[n] === undefined || A[n] < 0) return; gl.enableVertexAttribArray(A[n]); gl.vertexAttribPointer(A[n], sz, gl.FLOAT, false, st, off*4); };
  at("aTo", 3, 0); at("aFrom", 3, 3); at("aCol", 3, 6); at("aCi", 1, 9); at("aT", 1, 10); at("aD", 1, 11); }
function camU(P) { gl.uniform3f(P.U.uR0, ROT[0], ROT[1], ROT[2]); gl.uniform3f(P.U.uR1, ROT[3], ROT[4], ROT[5]); gl.uniform3f(P.U.uR2, ROT[6], ROT[7], ROT[8]); gl.uniform2f(P.U.uC, CAM.cx, CAM.cy); gl.uniform2f(P.U.uRes, W, H); gl.uniform1f(P.U.uRad, CAM.R); }
function drawDots(o, {tr = 2, size = 1.15, alpha = .82, glow = true, lit = 0, dimA = .4}) { if (!o || !o.n) return; gl.useProgram(PD.p); camU(PD); gl.uniform1f(PD.U.uDPR, DPR); gl.uniform1f(PD.U.uTr, tr); gl.uniform1f(PD.U.uLitOn, lit); gl.uniform1f(PD.U.uDimA, dimA);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, LITT); gl.uniform1i(PD.U.uLit, 0); bindDots(o);
  if (glow) { gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.uniform1f(PD.U.uGlow, 1); gl.uniform1f(PD.U.uSize, 7); gl.uniform1f(PD.U.uAlpha, alpha*.05); gl.drawArrays(gl.POINTS, 0, o.n); }
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(PD.U.uGlow, 0); gl.uniform1f(PD.U.uSize, size); gl.uniform1f(PD.U.uAlpha, alpha); gl.drawArrays(gl.POINTS, 0, o.n); }
function drawLines(o, {tr = 2, alpha = .2}) { if (!o || !o.n || alpha < .005) return; gl.useProgram(PL.p); camU(PL); gl.uniform1f(PL.U.uTr, tr); gl.uniform1f(PL.U.uAlpha, alpha); gl.bindBuffer(gl.ARRAY_BUFFER, o.b); const A = PL.A, st = 32;
  gl.enableVertexAttribArray(A.aP); gl.vertexAttribPointer(A.aP, 3, gl.FLOAT, false, st, 0); gl.enableVertexAttribArray(A.aS); gl.vertexAttribPointer(A.aS, 1, gl.FLOAT, false, st, 12); gl.enableVertexAttribArray(A.aD); gl.vertexAttribPointer(A.aD, 1, gl.FLOAT, false, st, 16); gl.enableVertexAttribArray(A.aCol); gl.vertexAttribPointer(A.aCol, 3, gl.FLOAT, false, st, 20);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.drawArrays(gl.LINES, 0, o.n); }
function drawBg(a) { gl.useProgram(PB.p); gl.uniform2f(PB.U.uC, CAM.cx, CAM.cy); gl.uniform2f(PB.U.uRes, W, H); gl.uniform1f(PB.U.uRad, CAM.R); gl.uniform1f(PB.U.uDPR, DPR); gl.uniform1f(PB.U.uA, a);
  gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(PB.A.aP); gl.vertexAttribPointer(PB.A.aP, 2, gl.FLOAT, false, 0, 0); gl.disable(gl.BLEND); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.enable(gl.BLEND); }

// =================================================================== the census line (2D), in a fixed frame
const lnc = $("ln"), g = lnc.getContext("2d"), fxc = $("fx"), fx = fxc.getContext("2d"), ovc = $("ov"), ov = ovc.getContext("2d");
const NV = window.NIMX, NY0 = 2001, PROJ = D.proj, NVF = NV.map((v, i) => v != null ? v : (NV[i - 1] + NV[i + 1])/2);
const nimAt = x => { const f = clamp(x - NY0, 0, NVF.length - 1.0001), i = Math.floor(f), u = f - i, s = u*u*(3 - 2*u); return NVF[i] + (NVF[Math.min(i + 1, NVF.length - 1)] - NVF[i])*s; };
let L = {}, LC = {x: 2015.2, span: 9}, YOFF = 0;
// the line's own camera: it follows the pen up close, pulls back to the whole line at 2026, then dives into 2024-25
function layout() { const nar = W < 760; L = {nar, yt: nar ? 110 : 130, yb: nar ? Math.round(H*.6) : H - 200, vlo: -1e6, vhi: 3e6, ax: nar ? 46 : 74};
  L.X = y => W/2 + (y - LC.x)/LC.span*W*(nar ? .86 : .8); L.Y0 = v => L.yb - (v - L.vlo)/(L.vhi - L.vlo)*(L.yb - L.yt); L.Y = v => L.Y0(v) + YOFF; L.ppy = () => L.X(NY0 + 1) - L.X(NY0); }
const FOLLOW = px => ({x: clamp(px - 2.2, 2015.2, 2022.4), span: 9}), WHOLE = () => ({x: 2018.7, span: L.nar ? 19.5 : 17.2}), DIVE = {x: 2024.5, span: 2.3};
const lcMix = (a, b, u) => ({x: lerp(a.x, b.x, u), span: Math.exp(lerp(Math.log(a.span), Math.log(b.span), u))});
const STR = Array.from({length: 120}, () => ({b: gauss()*.5, a: .3 + rnd()*.9, f: 1.2 + rnd()*3.2, ph: rnd()*6.28, f2: .4 + rnd()*.9, ph2: rnd()*6.28, al: .16 + rnd()*.3, c: BLUES[Math.floor(rnd()*BLUES.length)], e: (rnd() - .5)*2, w: .45 + rnd()*.45, dash: 3 + rnd()*3}));
const PEN = (() => { const tab = [NY0]; let x = NY0, t = 0; const dt = 1/60, sm = (a, b, v) => { const k = clamp((v - a)/(b - a)); return k*k*(3 - 2*k); };
  while (x < 2025) { const v = (1.25 - .75*Math.exp(-(((x - 2020.2)/.8)**2)) - .55*sm(2023.6, 2024.9, x))*(.3 + .7*sm(0, 1.2, t)); x = Math.min(2025, x + v*dt); t += dt; tab.push(x); } return tab; })();
const penX = t => { const f = clamp(t*60, 0, PEN.length - 1), i = Math.floor(f); return lerp(PEN[i], PEN[Math.min(PEN.length - 1, i + 1)], f - i); }, PEN_T = (PEN.length - 1)/60;
const SPOTS = []; let HOVE = null;
function drawLine(s, now) { g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H); const a = s.chart; if (a < .01 && s.strands < .01) return;
  // intro: strands drift in from the left edge and gather where the line begins
  if (s.strands > .01 && s.pen <= NY0 + .02) { const xm = L.X(NY0), ym = L.Y(NV[0]); for (const st of STR) { g.beginPath(); for (let k = 0; k <= 60; k++) { const u = k/60, X = lerp(-40, xm, u), j = u*u*(3 - 2*u)*s.strands, Y = lerp(H*.5 + st.e*H*.42 + 30*Math.sin(now/2400 + st.ph + u*3), ym + st.b*8, j); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.strokeStyle = st.c; g.globalAlpha = Math.min(1, st.al*1.6)*Math.min(1, s.strands*1.6); g.lineWidth = st.w; g.setLineDash([]); g.lineCap = "round"; g.stroke(); } g.setLineDash([]); g.globalAlpha = 1; }
  if (a < .01) return; g.save(); g.globalAlpha = a;
  g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.textAlign = "right"; g.fillStyle = "#66738a";
  for (let v = -1e6; v <= 3e6; v += 5e5) { const y = L.Y(v), major = v % 1e6 === 0; if (y < 60 || y > H - 40) continue; g.strokeStyle = v === 0 ? "rgba(236,230,216,.35)" : major ? "rgba(236,230,216,.08)" : "rgba(236,230,216,.035)"; g.lineWidth = v === 0 ? 1.2 : 1; g.beginPath(); g.moveTo(L.ax, y); g.lineTo(W - 16, y); g.stroke();
    if (major) g.fillText(v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v/1e6) + "M", L.ax - 8, y + 4);
    }
  g.textAlign = "left"; g.fillStyle = "#ece6d8"; g.font = `400 ${L.nar ? 19 : 26}px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif`; g.fillText("Net international migration to the United States, 2001–2026", L.nar ? 16 : L.ax, L.yt - 58);
  g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#a7b0bf"; 
  g.textAlign = "center"; const yb2 = L.Y0(L.vlo) + Math.max(0, YOFF*0); for (let y = 2000; y <= 2026; y++) { if (y % 2) continue; const X = L.X(y); if (X < L.ax || X > W - 10) continue; g.fillStyle = y >= 2020 ? "#ff5a40" : "#66738a"; g.fillRect(X, L.yb + 10, 1, 5); g.fillText(String(y), X, L.yb + 30); }
  const x1 = s.pen, step = LC.span/420, xs = Math.max(NY0, LC.x - LC.span*.7); g.lineCap = "round";
  if (s.op < .99 && x1 > NY0 + .01) { g.beginPath(); let pen = false; const gap = [], GA = 9999, GB = 9999; /* no gaps: every year is drawn as published */ for (let x = NY0; x <= x1 + 1e-6; x += step) { const xx = Math.min(x, x1), X = L.X(xx), Y = L.Y(nimAt(xx)); if (xx > GA && xx < GB) { gap.push([X, Y]); pen = false; continue; } pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; }
    g.strokeStyle = "#8fd0ee"; g.globalAlpha = a*(1 - s.op); g.lineWidth = 1.6; g.lineJoin = "round"; g.setLineDash([]); g.stroke();
    if (gap.length > 1) { g.beginPath(); gap.forEach(([X, Y], k) => k ? g.lineTo(X, Y) : g.moveTo(X, Y)); g.setLineDash([2, 4]); g.lineWidth = 1.2; g.stroke(); g.setLineDash([]); }

    const XP = L.X(x1), YP = L.Y(nimAt(x1)); if (x1 < 2025) { g.fillStyle = "#e9f6ff"; g.beginPath(); g.arc(XP, YP, 2.2, 0, 6.283); g.fill(); } }
  g.setLineDash([]); g.globalAlpha = a;
  // visas issued, 2000-2025, on its own scale (4 visas to 1 migrant, sharing zero)
  if (false) { const xe = Math.min(s.pen, 2025), yv = v => L.Y(v/4); g.globalAlpha = a*(1 - s.op); g.strokeStyle = "rgba(217,211,198,.72)"; g.lineWidth = 1.3; g.beginPath();
    for (let x = 2000; x <= xe + 1e-6; x += .04) { const xx = Math.min(x, xe), X = L.X(xx), Y = yv(visAt(xx)); x === 2000 ? g.moveTo(X, Y) : g.lineTo(X, Y); } g.stroke();
    g.fillStyle = "#e6e0d2"; for (let y = 2000; y <= xe; y++) { g.beginPath(); g.arc(L.X(y), yv(VIS0[y - 2000]), 2.1, 0, 6.283); g.fill(); }
    g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.textAlign = "left"; g.fillStyle = "rgba(230,224,210,.85)"; 
    if (s.pen > 2001.6) { g.fillStyle = "rgba(127,192,220,.9)"; g.fillText("Net international migration", L.X(2001) - 4, L.Y(NV[0]) + 30); } if (s.pen > 2010.4) { g.fillStyle = "rgba(127,192,220,.6)"; g.textAlign = "center"; g.fillText("no 2010 estimate", L.X(2010), L.Y(nimAt(2010)) - 12); g.textAlign = "left"; } g.globalAlpha = a; }
  // the line is made of people: it opens into dots, 1 dot = 1,000 people, none touching
  if (s.op > .01) { const ppy = L.ppy(), r0 = .85, by = [], x0v = LC.x - LC.span*.7, x1v = LC.x + LC.span*.7, dsp = s.disp || 0, rd = s.red || 0, gr = s.grow || 0, keep = gr && dsp > 0 ? Math.max(.025, 1 - .975*Math.pow(dsp, .6)) : 1, big = gr && dsp > .08;
    for (let k = 0; k < 8; k++) by.push(new Path2D());
    for (const d of DOTS) { if (d.rr > keep || d.x < x0v || d.x > x1v) continue; let X = L.X(d.x), Y = L.Y(nimAt(d.x)) + d.v*ppy*s.op*VSQ*1.6, r = r0;
      if (dsp > 0) { const dist = (60 + d.sp*Math.max(W, H)*.95)*Math.pow(dsp, 1.5); X += Math.cos(d.ang)*dist; Y += Math.sin(d.ang)*dist; r = r0 + gr*dsp*dsp*(10 + (d.rr/keep)*34); }
      if (Y < -90 || Y > H + 90 || X < -90 || X > W + 90) continue; const pth = by[d.k]; if (big) { pth.moveTo(X + r, Y); pth.arc(X, Y, r, 0, 6.283); } else pth.rect(X - r, Y - r, 2*r, 2*r); }
    g.globalAlpha = a*s.op; for (let k = 0; k < 8; k++) { g.fillStyle = mixRed(TFAM[0][k], REDS[k], rd); g.fill(by[k]); } g.globalAlpha = a; }
  // 2026: the published projections, as strands coming loose
  if (s.fan > .01 && s.op < .99) { g.globalAlpha = a*(1 - s.op); const y0 = L.Y(NV[NV.length - 1]), X0 = L.X(2025), X1 = L.X(2026); let q = 3; const r2 = () => (q = (Math.imul(q, 1664525) + 1013904223) >>> 0)/4294967296;
    for (const p of PROJ) { const n = p.lo === p.hi ? 7 : 26; for (let k = 0; k < n; k++) { const v = p.lo === p.hi ? p.lo + (r2() - .5)*6e4 : p.lo + r2()*(p.hi - p.lo), Xe = lerp(X0, X1, s.fan), Ye = lerp(y0, L.Y(v), s.fan);
      g.beginPath(); g.moveTo(X0, y0); g.bezierCurveTo(X0 + (Xe - X0)*.5, y0, X0 + (Xe - X0)*.5, Ye, Xe, Ye); g.strokeStyle = p.lo === p.hi ? "rgba(242,185,80,.5)" : "rgba(157,211,238,.3)"; g.lineWidth = .55; g.stroke(); } }
    g.setLineDash([]); g.globalAlpha = a*clamp((s.fan - .6)/.4)*(1 - s.op); g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; const R0 = L.nar ? "right" : "left", dx = L.nar ? -8 : 12; g.textAlign = R0;
    const ce = PROJ.find(p => /Census/.test(p.src)), cb = PROJ.find(p => /Budget/.test(p.src)), br = PROJ.find(p => p.lo !== p.hi);
    const lab = (v, t, c) => { const Y = L.Y(v); g.fillStyle = c; g.beginPath(); g.arc(X1, Y, 2.6, 0, 6.283); g.fill(); g.fillText(t, X1 + dx, Y + 4); };
    if (cb) lab(cb.lo, L.nar ? "CBO" : `CBO  +${Math.round(cb.lo/1e3)}k (calendar year)`, "#f2b950"); if (ce) lab(ce.lo, L.nar ? "Census" : `Census Bureau  +${Math.round(ce.lo/1e3)}k`, "#f2b950");
    if (br) { const ya = L.Y(br.hi), yb = L.Y(br.lo); g.strokeStyle = "rgba(157,211,238,.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(X1 + 4, ya); g.lineTo(X1 + 4, yb); g.stroke(); g.fillStyle = "#9dd3ee"; g.fillText(L.nar ? "Brookings" : `Brookings/AEI  ${fmt(br.lo)} to +${Math.round(br.hi/1e3)}k`, X1 + dx, (ya + yb)/2); if (!L.nar) { g.fillStyle = "#66738a"; g.fillText("(scenarios)", X1 + dx, (ya + yb)/2 + 15); } }
    g.textAlign = "left"; g.fillStyle = "#66738a"; g.globalAlpha = a*clamp((s.fan - .6)/.4)*(1 - s.op); g.fillText("2026 · projected", X1 - 30, L.Y(L.vhi) - 6); }
  SPOTS.length = 0; g.globalAlpha = a*(1 - s.op);
  for (const e of INFL) { const gv = (s.infl && s.infl[e.id]) || 0; if (gv <= .004 || e.x > x1 + 1e-6) continue; const X = L.X(e.x), Y = L.Y(nimAt(e.x)), tw = .86 + .14*Math.sin(now/240), R = (10 + 34*gv)*tw; INFL_POS[e.id] = [X, Y, gv, performance.now()];
    const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, "rgba(255,236,190," + (.95*Math.min(1, gv*1.4)) + ")"); gr.addColorStop(.3, "rgba(242,185,80," + (.5*gv) + ")"); gr.addColorStop(1, "rgba(242,185,80,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R, 0, 6.283); g.fill(); g.globalCompositeOperation = "source-over"; g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(X, Y, 2.4, 0, 6.283); g.fill();
    g.strokeStyle = "rgba(242,185,80," + (.7*gv) + ")"; g.lineWidth = 1; g.beginPath(); g.arc(X, Y, 6 + 16*(1 - gv) + 8, 0, 6.283); g.stroke();
    g.font = "500 12px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.textAlign = e.side > 0 ? "left" : "right"; g.fillStyle = "rgba(242,185,80," + Math.min(1, .35 + gv) + ")"; g.fillText(e.label.toUpperCase(), X + e.side*20, Y + e.dy); }
  if (s.spotsHint > .01) { g.globalAlpha = a*s.spotsHint; g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#f2b950"; g.textAlign = "left"; g.fillText(L.nar ? "✦ tap a glowing spot" : "✦ click a glowing spot to see what was done, and where", L.nar ? 16 : L.ax, L.yt - 10); }
  g.restore(); }

// the line's people: every year as dots, 1 dot = 1,000 people, scattered around the line by dart-throwing so no two touch (year units, as before);
// the 2024 and 2025 dots each belong to a county, weighted by where the Census counted them
const DOT = 100, DMIN = .0125, SIG = .08, VSQ = .62, DOTS = [], CROWD = [];
{ sd = 21; const fam = TFAM[0];   // one dot per 100 people, scattered about the line; heavier years make a thicker ribbon
  NV.forEach((nv, yi) => { const yr = NY0 + yi; if (nv == null) return; const a0 = yr - .5, a1 = Math.min(2025, yr + .5), n = Math.round(Math.max(0, nv)/DOT), th = .55 + .9*Math.max(0, nv)/2.7e6; let pick = null;
    if (yr >= 2024) { const ni = D.years.indexOf(String(yr)), w = D.counties.map(c => Math.max(0, c[2][ni])), cum = []; let t = 0; for (const v of w) cum.push(t += v); pick = () => { const r = rnd()*t; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return D.counties[lo]; }; }
    for (let i = 0; i < n; i++) { const x = a0 + rnd()*(a1 - a0), v = gauss()*SIG*th, kk = Math.floor(rnd()*fam.length), d = {x, v, c: fam[kk], k: kk, yr, ang: rnd()*6.2832, sp: .25 + rnd()*.75, rr: rnd()};
      if (pick) { const c = pick(); d.to = v3(c[0] + gauss()*.12, c[1] + gauss()*.09); d.d = rnd()*.35; CROWD.push(d); } DOTS.push(d); } }); }
function drawCrowd(s) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); if (s.fly < .001 || s.cens < .01) return; const by = new Map(), ppy = L.ppy(), r0 = Math.max(.8, DMIN*ppy*.4);
  for (const d of CROWD) { const cx = L.X(d.x), cy = L.Y(nimAt(d.x)) + d.v*ppy*VSQ, u = ease(clamp((s.fly - d.d)/.65)), q = proj(d.to), x = lerp(cx, q[0], u), y = lerp(cy, q[1], u), r = lerp(r0, 1.15, u)*DPR;
    if (!by.has(d.c)) by.set(d.c, new Path2D()); const p = by.get(d.c); p.moveTo(x*DPR + r, y*DPR); p.arc(x*DPR, y*DPR, r, 0, 6.283); }
  fx.globalAlpha = s.cens; for (const [c, p] of by) { fx.fillStyle = c; fx.fill(p); } fx.globalAlpha = 1; }
