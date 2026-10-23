import {calculateHarbor,buildHarborOverlay} from '../dist/harbor.browser.js';
let theme='Ink',compact=false;
const fixtures={};
const el=id=>document.getElementById(id);
function chartSvg(spec){
  const width=parseInt(spec.width),height=parseInt(spec.height),pad=28,top=8,bottom=5;
  const data=spec.data.datasets[0].data,colors=spec.data.datasets[0].backgroundColor;
  const values=data.filter(Boolean).flat();const minimum=Math.min(0,...values)*1.08,maximum=Math.max(1,...values)*1.08;
  const y=v=>top+(maximum-v)/(maximum-minimum)*(height-top-bottom);
  const step=(width-pad-4)/data.length;
  const muted=theme==='Ink'?'#a6bdc7':'#526b73',grid=theme==='Ink'?'#2c4350':'#dce2db';
  let marks='';for(let i=0;i<=4;i++){const v=minimum+(maximum-minimum)*i/4;marks+=`<line x1="${pad}" x2="${width}" y1="${y(v)}" y2="${y(v)}" stroke="${grid}"/><text x="${pad-5}" y="${y(v)+3}" text-anchor="end" fill="${muted}" font-size="8">${v.toFixed(0)}</text>`;}
  data.forEach((range,i)=>{if(!range)return;const high=Math.max(...range),low=Math.min(...range);marks+=`<rect x="${pad+step*i+step*.15}" y="${y(high)}" width="${step*.7}" height="${Math.max(1,y(low)-y(high))}" rx="2" fill="${colors[i]}"/>`;});
  const holder=document.createElement('div');holder.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="Reported cash waterfall">${marks}</svg>`;return holder.firstElementChild;
}
function renderTable(spec){
  const table=document.createElement('table');table.cellPadding='0';table.cellSpacing='0';
  for(const [key,value]of Object.entries(spec))if(key!=='rows')table.style[key]=value;
  for(const row of spec.rows||[]){const tr=table.insertRow();for(const cell of row.cells){const td=tr.insertCell();for(const [key,value]of Object.entries(cell))if(!['text','table','chart','colspan'].includes(key))td.style[key]=value;if(cell.colspan)td.colSpan=cell.colspan;if(cell.text!==undefined)td.innerHTML=cell.text;if(cell.chart)td.append(chartSvg(cell.chart));if(cell.table)td.append(renderTable(cell.table));}}
  return table;
}
async function render(){
  const ticker=el('symbol').value,stress=Number(el('stress').value);el('stressValue').value=stress+'%';
  fixtures[ticker]??=await (await fetch('../data/'+ticker+'.json')).json();
  const f=fixtures[ticker];if(ticker!==el('symbol').value)return;
  const model=calculateHarbor(f.data,{ticker,sector:f.sector,assetType:f.assetType,stress,asOf:Date.UTC(2026,9,24)});
  el('audit').replaceChildren(renderTable(buildHarborOverlay(model,{theme,compact})));
  el('readout').textContent=model.message;
  document.body.classList.toggle('paper',theme==='Paper');
  el('theme').textContent=theme==='Ink'?'Paper palette':'Ink palette';el('size').textContent=compact?'Full layout':'Compact layout';
}
el('symbol').addEventListener('change',render);el('stress').addEventListener('input',render);
el('theme').addEventListener('click',()=>{theme=theme==='Ink'?'Paper':'Ink';render();});
el('size').addEventListener('click',()=>{compact=!compact;render();});
render().catch(error=>{el('audit').textContent='Unable to load the local fixtures: '+error.message;});
