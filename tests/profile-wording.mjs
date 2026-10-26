import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPortal,makeScenario} from './profile-fixtures.mjs';
const {api}=loadPortal();
const vague=/Уточнити оцінки щодо питання|зміст часткових оцінок щодо питання|Змішані оцінки .* без проблемного результату/u;

test('Screenshot M1: clarification identifies the actual work situation on screen and in report',()=>{
 const expected=[
  'З’ясувати, які обов’язки або межі відповідальності залишаються для працівників нечіткими.',
  'З’ясувати, які критерії оцінювання результатів роботи працівникам незрозумілі або не пояснені.',
  'З’ясувати, у яких ситуаціях працівникам складно визначити, які завдання виконувати насамперед.',
  'З’ясувати, як працівники отримують допомогу керівника у визначенні черговості завдань, коли робочі вимоги суперечать одна одній.',
  'З’ясувати, якої інформації про майбутні організаційні зміни бракує працівникам і чи достатньо часу вони мають для підготовки.'
 ];
 for(const pattern of [[40,40],[40,0]]){
  const s=makeScenario(api,{items:Object.fromEntries(['E01','E02','E03','E04','E05'].map(c=>[c,pattern]))});
  const screen=api.barometerSemanticModuleMarkup(api.actualResultModel()[0]),report=api.buildReportHtml(s.environment);
  for(const value of expected){assert.ok(s.analysis.modules[1].sections.attention.includes(value),value);assert.ok(screen.includes(value));assert.ok(report.includes(value));}
  assert.doesNotMatch(screen,vague);assert.doesNotMatch(report,vague);
 }
});

test('Below-threshold items are not narrated; problem aspects and strengths remain',()=>{
 for(const code of ['E01','L01'])for(const [values,branch] of [[[60,20],'mixed'],[[55,20],'mixed'],[[74,0],'mixed'],[[75,15],'mixed'],[[75,14],'favorable'],[[54,20],'negative'],[[60,30],'negative'],[[40,0],'partial']]){
  const s=makeScenario(api,{nL:100,items:{[code]:values}}),m=s.analysis.modules[1];
  const source=code[0]==='E'?'працівників':'керівників команд';
  const phrase='Оцінки '+source+' різняться. Барометр не відносить ці питання до проблемних';
  assert.equal(s.analysis.input.branches[code],branch);
  assert.ok(!m.sections.alignment.some(t=>t.includes(phrase)));assert.doesNotMatch(m.sections.alignment.join(' '),/оцінки .*різняться|поріг проблемного|не відносить ці питання/iu);
  assert.equal(m.problemCodes.includes(code),['negative','partial'].includes(branch));
  if(branch==='mixed'){assert.ok(!s.analysis.actions.some(a=>a.basis_codes.includes(code)));assert.ok(!api.buildReportHtml(s.environment).includes(phrase));}
 }
});

test('All questionnaire items and checkup variants retain concrete nonempty clarification text',()=>{
 for(const item of api.SURVEY_ITEMS)for(const pattern of [[40,40],[40,0]])for(const p12 of ['full','partial','no']){
  const s=makeScenario(api,{items:{[item.code]:pattern},practices:{P12:p12}});
  for(const m of Object.values(s.analysis.modules)){
   const values=[...m.sections.alignment,...m.sections.attention,...m.sections.steps.map(x=>x.text)];
   for(const value of values){assert.equal(typeof value,'string');assert.ok(value.trim());assert.doesNotMatch(value,vague);assert.doesNotMatch(value,/undefined|null/u);}
  }
  for(const action of s.analysis.actions)assert.doesNotMatch(action.action,vague);
 }
});

test('Generated recommendations and criteria omit assignee labels but retain meaningful role references',()=>{
 for(const pattern of [[40,40],[40,0],[60,20],[80,0]])for(const state of ['no','partial','full','insufficient']){
  const s=makeScenario(api,{defaultPattern:pattern,practices:Object.fromEntries(api.P_LIST.map(p=>[p.code,state])),p40Risk:'confirmed',localRisk:'confirmed'});
  for(const m of Object.values(s.analysis.modules))for(const field of ['steps','checks'])for(const x of m.sections[field])assert.doesNotMatch(x.text,/\((?:HR|L&D|БЗР|ОП|керівник|керівництв|визначені відповідальні|відповідальн|власник)|\bHR\b/u);
 }
 const s=makeScenario(api,{items:{L04:[40,40]}});
 assert.ok(s.analysis.modules[2].sections.attention.some(x=>x.includes('керівникам команд знаходити час')));
});

test('A new Plan card leaves the owner blank and preserves the owner entered by its user',async()=>{
 const portal=loadPortal(),s=makeScenario(portal.api,{items:{E01:[40,40]}}),a=s.analysis.actions[0];
 const button={dataset:{a:'add-routed-action',m:String(a.module),target:a.target},replaceWith(){}};
 await portal.listeners.get('click')({target:{closest(){return button}}});
 const card=portal.api.currentPlan()[0];assert.equal(card.owner||'','');
 assert.doesNotMatch(card.description,/\((?:HR|БЗР|керівник)/u);
 card.owner='Власник процесу';card.description='Текст, відредагований власником дослідження (HR).';
 const clone=portal.api.safeResearchClone(portal.api.getState().r);
 assert.equal(clone.plan[0].owner,'Власник процесу');assert.equal(clone.plan[0].description,card.description);
});


test('Mixed-only module has no filler conclusion; real practice gaps and special safety rules remain',()=>{
 const mixed=Object.fromEntries(api.SURVEY_ITEMS.filter(x=>x.module===1).map(x=>[x.code,[60,20]]));
 let s=makeScenario(api,{items:mixed});assert.equal(s.analysis.modules[1].sections.alignment.length,0);assert.ok(!api.barometerSemanticModuleMarkup(api.actualResultModel()[0]).includes('<h4>Як узгоджуються джерела</h4>'));
 s=makeScenario(api,{items:mixed,practices:{P01:'partial'}});assert.ok(s.analysis.modules[1].sections.alignment.some(t=>t.includes('часткову або нерівномірну реалізацію')));
 s=makeScenario(api,{items:{E31:[80,5]}});assert.ok(s.analysis.modules[7].sections.alignment.some(t=>t.includes('навіть невелика частка несприятливих відповідей')));
 s=makeScenario(api,{items:{E31:[40,40]}});assert.ok(s.analysis.modules[7].sections.checks.some(x=>x.text==='Погоджені заходи для запобігання неприйнятній поведінці виконано у визначені строки.'));assert.doesNotMatch(s.analysis.modules[7].sections.checks.map(x=>x.text).join(' '),/Після погодження заходів: погоджені/u);
});

test('Every module explains what to do with insufficient applicable data without creating a corrective Plan action',()=>{
 for(let mid=1;mid<=7;mid++){
  const items=Object.fromEntries(api.SURVEY_ITEMS.filter(x=>x.module===mid).map(x=>[x.code,'NA']));
  const s=makeScenario(api,{items}),notes=s.analysis.modules[mid].dataNotes;
  assert.ok(notes.some(t=>t.includes('недостатньо застосовних даних')));
  const instructions=notes.filter(t=>t.startsWith('Перевірити, чи ці питання стосуються роботи'));
  assert.equal(instructions.length,1);assert.match(instructions[0],/повторити анонімне опитування/);assert.match(instructions[0],/лише після отримання достатніх даних/);
  assert.equal(s.analysis.actions.length,0);
  assert.ok(api.barometerSemanticModuleMarkup(api.actualResultModel()[mid-1]).includes(instructions[0]));
  assert.ok(api.buildReportHtml(s.environment).includes(instructions[0]));
 }
});
