/* Thrive · "New property" page. All maths lives in property.js (calc); this file only reads inputs and draws results. */
(function (root) {
  "use strict";
  const P = root.ThriveProperty;
  const KEY = "thrive.newprop";

  function init(ctx) {
    const { T, C, esc, L, I, stamp, toast } = ctx;
    const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => [...(el || document).querySelectorAll(s)];
    const MON = T.MON;
    const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } } };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const nextMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
    let st = Object.assign(clone(P.EXAMPLE), { start: nextMonth() }, store.get() || {});

    /* ---------- reference figures from Thrive's own books (last six fully actual months) ---------- */
    const ref = (() => {
      const ms = T.M.filter((m) => m.actual).slice(-6), ll = T.landlords(T.landlordMonth()), n = Math.max(1, ll.props.length);
      // exact Cash Flow rows: 26 landlord rent, 71 GST RCM, 74 salaries, 31/34/37/42 utilities, 45/47/48/57/58/61 repairs & housekeeping
      const rows = (ids) => ms.reduce((a, m) => a + ids.reduce((b, r) => b + (m.v["r" + r] || 0), 0), 0);
      const per = (ids) => rows(ids) / Math.max(1, ms.length) / n;
      const rent = rows([26]), gst = rows([71]);
      const span = ms.length ? T.monthLabel(ms[0].key) + " to " + T.monthLabel(ms[ms.length - 1].key) : "";
      return { span, props: n, commit: ll.commit, llAvg: ll.commit / n, gstPct: rent ? gst / rent * 100 : null,
        staff: per([74]), util: per([31, 34, 37, 42]), reno: per([45, 47, 48, 57, 58, 61]) };
    })();

    /* ---------- the form ---------- */
    const fmtNum = (v) => (v === "" || v == null ? "" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
    const parse = (s) => { const n = Number(String(s).replace(/[,\s₹]/g, "")); return isFinite(n) && n >= 0 ? n : 0; };
    const money = (path, label, hint) => field(path, label, hint, "₹");
    function field(path, label, hint, unit) {
      const id = "np-" + path.replace(/\./g, "-");
      return `<label class="np-f" for="${id}"><span class="np-l">${esc(label)}</span><span class="np-in">${unit === "₹" ? '<i aria-hidden="true">₹</i>' : ""}<input id="${id}" data-p="${path}" inputmode="decimal" autocomplete="off" value="${esc(fmtNum(get(path)))}">${unit && unit !== "₹" ? `<i aria-hidden="true">${esc(unit)}</i>` : ""}</span>${hint ? `<small>${hint}</small>` : ""}</label>`;
    }
    function get(path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), st); }
    function set(path, v) { const ks = path.split("."); let o = st; ks.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {})); o[ks[ks.length - 1]] = v; }
    const totalSpan = (id) => `<p class="np-tot">Total <b id="${id}"></b></p>`;
    const sec = (title, sub, body, open) => `<details class="np-sec"${open ? " open" : ""}><summary><span>${esc(title)}</span><small>${esc(sub)}</small></summary><div class="np-body">${body}</div></details>`;

    function formHTML() {
      const rooms = `<table class="np-rooms"><thead><tr><th>Room type</th><th class="num">Rooms</th><th class="num">Beds</th><th class="num">Rent per bed / month</th></tr></thead><tbody>${P.ROOM_TYPES.map((t) => `<tr><th scope="row">${esc(t.name)}<small>${t.beds} bed${t.beds > 1 ? "s" : ""} a room</small></th>
        <td><input aria-label="${esc(t.name)}: number of rooms" data-p="rooms.${t.id}.rooms" inputmode="numeric" value="${esc(fmtNum(get("rooms." + t.id + ".rooms")))}"></td>
        <td class="num" id="np-beds-${t.id}"></td>
        <td><span class="np-in"><i aria-hidden="true">₹</i><input aria-label="${esc(t.name)}: rent per bed per month" data-p="rooms.${t.id}.rent" inputmode="decimal" value="${esc(fmtNum(get("rooms." + t.id + ".rent")))}"></span></td></tr>`).join("")}</tbody>
        <tfoot><tr><th>Total</th><td class="num" id="np-roomsTot"></td><td class="num" id="np-bedsTot"></td><td class="num" id="np-avgRent"></td></tr></tfoot></table>`;
      return `<label class="np-f np-name" for="np-name"><span class="np-l">Property name</span><input id="np-name" data-p="name" data-text="1" value="${esc(st.name)}" maxlength="60"></label>
        <label class="np-f" for="np-start"><span class="np-l">Lease starts</span><input id="np-start" type="month" data-p="start" data-text="1" value="${esc(st.start)}"></label>
        ${sec("1. Rooms and rent", "What the property has and what residents pay", rooms + `<small class="np-note">Rent per bed, per month, without GST. Average rent assumes residents spread across room types in the same mix as the beds.</small>`, true)}
        ${sec("2. Residents", "How many move in and how fast", [
          field("residents", "Residents expected when full", 'Occupancy <b id="np-occ"></b>. Capped at the number of beds.', "people"),
          field("fillMonths", "Months to fill up after opening", "Residents move in evenly over these months. 0 = full from the first month.", "months"),
          field("stay", "Average stay of a resident", "Used for move-outs, deposit refunds, joining fees and brokerage. Leavers are replaced the same month.", "months"),
          field("collection", "Rent actually collected", "100% if every resident pays in full and on time.", "%"),
        ].join(""), true)}
        ${sec("3. Money from residents", "Deposits and other charges", [
          money("deposit", "Security deposit per resident", "Refundable: counted as cash held, never as profit."),
          money("joining", "Joining / onboarding fee per new resident", "One-time, not refundable."),
          money("otherIncome", "Other income per resident a month", "e.g. food, electricity or laundry charged separately."),
          money("marketing", "Brokerage / marketing per new resident", "A cost, paid each time a resident moves in."),
        ].join(""), false)}
        ${sec("4. Landlord", "Lease terms", [
          money("llRent", "Rent to landlord a month", `Thrive's ${ref.props} properties average ${esc(L(ref.llAvg))} a month today.`),
          money("llDeposit", "Security deposit to landlord", "Paid in month 1. Refundable at the end, so shown separately."),
          field("rentFree", "Rent-free months at the start", "Counted from the lease start.", "months"),
          field("fitout", "Months of work before residents move in", "Staff and running costs start when residents can move in.", "months"),
          field("llIncrease", "Landlord rent increase every 12 months", "", "%"),
          field("gstRcm", "GST RCM on landlord rent", ref.gstPct == null ? "" : `In Thrive's books GST RCM was ${ref.gstPct.toFixed(1)}% of landlord rent, ${esc(ref.span)}.`, "%"),
        ].join(""), false)}
        ${sec("5. Setup costs (one time)", "Spent in the first month", P.SETUP.map(([k, l]) => money("setup." + k, l)).join("") + totalSpan("np-setupTot"), false)}
        ${sec("6. Monthly running costs", "Paid every month once residents can move in", P.FIXED.map(([k, l]) => money("fixed." + k, l)).join("") + totalSpan("np-fixedTot") +
          `<small class="np-note">For reference, Thrive's whole-company spend a month, ${esc(ref.span)}, divided by its ${ref.props} properties: salaries ${esc(L(ref.staff))}; electricity, water, gas & internet ${esc(L(ref.util))}; repairs & housekeeping ${esc(L(ref.reno))}.</small>`, false)}
        ${sec("7. Costs per resident a month", "Grow with the number of residents", P.PER_RES.map(([k, l]) => money("perRes." + k, l)).join("") + totalSpan("np-perResTot"), false)}
        ${sec("8. Yearly increases and period", "", [
          field("rentIncrease", "Resident rent increase every 12 months", "", "%"),
          field("costIncrease", "Running cost increase every 12 months", "", "%"),
          field("months", "Period to analyse", "12 to 120 months; usually the lease or lock-in period.", "months"),
          field("paybackTarget", "Money back within", "Your target for getting setup money back.", "months"),
        ].join(""), false)}
        <div class="np-actions"><button type="button" class="btn" id="npExample">Load example</button><button type="button" class="btn" id="npClear">Clear all</button><button type="button" class="btn" id="npCsv">Download months (CSV)</button></div>`;
    }

    /* ---------- results ---------- */
    const pct = (x, d) => (x == null ? "–" : (x * 100).toFixed(d == null ? 0 : d) + "%");
    const monthName = (m) => { if (!st.start || !/^\d{4}-\d{2}$/.test(st.start)) return "Month " + m; const y = +st.start.slice(0, 4), mo = +st.start.slice(5) - 1 + (m - 1); return MON[mo % 12] + "'" + String(y + Math.floor(mo / 12)).slice(2); };
    const neg = (v) => (v < -0.5 ? "neg" : "");
    const VERDICT = { yes: ["ac", "Feasible"], marginal: ["mx", "Marginal"], no: ["od", "Not feasible"], incomplete: ["pl", "Fill in rooms and residents"] };

    function draw() {
      const r = P.calc(st), c = r.c;
      // form echoes
      P.ROOM_TYPES.forEach((t) => ($("#np-beds-" + t.id).textContent = c.rooms[t.id].beds || "–"));
      $("#np-roomsTot").textContent = P.ROOM_TYPES.reduce((a, t) => a + c.rooms[t.id].rooms, 0);
      $("#np-bedsTot").textContent = c.beds;
      $("#np-avgRent").innerHTML = c.beds ? "avg " + esc(I(c.avgRent)) : "–";
      $("#np-occ").textContent = c.beds ? pct(r.occ, 1) + (c.residentsAsked > c.beds ? ` (only ${c.beds} beds)` : "") : "–";
      $("#np-setupTot").textContent = I(c.setup); $("#np-fixedTot").textContent = I(c.fixed) + " a month"; $("#np-perResTot").textContent = I(c.perRes) + " per resident a month";

      // verdict line
      const v = VERDICT[r.verdict];
      const name = c.name || "This property";
      let line;
      if (r.verdict === "incomplete") line = "Enter the rooms, their rent and the residents you expect to see if the property works.";
      else if (r.verdict === "no") line = r.s.profit <= 0 ? `${name} loses ${L(-r.s.profit)} in a full month, so it does not work at these numbers.` : `${name} makes ${L(r.s.profit)} in a full month, but the setup money is not back within ${c.months} months.`;
      else line = `${name} makes ${L(r.s.profit)} in a full month and pays back its setup in month ${r.payback} (${monthName(r.payback)}).`;
      $("#npVerdict").textContent = line;
      $("#npBadge").innerHTML = stamp(v[0], v[1]);

      // checks
      const cushionTxt = r.beOcc == null ? "Each extra resident loses money." : `Break-even at ${r.beRes.toFixed(1)} residents (${pct(r.beOcc, 1)} occupancy); you expect ${pct(r.occ, 1)}.`;
      const det = { profit: r.verdict === "incomplete" ? "" : `${L(r.s.income)} in, ${L(r.s.costs)} out in a full month.`, cushion: cushionTxt,
        payback: r.payback == null ? `Not within ${c.months} months.` : `Month ${r.payback} (${monthName(r.payback)}).`, period: r.payback == null ? `Still ${L(-r.end.cumInvest)} short after ${c.months} months.` : "" };
      $("#npChecks").innerHTML = r.verdict === "incomplete" ? "" : r.tests.map((t) => `<li>${t.ok ? stamp("ac", "Pass") : stamp("od", "Fails")}<div><b>${esc(t.label)}</b>${det[t.id] ? `<p>${esc(det[t.id])}</p>` : ""}</div></li>`).join("");

      // key figures
      const figs = [
        ["Beds", c.beds ? `${c.beds}` : "–", c.beds ? `${c.residents} residents expected · ${pct(r.occ, 1)} full` : ""],
        ["Profit in a full month", c.beds ? L(r.s.profit) : "–", c.beds ? `Margin ${pct(r.margin, 1)} · ${I(r.perBed)} per bed` : "", neg(r.s.profit)],
        ["Break-even", r.beRes == null ? "Never" : `${Math.ceil(r.beRes - 1e-9)} residents`, r.beOcc == null ? "Costs per resident exceed rent" : `${pct(r.beOcc, 1)} occupancy`],
        ["Money back", r.payback == null ? "Not in period" : r.payback === 0 ? "Nothing to recover" : `Month ${r.payback}`, r.payback ? monthName(r.payback) : ""],
        ["Upfront spend", L(r.upfront), `Setup ${L(c.setup)} + landlord deposit ${L(c.llDeposit)}`],
        ["Most money needed", L(r.peak), r.peak > 0 ? `By ${monthName(r.peakM)}, before profits catch up` : ""],
        ["Rent cover", r.rentCover == null ? "–" : r.rentCover.toFixed(2) + "×", "Rent collected ÷ rent to landlord"],
        ["Yearly return on upfront", r.annualReturn == null ? "–" : pct(r.annualReturn, 1), "Full-month profit × 12 ÷ upfront spend"],
      ];
      $("#npFigs").innerHTML = figs.map(([l, val, s, cls]) => `<div class="np-fig"><span>${esc(l)}</span><b class="${cls || ""}">${esc(val)}</b>${s ? `<small>${esc(s)}</small>` : ""}</div>`).join("");

      // a full month
      const s = r.s, row = (l, val, cls) => `<tr class="${cls || ""}"><td>${esc(l)}</td><td class="num ${neg(val)}">${esc(I(val))}</td></tr>`;
      $("#npMonth").innerHTML = `<tbody>${row(`Rent collected (${c.residents} × ${I(c.avgRent)}${c.collection < 1 ? " × " + pct(c.collection) : ""})`, s.rentIn)}${s.other ? row("Other income and joining fees", s.other) : ""}
        ${row("Rent to landlord", -s.llRent)}${s.gst ? row(`GST RCM (${pct(c.gstRcm, 1)})`, -s.gst) : ""}${row("Monthly running costs", -s.fixed)}${row(`Costs per resident (${c.residents} × ${I(c.perRes)})`, -s.variable)}${s.marketing ? row("Brokerage / marketing for new residents", -s.marketing) : ""}
        ${row("Profit in a full month", s.profit, "tot")}</tbody>`;

      // effect on Thrive
      const bank = T.balances ? T.balances.bank : null;
      $("#npThrive").innerHTML = `<li>Landlord rent Thrive pays each month goes from <b>${esc(L(ref.commit))}</b> to <b>${esc(L(ref.commit + c.llRent))}</b> (${ref.commit ? "+" + pct(c.llRent / ref.commit, 1) : ""}).</li>
        ${bank != null ? `<li>The bank account is ${bank < 0 ? "overdrawn at" : "at"} <b class="${neg(bank)}">${esc(L(bank))}</b> (${esc(T.lastActual.long)}). ${r.peak > 0 ? (bank - r.peak < 0 ? `This property needs up to <b>${esc(L(r.peak))}</b>, so it would need new funding (loan or investment) of at least that much.` : `This property needs up to <b>${esc(L(r.peak))}</b>, leaving ${esc(L(bank - r.peak))}.`) : ""}</li>` : ""}
        <li>Counting residents' deposits as cash in hand, the most money needed is ${esc(L(r.peakCash))}; those deposits are owed back, so the figure above leaves them out.</li>`;

      // charts
      const items = r.rows.map((x) => ({ label: monthName(x.m), tip: `${monthName(x.m)} (month ${x.m})${x.open ? ` · ${x.res} residents` : " · before opening"}`, in: x.rentIn + x.other, out: x.llRent + x.gst + x.fixed + x.variable + x.marketing, planned: false }));
      C.inout($("#npFlow"), items, { fmt: L, label: "Monthly income and costs, " + name });
      C.balance($("#npCum"), r.rows.map((x) => ({ label: monthName(x.m), tip: `${monthName(x.m)} (month ${x.m})`, v: x.cumInvest, planned: false })), { min: 0, fmt: L, label: "Thrive's money in the property, running total",
        zeroText: "Shaded: setup money not yet back", belowWord: "Not yet paid back", valueName: "Money back so far" });

      // month table
      $("#npTable").innerHTML = `<thead><tr><th class="sticky">Month</th><th class="num">Residents</th><th class="num">Income</th><th class="num">Landlord rent + GST</th><th class="num">Running costs</th><th class="num">Profit</th><th class="num">Setup + landlord deposit</th><th class="num">Residents' deposits (net)</th><th class="num">Money back so far</th></tr></thead><tbody>${r.rows.map((x) => `<tr class="${x.m === r.payback ? "hl" : ""}"><td class="sticky">${esc(monthName(x.m))} <small>M${x.m}</small></td><td class="num">${x.res}</td><td class="num">${esc(L(x.rentIn + x.other))}</td><td class="num">${esc(L(-(x.llRent + x.gst)))}</td><td class="num">${esc(L(-(x.fixed + x.variable + x.marketing)))}</td><td class="num ${neg(x.profit)}">${esc(L(x.profit))}</td><td class="num">${x.setup + x.llDep ? esc(L(-(x.setup + x.llDep))) : "–"}</td><td class="num">${Math.abs(x.depIn - x.depOut) > 0.5 ? esc(L(x.depIn - x.depOut)) : "–"}</td><td class="num ${neg(x.cumInvest)}">${esc(L(x.cumInvest))}</td></tr>`).join("")}</tbody>
        <tfoot><tr class="tot"><td class="sticky">Total</td><td></td><td class="num">${esc(L(r.total.income))}</td><td class="num" colspan="2">${esc(L(-r.total.costs))}</td><td class="num ${neg(r.total.profit)}">${esc(L(r.total.profit))}</td><td class="num">${esc(L(-r.upfront))}</td><td class="num">${esc(L(r.end.depHeld))} held</td><td class="num ${neg(r.end.cumInvest)}">${esc(L(r.end.cumInvest))}</td></tr></tfoot>`;
      $("#npEnd").textContent = `At the end of month ${c.months}: Thrive would hold ${L(r.end.depHeld)} of residents' deposits (owed back to them) and is owed ${L(c.llDeposit)} by the landlord (its deposit). Neither is counted in "Money back so far".`;

      // sensitivity
      $("#npGrid").innerHTML = `<thead><tr><th>Residents (occupancy)</th><th class="num">Rent −10%</th><th class="num">Rent as entered</th><th class="num">Rent +10%</th></tr></thead><tbody>${r.grid.map((g) => `<tr class="${g.residents === c.residents ? "hl" : ""}"><td>${g.residents} (${pct(g.occ)})</td>${g.cells.map((v) => `<td class="num ${neg(v)}">${esc(L(v))}</td>`).join("")}</tr>`).join("")}</tbody>`;
      return r;
    }

    /* ---------- wiring ---------- */
    let built = false, wired = false, last = null;
    function render() {
      if (!built) { $("#npForm").innerHTML = formHTML(); built = true; }
      if (!wired) {
        wired = true;
        $("#npForm").addEventListener("input", (e) => {
          const i = e.target; if (!i.dataset.p) return;
          set(i.dataset.p, i.dataset.text ? i.value : parse(i.value));
          store.set(st); last = draw();
        });
        $("#npForm").addEventListener("focusout", (e) => { const i = e.target; if (i.dataset && i.dataset.p && !i.dataset.text) i.value = fmtNum(get(i.dataset.p)); });
        $("#npForm").addEventListener("click", (e) => {
          if (e.target.id === "npExample" || e.target.id === "npClear") {
            st = Object.assign(clone(e.target.id === "npExample" ? P.EXAMPLE : P.BLANK), { start: st.start || nextMonth() }); store.set(st);
            built = false; render(); toast(e.target.id === "npExample" ? "Example loaded" : "All inputs cleared"); return;
          }
          if (e.target.id === "npCsv") csv();
        });
      }
      last = draw();
    }
    function csv() {
      const r = last || P.calc(st), q = (s) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`, R = Math.round;
      const rows = [["Month", "Month no.", "Residents", "Rent collected", "Other income", "Landlord rent", "GST RCM", "Running costs", "Per-resident costs", "Brokerage/marketing", "Profit", "Setup", "Landlord deposit", "Residents' deposits in", "Residents' deposits refunded", "Money back so far"]]
        .concat(r.rows.map((x) => [monthName(x.m), x.m, x.res, R(x.rentIn), R(x.other), R(x.llRent), R(x.gst), R(x.fixed), R(x.variable), R(x.marketing), R(x.profit), R(x.setup), R(x.llDep), R(x.depIn), R(x.depOut), R(x.cumInvest)]));
      const blob = new Blob(["﻿" + rows.map((x) => x.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "thrive-new-property-" + (r.c.name || "property").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".csv";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("CSV downloaded");
    }
    return { render, redraw: () => built && (last = draw()), calc: () => P.calc(st), state: () => st };
  }

  root.ThrivePropertyUI = { init };
})(window);
