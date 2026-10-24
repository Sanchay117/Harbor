/* Harbor: latest reported snapshot, never a point-in-time backtest series.
 * Quarter flows are joined on fiscal year/quarter AND identical period ends.
 * Missing values stay missing. Net repurchases already offset cash issuance.
 */
const HARBOR_METRICS = Object.freeze([
  'net_cash_operating_activities', 'purchase_fixed_assets', 'dividends_paid',
  'cash_from_repurchase_equity', 'cash_from_repayment_debt', 'cash_st_investments',
  'total_debt', 'shares_basic_bs', 'free_cash_flow'
]);
const HARBOR_CORE = Object.freeze(HARBOR_METRICS.slice(0, 4));

function harborDate(harborShort) {
  if (!Number.isInteger(harborShort)) return null;
  const harborString = String(harborShort);
  if (!/^\d{8}$/.test(harborString)) return null;
  const harborYear = Number(harborString.slice(0, 4));
  const harborMonth = Number(harborString.slice(4, 6));
  const harborDay = Number(harborString.slice(6, 8));
  const harborLeap = harborYear % 4 === 0 && (harborYear % 100 !== 0 || harborYear % 400 === 0);
  const harborMonthDays = [31, harborLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return harborMonth >= 1 && harborMonth <= 12 && harborDay >= 1 && harborDay <= harborMonthDays[harborMonth - 1] ? Date.UTC(harborYear, harborMonth - 1, harborDay) : null;
}

function harborPrepare(harborRaw, harborAsOf) {
  const harborMaps = {};
  const harborProblems = [];
  for (const harborMetric of HARBOR_METRICS) {
    const harborMap = {};
    for (const harborRecord of (Array.isArray(harborRaw?.[harborMetric]) ? harborRaw[harborMetric] : [])) {
      const harborStamp = harborDate(harborRecord?.reportDateShort);
      if (!Number.isInteger(harborRecord?.year) || !Number.isInteger(harborRecord?.quarter) || harborRecord.quarter < 1 || harborRecord.quarter > 4 || harborStamp === null || harborStamp > harborAsOf) continue;
      const harborKey = harborRecord.year * 4 + harborRecord.quarter - 1;
      if (harborKey in harborMap) {
        // Keep the period as an invalid anchor, so a duplicate latest OCF
        // cannot quietly move the headline to an older quarter.
        harborMap[harborKey] = { ...harborRecord, stamp: harborStamp, key: harborKey, value: null, ambiguous: true };
        harborProblems.push({ metric: harborMetric, key: harborKey });
      } else harborMap[harborKey] = { ...harborRecord, stamp: harborStamp, key: harborKey, value: typeof harborRecord.value === 'number' && Number.isFinite(harborRecord.value) ? harborRecord.value : null };
    }
    harborMaps[harborMetric] = harborMap;
  }
  return { maps: harborMaps, problems: harborProblems };
}

function harborValue(harborMaps, harborMetric, harborPeriod) {
  const harborRecord = harborMaps[harborMetric][harborPeriod.key];
  return harborRecord && harborRecord.reportDateShort === harborPeriod.reportDateShort ? harborRecord.value : null;
}

function harborWindow(harborMaps, harborEnd) {
  const harborPeriods = Array.from({ length: 4 }, (_, harborIndex) => harborMaps.net_cash_operating_activities[harborEnd.key - harborIndex]);
  if (harborPeriods.some(harborPeriod => !harborPeriod || harborPeriod.value === null)) return null;
  for (let harborIndex = 0; harborIndex < 3; harborIndex += 1) {
    const harborDays = (harborPeriods[harborIndex].stamp - harborPeriods[harborIndex + 1].stamp) / 86400000;
    if (harborDays < 50 || harborDays > 130) return null;
  }
  const harborTotals = {};
  const harborMissing = [];
  const harborAmbiguous = [];
  for (const harborMetric of HARBOR_METRICS) {
    if (harborPeriods.some(harborPeriod => harborMaps[harborMetric][harborPeriod.key]?.ambiguous)) harborAmbiguous.push(harborMetric);
    const harborValues = harborPeriods.map(harborPeriod => harborValue(harborMaps, harborMetric, harborPeriod));
    harborTotals[harborMetric] = harborValues.every(harborItem => harborItem !== null) ? harborValues.reduce((harborA, harborB) => harborA + harborB, 0) : null;
    if (harborTotals[harborMetric] === null) harborMissing.push(harborMetric);
  }
  // These provider cash-flow fields are signed. A positive outflow field is a
  // reversal or an unsupported convention; do not silently take its absolute value.
  const harborSigns = ['purchase_fixed_assets', 'dividends_paid'].filter(harborMetric => harborPeriods.some(harborPeriod => harborValue(harborMaps, harborMetric, harborPeriod) > 0));
  const harborOcf = harborTotals.net_cash_operating_activities;
  const harborCapex = harborTotals.purchase_fixed_assets === null ? null : -harborTotals.purchase_fixed_assets;
  const harborDividends = harborTotals.dividends_paid === null ? null : -harborTotals.dividends_paid;
  const harborEquity = harborTotals.cash_from_repurchase_equity;
  const harborRepurchases = harborEquity === null ? null : Math.max(0, -harborEquity);
  const harborIssuance = harborEquity === null ? null : Math.max(0, harborEquity);
  const harborFcf = harborCapex === null ? null : harborOcf - harborCapex;
  const harborPayout = harborDividends === null || harborRepurchases === null ? null : harborDividends + harborRepurchases;
  const harborResidual = harborFcf === null || harborPayout === null ? null : harborFcf - harborPayout;
  const harborCoverage = harborPayout > 0 && harborFcf !== null ? harborFcf / harborPayout : null;
  const harborDividendValid = !HARBOR_CORE.slice(0, 3).some(harborMetric => harborTotals[harborMetric] === null) && !harborSigns.length;
  const harborValid = harborDividendValid && harborEquity !== null;
  const harborDividendResidual = harborDividendValid ? harborFcf - harborDividends : null;
  const harborDividendCoverage = harborDividendValid && harborDividends > 0 ? harborFcf / harborDividends : null;
  const harborPriorShares = harborMaps.shares_basic_bs[harborEnd.key - 4];
  const harborShares = harborValue(harborMaps, 'shares_basic_bs', harborEnd);
  const harborShareChange = harborPriorShares?.value > 0 && harborShares > 0 ? harborShares / harborPriorShares.value - 1 : null;
  const harborVendorFcf = harborTotals.free_cash_flow;
  const harborFcfDifference = harborVendorFcf !== null && harborFcf !== null ? harborFcf - harborVendorFcf : null;
  return { end: harborEnd, periods: harborPeriods, totals: harborTotals, missing: harborMissing, signs: harborSigns, ambiguous: harborAmbiguous,
    valid: harborValid, dividendValid: harborDividendValid, dividendResidual: harborDividendResidual, dividendCoverage: harborDividendCoverage,
    ocf: harborOcf, capex: harborCapex, dividends: harborDividends,
    repurchases: harborRepurchases, issuance: harborIssuance, fcf: harborFcf,
    payout: harborPayout, residual: harborResidual, coverage: harborCoverage, shareChange: harborShareChange,
    debtFlow: harborTotals.cash_from_repayment_debt,
    cash: harborValue(harborMaps, 'cash_st_investments', harborEnd),
    debt: harborValue(harborMaps, 'total_debt', harborEnd),
    fcfDifference: harborFcfDifference,
    reconciles: harborFcfDifference === null ? null : Math.abs(harborFcfDifference) <= Math.max(1, Math.abs(harborFcf) * 0.01) };
}

function calculateHarbor(harborRaw, harborOptions = {}) {
  const harborAsOf = harborOptions.asOf ?? Date.now();
  const harborStress = Math.max(0, Math.min(50, Number(harborOptions.stress) || 0));
  const harborBase = { ready: false, status: 'DATA UNAVAILABLE', message: '', latest: null, history: [], stress: harborStress,
    ticker: harborOptions.ticker || '', asOf: harborAsOf, stale: false,
    conditionReady: { netPayout: false, dividends: false },
    flags: { covered: false, gap: false, dividendsAtRisk: false } };
  if (!['stock', 'stock_otc'].includes(harborOptions.assetType || 'stock')) return { ...harborBase, status: 'EQUITIES ONLY', message: 'Use a company equity with quarterly cash-flow statements.' };
  if (/financ|bank|insuran|realestate|real_estate|reit/i.test((harborOptions.sector || '') + ' ' + (harborOptions.industry || ''))) return { ...harborBase, status: 'SECTOR OUT OF SCOPE', message: 'Banks, insurers and real estate require sector-specific payout measures.' };
  if (!harborRaw || harborRaw.error) return { ...harborBase, message: 'The fundamental request failed. No funding conclusion is available.' };
  const harborPrepared = harborPrepare(harborRaw, harborAsOf);
  const harborEnds = Object.values(harborPrepared.maps.net_cash_operating_activities).filter(Boolean).sort((harborA, harborB) => harborB.key - harborA.key);
  if (!harborEnds.length) return { ...harborBase, message: 'No valid reported operating-cash-flow periods.' };
  // Never move the headline back to an older, more complete quarter silently.
  const harborLatest = harborWindow(harborPrepared.maps, harborEnds[0]);
  if (!harborLatest) return { ...harborBase, status: 'INCOMPLETE PERIODS', message: 'Four consecutive quarterly operating-cash records are required.' };
  const harborHistory = harborEnds.map(harborEnd => harborWindow(harborPrepared.maps, harborEnd)).filter(Boolean).slice(0, 8).reverse();
  const harborStale = (harborAsOf - harborLatest.end.stamp) / 86400000 > 200;
  const harborFundingGap = harborLatest.residual !== null && harborLatest.residual < 0;
  const harborCoreAmbiguity = harborLatest.ambiguous.filter(harborMetric => HARBOR_CORE.includes(harborMetric));
  const harborStatus = harborStale ? 'STALE STATEMENTS' : !harborLatest.valid
    ? harborLatest.dividendValid ? 'DIVIDEND AUDIT ONLY · NET PAYOUT UNKNOWN' : harborCoreAmbiguity.length ? 'AMBIGUOUS PERIODS' : 'LIMITED DATA'
    : harborLatest.payout === 0 ? 'NO NET CASH PAYOUT' : harborFundingGap ? 'NET PAYOUT EXCEEDS FCF' : 'NET PAYOUT COVERED BY FCF';
  const harborScenarioOcf = harborLatest.ocf - Math.abs(harborLatest.ocf) * harborStress / 100;
  const harborScenarioFcf = harborLatest.capex === null ? null : harborScenarioOcf - harborLatest.capex;
  const harborScenarioGap = harborLatest.payout === null || harborScenarioFcf === null ? null : harborScenarioFcf - harborLatest.payout;
  const harborHeadroom = harborLatest.valid && harborLatest.ocf > 0 ? harborLatest.residual / harborLatest.ocf : null;
  const harborDividendHeadroom = harborLatest.dividendValid && harborLatest.ocf > 0 ? harborLatest.dividendResidual / harborLatest.ocf : null;
  const harborReady = harborLatest.valid && !harborStale;
  const harborDividendReady = harborLatest.dividendValid && !harborStale;
  return { ...harborBase, ready: harborReady, status: harborStatus,
    message: harborStale ? 'Period end is over 200 days old. Current funding flags are suppressed.'
      : !harborLatest.valid ? harborLatest.dividendValid
        ? 'Dividend cash flows are complete. Net payout remains unknown because equity cash-flow data is incomplete.'
        : 'Missing, mismatched or unsupported cash-flow inputs. No funding classification.'
      : harborFundingGap ? 'Net cash payouts exceeded cash after fixed-asset purchases. Review financing and reserves.' : 'Compare cash after investment with dividends and net repurchases after cash share issuance.',
    latest: harborLatest, history: harborHistory, stale: harborStale, problems: harborPrepared.problems,
    scenario: { ocf: harborScenarioOcf, fcf: harborScenarioFcf, residual: harborScenarioGap,
      dividendResidual: harborLatest.dividendValid ? harborScenarioFcf - harborLatest.dividends : null },
    headroom: harborHeadroom, dividendHeadroom: harborDividendHeadroom,
    conditionReady: { netPayout: harborReady, dividends: harborDividendReady },
    flags: { covered: harborReady && harborLatest.payout > 0 && !harborFundingGap,
      gap: harborReady && harborLatest.payout > 0 && harborFundingGap,
      dividendsAtRisk: harborDividendReady && harborLatest.dividends > 0 && harborLatest.fcf < harborLatest.dividends } };
}
