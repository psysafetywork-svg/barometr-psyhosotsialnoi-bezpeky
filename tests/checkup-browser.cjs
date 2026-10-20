// Reproducible isolated browser QA; no production requests or company data.
// npm install --no-save playwright && npx playwright install chromium
// node tests/checkup-browser.cjs
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const os=require('os'),{execFileSync}=require('child_process');
const repo=path.resolve(__dirname,'..'),out=process.env.BAROMETER_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'barometer-checkup-qa-'));fs.mkdirSync(out,{recursive:true});
const baseline=execFileSync('git',['show','15eea99fcabd0a22f7615311deda281949a9e716:local/index.html'],{cwd:repo,maxBuffer:10*1024*1024});
let version='baseline',baseUrl;const logs=[],errors=[];
const server=http.createServer((req,res)=>{const file=req.url==='/local/'?(version==='baseline'?null:repo+'/local/index.html'):req.url==='/'?repo+'/index.html':null;res.setHeader('Content-Type','text/html;charset=utf-8');res.end(req.url==='/local/'&&version==='baseline'?baseline:file?fs.readFileSync(file):'Not found')});
const record=(name,data={})=>{logs.push({name,status:'PASS',...data});fs.writeFileSync(out+'/browser-checks.json',JSON.stringify({browser:browserVersion,checks:logs,errors},null,2));console.log('PASS',name)};let browserVersion;
async function setup(page,{E=40,L=20,answers={},empty=false}={}){
 return await page.evaluate(({E,L,answers,empty})=>{
  const r={company:'Синтетична компанія - QA',owner:'Тестова власниця дослідження',current:'period-qa',periods:[{id:'period-qa',label:'Вересень 2026',start:'2026-09-01',end:'2026-09-30',envs:[{id:'env-office',name:'Офіс - синтетичні дані',survey:{}},{id:'env-shift',name:'Змінна робота - синтетичні дані',survey:{}}],checkup:{answers:{},notes:{},done:false,asOfDate:'2026-09-30',schemaVersion:CHECKUP_SCHEMA_VERSION}}],plan:[]};
  S={screen:'home',r,env:'env-office',module:1,modal:null,demo:false,returnResearch:null};
  if(!empty){let cp=period().checkup;cp.answers={...Object.fromEntries(P_LIST.map(x=>[x.code,'full'])),...answers};cp.done=true;cp.results=calculatePResults(cp);}
  if(E||L){const rows=Array.from({length:Math.max(E,L)},(_,i)=>({isManager:i<L,answers:Object.fromEntries(SURVEY_ITEMS.map(x=>[x.code,x.source==='E'?5:i<L?5:null]))}));
   const er=aggregateSource(rows.slice(0,E),'E'),lr=aggregateSource(rows.slice(0,L),'L');env('env-office').survey={ok:true,e:E,l:L,leaders:L>0,results:{e:er,l:lr}};}
  save();render();return JSON.parse(JSON.stringify(S.r));
 },{E,L,answers,empty});
}
async function dash(page,id='env-office'){
 await page.evaluate(id=>{S.env=id;S.screen='dash';S.modal=null;render()},id);
 await page.locator('.weather-table').waitFor();
}
async function download(page,click,file){const promise=page.waitForEvent('download');await click();const d=await promise;await d.saveAs(out+'/'+file);return out+'/'+file;}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));baseUrl='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BAROMETER_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});browserVersion=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.goto(baseUrl+'/local/');
 // Build a previous-version study using the actual file-import UI and checkup form.
 await setup(page,{E:0,L:0,empty:true});
 const files=await page.evaluate(()=>{
  const table=[[ROLE_QUESTION,...SURVEY_ITEMS.map(x=>x.code+' '+x.text)],...Array.from({length:40},(_,i)=>[i<20?'Так':'Ні',...SURVEY_ITEMS.map(x=>x.source==='E'||i<20?'5':'')])];
  return {csv:table.map(row=>row.join('\t')).join('\n'),xlsx:Array.from(planXlsxBytes(table))};
 });
 fs.writeFileSync(out+'/synthetic-import.csv',files.csv);fs.writeFileSync(out+'/synthetic-import.xlsx',Buffer.from(files.xlsx));
 await page.locator('[data-a="upload"][data-id="env-office"]').first().click();
 await page.locator('#file').setInputFiles(out+'/synthetic-import.xlsx');await page.locator('[data-a="validate"]').click();await page.locator('[data-a="accept"]').click();
 await page.locator('[data-a="checkup"]').first().click();
 for(let m=1;m<=7;m++){
  const codes=await page.evaluate(m=>P[m].map(x=>x.code),m);
  for(const code of codes){const radio=page.locator(`input[name="${code}"][value="${code==='P31'?'partial':'full'}"]`);await radio.evaluate(el=>el.closest('.practice').scrollIntoView({block:'center',behavior:'instant'}));await radio.check();}
  if(m<7)await page.locator('[data-a="next"]').click();else await page.locator('[data-a="finish"]').click();
 }
 await dash(page);
 await page.setViewportSize({width:390,height:844});const baselineMobileWidth=await page.evaluate(()=>document.documentElement.scrollWidth);await page.screenshot({path:out+'/before-full-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:out+'/before-full-desktop.png',fullPage:true});await page.locator('.weather-map').screenshot({path:out+'/before-map.png'});
 await page.locator('[data-a="toggle-detail"][data-m="6"]').click();
 await page.locator('[data-a="add-routed-action"]').last().click();
 const beforeMap=await page.locator('.weather-map').evaluate(el=>({html:el.outerHTML,colors:Array.from(el.querySelectorAll('.weather-badge')).map(b=>[getComputedStyle(b).color,getComputedStyle(b).backgroundColor,getComputedStyle(b).fontSize,b.innerText])}));
 const before=await page.evaluate(()=>({stored:localStorage.getItem(STORE),data:JSON.parse(JSON.stringify(S.r)),rows:actualResultModel(),plan:JSON.parse(JSON.stringify(currentPlan()))}));
 fs.writeFileSync(out+'/previous-version-state.json',JSON.stringify(before,null,2));assert.ok(before.plan.length);
 record('Previous version: XLSX import, all 42 P form responses, generated Plan action');
 // Same context, same URL, same localStorage key. Only the served code changes.
 version='feature';await page.reload();await page.locator('[data-a="continue"]').click();
 const after=await page.evaluate(()=>({stored:localStorage.getItem(STORE),data:JSON.parse(JSON.stringify(S.r)),rows:(S.env='env-office',actualResultModel()),plan:JSON.parse(JSON.stringify(currentPlan()))}));
 assert.deepEqual(after.data,before.data);assert.deepEqual(after.rows,before.rows);assert.deepEqual(after.plan,before.plan);record('Same-origin upgrade preserves stored answers, cached calculations, P, Plan and settings');
 await dash(page);await page.screenshot({path:out+'/after-full-desktop.png',fullPage:true});await page.locator('.weather-map').screenshot({path:out+'/after-map.png'});const afterMap=await page.locator('.weather-map').evaluate(el=>({html:el.outerHTML,colors:Array.from(el.querySelectorAll('.weather-badge')).map(b=>[getComputedStyle(b).color,getComputedStyle(b).backgroundColor,getComputedStyle(b).fontSize,b.innerText])}));assert.deepEqual(afterMap,beforeMap);record('Full E/L/P map markup, icons, colors and typography match baseline');await page.setViewportSize({width:390,height:844});const featureMobileWidth=await page.evaluate(()=>document.documentElement.scrollWidth);assert.equal(featureMobileWidth,baselineMobileWidth);record('Existing narrow-screen header overflow matches baseline',{viewport:390,baseline:baselineMobileWidth,feature:featureMobileWidth});await page.setViewportSize({width:1440,height:1000});
 await page.reload();await page.locator('[data-a="continue"]').click();assert.deepEqual(await page.evaluate(()=>S.r),before.data);record('Reload preserves previous-version study');
 const backup=await download(page,async()=>{await page.locator('[data-a="backup-info"]').first().click();await page.locator('[data-a="backup-download"]').click()},'same-origin-backup.json');
 const saved=JSON.parse(fs.readFileSync(backup)).data;
 await page.locator('[data-a="restore-open"]').count().then(async n=>{if(!n)await page.evaluate(()=>{S.screen='start';S.r=null;render()})});
 await page.locator('[data-a="restore-open"]').click();await page.locator('#restore-file').setInputFiles(backup);await page.locator('[data-a="restore-backup"]').click();
 await page.locator('.study-progress').waitFor();assert.deepEqual(await page.evaluate(()=>S.r),saved);record('Actual JSON file download and restore preserve same study');
 // Feature-version CSV import through the actual picker.
 await setup(page,{E:0,L:0,empty:true});await page.locator('[data-a="upload"][data-id="env-office"]').first().click();await page.locator('#file').setInputFiles(out+'/synthetic-import.csv');await page.locator('[data-a="validate"]').click();await page.locator('[data-a="accept"]').click();assert.equal(await page.evaluate(()=>env('env-office').survey.e),40);record('Feature-version actual CSV import');
 // P-only dashboard and recommendations, using a mixed synthetic profile.
 await setup(page,{E:0,L:0,answers:{P03:'partial',P15:'no',P24:'insufficient',P31:'partial'}});await dash(page);
 assert.equal(await page.locator('.weather-table tbody tr').count(),7);assert.equal(await page.locator('.weather-table .data-quality').count(),14);
 await page.screenshot({path:out+'/p-only-desktop.png',fullPage:true});record('P-only dashboard: seven P statuses, E/L have no data');
 await page.locator('[data-a="toggle-detail"][data-m="1"]').click();await page.locator('[data-practice-code="P01"] summary').click();
 await page.locator('[data-practice-code="P01"]').screenshot({path:out+'/full-practice-verification.png'});
 const actualFull=await page.locator('[data-practice-code="P01"]').innerText();assert.match(actualFull,/Як перевірити, що практика працює/);
 await page.locator('[data-target="VERIFY:P01"]').click();
 assert.equal(await page.evaluate(()=>currentPlan().filter(x=>x.sourceTarget==='VERIFY:P01'&&!x.envId).length),1);
 await dash(page,'env-shift');await page.locator('[data-a="toggle-detail"][data-m="1"]').click();await page.locator('[data-practice-code="P01"] summary').click();assert.equal(await page.locator('[data-target="VERIFY:P01"]').count(),0);record('Manual positive-practice verification uses company Plan scope and deduplicates across environments');
 await dash(page,'env-office');await page.locator('[data-a="toggle-detail"][data-m="6"]').click();await page.locator('[data-target="M6-A1"]').click();
 assert.equal(await page.evaluate(()=>currentPlan().filter(x=>x.sourceTarget==='M6-A1'&&!x.envId).length),1);
 await dash(page,'env-shift');await page.locator('[data-a="toggle-detail"][data-m="6"]').click();assert.equal(await page.locator('[data-target="M6-A1"]').count(),0);record('P-only corrective recommendation uses company scope without duplicate per environment');
 await page.locator('[data-a="plan"]').last().click();await page.screenshot({path:out+'/p-only-plan.png',fullPage:true});
 const planfile=await download(page,()=>page.locator('[data-a="export"]').click(),'p-only-plan.xlsx');assert.ok(fs.statSync(planfile).size>1000);record('P-only Plan and actual XLSX download');
 await dash(page);const reportfile=await download(page,()=>page.locator('[data-a="report"]').click(),'p-only-report.html');
 const report=await context.newPage();await report.goto('file://'+reportfile);assert.equal(await report.locator('#checkup-verification-appendix [data-practice-code]').count(),42);
 await report.pdf({path:out+'/p-only-report.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});await report.screenshot({path:out+'/p-only-report-screen.png',fullPage:false});record('P-only actual report download, 42-practice appendix and browser PDF');
 for(const [E,L,name] of [[9,3,'insufficient'],[20,0,'E-only'],[0,10,'L-only'],[20,10,'full']]){
  await setup(page,{E,L,answers:{P03:'partial',P31:'partial'}});await dash(page);
  const rows=await page.evaluate(()=>actualResultModel());
  assert.equal(rows[0].e,E===0?'Немає даних':E<20?'Недостатня вибірка':'Ясно');assert.equal(rows[0].l,L===0?'Немає даних':L<10?'Недостатня вибірка':'Ясно');
  if(name==='insufficient'){const widths=await page.locator('.matrix-title').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));assert.ok(widths.every(w=>w>260),JSON.stringify(widths));await page.screenshot({path:out+'/insufficient-desktop.png',fullPage:true});record('Insufficient-source labels preserve readable module title width',{widths});}
  if(name==='full')await page.screenshot({path:out+'/full-study-desktop.png',fullPage:true});record(`Dashboard E=${E} L=${L}`);
 }
 await setup(page,{E:0,L:0});await dash(page);assert.equal(await page.locator('.evidence-action').count(),0);assert.equal(await page.evaluate(()=>barometerSemanticInterpretation().actions.length),0);record('All full P: no automatic corrective actions');
 await page.locator('[data-a="toggle-detail"][data-m="1"]').click();await page.locator('[data-practice-code="P01"] summary').click();
 // Change through actual questionnaire controls, then finish again.
 await page.evaluate(()=>{S.module=1;S.screen='checkup';render()});await page.locator('input[name="P01"][value="partial"]').evaluate(el=>el.closest('.practice').scrollIntoView({block:'center',behavior:'instant'}));await page.locator('input[name="P01"][value="partial"]').check();
 await page.evaluate(()=>{S.module=7;render()});await page.locator('[data-a="finish"]').click();await dash(page);await page.locator('[data-a="toggle-detail"][data-m="1"]').click();
 assert.equal(await page.locator('[data-practice-code="P01"]').getAttribute('data-practice-answer'),'partial');record('Changed P answer refreshes corresponding verification through actual form');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/p-only-mobile.png',fullPage:true});
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));record('Mobile viewport screenshot',overflow);
 // Corporate results also work before environments are added.
 await page.setViewportSize({width:1440,height:1000});await setup(page,{E:0,L:0});await page.evaluate(()=>{period().envs=[];S.env=null;S.screen='home';save();render()});
 await page.locator('[data-a="company-results"]').click();assert.equal(await page.locator('.weather-table tbody tr').count(),7);record('Company P-only results without an environment and without a saved-schema change');
 await context.setOffline(true);await page.locator('[data-a="toggle-detail"][data-m="1"]').click();assert.equal(await page.locator('[data-practice-code]').count(),42);record('Criteria available offline without external requests');
 const offline=await context.newPage();await offline.goto('file://'+repo+'/local/index.html');await offline.locator('[data-a="restore-open"]').click();await offline.locator('#restore-file').setInputFiles(backup);await offline.locator('[data-a="restore-backup"]').click();await offline.locator('.study-progress').waitFor();await offline.locator('[data-a="company-results"]').click();assert.equal(await offline.locator('.weather-table tbody tr').count(),7);record('Downloaded-style local HTML works fully offline after actual JSON restore');
 assert.deepEqual(errors,[]);record('No browser runtime errors');
 await browser.close();server.close();
})().catch(e=>{console.error(e.stack);fs.writeFileSync(out+'/browser-failure.txt',e.stack);process.exitCode=1;server.close();process.exit(1)});
