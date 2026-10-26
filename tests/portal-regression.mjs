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
    addEventListener(type,handler){const previous=listeners.get(type);listeners.set(type,previous?(...args)=>{previous(...args);return handler(...args)}:handler)},
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
      setState(value){S=value},getState(){return S},render,studyProgress,
    };
  `;
  vm.runInContext(source,context,{filename:'local/index.html'});
  return {api:context.__portal,listeners,app,storage,document};
}

const portal=loadLocalPortal();

function renderPublicExample(e,l,p){
  const nodes=new Map(Object.entries({statusE:{value:e},statusL:{value:l},statusP:{value:p},exampleStatuses:{innerHTML:''},exampleDetail:{innerHTML:''},exampleRules:{innerHTML:''}}));
  const start=publicHtml.indexOf('const statusIcon = status =>'),end=publicHtml.indexOf("['statusE','statusL','statusP'].forEach",start);
  assert.ok(start>=0&&end>start);
  const bundle=executableScripts(publicHtml).find(s=>s.includes('window.BAROMETER_PUBLIC_EXAMPLE_CASES='));
  assert.ok(bundle);const context={window:{},document:{getElementById:id=>nodes.get(id)}};
  vm.runInNewContext(bundle,context);
  vm.runInNewContext(publicHtml.slice(start,end)+'\nupdateExample();',context);
  return {statuses:nodes.get('exampleStatuses').innerHTML,detail:nodes.get('exampleDetail').innerHTML,rules:nodes.get('exampleRules').innerHTML};
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
  assert.match(report,/узгоджуються на сприятливому рівні/);
  assert.match(report,/<th[^>]*>Організаційний чекап<\/th>/);
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
  assert.match(report,/Як узгоджуються джерела/);
  assert.match(report,/Рекомендовані організаційні дії/);
  assert.match(report,/Для оплати і преміювання визначити зрозумілі правила/);
  assert.match(report,/критерії оцінювання, оплати й заохочень/);
  assert.match(report,/Для оцінювання забезпечити однакове застосування визначених правил/);
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

  setRuntimeScenario();
  const map=portal.api.weatherMapHtml([{m:1,e:'Ясно',l:'Буря',p:'Ясно'}],{survey:{results:{
    e:{totalResponses:20,modules:{1:{favorable:85,neutral:2,unfavorable:13,masked:false,borderline:null}}},
    l:{totalResponses:11,detailAllowed:true,modules:{1:{favorable:60,neutral:10,unfavorable:30,masked:false,borderline:'Буря біля межі з Хмарно'}}}
  }}});
  assert.match(map,/Буря \(30% неспр\. відп\.\)/);
  assert.doesNotMatch(map,/біля межі|неокругленими значеннями/);
  assert.match(map,/«Буря»: щонайменше 30% несприятливих/);
  assert.doesNotMatch(map,/«Буря»: менше 55% сприятливих/);
  assert.match(map,/<th[^>]*>Організаційний чекап<\/th>/);
  assert.doesNotMatch(map,/<th>Організаційні практики<\/th>/);
  assert.match(map,/У дужках наведено частку відповідей, що пояснює статус/);
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
  assert.equal(action.id,'M4-A1');
  assert.equal(action.title,'Перевірити обґрунтованість оплати для порівнюваних ролей');
  assert.deepEqual(Array.from(action.basis_codes),['E16']);
  for(const term of ["оплати і преміювання","порівнюваними ролями"])assert.ok(action.action.includes(term));
  assert.match(action.check,/Повторне опитування/);;
});

test('E22 routes primarily to the new time-and-pace flexibility recommendation',()=>{
  setSurveyIssueScenario('E22');
  const links=Array.from(portal.api.FINE_ITEMS.E22.links,link=>({target:link.target,role:link.role}));
  assert.deepEqual(links,[
    {target:'THEME:Надати допустиму гнучкість у керуванні часом і темпом роботи',role:'primary'},
    {target:'P32',role:'conditional'},
  ]);
  const action=portal.api.selectedActions(5)[0];
  assert.equal(action.id,'M5-A1');
  assert.equal(action.title,'Забезпечити погоджену гнучкість робочого часу й темпу');
  assert.deepEqual(Array.from(action.basis_codes),['E22']);
  for(const term of ["робочим часом і темпом","вимог безпеки"])assert.ok(action.action.includes(term));
  assert.match(action.check,/Повторне опитування/);;
});

test('E25 uses the feedback recommendation, explains work problem, and keeps P18 non-primary',()=>{
  setSurveyIssueScenario('E25');
  const links=Array.from(portal.api.FINE_ITEMS.E25.links,link=>({target:link.target,role:link.role}));
  assert.deepEqual(links,[
    {target:'THEME:Забезпечити зворотний зв’язок після повідомлення про робочу проблему',role:'primary'},
    {target:'P18',role:'conditional'},
  ]);
  const action=portal.api.selectedActions(5)[0];
  assert.equal(action.id,'M5-A3');
  assert.equal(action.title,'Повідомляти про результат розгляду робочої проблеми');
  assert.deepEqual(Array.from(action.basis_codes),['E25']);
  for(const term of ["коли очікувати відповіді","новий строк відповіді"])assert.ok(action.action.includes(term));
  assert.match(action.check,/Повторне опитування/);
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
  assert.equal(analysis.input.branches.E01,'sample');
  assert.equal(analysis.input.branches.L01,'negative');
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
  assert.equal(analysis.input.branches.L01,'sample');
  assert.equal(analysis.input.branches.E01,'negative');
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
  assert.match(publicHtml,/на сприятливому рівні/);
  assert.doesNotMatch(publicHtml,/Організаційні практики оцінені слабше/);
  assert.equal((publicHtml.match(/<h3>Безпека даних<\/h3>/g)||[]).length,0);
});

function semanticFixture({e={},l={},p={},eEligible=true,lEligible=true,p40Applicable=false,p40Known=false}={}){
  // v45 consumes actual item metrics and practice answers, not v2 state labels alone.
  const metrics=(source,states,total)=>Object.fromEntries(portal.api.SURVEY_ITEMS.filter(x=>x.source===source).map(x=>{
    const state=states[x.code]||'N';return [x.code,{favorable:state==='S'?0:100,unfavorable:state==='S'?100:0,applicable:state==='T'?0:total,na:state==='T'?total:0}];
  }));
  const answers=Object.fromEntries(portal.api.P_LIST.map(x=>[x.code,({G:'no',T:'insufficient',N:'full'})[p[x.code]||'N']]));
  return {E:{eligible:eEligible,total:eEligible?20:19,states:e,metrics:metrics('E',e,20)},L:{eligible:lEligible,total:lEligible?10:9,states:l,metrics:metrics('L',l,10)},P:{states:p,answers,done:true,p40Applicable,p40Known:p40Known||p40Applicable}};
}
test('v45 defines seven modules with four sections and the approved positive conclusion',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture());assert.equal(a.version,'profile-v45-2026-10-26');assert.equal(Object.keys(a.modules).length,7);for(const m of Object.values(a.modules)){for(const key of ['alignment','attention','steps','checks'])assert.ok(Array.isArray(m.sections[key]));assert.match(m.lead,/узгоджуються на сприятливому рівні/);assert.equal(m.actions.length,0);}});
test('semantic v2 E-only problem is aspect-specific',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'}})),m=a.modules[1];assert.deepEqual(Array.from(m.problemCodes),['E01']);assert.match(m.lead,/Несприятливі відповіді працівників.*ясність обов’язків/);assert.ok(m.actions.some(x=>x.basis_codes.includes('E01')));assert.doesNotMatch(m.lead,/\bякщо\b/i);});
test('semantic v2 alignment names concrete evidence from each available source',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E09:'S'},l:{L06:'S'},p:{P31:'G'}}));assert.ok(a.modules[2].problemCodes.includes('E09'));assert.ok(a.modules[2].problemCodes.includes('L06'));assert.ok(a.modules[6].problemCodes.includes('P31'));assert.match(a.modules[2].lead,/навантаження|ресурс/);assert.match(a.modules[6].lead,/навантаження/);assert.doesNotMatch(a.modules[2].lead,/пов’язаний сигнал у цьому аспекті/i);});
test('semantic v2 visible interpretation avoids banned technical wording',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P08:'G',P16:'G',P33:'G',P34:'G'},l:{L17:'S'}}));const visible=Object.values(a.modules).map(m=>[m.lead,...m.sections.attention,...m.sections.steps.map(x=>x.text)].join(' ')).join(' ');assert.ok(visible.length>100);assert.doesNotMatch(visible,/блокер|ескалац|маршрутизац|управлінська спроможність/i);assert.match(visible,/передає питання за межами своїх повноважень/i);assert.match(visible,/психологічн|професійн.*допомог/i);});
test('semantic v2 L-only problem is retained',()=>{const m=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L01:'S'}})).modules[1];assert.deepEqual(Array.from(m.problemCodes),['L01']);assert.match(m.lead,/Несприятливі відповіді керівників команд.*межі управлінської ролі/);assert.ok(m.actions.some(x=>x.basis_codes.includes('L01')));});
test('semantic v2 P-only gap is preventive',()=>{const m=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P01:'G'}})).modules[1];assert.deepEqual(Array.from(m.problemCodes),['P01']);assert.match(m.lead,/За організаційним чекапом не реалізовано/);assert.doesNotMatch(m.lead,/Несприятливі відповіді/);assert.ok(m.actions.some(x=>x.basis_codes.includes('P01')));});
test('semantic v2 E problem plus favorable P describes discrepancy',()=>{const m=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'},p:{P01:'N',P06:'N'}})).modules[1];assert.match(m.lead,/Можливий розрив між оцінкою практики на рівні компанії та її застосуванням у конкретному середовищі/);assert.ok(m.actions.some(x=>x.basis_codes.includes('E01')));});
test('P gap A: problematic E remains actionable with favorable L and corporate P',()=>{setRuntimeScenario({eOverrides:{E01:1}});const row=portal.api.actualResultModel()[0],m=portal.api.barometerSemanticInterpretation().modules[1];assert.deepEqual([row.e,row.l,row.p],["Хмарно","Ясно","Ясно"]);assert.match(m.lead,/Можливий розрив/);for(const c of ["E01"]){assert.ok(m.problemCodes.includes(c));assert.ok(m.actions.some(x=>x.basis_codes.includes(c)));assert.ok(m.sections.steps.some(x=>x.codes.includes(c)));}assert.doesNotMatch(m.lead,/практика існує лише формально|доведено, що практика|спільну причину встановлено/);});
test('P gap B: problematic L is retained and manager access is checked despite favorable E and P',()=>{setRuntimeScenario({lOverrides:{L01:1}});const row=portal.api.actualResultModel()[0],m=portal.api.barometerSemanticInterpretation().modules[1];assert.deepEqual([row.e,row.l,row.p],["Ясно","Буря","Ясно"]);assert.match(m.lead,/Можливий розрив/);for(const c of ["L01"]){assert.ok(m.problemCodes.includes(c));assert.ok(m.actions.some(x=>x.basis_codes.includes(c)));assert.ok(m.sections.steps.some(x=>x.codes.includes(c)));}assert.doesNotMatch(m.lead,/практика існує лише формально|доведено, що практика|спільну причину встановлено/);});
test('P gap C: problematic E and L give a stronger local signal without claiming a proved cause',()=>{setRuntimeScenario({eOverrides:{E01:1},lOverrides:{L01:1}});const row=portal.api.actualResultModel()[0],m=portal.api.barometerSemanticInterpretation().modules[1];assert.deepEqual([row.e,row.l,row.p],["Хмарно","Буря","Ясно"]);assert.match(m.lead,/Можливий розрив/);for(const c of ["E01","L01"]){assert.ok(m.problemCodes.includes(c));assert.ok(m.actions.some(x=>x.basis_codes.includes(c)));assert.ok(m.sections.steps.some(x=>x.codes.includes(c)));}assert.doesNotMatch(m.lead,/практика існує лише формально|доведено, що практика|спільну причину встановлено/);});
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
  assert.equal(first.modules[1].actions.length,0);
  assert.match(other.modules[1].lead,/Можливий розрив/);
  for(const code of ['E01','L01'])assert.ok(other.modules[1].problemCodes.includes(code));
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
  assert.equal(semantic.problemCodes.length,0);
  assert.ok(semantic.sections.attention.length>0);
  assert.ok(semantic.sections.steps.length>0);
  assert.doesNotMatch(semantic.lead,/якість даних обмежує висновок/);
  const cloudyE=environment.survey.results.e,cloudyL=environment.survey.results.l;
  environment.survey.results.l=portal.api.aggregateSource(surveyRows('L',10),'L');
  assert.match(portal.api.barometerSemanticInterpretation().modules[1].lead,/працівників/i);
  environment.survey.results.e=portal.api.aggregateSource(surveyRows('E',20),'E');
  environment.survey.results.l=cloudyL;
  assert.match(portal.api.barometerSemanticInterpretation().modules[1].lead,/керівників/i);
  environment.survey.results.e=cloudyE;
});
test('P gap across different aspects: E and L together warrant a module check, not an assumed shared cause',()=>{setRuntimeScenario({eOverrides:{E01:1},lOverrides:{L02:1}});const row=portal.api.actualResultModel()[0],m=portal.api.barometerSemanticInterpretation().modules[1];assert.deepEqual([row.e,row.l,row.p],['Хмарно','Буря','Ясно']);assert.deepEqual(Array.from(m.problemCodes).sort(),['E01','L02']);for(const c of ['E01','L02'])assert.ok(m.sections.steps.some(x=>x.codes.includes(c)));assert.match(m.lead,/Можливий розрив/);assert.doesNotMatch(m.lead,/спільну причину встановлено/);});
test('semantic v2 fog does not close active issue',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'T'},l:{L01:'S'}})),m=a.modules[1];assert.equal(a.input.branches.E01,'applicability');assert.match(m.dataNotes.join(' '),/недостатньо застосовних даних/);assert.match(m.lead,/Несприятливі відповіді керівників/);assert.ok(m.actions.some(x=>x.basis_codes.includes('L01')));assert.ok(!m.problemCodes.includes('E01'));});
test('fog-only module retains four data-limitation sections without corrective plan actions',()=>{const pOverrides=Object.fromEntries(portal.api.P_LIST.filter(x=>x.module===1).map(x=>[x.code,'insufficient']));const {environment}=setRuntimeScenario({eAnswer:'NA',lAnswer:'NA',pOverrides});const m=portal.api.barometerSemanticInterpretation().modules[1],row=portal.api.actualResultModel()[0];assert.deepEqual([row.e,row.l,row.p],['Туман','Туман','Туман']);assert.equal(m.actions.length,0);assert.match(m.dataNotes.join(' '),/недостатньо застосовних даних/);assert.ok(m.sections.steps.length>0);const markup=portal.api.barometerSemanticModuleMarkup(row);for(const title of ['Як узгоджуються джерела','На що звернути увагу','Рекомендовані організаційні дії','Як перевірити результат'])assert.ok(markup.includes(title));assert.doesNotMatch(markup,/data-a="add-routed-action"/);assert.match(portal.api.buildReportHtml(environment),/недостатньо застосовних даних/);});
test('a real problem or P gap remains visible beside fog',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'T'},l:{L01:'S'},p:{P01:'G'}})),m=a.modules[1];assert.ok(m.actions.length>0);for(const c of ['L01','P01'])assert.ok(m.problemCodes.includes(c));assert.equal(a.input.branches.E01,'applicability');assert.match(m.dataNotes.join(' '),/недостатньо застосовних даних/);});
test('semantic v2 insufficient E sample is excluded, not fog',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({eEligible:false,l:{L01:'S'},p:{P01:'G'}}));assert.match(a.modules[1].dataNotes.join(' '),/Працівники: отримано 19 валідних анкет/);assert.equal(a.input.branches.E01,'sample');assert.ok(!a.modules[1].problemCodes.includes('E01'));assert.ok(a.modules[1].problemCodes.includes('L01'));});
test('semantic v2 insufficient L sample is excluded, not fog',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({lEligible:false,e:{E01:'S'}}));assert.match(a.modules[1].dataNotes.join(' '),/Керівники: отримано 9 валідних анкет/)});
test('semantic v2 source not measured is not favorable',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S'}})),m=a.modules[1];assert.ok(m.problemCodes.includes('E05'));const actions=m.actions.filter(x=>x.basis_codes.includes('E05'));assert.ok(actions.length>0);assert.ok(actions.every(x=>x.basis_codes.every(c=>!c.startsWith('L'))));});
test('semantic v2 E20 alone does not trigger M4-A3',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E20:'S'}}));assert.ok(a.modules[4].problemCodes.includes('E20'));assert.ok(a.modules[4].sections.steps.some(x=>x.codes.includes('E20')));assert.ok(!a.actions.some(x=>x.id==='M4-A3'));});
test('semantic v2 E31 alone requests pulse study and no routed action',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E31:'S'}})),m=a.modules[7];assert.ok(m.problemCodes.includes('E31'));assert.match(m.sections.steps.map(x=>x.text).join(' '),/анонімне пульс-опитування/);assert.match(m.sections.steps.map(x=>x.text).join(' '),/негайний захист/);assert.ok(!a.actions.some(x=>['M3-A3','M4-A3','M7-A3'].includes(x.id)));});
test('semantic v2 L16 alone produces narrow manager action',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L16:'S'}})),x=a.actions.find(x=>x.id==='M6-A1');assert.ok(x);assert.deepEqual(Array.from(x.basis_codes),['L16']);assert.match(x.title,/можливість реагувати/);assert.ok(x.steps.length>=3);assert.ok(x.steps.every(s=>!s.includes('оплати і преміювання')));});
test('semantic v2 L21 alone produces narrow change-risk action',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L21:'S'}})),x=a.actions.find(x=>x.id==='M7-A2');assert.ok(x);assert.deepEqual(Array.from(x.basis_codes),['L21']);assert.match(x.title,/Залучати керівників/);assert.ok(x.steps.length>=3);assert.ok(x.steps.every(s=>!s.includes('оплати і преміювання')));});
test('semantic v2 P40 requires confirmed applicability',()=>{const no=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P40:'G'},p40Applicable:false}));const clarify=no.actions.find(x=>x.id==='M7-A3');assert.ok(clarify);assert.match(clarify.title,/Уточнити ризик/);assert.equal(clarify.steps.length,1);assert.ok(no.modules[7].sections.steps.some(x=>x.units.includes('P40-CHECK')));const excluded=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P40:'G'},p40Known:true,p40Applicable:false}));assert.ok(!excluded.actions.some(x=>x.id==='M7-A3'));const yes=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P40:'G'},p40Applicable:true})),x=yes.actions.find(x=>x.id==='M7-A3');assert.ok(x);assert.match(x.title,/третіх осіб/);assert.deepEqual(Array.from(x.basis_codes),['P40']);});
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
  assert.ok(!notConfirmed.analysis.modules[7].sections.steps.some(x=>x.codes.includes('P40')));
  assert.doesNotMatch(notConfirmed.analysis.modules[7].lead,/якість даних обмежує висновок/);
  delete cp.p40ApplicabilityByEnvironment[second.id];
  const missing=evaluate(second.id);
  assert.equal(missing.input.P.p40Applicable,false);
  assert.equal(missing.input.P.p40Known,false);
  const clarify=missing.analysis.modules[7].actions.find(action=>action.id==='M7-A3');
  assert.ok(clarify);assert.match(clarify.title,/Уточнити ризик/);assert.equal(clarify.steps.length,1);
  assert.ok(missing.analysis.modules[7].sections.steps.some(x=>x.units.includes('P40-CHECK')));
  assert.match(missing.analysis.modules[7].sections.checks.map(x=>x.text).join(' '),/актуальність ризику для цього робочого середовища/);
  cp.p40ApplicabilityByEnvironment[second.id]='needs_check';
  assert.equal(evaluate(second.id).input.P.p40Applicable,false);
  assert.equal(cp.results.modules[7].status,'Буря');
});
test('semantic v2 keeps five active aspects in one module',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E16:'S',E18:'S',E20:'S'},l:{L10:'S',L11:'S'}})),m=a.modules[4];assert.deepEqual(Array.from(m.problemCodes).sort(),['E16','E18','E20','L10','L11']);for(const c of m.problemCodes)assert.ok(m.sections.steps.some(x=>x.codes.includes(c)));});
test('semantic v2 C01 replaces duplicate change actions',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S',E24:'S'}}));assert.ok(a.actions.some(x=>x.id==='C01'));assert.ok(!a.actions.some(x=>x.id==='M1-A3'));assert.ok(!a.actions.some(x=>x.id==='M5-A3'))});
test('H01 C01 preserves independent emergency action M7-A3',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S',E24:'S',E34:'S'}}));const ids=a.actions.map(x=>x.id);assert.ok(ids.includes('C01'));assert.ok(ids.includes('M7-A3'),'Do not lose emergency action when merging change actions');assert.ok(!ids.includes('M1-A3'));assert.ok(!ids.includes('M5-A3'))});
test('H01 C01 preserves other independent actions as well',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E05:'S',E24:'S',E16:'S',E34:'S'}}));const ids=a.actions.map(x=>x.id);assert.ok(ids.includes('C01'));assert.ok(ids.includes('M4-A1'),'Do not lose fairness action');assert.ok(ids.includes('M7-A3'),'Do not lose emergency action');assert.ok(!ids.includes('M1-A3'));assert.ok(!ids.includes('M5-A3'))});
test('semantic v2 adaptive M4-A1 shows only relevant E17 steps',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E17:'S'}})),x=a.actions.find(x=>x.id==='M4-A1');assert.ok(x);assert.ok(x.steps.some(s=>/визнання внеску/.test(s)));assert.ok(!x.steps.some(s=>/оплати і преміювання/.test(s)))});
test('semantic v2 P35 and P36 keep their action subsets separate',()=>{const p35=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P35:'G'}})).actions.find(x=>x.id==='M6-A3');assert.ok(p35);assert.ok(!p35.steps.some(s=>/травматич/.test(s)));const p36=portal.api.barometerSemanticInterpretation(semanticFixture({p:{P36:'G'}})).actions.find(x=>x.id==='M6-A3');assert.ok(p36);assert.ok(!p36.steps.some(s=>/тривалої відсутності/.test(s)))});
test('semantic v2 E28 does not add overload steps',()=>{const x=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E28:'S'}})).actions.find(x=>x.id==='M6-A1');assert.ok(x);assert.ok(x.steps.some(s=>/неробочий час/.test(s)));assert.ok(!x.steps.some(s=>/повторюваного надмірного навантаження/.test(s)))});
test('semantic v2 E31 and confirmed P40 stay separate',()=>{const a=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E31:'S'},p:{P40:'G'},p40Applicable:true})),m=a.modules[7];assert.ok(m.problemCodes.includes('E31')&&m.problemCodes.includes('P40'));const e31=m.sections.steps.filter(x=>x.codes.includes('E31'));assert.ok(e31.length);assert.ok(e31.every(x=>!x.codes.includes('P40')));assert.doesNotMatch(e31.map(x=>x.text).join(' '),/клієнт|пасажир|пацієнт/i);const action=a.actions.find(x=>x.id==='M7-A3');assert.ok(action);assert.deepEqual(Array.from(action.basis_codes),['P40']);});
test('semantic v2 action cards use bullets and omit legacy sections',()=>{setRuntimeScenario({eOverrides:{E17:1}});const markup=portal.api.barometerSemanticModuleMarkup(portal.api.actualResultModel()[3]);for(const title of ['Як узгоджуються джерела','На що звернути увагу','Рекомендовані організаційні дії','Як перевірити результат'])assert.ok(markup.includes(title));assert.match(markup,/<ul/);assert.doesNotMatch(markup,/Чому це рекомендовано|Що уточнити/);});
test('v45 four sections retain all evidence for 1, 2 and 5 active issues',()=>{for(const [opts,module,codes] of [[{e:{E01:'S'}},1,['E01']],[{e:{E01:'S',E02:'S'}},1,['E01','E02']],[{e:{E16:'S',E18:'S',E20:'S'},l:{L10:'S',L11:'S'}},4,['E16','E18','E20','L10','L11']]]){const m=portal.api.barometerSemanticInterpretation(semanticFixture(opts)).modules[module];assert.deepEqual(Array.from(m.problemCodes).sort(),codes);for(const key of ['alignment','attention','steps','checks'])assert.ok(m.sections[key].length>0);for(const c of codes)assert.ok(m.sections.steps.some(x=>x.codes.includes(c)));}});
test('v45 visible interpretation contains substantive user text without technical identifiers',()=>{const fixtures=[semanticFixture({e:{E01:'S'}}),semanticFixture({l:{L01:'S'}}),semanticFixture({p:{P01:'G'}}),semanticFixture({e:{E09:'S'},l:{L06:'S'},p:{P31:'G'}}),semanticFixture({e:{E31:'S'}}),semanticFixture({e:{E20:'S'}})];for(const f of fixtures){const visible=Object.values(portal.api.barometerSemanticInterpretation(f).modules).map(m=>[m.lead,...m.sections.attention,...m.sections.steps.map(x=>x.text)].join(' ')).join(' ');assert.ok(visible.length>100);assert.doesNotMatch(visible,/\b(DIRECT|SUPPORT|ROUTE|NOT_MEASURED|AVAILABLE|semantic layer|active code|trigger|source combination)\b/i);}});
test('semantic v2 dynamic signal wording is grammatically integrated',()=>{const mixed=portal.api.barometerSemanticInterpretation(semanticFixture({e:{E01:'S'},l:{L01:'N'},p:{P01:'N',P06:'N'}})).modules[1];assert.match(mixed.lead,/Несприятливі відповіді працівників стосуються таких питань: ясність обов’язків/);assert.match(mixed.lead,/керівники команд сприятливо оцінюють/);const fog=portal.api.barometerSemanticInterpretation(semanticFixture({l:{L21:'S'},p:{P37:'T'}})).modules[7];const text=[fog.lead,...fog.dataNotes,...fog.sections.steps.map(x=>x.text)].join(' ');assert.match(text,/недостатньо підтверджених даних/i);assert.match(text,/управління психосоціальними ризиками/i);assert.doesNotMatch(text,/оцінити інтеграція/i);});
test('public example uses four approved sections for clear, fog and adverse combinations',()=>{
  for(const values of [['Ясно','Ясно','Ясно'],['Туман','Туман','Туман'],['Туман','Ясно','Ясно'],['Буря','Хмарно','Ясно']]){
    const result=renderPublicExample(...values);assert.equal((result.statuses.match(/status-chip/g)||[]).length,3);
    assert.equal((result.detail.match(/class="profile-v45-card /g)||[]).length,4);
    for(const title of ['Як узгоджуються джерела','На що звернути увагу','Рекомендовані організаційні дії','Як перевірити результат'])assert.ok(result.detail.includes(title));
    assert.doesNotMatch(result.detail,/data-a="(?:add-routed-action|open-plan-action)"/);
  }
  const clear=renderPublicExample('Ясно','Ясно','Ясно');assert.match(clear.detail,/сприятливому рівні/);
  const fog=renderPublicExample('Туман','Туман','Туман');assert.match(fog.detail,/недостатньо застосовних даних/i);
  for(const result of [clear,fog])assert.doesNotMatch(result.detail,/Переглянути планування і коригування навантаження/);
  const problem=renderPublicExample('Буря','Хмарно','Ясно');assert.match(problem.detail,/Несприятливі відповіді/);assert.notEqual(problem.detail,clear.detail);
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
])test(`F02 measured evidence is scoped: ${name}`,()=>{setRuntimeScenario({eOverrides:overrides,lOverrides:{L09:1}});const a=portal.api.barometerSemanticInterpretation(),m=a.modules[3];for(const c of positive){assert.equal(a.input.branches[c],'favorable');assert.ok(!m.problemCodes.includes(c));}for(const c of negative){assert.equal(a.input.branches[c],'negative');assert.ok(m.problemCodes.includes(c));}for(const c of missing){assert.equal(a.input.branches[c],'applicability');assert.ok(!m.problemCodes.includes(c));assert.ok(!m.actions.some(x=>x.basis_codes.includes(c)));}if(missing.length)assert.match(m.dataNotes.join(' '),/недостатньо застосовних даних/);if(overrides.E14==='NA')assert.equal(a.input.branches.E14,'applicability');});
test('F02 partial NA remains visible even with no adverse signals',()=>{const {environment}=setRuntimeScenario({eOverrides:{E13:'NA'}});const a=portal.api.barometerSemanticInterpretation(),m=a.modules[3];assert.equal(a.input.branches.E13,'applicability');assert.ok(!m.problemCodes.includes('E13'));assert.match(m.dataNotes.join(' '),/недостатньо застосовних даних/);assert.match(portal.api.buildReportHtml(environment),/недостатньо застосовних даних/);});
for(const [code,id,terms] of [
  ['E09','M2-D1',[/поточне навантаження/,/строк, пріоритет, обсяг або розподіл/]],
  ['E10','M2-D2',[/управлінських рішень/,/ризики/]],
  ['E14','M3-D1',[/бути собою/,/взаємодії чи організації/]],
  ['L04','M2-D3',[/кількість прямих підлеглих/,/інші робочі обов’язки/]],
  ['L06','M2-D4',[/бюджету, обладнання/,/рішення іншого рівня/]],
  ['L17','M6-D1',[/практичне навчання/,/межами їхньої ролі/]],
  ['L18','M6-D1',[/скерувати працівника/,/межі їхньої ролі/]],
])test(`F03 isolated ${code} has a concrete plan-ready diagnostic action`,async()=>{
  const {environment}=setSurveyIssueScenario(code),a=portal.api.barometerSemanticInterpretation();
  const action=a.actions.find(x=>x.id===id);assert.ok(action);assert.equal(action.variant,'diagnostic');assert.equal(action.planEligible,true);
  for(const term of terms)assert.match(action.action,term);
  assert.ok(portal.api.selectedActions(action.module).find(x=>x.target===id));
  assert.match(portal.api.buildReportHtml(environment),new RegExp(action.title));
  if(code==='E14')assert.ok(!a.actions.some(x=>x.id==='M3-A1'));
  const button={dataset:{a:'add-routed-action',m:String(action.module),target:id},replaceWith(){}};
  await portal.listeners.get('click')({target:{closest(){return button}}});
  const plan=portal.api.getState().r.plan;assert.equal(plan.length,1);assert.equal(plan[0].sourceTarget,id);assert.equal(plan[0].description,action.action);
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
  if(companion){assert.ok(x.basis_codes.includes(companion));assert.match(x.action,/небезпечн|доступн/);}
  else{assert.doesNotMatch(x.action,/небезпечну умову|Оцінити її практичне значення/);assert.match(x.title,/знання правил/);assert.deepEqual(Array.from(x.basis_codes),['E33']);assert.ok(a.modules[7].problemCodes.includes('E33'))}
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
for(const value of [5,1])test(`F02 L partial NA retains measured L17=${value} and missing L18`,()=>{setRuntimeScenario({lOverrides:{L17:value,L18:'NA'}});const a=portal.api.barometerSemanticInterpretation(),m=a.modules[6];assert.equal(a.input.branches.L18,'applicability');assert.equal(a.input.branches.L17,value===5?'favorable':'negative');assert.match(m.dataNotes.join(' '),/недостатньо застосовних даних/);assert.ok(!m.actions.some(x=>x.basis_codes.includes('L18')));assert.equal(m.problemCodes.includes('L17'),value===1);});
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
    assert.match(portal.api.barometerSemanticInterpretation().modules[3].dataNotes.join(' '),/недостатньо застосовних даних/);
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
test('study progress complete checkup offers company results and optional survey import',()=>{
  const {html}=progressScenario({done:true});assert.match(progressStep(html,2),/✓ Завершено/);
  assert.match(progressStep(html,4),/aria-current="step"/);assert.match(progressStep(html,4),/Чекап компанії готовий до перегляду/);progressButton(html,'upload','progress-0');
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
  assert.equal((progressStep(html,4).match(/data-a="dash"/g)||[]).length,imported);
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
  assert.match(progressStep(html,3),/У процесі/);assert.match(html,/«Нове»/);
});
test('study progress obeys production canDashboard even for insufficient sample',()=>{
  const {p}=progressScenario({envCount:2,imported:1,done:true});
  p.envs[0].survey.results.e=portal.api.aggregateSource(surveyRows('E',5),'E');
  assert.equal(portal.api.canDashboard(p.envs[0]),true);
  const html=portal.api.studyProgress();progressButton(html,'dash','progress-0');
  assert.equal((progressStep(html,4).match(/data-a="dash"/g)||[]).length,1);
  assert.match(progressStep(html,4),/Для зіставлення джерел/);
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
