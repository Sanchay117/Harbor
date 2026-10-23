# Harbor native validation · October 24, 2026

Build v1.0.0, 23,626 bytes, SHA256 `055346faa992f5d981e6adc9ac783a6584c34291ed529817bbfbf9e19fdcf6f0`.

The compiled standalone source was loaded into TrendSpider's Custom Indicator Editor, saved privately as **Harbor - Payout Funding Audit**, and applied as an ordinary saved chart indicator. The editor acknowledged no unsaved changes. The native compiler rejects constructors (`new`) and prototype access; the final engine uses plain numeric-keyed objects and static Date operations. The build guards those known restrictions.

## Verified live chart cases

| Company | Observed result | Evidence |
| --- | --- | --- |
| CVX | 45.321B OCF − 18.309B fixed-asset purchases = 27.012B FCF; 23.766B net cash payout; 3.246B remainder; 1.13658× coverage. A 20% OCF decline gives −5.8182B stress remainder. | `screenshots/native-cvx-ink.png` |
| CSCO | 12.767B FCF versus 13.727B net cash payout; −0.960B remainder; 0.93006× coverage. | `screenshots/native-csco-ink.png` |
| CSCO, Paper/Compact/0% stress | The palette and narrower layout rendered. Zero stress exactly reproduced the −0.96B reported remainder. | `screenshots/native-csco-paper-compact.png` |
| BA | LIMITED DATA, unknown dividend cash flow; no total-payout coverage or remainder invented. Partial operating cash and FCF remained visible. | `screenshots/native-ba-limited-data.png` |
| JPM | SECTOR OUT OF SCOPE with the bank/insurer/real-estate explanation. | `screenshots/native-jpm-out-of-scope.png` |

Native text and waterfall values matched the captured-fixture calculations. The chart indicator list was collapsed for presentation. Harbor's card offset was manually updated from the previously persisted 82px to the final source's 100px. The native platform can persist old appearance defaults across source edits.

## Native scanner verification

A new Daily scanner used **Harbor → Current payout exceeds FCF → (last) → Signal active** over **Dow Jones 30**. The completed scan returned **CAT, CRM, CSCO, MMM, SHW, V and WMT** at the time of testing. CSCO agrees with the independently reviewed chart/fixture case. The other candidates are scan results, not individually audited financial conclusions or recommended trades.

The companion was saved privately as **Harbor - Current Payout Funding Gaps**; its appearance inputs were Paper, Compact, 0. These appearance/stress inputs do not alter the reported-data condition. It has no scheduled run enabled. All three named conditions were visible in the native indicator picker. Only the payout-gap condition was run end to end in this verification. Evidence: `screenshots/native-dow30-gap-scan.png`.

The adapter's current conditions populate only the latest bar. Automated tests assert that all previous array elements are null. They should be used as **current Signal active** research filters, not historical events or backtest results.

## Local checks

- 12 automated tests passed. They include hand-worked cash identities, a negative-OCF adverse stress, quarter alignment, zero versus missing payouts, issuance, duplicates/reversals, stale/out-of-scope suppression, scaling, escaping and latest-bar-only output topology.
- Seven real native API fixtures: AAPL, MSFT, CSCO, CVX, NKE, BA, JPM. Detailed values and completeness are in `validation.json`; SHA256 hashes are in `data/manifest.json`.
- The FCF arithmetic cross-check passed for every fixture with a computed FCF. JPM is excluded before applying this ordinary-company model.
- The local page was checked on CVX and CSCO, with Ink/Paper, Full/Compact, a 50% cash decline, Nike's partial coverage and JPM's sector limit. It uses production calculations and overlay specification; its SVG waterfall is a separate local renderer.

## Material limits and publication status

This is a latest-reported snapshot, not an archived view of what was knowable at each date. Period ends and current revised data do not establish filing-availability timestamps. There are no historical performance claims. Unsupported/missing dividend or equity records do not prove the company had zero payouts. The bridge is not a full cash-balance reconciliation, and net repurchases are not gross buybacks.

The Full and Compact native cards were reviewed on a dark chart background; a complete native light-chart theme switch was not tested. Store publication preview and public source availability must be checked during publication. The default card dimensions/offset target the Store's 1000×525 preview, but no legal/IP publication confirmations were accepted by the agent.

**Harbor remains private and unsubmitted.** Store description and final-form copy are prepared in `submission/`. User review, Store publication/moderation, and the separate category-three submission form remain.
