const HARBOR_COLORS = Object.freeze({
  Ink: { bg: '#101e29', card: '#172a37', text: '#eff5f4', muted: '#a6bdc7', border: '#304955', teal: '#65dbc6', blue: '#8dbafa', amber: '#f0c178', red: '#f39194', grid: '#2c4350' },
  Paper: { bg: '#f6f3eb', card: '#eaece5', text: '#183b43', muted: '#526b73', border: '#becdc9', teal: '#087b68', blue: '#315f9f', amber: '#926214', red: '#a13f4c', grid: '#dce2db' }
});
const HARBOR_NAMES = Object.freeze({ net_cash_operating_activities: 'operating cash', purchase_fixed_assets: 'fixed-asset purchases', dividends_paid: 'dividend cash flow', cash_from_repurchase_equity: 'equity cash flow' });
function harborEscape(harborText) {
  return String(harborText).replace(/[&<>"']/g, harborChar => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[harborChar]);
}
function harborNumber(harborValue, harborScale, harborSigned = false) {
  return harborValue === null || !Number.isFinite(harborValue) ? 'N/A' : (harborSigned && harborValue > 0 ? '+' : '') + (harborValue / harborScale).toFixed(2);
}
function harborPeriod(harborPeriod) {
  return harborPeriod ? 'FY' + String(harborPeriod.year).slice(-2) + ' Q' + harborPeriod.quarter : '—';
}
function harborWaterfall(harborModel) {
  const harborCurrent = harborModel.latest;
  if (!harborCurrent) return [];
  const harborAfterDividend = harborCurrent.fcf !== null && harborCurrent.dividends !== null ? harborCurrent.fcf - harborCurrent.dividends : null;
  return [
    { label: 'Operating cash', short: 'OCF', from: 0, to: harborCurrent.ocf, value: harborCurrent.ocf, kind: 'total' },
    { label: 'Fixed investment', short: 'Capex', from: harborCurrent.ocf, to: harborCurrent.fcf, value: harborCurrent.capex === null ? null : -harborCurrent.capex, kind: 'use' },
    { label: 'Free cash flow¹', short: 'FCF¹', from: 0, to: harborCurrent.fcf, value: harborCurrent.fcf, kind: 'total' },
    { label: 'Dividends', short: 'Div.', from: harborCurrent.fcf, to: harborAfterDividend, value: harborCurrent.dividends === null ? null : -harborCurrent.dividends, kind: 'use' },
    { label: 'Net repurchases²', short: 'Net rep.²', from: harborAfterDividend, to: harborCurrent.residual, value: harborCurrent.repurchases === null ? null : -harborCurrent.repurchases, kind: 'use' },
    { label: 'Remainder', short: 'Left over', from: 0, to: harborCurrent.residual, value: harborCurrent.residual, kind: 'result' }
  ];
}
function buildHarborOverlay(harborModel, harborOptions = {}) {
  const harborPalette = HARBOR_COLORS[harborOptions.theme] || HARBOR_COLORS.Ink;
  const harborCompact = harborOptions.compact === true;
  const harborWidth = harborCompact ? 570 : 690;
  const harborInner = harborWidth - 24;
  const harborRows = [];
  const harborCell = (harborText, harborStyle = {}) => ({ text: harborText, padding: '3px 12px', fontSize: '10px', lineHeight: '12px', ...harborStyle });
  const harborTone = !harborModel.ready ? harborPalette.amber : harborModel.flags.gap ? harborPalette.red : harborPalette.teal;
  harborRows.push({ cells: [{ padding: '8px 12px 2px', table: { width: '100%', rows: [{ cells: [
    { text: 'H A R B O R', fontSize: '23px', fontFamily: 'Georgia,serif', lineHeight: '28px', padding: 0, width: '155px' },
    { text: 'PAYOUT FUNDING AUDIT', fontSize: '11px', lineHeight: '14px', textAlign: 'right', verticalAlign: 'middle', padding: 0, color: harborPalette.muted }
  ] }] } }] });
  harborRows.push({ cells: [harborCell(harborEscape(harborModel.ticker) + ' &nbsp;·&nbsp; LATEST REPORTED SNAPSHOT &nbsp;·&nbsp; ' + harborEscape(harborModel.status), { color: harborTone, fontSize: '10px', fontWeight: 'bold', paddingBottom: '7px' })] });
  if (!harborModel.latest) {
    harborRows.push({ cells: [harborCell(harborEscape(harborModel.message), { padding: '12px', fontSize: '12px' })] });
  } else {
    const harborLatest = harborModel.latest;
    const harborMagnitude = Math.max(1, ...[harborLatest.ocf, harborLatest.capex, harborLatest.payout, harborLatest.cash, harborLatest.debt].filter(harborValue => harborValue !== null).map(Math.abs));
    const harborScale = harborMagnitude >= 1e9 ? 1e9 : harborMagnitude >= 1e6 ? 1e6 : 1;
    const harborUnit = harborScale === 1e9 ? 'B' : harborScale === 1e6 ? 'M' : 'units';
    const harborFmt = (harborValue, harborSigned = false) => harborNumber(harborValue, harborScale, harborSigned) + (harborValue !== null ? harborUnit : '');
    const harborLegs = harborWaterfall(harborModel);
    const harborColor = harborLeg => harborLeg.kind === 'use' ? harborPalette.amber : harborLeg.to !== null && harborLeg.to < 0 ? harborPalette.red : harborLeg.kind === 'result' ? harborPalette.teal : harborPalette.blue;
    const harborLeftWidth = harborCompact ? 355 : 445;
    const harborChart = { type: 'bar', width: harborLeftWidth + 'px', height: '110px',
      data: { labels: harborLegs.map(harborLeg => harborLeg.short), datasets: [{
        data: harborLegs.map(harborLeg => harborLatest.signs.length || harborLeg.from === null || harborLeg.to === null ? null : [harborLeg.from / harborScale, harborLeg.to / harborScale]),
        backgroundColor: harborLegs.map(harborColor), borderWidth: 0, borderRadius: 2, barPercentage: 0.7
      }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false, grid: { display: false } },
          y: { grid: { color: harborPalette.grid }, ticks: { color: harborPalette.muted, font: { size: 9 } }, beginAtZero: true } }
      } };
    const harborCoverage = !harborLatest.valid ? 'N/A' : harborLatest.payout === 0 ? 'NO PAYOUT' : harborLatest.coverage.toFixed(2) + '×';
    const harborStressValue = harborLatest.valid ? harborFmt(harborModel.scenario.residual, true) : 'N/A';
    const harborSide = { width: '100%', rows: [
      { cells: [harborCell('FCF / NET CASH PAYOUT', { fontSize: '9px', color: harborPalette.muted, padding: '1px 8px' })] },
      { cells: [harborCell(harborCoverage, { fontSize: '25px', lineHeight: '28px', color: harborTone, padding: '0 8px 5px' })] },
      { cells: [harborCell('REMAINDER AFTER PAYOUT', { fontSize: '9px', color: harborPalette.muted, padding: '1px 8px' })] },
      { cells: [harborCell(harborLatest.valid ? harborFmt(harborLatest.residual, true) : 'N/A', { fontSize: '19px', lineHeight: '22px', color: harborTone, padding: '0 8px 6px' })] },
      { cells: [harborCell('OCF −' + harborModel.stress + '% → ' + harborStressValue, { fontSize: '11px', color: harborModel.scenario.residual < 0 ? harborPalette.red : harborPalette.teal, padding: '4px 8px 1px', backgroundColor: harborPalette.card })] },
      { cells: [harborCell('Stress remainder · fixed capex & payouts', { fontSize: '8px', color: harborPalette.muted, padding: '1px 8px 5px', backgroundColor: harborPalette.card })] }
    ] };
    harborRows.push({ cells: [harborCell('TRAILING FOUR QUARTERS THROUGH ' + harborLatest.end.reportDateShort + ' &nbsp;·&nbsp; AMOUNTS IN ' + harborUnit + ' OF REPORTING CURRENCY', { fontSize: '9px', color: harborPalette.muted, paddingBottom: '4px' })] });
    harborRows.push({ cells: [{ padding: '0 12px', table: { width: harborInner + 'px', rows: [{ cells: [
      { width: harborLeftWidth + 'px', padding: 0, table: { width: harborLeftWidth + 'px', rows: [
        { cells: [{ padding: 0, chart: harborChart }] },
        { cells: [{ padding: '0 0 0 20px', table: { width: '100%', rows: [{ cells: harborLegs.map(harborLeg => ({ text: harborLeg.short + '<br/><b>' + (harborLatest.signs.length ? 'Review' : harborNumber(harborLeg.value, harborScale, true)) + '</b>', fontSize: '9px', lineHeight: '12px', color: harborColor(harborLeg), textAlign: 'center', padding: '2px', width: '16.66%' })) }] } }] }
      ] } },
      { padding: '0 0 0 7px', verticalAlign: 'top', table: harborSide }
    ] }] } }] });
    const harborHistory = harborModel.history.slice(harborCompact ? -4 : -6);
    harborRows.push({ cells: [harborCell('TTM COMPARISONS · PERIOD ENDS, USING THE CURRENT DATASET', { color: harborPalette.muted, fontSize: '8px', borderTop: '1px solid ' + harborPalette.border, paddingTop: '6px' })] });
    harborRows.push({ cells: [{ padding: '0 12px 4px', table: { width: '100%', borderCollapse: 'collapse', rows: [
      { cells: [{ text: harborUnit, fontSize: '9px', color: harborPalette.muted, padding: '2px' }, ...harborHistory.map(harborPast => ({ text: harborPeriod(harborPast.end), textAlign: 'right', fontSize: '9px', color: harborPalette.muted, padding: '2px' }))] },
      ...[['FCF¹', 'fcf'], ['Net payout²', 'payout'], ['Remainder', 'residual']].map(([harborLabel, harborField]) => ({ cells: [
        { text: harborLabel, fontSize: '9px', padding: '2px' }, ...harborHistory.map(harborPast => ({ text: harborPast.signs.length ? 'Review' : harborNumber(harborPast[harborField], harborScale, harborField === 'residual'), textAlign: 'right', fontSize: '10px', padding: '2px', color: harborField === 'residual' ? harborPast.residual < 0 ? harborPalette.red : harborPalette.teal : harborPalette.text }))
      ] }))
    ] } }] });
    const harborSharesText = harborLatest.shareChange === null ? 'Shares YoY N/A' : 'Shares YoY ' + (harborLatest.shareChange >= 0 ? '+' : '') + (harborLatest.shareChange * 100).toFixed(1) + '%';
    const harborContext = 'Cash & ST investments ' + harborFmt(harborLatest.cash) + ' · Debt ' + harborFmt(harborLatest.debt) + ' · ' + harborSharesText;
    const harborFinance = harborLatest.debtFlow === null ? 'Net debt cash flow N/A' : (harborLatest.debtFlow >= 0 ? 'Net borrowing ' : 'Net debt repayment ') + harborFmt(Math.abs(harborLatest.debtFlow));
    harborRows.push({ cells: [harborCell(harborContext + '<br/>' + harborFinance + (harborLatest.issuance > 0 ? ' · Net equity cash raised ' + harborFmt(harborLatest.issuance) : '') + ' · Financing context does not prove what funded a payout.', { color: harborPalette.muted, fontSize: '9px', lineHeight: '13px', backgroundColor: harborPalette.card, padding: '5px 12px' })] });
    const harborMissingCore = harborLatest.missing.filter(harborMetric => HARBOR_CORE.includes(harborMetric)).map(harborMetric => HARBOR_NAMES[harborMetric]);
    const harborAuditText = harborLatest.signs.length ? 'REVIEW: positive capex/dividend cash-flow reversal.' : harborMissingCore.length ? 'UNKNOWN: ' + harborMissingCore.join(', ') + '. Missing is not zero.' : '4 aligned quarters · ' + (harborLatest.reconciles === true ? 'FCF cross-check passed' : harborLatest.reconciles === false ? 'FCF definition differs: review statements' : 'Provider FCF cross-check unavailable');
    harborRows.push({ cells: [harborCell(harborAuditText + ' · ' + Math.floor((harborModel.asOf - harborLatest.end.stamp) / 86400000) + ' days since period end.', { fontSize: '9px', color: harborModel.ready ? harborPalette.muted : harborPalette.amber, paddingTop: '5px' })] });
    if (harborModel.headroom !== null) harborRows.push({ cells: [harborCell(harborModel.headroom >= 0 ? 'OCF can fall ' + (harborModel.headroom * 100).toFixed(1) + '% before a payout gap, with other flows fixed.' : 'OCF would need to rise ' + (-harborModel.headroom * 100).toFixed(1) + '% to cover these payouts, with other flows fixed.', { color: harborPalette.muted, fontSize: '9px', paddingTop: 0 })] });
  }
  harborRows.push({ cells: [harborCell('¹ OCF − fixed-asset purchases. ² Dividends + net repurchases (after cash issuance).<br/>Latest reported data; revisions possible. No historical signals, forecast or payout-safety guarantee.', { color: harborPalette.muted, fontSize: '8px', lineHeight: '12px', paddingTop: '3px', paddingBottom: '8px' })] });
  return { width: harborWidth + 'px', backgroundColor: harborPalette.bg, color: harborPalette.text,
    fontFamily: 'Arial,sans-serif', lineHeight: '12px', border: '1px solid ' + harborPalette.border, borderRadius: '9px', borderCollapse: 'separate', borderSpacing: 0, rows: harborRows };
}
