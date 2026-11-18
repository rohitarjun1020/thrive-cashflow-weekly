/* Thrive Front Desk: page logic. Figures come from ThriveModel (assets/model.js) over data.js. */
(function () {
  "use strict";
  const T = ThriveModel.create(window.CF);
  const C = window.ThriveCharts;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = T.lakh, I = T.inr;
  const PASS_HASH = "c815fd02b26f77f58a46401ec1e1646448c8744b0aa5a3a0822a1ade3118f201";
  const ASK_CLAUDE_URL = "https://claude.ai/artifact/R8gTMHXmcD2ymPSeBSErmQ"; // set to the private claude.ai artifact link

  /* ---------------- state & link settings ---------------- */
  const M = T.M, W = T.W, last = M[M.length - 1];
  const fyStart = (key) => (+key.slice(5) >= 4 ? key.slice(0, 4) : String(+key.slice(0, 4) - 1)) + "-04";
  const PRESETS = [];
  for (let y = 2024; ; y++) {
    const from = y + "-04", to = (y + 1) + "-03";
    if (from > last.key) break;
    const ytd = to > last.key;
    PRESETS.push({ id: "fy" + y, name: `FY${String(y).slice(2)}-${String(y + 1).slice(2)}${ytd ? " YTD" : ""}`, from, to: ytd ? last.key : to });
  }
  PRESETS.push({ id: "all", name: "All", from: M[0].key, to: last.key });
  const S = { from: fyStart(T.lastActual.key), to: last.key, cat: "All", min: 0, proj: true, grain: null, bgrain: null, view: "desk",
    tab: "stmt", search: "", expand: false, open: new Set(), page: 0, sort: { k: "date", d: -1 }, tx: null, allPay: false, wi: {} };
  if (S.from < M[0].key) S.from = M[0].key;
  function readHash() {
    try {
      const h = new URLSearchParams(location.hash.slice(1));
      const ok = (k) => M.some((m) => m.key === k);
      if (h.get("from") && ok(h.get("from"))) S.from = h.get("from");
      if (h.get("to") && ok(h.get("to"))) S.to = h.get("to");
      if (S.to < S.from) S.to = S.from;
      const c = h.get("cat"); if (c && (c === "All" || T.ACTS.includes(c) || T.SP[c])) S.cat = c;
      if (h.get("min") != null && h.get("min") !== "" && !isNaN(+h.get("min"))) S.min = +h.get("min") * 1e5;
      if (h.get("proj") != null) S.proj = h.get("proj") !== "0";
      if (["w", "m"].includes(h.get("g"))) S.grain = h.get("g");
      if (["desk", "whatif", "ask"].includes(h.get("view"))) S.view = h.get("view");
    } catch (e) { /* bad link: keep defaults */ }
  }
  function writeHash() {
    const p = new URLSearchParams({ from: S.from, to: S.to, cat: S.cat, min: String(+(S.min / 1e5).toFixed(2)), proj: S.proj ? "1" : "0" });
    if (S.grain) p.set("g", S.grain);
    if (S.view !== "desk") p.set("view", S.view);
    try { history.replaceState(null, "", "#" + p.toString()); } catch (e) { /* file:// or sandbox */ }
  }
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } } };

  /* ---------------- helpers ---------------- */
  const monthsSel = () => T.months(S.from, S.to, S.proj);
  const weeksSel = () => T.weeks(S.from, S.to, S.proj);
  const catName = (c) => (c === "All" ? "All categories" : T.ACTS.includes(c) ? c + " activity" : T.SP[c] ? T.SP[c].name : c);
  const periodTxt = () => { const ms = monthsSel(); return ms.length ? (ms[0].key === ms[ms.length - 1].key ? ms[0].long : `${ms[0].label} to ${ms[ms.length - 1].label}`) : ""; };
  const lowWord = () => (S.min ? "Below " + L(S.min) : "Overdrawn");
  const alertStamps = (v) => [v < 0 ? stamp("od", "Overdrawn") : "", S.min && v < S.min ? stamp("od", "Below " + L(S.min)) : ""].filter(Boolean).join(" ");
  const balStamps = (v) => alertStamps(v) || stamp("ac", "In credit");
  const stamp = (kind, txt) => `<span class="stamp ${kind}">${esc(txt)}</span>`;
  function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (e.hidden = true), 2400); }
  const icon = {
    arrow: '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    eyeOff: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 3l14 14M8.2 5a8.6 8.6 0 0 1 1.8-.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.2 2.9M5.5 6.6A13.6 13.6 0 0 0 2 10s3 5.5 8 5.5a7.6 7.6 0 0 0 3.2-.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    sun: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  };
  const CHARMINAR = `<svg class="charm" viewBox="0 0 160 172" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
    <path d="M6 164h148M12 158h136v6M12 158V150h136v8"/>
    <path d="M34 150V72h92v78"/><path d="M34 72h92M32 66h96v6M34 66V58h92v8"/>
    <path d="M60 150v-40q0-22 20-32q20 10 20 32v40"/><path d="M64 150v-38q0-18 16-27q16 9 16 27v38"/>
    <path d="M40 98q0-8 6-12q6 4 6 12v12H40zM108 98q0-8 6-12q6 4 6 12v12h-12z"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((k) => { const x = 38 + k * 12.3; return `<path d="M${x} 66v-4q0-4 4.5-6q4.5 2 4.5 6v4"/>`; }).join("")}
    ${[[22, 8], [138, 8]].map(([x, t]) => `<path d="M${x - 6} 150V44h12v106"/><path d="M${x - 8} 100h16M${x - 8} 96h16M${x - 9} 66h18M${x - 9} 62h18M${x - 8} 44h16"/><path d="M${x - 5} 44v-8h10v8M${x - 7} 36h14"/><path d="M${x - 6} 36q-1-12 6-18q7 6 6 18"/><path d="M${x} 18v-${18 - t}"/><circle cx="${x}" cy="${t + 2}" r="1.2"/>`).join("")}
    ${[52, 108].map((x) => `<path d="M${x - 4} 58V40h8v18M${x - 5} 40q0-7 5-11q5 4 5 11M${x} 29v-5"/>`).join("")}
    <path d="M74 58v-6h12v6M76 52q0-5 4-8q4 3 4 8"/>
  </svg>`;

  /* ---------------- controls ---------------- */
  function renderControls() {
    $("#presets").innerHTML = PRESETS.map((p) => `<button type="button" data-p="${p.id}" class="${S.from === p.from && S.to === p.to ? "on" : ""}" aria-pressed="${S.from === p.from && S.to === p.to}">${esc(p.name)}</button>`).join("");
    const opts = M.map((m) => `<option value="${m.key}">${esc(m.label)}${m.actual ? "" : m.weeks.some((i) => W[i].actual) ? " (part planned)" : " (planned)"}</option>`).join("");
    $("#fFrom").innerHTML = opts; $("#fTo").innerHTML = opts;
    $("#fFrom").value = S.from; $("#fTo").value = S.to;
    $("#fCat").innerHTML = `<option value="All">All categories</option><optgroup label="Activity (proposed classification)">${T.ACTS.map((a) => `<option value="${a}">${a}</option>`).join("")}</optgroup><optgroup label="Spend category">${T.SPEND.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</optgroup>`;
    $("#fCat").value = S.cat;
    $("#fMin").value = +(S.min / 1e5).toFixed(2);
    $("#fProj").checked = S.proj;
  }
  function wireControls() {
    $("#presets").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const p = PRESETS.find((x) => x.id === b.dataset.p); S.from = p.from; S.to = p.to; S.grain = null; S.tx = null; render(); });
    $("#fFrom").addEventListener("change", (e) => { S.from = e.target.value; if (S.to < S.from) S.to = S.from; S.grain = null; render(); });
    $("#fTo").addEventListener("change", (e) => { S.to = e.target.value; if (S.from > S.to) S.from = S.to; S.grain = null; render(); });
    $("#fCat").addEventListener("change", (e) => { S.cat = e.target.value; render(); });
    $("#fMin").addEventListener("change", (e) => { S.min = (+e.target.value || 0) * 1e5; render(); });
    $("#fProj").addEventListener("change", (e) => { S.proj = e.target.checked; render(); });
    $("#grain").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.grain = b.dataset.g; renderCF(); writeHash(); });
    $("#balGrain").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.bgrain = b.dataset.g; renderBal(); });
    $("#printBtn").addEventListener("click", () => window.print());
    $("#goWhatif").addEventListener("click", () => go("whatif"));
    $$(".views button").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  }

  /* ---------------- front desk band ---------------- */
  function renderDesk() {
    const h = new Date().getHours();
    $("#greet").textContent = (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + " · " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
    const sv = T.meta.saved ? new Date(T.meta.saved) : null;
    $("#asOf").textContent = `Actual weeks to ${T.lastActual.long}${T.meta.statementsTo ? " (bank statements to " + new Date(T.meta.statementsTo + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ")" : ""} · file saved ${sv ? sv.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ", " + sv.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""}` + (T.plannedW.length ? ` · planned to ${T.plannedW[T.plannedW.length - 1].long}` : "");
    const v = T.verdict(S.min);
    $("#verdict").textContent = v.text;

    const ms = monthsSel(), t = T.totals(ms, S.cat), tAll = T.totals(ms);
    const planned = S.proj && ms.some((m) => !m.actual), lastM = ms[ms.length - 1];
    const closeWeek = lastM ? (lastM.weeks.length ? W[lastM.weeks.filter((i) => S.proj || W[i].actual).slice(-1)[0]] : null) : null;
    const st = (pl) => (pl ? stamp("mx", "Incl. planned") : stamp("ac", "Actual"));
    const avgNet = tAll.net / Math.max(ms.length, 1);
    let runway;
    const months = (x) => (x > 36 ? "over 3 years" : "about " + x.toFixed(1) + " months");
    if (tAll.close < S.min) runway = S.min ? `Already below your ${L(S.min)} alert level` : "Runway: not applicable while overdrawn";
    else if (avgNet >= 0) runway = (tAll.close < 0 ? "Overdrawn, but " : "") + "cash grew on average in this period";
    else if (S.min) runway = `${L(tAll.close - S.min)} above your ${L(S.min)} alert level: ${months((tAll.close - S.min) / -avgNet)} at the average monthly burn of ${L(-avgNet)}`;
    else runway = `Runway: ${months(tAll.close / -avgNet)} at the average monthly burn of ${L(-avgNet)}`;
    const fl = S.cat !== "All" ? `<span class="s">${esc(catName(S.cat))} only</span>` : "";
    const rent = t.v.r11 || 0, dep = t.v.r12 || 0;
    const firstOpenTxt = ms[0] ? (ms[0].weeks.length ? W[ms[0].weeks[0]].short.split("–")[0].replace(/^(\d+)$/, "$1 " + T.MON[+ms[0].key.slice(5) - 1]) : ms[0].label) : "";
    const tags = [
      { lb: "Opening · " + (ms[0] ? ms[0].label : ""), v: L(tAll.open), cls: tAll.open < 0 ? "neg" : "", st: balStamps(tAll.open), s: "Bank balance at the start of " + (ms[0] ? ms[0].long : "the period") },
      { lb: "Money in", v: L(t.in), cls: "", st: st(planned), s: S.cat === "All" ? `Rent ${L(rent)} · deposits ${L(dep)}` : catName(S.cat) },
      { lb: "Money out", v: L(t.out), cls: "", st: st(planned), s: S.cat === "All" ? `Landlord rent ${L(T.gsum(t.v, "rent"))}` : catName(S.cat) },
      { lb: "Net cash flow", v: (t.net > 0 ? "+" : "") + L(t.net), cls: t.net < 0 ? "neg" : t.net > 0 ? "pos" : "", st: st(planned), s: t.net < 0 ? "More went out than came in" : "More came in than went out" },
      { lb: "Closing · " + (closeWeek ? closeWeek.short : lastM ? lastM.label : ""), v: L(tAll.close), cls: tAll.close < 0 ? "neg" : "", st: (closeWeek && !closeWeek.actual ? stamp("pl", "Planned") + " " : "") + balStamps(tAll.close), s: runway },
    ];
    $("#tags").innerHTML = tags.map((x) => `<div class="tag"><span class="lb">${esc(x.lb)}</span><b class="v ${x.cls}">${esc(x.v)}</b>${x.st}<span class="s">${esc(x.s)}</span></div>`).join("");
    if (S.cat !== "All") $("#tags").insertAdjacentHTML("beforeend", "");
    const b = T.balances;
    $("#balances").innerHTML = b ? `<span>Balances at ${esc(b.week.long)}:</span><span>ICICI bank (cash book) <b class="${b.bank < 0 ? "neg" : ""}">${esc(L(b.bank))}</b></span><span>Razorpay <b class="${b.rzp < 0 ? "neg" : ""}">${esc(L(b.rzp))}</b></span><span>Together <b class="${b.combined < 0 ? "neg" : ""}">${esc(L(b.combined))}</b></span>${S.cat !== "All" ? `<span>· Money in, out and net show ${esc(catName(S.cat))} only; balances are for the whole account.</span>` : ""}` : "";
    $("#printScope").textContent = `Thrive Living cash flow · ${periodTxt()} · ${catName(S.cat)} · alert level ${S.min ? L(S.min) : "₹0 (overdrawn)"} · ${S.proj ? "planned weeks included" : "actuals only"} · ${v.text}`;
  }

  /* ---------------- key rack ---------------- */
  function renderRack() {
    const room = Math.max(4, Math.floor((($("#rack").clientWidth || 600) + 12) / 86));
    const ws = T.actualW.slice(-Math.max(3, room - T.plannedW.length)).concat(T.plannedW);
    $("#rack").innerHTML = ws.map((w) => {
      const bad = w.close < S.min, od = !bad && w.close < 0, cls = w.actual ? (bad ? "bad" : od ? "odw" : "ok") : "pl" + (bad || od ? " badp" : "");
      const here = w === T.lastActual ? " here" : "";
      return `<div class="peg"><button type="button" class="kt ${cls}${here}" data-w="${w.i}" aria-label="${esc(w.long)}: closing ${esc(L(w.close))}, ${w.actual ? "actual" : "planned"}${bad ? ", " + lowWord().toLowerCase() : od ? ", overdrawn" : ""}">${esc(w.short)}<b>${esc(T.lakhNum(w.close))}</b><small>${w.actual ? (here ? "Latest" : "Actual") : "Planned"}</small></button></div>`;
    }).join("");
    $("#rackLegend").innerHTML = `<span><i class="sw ok"></i>${S.min > 0 ? "At or above " + esc(L(S.min)) : "In credit"}</span>${S.min < 0 ? `<span><i class="sw odw"></i>Overdrawn, above ${esc(L(S.min))}</span>` : ""}<span><i class="sw bad"></i>${esc(lowWord())}</span><span><i class="sw plan"></i>Planned</span>`;
    const el = $("#rack"), here = el.querySelector(".kt.here"); el.scrollLeft = here ? Math.max(0, here.parentElement.offsetLeft - el.offsetLeft - 6) : el.scrollWidth;
    const next = T.plannedW[0];
    const card = (w, title) => {
      if (!w) return "";
      const bad = w.close < S.min || w.close < 0, st = alertStamps(w.close);
      const lines = T.topHeads(w.v, "out", 3).map((h) => `<li><span>${esc(h.name)}</span><b>${esc(L(h.v))}</b></li>`).join("");
      return `<button type="button" class="rw" data-w="${w.i}"><span class="rw-h">${esc(title)} <span class="stamp ${w.actual ? "ac" : "pl"}">${w.actual ? "Actual" : "Planned"}</span>${st ? " " + st : ""}</span>
        <span class="rw-d">${esc(w.long)}</span>
        <span class="rw-f"><span>In <b>${esc(L(w.inflow))}</b></span><span>Out <b>${esc(L(w.outflow))}</b></span><span>Closes <b class="${bad ? "neg" : ""}">${esc(L(w.close))}</b></span></span>
        <ul>${lines}</ul></button>`;
    };
    $("#rackWeeks").innerHTML = card(T.lastActual, "Latest week") + card(next, "Next week");
  }

  /* ---------------- watch ---------------- */
  function renderWatch() {
    const w = T.watch(S.min);
    $("#watch").innerHTML = w.length ? w.map((x) => `<li class="${x.level}"><span class="dot" aria-hidden="true"></span><div><b>${esc(x.title)}</b><p>${esc(x.text)}</p></div>${x.week != null ? `<button type="button" class="link" data-w="${x.week}">Open week</button>` : ""}</li>`).join("") : `<li class="info"><span class="dot"></span><div><b>Nothing to flag</b><p>No overdrawn streak, large landlord payment or rent gap in the latest weeks.</p></div></li>`;
  }

  /* ---------------- cash flow chart ---------------- */
  function cfItems() {
    const ws = weeksSel();
    const g = S.grain || (ws.length > 40 || ($("#cfChart").clientWidth || 600) < 560 ? "m" : "w");
    $$("#grain button").forEach((b) => { b.classList.toggle("on", b.dataset.g === g); b.setAttribute("aria-pressed", b.dataset.g === g); });
    if (g === "w") return ws.map((w) => { const f = T.flows(w, S.cat); return { kind: "w", ref: w, label: w.short, tip: w.long, in: f.in, out: f.out, planned: !w.actual }; });
    return monthsSel().map((m) => {
      const f = T.flows(m, S.cat), planned = !m.actual && !m.partial;
      let inA = 0, outA = 0; if (planned) m.weeks.forEach((i) => { if (W[i].actual) { const x = T.flows(W[i], S.cat); inA += x.in; outA += x.out; } });
      return { kind: "m", ref: m, label: m.label, tip: m.long + (m.partial ? " (actual weeks only)" : planned ? (inA || outA ? " (actual weeks plus planned)" : " (planned)") : ""), in: f.in, out: f.out, inA, outA, planned };
    });
  }
  function renderCF() {
    const items = cfItems();
    $("#cfHint").textContent = `${periodTxt()} · ${catName(S.cat)}. Money in above the line, money out below, net as the line. Click a bar for its line items.`;
    C.inout($("#cfChart"), items, { fmt: L, label: "Money in and money out, " + periodTxt(), onClick: (d) => (d.kind === "w" ? openWeek(d.ref.i) : openMonth(d.ref.key)) });
  }

  /* ---------------- upcoming payments ---------------- */
  function renderPay() {
    const u = T.upcoming();
    if (!u.rows.length) { $("#pay").innerHTML = `<tbody><tr><td>No planned weeks in this workbook.</td></tr></tbody>`; $("#paySub").textContent = ""; $("#payMore").hidden = true; return; }
    const lastW = T.plannedW[T.plannedW.length - 1];
    $("#paySub").textContent = `${L(u.total)} planned out by ${lastW.long}, against ${L(u.inflow)} planned in.`;
    const LIM = 7, shown = S.allPay ? u.rows : [...u.rows].sort((a, b) => b.v - a.v).slice(0, LIM).sort((a, b) => a.week.i - b.week.i || b.v - a.v);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let wk = null, h = "<tbody>";
    shown.forEach((r) => {
      if (r.week !== wk) {
        wk = r.week;
        const now = today >= new Date(wk.start + "T00:00") && today <= new Date(wk.end + "T00:00");
        h += `<tr class="wk"><td colspan="2">${esc(wk.long)}${now ? " · this week" : ""}</td><td class="num">${wk.close < S.min ? stamp("od", "Closes " + (S.min ? "below alert" : "overdrawn")) : stamp("pl", "Planned")}</td></tr>`;
      }
      h += `<tr><td colspan="2"><b>${esc(r.name)}</b><small>${esc(r.grp ? T.SP[r.grp].name : r.id ? "" : "Several small heads")}</small></td><td class="num"><b>${esc(I(r.v))}</b></td></tr>`;
    });
    $("#pay").innerHTML = h + "</tbody>";
    const more = $("#payMore");
    more.hidden = u.rows.length <= LIM;
    more.textContent = S.allPay ? `Show the largest ${LIM}` : `Show all ${u.rows.length} payments`;
  }

  /* ---------------- closing balance ---------------- */
  function renderBal() {
    const g = S.bgrain || (weeksSel().length > 40 || ($("#balChart").clientWidth || 600) < 560 ? "m" : "w");
    $$("#balGrain button").forEach((b) => { b.classList.toggle("on", b.dataset.g === g); b.setAttribute("aria-pressed", b.dataset.g === g); });
    const pts = g === "w"
      ? weeksSel().map((w) => ({ label: w.short, tip: w.long, v: w.close, planned: !w.actual, ref: w }))
      : monthsSel().map((m) => ({ label: m.label, tip: m.long + " month end" + (m.partial ? " (last actual week)" : ""), v: m.close, planned: !m.actual && !m.partial, ref: m }));
    const below = pts.filter((p) => p.v < S.min).length;
    $("#balHint").textContent = `${below} of ${pts.length} ${g === "w" ? "week" : "month"}-ends ${S.min ? "closed below your " + L(S.min) + " alert level" : "were overdrawn (shaded)"}. Whole account, not filtered by category.`;
    C.balance($("#balChart"), pts, { min: S.min, fmt: L, label: "Closing bank balance, " + periodTxt(), onClick: (p) => (g === "w" ? openWeek(p.ref.i) : openMonth(p.ref.key)) });
  }

  /* ---------------- spend ---------------- */
  function renderSpend() {
    const t = T.totals(monthsSel()), sp = T.spend(t.v), tot = sp.reduce((a, x) => a + x.v, 0) || 1, mx = sp.length ? sp[0].v : 1;
    $("#spendSub").textContent = `${periodTxt()} · ${L(t.out)} out. Click a category to filter the page.`;
    $("#spend").innerHTML = sp.map((x) => `<button type="button" class="sp ${S.cat === x.id ? "on" : ""}" data-c="${x.id}" aria-pressed="${S.cat === x.id}"><span class="nm">${esc(x.name)}</span><span class="am">${esc(L(x.v))}</span><span class="bar"><i style="width:${(x.v / tot * 100).toFixed(1)}%"></i></span><span class="pc">${Math.round(x.v / tot * 100)}% of spend</span></button>`).join("") || `<p class="hint">No spend in this period.</p>`;
  }

  /* ---------------- landlords ---------------- */
  function renderLand() {
    const lm = T.landlordMonth(), ll = T.landlords(lm), lmTxt = T.monthLabel(lm);
    const ms = monthsSel(), t = T.totals(ms), cov = T.cover(t.v);
    $("#llSub").textContent = `Monthly commitment is each landlord's latest regular rent in the Landlord Rent Payments sheet, to ${T.monthLong(lm)}. Rent cover uses the selected period.`;
    $("#llFigs").innerHTML = `<div class="fig"><span>Monthly commitment</span><b>${esc(L(ll.commit))}</b></div><div class="fig"><span>Rent collected ÷ rent paid, ${esc(periodTxt())}</span><b class="${cov == null ? "" : cov >= 1 ? "pos" : "neg"}">${cov == null ? "–" : cov.toFixed(2) + "×"}</b></div><div class="fig"><span>Paid to landlords in period</span><b>${esc(L(T.rentOut(t.v)))}</b>${t.v.r27 ? `<small class="hint">incl. ${esc(L(t.v.r27))} duplicate payment (Cash Flow row 27)</small>` : ""}</div>`;
    C.building($("#building"), ll.props, { fmt: L, inr: I, monthTxt: lmTxt, label: "Monthly rent commitment by property, drawn as floors" });
    // table: landlord months inside the selected period, else the last six
    let cols = ll.months.filter((k) => k >= S.from && k <= S.to);
    if (!cols.length) cols = ll.months.slice(-6);
    if (cols.length > 6) cols = cols.slice(-6);
    const idx = cols.map((k) => ll.months.indexOf(k));
    let h = `<thead><tr><th class="sticky">Property / landlord</th>${cols.map((k) => { const m = M.find((x) => x.key === k); return `<th class="num">${esc(T.monthLabel(k))}${m && !m.actual ? "<br><small>so far</small>" : ""}</th>`; }).join("")}<th class="num pt">Monthly commitment</th></tr></thead><tbody>`;
    ll.props.forEach((p) => {
      h += `<tr class="tot"><td class="sticky">${esc(p.name)}</td>${idx.map((j) => `<td class="num">${esc(T.lakhNum(p.rows.reduce((a, r) => a + (r.pay[j] || 0), 0)))}</td>`).join("")}<td class="num pt">${esc(T.lakhNum(p.commit))}</td></tr>`;
      p.rows.forEach((r) => { h += `<tr class="leaf"><td class="sticky">${esc(r.name)}</td>${idx.map((j) => `<td class="num ${r.pay[j] ? "" : "dim"}">${r.pay[j] ? esc(T.lakhNum(r.pay[j])) : "–"}</td>`).join("")}<td class="num pt">${esc(T.lakhNum(r.commit))}</td></tr>`; });
    });
    $("#llTable").innerHTML = h + `</tbody><caption class="sr">Landlord rent paid by month, ₹ lakh</caption>`;
  }

  /* ---------------- register ---------------- */
  function stmtModel() { const ms = monthsSel(); return { ms, rows: T.statement(ms) }; }
  function renderStmt() {
    const { ms, rows } = stmtModel(), q = S.search.toLowerCase();
    $$("#expand button").forEach((b) => { const on = (b.dataset.e === "1") === S.expand; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    let h = `<table class="data"><thead><tr><th class="sticky">₹ lakh</th>${ms.map((m) => `<th class="num">${esc(m.label)}${m.partial ? "<br><small>actual weeks</small>" : !m.actual ? "<br><small>incl. planned</small>" : ""}</th>`).join("")}<th class="num pt" title="Opening and closing show the period's first opening and last closing; every other row is the sum of the months">Period total</th></tr></thead><tbody>`;
    let n = 0;
    rows.forEach((r) => {
      if (q && r.k === "leaf" && !r.name.toLowerCase().includes(q)) return;
      if (r.k === "leaf" && !q && !(S.expand || S.open.has(r.p))) return;
      const hl = S.cat !== "All" && ((r.id && r.id === S.cat) || (r.p && r.p === S.cat) || (r.hid && T.H[r.hid] && T.H[r.hid].act === S.cat)) ? " hl" : "";
      const cls = r.k === "grp" ? "grp" + (S.expand || S.open.has(r.id) || q ? " open" : "") : r.k === "tot" ? "tot" : "leaf";
      if (r.k === "leaf") n++;
      h += `<tr class="${cls}${hl}" ${r.k === "grp" ? `data-g="${r.id}" tabindex="0" aria-expanded="${S.expand || S.open.has(r.id)}"` : ""}><td class="sticky">${esc(r.name)}</td>${r.v.map((v) => `<td class="num ${Math.abs(v) < 500 ? "dim" : v < 0 && (r.k === "tot" || r.k === "adj") ? "neg" : ""}">${Math.abs(v) < 500 ? "–" : esc(T.lakhNum(v))}</td>`).join("")}<td class="num pt ${r.pt < 0 && r.k === "tot" ? "neg" : ""}">${Math.abs(r.pt) < 500 ? "–" : esc(T.lakhNum(r.pt))}</td></tr>`;
    });
    $("#paneStmt").innerHTML = h + "</tbody></table>";
    $("#regCount").textContent = `${ms.length} month${ms.length === 1 ? "" : "s"}${q ? ` · ${n} matching line${n === 1 ? "" : "s"}` : ""}`;
    $("#pager").innerHTML = "";
  }
  function txRows() {
    const tx = window.CF.tx, q = S.search.toLowerCase();
    let rows = tx.filter((t) => t[0] >= S.from && t[0] <= S.to);
    if (S.tx && S.tx.start) rows = rows.filter((t) => t[1] && t[1] >= S.tx.start && t[1] <= S.tx.end);
    if (S.tx && S.tx.month) rows = rows.filter((t) => t[0] === S.tx.month);
    if (S.tx && S.tx.head) rows = rows.filter((t) => t[6] === S.tx.head);
    if (S.cat !== "All") rows = rows.filter((t) => t[6] && T.H[t[6]] && T.headIn(T.H[t[6]], S.cat));
    if (q) rows = rows.filter((t) => (t[3] + " " + t[5] + " " + t[7]).toLowerCase().includes(q));
    const k = S.sort.k, d = S.sort.d;
    rows.sort((a, b) => (k === "amt" ? (a[4] - b[4]) : ((a[1] || a[0]) < (b[1] || b[0]) ? -1 : (a[1] || a[0]) > (b[1] || b[0]) ? 1 : 0)) * d);
    return rows;
  }
  function renderTx() {
    const rows = txRows(), PER = 100, pages = Math.max(1, Math.ceil(rows.length / PER));
    S.page = Math.min(S.page, pages - 1);
    const pg = rows.slice(S.page * PER, S.page * PER + PER);
    const arrow = (k) => (S.sort.k === k ? (S.sort.d > 0 ? " ↑" : " ↓") : "");
    $("#paneTx").innerHTML = `<table class="data"><thead><tr><th><button type="button" data-sort="date">Date${arrow("date")}</button></th><th>Source</th><th>Description</th><th>Head</th><th class="num"><button type="button" data-sort="amt">Amount${arrow("amt")}</button></th></tr></thead><tbody>${pg.map((t) => `<tr><td class="n" style="white-space:nowrap">${esc(t[1] ? new Date(t[1] + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : T.monthLabel(t[0]))}</td><td><span class="src">${t[2] === "B" ? "Bank" : "Razorpay"}</span></td><td>${esc(t[3])}${t[7] ? `<br><small class="hint">${esc(t[7])}</small>` : ""}</td><td>${esc(t[6] ? T.H[t[6]].name : t[5] || "–")}</td><td class="num ${t[4] < 0 ? "neg" : "pos"}">${esc(I(t[4]))}</td></tr>`).join("") || `<tr><td colspan="5">No lines match.</td></tr>`}</tbody></table>`;
    const sum = rows.reduce((a, t) => a + t[4], 0);
    $("#regCount").textContent = `${rows.length.toLocaleString("en-IN")} line${rows.length === 1 ? "" : "s"} · net ${I(sum)}`;
    $("#pager").innerHTML = pages > 1 ? `<button type="button" class="btn" data-pg="-1" ${S.page ? "" : "disabled"}>Previous</button><span>Page ${S.page + 1} of ${pages}</span><button type="button" class="btn" data-pg="1" ${S.page < pages - 1 ? "" : "disabled"}>Next</button>` : "";
  }
  function renderChips() {
    const c = [];
    if (S.tx) c.push(`<span class="chip">${esc(S.tx.label)}<button type="button" data-x="tx" aria-label="Remove filter ${esc(S.tx.label)}">×</button></span>`);
    if (S.cat !== "All") c.push(`<span class="chip">${esc(catName(S.cat))}<button type="button" data-x="cat" aria-label="Remove category filter">×</button></span>`);
    $("#txChips").innerHTML = c.join("");
  }
  function renderReg() {
    const tx = S.tab === "tx";
    $("#tabStmt").setAttribute("aria-selected", !tx); $("#tabTx").setAttribute("aria-selected", tx);
    $("#paneStmt").hidden = tx; $("#paneTx").hidden = !tx; $("#expand").hidden = tx;
    $("#regSearch").placeholder = tx ? "Search descriptions, heads, notes" : "Search lines";
    renderChips();
    tx ? renderTx() : renderStmt();
  }
  function wireReg() {
    $("#tabStmt").addEventListener("click", () => { S.tab = "stmt"; renderReg(); });
    $("#tabTx").addEventListener("click", () => { S.tab = "tx"; S.page = 0; renderReg(); });
    $("#regSearch").addEventListener("input", (e) => { S.search = e.target.value; S.page = 0; renderReg(); });
    $("#expand").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.expand = b.dataset.e === "1"; S.open.clear(); renderStmt(); });
    const toggle = (tr) => { const g = tr.dataset.g; if (S.expand) { S.expand = false; S.open = new Set(T.SPEND.map((x) => x.id).concat("IN")); } S.open.has(g) ? S.open.delete(g) : S.open.add(g); renderStmt(); const n = $(`#paneStmt tr[data-g="${g}"]`); if (n) n.focus(); };
    $("#paneStmt").addEventListener("click", (e) => { const tr = e.target.closest("tr.grp"); if (tr) toggle(tr); });
    $("#paneStmt").addEventListener("keydown", (e) => { const tr = e.target.closest("tr.grp"); if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(tr); } });
    $("#paneTx").addEventListener("click", (e) => { const b = e.target.closest("[data-sort]"); if (!b) return; const k = b.dataset.sort; S.sort = { k, d: S.sort.k === k ? -S.sort.d : -1 }; renderTx(); });
    $("#pager").addEventListener("click", (e) => { const b = e.target.closest("[data-pg]"); if (!b) return; S.page += +b.dataset.pg; renderTx(); $("#s-register").scrollIntoView({ block: "start" }); });
    $("#txChips").addEventListener("click", (e) => { const b = e.target.closest("[data-x]"); if (!b) return; if (b.dataset.x === "tx") S.tx = null; else S.cat = "All"; render(); });
    $("#csvBtn").addEventListener("click", () => exportTable("csv"));
    $("#copyBtn").addEventListener("click", () => exportTable("tsv"));
    $("#payMore").addEventListener("click", () => { S.allPay = !S.allPay; renderPay(); });
    $("#spend").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; S.cat = S.cat === b.dataset.c ? "All" : b.dataset.c; render(); });
    document.addEventListener("click", (e) => { const b = e.target.closest("[data-w]"); if (b && !e.target.closest(".drawer")) openWeek(+b.dataset.w); });
  }
  function tableData() {
    if (S.tab === "tx") return [["Date", "Month", "Source", "Description", "Head", "Workbook category", "Notes", "Amount (INR)"]].concat(txRows().map((t) => [t[1], t[0], t[2] === "B" ? "Bank" : "Razorpay", t[3], t[6] ? T.H[t[6]].name : "", t[5], t[7], t[4].toFixed(2)]));
    const { ms, rows } = stmtModel();
    return [["Line (INR)", ...ms.map((m) => m.key), "Period total"]].concat(rows.map((r) => [(r.k === "leaf" ? "  " : "") + r.name, ...r.v.map((v) => v.toFixed(2)), r.pt.toFixed(2)]));
  }
  function exportTable(kind) {
    const rows = tableData(), name = `thrive-${S.tab === "tx" ? "transactions" : "cash-flow-statement"}-${S.from}-to-${S.to}`;
    if (kind === "csv") {
      const q = (s) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
      const blob = new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + ".csv"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("CSV downloaded");
    } else {
      const tsv = rows.map((r) => r.map((c) => String(c == null ? "" : c).replace(/[\t\n]/g, " ")).join("\t")).join("\n");
      (navigator.clipboard ? navigator.clipboard.writeText(tsv) : Promise.reject()).then(() => toast("Copied. Paste into Excel"), () => {
        const ta = document.createElement("textarea"); ta.value = tsv; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Copied. Paste into Excel"); } catch (e) { toast("Copy failed: use Download CSV"); } ta.remove();
      });
    }
  }

  /* ---------------- drawer ---------------- */
  let lastFocus = null;
  function drawer(title, sub, body) {
    lastFocus = document.activeElement;
    $("#drawerTitle").innerHTML = title; $("#drawerSub").innerHTML = sub; $("#drawerBody").innerHTML = body;
    $("#drawer").hidden = false; $("#scrim").hidden = false; ["header.top", "#filters", "main"].forEach((q) => { const e = $(q); if (e) e.inert = true; }); $("#drawerClose").focus();
    C.hideTip();
  }
  function closeDrawer() { $("#drawer").hidden = true; $("#scrim").hidden = true; ["header.top", "#filters", "main"].forEach((q) => { const e = $(q); if (e) e.inert = false; }); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function lineTables(x) {
    const ins = T.topHeads(x.v, "in", 99), outs = T.topHeads(x.v, "out", 99);
    const tbl = (rows, cls) => rows.length ? `<table class="data"><tbody>${rows.map((r) => `<tr><td>${esc(r.name)}${S.cat !== "All" && T.headIn(T.H[r.id], S.cat) ? " " + stamp("mx", "in filter") : ""}</td><td class="num ${cls}">${esc(I(r.v))}</td></tr>`).join("")}</tbody></table>` : `<p class="hint">None.</p>`;
    return `<h3>Money in · ${esc(I(x.inflow))}</h3>${tbl(ins, "")}<h3>Money out · ${esc(I(x.outflow))}</h3>${tbl(outs, "")}`;
  }
  function openWeek(i) {
    const w = W[i];
    const st = (w.actual ? stamp("ac", "Actual") : stamp("pl", "Planned")) + (w.close < S.min ? " " + stamp("od", lowWord()) : "");
    drawer(`Week of ${esc(w.long)} ${st}`, `Opening ${esc(I(w.open))} · closing ${esc(I(w.close))}${Math.abs(w.close - w.open - (w.inflow - w.outflow)) > 1 ? ` · Razorpay movement ${esc(I(w.close - w.open - (w.inflow - w.outflow)))}` : ""}`,
      lineTables(w) + `<p style="margin-top:16px"><button type="button" class="btn" id="dGoTx">See the bank and Razorpay lines ${icon.arrow}</button></p>`);
    $("#dGoTx").addEventListener("click", () => { S.tx = { start: w.start, end: w.end, label: "Week of " + w.long }; if (w.key < S.from || w.key > S.to) { S.from = S.to = w.key; } gotoTx(); });
  }
  function openMonth(key) {
    const m = monthsSel().find((x) => x.key === key) || M.find((x) => x.key === key);
    const st = m.actual ? stamp("ac", "Actual") : m.partial ? stamp("ac", "Actual weeks only") : stamp("mx", "Incl. planned");
    drawer(`${esc(m.long)} ${st}`, `Opening ${esc(I(m.open))} · closing ${esc(I(m.close))} · net ${esc(I(m.inflow - m.outflow))}`,
      lineTables(m) + `<p style="margin-top:16px"><button type="button" class="btn" id="dGoTx">See the bank and Razorpay lines ${icon.arrow}</button></p>`);
    $("#dGoTx").addEventListener("click", () => { S.tx = { month: m.key, label: m.long }; gotoTx(); });
  }
  function gotoTx() { closeDrawer(); S.tab = "tx"; S.page = 0; S.search = ""; $("#regSearch").value = ""; go("desk", true); render(); $("#s-register").scrollIntoView({ block: "start" }); }

  /* ---------------- what if ---------------- */
  function renderWhatIfForm() {
    const pw = T.plannedW, opt = pw.map((w) => `<option value="${w.i}">${esc(w.long)}</option>`).join("");
    $("#wiForm").innerHTML = pw.length ? `
      <fieldset><legend>Rent collection</legend><div class="row"><input type="range" id="wRent" min="-30" max="20" step="5" value="0" aria-describedby="wRentO"><output id="wRentO">0%</output></div><small>Changes rent from tenants in the planned weeks.</small></fieldset>
      <fieldset><legend>Delay renovation &amp; repairs spend</legend><select id="wReno" class="ctl">${[0, 1, 2, 3, 4].map((n) => `<option value="${n}">${n ? n + " week" + (n > 1 ? "s" : "") + " later" : "As planned"}</option>`).join("")}</select></fieldset>
      <fieldset><legend>Delay landlord rent</legend><select id="wRentDelay" class="ctl">${[0, 1, 2, 3].map((n) => `<option value="${n}">${n ? n + " week" + (n > 1 ? "s" : "") + " later" : "As planned"}</option>`).join("")}</select><small>Spend pushed past ${esc(pw[pw.length - 1].long)} leaves the plan's window.</small></fieldset>
      <fieldset><legend>Add a new property</legend><div class="pair"><label><small>Rent to landlord (₹ L)</small><input id="wNewRent" class="ctl" type="number" min="0" step="0.5" value="0"></label><label><small>Rent collected (₹ L)</small><input id="wNewInc" class="ctl" type="number" min="0" step="0.5" value="0"></label></div><label><small>In the week of</small><select id="wNewWk" class="ctl">${opt}</select></label></fieldset>
      <fieldset><legend>One-off amount</legend><div class="pair"><label><small>₹ L (+ received, − paid)</small><input id="wOne" class="ctl" type="number" step="0.5" value="0"></label><label><small>Week</small><select id="wOneWk" class="ctl">${opt}</select></label></div></fieldset>
      <button type="button" class="btn" id="wReset">Reset to the plan</button>` : `<p>No planned weeks in this workbook, so there is nothing to test.</p>`;
    $("#wiForm").addEventListener("input", readWhatIf);
    const r = $("#wReset"); if (r) r.addEventListener("click", () => { renderWhatIfForm(); readWhatIf(); });
  }
  function readWhatIf() {
    const v = (id) => { const e = $("#" + id); return e ? +e.value || 0 : 0; };
    if (!$("#wRent")) { renderWhatIf(); return; }
    $("#wRentO").textContent = (v("wRent") > 0 ? "+" : "") + v("wRent") + "%";
    S.wi = { rentPct: v("wRent"), delayReno: v("wReno"), delayRent: v("wRentDelay"), newRent: v("wNewRent") * 1e5, newIncome: v("wNewInc") * 1e5, newWeek: v("wNewWk"), oneOff: v("wOne") * 1e5, oneOffWeek: v("wOneWk") };
    renderWhatIf();
  }
  function renderWhatIf() {
    const r = T.whatIf(S.wi), pw = T.plannedW;
    if (!pw.length) { $("#wiVerdict").textContent = "No planned weeks to test."; return; }
    const same = r.rows.every((x) => Math.abs(x.cb - x.plan) < 0.005);
    const d = r.end - r.planEnd, endW = pw[pw.length - 1];
    $("#wiVerdict").textContent = same ? `With no changes, ${endW.long} closes at ${L(r.planEnd)}, exactly as planned.` : `With these changes, ${endW.long} closes at ${L(r.end)}, ${d >= 0 ? L(d) + " better" : L(-d) + " worse"} than the plan's ${L(r.planEnd)}.`;
    const lvl = S.min ? "below the " + L(S.min) + " alert level" : "overdrawn", startBad = T.lastActual.close < S.min;
    const firstBelow = r.rows.find((x) => x.cb < S.min), firstOk = r.rows.find((x) => x.cb >= S.min);
    const state = startBad ? (firstOk ? ` Already ${lvl} at the start; back above it in ${firstOk.week.long}.` : ` Already ${lvl} at the start, and stays ${lvl} through ${endW.long}.`)
      : firstBelow ? ` First week ${lvl}: ${firstBelow.week.long}.` : ` Never ${lvl} in the planned weeks.`;
    $("#wiSub").textContent = `Starts from the last actual closing balance, ${L(T.lastActual.close)} on ${T.lastActual.long}, and replays the ${pw.length} planned weeks.` + state + (r.beyond > 0 ? ` ${L(r.beyond)} moves past ${endW.long}.` : "");
    $("#wiBadge").innerHTML = same ? `<span class="badge same">Matches the plan exactly</span>` : `<span class="badge diff">Differs from the plan</span>`;
    const pts = [{ label: T.lastActual.short, tip: T.lastActual.long + " (last actual)", v: T.lastActual.close, planned: false }].concat(r.rows.map((x) => ({ label: x.week.short, tip: x.week.long, v: x.cb, planned: true })));
    C.balance($("#wiChart"), pts, { min: S.min, fmt: L, height: 240, label: "What-if closing balance", ghost: [T.lastActual.close].concat(r.rows.map((x) => x.plan)) });
    $("#wiTable").innerHTML = `<thead><tr><th>Week</th><th class="num">Money in</th><th class="num">Money out</th><th class="num">Plan closing</th><th class="num">What-if closing</th><th class="num">Difference</th></tr></thead><tbody>${r.rows.map((x) => { const df = x.cb - x.plan; return `<tr><td>${esc(x.week.long)}</td><td class="num">${esc(I(x.rc))}</td><td class="num">${esc(I(x.out))}</td><td class="num ${x.plan < 0 ? "neg" : ""}">${esc(I(x.plan))}</td><td class="num ${x.cb < 0 ? "neg" : ""}"><b>${esc(I(x.cb))}</b></td><td class="num ${df > 0.5 ? "pos" : df < -0.5 ? "neg" : ""}">${Math.abs(df) < 0.5 ? "–" : (df > 0 ? "+" : "") + esc(I(df))}</td></tr>`; }).join("")}</tbody>`;
  }

  /* ---------------- ask ---------------- */
  let ASK = null;
  function initAsk() {
    ASK = ThriveAsk.create(T, { getMin: () => S.min });
    if (ASK_CLAUDE_URL) { const a = $("#askClaude"); a.href = ASK_CLAUDE_URL; a.hidden = false; }
    $("#askSugg").innerHTML = ASK.suggestions().map((q) => `<button type="button">${esc(q)}</button>`).join("");
    $("#askSugg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
    $("#askForm").addEventListener("submit", () => { const q = $("#askIn").value.trim(); if (q) { ask(q); $("#askIn").value = ""; } });
    $("#askLog").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) ask(b.dataset.q); });
    $("#askLog").innerHTML = `<div class="msg bot"><p>Hello. I answer questions about Thrive's cash flow straight from the ${esc(T.meta.source || "weekly file")}. Actual figures run to ${esc(T.lastActual.long)}; later weeks are planned. Try one of the questions below.</p></div>`;
  }
  function ask(q) {
    const log = $("#askLog");
    log.insertAdjacentHTML("beforeend", `<div class="msg me">${esc(q)}</div>`);
    const a = ASK.answer(q);
    log.insertAdjacentHTML("beforeend", `<div class="msg bot">${a.html}</div>`);
    log.lastElementChild.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /* ---------------- views, theme, gate ---------------- */
  function go(view, quiet) {
    S.view = view;
    $$(".views button").forEach((b) => (b.dataset.view === view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
    $$(".view").forEach((v) => (v.hidden = v.id !== "v-" + view));
    $("#filters").hidden = view === "ask";
    if (view === "whatif") renderWhatIf();
    if (!quiet) { writeHash(); window.scrollTo(0, 0); }
    if (view === "desk") requestAnimationFrame(drawCharts);
  }
  function setThemeIcon() {
    const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    $("#themeBtn").innerHTML = dark ? icon.sun : icon.moon; $("#themeBtn").setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    return dark;
  }
  async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  function unlocked() { try { return sessionStorage.getItem("thrive.ok") === PASS_HASH || localStorage.getItem("thrive.ok") === PASS_HASH; } catch (e) { return false; } }
  function gate(onOpen) {
    const g = $("#gate");
    if (unlocked()) { g.hidden = true; onOpen(); return; }
    document.body.style.overflow = "hidden";
    g.hidden = false;
    g.innerHTML = `<div class="gate-in">${CHARMINAR}
      <form class="keycard" autocomplete="off" aria-labelledby="gH"><div class="stripe" aria-hidden="true"></div><span class="word">THRIVE</span>
        <h1 id="gH">Front desk check-in</h1><p>Enter the passcode to open Thrive's cash-flow dashboard.</p>
        <label class="sr" for="pc">Passcode</label><div class="pc"><input id="pc" type="password" placeholder="Passcode" autocomplete="current-password" required><button type="button" id="pcEye" aria-label="Show passcode" aria-pressed="false">${icon.eye}</button></div>
        <label class="rem"><input type="checkbox" id="rem" checked>Remember this device</label>
        <p class="err" id="pcErr" role="alert"></p>
        <button class="go" type="submit">Check in ${icon.arrow}</button></form>
      <p class="note">Thrive Living · Hyderabad · prepared by Strategy Studio Labs</p></div>`;
    $("#pcEye").addEventListener("click", () => { const i = $("#pc"), b = $("#pcEye"), show = i.type === "password"; i.type = show ? "text" : "password"; b.setAttribute("aria-pressed", show); b.setAttribute("aria-label", show ? "Hide passcode" : "Show passcode"); b.innerHTML = show ? icon.eyeOff : icon.eye; i.focus(); });
    $("#pc").focus();
    $("form", g).addEventListener("submit", async (e) => {
      e.preventDefault();
      const h = await sha($("#pc").value.trim());
      if (h !== PASS_HASH) { $("#pcErr").textContent = "That passcode didn't match. Check it and try again."; g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake"); $("#pc").select(); return; }
      try { sessionStorage.setItem("thrive.ok", h); if ($("#rem").checked) localStorage.setItem("thrive.ok", h); } catch (er) { /* storage blocked: open for this view */ }
      g.hidden = true; document.body.style.overflow = ""; onOpen();
    });
  }

  /* ---------------- motion: things settle into place once, as they come into view ---------------- */
  function initMotion() {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("motion");
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = e.target; io.unobserve(t); t.classList.add("in");
      if (t.matches(".chart, #rack, #tags")) setTimeout(() => t.classList.add("done"), 1600); // later redraws (filters) don't replay
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$(".grid > .card, .chart, #rack, #tags").forEach((t) => io.observe(t));
  }

  /* ---------------- render ---------------- */
  function drawCharts() { if (S.view !== "desk") return; renderCF(); renderBal(); renderLand(); }
  function render() {
    renderControls(); renderDesk(); renderRack(); renderWatch(); renderPay(); renderSpend(); renderReg();
    drawCharts();
    if (S.view === "whatif") renderWhatIf();
    writeHash();
  }
  function renderFoot() {
    $("#foot").innerHTML = `<span></span><span>Prepared by Strategy Studio Labs, CFO services</span>`;
  }

  function boot() {
    readHash();
    wireControls(); wireReg();
    $("#scrim").addEventListener("click", closeDrawer);
    $("#drawerClose").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer(); });
    setThemeIcon();
    $("#themeBtn").addEventListener("click", () => { const dark = setThemeIcon(); document.documentElement.dataset.theme = dark ? "light" : "dark"; store.set("thrive.theme", document.documentElement.dataset.theme); setThemeIcon(); drawCharts(); if (S.view === "whatif") renderWhatIf(); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { setThemeIcon(); drawCharts(); });
    $("#lockBtn").addEventListener("click", () => { try { sessionStorage.removeItem("thrive.ok"); localStorage.removeItem("thrive.ok"); } catch (e) { /* ignore */ } location.reload(); });
    window.addEventListener("hashchange", () => { const before = JSON.stringify([S.from, S.to, S.cat, S.min, S.proj, S.view]); readHash(); if (JSON.stringify([S.from, S.to, S.cat, S.min, S.proj, S.view]) !== before) { go(S.view, true); render(); } });
    const top = () => document.documentElement.style.setProperty("--top-h", ($(".top").offsetHeight + ($("#filters").offsetHeight || 0) + 8) + "px");
    new ResizeObserver(top).observe(document.body);
    let rw = 0; new ResizeObserver(() => { const w = $("#main").clientWidth; if (Math.abs(w - rw) > 4) { rw = w; drawCharts(); if (S.view === "whatif") renderWhatIf(); } }).observe($("#main"));
    window.addEventListener("beforeprint", () => { S._pw = S.view; if (S.view !== "desk") go("desk", true); });
    renderFoot();
    gate(() => {
      renderWhatIfForm(); readWhatIf(); initAsk();
      render(); go(S.view, true); initMotion();
    });
  }
  window.__thrive = { T, S, render, ask: (q) => ThriveAsk.create(T, { getMin: () => S.min }).answer(q) };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
