describe_indicator('Harbor - Payout Funding Audit', 'price', { shortName: 'HARBOR' });
const harborTheme = input('Palette', 'Ink', ['Ink', 'Paper']);
const harborSize = input('Layout', 'Full', ['Full', 'Compact']);
const harborStressDrop = input.number('OCF stress drop %', 20, { min: 0, max: 50, step: 5 });
let harborResponse;
try { harborResponse = await request.fundamental(current.ticker, HARBOR_METRICS, 12); }
catch (harborFetchError) { harborResponse = { error: 'request failed' }; }
const harborSnapshot = calculateHarbor(harborResponse, { ticker: current.ticker, assetType: current.assetType,
  sector: current.sector, industry: current.industry, stress: harborStressDrop });
paint_overlay('Harbor audit', { position: 'top_left', offset_x: 48, offset_y: 100, order: 'above_all' },
  buildHarborOverlay(harborSnapshot, { theme: harborTheme, compact: harborSize === 'Compact' }));
// Current-snapshot scanner conditions only. No point-in-time availability data is
// supplied by this endpoint; never backfill them on historical bars.
for (const harborCondition of [
  ['Current payout covered by FCF', harborSnapshot.flags.covered, harborSnapshot.conditionReady.netPayout],
  ['Current payout exceeds FCF', harborSnapshot.flags.gap, harborSnapshot.conditionReady.netPayout],
  ['Current dividends exceed FCF', harborSnapshot.flags.dividendsAtRisk, harborSnapshot.conditionReady.dividends]
]) {
  const harborFlag = close.map(() => null);
  if (harborFlag.length) harborFlag[harborFlag.length - 1] = harborCondition[2] ? (harborCondition[1] ? 1 : 0) : null;
  register_signal(harborFlag, harborCondition[0]);
}
