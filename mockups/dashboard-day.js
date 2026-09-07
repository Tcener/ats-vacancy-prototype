/* Личный план дня в адаптации Собессо. Фиксированное демо-время: 03.09.2026, 11:05 МСК.
   Источник фирменных изображений: https://sobesso.ru/ (logo.png и favicon.ico). */
(() => {
  if (!document.body.classList.contains('portfolio-mode')) return;
  const esc=HF.esc;
  const today='2026-09-03', now=today+'T11:05';
  const tasks=[
    {id:'contact',title:'Связаться с Михаилом Петровым-Соколовым',context:'Senior Android-разработчик · кандидат',day:today,time:'11:00',description:'Уточнить готовность к финальному интервью и удобное время для разговора.'},
    {id:'portfolio',title:'Получить фидбек после портфолио',context:'Senior Product Designer · 3 интервьюера',day:today,time:'14:00',description:'Собрать обратную связь и обсудить с командой следующий этап.'},
    {id:'source',title:'Добавить 10 новых кандидатов',context:'Senior Android-разработчик · количественная',day:today,time:'18:00',progress:6,target:10,description:'Добавить подходящих кандидатов на вакансию. Прогресс определяется фактически добавленными кандидатами.'},
    {id:'review',title:'Разобрать ответы кандидатов',context:'Backend-разработчик Go · 8 ответов',day:today,time:'16:00',description:'Ответить на вопросы и согласовать следующие шаги.'},
    {id:'feedback',title:'Получить фидбек технического интервью',context:'Data Analyst · нанимающий менеджер',day:today,time:'09:30',description:'Связаться с интервьюером и получить обратную связь.'},
    {id:'update',title:'Обновить комментарий по поиску',context:'Руководитель клиентского сервиса · вакансия',day:'2026-09-02',time:'18:00',description:'Зафиксировать результат недели и договорённости с нанимающим менеджером.'},
    {id:'offer',title:'Отправить оффер кандидату',context:'Backend-разработчик Go · согласованный оффер',day:today,time:'17:00',description:'Использовать согласованную PDF-редакцию. Завершение задачи не отправляет письмо автоматически.'},
    {id:'interviews',title:'Назначить 4 технических интервью',context:'Senior Android-разработчик · количественная',day:'2026-09-04',time:'18:00',progress:2,target:4,description:'Прогресс считается по фактически назначенным интервью.'}
  ];
  const meetings=[
    {id:'hr',time:'11:30',end:'12:15',title:'HR-интервью',person:'Алина Воронцова',vacancy:'Senior Android-разработчик',service:'Яндекс Телемост',people:'Елена Крылова, Алина Воронцова'},
    {id:'portfolio',time:'13:00',end:'14:00',title:'Разбор портфолио',person:'Дмитрий Назаров',vacancy:'Senior Product Designer',service:'Контур Толк',people:'Елена Крылова, Анна Фёдорова, Дмитрий Назаров'},
    {id:'technical',time:'14:30',end:'15:30',title:'Техническое интервью',person:'Виктория Чен',vacancy:'Backend-разработчик Go',service:'Яндекс Телемост',people:'Елена Крылова, Сергей Волков, Виктория Чен'},
    {id:'final',time:'16:00',end:'16:45',title:'Финальное интервью',person:'Михаил Петров-Соколов',vacancy:'Senior Android-разработчик',service:'Контур Толк',people:'Елена Крылова, Андрей Ковалёв, Михаил Петров-Соколов'},
    {id:'analyst',time:'17:00',end:'17:45',title:'HR-интервью',person:'Мария Белова',vacancy:'Data Analyst',service:'Яндекс Телемост',people:'Елена Крылова, Мария Белова'}
  ];
  let completed=new Set(), collapsed=false, taskFilter='today', mode='', selectedId='', trigger;
  try{const s=JSON.parse(localStorage.getItem('sobesso-day-v1'));if(s){completed=new Set(Array.isArray(s.completed)?s.completed.filter(id=>tasks.some(t=>t.id===id&&!t.target)):[]);collapsed=s.collapsed===true;}}catch(_){}
  const save=()=>{try{localStorage.setItem('sobesso-day-v1',JSON.stringify({completed:[...completed],collapsed}));}catch(_){}};
  const late=t=>!completed.has(t.id)&&t.day+'T'+t.time<now;
  const due=t=>(t.day===today?'сегодня':t.day>today?'завтра':'вчера')+', '+t.time;
  const pending=()=>tasks.filter(t=>t.day<=today&&!completed.has(t.id));
  const taskRow=t=>`<div class="sb-task-row ${completed.has(t.id)?'is-done':''}"><input type="checkbox" data-complete="${t.id}" aria-label="Завершить: ${esc(t.title)}" ${completed.has(t.id)?'checked':''} ${t.target?'disabled title="Завершится автоматически при достижении цели"':''}><button class="sb-task-open" data-task="${t.id}"><b>${esc(t.title)}</b><small>${esc(t.context)}</small></button><div class="sb-task-when"><span class="${late(t)?'is-late':''}">${due(t)}</span>${t.target?`<button class="sb-task-progress" data-task="${t.id}">${t.progress} из ${t.target}</button>`:''}</div></div>`;
  const meetingRow=m=>`<button class="sb-meeting-row" data-meeting="${m.id}"><span class="sb-meeting-time">${m.time}<small>${m.end}</small></span><span><b>${m.title} · ${esc(m.person)}</b><small>${esc(m.vacancy)} · ${m.service}</small></span><span class="sb-meeting-arrow" aria-hidden="true">›</span></button>`;
  const brand=()=>{
    const logo=document.querySelector('.hf-logo');if(!logo)return;
    logo.setAttribute('aria-label','Собессо — главная');logo.setAttribute('href','dashboard.html');
    const img=logo.querySelector('img');if(img){if(!img.src.endsWith('/assets/logo-sobesso.png'))img.src='assets/logo-sobesso.png';img.alt='Собессо';}
  };
  const navigation=()=>{
    const nav=document.querySelector('.hf-nav');if(!nav||nav.dataset.sobessoNav)return;
    nav.dataset.sobessoNav='true';
    nav.innerHTML=`
      <li><a class="hf-nav-link is-active" href="dashboard.html">${HF.icon('home-20')}<span class="hf-nav-title">Главная</span></a></li>
      <li><a class="hf-nav-link" href="ats-product.html#search">${HF.icon('search-20')}<span class="hf-nav-title">Поиск</span></a></li>
      <li><a class="hf-nav-link" href="ats-product.html#tasks">${HF.icon('check')}<span class="hf-nav-title">Мои задачи</span><span class="hf-nav-count">7</span></a></li>
      <li><a class="hf-nav-link" href="ats-product.html#calendar">${HF.icon('calendar-20')}<span class="hf-nav-title">Календарь</span></a></li>
      <li><a class="hf-nav-link" href="ats-product.html#analytics">${HF.icon('graph-20')}<span class="hf-nav-title">Аналитика</span></a></li>
      <li><a class="hf-nav-link" href="ats-product.html#requisitions">${HF.icon('edit-2-20')}<span class="hf-nav-title">Заявки</span><span class="hf-nav-count">1</span></a></li>
      <li><a class="hf-nav-link" href="ats-product.html#settings">${HF.icon('settings')}<span class="hf-nav-title">Настройки</span></a></li>`;
    const requests=document.querySelector('.hf-requests,[data-od-id="requests-empty"]');
    if(requests){const after=requests.nextElementSibling;requests.remove();if(after?.classList.contains('hf-sidebar-divider'))after.remove();}
    document.querySelectorAll('.hf-vacancy-org').forEach(node=>node.remove());
    document.querySelectorAll('.hf-vacancy-link').forEach(node=>{const name=node.textContent.trim().toLowerCase();const id=name.includes('designer')?'designer':name.includes('data')||name==='analyst'?'analyst':name.includes('backend')?'backend':name.includes('ios')||name.includes('devops')?'ios':'android';node.href=`ats-product.html#vacancy/${id}`;});
    const hold=document.querySelector('a[href*="state=hold"]');
    const closed=document.querySelector('a[href*="state=closed"]');
    if(hold&&closed){
      const archive=document.createElement('div');archive.className='sb-archive';
      archive.innerHTML=`<a class="hf-nav-link" href="ats-product.html#portfolio">${HF.icon('archive-2-20')}<span class="hf-nav-title">Архив</span></a>`;
      hold.previousElementSibling?.insertAdjacentElement('afterend',archive);
      hold.remove();closed.remove();
    }
    const inner=document.querySelector('.hf-sidebar-inner');
    if(inner&&!inner.querySelector('.sb-side-brand'))inner.insertAdjacentHTML('afterbegin','<a class="sb-side-brand" href="dashboard.html" aria-label="Собессо — главная"><img src="assets/logo-sobesso.png" alt="Собессо"></a>');
  };
  const assistantButton=()=>{
    const sidebar=document.getElementById('hf-sidebar');
    if(!sidebar||sidebar.querySelector('[data-sb-ai-open]'))return;
    sidebar.insertAdjacentHTML('beforeend','<button class="sb-ai-fab" type="button" data-sb-ai-open aria-label="Открыть ИИ-агента">AI</button>');
  };
  const refreshShell=()=>{brand();navigation();assistantButton();};
  refreshShell();
  // Оболочка перерисовывает шапку при открытии поиска; фирменный знак не теряется.
  new MutationObserver(refreshShell).observe(document.getElementById('hf-header'),{childList:true,subtree:true});
  document.title='Главная — Собессо';
  const favicon=document.createElement('link');favicon.rel='icon';favicon.href='assets/mark-sobesso.ico';document.head.appendChild(favicon);
  const day=document.getElementById('sb-day');
  const renderDay=()=>{
    const active=pending(), overdue=active.filter(late).length;
    const preview=tasks.filter(t=>['contact','portfolio','source'].includes(t.id));
    document.getElementById('sb-day-summary').innerHTML=`<div class="sb-day-summary"><button class="sb-counter" data-open-tasks><span>Задачи сегодня</span><strong>${active.length}</strong><small class="${overdue?'is-late':''}">${overdue?overdue+' просрочены':'Без просрочек'} <span aria-hidden="true">↗</span></small></button><button class="sb-counter" data-open-meetings><span>Встречи сегодня</span><strong>${meetings.length}</strong><small>ближайшая ${meetings[0].time} <span aria-hidden="true">↗</span></small></button></div>`;
    day.innerHTML=`<div class="sb-day-controls"><button class="sb-day-toggle" id="sb-day-toggle" aria-expanded="${!collapsed}" aria-controls="sb-day-details">${collapsed?'Показать план дня':'Свернуть план дня'} <span aria-hidden="true">${collapsed?'⌄':'⌃'}</span></button></div><div class="sb-day-details" id="sb-day-details" ${collapsed?'hidden':''}><section class="sb-plan"><header><h2>План дня <small>${active.length} к выполнению</small></h2><button class="sb-text-btn" data-open-tasks>Все мои задачи →</button></header><div>${preview.map(taskRow).join('')}</div></section><section class="sb-meetings"><header><h2>Ближайшие встречи</h2><button class="sb-text-btn" data-open-meetings>Все ${meetings.length} →</button></header>${meetings.slice(0,3).map(meetingRow).join('')}</section></div>`;
    document.getElementById('sb-day-toggle').addEventListener('click',()=>{collapsed=!collapsed;save();renderDay();document.getElementById('sb-day-toggle').focus();});
  };
  const dialog=document.createElement('dialog');dialog.className='sb-work-dialog';dialog.setAttribute('aria-labelledby','sb-work-title');document.body.appendChild(dialog);
  const aiDialog=document.createElement('dialog');aiDialog.className='sb-ai-dialog';aiDialog.setAttribute('aria-labelledby','sb-ai-title');document.body.appendChild(aiDialog);
  let aiQuery='';
  const renderAi=(state='start')=>{
    const request=aiQuery?`<div class="sb-ai-message is-user">${esc(aiQuery)}</div>`:'';
    const answer=state==='plan'?`<div class="sb-ai-message"><b>Подготовил изменение</b><p>Покажу в таблице только вакансии с риском нарушения SLA. Остальные настройки не изменятся.</p><div class="sb-ai-plan"><span>Фильтр «Статус»</span><del>Все статусы</del><strong>Просрочен SLA</strong></div><div class="sb-ai-actions"><button class="vp-btn" data-ai-cancel>Отмена</button><button class="vp-btn primary" data-ai-apply>Применить</button></div></div>`:state==='done'?`<div class="sb-ai-message"><b>Готово</b><p>Фильтр применён. В таблице остались вакансии с просроченным SLA.</p></div>`:`<div class="sb-ai-message"><b>Чем помочь на этой странице?</b><p>Могу найти нужные данные, объяснить показатели или подготовить изменение. Перед изменением обязательно покажу, что именно произойдёт.</p></div><div class="sb-ai-suggestions"><button data-ai-suggest="Покажи вакансии с риском SLA">Покажи вакансии с риском SLA</button><button data-ai-suggest="Настрой столбцы таблицы">Настрой столбцы таблицы</button><button data-ai-suggest="Что у меня сегодня?">Что у меня сегодня?</button></div>`;
    aiDialog.innerHTML=`<header><div><span id="sb-ai-title">ИИ-агент Собессо</span><small>Контекст: Главная</small></div><button class="vp-btn" data-ai-close aria-label="Закрыть ИИ-агента">×</button></header><div class="sb-ai-conversation">${request}${answer}</div><form class="sb-ai-compose" data-ai-compose><input aria-label="Новое сообщение ИИ-агенту" placeholder="Напишите, что нужно сделать"><button type="submit" aria-label="Отправить">↑</button></form>`;
  };
  const openAi=(query='')=>{aiQuery=query;renderAi(query?'plan':'start');if(!aiDialog.open)aiDialog.showModal();setTimeout(()=>aiDialog.querySelector('.sb-ai-compose input')?.focus(),0);};
  const renderDialog=()=>{
    let title='',content='';
    if(mode==='tasks'){
      title='Мои задачи';
      const list=tasks.filter(t=>taskFilter==='done'?completed.has(t.id):!completed.has(t.id)&&(taskFilter==='late'?late(t):taskFilter==='future'?t.day>today:t.day<=today));
      content=`<div class="sb-work-tabs">${[['today','Сегодня'],['late','Просрочено'],['future','Предстоящие'],['done','Завершённые']].map(([key,label])=>`<button data-task-filter="${key}" class="${taskFilter===key?'active':''}" aria-pressed="${taskFilter===key}">${label}</button>`).join('')}</div><div class="sb-work-list">${list.length?list.map(taskRow).join(''):'<p class="sb-work-empty">Здесь пока нет задач.</p>'}</div>`;
    }else if(mode==='meetings'){
      title='Встречи сегодня';content=`<p class="sb-work-note">3 сентября · московское время · 5 запланированных интервью</p><div class="sb-work-list">${meetings.map(meetingRow).join('')}</div><div class="sb-work-actions"><a class="vp-btn" href="calendar.html">Открыть календарь</a></div>`;
    }else if(mode==='task'){
      const t=tasks.find(x=>x.id===selectedId);title=t.title;
      content=`<div class="sb-work-detail"><p class="vp-sub">${esc(t.context)}</p><dl><dt>Ответственный</dt><dd>Елена Крылова</dd><dt>Срок</dt><dd class="${late(t)?'is-late':''}">${due(t)} · МСК</dd><dt>Состояние</dt><dd>${completed.has(t.id)?'Завершена':'Открыта'}</dd></dl><p>${esc(t.description)}</p>${t.target?`<div class="sb-goal"><b>Выполнено ${t.progress} из ${t.target}</b><progress value="${t.progress}" max="${t.target}"></progress><small>Завершение автоматически при достижении цели. Досрочное завершение требует отдельного права и причины.</small></div>`:`<button class="vp-btn primary" data-toggle-task="${t.id}">${completed.has(t.id)?'Переоткрыть задачу':'Завершить задачу'}</button>`}<button class="sb-text-btn" data-open-tasks>← К моим задачам</button></div>`;
    }else{
      const m=meetings.find(x=>x.id===selectedId);title=m.title;
      content=`<div class="sb-work-detail"><h3>${esc(m.person)}</h3><p class="vp-sub">${esc(m.vacancy)}</p><dl><dt>Когда</dt><dd>3 сентября, ${m.time}–${m.end} · МСК</dd><dt>Видеосвязь</dt><dd>${m.service}</dd><dt>Участники</dt><dd>${esc(m.people)}</dd><dt>Состояние</dt><dd>Запланирована</dd></dl><p class="sb-work-note">Демонстрационная встреча. Реальные приглашения не отправляются, видеозвонок не запускается.</p><a class="vp-btn" href="calendar.html">Открыть календарь</a><button class="sb-text-btn" data-open-meetings>← Ко всем встречам</button></div>`;
    }
    dialog.innerHTML=`<header><h2 id="sb-work-title">${esc(title)}</h2><button class="vp-btn" data-close-work aria-label="Закрыть окно">×</button></header>${content}`;
  };
  const open=(next,id,e)=>{mode=next;selectedId=id||'';if(!dialog.open)trigger=e?.target?.closest('button');renderDialog();if(!dialog.open)dialog.showModal();};
  const toggle=id=>{const t=tasks.find(t=>t.id===id);if(!t||t.target)return;if(completed.has(id))completed.delete(id);else completed.add(id);save();renderDay();if(dialog.open)renderDialog();document.getElementById('sb-day-live').textContent=completed.has(id)?'Задача завершена. Счётчики обновлены.':'Задача переоткрыта. Счётчики обновлены.';};
  const handle=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-close-work')){dialog.close();return;}
    if(b.hasAttribute('data-open-tasks')){taskFilter='today';open('tasks','',e);}
    else if(b.hasAttribute('data-open-meetings'))open('meetings','',e);
    else if(b.dataset.task)open('task',b.dataset.task,e);
    else if(b.dataset.meeting)open('meeting',b.dataset.meeting,e);
    else if(b.dataset.taskFilter){taskFilter=b.dataset.taskFilter;renderDialog();dialog.querySelector(`[data-task-filter="${taskFilter}"]`)?.focus();}
    else if(b.dataset.toggleTask)toggle(b.dataset.toggleTask);
  };
  [day,dialog].forEach(node=>{node.addEventListener('click',handle);node.addEventListener('change',e=>{if(e.target.dataset.complete)toggle(e.target.dataset.complete);});});
  document.getElementById('hf-sidebar').addEventListener('click',e=>{
    if(e.target.closest('[data-sb-nav-tasks]')){taskFilter='today';open('tasks','',e);}
    else if(e.target.closest('[data-sb-ai-open]'))openAi();
    else if(e.target.closest('[data-sb-archive]')){const button=e.target.closest('[data-sb-archive]'),links=button.nextElementSibling,open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));links.hidden=!open;}
  });
  aiDialog.addEventListener('click',e=>{
    if(e.target.closest('[data-ai-close]'))aiDialog.close();
    const suggest=e.target.closest('[data-ai-suggest]');if(suggest){aiQuery=suggest.dataset.aiSuggest;renderAi('plan');}
    if(e.target.closest('[data-ai-cancel]')){aiQuery='';renderAi('start');}
    if(e.target.closest('[data-ai-apply]')){const status=document.getElementById('vp-status');if(status){status.value='risk';status.dispatchEvent(new Event('change',{bubbles:true}));}renderAi('done');}
  });
  aiDialog.addEventListener('submit',e=>{const form=e.target.closest('[data-ai-compose]');if(!form)return;e.preventDefault();const input=form.querySelector('input');if(!input.value.trim())return;aiQuery=input.value.trim();renderAi('plan');});
  dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus();else document.querySelector('[data-open-tasks]')?.focus();});
  const live=document.createElement('div');live.id='sb-day-live';live.className='sb-sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
  renderDay();
  const initialView=new URLSearchParams(location.hash.slice(1)).get('m');
  if(initialView==='tasks'||initialView==='meetings')open(initialView);
})();
