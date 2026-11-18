"""One-step weekly refresh for the Thrive cash-flow dashboard.

    python tools/refresh.py                 # newest "Thrive_Weekly Cashflow *.xlsx" in the Thrive OneDrive folder
    python tools/refresh.py "path\\to\\file.xlsx"

What it does:
  1. Copies the workbook to a temp folder (never touches the original) and reads it with openpyxl.
  2. Writes data.js (window.CF) for both the dashboard and dashboard-classic.html.
  3. Decides actual vs planned weeks from the workbook's save date: a week is actual when it
     ends on or before the day the file was last saved (India time). Nothing is hardcoded.
  4. Prints what changed against the previous data.js and a check table against the raw cells.
  5. Rebuilds the "Ask Claude" artifact page if its builder folder exists (see ASK_DIR).
"""
import collections, datetime, glob, json, os, re, shutil, subprocess, sys, tempfile, calendar

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data.js")
THRIVE = r"C:\Users\Rohit SRF\Strategy Studio Labs LLP\SRF Client Database - SP-52-CFO-Thrive"
ASK_DIR = r"C:\Users\Rohit SRF\Thrive Ask the Data"
IST = datetime.timedelta(hours=5, minutes=30)
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# fixed rows of the "Cash Flow " sheet (note the trailing space in the sheet name)
R_OPEN, R_RZP_OPEN, R_IN, R_OUT, R_RZP_MOVE, R_CLOSE, R_NET, R_RZP_CLOSE = 6, 7, 10, 25, 91, 92, 94, 96
IN_ROWS = list(range(11, 21))
GROUPS = [(26, [26]), (27, [27]), (30, list(range(31, 43))), (44, list(range(45, 66))),
          (67, [68, 69, 70, 71]), (73, list(range(74, 80))), (81, list(range(82, 87))), (88, [89])]
# spend categories shown on the dashboard (by workbook row)
SPEND = [("rent", "Landlord rent", [26, 27]),
         ("stat", "Statutory dues & deposit refunds", [68, 69, 70, 71]),
         ("sal", "Salaries & professional fees", [74, 75, 76, 77, 78, 79]),
         ("fin", "Finance cost", [82, 83, 84, 85, 86]),
         ("reno", "Repairs, renovation & housekeeping", list(range(45, 66))),
         ("util", "Utilities & running costs", list(range(31, 43))),
         ("proj", "Kakatiya project", [89])]
INV = {"Furniture Payment", "Acquisition", "Appliances", "washing machine", "Kakatiya Project"}
FIN_IN = {"Company loan", "Director Loan"}
FIN_OUT = {"EMI's", "Interest Paid", "Credit card repayment", "Processing fee"}


def newest_workbook():
    files = [f for f in glob.glob(os.path.join(THRIVE, "**", "Thrive_Weekly Cashflow*.xlsx"), recursive=True)
             if not os.path.basename(f).startswith("~$")]
    if not files:
        sys.exit("No 'Thrive_Weekly Cashflow*.xlsx' found under " + THRIVE + ". Pass the file path instead.")
    def when(f):  # the date in the file name (DDMMYYYY) decides; OneDrive sync can change modified times
        mm = re.search(r"(\d{2})(\d{2})(20\d{2})", os.path.basename(f))
        d = datetime.date(int(mm.group(3)), int(mm.group(2)), int(mm.group(1))) if mm else datetime.date.min
        return (d, os.path.getmtime(f))
    return max(files, key=when)


def num(v):
    return round(float(v), 2) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0


def load_old():
    if not os.path.exists(OUT):
        return None
    s = open(OUT, encoding="utf-8").read()
    try:
        return json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))
    except Exception:
        return None


def extract(src):
    tmp = os.path.join(tempfile.mkdtemp(), "cf.xlsx")
    shutil.copy2(src, tmp)
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
    saved_utc = wb.properties.modified or datetime.datetime.utcfromtimestamp(os.path.getmtime(src))
    saved = saved_utc + IST
    ws = wb["Cash Flow "]
    R = [list(r) + [None] * (220 - len(r)) for r in ws.iter_rows(min_row=1, max_row=100, values_only=True)]
    g = lambda r, c: R[r - 1][c - 1]
    lab = lambda r: re.sub(r"\s+", " ", str(g(r, 1) or "")).strip()

    heads = []
    for r in IN_ROWS:
        L = lab(r)
        act = "Financing" if L in FIN_IN else "Investing" if L.startswith("Reimbursement (Kakatiya") else "Operating"
        heads.append(dict(id="r%d" % r, row=r, name=L, dir="in", group="Inflows", act=act, grp=""))
    for gr, leaves in GROUPS:
        for r in leaves:
            L = lab(r)
            act = "Investing" if L in INV else "Financing" if L in FIN_OUT else "Operating"
            grp = next((k for k, _, rows in SPEND if r in rows), "")
            heads.append(dict(id="r%d" % r, row=r, name=L, dir="out", group=lab(gr), act=act, grp=grp))

    tot = [c for c in range(2, 220) if str(g(5, c)).strip() == "Total"]

    def col(c):
        d = dict(open=num(g(R_OPEN, c)), inflow=num(g(R_IN, c)), outflow=num(g(R_OUT, c)), rzp=num(g(R_RZP_MOVE, c)),
                 close=num(g(R_CLOSE, c)), net=num(g(R_NET, c)), rzpOpen=num(g(R_RZP_OPEN, c)), rzpClose=num(g(R_RZP_CLOSE, c)),
                 v={h["id"]: num(g(h["row"], c)) for h in heads if num(g(h["row"], c)) != 0})
        d["chkIn"] = round(d["inflow"] - sum(num(g(r, c)) for r in IN_ROWS), 2)
        d["chkOut"] = round(d["outflow"] - sum(num(g(r, c)) for _, ls in GROUPS for r in ls), 2)
        return d

    months, weeks, prev = [], [], 1
    y0 = 2024
    for i, t in enumerate(tot):
        key = "%d-%02d" % (y0 + i // 12, i % 12 + 1)
        y, m = int(key[:4]), int(key[5:])
        mo = dict(key=key, col=t, **col(t)); mo["weeks"] = []
        for c in range(max(prev + 1, 5), t):
            days = str(g(4, c) or "").strip()
            mm = re.match(r"(\d{1,2})\s*-\s*(\d{1,2})", days) or re.match(r"(\d{1,2})", days)
            d1 = int(mm.group(1)) if mm else 1
            d2 = int(mm.group(2)) if mm and mm.lastindex and mm.lastindex >= 2 else d1
            d2 = min(d2, calendar.monthrange(y, m)[1])
            start, end = datetime.date(y, m, d1), datetime.date(y, m, d2)
            actual = end <= saved.date()
            w = dict(key=key, label=str(g(5, c)).strip(), days=days, start=start.isoformat(), end=end.isoformat(),
                     actual=actual, status="Actual" if actual else "Projection", col=c, **col(c))
            weeks.append(w); mo["weeks"].append(len(weeks) - 1)
        ws_ = [weeks[j] for j in mo["weeks"]]
        mo["actual"] = all(w["actual"] for w in ws_) if ws_ else datetime.date(y, m, calendar.monthrange(y, m)[1]) <= saved.date()
        mo["status"] = "Actual" if mo["actual"] else ("Partly projected" if any(w["actual"] for w in ws_) else "Projection")
        months.append(mo); prev = t

    issues = []
    for mo in months:
        if mo["weeks"]:
            for f in ("inflow", "outflow"):
                s = sum(weeks[j][f] for j in mo["weeks"])
                if abs(s - mo[f]) > 1:
                    issues.append(dict(month=mo["key"], kind="Weeks vs month total",
                                       text="%s: weekly %s add to %.0f but the month's Total column shows %.0f" % (mo["key"], f, s, mo[f]),
                                       amount=round(mo[f] - s)))
        if abs(mo["chkIn"]) > 1:
            issues.append(dict(month=mo["key"], kind="Inflow subtotal", text="Inflows subtotal does not equal the sum of inflow heads", amount=round(mo["chkIn"])))
        if abs(mo["chkOut"]) > 1:
            issues.append(dict(month=mo["key"], kind="Outflow subtotal", text="Outflows subtotal does not equal the sum of outflow heads", amount=round(mo["chkOut"])))
    for a, b in zip(weeks, weeks[1:]):
        if abs(b["open"] - a["close"]) > 1:
            issues.append(dict(month=b["key"], kind="Opening differs from prior closing",
                               text="%s opens %.0f away from the previous week's closing" % (b["label"], b["open"] - a["close"]),
                               amount=round(b["open"] - a["close"])))
    memo = {"dup": {mo["key"]: num(g(27, mo["col"])) for mo in months if num(g(27, mo["col"]))},
            "accrRev": {mo["key"]: num(g(22, mo["col"])) for mo in months if num(g(22, mo["col"]))}}

    # transactions
    names = {h["name"].strip().lower(): h["id"] for h in heads}
    hid = lambda cat: names.get(str(cat).strip().lower(), "") if cat else ""

    def iso(v):
        if isinstance(v, datetime.datetime): return v.strftime("%Y-%m-%d")
        if isinstance(v, str):
            mm = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", v.strip())
            if mm: return "%s-%02d-%02d" % (mm.group(3), int(mm.group(2)), int(mm.group(1)))
        return ""
    tx = []
    for r in wb["Bank Statements FY 24-26"].iter_rows(min_row=5, values_only=True):
        if not isinstance(r[5], (int, float)) or not isinstance(r[1], datetime.datetime): continue
        sign = 1 if str(r[4]).strip().upper() == "CR" else -1
        cat = str(r[7]).strip() if r[7] else ""
        tx.append([r[1].strftime("%Y-%m"), iso(r[2]), "B", (str(r[3]) or "").strip()[:80], round(sign * r[5], 2), cat, hid(cat), (str(r[8]).strip() if r[8] else "")])
    for r in wb["Razorpay statements"].iter_rows(min_row=5, values_only=True):
        if not isinstance(r[4], (int, float)) or not isinstance(r[1], datetime.datetime): continue
        cat = str(r[5]).strip() if r[5] else ""
        desc = " · ".join(str(x).strip() for x in (r[6], r[8]) if x)
        tx.append([r[1].strftime("%Y-%m"), "", "R", desc[:80], round(-r[4], 2), cat, hid(cat), (str(r[9]).strip() if r[9] else "")])
    tx.sort(key=lambda t: (t[0], t[1]))

    # landlords: monthly columns start at E with March 2025; read headers until "Comparsion"/blank
    ll = list(wb["Landlord Rent Payments"].iter_rows(values_only=True))
    hdr = list(ll[0])
    ncols = 0
    for v in hdr[4:]:
        if v is None or str(v).strip().lower().startswith(("compar", "o/s")): break
        ncols += 1
    lmonths = ["%d-%02d" % (2025 + (2 + i) // 12, (2 + i) % 12 + 1) for i in range(ncols)]
    landlords = []
    for r in ll[1:]:
        if r[1] and r[2] and isinstance(r[1], str):
            prop = re.sub(r"\s*Rent$", "", str(r[2]).strip())
            prop = {"One": "Thrive One", "Zero": "Thrive Zero", "DLF": "Thrive DLF", "Rosa": "Thrive Rosa"}.get(prop, prop)
            prop = prop if prop.startswith("Thrive") else "Thrive " + prop
            landlords.append(dict(name=re.sub(r"\s*Rent$", "", str(r[1]).strip()), property=prop, pay=[num(x) for x in r[4:4 + ncols]]))

    for x in months + weeks:
        x.pop("chkIn"); x.pop("chkOut")
    act = [w for w in weeks if w["actual"]]
    meta = dict(source=os.path.basename(src), saved=saved.strftime("%Y-%m-%dT%H:%M"),
                asOf=act[-1]["end"] if act else None, lastActualWeek=act[-1]["label"] if act else None,
                generated=datetime.datetime.now().strftime("%Y-%m-%dT%H:%M"), spend=[dict(id=k, name=n, rows=rows) for k, n, rows in SPEND])
    data = dict(meta=meta, source=meta["source"], generated=meta["generated"][:10], heads=heads, months=months, weeks=weeks,
                issues=issues, memo=memo, tx=tx, landlords=dict(months=lmonths, rows=landlords))
    return data, R


def L(v):
    return "%+.2f L" % (v / 1e5)


def report(old, new, R):
    print("\nSource:", new["meta"]["source"], "| saved", new["meta"]["saved"], "IST | actuals through", new["meta"]["lastActualWeek"],
          "(ends", new["meta"]["asOf"] + ")")
    if old:
        ow = {(w["key"], w["label"]): w for w in old["weeks"]}
        H = {h["id"]: h["name"] for h in new["heads"]}
        print("\nWhat changed since the last refresh (", old.get("source"), "):")
        n = 0
        for w in new["weeks"]:
            o = ow.get((w["key"], w["label"]))
            if not o:
                print("  new week:", w["label"], "Actual" if w["actual"] else "Planned"); n += 1; continue
            ost = o.get("actual", o.get("status") == "Actual")
            if ost != w["actual"]:
                print("  %s is now %s" % (w["label"], "actual" if w["actual"] else "planned")); n += 1
            hv = {k: w["v"].get(k, 0) - o["v"].get(k, 0) for k in set(w["v"]) | set(o["v"])}
            hv = {k: v for k, v in hv.items() if abs(v) > 0.5}
            if hv:
                n += 1
                print("  %s (%s): %s" % (w["label"], "actual" if w["actual"] else "planned",
                                          "; ".join("%s %s" % (H.get(k, k), L(v)) for k, v in sorted(hv.items(), key=lambda x: -abs(x[1])))))
        print("  transactions: %d -> %d" % (len(old.get("tx", [])), len(new["tx"])))
        if old.get("landlords") != new["landlords"]: print("  landlord rent sheet changed")
        if not n: print("  no figure changed")
    # check table against the raw cells
    act = [w for w in new["weeks"] if w["actual"]]
    lw = act[-1]
    lm = next(m for m in new["months"] if m["key"] == lw["key"])
    g = lambda r, c: num(R[r - 1][c - 1])
    print("\nCheck against the Excel cells (Cash Flow sheet rows 6, 10, 25, 92):")
    print("  %-28s %14s %14s %14s %14s" % ("", "Opening", "Inflows", "Outflows", "Closing"))
    fm = [m for m in new["months"] if m["actual"]][-1]
    rows = [("Week " + lw["label"] + " (file)", lw), ("Week (data.js)", lw),
            ("Month " + fm["key"] + " (file)", fm), ("Month (data.js)", fm)]
    if lm is not fm:
        rows += [("Month " + lm["key"] + " part-plan (file)", lm), ("Month part-plan (data.js)", lm)]
    for name, x in rows:
        if "(file)" in name:
            c = x["col"]; vals = (g(R_OPEN, c), g(R_IN, c), g(R_OUT, c), g(R_CLOSE, c))
        else:
            vals = (x["open"], x["inflow"], x["outflow"], x["close"])
        print("  %-28s %14s %14s %14s %14s" % ((name,) + tuple("{:,.2f}".format(v) for v in vals)))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else newest_workbook()
    print("Workbook:", src)
    old = load_old()
    data, R = extract(src)
    js = "window.CF=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";"
    open(OUT, "w", encoding="utf-8").write(js)
    print("Wrote", OUT, "- %d months, %d weeks (%d actual), %d transactions" % (
        len(data["months"]), len(data["weeks"]), sum(w["actual"] for w in data["weeks"]), len(data["tx"])))
    report(old, data, R)
    b = os.path.join(ASK_DIR, "build.py")
    if os.path.exists(b):
        print("\nRebuilding the Ask Claude page ...")
        subprocess.run([sys.executable, "-I", b, OUT], check=False)
    print("\nNext: open the dashboard locally, check the figures, then commit and push (see WEEKLY-UPDATE.md).")


if __name__ == "__main__":
    main()
