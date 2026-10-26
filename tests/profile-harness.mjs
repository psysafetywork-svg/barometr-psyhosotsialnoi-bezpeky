import fs from 'node:fs';
import vm from 'node:vm';
export function loadPortal(htmlPath=new URL('../local/index.html',import.meta.url)){
const localHtml=fs.readFileSync(htmlPath,'utf8');
function executableScripts(html){
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .filter(match=>!/type="application\/octet-stream"/.test(match[0]))
    .map(match=>match[1]);
}

function loadLocalPortal(){
  const listeners=new Map(),storage=new Map(),app={innerHTML:''};
  const document={
    querySelector(selector){return selector==='#app'?app:null},
    querySelectorAll(){return []},
    getElementById(){return null},
    addEventListener(type,handler){listeners.set(type,handler)},
    createElement(){return {click(){},remove(){},setAttribute(){},style:{}}},
    body:{appendChild(){}},
  };
  const context=vm.createContext({
    console,document,
    window:{scrollTo(){},print(){}},
    localStorage:{
      getItem(key){return storage.has(key)?storage.get(key):null},
      setItem(key,value){storage.set(key,String(value))},
      removeItem(key){storage.delete(key)},
    },
    alert(){},confirm(){return true},
    Blob,URL,TextEncoder,TextDecoder,Response,DecompressionStream,
    setTimeout,clearTimeout,Date,Math,JSON,Intl,Uint8Array,ArrayBuffer,DataView,
  });
  const source=executableScripts(localHtml).at(-1)+`
    globalThis.__portal={
      BAROMETER_V2_ASPECTS,BAROMETER_V2_STEPS,BAROMETER_V2_ACTION_META,BAROMETER_V2_DIAGNOSTICS,BAROMETER_ALGORITHM_SPEC,SURVEY_ITEMS,ROLE_QUESTION,P_LIST,P,M,COMBO64,FINE_ITEMS,ACTION_LIB,THEMATIC_LIB,P38_TEXT,SITUATIONAL_HYPOTHESIS,
      parseCSV,parseResponseValue,RESPONSE_SCALE,isProblemSurveyItem,compareSurveyPercent,validateTableRows,aggregateSource,calculatePResults,
      fmtPct,weatherStatus,boundaryFlag,mapStatusBadge,weatherMapHtml,managementSignal,comboTemplate,hasWeakSituationalPractice,selectedActions,attentionAspects,actualResultModel,buildReportHtml,planXlsxBytes,
      normalizeResearch,safeResearchClone,validateBackupResearch,currentPlan,planRows,canDashboard,load,save,STORE,
      barometerRuntimeInput,barometerSemanticInterpretation,barometerStateForCodes,barometerSemanticModuleMarkup,barometerSemanticActionCards,barometerV2AspectsMarkup,
      validateEnvironmentValues,validatePeriodDates,
      setState(value){S=value},getState(){return S},render,studyProgress,
    };
  `;
  vm.runInContext(source,context,{filename:'local/index.html'});
  return {api:context.__portal,listeners,app,storage,document,context};
}

return loadLocalPortal();
}
