// Reproducible isolated browser QA; no production requests or company data.
// npm install --no-save playwright && npx playwright install chromium
// node tests/checkup-browser.cjs
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const os=require('os'),{execFileSync}=require('child_process');
const repo=path.resolve(__dirname,'..'),out=process.env.BAROMETER_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'barometer-checkup-qa-'));fs.mkdirSync(out,{recursive:true});
const previous=execFileSync('git',['show','0b45c29dbb3a1300ef1e8c0389377f60ab9bf20d:local/index.html'],{cwd:repo,maxBuffer:10*1024*1024});
const reviewed=execFileSync('git',['show','4de7798e0df7d9ee339762d620eda6a9ef64f6ce:local/index.html'],{cwd:repo,maxBuffer:10*1024*1024});
const baseline=execFileSync('git',['show','15eea99fcabd0a22f7615311deda281949a9e716:local/index.html'],{cwd:repo,maxBuffer:10*1024*1024});
let version='baseline',baseUrl;const logs=[],errors=[];
const server=http.createServer((req,res)=>{const file=req.url==='/local/'?(version==='baseline'?null:repo+'/local/index.html'):req.url==='/'?repo+'/index.html':null;res.setHeader('Content-Type','text/html;charset=utf-8');res.end(req.url==='/local/'&&version==='baseline'?baseline:req.url==='/local/'&&version==='previous'?previous:req.url==='/local/'&&version==='reviewed'?reviewed:file?fs.readFileSync(file):'Not found')});
const record=(name,data={})=>{logs.push({name,status:'PASS',...data});fs.writeFileSync(out+'/browser-checks.json',JSON.stringify({browser:browserVersion,checks:logs,errors},null,2));console.log('PASS',name)};let browserVersion;
async function syncPage(page){await page.evaluate(async()=>{if(typeof storageEvents!=='undefined')await storageEvents;if(typeof StorageSafety!=='undefined')await StorageSafety.whenIdle()})}
async function setup(page,{E=40,L=20,answers={},empty=false}={}){
 await page.waitForFunction(()=>typeof StorageSafety==='undefined'||StorageSafety.mode==='editor');await syncPage(page);
 return await page.evaluate(async ({E,L,answers,empty})=>{
  const r={company:'Синтетична компанія - QA',owner:'Тестова власниця дослідження',current:'period-qa',periods:[{id:'period-qa',label:'Вересень 2026',start:'2026-09-01',end:'2026-09-30',envs:[{id:'env-office',name:'Офіс - синтетичні дані',survey:{}},{id:'env-shift',name:'Змінна робота - синтетичні дані',survey:{}}],checkup:{answers:{},notes:{},done:false,asOfDate:'2026-09-30',schemaVersion:CHECKUP_SCHEMA_VERSION}}],plan:[]};
  S={screen:'home',r,env:'env-office',module:1,modal:null,demo:false,returnResearch:null};
  if(!empty){let cp=period().checkup;cp.answers={...Object.fromEntries(P_LIST.map(x=>[x.code,'full'])),...answers};cp.done=true;cp.results=calculatePResults(cp);}
  if(E||L){const rows=Array.from({length:Math.max(E,L)},(_,i)=>({isManager:i<L,answers:Object.fromEntries(SURVEY_ITEMS.map(x=>[x.code,x.source==='E'?5:i<L?5:null]))}));
   const er=aggregateSource(rows.slice(0,E),'E'),lr=aggregateSource(rows.slice(0,L),'L');env('env-office').survey={ok:true,e:E,l:L,leaders:L>0,results:{e:er,l:lr}};}
  await save();render();return JSON.parse(JSON.stringify(S.r));
 },{E,L,answers,empty});
}
async function dash(page,id='env-office'){
 await syncPage(page);
 await page.evaluate(async id=>{S.env=id;S.screen='dash';S.modal=null;render()},id);
 await page.locator('.weather-table').waitFor();
}
async function download(page,click,file){await syncPage(page);const promise=page.waitForEvent('download');promise.catch(()=>{});await click();const d=await promise;await d.saveAs(out+'/'+file);return out+'/'+file;}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));baseUrl='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BAROMETER_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});browserVersion=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.goto(baseUrl+'/local/');
 // Build a previous-version study using the actual file-import UI and checkup form.
 await setup(page,{E:0,L:0,empty:true});
 const files=await page.evaluate(async ()=>{
  const table=[[ROLE_QUESTION,...SURVEY_ITEMS.map(x=>x.code+' '+x.text)],...Array.from({length:40},(_,i)=>[i<20?'Так':'Ні',...SURVEY_ITEMS.map(x=>x.source==='E'||i<20?'5':'')])];
  return {csv:table.map(row=>row.join('\t')).join('\n'),xlsx:Array.from(planXlsxBytes(table))};
 });
 fs.writeFileSync(out+'/synthetic-import.csv',files.csv);fs.writeFileSync(out+'/synthetic-import.xlsx',Buffer.from(files.xlsx));
 await page.locator('[data-a="upload"][data-id="env-office"]').first().click();
 await page.locator('#file').setInputFiles(out+'/synthetic-import.xlsx');await page.locator('[data-a="validate"]').click();await page.locator('[data-a="accept"]').click();
 await page.locator('[data-a="checkup"]').first().click();
 for(let m=1;m<=7;m++){
  const codes=await page.evaluate(async m=>P[m].map(x=>x.code),m);
  for(const code of codes){const radio=page.locator(`input[name="${code}"][value="${code==='P31'?'partial':'full'}"]`);await radio.evaluate(async el=>el.closest('.practice').scrollIntoView({block:'center',behavior:'instant'}));await radio.check();}
  if(m<7)await page.locator('[data-a="next"]').click();else await page.locator('[data-a="finish"]').click();
 }
 await dash(page);
 await page.setViewportSize({width:390,height:844});const baselineMobileWidth=await page.evaluate(async ()=>document.documentElement.scrollWidth);await page.screenshot({path:out+'/before-full-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:out+'/before-full-desktop.png',fullPage:true});await page.locator('.weather-map').screenshot({path:out+'/before-map.png'});
 await page.locator('[data-a="toggle-detail"][data-m="6"]').click();
 await page.locator('[data-a="add-routed-action"]').last().click();
 const beforeMap=await page.locator('.weather-map').evaluate(async el=>({html:el.outerHTML.replace('Карта погодних статусів','Карта організаційної погоди'),colors:Array.from(el.querySelectorAll('.weather-badge')).map(b=>[getComputedStyle(b).color,getComputedStyle(b).backgroundColor,getComputedStyle(b).fontSize,b.innerText])}));
 const before=await page.evaluate(async ()=>({stored:localStorage.getItem(STORE),data:JSON.parse(JSON.stringify(S.r)),rows:actualResultModel(),plan:JSON.parse(JSON.stringify(currentPlan()))}));
 fs.writeFileSync(out+'/previous-version-state.json',JSON.stringify(before,null,2));assert.ok(before.plan.length);
 record('Previous version: XLSX import, all 42 P form responses, generated Plan action');
 // Same context, same URL, same localStorage key. Only the served code changes.
 version='feature';await page.reload();await page.locator('[data-a="continue"]').click();
 const after=await page.evaluate(async ()=>({stored:localStorage.getItem(STORE),data:JSON.parse(JSON.stringify(S.r)),rows:(S.env='env-office',actualResultModel()),plan:JSON.parse(JSON.stringify(currentPlan()))}));
 assert.deepEqual(after.data,before.data);assert.deepEqual(after.rows,before.rows);assert.deepEqual(after.plan,before.plan);record('Same-origin upgrade preserves stored answers, cached calculations, P, Plan and settings');
 await dash(page);await page.screenshot({path:out+'/after-full-desktop.png',fullPage:true});await page.locator('.weather-map').screenshot({path:out+'/after-map.png'});const afterMap=await page.locator('.weather-map').evaluate(async el=>({html:el.outerHTML.replace('Карта погодних статусів','Карта організаційної погоди'),colors:Array.from(el.querySelectorAll('.weather-badge')).map(b=>[getComputedStyle(b).color,getComputedStyle(b).backgroundColor,getComputedStyle(b).fontSize,b.innerText])}));assert.deepEqual(afterMap,beforeMap);record('Full E/L/P map markup, icons, colors and typography match baseline');await page.setViewportSize({width:390,height:844});const featureMobileWidth=await page.evaluate(async ()=>document.documentElement.scrollWidth);assert.equal(featureMobileWidth,baselineMobileWidth);record('Existing narrow-screen header overflow matches baseline',{viewport:390,baseline:baselineMobileWidth,feature:featureMobileWidth});await page.setViewportSize({width:1440,height:1000});
 await page.reload();await page.locator('[data-a="continue"]').click();assert.deepEqual(await page.evaluate(async ()=>S.r),before.data);record('Reload preserves previous-version study');
 const backup=await download(page,async()=>{await page.locator('[data-a="backup-info"]').first().click();await page.locator('[data-a="backup-download"]').click()},'same-origin-backup.json');
 const saved=JSON.parse(fs.readFileSync(backup)).data;
 await page.locator('[data-a="restore-open"]').count().then(async n=>{if(!n)await page.evaluate(async ()=>{S.screen='start';S.r=null;render()})});
 await page.locator('[data-a="restore-open"]').click();await page.locator('#restore-file').setInputFiles(backup);await page.locator('[data-a="restore-backup"]').click();
 await page.locator('.study-progress').waitFor();assert.deepEqual(await page.evaluate(async ()=>S.r),saved);record('Actual JSON file download and restore preserve same study');
 // Independent old-version fixture; mixed-version conflicts are covered by storage-safety-browser.cjs.
 await syncPage(page);await page.evaluate(async ()=>localStorage.clear());
 version='previous';await page.reload();await setup(page,{E:0,L:0});await dash(page);await page.locator('[data-a="toggle-detail"][data-m="1"]').click();await page.locator('[data-practice-code="P01"] summary').click();await page.locator('[data-target="CRITERION:P01-C1"]').click();const reviewed=await page.evaluate(async ()=>JSON.parse(JSON.stringify(S.r)));version='feature';await page.reload();await page.locator('[data-a="continue"]').click();assert.deepEqual(await page.evaluate(async ()=>S.r),reviewed);record('Same-origin upgrade from 0b45c29 preserves legacy criterion action without migration');
 // Feature-version CSV import through the actual picker.
 await setup(page,{E:0,L:0,empty:true});await page.locator('[data-a="upload"][data-id="env-office"]').first().click();await page.locator('#file').setInputFiles(out+'/synthetic-import.csv');await page.locator('[data-a="validate"]').click();await page.locator('[data-a="accept"]').click();assert.equal(await page.evaluate(async ()=>env('env-office').survey.e),40);record('Feature-version actual CSV import');
 const mixed={P03:'partial',P15:'no',P24:'insufficient',P31:'partial'};
 async function expand(m,code){await page.locator(`[data-a="toggle-detail"][data-m="${m}"]`).click();if(code)await page.locator(`[data-practice-code="${code}"] summary`).click();}
 async function reportPdf(name){
  const htmlfile=await download(page,()=>page.locator('[data-a="report"]').click(),name+'.html');
  const p=await context.newPage();await p.goto('file://'+htmlfile);
  assert.equal(await p.locator('#checkup-verification-appendix').count(),0);
  assert.equal(await p.locator('.module-head').count(),7);
  const text=await p.innerText('body');assert.doesNotMatch(text,/P\d{2}-C[1-4]|Повні критерії.*додатку|окрема організаційна дія.*не формується/i);
  assert.equal(await p.locator('#report-methodology').count(),1);assert.equal(await p.locator('#report-source-scope').count(),1);assert.doesNotMatch(text,/Усі кроки доступні в дашборді/);assert.match(text,/P15/);assert.match(text,/5 із 6/);assert.match(text,/Буря/);
  await p.pdf({path:out+'/'+name+'.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});await p.close();record(name+': actual downloaded report, seven modules, no appendix, browser PDF');
 }
 for(const [E,L,name] of [[0,0,'p-only'],[9,3,'insufficient'],[20,0,'p-plus-e'],[0,10,'p-plus-l'],[20,10,'p-plus-e-plus-l']]){
  await setup(page,{E,L,answers:mixed});await dash(page);
  const rows=await page.evaluate(async ()=>actualResultModel());assert.equal(rows.length,7);
  assert.equal(rows[0].e,E===0?'Немає даних':E<20?'Недостатня вибірка':'Ясно');assert.equal(rows[0].l,L===0?'Немає даних':L<10?'Недостатня вибірка':'Ясно');
  assert.equal(rows[2].p,'Буря');assert.equal(rows[1].p,'Ясно');
  assert.equal(await page.locator('[data-criterion-id]').count(),0);assert.equal(await page.locator('[data-action-id="PRACTICE:P31"]').count(),1);
  assert.equal(await page.locator('#matrix-2 [data-action-id]').count(),0);
  await page.screenshot({path:out+'/'+name+'-dashboard.png',fullPage:true});
  if(['p-only','p-plus-e','p-plus-l','p-plus-e-plus-l'].includes(name))await reportPdf(name+'-report');
  await expand(1,'P03');const button=page.locator('[data-target="PRACTICE:P03"]');await button.click();
  assert.equal(await page.evaluate(async ()=>currentPlan().length),1);assert.equal(await page.evaluate(async ()=>currentPlan()[0].envId),null);
  await dash(page);await expand(1,'P03');assert.equal(await button.isDisabled(),true);record(`${name}: statuses, cross-module provenance, real add and duplicate prevention`);
 }
 // A full P-only mixed profile with three reviewable Plan examples.
 await setup(page,{E:0,L:0,answers:mixed});await dash(page);
 await page.locator('#matrix-2').screenshot({path:out+'/module-clear.png'});
 await page.locator('#matrix-3').screenshot({path:out+'/module-p15-storm.png'});
 for(const [m,code] of [[1,'P03'],[3,'P15'],[4,'P24']]){
  await expand(m,code);await page.locator(`[data-practice-code="${code}"]`).screenshot({path:out+'/'+code+'-recommendation.png'});
  const expected=await page.evaluate(async code=>barometerSemanticAction('PRACTICE:'+code),code);
  await page.locator(`[data-target="PRACTICE:${code}"]`).click();
  const saved=await page.evaluate(async code=>currentPlan().find(a=>a.sourceTarget==='PRACTICE:'+code),code);
  assert.equal(saved.description,expected.action);assert.equal(saved.indicator,expected.check);assert.equal(saved.priority,code==='P15'?'Високий':'Середній');
  record(`${code}: complete steps, outcome and priority persisted`);
 }
 await page.locator('[data-a="plan"]').last().click();await page.screenshot({path:out+'/plan-three-examples.png',fullPage:true});
 fs.writeFileSync(out+'/plan-examples.json',JSON.stringify(await page.evaluate(async ()=>currentPlan()),null,2));
 const planfile=await download(page,()=>page.locator('[data-a="export"]').click(),'organisational-plan.xlsx');assert.ok(fs.statSync(planfile).size>1000);
 // XLSX data equality is verified by parsing the actual exported workbook in the report script.
 const card=page.locator('.plan-card').first();
 await card.locator('[data-f="action"]').fill('Уточнений власницею захід P03');await card.locator('[data-f="description"]').fill('Збережені ручні кроки');await card.locator('[data-f="indicator"]').fill('Уточнений критерій результату');await card.locator('[data-f="owner"]').fill('Відповідальна особа QA');await card.locator('[data-f="due"]').fill('2026-12-01');await card.locator('[data-f="priority"]').selectOption('Високий');await card.locator('[data-f="status"]').selectOption('У роботі');await card.locator('[data-f="envId"]').selectOption('env-shift');
 await syncPage(page);const edited=await page.evaluate(async ()=>JSON.parse(JSON.stringify(currentPlan()[0])));
 await page.reload();await page.locator('[data-a="continue"]').click();assert.deepEqual(await page.evaluate(async ()=>currentPlan()[0]),edited);record('Plan actual controls and reload preserve all fields and branch scope');
 await dash(page,'env-office');await expand(1,'P03');assert.equal(await page.locator('[data-target="PRACTICE:P03"]').isDisabled(),true);record('Moving action to a branch does not recreate a company duplicate');
 await page.evaluate(async ()=>{S.module=1;S.screen='checkup';render()});const full=page.locator('input[name="P03"][value="full"]');await full.evaluate(async el=>el.closest('.practice').scrollIntoView({block:'center'}));await full.check();await page.evaluate(async ()=>{S.module=7;render()});await page.locator('[data-a="finish"]').click();assert.deepEqual(await page.evaluate(async ()=>currentPlan()[0]),edited);record('Actual changed P response preserves edited action');
 await page.evaluate(async ()=>{S.screen='home';render()});
 const newBackup=await download(page,async()=>{await page.locator('[data-a="backup-info"]').first().click();await page.locator('[data-a="backup-download"]').click()},'new-action-backup.json');
 const backupData=JSON.parse(fs.readFileSync(newBackup)).data;
 await page.evaluate(async ()=>{S.screen='start';S.r=null;render()});await page.locator('[data-a="restore-open"]').click();await page.locator('#restore-file').setInputFiles(newBackup);await page.locator('[data-a="restore-backup"]').click();await page.locator('.study-progress').waitFor();assert.deepEqual(await page.evaluate(async ()=>S.r),backupData);record('Actual JSON download and restore preserve new actions and edited fields');
 await page.locator('[data-a="plan"]').last().click();await page.locator('.plan-card').nth(2).locator('[data-a="del"]').click();assert.equal(await page.evaluate(async ()=>currentPlan().length),2);assert.deepEqual(await page.evaluate(async ()=>currentPlan()[0]),edited);record('Manual delete affects only selected action');
 // Previous criterion model, including edited records, remains readable and does not duplicate.
 // Independent old-version fixture; mixed-version conflicts are covered by storage-safety-browser.cjs.
 await syncPage(page);await page.evaluate(async ()=>localStorage.clear());
 version='previous';await page.reload();await setup(page,{E:20,L:10,answers:{P03:'partial'}});await dash(page);await expand(1,'P03');await page.locator('[data-target="CRITERION:P03-C1"]').click();
 await page.evaluate(async ()=>{const a=currentPlan()[0];a.description='Ручні зміни старого запису';a.envId='env-shift';await save()});
 const old=await page.evaluate(async ()=>JSON.parse(JSON.stringify(S.r)));version='feature';await page.reload();await page.locator('[data-a="continue"]').click();assert.deepEqual(await page.evaluate(async ()=>S.r),old);
 await dash(page);await expand(1,'P03');assert.equal(await page.locator('[data-target="PRACTICE:P03"]').isDisabled(),true);assert.match(await page.locator('[data-practice-code="P03"]').innerText(),/Цю дію додано раніше\. Перевірте, чи її опис містить усі потрібні кроки\. Ми не змінювали її автоматично\./);await page.locator('[data-practice-code="P03"]').screenshot({path:out+'/legacy-plan-notice.png'});record('Same-origin 0b45c29 criterion upgrade preserves edited record and avoids duplicate');
 const legacyBackup=await download(page,async()=>{await page.evaluate(async ()=>{S.screen='home';render()});await page.locator('[data-a="backup-info"]').first().click();await page.locator('[data-a="backup-download"]').click()},'legacy-upgrade-backup.json');
 await page.evaluate(async ()=>{S.screen='start';S.r=null;render()});await page.locator('[data-a="restore-open"]').click();await page.locator('#restore-file').setInputFiles(legacyBackup);await page.locator('[data-a="restore-backup"]').click();await page.locator('.study-progress').waitFor();assert.deepEqual(await page.evaluate(async ()=>S.r),JSON.parse(fs.readFileSync(legacyBackup)).data);await page.locator('[data-a="plan"]').last().click();await download(page,()=>page.locator('[data-a="export"]').click(),'legacy-upgrade-plan.xlsx');record('Upgraded criterion study: real JSON restore and XLSX export');

 // Latest reviewed 4de7798 action, edited by its owner, remains intact at the same origin.
 // Independent pre-protection fixture, retaining the same upgrade assertions.
 await syncPage(page);await page.evaluate(async ()=>localStorage.clear());
 version='reviewed';await page.reload();await setup(page,{E:0,L:0,answers:{P03:'partial'}});await dash(page);await expand(1,'P03');await page.locator('[data-target="PRACTICE:P03"]').click();
 await page.evaluate(async ()=>{const a=currentPlan()[0];a.description='Збережені власницею кроки з перевіреної версії';a.owner='Власниця';await save()});
 const latestReviewedState=await page.evaluate(async ()=>JSON.parse(JSON.stringify(S.r)));
 version='feature';await page.reload();await page.locator('[data-a="continue"]').click();assert.deepEqual(await page.evaluate(async ()=>S.r),latestReviewedState);
 await dash(page);await expand(1,'P03');assert.equal(await page.locator('[data-target="PRACTICE:P03"]').isDisabled(),true);
 assert.match(await page.locator('[data-practice-code="P03"]').innerText(),/Цю дію додано раніше/);
 await page.locator('[data-practice-code="P03"]').screenshot({path:out+'/legacy-4de7798-notice.png'});
 record('Same-origin 4de7798 upgrade preserves old practice action and shows contextual notice');

 // Additional required status and presentation scenarios.
 for(const [name,answers,done] of [['all-full',{},true],['two-no',{P01:'no',P02:'no'},true],['fog',{P01:'insufficient',P02:'insufficient',P03:'insufficient'},true],['partial',{P03:'partial'},true],['unfinished',{},false]]){
  await setup(page,{E:0,L:0,answers});if(!done){await page.evaluate(async ()=>{period().checkup.done=false;await save();render()});assert.equal(await page.evaluate(async ()=>canDashboard(env('env-office'))),false);record(name+': dashboard blocked');continue;}
  await dash(page);const rows=await page.evaluate(async ()=>actualResultModel());
  if(name==='all-full'){assert.ok(rows.every(r=>r.p==='Ясно'));assert.equal(await page.locator('[data-action-id]').count(),0);await page.screenshot({path:out+'/all-full-dashboard.png',fullPage:true});}
  if(name==='two-no')assert.equal(rows[0].p,'Буря');if(name==='fog')assert.equal(rows[0].p,'Туман');if(name==='partial')assert.equal(rows[0].p,'Хмарно');
  const html=await page.evaluate(async ()=>buildReportHtml(env('env-office')));assert.doesNotMatch(html,/P\d{2}-C[1-4]|checkup-verification-appendix/);record(name+': map, conclusions, recommendations and report');
 }
 await setup(page,{E:0,L:0,answers:{P05:'partial',P29:'no'}});await dash(page);assert.equal(await page.locator('[data-action-id="C01"]').count(),1);assert.equal(await page.locator('#matrix-5 [data-action-id]').count(),0);await page.locator('[data-a="toggle-detail"][data-m="1"]').click();await page.locator('[data-action-id="C01"] summary').click();await page.locator('[data-target="C01"]').click();assert.equal(await page.evaluate(async ()=>currentPlan().length),1);assert.match(await page.evaluate(async ()=>currentPlan()[0].description),/P05:/);assert.match(await page.evaluate(async ()=>currentPlan()[0].description),/P29:/);record('C01 preserves one full combined action for information and consultation during change');
 // Survey-only problems remain meaningful without claiming a specific P failure.
 await setup(page,{E:20,L:10});await page.evaluate(async ()=>{const rows=Array.from({length:20},()=>({isManager:true,answers:Object.fromEntries(SURVEY_ITEMS.map(x=>[x.code,['E17','L10'].includes(x.code)?1:5]))}));env('env-office').survey.results={e:aggregateSource(rows,'E'),l:aggregateSource(rows.slice(0,10),'L')};await save()});await dash(page);assert.ok(await page.locator('#matrix-4 [data-action-id]').count()>0);assert.match(await page.locator('#matrix-4').innerText(),/не доводять автоматично/);record('E/L discrepancy with full P retains source-based verification and no invented P failure');
 // One company P, two different local surveys.
 const shared=await page.evaluate(async ()=>JSON.stringify(period().checkup));await dash(page,'env-shift');assert.equal(await page.evaluate(async ()=>JSON.stringify(period().checkup)),shared);assert.equal(await page.evaluate(async ()=>actualResultModel()[0].e),'Немає даних');record('Branches share one P with distinct local E/L');
 await setup(page,{E:0,L:0,answers:mixed});await page.evaluate(async ()=>{period().envs=[];S.env=null;S.screen='home';await save();render()});await page.locator('[data-a="company-results"]').click();assert.equal(await page.locator('.weather-table tbody tr').count(),7);record('Corporate P-only results without environments');
 await context.setOffline(true);await expand(1,'P03');await page.locator('[data-target="PRACTICE:P03"]').click();assert.equal(await page.evaluate(async ()=>currentPlan().length),1);record('Offline action generation and persistence');
 const offline=await context.newPage();await offline.goto('file://'+repo+'/local/index.html');await offline.locator('[data-a="restore-open"]').click();await offline.locator('#restore-file').setInputFiles(newBackup);await offline.locator('[data-a="restore-backup"]').click();await offline.locator('.study-progress').waitFor();await offline.locator('[data-a="company-results"]').click();assert.equal(await offline.locator('.weather-table tbody tr').count(),7);record('Local file HTML works offline after actual JSON restore');
 assert.deepEqual(errors,[]);record('No browser runtime errors');await browser.close();server.close();
})().catch(e=>{console.error(e.stack);fs.writeFileSync(out+'/browser-failure.txt',e.stack);process.exitCode=1;server.close();process.exit(1)});
