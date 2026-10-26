const fs=require('node:fs'),vm=require('node:vm'),url=require('node:url'),path=require('node:path');
const file=path.resolve(__dirname,'../tests/portal-regression.mjs');
function harness(sourceOverride){
 const tests=[];
 const source=(sourceOverride||fs.readFileSync(file,'utf8')).replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify(url.pathToFileURL(file).href));
 const context=vm.createContext({fs,vm,assert:require('node:assert/strict'),test:(name,fn)=>tests.push({name,fn}),console,URL,Blob,Buffer,TextEncoder,TextDecoder,Response,DecompressionStream,setTimeout,clearTimeout});
 vm.runInContext(source+'\nglobalThis.qa={portal,setRuntimeScenario,setSurveyIssueScenario,semanticFixture,research};',context);
 return {...context.qa,tests,context};
}
module.exports={harness,file};
if(require.main===module){const h=harness();h.setRuntimeScenario({eOverrides:{E01:1},lOverrides:{L01:1}});const a=h.portal.api.barometerSemanticInterpretation();console.log(JSON.stringify({keys:Object.keys(a),input:a.input.branches,module:a.modules[1]},null,2));}
