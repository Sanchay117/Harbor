# Harbor · Payout Funding Audit

**Are net cash payouts covered by the business?** Harbor follows operating cash through fixed investment, dividends and net repurchases, then lets a trader test an operating-cash decline with investment and payouts held fixed. It identifies a concrete research question rather than inventing a quality score or fair-value target.

Category: **Best Fundamental Analysis Indicator**. Original implementation, MIT, `#TSBuild26`. Saved privately in TrendSpider for review; **not published or submitted**.

## Open the build

- Native indicator: [`dist/harbor.trendspider.js`](dist/harbor.trendspider.js).
- Interactive local review: `npm run preview`, then [open Harbor](http://127.0.0.1:8767/preview/).
- Evidence: [`review/NATIVE-QA.md`](review/NATIVE-QA.md), [`review/validation.json`](review/validation.json), and `screenshots/`.
- Publication copy: [`submission/store-description.md`](submission/store-description.md).

Node 20+ and Python 3 are sufficient; no npm dependencies or API keys are required. Run `npm run build`, `npm test`, and `npm run qa` to reproduce the build and local checks. Build hashes are in `dist/build.json`. The review page uses exactly the production engine and table specification, with a local SVG renderer for the waterfall. Native rendering is validated separately.

## What the numbers mean

Each TTM flow sums four consecutive fiscal quarters. All fields are joined by fiscal year, fiscal quarter and **identical period end**, never by array index.

1. FCF proxy = operating cash flow − purchases of fixed assets. The provider’s FCF is an independent cross-check when available. This does not include every possible form of reinvestment.
2. Net repurchases = max(0, −TTM cash from repurchase/issuance of equity). This is a **net** measure; cash issuance offsets repurchases. It is not gross buybacks and not a measure of shares retired.
3. Net cash payout = dividends + net repurchases. When net equity cash is positive, the amount raised is shown separately and does not inflate operating funding capacity.
4. Remainder = FCF proxy − net cash payout. It is **not the change in cash**: acquisitions, other investing/financing flows and debt principal are outside this bridge.
5. Payout coverage = FCF proxy / net cash payout, only for a positive payout denominator. Explicit zero payout is a separate state; missing records are unknown.
6. Stress operating cash = OCF − |OCF| × stress%. Negative operating cash becomes more negative under an adverse stress. Capex and payouts are held fixed. The stress remainder is a sensitivity calculation, not a forecast.
7. Headroom, when OCF > 0, is remainder / OCF. A positive value is the operating-cash decline that reaches zero remainder; a negative value expresses the operating-cash increase needed to close the gap.

All cash amounts use a shared scale (B, M or units) in the provider’s reporting currency. No currency conversion or stock-price valuation is performed. Cash and debt are balance-sheet snapshots at the ending quarter; they are never summed. Shares YoY compares balance-sheet shares at the same fiscal quarter a year earlier; acquisitions, splits and compensation may affect it.

## Use on a chart

Apply **Harbor - Payout Funding Audit** to a company equity. Ink/Paper and Full/Compact control appearance; OCF stress drop controls the hypothetical decline from 0–50%. The default is 20%. Collapse the chart’s indicator legend for a clean view. New installations place the card 48 px from the left and 100 px below the top; an existing native style may retain an older offset, which can be edited through Harbor audit → EDIT.

The leading figures show OCF headroom (or the rise needed to close a gap), coverage and stress remainder. Full adds FCF and net-payout history rows; Compact retains the remainder history and fits the Store preview. Start with the reported coverage and remainder, inspect the TTM comparison table, then increase the stress. A funding gap identifies statements to investigate; it does not establish a dividend cut, insolvency, a source of financing, or a trade. The separate cash/debt/borrowing context helps frame that research without asserting causation.

Three current-state conditions are registered: **Current payout covered by FCF**, **Current payout exceeds FCF**, and **Current dividends exceed FCF**. Only the latest bar is populated; every historical bar is null. Use **Signal active** on the current/last bar for research scans, not historical events or backtests. A private companion, **Harbor - Current Payout Funding Gaps**, was saved and run successfully over the Dow 30. A separate unsaved dividend-only verification scan returned NKE after the v1.1 fix; the saved gap scanner was restored. See the QA report for the scope of verification.

## Data boundaries

The endpoint supplies fiscal period ends, not a reliable timestamp at which each filing became publicly available. It may contain revised history. Harbor therefore displays a **latest reported snapshot**, including its period end, and compares TTM periods using the current dataset. It never draws backdated event signals or claims point-in-time performance. Historical candles or replay do not turn this into a historical snapshot.

- Four aligned quarters are required for the net-payout classification. Missing dividend or equity-flow records are never inferred as zero. With complete OCF, capex and dividend inputs, the dividend-only audit remains available if equity flows are missing; net payout remains unknown. Other partial inputs show LIMITED DATA.
- Invalid or duplicate records affect only dependent fields and TTM windows; an old optional duplicate does not suppress current valid flags. A duplicate latest OCF period cannot silently fall back to an older headline. Unsupported signed cash-flow records suppress dependent current flags. Capex and dividend outflows must be nonpositive in this provider convention; positive reversals are explicitly flagged for review.
- Period ends over 200 days old suppress current flags. This age is measured from **period end**, not filing date.
- Banks, insurers and real estate are deliberately excluded because ordinary industrial-company FCF is an unsuitable payout lens for them. Other equities still require the stated coverage.
- A coverage ratio is not a payout-safety probability or credit rating. Fixed-asset purchases do not distinguish maintenance from growth investment.

## Validation and provenance

Fifteen automated tests check hand-calculated receipts, adverse stress with negative OCF, fiscal alignment, missing/zero data, cash issuance, sector exclusions, staleness, duplicates and reversals, cash scaling, escaping, and latest-bar-only adapter outputs. Seven real quarterly fixtures were captured from `request.fundamental` in TrendSpider’s visible editor console on October 24, 2026. `data/manifest.json` records hashes; fixture sector labels used in the batch review are documented as manually supplied context.

The public-entry comparison is in [`review/COMPETITION.md`](review/COMPETITION.md). It is a focused review, not proof of uniqueness or a prediction of ranking. This category weights Trading Usefulness at 60% and Execution at 40%; it does not use the Buy/Sell category’s Sharpe gate.

Sources: [official category and rules](https://trendspider.com/hackathon/), [judging rubric](https://drt8s3xkrl8yg.cloudfront.net/1/assets/pdf/hackathon/2026_How_You_Are_Judged.pdf), [scripting API](https://platform-docs.trendspider.com/scripting/docs/), and [fundamental metric definitions](https://help.trendspider.com/kb/other-data-types/fundamentals).
