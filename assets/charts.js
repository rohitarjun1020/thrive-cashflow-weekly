/* SVG charts for the Thrive dashboard. Every mark is drawn to scale on one y-axis; colours come
   from CSS custom properties so light and dark themes redraw correctly. */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let tipEl = null;
  function tip() {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; tipEl.setAttribute("role", "status"); document.body.appendChild(tipEl); }
    return tipEl;
  }
  function showTip(html, x, y) {
    const t = tip(); t.innerHTML = html; t.hidden = false;
    const r = t.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    let left = x + 14, top = y + 14;
    if (left + r.width > vw - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    t.style.left = Math.max(8, left) + "px"; t.style.top = Math.max(8, top) + "px";
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }
  function nice(max) { // a round tick step for 4-6 ticks
    if (max <= 0) return 1;
    const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  const axisL = (v) => { if (v === 0) return "0"; const a = Math.abs(v), s = v < 0 ? "−" : ""; return s + (a >= 1e7 ? (a / 1e7).toFixed(a % 1e7 ? 1 : 0) + " Cr" : Math.round(a / 1e5) + " L"); };
  function svg(w, h, label) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`); s.setAttribute("width", w); s.setAttribute("height", h);
    s.setAttribute("role", "img"); s.setAttribute("aria-label", label || "");
    return s;
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, attrs) { const t = el("text", Object.assign({ x, y }, attrs || {}), parent); t.textContent = str; return t; }
  function hatch(s, id, color) {
    const d = el("defs", {}, s), p = el("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d);
    el("rect", { width: 6, height: 6, fill: css("--card") }, p);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: color, "stroke-width": 2.2 }, p);
  }
  /* rounded-end bar anchored to the baseline: r on the far end only */
  function barPath(x, y0, w, y1, r) {
    const up = y1 < y0, h = Math.abs(y1 - y0); r = Math.min(r, h, w / 2);
    if (h < 0.5) return "";
    return up
      ? `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`
      : `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
  }
  function wire(g, html, onClick, label) {
    g.setAttribute("tabindex", "-1"); g.setAttribute("role", "button"); g.setAttribute("aria-label", label);
    g.addEventListener("pointermove", (e) => showTip(html(), e.clientX, e.clientY));
    g.addEventListener("pointerleave", hideTip);
    g.addEventListener("focus", () => { const r = g.getBoundingClientRect(); showTip(html(), r.left + r.width / 2, r.top); });
    g.addEventListener("blur", hideTip);
    if (onClick) {
      g.addEventListener("click", () => { hideTip(); onClick(); });
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hideTip(); onClick(); } });
    }
  }

  // one tab stop per chart; arrow keys move between bars/points/floors
  function rove(s) {
    const items = [...s.querySelectorAll(".hit")]; if (!items.length) return;
    const start = items.find((g) => g.classList.contains("sel")) || items[items.length - 1];
    start.setAttribute("tabindex", "0");
    s.addEventListener("keydown", (e) => {
      const k = items.indexOf(document.activeElement); if (k < 0) return;
      const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? k + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? k - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
      if (to == null) return; e.preventDefault();
      const t = items[Math.max(0, Math.min(items.length - 1, to))];
      items.forEach((g) => g.setAttribute("tabindex", g === t ? "0" : "-1")); t.focus();
    });
  }

  /* ---------- money in (up) / money out (down) with a net line ---------- */
  function inout(host, items, o) {
    o = o || {};
    host.innerHTML = "";
    const W = Math.max(280, host.clientWidth || 600), H = o.height || (host.classList.contains("fill") && W >= 560 ? Math.max(300, host.clientHeight) : (W < 560 ? 250 : 300));
    const P = { l: 52, r: 12, t: 14, b: 30 };
    const s = svg(W, H, o.label || "Money in and money out");
    const gain = css("--gain"), loss = css("--loss"), ink = css("--ink"), ink3 = css("--ink-3"), rule = css("--rule");
    hatch(s, "hIn", gain); hatch(s, "hOut", loss);
    const maxIn = Math.max(1, ...items.map((d) => d.in)), maxOut = Math.max(1, ...items.map((d) => d.out));
    const top = Math.max(maxIn, ...items.map((d) => d.in - d.out)), bot = Math.max(maxOut, ...items.map((d) => d.out - d.in));
    const step = nice(Math.max(top, bot));
    const hi = Math.ceil(top / step) * step, lo = -Math.ceil(bot / step) * step;
    const y = (v) => P.t + (hi - v) / (hi - lo) * (H - P.t - P.b);
    for (let v = lo; v <= hi + 1; v += step) {
      el("line", { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: v === 0 ? ink : rule, "stroke-width": v === 0 ? 1 : 1 }, s);
      text(s, P.l - 8, y(v) + 4, axisL(v), { "text-anchor": "end", class: "ax" });
    }
    const n = items.length, slot = (W - P.l - P.r) / Math.max(n, 1), bw = Math.max(3, Math.min(28, slot * 0.62));
    const every = Math.ceil(n / Math.max(1, Math.floor((W - P.l - P.r) / 58)));
    const netPts = [];
    items.forEach((d, i) => {
      const cx = P.l + slot * i + slot / 2, x = cx - bw / 2;
      const g = el("g", { class: "hit" + (d.sel ? " sel" : "") }, s);
      el("rect", { x: P.l + slot * i, y: P.t, width: slot, height: H - P.t - P.b, fill: "transparent", class: "band" }, g);
      el("path", { class: "bi", style: `--i:${i}`, d: barPath(x, y(0) - 1, bw, y(d.in), 4), fill: d.planned ? "url(#hIn)" : gain, stroke: d.planned ? gain : "none", "stroke-width": d.planned ? 1.2 : 0 }, g);
      el("path", { class: "bo", style: `--i:${i}`, d: barPath(x, y(0) + 1, bw, y(-d.out), 4), fill: d.planned ? "url(#hOut)" : loss, stroke: d.planned ? loss : "none", "stroke-width": d.planned ? 1.2 : 0 }, g);
      if (d.planned && d.inA > 0) el("path", { class: "bi", style: `--i:${i}`, d: barPath(x, y(0) - 1, bw, y(Math.min(d.inA, d.in)), d.inA >= d.in ? 4 : 0), fill: gain }, g); // actual weeks of a part-planned month stay solid
      if (d.planned && d.outA > 0) el("path", { class: "bo", style: `--i:${i}`, d: barPath(x, y(0) + 1, bw, y(-Math.min(d.outA, d.out)), d.outA >= d.out ? 4 : 0), fill: loss }, g);
      netPts.push([cx, y(d.in - d.out), d.planned]);
      if ((i % every === 0 && n - 1 - i >= every) || i === n - 1) text(s, cx, H - 10, d.label, { "text-anchor": "middle", class: "ax" + (d.planned ? " pl" : "") });
      wire(g, () => `<b>${esc(d.tip)}</b>${d.planned ? ' <span class="stamp pl">Planned</span>' : ""}<table><tr><td><i class="sw in"></i>Money in</td><td>${esc(o.fmt(d.in))}</td></tr><tr><td><i class="sw out"></i>Money out</td><td>${esc(o.fmt(-d.out))}</td></tr><tr><td><i class="sw net"></i>Net</td><td>${esc(o.fmt(d.in - d.out))}</td></tr>${d.planned && (d.inA || d.outA) ? `<tr><td>Actual so far</td><td>in ${esc(o.fmt(d.inA))}, out ${esc(o.fmt(-d.outA))}</td></tr>` : ""}</table>${o.onClick ? '<small>Click for line items</small>' : ""}`,
        o.onClick ? () => o.onClick(d) : null, `${d.tip}: in ${o.fmt(d.in)}, out ${o.fmt(d.out)}`);
    });
    if (o.net !== false && netPts.length > 1) {
      let dA = "", dP = "";
      netPts.forEach((p, i) => { if (i === 0) return; const a = netPts[i - 1], seg = `M${a[0]},${a[1]}L${p[0]},${p[1]}`; if (p[2]) dP += seg; else dA += seg; });
      el("path", { class: "ln", pathLength: 1, d: dA, fill: "none", stroke: ink, "stroke-width": 2, "pointer-events": "none" }, s);
      el("path", { d: dP, fill: "none", stroke: ink, "stroke-width": 2, "stroke-dasharray": "4 4", "pointer-events": "none" }, s);
      netPts.forEach((p) => el("circle", { cx: p[0], cy: p[1], r: slot < 14 ? 0 : 3, fill: css("--card"), stroke: ink, "stroke-width": 1.6, "pointer-events": "none" }, s));
    }
    rove(s);
    host.appendChild(s);
  }

  /* ---------- closing balance line with overdrawn shading ---------- */
  function balance(host, pts, o) {
    o = o || {};
    host.innerHTML = "";
    const W = Math.max(280, host.clientWidth || 600), H = o.height || (host.classList.contains("fill") && W >= 560 ? Math.max(280, host.clientHeight) : (W < 560 ? 240 : 280));
    const P = { l: 52, r: 14, t: 32, b: 30 };
    const s = svg(W, H, o.label || "Closing bank balance");
    const ink = css("--ink"), rule = css("--rule"), loss = css("--loss"), gain = css("--gain"), accent = css("--accent");
    const min = o.min || 0, vals = pts.map((p) => p.v).concat([0, min], o.ghost || []);
    const step = nice(Math.max(...vals) - Math.min(...vals));
    const hi = Math.ceil(Math.max(...vals) / step) * step, lo = Math.floor(Math.min(...vals) / step) * step;
    const y = (v) => P.t + (hi - v) / ((hi - lo) || 1) * (H - P.t - P.b);
    const n = pts.length, x = (i) => P.l + (n === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (n - 1));
    for (let v = lo; v <= hi + 1; v += step) {
      el("line", { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: rule }, s);
      text(s, P.l - 8, y(v) + 4, axisL(v), { "text-anchor": "end", class: "ax" });
    }
    // overdrawn zone below zero (or below the alert level)
    const id = "clip" + Math.random().toString(36).slice(2, 7);
    const cp = el("clipPath", { id }, el("defs", {}, s));
    el("rect", { x: P.l, y: y(min), width: W - P.l - P.r, height: Math.max(0, y(lo) - y(min)) }, cp);
    const area = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join("") + `L${x(n - 1)},${y(min)}L${x(0)},${y(min)}Z`;
    el("path", { d: area, fill: loss, "fill-opacity": 0.16, "clip-path": `url(#${id})` }, s);
    el("line", { x1: P.l, x2: W - P.r, y1: y(min), y2: y(min), stroke: min ? accent : ink, "stroke-width": 1.2, "stroke-dasharray": min ? "5 4" : null }, s);
    el("rect", { x: P.l, y: 5, width: 14, height: 10, rx: 2, fill: loss, "fill-opacity": 0.16, stroke: min ? accent : ink, "stroke-width": 1 }, s);
    text(s, P.l + 20, 14, o.zeroText ? o.zeroText : min ? "Shaded: below your alert level of " + o.fmt(min) : (W < 560 ? "Shaded: overdrawn (below ₹0)" : "Shaded: the account is overdrawn (below the ₹0 line)"), { class: "ax strong" });
    if (o.ghost) el("path", { d: o.ghost.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(""), fill: "none", stroke: css("--ink-3"), "stroke-width": 1.5, "stroke-dasharray": "2 4" }, s);
    let dA = "", dP = "";
    pts.forEach((p, i) => { if (!i) return; const seg = `M${x(i - 1)},${y(pts[i - 1].v)}L${x(i)},${y(p.v)}`; if (p.planned) dP += seg; else dA += seg; });
    el("path", { class: "ln", pathLength: 1, d: dA, fill: "none", stroke: ink, "stroke-width": 2, "stroke-linejoin": "round" }, s);
    el("path", { d: dP, fill: "none", stroke: ink, "stroke-width": 2, "stroke-dasharray": "5 5" }, s);
    const every = Math.ceil(n / Math.max(1, Math.floor((W - P.l - P.r) / 58)));
    pts.forEach((p, i) => {
      const g = el("g", { class: "hit" }, s), below = p.v < min;
      el("rect", { x: x(i) - (W - P.l - P.r) / Math.max(n - 1, 1) / 2, y: P.t, width: (W - P.l - P.r) / Math.max(n - 1, 1), height: H - P.t - P.b, fill: "transparent", class: "band" }, g);
      el("circle", { class: "dt", style: `--i:${i}`, cx: x(i), cy: y(p.v), r: n > 60 ? 2.6 : 4.2, fill: p.planned ? css("--card") : below ? loss : gain, stroke: below ? loss : gain, "stroke-width": 2, "stroke-dasharray": p.planned ? "2 2" : null }, g);
      if ((i % every === 0 && (every === 1 || n - 1 - i >= every * 2)) || i === n - 1) text(s, x(i), H - 10, p.label, { "text-anchor": i === n - 1 && n > 3 ? "end" : "middle", class: "ax" + (p.planned ? " pl" : "") });
      wire(g, () => `<b>${esc(p.tip)}</b>${p.planned ? ' <span class="stamp pl">Planned</span>' : ""}${below ? ` <span class="stamp od">${esc(o.belowWord || (min ? "Below alert" : "Overdrawn"))}</span>` : ""}<table><tr><td>${esc(o.valueName || "Closing balance")}</td><td>${esc(o.fmt(p.v))}</td></tr></table>${o.onClick ? "<small>Click for line items</small>" : ""}`,
        o.onClick ? () => o.onClick(p) : null, `${p.tip}: ${o.valueName ? o.valueName.toLowerCase() : "closing"} ${o.fmt(p.v)}`);
    });
    rove(s);
    host.appendChild(s);
  }

  /* ---------- the building: one floor per property, width = monthly commitment ---------- */
  function building(host, props, o) {
    host.innerHTML = "";
    const W = Math.max(280, host.clientWidth || 520), floor = 46, gap = 4, n = props.length;
    const narrow = W < 520, foot = narrow ? 32 : 18;
    const H = n * (floor + gap) + 26 + foot;
    const s = svg(W, H, o.label || "Monthly rent commitment by property");
    const ink = css("--ink"), card = css("--card"), desk = css("--desk"), deskInk = css("--desk-ink"), line = css("--line-2");
    const max = Math.max(1, ...props.map((p) => p.commit)), left = 0, avail = W - 4;
    const yTop = 22;
    const order = [...props].sort((a, b) => a.commit - b.commit); // smallest on top, largest on the ground floor
    el("path", { d: `M0,${yTop - 8}H${avail * (order[0] ? order[0].commit / max : 1)}`, stroke: ink, "stroke-width": 3 }, s); // parapet
    order.forEach((p, i) => {
      const w = avail * p.commit / max, yy = yTop + i * (floor + gap);
      const g = el("g", { class: "hit floor", style: `--i:${i}` }, s);
      el("rect", { x: left, y: yy, width: w, height: floor, rx: 3, fill: desk, stroke: line }, g);
      const win = p.rows.length, ww = 9, wg = 6, winW = win * (ww + wg) - wg;
      const labEnd = left + 12 + Math.max(p.name.length * 7.4, (o.fmt(p.commit) + " a month").length * 6.4) + 12;
      let wx0 = w - 14 - winW; if (wx0 < labEnd) wx0 = Math.max(w, labEnd) + 8; // no room inside: hang the windows beside the floor
      p.rows.forEach((r, k) => el("rect", { x: wx0 + k * (ww + wg), y: yy + 12, width: ww, height: floor - 24, rx: 1.5, fill: r.v > 0 ? card : "none", stroke: deskInk, "stroke-width": 1.2, "stroke-dasharray": r.v > 0 ? null : "2 2" }, g));
      text(g, left + 12, yy + 20, p.name, { class: "fl-n" });
      text(g, left + 12, yy + 36, o.fmt(p.commit) + " a month", { class: "fl-v" });
      wire(g, () => `<b>${esc(p.name)}</b><table><tr><td>Monthly commitment</td><td>${esc(o.inr(p.commit))}</td></tr><tr><td>Paid in ${esc(o.monthTxt)}</td><td>${esc(o.inr(p.v))}</td></tr>${p.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(o.inr(r.commit))}</td></tr>`).join("")}</table><small>Windows: one per landlord; dashed = not paid in ${esc(o.monthTxt)}</small>`,
        o.onClick ? () => o.onClick(p) : null, `${p.name}: ${o.fmt(p.commit)} a month`);
    });
    el("line", { x1: 0, x2: W, y1: H - foot, y2: H - foot, stroke: ink, "stroke-width": 2 }, s);
    const note2 = `Windows: one per landlord; dashed = not paid in ${o.monthTxt}.`;
    if (narrow) { text(s, 0, H - foot + 14, "Floor width to scale: monthly rent.", { class: "ax" }); text(s, 0, H - 2, note2, { class: "ax" }); }
    else text(s, 0, H - 4, "Floor width to scale: monthly rent. " + note2, { class: "ax" });
    rove(s);
    host.appendChild(s);
  }

  root.ThriveCharts = { inout, balance, building, hideTip, showTip };
})(window);
