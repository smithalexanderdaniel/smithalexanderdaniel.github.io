// inside the presentation (iframe name "pres-embed"): views and cards on command, keys and the pointer passed up
(() => { if (window.name !== "pres-embed") return; const P = parent, R = document.documentElement;
  const st = document.createElement("style");
  st.textContent = "#nav,#back,#ctrl,#dive,#hint{display:none!important}" +
    "html.cardmode,html.cardmode body{background:transparent!important}html.nohead #head{display:none!important}" +
    "#evc figure.mapfig{width:256px;height:336px;box-sizing:border-box;background:#05080d;border:1px solid rgba(236,230,216,.1);display:flex;flex-direction:column;align-items:center;justify-content:center}#evc figure.mapfig .mini{margin:0;text-align:center}#evc figure.mapfig .mini canvas{width:236px;height:150px;-webkit-mask-image:none;mask-image:none}#evc figure.mapfig .mini span{margin-top:10px}" +
    "html.cardmode canvas:not(#evmap),html.cardmode #bgc,html.cardmode #head,html.cardmode #yrbox,html.cardmode #legend,html.cardmode #years,html.cardmode #tip,html.cardmode #selc,html.cardmode #split,html.cardmode #cap,html.cardmode #note{visibility:hidden!important}";
  document.head.appendChild(st);
  // the rebound, as a card of its own: what it was, in the Census's numbers and the team's words
  EVHEAD["2021-24"] = "The unprecedented rise after the pandemic.";
    EVHEAD["2025-dc"] = "The collapse.";

  const REB = {date: "2021-24", yr: 2024, rot: [-98, 39], us: true, kind: "measurement", when: "2021–2024", t: 2024, title: "Net international migration, 2021–2024", quote: null,
    what: "Immediately after the pandemic, an unprecedented rise in immigration, far beyond a mere rebound: net international migration rose from 376,000 in the year to July 2021 to 2.73 million in the year to July 2024, the highest of any year since 2001. From 2022 to 2024 the foreign-born share of the U.S. population grew to its highest rate in more than a century.",
    m: {fixed: [["2021", 376026], ["2024", 2734468]], lab: "Net international migration, years to 1 July, U.S. Census Bureau"},
    attribution: "Census Bureau, Vintage 2025 · foreign-born share: Brookings Institution", url: "https://www.census.gov/programs-surveys/popest.html"};
  const DEC = {date: "2025-dc", yr: 2025, rot: [-98, 39], us: true, kind: "measurement", when: "2025", t: 2025, title: "Net international migration, 2024–2025", quote: null,
    what: "The very next year, the immigration rate collapsed, even more severely than during Covid: net international migration fell from 2.73 million in the year to July 2024 to 1.26 million in the year to July 2025. For 2026 the published projections run from +650,000 (CBO) and +321,000 (Census Bureau) down to −925,000 (Brookings/AEI scenarios).",
    m: {fixed: [["2024", 2734468], ["2025", 1262202]], lab: "Net international migration, years to 1 July, U.S. Census Bureau"},
    attribution: "Census Bureau, Vintage 2025 · 2026 projections: CBO, Census Bureau, Brookings/AEI", url: "https://www.census.gov/programs-surveys/popest.html"};
  const close0 = closeEvent; closeEvent = function () { close0.apply(this, arguments); if (R.classList.contains("cardmode")) { R.classList.remove("cardmode"); P.postMessage({artClosed: 1}, "*"); } };
  const IT = b => b.dataset.g != null ? ["g", +b.dataset.g] : ["k", b.dataset.k];
  const itOn = ([t, v]) => t === "g" ? VG[v][1].some(x => LAYT[x]) : !!LAY[v];
  const itSet = ([t, v], on) => { if (t === "g") VG[v][1].forEach(x => LAYT[x] = on ? 1 : 0); else LAY[v] = on; };
  document.getElementById("legend").addEventListener("click", e => { if (VIEW !== "world") return; const b = e.target.closest(".it"); if (!b) return;
    e.stopImmediatePropagation(); const all = [...document.querySelectorAll("#legend .it")].map(IT), me = IT(b), solo = itOn(me) && all.every(x => (x[0] === me[0] && x[1] === me[1]) || !itOn(x));
    for (const x of all) itSet(x, solo || (x[0] === me[0] && x[1] === me[1])); LAY.visa = LAYT.some(Boolean); HILITE = null; LITKEY = ""; legend(); }, true);
  addEventListener("message", e => { const d = e.data || {};
    if (d.cmd === "view") { R.classList.remove("cardmode"); R.classList.toggle("nohead", d.view === "world"); if (EVT) close0(); NOGROW = true; const v = d.view === "bos" ? "city" : d.view; if (MODE === "film") APP.enterExplore(v); else APP.setView(v, !d.fly); stopPlay(); APP.setYear(2024); SPLITX = null; splitUI(); if (d.view === "bos") APP.selectCity("bos"); }
    if (d.cmd === "card") { R.classList.add("cardmode"); if (EVT) close0(); const ev = d.ev === "rebound" ? REB : d.ev === "decline" ? DEC : D.events.find(x => x.date === d.ev); if (ev) { openEvent(ev); const card = document.querySelector("#evc .card");
      if (card && card.classList.contains("np")) { const mini = card.querySelector(".mini"), fig = document.createElement("figure"); fig.className = "mapfig"; fig.appendChild(mini); card.insertBefore(fig, card.firstChild); card.classList.remove("np"); drawEvMap(ev); } } }
    if (d.cmd === "close" && EVT) { R.classList.remove("cardmode"); close0(); } });
  addEventListener("keydown", e => { const k = e.key; if (k === "Escape") return;
    if ([" ", "Enter", "ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Backspace", "f", "F"].includes(k)) {
      if (document.activeElement && document.activeElement.id === "grip" && (k === "ArrowLeft" || k === "ArrowRight")) return;
      e.preventDefault(); e.stopImmediatePropagation(); P.postMessage({presKey: k}, "*"); } }, true);
  addEventListener("pointermove", e => P.postMessage({presY: e.clientY/innerHeight}, "*"), {passive: true});
  addEventListener("resize", () => setTimeout(() => { if (MODE !== "film") APP.setYear(EY); }, 0));   // laid out while hidden (0 wide): redo the year bar once it has a size
  P.postMessage({artReady: 1}, "*"); })();
