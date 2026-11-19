// Browser checks for the New property page.
// Run (with the site served on 127.0.0.1:8741):
//   playwright-cli open about:blank
//   playwright-cli run-code "$(cat tools/test-newprop.js)"
// Every expected figure comes from ThriveProperty.calc (checked by hand in tools/test-property.js).
async (page) => {
  const BASE = "http://127.0.0.1:8741/";
  const R = [], errors = [];
  const ok = (name, cond, info) => R.push((cond ? "PASS " : "FAIL ") + name + (info !== undefined && !cond ? "  [" + info + "]" : ""));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const lakh = (v) => page.evaluate((v) => ThriveModel.create(window.CF).lakh(v), v);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("thrive.ok", "b4d1b2cff12bafe2bd2e51cd15becdc6237b30a0861b137544b6fb8ca2d4477f"); });
  await page.goto(BASE + "#view=newprop"); await page.reload(); await page.waitForTimeout(700);
  ok("page opens from the link", await page.isVisible("#v-newprop") && !(await page.isVisible("#v-desk")));
  ok("filters hidden on this page", !(await page.isVisible("#filters")));
  ok("nav button marked current", (await page.getAttribute('button[data-view="newprop"]', "aria-current")) === "page");

  const ex = await page.evaluate(() => { const r = ThriveProperty.calc(ThriveProperty.EXAMPLE); return { verdict: r.verdict, profit: r.s.profit, payback: r.payback, peak: r.peak, beds: r.c.beds, months: r.c.months, upfront: r.upfront }; });
  ok("example verdict is Marginal", (await page.textContent("#npBadge")).trim().toLowerCase() === "marginal", await page.textContent("#npBadge"));
  const figs = await page.textContent("#npFigs");
  ok("full-month profit shown matches the maths", figs.includes(await lakh(ex.profit)), figs);
  ok("money back month shown", figs.includes("Month " + ex.payback));
  ok("most money needed shown", figs.includes(await lakh(ex.peak)));
  ok("upfront spend shown", figs.includes(await lakh(ex.upfront)));
  ok("beds total in rooms table", (await page.textContent("#np-bedsTot")).trim() === String(ex.beds));
  ok("one table row per month", (await page.$$eval("#npTable tbody tr", (t) => t.length)) === ex.months);
  ok("payback month highlighted in table", (await page.$$eval("#npTable tbody tr.hl", (t) => t.length)) === 1);
  ok("both charts drawn", (await page.$$eval("#npFlow svg, #npCum svg", (s) => s.length)) === 2);
  ok("cumulative chart uses property wording", (await page.textContent("#npCum")).includes("not yet back"));
  ok("Thrive reference GST shown", /GST RCM was \d+\.\d% of landlord rent/.test(await page.textContent("#npForm")));

  // live update: change landlord rent
  await page.click("summary:has-text('4. Landlord')");
  await page.fill("#np-llRent", "400000");
  await page.waitForTimeout(150);
  const hi = await page.evaluate(() => { const st = JSON.parse(JSON.stringify(ThriveProperty.EXAMPLE)); st.llRent = 400000; const r = ThriveProperty.calc(st); return { verdict: r.verdict, profit: r.s.profit }; });
  ok("raising landlord rent updates the verdict live", (await page.textContent("#npBadge")).trim().toLowerCase() === "not feasible" && hi.verdict === "no", hi.verdict);
  ok("raising landlord rent updates the profit", (await page.textContent("#npFigs")).includes(await lakh(hi.profit)));
  await page.click("#npVerdict"); // blur formats the number
  ok("number formatted Indian style on leaving the box", (await page.inputValue("#np-llRent")) === "4,00,000", await page.inputValue("#np-llRent"));

  // rooms change
  await page.fill('[data-p="rooms.quad.rooms"]', "2"); await page.fill('[data-p="rooms.quad.rent"]', "9000"); await page.waitForTimeout(150);
  ok("adding four-sharing rooms adds 8 beds", (await page.textContent("#np-bedsTot")).trim() === String(ex.beds + 8));
  // cap
  await page.fill("#np-residents", "999"); await page.waitForTimeout(150);
  ok("residents above beds are capped and told", (await page.textContent("#np-occ")).includes("only " + (ex.beds + 8) + " beds"));
  // persists
  await page.reload(); await page.waitForTimeout(700);
  ok("inputs kept after reload", (await page.inputValue('[data-p="rooms.quad.rooms"]')) === "2");
  // what is on screen equals the maths on the saved inputs
  const saved = await page.evaluate(() => { const r = ThriveProperty.calc(JSON.parse(localStorage.getItem("thrive.newprop"))); return { profit: r.s.profit, verdict: r.verdict }; });
  ok("screen matches maths on saved inputs", (await page.textContent("#npFigs")).includes(await lakh(saved.profit)));

  // clear and example
  await page.click("#npClear"); await page.waitForTimeout(200);
  ok("clear all gives the fill-in state", (await page.textContent("#npBadge")).toLowerCase().includes("fill in"));
  ok("no NaN or Infinity when empty", !/NaN|Infinity|undefined/.test(await page.textContent("#v-newprop")));
  ok("empty: every key figure is a dash", (await page.$$eval("#npFigs b", (b) => b.every((x) => x.textContent === "–"))));
  ok("empty: charts replaced by a short message", (await page.$$eval("#npFlow .np-empty, #npCum .np-empty", (e) => e.length)) === 2);
  // tiny figures: axis labels must not repeat or spill out of the chart
  await page.evaluate(() => document.querySelectorAll(".np-sec").forEach((d) => (d.open = true)));
  await page.fill('[data-p="rooms.single.rooms"]', "1"); await page.fill('[data-p="rooms.single.rent"]', "100");
  await page.fill("#np-residents", "1"); await page.waitForTimeout(200);
  const ax = await page.evaluate(() => ["#npFlow", "#npCum"].map((q) => { const s = document.querySelector(q + " svg"); if (!s) return "missing"; const h = s.getBoundingClientRect(); const t = [...s.querySelectorAll("text.ax")].filter((e) => e.getAttribute("text-anchor") === "end" && /L$|^0$/.test(e.textContent)); const out = t.filter((e) => { const b = e.getBoundingClientRect(); return b.top < h.top - 1 || b.bottom > h.bottom + 1; }).length; const lab = t.map((e) => e.textContent); return out + "|" + (new Set(lab).size === lab.length ? "unique" : lab.join(",")); }));
  ok("tiny figures: chart axis labels stay inside and don't repeat", ax.every((a) => a === "0|unique"), ax.join(" / "));
  await page.click("#npExample"); await page.waitForTimeout(200);
  ok("load example restores Marginal", (await page.textContent("#npBadge")).trim().toLowerCase() === "marginal");
  ok("no NaN anywhere with the example", !/NaN|Infinity|undefined/.test(await page.textContent("#v-newprop")));

  // CSV
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#npCsv")]);
  ok("CSV downloads", /thrive-new-property-.*\.csv$/.test(dl.suggestedFilename()), dl.suggestedFilename());

  await page.screenshot({ path: "np-desktop.png", fullPage: true });
  // phone
  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(400);
  ok("phone: no sideways scroll", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await page.evaluate(() => document.documentElement.scrollWidth));
  await page.screenshot({ path: "np-phone.png", fullPage: true });
  // dark
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(400);
  await page.screenshot({ path: "np-dark.png", fullPage: false });
  await page.emulateMedia({ colorScheme: "light" });
  // other pages still fine
  await page.click('button[data-view="desk"]'); await page.waitForTimeout(300);
  ok("back to Front desk works", await page.isVisible("#tags") && await page.isVisible("#filters"));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  const f = R.filter((x) => x.startsWith("FAIL")).length;
  return R.join("\n") + `\n\n${R.length - f} passed, ${f} failed`;
}
