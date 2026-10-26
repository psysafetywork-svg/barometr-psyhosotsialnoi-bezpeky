const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.resolve(__dirname,'..'),source='/workspace/sites/barometer-v45-manual-20261026';
const oldHtml=cp.execFileSync('git',['show','0306399f255d6269cc67f15aef162ef0d5352d1e:local/index.html'],{cwd:root,encoding:'utf8',maxBuffer:10e6});
const local=fs.readFileSync(root+'/local/index.html','utf8'),pub=fs.readFileSync(root+'/index.html','utf8');
const embedded=Buffer.from(pub.match(/const embeddedLocalPortal = '([^']+)';/)[1],'base64').toString('utf8');
const script=h=>h.match(/<script>([\s\S]*)<\/script>/)[1];
function runtime(code,storage=new Map()){
 const el={innerHTML:'',style:{},querySelectorAll:()=>[],querySelector:()=>null,setAttribute(){},replaceWith(){},appendChild(){},remove(){},click(){}};
 const document={body:el,querySelector:()=>el,querySelectorAll:()=>[],getElementById:()=>el,createElement:()=>({...el}),addEventListener(){}};
 class FixedDate extends Date {constructor(...a){super(...(a.length?a:['2026-10-26T12:00:00Z']))}static now(){return 1793016000000}}
 const context=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,Date:FixedDate,TextEncoder,TextDecoder,Uint8Array,Uint32Array,ArrayBuffer,DataView,Blob,URL,setTimeout:()=>0,clearTimeout(){},alert(){},confirm:()=>true,NodeFilter:{SHOW_TEXT:4}});
 vm.runInContext(code.replace(/\brender\(\);\s*$/,''),context);
 return {context,storage,run:s=>vm.runInContext(s,context),json:s=>JSON.parse(vm.runInContext('JSON.stringify('+s+')',context))};
}
function oldResearch(){
 const r=runtime(script(oldHtml));
 r.run(`var answers=Object.fromEntries(P_LIST.map((p,i)=>[p.code,['full','partial','no','insufficient'][i%4]]));answers.P40='no';
 var notes=Object.fromEntries(P_LIST.map(p=>[p.code,'Примітка '+p.code+' зі старої версії']));
 var rows=Array.from({length:40},(_,i)=>({isManager:i<20,answers:Object.fromEntries(SURVEY_ITEMS.map(x=>[x.code,x.source==='E'||i<20?5:null]))}));
 var survey={ok:true,e:40,l:20,filename:'Старе опитування.csv',results:{e:aggregateSource(rows,'E',40),l:aggregateSource(rows.filter(x=>x.isManager),'L',20)}};
 var checkup={answers,notes,done:true,asOfDate:'2026-10-23',schemaVersion:CHECKUP_SCHEMA_VERSION,p40Risk:'confirmed',p40ApplicabilityByEnvironment:{a:'confirmed',b:'needs_check'}};
 checkup.results=calculatePResults(checkup);
 S={demo:false,r:{company:'Контроль міграції',owner:'QA',current:'complete',periods:[{id:'complete',start:'2026-10-01',end:'2026-10-26',envs:[{id:'a',name:'Майданчик',survey},{id:'b',name:'Офіс',survey:JSON.parse(JSON.stringify(survey))}],checkup}],plan:[{id:'edited',periodId:'complete',envId:'a',module:'Модуль 1',aspect:'Авторський аспект',action:'Збережена дія',description:'Ручна редакція',priority:'Висока',owner:'Відповідальна роль',due:'2026-12-01',indicator:'Авторський показник',status:'У роботі'}]}};
 var partial=JSON.parse(JSON.stringify(S.r.periods[0]));partial.id='partial';partial.start='2026-11-01';partial.end='2026-11-30';partial.envs=[];partial.checkup.done=false;partial.checkup.answers=Object.fromEntries(Object.entries(answers).slice(0,7));partial.checkup.notes={P01:'Незавершена примітка'};delete partial.checkup.results;partial.checkup.p40ApplicabilityByEnvironment={};S.r.periods.push(partial);save();`);
 return r;
}
test('production storage identity and embedded standalone HTML are unchanged/synchronized',()=>{
 assert.equal(embedded,local);
 assert.equal(local.match(/const STORE='[^']+';const LEGACY_STORES=\[[^\]]*\];/)[0],oldHtml.match(/const STORE='[^']+';const LEGACY_STORES=\[[^\]]*\];/)[0]);
 assert.doesNotMatch(local,/manual-preview|barometer_v45_(?:manual|acceptance)_20261026|Тестова копія для перевірки/);
 assert.doesNotMatch(local,/<script[^>]+src=|<link[^>]+href=/);
});
for(const [name,html] of [['online',local],['downloaded embedded HTML',embedded]])test(name+': exact old-version data survives load, repeated save and separate JSON restore',()=>{
 const old=oldResearch(),before=old.json('S.r'),raw=old.storage.get('barometer_v2_final');
 const r=runtime(script(html),old.storage);r.run("S={r:load(),screen:'home',env:null,demo:false};save();");
 assert.deepEqual(r.json('S.r'),before);assert.deepEqual(JSON.parse(r.storage.get('barometer_v2_final')),before);
 assert.equal(r.run('checkupStartModule(period().checkup)'),1);
 r.run("S.r.current='partial'");assert.equal(r.run('checkupStartModule(period().checkup)'),2);
 const restored=runtime(script(html));restored.context.backup=JSON.parse(raw);
 restored.run('validateBackupResearch(backup);S={r:safeResearchClone(backup),demo:false};save()');
 assert.deepEqual(restored.json('S.r'),before);
});
test('every legacy key reads automatically without changing answers or user edits',()=>{
 const old=oldResearch(),before=old.json('S.r');
 for(const key of old.json('LEGACY_STORES')){
  const r=runtime(script(local),new Map([[key,JSON.stringify(before)]]));r.run('S={r:load(),demo:false};save()');assert.deepEqual(r.json('S.r'),before,key);
 }
});
const approved=runtime(fs.readFileSync(source+'/dist/portal.js','utf8'));
const production=runtime(script(local));
for(const fixture of fs.readdirSync(source+'/dist/fixtures').filter(x=>x.endsWith('.json')))test('exact approved/candidate parity: '+fixture,()=>{
 const raw=JSON.parse(fs.readFileSync(source+'/dist/fixtures/'+fixture));
 const snapshot=r=>{r.context.fixture=JSON.parse(JSON.stringify(raw.data||raw));r.run("S={r:fixture,screen:'dash',env:fixture.periods[0].envs[0]?.id||null,module:5,demo:false};");
  const snapshots=[];
  for(const e of [null,...r.json('period().envs.map(e=>e.id)')]){r.context.selected=e;r.run('S.env=selected');snapshots.push(r.json('({rows:actualResultModel(),analysis:profileV45Analysis(),plan:currentPlan(),excel:planRows()})'));snapshots.push(r.run('buildReportHtml(S.env?env(S.env):profileV45CompanyTarget())'));snapshots.push(Array.from(r.run('planXlsxBytes(planRows())')));}
  for(const src of ['E','L']){r.context.src=src;r.run('comparisonSelection();S.compareSource=src');snapshots.push(r.run('comparison()'));}return snapshots;};
 assert.deepEqual(snapshot(production),snapshot(approved));
});
