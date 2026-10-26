// Demonstration inputs only. Every displayed status is calculated by the portal.
const MANUAL_WEATHER_NAMES=['Ясно','Хмарно','Буря','Туман'];
const MANUAL_MIXED_WEATHER=[
 ['Буря','Ясно','Хмарно'],['Хмарно','Буря','Ясно'],['Ясно','Ясно','Буря'],
 ['Буря','Хмарно','Туман'],['Туман','Ясно','Хмарно'],['Ясно','Туман','Ясно'],['Хмарно','Буря','Хмарно']
];
function manualWeatherResearch(weather){
 if(weather.length!==7||weather.some(row=>row.length!==3||row.some(s=>!MANUAL_WEATHER_NAMES.includes(s))))throw new Error('Оберіть три статуси для кожного модуля.');
 const nE=100,nL=20,patterns={'Ясно':[80,0],'Хмарно':[60,20],'Буря':[40,40]};
 const answer=(status,i,n)=>{if(status==='Туман')return 'NA';const [f,u]=patterns[status];return i<Math.round(n*f/100)?5:i<Math.round(n*(f+u)/100)?1:3};
 const rows=Array.from({length:nE},(_,i)=>({isManager:i<nL,answers:Object.fromEntries(SURVEY_ITEMS.map(item=>[item.code,item.source==='L'&&i>=nL?null:answer(weather[item.module-1][item.source==='E'?0:1],i,item.source==='E'?nE:nL)]))}));
 const answers=Object.fromEntries(P_LIST.map(p=>[p.code,'full']));
 for(let m=1;m<=7;m++){
  const ps=P_LIST.filter(p=>p.module===m),status=weather[m-1][2];
  if(status==='Хмарно')answers[ps[0].code]='partial';
  if(status==='Буря')for(const p of ps.slice(0,2))answers[p.code]='no';
  if(status==='Туман')for(const p of ps.slice(0,3))answers[p.code]='insufficient';
 }
 const cp={answers,notes:{},done:true,asOfDate:'2026-10-26',schemaVersion:CHECKUP_SCHEMA_VERSION,p40Risk:null,p40ApplicabilityByEnvironment:{}};cp.results=calculatePResults(cp);
 const results={e:aggregateSource(rows,'E'),l:aggregateSource(rows.filter(row=>row.isManager),'L')};
 return {company:'ДЕМОНСТРАЦІЙНІ ДАНІ. Різні сценарії',owner:'Демонстраційний запис',current:'period-scenarios',periods:[{id:'period-scenarios',label:'Жовтень 2026',start:'2026-10-01',end:'2026-10-26',envs:[{id:'env-scenarios',name:'Демонстраційне робоче середовище',emp:nE,man:nL,invE:nE,invL:nL,survey:{ok:true,e:nE,l:nL,leaders:true,results}}],checkup:cp}],plan:[]};
}
