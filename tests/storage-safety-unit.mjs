import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../local/index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('const StorageSafety=(()=>{'),html.indexOf('/* BAROMETER_STORAGE_SAFETY_2026_10_21_END */'));
function fixture({locks=true,initial=null,deny=null}={}){
 const STORE='barometer_v2_final',map=new Map(initial===null?[]:[[STORE,initial]]),events=new Map();
 const app={inert:false},panel={innerHTML:'',remove(){}},document={getElementById(id){return id==='app'?app:panel},createElement(){return {click(){}}},body:{appendChild(){}}};
 const localStorage={getItem:k=>map.get(k)??null,setItem(k,v){if(deny?.(k,v))throw new Error('storage failure');map.set(k,String(v))},removeItem:k=>map.delete(k)};
 const context=vm.createContext({STORE,LEGACY_STORES:[],document,localStorage,S:{r:null,demo:false},h:String,$:()=>null,render(){},navigator:locks?{locks:{request:(_,_o,cb)=>Promise.resolve(cb())}}:{},window:{addEventListener:(name,fn)=>events.set(name,fn)},console,setTimeout,Blob,URL});
 vm.runInContext(source+';globalThis.safety=StorageSafety;',context);context.safety.start();return {context,map,app,panel,events,api:context.safety,localStorage,STORE};
}
const raw=JSON.stringify({company:'QA',owner:'QA',current:'p',periods:[{id:'p',checkup:{answers:{P01:'full'}}}],plan:[]});
test('storage safety: no Locks means no writes',()=>{const f=fixture({locks:false,initial:raw});assert.equal(f.api.mode,'error');assert.throws(()=>f.api.persist('{}'));assert.equal(f.map.get(f.STORE),raw);assert.equal(f.map.size,1);assert.equal(f.app.inert,true)});
test('storage safety: bootstrap is byte-preserving and load does not write',()=>{const f=fixture({initial:raw});assert.equal(f.api.mode,'editor');const text=JSON.stringify([...f.map]);assert.equal(f.api.read(),raw);assert.equal(JSON.stringify([...f.map]),text)});
test('storage safety: full envelope precedes mirror and confirmed acknowledgement',()=>{const f=fixture({initial:raw}),next=raw.replace('full','partial');assert.equal(f.api.persist(next),true);const j=JSON.parse(f.map.get(f.api.KEY));assert.equal(j.head.raw,next);assert.equal(j.previous.raw,raw);assert.equal(j.pending,false);assert.equal(f.map.get(f.STORE),next)});
test('storage safety: stale external mirror cannot destroy protected head',()=>{const f=fixture({initial:raw}),next=raw.replace('full','partial');f.api.persist(next);f.localStorage.setItem(f.STORE,raw);assert.throws(()=>f.api.persist(next.replace('partial','no')));assert.equal(f.api.mode,'conflict');const j=JSON.parse(f.map.get(f.api.KEY));assert.equal(j.head.raw,next);assert.ok(j.versions.some(x=>x.raw===raw));assert.ok(j.versions.some(x=>x.raw===next));assert.equal(f.app.inert,true)});
test('storage safety: quota leaves previous committed copy unchanged',()=>{let fail=false;const f=fixture({initial:raw,deny:k=>fail&&k.endsWith('_safety_v1')});const before=JSON.stringify([...f.map]);fail=true;assert.throws(()=>f.api.persist(raw.replace('full','no')));assert.equal(f.api.mode,'error');assert.equal(JSON.stringify([...f.map]),before)});
test('storage safety: mirror failure leaves recoverable pending full payload',()=>{let fail=false;const f=fixture({initial:raw,deny:k=>fail&&k==='barometer_v2_final'});fail=true;const next=raw.replace('full','no');assert.throws(()=>f.api.persist(next));const j=JSON.parse(f.map.get(f.api.KEY));assert.equal(j.pending,true);assert.equal(j.head.raw,next);assert.equal(j.previous.raw,raw);assert.equal(f.map.get(f.STORE),raw)});
test('storage safety: tombstone is guarded and preserves prior full version',()=>{const f=fixture({initial:raw});f.api.persist(null,{preserve:true});assert.equal(f.api.read(),null);assert.equal(f.map.has(f.STORE),false);const j=JSON.parse(f.map.get(f.api.KEY));assert.equal(j.head.raw,null);assert.ok(j.versions.some(x=>x.raw===raw))});
test('storage safety: all direct primary writes live inside guard',()=>{const remaining=html.replace(source,'');assert.doesNotMatch(remaining,/localStorage\.(?:setItem|removeItem)\(STORE/);assert.match(remaining,/StorageSafety.persist\(JSON.stringify\(r\),\{preserve:true\}\)/)});
