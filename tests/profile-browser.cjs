const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'qa/profile-v45/review'),results=[];
const browserPath=process.env.BAROMETER_BROWSER;
(async()=>{
const browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(d.type()==='confirm')await d.accept();else{errors.push('dialog: '+d.message());await d.dismiss()}});
await page.goto('file://'+path.join(root,'local/index.html'));
const click=async a=>page.locator(`[data-a="${a}"]`).first().click();
await click('new');await page.locator('#company').fill('ДЕМОНСТРАЦІЙНІ ДАНІ. Перевірка порталу');await page.locator('#owner').fill('Демонстраційний запис');await page.locator('#ps').fill('2026-10-01');await page.locator('#pe').fill('2026-10-26');await page.locator('#setup button[type=submit]').click();await page.locator('#fen').fill('Демонстраційне робоче середовище');await page.locator('#first-env button').click();
for(const ext of ['csv','xlsx']){await click('upload');await page.locator('#file').setInputFiles(path.join(dir,'survey.'+ext));await click('validate');await page.locator('[data-a=accept]').waitFor();assert.match(await page.locator('.success-box').innerText(),/100.*20/s);await click('accept');results.push({test:'UI import '+ext,result:'PASS'});}
await click('checkup');for(let m=1;m<=7;m++){for(let i=(m-1)*6+1;i<=m*6;i++){const c='P'+String(i).padStart(2,'0');await page.locator(`input[name="${c}"][value="${m===2?'partial':'full'}"]`).press('Space');}if(m===1)await page.locator('#checkup-date').fill('2026-10-26');if(m<7)await click('next');}
// Preserve P40 applicability when changing between no and partial.
await page.locator('input[name=P40][value=no]').press('Space');await page.locator('input[name=p40Risk][value=confirmed]').press('Space');await page.locator('input[data-p40-env][value=confirmed]').press('Space');await page.locator('input[name=P40][value=partial]').press('Space');assert.equal(await page.locator('input[data-p40-env][value=confirmed]').isChecked(),true);await page.locator('input[name=P40][value=full]').press('Space');
await click('finish');results.push({test:'UI complete 42 practices and P40 transition',result:'PASS'});
await click('home');await click('dash');assert.equal(await page.locator('.profile-v45-module').count(),7);
await page.locator('[data-a=add-routed-action][data-m="2"]').first().click();await click('plan');const card=page.locator('[data-p]').first();await card.locator('[data-f=description]').fill('Користувацьке уточнення: погодити конкретні кроки з командою.');await card.locator('[data-f=owner]').fill('Відповідальний за демонстрацію');await card.locator('[data-f=due]').fill('2026-12-01');await card.locator('[data-f=status]').selectOption('У роботі');await card.locator('[data-f=description]').blur();
let dl=page.waitForEvent('download');await click('export');await(await dl).saveAs(path.join(dir,'edited-plan.xlsx'));
dl=page.waitForEvent('download');await click('report');await(await dl).saveAs(path.join(dir,'ui-generated-report.html'));
await click('home');await click('backup-info');dl=page.waitForEvent('download');await click('backup-download');await(await dl).saveAs(path.join(dir,'ui-backup.json'));
// Restore through the landing screen, then verify persistent user fields.
await page.evaluate(()=>{localStorage.clear();S={screen:'start',r:null,env:null,module:1,modal:null,demo:false};render()});await click('restore-open');await page.locator('#restore-file').setInputFiles(path.join(dir,'ui-backup.json'));await click('restore-backup');await click('plan');assert.equal(await page.locator('[data-f=description]').first().inputValue(),'Користувацьке уточнення: погодити конкретні кроки з командою.');assert.equal(await page.locator('[data-f=owner]').first().inputValue(),'Відповідальний за демонстрацію');assert.equal(await page.locator('[data-f=due]').first().inputValue(),'2026-12-01');assert.equal(await page.locator('[data-f=status]').first().inputValue(),'У роботі');
await click('home');await click('dash');assert.equal(await page.locator('[data-a=add-routed-action][data-target="M2-A1"]').count(),0);
results.push({test:'UI Plan add/edit/XLSX/report/backup/restore and no duplicate or overwrite',result:'PASS'});
// Two periods with different profiles: switching does not mutate either imported dataset.
await page.evaluate(()=>{const older=JSON.parse(JSON.stringify(S.r.periods[0]));older.id='older-review';older.label='Попередній демонстраційний період';S.r.periods.unshift(older);save()});await click('home');const before=await page.evaluate(()=>JSON.stringify(S.r.periods.map(p=>p.envs[0].survey.results)));await page.locator('[data-a=switch-period][data-id=older-review]').click();await click('dash');await click('home');await page.locator('[data-a=switch-period]').last().click();const after=await page.evaluate(()=>JSON.stringify(S.r.periods.map(p=>p.envs[0].survey.results)));assert.equal(before,after);results.push({test:'UI existing two-period study switching preserves source data',result:'PASS'});
fs.writeFileSync(path.join(dir,'browser-ui-results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(dir,'ui-state.json'),JSON.stringify(await page.evaluate(()=>S.r),null,2));
for(const scenario of ['favorable','discrepancy','six_gaps','insufficient','module2_sample']){
 const research=JSON.parse(fs.readFileSync(path.join(dir,scenario+'.json')));
 // Direct fixture loading is used only for visual matrix, separately from the full UI journey.
 await page.evaluate(r=>{S={screen:'dash',r,env:r.periods[0].envs[0].id,module:1,modal:null,demo:false};render()},research);
 const visual={scenario,modules:[]};
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  const range=scenario==='module2_sample'?[2]:[1,2,3,4,5,6,7];
  for(const m of range){const loc=page.locator('#matrix-'+m);await loc.screenshot({style:'.topbar{visibility:hidden}',path:path.join(dir,`${scenario}-m${m}-${width}.png`)});const facts=await loc.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,sections:el.querySelectorAll('.profile-v45-card').length,font:getComputedStyle(el).fontFamily,color:getComputedStyle(el).color}));assert.ok(facts.scrollWidth<=facts.width+1,scenario+' module overflow '+m);assert.equal(facts.sections,4);assert.match(facts.font,/DejaVu Sans/);assert.equal(facts.color,'rgb(57, 70, 73)');visual.modules.push({m,width,...facts});}
 }
 const report=await page.evaluate(()=>buildReportHtml(env(S.env)));fs.writeFileSync(path.join(dir,scenario+'.html'),report);
 const doc=await page.context().newPage();await doc.setViewportSize({width:1100,height:1000});await doc.setContent(report,{waitUntil:'load'});await doc.evaluate(()=>document.fonts.ready);await doc.emulateMedia({media:'print'});
 const fonts=await doc.locator('.report-title,.summary-table,.profile-v45-card,.meta-box').evaluateAll(els=>els.map(el=>({tag:el.className,font:getComputedStyle(el).fontFamily,color:getComputedStyle(el).color})));
 for(const f of fonts)assert.match(f.font,/DejaVu Sans/);
 await doc.pdf({path:path.join(dir,scenario+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});await doc.close();results.push({test:'Visual matrix and PDF '+scenario,result:'PASS',...visual,fonts});
}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({checks:results.length,screenshots:58,pdfs:5,pageErrors:errors}));await browser.close();
})().catch(e=>{fs.writeFileSync(path.join(dir,'browser-error.txt'),e.stack);console.error(e);process.exit(1)});
