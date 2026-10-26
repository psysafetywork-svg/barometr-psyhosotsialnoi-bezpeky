import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPortal,makeScenario,SIX_PRACTICES} from './profile-fixtures.mjs';
const {api}=loadPortal();
const plain=x=>JSON.parse(JSON.stringify(x));
const text=m=>JSON.stringify(m.sections);
const pattern={clear:[80,0],cloudy:[60,20],storm:[40,40],fog:'NA'};
const weather={clear:'Ясно',cloudy:'Хмарно',storm:'Буря',fog:'Туман'};
const evidence=[];
const directCommands=/(?<!\p{L})(?:уточніть|перевірте|зіставте|з[’']ясуйте|визначте|перегляньте|забезпечте|поясніть|запропонуйте|погодьте|врахуйте|усуньте|доповніть|змініть|організуйте|обговоріть)(?!\p{L})/iu;
function assertEditorial(analysis){
 for(const m of Object.values(analysis.modules)){
  const values=[...m.sections.alignment,...m.sections.attention,...m.sections.steps.map(x=>x.text),...m.sections.checks.map(x=>x.text),...m.dataNotes];
  for(const value of values){assert.doesNotMatch(value,directCommands);assert.doesNotMatch(value,/Уточнити оцінки щодо питання|зміст часткових оцінок щодо питання|Змішані оцінки .* без проблемного результату/u);assert.doesNotMatch(value,/[:;,]\s+[А-ЯІЇЄҐ][а-яіїєґ]/u);}
  for(const value of m.sections.attention)assert.doesNotMatch(value,/^(?:Які|Яких|Як |Що потрібно|Важливо)|\?/u);
  for(const value of m.sections.alignment)assert.doesNotMatch(value,/сприятливо оцінюють такі питання:|\. керівники/u);
 }
}
function check(name,expected,fn){test(name,()=>{try{const actual=fn();evidence.push({test:name,expected,actual:actual??'Assertions passed',result:'PASS'})}catch(e){evidence.push({test:name,expected,actual:e.message,result:'FAIL'});throw e}})}
process.on('exit',()=>{if(process.env.BAROMETER_QA_OUT){fs.mkdirSync(process.env.BAROMETER_QA_OUT,{recursive:true});fs.writeFileSync(path.join(process.env.BAROMETER_QA_OUT,'coverage.json'),JSON.stringify(evidence,null,2)+'\n')}});
for(let mid=1;mid<=7;mid++)for(const e of Object.keys(pattern))for(const l of Object.keys(pattern))for(const p of Object.keys(pattern)){
 const codes=api.P_LIST.filter(x=>x.module===mid).map(x=>x.code);
 const practices=p==='clear'?{}:p==='cloudy'?{[codes[0]]:'partial'}:p==='storm'?Object.fromEntries(codes.slice(0,2).map(c=>[c,'no'])):Object.fromEntries(codes.slice(0,3).map(c=>[c,'insufficient']));
 check(`weather M${mid} ${e}/${l}/${p}`,`${weather[e]} / ${weather[l]} / ${weather[p]}`,()=>{
  const items=Object.fromEntries(api.SURVEY_ITEMS.filter(x=>x.module===mid).map(x=>[x.code,pattern[x.source==='E'?e:l]]));
  const s=makeScenario(api,{items,practices}),row=api.actualResultModel()[mid-1];
  assertEditorial(s.analysis);
  assert.deepEqual([row.e,row.l,row.p],[weather[e],weather[l],weather[p]]);
  assert.equal(s.analysis.modules[mid].practiceAudit.length,6);
  const html=api.barometerSemanticModuleMarkup(row);
  for(const heading of ['Як узгоджуються джерела','На що звернути увагу','Рекомендовані організаційні дії','Як перевірити результат'])assert.equal(html.split('<h4>'+heading+'</h4>').length-1,heading==='Як узгоджуються джерела'&&!s.analysis.modules[mid].sections.alignment.length?0:1);
  return [row.e,row.l,row.p].join(' / ');
 });
}
for(const practice of api.P_LIST)for(const answer of ['full','partial','no','insufficient',null])check(`practice ${practice.code} ${answer??'missing'}`,`Distinct ${answer??'missing'} state; correction only no/partial; verification only insufficient`,()=>{
 const s=makeScenario(api,{practices:{[practice.code]:answer},p40Risk:'confirmed',localRisk:'confirmed'}),m=s.analysis.modules[practice.module];
 assertEditorial(s.analysis);
 assert.equal(m.practiceAudit.find(p=>p.code===practice.code).answer,answer);
 const units=s.analysis.units.filter(u=>u.codes.includes(practice.code));
 if(['no','partial'].includes(answer)){assert.ok(units.some(u=>u.steps.length));assert.ok(units.some(u=>u.checks.length));assert.ok(s.analysis.actions.some(a=>a.basis_codes.includes(practice.code)))}
 else assert.ok(!s.analysis.actions.some(a=>a.basis_codes.includes(practice.code)));
 if(answer==='insufficient'){assert.ok(units.some(u=>u.profileOnly));assert.match(text(m),/підтвердж/)}
 if(answer===null)assert.match(text(m),/Немає відповідей щодо таких практик/);
 return {units:units.map(u=>u.id),actions:s.analysis.actions.map(a=>a.id)};
});
for(const item of api.SURVEY_ITEMS)for(const [branch,values] of Object.entries({favorable:[80,0],mixed:[60,20],partial:[40,0],negative:[40,40]}))check(`item ${item.code} ${branch}`,`${branch}; item retained in selection without changing weather rules`,()=>{
 const s=makeScenario(api,{items:{[item.code]:values}});assert.equal(s.analysis.input.branches[item.code],branch);
 assertEditorial(s.analysis);
 if(['partial','negative'].includes(branch)){assert.ok(s.analysis.modules[item.module].problemCodes.includes(item.code));assert.ok(s.analysis.units.some(u=>u.codes.includes(item.code)&&u.steps.length&&u.checks.length))}
 if(branch==='favorable')assert.equal(s.analysis.actions.length,0);
 return s.analysis.input.branches[item.code];
});
check('M2 sample raw calculator and all six practices','E storm; L cloudy; P cloudy; S2; semantic Plan partitions; six auditable practices',()=>{
 const s=makeScenario(api,SIX_PRACTICES),m=s.analysis.modules[2],row=api.actualResultModel()[1];assert.deepEqual([row.e,row.l,row.p],['Буря','Хмарно','Хмарно']);
 assert.equal(s.e.modules[2].favorable,48);assert.equal(s.e.modules[2].unfavorable,32);assert.ok(Math.abs(s.l.modules[2].unfavorable-80/3)<1e-9);
 assert.equal(s.analysis.p12Scenario,'P12-S2');assert.ok(m.sections.steps.length>=11);assert.ok(m.actions.find(a=>a.id==='M2-A2').basis_codes.includes('E09'));assert.ok(!m.actions.find(a=>a.id==='M2-A3').basis_codes.includes('E09'));
 for(const p of ['P07','P08','P09','P10','P11','P12']){assert.ok(m.sections.steps.some(x=>x.codes.includes(p)));assert.ok(m.sections.checks.some(x=>x.codes.includes(p)))}
 const report=api.buildReportHtml(s.environment);assert.doesNotMatch(report,/Перевірка повноти зразка/);assert.doesNotMatch(report.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g,''),/P12-S2|\bE06\b|\bP07\b/);
 for(const a of s.analysis.actions)for(const entry of a.trace.steps){if(entry.units.some(id=>id.startsWith('clarify:')))assert.ok(m.sections.steps.some(x=>x.units.some(id=>id.startsWith('clarify:'))&&entry.codes.every(c=>x.codes.includes(c))));else if(entry.units.includes('partial-practice-rule'))assert.ok(m.sections.attention.includes(entry.text));else assert.ok(m.sections.steps.some(x=>x.text===entry.text));}
 return {weather:[row.e,row.l,row.p],steps:m.sections.steps.length,checks:m.sections.checks.length};
});
for(const [p,items,expect] of [
 ['no',{E07:[40,40],L04:[40,40]},'P12-S1'],['partial',{E09:[40,40],L06:[40,40]},'P12-S2'],['full',{E07:[40,40]},'P12-S3'],['partial',{},'P12-S4'],['no',{},'P12-S4'],['partial',{E08:[40,0]},null],['full',{E08:[40,40]},null]
])check(`P12 ${p} ${JSON.stringify(items)}`,expect||'P12-BASE without duplicate scenario',()=>{const s=makeScenario(api,{items,practices:{P12:p}});assert.equal(s.analysis.p12Scenario,expect);assert.ok(s.analysis.units.some(u=>u.id===(expect||'P12-BASE')||u.id.startsWith((expect||'P12-BASE')+':')));return s.analysis.units.filter(u=>u.id.startsWith('P12')).map(u=>u.id)});
for(const c of ['E06','E12','E17'])check(`neutral safety ${c}`,'Partial agreement uses neutral clarification and zero unfavorable criterion',()=>{const s=makeScenario(api,{items:{[c]:[40,0]}}),u=s.analysis.units.find(u=>u.codes.includes(c)),method=s.analysis.units.find(u=>u.method&&u.codes.includes(c));assert.match(method.steps.join(' '),/з’ясувати, що заважає однозначно підтвердити твердження/iu);assert.match(method.steps.join(' '),/не робити висновку про конкретне порушення/);assert.match(u.checks.join(' '),/несприятливих відповідей немає/);assert.doesNotMatch(u.attention.join(' '),/сприймають як неповагу|залишається непоміченим/)});
for(const [code,variants] of [['E20',[1,2,3,4]],['E30',[1,2,3,4]]])for(const [i,values] of [[1,[80,0]],[2,[60,20]],[3,[40,0]],[4,[40,40]]])check(`${code} explicit branch ${i}`,`Approved ${code}-${i} conclusion`,()=>{const s=makeScenario(api,{items:{[code]:values,...(code==='E30'&&i===3?{E29:[60,20]}:{})},practices:{[code==='E20'?'P19':'P31']:'partial'}});const catalogue=JSON.parse(fs.readFileSync(new URL('../src/profile-v45/approved-copy.json',import.meta.url)));const expected=catalogue[`${code}-${i}`].fields['Пояснення відповідей']||catalogue[`${code}-${i}`].fields['Висновок'];for(const t of expected)assert.equal(text(s.analysis.modules[code==='E20'?4:6]).includes(t.replace(/[—–]/g,'-')),i!==2);});
for(const [name,opts,branch] of [['C1',{items:{E31:[40,0]}},'partial'],['C2',{items:{E31:[40,40]}},'negative'],['C3',{items:{E31:[80,5]}},'favorable'],['C4',{items:{E31:[80,0]}},'favorable'],['C5 sample',{nE:19,nL:10},'sample'],['C5 NA',{items:{E31:'NA'}},'applicability']])check(`E31 ${name}`,'No automatic incident card; correct focus and result criterion',()=>{
 const s=makeScenario(api,opts);assert.equal(s.analysis.input.branches.E31,branch);assert.ok(!s.analysis.actions.some(a=>a.basis_codes.includes('E31')));
 if(name==='C3'){assert.ok(s.analysis.units.some(u=>u.codes.includes('E31')));assert.match(text(s.analysis.modules[7]),/неприйнят/)}
 if(name==='C4')assert.equal(s.analysis.actions.length,0);
 if(name.includes('sample'))assert.match(text(s.analysis.modules[7]),/посилання/);
 if(name.includes('NA'))assert.match(text(s.analysis.modules[7]),/варіант відповіді/);
});
for(const answer of ['no','partial','full','insufficient'])for(const global of ['confirmed','not_confirmed','needs_check'])for(const local of ['confirmed','not_confirmed','needs_check'])check(`P40 ${answer} ${global}/${local}`,'Local confirmed risk gates correction; unknown gets verification; full/insufficient no correction',()=>{
 const s=makeScenario(api,{practices:{P40:answer},p40Risk:global,localRisk:local}),a=s.analysis.actions.find(a=>a.basis_codes.includes('P40'));
 const expected=['no','partial'].includes(answer)&&global!=='not_confirmed'&&!(global==='confirmed'&&local==='not_confirmed');assert.equal(!!a,expected);
 if(a)assert.ok(a.steps.length&&a.check.length);return a?.title||'No P40 action';
});
for(const [code,id] of [['P18','M3-A2'],['P24','M4-A1'],['L04','M2-D3'],['L06','M2-D4'],['L17','M6-D1'],['L18','M6-D1'],['E09','M2-D1'],['E10','M2-D2'],['E14','M3-D1']])check(`route isolated ${code}`,id,()=>{const s=makeScenario(api,code[0]==='P'?{practices:{[code]:'partial'}}:{items:{[code]:[40,40]}});assert.ok(s.analysis.actions.some(a=>a.id===id&&a.basis_codes.includes(code)));return s.analysis.actions.map(a=>a.id)});
for(const [opts,route,codes,absent] of [
 [{items:{E15:[40,40]},practices:{P18:'partial'}},'M3-A3',['P18','E15'],'M3-A2'],
 [{items:{E19:[40,40]},practices:{P24:'partial'}},'M4-A2',['P24','E19'],'M4-A1'],
 [{items:{E05:[40,40],E24:[40,40],E35:[40,40]}},'C01',['E05','E24'],'M1-A3'],
 [{items:{E09:[40,40],E27:[40,40]}},'M6-A1',['E09','E27'],'M2-D1'],
 [{items:{E22:[40,40],E28:[40,40]}},'M6-A1',['E22','E28'],'M5-A1'],
 [{practices:{P28:'partial',P38:'partial'}},'M7-A2',['P28','P38'],'M5-A2'],
 [{items:{L17:[40,40],L18:[40,40],E29:[40,40]}},'M6-A2',['L17','L18','E29'],'M6-D1']
])check(`merge ${codes.join('+')}`,`${route}; preserve each step and criterion; remove ${absent}`,()=>{const s=makeScenario(api,opts),a=s.analysis.actions.find(a=>a.id===route);assert.ok(a);for(const c of codes){assert.ok(a.basis_codes.includes(c));assert.ok(a.trace.steps.some(x=>x.codes.includes(c)));assert.ok(a.trace.checks.some(x=>x.codes.includes(c)))}assert.ok(!s.analysis.actions.some(a=>a.id===absent));if(codes.includes('E05'))assert.ok(s.analysis.actions.some(a=>a.id==='M7-A3'));});
check('E05 plus E25 is not C01','Independent work-problem response preserved',()=>{const s=makeScenario(api,{items:{E05:[40,40],E25:[40,40]}});assert.ok(!s.analysis.actions.some(a=>a.id==='C01'));assert.ok(s.analysis.actions.some(a=>a.id==='M5-A3'));});
check('No truncation of five simultaneous actions in module 2','A1 A2 A3 D1 D2 all visible',()=>{const s=makeScenario(api,{items:{E06:[40,40],E08:[40,40],E09:[40,40],E10:[40,40]},practices:{P09:'partial'}});assert.equal(s.analysis.modules[2].actions.length,5)});
for(const [nE,nL,expectedE,expectedL] of [[0,0,'absent','absent'],[19,9,'sample','sample'],[20,10,'negative','negative']])check(`privacy ${nE}/${nL}`,`${expectedE}/${expectedL}; no interpretation below minimum`,()=>{const s=makeScenario(api,{nE,nL,items:{E01:[40,40],L01:[40,40]}});assert.equal(s.analysis.input.branches.E01,expectedE);assert.equal(s.analysis.input.branches.L01,expectedL);});
check('Incomplete checkup is not a completed gap','No corrective practice route from unfinished answers',()=>{const s=makeScenario(api,{done:false,practices:{P01:'no'}});assert.ok(!s.analysis.actions.some(a=>a.basis_codes.includes('P01')));assert.match(s.analysis.modules[1].dataNotes.join(' '),/не завершено/)});
check('Same branch uses stable text across percentages','40/40 and 45/35 select same M2 scenario',()=>{const a=makeScenario(api,SIX_PRACTICES).analysis;const b=makeScenario(api,{...SIX_PRACTICES,items:Object.fromEntries(Object.entries(SIX_PRACTICES.items).map(([k,v])=>[k,v[0]===40?[45,35]:v]))}).analysis;assert.deepEqual(plain(a.modules[2].sections),plain(b.modules[2].sections))});
check('Same weather different item retains different content','E06 and E07 do not share an unrelated action',()=>{const a=makeScenario(api,{items:{E06:[40,40]}}).analysis;const b=makeScenario(api,{items:{E07:[40,40]}}).analysis;assert.notEqual(text(a.modules[2]),text(b.modules[2]));assert.match(text(a.modules[2]),/неповажне/);assert.match(text(b.modules[2]),/пояснення керівника/)});
check('All six gaps in each module remain traceable','42 practices retained in steps and checks',()=>{const s=makeScenario(api,{practices:Object.fromEntries(api.P_LIST.map(p=>[p.code,'partial'])),p40Risk:'confirmed',localRisk:'confirmed'});for(const p of api.P_LIST){const m=s.analysis.modules[p.module];assert.ok(m.sections.steps.some(x=>x.codes.includes(p.code)),p.code);assert.ok(m.sections.checks.some(x=>x.codes.includes(p.code)),p.code)}});
// Differential arithmetic checks use original source from the initial main commit when supplied.
if(process.env.BAROMETER_BASELINE){const base=loadPortal(process.env.BAROMETER_BASELINE).api;
check('Original calculator and schema source invariants','Calculator implementations, item text and scales identical',()=>{for(const name of ['aggregateSource','calculatePResults','weatherStatus','isProblemSurveyItem','validateTableRows'])assert.equal(api[name].toString(),base[name].toString(),name);assert.deepEqual(plain(api.SURVEY_ITEMS),plain(base.SURVEY_ITEMS));assert.deepEqual(plain(api.P_LIST),plain(base.P_LIST))});
for(const opts of [SIX_PRACTICES,{nE:20,nL:10},{nE:19,nL:9},{items:{E01:'NA',E02:[55,30],E03:[75,15],L01:[40,40]}},{defaultPattern:[40,0]},{defaultPattern:[60,20]}])check(`baseline equality ${JSON.stringify(opts)}`,'Identical numerical results and statuses',()=>{const a=makeScenario(api,opts),b=makeScenario(base,opts);assert.deepEqual(plain(a.e),plain(b.e));assert.deepEqual(plain(a.l),plain(b.l));assert.deepEqual(plain(a.checkup.results),plain(b.checkup.results));});}

check('Catalogue contains no service module headings','Only approved user text in fields',()=>{const catalogue=JSON.parse(fs.readFileSync(new URL('../src/profile-v45/approved-copy.json',import.meta.url)));for(const block of Object.values(catalogue))for(const values of Object.values(block.fields))for(const value of values)assert.doesNotMatch(value,/^Модуль [1-7] |^Внутрішні правила/)});
for(const [branch,values,letter] of [['favorable',[80,0],'А'],['negative',[40,40],'Б'],['partial',[40,0],'В'],['mixed',[60,20],'Г']])check(`P26 E21 variant ${letter}`,`Four explicit conclusions; no assumed excess monitoring; retain base criterion`,()=>{const s=makeScenario(api,{items:{E21:values},practices:{P26:'partial'}}),m=s.analysis.modules[5];assert.equal(s.analysis.input.branches.E21,branch);assert.match(text(m),/контрол/);assert.doesNotMatch(m.sections.checks.map(x=>x.text).join(' '),/чи зменшилися ті перешкоди/);const u=s.analysis.units.find(u=>u.codes.includes('P26'));assert.match(u.checks.join(' '),/фактично застосовують/)});
check('All-gap attention retains each practice','Partial practice scope is surfaced, including no direct survey counterpart',()=>{const s=makeScenario(api,{practices:Object.fromEntries(api.P_LIST.map(p=>[p.code,'partial'])),p40Risk:'confirmed',localRisk:'confirmed'});for(let mid=1;mid<=7;mid++)assert.ok(s.analysis.modules[mid].sections.attention.length>0)});

check('Shared risk-cycle steps retain both practice traces without assigned roles','P37/P38 identical steps merge once',()=>{const s=makeScenario(api,{practices:{P37:'partial',P38:'partial'}}),entries=s.analysis.modules[7].sections.steps;for(const prefix of ['Регулярно виявляти','Для кожного заходу визначати','Залучати працівників до визначення']){const matching=entries.filter(x=>x.text.startsWith(prefix));assert.equal(matching.length,1);assert.ok(matching[0].codes.includes('P37')&&matching[0].codes.includes('P38'));assert.doesNotMatch(matching[0].text,/\((?:HR|БЗР|керівник)/u)}});

check('Editorial screenshot corrections in shared output','Lowercase inline labels, such-as construction, infinitive clarification',()=>{
 const s=makeScenario(api,SIX_PRACTICES),m=s.analysis.modules[2],report=api.buildReportHtml(s.environment),screen=api.barometerSemanticModuleMarkup(api.actualResultModel()[1]);
 const expected=['Несприятливі відповіді працівників стосуються таких питань: повага керівника; корисний зворотний зв’язок.','Несприятливі відповіді керівників команд стосуються таких питань: час для регулярних індивідуальних розмов.','Сильна сторона: працівники сприятливо оцінюють такі питання, як пріоритет здоров’я і безпеки.','З’ясувати, що заважає керівникам команд знаходити час для регулярних індивідуальних розмов із працівниками.'];
 for(const value of expected){assert.ok([...m.sections.alignment,...m.sections.attention].includes(value),value);assert.ok(screen.includes(value),value);assert.ok(report.includes(value),value);}
 assert.ok(m.sections.steps.some(x=>x.text.includes('працівники сприймають як неповажне ставлення')));assert.doesNotMatch(m.sections.attention.join(' '),/сприймають як неповагу/);
 assertEditorial(s.analysis);return expected;
});
check('Editorial all-source strengths and missing applicable data','Same sentence for both sources; lowercase labels in data notes',()=>{
 for(const opts of [{practices:{P01:'partial'}},{items:{E01:'NA',L01:'NA'}}]){const s=makeScenario(api,opts);assertEditorial(s.analysis);const m=s.analysis.modules[1];if(opts.practices)assert.match(m.sections.alignment.join(' '),/, а керівники команд сприятливо оцінюють такі питання, як межі управлінської ролі/u);else assert.match(m.dataNotes.join(' '),/оцінювання: ясність обов’язків/u);}
});
check('Editorial catalog uses impersonal action wording','No second-person commands in any approved catalog or sample field',()=>{
 for(const name of ['approved-copy.json','sample-copy.json']){const copy=JSON.parse(fs.readFileSync(new URL('../src/profile-v45/'+name,import.meta.url)));const visit=value=>{if(typeof value==='string')assert.doesNotMatch(value,directCommands);else if(value&&typeof value==='object')Object.values(value).forEach(visit)};visit(copy);}
});
check('Editorial inline case preserves source labels and acronyms','Inline conversion changes only the leading ordinary capital',()=>{
 const {context}=loadPortal();const values=plain(vm.runInContext("['Пріоритет здоров’я і безпеки','HR і БЗР','БЗР із залученням HR','Підтримка HR'].map(profileV45InlineText)",context));
 assert.deepEqual(values,['пріоритет здоров’я і безпеки','HR і БЗР','БЗР із залученням HR','підтримка HR']);assert.equal(api.FINE_ITEMS.E10.topic,'Пріоритет здоров’я і безпеки');return values;
});
check('Interactive interpretation is collapsible while report stays expanded','One accessible toggle per module; four sections inside controlled panel; no report toggle',()=>{
 const s=makeScenario(api,SIX_PRACTICES);
 for(const row of api.actualResultModel()){const html=api.barometerSemanticModuleMarkup(row);assert.equal((html.match(/data-a="toggle-detail"/g)||[]).length,1);assert.ok(html.includes('aria-expanded="false" aria-controls="matrix-detail-'+row.m+'"'));assert.ok(html.includes('id="matrix-detail-'+row.m+'"'));for(const heading of ['Як узгоджуються джерела','На що звернути увагу','Рекомендовані організаційні дії','Як перевірити результат'])assert.ok(html.indexOf('<h4>'+heading+'</h4>')>html.indexOf('id="matrix-detail-'+row.m+'"'));}
 const report=api.buildReportHtml(s.environment);assert.doesNotMatch(report,/data-a="toggle-detail"|class="matrix-detail profile-interpretation"/);return 'Seven controlled panels; full report';
});
