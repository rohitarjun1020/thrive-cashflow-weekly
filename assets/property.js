/* Thrive · New property feasibility.
   calc(inputs) is pure (no page, no data file) so it can be checked on its own: node tools/test-property.js
   property-ui.js builds the "New property" page. Every rule the maths uses is written out on the page under "How this is worked out". */
(function (root) {
  "use strict";

  /* ---------------- inputs: the full list the client fills in ---------------- */
  const ROOM_TYPES = [
    { id: "single", name: "Single", beds: 1 },
    { id: "double", name: "Double sharing", beds: 2 },
    { id: "triple", name: "Triple sharing", beds: 3 },
    { id: "quad", name: "Four sharing", beds: 4 },
  ];
  const SETUP = [
    ["renovation", "Renovation & civil work"], ["painting", "Painting"], ["electrical", "Electrical & plumbing work"],
    ["furniture", "Beds, wardrobes, study tables"], ["mattress", "Mattresses, linen & curtains"],
    ["appliances", "Appliances (ACs, geysers, fridge, washing machines)"], ["kitchen", "Kitchen equipment & utensils"],
    ["security", "CCTV, Wi-Fi & door locks"], ["signage", "Signage & branding"],
    ["llBrokerage", "Brokerage paid for the property"], ["legal", "Agreement, stamp duty & registration"], ["setupOther", "Other setup costs"],
  ];
  const FIXED = [
    ["manager", "Property manager / warden salary"], ["housekeeping", "Housekeeping staff salaries"], ["cook", "Cook & kitchen staff salaries"],
    ["guard", "Security guard"], ["maintenance", "Repairs & maintenance"], ["internet", "Internet & Wi-Fi"],
    ["commonPower", "Common-area electricity"], ["software", "Software & subscriptions"], ["insurance", "Insurance"],
    ["tax", "Property tax, trade licence & fees"], ["pest", "Pest control"], ["fixedOther", "Other monthly costs"],
  ];
  const PER_RES = [
    ["power", "Electricity"], ["water", "Water & tankers"], ["food", "Food & groceries"], ["gas", "Cooking gas"],
    ["consumables", "Toiletries & consumables"], ["laundry", "Laundry"],
  ];

  // example values so the page is never empty; the client replaces them
  const EXAMPLE = {
    name: "New property",
    rooms: { single: { rooms: 4, rent: 22000 }, double: { rooms: 10, rent: 16000 }, triple: { rooms: 6, rent: 12500 }, quad: { rooms: 0, rent: 0 } },
    residents: 38, fillMonths: 4, collection: 100, stay: 10,
    deposit: 15000, joining: 0, otherIncome: 0, marketing: 1000,
    llRent: 150000, llDeposit: 450000, rentFree: 1, fitout: 2, llIncrease: 5, gstRcm: 18,
    setup: { renovation: 400000, painting: 60000, electrical: 100000, furniture: 350000, mattress: 80000, appliances: 250000, kitchen: 120000, security: 60000, signage: 25000, llBrokerage: 150000, legal: 40000, setupOther: 50000 },
    fixed: { manager: 25000, housekeeping: 30000, cook: 30000, guard: 15000, maintenance: 8000, internet: 6000, commonPower: 0, software: 2000, insurance: 1500, tax: 2000, pest: 1000, fixedOther: 3500 },
    perRes: { power: 800, water: 300, food: 2500, gas: 400, consumables: 250, laundry: 0 },
    rentIncrease: 5, costIncrease: 5, months: 36, paybackTarget: 24,
  };
  const BLANK = (() => {
    const z = (list) => Object.fromEntries(list.map(([k]) => [k, 0]));
    return { name: "New property", rooms: Object.fromEntries(ROOM_TYPES.map((t) => [t.id, { rooms: 0, rent: 0 }])), residents: 0, fillMonths: 0, collection: 100, stay: 12,
      deposit: 0, joining: 0, otherIncome: 0, marketing: 0, llRent: 0, llDeposit: 0, rentFree: 0, fitout: 0, llIncrease: 0, gstRcm: 0,
      setup: z(SETUP), fixed: z(FIXED), perRes: z(PER_RES), rentIncrease: 0, costIncrease: 0, months: 36, paybackTarget: 24 };
  })();

  /* ---------------- the maths ---------------- */
  const num = (v, lo, hi) => { const n = Number(v); if (!isFinite(n)) return lo || 0; return Math.min(hi == null ? Infinity : hi, Math.max(lo || 0, n)); };
  const sumObj = (o) => Object.values(o || {}).reduce((a, v) => a + num(v), 0);

  function clean(p) {
    p = p || {};
    const rooms = {}; let beds = 0, rentAtFull = 0;
    ROOM_TYPES.forEach((t) => {
      const r = (p.rooms && p.rooms[t.id]) || {};
      const n = Math.floor(num(r.rooms, 0, 1000)), rent = num(r.rent, 0, 1e7);
      rooms[t.id] = { rooms: n, rent, beds: n * t.beds };
      beds += n * t.beds; rentAtFull += n * t.beds * rent;
    });
    const months = Math.round(num(p.months, 12, 120));
    return {
      name: String(p.name || "New property").slice(0, 60), rooms, beds, rentAtFull,
      avgRent: beds ? rentAtFull / beds : 0,                          // rent per resident, assuming residents spread across room types like the beds
      residents: Math.min(Math.floor(num(p.residents, 0, 5000)), beds),
      residentsAsked: Math.floor(num(p.residents, 0, 5000)),
      fillMonths: Math.round(num(p.fillMonths, 0, 36)), collection: num(p.collection, 0, 100) / 100, stay: num(p.stay, 1, 120),
      deposit: num(p.deposit, 0, 1e7), joining: num(p.joining, 0, 1e7), otherIncome: num(p.otherIncome, 0, 1e7), marketing: num(p.marketing, 0, 1e7),
      llRent: num(p.llRent, 0, 1e9), llDeposit: num(p.llDeposit, 0, 1e10), rentFree: Math.round(num(p.rentFree, 0, months)), fitout: Math.round(num(p.fitout, 0, months - 1)),
      llIncrease: num(p.llIncrease, 0, 100) / 100, gstRcm: num(p.gstRcm, 0, 100) / 100,
      setup: sumObj(p.setup), fixed: sumObj(p.fixed), perRes: sumObj(p.perRes),
      rentIncrease: num(p.rentIncrease, 0, 100) / 100, costIncrease: num(p.costIncrease, 0, 100) / 100,
      months, paybackTarget: Math.round(num(p.paybackTarget, 1, 240)),
    };
  }

  // one ordinary month at a given number of residents, at first-year prices
  function steady(c, residents, rentFactor) {
    const rf = rentFactor == null ? 1 : rentFactor;
    const moveIns = residents / c.stay;                               // residents who leave each month are replaced
    const rentIn = residents * c.avgRent * rf * c.collection;
    const other = residents * c.otherIncome + moveIns * c.joining;
    const llRent = c.llRent, gst = c.llRent * c.gstRcm;
    const fixed = c.fixed, variable = residents * c.perRes, marketing = moveIns * c.marketing;
    const income = rentIn + other, costs = llRent + gst + fixed + variable + marketing;
    return { residents, rentIn, other, income, llRent, gst, fixed, variable, marketing, costs, profit: income - costs };
  }

  function calc(input) {
    const c = clean(input), N = c.months, rows = [];
    let prevRes = 0, cumInvest = 0, cumCash = 0, depHeld = 0, payback = null, minInvest = 0, minInvestM = 0, minCash = 0, minCashM = 0, wasNeg = false;
    for (let m = 1; m <= N; m++) {
      const y = Math.floor((m - 1) / 12);                             // every increase applies each 12 months from the lease start
      const open = m > c.fitout, k = m - c.fitout;                    // k = months since residents could move in
      const target = c.residents;
      const res = !open ? 0 : c.fillMonths <= 0 ? target : Math.min(target, Math.round(target * k / c.fillMonths));
      const growth = Math.max(0, res - prevRes);
      const moveOuts = open && prevRes > 0 ? prevRes / c.stay : 0;   // expected leavers, replaced in the same month
      const moveIns = growth + moveOuts;
      const rg = Math.pow(1 + c.rentIncrease, y), cg = Math.pow(1 + c.costIncrease, y), lg = Math.pow(1 + c.llIncrease, y);
      const rentIn = res * c.avgRent * rg * c.collection;
      const other = res * c.otherIncome * rg + moveIns * c.joining;
      const llRent = m <= c.rentFree ? 0 : c.llRent * lg;
      const gst = llRent * c.gstRcm;
      const fixed = open ? c.fixed * cg : 0;
      const variable = res * c.perRes * cg;
      const marketing = moveIns * c.marketing * cg;
      const profit = rentIn + other - llRent - gst - fixed - variable - marketing;
      const setup = m === 1 ? c.setup : 0, llDep = m === 1 ? c.llDeposit : 0;
      const depIn = moveIns * c.deposit, depOut = moveOuts * c.deposit;
      depHeld += depIn - depOut;
      const invest = profit - setup - llDep;                          // Thrive's own money: excludes residents' deposits (they are owed back)
      const cash = invest + depIn - depOut;
      cumInvest += invest; cumCash += cash;
      if (cumInvest < 0) wasNeg = true;
      if (payback == null && wasNeg && cumInvest >= 0) payback = m;
      if (cumInvest < minInvest) { minInvest = cumInvest; minInvestM = m; }
      if (cumCash < minCash) { minCash = cumCash; minCashM = m; }
      rows.push({ m, open, res, moveIns, moveOuts, rentIn, other, llRent, gst, fixed, variable, marketing, profit, setup, llDep, depIn, depOut, invest, cash, cumInvest, cumCash, depHeld });
      prevRes = res;
    }
    if (payback == null && !wasNeg && N) payback = 0;                  // nothing to pay back

    const s = steady(c, c.residents);
    const unit = c.avgRent * c.collection + c.otherIncome + c.joining / c.stay - c.perRes - c.marketing / c.stay; // what one more resident adds a month
    const fixedAll = c.llRent * (1 + c.gstRcm) + c.fixed;
    const beRes = unit > 0 ? fixedAll / unit : null;                  // residents needed to cover a month's costs
    const occ = c.beds ? c.residents / c.beds : 0;
    const beOcc = beRes != null && c.beds ? beRes / c.beds : null;
    const upfront = c.setup + c.llDeposit;
    const year1 = rows.slice(0, 12).reduce((a, r) => a + r.profit, 0);
    const total = rows.reduce((a, r) => ({ income: a.income + r.rentIn + r.other, costs: a.costs + r.llRent + r.gst + r.fixed + r.variable + r.marketing, profit: a.profit + r.profit }), { income: 0, costs: 0, profit: 0 });
    const end = rows[rows.length - 1] || { cumInvest: 0, depHeld: 0 };

    // feasibility tests, each in plain words
    const cushion = beOcc == null ? null : occ - beOcc;               // how far occupancy can fall before a month loses money
    const tests = [
      { id: "profit", ok: s.profit > 0, label: "A full month makes money", detail: s.profit > 0 ? "" : "At the expected residents a month costs more than it brings in." },
      { id: "cushion", ok: cushion != null && cushion >= 0.10, label: "Room for empty beds (at least 10 points of occupancy)", detail: "" },
      { id: "payback", ok: payback != null && payback <= c.paybackTarget, label: `Money back within ${c.paybackTarget} months`, detail: "" },
      { id: "period", ok: payback != null && payback <= N, label: `Money back within the ${N}-month period`, detail: "" },
    ];
    let verdict;
    if (!c.beds || !c.residents) verdict = "incomplete";
    else if (!tests[0].ok || !tests[3].ok) verdict = "no";
    else if (!tests[1].ok || !tests[2].ok) verdict = "marginal";
    else verdict = "yes";

    return { c, rows, s, unit, fixedAll, beRes, beOcc, occ, cushion, upfront, payback, peak: -minInvest, peakM: minInvestM, peakCash: -minCash, peakCashM: minCashM,
      year1, total, end, tests, verdict,
      rentCover: s.llRent ? s.rentIn / s.llRent : null, rentShare: s.income ? (s.llRent + s.gst) / s.income : null, margin: s.income ? s.profit / s.income : null,
      perBed: c.beds ? s.profit / c.beds : 0, annualReturn: upfront ? (s.profit * 12) / upfront : null,
      grid: [0.6, 0.7, 0.8, 0.9, 1].map((o) => ({ occ: o, residents: Math.round(c.beds * o), cells: [0.9, 1, 1.1].map((rf) => steady(c, Math.round(c.beds * o), rf).profit) })) };
  }

  root.ThriveProperty = { calc, clean, steady, EXAMPLE, BLANK, ROOM_TYPES, SETUP, FIXED, PER_RES };
  if (typeof module !== "undefined") module.exports = root.ThriveProperty;
})(typeof window !== "undefined" ? window : globalThis);
