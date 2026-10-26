// Only recognise exact generated clauses. Custom content and the owner field survive.
function profileV45PlanLine(text){return profileV45Text(String(text||'').replace(/^\s*[•\-]\s*/u,'')).trim()}
function profileV45KnownPlanLines(){
 const known=new Set(),visit=value=>{
  if(typeof value==='string')known.add(profileV45PlanLine(value));
  else if(value&&typeof value==='object')Object.values(value).forEach(visit);
 };
 [PROFILE_V45_COPY,PROFILE_V45_SAMPLE,BAROMETER_V2_STEPS,BAROMETER_V2_ACTION_META,ACTION_LIB].forEach(visit);
 for(const code of SURVEY_ITEMS.map(x=>x.code))for(const branch of ['favorable','partial','negative']){
  known.add(profileV45PlanLine(profileV45Repeat({branches:{[code]:branch}},code)));
 }
 known.add('Підтверджено наявність і застосування саме виправленої складової практики.');
 return known;
}
let profileV45PlanKnown;
function profileV45RefreshPlanText(r){
 if(!r?.plan?.length)return r;
 profileV45PlanKnown??=profileV45KnownPlanLines();
 for(const card of r.plan){
  if(!card.sourceTarget)continue;
  for(const field of ['description','indicator']){
   if(typeof card[field]!=='string')continue;
   card[field]=card[field].split('\n').map(line=>{
    const clean=profileV45PlanLine(line);
    if(!clean||!profileV45PlanKnown.has(clean))return line;
    const value=clean==='Підтверджено наявність і застосування саме виправленої складової практики.'?profileV45Copy('P13',PROFILE_V45_FIELDS.checks)[0]:clean;
    return (field==='indicator'||/^\s*•/u.test(line)?'• ':'')+value;
   }).join('\n');
  }
 }
 return r;
}
const profileV45PreviousNormalize=normalizeResearch;
normalizeResearch=function(r){return profileV45RefreshPlanText(profileV45PreviousNormalize(r))};
const profileV45PreviousCurrentPlan=currentPlan;
currentPlan=function(){profileV45RefreshPlanText(S.r);return profileV45PreviousCurrentPlan()};
if(S.r)profileV45RefreshPlanText(S.r);
