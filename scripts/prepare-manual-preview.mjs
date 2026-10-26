import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),out=process.argv[2];
if(!out||!path.isAbsolute(out))throw new Error('Provide an absolute static output directory');
fs.mkdirSync(path.join(out,'fixtures'),{recursive:true});
const review=path.join(root,'qa/profile-v45/review'),cases={};
for(const name of ['module2_sample','six_gaps','discrepancy','favorable','insufficient']){
 cases[name]=JSON.parse(fs.readFileSync(path.join(review,name+'.json')));
 fs.writeFileSync(path.join(out,'fixtures',name+'.json'),JSON.stringify({format:'barometr-backup',version:'r43',data:cases[name]},null,2));
}
for(const ext of ['csv','xlsx'])fs.copyFileSync(path.join(review,'survey.'+ext),path.join(out,'fixtures','survey.'+ext));
let html=fs.readFileSync(path.join(root,'local/index.html'),'utf8');
html=html.replace("const STORE='barometer_v2_final';","const STORE='barometer_v45_manual_20261026';").replace(/const LEGACY_STORES=\[[^\]]*\]/,"const LEGACY_STORES=[]");
html=html.replace('<title>Барометр психосоціальної безпеки робочого середовища</title>','<title>Барометр: тестова версія v45</title>');
const style=`<style>
.manual-preview-bar{background:#1A3551;color:#fff;padding:14px 24px;font:14px/1.5 Arial,sans-serif}.manual-preview-inner{max-width:1180px;margin:auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px}.manual-preview-bar strong{font-size:17px}.manual-preview-bar p{margin:0;width:100%;color:#e2e8ed}.manual-preview-bar select{width:auto;max-width:100%;background:white;color:#394649;min-height:40px;padding:8px}.manual-preview-bar button,.manual-preview-bar a{background:white;color:#1A3551;border:0;border-radius:8px;padding:9px 12px;font:700 13px Arial,sans-serif;text-decoration:none}.manual-preview-bar .manual-links{display:flex;gap:12px;flex-wrap:wrap}.manual-preview-bar .manual-links a{background:transparent;color:white;padding:0;text-decoration:underline;font-weight:400}@media(max-width:600px){.manual-preview-bar{padding:12px}.manual-preview-bar select{width:100%}}@media print{.manual-preview-bar{display:none!important}}
</style>`;
const banner=`<aside class="manual-preview-bar"><div class="manual-preview-inner"><strong>Тестова версія Барометра v45</strong><p>Окреме середовище для ручної перевірки. Спочатку відкрито демонстраційний сценарій Модуля 2. Розгорнути чотири розділи можна кнопкою «Інтерпретація».</p><select id="manual-case" aria-label="Демонстраційний сценарій"><option value="module2_sample">Модуль 2: погоджений приклад</option><option value="six_gaps">Прогалини практик у всіх 7 модулях</option><option value="discrepancy">Несприятливі оцінки й підтверджені практики</option><option value="favorable">Сприятливі результати</option><option value="insufficient">Недостатньо відповідей</option></select><button id="manual-load">Відкрити приклад</button><button id="manual-new">Створити власне дослідження</button><button id="manual-json">JSON обраного прикладу</button><div class="manual-links"><a href="fixtures/survey.csv" download>CSV для перевірки імпорту</a><a href="fixtures/survey.xlsx" download>XLSX для перевірки імпорту</a></div></div></aside>`;
const js=`<script>
const MANUAL_PREVIEW_CASES=${JSON.stringify(cases).replaceAll('<','\\u003c')};
function manualOpenCase(name){const r=JSON.parse(JSON.stringify(MANUAL_PREVIEW_CASES[name]));S={screen:'dash',r,env:r.periods[0].envs[0].id,module:1,modal:null,demo:false,returnResearch:null};save();render();window.scrollTo(0,0)}
document.getElementById('manual-load').addEventListener('click',()=>{if(confirm('Відкрити обраний приклад? Він замінить поточне тестове дослідження. За потреби спочатку завантажте його резервну копію.'))manualOpenCase(document.getElementById('manual-case').value)});
document.getElementById('manual-new').addEventListener('click',()=>{S.screen='start';S.modal=null;render();document.querySelector('[data-a="new"]').click();window.scrollTo(0,0)});
document.getElementById('manual-json').addEventListener('click',()=>{const name=document.getElementById('manual-case').value,a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:'barometr-backup',version:'r43',data:MANUAL_PREVIEW_CASES[name]},null,2)],{type:'application/json'}));a.href=url;a.download='Демонстраційне_дослідження_'+name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
const manualSaved=load();if(manualSaved){S={screen:'home',r:manualSaved,env:null,module:1,modal:null,demo:false,returnResearch:null};render()}else manualOpenCase('module2_sample');
</script>`;
html=html.replace('</head>',style+'</head>').replace(/(<body[^>]*>)/,'$1'+banner);
const closingBody=html.lastIndexOf('</body>');if(closingBody<0)throw new Error('Missing document body');
html=html.slice(0,closingBody)+js+html.slice(closingBody);
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(!/type="application\/octet-stream"/.test(match[0]))new vm.Script(match[1]);
// Keep the portal's report templates in JavaScript assets rather than inline HTML.
let scriptIndex=0;
html=html.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g,(tag,source)=>{
 if(/type="application\/octet-stream"/.test(tag))return tag;
 const filename=scriptIndex++===0?'portal.js':'manual-preview.js';
 fs.writeFileSync(path.join(out,filename),source);return '<script src="'+filename+'"></script>';
});
if(scriptIndex!==2)throw new Error('Unexpected portal script layout');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'source.json'),JSON.stringify({source_repository:'psysafetywork-svg/barometr-psyhosotsialnoi-bezpeky',branch:'test/barometer-profile-and-texts-2026-10-26',storage_key:'barometer_v45_manual_20261026',cases:Object.keys(cases)},null,2)+'\n');
console.log(JSON.stringify({output:out,cases:Object.keys(cases),files:fs.readdirSync(out)}));
