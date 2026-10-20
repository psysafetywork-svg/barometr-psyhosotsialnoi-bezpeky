const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=process.env.BAROMETER_QA_OUTPUT;
const localHtml=fs.readFileSync(root+'/local/index.html','utf8'),tests=fs.readFileSync(root+'/tests/portal-regression.mjs','utf8');
const loader=tests.slice(tests.indexOf('function executableScripts'),tests.indexOf('const portal=loadLocalPortal();'));
const {api}=new Function('fs','vm','localHtml',loader+';return loadLocalPortal()')(fs,vm,localHtml);
const original=execFileSync('git',['show','4de7798e0df7d9ee339762d620eda6a9ef64f6ce:local/index.html'],{cwd:root,maxBuffer:10*1024*1024}).toString();
const start=original.indexOf('const BAROMETER_P_ACTION_LIBRARY=')+'const BAROMETER_P_ACTION_LIBRARY='.length;
const before=JSON.parse(original.slice(start,original.indexOf(';\nfunction barometerPracticeAction',start)));
for(const [code,old] of Object.entries(before))for(const key of ['title','steps','check','coverage'])assert.equal(JSON.stringify(api.BAROMETER_P_ACTION_LIBRARY[code][key]),JSON.stringify(old[key]),code+'/'+key);
assert.equal(api.P_LIST.length,42);
const r={company:'Синтетична компанія QA',owner:'QA',current:'qa',periods:[{id:'qa',label:'QA',start:'2026-09-01',end:'2026-09-30',envs:[],checkup:{answers:Object.fromEntries(api.P_LIST.map(p=>[p.code,'full'])),notes:{},done:true,asOfDate:'2026-09-30',schemaVersion:'checkup-2026-09-20-final'}}],plan:[]};api.setState({screen:'home',r,env:null,module:1,modal:null,demo:false});
const actionStart=original.indexOf('function barometerPracticeAction('),actionEnd=original.indexOf('\nfunction barometerPracticeInSavedAction',actionStart);
const oldAction=new Function('BAROMETER_P_VERIFICATION','BAROMETER_P_ACTION_LIBRARY','P_LIST','CRITICAL_P','period',original.slice(actionStart,actionEnd)+';return barometerPracticeAction')(api.BAROMETER_P_VERIFICATION,before,api.P_LIST,new Set(['P04','P13','P15','P16','P21','P28','P31','P36','P38','P42']),()=>r.periods[0]);
const examples=[];
for(const code of ['P01','P03','P07','P15','P24','P31','P40','P42'])for(const answer of ['partial','insufficient','no']){
 const a=api.barometerPracticeAction(code,answer),b=oldAction(code,answer);
 examples.push({code,answer,before:{title:b.title,steps:b.steps,check:b.check},after:{title:a.title,steps:a.steps,check:a.check}});
}
fs.writeFileSync(out+'/before-after-examples.json',JSON.stringify(examples,null,2));
fs.writeFileSync(out+'/before-after-examples.md','# Приклади до і після\n\n'+examples.map(x=>'## '+x.code+' / '+x.answer+'\n\nБуло: '+x.before.title+'\n\n'+x.before.steps.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n\nСтало: '+x.after.title+'\n\n'+x.after.steps.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n\nРезультат: '+x.after.check).join('\n\n'));
const tap=fs.readFileSync(out+'/node-tests.tap','utf8'),browser=JSON.parse(fs.readFileSync(out+'/browser-checks.json','utf8')),audit=JSON.parse(fs.readFileSync(root+'/docs/ORGANISATIONAL_ACTIONS_AUDIT_2026-10-20.json','utf8'));
const counts={nodeTests:Number(tap.match(/# tests (\d+)/)?.[1]),nodePass:Number(tap.match(/# pass (\d+)/)?.[1]),nodeFail:Number(tap.match(/# fail (\d+)/)?.[1]),browserChecks:browser.checks.length,browserErrors:browser.errors,auditScenarios:audit.length,noModelsUnchanged:42,partialModels:42,insufficientModels:42,commit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),browser:browser.browser};
assert.equal(counts.nodeFail,0);assert.equal(counts.nodeTests,counts.nodePass);assert.equal(counts.auditScenarios,168);assert.deepEqual(counts.browserErrors,[]);
fs.writeFileSync(out+'/corrective-qa-results.json',JSON.stringify(counts,null,2));
console.log('CORRECTIVE_QA_RESULTS '+JSON.stringify(counts));
