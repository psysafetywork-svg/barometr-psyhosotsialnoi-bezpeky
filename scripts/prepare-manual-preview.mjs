import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPortal} from '../tests/profile-harness.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=process.argv[2];
if(!out||!path.isAbsolute(out))throw new Error('Provide an absolute static output directory');
fs.mkdirSync(path.join(out,'fixtures'),{recursive:true});
const review=path.join(root,'qa/profile-v45/review'),cases={};
const weatherSource=fs.readFileSync(path.join(root,'scripts/manual-weather.js'),'utf8'),{context}=loadPortal();vm.runInContext(weatherSource,context);
const labels={mixed_modules:'Різні статуси в усіх 7 модулях',employee_storm:'Буря / Ясно / Ясно',manager_storm:'Ясно / Буря / Ясно',practice_storm:'Ясно / Ясно / Буря',all_storm:'Буря / Буря / Буря',all_cloudy:'Хмарно / Хмарно / Хмарно',employee_fog:'Туман / Ясно / Хмарно',manager_fog:'Ясно / Туман / Хмарно',two_fogs:'Буря / Туман / Туман',module2_sample:'Модуль 2: погоджений приклад',six_gaps:'Прогалини практик у всіх 7 модулях',discrepancy:'Несприятливі оцінки й підтверджені практики',favorable:'Сприятливі результати',insufficient:'Недостатньо відповідей'};
cases.mixed_modules=vm.runInContext('manualWeatherResearch(MANUAL_MIXED_WEATHER)',context);
for(const [name,statuses] of Object.entries({employee_storm:['Буря','Ясно','Ясно'],manager_storm:['Ясно','Буря','Ясно'],practice_storm:['Ясно','Ясно','Буря'],all_storm:['Буря','Буря','Буря'],all_cloudy:['Хмарно','Хмарно','Хмарно'],employee_fog:['Туман','Ясно','Хмарно'],manager_fog:['Ясно','Туман','Хмарно'],two_fogs:['Буря','Туман','Туман']}))cases[name]=vm.runInContext('manualWeatherResearch('+JSON.stringify(Array.from({length:7},()=>statuses))+')',context);
for(const name of ['module2_sample','six_gaps','discrepancy','favorable','insufficient']){
 cases[name]=JSON.parse(fs.readFileSync(path.join(review,name+'.json')));
}
for(const [name,r] of Object.entries(cases))fs.writeFileSync(path.join(out,'fixtures',name+'.json'),JSON.stringify({format:'barometr-backup',version:'r43',data:r},null,2));
for(const ext of ['csv','xlsx'])fs.copyFileSync(path.join(review,'survey.'+ext),path.join(out,'fixtures','survey.'+ext));
let html=fs.readFileSync(path.join(root,'local/index.html'),'utf8');
html=html.replace("const STORE='barometer_v2_final';","const STORE='barometer_v45_manual_20261026';").replace(/const LEGACY_STORES=\[[^\]]*\]/,"const LEGACY_STORES=[]");
html=html.replace('<title>Барометр психосоціальної безпеки робочого середовища</title>','<title>Барометр: тестова версія v45</title>');
const style=`<style>
.manual-preview-bar{background:#1A3551;color:#fff;padding:14px 24px;font:14px/1.5 Arial,sans-serif}.manual-preview-inner{max-width:1180px;margin:auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px}.manual-preview-bar strong{font-size:17px}.manual-preview-bar p{margin:0;width:100%;color:#e2e8ed}.manual-preview-bar select{width:auto;max-width:100%;background:white;color:#394649;min-height:40px;padding:8px}.manual-preview-bar button,.manual-preview-bar a{background:white;color:#1A3551;border:0;border-radius:8px;padding:9px 12px;font:700 13px Arial,sans-serif;text-decoration:none}.manual-preview-bar .manual-links{display:flex;gap:12px;flex-wrap:wrap}.manual-preview-bar .manual-links a{background:transparent;color:white;padding:0;text-decoration:underline;font-weight:400}@media(max-width:600px){.manual-preview-bar{padding:12px}.manual-preview-bar select{width:100%}}@media print{.manual-preview-bar{display:none!important}}
</style>`;
const optionStates=['Ясно','Хмарно','Буря','Туман'].map(s=>'<option>'+s+'</option>').join('');
const banner=`<aside class="manual-preview-bar"><div class="manual-preview-inner"><strong>Тестова версія Барометра v45</strong><p>Приклади з різними результатами. Порядок статусів у назві: працівники / керівники / організаційний чекап.</p><select id="manual-case" aria-label="Демонстраційний сценарій">${Object.entries(labels).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')}</select><button id="manual-load">Відкрити приклад</button><button id="manual-new">Створити власне дослідження</button><button id="manual-json">JSON поточного дослідження</button><p id="manual-current" aria-live="polite"></p><details><summary>Обрати власну комбінацію статусів</summary><div class="manual-preview-inner" style="margin-top:10px"><label>Модуль <select id="manual-module">${Array.from({length:7},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('')}</select></label><label>Працівники <select id="manual-e">${optionStates}</select></label><label>Керівники <select id="manual-l">${optionStates}</select></label><label>Організаційний чекап <select id="manual-p">${optionStates}</select></label><button id="manual-combination">Відкрити комбінацію</button><p>Доступні всі 64 поєднання для кожного модуля. Інші модулі зберігають різні демонстраційні результати.</p></div></details><div class="manual-links"><a href="fixtures/survey.csv" download>CSV для перевірки імпорту</a><a href="fixtures/survey.xlsx" download>XLSX для перевірки імпорту</a></div></div></aside>`;
const js=`<script>
const MANUAL_PREVIEW_CASES=${JSON.stringify(cases).replaceAll('<','\\u003c')};
const MANUAL_CASE_LABELS=${JSON.stringify(labels)};
${weatherSource}
function manualInstallResearch(r,selection){r.manualScenario=selection;S={screen:'dash',r,env:r.periods[0].envs[0].id,module:1,modal:null,demo:false,returnResearch:null};save();render();document.getElementById('manual-current').textContent='Відкрито: '+selection.label;window.scrollTo(0,0)}
function manualOpenCase(name){manualInstallResearch(JSON.parse(JSON.stringify(MANUAL_PREVIEW_CASES[name])),{key:name,label:MANUAL_CASE_LABELS[name]})}
document.getElementById('manual-load').addEventListener('click',()=>{if(confirm('Відкрити обраний приклад? Він замінить поточне тестове дослідження. За потреби спочатку завантажте його резервну копію.'))manualOpenCase(document.getElementById('manual-case').value)});
document.getElementById('manual-new').addEventListener('click',()=>{S.screen='start';S.modal=null;render();document.querySelector('[data-a="new"]').click();window.scrollTo(0,0)});
document.getElementById('manual-combination').addEventListener('click',()=>{const m=Number(document.getElementById('manual-module').value),states=['e','l','p'].map(k=>document.getElementById('manual-'+k).value),weather=MANUAL_MIXED_WEATHER.map(row=>[...row]);weather[m-1]=states;if(confirm('Відкрити обрану комбінацію замість поточного тестового дослідження?'))manualInstallResearch(manualWeatherResearch(weather),{module:m,states,label:'Модуль '+m+': '+states.join(' / ')})});
document.getElementById('manual-json').addEventListener('click',()=>{const name=document.getElementById('manual-case').value,a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:'barometr-backup',version:'r43',data:S.r},null,2)],{type:'application/json'}));a.href=url;a.download='Тестове_дослідження_Барометра.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
const manualSaved=load();if(manualSaved){S={screen:'home',r:manualSaved,env:null,module:1,modal:null,demo:false,returnResearch:null};render();document.getElementById('manual-current').textContent='Відкрито: '+(manualSaved.manualScenario?.label||'раніше збережене тестове дослідження');if(MANUAL_CASE_LABELS[manualSaved.manualScenario?.key])document.getElementById('manual-case').value=manualSaved.manualScenario.key;if(manualSaved.manualScenario?.module){document.getElementById('manual-module').value=manualSaved.manualScenario.module;['e','l','p'].forEach((k,i)=>{document.getElementById('manual-'+k).value=manualSaved.manualScenario.states?.[i]||'Ясно'});}}else manualOpenCase('mixed_modules');
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
