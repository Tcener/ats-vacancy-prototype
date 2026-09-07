/* Адаптация по пользовательскому запросу. Все данные вымышленные.
   Оригинал референса: dashboard.html#view=reference. */
(() => {
  const referenceMode = new URLSearchParams(location.hash.slice(1)).get('view') === 'reference';
  addEventListener('hashchange', () => {
    if ((new URLSearchParams(location.hash.slice(1)).get('view') === 'reference') !== referenceMode) location.reload();
  });
  if (referenceMode) return;
  const esc = HF.esc;
  const icon = name => `<svg width="18" height="18" fill="currentColor" aria-hidden="true"><use href="#${name}"></use></svg>`;
  const vacancies = [
    ['android','Senior Android-разработчик','Елена Крылова','work',78,'Senior',2,'Mobile',1,8,'2026-08-12','2026-09-11',90,'Москва'],
    ['designer','Senior Product Designer','Антон Беляев','work',62,'Senior',1,'Core Product',2,19,'2026-08-18','2026-09-22',100,'Удалённо'],
    ['analyst','Data Analyst','Мария Фролова','work',34,'Middle',1,'BI',2,-2,'2026-07-20','2026-09-01',34,'Москва'],
    ['service','Руководитель клиентского сервиса','Елена Крылова','work',49,'Lead',1,'Operations',1,5,'2026-08-01','2026-09-08',42,'Москва'],
    ['ios','Senior iOS-разработчик','','distribution',0,'Senior',2,'Mobile',1,null,null,null,0,'Удалённо'],
    ['go','Backend-разработчик Go','Ирина Лебедева','work',71,'Senior',3,'Platform',1,12,'2026-08-22','2026-09-15',57,'Санкт-Петербург'],
    ['marketing','Product Marketing Manager','Антон Беляев','hold',46,'Middle+',1,'Marketing',2,null,'2026-08-10',null,28,'Гибрид'],
    ['research','UX Researcher','Мария Фролова','work',23,'Middle',1,'Core Product',3,31,'2026-08-28','2026-10-04',18,'Удалённо']
  ].map(([id,name,recruiter,status,progress,grade,positions,department,priority,sla,start,deadline,candidates,location])=>({id,name,recruiter,status,progress,grade,positions,department,priority,sla,start,deadline,candidates,location}));
  const statuses = {work:'В работе',hold:'На паузе',distribution:'На распределении'};
  const columns = [
    ['name','Вакансия',310],['recruiter','Рекрутер',182],['status','Статус',170],['priority','Приоритет',115],
    ['progress','Прогноз закрытия',170],['grade','Грейд',105],['positions','Ставки',90],['department','Департамент',145],
    ['sla','SLA',140],['start','Начало поиска',145],['deadline','Закрыть до',145],['candidates','Кандидатов',120],['location','Локация',160]
  ].map(([id,label,width])=>({id,label,width}));
  const defaults = () => ({schema:2,order:columns.map(c=>c.id),visible:columns.slice(0,9).map(c=>c.id),sort:null,direction:1});
  let prefs=defaults(), draft, opener;
  try {
    const saved=JSON.parse(localStorage.getItem('hf-vacancy-portfolio-v1'));
    if(saved){
      const valid=id=>columns.some(c=>c.id===id);
      const order=[...new Set((Array.isArray(saved.order)?saved.order:[]).filter(valid))];
      prefs={...prefs,order:['name',...order.filter(id=>id!=='name'),...columns.map(c=>c.id).filter(id=>id!=='name'&&!order.includes(id))],visible:[...new Set(['name',...(Array.isArray(saved.visible)?saved.visible:[]).filter(valid)])],sort:valid(saved.sort)?saved.sort:null,direction:saved.direction===-1?-1:1};
      // Однократно переносим приоритет, сохраняя остальные настройки пользователя.
      if(saved.schema!==2){prefs.order=prefs.order.filter(id=>id!=='priority');prefs.order.splice(prefs.order.indexOf('status')+1,0,'priority');}
    }
  } catch(_) {}
  const filters={query:'',recruiter:'',department:'',status:''};
  const save=()=>{try{localStorage.setItem('hf-vacancy-portfolio-v1',JSON.stringify(prefs));}catch(_){}};
  save();
  const date=value=>value?new Date(value+'T12:00:00').toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}):'—';
  const cell=(r,id)=>{
    if(id==='name')return `<a class="vp-name" href="vacancy.html">${esc(r.name)}</a><span class="vp-sub">${r.start?'Поиск с '+date(r.start):'Поиск ещё не начат'}</span>`;
    if(id==='status')return `<span class="vp-status ${r.status}">${statuses[r.status]}</span>${r.sla<0?'<span class="vp-risk">Просрочен SLA</span>':''}`;
    if(id==='progress')return `<div title="Демонстрационный индикатор прогресса воронки, не вероятность найма"><div class="vp-progress"><i style="width:${r.progress}%"></i></div><span class="vp-sub vp-number">${r.progress}%</span></div>`;
    if(id==='sla')return r.status==='hold'?'<span class="vp-sub">Заморожен</span>':r.sla===null?'<span class="vp-sub">Не начат</span>':`<span class="${r.sla<0?'vp-risk':'vp-number'}">${r.sla<0?'−'+Math.abs(r.sla)+' дн.':r.sla+' дн.'}</span><span class="vp-sub">${r.sla<0?'просрочено':'до '+date(r.deadline)}</span>`;
    if(id==='start'||id==='deadline')return date(r[id]);
    return esc(String(r[id] === '' ? '—' : (r[id] ?? '—')));
  };
  const options=(key,label)=>`<option value="">${label}</option>${[...new Set(vacancies.map(r=>r[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}`;
  const getRows=()=>{
    const rows=vacancies.filter(r=>(!filters.query||(r.name+' '+r.recruiter+' '+r.department).toLowerCase().includes(filters.query.toLowerCase()))&&(!filters.recruiter||(filters.recruiter==='unassigned'?!r.recruiter:r.recruiter===filters.recruiter))&&(!filters.department||r.department===filters.department)&&(!filters.status||(filters.status==='risk'?r.sla!==null&&r.sla<0:r.status===filters.status)));
    if(prefs.sort)rows.sort((a,b)=>{
      let x=a[prefs.sort],y=b[prefs.sort];
      if(x===null||x==='')return y===null||y===''?0:1;
      if(y===null||y==='')return -1;
      if(prefs.sort==='status'){x=statuses[x];y=statuses[y];}
      if(prefs.sort==='grade'){const ranks=['Junior','Middle','Middle+','Senior','Lead'];x=ranks.indexOf(x);y=ranks.indexOf(y);}
      return (typeof x==='number'?x-y:String(x).localeCompare(String(y),'ru',{numeric:true}))*prefs.direction;
    });
    return rows;
  };
  document.body.classList.add('portfolio-mode');
  HF.mount({active:'applicants'});
  // Воронка относится к кандидатам, не к обзору дня. В референсном режиме она сохранена.
  document.querySelector('.hf-tabflow').remove();
  document.getElementById('dashboard-screen').innerHTML=`
    <div class="vp-heading"><div class="vp-heading-title"><div class="kd-head"><h1 class="kd-title">Главная</h1></div><p>Понедельник, 07.09.2026</p></div><div id="sb-day-summary"></div></div>
    <section id="sb-day" aria-label="Мой рабочий день"></section>
    <div class="vp-portfolio-heading"><h2>Вакансии команды</h2><button class="vp-btn" id="vp-columns">${icon('options-2-24')}Столбцы</button></div>
    <div class="vp-filters" aria-label="Фильтры вакансий"><input id="vp-query" placeholder="Найти вакансию…" aria-label="Найти вакансию"><select id="vp-recruiter" aria-label="Рекрутер">${options('recruiter','Все рекрутеры')}<option value="unassigned">Не назначен</option></select><select id="vp-department" aria-label="Департамент">${options('department','Все департаменты')}</select><select id="vp-status" aria-label="Статус вакансии"><option value="">Все статусы</option>${Object.entries(statuses).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}<option value="risk">Просрочен SLA</option></select><button class="vp-btn" id="vp-reset" hidden>Сбросить фильтры</button></div>
    <div class="vp-meta"><span id="vp-count" role="status" aria-live="polite"></span><span id="vp-sort-note"></span></div><div class="vp-table-wrap" tabindex="0" aria-label="Таблица вакансий, прокручивается по горизонтали"><table class="vp-table" id="vp-table" aria-label="Вакансии команды"></table></div><div class="vp-foot"><span>Демонстрационные данные · 3 сентября 2026</span><a href="dashboard.html#view=reference" id="vp-reference">Оригинал Хантфлоу ↗</a></div>`;
  const renderTable=()=>{
    const shown=prefs.order.filter(id=>prefs.visible.includes(id)).map(id=>columns.find(c=>c.id===id));
    const rows=getRows();
    const table=document.getElementById('vp-table');
    table.style.minWidth=shown.reduce((sum,c)=>sum+c.width,0)+'px';
    table.innerHTML=`<colgroup>${shown.map(c=>`<col style="width:${c.width}px">`).join('')}</colgroup><thead><tr>${shown.map(c=>`<th scope="col" aria-sort="${prefs.sort===c.id?(prefs.direction===1?'ascending':'descending'):'none'}"><button class="vp-sort" data-sort="${c.id}" title="Сортировать: ${c.label}">${c.label}<span aria-hidden="true">${prefs.sort===c.id?(prefs.direction===1?'↑':'↓'):'↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr data-vacancy="${r.id}">${shown.map(c=>`<td>${cell(r,c.id)}</td>`).join('')}</tr>`).join(''):`<tr><td class="vp-empty" colspan="${shown.length}">Вакансии не найдены.<br>Попробуйте изменить запрос или сбросить фильтры.</td></tr>`}</tbody>`;
    document.getElementById('vp-count').textContent=`${rows.length} из ${vacancies.length} вакансий · ${rows.reduce((s,r)=>s+r.positions,0)} ставок`;
    document.getElementById('vp-sort-note').textContent=prefs.sort?`${columns.find(c=>c.id===prefs.sort).label}: ${prefs.direction===1?'по возрастанию':'по убыванию'}`:'Нажмите на заголовок, чтобы отсортировать';
    document.getElementById('vp-reset').hidden=!Object.values(filters).some(Boolean);
  };
  const dialog=document.createElement('dialog');
  dialog.className='vp-dialog';dialog.id='vp-column-dialog';dialog.setAttribute('aria-labelledby','vp-dialog-title');
  dialog.innerHTML=`<header><h2 id="vp-dialog-title">Столбцы таблицы</h2><button class="vp-btn" id="vp-close" aria-label="Закрыть настройки столбцов">×</button></header><p>Выберите поля и расположите их в удобном порядке. Название вакансии всегда закреплено слева.</p><input class="vp-column-search" id="vp-column-search" placeholder="Найти столбец…" aria-label="Найти столбец"><div class="vp-column-list" id="vp-column-list"></div><footer><button class="vp-btn" id="vp-defaults">По умолчанию</button><div><button class="vp-btn" id="vp-cancel">Отмена</button><button class="vp-btn primary" id="vp-apply">Применить</button></div></footer>`;
  document.body.appendChild(dialog);
  const renderColumns=()=>{
    const q=document.getElementById('vp-column-search').value.toLowerCase();
    document.getElementById('vp-column-list').innerHTML=draft.order.map((id,i)=>{const c=columns.find(c=>c.id===id);return `<div class="vp-column-row" ${c.label.toLowerCase().includes(q)?'':'hidden'}><label><input type="checkbox" data-column="${id}" ${draft.visible.includes(id)?'checked':''} ${id==='name'?'disabled':''}>${c.label}${id==='name'?'<small>закреплён</small>':''}</label><button class="vp-btn" data-up="${id}" aria-label="Выше: ${c.label}" ${i<2?'disabled':''}>↑</button><button class="vp-btn" data-down="${id}" aria-label="Ниже: ${c.label}" ${i===0||i===draft.order.length-1?'disabled':''}>↓</button></div>`;}).join('');
  };
  const openColumns=e=>{opener=e?.currentTarget||document.getElementById('vp-columns');draft={order:[...prefs.order],visible:[...prefs.visible]};document.getElementById('vp-column-search').value='';renderColumns();dialog.showModal();};
  document.getElementById('vp-columns').addEventListener('click',openColumns);
  ['vp-close','vp-cancel'].forEach(id=>document.getElementById(id).addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('close',()=>opener?.focus());
  document.getElementById('vp-column-search').addEventListener('input',renderColumns);
  dialog.addEventListener('change',e=>{const id=e.target.dataset.column;if(!id)return;draft.visible=e.target.checked?[...new Set([...draft.visible,id])]:draft.visible.filter(x=>x!==id);});
  dialog.addEventListener('click',e=>{const button=e.target.closest('[data-up],[data-down]');if(!button)return;const id=button.dataset.up||button.dataset.down;const index=draft.order.indexOf(id);const next=index+(button.dataset.up?-1:1);if(index<1||next<1||next>=draft.order.length)return;[draft.order[index],draft.order[next]]=[draft.order[next],draft.order[index]];renderColumns();dialog.querySelector(`[${button.dataset.up?'data-up':'data-down'}="${id}"]`)?.focus();});
  document.getElementById('vp-defaults').addEventListener('click',()=>{draft=defaults();renderColumns();});
  document.getElementById('vp-apply').addEventListener('click',()=>{prefs.order=draft.order;prefs.visible=draft.visible;if(!prefs.visible.includes(prefs.sort))prefs.sort=null;save();renderTable();dialog.close();});
  document.getElementById('vp-table').addEventListener('click',e=>{const button=e.target.closest('[data-sort]');if(!button)return;const id=button.dataset.sort;prefs.direction=prefs.sort===id?-prefs.direction:1;prefs.sort=id;save();renderTable();document.querySelector(`[data-sort="${id}"]`)?.focus();});
  document.getElementById('vp-query').addEventListener('input',e=>{filters.query=e.target.value;renderTable();});
  ['recruiter','department','status'].forEach(key=>document.getElementById('vp-'+key).addEventListener('change',e=>{filters[key]=e.target.value;renderTable();}));
  document.getElementById('vp-reset').addEventListener('click',()=>{Object.keys(filters).forEach(k=>filters[k]='');['query','recruiter','department','status'].forEach(k=>document.getElementById('vp-'+k).value='');renderTable();});
  document.getElementById('vp-reference').addEventListener('click',e=>{e.preventDefault();location.hash='view=reference';location.reload();});
  renderTable();
  if(new URLSearchParams(location.hash.slice(1)).get('m')==='columns')openColumns();
})();
