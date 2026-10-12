(() => {
  const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const screen=$('#screen'), modal=$('#modal'), drawer=$('#drawer'), ai=$('#ai-panel'), stagePanel=$('#stage-change-panel');
  let modalDone=()=>{}, taskFilter='active', searchRan=false, searchMode='manual', activeSearchFilters=[], searchSources={ats:true,hh:false,avito:false,getmatch:false}, selectedStage='review', selectedCandidate=0, candidateTab='overview', calendarView='week', activeVacancyId='android', vacancyDetailTab='overview', profilePopover='', pendingStage='review', selectedVacancyAiFunnel='it', pipelineResizeObserver, pipelineLayoutFrame;
  /* hires + waiting никогда не больше positions: вышедшие и принявшие оффер —
     это те же ставки. load разводит поток по вакансиям, чтобы карточки не
     показывали одни и те же числа. roles держит кандидатов в своей профессии. */
  const vacancies={
    android:{name:'Senior Android-разработчик',department:'Mobile',grade:'Senior',priority:1,recruiter:'Елена Крылова',progress:78,sla:'8 дней',positions:2,hires:1,waiting:1,load:1,roles:['Android-разработчик','Mobile Developer','Senior Software Engineer']},
    designer:{name:'Senior Product Designer',department:'Core Product',grade:'Senior',priority:2,recruiter:'Антон Беляев',progress:62,sla:'19 дней',positions:1,hires:1,waiting:0,load:.6,roles:['Product Designer','UX/UI-дизайнер','Дизайнер интерфейсов']},
    analyst:{name:'Data Analyst',department:'BI',grade:'Middle',priority:2,recruiter:'Мария Фролова',progress:34,sla:'−2 дня',positions:1,hires:0,waiting:1,load:.45,roles:['Data Analyst','BI-аналитик','Продуктовый аналитик']},
    backend:{name:'Backend-разработчик Go',department:'Platform',grade:'Senior',priority:1,recruiter:'Ирина Лебедева',progress:71,sla:'12 дней',positions:3,hires:1,waiting:2,load:1.3,roles:['Backend Engineer','Go-разработчик','Senior Software Engineer']},
    ios:{name:'Senior iOS-разработчик',department:'Mobile',grade:'Senior',priority:1,recruiter:'Не назначен',status:'на распределении',progress:0,sla:'Не начат',positions:2,hires:0,waiting:0,load:.15,roles:['iOS-разработчик','Swift-разработчик','Mobile Developer']},
    service:{name:'Руководитель клиентского сервиса',department:'Operations',grade:'Lead',priority:1,recruiter:'Не назначен',status:'на распределении',progress:49,sla:'5 дней',positions:1,hires:0,waiting:0,load:.55,roles:['Руководитель клиентского сервиса','Customer Service Lead','Руководитель поддержки']},
    sales:{name:'B2B Sales / Менеджер B2B продаж',department:'Продажи',grade:'Middle',priority:1,recruiter:'Елена Крылова',progress:70,sla:'12 дней',positions:2,hires:1,waiting:0,load:1,roles:['B2B Sales Manager','Business Development Manager']},
    fullstack:{name:'Fullstack-разработчик',department:'Разработка',grade:'Senior',priority:2,recruiter:'Антон Беляев',progress:41,sla:'5 дней',positions:2,hires:0,waiting:0,load:.8,roles:['Fullstack-разработчик','Software Engineer']},
    java:{name:'Java-разработчик',department:'Разработка',grade:'Middle',priority:3,recruiter:'Мария Фролова',progress:25,sla:'30 дней',positions:1,hires:0,waiting:0,load:.5,roles:['Java-разработчик','Backend Engineer']},
    smm:{name:'Контент-менеджер / SMM',department:'Маркетинг',grade:'Middle',priority:3,recruiter:'Ирина Лебедева',progress:55,sla:'3 дня',positions:1,hires:0,waiting:0,load:.7,roles:['Контент-менеджер','SMM-менеджер']},
    marketing:{name:'Product Marketing Manager',department:'Marketing',grade:'Middle+',priority:2,recruiter:'Антон Беляев',progress:46,sla:'Приостановлена',positions:1,hires:0,waiting:0,load:.35,roles:['Product Marketing Manager','Продуктовый маркетолог','Marketing Manager']},
    research:{name:'UX Researcher',department:'Core Product',grade:'Middle',priority:3,recruiter:'Мария Фролова',progress:23,sla:'31 день',positions:1,hires:0,waiting:0,load:.25,roles:['UX Researcher','Исследователь пользовательского опыта','Product Researcher']}
  };
  try{Object.assign(vacancies,JSON.parse(localStorage.getItem('sobesso-prototype-new-vacancies'))||{});}catch{}
  window.VacancyAllocation?.hydrate(vacancies);
  window.VacancyEditorForm?.hydrate(vacancies);
  /* Рабочая лента — та же воронка, что настроена у вакансии: один список, а не
     второй рядом. Режим состав не подменяет, а дописывает хвост найма. */
  const TERMINAL_KEYS=['response','waiting','rejected','handed'];
  const STAGE_LOAD=[18,10,6,5,2,1,0,0,0];
  const FALLBACK_FUNNEL=[{id:'response',purpose:'response',system:true,name:'Отклик',enabled:true},{id:'scoring',name:'Скоринг резюме',enabled:true},{id:'chat',name:'Чат-бот',enabled:true},{id:'awaiting',purpose:'awaiting',system:true,name:'Ожидание выхода',enabled:true},{id:'rejection',purpose:'rejection',system:true,name:'Отказ',enabled:true}];
  const stagePlural=n=>n===1?'этап':n<5?'этапа':'этапов';
  const sysName=(funnel,purpose,fallback)=>funnel.find(s=>s.system&&s.purpose===purpose)?.name||fallback;
  let stages=[],systemStageKeys=new Set(),stageCounts={};
  /* Состав пересобирается на каждый рендер: воронку могли поменять на экране
     настройки, а оповещения об этом в прототипе нет. */
  const routeVacancy=()=>vacancies[(location.hash.match(/^#vacancy\/([^/]+)/)||[])[1]]||vacancies[activeVacancyId]||vacancies.android;
  function applyMode(){
    const id=(location.hash.match(/^#vacancy\/([^/]+)/)||[])[1]||activeVacancyId;
    window.VacancySetup?.context(id);
    const funnel=window.VacancySetup?.funnel?.()||FALLBACK_FUNNEL,tail=window.ProductMode?.tail?.()||{stages:[],counts:{}},handoff=window.ProductMode?.handoff?.(),v=routeVacancy(),load=x=>Math.round(x*v.load);
    const work=funnel.filter(s=>!s.system&&s.enabled).map(s=>[s.id,s.name]).concat(tail.stages);
    const terminal=handoff?['handed',handoff]:['waiting',sysName(funnel,'awaiting','Ожидание выхода')];
    stages=[['response',sysName(funnel,'response','Отклик')],...work,terminal,['rejected',sysName(funnel,'rejection','Отказ')]];
    systemStageKeys=new Set(['response',terminal[0],'rejected']);
    stageCounts={response:load(42),rejected:load(27),[terminal[0]]:handoff?load(9):v.waiting,...Object.fromEntries(work.map(([key],i)=>[key,load(STAGE_LOAD[i]??0)])),...tail.counts&&Object.fromEntries(Object.entries(tail.counts).map(([key,count])=>[key,load(count)]))};
    if(id==='ios')stageCounts=Object.fromEntries(stages.map(([key])=>[key,key==='response'?6:0]));
    stageCounts=window.CandidacyRuns?.materialize(id,stages,stageCounts,candidate)||stageCounts;
    if(!stages.some(([key])=>key===selectedStage))selectedStage=stages[1]?.[0]||'response';
  }
  const people=['Алина Воронцова','Михаил Петров-Соколов','Марина Орлова','Дмитрий Назаров','Виктория Чен','Пётр Волков','Екатерина Соколова','Никита Фомин','Ольга Романова','Сергей Лапшин'];
  const candidatePhotos={
    'Алина Воронцова':{file:'portrait-alina.png'},
    'Дмитрий Назаров':{file:'portraits-men.png',crop:'pair-right'},
    'Виктория Чен':{file:'portraits-pair.png',crop:'pair-right'},
    'Пётр Волков':{file:'portraits-men.png',crop:'pair-left'},
    'Екатерина Соколова':{file:'portrait-ekaterina.png'},
    'Никита Фомин':{file:'portraits-pair.png',crop:'pair-left'},
    'Ольга Романова':{file:'portrait-olga.png'},
    'Сергей Лапшин':{file:'portrait-sergey.png'}
  };
  const candidateTags={
    'Дмитрий Назаров':['Android','Приоритет'],
    'Виктория Чен':['Рекомендация'],
    'Пётр Волков':['Повторный контакт'],
    'Екатерина Соколова':['Сильная мотивация'],
    'Ольга Романова':['На будущее']
  };
  const candidateTagOptions=['Android','Senior','Приоритет','Рекомендация','Сильная мотивация','Повторный контакт','На будущее','Удалённая работа'];
  const roles=['Android-разработчик','Senior Software Engineer','Mobile Developer','Product Designer','Data Analyst','Backend Engineer'];
  const candidate=(vacancy,stage,index)=>{const isMl=vacancy==='analyst'&&index<2,name=isMl?(index===0?'Ярослав Морозов':'Дмитрий Ветров'):people[(index+stages.findIndex(s=>s[0]===stage))%people.length],role=isMl?(index===0?'Senior ML Engineer':'ML Engineer · LLM Developer'):(vacancies[vacancy]?.roles||roles)[(index+stage.length)%(vacancies[vacancy]?.roles||roles).length],company=isMl?(index===0?'FunTech':'Независимая ML-разработка'):['Яндекс','Ozon Tech','Т-Банк','VK','Avito','Kaspersky'][index%6];return{id:`${vacancy}-${stage}-${index}`,name,initials:name.split(' ').map(x=>x[0]).slice(0,2).join(''),role,company,stage,score:index===8?'Ошибка':`${9-index%6}.${index%10}`,source:['hh.ru','Своя база','Авито Работа','GetMatch'][index%4],days:index+1,salary:`${220+index*15} 000 ₽`,consent:index===7?'Запрошено':'Дано',signal:index===9?'Потенциальная накрутка опыта':'',profile:isMl?(index===0?'ml-senior':'llm-engineer'):'default'}};
  const candidatesFor=(vacancy,stage)=>window.CandidacyRuns?.candidates(vacancy,stage)||[];
  const currentCandidate=()=>{const list=candidatesFor(activeVacancyId,selectedStage),shown=window.CandidacyRuns?.filter(list)||list;return shown[selectedCandidate%Math.max(1,shown.length)];};
  let tasks=[
    {id:1,title:'Связаться с Михаилом Петровым-Соколовым',object:'Senior Android-разработчик · кандидат',priority:'Высокий',due:'сегодня, 11:00',late:true,progress:'—'},
    {id:2,title:'Получить фидбек после портфолио',object:'Senior Product Designer · 3 интервьюера',priority:'Обычный',due:'сегодня, 14:00',progress:'—'},
    {id:3,title:'Добавить 10 новых кандидатов',object:'Senior Android-разработчик · количественная',priority:'Обычный',due:'сегодня, 18:00',progress:'6 из 10',quant:true},
    {id:4,title:'Назначить 4 технических интервью',object:'Senior Android-разработчик · количественная',priority:'Высокий',due:'завтра',progress:'2 из 4',quant:true},
    {id:5,title:'Получить фидбек технического интервью',object:'Data Analyst · нанимающий менеджер',priority:'Критический',due:'вчера, 16:00',late:true,progress:'—'},
    {id:6,title:'Обновить комментарий по поиску',object:'Руководитель клиентского сервиса · вакансия',priority:'Обычный',due:'вчера, 18:00',late:true,progress:'—'},
    {id:7,title:'Отправить согласованный оффер',object:'Backend-разработчик Go · кандидат',priority:'Высокий',due:'сегодня, 17:00',progress:'—',needsAts:true},
    {id:8,title:'Проверить новые отклики',object:'Senior Product Designer · 18 откликов',priority:'Обычный',due:'12 сентября',future:true,progress:'—'},
    {id:9,title:'Зафиксировать фидбек',object:'Product Analyst · интервью',priority:'Обычный',due:'2 сентября',done:true,progress:'—'}
  ];
  let queryRows=[{logic:'И',field:'Все доступные данные',op:'все слова',value:''}], creationView=null,pendingVacancyRequest=null;

  function creationCatalog(){
    return Object.entries(vacancies).filter(([id])=>!['marketing','research'].includes(id)).map(([id,v])=>{
      let pipeline=v.pipeline?.stages;
      try{const scoped=JSON.parse(localStorage.getItem('sobesso-ai-vacancy-v6-'+id));if(Array.isArray(scoped?.stages))pipeline=scoped.stages.map(s=>({...s,label:s.name||({scoring:'Скоринг','chat-bot':'Чат-бот',voice:'ИИ-интервью'}[s.kind])||'Этап',terminal:s.purpose==='awaiting'||s.purpose==='rejection'}));}catch{}
      const fallback=VACANCY_AI_FUNNELS[id==='service'?'backoffice':'it'].stages.map((label,index)=>({id:'stage-'+index,label,terminal:['Выход','Отказ'].includes(label)}));
      const stages=(pipeline?.length?pipeline:fallback).map(s=>({id:s.id,label:s.label||s.name,terminal:!!s.terminal||s.purpose==='awaiting'||s.purpose==='rejection',enabled:s.enabled!==false}));
      return {id,title:v.name,stages,initialStage:stages.find(s=>!s.terminal)?.id||'',department:v.department,grade:v.grade,recruiter:v.recruiter,recruiterId:v.recruiterId||'',proposedRecruiterId:v.proposedRecruiterId||'',status:v.status||'',participants:v.participants||[],hiringTeam:v.hiringTeam||[],funnelName:v.pipeline?.name||v.funnelName||'',positions:v.positions,hires:v.hires,sla:v.sla,createdAt:v.createdAt,priority:v.priority,progress:v.progress,candidateCount:v.createdLocally?(window.CreationStore?.records(id)||[]).length:undefined,createdLocally:!!v.createdLocally,sourceRequisition:v.sourceRequisition||null};
    });
  }
  function refreshCreatedSidebar(){
    const nav=document.querySelector('.vacancy-nav'),archive=nav?.querySelector('.archive');
    if(!nav)return;nav.querySelectorAll('[data-created-vacancy-link]').forEach(a=>a.remove());
    Object.entries(vacancies).filter(([id])=>id.startsWith('draft-')).forEach(([id,v])=>{
      const link=document.createElement('a');link.className='vacancy-link';link.dataset.createdVacancyLink='';link.dataset.route='vacancy/'+id;link.href='#vacancy/'+id;link.textContent=v.name;nav.insertBefore(link,archive||null);
    });
  }
  function persistCreatedVacancies(){
    try{localStorage.setItem('sobesso-prototype-new-vacancies',JSON.stringify(Object.fromEntries(Object.entries(vacancies).filter(([id])=>id.startsWith('draft-')))));refreshCreatedSidebar();return true;}catch{return false;}
  }
  function registerVacancy(object,name){
    const legacy=typeof object==='string';
    const id=legacy?object:object?.id;
    if(!legacy&&object?.sourceRequisition){
      if(!/^REQ-\d+$/.test(object.sourceRequisition))return {ok:false,error:'Проверьте исходную заявку.'};
      const existing=Object.values(vacancies).find(v=>v.sourceRequisition===object.sourceRequisition);
      if(existing)return {ok:true,persisted:true,alreadyCreated:true,object:existing};
    }
    if(!/^draft-[a-z0-9-]+$/i.test(id||'')||Object.hasOwn(vacancies,id))return {ok:false,error:'Не удалось зарегистрировать новую вакансию.'};
    const v=legacy?{id,name,department:'',grade:'Middle',priority:2,positions:1,recruiter:'Не назначен',roles:[],load:0,hires:0,waiting:0,progress:0,sla:'Не начат',createdLocally:true,sourceRequisition:null}:JSON.parse(JSON.stringify(object));
    if(v.sourceRequisition){v.status='на распределении';v.proposedRecruiterId=v.proposedRecruiterId||v.recruiterId||'';v.recruiterId='';v.recruiter='Не назначен';v.participants=[];v.startedAt=null;v.sla='Не начат';}
    v.createdLocally=true;v.load=0;v.hires=0;v.waiting=0;v.progress=0;v.roles=[];
    let persisted=false;const custom=Object.fromEntries(Object.entries(vacancies).filter(([key])=>key.startsWith('draft-')));custom[id]=v;
    try{
      if(!legacy)localStorage.setItem('sobesso-ai-vacancy-v6-'+id,JSON.stringify(window.VacancyCreate.setupFor(v)));
      localStorage.setItem('sobesso-prototype-new-vacancies',JSON.stringify(custom));persisted=true;
    }catch{return {ok:false,message:'Не хватает места для сохранения вакансии. Освободите место в браузере и повторите.'};}
    vacancies[id]=v;refreshCreatedSidebar();return {ok:true,persisted,object:v};
  }
  function renderCreation(kind){
    const cancel=()=>routeTo('search');
    if(kind==='requisition'||kind==='requisition-ai'){window.RequestExperience?.open({keepRoute:true});return;}
    if(kind==='candidate')creationView=window.CandidateCreate?.mount(screen,{vacancies:creationCatalog(),onCancel:cancel,register:(candidate,assignment)=>window.CreationStore.add(candidate,assignment,creationCatalog()),onCreated:(candidate,assignment,result)=>{
      const record=result?.record||window.CreationStore.read().records.find(r=>r.candidate.id===candidate.id);
      if(record){routeTo('vacancy/'+record.vacancyId);showToast(result?.persisted===false?'Кандидат добавлен до закрытия вкладки; сохранить в браузере не удалось.':'Кандидат добавлен на выбранный этап вакансии');}
    }});
    else creationView=window.VacancyCreate?.mount(screen,{initialValues:pendingVacancyRequest?.values,sourceRequisition:pendingVacancyRequest?.id,approvedRequisitionVersion:pendingVacancyRequest?.approvedVersion,onCancel:()=>{pendingVacancyRequest=null;cancel();},register:v=>registerVacancy(pendingVacancyRequest?{...v,sourceRequisition:pendingVacancyRequest.id,approvedRequisitionVersion:pendingVacancyRequest.approvedVersion}:v),onCreated:(id,result)=>{pendingVacancyRequest=null;routeTo('vacancy/'+id);showToast(result?.persisted===false?'Вакансия создана только в текущей вкладке':vacancies[id]?.status==='на распределении'?'Вакансия создана на распределении. Назначьте ответственного и команду.':'Вакансия создана. Кандидаты и ИИ-оценки пока отсутствуют.');}});
  }
  function renderCreatedVacancy(id){
    activeVacancyId=id;const v=vacancies[id],records=window.CreationStore.records(id),catalog=creationCatalog().find(c=>c.id===id);
    if(v.status==='на распределении'){
      screen.innerHTML=`<section class="created-vacancy" data-antd="none"><header><div><h1>${esc(v.name)}</h1><p>${esc(v.department)} · ${esc(v.grade)} · <span>На распределении</span>${v.sourceRequisition?' · '+esc(v.sourceRequisition):''}</p></div><button class="btn" data-action="vacancy-info">Настройки вакансии</button></header><div class="created-vacancy-empty"><h2>Назначьте ответственного рекрутера</h2><p>Вакансия создана из согласованной заявки и пока не взята в работу. Выберите рекрутера и нанимающую команду; затем при необходимости настройте ИИ и автоматизацию.</p><button class="btn primary" data-action="vacancy-allocate" data-id="${esc(id)}">Распределить вакансию</button></div><p class="created-vacancy-note">Сведения заявки и выбранная воронка сохранены. Автоматические действия не запускаются.</p></section>`;return;
    }
    screen.innerHTML=`<section class="created-vacancy" data-antd="none"><header><div><h1>${esc(v.name)}</h1><p>${esc(v.department)} · ${esc(v.grade)} · Рекрутер: ${esc(v.recruiter)}</p></div><button class="btn" data-action="vacancy-info">Настройки вакансии</button></header><nav class="created-pipeline" aria-label="Этапы новой вакансии">${(catalog?.stages||[]).map(s=>`<span>${esc(s.label)} <b>${records.filter(r=>r.stageId===s.id).length}</b></span>`).join('')}</nav>${records.length?`<div class="created-vacancy-list">${records.map(r=>`<button data-created-candidate="${esc(r.candidate.id)}"><span>${esc(r.candidate.initials)}</span><div><b>${esc(r.candidate.name)}</b><small>${esc(r.candidate.position)} · ${esc(r.stage)}</small></div></button>`).join('')}</div><div class="actions" style="margin-top:20px">${button('+ Добавить кандидата','add-candidate','primary')}</div>`:`<div class="created-vacancy-empty"><h2>Вакансия готова к подбору</h2><p>Добавьте первого кандидата на нужный этап. ИИ и коммуникации автоматически не запускаются.</p>${button('+ Добавить кандидата','add-candidate','primary')}</div>`}<p class="created-vacancy-note">Создано в этом браузере. Публикации, история и оценки другой вакансии не переносятся.</p></section>`;
  }

  const head=(title,sub,actions='')=>`<header class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}</div></header>`;
  const button=(label,action,kind='')=>`<button class="btn ${kind}" data-action="${action}">${label}</button>`;
  /* Поле даты: нативный input[type=date] показывал системный значок и формат MM/DD.
     Разметка DatePicker взята из antd/sample.html, календарь в макете не открывается. */
  const datePicker=(value,label)=>`<div class="ant-picker ant-picker-outlined ant-picker-css-var" data-antd="DatePicker" data-antd-props="format=DD.MM.YYYY"><div class="ant-picker-input"><input readonly autocomplete="off" size="12" aria-label="${label}" value="${value}"><span class="ant-picker-suffix"><span role="img" aria-label="calendar" class="anticon anticon-calendar"><svg viewBox="64 64 896 896" focusable="false" data-icon="calendar" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M880 184H712v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H384v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H144c-17.7 0-32 14.3-32 32v664c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V216c0-17.7-14.3-32-32-32zm-40 656H184V460h656v380zM184 392V256h128v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h256v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h128v136H184z"></path></svg></span></span></div></div>`;
  const icon=id=>`<svg aria-hidden="true"><use href="assets/icons.svg?public=4ea628562901#${id}"></use></svg>`;
  /* Значок внутри Button (49.3): antd ждёт .ant-btn-icon > .anticon и картинку в 1em —
     у спрайта макета своего размера нет, поэтому размер задаётся здесь. */
  const btnIcon=id=>`<span class="ant-btn-icon"><span class="anticon"><svg width="1em" height="1em" aria-hidden="true"><use href="assets/icons.svg?public=4ea628562901#${id}"></use></svg></span></span>`;
  /* Плитки действий карточки кандидата — обычные Button со значком (49.3): свой класс снят,
     иначе старые правила .profile-action-button рвали подпись посреди слова. */
  const profileAction=(label,action,iconId)=>`<button type="button" data-action="${action}" data-antd="Button" data-antd-props="block" title="${label}">${btnIcon(iconId)}<span>${label}</span></button>`;
  /* Кнопки панели форматирования — Button type=text size=small icon (49.3); подпись у значка
     остаётся в title, на боевом фронте это Tooltip. */
  const RICH_TOOLS=[['bold','bold','Полужирный'],['italic','italic','Курсив'],['bullet','bullet-list','Маркированный список'],['number','numbered-list','Нумерованный список'],['link','link','Добавить ссылку'],['mention','user-recruiters','Упомянуть коллегу']];
  const richEditor=(placeholder,attribute='data-comment-editor')=>`<div class="rich-editor"><div class="rich-toolbar" role="toolbar" aria-label="Форматирование текста">${RICH_TOOLS.map(([format,iconId,label])=>`<button type="button" data-action="format-text" data-format="${format}" title="${label}" aria-label="${label}" data-antd="Button" data-antd-props="type=text size=small icon">${iconId?btnIcon(iconId):'<span class="ant-btn-icon"><span class="anticon">@</span></span>'}</button>`).join('')}</div><div class="rich-input" contenteditable="true" role="textbox" aria-multiline="true" ${attribute} data-placeholder="${placeholder}"></div></div>`;
  const safeRichText=editor=>{const box=document.createElement('div');box.innerHTML=editor?.innerHTML||'';box.querySelectorAll('script,style,iframe,object,embed').forEach(node=>node.remove());box.querySelectorAll('*').forEach(node=>[...node.attributes].forEach(attr=>{if(attr.name.startsWith('on')||(attr.name==='href'&&!/^(https?:|mailto:)/.test(attr.value)))node.removeAttribute(attr.name)}));return box.innerHTML};
  const candidatePhoto=(c,kind='avatar')=>{const photo=candidatePhotos[c.name];return `<span class="${kind} candidate-image ${photo?'has-photo':'no-photo'} tone-${c.days%5}" aria-label="Фотография: ${c.name}">${photo?`<img src="assets/candidates/${photo.file}" class="${photo.crop||''}" alt="${c.name}">`:''}<span>${c.initials}</span></span>`};
  const showToast=text=>{const t=$('#toast');t.textContent=text;t.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.hidden=true,2600)};
  const openModal=(title,sub,body,primary='Сохранить',done=()=>{modal.close();showToast('Изменения сохранены')},info=false)=>{modalDone=done;modal.classList.remove('vacancy-editor-modal','vacancy-ai-modal','vacancy-publication-modal','vacancy-history-modal');delete modal.dataset.rerenderEditor;$('#modal-title').textContent=title;$('#modal-subtitle').textContent=sub;$('#modal-body').innerHTML=body;$('#modal-body').scrollTop=0;modal.scrollTop=0;$('#modal-footer').innerHTML=info?`<button class="btn" data-close-modal>${primary}</button>`:`<button class="btn" data-close-modal>Отмена</button><button class="btn primary" data-confirm-modal>${primary}</button>`;if(!modal.open)modal.showModal()};
  const openDrawer=(title,sub,body)=>{drawer.classList.remove('vacancy-details-drawer');$('#drawer-title').textContent=title;$('#drawer-subtitle').textContent=sub;$('#drawer-body').innerHTML=body;drawer.hidden=false};
  const closeStagePanel=()=>{stagePanel.hidden=true;stagePanel.innerHTML=''};
  const openStageChange=()=>{const c=currentCandidate();if(c)window.CandidacyRuns.askMove([c]);};
  const routeTo=r=>{location.hash=r};
  function assignVacancy(id,values){
    const target=creationCatalog().find(v=>v.id===id),result=window.VacancyAllocation?.save(target,values);
    if(result?.ok&&(!result.alreadyAssigned||vacancies[id]?.status==='на распределении')){
      Object.assign(vacancies[id],result.record);refreshCreatedSidebar();
      // Сетевой экран ошибки iframe может иметь другой origin. Обновление
      // его представления не должно отменять уже сохранённое назначение.
      try{document.querySelector('#colleague-reference-frame')?.contentWindow?.dispatchEvent(new Event('colleague-context-refresh'));}catch{}
    }
    return result||{ok:false,errors:['Распределение сейчас недоступно.']};
  }
  function openVacancyAllocation(id){
    const target=creationCatalog().find(v=>v.id===id);
    if(!target||target.status!=='на распределении')return false;
    return window.VacancyAllocation?.open(target,{onAssign:values=>assignVacancy(id,values),onAssigned:(result,{configure})=>{
      showToast('Вакансия распределена и взята в работу');
      if(configure){routeTo('vacancy/'+id+'/edit');render();screen.querySelector('[data-action="vacancy-ai-settings"]')?.click();}
      else if(location.hash==='#vacancy/'+id)render();
    }})||false;
  }
  const fitPipelineStages=()=>{
    const rail=screen.querySelector('.pipeline-stages'),more=rail?.querySelector('.pipeline-overflow');if(!rail||!more)return;
    const items=[...rail.querySelectorAll('[data-pipeline-item]')],count=more.querySelector('span'),activeOrder=Math.max(0,stages.findIndex(([key])=>key===selectedStage));
    items.forEach(item=>item.hidden=false);more.hidden=true;count.textContent='0';
    if(rail.scrollWidth<=rail.clientWidth+1)return;
    more.hidden=false;
    /* Прячем с хвоста: «Ещё N» стоит в конце строки, и читаться должно как
       «дальше ещё столько-то». Спрятать начало воронки — соврать про порядок.
       Пустые этапы уходят первыми: за ними никого нет. */
    const candidates=items.filter(item=>!item.classList.contains('active')).sort((a,b)=>{
      const aEmpty=a.classList.contains('empty-stages'),bEmpty=b.classList.contains('empty-stages');if(aEmpty!==bEmpty)return aEmpty?-1:1;
      return Number(b.dataset.order)-Number(a.dataset.order);
    });
    let hiddenCount=0;
    while(rail.scrollWidth>rail.clientWidth+1&&candidates.length){const item=candidates.shift();item.hidden=true;hiddenCount+=Number(item.dataset.pipelineWeight||1);count.textContent=String(hiddenCount)}
    if(!hiddenCount)more.hidden=true;
  };
  const mountPipelineLayout=()=>{
    pipelineResizeObserver?.disconnect();cancelAnimationFrame(pipelineLayoutFrame);
    const rail=screen.querySelector('.pipeline-stages');if(!rail)return;
    pipelineResizeObserver=new ResizeObserver(fitPipelineStages);pipelineResizeObserver.observe(rail);
    pipelineLayoutFrame=requestAnimationFrame(fitPipelineStages);
  };

  function renderSearch(){
    const scopeOptions=['Все доступные данные','Резюме и навыки','Опыт работы','Образование','Фидбек и комментарии','ФИО и контакты'];
    const sourcePool=['Своя база',...(searchSources.hh?['hh.ru']:[]),...(searchSources.avito?['Авито Работа']:[]),...(searchSources.getmatch?['GetMatch']:[])];
    const row=(r,i)=>`<div class="search-query-row ${i===0?'is-first':''}">${i===0?'<span class="search-glass" aria-hidden="true">⌕</span>':`<select class="query-logic" data-q="logic" data-i="${i}"><option>${r.logic}</option><option>${r.logic==='И'?'ИЛИ':'И'}</option><option>НЕ</option></select>`}<input value="${esc(r.value)}" data-q="value" data-i="${i}" placeholder="${i===0?'Должность, навык, компания или текст из резюме':'Добавьте ещё одно условие'}"><select data-q="field" data-i="${i}">${scopeOptions.map(x=>`<option ${x===r.field?'selected':''}>${x}</option>`).join('')}</select><select data-q="op" data-i="${i}"><option>${r.op}</option><option>любое слово</option><option>точная фраза</option><option>не содержит</option></select>${i===0?'':`<button class="icon-btn" data-action="remove-query" data-i="${i}" aria-label="Удалить условие">×</button>`}</div>`;
    const resumeCards=searchRan?people.slice(0,7).map((name,i)=>{const source=sourcePool[i%sourcePool.length],score=94-i*4,role=roles[i%roles.length],company=['Яндекс','Ozon Tech','VK','Т-Банк'][i%4];return `<article class="resume-card" data-action="candidate-preview" data-i="${i}"><div class="resume-avatar">${name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div class="resume-content"><div class="resume-title-line"><div><h3>${name}</h3><p>${role}</p></div><span class="resume-source ${source==='База ATS'?'internal':''}">${source}</span></div><div class="resume-meta"><span>${28+i} лет</span><span>Москва</span><span>обновлено ${i<2?'сегодня':i+1+' дн. назад'}</span><b>${220+i*20} 000 ₽</b></div><span class="pill good">${i%3===0?'Активно ищет работу':'Рассматривает предложения'}</span><div class="resume-experience"><span>Последний опыт</span><div><b>${company} · ${role}</b><p>${3+i} года ${i%5+1} месяцев · Kotlin, Android, REST, продуктовая разработка</p></div></div><div class="resume-tags"><span>Kotlin</span><span>Android SDK</span><span>Командная разработка</span>${i%2?'<span>Удалённо</span>':''}</div></div><aside class="resume-actions"><span class="match-score"><b>${score}%</b> соответствие</span><button class="btn" data-action="add-search-result" data-name="${name}">+ На вакансию</button><button class="btn" data-action="candidate-preview" data-i="${i}">Открыть профиль</button></aside></article>`}).join(''):`<div class="search-empty"><div>⌕</div><h2>Начните поиск по базе кандидатов</h2><p>Введите должность, навык, компанию или фрагмент резюме. При необходимости добавьте условия и подключите внешние источники.</p></div>`;
    const modeTabs=`<div class="search-mode-tabs"><button class="${searchMode==='manual'?'active':''}" data-action="search-mode" data-mode="manual">Поиск по базе</button><button class="ai-mode ${searchMode==='ai'?'active':''}" data-action="search-mode" data-mode="ai"><span>AI</span> ИИ-поиск</button><button data-action="saved-searches">Сохранённые поиски</button></div>`;
    const autoMatch=`<section class="auto-match-card"><div class="auto-match-mark">AI</div><div><h2>Автоподбор к вакансии</h2><p>Выберите вакансию — ИИ возьмёт её требования, предложит критерии и найдёт подходящих кандидатов в базе и доступных источниках.</p></div><button class="btn" data-action="auto-match" data-antd-props="color=purple variant=solid">Подобрать по вакансии <span aria-hidden="true">→</span></button></section>`;
    const sourceSummary=sourcePool.map((x,i)=>`${x} — ${i===0?128:29-i*5}`).join(' · ');
    const results=`<section class="search-results"><header class="search-results-head"><div><h2>${searchRan?'128 кандидатов':'Результаты поиска'}</h2><p>${searchRan?sourceSummary:'Резюме появятся здесь после запуска поиска'}</p></div><div class="search-result-controls"><select><option>За всё время</option><option>За месяц</option><option>За неделю</option></select><select><option>По соответствию</option><option>Сначала новые</option><option>Сначала из базы ATS</option></select><select><option>20 резюме</option><option>50 резюме</option></select><button class="btn">Вид <span aria-hidden="true">☷</span></button></div></header>${resumeCards}</section>`;
    const manual=`<section class="search-builder"><div class="search-builder-main"><div id="query-list">${queryRows.map(row).join('')}</div><button class="search-submit" data-action="run-search" data-antd="Button" data-antd-props="type=primary">Найти</button></div><div class="search-quick-filters"><button data-action="add-query" data-antd="Button" data-antd-props="type=dashed size=small"><span aria-hidden="true">＋</span> Добавить строку</button>${['Регион','Опыт в профессии','Статус поиска','Тип занятости','Формат работы','Общий опыт','Уровень дохода'].map(x=>`<button data-antd="Button" data-antd-props="size=small${activeSearchFilters.includes(x)?' color=purple variant=filled':''}" data-action="search-filter" data-filter="${x}"><span aria-hidden="true">${activeSearchFilters.includes(x)?'✓':'＋'}</span> ${x}</button>`).join('')}<button class="all-filters" data-action="more-search-filters" data-antd="Button" data-antd-props="size=small">Фильтры <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${activeSearchFilters.length?'<button data-action="clear-search-filters" data-antd="Button" data-antd-props="type=text size=small">Сбросить</button>':''}</div><div class="search-sources"><b>Искать в</b>${[['ats','База ATS <span>12 480</span>'],['hh','hh.ru'],['avito','Авито Работа'],['getmatch','GetMatch']].map(([k,label])=>`<label class="${searchSources[k]?'selected':''}" data-action="search-source" data-search-source="${k}"><button type="button" class="vs-switch ${searchSources[k]?'is-on':''}" role="switch" aria-checked="${!!searchSources[k]}" tabindex="-1"></button> ${label}</label>`).join('')}<span>Внешние источники выполняются независимо</span></div></section>${autoMatch}${results}`;
    const aiMode=`<section class="ai-search-workspace"><div class="ai-search-copy"><span class="pill purple">ИИ-поиск</span><h2>Опишите кандидата обычным языком</h2><p>ИИ превратит запрос в проверяемые условия, покажет их перед запуском и найдёт людей сначала во внутренней базе.</p><textarea id="ai-search-prompt" placeholder="Например: найди Senior Android-разработчиков из продуктовых компаний, от 4 лет опыта, Kotlin обязателен, Москва или удалённо"></textarea><div class="ai-prompt-examples"><button data-antd="Button" data-antd-props="size=small" data-action="ai-example">Android-разработчики под вакансию</button><button data-antd="Button" data-antd-props="size=small" data-action="ai-example">Дизайнеры с финтех-опытом</button><button data-antd="Button" data-antd-props="size=small" data-action="ai-example">Кандидаты из нашей базы без активного процесса</button></div><div class="actions"><button class="btn" data-action="ai-search-build" data-antd-props="color=purple variant=solid">Собрать и запустить поиск</button><button class="btn" data-action="auto-match">Выбрать вакансию</button></div></div><aside class="ai-search-how"><h3>Что сделает ИИ</h3><ol><li>Выделит обязательные и желательные критерии.</li><li>Покажет собранный запрос до запуска.</li><li>Объяснит соответствие каждого кандидата.</li></ol><div class="detail-block"><b>Источник по умолчанию</b><p>База ATS. hh.ru и Авито подключаются только по выбору пользователя.</p></div></aside></section>${searchRan?results:''}`;
    screen.innerHTML=head('Поиск кандидатов','По внутренней базе ATS и подключённым внешним источникам.')+modeTabs+(searchMode==='ai'?aiMode:manual);
  }

  function renderTasks(){
    /* Задачи про офферы и согласования есть только в режиме «Своя ATS». */
    const visible=tasks.filter(t=>!t.needsAts||!window.ProductMode?.thin?.());
    const filtered=visible.filter(t=>taskFilter==='done'?t.done:taskFilter==='late'?t.late&&!t.done:taskFilter==='future'?t.future&&!t.done:!t.done&&!t.future);
    screen.innerHTML=head('Мои задачи','Все рекрутинговые действия и количественные цели в одной очереди.',button('Задачи команды','team-tasks')+button('+ Создать задачу','new-task','primary'))+`<div class="filters-plain"><div class="segments">${[['active','Активные'],['late','Просрочено'],['future','Предстоящие'],['done','Завершённые']].map(([k,l])=>`<button class="${taskFilter===k?'active':''}" data-action="task-filter" data-filter="${k}">${l}</button>`).join('')}</div><select aria-label="Вакансия" data-antd-props="showSearch"><option>Все вакансии</option><option>Senior Android-разработчик</option><option>Senior Product Designer</option></select><select aria-label="Тип задачи"><option>Все типы</option><option>Связаться</option><option>Получить фидбек</option><option>Количественная</option></select></div><section class="panel"><div class="panel-head"><h2>${taskFilter==='late'?'Просроченные задачи':'Рабочая очередь'}</h2><small>${filtered.length} задач</small></div>${filtered.map(t=>`<div class="task-row ${t.done?'done':''}"><input type="checkbox" data-task-check="${t.id}" ${t.done?'checked':''} ${t.quant?'disabled':''}><div><b>${esc(t.title)}</b><small>${esc(t.object)}</small></div><span class="pill ${t.priority==='Критический'?'danger':t.priority==='Высокий'?'warn':''}">${t.priority}</span><span class="${t.late?'late':''}">${t.due}</span><span class="${t.quant?'quant':''}">${t.progress}</span></div>`).join('')||'<div class="empty">Здесь пока нет задач.</div>'}</section>`;
  }

  function renderCalendar(){
    const hours=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
    const heads=['Пн · 7','Вт · 8','Ср · 9','Чт · 10','Пт · 11'];
    const events=[{d:1,top:190,h:66,title:'HR-интервью',sub:'Алина Воронцова · Телемост'},{d:2,top:342,h:70,title:'Техническое интервью',sub:'Виктория Чен · Контур Толк',good:true},{d:4,top:114,h:60,title:'Портфолио',sub:'Дмитрий Назаров · Телемост'}];
    const columns=heads.map((h,di)=>`<div><div class="day-head">${h}</div>${hours.map(x=>`<div class="hour"></div>`).join('')}${events.filter(e=>e.d===di).map(e=>`<button class="event-card ${e.good?'alt':''}" style="top:${e.top}px;height:${e.h}px" data-action="event-detail"><b>${e.title}</b>${e.sub}</button>`).join('')}</div>`).join('');
    screen.innerHTML=head('Календарь','Интервью, внутренние встречи и доступные слоты.',button('Настроить доступность','calendar-access')+button('+ Назначить встречу','new-meeting','primary'))+`<section class="calendar-shell"><aside class="calendar-side"><h3>Сентябрь 2026</h3><p class="table-sub">Понедельник, 7 сентября</p>${['Интервью','Внутренние встречи','Резерв слота'].map(l=>`<label data-action="calendar-layer"><button type="button" class="vs-switch is-on" role="switch" aria-checked="true" tabindex="-1"></button> ${l}</label>`).join('')}<div class="detail-block"><h3>Подключено</h3><p>Яндекс Календарь<br>Google Calendar</p></div></aside><div class="calendar-main"><div class="calendar-toolbar">${button('←','calendar-nav')}${button('Сегодня','calendar-nav')}${button('→','calendar-nav')}<strong>7–11 сентября 2026</strong><div class="segments" style="margin-left:auto"><button class="${calendarView==='week'?'active':''}" data-action="calendar-view" data-view="week">Неделя</button><button class="${calendarView==='month'?'active':''}" data-action="calendar-view" data-view="month">Месяц</button></div></div>${calendarView==='week'?`<div class="week-grid"><div><div class="day-head"></div>${hours.map(h=>`<div class="hour">${h}</div>`).join('')}</div>${columns}</div>`:`<div class="empty"><h2>Сентябрь 2026</h2><p>Месячный вид показывает загрузку и раскрывает события выбранного дня.</p>${button('Вернуться к неделе','calendar-week')}</div>`}</div></section>`;
  }

  function profileFor(c){
    if(c.profile==='ml-senior')return{
      age:'29 лет',location:'Москва',title:'Senior ML Engineer',salary:'по договорённости',availability:'Не готов к переезду · редкие командировки',experienceTotal:'7 лет 8 месяцев',skills:['Python','PyTorch','Computer Vision','Docker','PySpark','Airflow','Kubernetes','Qdrant','ONNX','SQL'],languages:'Русский — родной · Английский — B1',education:'МФТИ · магистр, прикладная математика и физика · 2020',about:'ML-инженер полного цикла: от постановки задачи и эксперимента до продакшена и анализа продуктового эффекта. Публикует технические статьи, выступает на профильных мероприятиях.',summary:'Сильный production ML и computer vision, есть рекомендации и realtime-инференс. Для этой вакансии стоит отдельно проверить системный дизайн и глубину мобильной разработки.',experience:[
        {period:'Март 2021 — апрель 2026 · 5 лет 2 месяца',company:'FunTech',position:'Senior ML Engineer',text:'Разрабатывал ML-решения полного цикла. Запустил модели модерации изображений и видео, diffusion-модель генерации изображений, поиск дубликатов и классификацию языков. Внедрил гибридную рекомендательную систему с realtime-инференсом на Qdrant и ONNX; среднее активное время пользователей выросло на 30%.',stack:'ClickHouse · Kafka · Redis · PySpark · Docker · Airflow · Kubernetes · Qdrant · ONNX'},
        {period:'Сентябрь 2018 — февраль 2021 · 2 года 6 месяцев',company:'Инжиниринговый центр',position:'Tech Lead · ML Engineer',text:'Руководил проектом компьютерного зрения для анализа микроскопических снимков: классификация, семантическая сегментация и генерация синтетических данных. Создал инструменты разметки и контроля качества, участвовал в работе с заказчиками.',stack:'Python · PyTorch · OpenCV · GAN · Docker'}
      ]
    };
    if(c.profile==='llm-engineer')return{
      age:'36 лет',location:'Москва',title:'ML Engineer · LLM Developer',salary:'от 260 000 ₽',availability:'Готов к переезду по России · без командировок',experienceTotal:'14 лет',skills:['Python','LLM','RAG','PyTorch','XGBoost','NLP','SQL','Docker','Streamlit','pandas','UMAP','A/B-тесты'],languages:'Русский — родной · Английский — C1',education:'Институт химической физики РАН · кандидат наук, биофизика · 2016',about:'Инженер с исследовательским бэкграундом и опытом полного цикла: формализация задачи, экспериментальный дизайн, статистика, ML-прототип, валидация и контейнеризация.',summary:'Глубокая статистическая база и сильные самостоятельные LLM-проекты. Есть переход из инженерной предметной области в ML; важно проверить качество кода и опыт промышленной командной разработки.',experience:[
        {period:'Январь 2026 — настоящее время',company:'Независимая ML-разработка',position:'ML Engineer · LLM Developer',text:'Создал персонализированного LLM-ассистента с долговременной памятью и систему поиска интерпретируемых научных гипотез. Обработал тестовую базу из 5 000 документов и 15 000 фрагментов, реализовал поиск источников и два режима генерации гипотез.',stack:'Python · Sentence Transformers · spaCy · KeyBERT · RAG · UMAP · Streamlit · Docker'},
        {period:'Январь 2017 — декабрь 2025 · 9 лет',company:'Аналитические системы',position:'Ведущий инженер',text:'Анализировал измерительные данные, проектировал диагностические эксперименты и искал первопричины отказов оборудования. Построил XGBoost-модель прогнозирования дефектов и стандартизировал воспроизводимые тесты контроля качества.',stack:'SQL · статистический анализ · XGBoost · дизайн экспериментов'},
        {period:'Октябрь 2012 — декабрь 2016 · 4 года 3 месяца',company:'Исследовательский институт',position:'Инженер-исследователь',text:'Обрабатывал электрофизиологические сигналы и фМРТ, разработал алгоритм классификации паттернов нейронной активности с качеством около 99% на однозначно размеченных данных.',stack:'MATLAB · SPM8 · k-means · временные ряды'}
      ]
    };
    return{age:`${27+c.days} лет`,location:'Москва',title:c.role,salary:c.salary,availability:'Полная занятость · офис, гибрид или удалённо',experienceTotal:`${5+c.days%4} лет ${c.days%11} месяцев`,skills:['Kotlin','Android SDK','Jetpack Compose','Coroutines','REST API','SQL','Git','CI/CD','Командная разработка'],languages:'Русский — родной · Английский — B2',education:'МГТУ им. Н. Э. Баумана · высшее образование · 2020',about:`${c.role} с опытом продуктовой разработки, запуска новых функций и поддержки высоконагруженных приложений. Работает в кросс-функциональной команде, участвует в архитектурных решениях и ревью кода.`,summary:`${c.role} из ${c.company}. Сильный коммерческий опыт и понятная динамика развития. ИИ рекомендует проверить мотивацию, системный дизайн и ожидания от новой команды.`,experience:[
      {period:'Май 2022 — настоящее время',company:c.company,position:c.role,text:'Разработка ключевых пользовательских сценариев, декомпозиция монолита на модули, ускорение сборки и внедрение дизайн-системы. Участвует в планировании, code review и наставничестве.',stack:'Kotlin · Coroutines · Jetpack Compose · REST · CI/CD'},
      {period:'Июнь 2019 — апрель 2022 · 2 года 11 месяцев',company:'Продуктовая технологическая компания',position:'Android-разработчик',text:'Поддерживал два мобильных приложения, реализовал офлайн-режим, пуш-уведомления и аналитику продуктовых событий. Снизил число критических ошибок после релизов.',stack:'Kotlin · Java · Room · Firebase · Git'}
    ]};
  }

  const renderExperience=p=>p.experience.map(x=>`<article class="cv-job"><div class="cv-period">${x.period}</div><div><h4>${x.company}</h4><b>${x.position}</b><p>${x.text}</p><small>${x.stack}</small></div></article>`).join('');

  function renderCandidateCard(c,v){
    const summaryRun=[...(c.runs||[])].reverse().find(r=>['passed','failed'].includes(r.status)), summaryScore=summaryRun?.score, summaryText=summaryRun ? `${summaryRun.stage.name}: ${summaryRun.status==='passed'?'прошёл':'не прошёл'}. ${summaryRun.status==='passed'?'Соответствует проходному баллу.':'Ниже проходного балла.'} Подробности в сохранённом отчёте.` : 'Оценка ИИ пока не завершена. Отчёт появится после выполнения модуля на соответствующем этапе.';
    const p=profileFor(c),stage=stages.find(s=>s[0]===c.stage)?.[1],consentClass=c.consent==='Дано'?'good':'warn',tags=candidateTags[c.name]||[];
    const tagPicker=profilePopover==='tags'?`<div class="profile-popover tag-picker-popover"><header><b>Метки кандидата</b><button type="button" data-action="tag-picker" aria-label="Закрыть" data-antd="Button" data-antd-props="type=text size=small icon"><span class="ant-btn-icon"><span class="anticon">×</span></span></button></header><input data-profile-filter="tags" placeholder="Найти метку"><button type="button" class="popover-reset" data-action="clear-tags" data-antd="Button" data-antd-props="type=link size=small">Сбросить выбор</button><div class="tag-option-list">${candidateTagOptions.map(tag=>`<button class="${tags.includes(tag)?'selected':''}" data-action="toggle-tag" data-tag="${esc(tag)}" data-tag-option="${esc(tag.toLowerCase())}"><span>${tags.includes(tag)?'✓':''}</span>${esc(tag)}</button>`).join('')}</div><button type="button" class="popover-footer" data-action="edit-tags" data-antd="Button" data-antd-props="type=link block">Редактировать метки</button></div>`:'';
    const vacancyPicker=profilePopover==='vacancy'?`<div class="profile-popover vacancy-picker-popover"><header><b>Взять на вакансию</b><button type="button" data-action="take-vacancy" aria-label="Закрыть" data-antd="Button" data-antd-props="type=text size=small icon"><span class="ant-btn-icon"><span class="anticon">×</span></span></button></header><select aria-label="Подразделение"><option>Подразделение: все</option><option>Mobile</option><option>Platform</option><option>Core Product</option><option>BI</option></select><input data-profile-filter="vacancies" placeholder="Название вакансии"><div class="vacancy-option-list"><small>Мои вакансии</small>${Object.entries(vacancies).filter(([id])=>id!==activeVacancyId).map(([id,item])=>`<button data-action="select-target-vacancy" data-id="${id}" data-vacancy-option="${esc(`${item.name} ${item.department}`.toLowerCase())}"><b>${item.name}</b><span>${item.department} · ${item.positions} ${item.positions===1?'ставка':'ставки'}</span></button>`).join('')}</div><div class="vacancy-picker-current"><span>Уже на вакансии</span><b>${v.name}</b></div></div>`:'';
    return`<article class="candidate-pane candidate-profile">
      <header class="profile-overview">
        <div class="profile-photo-column">${candidatePhoto(c,'candidate-photo')}</div>
        <section class="profile-zone profile-copy"><h2>${c.name}</h2><p class="profile-title">${p.title} <span>·</span> ${c.company}</p><dl class="profile-facts"><div><dt>Зарплата</dt><dd>${p.salary}</dd></div><div><dt>Телефон</dt><dd>+7 900 555-12-${20+c.days} <button type="button" data-action="copy-contact" data-antd="Button" data-antd-props="type=link size=small">копировать</button></dd></div><div><dt>Эл. почта</dt><dd>${c.name.split(' ')[0].toLowerCase()}@example.com</dd></div><div><dt>Возраст и город</dt><dd>${p.age} · ${p.location}</dd></div><div class="profile-tags-row"><dt>Метки</dt><dd><div class="profile-tags">${tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}<button type="button" data-action="tag-picker" aria-expanded="${profilePopover==='tags'}" data-antd="Button" data-antd-props="type=dashed size=small">${tags.length?'+ Добавить':'Добавить'}</button></div>${tagPicker}</dd></div><div><dt>Условия</dt><dd>${p.availability}</dd></div></dl></section>
        <aside class="profile-zone profile-command-center"><div class="profile-vacancy-action"><button type="button" data-action="take-vacancy" aria-expanded="${profilePopover==='vacancy'}" data-antd="Button" data-antd-props="color=purple variant=solid block">${btnIcon('plus')}<span>Взять на вакансию</span></button>${vacancyPicker}</div><div class="profile-action-grid">${profileAction('Доп. информация','candidate-more','info')}${profileAction('Редактировать','edit-candidate','edit')}${profileAction('Задача','new-task','checked-item-mark-new')}${profileAction('Встреча','new-meeting','calendar-20')}</div><section class="profile-ai-summary"><header><span>AI</span><div><b>ИИ-саммари</b><strong>${summaryScore==null?'—':summaryScore+' / 10'}</strong></div></header><p>${esc(summaryText)}</p>${summaryRun?'<button type="button" data-action="override-ai" data-antd="Button" data-antd-props="color=purple variant=filled size=small">Открыть сохранённый отчёт →</button>':''}</section></aside>
      </header>
      <div class="consent-banner ${consentClass}"><span>${c.consent==='Дано'?'✓':'!'}</span><div><b>Согласие на хранение персональных данных: ${c.consent.toLowerCase()}</b><small>${c.consent==='Дано'?'Получено 28 августа 2026 · действует до 28 августа 2027':'Гибкий режим: работа разрешена, но в карточке остаётся предупреждение'}</small></div>${c.consent==='Дано'?'':button('Отправить запрос','quick-message')}</div>
      <section class="application-stack">
        <article class="application-card current-application">
          <header class="application-head"><div><span class="eyebrow">Текущий процесс</span><h3>${stage}</h3><p>${v.name} · ${v.department}</p></div>${button('Сменить этап','move-candidate','primary')}</header>
          <div class="stage-alert ${c.days>7?'late':''}"><span>◷</span><b>${c.days}-й день на этапе</b><small>Норма — 7 дней${c.days>7?' · требуется действие':''}</small></div>
          ${window.CandidacyRuns?.card(c)||''}
          <div class="comment-composer">${richEditor('Написать комментарий по кандидату')}<div class="comment-tools"><div>${[['quick-message','mail','Письмо'],['new-meeting','calendar-20','Встреча'],['feedback-form','template-feedback','Обратная связь'],['send-offer','business-vacancy','Оффер'],['add-file','clip','Файл']].map(([act,mark,label])=>`<button type="button" data-action="${act}" data-antd="Button" data-antd-props="size=small">${btnIcon(mark)}<span>${label}</span></button>`).join('')}</div><button type="button" data-action="save-comment" data-antd="Button" data-antd-props="color=default variant=filled size=small">Сохранить</button></div></div>
          <div class="activity-head"><div><b>История работы</b><small>Комментарии, решения и действия в одном порядке</small></div><select aria-label="Фильтр действий"><option>Все действия</option><option>Комментарии</option><option>Этапы</option><option>Фидбек</option><option>Коммуникации</option></select></div>
          <div class="activity-feed" data-activity-feed>
            <article class="activity-item feedback-event"><span class="activity-mark">✓</span><div><header><b>Фидбек по HR-интервью</b><time>Сегодня, 11:12</time></header><p>Елена Крылова · рекомендую двигать дальше</p><div class="feedback-result"><span>Мотивация <b>4/5</b></span><span>Коммуникация <b>5/5</b></span><span>Риск <b>низкий</b></span></div><button type="button" data-action="feedback-view" data-antd="Button" data-antd-props="size=small">Открыть форму</button></div></article>
            ${window.CandidacyRuns?.historyHTML(c)||''}
            <article class="activity-item"><span class="activity-mark">✉</span><div><header><b>Получен ответ кандидата</b><time>Вчера, 18:40</time></header><p>«Да, готов созвониться завтра после 15:00» · hh.ru</p></div></article>
            <article class="activity-item"><span class="activity-mark">+</span><div><header><b>Добавлен на вакансию</b><time>Вчера, 18:11</time></header><p>${c.source} · Елена Крылова</p></div></article>
          </div>
        </article>
        <details class="application-card previous-application">
          <summary><div><span class="pill">Отказ · закрыли другим кандидатом</span><b>Mobile Developer · Customer Apps</b><small>Техническое интервью · завершено 14 августа</small></div><span>5 событий ›</span></summary>
          <div class="previous-feed"><div class="timeline-item"><b>Отказ — вакансия закрыта другим кандидатом</b><small>14 августа · Антон Беляев</small></div><div class="timeline-item"><b>Получен технический фидбек</b><small>12 августа · итог 7/10</small></div><div class="timeline-item"><b>Кандидат перемещён на техническое интервью</b><small>9 августа · Мария Фролова</small></div></div>
        </details>
        <details class="application-card previous-application">
          <summary><div><span class="pill">Отказ · не отвечает</span><b>Android Tech Lead · Platform</b><small>Контакт · завершено 3 июня</small></div><span>4 события ›</span></summary>
          <div class="previous-feed"><div class="timeline-item"><b>Процесс завершён: кандидат не отвечает</b><small>3 июня · три попытки контакта</small></div><div class="timeline-item"><b>Отправлено письмо</b><small>29 мая · шаблон «Повторный контакт»</small></div></div>
        </details>
      </section>
      <section class="resume-document"><header><div><span class="eyebrow">Резюме hh.ru · актуальное</span><h3>${p.title}</h3><p>Обновлено 3 сентября 2026 · актуальность проверена сегодня</p></div><div class="actions">${button('Версии · 3','resume-versions')}${button('Скачать','add-file')}</div></header><div class="cv-intro"><div><span>Опыт работы</span><strong>${p.experienceTotal}</strong></div><div><span>Желаемая должность</span><strong>${p.title}</strong><small>${p.availability}</small></div></div><h3 class="cv-heading">Опыт работы</h3>${renderExperience(p)}<div class="cv-two"><section><h3 class="cv-heading">Образование</h3><p>${p.education}</p><h3 class="cv-heading">Языки</h3><p>${p.languages}</p></section><section><h3 class="cv-heading">Навыки</h3><div class="skill-cloud">${p.skills.map(x=>`<span>${x}</span>`).join('')}</div></section></div><h3 class="cv-heading">О себе</h3><p class="cv-about">${p.about}</p></section>
      <section class="candidate-folds"><details><summary><span>Сообщения</span><small>8 · hh.ru, почта, Telegram</small></summary><div class="fold-body"><div class="timeline-item"><b>Здравствуйте! Готовы созвониться завтра после 15:00.</b><small>Кандидат · hh.ru · 12 минут назад</small></div><div class="actions"><button class="btn" data-action="quick-message" data-antd-props="color=default variant=filled">Продолжить диалог</button></div></div></details><details><summary><span>ИИ-протоколист встреч</span><small>1 встреча</small></summary><div class="fold-body"><div class="note"><h3>Техническое интервью с командой</h3><p>Запись человеческой встречи, транскрипт и заметки. Протоколист не перемещает кандидата по воронке.</p>${button('Открыть запись и транскрипт','meeting-record')}</div></div></details><details><summary><span>Офферы</span><small>1 редакция</small></summary><div class="fold-body"><p>Редакция 3 · согласована · PDF сформирован · ещё не отправлен</p><div class="actions">${button('Скачать PDF','download-offer')}<button class="btn" data-action="send-offer" data-antd-props="color=default variant=filled">Отправить оффер</button></div></div></details><details><summary><span>Все резюме и версии</span><small>3 источника · 7 версий</small></summary><div class="fold-body"><div class="resume-version-row"><b>hh.ru · версия 4</b><span>актуальное · проверено сегодня</span></div><div class="resume-version-row"><b>PDF от рекрутера · версия 2</b><span>загружено 14 мая</span></div><div class="resume-version-row"><b>Авито Работа · версия 1</b><span>получено 2 апреля</span></div></div></details></section>
    </article>`;
  }

  function renderCandidateCardRedesignDraft(c,v){
    const template=document.createElement('template');
    template.innerHTML=renderCandidateCard(c,v).trim();
    const root=template.content.firstElementChild;
    root.classList.add('candidate-redesign');

    const tabs=[['overview','Резюме'],['history','История и комментарии'],['ai','ИИ-инструменты'],['messages','Переписка']];
    const tabNav=document.createElement('nav');
    tabNav.className='candidate-tabs';tabNav.setAttribute('aria-label','Разделы кандидата');
    tabNav.innerHTML=tabs.map(([key,label])=>`<button class="${candidateTab===key?'active':''}" data-action="candidate-tab" data-tab="${key}">${label}</button>`).join('');
    root.prepend(tabNav);

    const overview=root.querySelector('.profile-overview'),copy=overview?.querySelector('.profile-copy');
    const title=copy?.querySelector('h2'),subtitle=copy?.querySelector('.profile-title');
    if(copy&&title&&subtitle){
      const titleRow=document.createElement('div'),titleCopy=document.createElement('div');
      titleRow.className='profile-title-row';titleCopy.className='profile-title-copy';
      titleCopy.append(title,subtitle);title.insertAdjacentHTML('beforeend',`<button type="button" class="profile-edit" data-action="edit-candidate" aria-label="Редактировать карточку">${btnIcon('edit')}</button>`);
      titleRow.append(titleCopy);
      titleRow.insertAdjacentHTML('beforeend',`<div class="candidate-stage-pill"><i></i><b>${stages.find(s=>s[0]===c.stage)?.[1]}</b><span>${c.days}-й день на этапе</span></div>`);
      copy.prepend(titleRow);
    }
    const consent=root.querySelector('.consent-banner');if(overview&&consent)overview.append(consent);

    const command=root.querySelector('.profile-command-center'),aiSummary=command?.querySelector('.profile-ai-summary');
    if(aiSummary)aiSummary.remove();
    if(command){
      command.className='candidate-action-dock';command.setAttribute('role','toolbar');command.setAttribute('aria-label','Действия с кандидатом');
      const actions=[...command.querySelectorAll('.profile-action-grid button')];
      if(actions[0]){actions[0].dataset.action='quick-message';actions[0].title='Связаться';actions[0].innerHTML=`${btnIcon('mail')}<span>Связаться</span>`}
      actions[1]?.remove();
      command.insertAdjacentHTML('beforeend','<div class="candidate-dock-tail"><button type="button" class="reject-action" data-action="move-candidate">Отказать</button><button type="button" class="stage-action" data-action="move-candidate">Сменить этап</button><button type="button" class="more-action" data-action="candidate-more" aria-label="Дополнительная информация">•••</button></div>');
      root.append(command);
    }

    const resume=root.querySelector('.resume-document'),applications=root.querySelector('.application-stack'),folds=root.querySelector('.candidate-folds'),aiRun=applications?.querySelector('.cr-card')?.cloneNode(true);
    if(resume){
      const strip=document.createElement('div');strip.className='candidate-source-strip';
      strip.innerHTML=`<div><span>hh</span><b>Из отклика на ${c.source}</b><small>3 сентября</small></div><div>${button('Версии · 3','resume-versions')}${button('Скачать','add-file')}</div>`;
      root.insertBefore(resume,applications);root.insertBefore(strip,resume);
    }
    const sourceStrip=root.querySelector('.candidate-source-strip');
    if(candidateTab==='overview'){
      applications?.remove();folds?.remove();aiSummary?.remove();
    }else if(candidateTab==='history'){
      resume?.remove();sourceStrip?.remove();folds?.remove();aiSummary?.remove();
    }else if(candidateTab==='ai'){
      resume?.remove();sourceStrip?.remove();folds?.remove();applications?.remove();
      if(aiSummary){const aiView=document.createElement('section');aiView.className='candidate-ai-view';aiView.append(aiSummary);if(aiRun)aiView.append(aiRun);root.insertBefore(aiView,command)}
    }else{
      resume?.remove();sourceStrip?.remove();applications?.remove();aiSummary?.remove();
    }
    return root.outerHTML;
  }

  function vacancyTeamSection(){
    const own=vacancies[activeVacancyId];
    if(own?.createdLocally||own?.allocationHistory?.length){
      const participants=own.participants||[],rows=participants.map(p=>`<div><span class="person-avatar">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span><p><b>${esc(p.name)}</b><small>${esc(p.function||p.functions?.map(f=>f.function).join(' · ')||'Участник')}</small></p></div>`).join(''),hasHiring=participants.some(p=>p.functions?.some(f=>['Нанимающий менеджер','Интервьюер'].includes(f.function))||['Нанимающий менеджер','Интервьюер'].includes(p.function));
      return `<section class="vacancy-overview-section ve68-team-section"><div class="drawer-section-head"><div><h3>Команда вакансии</h3><p>Участники этой вакансии, выбранные при создании или распределении.</p></div></div><div class="people-list">${rows||'<p>Ответственный рекрутер пока не назначен.</p>'}</div>${hasHiring?'':'<p>Нанимающая команда пока не добавлена.</p>'}<p>${own.sourceRequisition?'Заявка-основание: '+esc(own.sourceRequisition)+'.':'Заявка-основание не указана.'}</p></section>`;
    }
    return `<section class="vacancy-overview-section ve68-team-section"><div class="drawer-section-head"><div><h3>Команда вакансии</h3><p>Ответственные, нанимающие менеджеры и доступ к кандидатам.</p></div></div><div class="vacancy-team-grid"><div><h4>Рекрутеры</h4><div class="people-list"><div><span class="person-avatar">ЕК</span><p><b>Елена Крылова</b><small>Основной рекрутер · полный доступ</small></p></div><div><span class="person-avatar">АБ</span><p><b>Антон Беляев</b><small>Кандидаты и коммуникации</small></p></div></div><button type="button" class="vacancy-team-add" data-action="vacancy-team" data-team-role="recruiter">+ Добавить</button></div><div><h4>Нанимающая команда</h4><div class="people-list"><div><span class="person-avatar">АМ</span><p><b>Алексей Мельников</b><small>Автор заявки · нанимающий менеджер</small></p></div><div><span class="person-avatar">ОС</span><p><b>Ольга Селезнёва</b><small>Интервьюер · назначенные формы</small></p></div></div><button type="button" class="vacancy-team-add" data-action="vacancy-team" data-team-role="hiring">+ Добавить</button></div></div><button class="text-action" data-action="vacancy-access">Проверить права участников →</button></section>`;
  }

  const VACANCY_AI_FUNNELS={
    it:{name:'Стандартная воронка IT',description:'Для продуктовых и инженерных ролей',stages:['Отклик','Новый кандидат','Скоринг','Чат-бот','HR интервью','Техническое интервью','Финальное интервью','Оффер','Выход','Отказ']},
    backoffice:{name:'Стандартная воронка Бэкофис',description:'Для административных и поддерживающих функций',stages:['Отклик','Новый кандидат','Скрининг','HR интервью','Интервью с руководителем','Проверка службы безопасности','Оффер','Выход','Отказ']},
    executive:{name:'Стандартная воронка Executive Search',description:'Для руководителей и точечного поиска',stages:['Отклик','Long list','Первичный контакт','Short list','Интервью с партнёром','Интервью с клиентом','Проверка рекомендаций','Оффер','Выход','Отказ']},
    mass:{name:'Масс подбор',description:'Для массовых вакансий с высокой скоростью обработки',stages:['Отклик','Новый кандидат','Автоскрининг','Чат-бот','Групповое интервью','Проверка документов','Оффер','Выход','Отказ']}
  };
  const vacancyAiContext=(index,funnelId=selectedVacancyAiFunnel)=>({vacancyId:activeVacancyId,vacancyName:(vacancies[activeVacancyId]||vacancies.android).name,funnelId,index,stage:VACANCY_AI_FUNNELS[funnelId].stages[index],stages:VACANCY_AI_FUNNELS[funnelId].stages,responseIndex:VACANCY_AI_FUNNELS[funnelId].stages.indexOf('Отклик'),nextStage:VACANCY_AI_FUNNELS[funnelId].stages.slice(index+1).find(stage=>stage!=='Отказ')||''});
  function vacancyAiRows(funnelId=selectedVacancyAiFunnel){
    const funnel=VACANCY_AI_FUNNELS[funnelId]||VACANCY_AI_FUNNELS.it;
    return funnel.stages.map((stage,index)=>{
      const context=vacancyAiContext(index,funnelId),module=window.VacancyAiConfig.kind(stage),aiOn=window.VacancyAiConfig.isOn(context),automation=window.VacancyAutomationConfig.summary(context);
      const terminal=['оффер','выход','отказ'].includes(stage.toLowerCase()),transcription=/интервью/i.test(stage);
      const color=stage.toLowerCase()==='отказ'?'#d46a9b':terminal?'#58d889':transcription?'#389eed':'#704ce8';
      const label=window.VacancyAiConfig.names[module],tooltip=module==='transcription'&&aiOn;
      const aiContent=!module?'<span class="vao-empty-label">Без AI-модуля</span>':`<div class="ve68-stage-ai-copy">${module==='transcription'?`<b>${esc(label)}</b>`:`<button type="button" class="ve68-module-name" data-action="vacancy-ai-configure" data-stage-index="${index}" aria-label="Настроить ${esc(label)}">${esc(label)}</button>`}<em class="${aiOn?'is-active':''}">${aiOn?'Включено':'Отключено'}</em></div><button type="button" class="vao-ai-toggle ${aiOn?'is-active':''}" data-action="vacancy-ai-toggle" data-stage-index="${index}" aria-label="${aiOn?'Отключить':'Включить'} ${esc(label)}: ${esc(stage)}">${aiOn?'Отключить':'Включить'}</button>${tooltip?'<span class="ve68-ai-tooltip" role="tooltip">AI ассистент подключится на встречу и подготовит саммари</span>':''}`;
      return `<div class="ve68-stage-row vao-stage-card" style="--stage-color:${color}"><div class="ve68-stage-name"><span class="ve68-stage-marker" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><b>${esc(stage)}</b></div><div class="ve68-stage-setting vao-ai-cell${!module?' ve68-stage-ai-empty':''}${tooltip?' has-transcription-tooltip':''}" ${tooltip?'tabindex="0" aria-label="Транскрибация включена. AI ассистент подключится на встречу и подготовит саммари"':''}><span class="vao-cell-label">AI модуль</span>${aiContent}</div><div class="ve68-stage-setting vao-automation-cell"><span class="vao-cell-label">Автоматизация</span><div class="ve68-stage-ai-copy"><em class="${automation.active?'is-active':''}">${automation.actions?esc(automation.label):'Не настроено'}</em>${automation.rules?`<small>${esc(automation.rulesLabel)}</small>`:''}</div><button type="button" data-action="vacancy-automation-config" data-stage-index="${index}" aria-label="${automation.actions?'Изменить':'Настроить'} автоматизации: ${esc(stage)}">${automation.actions?'Изменить':'Настроить'}</button></div></div>`;
    }).join('');
  }
  function vacancyAiSettingsBody(){
    const funnel=VACANCY_AI_FUNNELS[selectedVacancyAiFunnel];
    return `<div class="ve68-funnel-settings vao-overview"><section class="vao-overview-intro"><div class="ve68-funnel-picker"><span id="ve68-funnel-label">Воронка этапов</span><div class="ve68-funnel-dropdown"><button type="button" class="ve68-funnel-trigger" role="combobox" aria-labelledby="ve68-funnel-label ve68-funnel-value" aria-haspopup="listbox" aria-expanded="false" aria-controls="ve68-funnel-options" data-action="vacancy-funnel-toggle"><span id="ve68-funnel-value">${esc(funnel.name)}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button><div class="ve68-funnel-options" id="ve68-funnel-options" role="listbox" aria-labelledby="ve68-funnel-label" hidden>${Object.entries(VACANCY_AI_FUNNELS).map(([key,item])=>`<button type="button" role="option" aria-selected="${key===selectedVacancyAiFunnel}" tabindex="-1" data-action="vacancy-funnel-choose" data-funnel="${key}"><span>${esc(item.name)}</span><span class="ve68-funnel-check" aria-hidden="true">${key===selectedVacancyAiFunnel?'✓':''}</span></button>`).join('')}</div></div></div><div class="vao-overview-copy"><b>${funnel.stages.length} этапов</b><p>Включайте AI и настраивайте действия на нужных этапах.<br>Модули и автоматизации управляются отдельно.</p></div></section><section class="ve68-stage-table" aria-label="Этапы, AI-модули и автоматизации"><div class="ve68-stage-table-head"><span><b>Этап</b></span><span><b><i aria-hidden="true">✦</i> AI модуль</b></span><span><b><i aria-hidden="true">↗</i> Автоматизация</b></span></div><div data-ai-funnel-rows>${vacancyAiRows()}</div></section></div>`;
  }
  function rerenderVacancyAiRows(){const rows=document.querySelector('[data-ai-funnel-rows]');if(rows)rows.innerHTML=vacancyAiRows()}
  function toggleVacancyFunnelMenu(open,restoreFocus=false){
    const trigger=document.querySelector('.ve68-funnel-trigger'),menu=document.querySelector('.ve68-funnel-options');if(!trigger||!menu)return;
    menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
    if(open)menu.querySelector('[aria-selected="true"]')?.focus();else if(restoreFocus)trigger.focus();
  }
  function chooseVacancyFunnel(id){
    if(!VACANCY_AI_FUNNELS[id])return;selectedVacancyAiFunnel=id;
    $('#modal-body').innerHTML=vacancyAiSettingsBody();document.querySelector('.ve68-funnel-trigger')?.focus();
    showToast(`Выбрана воронка «${VACANCY_AI_FUNNELS[id].name}»`);
  }

  function vacancyHistorySection(){
    const own=vacancies[activeVacancyId];
    if(own?.createdLocally||own?.allocationHistory?.length)return `<section class="vacancy-overview-section"><h3>История вакансии</h3><div class="vacancy-history">${(own.allocationHistory||[]).map(event=>`<div><span></span><p><b>${esc(event.action)}</b><small>${esc(new Date(event.at).toLocaleString('ru-RU'))} · ${esc(own.recruiter)}</small></p></div>`).join('')}${own.createdLocally?`<div><span></span><p><b>${own.sourceRequisition?'Вакансия создана из '+esc(own.sourceRequisition):'Вакансия создана вручную'}</b><small>${esc(new Date(own.createdAt).toLocaleString('ru-RU'))}</small></p></div>`:''}</div><p>Оценки и действия другой вакансии не переносились.</p></section>`;
    return `<section class="vacancy-overview-section"><h3>История вакансии</h3><div class="vacancy-history">${window.VacancySetup.templateHistory().map(h=>`<div><span></span><p><b>Применена версия шаблона воронки</b><small>${new Date(h.at).toLocaleString('ru-RU')} · Елена Крылова · v${h.version}</small></p></div>`).join('')}<div><span></span><p><b>Пересчитан SLA закрытия</b><small>6 сентября, 14:08 · правило Mobile Senior</small></p></div><div><span></span><p><b>Добавлен рекрутер Антон Беляев</b><small>2 сентября, 11:32 · Елена Крылова</small></p></div><div><span></span><p><b>Вакансия взята в работу</b><small>23 августа, 09:10 · Елена Крылова</small></p></div><div><span></span><p><b>Вакансия создана из заявки #1021</b><small>22 августа, 18:04 · операция создания вакансии</small></p></div></div></section>`;
  }

  function vacancyEditForm(v,id){
    return window.VacancyEditorForm.render(v,id,{profile:window.Publications?.profile(id),version:window.VacancySetup.structureVersion(),number:4231+Object.keys(vacancies).indexOf(id)});
  }

  function vacancyDetailContent(v,id){
    if(v.createdLocally){
      const fields=[['Подразделение',v.department],['Грейд',v.grade],['Приоритет',v.priority],['План найма',v.positions],['Формат работы',v.workFormat],['Внутренний бюджет',v.budget],['Создана',new Date(v.createdAt).toLocaleString('ru-RU')],['Воронка',VACANCY_AI_FUNNELS[v.funnelId]?.name],['Конфиденциальность',v.confidential?'Конфиденциальная':'Обычная']];
      return `<section class="vacancy-overview-section"><div class="drawer-section-head"><h3>Сведения о вакансии</h3>${button('Редактировать','vacancy-edit')}</div><dl class="vacancy-passport-grid">${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'Не указано')}</dd></div>`).join('')}</dl></section>${['duties','requirements','conditions'].map((key,index)=>`<section class="vacancy-overview-section"><h3>${['Обязанности','Требования','Условия'][index]}</h3><p style="white-space:pre-wrap">${esc(v[key]||'Не указано')}</p></section>`).join('')}${vacancyTeamSection()}${window.Publications?.section(v,id)||''}${vacancyHistorySection()}`;
    }
    const tabs=[['overview','Сведения'],['funnel','Воронка и ИИ'],['history','История']];
    /* Публикации на работных сайтах — свой модуль (карточка 68, publications.js). */
    const publications=window.Publications?.section(v,id)||'';
    const team=vacancyTeamSection();
    const overview=`<div class="vacancy-status-row"><span class="pill ${id==='analyst'?'danger':'purple'}">${id==='analyst'?'Риск SLA':'В работе'}</span><span>${v.progress}% прогноз закрытия</span><span>${v.positions} ставки</span><span>${v.sla} до SLA</span></div><section class="vacancy-overview-section vacancy-passport"><div class="drawer-section-head"><div><h3>Позиция и системные данные</h3><p>Условия найма и действующая конфигурация вакансии.</p></div><button class="btn" data-action="vacancy-setup">Настройка вакансии</button>${button('Редактировать','vacancy-edit')}</div><dl class="vacancy-passport-grid"><div><dt>Подразделение</dt><dd>${v.department}</dd></div><div><dt>Грейд</dt><dd>${v.grade}</dd></div><div><dt>Приоритет</dt><dd>${v.priority}</dd></div><div><dt>План найма</dt><dd>${v.positions} сотрудника</dd></div><div><dt>Формат</dt><dd>Москва · гибрид или удалённо</dd></div><div><dt>Бюджет</dt><dd>${id==='android'?'до 450 000 ₽':'до 420 000 ₽'}</dd></div><div><dt>Создана</dt><dd>22 августа · Ирина Николаева</dd></div><div><dt>Взята в работу</dt><dd>23 августа · Елена Крылова</dd></div><div><dt>Воронка</dt><dd>Шаблон воронки · версия ${window.VacancySetup.structureVersion()}</dd></div><div><dt>Конфиденциальность</dt><dd>Обычная вакансия</dd></div></dl></section><section class="vacancy-overview-section"><h3>Обязанности, требования и условия</h3><p>Развивать Android-приложение, участвовать в архитектурных решениях и ревью. Kotlin, Coroutines и Jetpack Compose обязательны; опыт продуктовой разработки от ${id==='android'?'5 лет, опыт с KMP — плюс':'4 лет'}.</p><button class="text-action" data-action="vacancy-edit">Редактировать описание →</button></section>${team}${publications}`;
    const history=vacancyHistorySection();
    const content=vacancyDetailTab==='overview'?overview:vacancyDetailTab==='funnel'?(window.VacancySetup?.panel()||''):history;
    return`<div class="vacancy-drawer-actions"><div>${button('Редактировать','vacancy-edit')}${button('Открыть заявку','view-requisition')}</div><div>${button(window.CandidacyRuns.isPaused()?'Возобновить':'Приостановить',window.CandidacyRuns.isPaused()?'vacancy-resume':'vacancy-pause')}${button('Закрыть вакансию','vacancy-close','danger')}</div></div><nav class="vacancy-detail-tabs">${tabs.map(([key,label])=>`<button class="${vacancyDetailTab===key?'active':''}" data-action="vacancy-tab" data-tab="${key}">${label}${key==='funnel'?`<span data-antd="Tag">${window.VacancySetup?.funnel().filter(x=>!x.system).length||0}</span>`:''}</button>`).join('')}</nav><div class="vacancy-detail-content">${content}</div>`;
  }

  function openVacancyDetails(tab=vacancyDetailTab){
    vacancyDetailTab=tab;const v=vacancies[activeVacancyId]||vacancies.android;
    drawer.classList.add('vacancy-details-drawer');$('#drawer-title').textContent=v.name;$('#drawer-subtitle').textContent=`${v.department} · ${v.grade} · вакансия #${4231+Object.keys(vacancies).indexOf(activeVacancyId)}`;$('#drawer-body').innerHTML=vacancyDetailContent(v,activeVacancyId);drawer.hidden=false;
  }

  /* Основной экран редактирования — функциональный макет карточки 68.
     Подробный конструктор настроек остаётся доступен по вложенному /setup. */
  function renderVacancyEditor68(id){
    activeVacancyId=id;const v=vacancies[id]||vacancies.android;
    if(v.createdLocally&&VACANCY_AI_FUNNELS[v.funnelId])selectedVacancyAiFunnel=v.funnelId;
    window.VacancySetup?.context(id);
    const paused=window.CandidacyRuns.isPaused();
    screen.innerHTML=`<div class="vacancy-editor68"><header class="ve68-head"><button type="button" class="ve68-back" data-action="editor-back" aria-label="Вернуться к карточке кандидата">←</button><div class="ve68-title"><span class="ve68-kicker">Редактирование вакансии</span><h1>${esc(v.name)}</h1><p>${esc(v.department)} · ${esc(v.grade)} · вакансия #${4231+Object.keys(vacancies).indexOf(id)}</p></div><div class="ve68-title-stats"><span class="ve68-title-status ${id==='analyst'?'danger':''}">${paused?'На паузе':id==='analyst'?'Риск SLA':'В работе'}</span><span>${v.progress}% прогноз закрытия</span><span>${v.positions} ставки</span><span>${v.sla} до SLA</span></div><div class="ve68-head-tail"><button type="button" class="btn ve68-history" data-action="vacancy-history">История</button></div></header><nav class="ve68-primary-actions" aria-label="Основные действия с вакансией">${button('Редактировать вакансию','vacancy-editor-edit','primary')}${button('Настройки AI и автоматизации','vacancy-ai-settings','ai')}<span class="ve68-state-actions">${button(paused?'Возобновить':'Поставить на паузу',paused?'vacancy-resume':'vacancy-pause')}${button('Закрыть вакансию','vacancy-close','danger')}</span></nav><main class="ve68-body">${vacancyTeamSection()}${window.Publications?.tiles(v,id)||''}</main></div>`;
  }

  function renderVacancy(id){
    activeVacancyId=id;const v=vacancies[id]||vacancies.android,list=candidatesFor(id,selectedStage),shownList=window.CandidacyRuns?.filter(list)||list,c=shownList[(selectedCandidate=Math.max(0,Math.min(selectedCandidate,shownList.length-1)))],visibleStages=stages.filter(([key])=>stageCounts[key]>0||key===selectedStage||systemStageKeys.has(key)),emptyCount=stages.filter(([key])=>!systemStageKeys.has(key)&&!stageCounts[key]&&key!==selectedStage).length,workCount=Object.entries(stageCounts).filter(([key])=>!TERMINAL_KEYS.includes(key)).reduce((sum,[,count])=>sum+count,0),handoff=window.ProductMode?.handoff?.(),sink=window.ProductMode?.sink?.();
    screen.innerHTML=`${window.CandidacyRuns.isPaused()?'<div class="note vacancy-pause-note"><b>Вакансия на паузе</b><p>Новые запуски и автоматические действия ИИ остановлены.</p><button class="btn" data-action="vacancy-resume">Возобновить</button></div>':''}<section class="vacancy-head compact"><h1 class="vacancy-name-button" style="height:44px;min-height:44px;box-sizing:border-box;display:flex;align-items:center;margin:0;padding:0 14px;cursor:default;line-height:1.25;background:#fff">${esc(v.name)}</h1></section><nav class="pipeline compact-pipeline"><div class="pipeline-sources"><button data-action="candidate-source"><b>Из базы</b><span>${Math.round(33*v.load)}</span></button><button class="stage system-stage ${selectedStage==='response'?'active':''}" data-action="stage" data-stage="response"><b>Отклик</b><span>${stageCounts.response}</span></button></div><div class="pipeline-stages"><button class="work-total"><b>В работе</b><span>${workCount}</span></button>${visibleStages.filter(([key])=>!TERMINAL_KEYS.includes(key)).map(([k,l])=>{const st=window.VacancySetup.funnel().find(x=>x.id===k),ai=st&&st.kind!=='manual';return `<span class="pipeline-stage-wrap ${selectedStage===k?'active':''}" data-pipeline-item data-pipeline-weight="1" data-order="${stages.findIndex(([key])=>key===k)}"><button class="stage ${selectedStage===k?'active':''}" data-action="stage" data-stage="${k}"><b>${esc(l)}${st?.inherited?' · наследуемый':''}</b><small>${stageCounts[k]}</small></button>${ai?`<button type="button" class="pipeline-stage-config" data-cr="configure" data-id="${k}" aria-label="Настройки этапа ${esc(l)}" title="${st.ready?'Настройки ИИ-этапа':'Требует настройки'}" data-antd="Button" data-antd-props="type=text size=small icon"><span class="ant-btn-icon"><span class="anticon"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span></span></button>`:''}</span>`}).join('')}${emptyCount?`<button class="empty-stages" data-pipeline-item data-pipeline-weight="${emptyCount}" data-order="${stages.length}" data-action="empty-stages">•• ${emptyCount} ${stagePlural(emptyCount)} без кандидатов ••</button>`:''}<button class="pipeline-overflow" data-action="pipeline-overflow" hidden>Ещё <span>0</span></button></div><div class="pipeline-terminals">${handoff?`<button class="stage system-stage handoff-stage ${selectedStage==='handed'?'active':''}" data-action="stage" data-stage="handed"><b>${handoff}</b><span>${stageCounts.handed}</span></button>`:`<button class="stage system-stage ${selectedStage==='waiting'?'active':''}" data-action="stage" data-stage="waiting"><b>Ожидание выхода</b><span>${stageCounts.waiting}</span></button>`}<button class="stage system-stage ${selectedStage==='rejected'?'active':''}" data-action="stage" data-stage="rejected"><b>Отказ</b><span>${stageCounts.rejected}</span></button>${handoff?`<button class="pipeline-outcome" data-action="handoff-info" title="${sink?`Дальше путь идёт в ${sink}`:'Дальше рекрутёр работает вне системы'}"><b><i>↗</i> Передано</b></button>`:`<button class="pipeline-outcome" data-action="hiring-outcome" title="Фактический выход — результат процесса, а не этап"><b><i>✓</i> Вышли</b><span>${v.hires}/${v.positions}</span></button>`}</div><button type="button" class="pipeline-settings" data-action="vacancy-info" aria-label="Настройки вакансии" title="Сведения и настройки вакансии" data-antd="Button" data-antd-props="type=text size=small icon"><span class="ant-btn-icon"><span class="anticon"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span></span></button></nav><section class="vacancy-work"><aside class="candidate-list"><div class="candidate-list-head"><input placeholder="Поиск по кандидатам этапа"><div class="candidate-list-tools"><span>${shownList.length} из ${stageCounts[selectedStage]??list.length} кандидатов</span><button type="button" data-action="candidate-more" title="Дополнительная информация" aria-label="Дополнительная информация" data-antd="Button" data-antd-props="type=text size=small icon"><span class="ant-btn-icon"><span class="anticon"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span></span></button></div>${window.CandidacyRuns?.axis(list)||''}<div data-cr-bulk-slot>${window.CandidacyRuns?.bulkBar()||''}</div></div>${shownList.map((p,i)=>`<button class="candidate-row ${i===selectedCandidate?'active':''}" data-action="select-candidate" data-i="${i}">${window.CandidacyRuns?.avatar(p,candidatePhoto(p))||candidatePhoto(p)}<div><b>${p.name}</b><small>${p.salary} · ${p.role}</small><small>${p.company} · ${p.source} · ${p.days} дн.</small>${window.CandidacyRuns?.rowMeta(p)||''}</div><span class="score">${window.CandidacyRuns?.demo.active(p)?.score ?? '—'}</span></button>`).join('')||'<div class="candidate-empty">Под фильтры никто не подошёл</div>'}</aside>${c?renderCandidateCard(c,v):`<section class="candidate-pane"><div class="candidate-body"><div class="note"><b>На этом этапе никого нет</b><p style="margin:6px 0 0">Выберите другой этап в ленте выше — или заведите кандидата кнопкой «+».</p></div></div></section>`}</section>`;
  }

  function renderPortfolio(){screen.innerHTML=head('Архив вакансий','Приостановленные, отменённые и закрытые вакансии.',button('Вернуться на главную','go-home'))+`<div class="filters-plain"><div class="segments"><button class="active">На паузе · 2</button><button>Отменены · 3</button><button>Закрыты · 41</button></div><input placeholder="Найти вакансию"></div><section class="panel"><table class="data-table"><thead><tr><th>Вакансия</th><th>Статус</th><th>Рекрутер</th><th>Дата изменения</th><th></th></tr></thead><tbody><tr><td><a href="#vacancy/marketing"><b>Product Marketing Manager</b></a></td><td><span class="pill warn">На паузе</span></td><td>Антон Беляев</td><td>5 сентября</td><td><a class="btn" href="#vacancy/marketing">Открыть</a></td></tr><tr><td><a href="#vacancy/research"><b>UX Researcher</b></a></td><td><span class="pill">Закрыта</span></td><td>Мария Фролова</td><td>28 августа</td><td><a class="btn" href="#vacancy/research">Открыть</a></td></tr></tbody></table></section>`}

  const seedCandidateOverrides=new Set();
  function seedProfiles(){
    const names=['Смирнов Алексей','Воронцова Алина','Назаров Дмитрий','Романова Ольга','Волков Пётр','Соколова Екатерина','Фомин Никита','Чен Виктория','Лапшин Сергей','Орлова Марина','Петров Михаил','Иванова Дарья','Макаров Илья','Крылова Анна','Сидоров Роман','Морозова Полина','Белов Артём'];
    const roles=['B2B Sales / Менеджер B2B продаж','Head of Sales B2B SaaS','Key Account Manager','Менеджер по работе с ключевыми клиентами','Account Manager','Business Development Manager','Менеджер корпоративных продаж','Enterprise Account Executive','Менеджер по развитию бизнеса','Key Account Manager B2B','Sales Development Representative','Customer Success Manager','Менеджер по партнёрствам','Account Executive','B2B Sales Manager','Менеджер клиентского сервиса','Business Development Manager'];
    return names.map((name,index)=>({id:'colleague-'+index,name,position:roles[index],company:'DemoCompany-'+(index+1),photo:'assets/candidates/'+(['portrait-sergey.png','portrait-alina.png','portrait-sergey.png','portrait-olga.png','portrait-sergey.png','portrait-ekaterina.png'][index%6]),source:index%2?'Своя база':'hh.ru',tags:index%3?['Кадровый резерв']:['На будущее'],score:9-index%5,age:28+index%10,city:'Москва',phone:'+7 000 000-00-00',email:'demo_candidate_'+index+'@example.com',education:'Демонстрационный университет · менеджмент · 2015 г.',skills:['B2B Sales','Переговоры','CRM'],experience:[{period:'2024 г. — настоящее время',company:'DemoCompany-'+(index+1),role:roles[index],text:'Вымышленный опыт: работа с корпоративными клиентами, презентации решений и развитие партнёрских проектов.'}],consent:'unknown'}));
  }
  function candidateContext(){
    const route=location.hash.slice(1),id=/^vacancy\/([^/]+)$/.exec(route)?.[1]||activeVacancyId;
    const local=seedCandidateOverrides.has(id)?null:window.CreationStore?.forRoute('vacancy/'+id);
    const handoff=seedCandidateOverrides.has(id)?null:window.SearchCandidateHandoff?.forRoute('vacancy/'+id);
    const selected=local||handoff;
    return {vacancyId:id,vacancyName:vacancies[id]?.name||selected?.vacancyName||vacancies.android.name,candidate:selected?.candidate||null,stage:selected?.stage||'Техническое интервью',localCandidates:window.CreationStore?.records(id)||[],pipeline:creationCatalog().find(v=>v.id===id)?.stages||[],navigate:routeTo,
      selectLocalCandidate:candidateId=>{if(window.CreationStore?.select(candidateId,id)){seedCandidateOverrides.delete(id);render();}},
      leaveLocalCandidate:()=>{seedCandidateOverrides.add(id);window.CreationStore?.clearSelection();}};
  }
  function render(){
    const route=location.hash.slice(1)||'dashboard';
    if(route!=='create/vacancy')pendingVacancyRequest=null;
    creationView?.destroy?.();creationView=null;
    const searchCandidateContext=window.CreationStore?.forRoute(route)||window.SearchCandidateHandoff?.forRoute(route);
    const colleagueFrame=document.querySelector('#colleague-reference-frame');
    const vacancyId=/^vacancy\/([^/]+)$/.exec(route)?.[1];
    const colleagueRoute=!!colleagueFrame&&(['dashboard','home','tasks','requisitions','create/requisition'].includes(route)||!!(vacancyId&&vacancies[vacancyId]&&(!vacancyId.startsWith('draft-')||searchCandidateContext)));
    const exactCandidateRoute=!colleagueRoute&&(route==='vacancy/android'||!!searchCandidateContext);
    const exactCandidateFrame=document.querySelector('#candidate-reference-frame');
    const exactAnalyticsFrame=document.querySelector('#analytics-reference-frame');
    const exactSearchFrame=document.querySelector('#search-reference-frame');
    const exactAnalyticsRoute=route==='analytics'&&!!exactAnalyticsFrame;
    const exactSearchRoute=route==='search'&&!!exactSearchFrame;
    document.body.classList.toggle('candidate-reference-route',exactCandidateRoute);
    document.body.classList.toggle('analytics-reference-route',exactAnalyticsRoute);
    document.body.classList.toggle('search-reference-route',exactSearchRoute);
    document.body.classList.toggle('colleague-reference-route',colleagueRoute);
    document.body.classList.toggle('creation-route',route.startsWith('create/')||route.startsWith('vacancy/draft-'));
    if(exactCandidateFrame)exactCandidateFrame.hidden=!exactCandidateRoute;
    if(exactAnalyticsFrame)exactAnalyticsFrame.hidden=!exactAnalyticsRoute;
    if(exactSearchFrame)exactSearchFrame.hidden=!exactSearchRoute;
    if(colleagueFrame)colleagueFrame.hidden=!colleagueRoute;
    if(colleagueRoute){
      if(vacancyId)activeVacancyId=vacancyId;
      document.querySelectorAll('body > dialog[open]').forEach(dialog=>dialog.close());
      if(!stagePanel.hidden)closeStagePanel();
      if(!colleagueFrame.getAttribute('src'))colleagueFrame.src='colleague-current.html?public=77b456181438';
      else colleagueFrame.contentWindow?.dispatchEvent(new Event('colleague-context-refresh'));
      return;
    }
    if(exactSearchRoute){
      document.querySelectorAll('body > dialog[open]').forEach(dialog=>dialog.close());
      if(!stagePanel.hidden)closeStagePanel();
      if(!exactSearchFrame.getAttribute('src'))exactSearchFrame.src='search-dev-current.html?public=f9e8963eeac5';
      else exactSearchFrame.contentWindow?.dispatchEvent(new Event('sd-creation-refresh'));
      return;
    }
    if(exactCandidateRoute){
      exactCandidateFrame.hidden=false;
      const prepareCandidateFrame=()=>{
        window.CandidateNavigation?.mount(exactCandidateFrame,{
          vacancyId:searchCandidateContext?.vacancyId||'android',
          vacancyName:vacancies[searchCandidateContext?.vacancyId||'android']?.name||searchCandidateContext?.vacancyName||vacancies.android.name,
          searchCandidate:searchCandidateContext?.candidate,
          localCandidates:window.CreationStore?.records(searchCandidateContext?.vacancyId||'android'),
          pipeline:creationCatalog().find(v=>v.id===(searchCandidateContext?.vacancyId||'android'))?.stages,
          selectLocalCandidate:id=>{window.CreationStore.select(id);render();},
          leaveLocalCandidate:()=>window.CreationStore.clearSelection(),
          stage:searchCandidateContext?.stage,navigate:routeTo
        });
      };
      if(!exactCandidateFrame.getAttribute('src')){
        exactCandidateFrame.addEventListener('load',prepareCandidateFrame,{once:true});
        exactCandidateFrame.src='candidate-card-current.html?public=b9f3518e687f';
      }else if(exactCandidateFrame.contentDocument?.location?.pathname.endsWith('/candidate-card-current.html')){
        prepareCandidateFrame();
      }else{
        exactCandidateFrame.addEventListener('load',prepareCandidateFrame,{once:true});
      }
      return;
    }
    exactCandidateFrame.hidden=true;
    if(exactAnalyticsRoute){
      // Dev-снимок живёт в отдельном документе: общие стили макета его не меняют.
      // Скрываем iframe на других маршрутах, сохраняя его выбранные фильтры и экран.
      document.querySelectorAll('body > dialog[open]').forEach(dialog=>dialog.close());
      if(!stagePanel.hidden)closeStagePanel();
      if(!exactAnalyticsFrame.getAttribute('src'))exactAnalyticsFrame.src='analytics-dev-current.html?public=1a47b71d17e7';
      return;
    }
    if(route.startsWith('create/')){renderCreation(route.split('/')[1]);screen.scrollTop=0;return;}
    if(route==='tasks/legacy'){renderTasks();return;}
    if(route==='requisitions/legacy'){window.RequestExperience?.render(route);return;}
    applyMode();
    if(!stagePanel.hidden)closeStagePanel();
    document.querySelectorAll('.nav-item[data-route]').forEach(x=>x.classList.toggle('active',x.dataset.route===route.split('/')[0]));
    $('#ai-context').textContent=`Контекст: ${route.startsWith('vacancy')?'вакансия':route==='requisitions'?'заявки':route==='analytics'?'аналитика':route==='tasks'?'мои задачи':route==='calendar'?'календарь':route==='settings'?'настройки':'поиск'}`;
    if(/^vacancy\/[^/]+\/edit$/.test(route))renderVacancyEditor68(route.split('/')[1]);else if(/^vacancy\/draft-[a-z0-9-]+$/.test(route)&&vacancies[route.split('/')[1]])renderCreatedVacancy(route.split('/')[1]);else if(window.ProductMode?.render(route)){}else if(window.VacancySetup?.render(route)){}else if(window.AnalyticsWorkspace?.render(route)){}else if(window.RecruitWorkspaces?.render(route)){}else if(route==='search')renderSearch();else if(route==='tasks')renderTasks();else if(route==='calendar')renderCalendar();else if(route==='portfolio')renderPortfolio();else if(route.startsWith('vacancy/'))renderVacancy(route.split('/')[1]);else renderSearch();
    if(route.startsWith('vacancy/')&&!route.endsWith('/edit')&&!route.endsWith('/setup')){
      screen.querySelector('.vacancy-name-button')?.insertAdjacentHTML('afterend',`<button type="button" class="vacancy-settings-button" style="height:44px;min-height:44px;box-sizing:border-box;padding:0 15px;border-radius:14px" data-action="vacancy-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m10 2-.5 3-2 .9L4.8 4.8 2.8 8.2 5 10v4l-2.2 1.8 2 3.4L7.5 18l2 .9.5 3h4l.5-3 2-.9 2.7 1.2 2-3.4L19 14v-4l2.2-1.8-2-3.4-2.7 1.1-2-.9-.5-3z"/></svg><span>Настройки вакансии</span></button>`);
      screen.querySelector('.vacancy-head.compact')?.insertAdjacentHTML('beforeend',`<button type="button" data-action="ai-vacancy-automation" data-antd="Button" data-antd-props="color=purple variant=solid"><span class="ant-btn-icon"><span class="anticon">ИИ</span></span><span>Настройки воронки</span></button>`);mountPipelineLayout()
    }
    window.ProductMode?.decorate(route);
    screen.scrollTop=0;screen.focus({preventScroll:true});
  }

  document.addEventListener('click',e=>{
    const created=e.target.closest('[data-created-candidate]');if(created){window.CreationStore.select(created.dataset.createdCandidate);render();return;}
    if(!e.target.closest('.ve68-funnel-dropdown'))toggleVacancyFunnelMenu(false);
    const route=e.target.closest('[data-route]');if(route){e.preventDefault();routeTo(route.dataset.route);return}
    const a=e.target.closest('[data-action]');if(!a)return;const action=a.dataset.action;
    if(modal.open&&a.closest('.modal-body')&&!['format-text','choose-stage','toggle-pause-outgoing','vacancy-ai-toggle','vacancy-ai-configure','vacancy-automation-config','vacancy-funnel-toggle','vacancy-funnel-choose'].includes(action))modal.close();
    if(!stagePanel.hidden&&a.closest('[data-stage-panel]')&&!['format-text','choose-stage','close-stage-panel','confirm-stage-change'].includes(action))closeStagePanel();
    if(action==='format-text'){const editor=a.closest('.rich-editor')?.querySelector('.rich-input');if(!editor)return;editor.focus();const format=a.dataset.format,commands={bold:'bold',italic:'italic',bullet:'insertUnorderedList',number:'insertOrderedList'};if(commands[format])document.execCommand(commands[format],false);else if(format==='link'){const selected=window.getSelection()?.toString();if(selected)document.execCommand('createLink',false,'https://example.com');else document.execCommand('insertHTML',false,'<a href="https://example.com">ссылка</a>')}else if(format==='mention')document.execCommand('insertText',false,'@Елена Крылова ')}
    else if(action==='choose-stage'){pendingStage=a.dataset.stage;const panel=a.closest('[data-stage-panel]');panel?.querySelectorAll('[data-action="choose-stage"]').forEach(button=>button.classList.toggle('selected',button===a));const label=stages.find(([key])=>key===pendingStage)?.[1];const target=panel?.querySelector('[data-stage-choice-name]');if(target)target.textContent=label}
    else if(action==='search-mode'){searchMode=a.dataset.mode;renderSearch()}
    else if(action==='add-query'){queryRows.push({logic:'И',field:'Резюме и навыки',op:'все слова',value:''});renderSearch()}
    else if(action==='remove-query'){queryRows.splice(Number(a.dataset.i),1);renderSearch()}
    else if(action==='run-search'){if(!Object.values(searchSources).some(Boolean)){searchSources.ats=true;showToast('Выбран источник по умолчанию: база ATS')}searchRan=true;renderSearch();showToast('Поиск завершён: найдено 128 кандидатов')}
    else if(action==='search-filter'){const name=a.dataset.filter;const variants=name==='Регион'?['Москва','Санкт-Петербург','Удалённо']:name==='Опыт в профессии'?['Без опыта','1–3 года','3–6 лет','Более 6 лет']:name==='Статус поиска'?['Активно ищет','Рассматривает предложения','Не ищет']:['Любое значение','Выбрано','Не заполнено'];openModal(name,'Быстрый фильтр поиска',`<div class="filter-choice-list">${variants.map((x,i)=>`<label><input type="checkbox" ${i===0?'checked':''}> ${x}</label>`).join('')}</div>`,'Применить',()=>{if(!activeSearchFilters.includes(name))activeSearchFilters.push(name);modal.close();renderSearch();showToast(`Фильтр «${name}» применён`)})}
    else if(action==='clear-search-filters'){activeSearchFilters=[];renderSearch()}
    else if(action==='calendar-layer'){const sw=a.querySelector('.vs-switch'),on=!sw.classList.contains('is-on');sw.classList.toggle('is-on',on);sw.setAttribute('aria-checked',String(on))}
    else if(action==='search-source'){const k=a.dataset.searchSource;searchSources[k]=!searchSources[k];a.classList.toggle('selected',searchSources[k]);const sw=a.querySelector('.vs-switch');sw.classList.toggle('is-on',searchSources[k]);sw.setAttribute('aria-checked',String(searchSources[k]))}
    else if(action==='more-search-filters')openModal('Все фильтры','Расширенный набор полей уровня поиска hh.ru и истории ATS',`<div class="advanced-filter-grid">${['Период обновления резюме','Регион и готовность к переезду','Опыт в профессии','Опыт в отрасли','Статус поиска','Возраст','Тип занятости','Формат работы','Общий опыт','Уровень дохода','Образование','Навыки','Языки','Текущие процессы в ATS','Этапы прошлых вакансий','Текст форм и фидбека'].map(x=>`<label><input type="checkbox"> ${x}</label>`).join('')}</div>`,'Применить',()=>{if(!activeSearchFilters.includes('Дополнительные'))activeSearchFilters.push('Дополнительные');modal.close();renderSearch();showToast('Расширенные фильтры применены')})
    else if(action==='ai-example'){const field=$('#ai-search-prompt');field.value=a.textContent.trim();field.focus()}
    else if(action==='ai-search-build')openModal('ИИ собрал поисковый запрос','Проверьте условия перед запуском',`<div class="detail-block"><h3>Обязательные условия</h3><p>Kotlin и Android SDK · опыт мобильной разработки от 4 лет · продуктовая компания.</p></div><div class="detail-block"><h3>Желательные условия</h3><p>Москва или удалённо · опыт с высоконагруженными приложениями.</p></div><div class="detail-block"><h3>Источники</h3><p>Сначала база ATS. Внешние источники можно подключить после запуска.</p></div>`,'Запустить поиск',()=>{queryRows=[{logic:'И',field:'Резюме и навыки',op:'все слова',value:'Kotlin Android SDK'},{logic:'И',field:'Опыт работы',op:'все слова',value:'от 4 лет'},{logic:'И',field:'Все доступные данные',op:'все слова',value:'продуктовая компания'}];searchSources={ats:true,hh:false,avito:false,getmatch:false};searchRan=true;modal.close();renderSearch();showToast('ИИ-поиск завершён: найдено 128 кандидатов')})
    else if(action==='save-search'||action==='saved-searches')openModal('Сохранённые поиски','Личные и командные запросы',`<div class="detail-block"><h3>Senior Android · Москва</h3><p>ATS + hh.ru · обновлён вчера</p></div><div class="detail-block"><h3>Product Designer · портфолио</h3><p>База ATS · командный запрос</p></div>`,'Сохранить текущий');
    else if(action==='auto-match')openModal('Автоподбор к вакансии','ATS соберёт запрос из требований и покажет объяснимые результаты',`<div class="form-grid"><label class="field full">Вакансия<select><option>Senior Android-разработчик</option><option>Senior Product Designer</option></select></label><label class="field">Источники<select><option>ATS + hh.ru + Авито</option><option>Только база ATS</option></select></label><label class="field">Минимальное соответствие<input value="75%"></label></div>`,'Сформировать подборку',()=>{modal.close();showToast('Автоподборка сформирована: 36 кандидатов')});
    else if(action==='candidate-preview')openDrawer(people[Number(a.dataset.i)],roles[Number(a.dataset.i)%roles.length],`<div class="detail-block"><h3>Профиль кандидата</h3><p>3 резюме · 2 активных процесса · согласие дано</p>${button('Открыть на вакансии','open-from-drawer','primary')}</div><div class="detail-block"><h3>Почему найден</h3><p>Kotlin, Android, 5 лет опыта; находится в Москве; ожидания в пределах бюджета.</p></div>`);
    else if(action==='add-search-result'){e.stopPropagation();showToast(`${a.dataset.name} добавлен на этап «${stages[1]?.[1]||'Отклик'}»`)}
    else if(action==='open-candidate-base')openDrawer('База кандидатов','12 480 профилей в пределах прав',`<div class="filters"><input placeholder="Имя, роль, компания"></div>${people.slice(0,6).map((n,i)=>`<div class="result-card"><div class="avatar">${n.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><b>${n}</b><small>${roles[i%roles.length]} · ${i%3+1} активных процесса</small></div></div>`).join('')}`);
    else if(action==='task-filter'){taskFilter=a.dataset.filter;renderTasks()}
    else if(action==='new-task')openModal('Создать задачу','Рекрутинговая задача с одним основным объектом',`<div class="form-grid"><label class="field full">Название<input placeholder="Что нужно сделать"></label><label class="field">Тип<select><option>Связаться</option><option>Получить фидбек</option><option>Добавить X кандидатов</option><option>Назначить X интервью</option></select></label><label class="field">Ответственный<select><option>Я — Елена Крылова</option><option>Антон Беляев</option></select></label><label class="field">Срок${datePicker('08.09.2026','Срок')}</label><label class="field">Приоритет<select><option>Обычный</option><option>Высокий</option></select></label></div>`,'Создать',()=>{tasks.unshift({id:Date.now(),title:'Новая задача',object:'Senior Android-разработчик',priority:'Обычный',due:'завтра',progress:'—'});modal.close();renderTasks();showToast('Задача создана')});
    else if(action==='team-tasks')openDrawer('Задачи команды','Доступно руководителю рекрутмента',`<table class="data-table"><thead><tr><th>Сотрудник</th><th>Активные</th><th>Просрочено</th></tr></thead><tbody><tr><td>Елена Крылова</td><td>17</td><td class="late">3</td></tr><tr><td>Антон Беляев</td><td>12</td><td>1</td></tr><tr><td>Мария Фролова</td><td>21</td><td class="late">4</td></tr></tbody></table>`);
    else if(action==='calendar-view'){calendarView=a.dataset.view;renderCalendar()}
    else if(action==='calendar-week'){calendarView='week';renderCalendar()}
    else if(action==='new-meeting')openModal('Назначить встречу','Слоты повторно проверяются перед сохранением',`<div class="form-grid"><label class="field">Дата${datePicker('08.09.2026','Дата')}</label><label class="field">Время<select><option>11:30–12:15</option><option>14:00–14:45</option></select></label><label class="field">Видеосвязь<select><option>Яндекс Телемост</option><option>Контур Толк</option></select></label><label class="field">Участники<input value="Елена Крылова, кандидат"></label><label class="field full"><span><input type="checkbox" checked> Подключить ИИ-протоколиста</span></label></div>`,'Назначить',()=>{modal.close();showToast('Встреча назначена, приглашения подготовлены')});
    else if(action==='event-detail')openDrawer('HR-интервью','8 сентября, 11:30–12:15',`<div class="detail-block"><h3>Алина Воронцова</h3><p>Senior Android-разработчик<br>Яндекс Телемост · 3 участника</p></div><div class="actions">${button('Перенести','new-meeting')}${button('Открыть кандидата','open-candidate-route','primary')}</div>`);
    else if(action==='calendar-access')openModal('Доступность календаря','Компания определяет видимость деталей',`<label class="field"><span><input type="radio" checked name="cal"> Только занятость</span></label><label class="field"><span><input type="radio" name="cal"> Полный календарь</span></label>`);
    else if(action==='analytics-builder')openModal('Конструктор дашборда','Перестройте страницу из готовых виджетов',`<div class="form-grid"><label class="field"><span><input type="checkbox" checked> Time to hire</span></label><label class="field"><span><input type="checkbox" checked> Воронка</span></label><label class="field"><span><input type="checkbox" checked> Источники</span></label><label class="field"><span><input type="checkbox" checked> NPS и Candidate Experience</span></label><label class="field full">Расположение<select><option>Автоматически</option><option>Плотная сетка</option></select></label></div>`,'Применить',()=>{modal.close();showToast('Дашборд обновлён')});
    else if(action==='analytics-ai'){ai.hidden=false;$('#ai-input').value='Собери отчёт по причинам нарушения SLA';$('#ai-input').focus()}
    else if(action==='metric-detail')openDrawer('Детализация метрики','Определение, покрытие и разрешённые объекты',`<div class="detail-block"><h3>Time to hire · версия 3</h3><p>Медиана календарных дней от старта поиска до фактического выхода. Покрытие данных 94%.</p></div><table class="data-table"><tr><td>Senior Android-разработчик</td><td>28 дней</td></tr><tr><td>Data Analyst</td><td>41 день</td></tr></table>`);
    else if(action==='new-requisition')openModal('Новая заявка','Начните в чате с ИИ или переключитесь на форму',`<div class="segments"><button class="active">Чат с ИИ</button><button>Структурированная форма</button></div><div class="detail-block" style="margin-top:12px"><h3>ИИ: Кого и зачем вы хотите нанять?</h3><p>Я соберу требования, задачи, условия и подготовлю описание для согласования и публикации.</p><textarea style="width:100%;min-height:90px" placeholder="Например: нужен Senior Android-разработчик в команду платежей"></textarea></div><div class="detail-block"><h3>Использовать предыдущую заявку</h3><p>Senior Android-разработчик · 3 месяца назад</p>${button('Взять за основу','req-use-old')}</div>`,'Продолжить диалог',()=>{modal.close();showToast('Черновик заявки и диалог сохранены')});
    else if(action==='editor-back'){routeTo('vacancy/'+activeVacancyId)}
    else if(action==='vacancy-allocate')openVacancyAllocation(a.dataset.id||activeVacancyId);
    else if(action==='vacancy-editor-edit'){
      const id=activeVacancyId,v=vacancies[id]||vacancies.android;
      openModal('Редактировать вакансию','Позиция, описание и системные данные собраны в одном месте',vacancyEditForm(v,id),'Сохранить изменения',()=>{
        const values=window.VacancyEditorForm.collect(modal.querySelector('.vef-form'));if(!values)return;
        const result=window.VacancyEditorForm.save(vacancies,id,values);if(!result.ok)return;
        if(vacancies[id]?.createdLocally&&!persistCreatedVacancies())result.persisted=false;
        modal.close();renderVacancyEditor68(id);showToast(result.persisted?'Изменения вакансии сохранены':'Изменения сохранены до закрытия страницы: локальное хранилище недоступно');
      });
      modal.classList.add('vacancy-editor-modal');modal.dataset.rerenderEditor='true';
    }
    else if(action==='vacancy-ai-settings'){
      openModal('Настройки AI и автоматизации','Воронка, AI-модули и автоматизации по этапам',vacancyAiSettingsBody(),'Закрыть',()=>modal.close(),true);
      modal.classList.add('vacancy-editor-modal','vacancy-ai-modal');modal.dataset.rerenderEditor='true';
    }
    else if(action==='vacancy-funnel-toggle'){
      toggleVacancyFunnelMenu(a.getAttribute('aria-expanded')!=='true');
    }
    else if(action==='vacancy-funnel-choose'){
      chooseVacancyFunnel(a.dataset.funnel);
    }
    else if(action==='vacancy-ai-toggle'){
      window.VacancyAiConfig.toggle(vacancyAiContext(Number(a.dataset.stageIndex)),rerenderVacancyAiRows);
    }
    else if(action==='vacancy-ai-configure'){
      window.VacancyAiConfig.open(vacancyAiContext(Number(a.dataset.stageIndex)),rerenderVacancyAiRows);
    }
    else if(action==='vacancy-automation-config'){
      window.VacancyAutomationConfig.open(vacancyAiContext(Number(a.dataset.stageIndex)),rerenderVacancyAiRows);
    }
    else if(action==='vacancy-history'){
      openModal('История вакансии','Изменения, версии воронки и ключевые события',vacancyHistorySection(),'Закрыть',()=>modal.close(),true);
      modal.classList.add('vacancy-editor-modal','vacancy-history-modal');modal.dataset.rerenderEditor='true';
    }
    else if(action==='publication-board'){
      const board=a.dataset.board,names={hh:'hh.ru',avito:'Авито Работа',superjob:'SuperJob'},v=vacancies[activeVacancyId]||vacancies.android;
      openModal(names[board]||'Работный сайт','',window.Publications?.boardSection(v,activeVacancyId,board)||'','Закрыть',()=>modal.close(),true);
      modal.classList.add('vacancy-editor-modal','vacancy-publication-modal');modal.dataset.rerenderEditor='true';
      $('#modal-title').innerHTML=`<span>${esc(names[board]||'Работный сайт')}</span><small>${esc(v.name)}</small>`;
    }
    else if(action==='publication-integrations'){
      const names={hh:'hh.ru',avito:'Авито Работа',superjob:'SuperJob'},name=names[a.dataset.board]||'Площадка',connected=a.dataset.connected==='true';
      if(!connected)openModal(`Подключить ${name}`,'Вход под личным аккаунтом площадки',`<div class="ve68-integration-settings"><section class="detail-block"><h3>Авторизация на стороне ${name}</h3><p>Вы перейдёте на площадку, войдёте под своим аккаунтом и подтвердите доступ ATS. Пароль от площадки в ATS не сохраняется.</p></section><div class="detail-block"><h3>После подключения</h3><p>Станут доступны кабинеты, публикация вакансий, получение откликов и история отправок.</p></div></div>`,'Войти в '+name,()=>{modal.close();renderVacancyEditor68(activeVacancyId);showToast(`Демонстрация перехода к авторизации ${name}`)});
      else openModal(`Подключение · ${name}`,'Личный аккаунт и доступные кабинеты',`<div class="ve68-integration-settings"><section class="detail-block"><h3>Аккаунт подключён</h3><p>Отклики попадают в общий поток вакансии, а действия с объявлениями сохраняются в истории.</p></section><div class="form-grid"><label class="field full">Основной кабинет<select><option>Демо Технологии</option><option>Демо Сервис</option></select></label><label class="field">Пользователь<input value="Елена Крылова"></label><label class="field">Приём откликов<select><option>Автоматически</option><option>С подтверждением</option></select></label></div><section class="detail-block"><h3>Управление подключением</h3><p>Здесь можно сменить аккаунт, обновить доступ или отключить площадку.</p></section></div>`,'Готово',()=>modal.close(),true);
      modal.classList.add('vacancy-editor-modal');modal.dataset.rerenderEditor='true';
    }
    else if(action==='vacancy-info'||action==='ai-vacancy-automation'){drawer.hidden=true;routeTo('vacancy/'+activeVacancyId+'/edit')}
    else if(action==='vacancy-tab'){vacancyDetailTab=a.dataset.tab;if(location.hash.endsWith('/edit'))renderVacancyEditor68(activeVacancyId);else openVacancyDetails(vacancyDetailTab)}
    else if(action==='view-requisition'){drawer.hidden=true;routeTo('requisitions')}
    else if(action==='vacancy-resume'){drawer.hidden=true;window.CandidacyRuns.setPaused(false);showToast('Вакансия возобновлена. Прежние прогоны и приостановленные публикации автоматически не возобновляются')}
    /* Переключатель «остановить исходящие» в окне паузы: состояние у Switch — класс (49.3). */
    else if(action==='toggle-pause-outgoing'){a.classList.toggle('is-on');a.setAttribute('aria-checked',a.classList.contains('is-on'))}
    else if(action==='vacancy-pause')openModal('Приостановить вакансию','SLA и автоматические действия будут поставлены на паузу',`<div class="form-grid"><label class="field full">Причина<select><option>Пересмотр потребности</option><option>Изменение бюджета</option><option>Временная заморозка найма</option></select></label><label class="field full">Комментарий<textarea placeholder="Почему вакансия приостанавливается"></textarea></label><label class="field full"><span><button type="button" class="vs-switch is-on" role="switch" aria-checked="true" data-action="toggle-pause-outgoing" aria-label="Остановить автоматические исходящие сообщения"></button> Остановить автоматические исходящие сообщения</span></label></div>${window.Publications?.closeBlock(activeVacancyId,'pause')||''}`,'Приостановить',()=>{const pub=window.Publications?.applyClose(activeVacancyId,'pause')||'';modal.close();drawer.hidden=true;window.CandidacyRuns.setPaused(true);showToast(`Вакансия приостановлена. Новые запуски и автоматические действия ИИ заблокированы.${pub?' '+pub:''}`)})
    else if(action==='vacancy-close')openModal('Закрыть вакансию','Закрытие завершит активный подбор, но сохранит всю историю',`<div class="form-grid"><label class="field full">Причина<select><option>Позиции закрыты</option><option>Потребность отменена</option><option>Вакансия объединена с другой</option></select></label><label class="field full">Что сделать с активными кандидатами<select><option>Проверить каждого перед закрытием</option><option>Перенести в другую вакансию</option></select></label><label class="field full">Комментарий<textarea placeholder="Обязателен для аудита"></textarea></label></div>${window.Publications?.closeBlock(activeVacancyId,'close')||''}`,'Закрыть вакансию',()=>{const pub=window.Publications?.applyClose(activeVacancyId,'close')||'';modal.close();showToast(pub?`${pub} Статус вакансии в демо не меняется`:'Демонстрация: вакансия не закрыта без проверки кандидатов')})
    else if(action==='vacancy-setup'){drawer.hidden=true;drawer.classList.remove('vacancy-details-drawer');routeTo('vacancy/'+activeVacancyId+'/setup')}
    else if(action==='vacancy-edit')openModal('Редактировать сведения вакансии','Изменение создаст новую версию; исходная заявка останется доступна',`<div class="form-grid"><label class="field full">Название<input value="${vacancies[activeVacancyId].name}"></label><label class="field">Подразделение<input value="${vacancies[activeVacancyId].department}"></label><label class="field">Грейд<select><option>${vacancies[activeVacancyId].grade}</option><option>Middle</option><option>Lead</option></select></label><label class="field full">Условия<textarea>Москва · гибрид или удалённо · бюджет до 420 000 ₽</textarea></label></div>`,'Сохранить версию')
    else if(action==='vacancy-team'){
      const hiring=a.dataset.teamRole==='hiring';
      openModal(hiring?'Добавить в нанимающую команду':'Добавить рекрутера','Функция участия не расширяет права роли пользователя',`<div class="form-grid"><label class="field full">Пользователь<input placeholder="Начните вводить имя"></label><label class="field">Функция<select>${hiring?'<option>Нанимающий менеджер</option><option>Интервьюер</option><option>Согласующий</option>':'<option>Рекрутер</option><option>Ресечер</option><option>Координатор</option>'}</select></label><label class="field">Доступ<select><option>По роли и функции</option><option>С индивидуальным ограничением</option></select></label></div>`,'Добавить')
    }
    else if(action==='vacancy-access')openModal('Проверка доступа','Показывает итог роли, функции участия и индивидуальных ограничений',`<div class="form-grid"><label class="field full">Пользователь<select><option>Алексей Мельников · нанимающий менеджер</option><option>Ольга Селезнёва · интервьюер</option></select></label></div><div class="detail-block"><h3>Итоговый доступ</h3><p>✓ Видит профиль и безопасное резюме<br>✓ Заполняет назначенные формы<br>— Не видит зарплатные ожидания<br>— Не меняет этап кандидата</p></div>`,'Готово',()=>modal.close(),true)
    else if(action==='new-vacancy'){modal.close();routeTo('create/vacancy')}
    else if(action==='candidate-source')showToast('33 рекомендации из базы · откройте «Поиск» для полного списка')
    else if(action==='empty-stages')openModal('Этапы без кандидатов','Они остаются частью действующей версии воронки',`<div class="empty-stage-list">${stages.filter(([key])=>!systemStageKeys.has(key)&&!stageCounts[key]).map(([,label])=>`<span>${label}<b>0</b></span>`).join('')}</div>`,'Готово',()=>modal.close(),true)
    else if(action==='pipeline-overflow'){const hiddenKeys=new Set([...screen.querySelectorAll('.pipeline-stages [data-pipeline-item][hidden]')].map(x=>x.dataset.stage).filter(Boolean));openModal('Этапы, которые не поместились','В строке они спрятаны под «Ещё» — порядок воронки тот же',`<div class="pipeline-overflow-list">${stages.filter(([key])=>!systemStageKeys.has(key)&&(!hiddenKeys.size||hiddenKeys.has(key))).map(([key,label])=>`<button class="${selectedStage===key?'active':''}" data-action="stage" data-stage="${key}"><span>${label}</span><b>${stageCounts[key]}</b></button>`).join('')}</div>`,'Закрыть',()=>modal.close(),true)}
    else if(action==='handoff-info'){const sink=window.ProductMode?.sink?.();openModal(sink?`Передано в ${sink}`:'Передано рекрутёру',sink?`Результат отбора передан в ${sink}`:'Результат отбора забрал рекрутёр',`<div class="detail-block"><h3>${sink?'Что уходит':'Что забирает рекрутёр'}</h3><p>${sink?'Карточка, резюме, отчёт интервью и оценка с причиной — всё сразу, как только кандидат прошёл или не прошёл наш этап.':'Карточку, резюме, отчёт интервью и оценку с причиной — всё это он открывает здесь же, как только кандидат прошёл или не прошёл наш этап.'}</p></div><div class="detail-block"><h3>Что приходит обратно</h3><p>${sink?'Только их статус. Показываем его в карточке кандидата, но на нашу воронку он не влияет.':'Ничего: дальше рекрутёр работает вне системы.'}</p></div><div class="automation-routing-note"><b>Почему воронка тут короткая</b><span>${sink?'Что идёт после передачи — их интервью, оффер, выход на работу — мы не видим.':'Что идёт после передачи — интервью, оффер, выход на работу — рекрутёр ведёт вне системы.'} Считать по половине пути нельзя.</span></div>`,'Понятно',()=>modal.close(),true)}
    else if(action==='hiring-outcome')openModal('Подтверждённые выходы','Фактический выход завершает процесс успешным наймом, но не является этапом воронки',`<div class="detail-block"><h3>План и факт</h3><p><b>${confirmedHires} из ${vacancies[activeVacancyId].positions}</b> запланированных сотрудников уже вышел.</p></div><div class="timeline-item"><b>Александр Котов вышел на работу</b><small>7 сентября, 10:00 · подтверждено Еленой Крыловой</small></div><div class="automation-routing-note"><b>Почему это отдельно</b><span>Принятый оффер переводит кандидата в «Ожидание выхода». Успешный итог появляется только после отдельного подтверждения фактического выхода.</span></div>`,'Готово',()=>modal.close(),true)
    else if(action==='stage'){selectedStage=a.dataset.stage;selectedCandidate=0;candidateTab='overview';profilePopover='';window.CandidacyRuns?.resetFilter();render()}
    else if(action==='select-candidate'){selectedCandidate=Number(a.dataset.i);profilePopover='';render()}
    else if(action==='candidate-tab'){candidateTab=a.dataset.tab;render()}
    else if(action==='take-vacancy'){profilePopover=profilePopover==='vacancy'?'':'vacancy';render()}
    else if(action==='select-target-vacancy'){const target=vacancies[a.dataset.id],current=currentCandidate();profilePopover='';render();openModal('Взять на другую вакансию',`${current.name} · профиль кандидата останется единым`,`<div class="detail-block"><h3>${target.name}</h3><p>${target.department} · ${target.positions} ${target.positions===1?'ставка':'ставки'} · рекрутер ${target.recruiter}</p></div><div class="form-grid"><label class="field full">Начальный этап<select><option>Новый кандидат</option><option>Контакт</option><option>Ревью резюме</option></select></label><label class="field full">Резюме<select><option>Актуальная версия · ${current.source}</option><option>Выбрать другую версию</option></select></label></div>`,'Взять на вакансию',()=>{modal.close();render();showToast(`${current.name} добавлен на вакансию «${target.name}»`)})}
    else if(action==='tag-picker'){profilePopover=profilePopover==='tags'?'':'tags';render()}
    else if(action==='toggle-tag'){const current=currentCandidate(),list=candidateTags[current.name]||(candidateTags[current.name]=[]),tag=a.dataset.tag,index=list.indexOf(tag);if(index>=0)list.splice(index,1);else list.push(tag);profilePopover='tags';render()}
    else if(action==='clear-tags'){const current=currentCandidate();candidateTags[current.name]=[];profilePopover='tags';render()}
    else if(action==='edit-tags'){profilePopover='';openModal('Редактировать метки','Справочник меток доступен пользователям с правом настройки',`<div class="detail-block"><h3>Метки кандидатов</h3><p>${candidateTagOptions.join(' · ')}</p></div><label class="field full">Новая метка<input placeholder="Название метки"></label>`,'Добавить метку')}
    else if(action==='move-candidate'){if(stagePanel.hidden)openStageChange(a);else closeStagePanel()}
    else if(action==='close-stage-panel')closeStagePanel()
    else if(action==='confirm-stage-change'){closeStagePanel();openStageChange()}
    else if(action==='add-candidate'){modal.close();routeTo('create/candidate')}
    else if(['quick-message','send-message'].includes(action))openModal('Написать кандидату','Канал и шаблон выбираются перед отправкой',`<div class="form-grid"><label class="field">Канал<select><option>hh.ru</option><option>Email</option><option>Telegram</option></select></label><label class="field">Шаблон<select><option>Приглашение на интервью</option><option>Без шаблона</option></select></label><label class="field full">Сообщение<textarea>Здравствуйте! Предлагаю выбрать удобное время для интервью.</textarea></label></div>`,'Отправить',()=>{modal.close();showToast('Сообщение отправлено и добавлено в историю')});
    else if(action==='copy-contact')showToast('Контакт скопирован');
    else if(action==='candidate-more')openDrawer('Дополнительная информация','Все редкие данные и действия — без перегрузки основной карточки',`<div class="detail-block"><h3>Текущие процессы</h3><p>Senior Android-разработчик · Ревью<br>Mobile Developer · Контакт</p></div><div class="detail-block"><h3>Личная заметка</h3><p>Видна автору, руководителю рекрутмента и администратору.</p><textarea style="width:100%;min-height:80px" placeholder="Напишите личную заметку"></textarea></div>`);
    else if(action==='edit-candidate'){const current=currentCandidate();openModal('Редактировать кандидата','Изменения профиля не переписывают исходные версии резюме',`<div class="form-grid"><label class="field full">ФИО<input value="${esc(current.name)}"></label><label class="field">Телефон<input value="+7 900 555-12-${20+current.days}"></label><label class="field">Эл. почта<input value="${current.name.split(' ')[0].toLowerCase()}@example.com"></label></div>`,'Сохранить')}
    else if(action==='add-file')openModal('Добавить файл','Файл сохранится в карточке и истории кандидата',`<div class="form-grid"><label class="field full">Тип файла<select><option>Резюме</option><option>Портфолио</option><option>Результат тестового</option><option>Другой файл</option></select></label><label class="field full">Файл<input type="file"></label><label class="field full">Комментарий<textarea placeholder="Необязательно"></textarea></label></div>`,'Загрузить',()=>{modal.close();showToast('Файл добавлен в карточку')});
    else if(action==='resume-versions')openDrawer('Все резюме и версии','Источник, версия и дата проверки актуальности сохраняются отдельно',`<div class="detail-block"><h3>hh.ru · версия 4</h3><p>Актуальное · обновлено 3 сентября · проверено сегодня</p><span class="pill good">Изменений опыта не найдено</span></div><div class="detail-block"><h3>PDF от рекрутера · версия 2</h3><p>Загружено 14 мая · предыдущая версия доступна</p></div><div class="detail-block"><h3>Авито Работа · версия 1</h3><p>Получено 2 апреля · внешний ID сохранён</p></div>`);
    else if(action==='feedback-form')openModal('Обратная связь · Техническое интервью','Форма Android Senior · версия 4 · Дмитрий Назаров',`<div class="feedback-form-pro"><section><h3>Техническая база</h3><p>Отметьте подтверждённые на интервью навыки.</p><div class="check-grid"><label><input type="checkbox" checked> Kotlin и Coroutines</label><label><input type="checkbox" checked> Jetpack Compose</label><label><input type="checkbox"> Многомодульная архитектура</label><label><input type="checkbox" checked> REST и offline-first</label></div></section><section><h3>Оценка компетенций</h3>${[['Архитектура',4],['Качество кода',4],['Коммуникация',5]].map(([name,mark])=>`<div class="rating-row"><span>${name}</span><div class="segments">${[1,2,3,4,5].map(x=>`<button class="${x===mark?'active':''}" type="button">${x}</button>`).join('')}</div></div>`).join('')}</section><section class="form-grid"><label class="field full">Сильные стороны<textarea>Системно объясняет решения, приводит метрики и учитывает ограничения продукта.</textarea></label><label class="field full">Риски<textarea placeholder="Что нужно дополнительно проверить"></textarea></label><label class="field">Итоговая рекомендация<select><option>Двигать дальше</option><option>Нужна дополнительная оценка</option><option>Отказать</option></select></label><label class="field">Уровень<select><option>Senior</option><option>Middle+</option><option>Lead</option></select></label><label class="field full">Комментарий для команды<textarea placeholder="Аргументы и следующий шаг"></textarea></label></section></div>`,'Отправить фидбек',()=>{modal.close();showToast('Фидбек добавлен в историю текущей вакансии')});
    else if(action==='feedback-view')openModal('Фидбек по HR-интервью','Елена Крылова · сегодня, 11:12 · форма HR Interview v3',`<div class="feedback-readonly"><div><span>Итог</span><b>Двигать дальше</b></div><div><span>Мотивация</span><b>4 из 5</b></div><div><span>Коммуникация</span><b>5 из 5</b></div><div><span>Риск</span><b>Низкий</b></div><p>Кандидат понимает задачи роли, заинтересован в продуктовой команде и готов продолжить процесс на этой неделе.</p></div>`,'Закрыть',()=>modal.close(),true)
    else if(action==='save-comment'){const editor=document.querySelector('[data-comment-editor]'),value=editor?.textContent.trim();if(!value){showToast('Напишите комментарий');return}const html=safeRichText(editor);document.querySelector('[data-activity-feed]')?.insertAdjacentHTML('afterbegin',`<article class="activity-item new-event"><span class="activity-mark">ЕК</span><div><header><b>Комментарий</b><time>Только что</time></header><div class="activity-rich-text">${html}</div><small>Елена Крылова · текущий этап</small></div></article>`);editor.innerHTML='';showToast('Комментарий сохранён в истории текущей вакансии')}
    else if(action==='meeting-record'){openModal('ИИ-протоколист встречи','Техническое интервью с командой',`<div class="note"><b>Транскрипт и заметки</b><p>Интервьюер: расскажите о последнем проекте.</p><p>Кандидат: работал над мобильным приложением, отвечал за архитектуру и качество релизов.</p><p>Протоколист сохраняет запись и заметки встречи. Решение по кандидату принимает команда.</p></div>`,'Закрыть',()=>modal.close(),true)}
    else if(action==='interview-detail')openDrawer('ИИ-интервью','Материалы встроены в карточку кандидата',`<div class="detail-block"><h3>Текстовое интервью · завершено</h3><p><b>Саммари:</b> кандидат подробно рассказал о последнем проекте, роли в команде и мотивации. Два ответа требуют ручной проверки.</p><p>28 сообщений · 24 минуты · Собесо</p>${button('Открыть полный диалог','notetaker')}</div><div class="detail-block"><h3>Голосовое интервью · приглашён</h3><p>Получено 2 из 7 ответов. Техническая ошибка не считается плохим результатом.</p>${button('Настроить напоминания','notetaker')}</div>`);
    else if(action==='override-ai'){window.CandidacyRuns.openReport(currentCandidate())}
    else if(action==='send-offer')openModal('Отправить оффер','PDF уже согласован; выберите канал отправки',`<div class="form-grid"><label class="field">Редакция<select><option>Редакция 3 · согласована</option></select></label><label class="field">Канал<select><option>Email</option><option>Telegram</option><option>Скачать PDF без отправки</option></select></label><label class="field full">Сообщение<textarea>Здравствуйте! Направляем вам оффер нашей команды.</textarea></label></div>`,'Оффер отправлен',()=>{modal.close();showToast('Статус изменён: оффер отправлен')});
    else if(['notetaker','download-offer','req-history','req-use-old','calendar-nav','vacancy-open'].includes(action))openModal(a.textContent.trim()||'Действие','Продолжение рабочего сценария',`<div class="detail-block"><h3>Настройки и последствия</h3><p>Этот шаг использует данные текущего объекта, сохраняет автора и время действия. Автоматические исходящие действия не запускаются без настроенной политики.</p></div>`,'Продолжить');
    else if(action==='go-home')location.href='dashboard.html?public=cb7a70f4cca9';
  });
  document.addEventListener('mousedown',e=>{if(e.target.closest('.rich-toolbar button'))e.preventDefault()});
  document.addEventListener('change',e=>{if(e.target.dataset.taskCheck){const t=tasks.find(x=>x.id===Number(e.target.dataset.taskCheck));if(t){t.done=e.target.checked;renderTasks();showToast(t.done?'Задача завершена':'Задача переоткрыта')}}if(e.target.dataset.q){queryRows[Number(e.target.dataset.i)][e.target.dataset.q]=e.target.value}if(e.target.dataset.searchSource){searchSources[e.target.dataset.searchSource]=e.target.checked}if(e.target.dataset.aiFunnelSelect!==undefined){selectedVacancyAiFunnel=e.target.value;$('#modal-body').innerHTML=vacancyAiSettingsBody();showToast(`Выбрана воронка «${VACANCY_AI_FUNNELS[selectedVacancyAiFunnel].name}»`)}});
  document.addEventListener('input',e=>{if(e.target.dataset.q)queryRows[Number(e.target.dataset.i)][e.target.dataset.q]=e.target.value;if(e.target.dataset.profileFilter){const selector=e.target.dataset.profileFilter==='tags'?'[data-tag-option]':'[data-vacancy-option]',query=e.target.value.trim().toLowerCase(),key=e.target.dataset.profileFilter==='tags'?'tagOption':'vacancyOption';document.querySelectorAll(selector).forEach(item=>item.hidden=!item.dataset[key].includes(query))}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-close-modal]')){const repaint=modal.dataset.rerenderEditor==='true'&&location.hash.endsWith('/edit');modal.close();if(repaint)renderVacancyEditor68(activeVacancyId)}if(e.target.closest('[data-confirm-modal]')){const done=modalDone;done()}if(e.target.closest('[data-close-drawer]'))drawer.hidden=true;if(e.target.closest('[data-close-ai]'))ai.hidden=true;if(!stagePanel.hidden&&!e.target.closest('[data-stage-panel]')&&!e.target.closest('[data-action="move-candidate"]'))closeStagePanel()});
  document.addEventListener('keydown',e=>{
    const picker=e.target.closest('.ve68-funnel-dropdown'),menu=picker?.querySelector('.ve68-funnel-options');
    if(picker&&menu){
      if(e.key==='Escape'&&!menu.hidden){e.preventDefault();e.stopPropagation();toggleVacancyFunnelMenu(false,true);return}
      if(e.key==='Tab'&&!menu.hidden){toggleVacancyFunnelMenu(false,true);return}
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
        e.preventDefault();const wasClosed=menu.hidden;if(wasClosed)toggleVacancyFunnelMenu(true);
        const options=Array.from(menu.querySelectorAll('[role="option"]')),current=options.indexOf(document.activeElement);
        const next=e.key==='Home'?0:e.key==='End'?options.length-1:wasClosed?Math.max(0,current):(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
        options[next]?.focus();return;
      }
    }
    if(e.key==='Escape'&&!stagePanel.hidden)closeStagePanel();
  });
  window.CreateMenu?.install(document,{navigate:routeTo});refreshCreatedSidebar();
  $('#ai-fab').addEventListener('click',()=>{ai.hidden=!ai.hidden;if(!ai.hidden)$('#ai-input').focus()});
  $('#ai-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#ai-input'),q=input.value.trim();if(!q)return;$('#ai-messages').insertAdjacentHTML('beforeend',`<div class="ai-message user">${esc(q)}</div><div class="ai-message"><b>Подготовил план изменения</b><p>Использую только доступные вам данные. Перед применением покажу затронутые объекты и не запущу письма или автоматизации.</p><div class="actions"><button class="btn" data-action="ai-cancel">Отмена</button><button class="btn primary" data-action="ai-apply">Применить</button></div></div>`);input.value='';$('#ai-messages').scrollTop=$('#ai-messages').scrollHeight});
  $('#ai-messages').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action==='ai-apply'){showToast('Изменение применено после подтверждения');ai.hidden=true}else if(b.dataset.action==='ai-cancel'){b.closest('.ai-message').remove()}else{$('#ai-input').value=b.textContent;$('#ai-input').focus()}});
  window.addEventListener('cr-repaint',()=>render());
  window.addEventListener('cr-focus',e=>{selectedStage=e.detail.stage;selectedCandidate=candidatesFor(activeVacancyId,selectedStage).findIndex(c=>c.id===e.detail.id);candidateTab='overview';render();});
  window.addEventListener('cr-toast',e=>showToast(e.detail));
  window.ATSPrototype={current:currentCandidate,stages:()=>stages,catalog:creationCatalog,register:registerVacancy,route:routeTo,candidateContext,seedProfiles,
    openVacancyAllocation,assignVacancy,
    assignCandidate:(id,process)=>window.CreationStore.assign(id,process,creationCatalog()),
    updateCandidateStage:(id,process)=>{const result=window.CreationStore.updateStage(id,process,creationCatalog());if(result?.ok)document.querySelector('#colleague-reference-frame')?.contentWindow?.dispatchEvent(new Event('colleague-context-refresh'));return result;},
    createVacancyFromRequest:(fields,requestId,metadata={})=>{
      if(!fields||typeof fields!=='object'||!/^REQ-\d+$/.test(requestId||''))return false;
      const existing=Object.entries(vacancies).find(([,v])=>v.sourceRequisition===requestId);
      if(existing){routeTo('vacancy/'+existing[0]);return true;}
      const text=key=>String(fields[key]??'').slice(0,12000);
      pendingVacancyRequest={id:requestId,approvedVersion:typeof metadata.approvedVersion==='string'?metadata.approvedVersion.slice(0,200):null,values:{name:text('title'),department:text('dept'),grade:text('grade'),positions:Number(fields.need)||1,priority:fields.pr==='Высокий'?1:fields.pr==='Низкий'?3:2,duties:text('duties'),requirements:text('reqs'),conditions:text('cond'),budget:[text('from'),text('to')].filter(Boolean).join(' — '),recruiterId:'',funnelId:''}};
      routeTo('create/vacancy');if(location.hash==='#create/vacancy')render();return true;
    }};
  window.addEventListener('hashchange',render);render();
  if(location.hash==='#create'){location.hash='search';const frame=document.querySelector('#search-reference-frame');const open=()=>{try{const doc=frame.contentDocument,trigger=doc.querySelector('.sd-side-create');if(trigger)window.CreateMenu.install(doc,{navigate:routeTo}).open(trigger);}catch{}};if(frame.contentDocument?.querySelector('.sd-side-create'))open();else frame.addEventListener('load',open,{once:true});}
})();
