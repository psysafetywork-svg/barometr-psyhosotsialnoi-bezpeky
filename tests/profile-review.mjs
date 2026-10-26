import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadPortal,makeScenario,SIX_PRACTICES} from './profile-fixtures.mjs';

test('New Plan indicators are separate bullets; each criterion belongs to the selected action',async()=>{
 const portal=loadPortal(),s=makeScenario(portal.api,{items:{E01:[40,40]}}),a=s.analysis.actions.find(a=>a.id==='M1-A1');
 await portal.listeners.get('click')({target:{closest(){return {dataset:{a:'add-routed-action',m:'1',target:a.id},replaceWith(){}}}}});
 const card=portal.api.currentPlan()[0];assert.ok(card.indicator.split('\n').every(x=>x.startsWith('• ')));
 assert.deepEqual(card.indicator.split('\n').map(x=>x.slice(2)),Array.from(a.trace.checks,x=>x.text));
 assert.ok(portal.api.planRows().some(row=>row.includes(card.indicator)));
});

test('Previously generated role annotations are removed without overwriting custom text or owner',()=>{
 const {api}=loadPortal(),s=makeScenario(api,{items:{E02:[40,40]}});
 const card={id:'old-card',periodId:s.r.current,envId:s.environment.id,sourceTarget:'M1-A2',owner:'Власниця процесу',due:'2026-12-01',status:'У роботі',description:'• Для важливих завдань чітко визначати очікуваний результат, критерії якості, строк і пріоритет (HR і керівники команд).\n• Авторське уточнення: погодити календар з Оленою (HR).',indicator:'У реальних робочих ситуаціях працівники можуть пояснити, що є пріоритетним, якого результату від них очікують і до кого звертатися при суперечливих вимогах.'};
 const baseline=api.safeResearchClone(s.r);s.r.plan.push(card);const clone=api.safeResearchClone(s.r),updated=clone.plan[0];
 assert.doesNotMatch(updated.description,/HR і керівники команд/);assert.match(updated.description,/Авторське уточнення: погодити календар з Оленою \(HR\)\./);
 assert.ok(updated.indicator.startsWith('• '));assert.equal(updated.owner,card.owner);assert.equal(updated.due,card.due);assert.equal(updated.status,card.status);
 assert.deepEqual(JSON.parse(JSON.stringify(clone.periods)),JSON.parse(JSON.stringify(baseline.periods)));
 assert.deepEqual(api.safeResearchClone(clone),clone);
});

test('P13 criterion explains observable behaviour in profile, report and Plan',()=>{
 const {api}=loadPortal(),s=makeScenario(api,{practices:{P13:'partial'}}),a=s.analysis.actions.find(a=>a.basis_codes.includes('P13'));
 for(const text of [a.check,api.buildReportHtml(s.environment),api.barometerSemanticModuleMarkup(api.actualResultModel()[2])]){
  assert.doesNotMatch(text,/саме виправленої складової/);assert.match(text,/Правила поважної взаємодії визначено й пояснено працівникам/);
 }
});

test('Sensitive topics select anonymous clarification; ordinary work issues select conversations',()=>{
 const {api}=loadPortal();
 for(const code of ['E06','E11','E12','E13','E14','E15','E20','E30','E31'])for(const values of [[40,40],[40,0]]){
  const s=makeScenario(api,{items:{[code]:values}}),u=s.analysis.units.find(u=>u.method&&u.codes.includes(code));
  assert.equal(u.method,'anonymous-pulse',code);assert.match(u.steps.join(' '),/Якщо анонімність забезпечити неможливо/);assert.doesNotMatch(u.steps.join(' '),/встановлено порушення|доведено/);
 }
 for(const code of ['E01','E03','E07','E26','L04','L06']){
  const s=makeScenario(api,{items:{[code]:[40,40]}}),u=s.analysis.units.find(u=>u.method&&u.codes.includes(code));
  assert.equal(u.method,'confidential-conversation',code);assert.match(u.steps.join(' '),/добровільні конфіденційні/);
 }
});

test('Trust concerns change employee clarification across modules; lack of data never becomes a problem diagnosis',()=>{
 const {api}=loadPortal();
 let s=makeScenario(api,{items:{E01:[40,40],E15:[40,40]}});
 assert.equal(s.analysis.units.find(u=>u.method&&u.codes.includes('E01')).method,'anonymous-pulse');
 for(const options of [{nE:19,nL:9},{items:Object.fromEntries(api.SURVEY_ITEMS.map(x=>[x.code,'NA']))},{defaultPattern:[60,20],items:{E31:[60,0]}}]){
  s=makeScenario(api,options);assert.equal(s.analysis.units.filter(u=>u.method).length,0);
 }
});

test('Immediate protection precedes survey; reporting confidence does not erase an E31 signal',()=>{
 const {api}=loadPortal(),s=makeScenario(api,{items:{E31:[80,5],E15:[80,0]}}),m=s.analysis.modules[7];
 assert.ok(m.sections.steps[0].text.startsWith('Забезпечити негайний захист'));
 assert.ok(m.sections.alignment.some(x=>x.includes('Це різні питання')));
 assert.ok(m.sections.steps.some(x=>x.text.includes('за надходження повідомлення')));
 assert.ok(!s.analysis.actions.some(a=>a.basis_codes.includes('E31')));
});

test('Workload and resources criteria go to team problem solving, not the management-review card',()=>{
 const {api}=loadPortal();
 for(const options of [SIX_PRACTICES,{items:{E09:[40,40],L06:[40,40]},practices:{P12:'partial'}},{items:{E09:[40,40],L06:[40,40],E26:[40,40]},practices:{P12:'partial',P31:'partial'}}]){
  const s=makeScenario(api,options),team=s.analysis.actions.find(a=>a.id==='M2-A2'),review=s.analysis.actions.find(a=>a.id==='M2-A3');
  assert.ok(team&&review);assert.match(team.action,/зміни обсягу роботи, пріоритетів, строків або ресурсів/);
  for(const criterion of ['Коли працівникам доручали нові завдання','«урахування навантаження»','«ресурси для організації роботи команди»']){assert.ok(team.check.includes(criterion));assert.ok(!review.check.includes(criterion));}
  assert.match(review.check,/результати регулярних перевірок/);assert.ok(!review.basis_codes.includes('E09'));assert.ok(!review.basis_codes.includes('L06'));
 }
});

test('P12 S1 and full-practice verification retain only each action’s own topic codes',()=>{
 const {api}=loadPortal();
 let s=makeScenario(api,{items:{E07:[40,40],L04:[40,40]},practices:{P12:'no'}});
 const review=s.analysis.actions.find(a=>a.id==='M2-A3'),feedback=s.analysis.actions.find(a=>a.id==='M2-A1');
 assert.deepEqual(Array.from(review.basis_codes),['P12']);assert.match(feedback.check,/час для регулярних|час для розмов/);assert.match(feedback.check,/корисний зворотний зв’язок/);
 s=makeScenario(api,{items:{L04:[40,40],L05:[40,40],L06:[40,40]}});
 const time=s.analysis.actions.find(a=>a.id==='M2-D3'),resources=s.analysis.actions.find(a=>a.id==='M2-A2');
 assert.deepEqual(Array.from(time.basis_codes),['L04']);assert.ok(resources.basis_codes.includes('L05'));assert.ok(resources.basis_codes.includes('L06'));
});

test('All 14 demonstrations produce valid scoped actions and role-free generated text in every module',()=>{
 const {api,context}=loadPortal();vm.runInContext(fs.readFileSync(new URL('../scripts/manual-weather.js',import.meta.url),'utf8'),context);
 const all=[vm.runInContext('manualWeatherResearch(MANUAL_MIXED_WEATHER)',context)];
 for(const triple of [['Буря','Ясно','Ясно'],['Ясно','Буря','Ясно'],['Ясно','Ясно','Буря'],['Буря','Буря','Буря'],['Хмарно','Хмарно','Хмарно'],['Туман','Ясно','Хмарно'],['Ясно','Туман','Хмарно'],['Буря','Туман','Туман']])all.push(vm.runInContext('manualWeatherResearch('+JSON.stringify(Array.from({length:7},()=>triple))+')',context));
 for(const name of ['module2_sample','six_gaps','discrepancy','favorable','insufficient'])all.push(JSON.parse(fs.readFileSync(new URL('../qa/profile-v45/review/'+name+'.json',import.meta.url))));
 assert.equal(all.length,14);
 for(const r of all){api.setState({screen:'dash',r,env:r.periods[0].envs[0].id,module:1,modal:null,demo:false});const a=api.barometerSemanticInterpretation();
  assert.equal(Object.keys(a.modules).length,7);
  for(const action of a.actions){assert.ok(action.id&&action.module>=1&&action.module<=7);assert.ok(action.check);assert.ok(action.check.split('\n').every(x=>x.startsWith('• ')));for(const entry of action.trace.checks)assert.equal(entry.route,action.id);}
  for(const m of Object.values(a.modules))for(const field of ['steps','checks'])for(const entry of m.sections[field])assert.doesNotMatch(entry.text,/\((?:HR|керівник|уповноважена особа)|саме виправленої складової|Організувати анонімне уточнення/u);
 }
});
