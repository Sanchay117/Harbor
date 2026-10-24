# Harbor native validation · October 24, 2026

Build v1.1.0, 26,267 bytes, SHA256 `1e8f474d8581752192f892dab8ae1c40620c3bda6650ded6b977dd89302efe5e`.

The compiled standalone source was loaded into TrendSpider's Custom Indicator Editor, saved privately as **Harbor - Payout Funding Audit**, and applied as an ordinary saved chart indicator. The editor acknowledged no unsaved changes. The native compiler rejects constructors (`new`) and prototype access; the final engine uses plain numeric-keyed objects and static Date operations. The build guards those known restrictions.

## Verified live chart cases

CVX Ink/Full and Ink/Compact and NKE dividend-only were rechecked after v1.1. The older CSCO, BA and JPM screenshots document v1.0; their financial outputs are also rechecked against the v1.1 fixture suite. The revised card promotes headroom, coverage and stress remainder, with explicit net-payout scope beside them.

| Company | Observed result | Evidence |
| --- | --- | --- |
| CVX | 45.321B OCF − 18.309B fixed-asset purchases = 27.012B FCF; 23.766B net cash payout; 3.246B remainder; 1.13658× coverage. A 20% OCF decline gives −5.8182B stress remainder. | `screenshots/native-cvx-ink.png` |
| CSCO | 12.767B FCF versus 13.727B net cash payout; −0.960B remainder; 0.93006× coverage. | `screenshots/native-csco-ink.png` |
| CSCO, Paper/Compact/0% stress | The palette and narrower layout rendered. Zero stress exactly reproduced the −0.96B reported remainder. | `screenshots/native-csco-paper-compact.png` |
| NKE (v1.1) | 2.105B FCF versus 2.426B dividends; −0.321B dividend remainder; 0.86768× coverage; OCF rise needed 11.5%; 20% stress dividend remainder −0.8772B. Net payout stays unknown because equity flow is incomplete. | `screenshots/native-nke-dividend-only.png` |
| CVX Compact (v1.1) | All leading values, waterfall, remainder history and definitions fit the compact card. | `screenshots/native-cvx-ink-compact.png` |
| BA | LIMITED DATA, unknown dividend cash flow; no total-payout coverage or remainder invented. Partial operating cash and FCF remained visible. | `screenshots/native-ba-limited-data.png` |
| JPM | SECTOR OUT OF SCOPE with the bank/insurer/real-estate explanation. | `screenshots/native-jpm-out-of-scope.png` |

Native text and waterfall values matched the captured-fixture calculations. The chart indicator list was collapsed for presentation. Harbor's card offset was manually updated from the previously persisted 82px to the final source's 100px. The native platform can persist old appearance defaults across source edits.

## Native scanner verification

A new Daily scanner used **Harbor → Current payout exceeds FCF → (last) → Signal active** over **Dow Jones 30**. The completed scan returned **CAT, CRM, CSCO, MMM, SHW, V and WMT** at the time of testing. CSCO agrees with the independently reviewed chart/fixture case. The other candidates are scan results, not individually audited financial conclusions or recommended trades.

The companion was saved privately as **Harbor - Current Payout Funding Gaps**; its appearance inputs were Paper, Compact, 0. These appearance/stress inputs do not alter the reported-data condition. It has no scheduled run enabled. All three named conditions were visible in the native indicator picker. In v1.1, a separate unsaved Daily scan using only **Current dividends exceed FCF → (last) → Signal active** over Dow Jones 30 returned **NKE**. The saved gap companion was then restored without saving the temporary verification edits. Evidence: `screenshots/native-dow30-dividend-scan.png`. Evidence: `screenshots/native-dow30-gap-scan.png`.

The adapter's current conditions populate only the latest bar. Automated tests assert that all previous array elements are null. They should be used as **current Signal active** research filters, not historical events or backtest results.

## Local checks

- 15 automated tests passed. New regressions cover independent dividend readiness, native per-condition outputs, scoped duplicates, and preservation of the latest invalid OCF anchor. They include hand-worked cash identities, a negative-OCF adverse stress, quarter alignment, zero versus missing payouts, issuance, duplicates/reversals, stale/out-of-scope suppression, scaling, escaping and latest-bar-only output topology.
- Seven real native API fixtures: AAPL, MSFT, CSCO, CVX, NKE, BA, JPM. Detailed values and completeness are in `validation.json`; SHA256 hashes are in `data/manifest.json`.
- The FCF arithmetic cross-check passed for every fixture with a computed FCF. JPM is excluded before applying this ordinary-company model.
- The local page was checked on CVX and CSCO, with Ink/Paper, Full/Compact, a 50% cash decline, Nike's partial coverage and JPM's sector limit. It uses production calculations and overlay specification; its SVG waterfall is a separate local renderer.

## Material limits and publication status

This is a latest-reported snapshot, not an archived view of what was knowable at each date. Period ends and current revised data do not establish filing-availability timestamps. There are no historical performance claims. Unsupported/missing dividend or equity records do not prove the company had zero payouts. The bridge is not a full cash-balance reconciliation, and net repurchases are not gross buybacks.

The Full and Compact native cards were reviewed on a dark chart background; a complete native light-chart theme switch was not tested. The actual Store preview was verified using **CVX / Ink / Compact / 20% stress / Top Left / Above All / x48, y70**. The native preview plot is shorter than the overall image, so the y70 preview offset preserves the complete footer. Chart installations retain the source default y100 and can edit that appearance setting. Evidence: `screenshots/store-preview-ready.png`.

## Publication receipt

On **October 24, 2026**, after the user explicitly confirmed the ownership declaration and the separate Store Developer Agreement, Harbor was published as **Free for everyone**, with **See the source code** enabled and **#TSBuild26** included in the description. TrendSpider confirmed publication and displayed **Pending moderation**. Evidence: `screenshots/store-published-pending.png`.

Store URL: https://trendspider.com/trading-tools-store/indicators/6adc42-harbor-payout-funding-audit/

The native confirmation states that subscribers can use the indicator and see its source code. The public Store page initially presented a connection-security challenge, so the live public Overview/Source Code tabs and final typographic Store title were not independently inspected after publication. Public discoverability and source rendering remain subject to moderation and that final public-page check. The separate category-three hackathon form remains for the user to submit.
