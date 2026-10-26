import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadPortal} from './profile-harness.mjs';
const {api,context}=loadPortal(),names=['Ясно','Хмарно','Буря','Туман'],evidence=[];
vm.runInContext(fs.readFileSync(new URL('../scripts/manual-weather.js',import.meta.url),'utf8'),context);
const scenario=weather=>vm.runInContext('manualWeatherResearch('+JSON.stringify(weather)+')',context);
const install=r=>api.setState({screen:'dash',r,env:r.periods[0].envs[0].id,module:1,modal:null,demo:false,returnResearch:null});
const plain=v=>JSON.parse(JSON.stringify(v));
for(let m=1;m<=7;m++)for(const e of names)for(const l of names)for(const p of names)test(`manual combination M${m} ${e}/${l}/${p}`,()=>{
 const weather=Array.from({length:7},()=>['Ясно','Ясно','Ясно']);weather[m-1]=[e,l,p];
 const r=scenario(weather);assert.equal(api.validateBackupResearch(r),true);install(r);
 const row=api.actualResultModel()[m-1],actual=[row.e,row.l,row.p];assert.deepEqual(plain(actual),[e,l,p]);
 assert.equal(r.periods[0].envs[0].survey.results.e.totalResponses,100);assert.equal(r.periods[0].envs[0].survey.results.l.totalResponses,20);
 const html=api.barometerSemanticModuleMarkup(row);for(const heading of ['Як узгоджуються джерела','На що звернути увагу','Рекомендовані організаційні дії','Як перевірити результат'])assert.equal(html.split('<h4>'+heading+'</h4>').length-1,heading==='Як узгоджуються джерела'&&!api.barometerSemanticInterpretation().modules[m].sections.alignment.length?0:1);
 evidence.push({module:m,expected:[e,l,p],actual:plain(actual),result:'PASS'});
});
const directory=new URL('../qa/profile-v45/manual-review/',import.meta.url);
if(fs.existsSync(directory))for(const f of fs.readdirSync(directory).filter(f=>f.endsWith('.json')))test('manual preset '+f,()=>{
 const r=JSON.parse(fs.readFileSync(new URL(f,directory))).data;assert.equal(api.validateBackupResearch(r),true);install(r);const rows=api.actualResultModel();assert.equal(rows.length,7);
 if(f==='mixed_modules.json'){assert.deepEqual(plain(rows.map(r=>[r.e,r.l,r.p])),[['Буря','Ясно','Хмарно'],['Хмарно','Буря','Ясно'],['Ясно','Ясно','Буря'],['Буря','Хмарно','Туман'],['Туман','Ясно','Хмарно'],['Ясно','Туман','Ясно'],['Хмарно','Буря','Хмарно']]);}
 if(f==='employee_storm.json')for(const row of rows)assert.deepEqual(plain([row.e,row.l,row.p]),['Буря','Ясно','Ясно']);
 if(f==='manager_storm.json')for(const row of rows)assert.deepEqual(plain([row.e,row.l,row.p]),['Ясно','Буря','Ясно']);
 if(f==='practice_storm.json')for(const row of rows)assert.deepEqual(plain([row.e,row.l,row.p]),['Ясно','Ясно','Буря']);
 if(f==='insufficient.json'){assert.equal(r.periods[0].envs[0].survey.results.e.eligible,false);assert.equal(r.periods[0].envs[0].survey.results.l.eligible,false);}
 evidence.push({preset:f,actual:plain(rows.map(row=>[row.e,row.l,row.p])),result:'PASS'});
});
process.on('exit',()=>{fs.writeFileSync(new URL('../qa/profile-v45/manual-scenarios.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');});
