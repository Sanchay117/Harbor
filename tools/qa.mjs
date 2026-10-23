import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const engine=await fs.readFile(new URL('src/engine.js',root),'utf8');
const calculate=vm.runInNewContext(engine+'\ncalculateHarbor');
const rows=[],manifest=[];
for(const name of (await fs.readdir(new URL('data/',root))).filter(n=>/^[A-Z]+\.json$/.test(n))){
  const bytes=await fs.readFile(new URL('data/'+name,root));const fixture=JSON.parse(bytes);
  const m=calculate(fixture.data,{ticker:fixture.ticker,sector:fixture.sector,assetType:fixture.assetType,asOf:Date.UTC(2026,9,24),stress:20});
  if(m.latest?.valid){
    assert.equal(m.latest.ocf-m.latest.capex-m.latest.payout,m.latest.residual);
    assert.ok(m.history.every(h=>h.periods.length===4));
  }
  rows.push({ticker:fixture.ticker,status:m.status,ready:m.ready,period:m.latest?.end.reportDateShort??null,
    ocf:m.latest?.ocf??null,fcf:m.latest?.fcf??null,payout:m.latest?.payout??null,remainder:m.latest?.residual??null,
    coverage:m.latest?.coverage??null,stressRemainder:m.scenario?.residual??null,fcfCheck:m.latest?.reconciles??null,
    missingCore:m.latest?.missing.filter(x=>['net_cash_operating_activities','purchase_fixed_assets','dividends_paid','cash_from_repurchase_equity'].includes(x))??[]});
  manifest.push({file:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.mkdir(new URL('review/',root),{recursive:true});
await fs.writeFile(new URL('review/validation.json',root),JSON.stringify({asOf:'2026-10-24',source:'TrendSpider native request.fundamental; captured through visible Custom Indicator Editor console',results:rows},null,2)+'\n');
await fs.writeFile(new URL('data/manifest.json',root),JSON.stringify({captured:'2026-10-24',source:'Native TrendSpider request.fundamental, 12 quarters. Sector context for batch fixtures is manually labeled; CVX metadata came from current.',pointInTime:false,files:manifest},null,2)+'\n');
console.table(rows.map(({ticker,status,coverage,fcfCheck})=>({ticker,status,coverage:coverage?.toFixed(3),fcfCheck})));
