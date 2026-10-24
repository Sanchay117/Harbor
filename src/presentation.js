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
  const harborAfterDividend = harborCurrent.dividendValid ? harborCurrent.dividendResidual : null;
  const harborLegs = [
    { label: 'Operating cash', short: 'OCF', from: 0, to: harborCurrent.ocf, value: harborCurrent.ocf, kind: 'total' },
    { label: 'Fixed investment', short: 'Capex', from: harborCurrent.ocf, to: harborCurrent.fcf, value: harborCurrent.capex === null ? null : -harborCurrent.capex, kind: 'use' },
    { label: 'Free cash flow¹', short: 'FCF¹', from: 0, to: harborCurrent.fcf, value: harborCurrent.fcf, kind: 'total' },
    { label: 'Dividends', short: 'Div.', from: harborCurrent.fcf, to: harborAfterDividend, value: harborCurrent.dividends === null ? null : -harborCurrent.dividends, kind: 'use' }
  ];
  if (harborCurrent.dividendValid && !harborCurrent.valid) return [...harborLegs,
    { label: 'Dividend remainder', short: 'Div. left', from: 0, to: harborAfterDividend, value: harborAfterDividend, kind: 'result' }];
  return [...harborLegs,
    { label: 'Net repurchases²', short: 'Net rep.²', from: harborAfterDividend, to: harborCurrent.residual, value: harborCurrent.repurchases === null ? null : -harborCurrent.repurchases, kind: 'use' },
    { label: 'Net payout remainder', short: 'Left over', from: 0, to: harborCurrent.residual, value: harborCurrent.residual, kind: 'result' }
  ];
}
function buildHarborOverlay(harborModel, harborOptions = {}) {
  const harborPalette = HARBOR_COLORS[harborOptions.theme] || HARBOR_COLORS.Ink;
  const harborCompact = harborOptions.compact === true;
  const harborWidth = harborCompact ? 590 : 700;
  const harborInner = harborWidth - 24;
  const harborRows = [];
  const harborCell = (harborText, harborStyle = {}) => ({ text: harborText, padding: '3px 12px', fontSize: '11px', lineHeight: '14px', ...harborStyle });
  const harborTone = !harborModel.ready ? harborPalette.amber : harborModel.flags.gap ? harborPalette.red : harborPalette.teal;
  harborRows.push({ cells: [{ padding: '7px 12px 2px', table: { width: '100%', rows: [{ cells: [
    { text: 'H A R B O R', fontSize: '23px', fontFamily: 'Georgia,serif', lineHeight: '28px', padding: 0, width: '155px' },
    { text: 'NET PAYOUT FUNDING AUDIT', fontSize: '11px', lineHeight: '14px', textAlign: 'right', verticalAlign: 'middle', padding: 0, color: harborPalette.muted }
  ] }] } }] });
  harborRows.push({ cells: [harborCell(harborEscape(harborModel.ticker) + ' · ' + harborEscape(harborModel.status), { color: harborTone, fontWeight: 'bold', paddingBottom: '4px' })] });
  if (!harborModel.latest) {
    harborRows.push({ cells: [harborCell(harborEscape(harborModel.message), { padding: '12px', fontSize: '12px' })] });
  } else {
    const harborLatest = harborModel.latest;
    const harborDividendOnly = harborLatest.dividendValid && !harborLatest.valid;
    const harborMagnitude = Math.max(1, ...[harborLatest.ocf, harborLatest.capex, harborLatest.payout, harborLatest.cash, harborLatest.debt].filter(harborValue => harborValue !== null).map(Math.abs));
    const harborScale = harborMagnitude >= 1e9 ? 1e9 : harborMagnitude >= 1e6 ? 1e6 : 1;
    const harborUnit = harborScale === 1e9 ? 'B' : harborScale === 1e6 ? 'M' : 'units';
    const harborFmt = (harborValue, harborSigned = false) => harborNumber(harborValue, harborScale, harborSigned) + (harborValue !== null ? harborUnit : '');
    const harborLegs = harborWaterfall(harborModel);
    const harborColor = harborLeg => harborLeg.kind === 'use' ? harborPalette.amber : harborLeg.to !== null && harborLeg.to < 0 ? harborPalette.red : harborLeg.kind === 'result' ? harborPalette.teal : harborPalette.blue;
    const harborScope = harborDividendOnly ? 'DIVIDENDS ONLY · NET PAYOUT UNKNOWN' : 'DIVIDENDS + NET REPURCHASES AFTER CASH SHARE ISSUANCE';
    const harborHeadroom = harborDividendOnly ? harborModel.dividendHeadroom : harborModel.headroom;
    const harborRatio = harborDividendOnly ? harborLatest.dividendCoverage : harborLatest.coverage;
    const harborPayout = harborDividendOnly ? harborLatest.dividends : harborLatest.payout;
    const harborCoverage = harborRatio !== null && harborLatest.dividendValid ? harborRatio.toFixed(2) + '×' : harborPayout === 0 && harborLatest.valid ? 'NO PAYOUT' : 'N/A';
    const harborStressValue = harborDividendOnly ? harborModel.scenario.dividendResidual : harborLatest.valid ? harborModel.scenario.residual : null;
    const harborHero = (harborLabel, harborValue, harborDetail, harborColorValue) => ({ width: '33.33%', padding: '4px 8px 5px', backgroundColor: harborPalette.card, table: { width: '100%', rows: [
      { cells: [{ text: harborLabel, fontSize: '10px', lineHeight: '13px', color: harborPalette.muted, padding: 0 }] },
      { cells: [{ text: harborValue, fontSize: '27px', lineHeight: '31px', color: harborColorValue, padding: 0 }] },
      { cells: [{ text: harborDetail, fontSize: '10px', lineHeight: '13px', color: harborPalette.muted, padding: 0 }] }
    ] } });
    harborRows.push({ cells: [harborCell('TTM THROUGH ' + String(harborLatest.end.reportDateShort).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + ' · ' + harborUnit + ' OF REPORTING CURRENCY', { fontSize: '10px', color: harborPalette.muted, paddingTop: 0, paddingBottom: '2px' })] });
    harborRows.push({ cells: [harborCell(harborScope, { color: harborPalette.muted, fontSize: '10px', paddingTop: 0, paddingBottom: '5px' })] });
    harborRows.push({ cells: [{ padding: '0 12px 3px', table: { width: '100%', rows: [{ cells: [
      harborHero(harborHeadroom < 0 ? 'OCF RISE NEEDED' : 'OCF HEADROOM', harborHeadroom === null ? 'N/A' : (Math.abs(harborHeadroom) * 100).toFixed(1) + '%', 'Other cash flows held fixed', harborHeadroom < 0 ? harborPalette.red : harborPalette.teal),
      harborHero(harborDividendOnly ? 'FCF / DIVIDENDS' : 'FCF / NET PAYOUT', harborCoverage, harborDividendOnly ? 'Dividend-only coverage' : 'After cash share issuance', harborRatio < 1 && harborRatio !== null ? harborPalette.red : harborTone),
      harborHero('OCF −' + harborModel.stress + '% · REMAINDER', harborFmt(harborStressValue, true), 'Sensitivity test · fixed cash uses', harborStressValue < 0 ? harborPalette.red : harborStressValue === null ? harborPalette.amber : harborPalette.teal)
    ] }] } }] });
    const harborChart = { type: 'bar', width: harborInner + 'px', height: '76px',
      data: { labels: harborLegs.map(harborLeg => harborLeg.short), datasets: [{
        data: harborLegs.map(harborLeg => harborLatest.signs.length || harborLeg.from === null || harborLeg.to === null ? null : [harborLeg.from / harborScale, harborLeg.to / harborScale]),
        backgroundColor: harborLegs.map(harborColor), borderWidth: 0, borderRadius: 2, barPercentage: 0.6
      }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false, grid: { display: false } },
          y: { grid: { color: harborPalette.grid }, ticks: { color: harborPalette.muted, font: { size: 9 }, maxTicksLimit: 3 }, beginAtZero: true } }
      } };
    harborRows.push({ cells: [{ padding: '0 12px', chart: harborChart }] });
    harborRows.push({ cells: [{ padding: '0 12px 3px 34px', table: { width: '100%', rows: [{ cells: harborLegs.map(harborLeg => ({ text: harborLeg.short + '<br/><b>' + (harborLatest.signs.length ? 'Review' : harborNumber(harborLeg.value, harborScale, true)) + '</b>', fontSize: '10px', lineHeight: '13px', color: harborColor(harborLeg), textAlign: 'center', padding: '1px', width: (100 / harborLegs.length) + '%' })) }] } }] });
    const harborHistory = harborModel.history.slice(-4);
    harborRows.push({ cells: [harborCell('TTM COMPARISONS · CURRENT DATASET', { color: harborPalette.muted, fontSize: '9px', borderTop: '1px solid ' + harborPalette.border, paddingTop: '4px', paddingBottom: '1px' })] });
    const harborHistoryFields = harborDividendOnly ? [['FCF¹', 'fcf'], ['Dividends', 'dividends'], ['Div. remainder', 'dividendResidual']] : [['FCF¹', 'fcf'], ['Net payout²', 'payout'], ['Remainder', 'residual']];
    harborRows.push({ cells: [{ padding: '0 12px 3px', table: { width: '100%', borderCollapse: 'collapse', rows: [
      { cells: [{ text: harborUnit, fontSize: '10px', color: harborPalette.muted, padding: '1px' }, ...harborHistory.map(harborPast => ({ text: harborPeriod(harborPast.end), textAlign: 'right', fontSize: '10px', color: harborPalette.muted, padding: '1px' }))] },
      ...(harborCompact ? harborHistoryFields.slice(-1) : harborHistoryFields).map(([harborLabel, harborField]) => ({ cells: [
        { text: harborLabel, fontSize: '10px', padding: '1px' }, ...harborHistory.map(harborPast => ({ text: harborPast.signs.length ? 'Review' : harborNumber(harborPast[harborField], harborScale, /Residual|residual/.test(harborField)), textAlign: 'right', fontSize: '11px', padding: '1px', color: /Residual|residual/.test(harborField) ? harborPast[harborField] < 0 ? harborPalette.red : harborPalette.teal : harborPalette.text }))
      ] }))
    ] } }] });
    const harborSharesText = harborLatest.shareChange === null ? 'Shares YoY N/A' : 'Shares YoY ' + (harborLatest.shareChange >= 0 ? '+' : '') + (harborLatest.shareChange * 100).toFixed(1) + '%';
    const harborContext = 'Cash & ST investments ' + harborFmt(harborLatest.cash) + ' · Debt ' + harborFmt(harborLatest.debt) + ' · ' + harborSharesText;
    const harborFinance = harborLatest.debtFlow === null ? 'Net debt cash flow N/A' : (harborLatest.debtFlow >= 0 ? 'Net borrowing ' : 'Net debt repayment ') + harborFmt(Math.abs(harborLatest.debtFlow));
    harborRows.push({ cells: [harborCell(harborContext + '<br/>' + harborFinance + (harborLatest.issuance > 0 ? ' · Net equity cash raised ' + harborFmt(harborLatest.issuance) : '') + ' · Context, not proof of payout funding.', { color: harborPalette.muted, fontSize: '10px', lineHeight: '13px', backgroundColor: harborPalette.card, padding: '4px 12px' })] });
    const harborMissingCore = harborLatest.missing.filter(harborMetric => HARBOR_CORE.includes(harborMetric)).map(harborMetric => HARBOR_NAMES[harborMetric]);
    const harborAuditText = harborLatest.signs.length ? 'REVIEW: positive capex/dividend reversal.' : harborMissingCore.length ? 'UNKNOWN: ' + harborMissingCore.join(', ') + '. Missing is not zero.' : '4 aligned quarters · ' + (harborLatest.reconciles === true ? 'FCF cross-check passed' : harborLatest.reconciles === false ? 'FCF definition differs: review statements' : 'Provider FCF check unavailable');
    harborRows.push({ cells: [harborCell(harborAuditText + ' · Period end ' + Math.floor((harborModel.asOf - harborLatest.end.stamp) / 86400000) + ' days ago.', { fontSize: '9px', color: harborModel.ready ? harborPalette.muted : harborPalette.amber, paddingTop: '3px', paddingBottom: 0 })] });
  }
  harborRows.push({ cells: [harborCell('¹ OCF − fixed-asset purchases. ² Net payout = dividends + net repurchases after cash issuance.<br/>Latest reported snapshot; revisions possible. No historical signals, forecast or payout-safety guarantee.', { color: harborPalette.muted, fontSize: '9px', lineHeight: '12px', paddingTop: '2px', paddingBottom: '6px' })] });
  return { width: harborWidth + 'px', backgroundColor: harborPalette.bg, color: harborPalette.text,
    fontFamily: 'Arial,sans-serif', lineHeight: '13px', border: '1px solid ' + harborPalette.border, borderRadius: '9px', borderCollapse: 'separate', borderSpacing: 0, rows: harborRows };
}
