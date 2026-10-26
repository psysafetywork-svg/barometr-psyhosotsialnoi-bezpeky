import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadPortal,makeScenario,SIX_PRACTICES} from './profile-fixtures.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
const company=p=>vm.runInContext('profileV45CompanyTarget()',p.context);
const openCompany=(p,s)=>{p.api.getState().env=null;return p.api.barometerSemanticInterpretation()};
const click=(p,dataset)=>p.listeners.get('click')({target:{closest(){return {dataset,replaceWith(){}}}}});
const allText=a=>JSON.stringify(Object.values(a.modules).map(m=>m.sections));
const forbidden=/розмови:\s*з працівниками|твердження про повага|приведено у відповідність|керівників команд із командами|Барометр не відносить|виражених проблемних ознак.*не виявлено|\(HR|\(керівники команд\)/u;
for(const state of ['full','partial','no','insufficient',null])for(let num=1;num<=42;num++)test(`Company checkup P${String(num).padStart(2,'0')} ${state}`,()=>{
 const p=loadPortal(),code='P'+String(num).padStart(2,'0'),s=makeScenario(p.api,{practices:{[code]:state},p40Risk:'confirmed'});s.r.periods[0].envs=[];const a=openCompany(p,s);
 assert.equal(p.api.validateBackupResearch(s.r),true);assert.equal(p.api.canDashboard(company(p)),true);assert.equal(p.api.actualResultModel().length,7);
 for(const row of p.api.actualResultModel()){assert.equal(row.e,null);assert.equal(row.l,null);assert.equal(row.p,p.api.calculatePResults(s.checkup).modules[row.m].status)}
 for(const action of a.actions){assert.deepEqual(plain(action.sources),['P']);assert.deepEqual(plain(action.basis_codes),[code]);assert.ok(action.trace.checks.length);assert.ok(action.trace.checks.every(x=>x.codes.every(c=>c[0]==='P')));assert.doesNotMatch(action.check,/Повторне опитування|У повторному опитуванні/)}
 assert.equal(a.actions.length>0,['partial','no'].includes(state));assert.doesNotMatch(allText(a),forbidden);assert.doesNotMatch(allText(a),/відповіді працівників.*сприятлив|відповідями працівників і керівників|цього робочого середовища/);
 for(const m of Object.values(a.modules))assert.equal(m.checkupOnly,true);
});
const weather=['Ясно','Хмарно','Буря','Туман'];
const patterns={'Ясно':[80,0],'Хмарно':[60,20],'Буря':[40,40],'Туман':'NA'};
for(let mid=1;mid<=7;mid++)for(const e of weather)for(const ps of weather)for(const nL of [0,5])test(`E/P M${mid} ${e}/${ps}, L=${nL}`,()=>{
 const p=loadPortal(),items=Object.fromEntries(p.api.SURVEY_ITEMS.filter(i=>i.module===mid).map(i=>[i.code,i.source==='E'?patterns[e]:[0,100]]));
 const practices={},own=p.api.P_LIST.filter(i=>i.module===mid);
 if(ps==='Хмарно')practices[own[0].code]='partial';if(ps==='Буря')for(const x of own.slice(0,2))practices[x.code]='no';if(ps==='Туман')for(const x of own.slice(0,3))practices[x.code]='insufficient';
 const s=makeScenario(p.api,{nL,items,practices}),a=s.analysis,row=p.api.actualResultModel()[mid-1],map=p.api.weatherMapHtml(p.api.actualResultModel(),s.environment);
 assert.equal(row.e,e);assert.equal(row.p,ps);assert.equal(row.l,nL?'Недостатня вибірка':null);
 assert.match(map,/<th>Працівники<\/th>/);assert.match(map,/<th>Організаційний чекап<\/th>/);assert.doesNotMatch(map,/<th>Керівники<\/th>/);
 assert.match(map,nL?/Відповідей керівників недостатньо.*5 валідних/:/Даних керівників немає/);
 for(const action of a.actions){assert.ok(action.evidence.every(x=>x.source!=='L'));assert.ok(action.trace.checks.every(x=>x.codes.every(c=>c[0]!=='L')));assert.ok(action.trace.steps.every(x=>x.codes.every(c=>c[0]!=='L')));}
 assert.doesNotMatch(allText(a),forbidden);assert.doesNotMatch(allText(a),/відповідями працівників і керівників/);for(const action of a.actions)assert.doesNotMatch(action.check,/окремо для працівників і керівників/);
 if(e==='Туман'){assert.ok(a.modules[mid].dataNotes.some(t=>t.startsWith('Перевірити, чи ці питання')));assert.ok(!a.actions.some(x=>x.basis_codes.some(c=>items[c]==='NA')))}
});

test('Company home, report, plan and persistence work without a fabricated environment',async()=>{
 const p=loadPortal(),s=makeScenario(p.api,{practices:{P08:'partial',P12:'no'},p40Risk:'confirmed'});s.r.periods[0].envs=[];p.api.normalizeResearch(s.r);p.api.getState().screen='home';p.api.getState().env=null;p.api.render();
 assert.match(p.app.innerHTML,/data-a="checkup-results"/);assert.match(p.app.innerHTML,/результати чекапу компанії готові/);
 const before=JSON.stringify(s.r.periods);await click(p,{a:'checkup-results'});assert.equal(p.api.getState().screen,'dash');assert.equal(p.api.getState().env,null);assert.equal(s.r.periods[0].envs.length,0);
 const a=p.api.selectedActions(2).find(x=>x.id==='M2-A2');assert.ok(a);await click(p,{a:'add-routed-action',m:'2',target:a.id});await click(p,{a:'add-routed-action',m:'2',target:a.id});
 assert.equal(p.api.currentPlan().length,1);let card=p.api.currentPlan()[0];assert.equal(card.envId,null);assert.equal(card.description,a.action);assert.equal(card.indicator,a.check);card.owner='Власна роль';card.description+='\nАвторська примітка';card.due='2026-11-01';p.api.save();
 const restored=p.api.load();assert.equal(p.api.validateBackupResearch(restored),true);assert.equal(restored.plan[0].owner,'Власна роль');assert.match(restored.plan[0].description,/Авторська примітка/);assert.equal(JSON.stringify(restored.periods),before);
 const report=p.api.buildReportHtml(company(p));assert.equal(p.api.getState().env,null);assert.match(report,/Рівень оцінювання/);assert.doesNotMatch(report,/<th>Працівники<\/th>|<th>Керівники<\/th>|Умови повторного опитування/);assert.equal((report.match(/Що показує чекап/g)||[]).length,7);
 p.api.getState().screen='plan';p.api.render();assert.match(p.app.innerHTML,/data-a="report-company"/);assert.doesNotMatch(p.app.innerHTML,/disabled title="Спочатку мають бути готові результати/);assert.ok(p.api.planRows().length>1);
});

test('Switching company/environment reports preserves survey data and keeps Plan scopes separate',async()=>{
 const p=loadPortal(),s=makeScenario(p.api,{items:{E08:[40,40]},practices:{P08:'partial'}});p.api.normalizeResearch(s.r);const before=JSON.stringify(s.r.periods);
 await click(p,{a:'add-routed-action',m:'2',target:'M2-A2'});const originalId=p.api.getState().env;
 p.api.buildReportHtml(company(p));assert.equal(p.api.getState().env,originalId);openCompany(p,s);await click(p,{a:'add-routed-action',m:'2',target:'M2-A2'});
 assert.equal(p.api.currentPlan().length,2);assert.deepEqual(plain(p.api.currentPlan().map(a=>a.envId)),[originalId,null]);assert.equal(JSON.stringify(s.r.periods),before);assert.equal(p.api.validateBackupResearch(p.api.safeResearchClone(s.r)),true);
});

test('Incomplete checkup never opens company results or generates practice recommendations',async()=>{
 const p=loadPortal(),s=makeScenario(p.api,{done:false,practices:{P12:'no',P23:'insufficient'}});s.r.periods[0].envs=[];openCompany(p,s);p.api.getState().screen='home';await click(p,{a:'checkup-results'});
 assert.equal(p.api.getState().screen,'home');assert.equal(p.api.canDashboard(company(p)),false);assert.equal(p.api.actualResultModel().length,0);assert.equal(p.api.barometerSemanticInterpretation().actions.length,0);assert.ok(!p.api.barometerSemanticInterpretation().units.some(u=>u.codes.some(c=>c[0]==='P')));
});

test('Company P40 uses company applicability; environment overrides remain local',()=>{
 const p=loadPortal(),s=makeScenario(p.api,{practices:{P40:'no'},p40Risk:'confirmed',localRisk:'not_confirmed'});
 assert.ok(!s.analysis.actions.some(a=>a.basis_codes.includes('P40')));assert.ok(openCompany(p,s).actions.some(a=>a.basis_codes.includes('P40')));
 s.checkup.p40Risk='not_confirmed';assert.ok(!p.api.barometerSemanticInterpretation().actions.some(a=>a.basis_codes.includes('P40')));
 s.checkup.p40Risk=null;assert.match(p.api.barometerSemanticInterpretation().actions.find(a=>a.basis_codes.includes('P40')).action,/З’ясувати, чи виникає ризик/);
});

test('Audit fixes grammar, imperative consistency and method conflicts in combinations',()=>{
 const p=loadPortal();
 for(const opts of [SIX_PRACTICES,{defaultPattern:[40,0]},{defaultPattern:[40,40]},{items:{E17:[40,40],E31:[40,40]}}]){
  const a=makeScenario(p.api,opts).analysis;assert.doesNotMatch(allText(a),forbidden);
  for(const m of Object.values(a.modules))for(const t of m.sections.attention)assert.doesNotMatch(t,/^(Чи|Що) /);
 }
 const s=makeScenario(p.api,{items:{E17:[40,40],E31:[40,40]}});const a=s.analysis.actions.find(a=>a.basis_codes.includes('E17'));assert.match(a.action,/анонімне пульс-опитування/);assert.doesNotMatch(a.action,/Уточнити в коротких добровільних конфіденційних розмовах/);
 const m=makeScenario(p.api,SIX_PRACTICES).analysis.actions.find(a=>a.id==='M2-A2');assert.match(m.check,/Команду забезпечено погодженими ресурсами/);assert.doesNotMatch(m.action,/розмови:/);
});

test('Exact former generated resource criterion is updated without changing custom Plan content',()=>{
 const p=loadPortal(),s=makeScenario(p.api);s.r.plan=[{id:'old-card',periodId:s.r.current,envId:s.environment.id,sourceTarget:'M2-A2',action:'Приклад',description:'• Запропонувати короткі добровільні конфіденційні розмови: з працівниками щодо таких питань, як урахування навантаження; з керівниками команд щодо таких питань, як ресурси. Заздалегідь пояснити доступ до інформації; у висновках не називати учасників і не з’ясовувати, хто як відповів в анкеті.\nМоя власна примітка: HR і керівники команд.',indicator:'Команда отримала погоджені ресурси або обсяг і строки завдань приведено у відповідність до доступних ресурсів.\nМій критерій.',owner:'Авторська роль',due:'2026-11-01',status:'В роботі'}];
 const card=p.api.currentPlan()[0];assert.match(card.indicator,/^• Команду забезпечено погодженими ресурсами/);assert.match(card.indicator,/Мій критерій\.$/);assert.equal(card.owner,'Авторська роль');assert.match(card.description,/Моя власна примітка: HR і керівники команд\.$/);assert.match(card.description,/розмови з працівниками.* та з керівниками команд/);assert.doesNotMatch(card.description,/розмови:/);
});

const preview=new URL('../qa/profile-v45/manual-review/',import.meta.url);
for(const name of fs.readdirSync(preview).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5)))test('Updated manual preview fixture '+name,()=>{
 const p=loadPortal(),r=JSON.parse(fs.readFileSync(new URL(name+'.json',preview))).data;assert.equal(p.api.validateBackupResearch(r),true);p.api.setState({screen:'dash',r,env:r.periods[0].envs[0]?.id||null,module:1,modal:null,demo:false});p.api.render();
 assert.equal(p.api.actualResultModel().length,name==='checkup_unfinished'?0:7);assert.doesNotMatch(p.app.innerHTML,/undefined|NaN/);
});
