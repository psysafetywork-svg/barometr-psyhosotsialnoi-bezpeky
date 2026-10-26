/* Deterministic editorial layer. Calculators, raw items and storage IDs are unchanged. */
const PROFILE_V45_FIELDS={steps:'Рекомендовані дії',checks:'Як перевірити результат',attention:'На що звернути увагу'};
const PROFILE_V45_LINKS={
 P01:['E01','L01'],P02:['E01','E02','E03'],P03:['E02','E03','L02'],P04:['E04','L03'],P05:['E05'],P06:['E01','L01'],
 P07:['E06','E07','E09'],P08:['E08','L05','L06'],P09:[],P10:[],P11:['E07','L04'],P12:['E06','E07','E08','E09','L04','L05','L06'],
 P13:['E15','E20'],P14:['E11','E13','L09'],P15:['E15'],P16:['E15','L08'],P17:['L07'],P18:[],
 P19:['E16','L12'],P20:['E16'],P21:['L11'],P22:['E19'],P23:['E19','E20','L12'],P24:['E20'],
 P25:['E21','L13'],P26:['E21','E22','L13'],P27:['E23','L15'],P28:[],P29:['E24','L14'],P30:[],
 P31:['E26'],P32:['E27','E28'],P33:['E29','E30'],P34:['E29','E30'],P35:[],P36:[],
 P37:[],P38:[],P39:[],P40:[],P41:['E32','L19'],P42:['E34','E35','L20']
};
const PROFILE_V45_PNAMES={
 P01:'функції, відповідальність, повноваження й підпорядкування',P02:'введення працівника в роль',P03:'інформування про вимоги до роботи',P04:'порядок дій за суперечливих, небезпечних або нереалістичних вимог',P05:'пояснення причин і впливу організаційних змін',P06:'перевірка відповідності фактичної роботи визначеним ролям',
 P07:'спільні вимоги до роботи керівників',P08:'забезпечення керівників ресурсами й усунення робочих перешкод',P09:'підготовка та розвиток керівників',P10:'орієнтири щодо спеціалізованої підтримки працівників',P11:'індивідуальні робочі розмови',P12:'регулярна перевірка роботи керівників із командами',
 P13:'правила поважної взаємодії та захист від негативних наслідків повідомлення',P14:'формати конструктивного обговорення',P15:'конфіденційний альтернативний канал звернення',P16:'неупереджений розгляд звернень і підтримка',P17:'аналіз робочих і системних причин помилок та інцидентів',P18:'аналіз звернень і контроль виконання заходів',
 P19:'критерії оцінювання, оплати й заохочень',P20:'пояснення та перегляд рішень',P21:'конфіденційний порядок адаптації умов роботи',P22:'доступність інформації про можливості розвитку',P23:'критерії кадрових рішень',P24:'регулярний аналіз відмінностей між групами працівників',
 P25:'перегляд погоджень, затримок і надмірного контролю',P26:'перегляд вимог до звітності й контролю',P27:'участь працівників у плануванні та вдосконаленні роботи',P28:'участь працівників в оцінюванні ризиків і виборі заходів',P29:'консультації до суттєвих організаційних змін',P30:'пояснення результатів розгляду пропозицій після консультацій',
 P31:'відстеження навантаження й реагування на системне перевантаження',P32:'перевірка можливості відпочивати й усунення перешкод',P33:'доступ до підтримки та умови звернення',P34:'оцінювання обізнаності й доступності підтримки',P35:'повернення до роботи після тривалої відсутності',P36:'реагування після потенційно травматичних подій',
 P37:'управління психосоціальними ризиками',P38:'оцінювання психосоціальних ризиків і перевірка заходів',P39:'вибір організаційних заходів за джерелами ризику',P40:'захист від агресії, насильства та домагань з боку третіх осіб',P41:'усунення недоліків фізичного середовища',P42:'готовність до надзвичайних ситуацій'
};
const PROFILE_V45_OWNERS={1:'HR і керівники команд',2:'HR і керівники команд',3:'HR і керівники команд',4:'HR і власники відповідних процесів',5:'керівники команд',6:'HR і керівники команд',7:'БЗР і керівники команд',P09:'HR і L&D',P10:'HR із залученням відповідних фахівців',P13:'власник політики поважної взаємодії',P15:'відповідальний за розгляд звернень',P16:'відповідальний за розгляд звернень',P17:'керівники команд і власники відповідних процесів',P18:'HR і відповідальний за розгляд звернень',P24:'HR-аналітика',P33:'власник програм підтримки',P34:'власник програм підтримки разом із HR',P35:'HR і керівники команд',P36:'HR і БЗР',P37:'керівництво компанії і БЗР',P38:'БЗР із залученням працівників',P39:'керівництво компанії і БЗР',P40:'відповідальний за безпеку',P41:'БЗР і відповідальні за робоче середовище',P42:'відповідальний за кризове реагування'};
function profileV45Copy(id,field){return [...(PROFILE_V45_COPY[id]?.fields[field]||[])]}
function profileV45Text(text){return String(text||'').replace(/[—–]/g,'-').replace(/керівниками(?! команд| компанії)/g,'керівниками команд').replace(/керівників(?! команд| компанії)/g,'керівників команд').replace(/керівники(?! команд| компанії)/g,'керівники команд').replace(/\(керівник\)/g,'(керівники команд)').replace(/\(HR і керівник\)/g,'(HR і керівники команд)').replace(/HR разом із керівником і працівниками/g,'HR разом із керівниками команд і працівниками').replace(/HR разом із керівником\)/g,'HR разом із керівниками команд)').replace(/за локаціями, змінами та форматами роботи/g,'з урахуванням місця та формату роботи працівників')}
function profileV45Owner(code){return PROFILE_V45_OWNERS[code]||PROFILE_V45_OWNERS[BAROMETER_ALGORITHM_SPEC.signals[code]?.module]||'визначені відповідальні'}
function profileV45Step(text,code){let t=profileV45Text(text);if(!/\([^)]*\)[.!?]?$/.test(t))t=t.replace(/\.$/,'')+' ('+profileV45Owner(code)+').';return t}
function profileV45Branch(input,code){
 const src=input[code[0]];if(!src?.total)return 'absent';if(!src.eligible)return 'sample';
 const m=src.metrics?.[code];if(!m||m.applicable<Math.max(code[0]==='E'?10:5,Math.ceil(src.total/2)))return 'applicability';
 if(isProblemSurveyItem({...m,adequate:true}))return compareSurveyPercent(m.unfavorable,0)>0?'negative':'partial';
 return weatherStatus(m.favorable,m.unfavorable)==='Ясно'?'favorable':'mixed';
}
function profileV45Input(raw){
 const input=raw?barometerNormaliseFixture(raw):barometerRuntimeInput(),cp=raw?.P||period()?.checkup||{};
 input.P.answers=raw?.P?.answers||cp.answers||{};input.P.done=raw?raw.P?.done!==false:cp.done===true;
 input.branches=Object.fromEntries(SURVEY_ITEMS.map(x=>[x.code,profileV45Branch(input,x.code)]));
 return input;
}
function profileV45Problem(input,code){return ['negative','partial'].includes(input.branches[code])}
function profileV45Label(code){return (code==='L05'?'знання, до кого звернутися з питанням за межами повноважень':PROFILE_V45_PNAMES[code])||FINE_ITEMS[code]?.topic||BAROMETER_ALGORITHM_SPEC.signals[code]?.label||''}
// Catalogue labels inside a sentence use sentence case; initials and acronyms stay intact.
// Apply only to generated labels, never to survey wording or user-edited Plan fields.
function profileV45InlineText(text){return String(text||'').replace(/^[А-ЯІЇЄҐ](?=[а-яіїєґ])/u,c=>c.toLocaleLowerCase('uk'))}
function profileV45InlineLabel(code){return profileV45InlineText(profileV45Label(code))}
function profileV45Repeat(input,code){
 const b=input.branches[code],label=profileV45InlineLabel(code);
 if(b==='favorable')return `У повторному опитуванні зберігається сприятливий результат за твердженням «${label}».`;
 if(!['negative','partial'].includes(b))return '';
 if(code==='E31')return profileV45Copy('E31-R1',PROFILE_V45_FIELDS.checks)[0];
 if(b==='negative'&&['E06','E12','E17'].includes(code))return profileV45Copy(code,PROFILE_V45_FIELDS.checks)[0];
 if(b==='partial')return `У повторному анонімному опитуванні за достатніх і порівнюваних даних частка сприятливих відповідей за твердженням «${label}» зростає, а несприятливих відповідей немає.`;
 return `У повторному опитуванні за достатніх і порівнюваних даних частка сприятливих відповідей за твердженням «${label}» зростає, а несприятливих не більшає.`;
}
function profileV45Unit(code,steps=[],checks=[],attention=[],id=code){return {id,codes:[code],steps:steps.map(t=>profileV45Step(t,code)),checks:checks.map(profileV45Text),attention:attention.map(profileV45Text)}}
function profileV45CatalogueUnit(code,id=code,field=PROFILE_V45_FIELDS.steps){return profileV45Unit(code,profileV45Copy(id,field),profileV45Copy(id,PROFILE_V45_FIELDS.checks),profileV45Copy(id,PROFILE_V45_FIELDS.attention),id)}
function profileV45Routes(input){
 // Retain existing final IDs and cross-module merge conditions.
 const active=code=>code[0]==='P'?input.P.done&&['no','partial'].includes(input.P.answers[code]):profileV45Problem(input,code);
 const has=codes=>codes.some(active),routes={};
 const groups={
 'M1-A1':['E01','L01','P01','P02','P06'],'M1-A2':['E02','E03','E04','L02','L03','P03','P04'],'M1-A3':['E05','P05'],
 'M2-A1':['E06','E07','P07','P11'],'M2-A2':['E08','L05','P08'],'M2-A3':['P09','P10','P12'],
 'M3-A1':['E11','E13','L09','P14'],'M3-A2':['E12','L07','P17'],'M3-A3':['E15','L08','P13','P15','P16'],
 'M4-A1':['E16','E17','L10','L12','P19','P20'],'M4-A2':['E18','E19','P22','P23'],'M4-A3':['L11','P21'],
 'M5-A1':['E21','E22','L13','P25','P26'],'M5-A2':['E23','L15','P27','P28'],'M5-A3':['E24','E25','L14','P29','P30'],
 'M6-A1':['E26','E27','E28','L16','P31','P32'],'M6-A2':['E29','E30','P33','P34'],'M6-A3':['P35','P36'],
 'M7-A1':['E32','E33','L19','P41'],'M7-A2':['L21','P37','P38','P39'],'M7-A3':['E34','E35','L20','P42'],
 'M2-D1':['E09'],'M2-D2':['E10'],'M3-D1':['E14']};
 for(const [id,codes] of Object.entries(groups))for(const c of codes)if(active(c))routes[c]=id;
 if(active('P18'))routes.P18=has(groups['M3-A2'])?'M3-A2':has(groups['M3-A3'])?'M3-A3':'M3-A2';
 if(active('P24'))routes.P24=has(groups['M4-A1'])?'M4-A1':has(groups['M4-A2'])?'M4-A2':'M4-A1';
 if(active('L04'))routes.L04=has(groups['M2-A1'])?'M2-A1':'M2-D3';
 if(active('L06'))routes.L06=has(groups['M2-A2'])?'M2-A2':'M2-D4';
 const overload=has(['E26','E27','E28','P31','P32']),risk=has(['P37','P38','P39']);
 if(overload&&active('E09'))routes.E09='M6-A1';
 if(overload&&active('E22')&&!has(['E21','L13','P25','P26']))routes.E22='M6-A1';
 if(risk&&active('P28')&&!has(['E23','L15','P27']))routes.P28='M7-A2';
 for(const c of ['L17','L18'])if(active(c))routes[c]=has(groups['M6-A2'])?'M6-A2':has(groups['M6-A3'])?'M6-A3':'M6-D1';
 if(active('P40')&&(!input.P.p40Known||input.P.p40Applicable))routes.P40='M7-A3';
 // E25 alone is about the answer to a work problem, not consultation before change.
 if(has(['E05','P05'])&&has(['E24','L14','P29','P30']))for(const c of Object.keys(routes))if(['M1-A3','M5-A3'].includes(routes[c]))routes[c]='C01';
 return routes;
}
function profileV45Fallback(code,id,input){
 const b=input.branches[code],practice=code[0]==='P',answer=input.P.answers[code];
 let steps=(BAROMETER_V2_STEPS[id]||[]).filter(([codes])=>codes.includes(code)).map(([,t])=>t);
 if(practice&&!steps.length&&ACTION_LIB[code]?.action)steps=[ACTION_LIB[code].action];
 let check=practice?ACTION_LIB[code]?.check:BAROMETER_V2_ACTION_META[id]?.[1];
 if(code==='L16'){
  steps=['Визначити, що керівник може змінити самостійно, коли навантаження, темп або графік не залишають часу для відновлення.','Визначити, хто приймає рішення за межами повноважень керівника.','Встановити зрозумілий порядок отримання такого рішення.'];
  check='У ситуації надмірного навантаження керівник знає, що може змінити самостійно, хто приймає рішення за межами його повноважень і як швидко отримати таке рішення.';
 }
 if(code==='L21'){
  steps=['Перед суттєвою зміною запитувати керівників про ризики для роботи команди.','Фіксувати суттєві зауваження керівників.','Повідомляти, як ці зауваження були враховані у рішенні.'];
  check='Перед суттєвою зміною керівники повідомляють про ризики для роботи команди, суттєві зауваження фіксуються, а після рішення зрозуміло, як їх було враховано.';
 }
 if(code==='E09'&&id==='M6-A1')steps=BAROMETER_V2_STEPS['M2-D1'].map(x=>x[1]);
 if(code==='E28')steps=['Визначити правила робочих контактів у неробочий час працівника та можливість відкласти відповідь до свого робочого часу, за винятком кризових або екстрених ситуацій.'];
 if(code==='E27')steps=['Уточнити та усунути організаційні перешкоди для користування передбаченими перервами.'];
 if(code==='E33')check='Працівники знають правила безпеки для своєї роботи й можуть застосувати їх на практиці.';
 if(code==='E07')steps=[PROFILE_V45_SAMPLE.steps[3]];
 if(code==='L04')steps=[...BAROMETER_V2_STEPS['M2-D3'].map(x=>x[1]),'Переглянути навантаження та забезпечити час для індивідуальних робочих розмов із працівниками.'];
 if(code==='P09')steps=['Переглянути програму підготовки керівників: її зміст, практичне відпрацювання та охоплення керівників. Доповнити програму за підтвердженими потребами. Організувати практичне навчання лише за виявленої потреби в конкретних навичках, використовуючи приклади роботи з командами (HR і L&D).'];
 if(code==='P10')steps=['Доповнити орієнтири для керівників: як діяти, коли працівникові потрібна спеціалізована підтримка, де проходять межі управлінської ролі та як отримати консультацію відповідного фахівця. Пояснити правила конфіденційності й надати актуальні контакти допомоги (HR із залученням відповідних фахівців).'];
 if(code==='P07')steps=['Визначити потрібні доповнення до спільних вимог щодо планування й розподілу роботи, обговорення навантаження, надання зворотного зв’язку, реагування на повідомлення про проблеми та передавання питань за межі повноважень. Забезпечити застосування погоджених вимог (HR і керівники команд).'];
 if(code==='P11')steps=['Забезпечити регулярну можливість індивідуально обговорювати навантаження, пріоритетні завдання, робочі труднощі й потреби в підтримці та обмінюватися зворотним зв’язком. Погодити доречну для характеру роботи регулярність розмов і завершувати їх зрозумілою домовленістю про подальші дії (керівники команд).'];
 if(code==='P32')steps=['Уточнити, які складові практики потребують удосконалення: можливість користуватися перервами, відпочивати в неробочий час або інші перешкоди для відновлення. Усунути підтверджені організаційні перешкоди (HR і керівники команд).'];
 if(practice&&answer==='partial'&&!['P07','P08','P09','P10','P11','P32'].includes(code))steps.unshift(`Уточнити, які складові або охоплення практики «${profileV45Label(code)}» реалізовано неповністю, та зберегти те, що вже працює.`);
 if(['P07','P08','P09','P10','P11'].includes(code))check=PROFILE_V45_SAMPLE.checks[{P07:0,P08:3,P09:4,P10:5,P11:1}[code]];
 if(practice&&answer==='no')steps.unshift(`Визначити, що потрібно запровадити або відновити у практиці «${profileV45Label(code)}».`);
 // Answer 3 establishes an assessment needing clarification, never an incident.
 if(!practice&&b==='partial')steps.unshift(code[0]==='E'?profileV45Copy('G-CLARIFY',PROFILE_V45_FIELDS.steps)[0]:`Уточнити з керівниками команд зміст часткових оцінок щодо питання «${profileV45InlineLabel(code)}» (HR).`);
 const attention=[];
 if(!practice&&['negative','partial'].includes(b))attention.push(`Уточнити оцінки щодо питання «${profileV45InlineLabel(code)}».`);
 return profileV45Unit(code,steps,check?[check]:[],attention,'legacy:'+code);
}
function profileV45BuildUnits(input,routes){
 const units=[],add=u=>{if(u.steps.length||u.checks.length||u.attention.length)units.push(u)},checksField=PROFILE_V45_FIELDS.checks;
 const p12=input.P.answers.P12,p12codes=PROFILE_V45_LINKS.P12;
 let p12Scenario=null;
 if(input.P.done){
  if(p12==='no'&&['E07','L04'].every(c=>input.branches[c]==='negative'))p12Scenario='P12-S1';
  else if(p12==='partial'&&['E09','L06'].every(c=>input.branches[c]==='negative'))p12Scenario='P12-S2';
  else if(p12==='full'&&input.branches.E07==='negative'&&input.branches.L04==='favorable')p12Scenario='P12-S3';
  else if(['no','partial'].includes(p12)&&p12codes.every(c=>input.branches[c]==='favorable'))p12Scenario='P12-S4';
 }
 const covered=new Set();
 if(p12Scenario){
  const related=p12Scenario==='P12-S1'?['E07','L04']:p12Scenario==='P12-S2'?['E09','L06']:p12Scenario==='P12-S3'?['E07']:[];
  const target=routes.P12||routes.E07;
  for(const c of related){routes[c]=target;covered.add(c)}covered.add('P12');
  let steps=profileV45Copy(p12Scenario,PROFILE_V45_FIELDS.steps);
  if(p12Scenario==='P12-S4')steps=[...profileV45Copy(p12Scenario,'Перший пункт рекомендованих дій '+(p12==='no'?'А':'Б')),...profileV45Copy(p12Scenario,'Спільні наступні рекомендовані дії')];
  // The S1 starter is already the P12 base. Thematic steps and criteria remain separate.
  const u=profileV45Unit('P12',steps,profileV45Copy(p12Scenario,checksField),profileV45Copy(p12Scenario,'Що треба уточнити'),p12Scenario);
  u.codes=p12Scenario==='P12-S3'?related:['P12',...related];u.route=target;
  u.alignment=profileV45Copy(p12Scenario,'Висновок');
  u.checks=u.checks.filter(t=>!/^У повторному/.test(t));
  for(const c of related){const repeat=profileV45Repeat(input,c);if(repeat)u.checks.push(repeat)}
  if(related.includes('E07'))u.checks.push(...profileV45Copy('E07',checksField));
  add(u);
 }
 for(const [code,id] of Object.entries(routes)){
  if(covered.has(code))continue;
  const practice=code[0]==='P',b=input.branches[code],answer=input.P.answers[code];let u;
  if(code==='P12')u=profileV45CatalogueUnit(code,'P12-BASE','Рекомендовані дії '+(answer==='no'?'А':answer==='partial'?'Б':'В'));
  else if(code==='P18'){
   u=profileV45Unit(code,[...profileV45Copy(code,'Перший пункт рекомендованих дій '+(answer==='no'?'А':'Б')),...profileV45Copy(code,'Спільні наступні рекомендовані дії')],profileV45Copy(code,checksField));
  }else if(code==='P40')u=profileV45CatalogueUnit(code,input.P.p40Applicable?'P40':'P40-CHECK',input.P.p40Applicable?'Рекомендовані дії '+(answer==='no'?'А':'Б'):PROFILE_V45_FIELDS.steps);
  else if(['E06','E12','E17'].includes(code)){
   u=profileV45CatalogueUnit(code);
   if(b==='partial'){
    const specific=u.steps.slice(code==='E06'||code==='E17'?1:0);
    u.steps=[...profileV45Copy('G-CLARIFY',PROFILE_V45_FIELDS.steps),...specific].map(t=>profileV45Step(t,code));
    u.attention=[`Уточнити, що заважає однозначно підтвердити твердження про ${profileV45InlineLabel(code)}.`];
   }
  }else if(code==='E30')u=profileV45CatalogueUnit(code,'E30-ACTION');
  else if(PROFILE_V45_COPY[code]?.fields[PROFILE_V45_FIELDS.steps])u=profileV45CatalogueUnit(code);
  else u=profileV45Fallback(code,id,input);
  if(code==='E01')u.steps=profileV45Copy('E01-ADDITIONAL',PROFILE_V45_FIELDS.steps).map(t=>profileV45Step(t,code));
  if(['E07','E27','E28','L20'].includes(code))u.checks=profileV45Copy(code,checksField);
  if(code==='E30')u.checks=u.checks.filter(t=>!t.startsWith('Працівники можуть повідомити про тиск'));
  if(code==='P26')u.checks=profileV45Copy('P26',checksField); // Post-intervention criterion is not observed input.
  // Replace survey dynamics by the branch for each actual item, retaining practice checks.
  u.checks=u.checks.filter(t=>!/^У повторному|^Після впроваджених змін у повторному/.test(t));
  if(!practice){const repeat=profileV45Repeat(input,code);if(repeat)u.checks.push(repeat)}
  if(practice){
   for(const c of PROFILE_V45_LINKS[code]||[])if(input.branches[c]==='favorable')u.checks.push(profileV45Repeat(input,c));
   if(answer==='no'&&['P13','P23','P24','P33','P34'].includes(code))u.steps.unshift(profileV45Step(`Визначити, що потрібно запровадити або відновити у практиці «${profileV45Label(code)}».`,code));
  }
  u.route=id;add(u);
 }
 // P12 full with an employee issue: add verification within the existing final action only.
 if(input.P.done&&p12==='full'&&!p12Scenario){
  const problematic=p12codes.filter(c=>profileV45Problem(input,c));
  if(problematic.length){const u=profileV45CatalogueUnit('P12','P12-BASE','Рекомендовані дії В');u.codes=problematic;u.route=routes[problematic[0]];add(u)}
 }
 if(profileV45Problem(input,'L17')&&profileV45Problem(input,'L18')){
  const a=units.find(u=>u.codes.includes('L17')),b=units.find(u=>u.codes.includes('L18'));
  if(a&&b){
   a.checks=a.checks.filter(t=>t.startsWith('HR у коротких')||t.startsWith('У повторному'));b.checks=b.checks.filter(t=>t.startsWith('У повторному'));
   const shared=profileV45Unit('L17',[],profileV45Copy('L17-L18',checksField).filter(t=>!t.startsWith('У повторному')),[],'L17-L18');shared.codes=['L17','L18'];shared.route=a.route;add(shared);
   b.steps=b.steps.filter(t=>!t.startsWith('Уточнити з керівниками'));
  }
 }
 // Isolated E20/E31 remain visible in the module; no new Plan identifier is introduced.
 if(profileV45Problem(input,'E20')){const u=profileV45CatalogueUnit('E20','E20-ACTION');u.checks.push(profileV45Repeat(input,'E20'));u.profileOnly=true;add(u)}
 const e31=input.branches.E31,metric=input.E.metrics?.E31;
 if(['negative','partial'].includes(e31)||(metric&&metric.unfavorable>0&&['mixed','favorable'].includes(e31))){
  const u=profileV45Unit('E31',profileV45Copy('E31-ACTION','Уточнення оцінок'),[],profileV45Copy('E31-FOCUS','На що звернути увагу '+(e31==='partial'?'Б':'А')),'E31-ACTION');
  // The questionnaire only activates clarification. Later stages are explicit conditional guidance.
  if(e31!=='partial'){
   u.steps.push(...profileV45Copy('E31-ACTION','Невідкладний захист').map(t=>profileV45Step(t,'E31')));
   const stages=profileV45Copy('E31-ACTION','Розгляд звернень');
   u.steps.push(profileV45Step(stages[0].replace('Розглянути повідомлення','Розглянути за надходження повідомлення'),'E31'));
   u.steps.push(profileV45Step(stages[1],'E31'));
   for(const t of profileV45Copy('E31-ACTION','Заходи за встановленими ризиками'))u.steps.push(profileV45Step(t,'E31'));
   const conditional=profileV45Copy('E31-ACTION',checksField);
   u.checks.push(...conditional.slice(0,3));
   u.checks.push('Після погодження заходів: '+conditional[3][0].toLocaleLowerCase('uk')+conditional[3].slice(1));
  }
  u.checks.push(...profileV45Copy(['negative','partial'].includes(e31)?'E31-R1':'E31-R2',checksField));u.profileOnly=true;add(u);
 }else if(['sample','applicability'].includes(e31)){
  const u=profileV45Unit('E31',[...profileV45Copy('E31-DATA','Дія '+(e31==='sample'?'А':'Б')),...profileV45Copy('E31-DATA','Спільний наступний пункт')],[],[],'E31-DATA');u.profileOnly=true;add(u);
 }
 for(const p of P_LIST){
  if(input.P.answers[p.code]!=='insufficient')continue;
  const check=p.code==='P23'||p.code==='P24'?profileV45Copy('P23-P24-CHECK','Перевірка '+(p.code==='P23'?'А':'Б')):[`Перевірити підтвердження фактичного стану практики «${profileV45Label(p.code)}».`];
  const u=profileV45Unit(p.code,check,[],[],'verify:'+p.code);u.profileOnly=true;add(u);
 }
 profileV45ConsolidateM2(units,input,p12Scenario);
 return {units,p12Scenario};
}
// Clause-level merging uses the approved sample wording. Conditions are semantic branches,
// never sample percentages. All removed clauses are represented by the merged unit trace.
function profileV45ConsolidateM2(units,input,scenario){
 const find=c=>units.find(u=>u.codes.includes(c)&&!u.profileOnly);
 const active=c=>profileV45Problem(input,c),partial=c=>input.P.done&&input.P.answers[c]==='partial';
 const combine=(codes,steps,checks)=>{
  const selected=codes.map(find).filter(Boolean);if(selected.length!==codes.length)return;
  const route=selected[0].route;if(!selected.every(u=>u.route===route))return;
  const u=profileV45Unit(codes[0],steps,checks||[],[], 'merge:'+codes.join('+'));u.codes=codes;u.route=route;
  for(const x of selected){x.steps=[];if(checks)x.checks=x.checks.filter(t=>/^У повторному/.test(t))}
  units.push(u);
 };
 if(active('E06')&&input.branches.E06==='negative'&&partial('P07')&&partial('P09')){
  const e=find('E06'),p=find('P07');
  const u=profileV45Unit('P07',[PROFILE_V45_SAMPLE.steps[1]],[],[],'merge:E06+P07');u.codes=['E06','P07'];u.route=p.route;
  e.steps=e.steps.slice(0,1);p.steps=[];units.push(u);
 }
 if(active('L04')&&partial('P11'))combine(['L04','P11'],[PROFILE_V45_SAMPLE.steps[2]],[PROFILE_V45_SAMPLE.checks[1]]);
 if(active('E08')&&partial('P08'))combine(['E08','P08'],[PROFILE_V45_SAMPLE.steps[4],PROFILE_V45_SAMPLE.steps[5]],[PROFILE_V45_SAMPLE.checks[3]]);
 if(scenario==='P12-S2'&&['E06','E07','E08'].every(active))find('P12').steps[0]=profileV45Step(PROFILE_V45_SAMPLE.steps[8],'P12');
 // Ordering follows the task flow without limiting the number of clauses.
 const order=['E06','P07','L04','P11','E07','E08','P08','P09','P10','P12'];
 units.sort((a,b)=>{const rank=u=>Math.min(...u.codes.map(c=>order.includes(c)?order.indexOf(c):99));return rank(a)-rank(b)});
}
function profileV45Title(id,codes,input){
 const only=(...xs)=>codes.every(c=>xs.includes(c));
 if(only('P18'))return profileV45Copy('P18','Назва дії')[0];
 if(only('P24'))return profileV45Copy('P24','Назва дії')[0];
 if(only('P02'))return 'Забезпечити введення працівника в роль';
 if(only('E16'))return 'Перевірити обґрунтованість оплати для порівнюваних ролей';
 if(only('E33'))return 'Перевірити знання правил безпечної роботи';
 if(only('E12'))return 'Забезпечити безпечну реакцію на повідомлення про власну помилку';
 if(only('L10'))return 'Пояснити критерії розподілу завдань і навантаження';
 if(only('L12'))return 'Надати орієнтири для оцінювання роботи й професійного розвитку';
 if(only('E17'))return 'Удосконалити визнання внеску працівників';
 if(only('E25'))return 'Повідомляти про результат розгляду робочої проблеми';
 if(only('E22'))return 'Забезпечити погоджену гнучкість робочого часу й темпу';
 if(only('L16'))return 'Забезпечити керівникам можливість реагувати на надмірне навантаження';
 if(only('L21'))return 'Залучати керівників до оцінювання ризиків під час організаційних змін';
 if(only('P12'))return 'Перевіряти роботу керівників із командами та виконання рішень';
 if(only('E35'))return 'Забезпечити знання способів отримання офіційних вказівок';
 if(codes.includes('P40')){
  const title=profileV45Copy(input.P.p40Applicable?'P40':'P40-CHECK','Назва дії')[0];
  return only('P40')?title:'Перевірити готовність до прямої загрози та '+title[0].toLocaleLowerCase('uk')+title.slice(1);
 }
 return BAROMETER_V2_ACTION_META[id]?.[0]||profileV45Label(codes[0]);
}
function profileV45Dedupe(entries,mergeOwners=false){
 const seen=new Map();
 for(const entry of entries){const text=profileV45Text(entry.text);if(!text)continue;
  const match=mergeOwners?text.match(/^(.*) \(([^()]*)\)\.$/):null;
  const key=(match?match[1]:text).replace(/\s+/g,' ').trim(),owners=match?[match[2]]:[];
  if(seen.has(key)){const x=seen.get(key);x.codes=barometerUnique([...x.codes,...entry.codes]);x.units=barometerUnique([...x.units,...entry.units]);
   x.owners=barometerUnique([...(x.owners||[]),...owners]);
   if(x.owners.length){const role=x.owners.length===2&&x.owners.includes('керівництво компанії і БЗР')&&x.owners.includes('БЗР із залученням працівників')?'керівництво компанії і БЗР із залученням працівників':x.owners.join('; ');x.text=key+' ('+role+').'}
  }else seen.set(key,{...entry,text,codes:[...entry.codes],units:[...entry.units],...(mergeOwners?{owners}: {})});
 }
 return [...seen.values()];
}
function profileV45Entries(units,field){return profileV45Dedupe(units.flatMap(u=>(u[field]||[]).map(text=>({text,codes:u.codes,units:[u.id],route:u.route||null}))),field==='steps')}
function profileV45Module(input,mid,units,actions,p12Scenario){
 const survey=SURVEY_ITEMS.filter(x=>x.module===mid),practices=P_LIST.filter(x=>x.module===mid),ownUnits=units.filter(u=>u.codes.some(c=>BAROMETER_ALGORITHM_SPEC.signals[c]?.module===mid));
 const align=[],attention=[],notes=[],explained=new Set();
 const addAlign=t=>{if(t)align.push(profileV45Text(t))};
 if(mid===2&&p12Scenario){for(const t of profileV45Copy(p12Scenario,'Висновок'))addAlign(t);for(const c of p12Scenario==='P12-S1'?['E07','L04','P12']:p12Scenario==='P12-S2'?['E09','L06','P12']:p12Scenario==='P12-S3'?['E07','L04','P12']:['P12'])explained.add(c)}
 if(mid===2&&input.branches.L05==='favorable'&&input.branches.E08==='negative'){addAlign(profileV45Copy('G-ALIGN','Фрагмент L05 та E08')[0]);explained.add('E08');explained.add('L05')}
 if(mid===6&&input.branches.E29==='favorable'&&input.branches.E30==='partial'){addAlign(profileV45Copy('G-ALIGN','Фрагмент E29 та E30')[0]);explained.add('E29');explained.add('E30')}
 for(const code of ['E20','E30'])if(survey.some(x=>x.code===code)){
  const branch=input.branches[code],i={favorable:1,mixed:2,partial:3,negative:4}[branch];
  if(i){if(!explained.has(code))for(const t of profileV45Copy(code+'-'+i,'Пояснення відповідей').length?profileV45Copy(code+'-'+i,'Пояснення відповідей'):profileV45Copy(code+'-'+i,'Висновок'))addAlign(t);attention.push(...profileV45Copy(code+'-'+i,PROFILE_V45_FIELDS.attention));explained.add(code)}
 }
 if(mid===5){
  const b=input.branches.E21,ans=input.P.answers.P26;
  if(ans==='partial'&&input.branches.E22==='favorable'&&input.branches.L13==='favorable'&&['favorable','mixed','partial','negative'].includes(b)){
   addAlign(profileV45Copy('E21-P26-CONCLUSIONS','Висновок '+({favorable:'А',negative:'Б',partial:'В',mixed:'Г'}[b]))[0]);['E21','E22','L13','P26'].forEach(c=>explained.add(c));
  }else if(ans==='no'){addAlign(profileV45Copy('E21-P26-CONCLUSIONS','Висновок Д')[0]);explained.add('P26')}
 }
 if(mid===7){
  const b=input.branches.E31,m=input.E.metrics?.E31;
  const variant=b==='partial'?1:b==='negative'?2:['mixed','favorable'].includes(b)?(m.unfavorable>0?3:4):['sample','applicability'].includes(b)?5:null;
  if(variant){addAlign(profileV45Copy('E31-C'+variant,'Висновок')[0]);explained.add('E31')}
 }
 const allFavorable=survey.every(x=>['favorable','absent'].includes(input.branches[x.code]))&&survey.some(x=>input.branches[x.code]==='favorable')&&practices.every(x=>input.P.answers[x.code]==='full')&&input.P.done&&!ownUnits.length;
 if(allFavorable){align.length=0;addAlign(profileV45Copy('G-CLEAR','Висновок '+(input.E.eligible&&input.L.eligible?'А':'Б'))[0])}
 else {
  for(const source of ['E','L']){
   const words=source==='E'?'працівників':'керівників';
   for(const branch of ['negative','partial','mixed']){
    const codes=survey.filter(x=>x.source===source&&input.branches[x.code]===branch&&!explained.has(x.code)).map(x=>x.code);
    if(codes.length){
     const intro=branch==='negative'?`Несприятливі відповіді ${words} стосуються таких питань`:branch==='partial'?`Часткове погодження без несприятливих відповідей ${words} потребує уточнення щодо таких питань`:`Змішані оцінки ${words} без проблемного результату за твердженнями`;
     addAlign(intro+': '+codes.map(profileV45InlineLabel).join('; ')+'.');
    }
   }
  }
  const pfields={full:'Повністю реалізовано',partial:'Частково або нерівномірно',no:'Не реалізовано або не працює',insufficient:'Недостатньо підтверджень',missing:'Немає відповіді'};
  for(const state of ['no','partial','insufficient','missing','full']){
   const codes=practices.filter(p=>!explained.has(p.code)&&(input.P.answers[p.code]||'missing')===state&&(state!=='full'||(PROFILE_V45_LINKS[p.code]||[]).some(c=>profileV45Problem(input,c)))).map(x=>x.code);
   if(codes.length){addAlign(profileV45Copy('G-PSTATE',pfields[state])[0].replace('{назва практики}',codes.map(profileV45InlineLabel).join('; ')));}
  }
  const conflicts=practices.filter(p=>input.P.answers[p.code]==='full'&&(PROFILE_V45_LINKS[p.code]||[]).some(c=>profileV45Problem(input,c)));
  if(conflicts.length||(mid===7&&profileV45Problem(input,'E31')&&['P37','P38','P39'].every(c=>input.P.answers[c]==='full')))addAlign(profileV45Copy('G-ALIGN','Загальний фрагмент')[0]);
  const strong=[];
  for(const source of ['E','L']){
   const codes=survey.filter(x=>x.source===source&&input.branches[x.code]==='favorable'&&!explained.has(x.code)).map(x=>x.code);
   if(codes.length)strong.push((source==='E'?'працівники':'керівники')+' сприятливо оцінюють такі питання, як '+codes.map(profileV45InlineLabel).join('; '));
  }
  if(strong.length)addAlign('Сильна сторона: '+strong.join(', а ')+'.');
 }
 for(const source of ['E','L']){
  if(!input[source].total)notes.push(source==='E'?'Немає відповідей працівників.':'Немає відповідей керівників.');
  else if(!input[source].eligible)notes.push(`${source==='E'?'Працівники':'Керівники'}: отримано ${input[source].total} валідних анкет; недостатня вибірка. Деталі тверджень цього джерела не інтерпретуються.`);
  else {const missing=survey.filter(x=>x.source===source&&input.branches[x.code]==='applicability');if(missing.length)notes.push(`За цими питаннями недостатньо застосовних даних для оцінювання: ${missing.map(x=>profileV45InlineLabel(x.code)).join('; ')}.`)}
 }
 if(input.P.done){
  const focus=practices.filter(p=>['no','partial'].includes(input.P.answers[p.code])&&!ownUnits.some(u=>u.codes.includes(p.code)&&u.attention.length));
  const partial=focus.filter(p=>input.P.answers[p.code]==='partial'),missing=focus.filter(p=>input.P.answers[p.code]==='no');
  if(partial.length)attention.push('Уточнити, які складові або охоплення потребують доповнення у практиках: '+partial.map(p=>profileV45InlineLabel(p.code)).join('; ')+'.');
  if(missing.length)attention.push('Визначити, що потрібно запровадити або відновити у практиках: '+missing.map(p=>profileV45InlineLabel(p.code)).join('; ')+'.');
 }
 if(!input.P.done)notes.push(profileV45Copy('G-PSTATE','Організаційний чекап не завершено')[0]);
 const sections={alignment:barometerUnique(align),attention:barometerUnique([...attention,...profileV45Entries(ownUnits,'attention').map(x=>x.text)]),steps:profileV45Entries(ownUnits,'steps'),checks:profileV45Entries(ownUnits,'checks')};
 if(allFavorable){sections.attention=['Перевіряти стійкість наявних практик під час змін у роботі.'];sections.checks=[{text:profileV45Copy('G-REPEAT','Критерій В')[0],codes:survey.map(x=>x.code),units:['G-REPEAT'],route:null}]}
 if(input.P.done&&practices.every(p=>['no','partial'].includes(input.P.answers[p.code]))){
  sections.checks.push({text:'У повторному організаційному чекапі перевірено реалізацію погоджених змін за всіма шістьма практиками та їх фактичне застосування в цьому робочому середовищі.',codes:practices.map(p=>p.code),units:['practice-review'],route:null});
 }
 if(mid===7&&['favorable','mixed'].includes(input.branches.E31)&&input.E.metrics.E31.unfavorable===0)sections.checks.push({text:profileV45Copy('E31-R3',PROFILE_V45_FIELDS.checks)[0],codes:['E31'],units:['E31-R3'],route:null});
 if(input.P.done&&input.P.answers.P13==='no'&&mid===3)sections.attention.push('Відсутність правил поважної взаємодії є критичною прогалиною практики; ця оцінка сама по собі не встановлює конкретного випадку неприйнятної поведінки.');
 if(!sections.alignment.length)sections.alignment=['За доступними даними змістовий висновок щодо цього модуля не формується.'];
 return {module:mid,sections,actions:actions.filter(x=>x.module===mid),lead:sections.alignment.join(' '),dataNotes:barometerUnique(notes),aspects:[],clusters:[],crossRefs:barometerUnique(ownUnits.filter(u=>u.route&&BAROMETER_V2_ACTION_MODULE[u.route]!==mid).map(u=>u.route)).map(id=>({id,final_action_id:id,module:BAROMETER_V2_ACTION_MODULE[id]})),problemCodes:[...survey.filter(x=>profileV45Problem(input,x.code)).map(x=>x.code),...practices.filter(p=>input.P.done&&['no','partial'].includes(input.P.answers[p.code])).map(p=>p.code)],practiceAudit:practices.map(p=>({code:p.code,answer:input.P.answers[p.code]||null,done:input.P.done,related:(PROFILE_V45_LINKS[p.code]||[]).map(c=>({code:c,branch:input.branches[c]})),units:units.filter(u=>u.codes.includes(p.code)).map(u=>u.id)}))};
}
function profileV45Analysis(raw){
 const input=profileV45Input(raw),routes=profileV45Routes(input),{units,p12Scenario}=profileV45BuildUnits(input,routes),actions=[];
 for(const id of barometerUnique(units.map(u=>u.route))){
  const own=units.filter(u=>u.route===id),codes=barometerUnique(own.flatMap(u=>u.codes)),steps=profileV45Entries(own,'steps'),checks=profileV45Entries(own,'checks'),module=BAROMETER_V2_ACTION_MODULE[id];
  if(!steps.length)continue;
  actions.push({id,target:id,final_action_id:id,module,title:profileV45Title(id,codes,input),steps:steps.map(x=>x.text),check:checks.map(x=>x.text).join('\n'),action:steps.map(x=>'• '+x.text).join('\n'),basis_codes:codes,primary_codes:codes,variant:id.includes('-D')?'diagnostic':'standard',classification:'DATA_BASED',support_count:new Set(codes.map(c=>c[0])).size,sources:barometerUnique(codes.map(c=>c[0])),issues:codes.map(c=>({source:'',topic:profileV45Label(c)})),clarifications:[],planEligible:true,trace:{steps,checks}});
 }
 const modules=Object.fromEntries(M.map((_,i)=>[i+1,profileV45Module(input,i+1,units,actions,p12Scenario)]));
 return {version:'profile-v45-2026-10-26',input,modules,actions,units,routes,p12Scenario,aspects:[]};
}
barometerBuildSemanticAnalysis=profileV45Analysis;
barometerSemanticInterpretation=profileV45Analysis;
selectedActions=function(moduleId){return profileV45Analysis().modules[moduleId]?.actions||[]};
