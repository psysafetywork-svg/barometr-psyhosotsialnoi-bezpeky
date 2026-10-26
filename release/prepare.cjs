const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),tested='/workspace/sites/barometer-v45-manual-20261026';
const read=p=>fs.readFileSync(p,'utf8');const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const engine=read(tested+'/dist/portal.js');
if(hash(engine)!=='6efa969a9eab49cd3a9ac0897da8dff8aa5c26ed22588938dac1dfc18cece090')throw Error('Unapproved source');
const old=cp.execFileSync('git',['show','0306399f255d6269cc67f15aef162ef0d5352d1e:local/index.html'],{cwd:root,encoding:'utf8',maxBuffer:10e6});
const storage=old.match(/const STORE='[^']+';const LEGACY_STORES=\[[^\]]*\];/)[0];
let local=read(tested+'/dist/review/local/index.html');
local=local.replace(/<body><aside[^>]*>Тестова копія для перевірки перед публікацією\.[\s\S]*?<\/aside>/,'<body>')
 .replace('<title>Барометр: перевірка перед публікацією</title>','<title>Барометр психосоціальної безпеки робочого середовища</title>')
 .replace("const STORE='barometer_v45_acceptance_20261026';const LEGACY_STORES=[];",storage);
let pub=read(tested+'/dist/review/index.html').replace(/<aside class="public-preview-note">[\s\S]*?<\/aside>/,'');
pub=pub.replace(/const embeddedLocalPortal = '[^']*';/,()=>"const embeddedLocalPortal = '"+Buffer.from(local).toString('base64')+"';");
fs.writeFileSync(root+'/local/index.html',local);fs.writeFileSync(root+'/index.html',pub);
fs.writeFileSync(root+'/release/source.json',JSON.stringify({siteProject:'appgprj_6adf10b5210c8191896f2f9c4ba02aa2',sourceCommit:'508e5f92c810692eb20baae130335e638509e04b',productionBase:'0306399f255d6269cc67f15aef162ef0d5352d1e',engineHash:hash(engine),localHash:hash(local),publicHash:hash(pub),storage,allowedDifferences:['production storage keys','production title','removed test banners','synchronized embedded local HTML']},null,2));
// Full release adapter runs the existing QA suite on the production engine and pages.
for(const dir of ['qa','scripts','dist','dist/review','dist/review/local','source'])fs.mkdirSync(root+'/release/verified/'+dir,{recursive:true});
for(const file of fs.readdirSync(tested+'/qa').filter(x=>x.endsWith('.test.cjs')))fs.copyFileSync(tested+'/qa/'+file,root+'/release/verified/qa/'+file);
for(const file of ['public-example-runtime.cjs'])fs.copyFileSync(tested+'/scripts/'+file,root+'/release/verified/scripts/'+file);
for(const file of ['portal.js','manual-preview.js','public-preview.html','public-example-data.js','public-example-sync.css'])fs.copyFileSync(tested+'/dist/'+file,root+'/release/verified/dist/'+file);
fs.cpSync(tested+'/dist/fixtures',root+'/release/verified/dist/fixtures',{recursive:true});
fs.copyFileSync(tested+'/qa/public-example-sync-source.json',root+'/release/verified/qa/public-example-sync-source.json');
fs.copyFileSync(tested+'/source/public-baseline.html',root+'/release/verified/source/public-baseline.html');
fs.copyFileSync(tested+'/source/public-example-binding.js',root+'/release/verified/source/public-example-binding.js');
fs.copyFileSync(tested+'/dist/index.html',root+'/release/verified/dist/index.html');
fs.copyFileSync(tested+'/dist/review/index.html',root+'/release/verified/dist/review/index.html');
fs.copyFileSync(tested+'/dist/review/local/index.html',root+'/release/verified/dist/review/local/index.html');
fs.copyFileSync(tested+'/qa/legacy-plan-eight.json',root+'/release/verified/qa/legacy-plan-eight.json');
// Adapt only paths and storage identity. The 101 functional assertions remain.
const candidateEngine=local.match(/<script>([\s\S]*)<\/script>/)[1].trim().replaceAll('\\x3C','<');
const expectedEngine=engine.trim().replace(/const STORE='[^']+';const LEGACY_STORES=\[[^\]]*\];/,storage);
if(candidateEngine!==expectedEngine)throw Error('Unapproved functional difference');
fs.writeFileSync(root+'/release/verified/dist/portal.js',candidateEngine+'\n');
for(const file of ['dist/public-preview.html','dist/review/index.html'])fs.writeFileSync(root+'/release/verified/'+file,pub);
for(const file of ['dist/index.html','dist/review/local/index.html'])fs.writeFileSync(root+'/release/verified/'+file,local);
let route=read(root+'/release/verified/qa/review-route.test.cjs');
route=route.replace('engine.trim().replace("const STORE=\'barometer_v45_manual_20261026\'", "const STORE=\'barometer_v45_acceptance_20261026\'")','engine.trim()')
 .replace('assert.match(local, /const LEGACY_STORES=\\[\\]/);','assert.ok(local.includes('+JSON.stringify(storage)+'));')
 .replace('manualInstallResearch|barometer_v2_final','manualInstallResearch|barometer_v45_manual_20261026|barometer_v45_acceptance_20261026');
fs.writeFileSync(root+'/release/verified/qa/review-route.test.cjs',route);
const meta=JSON.parse(read(root+'/release/verified/qa/public-example-sync-source.json'));
meta.portalSha256=hash(candidateEngine+'\n');
for(const file of Object.keys(meta.files))meta.files[file]=hash(read(root+'/release/verified/'+file));
fs.writeFileSync(root+'/release/verified/qa/public-example-sync-source.json',JSON.stringify(meta,null,2));
console.log(JSON.stringify({localHash:hash(local),publicHash:hash(pub),storage}));
