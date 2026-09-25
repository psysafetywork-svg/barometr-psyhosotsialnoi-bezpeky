import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const localHtml=fs.readFileSync(new URL('../local/index.html',import.meta.url),'utf8');
const publicHtml=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

function executableScripts(html){
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .filter(match=>!/type="application\/octet-stream"/.test(match[0]))
    .map(match=>match[1]);
}

function loadLocalPortal(){
  const listeners=new Map(),storage=new Map(),app={innerHTML:''};
  const document={
    querySelector(selector){return selector==='#app'?app:null},
    querySelectorAll(){return []},
    getElementById(){return null},
    addEventListener(type,handler){listeners.set(type,handler)},
    createElement(){return {click(){},remove(){},setAttribute(){},style:{}}},
    body:{appendChild(){}},
  };
  const context=vm.createContext({
    console,document,
    window:{scrollTo(){},print(){}},
    localStorage:{
      getItem(key){return storage.has(key)?storage.get(key):null},
      setItem(key,value){storage.set(key,String(value))},
      removeItem(key){storage.delete(key)},
    },
    alert(){},confirm(){return true},
    Blob,URL,TextEncoder,TextDecoder,Response,DecompressionStream,
    setTimeout,clearTimeout,Date,Math,JSON,Intl,Uint8Array,ArrayBuffer,DataView,
  });
  const source=executableScripts(localHtml).at(-1)+`
    globalThis.__portal={
      SURVEY_ITEMS,ROLE_QUESTION,P_LIST,P,M,COMBO64,FINE_ITEMS,ACTION_LIB,THEMATIC_LIB,P38_TEXT,SITUATIONAL_HYPOTHESIS,
      parseCSV,validateTableRows,aggregateSource,calculatePResults,
      fmtPct,weatherStatus,mapStatusBadge,weatherMapHtml,managementSignal,comboTemplate,hasWeakSituationalPractice,selectedActions,attentionAspects,actualResultModel,buildReportHtml,planXlsxBytes,
      normalizeResearch,safeResearchClone,validateBackupResearch,currentPlan,planRows,canDashboard,
      barometerRuntimeInput,barometerSemanticInterpretation,
      validateEnvironmentValues,validatePeriodDates,
      setState(value){S=value},getState(){return S},render,
    };
  `;
  vm.runInContext(source,context,{filename:'local/index.html'});
  return {api:context.__portal,listeners,app,storage};
}

const portal=loadLocalPortal();

function research({periods,plan=[]}={}){
  const defaultPeriod={
    id:'period-1',label:'Період 1',start:'2026-01-01',end:'2026-01-31',envs:[],
    checkup:{answers:{},notes:{},done:false,asOfDate:'2026-01-31',schemaVersion:'checkup-2026-09-20-final'},
  };
  const list=periods||[defaultPeriod];
  return {company:'Тестова компанія',owner:'Власник',current:list[0].id,periods:list,plan};
}

function setSurveyIssueScenario(code,{checkupOverrides={}}={}){
  const source=portal.api.SURVEY_ITEMS.find(item=>item.code===code)?.source;
  const rows=Array.from({length:40},(_,index)=>{
    const isManager=index<20;
    const answers=Object.fromEntries(portal.api.SURVEY_ITEMS.map(item=>[item.code,item.source==='E'||isManager?5:null]));
    if(source==='E'||isManager)answers[code]=1;
    return {isManager,answers};
  });
  const eResult=portal.api.aggregateSource(rows,'E',40);
  const lResult=portal.api.aggregateSource(rows.filter(row=>row.isManager),'L',20);
  const checkupAnswers={...Object.fromEntries(portal.api.P_LIST.map(item=>[item.code,'full'])),...checkupOverrides};
  const environment={id:'env-issue',name:'Синтетичне середовище',emp:40,man:20,invE:40,invL:20,survey:{ok:true,e:40,l:20,results:{e:eResult,l:lResult}}};
  const r=research();
  r.periods[0].envs=[environment];
  r.periods[0].checkup={answers:checkupAnswers,notes:{},done:true,asOfDate:'2026-01-31',schemaVersion:'checkup-2026-09-20-final'};
  r.periods[0].checkup.results=portal.api.calculatePResults(r.periods[0].checkup);
  portal.api.setState({screen:'dash',r,env:environment.id,module:1,modal:null,demo:false,returnResearch:null});
  return {r,environment};
}

function surveyRows(source,count,{answer=5,overrides={}}={}){
  const answers=Object.fromEntries(portal.api.SURVEY_ITEMS
    .filter(item=>item.source===source)
    .map(item=>[item.code,overrides[item.code]??answer]));
  return Array.from({length:count},()=>({answers}));
}

function setRuntimeScenario({eCount=20,lCount=10,eAnswer=5,lAnswer=5,eOverrides={},lOverrides={},pOverrides={}}={}){
  const eResult=portal.api.aggregateSource(surveyRows('E',eCount,{answer:eAnswer,overrides:eOverrides}),'E');
  const lResult=portal.api.aggregateSource(surveyRows('L',lCount,{answer:lAnswer,overrides:lOverrides}),'L');
  const checkupAnswers={...Object.fromEntries(portal.api.P_LIST.map(item=>[item.code,'full'])),...pOverrides};
  const environment={id:'env-runtime',name:'Синтетичне середовище',emp:eCount,man:lCount,invE:eCount,invL:lCount,
    survey:{ok:true,e:eCount,l:lCount,results:{e:eResult,l:lResult}}};
  const r=research();
  r.periods[0].envs=[environment];
  r.periods[0].checkup={answers:checkupAnswers,notes:{},done:true,asOfDate:'2026-01-31',schemaVersion:'checkup-2026-09-20-final'};
  r.periods[0].checkup.results=portal.api.calculatePResults(r.periods[0].checkup);
  portal.api.setState({screen:'dash',r,env:environment.id,module:1,modal:null,demo:false,returnResearch:null});
  return {eResult,lResult,environment};
}

test('all executable scripts parse',()=>{
  for(const [name,html] of [['local/index.html',localHtml],['index.html',publicHtml]]){
    executableScripts(html).forEach((source,index)=>assert.doesNotThrow(()=>new Function(source),`${name}, script ${index+1}`));
  }
});

test('synthetic import accepts 2,400 E responses and 1,200 L responses',()=>{
  const {SURVEY_ITEMS,ROLE_QUESTION}=portal.api;
  const headers=[ROLE_QUESTION,...SURVEY_ITEMS.map(item=>`${item.code} ${item.text}`)];
  const rows=Array.from({length:2400},(_,index)=>{
    const manager=index<1200;
    return [manager?'Так':'Ні',...SURVEY_ITEMS.map(item=>item.source==='E'||manager?'5':'')];
  });
  const csv=[headers,...rows].map(row=>row.join('\t')).join('\n');
  const validated=portal.api.validateTableRows(portal.api.parseCSV(csv),'synthetic-2400.csv');
  assert.equal(validated.errors.length,0);
  assert.equal(validated.total,2400);
  assert.equal(validated.managers,1200);
  assert.ok(validated.warnings.some(message=>message.includes('однакову відповідь у всіх 35 твердженнях E')));
  const employee=portal.api.aggregateSource(validated.rows,'E',2400);
  const manager=portal.api.aggregateSource(validated.rows.filter(row=>row.isManager),'L',1200);
  assert.equal(employee.totalResponses,2400);
  assert.equal(manager.totalResponses,1200);
  assert.ok(Object.values(employee.modules).every(module=>module.status==='Ясно'));
  assert.ok(Object.values(manager.modules).every(module=>module.status==='Ясно'));
});

test('a complete 2,400-response route produces seven results, a report, and an XLSX plan',()=>{
  const answers=Object.fromEntries(portal.api.SURVEY_ITEMS.map(item=>[item.code,5]));
  const rows=Array.from({length:2400},(_,index)=>({isManager:index<1200,answers}));
  const eResult=portal.api.aggregateSource(rows,'E',2400);
  const lResult=portal.api.aggregateSource(rows.filter(row=>row.isManager),'L',1200);
  const checkupAnswers=Object.fromEntries(portal.api.P_LIST.map(item=>[item.code,'full']));
  const environment={id:'env-2400',name:'Синтетичне середовище',emp:2400,man:1200,invE:2400,invL:1200,survey:{ok:true,e:2400,l:1200,results:{e:eResult,l:lResult}}};
  const r=research({plan:[{id:'action-1',periodId:'period-1',envId:'env-2400',module:'Модуль',aspect:'Аспект',action:'Дія',description:'Опис дії',priority:'Середній',status:'Не розпочато'}]});
  r.periods[0].envs=[environment];
  r.periods[0].checkup={answers:checkupAnswers,notes:{},done:true,asOfDate:'2026-01-31',schemaVersion:'checkup-2026-09-20-final'};
  r.periods[0].checkup.results=portal.api.calculatePResults(r.periods[0].checkup);
  portal.api.setState({screen:'dash',r,env:'env-2400',module:1,modal:null,demo:false,returnResearch:null});

  const results=portal.api.actualResultModel();
  assert.equal(results.length,7);
  assert.ok(results.every(item=>item.e==='Ясно'&&item.l==='Ясно'&&item.p==='Ясно'));
  const report=portal.api.buildReportHtml(environment);
  assert.match(report,/Ключові результати за модулями/);
  assert.match(report,/Як узгоджуються джерела/);
  assert.match(report,/Усі три джерела узгоджено показують сприятливу ситуацію/);
  assert.match(report,/<th>Організаційний чекап<\/th>/);
  assert.doesNotMatch(report,/<th>Організаційні практики<\/th>/);
  const xlsx=portal.api.planXlsxBytes(portal.api.planRows());
  assert.equal(xlsx[0],0x50);
  assert.equal(xlsx[1],0x4b);
  assert.ok(xlsx.length>1000);
});

test('report uses final semantic action wording when E and P support an action',()=>{
  const {environment}=setRuntimeScenario({eOverrides:{E16:1},pOverrides:{P19:'partial'}});
  const report=portal.api.buildReportHtml(environment);
  assert.match(report,/<strong>Як узгоджуються джерела<\/strong>/);
  assert.match(report,/<b>Що саме зробити:<\/b>/);
  assert.match(report,/Зробити значущі рішення щодо роботи, оцінювання й винагороди зрозумілими та обґрунтованими/);
});

test('P40 follow-up renders immediately after selecting not implemented',()=>{
  const r=research();
  portal.api.setState({screen:'checkup',r,env:null,module:7,modal:null,demo:false,returnResearch:null});
  portal.api.render();
  portal.listeners.get('change')({target:{type:'radio',name:'P40',value:'no',dataset:{}}});
  assert.match(portal.app.innerHTML,/Уточнення для P40/);
  assert.match(portal.app.innerHTML,/Так, ризик виявлено/);
});

test('survey thresholds use unrounded values and display one decimal near a boundary',()=>{
  assert.equal(portal.api.weatherStatus(54.545,10),'Буря');
  assert.equal(portal.api.fmtPct(54.545),'54,5%');
  assert.equal(portal.api.weatherStatus(75,14.999),'Ясно');
  assert.equal(portal.api.weatherStatus(75,15),'Хмарно');
  const badge=portal.api.mapStatusBadge('Буря','E',1,{e:{modules:{1:{favorable:54.545,borderline:'Буря біля межі з Хмарно'}}}});
  assert.match(badge,/54,5% спр\./);
  assert.match(badge,/статус розраховано за неокругленими значеннями/);
  const map=portal.api.weatherMapHtml([{m:1,e:'Ясно',l:'Буря',p:'Ясно'}],{survey:{results:{e:{modules:{}},l:{totalResponses:11,detailAllowed:true,modules:{1:{favorable:54.545,borderline:'Буря біля межі з Хмарно'}}}}}});
  assert.match(map,/Буря біля межі з Хмарно; статус розраховано за неокругленими значеннями/);
  assert.match(map,/<th>Організаційний чекап<\/th>/);
  assert.doesNotMatch(map,/<th>Організаційні практики<\/th>/);
});

test('checkup status rules remain reproducible, including conditional P40',()=>{
  const allFull=Object.fromEntries(portal.api.P_LIST.map(item=>[item.code,'full']));
  assert.ok(Object.values(portal.api.calculatePResults({answers:allFull}).modules).every(module=>module.status==='Ясно'));

  const critical={...allFull,P04:'no'};
  assert.equal(portal.api.calculatePResults({answers:critical}).modules[1].status,'Буря');

  const oneOrdinary={...allFull,P01:'no'};
  assert.equal(portal.api.calculatePResults({answers:oneOrdinary}).modules[1].status,'Хмарно');

  const fog={...allFull,P01:'insufficient',P02:'insufficient',P03:'insufficient'};
  assert.equal(portal.api.calculatePResults({answers:fog}).modules[1].status,'Туман');

  const p40={...allFull,P40:'no'};
  assert.equal(portal.api.calculatePResults({answers:p40,p40Risk:'confirmed'}).modules[7].status,'Буря');
  assert.equal(portal.api.calculatePResults({answers:p40,p40Risk:'not_confirmed'}).modules[7].status,'Хмарно');
});

test('all 64 interpretation combinations remain available and recommendations stay capped at three',()=>{
  assert.equal(Object.keys(portal.api.COMBO64).length,64);
  assert.doesNotMatch(JSON.stringify(portal.api.COMBO64),/Організаційний чекап підтверджує/);
  for(const key of Object.keys(portal.api.COMBO64)){
    const [e,l,p]=key.split('|');
    assert.doesNotMatch(portal.api.managementSignal({e,l,p},[]),/\. [а-яіїєґ]/u);
  }
  const r=research();
  portal.api.setState({screen:'dash',r,env:null,module:1,modal:null,demo:true,returnResearch:null});
  for(let moduleId=1;moduleId<=7;moduleId++)assert.ok(portal.api.selectedActions(moduleId).length<=3);
});

test('E16 routes primarily to the new pay-equity thematic recommendation',()=>{
  setSurveyIssueScenario('E16');
  const links=Array.from(portal.api.FINE_ITEMS.E16.links,link=>({target:link.target,role:link.role}));
  assert.deepEqual(links,[
    {target:'THEME:Перевірити обґрунтованість оплати для порівнюваних ролей',role:'primary'},
    {target:'P19',role:'supporting'},
    {target:'P24',role:'conditional'},
  ]);
  const action=portal.api.selectedActions(4)[0];
  assert.equal(action.title,'Перевірити обґрунтованість оплати для порівнюваних ролей');
  assert.equal(action.verify,'Порівняйте оплату працівників у ролях із подібним рівнем відповідальності, складності та вимог. Перевірте, чи можна пояснити суттєві відмінності визначеними критеріями.');
  assert.equal(action.action,'Визначте зрозумілі критерії, що впливають на рівень оплати, і перевірте суттєві відмінності між порівнюваними ролями. Необґрунтовані відмінності усуньте або визначте план їх усунення.');
  assert.equal(action.check,'Суттєві відмінності в оплаті мають зрозуміле й документоване обґрунтування.');
});

test('E22 routes primarily to the new time-and-pace flexibility recommendation',()=>{
  setSurveyIssueScenario('E22');
  const links=Array.from(portal.api.FINE_ITEMS.E22.links,link=>({target:link.target,role:link.role}));
  assert.deepEqual(links,[
    {target:'THEME:Надати допустиму гнучкість у керуванні часом і темпом роботи',role:'primary'},
    {target:'P32',role:'conditional'},
  ]);
  const action=portal.api.selectedActions(5)[0];
  assert.equal(action.title,'Надати допустиму гнучкість у керуванні часом і темпом роботи');
  assert.equal(action.verify,'Для різних типів робіт визначте, де час, послідовність або темп виконання завдань жорстко задані вимогами роботи, а де працівник може обирати їх самостійно.');
  assert.equal(action.action,'Там, де це не створює ризиків і не порушує виробничих вимог, дайте працівникам можливість самостійніше планувати послідовність завдань, темп роботи або окремі елементи робочого часу.');
  assert.equal(action.check,'Працівники розуміють межі своєї самостійності й можуть реально користуватися доступною гнучкістю.');
});

test('E25 uses the feedback recommendation, explains work problem, and keeps P18 non-primary',()=>{
  setSurveyIssueScenario('E25');
  const links=Array.from(portal.api.FINE_ITEMS.E25.links,link=>({target:link.target,role:link.role}));
  assert.deepEqual(links,[
    {target:'THEME:Забезпечити зворотний зв’язок після повідомлення про робочу проблему',role:'primary'},
    {target:'P18',role:'conditional'},
  ]);
  const action=portal.api.selectedActions(5)[0];
  assert.equal(action.title,'Забезпечити зворотний зв’язок після повідомлення про робочу проблему');
  assert.equal(action.verify,'Перегляньте кілька останніх робочих проблем, про які повідомляли працівники: чи було визначено відповідального, чи прийнято рішення та чи повідомили працівникові про результат або поточний статус.');
  assert.equal(action.action,'Визначте простий порядок, за яким працівник, який повідомив про проблему у робочих процесах, навантаженні, ресурсах, розподілі відповідальності, взаємодії чи умовах роботи, отримує інформацію про результат її розгляду, заплановані дії або причину, чому рішення наразі не прийнято.');
  assert.equal(action.check,'Працівники знають, що сталося з повідомленою проблемою і яких подальших дій очікувати.');
  const attention=portal.api.attentionAspects(5,{e:'Буря',l:'Ясно',p:'Ясно'}).map(item=>item.topic).join(' ');
  assert.match(attention,/Під “робочою проблемою” мається на увазі ситуація/);
  assert.equal(portal.api.SURVEY_ITEMS.find(item=>item.code==='E25').text,'Коли я повідомляю про робочу проблему, мене інформують про результат її розгляду та рішення щодо подальших дій.');
});

test('L21 routes to P38 and every runtime P38 copy uses the revised wording',()=>{
  const links=Array.from(portal.api.FINE_ITEMS.L21.links,link=>({target:link.target,role:link.role}));
  assert.deepEqual(links,[
    {target:'P38',role:'primary'},
    {target:'P29',role:'supporting'},
  ]);
  const copies=[
    portal.api.P_LIST.find(item=>item.code==='P38')?.text,
    ...Object.values(portal.api.P).flat().filter(item=>item.code==='P38').map(item=>item.text),
  ];
  assert.equal(copies.length,2);
  assert.ok(copies.every(text=>text===portal.api.P38_TEXT));
  assert.equal(portal.api.P38_TEXT,'Компанія регулярно та перед суттєвими змінами в роботі проводить оцінювання для виявлення психосоціальних небезпек і пов’язаних із ними ризиків, а також повторює оцінювання після значущих інцидентів; для пріоритетних ризиків визначає заходи, відповідальних, строки й ресурси та перевіряє результативність вжитих заходів.');
});

test('COMBO64 situation hypothesis appears only with a weak situational practice in that module',()=>{
  setSurveyIssueScenario('E16',{checkupOverrides:{P19:'partial'}});
  assert.equal(portal.api.hasWeakSituationalPractice(4),false);
  const everyday=portal.api.comboTemplate('Ясно','Ясно','Хмарно',4);
  assert.ok(!everyday.hypotheses.includes(portal.api.SITUATIONAL_HYPOTHESIS));
  assert.doesNotMatch(everyday.gap_analysis.join(' '),/ще не стикалися із ситуацією/);

  setSurveyIssueScenario('E34',{checkupOverrides:{P42:'partial'}});
  assert.equal(portal.api.hasWeakSituationalPractice(7),true);
  const situational=portal.api.comboTemplate('Ясно','Ясно','Хмарно',7);
  assert.ok(situational.hypotheses.includes(portal.api.SITUATIONAL_HYPOTHESIS));
  assert.match(situational.gap_analysis.join(' '),/ще не стикалися із ситуацією/);
});

test('manager detail is never retained below ten responses',()=>{
  const managerRows=Array.from({length:9},()=>({answers:Object.fromEntries(portal.api.SURVEY_ITEMS.filter(x=>x.source==='L').map(x=>[x.code,5]))}));
  const result=portal.api.aggregateSource(managerRows,'L',9);
  assert.equal(result.detailAllowed,false);
  assert.equal(result.items,null);
  assert.equal(result.problems.length,0);

  const r=research();
  r.periods[0].envs.push({id:'env-1',name:'Мала група',emp:20,man:9,invE:20,invL:9,survey:{results:{l:{totalResponses:9,items:{L01:{}},problems:[{code:'L01'}]}}}});
  portal.api.normalizeResearch(r);
  assert.equal(r.periods[0].envs[0].survey.results.l.items,null);
  assert.equal(r.periods[0].envs[0].survey.results.l.problems.length,0);
});

test('E=19 has no status or problem items, while E=20 gets a weather status',()=>{
  const below=portal.api.aggregateSource(surveyRows('E',19,{answer:1}),'E');
  assert.equal(below.eligible,false);
  assert.equal(below.detailAllowed,false);
  assert.equal(below.items,null);
  assert.equal(below.problems.length,0);
  assert.ok(Object.values(below.modules).every(module=>module.status===null));
  const atThreshold=portal.api.aggregateSource(surveyRows('E',20),'E');
  assert.equal(atThreshold.eligible,true);
  assert.ok(atThreshold.items);
  assert.ok(Object.values(atThreshold.modules).every(module=>module.status==='Ясно'));
});

test('L=9 has no status or problem items, while L=10 gets a weather status',()=>{
  const below=portal.api.aggregateSource(surveyRows('L',9,{answer:1}),'L');
  assert.equal(below.eligible,false);
  assert.equal(below.detailAllowed,false);
  assert.equal(below.items,null);
  assert.equal(below.problems.length,0);
  assert.ok(Object.values(below.modules).every(module=>module.status===null));
  const atThreshold=portal.api.aggregateSource(surveyRows('L',10),'L');
  assert.equal(atThreshold.eligible,true);
  assert.ok(atThreshold.items);
  assert.ok(Object.values(atThreshold.modules).every(module=>module.status==='Ясно'));
});

test('eligible E and L with too few applicable answers receive Туман, not a sample warning',()=>{
  const {eResult,lResult}=setRuntimeScenario({eAnswer:'NA',lAnswer:'NA'});
  for(const result of [eResult,lResult]){
    assert.equal(result.eligible,true);
    assert.equal(result.problems.length,0);
    assert.ok(Object.values(result.modules).every(module=>module.status==='Туман'));
  }
  const row=portal.api.actualResultModel()[0];
  assert.equal(row.e,'Туман');
  assert.equal(row.l,'Туман');
  const input=portal.api.barometerRuntimeInput();
  assert.equal(input.E.states.E01,'T');
  assert.equal(input.L.states.L01,'T');
});

test('E=19 is excluded from final comparison while valid L and P still produce analysis',()=>{
  const {environment}=setRuntimeScenario({eCount:19,eAnswer:1,lOverrides:{L01:1},pOverrides:{P01:'no'}});
  const rows=portal.api.actualResultModel();
  assert.ok(rows.every(row=>row.e==='Недостатня вибірка'));
  assert.equal(rows[0].l,'Буря');
  assert.equal(rows[0].p,'Хмарно');
  assert.match(portal.api.mapStatusBadge(rows[0].e,'E',1,environment.survey.results),/Статус не розраховується/);
  assert.doesNotMatch(portal.api.mapStatusBadge(rows[0].e,'E',1,environment.survey.results),/Туман/);
  const analysis=portal.api.barometerSemanticInterpretation();
  assert.equal(analysis.input.E.eligible,false);
  assert.equal(analysis.input.E.states.E01,'X');
  assert.equal(analysis.input.L.states.L01,'S');
  assert.equal(analysis.input.P.states.P01,'G');
  const cluster=analysis.modules[1].clusters.find(item=>item.eCodes.includes('E01'));
  assert.equal(cluster.e,'X');
  assert.equal(cluster.l,'S');
  assert.equal(cluster.p,'G');
  assert.ok(!analysis.modules[1].problemCodes.includes('E01'));
  assert.ok(analysis.modules[1].problemCodes.includes('L01'));
  assert.ok(analysis.modules[1].problemCodes.includes('P01'));
  assert.ok(analysis.modules[1].actions.length>0);
  assert.match(analysis.modules[1].dataNotes.join(' '),/Працівники: отримано 19 валідних анкет/);
});

test('L=9 is excluded from final comparison while valid E and P still produce analysis',()=>{
  setRuntimeScenario({lCount:9,lAnswer:1,eOverrides:{E01:1},pOverrides:{P01:'no'}});
  const rows=portal.api.actualResultModel();
  assert.ok(rows.every(row=>row.l==='Недостатня вибірка'));
  assert.equal(rows[0].e,'Хмарно');
  assert.equal(rows[0].p,'Хмарно');
  const analysis=portal.api.barometerSemanticInterpretation();
  assert.equal(analysis.input.L.eligible,false);
  assert.equal(analysis.input.L.states.L01,'X');
  assert.equal(analysis.input.E.states.E01,'S');
  assert.equal(analysis.input.P.states.P01,'G');
  const cluster=analysis.modules[1].clusters.find(item=>item.lCodes.includes('L01'));
  assert.equal(cluster.l,'X');
  assert.equal(cluster.e,'S');
  assert.equal(cluster.p,'G');
  assert.ok(!analysis.modules[1].problemCodes.includes('L01'));
  assert.ok(analysis.modules[1].problemCodes.includes('E01'));
  assert.ok(analysis.modules[1].problemCodes.includes('P01'));
  assert.ok(analysis.modules[1].actions.length>0);
  assert.match(analysis.modules[1].dataNotes.join(' '),/Керівники: отримано 9 валідних анкет/);
});

test('zero manager responses no longer block the final dashboard availability',()=>{
  const r=research();
  const environment={id:'env-1',name:'Середовище',emp:30,man:2,survey:{results:{e:{totalResponses:30},l:{totalResponses:0}}}};
  r.periods[0].envs=[environment];r.periods[0].checkup.done=true;
  portal.api.setState({screen:'home',r,env:null,module:1,modal:null,demo:false,returnResearch:null});
  assert.equal(portal.api.canDashboard(environment),true);
});

test('plan is isolated by period and export contains action description',()=>{
  const p1={id:'p1',label:'Перший',start:'2026-01-01',end:'2026-01-31',envs:[{id:'e1',name:'Офіс',emp:20,man:2,invE:20,invL:2,survey:{}}],checkup:{answers:{},notes:{},done:false}};
  const p2={id:'p2',label:'Другий',start:'2026-02-01',end:'2026-02-28',envs:[],checkup:{answers:{},notes:{},done:false}};
  const r=research({periods:[p1,p2],plan:[
    {id:'a1',periodId:'p1',envId:'e1',module:'Модуль',aspect:'Аспект',action:'Дія 1',description:'Що саме зробити',priority:'Високий',status:'У роботі'},
    {id:'a2',periodId:'p2',module:'Модуль',aspect:'Інший аспект',action:'Дія 2',description:'Інший опис',priority:'Середній',status:'Не розпочато'},
  ]});
  portal.api.setState({screen:'plan',r,env:null,module:1,modal:null,demo:false,returnResearch:null});
  assert.deepEqual(portal.api.currentPlan().map(action=>action.id),['a1']);
  const rows=portal.api.planRows();
  assert.equal(rows[0][4],'Опис дії');
  assert.equal(rows[1][4],'Що саме зробити');
  assert.equal(rows.length,2);
});

test('legacy plan actions are assigned to the period that owns their environment',()=>{
  const p1={id:'p1',label:'Перший',start:'2026-01-01',end:'2026-01-31',envs:[{id:'e1',name:'Офіс',emp:20,man:0,invE:20,invL:0,survey:{}}],checkup:{answers:{},notes:{},done:false}};
  const p2={id:'p2',label:'Другий',start:'2026-02-01',end:'2026-02-28',envs:[{id:'e2',name:'Склад',emp:20,man:0,invE:20,invL:0,survey:{}}],checkup:{answers:{},notes:{},done:false}};
  const r=research({periods:[p1,p2],plan:[{id:'a1',envId:'e2'}]});
  portal.api.normalizeResearch(r);
  assert.equal(r.plan[0].periodId,'p2');
});

test('backup validation rejects inconsistent structures before replacement',()=>{
  const valid=research();
  assert.equal(portal.api.validateBackupResearch(valid),true);
  const duplicate=research({periods:[valid.periods[0],{...valid.periods[0]}]});
  assert.throws(()=>portal.api.validateBackupResearch(duplicate),/дубльовані ідентифікатори/);
  const badDates=research();badDates.periods[0].end='2025-12-31';
  assert.throws(()=>portal.api.validateBackupResearch(badDates),/не може бути раніше/);
  const badPlan=research({plan:[null]});
  assert.throws(()=>portal.api.validateBackupResearch(badPlan),/некоректний запис/);
});

test('no-manager interpretation removes manager-specific hypotheses and checks',()=>{
  const result=portal.api.comboTemplate('Хмарно','Не застосовується','Буря');
  for(const text of [...result.hypotheses,...result.checks,...result.next_step]){
    assert.doesNotMatch(text,/(керівник|управлінськ|лідер)/i);
  }
});

test('report sentences start with capitals',()=>{
  const text=portal.api.managementSignal({e:'Хмарно',l:'Буря',p:'Хмарно'},[]);
  assert.doesNotMatch(text,/\. [а-яіїєґ]/u);
});

test('environment and period validation rejects inconsistent values',()=>{
  assert.match(portal.api.validateEnvironmentValues(''),/Вкажіть назву робочого середовища/);
  assert.equal(portal.api.validateEnvironmentValues('Офіс'),'');
  assert.match(portal.api.validatePeriodDates('2026-02-02','2026-02-01'),/не може бути раніше/);
});

test('public portal documents the previously hidden rules and four checkup answers',()=>{
  assert.match(publicHtml,/Недостатньо підтверджених даних<\/strong>/);
  assert.match(publicHtml,/75% сприятливих і менше 15% несприятливих/i);
  assert.match(publicHtml,/Якщо мінімальної кількості валідних анкет не досягнуто, статус для відповідного опитувального джерела не формується/);
  assert.match(publicHtml,/Для CSV використовуйте формат UTF-8/);
  assert.match(publicHtml,/не шифруються самим Барометром/);
  assert.match(publicHtml,/Організаційний чекап показує сприятливий стан практик/);
  assert.doesNotMatch(publicHtml,/Організаційні практики оцінені слабше/);
  assert.equal((publicHtml.match(/<h3>Безпека даних<\/h3>/g)||[]).length,0);
});
