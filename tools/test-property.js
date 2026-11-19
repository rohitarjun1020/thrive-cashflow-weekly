// Hand-worked checks for the New property feasibility maths.  Run: node tools/test-property.js
const P = require("../assets/property.js");
let pass = 0, fail = 0;
const eq = (name, got, want, tol = 0.005) => { const ok = got === want || (typeof got === "number" && typeof want === "number" && Math.abs(got - want) <= tol); ok ? pass++ : fail++; if (!ok) console.log("FAIL", name, "got", got, "want", want); };
const zero = (list) => Object.fromEntries(list.map(([k]) => [k, 0]));
const base = (o) => Object.assign({ rooms: {}, setup: zero(P.SETUP), fixed: zero(P.FIXED), perRes: zero(P.PER_RES), collection: 100, months: 12, paybackTarget: 24 }, o);

/* A: 10 single rooms at ₹10,000, full from month 1.
   Month: rent 1,00,000 − landlord 50,000 − fixed 10,000 − 10 × 1,000 = 30,000 profit.
   Upfront 2,00,000 setup + 1,00,000 landlord deposit → month-1 position −2,70,000, then +30,000 a month → back to 0 in month 10. */
const A = P.calc(base({ rooms: { single: { rooms: 10, rent: 10000 } }, residents: 10, fillMonths: 0, stay: 10, deposit: 5000,
  llRent: 50000, llDeposit: 100000, setup: Object.assign(zero(P.SETUP), { renovation: 200000 }), fixed: Object.assign(zero(P.FIXED), { manager: 10000 }),
  perRes: Object.assign(zero(P.PER_RES), { food: 1000 }) }));
eq("A beds", A.c.beds, 10); eq("A avg rent", A.c.avgRent, 10000);
eq("A month-1 profit", A.rows[0].profit, 30000); eq("A month-1 invest", A.rows[0].invest, -270000);
eq("A month-1 deposits in", A.rows[0].depIn, 50000); eq("A month-1 cash", A.rows[0].cash, -220000);
eq("A month-2 move-outs", A.rows[1].moveOuts, 1); eq("A month-2 deposits net", A.rows[1].depIn - A.rows[1].depOut, 0);
eq("A steady profit", A.s.profit, 30000); eq("A payback month", A.payback, 10);
eq("A break-even residents", A.beRes, 60000 / 9000); eq("A break-even occupancy", A.beOcc, 60000 / 9000 / 10);
eq("A peak need", A.peak, 270000); eq("A peak month", A.peakM, 1); eq("A peak cash incl deposits", A.peakCash, 220000);
eq("A year-1 profit", A.year1, 360000); eq("A deposits held at end", A.end.depHeld, 50000);
eq("A rent cover", A.rentCover, 2); eq("A margin", A.margin, 0.3); eq("A verdict", A.verdict, "yes");

/* B: 5 double rooms (10 beds) at ₹8,000 a bed, 8 residents expected, fill over 4 months after a 2-month fit-out,
   first month rent-free, landlord ₹40,000 +18% GST RCM, +10% a year; resident rent +5% a year. */
const B = P.calc(base({ rooms: { double: { rooms: 5, rent: 8000 } }, residents: 8, fillMonths: 4, fitout: 2, rentFree: 1, stay: 8,
  llRent: 40000, llIncrease: 10, gstRcm: 18, rentIncrease: 5, fixed: Object.assign(zero(P.FIXED), { guard: 5000 }),
  perRes: Object.assign(zero(P.PER_RES), { power: 500 }), months: 24 }));
eq("B m1 profit (fit-out, rent-free)", B.rows[0].profit, 0);
eq("B m2 profit (fit-out, rent + GST)", B.rows[1].profit, -47200);
eq("B m3 residents", B.rows[2].res, 2); eq("B m3 profit", B.rows[2].profit, 16000 - 47200 - 5000 - 1000);
eq("B m4 residents", B.rows[3].res, 4); eq("B m4 profit", B.rows[3].profit, 32000 - 47200 - 5000 - 2000);
eq("B m6 residents", B.rows[5].res, 8); eq("B m6 profit", B.rows[5].profit, 64000 - 47200 - 5000 - 4000);
eq("B m13 landlord rent (+10%)", B.rows[12].llRent, 44000); eq("B m13 rent in (+5%)", B.rows[12].rentIn, 67200);
eq("B m13 profit", B.rows[12].profit, 67200 - 44000 - 7920 - 5000 - 4000);
eq("B occupancy", B.occ, 0.8);

/* C: residents asked above beds are capped at the beds; nothing entered = incomplete */
const C = P.calc(base({ rooms: { triple: { rooms: 2, rent: 5000 } }, residents: 50 }));
eq("C beds", C.c.beds, 6); eq("C residents capped", C.c.residents, 6);
eq("D blank verdict", P.calc(P.BLANK).verdict, "incomplete");

/* E: losing property is "no"; grid uses the same steady month */
const E = P.calc(base({ rooms: { single: { rooms: 10, rent: 5000 } }, residents: 9, llRent: 80000 }));
eq("E verdict", E.verdict, "no"); eq("E steady profit", E.s.profit, 45000 - 80000);
eq("E grid 100% as entered", E.grid[4].cells[1], 50000 - 80000);

/* F: the example on the page */
const F = P.calc(P.EXAMPLE);
console.log("Example: beds", F.c.beds, "avg rent", Math.round(F.c.avgRent), "steady profit", Math.round(F.s.profit), "payback", F.payback, "peak", Math.round(F.peak), "break-even occ", (F.beOcc * 100).toFixed(1) + "%", "verdict", F.verdict);
console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
