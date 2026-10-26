import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadPortal,makeScenario} from '../tests/profile-fixtures.mjs';
const root=new URL('../',import.meta.url),qa=new URL('qa/profile-v45/',root),{api}=loadPortal(),evidence=JSON.parse(fs.readFileSync(new URL('coverage.json',qa)));
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
fs.writeFileSync(new URL('test-coverage.csv',qa),csv([['Тест / умова','Очікування','Фактичний результат','Статус'],...evidence.map(x=>[x.test,x.expected,typeof x.actual==='string'?x.actual:JSON.stringify(x.actual),x.result])]));
const rows=[['Підстава','Умова','Очікування','Текст висновку','Дія / маршрут','Критерій','Тест','Фактичний результат']];
for(const p of api.P_LIST)for(const answer of ['full','partial','no','insufficient',null]){const s=makeScenario(api,{practices:{[p.code]:answer},p40Risk:'confirmed',localRisk:'confirmed'}),m=s.analysis.modules[p.module];const t=evidence.find(x=>x.test===`practice ${p.code} ${answer??'missing'}`);rows.push([p.code,answer??'missing',t.expected,m.sections.alignment.join('\n'),s.analysis.actions.filter(a=>a.basis_codes.includes(p.code)).map(a=>a.id+'\n'+a.action).join('\n'),m.sections.checks.filter(x=>x.codes.includes(p.code)).map(x=>x.text).join('\n'),t.test,t.result])}
fs.writeFileSync(new URL('practice-coverage.csv',qa),csv(rows));
const fingerprint={baseline:'0306399f255d6269cc67f15aef162ef0d5352d1e',files:Object.fromEntries(['local/index.html','index.html','src/profile-v45/engine.js','src/profile-v45/view.js','src/profile-v45/approved-copy.json'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex')]))};
fs.writeFileSync(new URL('tested-source.json',qa),JSON.stringify(fingerprint,null,2)+'\n');
console.log({semanticTests:evidence.length,passed:evidence.filter(x=>x.result==='PASS').length,practiceRows:rows.length-1,source:fingerprint.files['local/index.html']});
