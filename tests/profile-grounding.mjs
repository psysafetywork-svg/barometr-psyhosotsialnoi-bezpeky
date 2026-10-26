import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPortal,makeScenario,SIX_PRACTICES} from './profile-fixtures.mjs';

test('Every isolated survey problem has only its own evidence and improvement targets across all seven modules',()=>{
 const {api}=loadPortal();
 for(const item of api.SURVEY_ITEMS)for(const pattern of [[40,40],[40,0]]){
  const a=makeScenario(api,{items:{[item.code]:pattern}}).analysis;
  for(const action of a.actions){
   assert.deepEqual(Array.from(action.basis_codes),[item.code],item.code);
   assert.equal(action.evidence[0].kind,'survey-problem');
   assert.ok(!action.basisText.includes('чекапу'));
   for(const check of action.trace.checks.filter(x=>x.kind==='repeat'))assert.deepEqual(Array.from(check.codes),[item.code]);
  }
  for(const module of Object.values(a.modules))for(const check of module.sections.checks.filter(x=>['improve','zero','reduce'].includes(x.direction)))assert.deepEqual(Array.from(check.codes),[item.code]);
 }
});

test('Favourable responses plus a checkup gap justify only that practice, not survey improvement',()=>{
 const {api}=loadPortal();
 for(const p of api.P_LIST)for(const answer of ['no','partial']){
  const s=makeScenario(api,{practices:{[p.code]:answer},p40Risk:'confirmed',localRisk:'confirmed'});
  assert.ok(s.analysis.actions.length,p.code);
  for(const a of s.analysis.actions){assert.deepEqual(Array.from(a.basis_codes),[p.code]);assert.match(a.basisText,/прогалина організаційного чекапу/);assert.ok(a.evidence.every(x=>x.kind==='practice-gap'));assert.ok(!a.trace.checks.some(x=>['improve','zero','reduce'].includes(x.direction)))}
  assert.match(s.analysis.modules[p.module].sections.alignment.join(' '),/чекап|практик/);
 }
});

test('Favourable, nonproblem mixed, insufficient and unfinished inputs never create corrective actions',()=>{
 const {api}=loadPortal();
 for(const opts of [{},{defaultPattern:[60,20],items:{E31:[60,0]}},{nE:19,nL:9},{items:Object.fromEntries(api.SURVEY_ITEMS.map(x=>[x.code,'NA']))},{done:false,practices:Object.fromEntries(api.P_LIST.map(x=>[x.code,'no']))}]){
  const a=makeScenario(api,opts).analysis;assert.equal(a.actions.length,0);
  if(opts.done===false)for(const m of Object.values(a.modules))assert.doesNotMatch(m.sections.alignment.join(' '),/За організаційним чекапом|чекап показує|практика не реалізована/);
 }
});

test('Scoped wording does not turn neighbouring favourable questions into improvement recommendations',()=>{
 const {api}=loadPortal();
 const cases=[['E02',/пріоритет|суперечлив/,/критері/],['E18',/розвитк|навчан/,/інформаці|ресурс/],['E19',/робочих ресурсів/,/розвитк|навчан/],['E21',/робочого часу|темп/,/метод|інструмент/],['E27',/перевантаж|обсяг роботи/,/перерв/],['E29',/тиск|негативних наслідків/,/психологічн/],['E32',/небезпечну умову|несправне обладнання/,/доступ|індивідуальн/]];
 for(const [code,forbidden,expected] of cases){const a=makeScenario(api,{items:{[code]:[40,40]}}).analysis.actions[0];assert.doesNotMatch(a.title+' '+a.action+' '+a.check,forbidden,code);assert.match(a.action+' '+a.check,expected,code)}
});

test('Manager guidance preserves information, authority and representation distinctions',()=>{
 const {api}=loadPortal();
 for(const [code,expected] of [['L01',/межі відповідальності та повноважень/],['L13',/повноваження визначати/],['L14',/обговорити зміни з працівниками до остаточного рішення/],['L15',/представити потреби й пропозиції команди на вищому рівні/]]){
  const a=makeScenario(api,{items:{[code]:[40,40]}}).analysis.actions[0];assert.match(a.check,expected,code);
 }
});

test('Repeat criteria retain all problem items, source distinctions and direction after consolidation',()=>{
 const {api}=loadPortal(),a=makeScenario(api,SIX_PRACTICES).analysis;
 const repeats=a.modules[2].sections.checks.filter(x=>x.kind==='repeat');
 assert.deepEqual([...new Set(repeats.flatMap(x=>Array.from(x.codes)))].sort(),['E06','E07','E08','E09','L04','L06']);
 assert.ok(repeats.every(x=>x.codes.every(c=>c[0]===x.source)));
 assert.ok(repeats.some(x=>x.codes.includes('E06')&&x.direction==='reduce'));
 assert.ok(repeats.some(x=>x.codes.includes('E08')&&x.codes.includes('E09')));
 const partial=makeScenario(api,{items:{E02:[40,0],E03:[40,40]}}).analysis.actions[0];
 assert.ok(partial.trace.checks.some(x=>x.codes.includes('E02')&&x.direction==='zero'&&x.text.includes('несприятливих відповідей немає')));
 assert.ok(partial.trace.checks.some(x=>x.codes.includes('E03')&&x.direction==='improve'));
});

test('Shared repeat conditions occur once in the report and once in each standalone Plan indicator',async()=>{
 const portal=loadPortal(),s=makeScenario(portal.api,SIX_PRACTICES),report=portal.api.buildReportHtml(s.environment);
 assert.equal((report.match(/Кожне твердження оцінювати окремо/g)||[]).length,1);
 for(const a of s.analysis.actions){assert.ok((a.check.match(/Кожне твердження оцінювати окремо/g)||[]).length<=1);if(a.trace.checks.some(x=>x.kind==='repeat'))assert.equal((a.check.match(/Кожне твердження оцінювати окремо/g)||[]).length,1)}
 const a=s.analysis.actions.find(x=>x.id==='M2-A2');
 await portal.listeners.get('click')({target:{closest(){return {dataset:{a:'add-routed-action',m:'2',target:a.id},replaceWith(){}}}}});
 const saved=portal.api.currentPlan()[0];assert.equal(saved.indicator,a.check);assert.equal(saved.description,a.action);assert.ok(saved.description.startsWith('Підстава:'));
});

test('Action numbering matches result groups and each action has exactly one Add to Plan control',()=>{
 const {api}=loadPortal(),s=makeScenario(api,SIX_PRACTICES),m=s.analysis.modules[2],html=api.barometerSemanticModuleMarkup(api.actualResultModel()[1]);
 for(let i=1;i<=m.actions.length;i++){assert.ok(html.includes('>'+i+'. '));assert.ok(html.includes('>До дії '+i+'</p>'))}
 assert.equal((html.match(/data-a="add-routed-action"/g)||[]).length,m.actions.length);
 for(const a of m.actions)assert.equal((html.match(new RegExp('data-target="'+a.id+'"','g'))||[]).length,1);
 assert.equal((html.match(/class="profile-v45-card /g)||[]).length,4);
 assert.doesNotMatch(html,/Короткий головний висновок|Головний висновок модуля/);
});

test('Resource clarification is merged without losing workload or resources evidence and criteria',()=>{
 const {api}=loadPortal(),a=makeScenario(api,SIX_PRACTICES).analysis,team=a.actions.find(x=>x.id==='M2-A2');
 assert.equal(team.trace.steps.filter(x=>x.text.includes('яких ресурсів і допомоги бракує')).length,1);
 assert.ok(!team.trace.steps.some(x=>x.text==='З’ясувати, яких ресурсів бракує для роботи команди та які завдання це ускладнює.'));
 for(const code of ['E08','E09','L06','P08']){assert.ok(team.trace.steps.some(x=>x.codes.includes(code)));assert.ok(team.trace.checks.some(x=>x.codes.includes(code)))}
});

test('Partial agreement about respect does not imply an established incident',()=>{
 const {api}=loadPortal(),s=makeScenario(api,{items:{E06:[40,0]}}),a=s.analysis.actions[0];assert.doesNotMatch(a.check,/припинилися.*прояви|підтверджено порушення/);assert.match(a.check,/несприятливих відповідей немає/);
});
