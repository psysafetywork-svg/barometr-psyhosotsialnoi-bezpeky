// Actual Playwright engines, isolated HTTP origin/profile, synthetic data only.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),os=require('os');
const {execFileSync,spawn}=require('child_process');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const repo=path.resolve(__dirname,'..'),out=process.env.BAROMETER_QA_OUTPUT||path.join(os.tmpdir(),'barometer-storage-qa');fs.mkdirSync(out,{recursive:true});
const old=execFileSync('git',['show','15eea99fcabd0a22f7615311deda281949a9e716:local/index.html'],{cwd:repo,maxBuffer:12e6}),fresh=fs.readFileSync(repo+'/local/index.html');
const checks=[],errors=[],engines={};let origin;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ready=p=>p.waitForFunction(()=>typeof StorageSafety!=='undefined'&&StorageSafety.mode==='editor');
const mode=(p,m)=>p.waitForFunction(m=>typeof StorageSafety!=='undefined'&&StorageSafety.mode===m,m);
async function open(ctx,version='new'){const p=await ctx.newPage();p.on('dialog',d=>d.accept());await p.goto(origin+'/'+version);if(version==='new')await ready(p);return p}
async function seed(p,count=12,multiple=false){return p.evaluate(({count,multiple})=>{
 const mk=(id,n)=>({id,label:'Вересень 2026',start:'2026-09-01',end:'2026-09-30',envs:[{id:id+'a',name:'Офіс QA',survey:{}},{id:id+'b',name:'Зміна QA',survey:{}}],checkup:{answers:Object.fromEntries(P_LIST.slice(0,n).map((x,i)=>[x.code,['full','partial','insufficient','no'][i%4]])),notes:{P01:'Примітка QA'},done:n===42,asOfDate:'2026-09-30',schemaVersion:CHECKUP_SCHEMA_VERSION,p40Risk:'confirmed'}});
 const r={company:'Синтетична компанія',owner:'Власниця QA',current:'p1',periods:[mk('p1',count),...(multiple?[mk('p2',27)]:[])],plan:[{id:'a1',periodId:'p1',envId:'p1a',module:M[2],action:'Дія QA',description:'Повний опис',indicator:'Показник',owner:'Особа 1',due:'2026-12-10',priority:'Високий',status:'Не розпочато'}]};
 S={r,screen:'home',env:null,module:3,modal:null,demo:false,returnResearch:null};save();render();return JSON.parse(localStorage.getItem(STORE));
 },{count,multiple})}
async function state(p){return p.evaluate(()=>({raw:localStorage.getItem(STORE),journal:localStorage.getItem(STORE+'_safety_v1'),mode:typeof StorageSafety==='undefined'?'old':StorageSafety.mode}))}
async function edit(p,code,value,field,fieldValue){return p.evaluate(({code,value,field,fieldValue})=>{if(code)period().checkup.answers[code]=value;if(field)S.r.plan[0][field]=fieldValue;let error=null;try{save()}catch(e){error=e.message}render();return {error,raw:localStorage.getItem(STORE)}},{code,value,field,fieldValue})}
async function reloadAndRead(p){await p.reload();await ready(p);await p.locator('[data-a="continue"]').click();return JSON.parse((await state(p)).raw)}
async function evidence(engine,id,name,p,before,actions,extra={}){
 const after=p?await state(p):null;const row={engine,id,name,status:'PASS',before,actions,after,...extra};checks.push(row);
 fs.writeFileSync(out+'/storage-browser-results.json',JSON.stringify({engines,checks,errors},null,2));console.log('STORAGE_PASS',engine,id,name);
}
async function recoverHead(p){
 await p.locator('[data-safety="recover"][data-version="0"]').click();await mode(p,'review');
 await p.locator('[data-safety="confirm"]').click();await ready(p);
}
async function run(engine){
 const browser=await pw[engine].launch({headless:true,args:engine==='chromium'?['--no-sandbox']:[]});engines[engine]=browser.version();
 async function scenario(id,name,fn){const ctx=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});try{await fn(ctx)}catch(e){errors.push({engine,id,name,error:String(e.stack||e)});fs.writeFileSync(out+'/storage-browser-results.json',JSON.stringify({engines,checks,errors},null,2));console.error('STORAGE_FAIL',engine,id,name,e);throw e}finally{await ctx.close()}}
 try{
 await scenario('01-09,12','New/new lifetime lock, all writes, transfer',async ctx=>{
  const a=await open(ctx);await seed(a);const before=await state(a),b=await ctx.newPage();await b.goto(origin+'/new');await mode(b,'waiting');
  assert.match(await b.locator('#storage-safety').innerText(),/Це дослідження вже відкрите в іншій вкладці/);
  const race=await Promise.all([edit(a,'P13','partial','owner','Нова відповідальна'),b.evaluate(()=>{let error;try{StorageSafety.persist(JSON.stringify({periods:[],company:'stale'}))}catch(e){error=e.message}return {error,raw:localStorage.getItem(STORE)}})]);
  assert.ok(race[1].error);assert.equal(JSON.parse((await state(a)).raw).plan[0].owner,'Нова відповідальна');
  for(const action of ['confirm-delete','backup-existing','restore-backup','save-period','save-env','save-plan'])await b.evaluate(action=>document.dispatchEvent(new CustomEvent('click',{detail:action})),action);
  await b.reload();await mode(b,'waiting');await a.close();await ready(b);await b.locator('[data-a="continue"]').click();
  await edit(b,'P14','no','indicator','Новий показник');const r=await reloadAndRead(b);assert.equal(r.periods[0].checkup.answers.P13,'partial');assert.equal(r.periods[0].checkup.answers.P14,'no');assert.equal(r.plan[0].owner,'Нова відповідальна');assert.equal(r.plan[0].indicator,'Новий показник');
  await b.screenshot({path:out+'/'+engine+'-transferred.png',fullPage:true});
  for(const id of [1,5,6,7,8,9,12])await evidence(engine,id,'Exclusive editing and fresh handover',b,before,'A saves P13 and owner; B cannot write, reloads; close A; B saves P14 and indicator; reload and compare',{attempted:race});
 });
 await scenario(4,'Near-simultaneous opens',async ctx=>{
  const a=await ctx.newPage(),b=await ctx.newPage();await Promise.all([a.goto(origin+'/new'),b.goto(origin+'/new')]);
  await a.waitForFunction(()=>['editor','waiting'].includes(StorageSafety.mode));await b.waitForFunction(()=>['editor','waiting'].includes(StorageSafety.mode));
  const roles=await Promise.all([a.evaluate(()=>StorageSafety.mode),b.evaluate(()=>StorageSafety.mode)]);assert.deepEqual([...roles].sort(),['editor','waiting']);const active=roles[0]==='editor'?a:b;await seed(active);const expected=(await state(active)).raw;await active.reload();await sleep(200);const rolesAfter=await Promise.all([a.evaluate(()=>StorageSafety.mode),b.evaluate(()=>StorageSafety.mode)]);assert.equal(rolesAfter.filter(x=>x==='editor').length,1);assert.equal((await state(a)).raw,expected);await evidence(engine,4,'Exactly one writer under simultaneous startup',a,null,'Parallel navigation, lock inspection, seed and reload',{roles,rolesAfter});
 });
 await scenario('02,13,31,32','Old/new repeated writes and UI recovery',async ctx=>{
  const oldPage=await open(ctx,'old');await seed(oldPage,42,true);const a=await open(ctx);await a.locator('[data-a="continue"]').click();
  await edit(a,'P13','partial','owner','Захищена відповідальна');const protectedRaw=(await state(a)).raw;
  await edit(oldPage,'P14','no','indicator','Стара версія');await mode(a,'conflict');
  assert.equal(JSON.parse((await state(a)).journal).head.raw,protectedRaw);await a.screenshot({path:out+'/'+engine+'-conflict.png',fullPage:true});
  for(let i=0;i<3;i++)await edit(oldPage,'P14','no','due','old-'+i);
  await mode(a,'conflict');await oldPage.close();await a.reload();await mode(a,'conflict');
  const before=await state(a);await recoverHead(a);assert.equal((await state(a)).raw,protectedRaw);const r=await reloadAndRead(a);assert.deepEqual(r,JSON.parse(protectedRaw));
  assert.ok(JSON.parse((await state(a)).journal).versions.length>=2);
  await a.screenshot({path:out+'/'+engine+'-recovered.png',fullPage:true});
  for(const id of [2,13,31,32])await evidence(engine,id,'Full protected state survives old tab and explicit recovery',a,before,'Old production page writes repeatedly; protected full snapshot retained; close old; reload; choose version 0 and confirm; reload equality',{protectedRaw,recovered:r});
 });
 await scenario(3,'Old/old reproduces control defect',async ctx=>{
  const a=await open(ctx,'old');await seed(a);const b=await open(ctx,'old');await b.locator('[data-a="continue"]').click();await edit(a,'P13','partial','owner','Нова');const before=await state(a);await edit(b,'P14','no');const r=JSON.parse((await state(a)).raw);assert.equal(r.periods[0].checkup.answers.P13,undefined);assert.equal(r.plan[0].owner,'Особа 1');await evidence(engine,3,'Control reproduces STORAGE-STALE-TAB',b,before,'Two actual old pages: A writes P13/owner, stale B writes P14',{expectedControlDefect:true});
 });
 for(const count of [12,27,42])await scenario(14+([12,27,42].indexOf(count)),'Partial and complete state '+count,async ctx=>{
  const p=await open(ctx);const expected=await seed(p,count,true),before=await state(p);const actual=await reloadAndRead(p);assert.deepEqual(actual,expected);await evidence(engine,14+([12,27,42].indexOf(count)),'All fields preserved '+count+'/42',p,before,'Seed two periods and environments, reload, compare entire payload');
 });
 await scenario('17-24','EL/import/export/backup/autosave integrity',async ctx=>{
  const p=await open(ctx);await seed(p,42,true);
  const tables=await p.evaluate(()=>{const table=[[ROLE_QUESTION,...SURVEY_ITEMS.map(x=>x.code+' '+x.text)],...Array.from({length:30},(_,i)=>[i<12?'Так':'Ні',...SURVEY_ITEMS.map(x=>x.source==='E'||i<12?'5':'')])];return {csv:table.map(x=>x.join('\t')).join('\n'),xlsx:Array.from(planXlsxBytes(table))}});
  for(const type of ['csv','xlsx']){
   await p.locator('[data-a="upload"][data-id="p1a"]').first().click();await p.locator('#file').setInputFiles({name:'synthetic.'+type,mimeType:'application/octet-stream',buffer:type==='csv'?Buffer.from(tables.csv):Buffer.from(tables.xlsx)});await p.locator('[data-a="validate"]').click();await p.locator('[data-a="accept"]').click();
  }
  await p.evaluate(()=>{for(let i=0;i<50;i++){period().checkup.notes.P01='Швидкий запис '+i;save()}S.screen='plan';render()});
  for(const [field,value] of Object.entries({action:'Нова назва',description:'Новий повний опис',owner:'Відповідальна QA',due:'2026-12-01',indicator:'Новий критерій'}))await p.locator('[data-f="'+field+'"]').first().fill(value);
  await p.locator('[data-f="priority"]').first().selectOption('Середній');await p.locator('[data-f="status"]').first().selectOption('У роботі');await p.locator('[data-f="envId"]').first().selectOption('p1b');
  const expected=await p.evaluate(()=>JSON.parse(JSON.stringify(S.r)));assert.equal(expected.periods[0].envs[0].survey.e,30);assert.equal(expected.periods[0].envs[0].survey.l,12);
  const xlsxEvent=p.waitForEvent('download');await p.locator('[data-a="export"]').click();const xd=await xlsxEvent;await xd.saveAs(out+'/'+engine+'-plan.xlsx');
  await p.locator('[data-a="backup-info"]').first().click();const event=p.waitForEvent('download');await p.locator('[data-a="backup-download"]').click();const d=await event;const file=out+'/'+engine+'-backup.json';await d.saveAs(file);const backup=JSON.parse(fs.readFileSync(file)).data;
  await p.evaluate(()=>{S.r=null;S.screen='start';render()});await p.locator('[data-a="restore-open"]').click();await p.locator('#restore-file').setInputFiles(file);await p.locator('[data-a="restore-backup"]').click();assert.deepEqual(await reloadAndRead(p),backup);
  const before=await state(p);await p.evaluate(()=>{S.r.current='p2';save();S.r.current='p1';save()});assert.equal((await state(p)).raw,before.raw);
  for(const id of [17,18,19,20,21,22,23,24])await evidence(engine,id,'EL, periods, Plan, backup and rapid writes intact',p,before,'Real CSV and XLSX import; edit all Plan fields; 50 saves; actual XLSX/JSON download; JSON restore; switch periods; full reload equality',{expected:backup});
 });
 await scenario(25,'Missing Web Locks fails closed',async ctx=>{
  const oldPage=await open(ctx,'old');await seed(oldPage);const before=await state(oldPage);await oldPage.close();await ctx.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));const p=await ctx.newPage();await p.goto(origin+'/new');await mode(p,'error');assert.equal((await state(p)).raw,before.raw);assert.equal((await state(p)).journal,null);await p.reload();await mode(p,'error');assert.equal((await state(p)).raw,before.raw);await evidence(engine,25,'Unsupported browser cannot change data',p,before,'Remove Web Locks before boot; verify primary and no journal; reload');
 });
 await scenario(26,'Unavailable independent store or IndexedDB',async ctx=>{
  await ctx.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Denied','SecurityError')}}));const p=await open(ctx);await seed(p);const before=await state(p);await p.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.endsWith('_safety_v1'))throw new DOMException('Denied','SecurityError');return original.call(this,k,v)}});await edit(p,'P13','full');await mode(p,'error');assert.equal((await state(p)).raw,before.raw);assert.equal((await state(p)).journal,before.journal);await p.reload();await ready(p);assert.equal((await state(p)).raw,before.raw);await evidence(engine,26,'No IndexedDB dependency; auxiliary failure blocks writer',p,before,'IndexedDB disabled; then deny journal write; confirm no primary change; reload');
 });
 for(const phase of ['prepare','mirror','confirm'])await scenario(phase==='prepare'?27:28,'Write interruption '+phase,async ctx=>{
  const p=await open(ctx);await seed(p);const before=await state(p);
  await p.evaluate(phase=>{const original=Storage.prototype.setItem;let journalWrites=0;Storage.prototype.setItem=function(k,v){if(k===STORE+'_safety_v1')journalWrites++;if((phase==='prepare'&&k===STORE+'_safety_v1')||(phase==='mirror'&&k===STORE)||(phase==='confirm'&&k===STORE+'_safety_v1'&&journalWrites===2))throw new DOMException('QA interruption','QuotaExceededError');return original.call(this,k,v)}},phase);
  await edit(p,'P13','full','owner','Нова збережена');await mode(p,'error');const interrupted=await state(p);
  if(phase==='prepare'){assert.equal(interrupted.raw,before.raw);assert.equal(interrupted.journal,before.journal);await p.reload();await ready(p)}else{const head=JSON.parse(interrupted.journal).head.raw;assert.equal(JSON.parse(head).periods[0].checkup.answers.P13,'full');await p.reload();await mode(p,'conflict');await recoverHead(p);assert.equal((await state(p)).raw,head);await reloadAndRead(p)}
  await evidence(engine,phase==='prepare'?27:28,'Interruption detected '+phase,p,before,'Inject real Storage.setItem failure in selected phase; reload; explicit recovery if pending',{interrupted});
 });
 await scenario(29,'Cached old code is legacy writer',async ctx=>{
  const p=await open(ctx,'cached-old');await seed(p);const a=await open(ctx);await a.locator('[data-a="continue"]').click();await edit(a,'P13','partial');const protectedRaw=(await state(a)).raw;await edit(p,'P14','no');await mode(a,'conflict');assert.equal(JSON.parse((await state(a)).journal).head.raw,protectedRaw);await evidence(engine,29,'Stale cached page cannot destroy protected copy',a,null,'Serve cacheable exact production code; open fresh code on same origin; stale write',{cacheControl:'public, max-age=600',protectedRaw});
 });
 await scenario(30,'Actual autonomous HTML',async ctx=>{
  const p=await ctx.newPage();p.on('dialog',d=>d.accept());await p.goto('file://'+repo+'/local/index.html');await p.waitForFunction(()=>['editor','error'].includes(StorageSafety.mode));const before=await state(p);
  if(before.mode==='editor'){const r=await seed(p,27);assert.deepEqual(await reloadAndRead(p),r);await evidence(engine,30,'Autonomous file persistence and reload',p,before,'Load actual file URL; seed 27/42; reload and full comparison')}
  else{assert.match(await p.locator('#storage-safety').innerText(),/недоступне|сховищ|заблоковано|доступ|denied/i);await evidence(engine,30,'Autonomous environment fails closed',p,before,'Actual file URL lacks supported storage or lock; no edit permitted',{limitation:true})}
 });
 }finally{await browser.close()}
 // Real browser restart with the same on-disk profile, not storageState emulation.
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'barometer-'+engine+'-'));
 let persistent=await pw[engine].launchPersistentContext(profile,{headless:true,args:engine==='chromium'?['--no-sandbox']:[]});let p=await open(persistent);await seed(p,42,true);const expected=(await state(p)).raw;await persistent.close();persistent=await pw[engine].launchPersistentContext(profile,{headless:true,args:engine==='chromium'?['--no-sandbox']:[]});p=await open(persistent);assert.equal((await state(p)).raw,expected);await evidence(engine,11,'Browser process restart preserves full state',p,{raw:expected},'Close browser; relaunch same actual profile; compare raw');await persistent.close();
 // Abruptly kill worker and browser process group immediately after acknowledged save.
 const crashProfile=fs.mkdtempSync(path.join(os.tmpdir(),'barometer-crash-'+engine+'-'));
 const child=spawn(process.execPath,[__filename,'crash-worker',engine,crashProfile,origin],{detached:true,stdio:['ignore','pipe','pipe'],env:process.env});
 let output='';const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Crash worker timeout '+output)),45000);child.stdout.on('data',b=>{output+=b.toString();const line=output.split('\n').find(x=>x.startsWith('ACK '));if(line){clearTimeout(timer);resolve(JSON.parse(line.slice(4)))}});child.stderr.on('data',b=>output+=b.toString());child.on('exit',code=>{if(code)reject(new Error('Crash worker exited '+output))})});
 for(const pid of result.browserPids){try{process.kill(-pid,'SIGKILL')}catch{try{process.kill(pid,'SIGKILL')}catch{}}}
 process.kill(-child.pid,'SIGKILL');await new Promise(resolve=>child.once('exit',resolve));
 persistent=await pw[engine].launchPersistentContext(crashProfile,{headless:true,args:engine==='chromium'?['--no-sandbox']:[]});p=await open(persistent);assert.equal((await state(p)).raw,result.raw,'Immediate process crash must retain confirmed state');await evidence(engine,10,'Immediate process-group crash after save',p,result,'SIGKILL worker and browser immediately after ACK; relaunch same actual profile; compare all bytes');await persistent.close();
}
(async()=>{
 if(process.argv[2]==='crash-worker'){
  const engine=process.argv[3];origin=process.argv[5];const ctx=await pw[engine].launchPersistentContext(process.argv[4],{headless:true,args:engine==='chromium'?['--no-sandbox']:[]});const p=await open(ctx);await seed(p,42,true);const browserPids=execFileSync('ps',['-eo','pid,ppid'],{encoding:'utf8'}).trim().split('\n').slice(1).map(x=>x.trim().split(/\s+/).map(Number)).filter(x=>x[1]===process.pid).map(x=>x[0]);console.log('ACK '+JSON.stringify({...await state(p),browserPids}));await new Promise(()=>{});return;
 }
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.setHeader('Cache-Control',req.url==='/cached-old'?'public, max-age=600':'no-store');res.end(req.url==='/old'||req.url==='/cached-old'?old:fresh)});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 try{for(const engine of ['chromium','firefox','webkit']){try{await run(engine)}catch(e){errors.push({engine,error:String(e.stack||e)});console.error(e)}}}finally{server.close();fs.writeFileSync(out+'/storage-browser-results.json',JSON.stringify({engines,checks,errors},null,2));}
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
