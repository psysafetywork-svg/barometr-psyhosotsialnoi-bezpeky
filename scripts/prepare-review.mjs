import fs from 'node:fs';
import {loadPortal,makeScenario,SIX_PRACTICES} from '../tests/profile-fixtures.mjs';
const {api}=loadPortal(),dir=new URL('../qa/profile-v45/review/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const configurations={favorable:{},discrepancy:{items:Object.fromEntries(api.SURVEY_ITEMS.map(x=>[x.code,[40,40]]))},six_gaps:{practices:Object.fromEntries(api.P_LIST.map(p=>[p.code,'partial'])),p40Risk:'confirmed',localRisk:'confirmed'},insufficient:{nE:19,nL:9},module2_sample:SIX_PRACTICES};
for(const [name,options] of Object.entries(configurations)){const s=makeScenario(api,options);fs.writeFileSync(new URL(name+'.json',dir),JSON.stringify(s.r,null,2));fs.writeFileSync(new URL(name+'.html',dir),api.buildReportHtml(s.environment));}
const sample=makeScenario(api,SIX_PRACTICES);const table=[[api.ROLE_QUESTION,...api.SURVEY_ITEMS.map(x=>x.code+'. '+x.text)],...sample.rows.map(r=>[r.isManager?'Так':'Ні',...api.SURVEY_ITEMS.map(x=>r.answers[x.code]??'')])];
fs.writeFileSync(new URL('survey-table.json',dir),JSON.stringify(table));fs.writeFileSync(new URL('survey.csv',dir),'\uFEFF'+table.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'));
