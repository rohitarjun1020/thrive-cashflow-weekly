# Weekly update checklist

Do this each week after the new `Thrive_Weekly Cashflow DDMMYYYY.xlsx` is saved in the Thrive OneDrive folder
(`SRF Client Database - SP-52-CFO-Thrive\<year>\<month>\Financial Control\Cash Flow`).

The easiest way: open Claude Code in this folder and say **"Run the weekly Thrive refresh"**. Claude will do every step below.

## 1. New file → data (one command)

```
python tools/refresh.py
```

- It picks the newest file by the date in its name (or pass a path: `python tools/refresh.py "C:\...\Thrive_Weekly Cashflow 18112026.xlsx"`).
- It never changes the Excel file; it reads a temporary copy.
- Weeks that ended on or before the file's save date become **Actual**; later weeks are **Planned**.
- It prints two things to read:
  - **What changed** since last week (new actual weeks, changed planned lines, transaction count).
  - **Check table**: opening, money in, money out and closing for the latest actual week and month,
    file cell vs dashboard figure. Every row must say they match. If one doesn't, stop and ask.

## 2. Data → dashboard

Nothing to do: `index.html` (Front Desk) and `dashboard-classic.html` both read the new `data.js`.
Optional local look: `python -m http.server 8741` in this folder, then open http://127.0.0.1:8741/.

Optional full test (needs playwright-cli):

```
playwright-cli open about:blank
playwright-cli run-code "$(cat tools/test-dashboard.js)"
```

It should end with `0 failed`.

## 3. Data → chatbots

- **Ask AI** (the tab on the dashboard): nothing to do, it reads `data.js`.
- **Ask Claude** (private claude.ai page): `refresh.py` already rebuilt it in
  `C:\Users\Rohit SRF\Thrive Ask the Data\dist\`. Ask Claude:
  **"Publish the Thrive Ask the Data page"**. It keeps the same link:
  https://claude.ai/artifact/R8gTMHXmcD2ymPSeBSErmQ

## 4. Push live

```
git add data.js
git commit -m "Weekly data: <file name>"
git push
```

GitHub Pages updates https://rohitarjun1020.github.io/thrive-cashflow-weekly/ in a minute or two.
Open it, check the date line under the verdict says the new file, and you're done.

## Passcode

The placeholder passcode is set in `assets/app.js` as a SHA-256 hash (`PASS_HASH`).
To change it, ask Claude: "Change the Thrive dashboard passcode". This is a privacy screen, not real security:
the site is public and the figures can still be read from `data.js` by anyone who knows where to look.
