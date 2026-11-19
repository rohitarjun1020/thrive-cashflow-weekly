// Browser checks for the Front Desk dashboard.
// Run (with the site served on 127.0.0.1:8741):
//   playwright-cli open about:blank
//   playwright-cli run-code "$(cat tools/test-dashboard.js)"
// Expected values are worked out straight from window.CF here, not from the app's own code.
async (page) => {
  const BASE = "http://127.0.0.1:8741/";
  const PASS = "SRF-2026";
  const R = [], errors = [];
  const ok = (name, cond, info) => R.push((cond ? "PASS " : "FAIL ") + name + (info !== undefined && !cond ? "  [" + info + "]" : ""));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  /* ---------- passcode ---------- */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(500);
  ok("gate shows on a fresh device", await page.isVisible("#gate .keycard"));
  ok("dashboard figures are not on screen behind the gate", !(await page.isVisible("#tags")));
  await page.fill("#pc", "wrong-code");
  await page.press("#pc", "Enter");
  await page.waitForTimeout(300);
  ok("wrong passcode is refused", (await page.textContent("#pcErr")).includes("didn't match"));
  await page.fill("#pc", PASS);
  await page.press("#pc", "Enter");
  await page.waitForTimeout(600);
  ok("right passcode opens the dashboard", !(await page.isVisible("#gate")) && (await page.isVisible("#tags")));
  ok("device is remembered", !!(await page.evaluate(() => localStorage.getItem("thrive.ok"))));
  await page.reload(); await page.waitForTimeout(500);
  ok("stays open after reload", !(await page.isVisible("#gate")));

  /* ---------- independent expectations ---------- */
  const expect = (from, to, cat, proj, min) => page.evaluate(([from, to, cat, proj, min]) => {
    const D = window.CF, H = {}; D.heads.forEach((h) => (H[h.id] = h));
    const SP = {}; (D.meta.spend || []).forEach((g) => g.rows.forEach((r) => (SP["r" + r] = g.id)));
    const inCat = (k) => cat === "All" || H[k].act === cat || SP[k] === cat;
    const ms = D.months.filter((m) => m.key >= from && m.key <= to);
    const eff = (m) => {
      if (proj || m.actual) return m;
      const ws = m.weeks.map((i) => D.weeks[i]).filter((w) => w.actual);
      if (!ws.length) return null;
      const v = {}; ws.forEach((w) => { for (const k in w.v) v[k] = (v[k] || 0) + w.v[k]; });
      return { open: m.open, inflow: ws.reduce((s, w) => s + w.inflow, 0), outflow: ws.reduce((s, w) => s + w.outflow, 0), close: ws[ws.length - 1].close, v };
    };
    const es = ms.map(eff).filter(Boolean);
    let i = 0, o = 0;
    es.forEach((a) => { if (cat === "All") { i += a.inflow; o += a.outflow; return; } for (const k in a.v) if (H[k] && inCat(k)) { if (H[k].dir === "in") i += a.v[k]; else o += a.v[k]; } });
    const f = (v) => { const a = Math.abs(v), s = v < 0 ? "−" : ""; return a >= 1e7 ? s + "₹" + (a / 1e7).toFixed(2) + " Cr" : s + "₹" + (a / 1e5).toFixed(2) + " L"; };
    return { open: f(es[0].open), inflow: f(i), outflow: f(o), net: (i - o > 0 ? "+" : "") + f(i - o), close: f(es[es.length - 1].close) };
  }, [from, to, cat, proj, min || 0]);
  const tags = () => page.$$eval("#tags .tag .v", (els) => els.map((e) => e.textContent.trim()));
  const checkTags = async (label, from, to, cat, proj) => {
    const e = await expect(from, to, cat, proj), t = await tags();
    const want = [e.open, e.inflow, e.outflow, e.net, e.close];
    ok("figures match the file: " + label, JSON.stringify(t) === JSON.stringify(want), "page " + t.join(" | ") + "  file " + want.join(" | "));
  };
  const setHash = async (h) => { await page.goto(BASE + "#" + h); await page.reload(); await page.waitForTimeout(450); };

  /* ---------- every section renders ---------- */
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1");
  const counts = await page.evaluate(() => ({
    rack: document.querySelectorAll("#rack .kt").length,
    rackWeeks: document.querySelectorAll("#rackWeeks .rw").length,
    watch: document.querySelectorAll("#watch li").length,
    cf: document.querySelectorAll("#cfChart svg .hit").length,
    pay: document.querySelectorAll("#pay tr").length,
    bal: document.querySelectorAll("#balChart svg circle").length,
    spend: document.querySelectorAll("#spend button, #spend .sp").length,
    building: document.querySelectorAll("#building svg .floor").length,
    ll: document.querySelectorAll("#llTable tbody tr").length,
    stmt: document.querySelectorAll("#paneStmt tbody tr").length,
    verdict: document.querySelector("#verdict").textContent.length,
    balances: document.querySelector("#balances").textContent,
  }));
  ok("key rack has week tags", counts.rack >= 4, counts.rack);
  ok("latest and next week cards", counts.rackWeeks === 2, counts.rackWeeks);
  ok("needs attention lists items", counts.watch >= 1, counts.watch);
  ok("cash-flow chart has a bar per week", counts.cf >= 30, counts.cf);
  ok("upcoming payments listed", counts.pay >= 5, counts.pay);
  ok("closing-balance chart drawn", counts.bal >= 30, counts.bal);
  ok("spend by category drawn", counts.spend >= 5, counts.spend);
  ok("landlord building has 5 floors", counts.building === 5, counts.building);
  ok("landlord table rows", counts.ll >= 15, counts.ll);
  ok("cash-flow statement rows", counts.stmt >= 10, counts.stmt);
  ok("verdict line present", counts.verdict > 30);
  ok("cash book vs Razorpay balances shown", /ICICI/.test(counts.balances) && /Razorpay/.test(counts.balances));

  /* ---------- figures vs the file under every filter ---------- */
  await checkTags("FY26-27 YTD with planned weeks", "2026-04", "2026-11", "All", true);
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=0");
  await checkTags("FY26-27 actual weeks only", "2026-04", "2026-11", "All", false);
  await setHash("from=2025-04&to=2026-03&cat=All&min=0&proj=1");
  await checkTags("FY25-26", "2025-04", "2026-03", "All", true);
  await setHash("from=2024-04&to=2025-03&cat=All&min=0&proj=1");
  await checkTags("FY24-25", "2024-04", "2025-03", "All", true);
  for (const cat of ["Operating", "Investing", "Financing", "rent", "sal", "util"]) {
    await setHash("from=2026-01&to=2026-10&cat=" + cat + "&min=0&proj=1");
    await checkTags("category " + cat, "2026-01", "2026-10", cat, true);
  }

  /* ---------- link settings (hash) round-trip ---------- */
  await setHash("from=2025-07&to=2026-02&cat=Financing&min=-10&proj=0");
  const ctl = await page.evaluate(() => ({ from: document.querySelector("#fFrom").value, to: document.querySelector("#fTo").value, cat: document.querySelector("#fCat").value, min: document.querySelector("#fMin").value, proj: document.querySelector("#fProj").checked, hash: location.hash }));
  ok("link sets From", ctl.from === "2025-07", ctl.from);
  ok("link sets To", ctl.to === "2026-02", ctl.to);
  ok("link sets Category", ctl.cat === "Financing", ctl.cat);
  ok("link sets Alert level", +ctl.min === -10, ctl.min);
  ok("link sets Planned weeks off", ctl.proj === false);
  ok("hash kept after load", /from=2025-07/.test(ctl.hash) && /cat=Financing/.test(ctl.hash) && /min=-10/.test(ctl.hash) && /proj=0/.test(ctl.hash), ctl.hash);
  await page.selectOption("#fCat", "Operating"); await page.waitForTimeout(300);
  ok("changing a filter updates the link", /cat=Operating/.test(await page.evaluate(() => location.hash)));
  await page.click("text=FY25-26"); await page.waitForTimeout(300);
  ok("preset FY25-26 sets the range", /from=2025-04/.test(await page.evaluate(() => location.hash)) && /to=2026-03/.test(await page.evaluate(() => location.hash)));
  await setHash("from=2026-04&to=2026-11&cat=All&min=-20&proj=1");
  ok("alert level changes the watch list wording", /alert level|below/i.test(await page.textContent("#watch")) || /below/i.test(await page.textContent("#tags")));

  /* ---------- drill-downs and exports ---------- */
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1");
  await page.click("#cfChart svg .hit >> nth=-4"); await page.waitForTimeout(300);
  ok("clicking a cash-flow bar opens its line items", await page.isVisible(".drawer") && (await page.textContent(".drawer")).length > 50);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  ok("Escape closes the drawer", !(await page.isVisible(".drawer.open")));
  await page.click("#rack .kt >> nth=0"); await page.waitForTimeout(300);
  ok("key tag opens the week", await page.isVisible(".drawer"));
  await page.keyboard.press("Escape");
  await page.click("#grain button[data-g=m]"); await page.waitForTimeout(200);
  ok("monthly view of cash flow", (await page.$$("#cfChart svg .hit")).length === 8, (await page.$$("#cfChart svg .hit")).length);
  const dl = page.waitForEvent("download", { timeout: 3000 }).catch(() => null);
  await page.click("#csvBtn");
  const d = await dl;
  ok("Download CSV gives a file", !!d && /\.csv$/.test(d.suggestedFilename()), d && d.suggestedFilename());
  await page.click("#tabTx"); await page.waitForTimeout(250);
  ok("transactions tab lists bank and Razorpay lines", (await page.$$("#paneTx tbody tr")).length >= 50);
  await page.fill("#regSearch", "salary"); await page.waitForTimeout(350);
  ok("transaction search filters", (await page.$$("#paneTx tbody tr")).length >= 1);

  /* ---------- What-if ---------- */
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1&view=whatif");
  ok("What-if with no changes matches the plan", /Matches the plan exactly/.test(await page.textContent("#wiBadge")));
  const plan = await page.evaluate(() => window.CF.weeks.filter((w) => !w.actual).map((w) => Math.round(w.close)));
  const wiRows = await page.$$eval("#wiTable tbody tr", (rs) => rs.map((r) => [...r.cells].map((c) => c.textContent.trim())));
  const num = (s) => Math.round(+String(s).replace(/[₹,\s]/g, "").replace("−", "-"));
  ok("What-if table equals the planned closings", wiRows.length === plan.length && wiRows.every((r, k) => num(r[4]) === plan[k]), JSON.stringify(wiRows.map((r) => r[4])) + " vs " + plan);
  await page.fill("#wRent", "-20"); await page.dispatchEvent("#wRent", "input"); await page.waitForTimeout(250);
  ok("rent drop changes the result", /Differs/.test(await page.textContent("#wiBadge")));
  await page.click("#wReset"); await page.waitForTimeout(250);
  ok("reset returns to the plan", /Matches the plan exactly/.test(await page.textContent("#wiBadge")));

  /* ---------- Ask AI: 15 questions checked against the file ---------- */
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1&view=ask");
  const X = await page.evaluate(() => {
    const D = window.CF, M = (k) => D.months.find((m) => m.key === k);
    const f = (v) => { const a = Math.abs(v), s = v < 0 ? "−" : ""; return a >= 1e7 ? s + "₹" + (a / 1e7).toFixed(2) + " Cr" : s + "₹" + (a / 1e5).toFixed(2) + " L"; };
    const fy = (y) => D.months.filter((m) => m.key >= y + "-04" && m.key <= (y + 1) + "-03");
    const aw = D.weeks.filter((w) => w.actual), last = aw[aw.length - 1], pw = D.weeks.filter((w) => !w.actual);
    const lli = D.landlords.months.indexOf("2026-10");
    const one = D.landlords.rows.filter((r) => r.property === "Thrive One").reduce((s, r) => s + (r.pay[lli] || 0), 0);
    return {
      sal: f(M("2026-10").v.r74), close: f(M("2026-10").close), inSep: f(M("2026-09").inflow), outFY: f(fy(2025).reduce((s, m) => s + m.outflow, 0)),
      openApr: f(M("2026-04").open), rent: f(M("2026-10").v.r11), rzp: f(last.rzpClose), net: f(M("2026-08").inflow - M("2026-08").outflow),
      llOct: f((M("2026-10").v.r26 || 0) + (M("2026-10").v.r27 || 0)), sepOut: f(M("2026-09").outflow), octOut: f(M("2026-10").outflow),
      planEnd: f(pw[pw.length - 1].close), one: f(one), gst: f(M("2026-10").v.r69 || 0), bank: f(last.close),
    };
  });
  const Q = [
    ["How much did we pay in salaries in October 2026?", [X.sal]],
    ["What was the closing balance in October 2026?", [X.close]],
    ["How much money came in during September 2026?", [X.inSep]],
    ["Money out in FY25-26", [X.outFY]],
    ["Opening balance in April 2026", [X.openApr]],
    ["Rent collected in October 2026", [X.rent]],
    ["What is the Razorpay balance?", [X.rzp, X.bank]],
    ["Net cash flow in August 2026", [X.net]],
    ["Landlord rent paid in October 2026", [X.llOct]],
    ["Compare money out in September and October 2026", [X.sepOut, X.octOut]],
    ["Will we be overdrawn?", [X.planEnd, "overdrawn"]],
    ["What payments are coming up?", ["Planned"]],
    ["How much rent do we pay for Thrive One?", [X.one]],
    ["How many weeks were we overdrawn this year?", ["week"]],
    ["purple elephant quantum", ["didn't understand", "closest questions"]],
  ];
  for (const [q, want] of Q) {
    await page.fill("#askIn", q); await page.press("#askIn", "Enter"); await page.waitForTimeout(180);
    const a = await page.$$eval("#askLog .msg.bot", (els) => els[els.length - 1].textContent.replace(/\s+/g, " "));
    const miss = want.filter((w) => !a.includes(w));
    ok("Ask AI: " + q, !miss.length, "missing " + miss.join(", ") + " in: " + a.slice(0, 160));
  }
  ok("Ask Claude link shown", await page.isVisible("#askClaude"));
  {
    const loan = await page.evaluate(() => { const m = window.CF.months.find((x) => x.key === "2026-03"); const v = (m.v.r14 || 0) + (m.v.r15 || 0); return "₹" + (v / 1e5).toFixed(2) + " L"; });
    await page.fill("#askIn", "How much loan did we receive in March 2026?"); await page.press("#askIn", "Enter"); await page.waitForTimeout(180);
    const a = await page.$$eval("#askLog .msg.bot", (els) => els[els.length - 1].textContent);
    ok("Ask AI: loans received is the loan inflow, not finance cost", a.includes(loan) && /Loans received/.test(a), a.slice(0, 120));
  }

  /* ---------- reported problems stay fixed ---------- */
  await setHash("from=2026-04&to=2026-11&cat=All&min=-20&proj=0");
  {
    const close = await page.$eval("#tags .tag:last-child", (e) => e.textContent);
    ok("negative alert: an overdrawn closing is never 'In credit'", /Overdrawn/i.test(close) && !/In credit/i.test(close), close.slice(0, 160));
    ok("negative alert: runway talks about headroom to the alert level", /above your −₹20\.00 L alert level|Already below/.test(close), close.slice(0, 200));
  }
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1&g=m");
  {
    await page.waitForSelector("#cfChart svg .hit", { timeout: 5000 }).catch(() => {});
    const labels = await page.$$eval("#cfChart svg text.ax", (els) => els.map((e) => e.textContent));
    ok("monthly chart labels every month (Oct'26 present)", labels.includes("Oct'26") && labels.includes("Nov'26"), labels.join(","));
    const solid = await page.$$eval("#cfChart svg .hit", (gs) => gs[gs.length - 1].querySelectorAll("path.bi:not([fill^='url'])").length);
    ok("part-planned Nov'26 bar shows its actual part solid", solid >= 1, solid);
  }
  await setHash("from=2024-04&to=2026-11&cat=All&min=0&proj=1");
  {
    const spendRent = await page.$eval("#spend .sp", (e) => e.querySelector(".am").textContent);
    const llPaid = await page.$$eval("#llFigs .fig", (fs) => fs[2].querySelector("b").textContent);
    ok("landlord rent is the same in Spend and Landlords cards", spendRent === llPaid, spendRent + " vs " + llPaid);
  }
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1&view=whatif");
  ok("What-if says the account is already overdrawn at the start", /Already overdrawn at the start/.test(await page.textContent("#wiSub")), await page.textContent("#wiSub"));
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1");
  ok("header gives the bank statements' last date", /bank statements to 11 Nov/.test(await page.textContent("#asOf")), await page.textContent("#asOf"));
  await page.click("#tabTx"); await page.fill("#regSearch", "PAYROLL/IDFB0020101"); await page.waitForTimeout(400);
  { const c = await page.textContent("#regCount"); ok("singular '1 line'", !/\b1 lines\b/.test(c), c); }

  /* ---------- keyboard ---------- */
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1");
  await page.focus("#cfChart svg .hit >> nth=0"); await page.keyboard.press("Enter"); await page.waitForTimeout(250);
  ok("chart bars work with the keyboard", await page.isVisible(".drawer"));
  await page.keyboard.press("Escape");

  /* ---------- dark mode ---------- */
  await page.emulateMedia({ colorScheme: "dark" }); await page.reload(); await page.waitForTimeout(400);
  ok("dark mode follows the device", (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) !== "rgb(242, 241, 238)");
  await page.emulateMedia({ colorScheme: "light" });

  /* ---------- phone ---------- */
  await page.setViewportSize({ width: 390, height: 844 });
  for (const v of ["desk", "whatif", "ask"]) {
    await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1&view=" + v);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok("phone: no sideways scroll on " + v, sw <= 390, sw);
  }
  await setHash("from=2026-04&to=2026-11&cat=All&min=0&proj=1");
  await checkTags("phone figures", "2026-04", "2026-11", "All", true);
  ok("phone: charts drawn (monthly on a phone)", (await page.$$("#cfChart svg .hit")).length >= 8 && (await page.$$("#balChart svg circle")).length >= 8);
  const tabStops = await page.evaluate(() => document.querySelectorAll("#cfChart [tabindex='0'], #balChart [tabindex='0']").length);
  ok("each chart is one tab stop", tabStops === 2, tabStops);

  /* ---------- lock ---------- */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click("#lockBtn"); await page.waitForTimeout(300);
  ok("lock button brings back the gate", await page.isVisible("#gate .keycard"));
  await page.fill("#pc", PASS); await page.press("#pc", "Enter"); await page.waitForTimeout(400);

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" / "));
  const fails = R.filter((r) => r.startsWith("FAIL")).length;
  return R.join("\n") + "\n\n" + (R.length - fails) + " passed, " + fails + " failed";
}
