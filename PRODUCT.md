# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Static HTML/CSS/JS on GitHub Pages (repo `rohitarjun1020/thrive-cashflow-weekly`, Pages from `main` /). One page plus a generated data file. Free CDNs and Google Fonts only; no paid fonts, images, hosting or API keys. Python 3.12 + openpyxl does the extraction from the client's workbook.

## Users
- Owners / CFO of Thrive Living (Thrivescape Ventures Pvt Ltd), a PG / co-living operator in Hyderabad (properties: Thrive One, Hidden House and Dwellings in Gachibowli, Rosa in Hitec City, Zero in Kondapur). They hold the live link.
- Strategy Studio Labs' outsourced CFO team, who refresh it weekly and present it in reviews.
- Other prospective clients of Strategy Studio Labs: the dashboard is also a showcase example.
Situation: weekly cash review on a laptop or phone, sometimes a projector or a printed PDF. Non-technical readers.

## Product Purpose
Answer "where does cash stand this week, what is coming, and what needs attention" from the client's weekly cash-flow workbook, without opening Excel. Includes a one-line verdict, a watch list, a what-if simulator, built-in "Ask AI" answers computed from the data (no AI service), a link to a private claude.ai artifact for free-form questions, and a passcode screen.

## Operating Context
Source: the weekly "Thrive_Weekly Cashflow DDMMYYYY.xlsx" in the Thrive client OneDrive folder. Sheet "Cash Flow " (trailing space): weekly columns with monthly Total columns, Jan 2024 onward; plus "Bank Statements FY 24-26", "Razorpay statements", "Landlord Rent Payments". Actual vs planned weeks are decided by the file's save date (a week is actual if it ends on or before that date), never hardcoded. The ICICI account is overdrawn at most month-ends.

## Capabilities and Constraints
- Every figure comes from the workbook; no estimates, no invented budget/forecast/customer data.
- Status on figures: Actual / Planned / Overdrawn.
- The live link and its `#from=…&to=…&cat=…&min=…&proj=…` settings must keep working.
- What-if with no changes must reproduce the plan exactly.
- Passcode gate (SHA-256 in code, remembered per device) only keeps casual visitors out; not real security on a public site.
- Operating / investing / financing mapping is a proposed classification, labelled as such.
- INR in lakh / crore, Indian digit grouping.

## Brand Commitments
- Thrive's own presence: bold "THRIVE" wordmark, charcoal, tagline "Find your happy place!", light-filled rooms, green shared spaces, casual friendly tone.
- English only; no language switch. No emoji icons. Modest type sizes (user found 44px titles "zoomed in"). Rejected: generic Poppins + serif capitals, decoration without meaning.
- Theme details never sit behind numbers.

## Product Principles
1. Truth over polish: every number traces to a workbook row.
2. Actual and planned are never confused.
3. Readable on a phone, a laptop, a projector and paper.
4. Green and red mean gain and loss, nothing else.

## Accessibility & Inclusion
Keyboard operable; light and dark; colour never the only signal for gain/loss/overdrawn; charts drawn to scale with readable labels.
