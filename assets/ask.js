/* Built-in "Ask AI" for the Thrive dashboard: recognises common questions and answers them in code
   from ThriveModel. No AI service, no network. Every answer names the weeks or months used, whether
   they are actual or planned, and the workbook rows behind them. */
(function (root) {
  "use strict";
  function create(T, opt) {
    opt = opt || {};
    const L = T.lakh, I = T.inr;
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const MONTHS = {};
    T.MON_LONG.forEach((n, i) => { MONTHS[n.toLowerCase()] = i + 1; MONTHS[n.slice(0, 3).toLowerCase()] = i + 1; });
    MONTHS.sept = 9;
    const M = T.M, W = T.W, LA = T.lastActual;
    const curFY = () => { const k = LA.key; const y = +k.slice(5) >= 4 ? +k.slice(0, 4) : +k.slice(0, 4) - 1; return y; };
    const fyName = (y) => `FY${String(y).slice(2)}-${String(y + 1).slice(2)}`;
    const fyMonths = (y) => M.filter((m) => m.key >= y + "-04" && m.key <= (y + 1) + "-03");
    const mStatus = (m) => (m.actual ? "actual" : m.weeks.some((i) => W[i].actual) ? "actual to " + LA.short + ", planned after" : "planned");
    const wStatus = (w) => (w.actual ? "actual" : "planned");
    const list = (a) => (a.length <= 1 ? a[0] || "" : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

    /* ---------- parsing ---------- */
    function norm(q) { return " " + q.toLowerCase().replace(/[’']/g, "'").replace(/₹/g, " rs ").replace(/[^a-z0-9&.\-' ]+/g, " ").replace(/\s+/g, " ") + " "; }
    const has = (q, ...w) => w.some((x) => q.includes(x));
    function findMonths(q) {
      const out = [], re = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[\s\-']*(20\d\d|\d\d)?(?![\d])/g;
      let m;
      while ((m = re.exec(q))) {
        const mi = MONTHS[m[1]] || MONTHS[m[1].slice(0, 3)];
        if (!mi) continue;
        if (m[1] === "may" && /\b(may i|may be|maybe)\b/.test(q)) continue;
        let cand = M.filter((x) => +x.key.slice(5) === mi);
        if (m[2]) { const y = m[2].length === 2 ? "20" + m[2] : m[2]; cand = cand.filter((x) => x.key.startsWith(y)); }
        else cand = cand.filter((x) => x.key <= M[M.length - 1].key);
        const pick = cand[cand.length - 1];
        if (pick && !out.includes(pick)) out.push(pick);
      }
      if (/\bthis month\b/.test(q)) out.push(M.find((x) => x.key === LA.key));
      if (/\b(last|previous) month\b/.test(q)) out.push(T.lastFullMonth);
      return [...new Set(out.filter(Boolean))].sort((a, b) => a.i - b.i);
    }
    function findFY(q) {
      let m = /\bfy\s*'?(?:20)?(\d\d)\s*[-\/]?\s*(?:20)?(\d\d)?\b/.exec(q) || /\b20(\d\d)\s*-\s*(?:20)?(\d\d)\b/.exec(q);
      if (m) { const a = +m[1], b = m[2] ? +m[2] : null; const y = 2000 + (b != null && b === a + 1 ? a : b == null ? a - 1 : a); const ms = fyMonths(y); if (ms.length) return { name: fyName(y) + (ms[ms.length - 1].key < (y + 1) + "-03" ? " to date" : ""), months: ms }; }
      if (/\b(this|current) (financial |fiscal )?year\b|\bytd\b|\byear to date\b|\bso far this year\b/.test(q)) return { name: fyName(curFY()) + " to date", months: fyMonths(curFY()) };
      if (/\b(last|previous) (financial |fiscal )?year\b/.test(q)) return { name: fyName(curFY() - 1), months: fyMonths(curFY() - 1) };
      if (/\b(all time|overall|since the start|in total|ever)\b/.test(q)) return { name: "all months in the workbook", months: M };
      return null;
    }
    function findWeek(q) {
      if (/\b(next week|coming week|upcoming week)\b/.test(q)) return T.plannedW[0] || null;
      if (/\b(this week|latest week|last week|current week|latest|right now|today|currently|now)\b/.test(q)) return LA;
      const m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(20\d\d|\d\d)?\b/.exec(q);
      if (m) {
        const mi = MONTHS[m[2]]; let cand = W.filter((w) => +w.end.slice(5, 7) === mi && +w.start.slice(8) <= +m[1] && +w.end.slice(8) >= +m[1]);
        if (m[3]) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; cand = cand.filter((w) => w.end.startsWith(y)); }
        return cand[cand.length - 1] || null;
      }
      return null;
    }
    const PROPS = { "thrive one": "Thrive One", " one ": "Thrive One", rosa: "Thrive Rosa", zero: "Thrive Zero", dlf: "Thrive DLF", "hidden house": "Thrive Hidden House", " hh ": "Thrive Hidden House" };
    function findProp(q) { for (const k in PROPS) if (q.includes(k)) return PROPS[k]; return null; }
    function findHead(q) { // a specific workbook head by name, longest match first
      const hs = T.HEADS.map((h) => ({ h, n: h.name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim() })).filter((x) => x.n.length > 3);
      const alias = { gst: "GST", tds: "TDS", electricity: "Electricity", water: "Water Tankers", internet: "Internet", salary: "Salaries", salaries: "Salaries", emi: "EMI", interest: "Interest Paid", "credit card": "Credit card repayment", deposit: "Deposit", housekeeping: "Housekeeping", repair: "Repair", furniture: "Furniture", gas: "Gas Bill", consultant: "Consultant" };
      let best = null;
      hs.forEach((x) => { if (q.includes(" " + x.n + " ") || q.includes(" " + x.n)) { if (!best || x.n.length > best.n.length) best = x; } });
      if (best) return best.h;
      const wantIn = /\b(receipts?|received|collected|income|came in)\b/.test(q);
      for (const k in alias) if (new RegExp("\\b" + k).test(q)) { const ms = T.HEADS.filter((h) => h.name.toLowerCase().includes(alias[k].toLowerCase())); const h = ms.find((h) => h.dir === (wantIn ? "in" : "out")) || ms[0]; if (h) return h; }
      return null;
    }
    function findGroup(q) {
      if (/\b(landlord rent|rent paid|rent to landlord)/.test(q)) return "rent";
      if (/\b(statutory|tax|taxes|compliance)\b/.test(q)) return "stat";
      if (/\b(salar|staff|payroll|professional fee)/.test(q)) return "sal";
      if (/\b(finance cost|loan|emis?|interest|borrowing)\b/.test(q)) return "fin";
      if (/\b(renovation|repairs?|maintenance|housekeeping)\b/.test(q)) return "reno";
      if (/\b(utilit|running cost|electricity|water|power)/.test(q)) return "util";
      if (/\bkakatiya\b/.test(q)) return "proj";
      return null;
    }

    /* ---------- answer pieces ---------- */
    function ans(o) { return o; }
    const table = (head, rows, numCols) => `<table class="data"><thead><tr>${head.map((h, i) => `<th class="${numCols.includes(i) ? "num" : ""}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${numCols.includes(i) ? "num" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const bars = (rows) => { const mx = Math.max(1, ...rows.map((r) => Math.abs(r.v))); return `<div class="minibars">${rows.map((r) => `<div><span>${esc(r.name)}</span><i class="${r.cls || ""}" style="width:${(Math.abs(r.v) / mx * 100).toFixed(1)}%"></i><b>${esc(L(r.v))}</b></div>`).join("")}</div>`; };
    const meta = (txt) => `<p class="meta">${esc(txt)}</p>`;
    const follow = (qs) => `<div class="ask-sugg" style="margin-top:10px">${qs.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>`;
    const span = (ms) => (ms.length === 1 ? ms[0].long : `${ms[0].label} to ${ms[ms.length - 1].label}`);
    const statusOf = (ms) => { const p = ms.filter((m) => !m.actual); return p.length ? `Actual to ${LA.long}; ${list(p.map((m) => m.label))} include${p.length === 1 ? "s" : ""} planned weeks.` : "All actual."; };

    /* ---------- intents ---------- */
    function closing(q) {
      const w = findWeek(q), ms = findMonths(q);
      if (ms.length && !findWeek(q.replace(/\b(this|latest|last|current) week\b/, ""))) {
        const rows = ms.map((m) => [esc(m.long), `<b class="${m.close < 0 ? "neg" : ""}">${esc(L(m.close))}</b>`, esc(I(m.close)), esc(mStatus(m))]);
        const m = ms[ms.length - 1];
        return ans({ html: `<p>${ms.length === 1 ? `The bank account closed ${esc(m.long)} at <b>${esc(L(m.close))}</b> (${esc(I(m.close))})${m.close < 0 ? ", overdrawn" : ""}.` : "Month-end closing balances:"}</p>${table(["Month", "Closing", "Exact", "Status"], rows, [1, 2])}${meta("Cash Flow sheet, row 92 (Closing Balance), month Total column. " + statusOf(ms))}` });
      }
      const wk = w || LA;
      return ans({ html: `<p>In the week of ${esc(wk.long)} the bank account closed at <b>${esc(L(wk.close))}</b> (${esc(I(wk.close))})${wk.close < 0 ? ", overdrawn" : ""}. That figure is <b>${wStatus(wk)}</b>.</p>${table(["", "Amount"], [["Opening", esc(I(wk.open))], ["Money in", esc(I(wk.inflow))], ["Money out", esc(I(wk.outflow))], ["Razorpay movement", esc(I(wk.close - wk.open - (wk.inflow - wk.outflow)))], ["<b>Closing</b>", `<b>${esc(I(wk.close))}</b>`]], [1])}${meta("Cash Flow sheet rows 6, 10, 25, 91 and 92, week column " + wk.label + ".")}`,
        });
    }
    function flowsAns(q, kind) {
      const w = findWeek(q), ms = findMonths(q), fy = findFY(q);
      if (w && !ms.length && !fy) {
        const v = kind === "in" ? w.inflow : kind === "out" ? w.outflow : w.inflow - w.outflow;
        const tops = T.topHeads(w.v, kind === "out" ? "out" : "in", 6);
        return ans({ html: `<p>${kind === "in" ? "Money in" : kind === "out" ? "Money out" : "Net cash flow"} in the week of ${esc(w.long)}: <b>${esc(L(v))}</b> (${esc(I(v))}), ${wStatus(w)}.</p>${kind !== "net" ? bars(tops.map((t) => ({ name: t.name, v: t.v, cls: kind }))) : ""}${meta("Cash Flow sheet, row " + (kind === "out" ? "25" : "10") + ", week " + w.label + ".")}` });
      }
      const sel = ms.length ? ms : fy ? fy.months : T.months(M.find((m) => m.key >= curFY() + "-04").key, M[M.length - 1].key, true);
      const name = ms.length ? span(ms) : fy ? fy.name : fyName(curFY()) + " to date";
      const t = T.totals(sel);
      const rows = sel.map((m) => [esc(m.label), esc(T.lakhNum(m.inflow)), esc(T.lakhNum(m.outflow)), `<span class="${m.inflow - m.outflow < 0 ? "neg" : "pos"}">${esc(T.lakhNum(m.inflow - m.outflow))}</span>`]);
      const head = kind === "in" ? `Money in, ${esc(name)}: <b>${esc(L(t.in))}</b> (${esc(I(t.in))}).` : kind === "out" ? `Money out, ${esc(name)}: <b>${esc(L(t.out))}</b> (${esc(I(t.out))}).` : `Net cash flow, ${esc(name)}: <b class="${t.net < 0 ? "neg" : "pos"}">${esc(L(t.net))}</b>: ${esc(L(t.in))} in, ${esc(L(t.out))} out.`;
      const tops = kind === "net" ? "" : bars(T.topHeads(t.v, kind, 6).map((x) => ({ name: x.name, v: x.v, cls: kind })));
      return ans({ html: `<p>${head}</p>${tops}${sel.length > 1 ? table(["Month", "In (₹ L)", "Out (₹ L)", "Net (₹ L)"], rows, [1, 2, 3]) : ""}${meta("Cash Flow sheet rows 10 and 25, month Total columns. " + statusOf(sel))}` });
    }
    function rentCover(q) {
      const ms = findMonths(q), fy = findFY(q);
      const sel = ms.length ? ms : fy ? fy.months : fyMonths(curFY());
      const name = ms.length ? span(ms) : fy ? fy.name : fyName(curFY()) + " to date";
      const t = T.totals(sel), c = T.cover(t.v);
      const rows = sel.map((m) => { const cc = T.cover(m.v); return [esc(m.label), esc(T.lakhNum(m.v.r11 || 0)), esc(T.lakhNum(m.v.r26 || 0)), cc == null ? "–" : `<span class="${cc >= 1 ? "pos" : "neg"}">${cc.toFixed(2)}×</span>`]; });
      return ans({ html: `<p>${esc(name)}: tenants paid <b>${esc(L(t.v.r11 || 0))}</b> in rent and Thrive paid landlords <b>${esc(L(t.v.r26 || 0))}</b>, so rent collected covers rent paid <b>${c == null ? "–" : c.toFixed(2) + " times"}</b>.</p>${table(["Month", "Collected (₹ L)", "Paid (₹ L)", "Cover"], rows, [1, 2, 3])}${meta("Cash Flow sheet row 11 (Rent, income) and row 26 (Rent payment to landlords). " + statusOf(sel))}`, });
    }
    function landlordAns(q) {
      const ll = T.landlords(), p = findProp(q);
      if (p) {
        const pr = ll.props.find((x) => x.name === p);
        if (pr) return ans({ html: `<p>${esc(pr.name)} has ${pr.rows.length} landlord${pr.rows.length > 1 ? "s" : ""} with a monthly commitment of <b>${esc(L(pr.commit))}</b> (${esc(I(pr.commit))}). Paid in ${esc(T.monthLong(ll.month))}: ${esc(I(pr.v))}.</p>${table(["Landlord", "Monthly rent", "Paid " + T.monthLabel(ll.month)], pr.rows.map((r) => [esc(r.name), esc(I(r.commit)), esc(I(r.v))]), [1, 2])}${meta("Landlord Rent Payments sheet. Monthly rent is each landlord's latest regular payment to " + T.monthLong(ll.month) + ".")}` });
      }
      return ans({ html: `<p>Landlord rent commitment is <b>${esc(L(ll.commit))} a month</b> across ${ll.props.length} properties. In ${esc(T.monthLong(ll.month))} Thrive paid ${esc(L(ll.total))}.</p>${bars(ll.props.map((x) => ({ name: x.name, v: x.commit })))}${table(["Property", "Landlords", "Monthly rent", "Paid " + T.monthLabel(ll.month)], ll.props.map((x) => [esc(x.name), x.rows.length, esc(I(x.commit)), esc(I(x.v))]), [1, 2, 3])}${meta("Landlord Rent Payments sheet. Monthly rent is each landlord's latest regular payment to " + T.monthLong(ll.month) + ".")}`,
        });
    }
    function loansInAns(q) { // loans received: the inflow heads named "loan" (Company loan, Director Loan)
      const ms = findMonths(q), fy = findFY(q);
      const sel = ms.length ? ms : fy ? fy.months : fyMonths(curFY());
      const name = ms.length ? span(ms) : fy ? fy.name : fyName(curFY()) + " to date";
      const hs = T.HEADS.filter((h) => h.dir === "in" && /loan/i.test(h.name));
      const t = T.totals(sel), rows = hs.map((h) => ({ h, v: t.v[h.id] || 0 })), tot = rows.reduce((a, r) => a + r.v, 0);
      return ans({ html: `<p>Loans received, ${esc(name)}: <b>${esc(L(tot))}</b> (${esc(I(tot))}).</p>${table(["Line", "Amount"], rows.map((r) => [esc(r.h.name), esc(I(r.v))]), [1])}${sel.length > 1 ? bars(sel.map((m) => ({ name: m.label, v: hs.reduce((a, h) => a + (m.v[h.id] || 0), 0), cls: "in" }))) : ""}${meta("Cash Flow sheet rows " + hs.map((h) => h.row).join(" and ") + " (money in), month Total columns. " + statusOf(sel) + " Loan repayments and interest are under Finance cost.")}` });
    }
    function spendAns(q) {
      const ms = findMonths(q), fy = findFY(q), w = findWeek(q);
      const sel = ms.length ? ms : fy ? fy.months : fyMonths(curFY());
      const name = ms.length ? span(ms) : fy ? fy.name : fyName(curFY()) + " to date";
      const g = findGroup(q), h = findHead(q);
      if (h && !/\bcategor/.test(q)) {
        if (w && !ms.length) { const v = w.v[h.id] || 0; return ans({ html: `<p>${esc(h.name)} in the week of ${esc(w.long)}: <b>${esc(I(v))}</b>, ${wStatus(w)}.</p>${meta("Cash Flow sheet row " + h.row + ".")}` }); }
        const t = T.totals(sel), v = t.v[h.id] || 0;
        return ans({ html: `<p>${esc(h.name)}, ${esc(name)}: <b>${esc(L(v))}</b> (${esc(I(v))}).</p>${sel.length > 1 ? bars(sel.map((m) => ({ name: m.label, v: m.v[h.id] || 0, cls: "out" }))) : ""}${meta("Cash Flow sheet row " + h.row + " (" + h.name + "), month Total columns. " + statusOf(sel))}` });
      }
      const t = T.totals(sel), sp = T.spend(t.v);
      if (g && !/\bcategor|\bbreak/.test(q)) {
        const G = T.SP[g], v = T.gsum(t.v, g), heads = G.rows.map((r) => ({ name: (T.H["r" + r] || {}).name, v: t.v["r" + r] || 0 })).filter((x) => x.v);
        return ans({ html: `<p>${esc(G.name)}, ${esc(name)}: <b>${esc(L(v))}</b> (${esc(I(v))}), ${Math.round(v / (t.out || 1) * 100)}% of money out.</p>${bars(heads.sort((a, b) => b.v - a.v).map((x) => ({ name: x.name, v: x.v, cls: "out" })))}${meta("Cash Flow sheet rows " + G.rows[0] + "–" + G.rows[G.rows.length - 1] + ". " + statusOf(sel))}` });
      }
      return ans({ html: `<p>Spend by category, ${esc(name)}: <b>${esc(L(t.out))}</b> out in total.</p>${bars(sp.map((x) => ({ name: x.name, v: x.v })))}${table(["Category", "Amount", "Share"], sp.map((x) => [esc(x.name), esc(I(x.v)), Math.round(x.v / (t.out || 1) * 100) + "%"]), [1, 2])}${meta("Cash Flow sheet outflow rows 26–89 grouped into categories. " + statusOf(sel))}`, });
    }
    function overdrawnAns(q) {
      const min = opt.getMin ? opt.getMin() : 0, fy = findFY(q), ms = findMonths(q);
      const sel = ms.length ? W.filter((w) => ms.some((m) => m.key === w.key)) : fy ? W.filter((w) => fy.months.some((m) => m.key === w.key)) : W.filter((w) => w.key >= curFY() + "-04");
      const name = ms.length ? span(ms) : fy ? fy.name : fyName(curFY()) + " to date";
      const od = sel.filter((w) => w.close < min), act = od.filter((w) => w.actual), pl = od.filter((w) => !w.actual);
      let k = 0; for (let i = T.actualW.length - 1; i >= 0 && T.actualW[i].close < min; i--) k++;
      const worst = od.reduce((a, b) => (!a || b.close < a.close ? b : a), null);
      return ans({ html: `<p>${esc(name)}: <b>${act.length} of ${sel.filter((w) => w.actual).length} actual weeks</b> closed ${min ? "below " + esc(L(min)) : "overdrawn"}${pl.length ? `, plus ${pl.length} of ${sel.filter((w) => !w.actual).length} planned weeks` : ""}. ${k ? `The account has been ${min ? "below it" : "overdrawn"} for the last ${k} actual week${k > 1 ? "s" : ""} in a row.` : ""}${worst ? ` Lowest: ${esc(L(worst.close))} in the week of ${esc(worst.long)} (${wStatus(worst)}).` : ""}</p>${od.length ? table(["Week", "Closing", "Status"], od.slice(-12).map((w) => [esc(w.long), `<span class="neg">${esc(L(w.close))}</span>`, wStatus(w)]), [1]) + (od.length > 12 ? meta(`Showing the latest 12 of ${od.length}.`) : "") : ""}${meta("Cash Flow sheet row 92, weekly columns. Weeks ending on or before " + LA.long + " are actual.")}` });
    }
    function upcomingAns(q) {
      const u = T.upcoming(); if (!u.rows.length) return ans({ html: "<p>There are no planned weeks in this workbook.</p>" });
      const w = /\bnext week\b/.test(q) ? T.plannedW[0] : null;
      const rows = (w ? u.rows.filter((r) => r.week === w) : u.rows).slice().sort((a, b) => a.week.i - b.week.i || b.v - a.v);
      const tot = rows.reduce((a, r) => a + r.v, 0);
      return ans({ html: `<p>${w ? `In the week of ${esc(w.long)}` : `From ${esc(T.plannedW[0].long)} to ${esc(T.plannedW[T.plannedW.length - 1].long)}`}, <b>${esc(L(tot))}</b> of payments are planned${w ? "" : `, against ${esc(L(u.inflow))} planned in`}. The largest is ${esc(rows.reduce((a, b) => (b.v > a.v ? b : a)).name)}.</p>${table(["Week", "Payment", "Amount"], rows.slice(0, 15).map((r) => [esc(r.week.short), esc(r.name), esc(I(r.v))]), [2])}${rows.length > 15 ? meta(`Largest 15 of ${rows.length} shown, ordered by week.`) : ""}${meta("Planned weeks of the Cash Flow sheet (after " + LA.long + "). These are plans, not payments made.")}` });
    }
    function balancesAns() {
      const b = T.balances;
      return ans({ html: `<p>At the end of the week of ${esc(b.week.long)} (actual): ICICI bank (cash book) <b>${esc(L(b.bank))}</b>, Razorpay <b>${esc(L(b.rzp))}</b>, together <b>${esc(L(b.combined))}</b>.</p>${table(["Account", "Balance"], [["ICICI bank (cash book)", esc(I(b.bank))], ["Razorpay", esc(I(b.rzp))], ["<b>Together</b>", `<b>${esc(I(b.combined))}</b>`]], [1])}${meta("Cash Flow sheet rows 92 (Closing Balance), 96 (Razorpay Closing Balance) and 94 (Net Balance).")}` });
    }
    function openingAns(q) {
      const ms = findMonths(q), w = findWeek(q);
      if (ms.length) { const m = ms[0]; return ans({ html: `<p>${esc(m.long)} opened at <b>${esc(L(m.open))}</b> (${esc(I(m.open))}).</p>${meta("Cash Flow sheet row 6 (Opening Balance), month Total column.")}` }); }
      const wk = w || LA; return ans({ html: `<p>The week of ${esc(wk.long)} opened at <b>${esc(L(wk.open))}</b> (${esc(I(wk.open))}), ${wStatus(wk)}.</p>${meta("Cash Flow sheet row 6, week " + wk.label + ".")}` });
    }
    function verdictAns() {
      const v = T.verdict(opt.getMin ? opt.getMin() : 0), w = T.watch(opt.getMin ? opt.getMin() : 0);
      return ans({ html: `<p><b>${esc(v.text)}</b></p><ul style="margin:8px 0 0 18px">${w.map((x) => `<li><b>${esc(x.title)}.</b> ${esc(x.text)}</li>`).join("")}</ul>${meta("Latest actual week " + LA.long + "; planned weeks after it.")}` });
    }
    function biggestAns(q) {
      const fy = findFY(q), sel = fy ? fy.months : fyMonths(curFY()), name = fy ? fy.name : fyName(curFY()) + " to date";
      if (/\bmonth\b/.test(q)) { const m = sel.reduce((a, b) => (b.outflow > a.outflow ? b : a)); return ans({ html: `<p>The biggest month for money out in ${esc(name)} was <b>${esc(m.long)}</b>: ${esc(L(m.outflow))} out against ${esc(L(m.inflow))} in (${esc(mStatus(m))}).</p>${bars(sel.map((x) => ({ name: x.label, v: x.outflow, cls: "out" })))}${meta("Cash Flow sheet row 25, month Total columns.")}` }); }
      const t = T.totals(sel), top = T.topHeads(t.v, "out", 8);
      return ans({ html: `<p>The largest payment head in ${esc(name)} was <b>${esc(top[0].name)}</b> at ${esc(L(top[0].v))}.</p>${bars(top.map((x) => ({ name: x.name, v: x.v, cls: "out" })))}${meta("Cash Flow sheet outflow rows. " + statusOf(sel))}` });
    }
    function compareAns(q) {
      const ms = findMonths(q); if (ms.length < 2) return null;
      const a = ms[0], b = ms[ms.length - 1];
      const row = (n, x, y) => [n, esc(L(x)), esc(L(y)), `<span class="${y - x >= 0 ? "pos" : "neg"}">${esc((y - x >= 0 ? "+" : "") + L(y - x))}</span>`];
      return ans({ html: `<p>${esc(a.long)} against ${esc(b.long)}:</p>${table(["", a.label, b.label, "Change"], [row("Money in", a.inflow, b.inflow), row("Money out", a.outflow, b.outflow), row("Net", a.inflow - a.outflow, b.inflow - b.outflow), row("Closing balance", a.close, b.close), row("Rent collected", a.v.r11 || 0, b.v.r11 || 0), row("Landlord rent paid", a.v.r26 || 0, b.v.r26 || 0)], [1, 2, 3])}${meta("Cash Flow sheet, month Total columns. " + statusOf([a, b]))}` });
    }

    const SUGG = ["What is the closing balance this week?", "How much money came in during October?", "Money out this financial year", "Rent collected vs rent paid this year", "Landlord rent by property", "Spend by category this year", "How many weeks were we overdrawn this year?", "What payments are coming up?", "Cash book vs Razorpay balance", "Compare September and October", "How much did we spend on salaries in October?", "Will we go overdrawn?"];
    function closest(q) {
      const words = q.split(" ").filter((w) => w.length > 3);
      return SUGG.map((s) => ({ s, k: words.filter((w) => s.toLowerCase().includes(w)).length })).sort((a, b) => b.k - a.k).slice(0, 3).map((x) => x.s);
    }
    function answer(raw) {
      const q = norm(raw);
      try {
        if (has(q, "compare", " vs ", "versus", "against") && findMonths(q).length >= 2 && !has(q, "rent collected", "rent paid")) { const c = compareAns(q); if (c) return c; }
        if (has(q, "razorpay", "cash book", "cashbook", "both accounts", "icici")) return balancesAns();
        if (has(q, "rent collected", "rent cover", "collected vs", "cover rent", "rent paid vs", "collection vs", "covers rent", "rent coverage")) return rentCover(q);
        if (has(q, "landlord", "property", "properties", "lease") || (findProp(q) && has(q, "rent"))) return landlordAns(q);
        if (has(q, "overdrawn", "overdraft", "negative", "below zero", "in the red")) {
          if (has(q, "will ", "going to", "when ", "forecast", "next")) return verdictAns();
          return overdrawnAns(q);
        }
        if (has(q, "upcoming", "coming up", "due", "planned payment", "payments next", "to pay", "next week")) return upcomingAns(q);
        if (has(q, "opening")) return openingAns(q);
        if (has(q, "closing", "balance", "cash position", "how much cash", "bank balance")) return closing(q);
        if (has(q, "biggest", "largest", "highest", "most expensive", "top payment", "top expense")) return biggestAns(q);
        if (/\bloans?\b/.test(q) && has(q, "receiv", " got", "took", "taken", "came in", "inflow", "raised", "borrow", "brought in", "infus")) return loansInAns(q);
        if (has(q, "category", "categories", "breakdown", "break down", "split") || findGroup(q) || findHead(q) || has(q, " spend", " spent", "expense", "cost")) {
          if (has(q, "money in", "inflow", "received", "income") && !findGroup(q)) return flowsAns(q, "in");
          return spendAns(q);
        }
        if (has(q, "net cash", " net ", "surplus", "deficit", "burn")) return flowsAns(q, "net");
        if (has(q, "money in", "inflow", "came in", "receipts", "received", "collections", "income", "revenue", "rent collected")) return flowsAns(q, "in");
        if (has(q, "money out", "outflow", "went out", "payments", "paid out", "spend")) return flowsAns(q, "out");
        if (has(q, "how are we", "summary", "verdict", "status", "position", "doing", "health", "will we", "outlook")) return verdictAns();
      } catch (e) { /* fall through to the help answer */ }
      return ans({ html: `<p>Sorry, I didn't understand that one. I can answer questions about closing balances, money in and out, rent collected vs rent paid, landlord rent by property, spend by category, overdrawn weeks, upcoming payments and the cash book vs Razorpay balances, for any week, month or financial year in the file.</p><p>These are the closest questions I can answer:</p>${follow(closest(q))}` , unknown: true });
    }
    return { answer, suggestions: () => SUGG.slice(0, 8), all: SUGG };
  }
  root.ThriveAsk = { create };
  if (typeof module !== "undefined") module.exports = { create };
})(typeof window !== "undefined" ? window : globalThis);
