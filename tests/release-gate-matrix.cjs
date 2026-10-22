const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=process.env.BAROMETER_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const localHtml=fs.readFileSync(root+'/local/index.html','utf8'),tests=fs.readFileSync(root+'/tests/portal-regression.mjs','utf8');
const loader=tests.slice(tests.indexOf('function executableScripts'),tests.indexOf('const portal=loadLocalPortal();'));
const {api}=new Function('fs','vm','localHtml',loader+';return loadLocalPortal()')(fs,vm,localHtml);
const critical=new Set(['P04','P13','P15','P16','P21','P28','P31','P36','P38','P42']);
const answers=['full','partial','no','insufficient'],allFull=()=>Object.fromEntries(api.P_LIST.map(x=>[x.code,'full']));
const research=()=>({company:'Release-gate synthetic QA',owner:'QA',current:'qa',plan:[],periods:[{id:'qa',label:'Вересень 2026',start:'2026-09-01',end:'2026-09-30',envs:[{id:'e',name:'Synthetic QA',survey:{}}],checkup:{answers:allFull(),notes:{},done:true,asOfDate:'2026-09-30',schemaVersion:'checkup-2026-09-20-final'}}]});
const r=research(),cp=r.periods[0].checkup;api.setState({r,env:'e',screen:'home',module:1,demo:false});
const matrix=['module,p40Risk,combination,full,partial,no,insufficient,expected,actual,criticalMissing,badge,lead'],summary={cases:0,statusCounts:{},modules:{},unknownOnlyCloudy:0,failures:[]};
for(let mid=1;mid<=7;mid++){
 const list=api.P[mid],risks=mid===7?[null,'confirmed','not_confirmed','needs_check']:[null];summary.modules[mid]={cases:0,counts:{}};
 for(const risk of risks)for(let n=0;n<4096;n++){
  cp.answers=allFull();cp.p40Risk=risk;let code=n,vals=[];
  for(const p of list){const a=answers[code%4];code=Math.floor(code/4);cp.answers[p.code]=a;vals.push(a);}
  const counts=Object.fromEntries(answers.map(a=>[a,vals.filter(v=>v===a).length])),missing=list.filter((p,i)=>vals[i]==='no'&&(critical.has(p.code)||(p.code==='P40'&&risk==='confirmed'))).map(p=>p.code);
  const expected=missing.length||counts.no>=2?'Буря':counts.insufficient>=3?'Туман':counts.full===6?'Ясно':'Хмарно';
  const actual=api.calculatePResults(cp).modules[mid],lead=api.barometerPModuleLead(mid),badge=api.mapStatusBadge(actual.status,'P',mid,null).replace(/<[^>]+>/g,'');
  assert.equal(actual.status,expected,'M'+mid+'/'+risk+'/'+n);assert.equal(JSON.stringify([...actual.criticalMissing].sort()),JSON.stringify(missing.sort()));
  if(expected==='Буря'){assert.match(lead,/Статус «Буря» спричинено/);for(const c of missing)assert.ok(lead.includes(c));if(!missing.length)assert.match(lead,/щонайменше двома/);}
  if(expected==='Туман')assert.match(lead,/причиною статусу «Туман»/);
  if(counts.full)assert.ok(lead.includes(counts.full+' із 6'));
  for(const p of list.filter(p=>['partial','insufficient'].includes(cp.answers[p.code])))assert.ok(lead.includes(p.code));
  if(counts.no===0&&counts.partial===0&&counts.insufficient>0){assert.doesNotMatch(badge,/прогалин/);assert.match(lead,/це не означає відсутності практики/);if(expected==='Хмарно'){summary.unknownOnlyCloudy++;assert.match(badge,/бракує підтверджень/);}}
  summary.cases++;summary.statusCounts[expected]=(summary.statusCounts[expected]||0)+1;summary.modules[mid].cases++;summary.modules[mid].counts[expected]=(summary.modules[mid].counts[expected]||0)+1;
  matrix.push([mid,risk||'unspecified',vals.join('|'),counts.full,counts.partial,counts.no,counts.insufficient,expected,actual.status,missing.join('|'),badge,lead].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','));
 }
}
assert.equal(summary.cases,40960);fs.writeFileSync(out+'/p-all-combinations.csv',matrix.join('\n'));fs.writeFileSync(out+'/p-matrix-summary.json',JSON.stringify(summary,null,2));
const elp=[];
const profiles={full:{},criticalP15:{P15:'no'},partialP03:{P03:'partial'},unknownP24:{P24:'insufficient'},crossP31:{P31:'partial'},unknownOnly:{P01:'insufficient',P02:'insufficient'}};
for(const [E,L] of [[0,0],[9,3],[20,0],[0,10],[20,10]])for(const eValue of [1,5])for(const lValue of [1,5])for(const [name,overrides] of Object.entries(profiles)){
 const study=research(),env=study.periods[0].envs[0];Object.assign(study.periods[0].checkup.answers,overrides);
 const survey=(source,count,value)=>api.aggregateSource(Array.from({length:count},()=>({isManager:source==='L',answers:Object.fromEntries(api.SURVEY_ITEMS.map(x=>[x.code,x.source===source?value:null]))})),source);
 env.survey={ok:true,e:E,l:L,results:{e:survey('E',E,eValue),l:survey('L',L,lValue)}};
 api.setState({r:study,env:'e',screen:'dash',module:1,demo:false});const analysis=api.barometerSemanticInterpretation(),rows=api.actualResultModel(),html=api.buildReportHtml(env);
 assert.equal((html.match(/id="report-source-scope"/g)||[]).length,1);assert.equal((html.match(/id="report-methodology"/g)||[]).length,1);
 for(const row of rows){
  const text=api.barometerModuleSummary(row,analysis),expectedE=E===0?'Немає даних':E<20?'Недостатня вибірка':eValue===5?'Ясно':'Буря',expectedL=L===0?'Немає даних':L<10?'Недостатня вибірка':lValue===5?'Ясно':'Буря';
  assert.equal(row.e,expectedE);assert.equal(row.l,expectedL);assert.doesNotMatch(text,/джерела суперечать|суперечливі джерела|доводять непрацездатність/);
  if(E<20&&L<10)assert.doesNotMatch(text,/Результати опитування/);
  if(name==='criticalP15'&&row.m===3){assert.equal(row.p,'Буря');assert.match(text,/5 із 6.*P15/);}
  if(name==='crossP31'&&row.m===2){assert.equal(row.p,'Ясно');assert.match(text,/P31.*модулі 6/);assert.equal(api.barometerModuleActions(2).filter(a=>a.code==='P31').length,0);}
  elp.push({E,L,eValue,lValue,profile:name,module:row.m,status:{E:row.e,L:row.l,P:row.p},summary:text});
 }
}
fs.writeFileSync(out+'/elp-matrix.json',JSON.stringify(elp,null,2));
const baseline=execFileSync('git',['show','9f4458dc43179ea2398b817219650e8cc5c0de95:local/index.html'],{cwd:root,maxBuffer:12*1024*1024}).toString();
const production=execFileSync('git',['show','15eea99fcabd0a22f7615311deda281949a9e716:local/index.html'],{cwd:root,maxBuffer:12*1024*1024}).toString();
const names=['normalizeResearch','safeResearchClone','validateBackupResearch','planXlsxBytes','parseCSV','validateTableRows','weatherStatus','aggregateSource','calculatePResults'];
const minimalLoader=loader.replace(/globalThis\.__portal=\{[\s\S]*?\n    \};/,'globalThis.__portal={'+names.join(',')+',STORE};');
const protectedApi=html=>new Function('fs','vm','localHtml',minimalLoader+';return loadLocalPortal()')(fs,vm,html).api;
const protectedNew=protectedApi(localHtml),protectedMain=protectedApi(production),protectedBefore=protectedApi(baseline),protection={STORE:protectedNew.STORE,functions:{}};
assert.equal(protectedNew.STORE,'barometer_v2_final');
for(const n of names){assert.equal(protectedNew[n].toString(),protectedMain[n].toString(),n+' vs main');assert.equal(protectedNew[n].toString(),protectedBefore[n].toString(),n+' vs previous');protection.functions[n]='BYTE_IDENTICAL';}
const oldLibraryStart=baseline.indexOf('const BAROMETER_P_ACTION_LIBRARY=')+'const BAROMETER_P_ACTION_LIBRARY='.length,oldLibrary=JSON.parse(baseline.slice(oldLibraryStart,baseline.indexOf(';\nfunction barometerPracticeAction',oldLibraryStart)));
// 2026-10-22: content changes are authorised; retain exact equality for every
// untouched model and all criterion-to-step identifiers. Dedicated refinements
// tests verify the approved changes, P32 exclusion and all 168 current states.
const approvedContentCodes=new Set(['P02','P04','P09','P11','P13','P15','P16','P24','P29','P32','P33','P34','P35','P36','P37','P38','P40','P41','P42']);
for(const [code,model] of Object.entries(oldLibrary)){
 assert.equal(JSON.stringify(api.BAROMETER_P_ACTION_LIBRARY[code].coverage),JSON.stringify(model.coverage),code+'/coverage');
 if(!approvedContentCodes.has(code))for(const key of ['title','steps','check','partial','insufficient'])assert.equal(JSON.stringify(api.BAROMETER_P_ACTION_LIBRARY[code][key]),JSON.stringify(model[key]),code+'/'+key);
}
fs.writeFileSync(out+'/protected-functions.json',JSON.stringify(protection,null,2));
console.log('GATE_NODE_RESULTS '+JSON.stringify({p:summary,elpRows:elp.length,sourceProfiles:120,protected:protection,unchangedRecommendationModels:42-approvedContentCodes.size}));

// Approved storage patch changes exactly the writer, reader and backup persistence.
for(const name of ['save','load','downloadResearchBackup']) assert.match(localHtml.slice(localHtml.indexOf('function '+name+'('),localHtml.indexOf('\nfunction ',localHtml.indexOf('function '+name+'(')+1)),/StorageSafety/);
