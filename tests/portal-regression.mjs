import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

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
      parseCSV,parseResponseValue,RESPONSE_SCALE,isProblemSurveyItem,compareSurveyPercent,validateTableRows,aggregateSource,calculatePResults,
      fmtPct,weatherStatus,boundaryFlag,mapStatusBadge,weatherMapHtml,managementSignal,comboTemplate,hasWeakSituationalPractice,selectedActions,attentionAspects,actualResultModel,buildReportHtml,planXlsxBytes,
      normalizeResearch,safeResearchClone,validateBackupResearch,currentPlan,planRows,canDashboard,load,save,STORE,
      barometerRuntimeInput,barometerSemanticInterpretation,barometerStateForCodes,barometerSemanticModuleMarkup,barometerSemanticActionCards,barometerV2AspectsMarkup,
      validateEnvironmentValues,validatePeriodDates,
      barometerPracticeAction,barometerModuleActions,barometerModuleSummary,BAROMETER_P_ACTION_LIBRARY,barometerCriterionView,barometerEquivalentPlanAction,planAction,planHasAction,updatePlanField,plan,barometerPracticeVerification,BAROMETER_P_VERIFICATION,BAROMETER_P_ANSWER_LABELS,barometerPModuleLead,barometerPVerificationMarkup,barometerPReportAppendix,barometerCompanyContext,barometerActionScope,barometerSemanticAction,checkup,
      setState(value){S=value},getState(){return S},render,studyProgress,
    };
  `;
  vm.runInContext(source,context,{filename:'local/index.html'});
  return {api:context.__portal,listeners,app,storage,document};
}

const portal=loadLocalPortal();

function renderPublicExample(e,l,p){
  const nodes=new Map(Object.entries({
    statusE:{value:e},statusL:{value:l},statusP:{value:p},
    exampleStatuses:{innerHTML:''},exampleInterpretation:{textContent:''},exampleDetail:{innerHTML:''},
  }));
  const start=publicHtml.indexOf('const statusIcon = status =>'),end=publicHtml.indexOf("['statusE','statusL','statusP'].forEach",start);
  assert.ok(start>=0&&end>start);
  vm.runInNewContext(`${publicHtml.slice(start,end)}\nupdateExample();`,{document:{getElementById:id=>nodes.get(id)}});
  return {statuses:nodes.get('exampleStatuses').innerHTML,interpretation:nodes.get('exampleInterpretation').textContent,detail:nodes.get('exampleDetail').innerHTML};
}

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

function moduleRows(source,count,moduleId,answerAt){
  const codes=portal.api.SURVEY_ITEMS.filter(item=>item.source===source&&item.module===moduleId).map(item=>item.code);
  return Array.from({length:count},(_,respondent)=>({
    answers:Object.fromEntries(codes.map((code,index)=>[code,answerAt(respondent,index)]))
  }));
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
  assert.doesNotMatch(report,/Що уточнити/);
  assert.match(report,/позитивна самооцінка сама по собі не доводить їх результативності/);
  assert.match(report,/<th>Організаційний чекап<\/th>/);
  assert.doesNotMatch(report,/<th>Організаційні практики<\/th>/);
  const xlsx=portal.api.planXlsxBytes(portal.api.planRows());
  assert.equal(xlsx[0],0x50);
  assert.equal(xlsx[1],0x4b);
  assert.ok(xlsx.length>1000);
});

test('respondent-based E profiles give every valid person equal weight',()=>{
  const rows=moduleRows('E',20,1,(respondent,index)=>respondent<15?5:index<3?1:'NA');
  const result=portal.api.aggregateSource(rows,'E'),module=result.modules[1];
  assert.equal(module.favorable,75);
  assert.equal(module.neutral,0);
  assert.equal(module.unfavorable,25);
  assert.equal(module.status,'Хмарно');
  assert.equal(module.masked,false);
  assert.equal(result.items.E04.favorable,100);
  assert.equal(result.items.E01.favorable,75);
});

test('E needs three applicable answers per person and L needs two',()=>{
  for(const [source,count,validItems,insufficientItems] of [['E',20,3,2],['L',10,2,1]]){
    const enough=portal.api.aggregateSource(moduleRows(source,count,1,(_,index)=>index<validItems?5:'NA'),source);
    assert.equal(enough.modules[1].status,'Ясно');
    const tooFew=portal.api.aggregateSource(moduleRows(source,count,1,(_,index)=>index<insufficientItems?5:'NA'),source);
    assert.equal(tooFew.modules[1].status,'Туман');
    assert.match(tooFew.modules[1].qualityReasons.join(' '),/недостатньо застосовних даних для надійної інтерпретації модуля/);
  }
});

test('module profile minimum is half the E or L respondents, subject to the floor',()=>{
  for(const [source,total,minimum] of [['E',30,15],['E',20,10],['L',15,8],['L',10,5]]){
    const make=valid=>portal.api.aggregateSource(moduleRows(source,total,1,(respondent)=>respondent<valid?5:'NA'),source);
    assert.equal(make(minimum).modules[1].status,'Ясно');
    const below=make(minimum-1);
    assert.equal(below.eligible,true);
    assert.equal(below.modules[1].status,'Туман');
    assert.equal(below.modules[1].favorable,null);
  }
});

test('module status can use respondent profiles even when no item meets its separate minimum',()=>{
  const rows=moduleRows('E',30,1,(respondent,index)=>
    respondent<15&&[respondent%5,(respondent+1)%5,(respondent+2)%5].includes(index)?5:'NA');
  const result=portal.api.aggregateSource(rows,'E');
  assert.equal(result.modules[1].status,'Ясно');
  assert.equal(result.modules[1].usableItems,0);
  assert.equal(result.items.E01.adequate,false);
  assert.equal(result.items.E01.applicable,9);
  assert.equal(result.problems.length,0);
});

test('scenario A: 24 favorable, 3 neutral and 3 unfavorable full E profiles are Ясно',()=>{
  const rows=moduleRows('E',30,1,(respondent)=>respondent<24?5:respondent<27?3:1);
  const result=portal.api.aggregateSource(rows,'E'),module=result.modules[1];
  assert.equal(module.favorable,80);
  assert.equal(module.neutral,10);
  assert.equal(module.unfavorable,10);
  assert.equal(module.status,'Ясно');
  assert.equal(module.masked,false);
});

test('scenario B: a sufficiently answered problem item masks nominal Ясно',()=>{
  const rows=moduleRows('E',30,1,(respondent,index)=>index<4?5:respondent<15?1:'NA');
  const result=portal.api.aggregateSource(rows,'E'),module=result.modules[1],item=result.items.E05;
  assert.equal(module.favorable,90);
  assert.equal(module.neutral,0);
  assert.equal(module.unfavorable,10);
  assert.equal(item.applicable,15);
  assert.equal(item.adequate,true);
  assert.equal(item.favorable,0);
  assert.equal(item.unfavorable,100);
  assert.equal(module.status,'Хмарно');
  assert.equal(module.masked,true);
  assert.match(portal.api.mapStatusBadge(module.status,'E',1,{e:result}),/☁ Хмарно \(є проблемний аспект\)/);
});

test('scenario C: two half-applicable problem items give 80/0/20 and Хмарно',()=>{
  const rows=moduleRows('E',30,1,(respondent,index)=>index<3?5:respondent<15?1:'NA');
  const result=portal.api.aggregateSource(rows,'E'),module=result.modules[1];
  assert.equal(module.favorable,80);
  assert.equal(module.neutral,0);
  assert.equal(module.unfavorable,20);
  assert.equal(module.status,'Хмарно');
  assert.equal(module.masked,false);
  assert.deepEqual(Array.from(result.problems,item=>item.code).sort(),['E04','E05']);
});

test('report uses final semantic action wording when E and P support an action',()=>{
  const {environment}=setRuntimeScenario({eOverrides:{E16:1},pOverrides:{P19:'partial'}});
  const report=portal.api.buildReportHtml(environment);
  assert.match(report,/Сигнали опитування потребують перевірки/);
  assert.match(report,/P19/);
  assert.match(report,/Уточнити та вдосконалити практику/);
});

test('P40 follow-up renders immediately after selecting not implemented',()=>{
  const r=research();
  portal.api.setState({screen:'checkup',r,env:null,module:7,modal:null,demo:false,returnResearch:null});
  portal.api.render();
  portal.listeners.get('change')({target:{type:'radio',name:'P40',value:'no',dataset:{}}});
  assert.match(portal.app.innerHTML,/Уточнення для P40/);
  assert.match(portal.app.innerHTML,/Так, ризик виявлено/);
});

test('P40 follow-up records applicability for each environment and survives normalization and backup',()=>{
  const r=research();
  r.periods[0].envs=[{id:'office',name:'Офіс',survey:{}},{id:'service',name:'Сервіс',survey:{}}];
  r.periods[0].checkup.answers.P40='no';
  portal.api.setState({screen:'checkup',r,env:null,module:7,modal:null,demo:false,returnResearch:null});
  portal.listeners.get('change')({target:{type:'radio',name:'p40Risk',value:'confirmed',dataset:{}}});
  assert.match(portal.app.innerHTML,/Актуальність ризику для кожного робочого середовища/);
  assert.match(portal.app.innerHTML,/data-p40-env="office"/);
  assert.match(portal.app.innerHTML,/data-p40-env="service"/);
  const change=portal.listeners.get('change');
  change({target:{type:'radio',name:'p40Environment-office',value:'confirmed',dataset:{p40Env:'office'}}});
  change({target:{type:'radio',name:'p40Environment-service',value:'not_confirmed',dataset:{p40Env:'service'}}});
  const cp=r.periods[0].checkup;
  assert.equal(cp.p40Risk,'confirmed');
  assert.equal(cp.p40ApplicabilityByEnvironment.office,'confirmed');
  assert.equal(cp.p40ApplicabilityByEnvironment.service,'not_confirmed');
  const restored=JSON.parse(JSON.stringify(r));
  assert.equal(portal.api.validateBackupResearch(restored),true);
  portal.api.normalizeResearch(restored);
  assert.equal(restored.periods[0].checkup.p40ApplicabilityByEnvironment.service,'not_confirmed');
  const legacy=research();
  legacy.periods[0].envs=r.periods[0].envs;
  legacy.periods[0].checkup={answers:{P40:'no'},p40Risk:'confirmed',done:true};
  portal.api.normalizeResearch(legacy);
  assert.equal(Object.keys(legacy.periods[0].checkup.p40ApplicabilityByEnvironment).length,0);
  change({target:{type:'radio',name:'p40Risk',value:'not_confirmed',dataset:{}}});
  assert.equal(Object.keys(cp.p40ApplicabilityByEnvironment).length,0);
});

test('survey weather thresholds, badges and problem-item safeguard follow final E/L rules',()=>{
  const scenarios=[
    [85,13,'Ясно'],
    [82,16,'Хмарно'],
    [75,15,'Хмарно'],
    [74,14,'Хмарно'],
    [68,8,'Хмарно'],
    [60,30,'Буря'],
    [60,20,'Хмарно'],
    [55,20,'Хмарно'],
    [54,20,'Хмарно'],
    [52,18,'Хмарно'],
    [50,10,'Хмарно'],
    [45,30,'Буря'],
  ];
  for(const [favorable,unfavorable,status] of scenarios)assert.equal(portal.api.weatherStatus(favorable,unfavorable),status);
  for(const [favorable,neutral,unfavorable,status] of [
    [85,2,13,'Ясно'],[82,2,16,'Хмарно'],[75,10,15,'Хмарно'],
    [74,12,14,'Хмарно'],[68,24,8,'Хмарно'],[60,10,30,'Буря'],
    [60,20,20,'Хмарно'],[55,25,20,'Хмарно'],[54,26,20,'Хмарно'],
    [50,40,10,'Хмарно'],[45,25,30,'Буря']
  ]){assert.equal(favorable+neutral+unfavorable,100);assert.equal(portal.api.weatherStatus(favorable,unfavorable),status)}
  assert.equal(portal.api.weatherStatus(0,0),'Хмарно');
  assert.equal(portal.api.weatherStatus(55,20),'Хмарно');
  assert.equal(portal.api.weatherStatus(55,30),'Буря');
  assert.equal(portal.api.fmtPct(54.545),'54,5%');
  assert.equal(portal.api.weatherStatus(75,14.999),'Ясно');
  assert.equal(portal.api.weatherStatus(75,15),'Хмарно');

  assert.equal(portal.api.boundaryFlag('Буря',60,30,false),'Буря біля межі з Хмарно');
  assert.equal(portal.api.boundaryFlag('Хмарно',54,20,false),null);
  assert.equal(portal.api.boundaryFlag('Хмарно',60,26,false),'Хмарно біля межі з Бурею');
  assert.equal(portal.api.boundaryFlag('Хмарно',74,14,false),'Хмарно біля межі з Ясно');

  const sr={e:{modules:{
    1:{favorable:85,neutral:2,unfavorable:13,masked:false,borderline:null},
    2:{favorable:82,neutral:2,unfavorable:16,masked:false,borderline:null},
    3:{favorable:68,neutral:24,unfavorable:8,masked:false,borderline:null},
    4:{favorable:60,neutral:10,unfavorable:30,masked:false,borderline:'Буря біля межі з Хмарно'},
    5:{favorable:90,neutral:5,unfavorable:5,masked:true,borderline:null},
    6:{favorable:null,neutral:null,unfavorable:null,masked:false,borderline:null},
  }}};
  const clearBadge=portal.api.mapStatusBadge('Ясно','E',1,sr);
  const cloudyUnfBadge=portal.api.mapStatusBadge('Хмарно','E',2,sr);
  const cloudyNeutralBadge=portal.api.mapStatusBadge('Хмарно','E',3,sr);
  const stormBadge=portal.api.mapStatusBadge('Буря','E',4,sr);
  const maskedBadge=portal.api.mapStatusBadge('Хмарно','E',5,sr);
  const fogBadge=portal.api.mapStatusBadge('Туман','E',6,sr);
  assert.match(clearBadge,/Ясно \(85% сприятл\.\)/);
  assert.match(cloudyUnfBadge,/Хмарно \(16% неспр\. відп\.\)/);
  assert.match(cloudyNeutralBadge,/Хмарно \(24% нейтр\.\)/);
  assert.match(stormBadge,/Буря \(30% неспр\. відп\.\)/);
  assert.doesNotMatch(stormBadge,/\(\d+(?:[,.]\d+)?% сприятл\.\)/);
  assert.match(maskedBadge,/Хмарно \(є проблемний аспект\)/);
  assert.match(fogBadge,/Туман \(недостатньо даних\)/);

  const answers=()=>Object.fromEntries(portal.api.SURVEY_ITEMS.filter(item=>item.source==='E').map(item=>[item.code,5]));
  const rows=Array.from({length:20},()=>({isManager:false,answers:answers()}));
  for(let index=0;index<10;index++)rows[index].answers.E01=3;
  const result=portal.api.aggregateSource(rows,'E');
  assert.equal(result.items.E01.favorable,50);
  assert.equal(result.items.E01.unfavorable,0);
  assert.equal(result.items.E01.status,'Хмарно');
  assert.ok(result.problems.some(item=>item.code==='E01'));
  assert.equal(result.modules[1].status,'Хмарно');
  assert.equal(result.modules[1].masked,true);

  const map=portal.api.weatherMapHtml([{m:1,e:'Ясно',l:'Буря',p:'Ясно'}],{survey:{results:{
    e:{modules:{1:{favorable:85,neutral:2,unfavorable:13,masked:false,borderline:null}}},
    l:{totalResponses:11,detailAllowed:true,modules:{1:{favorable:60,neutral:10,unfavorable:30,masked:false,borderline:'Буря біля межі з Хмарно'}}}
  }}});
  assert.match(map,/Буря \(30% неспр\. відп\.\)/);
  assert.doesNotMatch(map,/біля межі|неокругленими значеннями/);
  assert.match(map,/«Буря»: щонайменше 30% несприятливих/);
  assert.doesNotMatch(map,/«Буря»: менше 55% сприятливих/);
  assert.match(map,/<th>Організаційний чекап<\/th>/);
  assert.doesNotMatch(map,/<th>Організаційні практики<\/th>/);
  assert.match(map,/У дужках показано показник, який пояснює статус опитувального джерела/);
  assert.match(map,/«Хмарно»: змішаний профіль відповідей або наявність окремого проблемного аспекту/);
});

test('the 55% item boundary stays separate from storm weather',()=>{
  const rows=(favorable,neutral,unfavorable)=>Array.from({length:20},(_,index)=>({
    answers:Object.fromEntries(portal.api.SURVEY_ITEMS.filter(item=>item.source==='E').map(item=>[
      item.code,item.code==='E01'?(index<favorable?5:index<favorable+neutral?3:1):5,
    ])),
  }));
  const at=portal.api.aggregateSource(rows(11,4,5),'E');
  assert.ok(Math.abs(at.items.E01.favorable-55)<1e-8);
  assert.equal(at.items.E01.unfavorable,25);
  assert.ok(!at.problems.some(item=>item.code==='E01'));
  const below=portal.api.aggregateSource(rows(10,5,5),'E');
  assert.equal(below.items.E01.favorable,50);
  assert.ok(below.problems.some(item=>item.code==='E01'));
  const adverse=portal.api.aggregateSource(rows(11,3,6),'E');
  assert.equal(adverse.items.E01.unfavorable,30);
  assert.ok(adverse.problems.some(item=>item.code==='E01'));
});

test('checkup status rules remain reproducible, including conditional P40',()=>{
  const allFull=Object.fromEntries(portal.api.P_LIST.map(item=>[item.code,'full']));
  assert.ok(Object.values(portal.api.calculatePResults({answers:allFull}).modules).every(module=>module.status==='Ясно'));

  for(const code of ['P04','P13','P15','P16','P21','P28','P31','P36','P38','P42']){
    const module=portal.api.P_LIST.find(item=>item.code===code).module;
    assert.equal(portal.api.calculatePResults({answers:{...allFull,[code]:'no'}}).modules[module].status,'Буря',code);
  }

  const oneOrdinary={...allFull,P01:'no'};
  assert.equal(portal.api.calculatePResults({answers:oneOrdinary}).modules[1].status,'Хмарно');
  assert.equal(portal.api.calculatePResults({answers:{...oneOrdinary,P02:'no'}}).modules[1].status,'Буря');

  const fog={...allFull,P01:'insufficient',P02:'insufficient',P03:'insufficient'};
  assert.equal(portal.api.calculatePResults({answers:fog}).modules[1].status,'Туман');

  const p40={...allFull,P40:'no'};
  assert.equal(portal.api.calculatePResults({answers:p40,p40Risk:'confirmed'}).modules[7].status,'Буря');
  assert.equal(portal.api.calculatePResults({answers:p40,p40Risk:'not_confirmed'}).modules[7].status,'Хмарно');
});

test('P badges explain practices and never show a numerical percentage',()=>{
  for(const [status,expected] of [
    ['Ясно','☀ Ясно (усі практики реалізовані)'],
    ['Хмарно','☁ Хмарно (є окремі прогалини)'],
    ['Буря','🌧 Буря (є суттєва прогалина)'],
    ['Туман','≋ Туман (недостатньо даних)']
  ]){
    const badge=portal.api.mapStatusBadge(status,'P',1);
    assert.ok(badge.includes(expected));
    assert.doesNotMatch(badge,/%|boundary-flag/);
  }
});

test('weather map and report omit visible boundary messages',()=>{
  const {environment}=setRuntimeScenario({eOverrides:{E01:1},lOverrides:{L01:1}});
  const rows=portal.api.actualResultModel();
  const map=portal.api.weatherMapHtml(rows,environment);
  const report=portal.api.buildReportHtml(environment);
  for(const markup of [map,report]){
    assert.doesNotMatch(markup,/Ясно біля межі|Хмарно біля межі|Буря біля межі|неокругленими значеннями/);
    assert.doesNotMatch(markup,/<span class="boundary-flag"/);
    assert.match(markup,/☀ Ясно \(усі практики реалізовані\)/);
  }
});

test('public methodology describes weather statuses, E/L calculation, problem items and categorical P',()=>{
  assert.match(publicHtml,/<h4>Ясно<\/h4><p>Щонайменше 75% сприятливих і менше 15% несприятливих відповідей<\/p>/);
  assert.match(publicHtml,/<h4>Хмарно<\/h4><p>Є сигнали, що потребують уваги, але немає підстав для статусу «Буря»<\/p>/);
  assert.match(publicHtml,/<h4>Буря<\/h4><p>Щонайменше 30% несприятливих відповідей<\/p>/);
  assert.match(publicHtml,/<h4>Туман<\/h4><p>За достатньої вибірки недостатньо відповідей E\/L, які можна включити до розрахунку, або підтверджених даних P для надійного висновку<\/p>/);
  const calculation=publicHtml.match(/<p><strong>Розрахунок E\/L\.<\/strong> ([^<]+)<\/p>/)?.[1];
  assert.ok(calculation);
  assert.match(calculation,/Барометр розраховує результати працівників і керівників окремо/);
  assert.match(calculation,/Відповідь «Не стосується моєї роботи» не включається до розрахунку/);
  assert.match(calculation,/У такому разі Барометр показує статус «Туман»/);
  assert.doesNotMatch(calculation,/застосовні відповіді|3 із 5|2 із 3/);
  assert.match(publicHtml,/щонайменше половина респондентів/);
  assert.match(publicHtml,/не менше 10 працівників або 5 керівників/);
  assert.match(publicHtml,/менше 55% або несприятливих щонайменше 30%/);
  assert.match(publicHtml,/Числовий відсоток не розраховується/);
  assert.match(publicHtml,/title:'Форма опитування',text:'Для кожного робочого середовища створіть окрему копію форми об’єднаної анкети[^\n]+additionalParagraph:'Перед початком опитування протестуйте створену форму на тестових відповідях/);
  assert.match(publicHtml,/Повідомлення про недостатню вибірку під час такого тестування є нормальним/);
  assert.doesNotMatch(publicHtml,/Менше 55% сприятливих або щонайменше 30% несприятливих відповідей/);
  assert.doesNotMatch(publicHtml,/портал позначає статуси біля межі/);
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
  assert.match(publicHtml,/Якщо мінімальної вибірки не досягнуто, статус джерела не розраховується/);
  assert.match(publicHtml,/Для CSV використовуйте кодування UTF-8/);
  assert.match(publicHtml,/не шифруються самим Барометром/);
  assert.match(publicHtml,/Організаційний чекап показує сприятливий стан практик/);
  assert.doesNotMatch(publicHtml,/Організаційні практики оцінені слабше/);
  assert.equal((publicHtml.match(/<h3>Безпека даних<\/h3>/g)||[]).length,0);
});

function semanticFixture({e={},l={},p={},eEligible=true,lEligible=true,p40Applicable=false,p40Known=false}={}){
  return {E:{eligible:eEligible,total:eEligible?20:19,states:e},L:{eligible:lEligible,total:lEligible?10:9,states:l},P:{states:p,p40Applicable,p40Known:p40Known||p40Applicable}};
}
test('semantic v2 defines all 27 aspects and approved positive conclusion',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture());assert.equal(a.version,'2.0-2026-09-25');assert.equal(a.aspects.length,27);assert.equal(a.modules[1].aspects.length,0);assert.match(a.modules[1].lead,/За доступними даними виражених проблемних ознак у цьому модулі не виявлено/)});
test('semantic v2 E-only problem is aspect-specific',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'}})),x=a.modules[1].aspects.find(x=>x.id==='M1-C1');assert.ok(x);assert.match(x.alignment,/Відповіді працівників вказують/);assert.doesNotMatch(x.alignment,/\bякщо\b/i)});
test('semantic v2 alignment names concrete evidence from each available source',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E09:'S'},l:{L06:'S'},p:{P31:'G'}})),x=a.modules[2].aspects.find(x=>x.id==='M2-C3');assert.ok(x);assert.match(x.alignment,/навантаження враховують при визначенні завдань і строків/i);assert.match(x.alignment,/керівник має достатньо ресурсів/i);assert.match(x.alignment,/відстеження навантаження й реакція на системне перевантаження/i);assert.doesNotMatch(x.alignment,/пов’язаний сигнал у цьому аспекті/i)});
test('semantic v2 visible interpretation avoids banned technical wording',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P08:'G',P16:'G',P33:'G',P34:'G'},l:{L17:'S'}})),visible=Object.values(a.modules).flatMap(m=>m.aspects).map(x=>x.alignment+' '+x.attention).join(' ');assert.doesNotMatch(visible,/блокер|ескалац|маршрутизац|управлінська спроможність/i);assert.match(visible,/порядок передавання питання на відповідний рівень/i);assert.match(visible,/спеціалізована психологічна, медична, кризова або інша професійна допомога/i)});
test('semantic v2 L-only problem is retained',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L01:'S'}})),x=a.modules[1].aspects.find(x=>x.id==='M1-C1');assert.ok(x);assert.match(x.alignment,/Відповіді керівників вказують/)});
test('semantic v2 P-only gap is preventive',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P01:'G'}})),x=a.modules[1].aspects.find(x=>x.id==='M1-C1');assert.ok(x);assert.match(x.alignment,/превентивна організаційна прогалина/)});
test('semantic v2 E problem plus favorable P describes discrepancy',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'},p:{P01:'N',P06:'N'}}));assert.match(a.modules[1].aspects.find(x=>x.id==='M1-C1').alignment,/Досвід працівників відрізняється від результату організаційного чекапу/)});
test('P gap A: problematic E remains actionable with favorable L and corporate P',()=>{
  setRuntimeScenario({eOverrides:{E01:1}});
  const row=portal.api.actualResultModel()[0],analysis=portal.api.barometerSemanticInterpretation();
  const aspect=analysis.modules[1].aspects.find(x=>x.id==='M1-C1');
  assert.equal(row.e,'Хмарно');assert.equal(row.l,'Ясно');assert.equal(row.p,'Ясно');
  assert.ok(aspect);assert.match(aspect.alignment,/Досвід працівників відрізняється від результату організаційного чекапу/);
  assert.match(aspect.alignment,/охоплює це середовище/);assert.match(aspect.alignment,/працівники знають про неї/);
  assert.match(aspect.alignment,/мають реальний доступ/);assert.match(aspect.alignment,/дає очікуваний результат/);
  assert.ok(analysis.modules[1].actions.some(action=>action.basis_codes.includes('E01')));
});
test('P gap B: problematic L is retained and manager access is checked despite favorable E and P',()=>{
  setRuntimeScenario({lOverrides:{L01:1}});
  const row=portal.api.actualResultModel()[0],analysis=portal.api.barometerSemanticInterpretation();
  const aspect=analysis.modules[1].aspects.find(x=>x.id==='M1-C1');
  assert.equal(row.e,'Ясно');assert.equal(row.l,'Буря');assert.equal(row.p,'Ясно');
  assert.ok(aspect);assert.match(aspect.alignment,/Можливості керівників відрізняються від сприятливого результату організаційного чекапу/);
  for(const term of ['час','інформацію','ресурси','повноваження','доступ до потрібного рішення або фахівця'])assert.ok(aspect.alignment.includes(term));
  assert.ok(analysis.modules[1].actions.some(action=>action.basis_codes.includes('L01')));
});
test('P gap C: problematic E and L give a stronger local signal without claiming a proved cause',()=>{
  setRuntimeScenario({eOverrides:{E01:1},lOverrides:{L01:1}});
  const row=portal.api.actualResultModel()[0],analysis=portal.api.barometerSemanticInterpretation();
  const aspect=analysis.modules[1].aspects.find(x=>x.id==='M1-C1');
  assert.equal(row.e,'Хмарно');assert.equal(row.l,'Буря');assert.equal(row.p,'Ясно');
  assert.ok(aspect);assert.match(aspect.alignment,/Досвід працівників відрізняється/);
  assert.match(aspect.alignment,/Можливості керівників відрізняються/);
  assert.match(aspect.alignment,/сильним сигналом можливого розриву/);
  assert.match(aspect.alignment,/механізм потрібно перевірити додатково/);
  assert.doesNotMatch(aspect.alignment,/практика існує лише формально|доведено, що практика/);
  assert.ok(analysis.modules[1].actions.some(action=>['E01','L01'].every(code=>action.basis_codes.includes(code))));
});
test('P gap D: one checkup serves two environments and only the weaker environment shows a local gap',()=>{
  setRuntimeScenario();
  const state=portal.api.getState(),checkup=state.r.periods[0].checkup;
  const second={id:'env-second',name:'Друге середовище',emp:20,man:10,invE:20,invL:10,
    survey:{ok:true,e:20,l:10,results:{
      e:portal.api.aggregateSource(surveyRows('E',20,{overrides:{E01:1}}),'E'),
      l:portal.api.aggregateSource(surveyRows('L',10,{overrides:{L01:1}}),'L'),
    }}};
  state.r.periods[0].envs.push(second);
  const firstRow=portal.api.actualResultModel()[0],first=portal.api.barometerSemanticInterpretation();
  portal.api.setState({...state,env:second.id});
  const secondRow=portal.api.actualResultModel()[0],other=portal.api.barometerSemanticInterpretation();
  assert.strictEqual(state.r.periods[0].checkup,checkup);
  assert.equal(firstRow.p,'Ясно');assert.equal(secondRow.p,'Ясно');
  assert.equal(firstRow.e,'Ясно');assert.equal(firstRow.l,'Ясно');
  assert.equal(secondRow.e,'Хмарно');assert.equal(secondRow.l,'Буря');
  assert.equal(JSON.stringify(first.input.P.states),JSON.stringify(other.input.P.states));
  assert.equal(first.modules[1].aspects.length,0);
  assert.match(other.modules[1].aspects.find(x=>x.id==='M1-C1').alignment,/сильним сигналом можливого розриву/);
});
test('P gap at module level: diffuse cloudy E and L remain visible even without a problem item',()=>{
  setRuntimeScenario();
  const state=portal.api.getState(),environment=state.r.periods[0].envs[0];
  for(const [source,count] of [['E',20],['L',10]]){
    const codes=portal.api.SURVEY_ITEMS.filter(item=>item.source===source&&item.module===1).map(item=>item.code);
    const rows=surveyRows(source,count);
    for(let i=0;i<rows.length;i++)if(i>=Math.ceil(count*0.7))rows[i].answers={...rows[i].answers,...Object.fromEntries(codes.map(code=>[code,3]))};
    environment.survey.results[source.toLowerCase()]=portal.api.aggregateSource(rows,source);
  }
  const row=portal.api.actualResultModel()[0],semantic=portal.api.barometerSemanticInterpretation().modules[1];
  assert.equal(row.e,'Хмарно');assert.equal(row.l,'Хмарно');assert.equal(row.p,'Ясно');
  assert.equal(semantic.aspects.length,0);
  assert.match(semantic.lead,/сильний сигнал можливого розриву/);
  assert.match(semantic.lead,/перевір/);
  assert.doesNotMatch(semantic.lead,/якість даних обмежує висновок/);
  const cloudyE=environment.survey.results.e,cloudyL=environment.survey.results.l;
  environment.survey.results.l=portal.api.aggregateSource(surveyRows('L',10),'L');
  assert.match(portal.api.barometerSemanticInterpretation().modules[1].lead,/Результат працівників менш сприятливий/);
  environment.survey.results.e=portal.api.aggregateSource(surveyRows('E',20),'E');
  environment.survey.results.l=cloudyL;
  assert.match(portal.api.barometerSemanticInterpretation().modules[1].lead,/Результат керівників менш сприятливий/);
  environment.survey.results.e=cloudyE;
});
test('P gap across different aspects: E and L together warrant a module check, not an assumed shared cause',()=>{
  setRuntimeScenario({eOverrides:{E01:1},lOverrides:{L02:1}});
  const row=portal.api.actualResultModel()[0],module=portal.api.barometerSemanticInterpretation().modules[1];
  assert.equal(row.e,'Хмарно');assert.equal(row.l,'Буря');assert.equal(row.p,'Ясно');
  assert.ok(module.aspects.some(x=>x.id==='M1-C1'&&x.e==='S'&&x.l==='N'));
  assert.ok(module.aspects.some(x=>x.id==='M1-C2'&&x.e==='N'&&x.l==='S'));
  assert.match(module.lead,/сильний сигнал можливого розриву/);
  assert.match(module.lead,/кожного аспекту окремо/);
  assert.doesNotMatch(module.lead,/спільну причину встановлено/);
});
test('semantic v2 fog does not close active issue',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'T'},l:{L01:'S'}})),x=a.modules[1].aspects.find(x=>x.id==='M1-C1');assert.ok(x);assert.match(x.alignment,/недостатньо застосовних даних/);assert.match(x.alignment,/Відповіді керівників вказують/)});
test('fog-only module gives one data-limitation conclusion and no aspect cards or actions',()=>{
  const pOverrides=Object.fromEntries(portal.api.P_LIST.filter(item=>item.module===1).map(item=>[item.code,'insufficient']));
  const {environment}=setRuntimeScenario({eAnswer:'NA',lAnswer:'NA',pOverrides});
  const analysis=portal.api.barometerSemanticInterpretation(),module=analysis.modules[1],row=portal.api.actualResultModel()[0];
  assert.equal(row.e,'Туман');assert.equal(row.l,'Туман');assert.equal(row.p,'Туман');
  assert.equal(module.aspects.length,0);assert.equal(module.actions.length,0);
  assert.match(module.lead,/Недостатньо даних, щоб надійно оцінити/);
  assert.match(module.lead,/застосовних відповідей працівників та керівників/);
  assert.match(module.lead,/підтвердіть дані організаційного чекапу/);
  const markup=portal.api.barometerSemanticModuleMarkup(row);
  assert.doesNotMatch(markup,/Аспекти, що потребують уваги|data-aspect-id=|class="evidence-action"/);
  assert.match(portal.api.buildReportHtml(environment),/Недостатньо даних, щоб надійно оцінити/);
  assert.ok(portal.api.barometerModuleActions(1).every(a=>a.answer==='insufficient'));
});
test('a real problem or P gap remains visible beside fog',()=>{
  const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'T'},l:{L01:'S'},p:{P01:'G'}}));
  assert.ok(a.modules[1].aspects.some(item=>item.id==='M1-C1'));
  assert.ok(a.modules[1].actions.length>0);
  assert.match(a.modules[1].aspects.find(item=>item.id==='M1-C1').alignment,/недостатньо застосовних даних/);
});
test('semantic v2 insufficient E sample is excluded, not fog',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({eEligible:false,l:{L01:'S'},p:{P01:'G'}}));assert.match(a.modules[1].dataNotes.join(' '),/Працівники: отримано 19 валідних анкет/);const x=a.modules[1].clusters.find(x=>x.eCodes.includes('E01'));assert.equal(x.e,'X');assert.doesNotMatch(a.modules[1].aspects.find(x=>x.id==='M1-C1').alignment,/Туман/)});
test('semantic v2 insufficient L sample is excluded, not fog',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({lEligible:false,e:{E01:'S'}}));assert.match(a.modules[1].dataNotes.join(' '),/Керівники: отримано 9 валідних анкет/)});
test('semantic v2 source not measured is not favorable',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S'}})),x=a.modules[1].aspects.find(x=>x.id==='M1-C4');assert.ok(x);assert.equal(x.l,'M')});
test('semantic v2 E20 alone does not trigger M4-A3',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E20:'S'}}));assert.ok(a.modules[4].aspects.some(x=>x.id==='M4-C5'));assert.ok(!a.actions.some(x=>x.id==='M4-A3'))});
test('semantic v2 E31 alone requests pulse study and no routed action',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E31:'S'}})),x=a.modules[7].aspects.find(x=>x.id==='M7-C2');assert.ok(x);assert.match(x.alignment,/цільове пульс-опитування/);assert.ok(!a.actions.some(x=>['M3-A3','M4-A3','M7-A3'].includes(x.id)))});
test('semantic v2 L16 alone produces narrow manager action',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L16:'S'}})),x=a.actions.find(x=>x.id==='M6-A1');assert.ok(x);assert.equal(x.variant,'L16');assert.equal(x.steps.length,3);assert.match(x.title,/можливість реагувати/)});
test('semantic v2 L21 alone produces narrow change-risk action',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L21:'S'}})),x=a.actions.find(x=>x.id==='M7-A2');assert.ok(x);assert.equal(x.variant,'L21');assert.equal(x.steps.length,3);assert.match(x.title,/Залучати керівників/)});
test('semantic v2 P40 requires confirmed applicability',()=>{const no=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P40:'G'},p40Applicable:false}));assert.ok(!no.actions.some(x=>x.id==='M7-A3'));assert.ok(no.modules[7].aspects.some(x=>x.id==='M7-C3'));const yes=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P40:'G'},p40Applicable:true})),x=yes.actions.find(x=>x.id==='M7-A3');assert.ok(x);assert.match(x.title,/третіх осіб/)});
test('one corporate P40 result yields local action only where applicability is confirmed',()=>{
  setRuntimeScenario({pOverrides:{P40:'no'}});
  const state=portal.api.getState(),researchState=state.r,cp=researchState.periods[0].checkup;
  const first=researchState.periods[0].envs[0],second={...first,id:'env-second',name:'Інше середовище'};
  researchState.periods[0].envs.push(second);
  cp.p40Risk='confirmed';cp.p40ApplicabilityByEnvironment={[first.id]:'confirmed',[second.id]:'not_confirmed'};
  cp.results=portal.api.calculatePResults(cp);
  const evaluate=environmentId=>{
    portal.api.setState({...state,r:researchState,env:environmentId});
    return {input:portal.api.barometerRuntimeInput(),analysis:portal.api.barometerSemanticInterpretation()};
  };
  const confirmed=evaluate(first.id);
  assert.equal(confirmed.input.P.p40Applicable,true);
  assert.ok(confirmed.analysis.modules[7].actions.some(action=>action.id==='M7-A3'));
  const notConfirmed=evaluate(second.id);
  assert.equal(notConfirmed.input.P.p40Known,true);
  assert.equal(notConfirmed.input.P.p40Applicable,false);
  assert.ok(!notConfirmed.analysis.modules[7].actions.some(action=>action.id==='M7-A3'));
  assert.ok(!notConfirmed.analysis.modules[7].aspects.some(aspect=>aspect.id==='M7-C3'));
  assert.match(notConfirmed.analysis.modules[7].lead,/на рівні компанії.*цього робочого середовища/);
  assert.doesNotMatch(notConfirmed.analysis.modules[7].lead,/якість даних обмежує висновок/);
  delete cp.p40ApplicabilityByEnvironment[second.id];
  const missing=evaluate(second.id);
  assert.equal(missing.input.P.p40Applicable,false);
  assert.equal(missing.input.P.p40Known,false);
  assert.ok(!missing.analysis.modules[7].actions.some(action=>action.id==='M7-A3'));
  assert.match(missing.analysis.modules[7].aspects.find(aspect=>aspect.id==='M7-C3').alignment,/актуальність.*цього робочого середовища/);
  cp.p40ApplicabilityByEnvironment[second.id]='needs_check';
  assert.equal(evaluate(second.id).input.P.p40Applicable,false);
  assert.equal(cp.results.modules[7].status,'Буря');
});
test('semantic v2 keeps five active aspects in one module',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E16:'S',E18:'S',E20:'S'},l:{L10:'S',L11:'S'}}));assert.equal(a.modules[4].aspects.length,5)});
test('semantic v2 C01 replaces duplicate change actions',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S',E24:'S'}}));assert.ok(a.actions.some(x=>x.id==='C01'));assert.ok(!a.actions.some(x=>x.id==='M1-A3'));assert.ok(!a.actions.some(x=>x.id==='M5-A3'))});
test('H01 C01 preserves independent emergency action M7-A3',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S',E24:'S',E34:'S'}}));const ids=a.actions.map(x=>x.id);assert.ok(ids.includes('C01'));assert.ok(ids.includes('M7-A3'),'Do not lose emergency action when merging change actions');assert.ok(!ids.includes('M1-A3'));assert.ok(!ids.includes('M5-A3'))});
test('H01 C01 preserves other independent actions as well',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S',E24:'S',E16:'S',E34:'S'}}));const ids=a.actions.map(x=>x.id);assert.ok(ids.includes('C01'));assert.ok(ids.includes('M4-A1'),'Do not lose fairness action');assert.ok(ids.includes('M7-A3'),'Do not lose emergency action');assert.ok(!ids.includes('M1-A3'));assert.ok(!ids.includes('M5-A3'))});
test('semantic v2 adaptive M4-A1 shows only relevant E17 steps',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E17:'S'}})),x=a.actions.find(x=>x.id==='M4-A1');assert.ok(x);assert.ok(x.steps.some(s=>/визнання внеску/.test(s)));assert.ok(!x.steps.some(s=>/оплати і преміювання/.test(s)))});
test('semantic v2 P35 and P36 keep their action subsets separate',()=>{const p35=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P35:'G'}})).actions.find(x=>x.id==='M6-A3');assert.ok(p35);assert.ok(!p35.steps.some(s=>/травматич/.test(s)));const p36=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P36:'G'}})).actions.find(x=>x.id==='M6-A3');assert.ok(p36);assert.ok(!p36.steps.some(s=>/тривалої відсутності/.test(s)))});
test('semantic v2 E28 does not add overload steps',()=>{const x=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E28:'S'}})).actions.find(x=>x.id==='M6-A1');assert.ok(x);assert.ok(x.steps.some(s=>/поза звичайним робочим часом/.test(s)));assert.ok(!x.steps.some(s=>/повторюваного надмірного навантаження/.test(s)))});
test('semantic v2 E31 and confirmed P40 stay separate',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E31:'S'},p:{P40:'G'},p40Applicable:true})),e31=a.modules[7].aspects.find(x=>x.id==='M7-C2'),p40=a.modules[7].aspects.find(x=>x.id==='M7-C3');assert.ok(e31&&p40);assert.doesNotMatch(e31.alignment,/клієнт|пасажир|пацієнт/i);assert.ok(a.actions.some(x=>x.id==='M7-A3'))});
test('semantic v2 action cards use bullets and omit legacy sections',()=>{setRuntimeScenario({eOverrides:{E17:1}});const markup=portal.api.barometerSemanticModuleMarkup(portal.api.actualResultModel()[3]);assert.match(markup,/Що зробити/);assert.match(markup,/<ol>/);assert.doesNotMatch(markup,/Чому це рекомендовано/);assert.doesNotMatch(markup,/Що уточнити/)});
test('semantic UX renders independent accordion cards for 1, 2 and 5 active aspects',()=>{
  const one=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'}})).modules[1].aspects;
  const two=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S',E02:'S'}})).modules[1].aspects;
  const five=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E16:'S',E18:'S',E20:'S'},l:{L10:'S',L11:'S'}})).modules[4].aspects;
  assert.equal(one.length,1);assert.equal(two.length,2);assert.equal(five.length,5);
  for(const aspects of [one,two,five]){const markup=portal.api.barometerV2AspectsMarkup(aspects);assert.match(markup,/Аспекти, що потребують уваги/);assert.equal((markup.match(/<details class="semantic-aspect-card"/g)||[]).length,aspects.length);assert.equal((markup.match(/<summary>/g)||[]).length,aspects.length);assert.equal((markup.match(/Як узгоджуються джерела/g)||[]).length,aspects.length);assert.equal((markup.match(/На що звернути увагу/g)||[]).length,aspects.length);assert.doesNotMatch(markup,/Наступний аспект/);assert.doesNotMatch(markup,/<details[^>]+name=/);for(const aspect of aspects)assert.ok(markup.includes(aspect.title));}
});
test('semantic v2 visible wording contains no складов and no mechanical colon lists',()=>{const fixtures=[semanticFixture({e:{E01:'S'}}),semanticFixture({l:{L01:'S'}}),semanticFixture({p:{P01:'G'}}),semanticFixture({e:{E09:'S'},l:{L06:'S'},p:{P31:'G'}}),semanticFixture({e:{E31:'S'}}),semanticFixture({e:{E20:'S'}})];const visible=fixtures.flatMap(f=>Object.values(portal.api.barometerSemanticInterpretation(f).modules).flatMap(m=>m.aspects)).map(x=>x.alignment+' '+x.attention).join(' ');assert.doesNotMatch(visible,/складов/i);assert.doesNotMatch(visible,/щодо таких\s+[^.]*:/i);assert.doesNotMatch(visible,/за такими\s+[^.]*:/i);assert.doesNotMatch(visible,/\b(DIRECT|SUPPORT|ROUTE|NOT_MEASURED|AVAILABLE|semantic layer|active code|trigger|source combination)\b/i);});
test('semantic v2 dynamic signal wording is grammatically integrated',()=>{const mixed=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'},l:{L01:'N'},p:{P01:'N',P06:'N'}})).modules[1].aspects.find(x=>x.id==='M1-C1');assert.ok(mixed);assert.match(mixed.alignment,/Відповіді працівників вказують на труднощі в таких питаннях, як /);assert.match(mixed.alignment,/Відповіді керівників не вказують на виражені проблеми в таких питаннях, як /);const fog=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L21:'S'},p:{P37:'T'}})).modules[7].aspects.find(x=>x.id==='M7-C2');assert.ok(fog);assert.match(fog.alignment,/недостатньо підтверджених даних для надійної оцінки таких питань, як інтеграція психосоціальних ризиків/i);assert.doesNotMatch(fog.alignment,/оцінити інтеграція/i);});
test('public example shows only a conclusion for clear and fog-only combinations',()=>{
  const clear=renderPublicExample('Ясно','Ясно','Ясно');
  assert.equal((clear.statuses.match(/status-chip/g)||[]).length,3);
  assert.match(clear.interpretation,/сприятливому рівні/);
  assert.equal(clear.detail,'');
  const fog=renderPublicExample('Туман','Туман','Туман');
  assert.equal((fog.statuses.match(/status-chip/g)||[]).length,3);
  assert.match(fog.interpretation,/застосовних відповідей працівників і керівників/);
  assert.match(fog.interpretation,/підтвердити дані організаційного чекапу/);
  assert.equal(fog.detail,'');
  assert.equal(renderPublicExample('Туман','Ясно','Ясно').detail,'');
  const problem=renderPublicExample('Буря','Хмарно','Ясно');
  assert.equal((problem.detail.match(/class="example-aspect-card"/g)||[]).length,1);
  assert.equal((problem.detail.match(/class="example-action-card"/g)||[]).length,1);
});
test('embedded local portal is byte-for-byte synchronized after base64 decoding',()=>{const match=publicHtml.match(/const embeddedLocalPortal = '([A-Za-z0-9+/=]+)';/);assert.ok(match);const decoded=Buffer.from(match[1],'base64'),localBytes=fs.readFileSync(new URL('../local/index.html',import.meta.url));assert.equal(Buffer.compare(decoded,localBytes),0);});

// Corrective patch F01/F02/F03/F04/F06: exercise the final runtime.
for(const boundary of [15,30,55,75])test(`F01 stable comparison on both sides of ${boundary}%`,()=>{
  assert.equal(portal.api.compareSurveyPercent(boundary-1e-7,boundary),-1);
  assert.equal(portal.api.compareSurveyPercent(boundary,boundary),0);
  assert.equal(portal.api.compareSurveyPercent(boundary+1e-7,boundary),1);
  for(const noise of [-1e-12,0,1e-12])assert.equal(portal.api.compareSurveyPercent(boundary+noise,boundary),0);
});
for(const [label,values,expected] of [
  ['15 below',[85,15-1e-7],'Ясно'],['15 exact',[85,14.999999999999995],'Хмарно'],['15 above',[85,15+1e-7],'Хмарно'],
  ['30 below',[70,30-1e-7],'Хмарно'],['30 exact',[70,29.99999999999999],'Буря'],['30 above',[70,30+1e-7],'Буря'],
  ['75 below',[75-1e-7,10],'Хмарно'],['75 exact',[74.99999999999999,10],'Ясно'],['75 above',[75+1e-7,10],'Ясно'],
])test(`F01 weather ${label}`,()=>assert.equal(portal.api.weatherStatus(...values),expected));
for(const [f,u,expected] of [[55-1e-7,10,true],[54.99999999999999,10,false],[55+1e-7,10,false],[70,30-1e-7,false],[70,29.99999999999999,true],[70,30+1e-7,true]])test(`F01 problem item ${f}/${u}`,()=>{
  assert.equal(portal.api.isProblemSurveyItem({adequate:true,favorable:f,unfavorable:u}),expected);
  setRuntimeScenario();
  const source=portal.api.getState().r.periods[0].envs[0].survey.results.e;
  source.items.E01={...source.items.E01,favorable:f,unfavorable:u};
  assert.equal(portal.api.barometerRuntimeInput().E.states.E01,expected?'S':'N');
});
for(const [source,n,negative,status] of [['L',10,9,'Буря'],['L',20,9,'Хмарно'],['E',20,18,'Буря']])test(`F01 respondent profiles ${source} n=${n} negatives=${negative}`,()=>{
  const rows=moduleRows(source,n,1,(r,i)=>i>=3?'NA':r<negative&&i===r%3?1:5);
  const result=portal.api.aggregateSource(rows,source),m=result.modules[1];
  assert.ok(Math.abs(m.unfavorable-negative/n/3*100)<1e-10);
  assert.equal(m.status,status);
  const {environment}=setRuntimeScenario();environment.survey.results[source.toLowerCase()]=result;
  assert.equal(portal.api.actualResultModel()[0][source.toLowerCase()],status);
  assert.ok(portal.api.buildReportHtml(environment).includes(status));
});
for(const [name,overrides,positive,negative,missing] of [
  ['N+NA',{E11:5,E13:'NA'},['E11'],[],['E13']],
  ['S+NA',{E11:1,E13:'NA'},[],['E11'],['E13']],
  ['N+S',{E11:5,E13:1},['E11'],['E13'],[]],
  ['NA+NA',{E11:'NA',E13:'NA'},[],[],['E11','E13']],
  ['direct measured/additional NA',{E11:5,E13:5,E14:'NA'},['E11','E13'],[],[]],
])test(`F02 measured evidence is scoped: ${name}`,()=>{
  setRuntimeScenario({eOverrides:overrides,lOverrides:{L09:1}});
  const a=portal.api.barometerSemanticInterpretation().modules[3].aspects.find(x=>x.id==='M3-C1');
  assert.ok(a);
  // Match the production signal labels through the rendered state-specific clauses.
  const positiveSentence=a.alignment.match(/Відповіді працівників не вказують[^.]*\./)?.[0]||'';
  const negativeSentence=a.alignment.match(/Відповіді працівників вказують[^.]*\./)?.[0]||'';
  const missingSentence=a.alignment.match(/За відповідями працівників недостатньо[^.]*\./)?.[0]||'';
  assert.equal(!!positiveSentence,positive.length>0);
  assert.equal(!!negativeSentence,negative.length>0);
  assert.equal(!!missingSentence,missing.length>0);
  if(missing.includes('E13')){assert.doesNotMatch(positiveSentence,/допомог/i);assert.match(missingSentence,/допомог/i)}
  if(negative.includes('E13')){assert.doesNotMatch(positiveSentence,/допомог/i);assert.match(negativeSentence,/допомог/i)}
  if(overrides.E14==='NA')assert.doesNotMatch(a.alignment,/Додатково відповіді працівників/);
});
test('F02 partial NA remains visible even with no adverse signals',()=>{
  const {environment}=setRuntimeScenario({eOverrides:{E13:'NA'}});
  const m=portal.api.barometerSemanticInterpretation().modules[3];
  assert.ok(m.aspects.some(a=>a.id==='M3-C1'));
  assert.match(m.lead,/висновок не поширюється/);
  assert.match(portal.api.buildReportHtml(environment),/недостатньо застосовних даних/);
});
for(const [code,id,terms] of [
  ['E09','M2-D1',[/поточне навантаження/,/строк, пріоритет, обсяг або розподіл/]],
  ['E10','M2-D2',[/управлінських рішень/,/ризики/]],
  ['E14','M3-D1',[/висловлювати свою позицію/,/взаємодії чи організації/]],
  ['L04','M2-D3',[/кількість прямих підлеглих/,/інші робочі обов’язки/]],
  ['L06','M2-D4',[/бюджету, обладнання/,/рішення іншого рівня/]],
  ['L17','M6-D1',[/порядок консультації/,/не діагностує/]],
  ['L18','M6-D1',[/перенаправити/,/не діагностує/]],
])test(`F03 isolated ${code} has a concrete plan-ready diagnostic action`,async()=>{
  const {environment}=setSurveyIssueScenario(code),a=portal.api.barometerSemanticInterpretation();
  const action=a.actions.find(x=>x.id===id);assert.ok(action);assert.equal(action.variant,'diagnostic');assert.equal(action.planEligible,true);
  for(const term of terms)assert.match(action.action,term);
  assert.ok(portal.api.selectedActions(action.module).find(x=>x.target===id));
  assert.match(portal.api.buildReportHtml(environment),new RegExp(action.title));
  if(code==='E14')assert.ok(!a.actions.some(x=>x.id==='M3-A1'));
  const button={dataset:{a:'add-routed-action',m:String(action.module),target:id},replaceWith(){}};
  await portal.listeners.get('click')({target:{closest(){return button}}});
  const plan=portal.api.getState().r.plan;assert.equal(plan.length,1);assert.equal(plan[0].sourceTarget,id);assert.equal(plan[0].description,portal.api.barometerModuleActions(action.module,a).find(x=>x.id===id).action);
  await portal.listeners.get('click')({target:{closest(){return button}}});assert.equal(plan.length,1);
  const saved=JSON.parse([...portal.storage.values()].at(-1));assert.equal(saved.plan[0].sourceTarget,id);
  assert.ok(portal.api.planXlsxBytes(portal.api.planRows()).length>1000);
});
test('F03 L17 and L18 deduplicate and do not duplicate an existing help action',()=>{
  setRuntimeScenario({lOverrides:{L17:1,L18:1}});
  let actions=portal.api.barometerSemanticInterpretation().actions;
  assert.equal(actions.filter(x=>x.id==='M6-D1').length,1);
  assert.deepEqual(Array.from(actions.find(x=>x.id==='M6-D1').basis_codes),['L17','L18']);
  setRuntimeScenario({eOverrides:{E29:1},lOverrides:{L17:1,L18:1}});
  actions=portal.api.barometerSemanticInterpretation().actions;
  assert.ok(actions.some(x=>x.id==='M6-A2'));assert.ok(!actions.some(x=>x.id==='M6-D1'));
});
for(const companion of [null,'E32','P41','L19'])test(`F04 E33 with ${companion||'favorable E32/L19/P41'}`,()=>{
  setRuntimeScenario({eOverrides:{E33:1,...(companion==='E32'?{E32:1}:{})},lOverrides:companion==='L19'?{L19:1}:{},pOverrides:companion==='P41'?{P41:'partial'}:{}});
  const a=portal.api.barometerSemanticInterpretation(),x=a.actions.find(x=>x.id==='M7-A1');
  assert.ok(x);assert.match(x.action,/правила безпеки/);assert.match(x.action,/інструктаж/);assert.match(x.action,/застосувати правила/);
  if(companion)assert.match(x.action,/небезпечну умову/);
  else{assert.doesNotMatch(x.action,/небезпечну умову|Оцінити її практичне значення/);assert.match(x.title,/знання правил/);assert.match(a.modules[7].aspects.find(x=>x.id==='M7-C1').attention,/Сам цей сигнал не доводить/)}
});
for(let i=0;i<6;i++)test(`F06 current category ${i+1} and numeric equivalent import`,()=>{
  assert.equal(portal.api.parseResponseValue(portal.api.RESPONSE_SCALE[i]),i===5?'NA':i+1);
  for(const value of [String(i+1),i+1])assert.equal(portal.api.parseResponseValue(value),i===5?'NA':i+1);
  const headers=[portal.api.ROLE_QUESTION,...portal.api.SURVEY_ITEMS.map(x=>`${x.code}. ${x.text}`)];
  const table=[headers,['Так',...portal.api.SURVEY_ITEMS.map(()=>portal.api.RESPONSE_SCALE[i])]];
  assert.equal(portal.api.validateTableRows(table,'current.csv').errors.length,0);
});
for(const value of ['Важко відповісти','Не погоджуюся','Погоджуюся','Цілком погоджуюсь','Невідома категорія'])test(`F06 rejects and names ${value}`,()=>{
  assert.equal(portal.api.parseResponseValue(value),undefined);
  const table=[[portal.api.ROLE_QUESTION,...portal.api.SURVEY_ITEMS.map(x=>`${x.code}. ${x.text}`)],['Так',...portal.api.SURVEY_ITEMS.map(x=>x.code==='E01'?value:'5')]];
  const v=portal.api.validateTableRows(table,'legacy.csv');
  assert.ok(v.errors.some(x=>x.includes(value)&&x.includes('шкалі Барометра v1.0')&&x.includes('не перекодовано')));
});
test('F06 blank stays absent, not neutral or NA',()=>{
  assert.equal(portal.api.parseResponseValue(''),null);
  const table=[[portal.api.ROLE_QUESTION,...portal.api.SURVEY_ITEMS.map(x=>`${x.code}. ${x.text}`)],['Ні',...portal.api.SURVEY_ITEMS.map(x=>x.source==='L'?'':x.code==='E01'?'':'5')]];
  const v=portal.api.validateTableRows(table,'blank.csv');assert.ok(v.errors.some(x=>x.includes('E01')&&x.includes('відсутнє')));assert.ok(!v.errors.some(x=>/L\d\d/.test(x)));
});
test('old backup keeps cached weather until source file is reimported',()=>{
  const {environment}=setRuntimeScenario();
  const rows=moduleRows('L',10,1,(r,i)=>r<9&&i===r%3?1:5);
  const result=portal.api.aggregateSource(rows,'L');result.modules[1].status='Хмарно';
  environment.survey.results.l=result;
  const restored=JSON.parse(JSON.stringify(portal.api.getState().r));
  assert.equal(portal.api.validateBackupResearch(restored),true);
  portal.api.normalizeResearch(restored);
  assert.equal(restored.periods[0].envs[0].survey.results.l.modules[1].status,'Хмарно');
  restored.periods[0].envs[0].survey.results.l=portal.api.aggregateSource(rows,'L');
  assert.equal(restored.periods[0].envs[0].survey.results.l.modules[1].status,'Буря');
});

// Continuation QA: exact literals, L partial coverage, and real restore handler.
for(const [f,u,expected] of [[85,15,'Хмарно'],[70,30,'Буря'],[75,10,'Ясно'],[55,10,'Хмарно']])test(`F01 exact literal weather ${f}/${u}`,()=>{
  assert.equal(portal.api.weatherStatus(f,u),expected);
});
test('F01 exact literal 55 is not a problem without 30 unfavorable',()=>{
  assert.equal(portal.api.isProblemSurveyItem({adequate:true,favorable:55,unfavorable:29}),false);
  assert.equal(portal.api.isProblemSurveyItem({adequate:true,favorable:55,unfavorable:30}),true);
});
for(const value of [5,1])test(`F02 L partial NA retains measured L17=${value} and missing L18`,()=>{
  setRuntimeScenario({lOverrides:{L17:value,L18:'NA'}});
  const m=portal.api.barometerSemanticInterpretation().modules[6];
  const a=m.aspects.find(x=>x.id==='M6-C3');assert.ok(a);
  assert.match(a.alignment,/За відповідями керівників недостатньо застосовних даних/);
  assert.match(a.alignment,value===5?/Відповіді керівників не вказують/:/Відповіді керівників вказують/);
  if(value===5)assert.match(m.lead,/висновок не поширюється/);
});
test('existing study load and JSON restore preserve cached status but use current interpretation',async()=>{
  const {environment}=setRuntimeScenario({eOverrides:{E13:'NA'}});
  const rows=moduleRows('L',10,1,(r,i)=>r<9&&i===r%3?1:5);
  environment.survey.results.l=portal.api.aggregateSource(rows,'L');
  environment.survey.results.l.modules[1].status='Хмарно';
  const original=JSON.parse(JSON.stringify(portal.api.getState().r));
  portal.storage.set(portal.api.STORE,JSON.stringify(original));
  const loaded=portal.api.load();
  assert.equal(loaded.periods[0].envs[0].survey.results.l.modules[1].status,'Хмарно');
  const query=portal.document.querySelector;
  portal.document.querySelector=selector=>selector==='#restore-file'?{files:[{text:async()=>JSON.stringify({format:'barometr-backup',data:original})}]}:query(selector);
  try{
    await portal.listeners.get('click')({target:{closest(){return {dataset:{a:'restore-backup'}}}}});
    const restored=portal.api.getState().r;
    const e=restored.periods[0].envs[0];
    assert.equal(e.survey.results.l.modules[1].status,'Хмарно');
    assert.equal(JSON.parse(portal.storage.get(portal.api.STORE)).periods[0].envs[0].survey.results.l.modules[1].status,'Хмарно');
    portal.api.setState({...portal.api.getState(),env:e.id,screen:'dash'});
    assert.equal(portal.api.actualResultModel()[0].l,'Хмарно');
    assert.match(portal.api.barometerSemanticInterpretation().modules[3].aspects.find(x=>x.id==='M3-C1').alignment,/недостатньо застосовних даних/);
    e.survey.results.l=portal.api.aggregateSource(rows,'L');
    assert.equal(portal.api.actualResultModel()[0].l,'Буря');
  }finally{portal.document.querySelector=query}
});


// Study progress reads existing state; navigation reuses production handlers.
function progressScenario({envCount=1,imported=0,done=false,modules=0,planCount=0}={}){
  const {environment}=setRuntimeScenario();
  const r=portal.api.getState().r,p=r.periods[0];
  p.envs=Array.from({length:envCount},(_,i)=>({...JSON.parse(JSON.stringify(environment)),id:`progress-${i}`,name:`Середовище ${i+1}`,survey:i<imported?JSON.parse(JSON.stringify(environment.survey)):{} }));
  p.checkup.done=done;
  if(!done){p.checkup.answers=Object.fromEntries(portal.api.P_LIST.filter(x=>x.module<=modules).map(x=>[x.code,'full']));p.checkup.results=null;}
  r.plan=Array.from({length:planCount},(_,i)=>({id:`plan-${i}`,periodId:p.id,envId:p.envs[0]?.id,module:'Модуль',action:'Дія',description:'Опис',status:'Не розпочато'}));
  portal.api.setState({...portal.api.getState(),r,screen:'home',env:null});
  return {r,p,html:portal.api.studyProgress()};
}
function progressStep(html,n){return html.split(`data-step="${n}"`)[1].split('<li class="study-step')[0];}
function progressButton(html,action,id){
  const tags=[...html.matchAll(/<button\b([^>]*)>/g)].map(x=>x[1]);
  const tag=tags.find(x=>x.includes(`data-a="${action}"`)&&(id===undefined||x.includes(`data-id="${id}"`)));
  assert.ok(tag,`visible ${action} ${id||''}`);
  return {dataset:Object.fromEntries([...tag.matchAll(/data-([a-z]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]))};
}
async function clickProgress(html,action,id){const button=progressButton(html,action,id);await portal.listeners.get('click')({target:{closest(){return button}}});}

test('study progress replaces three questions and has five steps without persistent writes',()=>{
  const {r}=progressScenario({envCount:0});const before=JSON.stringify(r),saved=JSON.stringify([...portal.storage]);
  portal.api.render();
  assert.equal((portal.app.innerHTML.match(/class="study-step(?: is-done)?"/g)||[]).length,5);
  assert.doesNotMatch(portal.app.innerHTML,/Що я досліджую\?|Які дані вже є\?|Що мені треба зробити далі\?/);
  assert.match(portal.app.innerHTML,/Ваше дослідження/);assert.match(portal.app.innerHTML,/Робочі середовища/);
  assert.equal(JSON.stringify(r),before);assert.equal(JSON.stringify([...portal.storage]),saved);
  const html=portal.api.studyProgress();assert.match(progressStep(html,1),/aria-current="step"/);
  assert.match(html,/додайте перше робоче середовище/);assert.doesNotMatch(progressStep(html,3),/is-done|✓ Завершено/);
  progressButton(html,'add-env');progressButton(html,'edit-research');progressButton(html,'plan');
});
for(const field of ['company','owner'])test(`study progress settings require ${field}`,()=>{
  const {r}=progressScenario();r[field]=' ';assert.doesNotMatch(progressStep(portal.api.studyProgress(),1),/✓ Завершено/);
});
test('study progress empty checkup and survey remain independently accessible',()=>{
  const {html}=progressScenario();assert.match(progressStep(html,1),/✓ Завершено/);
  assert.match(progressStep(html,2),/Не розпочато/);assert.match(progressStep(html,3),/>Доступно</);
  progressButton(html,'checkup');progressButton(html,'upload','progress-0');progressButton(html,'plan');
  assert.match(progressStep(html,4),/Ще недоступно/);assert.doesNotMatch(progressStep(html,4),/data-a="dash"/);
});
test('study progress partial checkup counts actual complete modules',()=>{
  const {p}=progressScenario();p.checkup.answers=Object.fromEntries([1,2,3].flatMap(m=>portal.api.P[m]).map(x=>[x.code,'full']));
  const html=portal.api.studyProgress();assert.match(progressStep(html,2),/У процесі, 3 із 7 модулів/);
  assert.match(html,/продовжте організаційний чекап. Завершено 3 із 7 модулів/);
});
test('study progress complete checkup makes P results available before import',()=>{
  const {html}=progressScenario({done:true});assert.match(progressStep(html,2),/✓ Завершено/);
  assert.match(progressStep(html,4),/aria-current="step"/);assert.match(html,/результати організаційного чекапу вже доступні/);
});
test('study progress survey import before P does not claim results ready',()=>{
  const {html}=progressScenario({imported:1});assert.match(progressStep(html,3),/✓ Завершено/);
  assert.match(progressStep(html,4),/Ще недоступно/);progressButton(html,'upload','progress-0');
});
for(const imported of [1,2,3])test(`study progress shows ${imported} of three independent imports`,()=>{
  const {html}=progressScenario({envCount:3,imported,done:true});
  assert.match(html,new RegExp(`Завантажено дані для ${imported} із 3`));
  assert.match(progressStep(html,3),imported===3?/✓ Завершено/:/У процесі/);
  assert.equal((progressStep(html,3).match(/data-a="upload"/g)||[]).length,3);
  assert.equal((progressStep(html,4).match(/data-a="dash"/g)||[]).length,3);
  assert.doesNotMatch(progressStep(html,4),/Завершено/);assert.doesNotMatch(progressStep(html,5),/Завершено/);
});
test('study progress import replacement uses correct environment and preserves other data',async()=>{
  const {html,p}=progressScenario({envCount:3,imported:2,done:true});
  const other=JSON.stringify(p.envs[0]);await clickProgress(html,'upload','progress-1');
  assert.equal(portal.api.getState().modal.e.id,'progress-1');
  assert.equal(portal.api.getState().modal.step,1);assert.equal(JSON.stringify(p.envs[0]),other);
});
test('study progress new environment reopens import stage',()=>{
  const {p}=progressScenario({imported:1,done:true});p.envs.push({id:'later',name:'Нове',survey:{}});
  const html=portal.api.studyProgress();assert.match(html,/Завантажено дані для 1 із 2/);
  assert.match(progressStep(html,3),/У процесі/);progressButton(html,'upload','later');progressButton(html,'dash','later');
});
test('study progress obeys production canDashboard even for insufficient sample',()=>{
  const {p}=progressScenario({envCount:2,imported:1,done:true});
  p.envs[0].survey.results.e=portal.api.aggregateSource(surveyRows('E',5),'E');
  assert.equal(portal.api.canDashboard(p.envs[0]),true);
  const html=portal.api.studyProgress();progressButton(html,'dash','progress-0');
  assert.equal((progressStep(html,4).match(/data-a="dash"/g)||[]).length,2);
  assert.doesNotMatch(progressStep(html,4),/Результати ще недоступні/);
});
test('study progress dashboard buttons select the requested environment',async()=>{
  const {html}=progressScenario({envCount:3,imported:3,done:true});
  for(const id of ['progress-2','progress-0','progress-1']){await clickProgress(html,'dash',id);assert.equal(portal.api.getState().env,id);assert.equal(portal.api.getState().screen,'dash');}
  assert.doesNotMatch(progressStep(portal.api.studyProgress(),4),/Завершено/);
});
for(const planCount of [0,1,4,11])test(`study progress plan ${planCount} has factual count without completion`,async()=>{
  const {html}=progressScenario({planCount});
  assert.match(progressStep(html,5),planCount?new RegExp(`У Плані: ${planCount}`):/>Доступно</);
  assert.doesNotMatch(progressStep(html,5),/Завершено/);await clickProgress(html,'plan');assert.equal(portal.api.getState().screen,'plan');
});
test('study progress follows period switching and persisted restore',async()=>{
  const {r,p}=progressScenario({imported:1,done:true,planCount:4});
  const next={id:'next-period',label:'Новий період',start:'2026-02-01',end:'2026-02-28',envs:[],checkup:{answers:{},notes:{},done:false,schemaVersion:p.checkup.schemaVersion}};
  r.periods.push(next);r.current=next.id;let html=portal.api.studyProgress();
  assert.match(html,/Завантажено дані для 0 із 0/);assert.doesNotMatch(progressStep(html,5),/У Плані:/);
  const button={dataset:{a:'switch-period',id:p.id}};await portal.listeners.get('click')({target:{closest(){return button}}});
  portal.api.save();const loaded=portal.api.load();portal.api.setState({...portal.api.getState(),r:loaded});
  html=portal.api.studyProgress();assert.match(html,/Завантажено дані для 1 із 1/);assert.match(html,/У Плані: 4 дії/);
});
test('study progress safely renders imported environment names',()=>{
  const {p}=progressScenario({imported:1,done:true});p.envs[0].name='<img src=x onerror=alert(1)>';
  const html=portal.api.studyProgress();assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
});


// Regression cases limited to M02 JSON restore and M03 CSV preamble.
test('M02 validates nested E/L and organizational checkup results',()=>{
  setRuntimeScenario();
  const original=JSON.parse(JSON.stringify(portal.api.getState().r));
  assert.equal(portal.api.validateBackupResearch(original),true);
  const modifications=[
    r=>{r.periods[0].envs[0].survey.results.e.modules=null},
    r=>{r.periods[0].envs[0].survey.results.l.modules={}},
    r=>{r.periods[0].envs[0].survey.results.e.modules[1].favorable=160},
    r=>{r.periods[0].envs[0].survey.results.e.modules[1].status='UNKNOWN'},
    r=>{r.periods[0].envs[0].survey.results.l.totalResponses=-10},
    r=>{r.periods[0].envs[0].survey.results.e.items.E01.naRate=130},
    r=>{r.periods[0].checkup.results.modules=null}
  ];
  for(const modification of modifications){
    const r=JSON.parse(JSON.stringify(original));modification(r);
    assert.throws(()=>portal.api.validateBackupResearch(r),/Некоректні/);
  }
});
test('M02 restore rejects malformed aggregates without changing existing research',async()=>{
  setRuntimeScenario();
  const initial=JSON.parse(JSON.stringify(portal.api.getState().r));
  const corrupted=JSON.parse(JSON.stringify(initial));corrupted.periods[0].envs[0].survey.results.e.modules=null;
  portal.storage.set(portal.api.STORE,JSON.stringify(initial));
  const query=portal.document.querySelector;
  portal.document.querySelector=selector=>selector==='#restore-file'?{files:[{text:async()=>JSON.stringify({format:'barometr-backup',data:corrupted})}]}:query(selector);
  try{
    await portal.listeners.get('click')({target:{closest(){return {dataset:{a:'restore-backup'}}}}});
    assert.equal(portal.storage.get(portal.api.STORE),JSON.stringify(initial));
    assert.equal(portal.api.getState().r.periods[0].envs[0].survey.results.e.modules[1].status,initial.periods[0].envs[0].survey.results.e.modules[1].status);
  }finally{portal.document.querySelector=query}
});
for(const delim of [',',';','\t'])for(const prefix of [[],['Службова інформація'],['Звіт; метадані; період','Експорт, дата, джерело']]){
  test('M03 CSV prefix '+prefix.length+' and delimiter '+JSON.stringify(delim),()=>{
    const cell=x=>{const t=String(x??'');return t.includes(delim)||t.includes('"')||t.includes('\n')?'"'+t.replace(/"/g,'""')+'"':t};
    const headers=[portal.api.ROLE_QUESTION,...portal.api.SURVEY_ITEMS.map(x=>x.code+'. '+x.text)];
    const data=Array.from({length:24},(_,i)=>[i<12?'Так':'Ні',...portal.api.SURVEY_ITEMS.map(x=>x.source==='E'||i<12?'5':'')]);
    const source=[...prefix,headers,...data].map(r=>Array.isArray(r)?r.map(cell).join(delim):r).join('\r\n');
    const result=portal.api.validateTableRows(portal.api.parseCSV(source),'M03-test.csv');
    assert.equal(result.errors.length,0);
    assert.equal(result.total,24);
    assert.equal(result.managers,12);
    assert.equal(result.found.length,56);
  });
}


test('M02 allows legacy checkup results to be migrated instead of rejecting the old schema',()=>{
  setRuntimeScenario();
  const r=JSON.parse(JSON.stringify(portal.api.getState().r));
  r.periods[0].checkup.schemaVersion='legacy-checkup';
  r.periods[0].checkup.results={modules:null};
  assert.equal(portal.api.validateBackupResearch(r),true);
});

test('M02 backup rejects invalid current-schema P values and unknown P codes',()=>{
  setRuntimeScenario();
  const original=JSON.parse(JSON.stringify(portal.api.getState().r));
  for(const [code,value] of [['P01','INVALID'],['P01',42],['P01','yes'],['P99','full']]){
    const invalid=JSON.parse(JSON.stringify(original));
    invalid.periods[0].checkup.answers[code]=value;
    assert.throws(()=>portal.api.validateBackupResearch(invalid),/Некоректні відповіді організаційного чекапу/);
  }
  for(const malformed of [[], 'full']){
    const invalid=JSON.parse(JSON.stringify(original));
    invalid.periods[0].checkup.answers=malformed;
    assert.throws(()=>portal.api.validateBackupResearch(invalid),/Некоректні відповіді організаційного чекапу/);
  }
});
test('M02 backup recognizes every supported current-schema P answer, including partial drafts',()=>{
  setRuntimeScenario();
  const original=JSON.parse(JSON.stringify(portal.api.getState().r));
  for(const choice of ['full','partial','no','insufficient']){
    const valid=JSON.parse(JSON.stringify(original));
    valid.periods[0].checkup.answers.P01=choice;
    assert.equal(portal.api.validateBackupResearch(valid),true);
  }
  const draft=JSON.parse(JSON.stringify(original));
  draft.periods[0].checkup.done=false;
  draft.periods[0].checkup.answers={P01:null,P02:''};
  assert.equal(portal.api.validateBackupResearch(draft),true);
});
test('M02 backup rejects invalid calendar dates in periods and current checkup',()=>{
  setRuntimeScenario();
  const original=JSON.parse(JSON.stringify(portal.api.getState().r));
  for(const date of ['2026-02-30','2025-02-29','2026-13-01','2026-10-32','2026-1-01']){
    for(const field of ['start','end']){
      const invalid=JSON.parse(JSON.stringify(original));
      invalid.periods[0][field]=date;
      assert.throws(()=>portal.api.validateBackupResearch(invalid),/Некоректна календарна дата/);
    }
    const invalid=JSON.parse(JSON.stringify(original));
    invalid.periods[0].checkup.asOfDate=date;
    assert.throws(()=>portal.api.validateBackupResearch(invalid),/Некоректна календарна дата/);
  }
  const leap=JSON.parse(JSON.stringify(original));
  leap.periods[0].start='2024-02-29';
  leap.periods[0].end='2024-03-01';
  assert.equal(portal.api.validateBackupResearch(leap),true);
});
test('M02 restore invalid P answer or date does not change existing research and storage',async()=>{
  setRuntimeScenario();
  const before=JSON.parse(JSON.stringify(portal.api.getState().r));
  const beforeText=JSON.stringify(before),oldQuery=portal.document.querySelector;
  portal.storage.set(portal.api.STORE,beforeText);
  try{
    for(const change of [r=>{r.periods[0].checkup.answers.P01='INVALID'},r=>{r.periods[0].start='2026-02-30'}]){
      const corrupted=JSON.parse(beforeText);change(corrupted);
      portal.document.querySelector=selector=>selector==='#restore-file'?{files:[{text:async()=>JSON.stringify({format:'barometr-backup',data:corrupted})}]}:oldQuery(selector);
      await portal.listeners.get('click')({target:{closest(){return {dataset:{a:'restore-backup'}}}}});
      assert.equal(portal.storage.get(portal.api.STORE),beforeText);
      assert.deepEqual(JSON.parse(JSON.stringify(portal.api.getState().r)),before);
    }
  }finally{portal.document.querySelector=oldQuery}
});
test('M02 keeps legacy schema backup compatible with checkup migration',()=>{
  setRuntimeScenario();
  const valid=JSON.parse(JSON.stringify(portal.api.getState().r));
  valid.periods[0].checkup.schemaVersion='legacy-checkup';
  valid.periods[0].checkup.answers.P01='historical-value';
  assert.equal(portal.api.validateBackupResearch(valid),true);
});

  
// Real Microsoft Forms E20 export truncates the 221-character heading to
// the first 196 characters and three dots. Use synthetic answers only.
function checkTruncatedE20Export(e20Header){
  const items=portal.api.SURVEY_ITEMS;
  const headers=['ID',...items.filter(x=>x.source==='E').map(x=>x.code==='E20'?e20Header:x.text),
    portal.api.ROLE_QUESTION,...items.filter(x=>x.source==='L').map(x=>x.text)];
  const rows=Array.from({length:34},(_,i)=>[String(i+1),...Array(35).fill('4'),
    i<8?'Так':'Ні',...Array(21).fill(i<8?'5':'')]);
  return portal.api.validateTableRows([headers,...rows],'microsoft-forms-export.xlsx');
}
test('F07 shortened Microsoft Forms E20 is uniquely recognized with an audit warning',()=>{
  const e20=portal.api.SURVEY_ITEMS.find(x=>x.code==='E20').text;
  const exported=e20.slice(0,196)+'...';
  assert.equal(exported.length,199);
  const parsed=checkTruncatedE20Export(exported);
  assert.equal(parsed.errors.length,0);
  assert.equal(parsed.total,34);
  assert.equal(parsed.managers,8);
  assert.equal(parsed.found.length,56);
  assert.equal(parsed.warnings.filter(x=>x.includes('E20')).length,1);
});
test('F07 a unicode ellipsis and unchanged full E20 still import correctly',()=>{
  const e20=portal.api.SURVEY_ITEMS.find(x=>x.code==='E20').text;
  for(const heading of [e20,e20.slice(0,196)+'…']){
    const parsed=checkTruncatedE20Export(heading);
    assert.equal(parsed.errors.length,0);
    assert.equal(parsed.found.length,56);
    assert.equal(parsed.warnings.some(x=>x.includes('E20')),heading.endsWith('…'));
  }
});
test('F07 rejects unmarked, short, changed and coded truncated E20 headings',()=>{
  const e20=portal.api.SURVEY_ITEMS.find(x=>x.code==='E20').text;
  for(const [label,heading,expectedError] of [
    ['unmarked',e20.slice(0,196),'Відсутнє твердження E20'],
    ['too short',e20.slice(0,120)+'...','Відсутнє твердження E20'],
    ['changed prefix',e20.slice(0,195)+'х...','Відсутнє твердження E20'],
    ['coded truncation','E20. '+e20.slice(0,196)+'...','Змінено текст твердження E20'],
  ]){
    const parsed=checkTruncatedE20Export(heading);
    assert.ok(parsed.errors.some(error=>error.startsWith(expectedError)),label+' unexpectedly accepted: '+parsed.errors.join('; '));
  }
});


// Checkup-only results and read-only practice verification, 2026-10-20.
function checkupOnlyScenario({eCount=0,lCount=0,done=true,overrides={}}={}){
  const x=setRuntimeScenario({eCount,lCount,pOverrides:overrides});
  if(!eCount&&!lCount)delete x.environment.survey;
  const state=portal.api.getState();state.r.periods[0].checkup.done=done;
  return {...x,state,cp:state.r.periods[0].checkup};
}
for(const [eCount,lCount] of [[0,0],[9,3],[20,0],[0,10],[20,10]])test(`checkup-only source availability E=${eCount} L=${lCount}`,()=>{
  const {environment,state}=checkupOnlyScenario({eCount,lCount,overrides:{P31:'partial'}});
  assert.equal(portal.api.canDashboard(environment),true);
  const rows=portal.api.actualResultModel();assert.equal(rows.length,7);
  for(const row of rows){assert.equal(row.e,eCount===0?'Немає даних':eCount<20?'Недостатня вибірка':'Ясно');assert.equal(row.l,lCount===0?'Немає даних':lCount<10?'Недостатня вибірка':'Ясно');}
  assert.equal(rows[5].p,'Хмарно');portal.api.render();assert.match(portal.app.innerHTML,/Карта організаційної погоди/);
  const analysis=portal.api.barometerSemanticInterpretation();assert.ok(analysis.actions.some(x=>x.final_action_id==='M6-A1'));
  if(eCount<20&&lCount<10)for(const module of Object.values(analysis.modules)){assert.match(module.lead,/За самооцінкою компанії/);assert.doesNotMatch(module.lead,/не суперечать одне одному|працівники повідомляють|керівники вказують/i);}
  const report=portal.api.buildReportHtml(environment);assert.doesNotMatch(report,/checkup-verification-appendix|P\d{2}-C[1-4]/);assert.equal((report.match(/class="module-head"/g)||[]).length,7);
  assert.equal(state.r.plan.length,0);
});
test('unfinished P with no survey has no results or criteria',()=>{
  const {environment}=checkupOnlyScenario({done:false});assert.equal(portal.api.canDashboard(environment),false);assert.equal(portal.api.actualResultModel().length,0);assert.equal(portal.api.barometerPVerificationMarkup(1),'');assert.equal(portal.api.buildReportHtml(environment),'');
});
test('company-only context is derived and not persisted as environment',()=>{
  const {state}=checkupOnlyScenario();state.r.periods[0].envs=[];state.env=null;
  const before=JSON.stringify(state.r),company=portal.api.barometerCompanyContext();assert.equal(company.id,null);assert.equal(portal.api.canDashboard(company),true);
  portal.api.render();assert.match(portal.app.innerHTML,/Організаційний чекап компанії/);assert.match(portal.api.buildReportHtml(company),/Карта організаційної погоди/);assert.equal(JSON.stringify(state.r),before);
});
for(const practice of portal.api.P_LIST)for(const answer of ['full','partial','no','insufficient'])test(`verification ${practice.code} / ${answer}: exact practice, valid state, no scoring or writes`,()=>{
  const {cp,state}=checkupOnlyScenario({overrides:{[practice.code]:answer}}),before=JSON.stringify(state.r),storage=JSON.stringify([...portal.storage]);
  const score=JSON.stringify(portal.api.calculatePResults(cp)),view=portal.api.barometerPracticeVerification(practice.code);
  assert.equal(view.code,practice.code);assert.equal(view.answer,answer);assert.equal(view.label,portal.api.BAROMETER_P_ANSWER_LABELS[answer]);assert.match(view.conclusion,new RegExp(view.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.ok(view.checks.length>=1);assert.ok(view.steps.length>=1);assert.equal(view.sources.length,2);
  if(answer==='full'){assert.equal(view.checks.length,4);assert.match(view.heading,/Критерії повної реалізації/);assert.match(view.steps.join(' '),/Якщо умова й результат/);assert.doesNotMatch(view.conclusion,/ефективно працює/);}
  if(answer==='partial'){assert.ok(view.results.length===4);assert.match(view.conclusion,/частково або нерівномірно/);}
  if(answer==='no'){assert.equal(view.checks.length,4);assert.match(view.conclusion,/не реалізована або фактично не працює/);}
  if(answer==='insufficient'){assert.match(view.conclusion,/не може бути достовірно підтверджений/);assert.equal(view.results.length,4);}
  const markup=portal.api.barometerSemanticModuleMarkup(portal.api.actualResultModel().find(r=>r.m===practice.module));
  assert.equal(portal.api.barometerPVerificationMarkup(practice.module),'');
  if(answer==='full')assert.doesNotMatch(markup,new RegExp('data-practice-code="'+practice.code+'"'));
  else assert.match(markup,new RegExp('data-practice-code="'+practice.code+'"'));
  assert.doesNotMatch(markup,/P\d{2}-C[1-4]/);
  assert.equal(JSON.stringify(portal.api.calculatePResults(cp)),score);assert.equal(JSON.stringify(state.r),before);assert.equal(JSON.stringify([...portal.storage]),storage);
});
test('42 practice criteria have distinct factual checks, gaps, steps, outcomes and sources',()=>{
  for(const key of ['title','criteria','sources']){
    const values=Object.values(portal.api.BAROMETER_P_VERIFICATION).map(x=>JSON.stringify(x[key]));assert.equal(new Set(values).size,42,key);
  }
});
test('all full P gives seven favorable statuses and no automatic corrective actions',()=>{
  checkupOnlyScenario();assert.ok(portal.api.actualResultModel().every(x=>x.p==='Ясно'));assert.equal(portal.api.barometerSemanticInterpretation().actions.length,0);
  assert.ok(portal.api.barometerSemanticAction('VERIFY:P01',1));assert.equal(portal.api.barometerSemanticInterpretation().actions.length,0);
});
test('verification reflects changed response immediately without changing saved answers',()=>{
  const {cp}=checkupOnlyScenario();assert.equal(portal.api.barometerPracticeVerification('P01').answer,'full');
  cp.answers.P01='partial';const view=portal.api.barometerPracticeVerification('P01');assert.equal(view.answer,'partial');assert.match(view.heading,/покращити/);assert.equal(cp.answers.P01,'partial');assert.equal(portal.api.barometerSemanticAction('VERIFY:P01',1),null);
});
test('critical P storm, two missing practices, partial and fog keep original rules',()=>{
  for(const [overrides,status] of [[{P04:'no'},'Буря'],[{P01:'no',P02:'no'},'Буря'],[{P01:'partial'},'Хмарно'],[{P01:'insufficient',P02:'insufficient',P03:'insufficient'},'Туман']]){
    checkupOnlyScenario({overrides});assert.equal(portal.api.actualResultModel()[0].p,status);
  }
});
test('P40 verification is conditional and does not create a local protection action without confirmed applicability',()=>{
  const {cp}=checkupOnlyScenario({overrides:{P40:'no'}});cp.p40Risk='confirmed';cp.p40ApplicabilityByEnvironment={};
  let a=portal.api.barometerSemanticInterpretation();assert.ok(!a.actions.some(x=>x.basis_codes.includes('P40')));
  assert.match(portal.api.barometerPracticeVerification('P40').steps.join(' '),/Лише за підтвердженого ризику/);
  cp.p40ApplicabilityByEnvironment['env-runtime']='confirmed';a=portal.api.barometerSemanticInterpretation();const action=a.actions.find(x=>x.basis_codes.includes('P40'));assert.ok(action);assert.equal(portal.api.barometerActionScope(action),'env-runtime');
});
test('P-only actions and voluntary strong-practice checks deduplicate at company scope',async()=>{
  const {state}=checkupOnlyScenario({overrides:{P31:'partial'}});const first=state.env;
  const click=async(target,m)=>{const b={dataset:{a:'add-routed-action',target,m:String(m)},replaceWith(){}};await portal.listeners.get('click')({target:{closest:()=>b}})};
  await click('M6-A1',6);await click('VERIFY:P01',1);assert.equal(state.r.plan.length,2);assert.ok(state.r.plan.every(x=>x.envId===null));
  state.r.periods[0].envs.push({id:'other',name:'Other',survey:{}});state.env='other';await click('M6-A1',6);await click('VERIFY:P01',1);assert.equal(state.r.plan.length,2);
  assert.equal(first,'env-runtime');
});
test('questionnaire has no verification controls and retains exactly 42 original practices',()=>{
  const {state}=checkupOnlyScenario();state.screen='checkup';state.module=1;
  const html=portal.api.checkup();assert.equal((html.match(/class="practice"/g)||[]).length,6);assert.doesNotMatch(html,/data-practice-code|VERIFY:|Критерії перевірки організаційних/);
});
test('public portal outside embedded local copy and XLSX stays byte-identical to reviewed baseline',()=>{
  const strip=html=>html.replace(/(const embeddedLocalPortal\s*=\s*["'])[^"']*(["'])/,'$1LOCAL$2');
  // Hash pins all public content, calculator, scripts, styles, embedded XLSX and images.
  assert.equal(createHash('sha256').update(strip(publicHtml)).digest('hex'),'885e92a3a4ee7f27341fe15d4982887d811229081161b8977e1075f414cd6663');
});

const protectedBaselineHashes={"aggregateSource": "695e76cb37ca7e94f1afa741b74e82ca8ed54e17a2f472ff7faa5f2f57b4765c", "calculatePResults": "549aa9222e9af58a164eec902e0165aad7aadc2cce2c69d7abe44850eb1ec61b", "parseCSV": "acf9f984a969598d100007c8e6a8dcfde9f20635f54d34bbb95913f84f00b82a", "validateTableRows": "fe3fa9cdb97a9c2e08027dc18204ff1cffb1c95c423754fb30d0ecd17304f02d", "validateBackupResearch": "77e8629332abdfc94bcacf9eae1e1319e251ad1b773814a3f4870a3db8238e2b", "weatherStatus": "f80774c17408ec7b2d64b8ec4f41bbb418f9bae3f0023d55b065475f04e6fccf", "planXlsxBytes": "9b560caddbac4e3d9456c48601d614f1ace028e33839b8905db68d432e9abf91"};
for(const [name,expected] of Object.entries(protectedBaselineHashes))test(`protected baseline function remains byte-identical: ${name}`,()=>{assert.equal(createHash('sha256').update(portal.api[name].toString()).digest('hex'),expected)});
test('local portal retains exact baseline CSS and original questionnaire data',()=>{
 assert.equal(createHash('sha256').update(localHtml.match(/<style>([\s\S]*?)<\/style>/)[1]).digest('hex'),'895a5bc8cc4f9647bc9b2813b1263fe9526b78d354706160b2a11b8a980d0ad6');
 assert.equal(createHash('sha256').update(JSON.stringify(portal.api.P_LIST)).digest('hex'),'2fa16e0311e95eeae173f47db68d4d0ec71d6b3727196cd83f6c79aa359c2050');
 assert.equal(createHash('sha256').update(JSON.stringify(portal.api.SURVEY_ITEMS)).digest('hex'),'08343b921cb972ccbe11dbe73351ea31b0558645afaed86286bd2be415f62445');
});
test('existing environment-scoped P action stays usable without duplication or migration',async()=>{
  const {state}=checkupOnlyScenario({overrides:{P31:'partial'}});
  state.r.plan.push({id:'existing-action',periodId:'period-1',envId:'env-runtime',sourceTarget:'M6-A1',module:portal.api.M[5],action:'Existing user-edited title',description:'Preserved user notes',priority:'Високий',status:'У роботі',indicator:'User-defined criterion'});
  const before=JSON.stringify(state.r.plan),button={dataset:{a:'add-routed-action',m:'6',target:'M6-A1'},replaceWith(){}};
  await portal.listeners.get('click')({target:{closest:()=>button}});
  assert.equal(state.r.plan.length,1);assert.equal(JSON.stringify(state.r.plan),before);assert.equal(button.disabled,true);
});

// Stable criteria and individual Plan actions refine the reviewed implementation.
const answersForCriteria=['full','partial','no','insufficient'];
for(const practice of portal.api.P_LIST)for(const answer of answersForCriteria)test(`stable criterion set and one-click persistence: ${practice.code}/${answer}`,async()=>{
 const {cp,state}=checkupOnlyScenario({overrides:{[practice.code]:answer}});
 const expected=portal.api.barometerPracticeVerification(practice.code,'full').criteria.map(c=>[c.id,c.criterion]);
 const view=portal.api.barometerPracticeVerification(practice.code);
 assert.deepEqual(view.criteria.map(c=>[c.id,c.criterion]),expected);
 for(const criterion of view.criteria){
  assert.match(criterion.title,/^(Перевірити|Уточнити|Зібрати дані про) /);
  const b={dataset:{a:'add-routed-action',m:String(practice.module),target:criterion.target},replaceWith(){throw Error('Criterion button must remain visible')}};
  portal.api.normalizeResearch(state.r);const before=JSON.stringify(cp);await portal.listeners.get('click')({target:{closest:()=>b}});
  assert.equal(b.textContent,'Додано до Плану');assert.equal(b.disabled,true);
  const action=state.r.plan.at(-1);assert.equal(action.sourceTarget,criterion.target);assert.equal(action.envId,null);
  assert.equal(action.action,criterion.title);assert.equal(action.indicator,criterion.result);assert.match(action.description,new RegExp(criterion.id));assert.equal(action.owner,undefined);assert.equal(action.due,undefined);
  assert.equal(JSON.stringify(cp),before);
  await portal.listeners.get('click')({target:{closest:()=>b}});
  assert.equal(state.r.plan.filter(x=>x.sourceTarget===criterion.target).length,1);
  assert.ok(JSON.parse(portal.storage.get(portal.api.STORE)).plan.some(x=>x.sourceTarget===criterion.target));
 }
 assert.equal(state.r.plan.length,4);
});
for(const [eCount,lCount] of [[0,0],[9,3],[20,0],[0,10],[20,10]])test(`criterion availability and P-only presentation: ${eCount}/${lCount}`,()=>{
 checkupOnlyScenario({eCount,lCount,overrides:{P01:'partial'}});
 for(const practice of portal.api.P_LIST)assert.equal(portal.api.barometerPracticeVerification(practice.code).criteria.length,4);
 const markup=portal.api.barometerSemanticModuleMarkup(portal.api.actualResultModel()[0]);
 assert.match(markup,/Рекомендовані організаційні дії/);
 assert.doesNotMatch(markup,/Організаційні практики: критерії повної реалізації/);
 assert.doesNotMatch(markup,/Критерії не змінюють оцінок автоматично|Відповідь власника дослідження, фактичне застосування/);
 if(eCount<20&&lCount<10)assert.doesNotMatch(markup,/Аспекти, що потребують уваги|Як узгоджуються джерела/);
 const report=portal.api.buildReportHtml(portal.api.getState().r.periods[0].envs[0]);
 assert.match(report,/Перевірка результату/);assert.doesNotMatch(report,/Підтвердження застосування:/);
 if(eCount<20&&lCount<10)assert.match(report,/Рівень оцінювання: компанія/);
 else assert.match(report,/Рівень опитування: робоче середовище/);
});
test('criterion scope, exact dedup, edits, response changes and JSON compatibility',async()=>{
 const {state,cp}=checkupOnlyScenario();state.r.periods[0].envs.push({id:'branch-2',name:'Філія 2'});
 const click=async(id)=>portal.listeners.get('click')({target:{closest:()=>({dataset:{a:'add-routed-action',m:'1',target:id},replaceWith(){}})}});
 await click('CRITERION:P01-C1');const first=state.r.plan[0];
 const change=(id,field,value)=>portal.api.updatePlanField({target:{dataset:{f:field},value,closest:()=>({dataset:{p:id}})}});
 change(first.id,'action','Змінений власником захід');change(first.id,'description','Власні кроки');change(first.id,'indicator','Власний результат');change(first.id,'owner','Власниця');change(first.id,'due','2026-12-01');change(first.id,'priority','Високий');change(first.id,'status','У роботі');change(first.id,'envId','branch-2');
 assert.equal(first.envId,'branch-2');await click('CRITERION:P01-C1');assert.equal(state.r.plan.length,2);assert.equal(state.r.plan[1].envId,null);
 change(state.r.plan[1].id,'envId','branch-2');assert.equal(state.r.plan[1].envId,null,'scope collision rejected without losing action');
 const before=JSON.stringify(first);for(const answer of answersForCriteria){cp.answers.P01=answer;portal.api.render();await click('CRITERION:P01-C1');assert.equal(state.r.plan.length,2);assert.equal(JSON.stringify(first),before)}
 assert.equal(portal.api.validateBackupResearch(JSON.parse(JSON.stringify(state.r))),true);
 assert.ok(portal.api.plan().includes('data-f="envId"'));assert.ok(portal.api.planRows().some(row=>row.includes('Компанія загалом')));
 state.r.current='period-2';state.r.periods.push({...JSON.parse(JSON.stringify(state.r.periods[0])),id:'period-2'});await click('CRITERION:P01-C1');assert.equal(state.r.plan.length,3,'other period can have same criterion');
});
test('genuinely equivalent semantic record deduplicates; broad route and other criterion remain distinct',async()=>{
 const {state}=checkupOnlyScenario();const target='CRITERION:P01-C2',candidate=portal.api.barometerSemanticAction(target);
 state.r.plan.push({id:'semantic-equivalent',periodId:state.r.current,envId:null,sourceTarget:'M1-A1',action:candidate.title,description:candidate.action,indicator:candidate.check});
 assert.equal(portal.api.planAction(target).id,'semantic-equivalent');assert.equal(portal.api.planAction('CRITERION:P01-C1'),null);
 state.r.plan[0].description='Інші кроки за тим самим заголовком';assert.equal(portal.api.planAction(target),null);state.r.plan[0].description=candidate.action;
 state.r.plan[0].action='Ширша інша дія';assert.equal(portal.api.planAction(target),null);
 state.r.plan[0].action=candidate.title;state.r.plan[0].envId='env-runtime';assert.equal(portal.api.planAction(target),null);
});
test('P01 and P03 editorial fixes and 2–4 sentence P-only summaries',()=>{
 checkupOnlyScenario({overrides:{P01:'partial',P02:'no',P03:'insufficient'}});
 const p1=portal.api.barometerPracticeVerification('P01').checks.join(' '),p3=portal.api.barometerPracticeVerification('P03').checks.join(' ');
 assert.match(p1,/тимчасовим заміщенням/);assert.match(p1,/суміщенн/);assert.match(p3,/різних робочих змін/);assert.doesNotMatch(p3,/до всіх змін/);
 for(let m=1;m<=7;m++){const lead=portal.api.barometerPModuleLead(m);assert.ok((lead.match(/[.!?](?: |$)/g)||[]).length>=2);assert.ok((lead.match(/[.!?](?: |$)/g)||[]).length<=4);}
});

// 2026-10-20: updated presentation assertions above follow the authorised removal
// of criterion cards/appendix. Legacy 672 criterion handler calls remain tested.
for(const practice of portal.api.P_LIST)for(const answer of answersForCriteria)test(`organisational recommendation ${practice.code}/${answer}`,async()=>{
 const {state,cp}=checkupOnlyScenario({overrides:{[practice.code]:answer}});
 portal.api.normalizeResearch(state.r);const before=JSON.stringify(cp),action=portal.api.barometerPracticeAction(practice.code);
 if(answer==='full'){assert.equal(action,null);return;}
 assert.equal(action.code,practice.code);assert.ok(action.steps.length>=6);
 assert.equal(action.sources.join(''),'P');assert.equal(portal.api.barometerActionScope(action),null);
 assert.doesNotMatch(action.action+action.check,/P\d{2}-C[1-4]|Зіставте приклади застосування з очікуваним результатом/);
 const model=portal.api.BAROMETER_P_ACTION_LIBRARY[practice.code];
 assert.equal(Object.keys(model.coverage).length,4);
 for(const [id,step] of Object.entries(model.coverage)){assert.equal(model.steps[step-1].length>30,true,id);assert.ok(portal.api.BAROMETER_P_VERIFICATION[practice.code].criteria.some(c=>c.id===id));}
 if(answer==='no'){for(const step of model.steps)assert.ok(action.steps.includes(step));assert.match(action.action,/відсутній.*існує, але не працює/);}
 if(answer==='partial'){assert.match(action.action,/Усунути лише встановлені прогалини/);assert.ok(action.steps.filter(s=>s.startsWith('Перевірити, чи')).length===4);}
 if(answer==='insufficient'){assert.match(action.action,/брак підтверджень не доводить відсутності/i);for(const source of portal.api.BAROMETER_P_VERIFICATION[practice.code].sources)assert.ok(action.action.includes(source));}
 const click=async()=>portal.listeners.get('click')({target:{closest:()=>({dataset:{a:'add-routed-action',m:String(practice.module),target:action.id},replaceWith(){}})}});
 await click();await click();assert.equal(state.r.plan.length,1);const saved=state.r.plan[0];
 assert.equal(saved.description,action.action);assert.equal(saved.indicator,action.check);assert.equal(saved.priority,action.priority);assert.equal(saved.envId,null);
 assert.equal(JSON.stringify(cp),before);assert.equal(JSON.parse(portal.storage.get(portal.api.STORE)).plan.length,1);
 assert.equal(portal.api.validateBackupResearch(JSON.parse(JSON.stringify(state.r))),true);
});
test('P15 critical cause, positives, P31 provenance and all-full outputs',()=>{
 checkupOnlyScenario({overrides:{P15:'no',P31:'partial'}});
 const rows=portal.api.actualResultModel(),a=portal.api.barometerSemanticInterpretation();
 assert.equal(rows[2].p,'Буря');assert.match(portal.api.barometerModuleSummary(rows[2],a),/5 із 6.*Буря.*P15/);
 assert.equal(rows[1].p,'Ясно');assert.match(portal.api.barometerModuleSummary(rows[1],a),/P31.*модулі 6/);
 assert.equal(portal.api.barometerModuleActions(2).length,0);assert.equal(portal.api.barometerModuleActions(3)[0].priority,'Високий');
 checkupOnlyScenario();for(const row of portal.api.actualResultModel()){assert.equal(portal.api.barometerModuleActions(row.m).length,0);assert.doesNotMatch(portal.api.barometerSemanticModuleMarkup(row),/recommendation-empty|data-action-id=|підтверджені сильні/i);}
});
test('previous edited criterion and VERIFY records prevent new duplicate without rewriting',async()=>{
 const {state}=checkupOnlyScenario({overrides:{P03:'partial'}});
 for(const target of ['CRITERION:P03-C2','VERIFY:P03','PRACTICE:P03','M1-A2']){
  state.r.plan=[{id:'legacy',periodId:state.r.current,envId:'env-runtime',sourceTarget:target,action:'Авторська назва',description:'Авторські кроки',indicator:'Авторські критерії'}];
  if(target==='M1-A2')state.r.plan[0].envId=null;
  const before=JSON.stringify(state.r.plan);assert.equal(portal.api.planAction('PRACTICE:P03').id,'legacy');
  await portal.listeners.get('click')({target:{closest:()=>({dataset:{a:'add-routed-action',m:'1',target:'PRACTICE:P03'},replaceWith(){}})}});
  assert.equal(JSON.stringify(state.r.plan),before);
 }
});

test('C01 presentation preserves one complete action across P-only and E/L/P',async()=>{
 for(const [eCount,lCount] of [[0,0],[20,10]]){
  const {state}=checkupOnlyScenario({eCount,lCount,overrides:{P05:'partial',P29:'no'}});
  const a=portal.api.barometerSemanticInterpretation(),c=portal.api.barometerModuleActions(1,a).find(x=>x.id==='C01');assert.ok(c);
  assert.ok(c.steps.some(s=>s.startsWith('P05:')));assert.ok(c.steps.some(s=>s.startsWith('P29:')));
  assert.equal(portal.api.barometerModuleActions(5,a).filter(x=>x.code==='P29'||x.id==='C01').length,0);
  const expected=portal.api.barometerSemanticAction('C01',1);assert.equal(expected.action,c.action);
  await portal.listeners.get('click')({target:{closest:()=>({dataset:{a:'add-routed-action',m:'1',target:'C01'},replaceWith(){}})}});
  assert.equal(state.r.plan.length,1);assert.equal(state.r.plan[0].description,c.action);assert.equal(state.r.plan[0].envId,null);
 }
});
