import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const engine = await fs.readFile(new URL('../src/engine.js',import.meta.url),'utf8');
const presentation = await fs.readFile(new URL('../src/presentation.js',import.meta.url),'utf8');
const api = vm.runInNewContext(engine + '\n' + presentation + '\n({calculateHarbor,buildHarborOverlay,harborWaterfall})');
const asOf = Date.UTC(2026,9,24);
const options = {asOf,assetType:'stock',sector:'technology',ticker:'TEST',stress:50};
function fixture() {
  const data = {};
  const dates = [[2026,2,20260630],[2026,1,20260331],[2025,4,20251231],[2025,3,20250930],[2025,2,20250630],[2025,1,20250331],[2024,4,20241231],[2024,3,20240930]];
  for (const [metric,value] of Object.entries({net_cash_operating_activities:25,purchase_fixed_assets:-5,dividends_paid:-3,cash_from_repurchase_equity:-7,free_cash_flow:20,cash_st_investments:40,total_debt:60,shares_basic_bs:100,net_income:10,stock_based_compensation:2,cash_from_repayment_debt:-2})) {
    data[metric] = dates.map(([year,quarter,reportDateShort])=>({year,quarter,reportDateShort,value}));
  }
  return data;
}
test('cash receipt reconciles by hand and stress can turn a surplus into a gap',()=>{
  const m=api.calculateHarbor(fixture(),options);
  assert.equal(m.ready,true); assert.equal(m.latest.ocf,100); assert.equal(m.latest.capex,20);
  assert.equal(m.latest.fcf,80); assert.equal(m.latest.payout,40); assert.equal(m.latest.residual,40);
  assert.equal(m.latest.coverage,2); assert.equal(m.headroom,0.4);
  assert.equal(m.scenario.residual,-10); assert.equal(m.flags.covered,true); assert.equal(m.flags.gap,false);
  const bars=api.harborWaterfall(m); assert.equal(bars[3].to,68); assert.equal(bars[4].to,40);
});
test('negative operating cash worsens under an adverse stress',()=>{
  const d=fixture();d.net_cash_operating_activities.forEach(r=>r.value=-10);d.free_cash_flow=[];
  const m=api.calculateHarbor(d,{...options,stress:20});
  assert.equal(m.latest.fcf,-60); assert.equal(m.scenario.ocf,-48); assert.equal(m.scenario.residual,-108);
  assert.equal(m.flags.dividendsAtRisk,true); assert.equal(m.headroom,null);
});
test('missing is not zero; latest incomplete period never falls back silently',()=>{
  const d=fixture();d.cash_from_repurchase_equity.shift();
  const m=api.calculateHarbor(d,options);
  assert.equal(m.latest.end.reportDateShort,20260630); assert.equal(m.ready,false);
  assert.equal(m.latest.payout,null); assert.equal(m.flags.covered,false); assert.equal(m.flags.gap,false);
  assert.equal(m.latest.fcf,80); assert.equal(m.status,'LIMITED DATA');
});
test('fiscal keys and exact dates prevent accidental positional joins',()=>{
  const d=fixture(); d.dividends_paid.reverse();
  assert.equal(api.calculateHarbor(d,options).latest.residual,40);
  d.dividends_paid.find(r=>r.quarter===2&&r.year===2026).reportDateShort=20260629;
  assert.equal(api.calculateHarbor(d,options).ready,false);
});
test('cash issuance does not become a negative repurchase or inflate funding capacity',()=>{
  const d=fixture();d.cash_from_repurchase_equity.forEach(r=>r.value=20);
  const m=api.calculateHarbor(d,options);
  assert.equal(m.latest.issuance,80);assert.equal(m.latest.repurchases,0);
  assert.equal(m.latest.payout,12);assert.equal(m.latest.residual,68);
});
test('explicit zero payout is valid and has no infinite coverage ratio',()=>{
  const d=fixture();for(const k of ['dividends_paid','cash_from_repurchase_equity'])d[k].forEach(r=>r.value=0);
  const m=api.calculateHarbor(d,options);
  assert.equal(m.ready,true);assert.equal(m.status,'NO NET CASH PAYOUT');assert.equal(m.latest.coverage,null);
  assert.equal(m.flags.covered,false);assert.equal(m.flags.gap,false);
});
test('non-equities, banks, insurers, real estate, failed requests and stale data do not emit flags',()=>{
  for(const o of [{assetType:'etf'},{sector:'finance'},{industry:'insurance'},{sector:'realestate'},{asOf:Date.UTC(2027,5,1)}]){
    const m=api.calculateHarbor(fixture(),{...options,...o}); assert.equal(m.ready,false);assert.equal(m.flags.covered,false);
  }
  assert.equal(api.calculateHarbor({error:'network'},options).ready,false);
});
test('duplicate records, missing quarters, non-numeric values and reversals suppress conclusions',()=>{
  const d=fixture(); d.dividends_paid.push({...d.dividends_paid[0]});assert.equal(api.calculateHarbor(d,options).ready,false);
  const e=fixture();e.net_cash_operating_activities.splice(1,1);assert.equal(api.calculateHarbor(e,options).latest,null);
  const f=fixture();f.dividends_paid[0].value='-3';assert.equal(api.calculateHarbor(f,options).ready,false);
  const g=fixture();g.purchase_fixed_assets[0].value=5;assert.equal(api.calculateHarbor(g,options).ready,false);
});
test('missing optional context remains N/A while primary arithmetic is usable',()=>{
  const d=fixture();delete d.net_income;delete d.stock_based_compensation;delete d.cash_st_investments;
  const m=api.calculateHarbor(d,options);assert.equal(m.ready,true);assert.equal(m.latest.cash,null);
  const overlay=JSON.stringify(api.buildHarborOverlay(m));assert.match(overlay,/Cash & ST investments N\/A/);
});
test('cash scale changes units but not coverage, headroom or state',()=>{
  const a=api.calculateHarbor(fixture(),options);const d=fixture();
  Object.values(d).forEach(arr=>arr.forEach(r=>r.value*=1e9));const b=api.calculateHarbor(d,options);
  assert.equal(b.latest.residual,a.latest.residual*1e9);assert.equal(b.latest.coverage,a.latest.coverage);assert.equal(b.headroom,a.headroom);
});
test('native adapter makes one data request and registers only the latest snapshot',async()=>{
  const adapter=await fs.readFile(new URL('../src/trendspider.js',import.meta.url),'utf8');
  const calls=[],signals=[],overlays=[];const input=()=> 'Ink';input.number=()=>20;
  const ctx={Date,close:Array(500).fill(50),current:{ticker:'TEST',assetType:'stock',sector:'technology'},input,
    describe_indicator:()=>{},request:{fundamental:async(...args)=>{calls.push(args);return fixture();}},
    register_signal:(arr,name)=>signals.push({arr,name}),paint_overlay:(...args)=>overlays.push(args)};
  await vm.runInNewContext('(async()=>{'+engine+presentation+adapter+'})()',ctx);
  assert.equal(calls.length,1);assert.equal(calls[0][1].length,9);assert.equal(overlays.length,1);assert.equal(signals.length,3);
  signals.forEach(({arr})=>{assert.equal(arr.length,500);assert.ok(arr.slice(0,-1).every(x=>x===null));});
});
test('palettes and layouts use serializable charts; symbols are escaped',()=>{
  for(const theme of ['Ink','Paper'])for(const compact of [false,true]){
    const m=api.calculateHarbor(fixture(),{...options,ticker:'<bad & symbol>'});
    const json=JSON.stringify(api.buildHarborOverlay(m,{theme,compact}));
    assert.ok(json.includes('&lt;bad &amp; symbol&gt;'));assert.ok(!json.includes('NaN'));assert.ok(!json.includes('Infinity'));
  }
});
