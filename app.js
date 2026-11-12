(function () {
  "use strict";
  const D = window.CF;
  const C = {
    ink: "#10132A", ink2: "#464B63", ink3: "#62677E", rule: "#EDEEF3", line: "#D9DBE5", paper: "#FFFFFF",
    accent: "#6D4AFF", accentDeep: "#4B2FD1", gain: "#0E9F6E", gainInk: "#047857", loss: "#E5484D", lossInk: "#C42F35"
  };
  const FONT = '"Manrope", system-ui, sans-serif';
  const grad = (top, bottom) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: top }, { offset: 1, color: bottom }]);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mLabel = (k) => MONTHS[+k.slice(5) - 1] + "-" + k.slice(2, 4);
  const MINUS = "−";

  // ---------- formatting ----------
  function fmtL(v, dp) {
    if (v == null || isNaN(v)) return "–";
    const a = Math.abs(v), s = v < 0 ? MINUS : "";
    if (a >= 1e7) return s + "₹" + (a / 1e7).toFixed(dp == null ? 2 : dp) + " Cr";
    const t = (a / 1e5).toFixed(dp == null ? 2 : dp);
    return (/^0\.?0*$/.test(t) ? "" : s) + "₹" + t + " L";
  }
  function fmtFull(v) {
    if (v == null || isNaN(v)) return "–";
    return (v < 0 ? MINUS : "") + "₹" + Math.round(Math.abs(v)).toLocaleString("en-IN");
  }
  const fmtLk = (v) => { const t = (Math.abs(v) / 1e5).toFixed(2); return (v < 0 && t !== "0.00" ? MINUS : "") + t; };
  // wording for the alert threshold: at ₹0 it simply means the account is overdrawn
  const lowWord = () => (state.min === 0 ? "Overdrawn" : "Below " + fmtL(state.min));
  const lowPhrase = () => (state.min === 0 ? "were overdrawn (below ₹0)" : "closed below your " + fmtL(state.min) + " alert level");
  const axisL = (v) => (v === 0 ? "0" : (v < 0 ? MINUS : "") + "₹" + Math.round(Math.abs(v) / 1e5) + "L");

  // ---------- indexes ----------
  const H = {}; D.heads.forEach((h) => (H[h.id] = h));
  const keys = D.months.map((m) => m.key);
  const mIndex = {}; keys.forEach((k, i) => (mIndex[k] = i));
  const weekMonth = D.weeks.map((w) => mIndex[w.key]);
  const txAct = (t) => (t[6] ? H[t[6]].act : (/^bank transfer$/i.test(t[5]) ? "Transfer" : "Unmapped"));

  // ---------- state ----------
  const state = { from: mIndex["2024-04"], to: mIndex["2025-03"], cat: "All", min: 0, proj: true, grain: "m", tab: "stmt", search: "", tx: { month: null, head: null }, sort: { k: "date", dir: -1 }, page: 0 };
  readHash();

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get("from") in mIndex) state.from = mIndex[p.get("from")];
    if (p.get("to") in mIndex) state.to = mIndex[p.get("to")];
    if (["All", "Operating", "Investing", "Financing"].includes(p.get("cat"))) state.cat = p.get("cat");
    if (p.get("min") && !isNaN(+p.get("min"))) state.min = +p.get("min") * 1e5;
    if (p.get("proj") === "0") state.proj = false;
    if (state.from > state.to) [state.from, state.to] = [state.to, state.from];
  }
  function writeHash() {
    const p = new URLSearchParams({ from: keys[state.from], to: keys[state.to], cat: state.cat, min: String(state.min / 1e5), proj: state.proj ? "1" : "0" });
    history.replaceState(null, "", "#" + p.toString());
  }

  // ---------- aggregation ----------
  function agg(mi) {
    const m = D.months[mi];
    if (state.proj || m.status !== "Partly projected") return m;
    const ws = m.weeks.map((i) => D.weeks[i]).filter((w) => w.status === "Actual");
    const v = {}; let inflow = 0, outflow = 0, rzp = 0;
    ws.forEach((w) => { inflow += w.inflow; outflow += w.outflow; rzp += w.rzp; for (const k in w.v) v[k] = (v[k] || 0) + w.v[k]; });
    return { key: m.key, open: m.open, inflow, outflow, rzp, close: ws.length ? ws[ws.length - 1].close : m.open, v, weeks: m.weeks, status: "Actual (projections excluded)" };
  }
  const inCat = (h, cat) => cat === "All" || h.act === cat;
  function flows(a, cat) {
    if (cat === "All") return { i: a.inflow, o: a.outflow };
    let i = 0, o = 0;
    for (const k in a.v) { const h = H[k]; if (!h || h.act !== cat) continue; if (h.dir === "in") i += a.v[k]; else o += a.v[k]; }
    return { i, o };
  }
  const range = () => { const r = []; for (let i = state.from; i <= state.to; i++) r.push(i); return r; };
  const rangeKeys = () => new Set(range().map((i) => keys[i]));
  function weeksInRange() {
    const out = [];
    D.weeks.forEach((w, i) => { const mi = weekMonth[i]; if (mi >= state.from && mi <= state.to && (state.proj || w.status === "Actual")) out.push(i); });
    return out;
  }

  // ---------- echarts base ----------
  const charts = {};
  function mk(id) { const c = echarts.init(document.getElementById(id), null, { renderer: "svg" }); charts[id] = c; return c; }
  const baseText = { fontFamily: FONT, color: C.ink3, fontSize: 12 };
  const tipBase = {
    backgroundColor: "#FFFFFF", borderColor: "#E7E8EF", borderWidth: 1, padding: [10, 12], textStyle: { color: C.ink, fontFamily: FONT, fontSize: 12 },
    extraCssText: "border-radius:12px;box-shadow:0 12px 32px rgba(16,19,42,.14);font-variant-numeric:tabular-nums;min-width:200px"
  };
  const yAxisBase = {
    type: "value", axisLabel: { ...baseText, formatter: axisL }, splitLine: { lineStyle: { color: C.rule, width: 1, type: [4, 4] } },
    axisLine: { show: false }, axisTick: { show: false }
  };
  const xCat = (data) => ({
    type: "category", data, axisLabel: { ...baseText, hideOverlap: true }, axisTick: { show: false },
    axisLine: { lineStyle: { color: C.line } }, triggerEvent: true
  });
  const row = (label, val, color) => `<div style="display:flex;justify-content:space-between;gap:18px"><span>${color ? `<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></i>` : ""}${label}</span><b style="font-weight:700">${val}</b></div>`;

  // ---------- loom (signature: weekly balance brush) ----------
  let loomSilent = false;
  function drawLoom() {
    const c = charts.loomChart || mk("loomChart");
    const data = D.weeks.map((w) => ({
      value: w.close,
      itemStyle: { color: w.close < state.min ? C.loss : C.gain, opacity: w.status === "Projection" ? 0.4 : 1, borderRadius: w.close >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] }
    }));
    const labels = D.weeks.map((w) => w.key);
    c.setOption({
      animation: false,
      grid: { left: 24, right: 24, top: 12, bottom: 24 },
      tooltip: {
        ...tipBase, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(109,74,255,.08)" } },
        formatter: (ps) => { const i = ps[0].dataIndex, w = D.weeks[i]; return `<b>${esc(mLabel(w.key))} · ${esc(w.label)}</b> <span style="opacity:.7">(${esc(w.days)})</span>` + row("Closing balance", fmtFull(w.close)) + row("Inflows", fmtFull(w.inflow)) + row("Outflows", fmtFull(w.outflow)) + (w.status === "Projection" ? '<div style="opacity:.75;margin-top:4px">Projection, not actual</div>' : ""); }
      },
      xAxis: {
        type: "category", data: labels, axisLine: { lineStyle: { color: C.line } },
        axisTick: { show: true, length: 4, lineStyle: { color: C.line }, interval: (i) => i === 0 || labels[i] !== labels[i - 1] },
        splitLine: { show: true, lineStyle: { color: "rgba(16,19,42,.05)", width: 1 }, interval: (i) => i > 0 && labels[i] !== labels[i - 1] },
        axisLabel: { ...baseText, interval: (i) => i === 0 || (labels[i] !== labels[i - 1] && /-(04|10)$/.test(labels[i])), formatter: (k) => mLabel(k) }
      },
      yAxis: { type: "value", show: false },
      series: [{
        type: "bar", data, barCategoryGap: "18%",
        markLine: { silent: true, symbol: "none", lineStyle: { color: C.ink3, type: [4, 3], width: 1 }, label: { show: false }, data: [{ yAxis: state.min }] }
      }],
      brush: { xAxisIndex: 0, brushType: "lineX", brushMode: "single", transformable: true, throttleType: "debounce", throttleDelay: 150, brushStyle: { color: "rgba(109,74,255,.10)", borderColor: C.accent, borderWidth: 2 }, outOfBrush: { colorAlpha: 0.28 } },
      toolbox: { show: false, feature: { brush: { type: ["lineX"] } } }
    }, { notMerge: false });
    c.dispatchAction({ type: "takeGlobalCursor", key: "brush", brushOption: { brushType: "lineX", brushMode: "single" } });
    syncLoomBrush(); loomLegend();
    if (!c.__wired) {
      c.__wired = true;
      c.on("brushEnd", (p) => {
        if (loomSilent || !p.areas || !p.areas.length) return;
        const [a, b] = p.areas[0].coordRange;
        const lo = Math.max(0, Math.min(a, b)), hi = Math.min(D.weeks.length - 1, Math.max(a, b));
        state.from = weekMonth[lo]; state.to = weekMonth[hi];
        state.tx.month = null; state.page = 0;
        update({ fromLoom: true });
      });
    }
  }
  function loomLegend() {
    const el = document.getElementById("loomLegend");
    if (el) el.innerHTML = `<span><i class="lg gain"></i>${state.min === 0 ? "In credit" : "At or above " + fmtL(state.min)}</span><span><i class="lg loss"></i>${lowWord()}</span><span><i class="lg sel"></i>Selected period</span>`;
  }
  function syncLoomBrush() {
    const c = charts.loomChart; if (!c) return;
    let lo = D.weeks.findIndex((w, i) => weekMonth[i] >= state.from);
    let hi = -1; D.weeks.forEach((w, i) => { if (weekMonth[i] <= state.to) hi = i; });
    loomSilent = true;
    if (lo < 0 || hi < 0 || lo > hi) c.dispatchAction({ type: "brush", areas: [] });
    else c.dispatchAction({ type: "brush", areas: [{ brushType: "lineX", xAxisIndex: 0, coordRange: [lo, hi] }] });
    loomSilent = false;
  }

  // ---------- KPIs ----------
  function kpis() {
    const r = range(); const A = r.map(agg);
    const first = A[0], last = A[A.length - 1];
    let fi = 0, fo = 0, ai = 0, ao = 0, rz = 0;
    A.forEach((a) => { const f = flows(a, state.cat); fi += f.i; fo += f.o; ai += a.inflow; ao += a.outflow; rz += a.rzp; });
    const net = fi - fo, netAll = ai - ao;
    const adj = last.close - first.open - netAll - rz;
    const avgNet = netAll / A.length;
    let runway, runwayD;
    if (last.close <= 0) { runway = "n/a"; runwayD = "Account overdrawn at period end · avg net " + fmtL(avgNet) + "/mo"; }
    else if (last.close <= state.min) { runway = "0"; runwayD = "At or below your " + fmtL(state.min) + " alert level"; }
    else if (avgNet >= 0) { runway = "Not burning"; runwayD = "Avg net cash flow " + fmtL(avgNet) + "/mo"; }
    else { runway = ((last.close - state.min) / -avgNet).toFixed(1); runwayD = (state.min ? "Cash above the " + fmtL(state.min) + " alert level" : "Cash") + " ÷ avg monthly burn " + fmtL(-avgNet); }
    const below = last.close < state.min;
    const proj = r.some((i) => agg(i).status === "Partly projected");
    const catNote = state.cat === "All" ? "" : " · " + state.cat;
    const belowN = A.filter((a) => a.close < state.min).length;
    const I = {
      open: '<path d="M4 10h12M10 4v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      in: '<path d="M10 16V4M5 9l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      out: '<path d="M10 4v12M5 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      net: '<path d="M3 13l4-4 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      close: '<rect x="3" y="5" width="14" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h14" stroke="currentColor" stroke-width="1.8"/>',
      run: '<circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 6.5V10l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      below: '<path d="M10 3l7.5 13h-15z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 8v3.5M10 14v.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    };
    const ic = (n, cls) => `<span class="ic ${cls || ""}"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">${I[n]}</svg></span>`;
    const K = [
      { c: "k-open", ic: ic("open"), k: "Opening balance", v: fmtL(first.open), d: "1 " + mLabel(first.key).replace("-", " 20"), t: fmtFull(first.open) },
      { c: "k-in", ic: ic("in", "in"), k: "Total inflows" + catNote, v: fmtL(fi), d: r.length + (r.length === 1 ? " month" : " months") + " · avg " + fmtL(fi / r.length) + "/mo", t: fmtFull(fi) },
      { c: "k-out", ic: ic("out", "out"), k: "Total outflows" + catNote, v: fmtL(fo), d: "Avg " + fmtL(fo / r.length) + "/mo", t: fmtFull(fo) },
      { c: "k-net", ic: ic("net", net >= 0 ? "in" : "out"), k: "Net cash flow" + catNote, v: (net > 0 ? "+" : "") + fmtL(net), cls: net >= 0 ? "gain" : "loss", d: net >= 0 ? "Inflows exceeded outflows" : "Outflows exceeded inflows", t: fmtFull(net) },
      { c: "k-close", ic: ic("close"), k: "Closing balance · end " + mLabel(last.key), v: fmtL(last.close), d: (below ? '<span class="tag loss">' + lowWord() + "</span> " : "") + (proj ? '<span class="tag proj">Includes projection</span> ' : "") + "Exact " + fmtFull(last.close), t: fmtFull(last.close), hero: true },
      { c: "k-run", ic: ic("run", "acc"), k: "Months of runway", v: runway, d: runwayD }
    ];
    const bridge = `Opening <b>${fmtL(first.open)}</b> + inflows <b>${fmtL(ai)}</b> − outflows <b>${fmtL(ao)}</b> + Razorpay movement <b>${fmtL(rz)}</b>` + (Math.abs(adj) >= 1 ? ` + workbook carry-forward <b>${fmtL(adj)}</b>` : "") + ` = closing <b>${fmtL(last.close)}</b>`;
    if (charts.heroSpark) { charts.heroSpark.dispose(); delete charts.heroSpark; }
    $("#kpis").innerHTML = K.map((x) => `<div class="kpi ${x.c}"${x.t ? ` title="${esc(x.k)}: ${esc(x.t)}"` : ""}><div class="k">${x.ic}${esc(x.k)}</div><div class="v num ${x.cls || ""}">${x.v}</div><div class="d">${x.d}</div>${x.hero ? '<div class="spark" id="heroSpark" aria-hidden="true"></div><p class="bridge">' + bridge + "</p>" : ""}</div>`).join("") +
      `<div class="tile k-below"><div class="k">${ic("below", "out")}${state.min === 0 ? "Months overdrawn" : "Months below " + fmtL(state.min)}</div><div class="below-v">${belowN} <small>of ${A.length}</small></div><div class="dots" role="img" aria-label="${belowN} of ${A.length} month-ends ${lowPhrase()}">${A.map((a) => `<i class="${a.close < state.min ? "b" : ""}" title="${mLabel(a.key)}: ${fmtFull(a.close)}"></i>`).join("")}</div></div>`;
    const sp = mk("heroSpark");
    sp.setOption({
      animation: false, grid: { left: 8, right: 8, top: 8, bottom: 4 },
      tooltip: { ...tipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "rgba(255,255,255,.5)" } }, formatter: (ps) => `<b>${mLabel(A[ps[0].dataIndex].key)}</b>` + row("Closing balance", fmtFull(A[ps[0].dataIndex].close)) },
      xAxis: { type: "category", show: false, boundaryGap: false, data: A.map((a) => a.key) },
      yAxis: { type: "value", show: false, scale: true },
      series: [{ type: "line", data: A.map((a) => a.close), smooth: 0.35, smoothMonotone: "x", symbol: "circle", symbolSize: 5, showSymbol: A.length <= 14, lineStyle: { color: "#FFFFFF", width: 2.5 }, itemStyle: { color: "#FFFFFF" }, areaStyle: { color: grad("rgba(255,255,255,.32)", "rgba(255,255,255,0)") } }]
    });
    const sn = $("#scopeNote");
    if (state.cat !== "All") { sn.hidden = false; sn.textContent = "Showing " + state.cat.toLowerCase() + " flows only. Balances, runway and the balance chart stay account-level."; }
    else sn.hidden = true;
  }

  // ---------- monthly flow chart ----------
  function drawFlow() {
    const c = charts.flowChart || mk("flowChart");
    const r = range();
    const rows = r.map((i) => { const a = agg(i), f = flows(a, state.cat); return { i, a, f }; });
    const projStyle = (x) => (x.a.status === "Partly projected" ? { opacity: 0.55, decal: { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [3, 3], rotation: -0.785, color: "rgba(255,255,255,.55)" } } : {});
    c.setOption({
      animationDuration: 250,
      grid: { left: 56, right: 12, top: 40, bottom: 28 },
      legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12, itemGap: 18, textStyle: { ...baseText, color: C.ink2, fontWeight: 600 }, data: ["Inflows", "Outflows", "Net cash flow"] },
      tooltip: {
        ...tipBase, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(109,74,255,.06)" } },
        formatter: (ps) => { const x = rows[ps[0].dataIndex]; return `<b>${mLabel(x.a.key)}</b>${x.a.status !== "Actual" ? ` <span style="opacity:.7">${esc(x.a.status)}</span>` : ""}` + row("Inflows", fmtFull(x.f.i), C.gain) + row("Outflows", fmtFull(x.f.o), C.loss) + row("Net cash flow", fmtFull(x.f.i - x.f.o), C.accent) + '<div style="opacity:.7;margin-top:4px">Click for line items</div>'; }
      },
      xAxis: xCat(rows.map((x) => mLabel(x.a.key))),
      yAxis: yAxisBase,
      series: [
        { name: "Inflows", type: "bar", stack: "f", barMaxWidth: 28, itemStyle: { color: grad("#22C08A", C.gain), borderRadius: [7, 7, 0, 0] }, emphasis: { itemStyle: { color: C.gainInk } }, data: rows.map((x) => ({ value: x.f.i, itemStyle: projStyle(x) })) },
        { name: "Outflows", type: "bar", stack: "f", barMaxWidth: 28, itemStyle: { color: grad(C.loss, "#F27A7E"), borderRadius: [0, 0, 7, 7] }, emphasis: { itemStyle: { color: C.lossInk } }, data: rows.map((x) => ({ value: -x.f.o, itemStyle: projStyle(x) })) },
        { name: "Net cash flow", type: "line", smooth: 0.3, smoothMonotone: "x", data: rows.map((x) => x.f.i - x.f.o), lineStyle: { width: 3, color: C.accent, shadowColor: "rgba(109,74,255,.35)", shadowBlur: 8, shadowOffsetY: 3 }, itemStyle: { color: "#fff", borderColor: C.accent, borderWidth: 2.5 }, symbol: "circle", symbolSize: 9, z: 5 }
      ]
    }, { notMerge: true });
    c.off("click");
    c.on("click", (p) => {
      if (p.componentType === "series") openMonth(rows[p.dataIndex].i);
      else if (p.componentType === "xAxis") { const x = rows.find((y) => mLabel(y.a.key) === p.value); if (x) openMonth(x.i); }
    });
  }

  // ---------- running balance ----------
  function drawBal() {
    const c = charts.balChart || mk("balChart");
    let pts;
    if (state.grain === "m") pts = range().map((i) => { const a = agg(i); return { label: mLabel(a.key), close: a.close, mi: i, sub: a.status !== "Actual" ? a.status : "" }; });
    else pts = weeksInRange().map((wi) => { const w = D.weeks[wi]; return { label: mLabel(w.key) + " " + w.label.replace(/^.*Week\s*/i, "W"), close: w.close, mi: weekMonth[wi], sub: w.days + (w.status === "Projection" ? " · projection" : "") }; });
    const below = pts.filter((p) => p.close < state.min).length;
    $("#balHint").textContent = `${below} of ${pts.length} ${state.grain === "m" ? "month-ends" : "week-ends"} ${lowPhrase()}. Account-level, not filtered by category.`;
    c.setOption({
      animationDuration: 250,
      grid: { left: 60, right: 30, top: 16, bottom: 34 },
      tooltip: {
        ...tipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: C.accent, type: [3, 3] } },
        formatter: (ps) => { const p = pts[ps[0].dataIndex]; return `<b>${esc(p.label)}</b>${p.sub ? ` <span style="opacity:.7">${esc(p.sub)}</span>` : ""}` + row("Closing balance", fmtFull(p.close)) + (p.close < state.min ? `<div style="color:${C.lossInk};font-weight:700;margin-top:4px">${state.min === 0 ? "Overdrawn by " + fmtFull(-p.close) : "Below alert level by " + fmtFull(state.min - p.close)}</div>` : ""); }
      },
      xAxis: { ...xCat(pts.map((p) => p.label)), boundaryGap: false },
      yAxis: yAxisBase,
      series: [{
        type: "line", smooth: 0.25, smoothMonotone: "x", lineStyle: { width: 3, color: C.accent }, symbol: "circle", symbolSize: state.grain === "m" ? 9 : 6, showAllSymbol: true,
        areaStyle: { origin: "start", color: grad("rgba(109,74,255,.22)", "rgba(109,74,255,0)") },
        data: pts.map((p) => ({ value: p.close, itemStyle: { color: p.close < state.min ? C.loss : C.gain, borderColor: "#fff", borderWidth: 2 } })),
        markArea: { silent: true, itemStyle: { color: "rgba(229,72,77,.06)" }, data: [[{ yAxis: state.min }, { yAxis: "min" }]] },
        markLine: { silent: true, symbol: "none", lineStyle: { color: C.lossInk, type: [5, 4], width: 1.2 }, label: { formatter: state.min === 0 ? "₹0 · overdrawn below this line" : "Alert level " + fmtL(state.min), color: C.lossInk, fontFamily: FONT, fontWeight: 700, fontSize: 11, position: "insideStartTop" }, data: [{ yAxis: state.min }] }
      }]
    }, { notMerge: true });
    c.off("click");
    c.on("click", (p) => { if (p.componentType === "series") openMonth(pts[p.dataIndex].mi); else if (p.componentType === "xAxis") { const q = pts.find((y) => y.label === p.value); if (q) openMonth(q.mi); } });
  }

  // ---------- activity table ----------
  function actTable() {
    const A = range().map(agg);
    const rows = ["Operating", "Investing", "Financing"].map((cat) => { let i = 0, o = 0; A.forEach((a) => { const f = flows(a, cat); i += f.i; o += f.o; }); return { cat, i, o }; });
    const max = Math.max(1, ...rows.map((r) => Math.max(r.i, r.o)));
    const ti = rows.reduce((s, r) => s + r.i, 0), to = rows.reduce((s, r) => s + r.o, 0);
    $("#actTable").innerHTML = `<table class="act"><thead><tr><th>Activity</th><th class="num">Inflows</th><th class="num">Outflows</th><th class="num">Net</th></tr></thead><tbody>` +
      rows.map((r) => `<tr tabindex="0" data-cat="${r.cat}" class="${state.cat === r.cat ? "sel" : ""}" title="${state.cat === r.cat ? "Click to clear filter" : "Filter to " + r.cat}"><td>${r.cat}<div class="bar" aria-hidden="true"><i class="o" style="width:${r.o ? "max(12px," + (r.o / max) * 100 + "%)" : "0"}"></i><i class="n" style="width:${r.i ? "max(12px," + (r.i / max) * 100 + "%)" : "0"}"></i></div></td><td class="num" title="${fmtFull(r.i)}">${fmtL(r.i)}</td><td class="num" title="${fmtFull(r.o)}">${fmtL(r.o)}</td><td class="num" style="color:${r.i - r.o >= 0 ? C.gainInk : C.lossInk}" title="${fmtFull(r.i - r.o)}">${(r.i - r.o > 0 ? "+" : "") + fmtL(r.i - r.o)}</td></tr>`).join("") +
      `</tbody><tfoot><tr><td>Total</td><td class="num">${fmtL(ti)}</td><td class="num">${fmtL(to)}</td><td class="num" style="color:${ti - to >= 0 ? C.gainInk : C.lossInk}">${(ti - to > 0 ? "+" : "") + fmtL(ti - to)}</td></tr></tfoot></table>`;
    $("#actTable").querySelectorAll("tbody tr").forEach((tr) => {
      const go = () => { state.cat = state.cat === tr.dataset.cat ? "All" : tr.dataset.cat; $("#fCat").value = state.cat; state.page = 0; update(); };
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }

  // ---------- top heads ----------
  function headTotals() {
    const t = {}; range().map(agg).forEach((a) => { for (const k in a.v) t[k] = (t[k] || 0) + a.v[k]; });
    return t;
  }
  function drawTop(id, dir) {
    const c = charts[id] || mk(id);
    const t = headTotals();
    const list = Object.keys(t).filter((k) => H[k].dir === dir && inCat(H[k], state.cat) && t[k] >= 500).sort((a, b) => t[b] - t[a]).slice(0, 6);
    const color = dir === "in" ? C.gain : C.loss;
    if (!list.length) { c.clear(); c.setOption({ title: { text: "No " + (dir === "in" ? "inflows" : "outflows") + " for this filter", left: "center", top: "middle", textStyle: { ...baseText, fontWeight: 400 } } }); return; }
    const short = (s) => s;
    c.setOption({
      animationDuration: 250,
      grid: { left: 4, right: 72, top: 4, bottom: 4, containLabel: true },
      tooltip: { ...tipBase, trigger: "item", formatter: (p) => { const h = H[list[p.dataIndex]]; return `<b>${esc(h.name)}</b><div style="opacity:.7">${esc(h.group)} · ${h.act}</div>` + row("Total in period", fmtFull(p.value)) + '<div style="opacity:.7;margin-top:4px">Click for transactions</div>'; } },
      xAxis: { type: "value", show: false },
      yAxis: { type: "category", inverse: true, data: list.map((k) => short(H[k].name)), axisLabel: { ...baseText, color: C.ink2, fontWeight: 600, width: 150, overflow: "break", lineHeight: 14 }, axisTick: { show: false }, axisLine: { show: false }, triggerEvent: true },
      series: [{ type: "bar", data: list.map((k) => t[k]), barMaxWidth: 12, showBackground: true, backgroundStyle: { color: "#F1F2F7", borderRadius: 6 }, itemStyle: { color, borderRadius: 6 }, emphasis: { itemStyle: { color: dir === "in" ? C.gainInk : C.lossInk } }, label: { show: true, position: "right", formatter: (p) => fmtL(p.value), ...baseText, color: C.ink, fontWeight: 700 } }]
    }, { notMerge: true });
    c.off("click");
    c.on("click", (p) => { const idx = p.componentType === "series" ? p.dataIndex : p.componentType === "yAxis" ? list.findIndex((k) => short(H[k].name) === p.value) : -1; if (idx >= 0) openHead(list[idx]); });
  }

  // ---------- drawer ----------
  const drawer = $("#drawer");
  let lastFocus = null;
  function openDrawer(title, html) {
    lastFocus = document.activeElement;
    $("#drawerTitle").textContent = title;
    $("#drawerBody").innerHTML = html;
    drawer.hidden = false; $("#scrim").hidden = false;
    $("#drawerClose").focus();
  }
  function closeDrawer() { drawer.hidden = true; $("#scrim").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#scrim").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });

  const sumTx = (list) => list.reduce((s, t) => s + t[4], 0);
  function txTable(list, limit) {
    const shown = list.slice(0, limit);
    if (!list.length) return '<p class="empty">No transactions recorded in the statement sheets.</p>';
    return `<div class="tbl-wrap"><table class="data"><thead><tr><th>Date</th><th>Source</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>` +
      shown.map((t) => `<tr><td>${t[1] || mLabel(t[0])}</td><td>${t[2] === "B" ? "Bank" : "Razorpay"}</td><td class="desc">${esc(t[3])}${t[7] ? `<div class="hint">${esc(t[7])}</div>` : ""}</td><td class="num ${t[4] < 0 ? "neg" : "pos"}">${fmtFull(t[4])}</td></tr>`).join("") +
      `</tbody></table></div>` + (list.length > limit ? `<p class="hint">Showing the ${limit} largest of ${list.length}.</p>` : "");
  }
  function openMonth(mi) {
    const a = agg(mi), m = D.months[mi];
    const heads = Object.keys(a.v).filter((k) => a.v[k] !== 0 && inCat(H[k], state.cat));
    const ins = heads.filter((k) => H[k].dir === "in").sort((x, y) => a.v[y] - a.v[x]);
    const outs = heads.filter((k) => H[k].dir === "out").sort((x, y) => a.v[y] - a.v[x]);
    const net = a.inflow - a.outflow;
    const tx = D.tx.filter((t) => t[0] === m.key && (state.cat === "All" || txAct(t) === state.cat));
    const headRows = (ks, sign) => ks.map((k) => `<tr class="clk" data-h="${k}"><td>${esc(H[k].name)}<div class="hint">${esc(H[k].group)} · ${H[k].act}</div></td><td class="num ${sign < 0 ? "neg" : "pos"}">${fmtFull(sign * a.v[k])}</td></tr>`).join("");
    const weeks = a.weeks.map((i) => D.weeks[i]);
    let html = `<div class="dl">
      <div><div class="k">Opening</div><div class="v num">${fmtL(a.open)}</div></div>
      <div><div class="k">Inflows</div><div class="v num">${fmtL(a.inflow)}</div></div>
      <div><div class="k">Outflows</div><div class="v num">${fmtL(a.outflow)}</div></div>
      <div><div class="k">Net cash flow</div><div class="v num" style="color:${net >= 0 ? C.gainInk : C.lossInk}">${(net > 0 ? "+" : "") + fmtL(net)}</div></div>
      <div><div class="k">Razorpay movement</div><div class="v num">${fmtL(a.rzp)}</div></div>
      <div><div class="k">Closing</div><div class="v num">${fmtL(a.close)}${a.close < state.min ? ' <span class="tag loss">' + lowWord() + "</span>" : ""}</div></div></div>
      <p class="recon">${esc(a.status)}. Exact closing ${fmtFull(a.close)}.${state.cat !== "All" ? " Line items filtered to " + state.cat.toLowerCase() + "." : ""}</p>
      <h3>Line items from the cash-flow sheet</h3>
      ${heads.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Head</th><th class="num">Amount</th></tr></thead><tbody>${headRows(ins, 1)}${headRows(outs, -1)}</tbody></table></div>` : '<p class="empty">No line items for this filter.</p>'}`;
    if (weeks.length) html += `<h3>Weeks</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Week</th><th>Days</th><th class="num">Inflows</th><th class="num">Outflows</th><th class="num">Closing</th></tr></thead><tbody>` +
      weeks.map((w) => `<tr><td>${esc(w.label)}${w.status === "Projection" ? ' <span class="tag proj">Projection</span>' : ""}</td><td>${esc(w.days)}</td><td class="num">${fmtFull(w.inflow)}</td><td class="num">${fmtFull(w.outflow)}</td><td class="num">${fmtFull(w.close)}</td></tr>`).join("") + `</tbody></table></div>`;
    html += `<h3>Bank and Razorpay transactions</h3><p class="recon">${tx.length} transactions, net ${fmtFull(sumTx(tx))}. <button type="button" class="link" data-act="tx">Open all in the table</button></p>` + txTable(tx.slice().sort((x, y) => Math.abs(y[4]) - Math.abs(x[4])), 40);
    openDrawer(mLabel(m.key) + " line items", html);
    $("#drawerBody").querySelectorAll("tr[data-h]").forEach((tr) => tr.addEventListener("click", () => openHead(tr.dataset.h, mi)));
    $("#drawerBody").querySelector('[data-act="tx"]').addEventListener("click", () => { state.tx = { month: m.key, head: null }; gotoTx(); });
  }
  function openHead(hid, mi) {
    const h = H[hid];
    const ms = mi != null ? [mi] : range();
    const vals = ms.map((i) => ({ i, v: agg(i).v[hid] || 0 }));
    const sheet = vals.reduce((s, x) => s + x.v, 0);
    const ks = new Set(ms.map((i) => keys[i]));
    const tx = D.tx.filter((t) => t[6] === hid && ks.has(t[0]));
    const txSum = h.dir === "in" ? sumTx(tx) : -sumTx(tx);
    const period = ms.length === 1 ? mLabel(keys[ms[0]]) : mLabel(keys[ms[0]]) + " – " + mLabel(keys[ms[ms.length - 1]]);
    let html = `<p class="recon">${esc(h.group)} · ${h.act} · ${h.dir === "in" ? "inflow" : "outflow"} head · ${period}</p>
      <div class="dl"><div><div class="k">Cash-flow sheet</div><div class="v num">${fmtL(sheet)}</div></div>
      <div><div class="k">Statement transactions</div><div class="v num">${fmtL(txSum)}</div></div>
      <div><div class="k">Difference</div><div class="v num">${fmtL(sheet - txSum)}</div></div></div>
      <p class="recon">Exact: sheet ${fmtFull(sheet)}, transactions ${fmtFull(txSum)} (${tx.length}). The sheet can carry manual adjustments the statements do not.</p>`;
    if (ms.length > 1) html += `<h3>By month</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Month</th><th class="num">Amount</th></tr></thead><tbody>` + vals.filter((x) => x.v).map((x) => `<tr class="clk" data-m="${x.i}"><td>${mLabel(keys[x.i])}</td><td class="num">${fmtFull(x.v)}</td></tr>`).join("") + `</tbody></table></div>`;
    html += `<h3>Transactions</h3><p class="recon"><button type="button" class="link" data-act="tx">Open all in the table</button></p>` + txTable(tx.slice().sort((x, y) => Math.abs(y[4]) - Math.abs(x[4])), 40);
    openDrawer(h.name, html);
    $("#drawerBody").querySelectorAll("tr[data-m]").forEach((tr) => tr.addEventListener("click", () => openHead(hid, +tr.dataset.m)));
    $("#drawerBody").querySelector('[data-act="tx"]').addEventListener("click", () => { state.tx = { month: ms.length === 1 ? keys[ms[0]] : null, head: hid }; gotoTx(); });
  }
  function gotoTx() { closeDrawer(); state.page = 0; setTab("tx"); renderTable(); document.getElementById("tables").scrollIntoView({ behavior: "smooth", block: "start" }); }

  // ---------- tables ----------
  function setTab(t) {
    state.tab = t;
    [["stmt", "#tabStmt", "#paneStmt"], ["tx", "#tabTx", "#paneTx"], ["ll", "#tabLl", "#paneLl"]].forEach(([k, b, p]) => { $(b).setAttribute("aria-selected", String(k === t)); $(p).hidden = k !== t; });
    $("#tblSearch").placeholder = t === "tx" ? "Search descriptions, heads, vendors, amounts" : t === "ll" ? "Search landlord or property" : "Search heads";
  }
  [["#tabStmt", "stmt"], ["#tabTx", "tx"], ["#tabLl", "ll"]].forEach(([b, t]) => $(b).addEventListener("click", () => { setTab(t); state.page = 0; renderTable(); }));
  $("#tabStmt").parentElement.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const order = ["stmt", "tx", "ll"], ids = ["#tabStmt", "#tabTx", "#tabLl"];
    const n = (order.indexOf(state.tab) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
    setTab(order[n]); state.page = 0; renderTable(); $(ids[n]).focus();
  });

  let csvRows = [];
  const q = () => state.search.trim().toLowerCase();

  function stmtModel() {
    const r = range(), A = r.map(agg), t = headTotals();
    const vis = D.heads.filter((h) => inCat(h, state.cat) && Math.abs(t[h.id] || 0) > 0.5 && (!q() || h.name.toLowerCase().includes(q()) || h.group.toLowerCase().includes(q())));
    const lines = [];
    lines.push({ kind: "tot", label: "Opening balance", vals: A.map((a) => a.open), total: A[0].open });
    const addGroup = (label, hs, sign) => {
      if (!hs.length) return;
      if (hs.length === 1 && hs[0].name.trim().toLowerCase() === label.trim().toLowerCase()) { const h = hs[0]; lines.push({ kind: "grph", id: h.id, label: h.name, act: h.act, vals: A.map((a) => a.v[h.id] || 0), sign }); return; }
      lines.push({ kind: "grp", label, vals: A.map((a) => hs.reduce((s, h) => s + (a.v[h.id] || 0), 0)), sign });
      hs.forEach((h) => lines.push({ kind: "head", id: h.id, label: h.name, act: h.act, vals: A.map((a) => a.v[h.id] || 0), sign }));
    };
    if (vis.some((h) => h.dir === "in")) lines.push({ kind: "sec", label: "Inflows" + (state.cat !== "All" ? " (" + state.cat + ")" : ""), vals: A.map((a) => flows(a, state.cat).i) });
    vis.filter((h) => h.dir === "in").forEach((h) => lines.push({ kind: "head", id: h.id, label: h.name, act: h.act, vals: A.map((a) => a.v[h.id] || 0), sign: 1 }));
    const F0 = A.map((a) => flows(a, state.cat));
    if (vis.some((h) => h.dir === "out")) lines.push({ kind: "sec", label: "Outflows" + (state.cat !== "All" ? " (" + state.cat + ")" : ""), vals: F0.map((f) => f.o) });
    const groups = [...new Set(D.heads.filter((h) => h.dir === "out").map((h) => h.group))];
    groups.forEach((g) => addGroup(g, vis.filter((h) => h.dir === "out" && h.group === g), -1));
    const F = A.map((a) => flows(a, state.cat));
    lines.push({ kind: "tot", label: "Total inflows" + (state.cat !== "All" ? " (" + state.cat + ")" : ""), vals: F.map((f) => f.i) });
    lines.push({ kind: "tot", label: "Total outflows" + (state.cat !== "All" ? " (" + state.cat + ")" : ""), vals: F.map((f) => f.o), sign: -1 });
    lines.push({ kind: "tot", label: "Net cash flow" + (state.cat !== "All" ? " (" + state.cat + ")" : ""), vals: F.map((f) => f.i - f.o), signed: true });
    lines.push({ kind: "tot", label: "Razorpay balance movement", vals: A.map((a) => a.rzp), signed: true });
    lines.push({ kind: "tot", label: "Closing balance", vals: A.map((a) => a.close), total: A[A.length - 1].close });
    lines.forEach((l) => { if (l.total == null) l.total = l.vals.reduce((s, v) => s + v, 0); });
    return { r, A, lines };
  }
  function renderStmt() {
    const { r, A, lines } = stmtModel();
    const head = `<tr><th class="sticky">₹ lakh</th>${A.map((a, j) => `<th class="num"><button type="button" data-m="${r[j]}" title="Open ${mLabel(a.key)} line items">${mLabel(a.key)}${a.status === "Partly projected" ? "*" : ""}</button></th>`).join("")}<th class="num" title="Opening and closing rows show the period's first opening and last closing; every other row is the sum of the months shown">Period total</th></tr>`;
    const cell = (v, l) => { const cls = Math.abs(v) < 0.5 ? "zero" : l.signed ? (v < 0 ? "neg" : "pos") : ""; return `<td class="num ${cls}" title="${fmtFull(v)}">${Math.abs(v) < 0.5 ? "–" : fmtLk(v)}</td>`; };
    const body = lines.map((l) => `<tr class="${l.kind === "sec" ? "sec" : l.kind === "grp" ? "grp" : l.kind === "grph" ? "grp clk" : l.kind === "tot" ? "tot" : "clk"}"${l.id ? ` data-h="${l.id}"` : ""}><td class="sticky">${esc(l.label)}${l.act && l.act !== "Operating" ? ` <span class="hint">· ${l.act}</span>` : ""}</td>${l.vals.map((v) => cell(v, l)).join("")}${cell(l.total, l)}</tr>`).join("");
    $("#paneStmt").innerHTML = `<table class="data"><thead>${head}</thead><tbody>${body}</tbody></table>` + (A.some((a) => a.status === "Partly projected") ? '<p class="hint" style="padding:8px 10px">* includes projected weeks.</p>' : "");
    $("#paneStmt").querySelectorAll("thead button[data-m]").forEach((b) => b.addEventListener("click", () => openMonth(+b.dataset.m)));
    $("#paneStmt").querySelectorAll("tr[data-h]").forEach((tr) => tr.addEventListener("click", () => openHead(tr.dataset.h)));
    $("#tblCount").textContent = lines.filter((l) => l.kind === "head" || l.kind === "grph").length + " heads × " + A.length + " months";
    $("#pager").innerHTML = "";
    csvRows = [["Line", ...A.map((a) => a.key), "Period total"]].concat(lines.map((l) => [l.label, ...l.vals.map((v) => Math.round(v * 100) / 100), Math.round(l.total * 100) / 100]));
  }

  function txList() {
    const ks = rangeKeys(), s = q();
    let list = D.tx.filter((t) => ks.has(t[0]) && (state.cat === "All" || txAct(t) === state.cat) && (!state.tx.month || t[0] === state.tx.month) && (!state.tx.head || t[6] === state.tx.head));
    if (s) list = list.filter((t) => (t[3] + " " + t[5] + " " + t[7] + " " + Math.abs(t[4]) + " " + (t[1] || "")).toLowerCase().includes(s));
    const k = state.sort.k, d = state.sort.dir;
    const key = { date: (t) => (t[1] || t[0] + "-99"), amount: (t) => t[4], head: (t) => t[5].toLowerCase(), src: (t) => t[2] }[k];
    list.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * d; });
    return list;
  }
  function renderTx() {
    const list = txList(), per = 100, pages = Math.max(1, Math.ceil(list.length / per));
    state.page = Math.min(state.page, pages - 1);
    const shown = list.slice(state.page * per, state.page * per + per);
    const th = (k, label, num) => `<th class="${num ? "num" : ""}" aria-sort="${state.sort.k === k ? (state.sort.dir > 0 ? "ascending" : "descending") : "none"}"><button type="button" data-sort="${k}">${label}${state.sort.k === k ? (state.sort.dir > 0 ? " ▲" : " ▼") : ""}</button></th>`;
    $("#paneTx").innerHTML = list.length ? `<table class="data"><thead><tr>${th("date", "Date")}${th("src", "Source")}<th>Description</th>${th("head", "Head (as in file)")}<th>Activity</th><th>Vendor / property</th>${th("amount", "Amount", true)}</tr></thead><tbody>` +
      shown.map((t) => `<tr><td>${t[1] || mLabel(t[0])}</td><td>${t[2] === "B" ? "Bank" : "Razorpay"}</td><td class="desc">${esc(t[3])}</td><td>${esc(t[5] || "–")}</td><td class="${txAct(t) === "Transfer" || txAct(t) === "Unmapped" ? "muted" : ""}">${txAct(t)}</td><td>${esc(t[7])}</td><td class="num ${t[4] < 0 ? "neg" : "pos"}">${fmtFull(t[4])}</td></tr>`).join("") + `</tbody></table>`
      : '<p class="empty">No transactions match. Clear the search or the chips above, or widen the period.</p>';
    $("#paneTx").querySelectorAll("button[data-sort]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.sort; state.sort = { k, dir: state.sort.k === k ? -state.sort.dir : (k === "date" ? -1 : 1) }; renderTx(); }));
    const net = sumTx(list);
    $("#tblCount").textContent = `${list.length.toLocaleString("en-IN")} transactions · net ${fmtFull(net)}`;
    $("#pager").innerHTML = pages > 1 ? `<button type="button" class="btn" data-p="-1" ${state.page === 0 ? "disabled" : ""}>Previous</button><span>Page ${state.page + 1} of ${pages}</span><button type="button" class="btn" data-p="1" ${state.page >= pages - 1 ? "disabled" : ""}>Next</button>` : "";
    $("#pager").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.page += +b.dataset.p; renderTx(); $("#paneTx").scrollTop = 0; }));
    csvRows = [["Month", "Date", "Source", "Description", "Head", "Activity", "Vendor/Property", "Amount"]].concat(list.map((t) => [t[0], t[1], t[2] === "B" ? "Bank" : "Razorpay", t[3], t[5], txAct(t), t[7], t[4]]));
  }
  function renderLl() {
    const L = D.landlords, ks = rangeKeys(), s = q();
    const cols = L.months.map((k, j) => ({ k, j })).filter((c) => ks.has(c.k));
    if (!cols.length) { $("#paneLl").innerHTML = '<p class="empty">The landlord sheet covers Mar-25 to Nov-26. Widen the period to see it.</p>'; $("#tblCount").textContent = ""; $("#pager").innerHTML = ""; csvRows = []; return; }
    const rows = L.rows.filter((r) => !s || (r.name + " " + r.property).toLowerCase().includes(s));
    const tot = cols.map((c) => rows.reduce((a, r) => a + r.pay[c.j], 0));
    $("#paneLl").innerHTML = `<table class="data"><thead><tr><th class="sticky">Landlord</th><th>Property</th>${cols.map((c) => `<th class="num">${mLabel(c.k)}</th>`).join("")}<th class="num" title="Sum of the months shown">Period total</th></tr></thead><tbody>` +
      rows.map((r) => { const sum = cols.reduce((a, c) => a + r.pay[c.j], 0); return `<tr><td class="sticky">${esc(r.name)}</td><td>${esc(r.property)}</td>${cols.map((c) => r.pay[c.j] ? `<td class="num">${fmtFull(r.pay[c.j])}</td>` : '<td class="num zero" title="No payment recorded">–</td>').join("")}<td class="num">${fmtFull(sum)}</td></tr>`; }).join("") +
      `<tr class="tot"><td class="sticky">Total</td><td></td>${tot.map((v) => `<td class="num">${fmtFull(v)}</td>`).join("")}<td class="num">${fmtFull(tot.reduce((a, b) => a + b, 0))}</td></tr></tbody></table><p class="hint" style="padding:8px 10px">From the "Landlord Rent Payments" sheet; "–" means no payment recorded that month.</p>`;
    $("#tblCount").textContent = rows.length + " landlords × " + cols.length + " months";
    $("#pager").innerHTML = "";
    csvRows = [["Landlord", "Property", ...cols.map((c) => c.k), "Period total"]].concat(rows.map((r) => [r.name, r.property, ...cols.map((c) => r.pay[c.j]), cols.reduce((a, c) => a + r.pay[c.j], 0)]));
  }
  function renderChips() {
    const chips = [];
    if (state.tab === "tx") {
      if (state.tx.month) chips.push(["month", "Month: " + mLabel(state.tx.month)]);
      if (state.tx.head) chips.push(["head", "Head: " + H[state.tx.head].name]);
    }
    $("#txChips").innerHTML = chips.map(([k, l]) => `<button type="button" class="chip" data-k="${k}" aria-label="Remove filter ${esc(l)}">${esc(l)}<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>`).join("");
    $("#txChips").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { state.tx[b.dataset.k] = null; state.page = 0; renderTable(); }));
  }
  function renderTable() {
    renderChips();
    if (state.tab === "stmt") renderStmt(); else if (state.tab === "tx") renderTx(); else renderLl();
  }
  let sT;
  $("#tblSearch").addEventListener("input", (e) => { clearTimeout(sT); sT = setTimeout(() => { state.search = e.target.value; state.page = 0; renderTable(); }, 120); });
  $("#csvBtn").addEventListener("click", () => {
    if (!csvRows.length) return;
    const csv = "﻿" + csvRows.map((r) => r.map((v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\r\n");
    const name = `thrive-${state.tab === "stmt" ? "cashflow-statement" : state.tab === "tx" ? "transactions" : "landlord-rent"}_${keys[state.from]}_to_${keys[state.to]}${state.cat !== "All" ? "_" + state.cat.toLowerCase() : ""}.csv`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  // ---------- filters ----------
  const fFrom = $("#fFrom"), fTo = $("#fTo");
  fFrom.innerHTML = fTo.innerHTML = keys.map((k, i) => `<option value="${i}">${mLabel(k)}${D.months[i].status === "Monthly total only" ? " (totals only)" : D.months[i].status === "Partly projected" ? " (part projected)" : ""}</option>`).join("");
  fFrom.addEventListener("change", () => { state.from = +fFrom.value; if (state.from > state.to) state.to = state.from; state.tx.month = null; state.page = 0; update(); });
  fTo.addEventListener("change", () => { state.to = +fTo.value; if (state.to < state.from) state.from = state.to; state.tx.month = null; state.page = 0; update(); });
  $("#fCat").addEventListener("change", (e) => { state.cat = e.target.value; state.page = 0; update(); });
  $("#fMin").addEventListener("change", (e) => { const v = parseFloat(e.target.value); state.min = isNaN(v) ? 0 : v * 1e5; update(); });
  $("#fProj").addEventListener("change", (e) => { state.proj = e.target.checked; update(); });
  $("#presets").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.p === "all") { state.from = 0; state.to = keys.length - 1; }
    else { const [a, z] = b.dataset.p.split(","); state.from = mIndex[a]; state.to = mIndex[z]; }
    state.tx.month = null; state.page = 0; update();
  }));
  $("#balGrain").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    state.grain = b.dataset.g;
    $("#balGrain").querySelectorAll("button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    drawBal();
  }));
  $("#printBtn").addEventListener("click", () => window.print());

  function syncControls() {
    fFrom.value = state.from; fTo.value = state.to; $("#fCat").value = state.cat;
    $("#fMin").value = +(state.min / 1e5).toFixed(2); $("#fProj").checked = state.proj;
    $("#presets").querySelectorAll("button").forEach((b) => {
      const on = b.dataset.p === "all" ? state.from === 0 && state.to === keys.length - 1 : b.dataset.p === keys[state.from] + "," + keys[state.to];
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    });
    $("#printScope").textContent = `Period ${mLabel(keys[state.from])} to ${mLabel(keys[state.to])} · ${state.cat === "All" ? "All categories" : state.cat} · Alert level ${state.min === 0 ? "₹0 (overdrawn)" : fmtL(state.min)} · Nov-26 projections ${state.proj ? "included" : "excluded"}`;
  }

  function update(opts) {
    opts = opts || {};
    syncControls(); writeHash();
    kpis();
    if (opts.fromLoom) drawLoomColorsOnly(); else drawLoom();
    drawFlow(); drawBal(); actTable(); drawTop("topIn", "in"); drawTop("topOut", "out");
    renderTable();
  }
  function drawLoomColorsOnly() { /* brush already in place; nothing else depends on range */ }

  // ---------- boot ----------
  const topBar = document.querySelector(".topbar");
  const setTopH = () => document.documentElement.style.setProperty("--top-h", (getComputedStyle(topBar).position === "sticky" ? topBar.offsetHeight : 0) + "px");
  if (window.ResizeObserver) new ResizeObserver(setTopH).observe(topBar); setTopH();
  $("#srcFile").textContent = D.source; $("#genDate").textContent = D.generated;
  setTab("stmt");
  update();
  let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => Object.values(charts).forEach((c) => c.resize()), 120); });
  const sparkInk = (col, area) => { if (charts.heroSpark) charts.heroSpark.setOption({ series: [{ lineStyle: { color: col }, itemStyle: { color: col }, areaStyle: { color: area } }] }); };
  window.addEventListener("beforeprint", () => { sparkInk(C.accent, grad("rgba(109,74,255,.18)", "rgba(109,74,255,0)")); Object.values(charts).forEach((c) => c.resize()); });
  window.addEventListener("afterprint", () => { sparkInk("#FFFFFF", grad("rgba(255,255,255,.32)", "rgba(255,255,255,0)")); Object.values(charts).forEach((c) => c.resize()); });
  window.__cf = { state, update, openMonth, openHead };
})();
