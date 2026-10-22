const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto'),{execFileSync}=require('child_process');
const playwright=require('playwright'),repo=path.resolve(__dirname,'..'),out=process.env.BAROMETER_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});const baseline=execFileSync('git',['show','15eea99fcabd0a22f7615311deda281949a9e716:local/index.html'],{cwd:repo,maxBuffer:12*1024*1024}).toString(),feature=fs.readFileSync(repo+'/local/index.html','utf8');
let version='baseline';const requests=[],checks=[],risks=[],engines={},errors=[];let baseUrl;
const flush=()=>fs.writeFileSync(out+'/release-gate-browser.json',JSON.stringify({engines,checks,risks,errors},null,2));
const record=(engine,name,status='PASS',data={})=>{checks.push({engine,name,status,...data});flush();console.log('GATE_BROWSER_CHECK '+JSON.stringify(checks.at(-1)));};
const server=http.createServer((req,res)=>{
 const cache=req.url.startsWith('/cache/'),body=req.url.includes('local/index.html')?(version==='baseline'?baseline:feature):fs.readFileSync(repo+'/index.html','utf8'),etag='"'+crypto.createHash('sha256').update(body).digest('hex')+'"';
 requests.push({path:req.url,version,ifNoneMatch:req.headers['if-none-match']||null});res.setHeader('Content-Type','text/html;charset=utf-8');res.setHeader('ETag',etag);res.setHeader('Cache-Control',cache?'public, max-age=600':'no-cache');
 if(req.headers['if-none-match']===etag){res.statusCode=304;res.end();return;}res.end(body);
});
const url=()=>baseUrl+'/barometr-psyhosotsialnoi-bezpeky/local/index.html';
async function seed(page,{count=42,done=false,edited=false,multiple=false,legacy=false}={}){
 return page.evaluate(({count,done,edited,multiple,legacy})=>{
  const cp={answers:Object.fromEntries(P_LIST.slice(0,count).map((p,i)=>[p.code,['full','partial','insufficient','no'][i%4]])),notes:{P01:'Синтетична примітка 01',P12:'Синтетична примітка 12'},done,asOfDate:'2026-09-30',schemaVersion:CHECKUP_SCHEMA_VERSION,p40Risk:count===42?'confirmed':null,p40ApplicabilityByEnvironment:count===42?{'env-one':'confirmed','env-two':'not_confirmed'}:{}};
  const envs=[{id:'env-one',name:'Синтетичний офіс',emp:120,man:12,invE:80,invL:10,survey:{}},{id:'env-two',name:'Синтетична зміна',emp:70,man:6,invE:50,invL:6,survey:{}}];
  const r={company:'Синтетична компанія release-gate',owner:'Синтетична власниця QA',current:'period-one',periods:[{id:'period-one',label:'Вересень 2026',start:'2026-09-01',end:'2026-09-30',envs:multiple?envs:envs.slice(0,1),checkup:cp}],plan:[]};
  if(multiple)r.periods.push({id:'period-old',label:'Серпень 2026',start:'2026-08-01',end:'2026-08-31',envs:[{id:'env-old',name:'Попередній період QA',survey:{}}],checkup:{answers:{P01:'full'},notes:{P01:'Попередня примітка'},done:false,schemaVersion:CHECKUP_SCHEMA_VERSION}});
  if(edited||legacy)r.plan=[{id:'plan-qa-one',periodId:'period-one',envId:'env-one',module:M[0],aspect:'QA аспект',sourceTarget:legacy?'CRITERION:P03-C2':'M1-A2',action:'Власна назва синтетичної дії',description:'Авторські кроки QA\nДругий крок',indicator:'Авторський критерій результату',priority:'Високий',status:'У роботі',owner:'Синтетична відповідальна',due:'2026-12-01'}];
  S={screen:'home',r,env:'env-one',module:1,modal:null,demo:false,returnResearch:null};if(done)cp.results=calculatePResults(cp);save();render();return JSON.parse(JSON.stringify(S.r));
 },{count,done,edited,multiple,legacy});
}
async function continuing(page){await page.locator('[data-a="continue"]').first().click();}
async function download(page,click,name){const p=page.waitForEvent('download');p.catch(()=>{});await click();const d=await p;await d.saveAs(out+'/'+name);return out+'/'+name;}
async function restore(page,file){await page.evaluate(()=>{S.r=null;S.screen='start';S.modal=null;render()});await page.locator('[data-a="restore-open"]').click();await page.locator('#restore-file').setInputFiles(file);await page.locator('[data-a="restore-backup"]').click();await page.locator('.study-progress').waitFor();}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));baseUrl='http://127.0.0.1:'+server.address().port;
 for(const engine of ['chromium','firefox','webkit']){
  const browser=await playwright[engine].launch({headless:true});engines[engine]=browser.version();
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
  context.on('page',p=>{p.on('pageerror',e=>{errors.push({engine,error:String(e)});flush()});p.on('dialog',d=>d.accept())});
  const page=await context.newPage();
  for(const [name,options] of [
   ['partial-12',{count:12}],['partial-27',{count:27}],['completed',{count:42,done:true}],['partial-with-imported-EL',{count:27,imported:true}],
   ['edited-plan',{count:42,done:true,edited:true}],['multiple-environments',{count:27,multiple:true}],['legacy-plan',{count:42,done:true,legacy:true,multiple:true}]
  ]){
   version='baseline';await page.goto(url());let before=await seed(page,options);
   if(options.imported){
    const bytes=await page.evaluate(()=>Array.from(planXlsxBytes([[ROLE_QUESTION,...SURVEY_ITEMS.map(x=>x.code+' '+x.text)],...Array.from({length:30},(_,i)=>[i<10?'Так':'Ні',...SURVEY_ITEMS.map(x=>x.source==='E'||i<10?'5':'')])])));const file=out+'/'+engine+'-import.xlsx';fs.writeFileSync(file,Buffer.from(bytes));
    await page.locator('[data-a="upload"][data-id="env-one"]').first().click();await page.locator('#file').setInputFiles(file);await page.locator('[data-a="validate"]').click();await page.locator('[data-a="accept"]').click();
    assert.equal(await page.evaluate(()=>env('env-one').survey.e),30);assert.equal(await page.evaluate(()=>env('env-one').survey.l),10);before=await page.evaluate(()=>JSON.parse(JSON.stringify(S.r)));
   }
   const storedBefore=await page.evaluate(()=>localStorage.getItem(STORE));version='feature';
   await page.reload();await continuing(page);
   assert.deepEqual(await page.evaluate(()=>S.r),before);assert.equal(await page.evaluate(()=>localStorage.getItem(STORE)),storedBefore);
   assert.equal(await page.evaluate(()=>Object.keys(period().checkup.answers).length),options.count);
   record(engine,name+': production-to-feature exact state and localStorage preservation');
   await page.reload();await continuing(page);assert.deepEqual(await page.evaluate(()=>S.r),before);record(engine,name+': reload preserves all fields');
   await page.evaluate(()=>{S.screen='home';render()});
   const backup=await download(page,async()=>{await page.locator('[data-a="backup-info"]').first().click();await page.locator('[data-a="backup-download"]').click()},engine+'-'+name+'-backup.json');
   const payload=JSON.parse(fs.readFileSync(backup,'utf8'));assert.equal(payload.format,'barometr-backup');
   await restore(page,backup);assert.deepEqual(await page.evaluate(()=>S.r),payload.data);
   assert.equal(await page.evaluate(()=>Object.keys(period().checkup.answers).length),options.count);record(engine,name+': actual JSON download and restore exact equality');
   fs.writeFileSync(out+'/'+engine+'-'+name+'-before-after.json',JSON.stringify({before,after:await page.evaluate(()=>S.r),backupAddsLastBackupAt:true},null,2));
   if(options.edited||options.legacy){
    await page.evaluate(()=>{S.screen='plan';render()});await download(page,()=>page.locator('[data-a="export"]').click(),engine+'-'+name+'-plan.xlsx');record(engine,name+': actual XLSX export with preserved edited or legacy action');
   }
  }
  // A stale writer can replace the entire latest document. Reproduce both the pre-existing and mixed-version hazard.
  for(const [firstVersion,secondVersion,label] of [['baseline','baseline','production-production'],['feature','feature','feature-feature'],['baseline','feature','production-feature']]){
   version=firstVersion;await page.goto(url());await seed(page,{count:12,edited:true});
   const old=page;version=secondVersion;const newer=await context.newPage();await newer.goto(url());await continuing(newer);
   await newer.evaluate(()=>{S.screen='checkup';S.module=3;render()});await newer.locator('input[name="P13"][value="partial"]').check();
   await newer.evaluate(()=>{S.screen='plan';render()});await newer.locator('.plan-card').first().locator('[data-f="owner"]').fill('НОВИЙ СИНТЕТИЧНИЙ ВІДПОВІДАЛЬНИЙ');await newer.locator('.plan-card').first().locator('[data-f="owner"]').press('Tab');
   const latest=await newer.evaluate(()=>JSON.parse(localStorage.getItem(STORE)));assert.equal(latest.periods[0].checkup.answers.P13,'partial');assert.equal(latest.plan[0].owner,'НОВИЙ СИНТЕТИЧНИЙ ВІДПОВІДАЛЬНИЙ');
   await old.evaluate(()=>{S.screen='checkup';S.module=3;render()});await old.locator('input[name="P14"][value="no"]').check();
   const overwritten=await old.evaluate(()=>JSON.parse(localStorage.getItem(STORE)));
   assert.equal(overwritten.periods[0].checkup.answers.P13,undefined);assert.equal(overwritten.periods[0].checkup.answers.P14,'no');assert.notEqual(overwritten.plan[0].owner,latest.plan[0].owner);
   const issue={id:'STORAGE-STALE-TAB',engine,versions:label,severity:'BLOCKER',lostAnswer:'P13',lostEditedPlanField:'owner',beforeAnswers:latest.periods[0].checkup.answers,afterAnswers:overwritten.periods[0].checkup.answers};
   risks.push(issue);record(engine,'Concurrent '+label+': stale save loses newer answer and edited Plan field','BLOCKED',issue);
   fs.writeFileSync(out+'/'+engine+'-'+label+'-overwrite-proof.json',JSON.stringify({latest,overwritten,issue},null,2));
   if(engine==='chromium'&&label==='production-feature')await old.screenshot({path:out+'/concurrent-stale-tab.png',fullPage:true});
   await newer.close();
  }
  // Existing open page stays the same executable document while the server switches versions.
  version='baseline';await page.goto(url());await seed(page,{count:12});
  await page.evaluate(()=>{S.screen='checkup';S.module=3;render()});
  const navBefore=await page.evaluate(()=>performance.getEntriesByType('navigation').length);version='feature';
  await page.locator('input[name="P13"][value="full"]').check();await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(()=>typeof BAROMETER_P_ACTION_LIBRARY),'undefined');assert.equal(await page.evaluate(()=>period().checkup.answers.P13),'full');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation').length),navBefore);record(engine,'Server update does not force reload or interrupt actual answer entry');
  const stateAtUpdate=await page.evaluate(()=>JSON.parse(JSON.stringify(S.r)));await page.reload();await continuing(page);assert.deepEqual(await page.evaluate(()=>S.r),stateAtUpdate);record(engine,'Next explicit reload fetches feature at identical origin and preserves entered answer');
  const cacheContext=await browser.newContext(),cachePage=await cacheContext.newPage();version='baseline';const cacheUrl=baseUrl+'/cache/local/index.html';await cachePage.goto(cacheUrl);await seed(cachePage,{count:12});const cachedState=await cachePage.evaluate(()=>JSON.parse(JSON.stringify(S.r)));
  version='feature';const cachedSecond=await cacheContext.newPage();await cachedSecond.goto(cacheUrl);const versionBeforeReload=await cachedSecond.evaluate(()=>typeof BAROMETER_P_ACTION_LIBRARY);await cachedSecond.reload();await continuing(cachedSecond);
  assert.equal(await cachedSecond.evaluate(()=>typeof BAROMETER_P_ACTION_LIBRARY),'object');assert.deepEqual(await cachedSecond.evaluate(()=>S.r),cachedState);
  record(engine,'Cache lifetime model: next open and ETag revalidation preserve state','PASS',{serverCacheControl:'public, max-age=600',versionBeforeExplicitReload:versionBeforeReload,requests:requests.filter(x=>x.path==='/cache/local/index.html')});await cacheContext.close();
  // A downloaded independent file cannot be updated by changing the HTTP deployment.
  const standalone=out+'/standalone-production.html';fs.writeFileSync(standalone,baseline);const hash=crypto.createHash('sha256').update(fs.readFileSync(standalone)).digest('hex');
  const offlineContext=await browser.newContext();await offlineContext.setOffline(true);const offline=await offlineContext.newPage();await offline.goto('file://'+standalone);
  assert.equal(await offline.evaluate(()=>typeof BAROMETER_P_ACTION_LIBRARY),'undefined');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(standalone)).digest('hex'),hash);
  record(engine,'Offline production HTML remains unchanged after HTTP feature update','PASS',{sha256:hash});await offlineContext.close();
  await context.close();await browser.close();
 }
 // Live production is only read in a clean synthetic-free context. No deployment is performed.
 const liveBrowser=await playwright.chromium.launch({headless:true}),liveContext=await liveBrowser.newContext(),livePage=await liveContext.newPage();
 const publicUrl='https://psysafetywork-svg.github.io/barometr-psyhosotsialnoi-bezpeky/';
 try{
  const response=await livePage.goto(publicUrl,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(response.status(),200);
  const href=await livePage.locator('#localPortalButton').getAttribute('href'),target=new URL(href,livePage.url());assert.equal(target.origin,new URL(publicUrl).origin);assert.ok(target.pathname.endsWith('/local/index.html'));
  const popupPromise=liveContext.waitForEvent('page');await livePage.locator('#localPortalButton').click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
  assert.equal(new URL(popup.url()).origin,new URL(publicUrl).origin);assert.ok(popup.url().endsWith('/local/index.html'));
  const liveHeaders=await response.allHeaders(),localResponse=await liveContext.request.get(target.href),localHeaders=localResponse.headers();assert.equal(localResponse.status(),200);
  const conditional=localHeaders.etag?await liveContext.request.get(target.href,{headers:{'If-None-Match':localHeaders.etag}}):null;
  record('live-chromium','Actual public URL, local link, same origin and current HTTP cache headers','PASS',{publicUrl,localUrl:popup.url(),publicCacheControl:liveHeaders['cache-control'],localCacheControl:localHeaders['cache-control'],etag:localHeaders.etag,conditionalStatus:conditional?.status(),productionOnly:true});
 }catch(e){record('live-chromium','Live read-only online checks','NOT_VERIFIED',{error:String(e)});}
 await liveContext.close();await liveBrowser.close();
 assert.deepEqual(errors,[]);flush();console.log('GATE_BROWSER_RESULTS '+JSON.stringify({engines,checks:checks.length,pass:checks.filter(x=>x.status==='PASS').length,blocked:checks.filter(x=>x.status==='BLOCKED').length,notVerified:checks.filter(x=>x.status==='NOT_VERIFIED'),risks:risks.length,errors}));
 server.close();
})().catch(e=>{console.error(e.stack);flush();fs.writeFileSync(out+'/release-gate-browser-failure.txt',e.stack);server.close();process.exit(1)});
