const PROFILE_V45_RAIN_ICON='<svg class="profile-weather-icon" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M6 15a4 4 0 0 1-.4-8 6 6 0 0 1 11.7-1A4.6 4.6 0 0 1 18 15H6z"/><path stroke="currentColor" stroke-width="2" d="m7 17-1 4m6-4-1 4m6-4-1 4"/></svg>';
function profileV45Icons(html){return html.replaceAll('🌧',PROFILE_V45_RAIN_ICON)}
function profileV45List(entries){return entries.length?'<ul>'+entries.map(x=>'<li>'+h(typeof x==='string'?x:x.text)+'</li>').join('')+'</ul>':''}
function profileV45ModuleHtml(row,mod,interactive=false){
 const sections=mod.sections,empty=mod.dataNotes.length?'За доступними даними коригувальних дій не визначено. Спочатку врахувати обмеження даних.':profileV45Copy('G-CLEAR','Рекомендовані організаційні дії')[0];
 const cards=[
  ['Як узгоджуються джерела',sections.alignment.map(x=>'<p>'+h(x)+'</p>').join(''),'a'],
  ['На що звернути увагу',profileV45List(sections.attention)||(mod.dataNotes.length?'<p>Врахувати наведені обмеження даних.</p>':'<p>Окремого уточнення за доступними результатами не визначено.</p>'),'b'],
  ['Рекомендовані організаційні дії',profileV45List(sections.steps)||'<p>'+h(empty)+'</p>','a'],
  ['Як перевірити результат',profileV45List(sections.checks)||(mod.dataNotes.length?'<p>Змістові критерії за недостатніми даними не визначаються.</p>':'<p>Перевіряти збереження сприятливих результатів та фактичне застосування практик.</p>'),'b']
 ];
 const controls=interactive?'<div class="profile-plan-controls">'+mod.actions.map(a=>{
  const existing=planAction(row.m,a.final_action_id);
  return '<div><span>'+h(a.title)+'</span>'+(existing?'<button class="btn ghost small" data-a="open-plan-action" data-id="'+h(existing.id)+'">Відкрити в Плані</button>':'<button class="btn primary small" data-a="add-routed-action" data-m="'+row.m+'" data-target="'+h(a.final_action_id)+'">Додати до Плану</button>')+'</div>';
 }).join('')+mod.crossRefs.map(ref=>'<p>Пов’язана дія: '+h(BAROMETER_V2_ACTION_META[ref.id]?.[0]||'')+' (модуль '+ref.module+').</p>').join('')+'</div>':'';
 return '<section class="profile-v45-module module-card matrix" id="matrix-'+row.m+'"><div class="profile-v45-heading"><h3>'+row.m+'. '+h(M[row.m-1])+'</h3></div><div class="profile-status-row">'+profileV45Icons(chip(row.e,'Працівники')+chip(row.l,'Керівники')+chip(row.p,'Організаційний чекап'))+'</div>'+cards.map(([title,html,color])=>'<section class="profile-v45-card tone-'+color+'"><h4>'+title+'</h4>'+html+'</section>').join('')+(mod.dataNotes.length?'<div class="profile-data-notes">'+mod.dataNotes.map(t=>'<p>'+h(t)+'</p>').join('')+'</div>':'')+controls+'</section>';
}
barometerSemanticModuleMarkup=function(row){return profileV45ModuleHtml(row,profileV45Analysis().modules[row.m],true)};
matrixModule=barometerSemanticModuleMarkup;
barometerReportModules=function(analysis,rows){return rows.map(row=>profileV45ModuleHtml(row,analysis.modules[row.m])).join('')};
const profileV45PreviousReport=buildReportHtml;
buildReportHtml=function(eobj){
 let report=profileV45PreviousReport(eobj);
 report=report.replace('</style>','\n'+PROFILE_V45_FONT_CSS+'\n'+PROFILE_V45_CSS+'\n'+PROFILE_V45_REPORT_CSS+'</style>');
 return profileV45Icons(report).replace(/[—–]/g,'-');
};
// The module view and exported document use the same local fonts and semantic result.
if(document.createElement&&document.head){const style=document.createElement('style');style.textContent=PROFILE_V45_FONT_CSS+'\n'+PROFILE_V45_CSS;document.head.appendChild(style)}
