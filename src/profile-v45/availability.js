/* Availability changes presentation and access, never scoring or stored survey data. */
function profileV45CompanyTarget(){return {id:null,name:'Компанія',scope:'company',survey:{e:0,l:0}}}
function profileV45SourceState(eobj=env(S.env)){
 const sr=getSurveyResults(eobj),out={};
 for(const source of ['E','L']){
  const result=sr?.[source.toLowerCase()],total=Number(result?.totalResponses||0),minimum=source==='E'?20:10;
  out[source]={total,kind:!total?'absent':total<minimum||result?.eligible===false?'insufficient':'available'};
 }
 out.P={kind:period()?.checkup?.done?'available':'unfinished'};return out;
}
function profileV45SourceNotes(eobj){
 const sources=profileV45SourceState(eobj),company=eobj?.scope==='company';
 if(company)return ['Показано стан організаційних практик компанії за завершеним чекапом. Досвід працівників і керівників у цьому перегляді не оцінюється.'];
 const notes=sources.P.kind==='available'?['Організаційний чекап відображає стан практик на рівні компанії.']:['Організаційний чекап не завершено.'];
 for(const source of ['E','L']){
  const {kind,total}=sources[source],label=source==='E'?'працівників':'керівників';
  if(kind==='absent')notes.push(`Даних ${label} немає. Це джерело не використовується для висновків.`);
  if(kind==='insufficient')notes.push(`Відповідей ${label} недостатньо для окремого аналізу: ${total} валідних анкет. Статуси й висновки за цим джерелом не формуються.`);
 }
 return notes;
}
function profileV45AvailableColumns(eobj){const state=profileV45SourceState(eobj);return ['E','L','P'].filter(source=>state[source].kind==='available')}
const profileV45CanDashboard=canDashboard;
canDashboard=function(eobj){return eobj?.scope==='company'?period()?.checkup?.done===true:profileV45CanDashboard(eobj)};
const profileV45RuntimeInput=barometerRuntimeInput;
barometerRuntimeInput=function(){
 const input=profileV45RuntimeInput();
 if(S.env==null){const risk=period()?.checkup?.p40Risk;input.P.p40Applicable=risk==='confirmed';input.P.p40Known=['confirmed','not_confirmed'].includes(risk)}
 return input;
};
const profileV45ResultModel=actualResultModel;
actualResultModel=function(){
 if(!period()?.checkup?.done)return [];
 if(S.env==null){
  const p=calculatePResults(period().checkup);
  return M.map((name,i)=>({m:i+1,e:null,l:null,p:p.modules[i+1]?.status??null,signal:'',confirmed:'',gap_analysis:[],hypotheses:[],checks:[],next_step:[],actions:[]}));
 }
 const state=profileV45SourceState();
 return profileV45ResultModel().map(row=>({...row,e:state.E.kind==='absent'?null:row.e,l:state.L.kind==='absent'?null:row.l}));
};
function profileV45WeatherMap(rows,eobj,report=false){
 const sources=profileV45AvailableColumns(eobj),labels={E:'Працівники',L:'Керівники',P:'Організаційний чекап'},sr=getSurveyResults(eobj);
 const table='<table class="'+(report?'summary-table':'weather-table')+'"><thead><tr><th>Модуль</th>'+sources.map(s=>'<th>'+labels[s]+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr><td>'+row.m+'. '+h(M[row.m-1])+'</td>'+sources.map(s=>'<td>'+(row[s.toLowerCase()]==null?'<span class="data-quality">Недостатньо даних</span>':mapStatusBadge(row[s.toLowerCase()],s,row.m,sr))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 const surveyNote=sources.some(s=>s!=='P')?'<p class="weather-map-note">Джерела показано окремо; їх не усереднюють. У дужках наведено частку відповідей, що пояснює статус. «Туман» за достатньої вибірки означає нестачу застосовних даних.</p><p class="weather-map-note">«Ясно»: щонайменше 75% сприятливих і менше 15% несприятливих відповідей. «Буря»: щонайменше 30% несприятливих відповідей. «Хмарно»: змішаний профіль відповідей або наявність окремого проблемного аспекту.</p>':'';
 const tag=report?'section':'div';return '<'+tag+' class="'+(report?'summary-card':'weather-map')+'"><h'+(report?'2':'3')+'>Карта організаційної погоди</h'+(report?'2':'3')+'>'+profileV45SourceNotes(eobj).map(t=>'<p class="profile-source-note">'+h(t)+'</p>').join('')+table+surveyNote+'</'+tag+'>';
}
weatherMapHtml=profileV45WeatherMap;
reportMapHtml=function(rows,eobj){return profileV45WeatherMap(rows,eobj,true)};
const profileV45Dash=dash;
dash=function(){
 if(S.env!=null){
  const state=profileV45SourceState();let html=profileV45Dash().replace('Три джерела не усереднюються','Доступні джерела не усереднюються');
  for(const source of ['E','L'])if(state[source].kind==='absent')html=html.replace('<span class="pill">0 відповідей '+(source==='E'?'працівників':'керівників')+'</span>','');
  return html;
 }
 const company=profileV45CompanyTarget();
 if(!canDashboard(company))return `${bar()}<div class="shell"><h2>Організаційний чекап не завершено</h2><p>Завершити чекап, щоб переглянути стан практик.</p><button class="btn ghost" data-a="home">Назад</button></div>`;
 const rows=actualResultModel();return `${bar()}<div class="shell"><div class="hero-mini"><div><p class="eyebrow">Результати організаційного чекапу</p><h2>${h(S.r.company)}</h2><p>${h(period().label)}. Рівень оцінювання: компанія.</p></div><div class="card-actions"><button class="btn ghost" data-a="home">Назад</button><button class="btn secondary" data-a="report-company">Завантажити звіт чекапу</button></div></div>${weatherMapHtml(rows,company)}<div class="dashboard-grid">${rows.map(matrixModule).join('')}</div><button class="btn secondary" data-a="plan">Перейти до Плану організаційних дій</button></div>`;
};
const profileV45Home=home;
home=function(){
 let html=profileV45Home();if(!period()?.checkup?.done)return html;
 const card='<section class="profile-company-results"><h3>Результати організаційного чекапу</h3><p>Стан практик компанії можна переглянути без завантаження опитувань.</p><div class="card-actions"><button class="btn primary" data-a="checkup-results">Переглянути результати чекапу</button><button class="btn ghost" data-a="report-company">Завантажити звіт чекапу</button></div></section>';
 return html.replace('<section class="study-progress"',card+'<section class="study-progress"');
};
const profileV45PlanView=plan;
plan=function(){
 let html=profileV45PlanView();if(period()?.checkup?.done){
  html=html.replace('<h3>Завантаження результатів</h3>','<h3>Завантаження результатів</h3><p><button class="btn ghost" data-a="report-company">Завантажити звіт чекапу компанії</button></p>');
  html=html.replace('<button class="btn secondary" type="button" disabled title="Спочатку мають бути готові результати робочого середовища">Завантажити звіт</button>','');
 }return html;
};
const profileV45Participation=participationText;
participationText=function(eobj,sr){return eobj?.scope==='company'?'Рівень оцінювання: компанія. Використано відповіді організаційного чекапу.':profileV45Participation(eobj,sr)};
const profileV45AvailableReport=buildReportHtml;
buildReportHtml=function(eobj){
 const previous=S.env;
 try{
  let html=profileV45AvailableReport(eobj);
  if(eobj?.scope==='company'){
   html=html.replace('<span>Робоче середовище</span>','<span>Рівень оцінювання</span>');
   html=html.replace(/<div class="legend">[\s\S]*?<\/div>/,'<div class="legend"><b>Як читати статуси чекапу.</b> «Ясно» означає повну реалізацію всіх шести практик модуля; «Хмарно» - часткову реалізацію або окремі прогалини; «Буря» - суттєві прогалини за чинними правилами чекапу; «Туман» - недостатність підтверджених даних. Сприятливий чекап сам по собі не підтверджує сприятливий досвід працівників.</div>');
  }
  return html;
 }finally{S.env=previous}
};
