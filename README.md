# Thrive Living – weekly cash-flow dashboard

Static dashboard for Thrivescape Ventures (Thrive Living, Hyderabad), built from the weekly
`Thrive_Weekly Cashflow DDMMYYYY.xlsx` workbook. Live at https://rohitarjun1020.github.io/thrive-cashflow-weekly/.

- `index.html` + `assets/`: the "Front Desk" dashboard (v2)
  - `assets/model.js`: all figures and logic (periods, totals, verdict, watch list, landlords, what-if)
  - `assets/charts.js`: hand-drawn SVG charts
  - `assets/ask.js`: Ask AI, the built-in question answering (no AI service, nothing sent anywhere)
  - `assets/property.js`: New property feasibility maths (pure; hand-checked by `node tools/test-property.js`)
  - `assets/property-ui.js`: the New property page (inputs saved in the browser only, key `thrive.newprop`)
  - `assets/app.js`, `assets/app.css`: the page
- `dashboard-classic.html` + `classic/`: the previous version, kept as-is
- `data.js`: figures extracted from the workbook (no estimates)
- `tools/refresh.py`: one-step weekly refresh (see `WEEKLY-UPDATE.md`)
- `tools/test-dashboard.js`, `tools/test-newprop.js`: browser checks (playwright-cli)
- `vendor/`: Apache ECharts 5.5.1 for the classic page (Apache-2.0, see `vendor/ECHARTS-LICENSE.txt`)
- `fonts/`: Public Sans for the classic page (SIL OFL, see `fonts/OFL.txt`); the new page uses Archivo from Google Fonts

The passcode screen is a privacy screen, not security: the site is public.

The private "Ask Claude" page is built outside this repo, in `C:\Users\Rohit SRF\Thrive Ask the Data`.
