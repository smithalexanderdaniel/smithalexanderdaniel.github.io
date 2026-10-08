"use strict";
// truer outlines (geo.js): Census 1:500,000 states, coasts and borders; Natural Earth 1:50m countries
if (window.GEO) { window.ST.r = GEO.r; window.ST.city = GEO.city; window.D2.usb = GEO.usb; }
const D = window.D, $ = id => document.getElementById(id), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a)*t;
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2, D2R = Math.PI/180, PI = Math.PI;
let sd = 7; const rnd = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0)/4294967296, gauss = () => Math.sqrt(-2*Math.log(rnd() + 1e-9))*Math.cos(6.2832*rnd());
const CG = "'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif";
const fmt3 = v => { if (v == null) return "–"; const a = Math.abs(v), t = x => x.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""); return a >= 1e6 ? t((v/1e6).toPrecision(3)) + "M" : a >= 1e3 ? t((v/1e3).toPrecision(3)) + "k" : String(Math.round(v)); };
const fmt = n => { const a = Math.abs(n), s = n < 0 ? "−" : ""; return s + (a >= 1e6 ? (a/1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M" : a >= 1e3 ? Math.round(a/1e3) + "k" : String(a)); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)/255);
const readSec = s => Math.max(4, s.replace(/<[^>]+>/g, "").split(/\s+/).length/3.1 + 1.6);
// ---- palette: Boston at night
const BLUES = ["#3d8fb3", "#5aa6cf", "#7fc0dc", "#2f7fa6", "#9dd3ee", "#4fb3c9"];
const TFAM = [["#3d8fb3", "#3fb8b0", "#5ac8e0", "#7fb2f0", "#8f9cf0", "#6f7fd8", "#4f8fc8", "#b4d8f0"], ["#f2e640", "#f2c43a", "#f7ee9a"], ["#f2e640", "#e8d23a", "#f7ee9a"], ["#ff45c5", "#ff6fa8", "#d76aff"], ["#9b8cff", "#c2a8ff", "#7f72e0"], ["#9b8cff", "#c2a8ff", "#7f72e0"]];
const VG = [["Visitors", [0], "#3d8fb3"], ["Students", [1, 2], "#f2e640"], ["H-1B", [3], "#ff45c5"], ["Other visas", [4, 5], "#9b8cff"]];
const TKEY = ["#3d8fb3", "#f2e640", "#8fd45e", "#ff45c5", "#3fc9b0", "#9b8cff"], TNAME = ["Visitors", "Students", "Exchange", "H-1B", "Other work", "Other"], RED = "#ff5a40";
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
const MW = 1440, MH = 720, MASK = new Int16Array(MW*MH).fill(-1), SH = window.GEO ? GEO.shapes : D.shapes;
{ const off = document.createElement("canvas"); off.width = MW; off.height = MH; const q = off.getContext("2d");
  SH.forEach(([n, rings], i) => { q.fillStyle = `rgb(${(i + 1) & 255},${(i + 1) >> 8},0)`; for (const r of rings) { const lons = r.map(p => p[0]), wrap = Math.max(...lons) - Math.min(...lons) > 180;
    for (const sh of wrap ? [0, 360] : [0]) { q.beginPath(); r.forEach((p, k) => { const lo = wrap && p[0] < 0 ? p[0] + 360 : p[0], x = (lo - sh + 180)/360*MW, y = (90 - p[1])/180*MH; k ? q.lineTo(x, y) : q.moveTo(x, y); }); q.closePath(); q.fill(); } } });
  const BB = SH.map(([, rings]) => { let a = 1e9, b = -1e9, c = 1e9, e = -1e9; for (const r of rings) for (const [lo, la] of r) { a = Math.min(a, lo); b = Math.max(b, lo); c = Math.min(c, la); e = Math.max(e, la); } return [a - 1, b + 1, c - 1, e + 1, b - a > 180]; });
  const d = q.getImageData(0, 0, MW, MH).data, idAt = k => d[k*4 + 3] === 255 ? d[k*4] + d[k*4 + 1]*256 - 1 : -1;
  for (let k = 0; k < MW*MH; k++) { const id = idAt(k); if (id < 0 || id >= SH.length) continue; const bb = BB[id], lo = ((k % MW) + .5)/MW*360 - 180, la = 90 - (Math.floor(k/MW) + .5)/MH*180;
    if (la < bb[2] || la > bb[3] || (!bb[4] && (lo < bb[0] || lo > bb[1]))) continue; if (idAt(k - 1) !== id && idAt(k + 1) !== id) continue; MASK[k] = id; } }
const AL = {"Dominican Republic": "Dominican Rep.", "Democratic Republic of Congo": "Dem. Rep. Congo", "Republic of the Congo": "Congo", "Bosnia and Herzegovina": "Bosnia and Herz.", "Central African Republic": "Central African Rep.", "South Sudan": "S. Sudan", "Eswatini": "eSwatini", "Equatorial Guinea": "Eq. Guinea", "North Macedonia": "Macedonia", "Solomon Islands": "Solomon Is.", "United States": "United States of America", "Antigua and Barbuda": "Antigua and Barb.", "Cape Verde": "Cabo Verde", "Macau": "Macao", "Saint Vincent and the Grenadines": "St. Vin. and Gren.", "Saint Kitts and Nevis": "St. Kitts and Nevis", "Cayman Islands": "Cayman Is.", "Sao Tome and Principe": "São Tomé and Principe", "Marshall Islands": "Marshall Is."};
const SHN = SH.map(s => s[0]); C.forEach(c => c.sid = SHN.indexOf(AL[c.n] || c.n)); const BYSID = new Map(C.map((c, i) => [c.sid, i]));
const US = C.findIndex(c => c.n === "United States"), USSID = SHN.indexOf("United States of America");   // the US is not among the visa countries
const CELLS = SH.map(() => []); for (let k = 0; k < MASK.length; k++) if (MASK[k] >= 0) CELLS[MASK[k]].push(k);
const maskAt = (lon, lat) => { const x = Math.floor((lon + 180)/360*MW), y = Math.floor((90 - lat)/180*MH); return x >= 0 && x < MW && y >= 0 && y < MH ? MASK[y*MW + x] : -1; };
function cloudPt(c) { const L = c.sid >= 0 ? CELLS[c.sid] : null; if (!L || !L.length) return [c.lon + gauss()*.5, c.lat + gauss()*.5];
  const sg = Math.max(.6, .42*Math.sqrt(L.length)/4), cl = Math.max(.25, Math.cos(c.lat*D2R));
  for (let t = 0; t < 14; t++) { const f = rnd() < .3 ? 2.2 : 1, lo = c.lon + gauss()*sg*f/cl, la = c.lat + gauss()*sg*f; if (maskAt(lo, la) === c.sid) return [lo, la]; }
  const k = L[Math.floor(rnd()*L.length)]; return [((k % MW) + rnd())/MW*360 - 180, 90 - (Math.floor(k/MW) + rnd())/MH*180]; }
const angle = (a, b) => Math.acos(clamp(a[0]*b[0] + a[1]*b[1] + a[2]*b[2], -1, 1));
const HKJ = [.55, .8, 1.05, .68], HKG = 1.3, ARC_HI = d => .13 + .62*Math.pow(d/PI, .8), ARC_LO = d => .045 + .14*Math.pow(d/PI, .7);
function slerp(a, b, u) { const w = angle(a, b); if (w < 1e-5) return a; const s = Math.sin(w), ka = Math.sin((1 - u)*w)/s, kb = Math.sin(u*w)/s; return [a[0]*ka + b[0]*kb, a[1]*ka + b[1]*kb, a[2]*ka + b[2]*kb]; }
const portsFor = y => D.ports[String(clamp(y, 2015, 2025))];
function pickPort(c, y) { const ps = portsFor(y), a = v3(c.lon, c.lat); let t = 0; const w = ps.map(p => { t += p[2]/Math.pow(.35 + angle(a, v3(p[0], p[1])), 3); return t; }); const r = rnd()*t; let i = 0; while (w[i] < r) i++; return ps[i]; }

// =================================================================== WebGL: dots and hairlines on the globe
const glc = $("gl"), gl = glc.getContext("webgl", {antialias: true, alpha: false, preserveDrawingBuffer: true});
const VS_DOT = `attribute vec3 aTo, aFrom, aCol; attribute float aCi, aT, aD, aYm;
uniform vec3 uR0, uR1, uR2; uniform vec2 uC, uRes; uniform float uRad, uDPR, uTr, uSize, uLitOn, uYrOn, uY0, uY1, uYr, uSel, uSelT; uniform sampler2D uLit;
varying vec3 vCol; varying float vLit, vVis, vFade;
float bitAt(float m, float i) { return mod(floor((m + .5)/exp2(i)), 2.); }
void main(){ float lc = texture2D(uLit, vec2((aCi + .5)/256., .25)).r, lt = texture2D(uLit, vec2((min(aT, 9.) + .5)/256., .75)).r; float u = clamp((uTr - aD)/.55, 0., 1.), fade = 1.;
  if (uYrOn > .5) { float v0 = bitAt(aYm, uY0), v1 = bitAt(aYm, uY1), k = clamp((uYr*1.5 - aD)/.6, 0., 1.);
    if (v1 > .5 && v0 < .5) { u = min(u, k); fade = clamp(k*4., 0., 1.); } else if (v1 < .5 && v0 > .5) { fade = 1. - k; if (aT > 6.5 && aT < 8.5) u = min(u, 1. - k); } else if (v1 < .5) fade = 0.;
    if (abs(aCi - uSel) < .5 && (aT < 6.5 || aT > 8.5)) u = min(u, clamp((uSelT - aD)/.55, 0., 1.)); }
  u = u < .5 ? 4.*u*u*u : 1. - pow(-2.*u + 2., 3.)/2.;
  float w = acos(clamp(dot(aFrom, aTo), -1., 1.)); vec3 p = aTo; if (w > 1e-4 && u < .9999) { float s = sin(w); p = (aFrom*sin((1. - u)*w) + aTo*sin(u*w))/s; }
  float hk = aT < .5 ? .55 : aT < 2.5 ? .8 : aT < 3.5 ? 1.05 : aT < 5.5 ? .68 : 1.3, h = aT > 6.5 && aT < 8.5 ? 0. : aT > 8.5 && aT < 9.5 ? .045 + .14*pow(w/3.14159, .7) : (.13 + .62*pow(w/3.14159, .8))*hk; p = normalize(p)*(1. + h*sin(3.14159*u)*step(.0001, w));
  vec3 q = vec3(dot(uR0, p), dot(uR1, p), dot(uR2, p)); float lifted = length(p) - 1.; vVis = (q.z > .0 || (lifted > .002 && length(q.xy) > 1.)) && (uLitOn < .5 || lt > .25) && fade > .01 ? 1. : 0.;
  vec2 sc = uC + vec2(q.x, -q.y)*uRad; gl_Position = vec4(sc.x/uRes.x*2. - 1., 1. - sc.y/uRes.y*2., 0., 1.); gl_PointSize = uSize*uDPR*vVis;
  vLit = uLitOn > .5 ? (lc > .75 && lt > .75 ? 1. : 0.) : 1.; vCol = aCol; vFade = fade; }`;
const FS_DOT = `precision mediump float; uniform float uAlpha, uGlow, uDimA; varying vec3 vCol; varying float vLit, vVis, vFade;
void main(){ if (vVis < .5) discard; float a = uAlpha; vec3 c = vCol; if (vLit < .5) { c = vec3(.141, .251, .302); a = uGlow > .5 ? 0. : uDimA; } a *= vFade;
  if (uGlow > .5) { float d = length(gl_PointCoord - .5); a *= 1. - smoothstep(.1, .5, d); gl_FragColor = vec4(c*a, a); return; } gl_FragColor = vec4(c, a); }`;
const VS_LN = `attribute vec3 aP, aCol; attribute float aS, aD, aCi, aT, aYm;
uniform vec3 uR0, uR1, uR2; uniform vec2 uC, uRes; uniform float uRad, uTr, uLitOn, uDim, uYrOn, uY0, uY1, uYr, uSel, uSelT; uniform sampler2D uLit; varying vec3 vCol; varying float vA;
float bitAt(float m, float i) { return mod(floor((m + .5)/exp2(i)), 2.); }
float ez(float u) { return u < .5 ? 4.*u*u*u : 1. - pow(-2.*u + 2., 3.)/2.; }
void main(){ vec3 q = vec3(dot(uR0, aP), dot(uR1, aP), dot(uR2, aP)); float u = ez(clamp((uTr - aD)/.55, 0., 1.)), fade = 1.;
  if (uYrOn > .5) { float v0 = bitAt(aYm, uY0), v1 = bitAt(aYm, uY1), k = ez(clamp((uYr*1.5 - aD)/.6, 0., 1.));
    if (v1 > .5 && v0 < .5) u = min(u, k); else if (v1 < .5 && v0 > .5) u = min(u, 1. - k); else if (v1 < .5) fade = 0.;
    if (abs(aCi - uSel) < .5 && (aT < 6.5 || aT > 8.5)) u = min(u, ez(clamp((uSelT - aD)/.55, 0., 1.))); }
  float vis = (q.z > 0. || length(q.xy) > 1.) && aS <= u + .0001 && fade > .5 ? 1. : 0.; vec2 sc = uC + vec2(q.x, -q.y)*uRad; gl_Position = vec4(sc.x/uRes.x*2. - 1., 1. - sc.y/uRes.y*2., 0., 1.); vCol = aCol;
  float lc = texture2D(uLit, vec2((aCi + .5)/256., .25)).r, lt = texture2D(uLit, vec2((min(aT, 9.) + .5)/256., .75)).r, lit = uLitOn < .5 ? 1. : lt < .25 ? 0. : lc > .75 && lt > .75 ? 1. : uDim; vA = vis*(.35 + .65*aS)*lit; }`;
const FS_LN = `precision mediump float; uniform float uAlpha; varying vec3 vCol; varying float vA; void main(){ if (vA < .01) discard; gl_FragColor = vec4(vCol, uAlpha*vA); }`;
const VS_BG = `attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }`;
const FS_BG = `precision mediump float; uniform vec2 uC, uRes; uniform float uRad, uDPR, uA; void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y*uDPR - gl_FragCoord.y)/uDPR; float d = length(p - uC)/uRad;
  vec3 bg = vec3(.0196, .0314, .051), disk = vec3(.027, .043, .067) + vec3(.03, .05, .08)*pow(clamp(d, 0., 1.), 6.); float limb = smoothstep(1.006, 1., d)*smoothstep(.985, 1., d)*.5;
  vec3 c = d < 1. ? mix(bg, disk, uA) : bg; c += vec3(.25, .35, .45)*limb*uA; gl_FragColor = vec4(c, 1.); }`;
function prog(vs, fs) { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); gl.attachShader(p, o); }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); U[u.name] = gl.getUniformLocation(p, u.name); }
  const A = {}, m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < m; i++) { const a = gl.getActiveAttrib(p, i); A[a.name] = gl.getAttribLocation(p, a.name); } return {p, U, A}; }
const MAXB = gl.getExtension("EXT_blend_minmax"), PD = prog(VS_DOT, FS_DOT), PL = prog(VS_LN, FS_LN), PB = prog(VS_BG, FS_BG);
const QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const LIT = new Uint8Array(256*2*4).fill(255), LITT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, LITT); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
const pushLit = () => { gl.bindTexture(gl.TEXTURE_2D, LITT); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, LIT); }; pushLit();
// dot buffers: to(3) from(3) col(3) ci t d = 12 floats
function dotBuf(arr) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return {b, n: arr.length/12}; }
function lnBuf(arr) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return {b, n: arr.length/10}; }
const attrsOff = () => { for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i); };
const free = o => o && gl.deleteBuffer(o.b);
function pushDot(out, to, from, col, ci, t, d) { out.push(to[0], to[1], to[2], from[0], from[1], from[2], col[0], col[1], col[2], ci, t, d); }
// land speckle, once
const LAND = (() => { const a = []; sd = 3; const col = hex("#2b5466"); for (let k = 0; k < MASK.length; k += 2) { if (MASK[k] < 0 || rnd() > .55) continue; const y = Math.floor(k/MW); if (y > 610) continue;
  const p = v3(((k % MW) + rnd())/MW*360 - 180, 90 - (y + rnd())/MH*180); pushDot(a, p, p, col, 255, 7, 0); }
  return dotBuf(new Float32Array(a)); })();
const LANDUS = (() => { const a = []; sd = 4; const col = hex("#2b5466"); for (const k of CELLS[USSID] || []) for (let j = 0; j < 3; j++) { const p = v3(((k % MW) + rnd())/MW*360 - 180, 90 - (Math.floor(k/MW) + rnd())/MH*180); pushDot(a, p, p, col, 255, 7, 0); }   // the US, finer, for the close view
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
  for (const [st, n, v] of L) { const [c, ci] = remCountry(n), o = D.rem.st[st]; if (!c || !o) continue; let m = Math.round(v/DUNIT); while (m-- > 0) pushDot(a, v3(...cloudPt(c)), v3(o[0] + gauss()*1.2, o[1] + gauss()*.9), col, ci, 9, rnd()*.5); }
  return REMD[yi] = dotBuf(new Float32Array(a)); }
// hairline bundles: arrivals climb high, removals stay low
function strand(out, a, b, h, col, d, N = 48, ci = 255, t = 7) { for (let k = 0; k < N; k++) for (const j of [k, k + 1]) { const u = j/N, p = slerp(a, b, u), r = 1 + h*Math.sin(PI*u), m = Math.hypot(...p); out.push(p[0]/m*r, p[1]/m*r, p[2]/m*r, u, d, col[0], col[1], col[2], ci, t); } }
function arcsFor(yi) { if (ARR[yi]) return ARR[yi]; const a = [], y = YEARS[yi], tot = c => c.v[yi].reduce((s, v) => s + v, 0); sd = 900 + yi;
  const all = C.map((c, i) => [c, i]).filter(([c, i]) => i !== US && tot(c) > 0).sort((p, q) => tot(q[0]) - tot(p[0])), mx = tot(all[0][0]);
  for (const [c, ci] of all) { const ps = portsFor(y), A0 = v3(c.lon, c.lat); let best = ps[0], bv = -1; for (const p of ps) { const v = p[2]/Math.pow(.35 + angle(A0, v3(p[0], p[1])), 3); if (v > bv) { bv = v; best = p; } }
    const T = tot(c), n = 2 + 42*Math.sqrt(T/mx);
    c.v[yi].forEach((v, t) => { const x = v/T*n; let m = Math.floor(x) + (rnd() < x % 1 ? 1 : 0); const fam = TFAM[t];
      while (m-- > 0) { const from = v3(best[0] + gauss()*.5, best[1] + gauss()*.35), to = v3(c.lon + gauss()*1.4, c.lat + gauss()*1); const w = rnd(); strand(a, from, to, ARC_HI(angle(from, to))*(.82 + rnd()*.36), [.62 + .3*w, .8 + .14*w, .92 + .06*w], rnd()*.45, 48, ci, t); } }); }
  return ARR[yi] = lnBuf(new Float32Array(a)); }
function remArcsFor(yi) { const L = D.rem.years[YEARS[yi]]; if (!L) return null; if (REML[yi]) return REML[yi]; const a = [], by = new Map(); sd = 1300 + yi;
  for (const [st, n, v] of L) { const e = by.get(n) || {v: 0, st: {}}; e.v += v; e.st[st] = (e.st[st] || 0) + v; by.set(n, e); }
  const rows = [...by].sort((p, q) => q[1].v - p[1].v).slice(0, 40), mr = rows[0][1].v, RC = ["#ff5a40", "#ff4a36", "#ff6a4d", "#e8243c"];
  for (const [n, e] of rows) { const [c, rci] = remCountry(n); if (!c) continue; const k0 = 4 + 40*Math.sqrt(e.v/mr);
    for (const [st, v] of Object.entries(e.st)) { const o = D.rem.st[st]; if (!o) continue; const x = k0*v/e.v; let m = Math.floor(x) + (rnd() < x % 1 ? 1 : 0);
      while (m-- > 0) { const from = v3(o[0] + gauss()*.6, o[1] + gauss()*.4), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.8); strand(a, from, to, ARC_LO(angle(from, to))*(.82 + rnd()*.36), hex(RC[Math.floor(rnd()*RC.length)]), rnd()*.5, 36, rci, 9); } } }
  return REML[yi] = lnBuf(new Float32Array(a)); }
const CENS = {};
// draw
let W, H, DPR;
function bindDots(o) { attrsOff(); gl.bindBuffer(gl.ARRAY_BUFFER, o.b); const A = PD.A, st = o.st || 48; const at = (n, sz, off) => { if (A[n] === undefined || A[n] < 0) return; gl.enableVertexAttribArray(A[n]); gl.vertexAttribPointer(A[n], sz, gl.FLOAT, false, st, off*4); };
  at("aTo", 3, 0); at("aFrom", 3, 3); at("aCol", 3, 6); at("aCi", 1, 9); at("aT", 1, 10); at("aD", 1, 11); if (st === 52) at("aYm", 1, 12); }
function camU(P) { gl.uniform3f(P.U.uR0, ROT[0], ROT[1], ROT[2]); gl.uniform3f(P.U.uR1, ROT[3], ROT[4], ROT[5]); gl.uniform3f(P.U.uR2, ROT[6], ROT[7], ROT[8]); gl.uniform2f(P.U.uC, CAM.cx, CAM.cy); gl.uniform2f(P.U.uRes, W, H); gl.uniform1f(P.U.uRad, CAM.R); }
const yrU = (P, on) => { gl.uniform1f(P.U.uYrOn, on); gl.uniform1f(P.U.uY0, YA); gl.uniform1f(P.U.uY1, YB); gl.uniform1f(P.U.uYr, YT); gl.uniform1f(P.U.uSel, on && VIEW === "world" && SEL != null ? SEL : -9); gl.uniform1f(P.U.uSelT, SELT); };
function drawDots(o, {tr = 2, size = 1.15, alpha = .82, glow = true, lit = 0, dimA = .4, yr = 0, halo = null}) { if (!o || !o.n) return; gl.useProgram(PD.p); camU(PD); gl.uniform1f(PD.U.uDPR, DPR); gl.uniform1f(PD.U.uTr, tr); gl.uniform1f(PD.U.uLitOn, lit); gl.uniform1f(PD.U.uDimA, dimA); yrU(PD, yr);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, LITT); gl.uniform1i(PD.U.uLit, 0); bindDots(o);
  if (glow) { if (MAXB) { gl.blendEquation(MAXB.MAX_EXT); gl.uniform1f(PD.U.uAlpha, alpha*(halo ? halo[1] : .3)); } else { gl.blendFunc(gl.ONE, gl.ONE); gl.uniform1f(PD.U.uAlpha, alpha*.03); } gl.uniform1f(PD.U.uGlow, 1); gl.uniform1f(PD.U.uSize, halo ? halo[0] : 6); gl.drawArrays(gl.POINTS, 0, o.n); gl.blendEquation(gl.FUNC_ADD); }
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(PD.U.uGlow, 0); gl.uniform1f(PD.U.uSize, size); gl.uniform1f(PD.U.uAlpha, alpha); gl.drawArrays(gl.POINTS, 0, o.n); }
function drawLines(o, {tr = 2, alpha = .2, lit = 0, dim = .07, yr = 0}) { if (!o || !o.n || alpha < .005) return; gl.useProgram(PL.p); camU(PL); gl.uniform1f(PL.U.uTr, tr); gl.uniform1f(PL.U.uAlpha, alpha); gl.uniform1f(PL.U.uLitOn, lit); gl.uniform1f(PL.U.uDim, dim); yrU(PL, yr);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, LITT); gl.uniform1i(PL.U.uLit, 0); attrsOff(); gl.bindBuffer(gl.ARRAY_BUFFER, o.b); const A = PL.A, st = o.st || 40;
  for (const [nm, off] of st === 44 ? [["aCi", 32], ["aT", 36], ["aYm", 40]] : [["aCi", 32], ["aT", 36]]) if (A[nm] !== undefined && A[nm] >= 0) { gl.enableVertexAttribArray(A[nm]); gl.vertexAttribPointer(A[nm], 1, gl.FLOAT, false, st, off); }
  gl.enableVertexAttribArray(A.aP); gl.vertexAttribPointer(A.aP, 3, gl.FLOAT, false, st, 0); gl.enableVertexAttribArray(A.aS); gl.vertexAttribPointer(A.aS, 1, gl.FLOAT, false, st, 12); gl.enableVertexAttribArray(A.aD); gl.vertexAttribPointer(A.aD, 1, gl.FLOAT, false, st, 16); gl.enableVertexAttribArray(A.aCol); gl.vertexAttribPointer(A.aCol, 3, gl.FLOAT, false, st, 20);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.drawArrays(gl.LINES, 0, o.n); }
function drawBg(a) { gl.useProgram(PB.p); gl.uniform2f(PB.U.uC, CAM.cx, CAM.cy); gl.uniform2f(PB.U.uRes, W, H); gl.uniform1f(PB.U.uRad, CAM.R); gl.uniform1f(PB.U.uDPR, DPR); gl.uniform1f(PB.U.uA, a);
  gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(PB.A.aP); gl.vertexAttribPointer(PB.A.aP, 2, gl.FLOAT, false, 0, 0); gl.disable(gl.BLEND); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.enable(gl.BLEND); }

// =================================================================== the census line (2D), in a fixed frame
const lnc = $("ln"), g = lnc.getContext("2d"), fxc = $("fx"), fx = fxc.getContext("2d"), ovc = $("ov"), ov = ovc.getContext("2d");
const D2 = window.D2, NV = D2.nimx.nim, NY0 = 2001, PROJ = D.proj, PARTIAL = D2.nimx.years.filter((y, i) => D2.nimx.partial[i]);
const nimAt = x => { const f = clamp(x - NY0, 0, NV.length - 1.0001), i = Math.floor(f), u = f - i, s = u*u*(3 - 2*u); return NV[i] + (NV[Math.min(i + 1, NV.length - 1)] - NV[i])*s; };
let L = {}, LC = {x: 2015.2, span: 9}, YOFF = 0;
// the line's own camera: it follows the pen up close, pulls back to the whole line at 2026, then dives into 2024-25
function layout() { const nar = W < 760; L = {nar, yt: nar ? 110 : 130, yb: nar ? Math.round(H*.6) : H - 200, vlo: -1e6, vhi: 3e6, ax: nar ? 46 : 74};
  L.X = y => W/2 + (y - LC.x)/LC.span*W*(nar ? .86 : .8); L.Y0 = v => L.yb - (v - L.vlo)/(L.vhi - L.vlo)*(L.yb - L.yt); L.Y = v => L.Y0(v) + YOFF; L.ppy = () => L.X(NY0 + 1) - L.X(NY0); }
const FOLLOW = px => ({x: clamp(px - 2.2, NY0 + 4.2, 2022.4), span: 9}), WHOLE = () => ({x: 2013.6, span: L.nar ? 30.5 : 27.6}), DIVE = {x: 2024.5, span: 2.3};
const lcMix = (a, b, u) => ({x: lerp(a.x, b.x, u), span: Math.exp(lerp(Math.log(a.span), Math.log(b.span), u))});
const STR = Array.from({length: 120}, () => ({dl: rnd(), b: gauss()*.5, a: .3 + rnd()*.9, f: 1.2 + rnd()*3.2, ph: rnd()*6.28, f2: .4 + rnd()*.9, ph2: rnd()*6.28, al: .16 + rnd()*.3, c: BLUES[Math.floor(rnd()*BLUES.length)], e: (rnd() - .5)*2, w: .45 + rnd()*.45, dash: 3 + rnd()*3}));
const PEN = (() => { const tab = [NY0]; let x = NY0, t = 0; const dt = 1/60, sm = (a, b, v) => { const k = clamp((v - a)/(b - a)); return k*k*(3 - 2*k); };
  while (x < 2025) { const v = (1.25 + .5*(1 - sm(2015, 2017.5, x)) - .75*Math.exp(-(((x - 2020.2)/.8)**2)) - .55*sm(2023.6, 2024.9, x))*(.3 + .7*sm(0, 1.2, t)); x = Math.min(2025, x + v*dt); t += dt; tab.push(x); } return tab; })();
const penX = t => { const f = clamp(t*60, 0, PEN.length - 1), i = Math.floor(f); return lerp(PEN[i], PEN[Math.min(PEN.length - 1, i + 1)], f - i); }, PEN_T = (PEN.length - 1)/60;
const EVIMG = {"2002-05": ["https://upload.wikimedia.org/wikipedia/commons/c/c0/Border_Security_and_Visa_Entry_Reform_Act.jpg", "President George W. Bush speaks before signing the act, 14 May 2002.", "White House photo by Paul Morse · public domain", "https://commons.wikimedia.org/wiki/File:Border_Security_and_Visa_Entry_Reform_Act.jpg"], "2017-01": ["https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Boston_Copley_Square_2017-01-29_protest.jpg/960px-Boston_Copley_Square_2017-01-29_protest.jpg", "Protest against the order in Copley Square, Boston, 29 January 2017.", "Photo: GorillaWarfare · CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Boston_Copley_Square_2017-01-29_protest.jpg"], "2020-00": ["https://upload.wikimedia.org/wikipedia/commons/3/3c/Local_enumerator_in_Toksook_Bay.png", "Enumerators prepare for the first count of the 2020 Census, Toksook Bay, Alaska, January 2020.", "U.S. Census Bureau · public domain", "https://commons.wikimedia.org/wiki/File:Local_enumerator_in_Toksook_Bay.png"], "2020-03": ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Washington_Dulles_International_Airport_-_Jimmy_Panetta.jpg/960px-Washington_Dulles_International_Airport_-_Jimmy_Panetta.jpg", "Washington Dulles International Airport, 28 March 2020.", "Photo: Rep. Jimmy Panetta · public domain", "https://commons.wikimedia.org/wiki/File:Washington_Dulles_International_Airport_-_Jimmy_Panetta.jpg"], "2020-04": ["https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/COVID-19_pandemic_at_Washington_Dulles_International_Airport_-_Salud_Carbajal_03.jpg/960px-COVID-19_pandemic_at_Washington_Dulles_International_Airport_-_Salud_Carbajal_03.jpg", "Washington Dulles International Airport, 22 April 2020, the day the proclamation was signed.", "Photo: Rep. Salud Carbajal · public domain", "https://commons.wikimedia.org/wiki/File:COVID-19_pandemic_at_Washington_Dulles_International_Airport_-_Salud_Carbajal_03.jpg"], "2020-06": ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Brazil%2C_Iceland%2C_UK%2C_US_passport_stamps.jpg/960px-Brazil%2C_Iceland%2C_UK%2C_US_passport_stamps.jpg", "Passport stamps, including a U.S. entry stamp.", "Photo: Jon Evans · CC BY 2.0", "https://commons.wikimedia.org/wiki/File:Brazil,_Iceland,_UK,_US_passport_stamps.jpg"], "2021-02": ["https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/President_Biden_Signs_Executive_Orders_Advancing_His_Priority_to_Modernize_Our_Immigration_System.webm/960px--President_Biden_Signs_Executive_Orders_Advancing_His_Priority_to_Modernize_Our_Immigration_System.webm.jpg", "President Biden signs executive orders on immigration, 2 February 2021; the revocation followed on 24 February.", "The White House (video still) · public domain", "https://commons.wikimedia.org/wiki/File:President_Biden_Signs_Executive_Orders_Advancing_His_Priority_to_Modernize_Our_Immigration_System.webm"], "2022-04": ["https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/President_Biden_met_with_refugees_from_Ukraine_in_Warsaw.jpg/960px-President_Biden_met_with_refugees_from_Ukraine_in_Warsaw.jpg", "President Biden meets refugees from Ukraine in Warsaw, 26 March 2022, a month before the program opened.", "Adam Schultz, Office of the President · public domain", "https://commons.wikimedia.org/wiki/File:President_Biden_met_with_refugees_from_Ukraine_in_Warsaw.jpg"], "2023-05": ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Migrant_Processing_and_Repatriation_Flights_June_2023_%2852952658037%29.jpg/960px-Migrant_Processing_and_Repatriation_Flights_June_2023_%2852952658037%29.jpg", "CBP personnel prepare migrants for a repatriation transfer at the Hidalgo port of entry, Texas, 1 June 2023.", "CBP photo by Jaime Rodriguez Sr. · public domain", "https://commons.wikimedia.org/wiki/File:Migrant_Processing_and_Repatriation_Flights_June_2023_(52952658037).jpg"], "2025-09": ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Figure_2-_Process_of_Obtaining_an_H-1B_Visa_%285405276752%29.jpg/960px-Figure_2-_Process_of_Obtaining_an_H-1B_Visa_%285405276752%29.jpg", "How an H-1B visa is obtained: employer, Labor Department, USCIS, State Department.", "U.S. Government Accountability Office, GAO-11-26 · public domain", "https://commons.wikimedia.org/wiki/File:Figure_2-_Process_of_Obtaining_an_H-1B_Visa_(5405276752).jpg"]};
{ const ord = STR.map((st, i) => i).sort((i, j) => STR[i].b - STR[j].b), pc = PROJ.find(p => /Budget/.test(p.src)), pe = PROJ.find(p => /Census/.test(p.src)), pb = PROJ.find(p => p.lo !== p.hi), nC = 22;
  ord.forEach((i, r) => { const st = STR[i]; if (r < nC && pc) { st.pv = pc.lo; st.pk = 1; } else if (r < 2*nC && pe) { st.pv = pe.lo; st.pk = 1; } else { const k = (r - 2*nC + .5)/(STR.length - 2*nC); st.pv = pb.hi + (pb.lo - pb.hi)*k; st.pk = 0; } }); }
const SPOTS = []; let HOVE = null, HOVY = null, DV = 0, DVT = 0, FLY0 = 0, FLYP = 0;
function drawLine(s, now) { g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H); const a = Math.max(s.chart, s.strands); if (a < .01) return;
  g.save(); g.globalAlpha = s.chart;
  g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.textAlign = "right"; g.fillStyle = "#66738a";
  for (let v = -1e6; v <= 3e6; v += 5e5) { const y = L.Y(v), major = v % 1e6 === 0; if (y < 60 || y > H - 40) continue; g.strokeStyle = v === 0 ? "rgba(236,230,216,.35)" : major ? "rgba(236,230,216,.08)" : "rgba(236,230,216,.035)"; g.lineWidth = v === 0 ? 1.2 : 1; g.beginPath(); g.moveTo(L.ax, y); g.lineTo(W - 16, y); g.stroke();
    if (major) { g.shadowColor = "#05080d"; g.shadowBlur = 6; g.fillText(v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v/1e6) + "M", L.ax - 8, y + 4); g.shadowBlur = 0; } }
  if (!window.NOTITLE) { g.textAlign = "left"; g.fillStyle = "#ece6d8"; g.font = `400 ${L.nar ? 19 : 26}px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif`; g.fillText(L.nar ? "Net international migration to the US" : "Net international migration to the United States", L.nar ? 16 : L.ax, L.yt - 52);
  if (!L.nar) { g.save(); g.font = "500 10.5px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#f2b950"; if ("letterSpacing" in g) g.letterSpacing = "2px"; g.fillText(KICK.line.toUpperCase(), L.ax, L.yt - 86); g.restore(); }
  g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#a7b0bf"; g.fillText(L.nar ? "People per year · Census Bureau" : "People per year, arrivals minus departures · Census Bureau, years ending 1 July", L.nar ? 16 : L.ax, L.yt - 30); }   // NOTITLE: recordings for the slides, where the slide carries the title
  g.textAlign = "center"; for (let y = NY0; y <= 2026; y++) { if (L.nar && LC.span > 20 ? ((y % 5 || y === 2025) && y !== 2026) : (LC.span > 20 || (L.nar && LC.span > 10)) && y % 2 && y !== 2025) continue; const X = L.X(y); if (X < L.ax || X > W - 10) continue; g.fillStyle = y >= 2020 ? "#ff5a40" : "#66738a"; g.fillRect(X, L.yb + 10, 1, 5); g.fillText(String(y), X, L.yb + 30); }
  const x1 = s.pen, step = LC.span/420, xe = LC.x - LC.span*.66, XJ = NY0 + .9, xs = Math.min(xe, NY0 - .2); g.lineCap = "round";
  if (s.op < .99) for (const st of STR) { const reach = s.strands >= 1 ? 1 : ease(clamp((s.strands*1.9 - st.dl*.9)/1)), xEnd = s.pen > NY0 + .01 ? x1 : lerp(xs, NY0, reach); if (xEnd <= xs + 1e-3) continue; g.beginPath(); let pen = false;
    for (let x = Math.max(xs, LC.x - LC.span*.7); x <= xEnd + 1e-6; x += step) { const xx = Math.min(x, xEnd);
      let o = 13*(st.b + st.a*.6*Math.sin(xx*st.f + st.ph + now/2300*(.5 + st.a*.4))*Math.sin(xx*st.f2 + st.ph2 - now/3700)), Y = L.Y(nimAt(Math.max(xx, NY0))) + o;
      if (xx < XJ) { const k = clamp((xx - xs)/(XJ - xs)), j = k*k*(3 - 2*k); Y = lerp(H*.5 + st.e*H*.44 + 24*Math.sin(now/2600 + st.ph + xx*.8), Y, j); }
      const X = L.X(xx); pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; }
    g.strokeStyle = st.c; g.globalAlpha = Math.max(s.chart, s.strands)*st.al*.95*(1 - s.op); g.lineWidth = st.w; g.setLineDash([]); g.stroke();
    // 2026: past the last measured year the same hair keeps going, into one of the published projections
    if (s.fan > .01 && xEnd >= 2025 - 1e-6 && st.pv != null) { const xF = 2025 + s.fan, X0 = L.X(2025), X1 = L.X(2026); g.beginPath();
      for (let xx = 2025; xx <= xF + 1e-6; xx += Math.min(step, .02)) { const t = clamp(xx - 2025), sm = t*t*(3 - 2*t), o = 13*(st.b + st.a*.6*Math.sin(xx*st.f + st.ph + now/2300*(.5 + st.a*.4))*Math.sin(xx*st.f2 + st.ph2 - now/3700))*(1 - (st.pk ? .9 : .6)*sm);
        const X = L.X(xx), Y = L.Y(lerp(NV[NV.length - 1], st.pv, sm)) + o; xx === 2025 ? g.moveTo(X, Y) : g.lineTo(X, Y); }
      const gr = g.createLinearGradient(X0, 0, X1, 0); gr.addColorStop(0, st.c); gr.addColorStop(1, st.pk ? "#f2b950" : "#9dd3ee"); g.strokeStyle = gr; g.globalAlpha *= st.pk ? .95 : .8; g.stroke(); } }
  g.globalAlpha = s.chart;
  g.setLineDash([]); g.globalAlpha = a;
  // the line is made of people: it opens into dots, 1 dot = 1,000 people, none touching
  if (s.op > .01) { const ppy = L.ppy(), r = Math.max(.8, DMIN*ppy*.4), by = new Map(), x0v = LC.x - LC.span*.7, x1v = LC.x + LC.span*.7;
    for (const d of DOTS) { if (d.x < x0v || d.x > x1v || (s.fly > 0 && d.to)) continue; const X = L.X(d.x), Y = L.Y(nimAt(d.x)) + d.v*ppy*s.op*VSQ; if (Y < -10 || Y > H + 10) continue; if (!by.has(d.c)) by.set(d.c, new Path2D()); const pth = by.get(d.c); pth.moveTo(X + r, Y); pth.arc(X, Y, r, 0, 6.283); }
    g.globalAlpha = a*s.op*(1 - s.flyOut); for (const [c, pth] of by) { g.fillStyle = c; g.fill(pth); } g.globalAlpha = a; }
  // 2026: the published projections, as strands coming loose
  if (s.fan > .01 && s.op < .99) { g.globalAlpha = a*(1 - s.op); const X1 = L.X(2026);
    g.setLineDash([]); g.globalAlpha = a*clamp((s.fan - .6)/.4)*(1 - s.op); g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; const R0 = L.nar ? "right" : "left", dx = L.nar ? -8 : 12; g.textAlign = R0; g.shadowColor = "#05080d"; g.shadowBlur = 6;
    const ce = PROJ.find(p => /Census/.test(p.src)), cb = PROJ.find(p => /Budget/.test(p.src)), br = PROJ.find(p => p.lo !== p.hi);
    const lab = (v, t, c) => { const Y = L.Y(v); g.fillStyle = c; g.beginPath(); g.arc(X1, Y, 2.6, 0, 6.283); g.fill(); g.fillText(t, X1 + dx, Y + 4); };
    if (cb) lab(cb.lo, L.nar ? "CBO" : `CBO  +${Math.round(cb.lo/1e3)}k (calendar year)`, "#f2b950"); if (ce) lab(ce.lo, L.nar ? "Census" : `Census Bureau  +${Math.round(ce.lo/1e3)}k`, "#f2b950");
    if (br) { const ya = L.Y(br.hi), yb = L.Y(br.lo); g.strokeStyle = "rgba(157,211,238,.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(X1 + 4, ya); g.lineTo(X1 + 4, yb); g.stroke(); g.fillStyle = "#9dd3ee"; g.fillText(L.nar ? "Brookings" : `Brookings/AEI  ${fmt(br.lo)} to +${Math.round(br.hi/1e3)}k`, X1 + dx, (ya + yb)/2); if (!L.nar) { g.fillStyle = "#66738a"; g.fillText("(scenarios)", X1 + dx, (ya + yb)/2 + 15); } }
    g.textAlign = "left"; g.fillStyle = "#66738a"; g.globalAlpha = a*clamp((s.fan - .6)/.4)*(1 - s.op); g.fillText("2026 · projected", X1 - 30, L.Y(L.vhi) - 6); g.shadowBlur = 0; }
  // the events: shiny spots on the line; the one before the chart begins sits at its edge
  SPOTS.length = 0; g.globalAlpha = a*(1 - s.op);
  for (const e of D.events) { const LAST = NY0 + NV.length - 1, late = e.t > LAST && x1 >= LAST - .001; if (e.t > x1 && !late) continue;   // one before the series sits at its start, one after it at its end
    const early = e.t < NY0, X = early ? Math.max(L.ax + 10, L.X(NY0) + 8) : late ? L.X(LAST) + 14 : L.X(e.t), Y = early ? L.Y(NV[0]) - 40 : late ? L.Y(nimAt(LAST)) - 46 : L.Y(nimAt(e.t)), tw = .8 + .2*Math.sin(now/520 + e.t*7), hot = e === HOVE, R = (hot ? 24 : 16)*tw, pol = e.kind === "policy";
    const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, pol ? "rgba(255,226,170,.92)" : "rgba(214,229,250,.75)"); gr.addColorStop(.3, pol ? "rgba(242,185,80,.38)" : "rgba(127,192,220,.26)"); gr.addColorStop(1, "rgba(242,185,80,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R, 0, 6.283); g.fill(); g.globalCompositeOperation = "source-over"; g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(X, Y, 2.1, 0, 6.283); g.fill();
    if (early) { g.font = "10.5px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#f2b950"; g.textAlign = "left"; g.fillText("May 2002, before this series", X + 14, Y + 4); } if (late) { g.font = "10.5px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#f2b950"; g.textAlign = "left"; g.fillText("Sept 2025, after this series", X + 14, Y + 4); }
    const age = (x1 - Math.max(NY0, e.t))*1.6; if (s.pen < 2025 && age >= 0 && age < 1) { g.strokeStyle = `rgba(242,185,80,${1 - age})`; g.lineWidth = 1; g.beginPath(); g.arc(X, Y, 4 + age*26, 0, 6.283); g.stroke(); }
    if (s.op < .5 && X > 0 && X < W) SPOTS.push([X, Y, e]); }
  if (s.spotsHint > .01 && !window.NOTITLE) { g.globalAlpha = a*s.spotsHint; g.font = "11px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; g.fillStyle = "#f2b950"; g.textAlign = "left"; g.fillText(L.nar ? "✦ tap a glowing spot" : "✦ click a glowing spot to see what was done, and where", L.nar ? 16 : L.ax, L.yt - 10); }
  g.restore(); }

// the line's people: every year as dots, 1 dot = 1,000 people, scattered around the line by dart-throwing so no two touch (year units, as before);
// the 2024 and 2025 dots each belong to a county, weighted by where the Census counted them
const DOT = 1000, DMIN = .0095, SIG = .075, VSQ = .62, DOTS = [], CROWD = [];
{ sd = 21; const grid = new Map(), cell = DMIN, near = (x, y) => { const gx = Math.floor(x/cell), gy = Math.floor(y/cell); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const b = grid.get((gx + i) + "," + (gy + j)); if (b) for (const [u, v] of b) if ((u - x)**2 + (v - y)**2 < DMIN*DMIN) return true; } return false; };
  const put = (x, y) => { const k = Math.floor(x/cell) + "," + Math.floor(y/cell); (grid.get(k) || grid.set(k, []).get(k)).push([x, y]); }, fam = TFAM[0];
  NV.forEach((nv, yi) => { const yr = NY0 + yi, a0 = Math.max(NY0, yr - .5), a1 = Math.min(2025, yr + .5), n = Math.round(Math.max(0, nv)/DOT); let pick = null;
    if (yr >= 2024) { const ni = D.years.indexOf(String(yr)), w = D.counties.map(c => Math.max(0, c[2][ni])), cum = []; let t = 0; for (const v of w) cum.push(t += v); pick = () => { const r = rnd()*t; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return D.counties[lo]; }; }
    for (let i = 0; i < n; i++) { let x, v, spread = 1; for (let tr = 0; tr < 400; tr++) { x = a0 + rnd()*(a1 - a0); v = gauss()*SIG*spread; if (!near(x, v)) break; if (tr % 40 === 39) spread *= 1.15; }
      put(x, v); const d = {x, v, c: fam[Math.floor(rnd()*fam.length)], yr}; if (pick) { const c = pick(); d.to = v3(c[0] + gauss()*.12, c[1] + gauss()*.09); d.d = rnd()*.35; CROWD.push(d); } DOTS.push(d); } }); }
function drawCrowd(s) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); if (s.fly < .001 || s.cens < .01) return; const by = new Map(), ppy = L.ppy(), r0 = Math.max(.8, DMIN*ppy*.4);
  for (const d of CROWD) { const cx = L.X(d.x), cy = L.Y(nimAt(d.x)) + d.v*ppy*VSQ, u = ease(clamp((s.fly - d.d)/.65)), q = proj(d.to), x = lerp(cx, q[0], u), y = lerp(cy, q[1], u), r = lerp(r0, 1.15, u)*DPR;
    if (!by.has(d.c)) by.set(d.c, new Path2D()); const p = by.get(d.c); p.moveTo(x*DPR + r, y*DPR); p.arc(x*DPR, y*DPR, r, 0, 6.283); }
  fx.globalAlpha = s.cens; for (const [c, p] of by) { fx.fillStyle = c; fx.fill(p); } fx.globalAlpha = 1; }

// =================================================================== the film: phases, then the world
// the continental US, fitted between the heading and the legend (as in the presentation)
const US_EDGE = [[-124.7,48.4],[-124.2,43],[-124.4,40.4],[-120.6,34.5],[-117.1,32.5],[-111,31.3],[-106.5,31.8],[-103,29],[-97.4,25.8],[-94,29.6],[-89.6,29.2],[-85,29.7],[-82.7,27.5],[-80.2,25.1],[-80,26.9],[-81,30.5],[-75.5,35.2],[-76,38],[-74,40.5],[-70,41.7],[-70.6,43],[-67,44.8],[-69.2,47.4],[-75,45],[-83,46],[-89,48],[-95,49],[-122,49]];
// outlines are smoothed by corner cutting (Chaikin, twice), so coasts read as curves rather than straight polygon segments
const chaikin = (r, n = 2) => { let a = r; const closed = r.length > 3 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]; if (closed) a = r.slice(0, -1);
  for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < a.length - (closed ? 0 : 1); i++) { const [x0, y0] = a[i], [x1, y1] = a[(i + 1) % a.length]; o.push([x0*.75 + x1*.25, y0*.75 + y1*.25], [x0*.25 + x1*.75, y0*.25 + y1*.75]); } if (!closed) { o.unshift(a[0]); o.push(a[a.length - 1]); } a = o; }
  if (closed) a.push(a[0]); return a; };
const SMOOTH = new Map(), smooth = rings => window.GEO ? rings : (SMOOTH.has(rings) || SMOOTH.set(rings, rings.map(r => chaikin(r))), SMOOTH.get(rings));   // the 1:500,000 outlines are drawn as they are
// zoom to one state: fit its outline, leaving room for its card
function stateCam(k) { const rs = ST.r[k]; let big = rs[0], ba = 0; for (const r of rs) { let a = 0; for (let i = 1; i < r.length; i++) a += r[i - 1][0]*r[i][1] - r[i][0]*r[i - 1][1]; if (Math.abs(a) > ba) { ba = Math.abs(a); big = r; } }
  const [lon0, lat0] = ST.c[k], L0 = lon0*D2R, B0 = lat0*D2R, cl = Math.cos(L0), sl = Math.sin(L0), cb = Math.cos(B0), sb = Math.sin(B0); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const r of rs) { if (r !== big && r.length < 8) continue; for (const [lo, la] of r) { const p = v3(lo, la), x = cl*p[0] - sl*p[2], y = -sl*sb*p[0] + cb*p[1] - cl*sb*p[2]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  const ph = W < 760, L = ph ? 16 : 300, Rr = ph ? 16 : 420, T = ph ? 250 : 130, B = ph ? 150 : 110, R = Math.min((W - L - Rr)/(x1 - x0), (H - T - B)/(y1 - y0))*.9;
  return {lon: lon0, lat: lat0, R, cx: L + (W - L - Rr)/2 - (x0 + x1)/2*R, cy: T + (H - T - B)/2 + (y0 + y1)/2*R}; }
function usCam(top, bot) { const lon0 = -96.5, lat0 = 38.2, L0 = lon0*D2R, B0 = lat0*D2R; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [lo, la] of US_EDGE) { const p = v3(lo, la), cl = Math.cos(L0), sl = Math.sin(L0), cb = Math.cos(B0), sb = Math.sin(B0), x = cl*p[0] - sl*p[2], y = -sl*sb*p[0] + cb*p[1] - cl*sb*p[2]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const side = W < 760 ? 12 : 40, R = Math.min((W - 2*side)/(x1 - x0), (H - top - bot)/(y1 - y0)); return {lon: lon0, lat: lat0, R, cx: W/2 - (x0 + x1)/2*R, cy: top + (H - top - bot)/2 + (y0 + y1)/2*R}; }
const CAMS = {world: () => MODE === "explore" ? (W < 760 ? {lon: CAM.lon, lat: 22, R: W*.32, cx: W*.46, cy: H*.47} : {lon: CAM.lon, lat: 22, R: Math.min(W*.24, (H - 170)*.31), cx: W*.47, cy: H*.58}) : {lon: -30, lat: 22, R: Math.min(W*.36, (H - 230)*.5), cx: W/2, cy: H/2 - 22},
  us: () => MODE === "explore" ? usCam(W < 760 ? 150 : 140, W < 760 ? 220 : 175) : usCam(90, 130),
  evt: e => ({lon: e.rot[0], lat: e.rot[1], R: Math.max(W, H)*(e.all ? .42 : .56), cx: W/2, cy: H/2})};
// a flight: when two close views are far apart, the camera rises, crosses, and comes down
const camMix = (a, b, u) => { const dl = ((b.lon - a.lon + 540) % 360) - 180, th = angle(v3(a.lon, a.lat), v3(b.lon, b.lat)), la = Math.log(a.R), lb = Math.log(b.R), rm = Math.log(Math.max(1, (W || 1000)*.42/Math.max(th, 1e-4))), D = Math.max(0, Math.min(la, lb) - rm);
  const m = D > 0 ? (t => t*t*(3 - 2*t))(clamp((u - .18)/.64)) : u; return {lon: a.lon + dl*m, lat: lerp(a.lat, b.lat, m), R: Math.exp(lerp(la, lb, u) - D*Math.sin(PI*u)), cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u)}; };
const CAP = {crowd: `Every dot represents <b>1,000 people</b>: net international migration in the years ending 1 July 2024 and 2025.`,
  county: `Each dot lands in the county where the Census counted it. On the map that follows, 1 dot = 50 people.`,
  note: `The census does not track country of origin, but visas do.`,
  visa: `Visas issued, FY2024 · every dot represents <b>50 visas</b>, traced from where they entered back to the country they came from.`,
  rem: `Red: removals that began with an ICE arrest, FY2025 · every dot represents <b>50 removals</b>, from the state of arrest to the country sent to. Not national totals.`};
// each phase: duration (never shorter than its words take to read), and the state it moves through
const PH = [
  {id: "intro", dur: 4}, {id: "pen", dur: PEN_T + .6}, {id: "fan", dur: 8}, {id: "crowd", dur: Math.max(4 + readSec(CAP.crowd), 9.5)},
  {id: "fly", dur: Math.max(4.2 + readSec(CAP.county), 7.5)}, {id: "note", dur: Math.max(2.2 + readSec(CAP.note), 6.5)}, {id: "trace", dur: Math.max(6.5, readSec(CAP.visa) + 1)}, {id: "rem", dur: Math.max(5.5, readSec(CAP.rem))}, {id: "explore", dur: 1e9}];
let PI_ = 0, T = 0, PLAY = true, YI = YEARS.indexOf(2024), MODE = "film", EVT = null, USV = false;
function filmState(i, t) { const id = PH[i].id, s = {strands: 0, chart: 1, pen: NY0, fan: 0, op: 0, yo: 0, flyOut: 0, lc: FOLLOW(NY0), fly: 0, cens: 1, globe: 0, cam: CAMS.us(), visA: 0, tr: 0, remA: 0, rtr: 0, spotsHint: 0};
  const after = k => PH.findIndex(p => p.id === k) < i;
  if (id === "intro") { s.strands = clamp(t/2.8); s.chart = ease(clamp((t - 2)/1.6)); }
  if (after("intro")) { s.chart = 1; s.strands = 1; }
  if (id === "pen") { s.pen = penX(t); s.lc = FOLLOW(s.pen); s.spotsHint = clamp((t - 3)/1)*clamp((PEN_T - t)/1); } if (after("pen")) { s.pen = 2025; s.lc = FOLLOW(2025); }
  if (id === "fan") { s.fan = ease(clamp(t/2.6)); s.lc = lcMix(FOLLOW(2025), WHOLE(), ease(clamp((t - 2.9)/2.6))); } if (after("fan")) { s.fan = 1; s.lc = WHOLE(); }
  if (id === "crowd") { const u = ease(clamp((t - .2)/2.8)); s.lc = lcMix(WHOLE(), DIVE, u); s.yo = u; s.op = ease(clamp((t - 1.5)/2.4)); } if (after("crowd")) { s.lc = DIVE; s.yo = 1; s.op = 1; }
  if (id === "fly" || after("fly")) { s.lc = DIVE; s.yo = 1; s.op = 1; }
  if (id === "fly") { s.fly = clamp((t - .2)/3.6); s.flyOut = ease(clamp(t/1.2)); s.globe = ease(clamp((t - .6)/1.8)); s.chart = 1 - ease(clamp((t - .3)/1.2)); }
  if (after("fly")) { s.globe = 1; s.fly = 1; s.flyOut = 1; s.chart = 0; }
  if (id === "note") { s.cens = 1 - ease(clamp((t - 1.6)/1.4)); s.visA = ease(clamp((t - 1.8)/1.4)); } if (after("note")) { s.cens = 0; s.visA = 1; }
  if (id === "trace") { const u = ease(clamp(t/4.2)); s.cam = camMix(CAMS.us(), CAMS.world(), u); s.tr = clamp(t/4.6)*1.6; } if (after("trace")) { s.cam = CAMS.world(); s.tr = 2; }
  if (id === "rem") { s.remA = ease(clamp(t/.8)); s.rtr = clamp((t - .3)/4)*1.6; } if (after("rem")) { s.remA = 1; s.rtr = 2; }
  return s; }
function caption(html) { const c = $("cap"); if (c.dataset.h !== html) { c.dataset.h = html; c.style.opacity = 0; setTimeout(() => { c.innerHTML = html; c.style.opacity = html ? 1 : 0; }, 250); } }
function note(text) { const n = $("note"); if (n.dataset.h !== text) { n.dataset.h = text; n.textContent = text; n.style.opacity = text ? 1 : 0; } }
function chap() { const cur = MODE === "film" ? (PI_ < 4 ? "line" : "world") : VIEW; for (const b of $("nav").querySelectorAll("button")) b.toggleAttribute("aria-current", false), b.dataset.c === cur && b.setAttribute("aria-current", "step"); }
// ================================================================ explore: the line, the world, the US
let VIEW = "world", EY = 2024; const LAY = {visa: true, lines: true, lpr: true, rem: true, cens: true, det: true, lprus: true, cjob: true, cst: true, ch1: true, cvis: true, pop: true};
const EYEARS = Array.from({length: 16}, (_, i) => 2011 + i);
const vI = y => YEARS.indexOf(y), cI = y => D.years.indexOf(String(y)), dI = y => D2.det.years.indexOf(y), LPR_Y = 2024;
const LPRT = D2.lpr.reduce((a, f) => a + f[3], 0), LPRC = new Map(); for (const f of D2.lpr) LPRC.set(f[0], (LPRC.get(f[0]) || 0) + f[3]);
// green cards FY2024, 1 dot = 50: each from its county (where the person lives) to a cloud in the country of birth (DHS, 200 busiest counties)
const GREENS = ["#34d27b", "#5fe39a", "#22b863", "#8ff0b8"]; let LPRB = null, LPRL = null;
function lprBufs() { if (LPRB) return; const a = [], l = []; sd = 4242; const mx = Math.max(...D2.lpr.map(f => f[3])); let cnt = 0;
  for (const [n, lon, lat, v] of [...D2.lpr].sort((p, q) => q[3] - p[3])) { const ci = C.findIndex(c => c.n === n); if (ci < 0) continue; const c = C[ci]; let m = Math.floor(v/DUNIT) + (rnd() < (v/DUNIT) % 1 ? 1 : 0);
    while (m-- > 0) pushDot(a, v3(...cloudPt(c)), v3(lon + gauss()*.12, lat + gauss()*.09), hex(GREENS[Math.floor(rnd()*GREENS.length)]), ci, 6, rnd()*.5);
    if (cnt++ < 220) { const nl = 1 + Math.round(8*Math.sqrt(v/mx)); for (let k = 0; k < nl; k++) { const from = v3(lon + gauss()*.25, lat + gauss()*.2), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.9); strand(l, from, to, ARC_HI(angle(from, to))*(.8 + rnd()*.4), hex("#3ddc84"), rnd()*.45, 48, ci, 6); } } }
  LPRB = dotBuf(new Float32Array(a)); LPRL = lnBuf(new Float32Array(l)); }
// the same green cards for the US view: each dot stays in its county, and knows its state
let LPRBUS = null; function lprUS() { if (LPRBUS) return LPRBUS; const a = []; sd = 4243; D2.lpr.forEach(([n, lon, lat, v], i) => { let m = Math.floor(v/DUNIT) + (rnd() < (v/DUNIT) % 1 ? 1 : 0); while (m-- > 0) { const p = v3(lon + gauss()*.12, lat + gauss()*.09); pushDot(a, p, p, hex(GREENS[Math.floor(rnd()*GREENS.length)]), ST.ls[i], 6, 0); } }); return LPRBUS = dotBuf(new Float32Array(a)); }
// ICE detention, average daily population by facility, FY2019-FY2026 (2026 to 20 July): 1 dot = 50 people (the same unit as every other dot), each facility's dots kept in place from year to year
const REDS = ["#ff2d2d", "#ff4a36", "#e8243c", "#ff6a4d", "#d4163c", "#ff3b3b", "#ff5a40", "#c8102e"], DETP = [], DETB = {};
{ sd = 991; D2.det.f.forEach(([lon, lat, adp], fi) => { const mx = Math.round(Math.max(...adp)/DUNIT), sg = .05 + .02*Math.sqrt(mx), c0 = v3(lon, lat), pts = [];
  for (let j = 0; j < mx; j++) pts.push(v3(lon + gauss()*sg/Math.cos(lat*D2R), lat + gauss()*sg)); pts.sort((a, b) => angle(a, c0) - angle(b, c0));
  pts.forEach((p, j) => DETP.push({f: fi, j, p, o: c0, c: hex(REDS[Math.floor(rnd()*REDS.length)])})); }); }
function detFor(y) { const k = dI(y); if (k < 0) return null; if (DETB[y]) return DETB[y]; const a = []; for (const d of DETP) if (d.j < Math.round(D2.det.f[d.f][2][k]/DUNIT)) pushDot(a, d.p, d.p, d.c, ST.ds[d.f], 7, 0); return DETB[y] = dotBuf(new Float32Array(a)); }
const LAYT = [1, 1, 1, 1, 1, 1]; let SEL = null, SELS = null, HOVS = null, HOVK = null, LITKEY = "", CARD = null;
function usLit() { const key = "u" + (SELS ?? "-"); if (key === LITKEY) return; LITKEY = key; for (let i = 0; i < 256; i++) LIT[i*4] = SELS == null || i === SELS ? 255 : 100; for (let t = 0; t < 10; t++) LIT[(256 + t)*4] = 255; pushLit(); }
function worldLit() { const h = HK(), key = "w" + (SEL ?? "-") + LAYT.join("") + (h ?? "-"); if (key === LITKEY) return; LITKEY = key; const gh = h && h[0] === "g" ? VG[+h.slice(1)][1] : null;
  for (let i = 0; i < 256; i++) LIT[i*4] = SEL == null || i === SEL || i === 255 ? 255 : 100; for (let t = 0; t < 10; t++) LIT[(256 + t)*4] = t < 6 ? (LAYT[t] ? (h == null || (gh && gh.includes(t)) ? 255 : 100) : 0) : 255; pushLit(); }
const DOTLEG = (c, n) => `<canvas width="104" height="60" data-c="${c}" aria-hidden="true"></canvas><span style="color:${c}">${n}</span>`;
let HILITE = null; const layerOn = k => k == null ? false : k[0] === "g" && k.length === 2 ? VG[+k[1]][1].some(t => LAYT[t]) : !!LAY[k];
const HK = () => HILITE != null && layerOn(HILITE) ? HILITE : null, hl = k => { const h = HK(); return h == null || h === k ? 1 : .04; };
function legend() { const el = $("legend"); if (VIEW === "line") { el.hidden = true; return; } el.hidden = false; el.classList.add("side"); const y = EY;
  const foc = document.activeElement && $("legend").contains(document.activeElement) ? document.activeElement.dataset.h : null;
  const dot = c => `<i style="background:${c}"></i>`, arc = (hk, c) => `<svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true" style="overflow:visible"><path d="M1 9.5 Q9 ${hk ? (9.5 - 17*hk/(HKG*.5)).toFixed(1) : 8.2} 17 9.5" fill="none" stroke="${c}" stroke-width="1.1"/></svg>`;
  const it = (at, key, on, sw, c, label, note) => `<button type="button" class="it${on ? "" : " off"}${HILITE === key ? " hl" : ""}" ${at} data-h="${key}" aria-pressed="${!!on}">${sw}<span style="color:${c}">${label}</span>${note ? `<em>${note}</em>` : ""}</button>`;
  const unit = t => `<div class="u"><i></i>${t}</div>`;
  if (VIEW === "world") { const hv = vI(y) >= 0, hl2 = lprYear(y) != null, hr = !!D.rem.years[y], hd = dI(y) >= 0;
    el.innerHTML = VG.map(([n, ts, c], gi) => it(`data-g="${gi}"`, "g" + gi, ts.some(t => LAYT[t]), arc(HKJ[gi]*.5, LCOL[ts[0]]), gi === 0 ? "#7fc0dc" : c, n, hv ? "" : "–")).join("") +
      it('data-k="lpr"', "lpr", LAY.lpr, arc(HKG*.5, "#3ddc84"), GREENS[0], "Green cards", hl2 ? "" : "2011–24") + it('data-k="rem"', "rem", LAY.rem, arc(0, RED), "#ff7a62", "ICE removals", hr ? "" : "2022–25") +
      it('data-k="det"', "det", LAY.det, dot(RED), "#ff7a62", "Held by ICE", hd ? "" : "2019–26") + unit(`1 dot = ${DUNIT}`); }
  else if (VIEW === "city" && CITYK) { const C0 = CITIES[CITYK], ok = y >= 2019 && y <= 2025;
    el.innerHTML = it('data-k="cst"', "cst", LAY.cst, dot("#f2e640"), "#f2e640", "Students from abroad", ok ? "" : "2019–25") + it('data-k="ch1"', "ch1", LAY.ch1, dot("#ff45c5"), "#ff45c5", "H-1B approvals", ok ? "" : "2019–25") +
      it('data-k="cvis"', "cvis", LAY.cvis, dot("#7fc0dc"), "#7fc0dc", CITYK === "la" ? "Visitors" : "Arrivals, Logan", "×1,000") + it('data-k="cjob"', "cjob", LAY.cjob, dot("#4a8ea8"), "#8fb8cc", "Jobs", "×" + C0.jpd) +
      unit("1 dot = 1 person") +
      `<div class="wo"><button type="button" class="b2 back" data-back="1">← Both cities</button><button type="button" class="b2 back" data-fly="${CITYK === "la" ? "bos" : "la"}">${CITYK === "la" ? "Boston" : "Los Angeles"} →</button></div>`; }
  else { const hc = cI(y) >= 0, hd = dI(y) >= 0, hl2 = y === LPR_Y;
    el.innerHTML = it('data-k="pop"', "pop", LAY.pop, dot("#e9e4d8"), "#e9e4d8", "Residents", "×" + POPU.toLocaleString("en-US")) + it('data-k="cens"', "cens", LAY.cens, dot(BLUES[0]), "#7fc0dc", "Arrived since 2011, net", hc ? "" : "–") + it('data-k="lprus"', "lprus", LAY.lprus, dot(GREENS[0]), GREENS[0], "New green cards", hl2 ? "" : "2024") +
      it('data-k="det"', "det", LAY.det, dot(RED), "#ff7a62", "Held by ICE", hd ? "" : "2019–26") + unit(`1 dot = ${DUNIT} people`); }
  if (foc) { const b = el.querySelector(`[data-h="${foc}"]`); if (b) b.focus({preventScroll: true}); } }
$("legend").addEventListener("pointerover", e => { const b = e.target.closest(".it"); const k = b ? b.dataset.h : null; if (k !== HILITE) { HILITE = k; LITKEY = ""; for (const x of $("legend").querySelectorAll(".it")) x.classList.toggle("hl", x.dataset.h === k); } });
$("legend").addEventListener("pointerleave", () => { if (HILITE != null) { HILITE = null; LITKEY = ""; for (const x of $("legend").querySelectorAll(".it")) x.classList.remove("hl"); } });
$("legend").addEventListener("focusin", e => { const b = e.target.closest(".it"); HILITE = b ? b.dataset.h : null; LITKEY = ""; });
$("legend").addEventListener("focusout", e => { if (e.relatedTarget && $("legend").contains(e.relatedTarget)) return; HILITE = null; LITKEY = ""; });
$("legend").addEventListener("click", e => { if (e.target.closest("[data-back]")) { selectCity(null); return; } const fl = e.target.closest("[data-fly]"); if (fl) { selectCity(fl.dataset.fly); return; } const b = e.target.closest(".it"); if (!b) return; if (b.dataset.g) { const ts = VG[+b.dataset.g][1], on = !ts.some(t => LAYT[t]); ts.forEach(t => LAYT[t] = on ? 1 : 0); } else LAY[b.dataset.k] = !LAY[b.dataset.k]; LAY.visa = LAYT.some(Boolean); HILITE = null; LITKEY = ""; legend(); });
function totals() { const y = EY, rows = []; $("yr").textContent = y;
  if (VIEW === "line") { const i = y - NY0; rows.push(i >= 0 && i < NV.length ? `<b>${fmt(NV[i])}</b> net international migration` : "projected: see the line"); }
  if (VIEW === "world") { const k = vI(y); if (k >= 0) rows.push(`<b>${fmt(D.niv[k])}</b> visas issued`); if (lprYear(y) != null) rows.push(`<b style="color:#34d27b">${fmt(lprYear(y))}</b> green cards`); const L2 = D.rem.years[y]; if (L2) rows.push(`<b style="color:#ff5a40">${fmt(L2.reduce((a, r) => a + r[2], 0))}</b> ICE removals (after an ICE arrest)`); }
  if (VIEW === "city" && CITYK) { const t = cityBuild(CITYK).tot[CYEARS.indexOf(y)]; if (t) { rows.push(`<b style="color:#f2e640">${fmt3(t.st)}</b> international students${t.sy < y ? ` (fall ${t.sy})` : ""}`, `<b style="color:#ff45c5">${fmt3(t.h1)}</b> H-1B approvals`); for (const [n, v, arr] of t.vis) rows.push(v == null ? `<span style="color:var(--ink3)">${n}: no ${y} count</span>` : `<b style="color:#7fc0dc">${fmt3(v)}</b> ${arr ? "arrivals at" : "visitors in"} ${n}`); } else rows.push("city counts cover 2019–2025"); }
  else if (USV) { const i = y - NY0; if (VIEW === "us") rows.push(`<b style="color:#e9e4d8">${fmt(RESIDENTS)}</b> residents, July 2024`); const ci2 = cI(y); if (ci2 >= 0) rows.push(`<b>${fmt(CUMN[ci2])}</b> net arrivals since 2011`); if (y === LPR_Y) rows.push(`<b style="color:#34d27b">${fmt(LPRT)}</b> green cards, 200 busiest counties`); const k = dI(y); if (k >= 0) rows.push(`<b style="color:#ff5a40">${fmt(D2.det.tot[k])}</b> in ICE detention, average day${y === 2026 ? " (FY2026 to 20 July)" : ""}`); }
  $("tot").innerHTML = rows.join("<br>"); }
function yearsBar() { const el = $("years"); el.hidden = MODE !== "explore" || VIEW === "line"; const [ya, yb] = yRange(); if ($("yrng") && YRK !== ya + "-" + yb) el.innerHTML = ""; YRK = ya + "-" + yb; if (!$("yrng")) { el.innerHTML = `<button type="button" class="play" id="yplay">Play</button><div class="sl"><input type="range" id="yrng" min="${ya}" max="${yb}" step="1" aria-label="Year"><div class="tk">${EYEARS.filter(y => y >= ya && y <= yb).map(y => `<span data-y="${y}">${y}</span>`).join("")}</div></div>`;
    $("yrng").addEventListener("input", e => { stopPlay(); setYear(+e.target.value); }); $("yplay").onclick = () => { if (YPLAY) stopPlay(); else play(EY >= playEnd() ? playStart() : EY, playEnd()); }; }
  $("yrng").value = EY; $("yplay").textContent = YPLAY ? "Pause" : "Play"; for (const t of el.querySelectorAll(".tk span")) { const y = +t.dataset.y; t.classList.toggle("on", y === EY); t.textContent = W < 760 ? (y === EY || (y % 5 === 0 && Math.abs(y - EY) > 1) ? "’" + String(y).slice(2) : "") : y; } }
function setYear(y) { EY = clamp(y, EYEARS[0], EYEARS[EYEARS.length - 1]); if (EY - YB0 !== YB) { YA = YB; YB = EY - YB0; YT = 0; } YI = clamp(vI(Math.min(EY, 2025)), 0, YEARS.length - 1); legend(); totals(); yearsBar(); selCard(); cityHead(); }
let YPLAY = null, NOGROW = false, YRK = "";
const yRange = () => VIEW === "city" && CITYK ? [2019, 2025] : VIEW === "world" ? [2011, 2025] : [2011, 2026];
const playStart = () => VIEW === "city" && CITYK ? 2019 : 2011, playEnd = () => VIEW === "city" && CITYK ? 2025 : VIEW === "world" ? 2025 : 2024;
function stopPlay() { if (YPLAY) { clearInterval(YPLAY); YPLAY = null; if ($("yplay")) $("yplay").textContent = "Play"; } }
function play(from, to) { stopPlay(); setYear(from); YPLAY = setInterval(() => { if (EY >= to) { stopPlay(); return; } setYear(EY + 1); }, 1000); yearsBar(); }
let camT = null; const tweenCam = (to, ms = 1600) => { camT = {t0: performance.now(), ms, a: {...CAM}, b: to}; };
const KICK = {line: "01 · A country of immigrants", world: "02 · The door opens and shuts", us: "03 · Where they land", city: "04 · What they bring"};
const HEADS = {line: ["Net international migration, 2001–2026", "Census Bureau; 2026 is the range of published projections. Hover the line for a year; click a glowing spot for what was done."],
  world: ["Who comes, who is sent back", "Visas, green cards and removals, by country. Click a country for its numbers."],
  us: ["Across the country", "White dots are everyone who lives there; the colored dots are people from abroad. Drag the line to compare, click a state or a city ring."], city: ["Two cities, with and without them", "Click Los Angeles or Boston."]};
// the cities: Los Angeles and Boston, each its own page carried inside this one
const CITYPT = [["la", "Los Angeles", -118.33, 34.04], ["bos", "Boston", -71.08, 42.35]];
function spotAt(x, y) { if (VIEW !== "city" || !CITYK) return null; const P = cityBuild(CITYK), ti = CYEARS.indexOf(EY); let best = null, bd = 1e9; for (const sp of P.spots) { if (ti >= 0 && sp.e.c[ti] === 0) continue; const q = proj(v3(sp.e.lon, sp.e.lat)), r = Math.max(14, sp.sk/6371*CAM.R*1.4), d = Math.hypot(q[0] - x, q[1] - y)/r; if (d < 1 && d < bd) { bd = d; best = sp; } } return best; }
function spotTip(sp) { const ti = CYEARS.indexOf(EY), v = ti >= 0 ? sp.e.c[ti] : null, P = cityBuild(CITYK), sy = ti >= 0 ? P.tot[ti].sy : null, gone = proj(v3(sp.e.lon, sp.e.lat))[0] > splitAt(), nm = sp.lab ? (sp.kind === "h1b" ? `${sp.lab} <span style="color:var(--ink3);font-size:.6em">ZIP ${sp.e.n}</span>` : sp.lab) : sp.kind === "h1b" ? "ZIP " + sp.e.n : sp.e.n;
  const what = sp.kind === "st" ? `international students, fall ${sy}${sy < EY ? " (latest count)" : ""}` : sp.kind === "h1b" ? `H-1B approvals, FY${EY}` : sp.e.arr ? `arrivals from abroad, FY${EY}` : `visitors from abroad, ${EY}`, c = {st: "#f2e640", h1b: "#ff45c5", vis: "#7fc0dc"}[sp.kind];
  if (v == null) return `<b>${nm}</b><div class="r"><span>no ${EY} count was published</span></div>`;
  let h = `<b>${nm}</b><div class="r" style="color:${gone ? "#ff7a62" : c}"><span>${gone ? "without them: " : ""}${what}${gone ? ", gone" : ""}</span><span>${gone ? "−" : ""}${fmt3(v)}</span></div>`;
  if (sp.kind === "st" && sp.e.tot) h += `<div class="r"><span>of all students there</span><span>${Math.round(v/sp.e.tot*100)}%</span></div>`;
  if (sp.kind === "h1b") { const f = sp.e.f[ti]; if (f && f[0]) h += `<div class="r"><span>largest employer filing here</span><span>${fmt3(f[0][1])}</span></div>`; h += `<div class="r"><span>by employer filing address, not worksite</span></div>`; }
  return h; }
function cityAt(x, y) { if (!USV || MODE !== "explore" || CITYK) return null; for (const c of CITYPT) { const q = proj(v3(c[2], c[3])); if (q[2] > 0 && Math.hypot(q[0] - x, q[1] - y) < 20) return c; } return null; }
function setView(v, instant) { if (v !== "line") { DV = DVT = 0; FLY0 = 0; FLYP = 0; } const grow = v === "us" && v !== VIEW; if (v !== VIEW) { SEL = SELS = HOVS = HOVK = null; SPLITX = null; stopPlay(); if (v === "world") WTR = 0; } if (v === "world" || v === "us") { EY = clamp(EY, 2011, v === "world" ? 2025 : 2026); if (EY - YB0 !== YB) { YA = YB = EY - YB0; YT = 1; } } VIEW = v; USV = v === "us" || v === "city"; $("dive").hidden = v !== "line"; $("hkick").textContent = KICK[v] || ""; $("htitle").textContent = HEADS[v][0]; $("hsub").textContent = HEADS[v][1]; $("hint").hidden = true; $("head").hidden = v === "line"; $("yrbox").hidden = false; if (v !== "city") CITYK = null; document.body.classList.toggle("vcity", v === "city"); document.body.classList.toggle("vline", v === "line"); caption("");
  const line = v === "line"; $("ln").style.opacity = line ? 1 : 0; $("gl").style.opacity = line ? 0 : 1; $("ov").style.opacity = line ? 0 : 1; fx.clearRect(0, 0, fxc.width, fxc.height); $("tip").hidden = true;
  if (!line) { const to = v === "city" && CITYK ? cityCam(CITYK) : USV ? CAMS.us() : CAMS.world(); if (instant) { CAM = to; camT = null; } else tweenCam(to); } if (line && EY > 2025) EY = 2025; legend(); totals(); yearsBar(); selCard(); cityHead(); chap(); if (grow && MODE === "explore" && !NOGROW) play(2011, 2024); }
function enterExplore(view) { $("back").hidden = true; const fromRem = MODE === "film" && (PH[PI_].id === "rem" || PH[PI_].id === "explore"); MODE = "explore"; PI_ = PH.length - 1; caption(""); note(""); PLAY = false;
  ["head", "yrbox"].forEach(id => $(id).hidden = false); $("ctrl").hidden = true; setYear(EY); setView(view || "world", !fromRem); if (fromRem && !view) camT = null; }
function toUS(on) { setView(on ? "us" : "world"); }
function backToLine() { MODE = "film"; PI_ = 0; T = 0; PLAY = true; $("pp").textContent = "Pause"; ["head", "yrbox", "legend", "years", "hint", "back"].forEach(id => $(id).hidden = true); $("ctrl").hidden = false;
  $("ln").style.opacity = 1; CAM = CAMS.us(); YI = YEARS.indexOf(2024); chap(); }
$("back").onclick = backToLine; $("hint").onclick = () => setView("us");
// ---- an event: the line steps back, the globe lights what the measure named
function countryRows(ci) { const c = C[ci], k = vI(EY), v = k >= 0 ? c.v[k] : null, tot = v ? v.reduce((a, b) => a + b, 0) : 0, L2 = D.rem.years[EY], rm = L2 ? L2.filter(r => r[1] === c.n).reduce((a, r) => a + r[2], 0) : 0, gi = window.LPRC.years.indexOf(EY), gc = gi >= 0 && window.LPRC.c[c.n] ? window.LPRC.c[c.n][gi] || 0 : 0;
  return (v ? `<div class="r"><span>visas issued, FY${EY}</span><span>${fmt(tot)}</span></div>` + VG.map(([nm, ts, c]) => { const n = ts.reduce((a, t) => a + v[t], 0); return n ? `<div class="r"><span><i style="background:${c}"></i>${nm}</span><span>${fmt(n)}</span></div>` : ""; }).join("") : `<div class="r"><span>no visa data for ${EY}</span></div>`) +
    (gc ? `<div class="r" style="color:#34d27b"><span>green cards, FY${EY}</span><span>${fmt(gc)}</span></div>` : "") + (rm ? `<div class="r" style="color:#ff5a40"><span>removals after an ICE arrest</span><span>${fmt(rm)}</span></div>` : ""); }
function stateRows(k) { const y = EY, ci = cI(y), rows = []; let top = "";
  if (ci >= 0) { let v = 0; D.counties.forEach((c, i) => { if (ST.cs[i] === k) for (let j = 0; j <= ci; j++) v += c[2][j]; }); rows.push([BLUES[0], `net arrivals since 2011, to July ${y}`, v]); }
  if (y === LPR_Y) { let v = 0; D2.lpr.forEach((r, i) => { if (ST.ls[i] === k) v += r[3]; }); if (v) rows.push([GREENS[0], "new green cards, FY2024*", v]); }
  const di = dI(y); if (di >= 0) { let v = 0; D2.det.f.forEach((f, i) => { if (ST.ds[i] === k) v += f[2][di]; }); if (v) rows.push([RED, `held by ICE, average day FY${y}${y === 2026 ? "*" : ""}`, Math.round(v)]); }
  const R = D.rem.years[y]; if (R) { const by = new Map(); let v = 0; for (const [a, n, x] of R) if (a === ST.a[k]) { v += x; by.set(n, (by.get(n) || 0) + x); } if (v) { rows.push(["#ff8a6a", `removals after ICE arrest, FY${y}`, v]); top = [...by].sort((p, q) => q[1] - p[1]).slice(0, 3).map(r => r[0]).join(", "); } }
  if (!rows.length) return `<div class="r"><span>no data for ${y}</span></div>`;
  const notes = [top ? `Most were sent to ${top}.` : "", y === LPR_Y ? "*Green cards: the 200 busiest counties only." : "", y === 2026 ? "*FY2026 to 20 July." : ""].filter(Boolean);
  return rows.map(([c, t, v]) => `<div class="r"><span><i style="background:${c}"></i>${t}</span><span>${fmt(v)}</span></div>`).join("") + notes.map(n => `<small>${n}</small>`).join(""); }
function selCard() { const el = $("selc"), w = VIEW === "world" && SEL != null, u = VIEW === "us" && SELS != null, on = MODE === "explore" && !EVT && (w || u); document.body.classList.toggle("sel", on); if (!on) { el.hidden = true; CARD = null; return; } el.hidden = false;
  const city = u && ST.a[SELS] === "CA" ? ["la", "Los Angeles, with and without them"] : u && ST.a[SELS] === "MA" ? ["bos", "Boston, with and without them"] : null;
  el.innerHTML = `<button type="button" class="x" id="selx" aria-label="Close">✕</button><b>${w ? C[SEL].n : ST.n[SELS]}</b><div class="rows${w ? "" : " st"}">${w ? countryRows(SEL) : stateRows(SELS)}</div>` + (city ? `<button type="button" class="go" id="selgo">${city[1]} →</button>` : "");
  $("selx").onclick = () => select(null); if (city) $("selgo").onclick = () => { setView("city", true); selectCity(city[0]); }; placeSel(); }
// the card sits beside what was clicked, and follows it as the globe turns
function placeSel() { const el = $("selc"); if (el.hidden) return; if (W < 760) { el.style.left = el.style.top = ""; CARD = null; return; }
  const ll = VIEW === "world" ? [C[SEL].lon, C[SEL].lat] : ST.c[SELS], q = proj(v3(ll[0], ll[1])), w = el.offsetWidth, h = el.offsetHeight, lg = $("legend").getBoundingClientRect();
  const xr = W - 16 - (lg.width && W >= 760 ? lg.width + 30 : 0), hb = $("head").getBoundingClientRect(); let x, y = clamp(q[1] - h*.4, Math.max(64, hb.bottom + 18), H - h - 70);
  // on the globe the card waits in the empty margin beside it, level with the country, so it never covers the map
  if (VIEW === "world" && CAM.cx - CAM.R - w - 34 >= 16) x = CAM.cx - CAM.R - w - 34;
  else if (VIEW === "us") { let a = 1e9, b = -1e9; for (const r of ST.r[SELS]) for (const [lo, la] of r) { const pq = proj(v3(lo, la)); a = Math.min(a, pq[0]); b = Math.max(b, pq[0]); } x = b + 24 + w <= xr ? b + 24 : a - 24 - w >= 16 ? a - 24 - w : 16; }
  else { x = q[0] + 44; if (x + w > xr) x = q[0] - 44 - w; x = clamp(x, 16, xr - w); }
  el.style.left = x + "px"; el.style.top = y + "px"; el.style.opacity = q[2] < 0 ? .45 : 1; CARD = {ax: q[0], ay: q[1], vis: q[2] >= 0, x, y, w, h}; }
function select(k) { if (VIEW === "us") { SELS = k; tweenCam(k != null ? stateCam(k) : CAMS.us(), 1300); } else { SEL = k; if (k != null) { SELT = 0; const c = C[k]; tweenCam({...CAM, lon: c.lon, lat: clamp(c.lat, -25, 45)}, 1200); } } selCard(); }
addEventListener("keydown", e => { if (e.key !== "Escape") return; if (EVT) closeEvent(); else if (VIEW === "city" && CITYK) selectCity(null); else if (SELS != null) select(null); else if (SEL != null) { SEL = null; selCard(); } });
const STBB = ST.r.map(rs => { let a = 180, b = 90, c = -180, d = -90; for (const r of rs) for (const [x, y] of r) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; });
const pip = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) c = !c; } return c; };
function stateAt(lon, lat) { for (let k = 0; k < ST.n.length; k++) { const b = STBB[k]; if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue; if (ST.r[k].some(r => pip(lon, lat, r))) return k; } return null; }
function litFor(e) { const cl = new Uint8Array(256), tl = new Uint8Array(256); const all = e.all, cc = e.cc ? new Set(e.cc) : null;
  if (!e.none && !e.us) { C.forEach((c, i) => cl[i] = all || (cc && cc.has(c.n)) ? 1 : 0); for (let t = 0; t < 6; t++) tl[t] = !e.types || e.types.includes(t) ? 1 : 0; }
  tl[7] = 1; cl[255] = 1; for (let i = 0; i < 256; i++) { LIT[i*4] = cl[i] ? 255 : 100; LIT[(256 + i)*4] = tl[i] ? 255 : 100; } LITKEY = "evt"; pushLit(); }
const EXPLORE_UI = ["head", "yrbox", "legend", "years", "hint", "back", "selc"];
let EVCARD = null; const NOQUOTE = new Set(["2020-00"]); /* that quote is about a later vintage, not the 2020 re-basing */ const EVHEAD = {"2002-05": "Every visa, checked.", "2017-01": "Seven countries, suspended.", "2019-10": "The count changes.", "2020-00": "The census re-bases.", "2020-03": "Entry suspended for recent travellers.", "2020-04": "Immigration stops.", "2020-06": "Work visas stop.", "2021-02": "The suspension ends.", "2022-04": "A door for Ukrainians.", "2023-05": "Title 42 ends.", "2025-09": "$100,000 per H-1B."};
function openEvent(e) { EVT = e; $("tip").hidden = true; litFor(e); const yi = YEARS.indexOf(clamp(e.yr, 2011, 2025)); EVT.yi = yi; camT = null; CAM = CAMS.evt(e); DVT = 0;
  caption(""); note(""); $("dive").hidden = true; $("ln").style.opacity = .7; $("gl").style.opacity = 0; $("ov").style.opacity = 0; $("yrbox").style.visibility = "hidden";
  const sumV = (y, types) => { const k = YEARS.indexOf(y); return C.filter((c, i) => i !== US && (e.all || !e.cc || e.cc.includes(c.n))).reduce((a, c) => a + c.v[k].reduce((b, v, t) => b + (!types || types.includes(t) ? v : 0), 0), 0); };
  let rows = [], lab = ""; if (e.m && e.m.vis) { lab = e.m.lab; rows = e.m.vis.map(y => ["FY" + y, sumV(y, e.m.types)]); } if (e.m && e.m.lpr) { lab = e.m.lab; rows = e.m.lpr.map(y => ["FY" + y, D.lpr[YEARS.indexOf(y)]]); } if (e.m && e.m.fixed) { lab = e.m.lab; rows = e.m.fixed; }
  const chr = rows.length > 1 ? (rows[rows.length - 1][1]/rows[0][1] - 1)*100 : null, ch = chr == null ? null : Math.abs(chr) < 1 ? +chr.toFixed(1) : Math.round(chr);
  let extra = ""; if (e.m && e.m.share) { const k = YEARS.indexOf(e.m.vis[e.m.vis.length - 1]), all = C.reduce((a, c) => a + c.v[k][3], 0), ind = C.find(c => c.n === e.m.share).v[k][3]; extra = `<small>${Math.round(ind/all*100)}% of H-1B visas in FY${YEARS[k]} went to people from ${e.m.share}.</small>`; }
  const el = $("evc"), im = EVIMG[e.date]; el.hidden = false;
  const named = e.us ? "the United States" : e.none ? "" : e.all ? "every country" : "the countries it named", base = rows.length ? rows[0][1] : 0;
  const unit = (e.m && e.m.vis) || (e.m && e.m.fixed && /visa/i.test(e.m.lab || "")) ? "U.S. Department of State" : e.m && e.m.lpr ? "Department of Homeland Security" : "";
  el.innerHTML = `<button type="button" class="close" id="evclose">CLOSE ✕</button><div class="card${im ? "" : " np"}">` +
    (im ? `<figure><a href="${im[3]}" target="_blank" rel="noopener"><img src="${im[0]}" alt="${im[1].replace(/"/g, "&quot;")}" referrerpolicy="no-referrer" onerror="this.closest('figure').style.display='none';this.closest('.card').classList.add('np')"></a><figcaption><a href="${im[3]}" target="_blank" rel="noopener">${im[1]} ${im[2]}</a></figcaption></figure>` : "") +
    `<div class="tx"><div class="when">${e.when} · ${e.kind === "policy" ? "policy" : "measurement"}</div><h2>${EVHEAD[e.date] || e.title}</h2>${EVHEAD[e.date] ? `<p class="sub">${e.title}</p>` : ""}` +
    (e.quote && !NOQUOTE.has(e.date) ? `<blockquote>${e.quote}</blockquote>` : `<p class="what">${e.what}</p>`) + `<small>${e.attribution ? e.attribution + " · " : ""}<a href="${e.url}" target="_blank" rel="noopener">${(e.url || "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "source"}</a></small>` +
    `<div class="nums"><div>${rows.length ? `<div class="m">${rows.map(([y, v]) => `<div>${y}<b class="${v < base*.8 ? "dn" : ""}">${fmt(v)}</b></div>`).join("")}${ch != null ? `<div>change<b class="${ch < 0 ? "dn" : ""}">${ch > 0 ? "+" : ""}${ch}%</b></div>` : ""}</div><div class="lab">${lab}${unit ? ", " + unit : ""}</div>` : ""}${extra}</div>` +
    `<div class="mini"><canvas id="evmap" aria-label="Map: ${named || "no country singled out"}"></canvas></div></div></div></div>`;
  el.onclick = ev => { if (ev.target === el) closeEvent(); };
  $("evclose").onclick = closeEvent; el.scrollTop = 0; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); drawEvMap(e); placeEvc();
  const img = el.querySelector("figure img"); if (img && e.date === "2025-09") img.classList.add("diagram");
  const bq = el.querySelector("blockquote"); if (bq) { const upd = () => bq.classList.toggle("more", bq.scrollHeight - bq.clientHeight - bq.scrollTop > 4); upd(); bq.addEventListener("scroll", upd); } }
// the small map: land as fine speckle, what the measure named in gold, the rest dark
function drawEvMap(e) { const c = $("evmap"); if (!c) return; const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return; c.width = Math.round(w*DPR); c.height = Math.round(h*DPR); const q = c.getContext("2d"); q.setTransform(DPR, 0, 0, DPR, 0, 0);
  const lit = new Set(); if (e.us) lit.add(USSID); else if (!e.none) C.forEach((cc, i) => { if (i !== US && cc.sid >= 0 && (e.all || (e.cc && e.cc.includes(cc.n)))) lit.add(cc.sid); });
  const R0 = rot({lon: e.rot[0], lat: e.rot[1]}), ctr = v3(e.rot[0], e.rot[1]); let A = .3;
  if (e.all) A = PI/2; else for (const sid of lit) { const ci = BYSID.get(sid), ll = ci != null ? [C[ci].lon, C[ci].lat] : sid === USSID ? [-98, 39] : null; if (ll) A = Math.max(A, angle(ctr, v3(ll[0], ll[1])) + .2); }
  const R = Math.min(w, h)*.47/Math.sin(Math.min(A, PI/2)), cx = w/2, cy = h/2, P = v => [cx + (R0[0]*v[0] + R0[1]*v[1] + R0[2]*v[2])*R, cy - (R0[3]*v[0] + R0[4]*v[1] + R0[5]*v[2])*R, R0[6]*v[0] + R0[7]*v[1] + R0[8]*v[2]];
  q.fillStyle = "#05080d"; q.beginPath(); q.arc(cx, cy, R, 0, 6.283); q.fill(); q.strokeStyle = "rgba(167,176,191,.35)"; q.lineWidth = .8; q.stroke();
  const ring = r => { q.beginPath(); let pen = false; for (const [lo, la] of r) { const p = P(v3(lo, la)); if (p[2] < 0) { pen = false; continue; } pen ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]); pen = true; } q.stroke(); };
  q.lineJoin = "round"; q.strokeStyle = "rgba(127,192,220,.1)"; q.lineWidth = .5; SH.forEach(([, rings], sid) => { if (!lit.has(sid)) for (const r of rings) ring(r); });
  q.strokeStyle = "#f2b950"; q.lineWidth = 1; for (const sid of lit) for (const r of SH[sid][1]) ring(r); }
// the window sits beside the spot that was clicked
function placeEvc() { EVCARD = null; return; }
function placeEvcOld() { const el = $("evc"); if (!EVT || el.hidden) { EVCARD = null; return; } if (W < 760) { el.style.left = el.style.top = ""; EVCARD = null; return; }
  const sp = SPOTS.find(q => q[2] === EVT), w = el.offsetWidth, h = el.offsetHeight; if (!sp) { el.style.left = (W - w - 40) + "px"; el.style.top = (H/2 - h/2) + "px"; EVCARD = null; return; }
  let x = sp[0] + 34; if (x + w > W - 16) x = sp[0] - 34 - w; x = clamp(x, 16, W - w - 16); const y = clamp(sp[1] - h*.3, 60, H - h - 24); el.style.left = x + "px"; el.style.top = y + "px"; EVCARD = {ax: sp[0], ay: sp[1], x, y, w, h}; }
function closeEvent() { EVT = null; EVCARD = null; $("yrbox").style.visibility = ""; $("evc").classList.remove("on"); setTimeout(() => { if (!EVT) $("evc").hidden = true; }, 360); for (let i = 0; i < LIT.length; i++) LIT[i] = 255; LITKEY = ""; pushLit(); setView(VIEW, true); }
// ---- controls
$("pp").onclick = () => { PLAY = !PLAY; $("pp").textContent = PLAY ? "Pause" : "Play"; };
$("next").onclick = () => { if (EVT) closeEvent(); if (PI_ >= PH.length - 2) { enterExplore(); return; } PI_++; T = 0; };
$("nav").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (EVT) closeEvent(); if (MODE === "film") enterExplore(b.dataset.c); else setView(b.dataset.c); });
addEventListener("keydown", e => { if (e.key === "Escape") { if (EVT) closeEvent(); } if (e.key === " " && MODE === "film") { e.preventDefault(); $("pp").click(); } if (e.key === "ArrowRight" && MODE === "film") $("next").click(); });
// line: hover and click the spots
lnc.addEventListener("pointermove", e => { let best = null, bd = 18; for (const [x, y, ev] of SPOTS) { const d = Math.hypot(x - e.clientX, y - e.clientY); if (d < bd) { bd = d; best = ev; } } HOVE = best; lnc.style.cursor = best ? "pointer" : "";
  const tip = $("tip"); if (!best && MODE === "explore" && (DV > .05 || EVT)) { tip.hidden = true; HOVY = null; return; } if (!best && MODE === "explore") { const yr = Math.round((e.clientX - W/2)/(W*(L.nar ? .86 : .8))*LC.span + LC.x); if (yr < NY0 || yr > 2025) { tip.hidden = true; HOVY = null; return; } HOVY = yr; const v = NV[yr - NY0];
    tip.innerHTML = `<b>${yr}</b><div class="r"><span>net international migration</span><span>${v.toLocaleString("en-US")}</span></div>${PARTIAL.includes(yr) ? `<div class="r"><span>April–June only: first year of a new Census vintage</span></div>` : ""}<div class="r"><span>Census Bureau, ${D2.nimx.source[yr - NY0].replace(/ \(.*$/, "")}</span></div>`; tip.hidden = false; tip.style.left = Math.min(W - 300, e.clientX + 16) + "px"; tip.style.top = (e.clientY + 16) + "px"; if (EY !== yr) { EY = yr; totals(); } return; }
  if (!best) { tip.hidden = true; return; } tip.innerHTML = `<b>${best.title}</b><div class="r"><span>${best.when}</span><span>click to open</span></div>`; tip.hidden = false; tip.style.left = Math.min(W - 280, e.clientX + 16) + "px"; tip.style.top = (e.clientY + 16) + "px"; });
lnc.addEventListener("pointerleave", () => { HOVE = null; HOVY = null; $("tip").hidden = true; });
lnc.addEventListener("wheel", e => { if (MODE !== "explore" || VIEW !== "line" || FLY0) return; e.preventDefault(); DVT = clamp(DVT + e.deltaY*.0011); }, {passive: false});
$("divb").onclick = () => { if (FLY0) return; DVT = DVT > .5 ? 0 : 1; }; $("land").onclick = () => { if (!FLY0) { FLY0 = performance.now(); caption(""); } };
lnc.addEventListener("click", e => { $("tip").hidden = true; if (HOVE) openEvent(HOVE); else if (EVT) closeEvent(); });
// globe and map: drag to turn, wheel to zoom; hover names a country or a state, click opens its numbers beside it
let drag = null, HOVC = null;
const tipAt = (html, e, cls) => { const tip = $("tip"); tip.className = cls || ""; tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(W - tip.offsetWidth - 10, e.clientX + 16) + "px"; tip.style.top = Math.min(H - tip.offsetHeight - 10, e.clientY + 16) + "px"; };
function pick(e) { if (VIEW === "city" && CITYK) { const sp = spotAt(e.clientX, e.clientY); return sp ? {spot: sp} : {}; } const ll = unproj(e.clientX, e.clientY); if (!ll) return {}; if (USV) { const c = cityAt(e.clientX, e.clientY); if (c) return {city: c}; if (VIEW === "city") return {}; const k = stateAt(ll[0], ll[1]); return k != null ? {state: k} : {}; }
  const sid = maskAt(ll[0], ll[1]); if (sid === USSID && sid >= 0) return {us: true}; const ci = BYSID.get(sid); return ci != null ? {country: ci} : {}; }
ovc.addEventListener("pointerdown", e => { if (MODE !== "explore" || VIEW === "line") return; drag = {x: e.clientX, y: e.clientY, lon: CAM.lon, lat: CAM.lat, moved: false}; camT = null; try { ovc.setPointerCapture(e.pointerId); } catch (_) {} });
ovc.addEventListener("pointermove", e => { if (MODE !== "explore" || VIEW === "line") return; if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; CAM.lon = drag.lon - dx/CAM.R*57.3; CAM.lat = clamp(drag.lat + dy/CAM.R*57.3, -70, 75); $("tip").hidden = true; return; }
  const p = pick(e); HOVC = p.city || null; HOVS = p.state ?? null; HOVK = p.country ?? null; HOVSP = p.spot || null; ovc.style.cursor = p.city || p.us || p.state != null || p.country != null ? "pointer" : "grab";
  if (p.spot) tipAt(spotTip(p.spot), e);
  else if (p.city) tipAt(`<b>${p.city[1]}</b><div class="r"><span>click to see the city</span></div>`, e);
  else if (p.us) tipAt(`<b>United States</b><div class="r"><span>click to see where immigrants land</span></div>`, e);
  else if (p.country != null && p.country !== SEL) tipAt(`<b>${C[p.country].n}</b>`, e, "nm");
  else if (p.state != null && p.state !== SELS) tipAt(`<b>${ST.n[p.state]}</b>`, e, "nm");
  else $("tip").hidden = true; });
ovc.addEventListener("pointerleave", () => { if (drag) return; HOVC = null; HOVS = HOVK = null; $("tip").hidden = true; });
ovc.addEventListener("pointerup", e => { const d = drag; drag = null; if (!d || d.moved || MODE !== "explore") return; const p = pick(e); $("tip").hidden = true;
  if (p.city) { HOVC = null; if (VIEW !== "city") setView("city", true); selectCity(p.city[0]); return; } if (p.us) { select(null); toUS(true); return; }
  if (USV) { select(p.state != null && p.state !== SELS ? p.state : null); return; } select(p.country != null && p.country !== SEL ? p.country : null); });
ovc.addEventListener("wheel", e => { if (MODE !== "explore" || VIEW === "line") return; e.preventDefault(); camT = null; const R0 = VIEW === "city" && CITYK ? cityCam(CITYK).R : 0; CAM.R = R0 ? clamp(CAM.R*Math.exp(-e.deltaY*.0015), R0*.62, R0*5) : VIEW === "us" && SELS != null ? clamp(CAM.R*Math.exp(-e.deltaY*.0015), CAMS.us().R*.8, stateCam(SELS).R*4) : clamp(CAM.R*Math.exp(-e.deltaY*.0015), Math.min(W, H)*.2, Math.min(W, H)*6); }, {passive: false});

// ====== every year at once: each dot and line knows the years it is there (bit y - 2011), so a new year grows out of the last one
const YB0 = 2011, ybit = y => 2 ** (y - YB0); let YA = 13, YB = 13, YT = 1, SELT = 9, WTR = 2;
function dotBufY(arr) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return {b, n: arr.length/13, st: 52}; }
function lnBufY(arr) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return {b, n: arr.length/11, st: 44}; }
const pushDotY = (out, to, from, col, ci, t, d, ym) => out.push(to[0], to[1], to[2], from[0], from[1], from[2], col[0], col[1], col[2], ci, t, d, ym);
function strandY(out, a, b, h, col, d, N, ci, t, ym) { if (angle(a, b) > 2.85) return; for (let k = 0; k < N; k++) for (const j of [k, k + 1]) { const u = j/N, p = slerp(a, b, u), r = 1 + h*Math.sin(PI*u), m = Math.hypot(...p); out.push(p[0]/m*r, p[1]/m*r, p[2]/m*r, u, d, col[0], col[1], col[2], ci, t, ym); } }
const maskOf = (cnt, years, r) => years.reduce((m, y, i) => r < cnt[i] ? m + ybit(y) : m, 0);
const LCOL = ["#5aa6cf", "#f2e640", "#f2e640", "#ff45c5", "#a99cff", "#a99cff"];   // each visa group's lines in its own colour
let VPOOL = null, RPOOL = null, GPOOL = null, DPOOL = null, CPOOL = null, UPOOL = null;
// visas FY2011-2025: 1 dot = 50, from a US port to a cloud in the country; lines by group, more or fewer with the year (one scale for all years)
function visaPool() { if (VPOOL) return VPOOL; const a = [], l = [], ys = YEARS; sd = 2011;
  const GREF = VG.map(([, ts]) => { let m = 0; C.forEach((c, ci) => { if (ci !== US) for (const v of c.v) m = Math.max(m, ts.reduce((s2, t) => s2 + v[t], 0)); }); return m; });
  C.forEach((c, ci) => { if (ci === US) return; const ps = portsFor(2024), A0 = v3(c.lon, c.lat); let best = ps[0], bv = -1, port = null; for (const p of ps) { const v = p[2]/Math.pow(.35 + angle(A0, v3(p[0], p[1])), 3); if (v > bv) { bv = v; best = p; } }
    for (let t = 0; t < 6; t++) { const cnt = ys.map((y, yi) => Math.round(c.v[yi][t]/DUNIT)), nm = Math.max(...cnt), fam = TFAM[t];
      for (let r = 0; r < nm; r++) { if (!port || rnd() < .3) port = pickPort(c, 2024); pushDotY(a, v3(...cloudPt(c)), v3(port[0] + gauss()*.3, port[1] + gauss()*.22), hex(fam[Math.floor(rnd()*fam.length)]), ci, t, rnd()*.45, maskOf(cnt, ys, r)); } }
    VG.forEach(([, ts], gi) => { const vs = ys.map((y, yi) => ts.reduce((s2, t) => s2 + c.v[yi][t], 0)), ref = GREF[gi], lc = vs.map(v => v < Math.max(2000, ref*.004) ? 0 : Math.max(1, Math.round(22*Math.sqrt(v/ref)))), lm = Math.max(...lc), col = hex(LCOL[ts[0]]);
      for (let r = 0; r < lm; r++) { const from = v3(best[0] + gauss()*.5, best[1] + gauss()*.35), to = v3(c.lon + gauss()*1.4, c.lat + gauss()*1); strandY(l, from, to, ARC_HI(angle(from, to))*HKJ[gi]*(.9 + rnd()*.2), col, rnd()*.45, 56, ci, ts[0], maskOf(lc, ys, r)); } }); });
  return VPOOL = {d: dotBufY(new Float32Array(a)), l: lnBufY(new Float32Array(l))}; }
// removals after an ICE arrest, FY2022-2025: from the state of arrest, low
function remPool() { if (RPOOL) return RPOOL; const a = [], l = [], ys = Object.keys(D.rem.years).map(Number).sort((p, q) => p - q), by = new Map(), RC = ["#ff5a40", "#ff4a36", "#ff6a4d", "#e8243c"]; sd = 2022;
  ys.forEach((y, yi) => { for (const [st, n, v] of D.rem.years[y]) { const e = by.get(n) || {v: ys.map(() => 0), st: {}, sy: ys.map(() => ({}))}; e.v[yi] += v; e.st[st] = (e.st[st] || 0) + v; e.sy[yi][st] = (e.sy[yi][st] || 0) + v; by.set(n, e); } });
  let mr = 0; for (const [, e] of by) for (const v of e.v) mr = Math.max(mr, v);
  for (const [n, e] of by) { const [c, ci] = remCountry(n); if (!c) continue; const pickFrom = m => { const sts = Object.entries(m), tot = sts.reduce((s2, x) => s2 + x[1], 0); let r = rnd()*tot; for (const [k, v] of sts) { r -= v; if (r <= 0) return k; } return sts[0][0]; }, first = (cn, r) => { const i = cn.findIndex(x => r < x); return i < 0 ? 0 : i; };
    const cnt = e.v.map(v => Math.round(v/DUNIT)), nm = Math.max(...cnt);
    for (let r = 0; r < nm; r++) { const o = D.rem.st[pickFrom(e.sy[first(cnt, r)])]; if (o) pushDotY(a, v3(...cloudPt(c)), v3(o[0] + gauss()*1.2, o[1] + gauss()*.9), hex(RED), ci, 9, rnd()*.5, maskOf(cnt, ys, r)); }
    const lc = e.v.map(v => v < 400 ? 0 : Math.round(2 + 36*Math.sqrt(v/mr))), lm = Math.max(...lc);
    for (let r = 0; r < lm; r++) { const o = D.rem.st[pickFrom(e.sy[first(lc, r)])]; if (!o) continue; const from = v3(o[0] + gauss()*.6, o[1] + gauss()*.4), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.8); strandY(l, from, to, ARC_LO(angle(from, to))*(.82 + rnd()*.36), hex(RC[Math.floor(rnd()*RC.length)]), rnd()*.5, 36, ci, 9, maskOf(lc, ys, r)); } }
  return RPOOL = {d: dotBufY(new Float32Array(a)), l: lnBufY(new Float32Array(l))}; }
// green cards FY2024: from the county where the person lives to a cloud in the country of birth, tall and green
// green cards FY2011-2024 by country of birth (DHS Yearbook Table 3): 1 dot = 50, tall green arcs, more or fewer with the year.
// Each country's dots and arcs reach the US at the counties where people born there got green cards in FY2024 (DHS, 200 busiest counties), or at its main port of entry
function greenPool() { if (GPOOL) return GPOOL; const a = [], l = [], ys = window.LPRC.years, by = new Map(); sd = 4242;
  for (const [n, lon, lat, v] of D2.lpr) { const e = by.get(n) || []; e.push([lon, lat, v]); by.set(n, e); }
  let ref = 0; for (const v of Object.values(window.LPRC.c)) for (const x of v) ref = Math.max(ref, x || 0);
  for (const [n, ser] of Object.entries(window.LPRC.c)) { const ci = C.findIndex(c => c.n === n); if (ci < 0 || ci === US) continue; const c = C[ci], cs = by.get(n);
    const tot = cs ? cs.reduce((t, x) => t + x[2], 0) : 0, land = () => { if (cs) { let r = rnd()*tot; for (const x of cs) { r -= x[2]; if (r <= 0) return [x[0], x[1]]; } return [cs[0][0], cs[0][1]]; } const p = pickPort(c, 2024); return [p[0], p[1]]; };
    const cnt = ser.map(v => Math.round((v || 0)/DUNIT)), nm = Math.max(...cnt);
    for (let r = 0; r < nm; r++) { const [lo, la] = land(); pushDotY(a, v3(...cloudPt(c)), v3(lo + gauss()*.12, la + gauss()*.09), hex(GREENS[Math.floor(rnd()*GREENS.length)]), ci, 6, rnd()*.5, maskOf(cnt, ys, r)); }
    const lc = ser.map(v => (v || 0) < 1500 ? 0 : Math.max(1, Math.round(22*Math.sqrt(v/ref)))), lm = Math.max(...lc);
    for (let r = 0; r < lm; r++) { const [lo, la] = land(), from = v3(lo + gauss()*.25, la + gauss()*.2), to = v3(c.lon + gauss()*1.2, c.lat + gauss()*.9); strandY(l, from, to, ARC_HI(angle(from, to))*HKG*(.9 + rnd()*.2), hex("#3ddc84"), rnd()*.45, 56, ci, 6, maskOf(lc, ys, r)); } }
  return GPOOL = {d: dotBufY(new Float32Array(a)), l: lnBufY(new Float32Array(l))}; }
const lprYear = y => { const i = window.LPRC.years.indexOf(y); return i < 0 ? null : D.lpr[YEARS.indexOf(y)] ?? null; };
// ICE detention FY2019-2026: each facility keeps its dots and shows its first n in a year, so it swells and shrinks; it glows
function detPool() { if (DPOOL) return DPOOL; const a = [], ys = D2.det.years; sd = 991; for (const d of DETP) { const cnt = D2.det.f[d.f][2].map(v => Math.round(v/DUNIT)); pushDotY(a, d.p, d.o, d.c, ST.ds[d.f], 7, rnd()*.25, maskOf(cnt, ys, d.j)); } return DPOOL = dotBufY(new Float32Array(a)); }
// net international migration by county, added up since 2011, 1 dot = 50 (one unit for every dot): each county keeps its dots and shows its first n
function censusPool() { if (CPOOL) return CPOOL; const a = [], ys = D.years.map(Number); sd = 1717;
  // each county's running total of net arrivals since 2011 (a year that nets negative takes dots away), rounded, so a county's dots only come and go as its total does
  const CNT = D.counties.map(c => { let t = 0; return ys.map((y, yi) => Math.round(Math.max(0, t += c[2][yi])/DUNIT)); });
  D.counties.forEach(([lon, lat, v], i) => { const cnt = CNT[i], nm = Math.max(...cnt), c0 = v3(lon, lat), pts = [], sp = 1 + Math.sqrt(nm)/40; for (let r = 0; r < nm; r++) pts.push(v3(lon + gauss()*.12*sp, lat + gauss()*.09*sp)); pts.sort((a2, b2) => angle(a2, c0) - angle(b2, c0));
    pts.forEach((p, r) => pushDotY(a, p, c0, hex(BLUES[Math.floor(rnd()*BLUES.length)]), ST.cs[i], 8, rnd()*.25, maskOf(cnt, ys, r))); });
  return CPOOL = dotBufY(new Float32Array(a)); }
// residents, the backdrop of the national with/without view: Census county population (July 2024), 1 dot = POPU people, spread wider for bigger counties
const CUMN = D.nim.map((v, i, a) => a.slice(0, i + 1).reduce((t, x) => t + x, 0)), POPU = 10000, RESIDENTS = D3.pop.reduce((t, c) => t + c[2], 0); let PPOOL = null;
function popPool() { if (PPOOL) return PPOOL; const a = [], col = hex("#e9e4d8"); sd = 2024;
  for (const [lon, lat, v, u] of D3.pop) { let m = Math.floor(v/POPU) + (rnd() < (v/POPU) % 1 ? 1 : 0); const si = ST.a.indexOf(u), sg = .06 + .007*Math.sqrt(m);
    while (m-- > 0) { const q = v3(lon + gauss()*sg*1.3, lat + gauss()*sg); pushDot(a, q, q, col, si < 0 ? 255 : si, 7, 0); } }
  return PPOOL = dotBuf(new Float32Array(a)); }
const natSplit = () => VIEW === "us" && MODE === "explore" && !EVT;
function greenUSPool() { if (UPOOL) return UPOOL; const a = [], m = ybit(LPR_Y); sd = 4243; D2.lpr.forEach(([n, lon, lat, v], i) => { let k = Math.round(v/DUNIT); const c0 = v3(lon, lat); while (k-- > 0) { const p = v3(lon + gauss()*.12, lat + gauss()*.09); pushDotY(a, p, c0, hex(GREENS[Math.floor(rnd()*GREENS.length)]), ST.ls[i], 8, rnd()*.25, m); } }); return UPOOL = dotBufY(new Float32Array(a)); }
// ====== the cities, on the same map: jobs are the city's grain (ZIP Business Patterns 2023); students, H-1B approvals and visitors from abroad are dots by year
const CITIES = {la: {name: "Los Angeles", D: window.LA, Y: window.CY.la, jpd: 40, dens: 7, skm: 1.7, field: false, mr: .0028},
  bos: {name: "Boston", D: window.BOS, Y: window.CY.bos, jpd: 15, dens: 36, skm: 1.15, field: true, mr: .0012}};
for (const c of Object.values(CITIES)) { const [a, b, d, e] = c.Y.box; c.c = [(a + d)/2, (b + e)/2]; c.ex = [(d - a)/2, (e - b)/2]; }
const CYEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]; let CITYK = null, HOVSP = null, PREVK = null, SPLITX = null, FROMK = null;
const cityCam = k => { const c = CITIES[k], wkm = 2*c.ex[0]*111.32*Math.cos(c.c[1]*D2R), hkm = 2*c.ex[1]*111.32, ph = W < 760, ppk = Math.min((ph ? W*1.02 : W*.74)/wkm, (ph ? H*.5 : H - 150)/hkm);
  return {lon: c.c[0], lat: c.c[1], R: ppk*6371, cx: ph ? W/2 : W*.44, cy: ph ? H*.47 : H*.53}; };
// a patch of moss: a few lobes around a centre, a lobed front; points come with the order they grow in (nearest the centre, along its lobes, first)
function mossShape() { const K = 2 + Math.floor(rnd()*4), lobes = [[0, 0, 1.4, .5]], ph = [rnd()*6.28, rnd()*6.28, rnd()*6.28], am = [.18 + rnd()*.2, .1 + rnd()*.15, .12 + rnd()*.2];
  for (let i = 0; i < K; i++) { const a = rnd()*6.283, d = .7 + rnd()*.9; lobes.push([Math.cos(a)*d, Math.sin(a)*d, .3 + rnd()*.7, .28 + rnd()*.3]); } const wt = lobes.reduce((t, l) => t + l[2], 0);
  const front = (x, y) => { const th = Math.atan2(y, x); return Math.hypot(x, y)/(1 + am[0]*Math.sin(3*th + ph[0]) + am[1]*Math.sin(5*th + ph[1]) + am[2]*Math.sin(2*th + ph[2])); };
  return sk => { let r = rnd()*wt, l = lobes[0]; for (const q of lobes) { r -= q[2]; if (r <= 0) { l = q; break; } } const x = l[0] + gauss()*l[3], y = l[1] + gauss()*l[3]; return [x*sk, y*sk, front(x, y)]; }; }
function cityBuild(k) { const C0 = CITIES[k]; if (C0.P) return C0.P; const D0 = C0.D, [cx, cy] = C0.c, [X0, Y0, X1, Y1] = D0.wbox, [MX0, MY0, MX1, MY1] = C0.Y.box, KMd = 111.32, CL = Math.cos(cy*D2R), sqkm = mi => mi*2.59;
  // land: inside the state outlines; for Boston also within reach of a ZIP, so the harbour stays water
  const MR = C0.mr, GW = Math.ceil((X1 - X0)/MR), GH = Math.ceil((Y1 - Y0)/MR), cv = document.createElement("canvas"); cv.width = GW; cv.height = GH; const q = cv.getContext("2d"); q.fillStyle = "#fff"; q.beginPath();
  q.filter = "blur(.5px)"; for (const r of smooth(ST.city[k])) r.forEach(([lo, la], n) => { const x = (lo - X0)/MR, y = (Y1 - la)/MR; n ? q.lineTo(x, y) : q.moveTo(x, y); }); q.fill("evenodd"); q.filter = "none";
  const M = new Uint8Array(GW*GH), MP = new Float32Array(GW*GH), px = q.getImageData(0, 0, GW, GH).data; for (let n = 0; n < M.length; n++) { MP[n] = px[n*4 + 3]/255; M[n] = MP[n] > .5 ? 1 : 0; }
  if (C0.field) { const CELL = .003, FW = Math.ceil((X1 - X0)/CELL), FH = Math.ceil((Y1 - Y0)/CELL), F = new Float32Array(FW*FH);
    for (const [z, lon, lat, mi] of D0.zcta) { const sk = Math.max(.75, Math.sqrt(sqkm(mi))/1.7), sx = sk/(KMd*CL)/CELL, sy = sk/KMd/CELL, fx = (lon - X0)/CELL, fy = (Y1 - lat)/CELL;
      for (let jj = Math.max(0, Math.floor(fy - sy*3)); jj < Math.min(FH, fy + sy*3); jj++) for (let ii = Math.max(0, Math.floor(fx - sx*3)); ii < Math.min(FW, fx + sx*3); ii++) { const dx = (ii - fx)/sx, dy = (jj - fy)/sy; F[jj*FW + ii] += Math.exp(-(dx*dx + dy*dy)/2); } }
    for (let jj = 0; jj < GH; jj++) for (let ii = 0; ii < GW; ii++) { const n = jj*GW + ii; if (!M[n]) continue; const fi = Math.min(FW - 1, Math.floor(ii*MR/CELL)), fj = Math.min(FH - 1, Math.floor(jj*MR/CELL)); if (F[fj*FW + fi] < .32) M[n] = 0; } }
  const land = (lon, lat) => { const ii = Math.floor((lon - X0)/MR), jj = Math.floor((Y1 - lat)/MR); return ii >= 0 && jj >= 0 && ii < GW && jj < GH && M[jj*GW + ii] === 1; };
  const landp = (lon, lat) => { const ii = Math.floor((lon - X0)/MR), jj = Math.floor((Y1 - lat)/MR); return ii >= 0 && jj >= 0 && ii < GW && jj < GH ? (M[jj*GW + ii] ? MP[jj*GW + ii] : 0) : 0; };
  // density thins with distance from the metro, never at a line: the region and its other cities stay faintly lit
  // the metro is a soft rounded rectangle: full inside, thinning to nothing a little beyond it, so no edge is ever drawn
  const AX = C0.ex[0]*KMd*CL, AY = C0.ex[1]*KMd, rr = (lon, lat) => { const u = (lon - cx)*KMd*CL/AX, v = (lat - cy)*KMd/AY; return Math.pow(u**4 + v**4, .25); }, fall = (lon, lat) => { const x = Math.max(0, rr(lon, lat) - .82)/.24; return Math.exp(-x*x); };
  const wedge = (lon, lat) => { const t = clamp(Math.min(lon - X0, X1 - lon, lat - Y0, Y1 - lat)/.25); return t*t*(3 - 2*t); }, edge = (lon, lat) => fall(lon, lat)*wedge(lon, lat);
  const inEx = (lon, lat) => lon > MX0 && lon < MX1 && lat > MY0 && lat < MY1, ALL = 2**16 - 1, base = [], jobs = [], st = [], h1 = [], vi = [], spots = [], yr = y => C0.Y.years[y] || C0.Y.years[String(y)], zmi = new Map(D0.zcta.map(r => [r[0], r[3]])); sd = k === "la" ? 31 : 37;
  // the same speckle as the US map, finer: the ground
  const nb = Math.round((X1 - X0)*KMd*CL*(Y1 - Y0)*KMd*C0.dens), LC = hex("#2b5466"); for (let n = 0; n < nb; n++) { const lon = X0 + rnd()*(X1 - X0), lat = Y0 + rnd()*(Y1 - Y0); if (rnd() > landp(lon, lat)*edge(lon, lat)) continue; const p = v3(lon, lat); pushDotY(base, p, p, LC, 255, 7, 0, ALL); }
  // where people work: the city's own grain
  const JC = ["#3d7f99", "#4a8ea8", "#36728a", "#5596ad"].map(hex);
  for (const [z, lon, lat, emp, mi] of D0.grain) { const n = rr(lon, lat) < 1.12 ? Math.round(emp/C0.jpd) : 0, sk = Math.max(.35, Math.sqrt(sqkm(mi))/2.4); for (let m = 0, t = 0; m < n && t < n*6; t++) { const x = lon + gauss()*sk/(KMd*CL), y = lat + gauss()*sk/KMd; if (!land(x, y)) continue; m++; if (rnd() > wedge(x, y)) continue; const p = v3(x, y); pushDotY(jobs, p, p, JC[m & 3], 255, 7, 0, ALL); } }
  // moss: a place keeps its dots nearest-first, so a year with more grows outward from the place, a year with fewer recedes into it
  const moss = (out, e, n, sk, fam, cnt) => { const L = mossShape(), pts = []; for (let t = 0; pts.length < n && t < n*8; t++) { const [dx, dy, key] = L(sk), x = e.lon + dx/(KMd*CL), y = e.lat + dy/KMd; if (land(x, y)) pts.push([key, x, y]); }
    pts.sort((a, b) => a[0] - b[0]); pts.forEach(([, x, y], r) => pushDotY(out, v3(x, y), v3(e.lon + (x - e.lon)*.55, e.lat + (y - e.lat)*.55), hex(fam[r % fam.length]), 255, 8, rnd()*.3, maskOf(cnt, CYEARS, r))); };
  const col = {}; CYEARS.forEach((y, yi) => { for (const r of yr(y).st) { const e = col[r[0]] || (col[r[0]] = {n: r[0], lon: r[1], lat: r[2], c: CYEARS.map(() => 0), tot: r[4] || null}); e.c[yi] = r[3]; } });
  for (const [key, e] of Object.entries(col)) { const twin = Object.values(col).find(o => o !== e && !o.gone && Math.abs(o.lon - e.lon) < 5e-4 && Math.abs(o.lat - e.lat) < 5e-4); if (twin && !e.gone && e.n.length > twin.n.length) { twin.c = twin.c.map((v, i) => v + e.c[i]); twin.tot = (twin.tot || 0) + (e.tot || 0); e.gone = true; } }
  for (const [key, e] of Object.entries(col)) if (e.gone) delete col[key];   // e.g. Northeastern and its Professional Programs share one address
  const MAXST = Math.max(1, ...Object.values(col).flatMap(e => e.c));
  for (const e of Object.values(col)) { if (!inEx(e.lon, e.lat)) continue; const sk = (.12 + .5*Math.sqrt(Math.max(...e.c)/MAXST))*C0.skm; moss(st, e, Math.max(...e.c), sk, TFAM[1], e.c); spots.push({kind: "st", e, sk}); }
  const hz = {}; CYEARS.forEach((y, yi) => { for (const r of yr(y).h1b) { const e = hz[r[0]] || (hz[r[0]] = {n: r[0], lon: r[1], lat: r[2], c: CYEARS.map(() => 0), f: CYEARS.map(() => null)}); e.c[yi] = r[3]; e.f[yi] = r[4] || null; } });
  for (const e of Object.values(hz)) { if (!inEx(e.lon, e.lat)) continue; const sk = clamp(Math.sqrt(sqkm(zmi.get(e.n) || 1))/3.6, .14, .45)*C0.skm; moss(h1, e, Math.max(...e.c), sk, TFAM[3], e.c); if (Math.max(...e.c) >= 15) spots.push({kind: "h1b", e, sk}); }
  const VU = 1000, vis = k === "la" ? ["sm", "lax"].map(id => { const m = D0.marks.find(q2 => q2.id === id); return {n: m.name, lon: m.lon, lat: m.lat, c: CYEARS.map(y => m.ser[y] ?? m.ser[String(y)] ?? null), arr: id === "lax", sk: (id === "lax" ? .8 : 1.1)*C0.skm}; })
    : [{n: "Logan Airport", lon: -71.0096, lat: 42.3656, c: CYEARS.map(y => D0.logan[y] ?? D0.logan[String(y)] ?? null), arr: true, sk: .7*C0.skm}];
  for (const e of vis) { const cnt = e.c.map(v => Math.round((v || 0)/VU)); moss(vi, e, Math.max(...cnt), e.sk, TFAM[0], cnt); spots.push({kind: "vis", e, sk: e.sk}); }
  const tot = CYEARS.map((y, yi) => ({st: Object.values(col).filter(e => inEx(e.lon, e.lat)).reduce((a, e) => a + e.c[yi], 0), h1: Object.values(hz).filter(e => inEx(e.lon, e.lat)).reduce((a, e) => a + e.c[yi], 0), vis: vis.map(e => [e.lab || e.n, e.c[yi], e.arr]), sy: yr(y).stYear}));
  // a few quiet names, so the city can be read
  const SHORT = {"University of Southern California": "USC", "University of California-Los Angeles": "UCLA", "California Institute of Technology": "Caltech", "Northeastern University": "Northeastern", "Boston University": "Boston University", "Harvard University": "Harvard", "Massachusetts Institute of Technology": "MIT", "Berklee College of Music": "Berklee", "Tufts University": "Tufts", "Boston College": "Boston College"};
  const names = k === "la" ? [...D0.marks.filter(m => !m.nolabel && m.id !== "snap" && m.id !== "century" && m.id !== "bh" && m.kind !== "student").map(m => [m.name, m.lon, m.lat, 1]),
      ["Long Beach", -118.19, 33.77, 1], ["Pasadena", -118.14, 34.15, 1], ["San Fernando Valley", -118.45, 34.2, 1], ["Anaheim", -117.91, 33.84, 1], ["Irvine", -117.79, 33.68, 1], ["Glendale", -118.25, 34.15, 1], ["Torrance", -118.34, 33.83, 1], ["Culver City", -118.396, 34.021, 1], ["Downtown", -118.25, 34.05, 1]]
    : [["Waltham", -71.236, 42.376, 1], ["Newton", -71.209, 42.337, 1], ["Quincy", -71.004, 42.258, 1], ["Lexington", -71.225, 42.447, 1], ["Burlington", -71.195, 42.505, 1], ["Cambridge", -71.112, 42.378, 1], ["Somerville", -71.099, 42.392, 1], ["Back Bay", -71.081, 42.350, 1], ["Downtown", -71.058, 42.356, 1], ["Seaport", -71.042, 42.350, 1], ["East Boston", -71.033, 42.375, 1], ["Dorchester", -71.061, 42.300, 1], ["Brookline", -71.122, 42.332, 1], ["Allston", -71.132, 42.355, 1], ["Charlestown", -71.062, 42.378, 1], ["Kendall Square", -71.086, 42.363, 1]];
  const LABS = {"University of Southern California": "USC", "University of California-Los Angeles": "UCLA", "University of California-Irvine": "UC Irvine", "Westcliff University": "Westcliff", "California State University-Northridge": "CSU Northridge", "Santa Monica College": "Santa Monica College",
    "California State University-Long Beach": "CSU Long Beach", "California State University-Fullerton": "CSU Fullerton", "Art Center College of Design": "ArtCenter", "Loyola Marymount University": "LMU", "California Institute of Technology": "Caltech", "Pepperdine University": "Pepperdine", "Orange Coast College": "Orange Coast College",
    "Northeastern University": "Northeastern", "Boston University": "Boston University", "Harvard University": "Harvard", "Massachusetts Institute of Technology": "MIT", "Berklee College of Music": "Berklee", "Tufts University": "Tufts", "Boston College": "Boston College",
    "University of Massachusetts-Boston": "UMass Boston", "Hult International Business School": "Hult", "Brandeis University": "Brandeis", "Babson College": "Babson", "Suffolk University": "Suffolk", "MCPHS University": "MCPHS", "Bentley University": "Bentley", "Emerson College": "Emerson"};
  const towns = names.filter(n => n[3] === 1), near = (lon, lat, km) => { let b = null, bd = km; for (const [nm, x, y] of towns) { const d = Math.hypot((x - lon)*KMd*CL, (y - lat)*KMd); if (d < bd) { bd = d; b = nm; } } return b; };
  for (const sp of spots) { const e = sp.e; sp.lab = sp.kind === "st" ? LABS[e.n] || null : sp.kind === "vis" ? (e.n === "Logan Airport" ? "Logan" : e.n) : near(e.lon, e.lat, 1.6); e.lab = sp.lab; }
  // the names the without side already writes with their count are not written again
  const spotLabs = new Set(spots.map(sp => sp.lab).filter(Boolean));
  return C0.P = {names, spotLabs, base: dotBufY(new Float32Array(base)), jobs: dotBufY(new Float32Array(jobs)), st: dotBufY(new Float32Array(st)), h1: dotBufY(new Float32Array(h1)), vi: dotBufY(new Float32Array(vi)), spots, tot, raw: {st, h1, vi}}; }
// keep a share k of a city's people from abroad (each dot kept or not by a seeded draw): the projected side of the slides
function cityKeep(k, f) { const P = cityBuild(k); sd = 2026; const thin = a => { const o = []; for (let i = 0; i < a.length; i += 13) if (rnd() < f) for (let j = 0; j < 13; j++) o.push(a[i + j]); return dotBufY(new Float32Array(o)); };
  P.st = thin(P.raw.st); P.h1 = thin(P.raw.h1); P.vi = thin(P.raw.vi); }
function selectCity(k) { stopPlay(); if (CITYK && k && k !== CITYK) FROMK = CITYK; CITYK = k; HOVSP = null; SPLITX = null; yearsBar(); splitUI(); if (k) { cityBuild(k); if (EY < 2019 || EY > 2025) setYear(2019); } tweenCam(k ? cityCam(k) : CAMS.us(), CITYK && k && VIEW === "city" && PREVK && PREVK !== k ? 3200 : 1800); PREVK = k; legend(); totals(); cityHead(); if (k && typeof play === "function") play(2019, 2025); }
function cityHead() { splitUI(); if (VIEW !== "city") return; if (!CITYK) { $("hkick").textContent = KICK.city; $("htitle").textContent = HEADS.city[0]; $("hsub").textContent = HEADS.city[1]; return; } const P = cityBuild(CITYK), ti = CYEARS.indexOf(EY), t = ti >= 0 ? P.tot[ti] : null;
  $("hkick").textContent = KICK.city; $("htitle").textContent = CITIES[CITYK].name;
  $("hsub").textContent = !t ? "City counts cover 2019–2025." : "Drag the line across the city. To its right, the people who came from abroad are gone.";
}
const splitAt = () => SPLITX ?? (CITYK ? cityCam(CITYK).cx : W/2);
function splitUI() { const el = $("split"), on = ((VIEW === "city" && !!CITYK) || VIEW === "us") && MODE === "explore" && !EVT && !camT; el.hidden = !on; if (!on) return; const x = splitAt(); el.style.left = x + "px";
  const g = $("grip"), gw = 180; g.style.left = clamp(-gw/2, 8 - x, W - 8 - x - gw) + "px";
  const cross = id => { const e2 = $(id); if (!e2 || e2.hidden) return null; const r = e2.getBoundingClientRect(); return r.width && x > r.left - 8 && x < r.right + 8 ? r : null; }, top = [cross("head"), cross("yrbox")].filter(Boolean).reduce((m, r) => Math.max(m, r.bottom + 10), 0), bot = [cross("legend"), cross("years")].filter(Boolean).reduce((m, r) => Math.max(m, H - r.top + 10), 0);
  const ln = el.querySelector(".sln"); ln.style.top = top + "px"; ln.style.bottom = bot + "px"; }
{ let sd2 = null; for (const g2 of [$("grip"), $("shit")]) { g2.addEventListener("pointerdown", e => { sd2 = true; try { g2.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
  g2.addEventListener("pointermove", e => { if (!sd2) return; SPLITX = clamp(e.clientX, 24, W - 24); splitUI(); }); g2.addEventListener("pointerup", () => sd2 = null); g2.addEventListener("pointercancel", () => sd2 = null); }  const g2 = $("grip");
  g2.addEventListener("keydown", e => { const d = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0; if (!d) return; e.preventDefault(); SPLITX = clamp(splitAt() + d*(e.shiftKey ? 80 : 24), 24, W - 24); splitUI(); }); }
// ====== city labels. Without side: a place's name and its loss as one label, biggest first, nudged around its spot until it fits;
// small unnamed places only if there is room. With side: the place names. Nothing is drawn over the legend, the head, the totals, the handle or another label.
function cityLabels(P) { const sx = splitAt(), ti = CYEARS.indexOf(EY), ph = W < 760, KC = {st: "#f2e640", h1b: "#ff45c5", vis: "#7fc0dc"}, KK = {st: "cst", h1b: "ch1", vis: "cvis"}, ON = {st: LAY.cst, h1b: LAY.ch1, vis: LAY.cvis};
  const occ = ["legend", "head", "yrbox", "grip", "nav", "years"].map(id => $(id)).filter(e2 => e2 && !e2.hidden).map(e2 => { const r = e2.getBoundingClientRect(); return [r.left - 6, r.top - 4, r.right + 6, r.bottom + 4]; }).filter(r => r[2] > r[0]);
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1], free = r => r[0] > 6 && r[2] < W - 6 && r[1] > 6 && r[3] < H - 6 && !occ.some(o => hit(r, o)) && !put.some(o => hit(r, o)), put = [];
  const F1 = `11px ${CG}`, F2 = `500 11px ${CG}`; ov.save(); ov.lineJoin = "round"; ov.textBaseline = "middle"; ov.lineWidth = 3.5; ov.strokeStyle = "rgba(5,8,13,.9)";
  const draw = (parts, x, y, a) => { let cx2 = x; ov.globalAlpha = a; for (const [t, c, f] of parts) { ov.font = f; ov.strokeText(t, cx2, y); ov.fillStyle = c; ov.fillText(t, cx2, y); cx2 += ov.measureText(t).width; } ov.globalAlpha = 1; };
  const width = parts => parts.reduce((w2, [t, , f]) => { ov.font = f; return w2 + ov.measureText(t).width; }, 0);
  const place = (parts, q, r, a, rightOnly) => { const w2 = width(parts), h = 13, xs = [[q[0] - w2/2, q[1] + r + 9], [q[0] + r + 5, q[1]], [q[0] - w2/2, q[1] - r - 9], [q[0] - r - 5 - w2, q[1]]];
    for (let [x, y] of xs) { if (rightOnly && x < sx + 6) x = sx + 6; if (rightOnly === false && x + w2 > sx - 6) continue; const rc = [x - 2, y - h/2, x + w2 + 2, y + h/2]; if (!free(rc)) continue; put.push(rc); draw(parts, x, y, a); return true; } return false; };
  // ghosts: where the people were, a faint ring
  if (ti >= 0) { ov.lineWidth = .7; for (const sp of P.spots) { const v = sp.e.c[ti]; if (!v || !ON[sp.kind]) continue; const q = proj(v3(sp.e.lon, sp.e.lat)); if (q[2] < 0 || q[0] <= sx) continue; const r = Math.max(2.5, sp.sk/6371*CAM.R*.8); ov.globalAlpha = .32*hl(KK[sp.kind]); ov.strokeStyle = KC[sp.kind]; ov.beginPath(); ov.arc(q[0], q[1], r, 0, 6.283); ov.stroke(); } ov.globalAlpha = 1; ov.lineWidth = 3.5; ov.strokeStyle = "rgba(5,8,13,.9)"; }
  const done = new Set();
  if (ti >= 0) { const cand = [];
    for (const sp of P.spots) { const v = sp.e.c[ti]; if (!v || !ON[sp.kind]) continue; if (sp.kind === "h1b" ? v < (ph ? 150 : 60) : !sp.lab && v < (ph ? 500 : 150)) continue; const q = proj(v3(sp.e.lon, sp.e.lat)); if (q[2] < 0 || q[0] <= sx) continue; cand.push({sp, q, v}); }
    cand.sort((a, b) => (b.sp.kind === "vis") - (a.sp.kind === "vis") || (!!b.sp.lab) - (!!a.sp.lab) || b.v - a.v);
    let n = 0; for (const {sp, q, v} of cand) { if (n >= (ph ? 12 : 60)) break; const r = Math.max(4, sp.sk/6371*CAM.R*.8), a = .95*hl(KK[sp.kind]), cnt = "−" + fmt3(v) + (sp.kind === "vis" ? (sp.e.arr ? " arrivals" : " visitors") : "");
      const lab = sp.lab && !done.has(sp.lab) ? sp.lab : null, parts = lab ? [[lab + " ", "rgba(236,230,216,.92)", F1], [cnt, KC[sp.kind], F2]] : [[cnt, KC[sp.kind], F2]];
      if (place(parts, q, r, a, true)) { n++; if (lab) done.add(lab); } } }
  // names: on the with side every place's name (students' colleges too); on the without side only the towns not yet written
  const named = [...P.names.map(([nm, lon, lat, w2]) => ({nm, lon, lat, big: w2 > 1})), ...P.spots.filter(sp => sp.kind === "st" && sp.lab && (ti < 0 || sp.e.c[ti])).sort((a, b) => Math.max(...b.e.c) - Math.max(...a.e.c)).map(sp => ({nm: sp.lab, lon: sp.e.lon, lat: sp.e.lat, big: true, r: sp.sk}))];
  for (const o of named) { if (done.has(o.nm)) continue; const q = proj(v3(o.lon, o.lat)); if (q[2] < 0) continue; const left = q[0] < sx; if (!left && P.spotLabs.has(o.nm)) continue;
    const r = o.r ? Math.max(5, o.r/6371*CAM.R*.8) : 2; if (place([[o.nm, o.big ? "rgba(236,230,216,.9)" : "rgba(236,230,216,.58)", o.big ? `12px ${CG}` : `11px ${CG}`]], q, r, 1, left ? false : true)) done.add(o.nm); }
  ov.restore(); }
// faint borders between countries, drawn on the sphere
const BORD = {}; function bordBuf(skipUS) { const key = skipUS ? "n" : "a"; if (BORD[key]) return BORD[key]; const a = [], col = [.55, .7, .8];
  for (const [sid, [, rings]] of SH.entries()) if (!(skipUS && sid === USSID)) for (const r of rings) for (let i = 1; i < r.length; i++) { const [lo0, la0] = r[i - 1], [lo1, la1] = r[i]; if (Math.abs(lo1 - lo0) > 90) continue;
    for (const [lo, la] of [[lo0, la0], [lo1, la1]]) { const q = v3(lo, la); a.push(q[0]*1.0006, q[1]*1.0006, q[2]*1.0006, 1, 0, col[0], col[1], col[2], 255, 7); } }
  return BORD[key] = lnBuf(new Float32Array(a)); }
// =================================================================== overlay: outlines and names
function outline(sid, style) { const rings = SH[sid][1]; for (const r of rings) { ov.beginPath(); let pen = false; for (const [lo, la] of r) { const q = proj(v3(lo, la)); if (q[2] < 0) { pen = false; continue; } pen ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); pen = true; } ov.stroke(); } }
function drawOverlay(s) { ov.setTransform(DPR, 0, 0, DPR, 0, 0); ov.clearRect(0, 0, W, H);
  if (EVT && (EVT.cc || EVT.us)) { ov.save(); ov.strokeStyle = "rgba(242,185,80,.9)"; ov.lineWidth = 1; ov.lineJoin = "round";
    if (EVT.us) outline(USSID); else for (const n of EVT.cc) { const c = C.find(q => q.n === n); if (c && c.sid >= 0) outline(c.sid); } ov.restore();
    return; }
  if (MODE === "explore" && VIEW === "world" && HOVK != null && HOVK !== SEL && C[HOVK].sid >= 0) { ov.save(); ov.strokeStyle = "rgba(236,230,216,.35)"; ov.lineWidth = 1; ov.lineJoin = "round"; outline(C[HOVK].sid); ov.restore(); }
  if (MODE === "explore" && VIEW === "us") { const so = (k, a, w) => { ov.strokeStyle = `rgba(236,230,216,${a})`; ov.lineWidth = w; ov.lineJoin = "round"; for (const r of smooth(ST.r[k])) { ov.beginPath(); r.forEach(([lo, la], i) => { const q = proj(v3(lo, la)); i ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); }); ov.closePath(); ov.stroke(); } };
    if (HOVS != null && HOVS !== SELS) so(HOVS, .45, 1); if (SELS != null) so(SELS, .85, 1.2); }
  if (CARD && CARD.vis && !$("selc").hidden) { const ex = CARD.x > CARD.ax ? CARD.x : CARD.x + CARD.w, ey = clamp(CARD.ay, CARD.y + 14, CARD.y + CARD.h - 14); ov.strokeStyle = "rgba(236,230,216,.4)"; ov.lineWidth = 1; ov.beginPath(); ov.moveTo(CARD.ax, CARD.ay); ov.lineTo(ex, ey); ov.stroke(); ov.fillStyle = "#ece6d8"; ov.beginPath(); ov.arc(CARD.ax, CARD.ay, 2.2, 0, 6.283); ov.fill(); }
  if (MODE === "explore" && VIEW === "world" && SEL != null && C[SEL].sid >= 0) { ov.save(); ov.strokeStyle = "rgba(236,230,216,.7)"; ov.lineWidth = 1; ov.lineJoin = "round"; outline(C[SEL].sid); ov.restore(); }
  if (MODE === "explore" && VIEW === "city" && CITYK) { const zf = CAM.R/cityCam(CITYK).R, ca = clamp((zf - .12)/.2); if (ca > .01) { ov.save(); ov.strokeStyle = `rgba(127,192,220,${.5*ca})`; ov.lineWidth = .8; ov.lineJoin = "round";
      for (const r of smooth(ST.city[CITYK])) { ov.beginPath(); r.forEach(([lo, la], n) => { const q = proj(v3(lo, la)); n ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); }); ov.stroke(); } ov.restore(); }
    if (zf < .32) { const fa = clamp((.32 - zf)/.2); ov.save(); ov.strokeStyle = `rgba(236,230,216,${.3*fa})`; ov.lineWidth = .9; for (const r of D2.usb.n) { ov.beginPath(); let pen = false; for (const [lo, la] of r) { const q = proj(v3(lo, la)); if (q[2] < 0) { pen = false; continue; } pen ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); pen = true; } ov.stroke(); } ov.restore(); }
    if (zf > .55 && !camT) cityLabels(cityBuild(CITYK));
    if (HOVSP) { const q = proj(v3(HOVSP.e.lon, HOVSP.e.lat)), r = Math.max(10, HOVSP.sk/6371*CAM.R*1.6); ov.strokeStyle = "rgba(236,230,216,.7)"; ov.beginPath(); ov.arc(q[0], q[1], r, 0, 6.283); ov.stroke(); } }
  else if (MODE === "explore" && USV) { const ln = (set, a, w) => { ov.strokeStyle = `rgba(236,230,216,${a})`; ov.lineWidth = w; for (const r of set) { ov.beginPath(); let pen = false; for (const [lo, la] of r) { const q = proj(v3(lo, la)); if (q[2] < 0) { pen = false; continue; } pen ? ov.lineTo(q[0], q[1]) : ov.moveTo(q[0], q[1]); pen = true; } ov.stroke(); } };
    ln(D2.usb.s, .12, .6); ln(D2.usb.n, .3, .9);
    for (const c of CITYPT) { const q = proj(v3(c[2], c[3])); if (q[2] <= 0) continue; const on = HOVC === c, big = VIEW === "city", r = (big ? 18 : 10) + (on ? 4 : 0); ov.strokeStyle = `rgba(236,230,216,${on ? .9 : big ? .7 : .4})`; ov.lineWidth = big ? 1.3 : 1; ov.beginPath(); ov.arc(q[0], q[1], r, 0, 6.283); ov.stroke();
      if (big) { ov.font = "12px 'Century Gothic', CenturyGothic, AppleGothic, 'URW Gothic', sans-serif"; ov.fillStyle = `rgba(236,230,216,${on ? 1 : .75})`; if (W < 760) { ov.textAlign = "center"; ov.fillText(c[1], clamp(q[0], 44, W - 44), q[1] + r + 18); } else { ov.textAlign = c[0] === "la" ? "right" : "left"; ov.fillText(c[1], q[0] + (c[0] === "la" ? -r - 6 : r + 6), q[1] + 4); } ov.textAlign = "left"; } } } }

// =================================================================== loop
addEventListener("resize", () => { if (SPLITX != null) SPLITX = clamp(SPLITX, 24, W - 24); splitUI(); });
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; for (const c of [glc, lnc, fxc, ovc]) { c.width = Math.round(W*DPR); c.height = Math.round(H*DPR); } gl.viewport(0, 0, glc.width, glc.height); layout(); if (MODE !== "film" && !camT) { const k = VIEW === "city" && CITYK ? cityCam(CITYK) : VIEW === "us" && SELS != null ? stateCam(SELS) : USV ? CAMS.us() : EVT ? CAMS.evt(EVT) : null; if (k) CAM = k; else { const w = CAMS.world(); CAM.R = w.R; CAM.cx = w.cx; CAM.cy = w.cy; } } }
addEventListener("resize", resize); resize(); CAM = CAMS.us(); gl.enable(gl.BLEND);
let last = 0, idle = 0;
function frame(now) { const dt = last ? Math.min(.1, (now - last)/1000) : 0; last = now; YT = Math.min(1, YT + dt/.85); if (YT >= 1) YA = YB; SELT = Math.min(9, SELT + dt/1.6); WTR = Math.min(2, WTR + dt/1.5);
  if (MODE === "film" && PLAY && !EVT) { T += dt; if (T >= PH[PI_].dur) { if (PI_ >= PH.length - 2) enterExplore(); else { PI_++; T = 0; } } }
  let s = MODE === "film" ? filmState(PI_, T) : null;
  if (camT) { const u = ease(clamp((now - camT.t0)/camT.ms)); CAM = camMix(camT.a, camT.b, u); if (u >= 1) { camT = null; splitUI(); } }
  else if (s && !EVT) CAM = s.cam;
  if (MODE === "explore" && VIEW === "world" && !drag && !camT && SEL == null && now - idle > 4000) CAM.lon += dt*2.2;
  ROT = rot(CAM);
  // the line and its people
  if (MODE === "film" && !EVT) { LC = s.lc; YOFF = 0; YOFF = s.yo*(H*.5 - L.Y0(nimAt(2024.45))); drawLine(s, now); drawCrowd(s); $("gl").style.opacity = s.globe; $("ov").style.opacity = s.globe; $("ln").style.opacity = 1;
    const id = PH[PI_].id; caption(id === "crowd" && T > 3.6 ? CAP.crowd : id === "fly" && T > 2.2 ? CAP.county : id === "trace" && T > .6 ? CAP.visa : id === "rem" ? CAP.rem : ""); note(id === "note" && T > .4 ? CAP.note : ""); }
  else if (EVT && MODE === "film") { fx.clearRect(0, 0, fxc.width, fxc.height); }
  else if (MODE === "explore" && VIEW === "line") { if (EVT) DVT = 0; DV += (DVT - DV)*Math.min(1, dt*2.6); if (Math.abs(DVT - DV) < .001) DV = DVT; const u = ease(DV), op = ease(clamp((DV - .45)/.5));
    if (FLY0) { FLYP = clamp(FLYP + dt/3.6); if (FLYP >= 1) { FLY0 = 0; FLYP = 0; DV = DVT = 0; NOGROW = true; setYear(2024); setView("us"); NOGROW = false; requestAnimationFrame(frame); return; } }
    LC = lcMix(WHOLE(), DIVE, u); YOFF = 0; YOFF = u*(H*.5 - L.Y0(nimAt(2024.45)));
    const ls = {strands: 1, chart: 1 - ease(clamp(FLYP/.35)), pen: 2025, fan: 1, op, yo: u, flyOut: ease(clamp(FLYP/.33)), lc: LC, fly: FLYP, cens: 1, spotsHint: 0}; drawLine(ls, now); if (FLYP > 0) { CAM = CAMS.us(); ROT = rot(CAM); drawCrowd(ls); $("gl").style.opacity = ease(clamp((FLYP - .15)/.5)); $("ov").style.opacity = 0; } else { fx.clearRect(0, 0, fxc.width, fxc.height);
      if (EVT) { placeEvc(); const sp = SPOTS.find(q => q[2] === EVT); fx.setTransform(DPR, 0, 0, DPR, 0, 0); if (sp) { fx.strokeStyle = "rgba(242,185,80,.9)"; fx.lineWidth = 1; fx.beginPath(); fx.arc(sp[0], sp[1], 9, 0, 6.283); fx.stroke(); }
        if (EVCARD) { const ex = EVCARD.x > EVCARD.ax ? EVCARD.x : EVCARD.x + EVCARD.w, ey = clamp(EVCARD.ay, EVCARD.y + 14, EVCARD.y + EVCARD.h - 14), dx = ex - EVCARD.ax, dy = ey - EVCARD.ay, L0 = Math.hypot(dx, dy) || 1; fx.strokeStyle = "rgba(236,230,216,.45)"; fx.beginPath(); fx.moveTo(EVCARD.ax + dx/L0*9, EVCARD.ay + dy/L0*9); fx.lineTo(ex, ey); fx.stroke(); } } }
    $("divb").textContent = DVT > .5 ? "← The whole line" : W < 760 ? "The people, 2024–25 ↓" : "See the people in 2024–25 ↓"; $("land").hidden = DV < .9 || FLYP > 0 || !!EVT; $("dive").hidden = !!EVT;
    caption(EVT ? "" : FLYP > .25 ? CAP.county : DV > .85 ? CAP.crowd : DV < .05 ? (W < 760 ? "Tap a year · tap a glowing spot · scroll for the people" : "Hover for a year · click a glowing spot · scroll down to see the people") : "");
    if (HOVY != null && !EVT) { const X = L.X(HOVY), Y = L.Y(nimAt(HOVY)); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.strokeStyle = "rgba(236,230,216,.25)"; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(X, L.Y(L.vhi)); g.lineTo(X, L.Y(L.vlo)); g.stroke(); g.setLineDash([]); g.fillStyle = "#ece6d8"; g.beginPath(); g.arc(X, Y, 3.2, 0, 6.283); g.fill(); } }
  // the globe
  const gA = EVT && MODE === "explore" ? 0 : EVT || (MODE === "explore" && VIEW !== "line") ? 1 : MODE === "explore" ? (FLYP > 0 ? 1 : 0) : s.globe;
  gl.clearColor(.0196, .0314, .051, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  if (gA > .01) { drawBg(1); const usish = MODE === "explore" && (USV || (VIEW === "line" && FLYP > 0)), zf = VIEW === "city" && CITYK ? CAM.R/cityCam(CITYK).R : 0, far = zf ? clamp((.32 - zf)/.2) : 1;
    if (!usish) drawDots(LAND, {tr: 2, size: 1, alpha: .7, glow: false});   // around the US, and around a city, the land is only its outline
    if (usish ? far > .01 : (MODE === "film" && !EVT)) drawDots(LANDUS, {tr: 2, size: 1, alpha: .7*far, glow: false});
    if (EVT || VIEW === "world") drawLines(bordBuf(), {alpha: EVT ? .1 : .15});   // around the US, no other country is drawn
    if (EVT) drawDots(visasFor(EVT.yi), {tr: 2, lit: 1, dimA: .28});
    else if (MODE === "explore") { const y = EY, k = vI(y);
      if (VIEW === "city" && CITYK) { const fl = camT ? clamp((now - camT.t0)/camT.ms) : 1, DK = FROMK && fl < .5 ? FROMK : CITYK; if (!camT) FROMK = null; const P = cityBuild(DK), sx = camT ? glc.width : Math.round(clamp(splitAt(), 0, W)*DPR), za = clamp((CAM.R/cityCam(DK).R - .08)/.3); drawDots(P.base, {size: 1, alpha: .75*za, glow: false, yr: 1});
        if (LAY.cjob) drawDots(P.jobs, {size: 1, alpha: .5*za*Math.max(hl("cjob"), .35), glow: false, yr: 1});
        const people = (wa, gh) => { const ha = [8, .2], a = k => wa*za*hl(k); if (LAY.cvis) drawDots(P.vi, {size: 1.05, alpha: .7*a("cvis"), glow: !gh && a("cvis") > .5, halo: ha, yr: 1}); if (LAY.cst) drawDots(P.st, {size: 1.05, alpha: .7*a("cst"), glow: !gh && a("cst") > .5, halo: ha, yr: 1}); if (LAY.ch1) drawDots(P.h1, {size: 1.05, alpha: .78*a("ch1"), glow: !gh && a("ch1") > .5, halo: ha, yr: 1}); };
        gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, sx, glc.height); people(1, false); gl.disable(gl.SCISSOR_TEST); }
      else if (USV) { const dm = SELS == null ? .4 : .16, zs = clamp(Math.sqrt(CAM.R/CAMS.us().R), 1, 2.2); usLit(); if (LAY.pop) drawDots(popPool(), {size: .95*zs, alpha: .42*hl("pop"), lit: 1, dimA: dm*.8*hl("pop"), glow: false}); const nat = natSplit(); if (nat) { gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, camT ? glc.width : Math.round(clamp(splitAt(), 0, W)*DPR), glc.height); } if (LAY.cens) drawDots(censusPool(), {size: 1.2*zs, alpha: .8*hl("cens"), lit: 1, dimA: dm*hl("cens"), yr: 1, glow: hl("cens") > .5}); if (LAY.lprus) drawDots(greenUSPool(), {size: 1.15*zs, alpha: .85*hl("lprus"), lit: 1, dimA: dm*hl("lprus"), yr: 1, glow: hl("lprus") > .5}); if (LAY.det) drawDots(detPool(), {size: 1.3*zs, alpha: .95*hl("det"), lit: 1, dimA: dm*hl("det"), yr: 1, halo: [12, .3*hl("det")], glow: hl("det") > .5}); if (nat) gl.disable(gl.SCISSOR_TEST); }
      else if (VIEW === "world") { worldLit(); const dm = SEL == null ? .4 : .2, tr = WTR;
        if (LAYT.some(Boolean)) { const P = visaPool(); drawLines(P.l, {tr, alpha: .3, lit: 1, yr: 1}); drawDots(P.d, {tr, lit: 1, dimA: dm, yr: 1}); }
        if (LAY.lpr) { const P = greenPool(), h = hl("lpr"); drawLines(P.l, {tr, alpha: .26*h, lit: 1, yr: 1}); drawDots(P.d, {tr, alpha: .9*h, lit: 1, dimA: dm*h, yr: 1, glow: h > .5}); }
        if (LAY.rem) { const P = remPool(), h = hl("rem"); drawLines(P.l, {tr, alpha: .6*h, lit: 1, dim: .05, yr: 1}); drawDots(P.d, {tr, alpha: .9*h, lit: 1, dimA: dm*h, yr: 1, glow: h > .5}); }
        if (LAY.det) { const h = hl("det"); drawDots(detPool(), {size: 1.3, alpha: .95*h, yr: 1, halo: [12, .3*h], glow: h > .5}); } } }
    else { if (s.visA > .01) { drawLines(arcsFor(YI), {tr: s.tr, alpha: .16*s.visA}); drawDots(visasFor(YI), {tr: s.tr, alpha: .82*s.visA}); }
      if (s.remA > .01) { const ry = YEARS.indexOf(2025); drawLines(remArcsFor(ry), {tr: s.rtr, alpha: .34*s.remA}); drawDots(remsFor(ry), {tr: s.rtr, alpha: .9*s.remA}); } } }
  if (!$("selc").hidden) placeSel(); drawOverlay(s); chap(); lnc.style.pointerEvents = (MODE === "film" && PI_ < 4 && !EVT) || (MODE === "explore" && VIEW === "line" && !FLY0) ? "auto" : "none";
  requestAnimationFrame(frame); }
ovc.addEventListener("pointermove", () => idle = performance.now());
window.APP = {cityKeep, dive: v => { DVT = v; }, land: () => { FLY0 = performance.now(); }, get DV() { return DV; }, go: (i, t) => { if (MODE !== "film") backToLine(); MODE = "film"; PI_ = i; T = t; PLAY = false; $("pp").textContent = "Play"; }, PH, SPOTS, openEvent, closeEvent, enterExplore, toUS, setYear, setView, LAY, LAYT, select, legend, C, selectCity, ST, get CITYK() { return CITYK; }, events: D.events, CAMS, get CAM() { return CAM; }, set CAM(v) { CAM = v; }};
MODE = "explore"; ["head", "yrbox"].forEach(id => $(id).hidden = false); $("ctrl").hidden = true; $("back").hidden = true; setYear(2024); setView("line", true);
document.fonts.ready.then(() => requestAnimationFrame(frame));
