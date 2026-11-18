/* Thrive cash-flow model: every derived figure on the dashboard, the Ask AI answers and the
   What-if simulator comes from here, computed from data.js (window.CF). No numbers are invented:
   each one is a sum or a pick of workbook cells. */
(function (root) {
  "use strict";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MINUS = "−";

  /* ---------- formatting ---------- */
  const sign = (v) => (v < 0 ? MINUS : "");
  function lakh(v, d) {
    if (v == null || isNaN(v)) return "–";
    const a = Math.abs(v);
    if (a >= 1e7) return sign(v) + "₹" + (a / 1e7).toFixed(2) + " Cr";
    const s = (a / 1e5).toFixed(d == null ? 2 : d);
    return (+s === 0 ? "" : sign(v)) + "₹" + s + " L";
  }
  const lakhNum = (v) => { const s = (Math.abs(v) / 1e5).toFixed(2); return (+s === 0 ? "" : sign(v)) + s; };
  function inr(v) {
    const r = Math.round(Math.abs(v));
    return (r === 0 ? "" : sign(v)) + "₹" + r.toLocaleString("en-IN");
  }
  const monthLabel = (key) => MON[+key.slice(5) - 1] + "'" + key.slice(2, 4);
  const monthLong = (key) => MON_LONG[+key.slice(5) - 1] + " " + key.slice(0, 4);
  function dayRange(w) {
    const s = new Date(w.start + "T00:00"), e = new Date(w.end + "T00:00");
    const m = MON[e.getMonth()];
    return s.getDate() === e.getDate() ? e.getDate() + " " + m : s.getDate() + "–" + e.getDate() + " " + m;
  }

  function create(CF) {
    const W = CF.weeks.map((w, i) => Object.assign({}, w, { i, short: dayRange(w), long: dayRange(w) + " " + w.end.slice(0, 4) }));
    const M = CF.months.map((m, i) => Object.assign({}, m, { i, label: monthLabel(m.key), long: monthLong(m.key) }));
    const HEADS = CF.heads, H = Object.fromEntries(HEADS.map((h) => [h.id, h]));
    const SPEND = (CF.meta && CF.meta.spend) || [];
    const SP = Object.fromEntries(SPEND.map((g) => [g.id, g]));
    const ACTS = ["Operating", "Investing", "Financing"];
    const actualW = W.filter((w) => w.actual), plannedW = W.filter((w) => !w.actual);
    const lastActual = actualW[actualW.length - 1];
    const lastFullMonth = [...M].reverse().find((m) => m.actual && m.weeks.length);
    const meta = CF.meta || {};

    /* a month as shown: with projections off, a part-planned month keeps only its actual weeks */
    function monthEff(m, proj) {
      if (proj || m.actual) return m;
      const ws = m.weeks.map((i) => W[i]).filter((w) => w.actual);
      if (!ws.length) return null;
      const t = sumWeeks(ws);
      return Object.assign({}, m, t, { partial: true, close: ws[ws.length - 1].close, open: ws[0].open });
    }
    function sumWeeks(ws) {
      const t = { inflow: 0, outflow: 0, v: {} };
      ws.forEach((w) => { t.inflow += w.inflow; t.outflow += w.outflow; for (const k in w.v) t.v[k] = (t.v[k] || 0) + w.v[k]; });
      return t;
    }
    const mIdx = (key) => M.findIndex((m) => m.key === key);
    function months(from, to, proj) {
      return M.filter((m) => m.key >= from && m.key <= to).map((m) => monthEff(m, proj)).filter(Boolean);
    }
    function weeks(from, to, proj) {
      return W.filter((w) => w.key >= from && w.key <= to && (proj || w.actual));
    }
    /* category filter: "All", an activity (Operating/Investing/Financing) or a spend group id */
    function headIn(h, cat) {
      if (!cat || cat === "All") return true;
      if (ACTS.includes(cat)) return h.act === cat;
      if (SP[cat]) return h.dir === "out" && h.grp === cat;
      return true;
    }
    function flows(x, cat) {
      if (!cat || cat === "All") return { in: x.inflow, out: x.outflow };
      let i = 0, o = 0;
      for (const k in x.v) { const h = H[k]; if (!h || !headIn(h, cat)) continue; if (h.dir === "in") i += x.v[k]; else o += x.v[k]; }
      return { in: i, out: o };
    }
    function totals(ms, cat) {
      const t = { in: 0, out: 0, v: {}, months: ms.length };
      ms.forEach((m) => { const f = flows(m, cat); t.in += f.in; t.out += f.out; for (const k in m.v) t.v[k] = (t.v[k] || 0) + m.v[k]; });
      t.net = t.in - t.out;
      t.open = ms.length ? ms[0].open : 0;
      t.close = ms.length ? ms[ms.length - 1].close : 0;
      t.planned = ms.some((m) => !m.actual && !m.partial);
      return t;
    }
    const gsum = (v, gid) => (SP[gid] ? SP[gid].rows.reduce((a, r) => a + (v["r" + r] || 0), 0) : 0);
    function spend(v) {
      return SPEND.map((g) => ({ id: g.id, name: g.name, v: gsum(v, g.id) })).filter((x) => Math.abs(x.v) > 0.5).sort((a, b) => b.v - a.v);
    }
    function topHeads(v, dir, n) {
      return Object.entries(v).filter(([k, x]) => H[k] && H[k].dir === dir && x > 0).map(([k, x]) => ({ id: k, name: H[k].name, v: x }))
        .sort((a, b) => b.v - a.v).slice(0, n || 6);
    }
    const rentIn = (v) => v.r11 || 0;
    const rentOut = (v) => v.r26 || 0;
    const cover = (v) => (rentOut(v) ? rentIn(v) / rentOut(v) : null);

    /* ---------- balances at the last actual week ---------- */
    const balances = lastActual ? { week: lastActual, bank: lastActual.close, rzp: lastActual.rzpClose, combined: lastActual.net } : null;

    /* ---------- verdict ---------- */
    function verdict(min) {
      min = min || 0;
      const cur = lastActual, plan = plannedW;
      const end = plan.length ? plan[plan.length - 1] : cur;
      const endTxt = dayRange(end).split("–").pop();
      const word = min ? "below the " + lakh(min) + " alert level" : "overdrawn";
      const okWord = min ? "above the " + lakh(min) + " alert level" : "in credit";
      const rentDue = plan.reduce((a, w) => a + (w.v.r26 || 0), 0);
      const below = (w) => w.close < min;
      const firstBelow = plan.find(below), firstAbove = plan.find((w) => !below(w));
      let tone, text;
      if (!below(cur) && !firstBelow) { tone = "good"; text = `Cash stays ${okWord} through ${endTxt}; the plan ends at ${lakh(end.close)}.`; }
      else if (!below(cur) && firstBelow) { tone = "bad"; text = `The account goes ${word} in the week of ${dayRange(firstBelow)} (${lakh(firstBelow.close)}).`; }
      else if (below(cur) && firstAbove) { tone = "warn"; text = `The account is ${word} now (${lakh(cur.close)}); the plan brings it back ${okWord} in the week of ${dayRange(firstAbove)}.`; }
      else { tone = "bad"; text = `The account is ${word} and stays ${word} through ${endTxt}. The plan closes ${MON_LONG[+end.key.slice(5) - 1]} at ${lakh(end.close)}` + (rentDue > 0 ? ` after ${lakh(rentDue)} of landlord rent.` : "."); }
      return { tone, text, current: cur, end, firstBelow, firstAbove };
    }

    /* ---------- watch list ---------- */
    function watch(min) {
      min = min || 0;
      const out = [];
      let k = 0;
      for (let i = actualW.length - 1; i >= 0 && actualW[i].close < min; i--) k++;
      if (k >= 2) {
        const last = [...actualW].reverse().find((w) => w.close >= min);
        out.push({ level: "critical", kind: "streak", title: `${k} weeks in a row ${min ? "below " + lakh(min) : "overdrawn"}`,
          text: last ? `Last week ${min ? "above it" : "in credit"}: ${last.long} (${lakh(last.close)}).` : "No week in credit in the workbook.", week: lastActual.i });
      }
      plannedW.forEach((w) => { const r = w.v.r26 || 0; if (r >= 1e5) out.push({ level: "warning", kind: "landlord", title: `${lakh(r)} landlord rent due ${w.short}`, text: `Planned. The week closes at ${lakh(w.close)}${w.close < min ? ", " + (min ? "below the alert level" : "overdrawn") : ""}.`, week: w.i }); });
      const recent = actualW.slice(-8).concat(plannedW).filter((w) => (w.v.r26 || 0) > (w.v.r11 || 0) && (w.v.r26 || 0) > 0);
      if (recent.length) {
        const worst = recent.reduce((a, b) => ((b.v.r26 - (b.v.r11 || 0)) > (a.v.r26 - (a.v.r11 || 0)) ? b : a));
        out.push({ level: "warning", kind: "cover", title: `Rent paid beat rent collected in ${recent.length} of the last ${actualW.slice(-8).length + plannedW.length} weeks`,
          text: `Widest gap ${worst.short}: collected ${lakh(worst.v.r11 || 0)}, paid to landlords ${lakh(worst.v.r26)}${worst.actual ? "" : " (planned)"}.`, week: worst.i });
      }
      if (plannedW.length) {
        const lo = plannedW.reduce((a, b) => (b.close < a.close ? b : a));
        out.push({ level: lo.close < min ? "critical" : "info", kind: "low", title: `Lowest planned balance: ${lakh(lo.close)}`, text: `Week of ${lo.short}, after ${lakh(lo.outflow)} out and ${lakh(lo.inflow)} in.`, week: lo.i });
      }
      return out;
    }

    /* ---------- upcoming payments (planned weeks) ---------- */
    function upcoming(limit) {
      const rows = [];
      plannedW.forEach((w) => {
        let small = 0;
        Object.entries(w.v).forEach(([k, v]) => { const h = H[k]; if (!h || h.dir !== "out" || v <= 0) return; if (v >= 10000) rows.push({ week: w, id: k, name: h.name, grp: h.grp, v }); else small += v; });
        if (small > 0) rows.push({ week: w, id: "", name: "Smaller items under ₹10,000", grp: "", v: small });
      });
      rows.sort((a, b) => a.week.i - b.week.i || b.v - a.v);
      return { rows, total: rows.reduce((a, r) => a + r.v, 0), inflow: plannedW.reduce((a, w) => a + w.inflow, 0) };
    }

    /* ---------- landlords ---------- */
    const LL = CF.landlords || { months: [], rows: [] };
    function landlordMonth() { // last landlord-sheet month that is fully actual in the cash flow
      const keys = LL.months.filter((k) => { const m = M.find((x) => x.key === k); return m && m.actual; });
      return keys[keys.length - 1] || LL.months[LL.months.length - 1];
    }
    function landlords(monthKey) {
      const mk = monthKey || landlordMonth(), j = LL.months.indexOf(mk);
      const by = {};
      /* monthly commitment = the landlord's latest regular payment in the six months to mk:
         the newest non-zero amount between 0.75x and 1.5x of the median, so double or part payments are skipped */
      const commit = (pay) => {
        const win = pay.slice(Math.max(0, j - 5), j + 1).filter((x) => x > 0);
        if (!win.length) return 0;
        const s = [...win].sort((a, b) => a - b), med = s[Math.floor(s.length / 2)];
        return [...win].reverse().find((x) => x >= 0.75 * med && x <= 1.5 * med) || 0;
      };
      LL.rows.forEach((r) => {
        const p = (by[r.property] = by[r.property] || { name: r.property, rows: [], v: 0, commit: 0 });
        const c = commit(r.pay);
        p.rows.push({ name: r.name, v: r.pay[j] || 0, commit: c, pay: r.pay }); p.v += r.pay[j] || 0; p.commit += c;
      });
      const props = Object.values(by).sort((a, b) => b.commit - a.commit);
      return { month: mk, props, total: props.reduce((a, p) => a + p.v, 0), commit: props.reduce((a, p) => a + p.commit, 0), months: LL.months };
    }
    function landlordPaid(monthKey) { const j = LL.months.indexOf(monthKey); return j < 0 ? null : LL.rows.reduce((a, r) => a + (r.pay[j] || 0), 0); }

    /* ---------- statement rows ---------- */
    function statement(ms) {
      const R = [], col = (f) => ms.map(f), t = totals(ms);
      R.push({ k: "tot", name: "Opening balance", v: col((m) => m.open), pt: t.open });
      R.push({ k: "grp", id: "IN", name: "Money in", v: col((m) => m.inflow), pt: t.in });
      HEADS.filter((h) => h.dir === "in").forEach((h) => { if (ms.some((m) => Math.abs(m.v[h.id] || 0) >= 1)) R.push({ k: "leaf", p: "IN", hid: h.id, name: h.name, v: col((m) => m.v[h.id] || 0), pt: t.v[h.id] || 0 }); });
      R.push({ k: "tot", name: "Money out", v: col((m) => m.outflow), pt: t.out });
      SPEND.forEach((g) => {
        R.push({ k: "grp", id: g.id, name: g.name, v: col((m) => gsum(m.v, g.id)), pt: gsum(t.v, g.id) });
        g.rows.forEach((r) => { const id = "r" + r; if (H[id] && ms.some((m) => Math.abs(m.v[id] || 0) >= 1)) R.push({ k: "leaf", p: g.id, hid: id, name: H[id].name, v: col((m) => m.v[id] || 0), pt: t.v[id] || 0 }); });
      });
      R.push({ k: "tot", name: "Net cash flow", v: col((m) => m.inflow - m.outflow), pt: t.in - t.out });
      R.push({ k: "adj", name: "Razorpay movement", v: col((m) => m.close - m.open - (m.inflow - m.outflow)), pt: t.close - t.open - (t.in - t.out) });
      R.push({ k: "tot", name: "Closing balance", v: col((m) => m.close), pt: t.close });
      return R;
    }

    /* ---------- What-if over the planned weeks ----------
       p = { rentPct, delayReno, delayRent, newRent, newIncome, newWeek, oneOff, oneOffWeek }
       With every value at zero it returns the plan's closing balances exactly. */
    function whatIf(p) {
      p = p || {};
      const plan = plannedW, n = plan.length;
      const RENO = SP.reno ? SP.reno.rows.map((r) => "r" + r) : [];
      const share = (w, ids) => ids.reduce((a, id) => a + (w.v[id] || 0), 0);
      const shift = (ids, d) => { // amount leaving and arriving per planned week when a group is delayed d weeks
        const leave = plan.map((w) => (d ? share(w, ids) : 0));
        const arrive = plan.map((w, i) => (d && i - d >= 0 ? leave[i - d] : 0));
        return { leave, arrive, beyond: d ? leave.slice(Math.max(0, n - d)).reduce((a, b) => a + b, 0) : 0 };
      };
      const reno = shift(RENO, p.delayReno || 0), rent = shift(["r26", "r27"], p.delayRent || 0);
      let cb = lastActual ? lastActual.close : 0;
      const rows = plan.map((w, i) => {
        let rc = w.inflow + (p.rentPct || 0) / 100 * (w.v.r11 || 0);
        let out = w.outflow - reno.leave[i] + reno.arrive[i] - rent.leave[i] + rent.arrive[i];
        if (p.newWeek != null && +p.newWeek === w.i) { out += p.newRent || 0; rc += p.newIncome || 0; }
        if (p.oneOff && p.oneOffWeek != null && +p.oneOffWeek === w.i) { if (p.oneOff > 0) rc += p.oneOff; else out -= p.oneOff; }
        const adj = w.close - w.open - (w.inflow - w.outflow); // Razorpay movement as planned
        const ob = cb; cb = ob + rc - out + adj;
        return { week: w, ob, rc, out, cb, plan: w.close };
      });
      return { rows, beyond: reno.beyond + rent.beyond, end: rows.length ? rows[rows.length - 1].cb : cb, planEnd: n ? plan[n - 1].close : cb };
    }

    return {
      MON, MON_LONG, W, M, H, HEADS, SPEND, SP, ACTS, meta, actualW, plannedW, lastActual, lastFullMonth, balances, LL,
      lakh, lakhNum, inr, monthLabel, monthLong, dayRange, mIdx,
      months, weeks, monthEff, sumWeeks, flows, totals, gsum, spend, topHeads, rentIn, rentOut, cover, headIn,
      verdict, watch, upcoming, landlords, landlordMonth, landlordPaid, statement, whatIf,
    };
  }
  root.ThriveModel = { create };
  if (typeof module !== "undefined") module.exports = { create };
})(typeof window !== "undefined" ? window : globalThis);
