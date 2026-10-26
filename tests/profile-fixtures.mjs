import {loadPortal} from './profile-harness.mjs';
export function makeScenario(api,{nE=100,nL=20,items={},practices={},done=true,p40Risk=null,localRisk=null,id='env-review',defaultPattern=[80,0]}={}){
 const pick=(pattern,i,n)=>{if(typeof pattern==='number'||pattern==='NA')return pattern;const [f,u]=pattern;return i<Math.round(n*f/100)?5:i<Math.round(n*(f+u)/100)?1:3};
 const rows=Array.from({length:nE},(_,i)=>({isManager:i<nL,answers:Object.fromEntries(api.SURVEY_ITEMS.map(item=>[item.code,item.source==='L'&&i>=nL?null:pick(items[item.code]??defaultPattern,i,item.source==='E'?nE:nL)]))}));
 const e=api.aggregateSource(rows,'E'),l=api.aggregateSource(rows.filter(r=>r.isManager),'L');
 const answers={...Object.fromEntries(api.P_LIST.map(x=>[x.code,'full'])),...practices};for(const [k,v] of Object.entries(answers))if(v===null)delete answers[k];
 const environment={id,name:'Демонстраційне робоче середовище',emp:nE,man:nL,invE:nE,invL:nL,survey:{ok:true,e:nE,l:nL,results:{e,l}}};
 const checkup={answers,notes:{},done,asOfDate:'2026-10-26',schemaVersion:'checkup-2026-09-20-final',p40Risk,p40ApplicabilityByEnvironment:localRisk?{[id]:localRisk}:{}};checkup.results=api.calculatePResults(checkup);
 const r={company:'ДЕМОНСТРАЦІЙНІ ДАНІ. Умовна компанія',owner:'Демонстраційний запис',current:'period-review',periods:[{id:'period-review',label:'Демонстраційний період',start:'2026-10-01',end:'2026-10-26',envs:[environment],checkup}],plan:[]};
 api.setState({screen:'dash',r,env:id,module:1,modal:null,demo:false,returnResearch:null});
 return {rows,e,l,checkup,environment,r,analysis:api.barometerSemanticInterpretation()};
}
export const SIX_PRACTICES={items:Object.fromEntries([...['E06','E07','E08','E09','L04','L06'].map(c=>[c,[40,40]]),['E10',[80,0]],['L05',[80,0]]]),practices:Object.fromEntries(['P07','P08','P09','P10','P11','P12'].map(c=>[c,'partial']))};
export {loadPortal};
