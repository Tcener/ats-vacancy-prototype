/* Перенос наблюдаемых взаимодействий Dev Собесо. Всё выполняется локально
   над вымышленной базой: нет запросов к Собесо, отправок и изменения ATS. */
(() => {
  'use strict';
  const M = window.SearchDevModel;
  if (!M) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const entries = values => (values || []).map(item => Array.isArray(item) ? {id:item[0],label:item[1]} : typeof item === 'string' ? {id:item,label:item} : item);
  const C = Object.fromEntries(Object.entries(M.catalogs || {}).map(([key,value]) => [key,entries(value)]));
  const tags = entries(M.tags), vacancies = M.vacancies || [];
  const storageKey = 'sobesso-search-demo-v1';
  const emptyResult = kind => ({started:false,resultKind:kind,page:1,aiResults:[],autoSummary:null});
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const defaults = () => ({...M.defaultState(), mode:'base', started:false, aiPrompt:'', aiCriteria:[], resultKind:'base', savedSearches:[], assignments:[], aiResults:[], autoSummary:null, autoHistory:[], autoHistoryId:'', modeResults:{base:emptyResult('base'),ai:emptyResult('ai')}, collapsed:false,sidebarWidth:276,dailyDate:today,usedToday:0});
  let state = defaults();
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (stored && stored.version === 1 && stored.state) state = {...defaults(), ...stored.state, ...M.restoreSnapshot({version:1,state:stored.state})};
  } catch (_) { /* Блокировка хранилища не мешает проверять макет. */ }
  if (!Array.isArray(state.savedSearches)) state.savedSearches = [];
  if (!Array.isArray(state.assignments)) state.assignments = [];
  if (!Array.isArray(state.autoHistory)) state.autoHistory = [];
  if (!state.modeResults || typeof state.modeResults !== 'object') state.modeResults = {base:emptyResult('base'),ai:emptyResult('ai')};
  if (state.dailyDate !== today) {state.dailyDate = today;state.usedToday = 0;}
  state.usedToday = Math.max(0,Math.min(1000,Number(state.usedToday) || 0));
  for (const history of state.autoHistory) if (history.status === 'идёт') {history.status = 'остановлена'; if (history.summary) history.summary.stopReason = 'cancelled';}
  const restoredHistory = state.autoHistory.find(item => item.id === state.autoHistoryId);
  if (restoredHistory?.summary && state.resultKind === 'auto' && !state.autoSummary) state.autoSummary = clone(restoredHistory.summary);
  if (restoredHistory?.summary && state.modeResults.ai?.resultKind === 'auto' && !state.modeResults.ai.autoSummary) state.modeResults.ai.autoSummary = clone(restoredHistory.summary);
  if (!Array.isArray(state.queries) || !state.queries.length) state.queries = [M.defaultQuery()];
  let localCandidates = clone(M.candidates || []);
  for (const assignment of state.assignments) {
    const candidate = localCandidates.find(item => item.id === assignment.candidateId);
    if (candidate && !candidate.processes.some(process => process.vacancyId === assignment.vacancyId)) candidate.processes.push({vacancyId:assignment.vacancyId,title:assignment.vacancyTitle,stage:assignment.stage});
  }
  let overlay = null, returnFocus = null, toastTimer, runTimer, searchRun = null, resizeStart = null;
  const workspace = $('#sd-workspace'), results = $('#sd-results'), dialog = $('#sd-dialog');
  const stashResult = () => {state.modeResults[state.mode] = clone({started:state.started,resultKind:state.resultKind,page:state.page,aiResults:state.aiResults,autoSummary:state.autoSummary});};
  const persist = () => {stashResult(); try { sessionStorage.setItem(storageKey, JSON.stringify({version:1,state})); } catch (_) {} };
  function switchMode(mode) {stashResult(); state.mode = mode; Object.assign(state,state.modeResults[mode] || emptyResult(mode === 'ai' ? 'ai' : 'base')); renderModes(); mode === 'ai' ? renderAi() : renderBase(); renderResults(); persist();}
  const labelFor = (catalog, id) => (C[catalog] || []).find(item => item.id === id)?.label || id;
  const tagLabel = id => tags.find(item => item.id === id)?.label || id;
  const plural = (number, forms) => forms[Math.abs(number)%100 >= 11 && Math.abs(number)%100 <= 14 ? 2 : Math.abs(number)%10 === 1 ? 0 : Math.abs(number)%10 >= 2 && Math.abs(number)%10 <= 4 ? 1 : 2];
  const dateLabel = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('ru-RU') : 'не указано';
  const svg = name => {
    const paths = {search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',home:'<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3z"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 6-6"/>',calendar:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 2v6M16 2v6M4 11h16"/>',chart:'<path d="M4 3v17h17M8 16V9M13 16V5M18 16v-5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m10 2-1 3-3 1-3 3 2 3-2 3 3 3 3 1 1 3h4l1-3 3-1 3-3-2-3 2-3-3-3-3-1-1-3z"/>',list:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/>',menu:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14m6-9 2 2-2 2"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',folder:'<path d="M3 6h7l2 3h9v11H3z"/>'};
    paths.messages = '<path d="M3 4h15v11H8l-5 4z"/><path d="M8 19h10l3 3V9"/>';
    return `<svg class="sd-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.search}</svg>`;
  };
  const button = (text, action, classes = '', attrs = '') => `<button type="button" class="sd-button ${classes}" data-sd-action="${action}" ${attrs}>${text}</button>`;
  const options = (items, current, placeholder) => `${placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : ''}${entries(items).map(item => `<option value="${esc(item.id)}"${String(item.id) === String(current) ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}`;
  const select = (label, items, current, attrs = '', placeholder) => `<label class="sd-field"><span class="sd-label">${esc(label)}</span><select class="sd-select" aria-label="${esc(label)}" ${attrs}>${options(items,current,placeholder)}</select></label>`;
  const empty = (title, text) => `<div class="sd-empty"><div class="sd-empty-icon">${svg('search')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
  function toast(message) {
    const node = $('#sd-toast'); node.textContent = message; node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 4500);
  }
  const allowedRoute = route => /^(search|tasks|calendar|analytics|requisitions|settings|portfolio|create|vacancy\/(android|designer|analyst|backend|ios)(\/edit)?)$/.test(route);
  function navigate(route) {
    if (route === 'dashboard') {
      const url = new URL('dashboard.html?public=509f70c12929', location.href).href;
      if (window.parent !== window) window.parent.location.href = url; else location.href = url;
    } else if (allowedRoute(route)) {
      if (window.parent !== window) window.parent.location.hash = route;
      else location.href = `ats-product.html?public=b22ccdd19b77#${route}`;
    }
  }
  function renderSidebar() {
    const nav = [['dashboard','Главная','home'],['search','Поиск','search'],['tasks','Мои задачи','check'],['calendar','Календарь','calendar'],['analytics','Аналитика','chart'],['requisitions','Заявки','list'],['settings','Настройки','settings']];
    $('#sd-sidebar').innerHTML = `<div class="sd-brand"><a href="dashboard.html?public=509f70c12929" data-sd-route="dashboard" aria-label="Собесо — главная"><img src="assets/logo-sobesso.png?public=11fd3378f3b0" alt="Собесо"></a><button type="button" class="sd-collapse" data-sd-action="collapse" aria-label="${state.collapsed ? 'Развернуть меню' : 'Свернуть меню'}" aria-expanded="${!state.collapsed}">${svg('menu')}</button></div><nav class="sd-nav">${nav.map(([route,label,icon]) => `<a href="${route === 'dashboard' ? 'dashboard.html?public=509f70c12929' : `ats-product.html?public=b22ccdd19b77#${route}`}" data-sd-route="${route}" title="${esc(label)}"${route === 'search' ? ' aria-current="page"' : ''}>${svg(icon)}<span class="sd-nav-label">${esc(label)}</span>${route === 'tasks' ? '<span class="sd-nav-count">7</span>' : route === 'requisitions' ? '<span class="sd-nav-count">3</span>' : ''}</a>`).join('')}</nav><section class="sd-side-vacancies"><h2>${svg('folder')} Мои вакансии</h2>${vacancies.map(vacancy => `<a href="ats-product.html?public=b22ccdd19b77#vacancy/${esc(vacancy.id)}" data-sd-route="vacancy/${esc(vacancy.id)}">${esc(vacancy.title)}</a>`).join('')}<a class="sd-archive" href="ats-product.html?public=b22ccdd19b77#portfolio" data-sd-route="portfolio">Архив</a></section><div class="sd-side-bottom"><a class="sd-side-create" href="ats-product.html?public=b22ccdd19b77#create" data-sd-route="create"><span aria-hidden="true">+</span><span class="sd-create-label">Создать</span></a><div class="sd-side-footer"><span>Демонстрационный стенд</span><span>↪</span></div></div>`;
    $('#sd-shell').classList.toggle('sd-sidebar-collapsed', !!state.collapsed);
    $('#sd-shell').style.setProperty('--sd-sidebar-width',`${state.sidebarWidth || 276}px`);
    $('#sd-sidebar-resizer').setAttribute('aria-valuenow',String(state.sidebarWidth || 276));
    const message = document.createElement('button'); message.type = 'button'; message.className = 'sd-nav-shell-button'; message.dataset.sdAction = 'messages'; message.title = 'Сообщения';
    message.innerHTML = `${svg('messages')}<span class="sd-nav-label">Сообщения</span>`; $('.sd-nav',document).children[3].before(message);
    const assistant = document.createElement('button'); assistant.type = 'button'; assistant.className = 'sd-shell-assistant'; assistant.dataset.sdAction = 'assistant'; assistant.setAttribute('aria-label','Открыть ИИ-ассистента'); assistant.title = 'ИИ-ассистент';assistant.textContent = '✦';
    $('.sd-side-create',document).after(assistant);
  }
  function renderModes() {
    $('#sd-mode-tabs').innerHTML = `<button type="button" data-sd-action="mode-base" aria-pressed="${state.mode === 'base'}">Поиск по базе</button><button type="button" class="sd-ai-mode" data-sd-action="mode-ai" aria-pressed="${state.mode === 'ai'}">✦ ИИ-поиск</button><button type="button" data-sd-action="saved">Сохранённые поиски</button>`;
  }
  function queryRow(query, index) {
    return `<div class="sd-query-row" data-sd-row="${index}">${index ? `<select class="sd-select" aria-label="Связка строки ${index+1}" data-sd-query="join">${options(C.joins,query.join)}</select>` : ''}<input class="sd-input" aria-label="${index ? `Условие поиска ${index+1}` : 'Поисковый запрос'}" placeholder="${index ? 'Добавьте ещё одно условие' : 'Должность, навык, компания или текст из резюме'}" value="${esc(query.text)}" data-sd-query="text"><select class="sd-select" aria-label="Область поиска ${index+1}" data-sd-query="scope">${options(C.scopes,query.scope)}</select><select class="sd-select" aria-label="Условие строки ${index+1}" data-sd-query="condition">${options(C.conditions,query.condition)}</select>${index ? `<button type="button" class="sd-icon-button" data-sd-action="remove-query" data-index="${index}" aria-label="Удалить строку ${index+1}">×</button>` : button('Найти','search','primary')}</div>`;
  }
  function renderBase() {
    workspace.innerHTML = `<section class="sd-panel sd-search-builder" aria-label="Условия поиска">${state.queries.map(queryRow).join('')}${button('+ Добавить строку','add-query','text sd-query-add')}<div class="sd-filter-grid"><div class="sd-field"><span>Занятость</span><div class="sd-segment" aria-label="Занятость">${(C.employment || []).map(item => `<button type="button" data-sd-action="employment" data-value="${esc(item.id)}" aria-pressed="${state.employment === item.id}">${esc(item.label)}</button>`).join('')}</div></div><div><span class="sd-field">Метки</span><details class="sd-tag-picker"><summary>${state.tags.length ? esc(state.tags.map(tagLabel).join(', ')) : 'Все метки'}</summary><div class="sd-tag-options">${tags.map(tag => `<label><input type="checkbox" data-sd-tag="${esc(tag.id)}"${state.tags.includes(tag.id) ? ' checked' : ''}>${esc(tag.label)}</label>`).join('')}</div></details><label class="sd-check"><input type="checkbox" data-sd-state="excludeTags"${state.excludeTags ? ' checked' : ''}${!state.tags.length ? ' disabled' : ''}>Исключить выбранные</label></div>${select('Источник',[{id:'all',label:'Все источники'},...C.sources],state.source,'data-sd-state="source"')}</div><div class="sd-search-footer"><b>Искать в</b><span class="sd-chip">База ATS · ${localCandidates.length}</span><span>hh.ru и Авито — холодным поиском на вакансии.</span></div></section><section class="sd-panel sd-autopick-banner"><div class="sd-autopick-icon" aria-hidden="true">✦</div><div class="sd-autopick-copy"><h2>Автоподбор к вакансии</h2><p>Найдите подходящих кандидатов в собственной базе по требованиям выбранной вакансии.</p></div>${button('Подобрать по вакансии →','autopick','purple')}</section>`;
    // В референсе добавление строки и все быстрые фильтры стоят в одной ленте.
    const filters = $('.sd-filter-grid',workspace), add = $('[data-sd-action="add-query"]',workspace);
    filters.prepend(add);
    $('.sd-autopick-copy p',workspace).textContent = 'Выберите вакансию — ИИ возьмёт её требования, предложит критерии и найдёт подходящих кандидатов в базе.';
    const source = $('[data-sd-state="source"]',workspace); source.parentElement.classList.add('sd-source-field');
    source.insertAdjacentHTML('afterend',`<button type="button" class="sd-source-clear" data-sd-action="clear-source" aria-label="Очистить источник" title="Очистить источник"${state.source === 'all' ? ' hidden' : ''}>×</button>`);
  }
  const promptExamples = [
    ['Android-разработчики под вакансию','Android-разработчики под вакансию'],
    ['Дизайнеры с финтех-опытом','Дизайнеры с финтех-опытом'],
    ['Кандидаты из нашей базы без активного процесса','Кандидаты из нашей базы без активного процесса']
  ];
  function renderAi() {
    workspace.innerHTML = `<section class="sd-panel sd-ai-workspace"><div><span class="sd-chip">✦ ИИ-поиск</span><h2>Опишите кандидата обычным языком</h2><p>ИИ превратит запрос в проверяемые условия, покажет их перед запуском и найдёт людей сначала во внутренней базе.</p><label class="sd-field">Запрос обычным языком<textarea class="sd-textarea" id="sd-ai-prompt" aria-label="Запрос обычным языком" placeholder="Например: найди Senior Android-разработчиков из продуктовых компаний, от 4 лет опыта, Kotlin обязателен, Москва или удалённо">${esc(state.aiPrompt)}</textarea></label><div class="sd-ai-examples">${promptExamples.map(([label],index) => `<button type="button" data-sd-action="example" data-index="${index}">${esc(label)}</button>`).join('')}</div><div class="sd-ai-actions">${button('Собрать и запустить поиск','assemble-ai','primary',state.aiPrompt.trim() ? '' : 'disabled')}${button('Выбрать вакансию','ai-vacancy')}</div></div><aside><h3>Что сделает ИИ</h3><ol><li>Выделит обязательные требования и пожелания.</li><li>Покажет собранный запрос перед запуском.</li><li>Объяснит соответствие каждого кандидата.</li></ol><small>Источник по умолчанию</small><span class="sd-chip">База ATS</span><p class="sd-help">hh.ru и Авито — холодным поиском на вакансии.</p></aside></section>`;
  }
  function candidateResult(candidate) {
    const age = candidate.age ? `${candidate.age} ${plural(candidate.age,['год','года','лет'])}` : 'Возраст не указан';
    const processes = candidate.processes || [], experience = candidate.experience?.[0];
    const score = state.resultKind !== 'base' ? state.aiResults.find(item => item.candidateId === candidate.id) : null;
    return `<article class="sd-candidate" data-sd-candidate="${esc(candidate.id)}"><button type="button" class="sd-avatar" data-sd-action="profile" data-id="${esc(candidate.id)}" aria-label="Открыть профиль ${esc(candidate.name)}">${esc(candidate.initials || candidate.name.split(' ').slice(0,2).map(word => word[0]).join(''))}</button><div><div class="sd-candidate-title-line"><div><button type="button" class="sd-candidate-name" data-sd-action="profile" data-id="${esc(candidate.id)}">${esc(candidate.name)}</button><p class="sd-candidate-role">${esc(candidate.position || candidate.role)}</p></div><span class="sd-chip">Своя база</span></div><div class="sd-candidate-meta"><span>${esc(age)}</span><span>${esc(candidate.city)}</span><span>${esc(labelFor('sources',candidate.source))}</span><span>Обновлено ${esc(dateLabel(candidate.updatedAt))}</span></div><div class="sd-candidate-process">${processes.length ? `В работе на ${processes.length} вакансиях` : 'Нет активных процессов'}</div><div class="sd-candidate-experience"><span>Последний опыт</span><div><b>${esc(experience?.company || candidate.company)}</b> · ${esc(experience?.role || candidate.position)}</div></div><div class="sd-candidate-skills">${(candidate.skills || []).slice(0,6).map(skill => `<span>${esc(skill)}</span>`).join('')}</div></div><div class="sd-candidate-actions">${score ? `<div class="sd-score"><strong>${score.score === null ? '—' : esc(score.score)+'%'}</strong>${score.score === null ? 'Нужна проверка' : 'соответствие'}</div>` : ''}${button('На вакансию','assign','primary',`data-id="${esc(candidate.id)}"`)}${button('Открыть профиль','profile','',`data-id="${esc(candidate.id)}"`)}${state.resultKind === 'auto' ? button('×','exclude-auto','text',`data-id="${esc(candidate.id)}" aria-label="Исключить из подборки: ${esc(candidate.name)}" title="Исключить из подборки"`) : ''}</div></article>`;
  }
  function activeSearch() {
    let source = localCandidates;
    let query = state;
    if (state.resultKind !== 'base') {
      const ids = new Set(state.aiResults.map(item => item.candidateId));
      source = localCandidates.filter(item => ids.has(item.id));
      query = {...M.defaultState(),page:state.page,pageSize:state.pageSize};
    }
    const found = M.search(query, source);
    if (state.resultKind !== 'base') {
      found.allItems.sort((left,right) => (state.aiResults.find(item => item.candidateId === right.id)?.score || 0) - (state.aiResults.find(item => item.candidateId === left.id)?.score || 0));
      found.items = found.allItems.slice((found.page-1)*found.pageSize,found.page*found.pageSize);
    }
    return found;
  }
  function renderResults() {
    results.hidden = state.mode === 'ai' && !state.started;
    const found = state.started ? activeSearch() : {items:[],total:0,page:1,pages:1,pageSize:state.pageSize};
    state.page = found.page;
    const summary = state.autoSummary;
    const running = !!searchRun && !searchRun.done && searchRun.mode === state.mode;
    const ai = state.resultKind !== 'base';
    const title = running ? 'Оцениваем кандидатов…' : state.started ? `${found.total} ${plural(found.total,['кандидат','кандидата','кандидатов'])}` : 'Результаты поиска';
    const runVacancy = state.resultKind === 'auto' ? vacancies.find(item => item.id === (summary?.vacancyId || searchRun?.vacancyId))?.title : '';
    const subtitle = running ? `${runVacancy ? `${runVacancy} · ` : ''}Найдено ${state.aiResults.length} из ${searchRun.target} · оценено ${searchRun.processed}` : !state.started ? 'Резюме появятся здесь после запуска поиска' : `${runVacancy ? `${runVacancy} · ` : ''}Своя база — ${found.total}${runVacancy ? ` · не ниже ${state.autoHistory.find(item => item.id === state.autoHistoryId)?.threshold || 0}%` : ''}`;
    const excluded = running ? searchRun.excluded : summary?.excluded;
    const currentVacancyId = state.autoHistory.find(item => item.id === state.autoHistoryId)?.vacancyId;
    const controls = `${state.resultKind === 'auto' && state.autoHistory.length ? select('Подборка вакансии',state.autoHistory.filter(item => item.vacancyId === currentVacancyId).map(item => ({id:item.id,label:`${item.dateLabel} · не ниже ${item.threshold}% · найдено ${item.results.length} из ${item.target} · Деморекрутер · ${item.status}`})),state.autoHistoryId,'data-sd-history') : ''}${!ai ? select('Период обновления резюме',C.periods,state.period,'data-sd-state="period"') : ''}${select('Сортировка',ai ? [{id:'match',label:'По соответствию'}] : C.sorts,ai ? 'match' : state.sort,'data-sd-state="sort"')}${select('Размер страницы',[{id:20,label:'20 резюме'},{id:50,label:'50 резюме'}],state.pageSize,'data-sd-state="pageSize"')}`;
    const runNote = running ? `<div class="sd-run-progress"><div><b>Сколько подходящих уже найдено</b><span>${state.aiResults.length} из ${searchRun.target}</span></div><progress max="${searchRun.target}" value="${state.aiResults.length}" aria-label="Сколько подходящих уже найдено"></progress>${button('Остановить','stop-run')}<p>Подходящие появляются здесь по мере оценки — страницу можно не обновлять.</p><small>Локальная демонстрация, реальные оценки ИИ не запускаются.</small></div>` : summary && ai ? `<p class="sd-run-status">${summary.stopReason === 'datasetEnd' && summary.accepted < summary.target ? `Подходящих меньше: оценили всех кандидатов базы по условиям (${summary.processed}).` : esc(stopReason(summary.stopReason))}</p>` : '';
    results.innerHTML = `<header class="sd-results-head"><div class="sd-results-title"><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="sd-result-controls">${controls}</div></header>${excluded ? `<p class="sd-run-status">Ещё ${excluded} не прошли обязательные условия — в выдачу не взяты.</p>` : ''}${runNote}${state.started ? (found.items.length ? found.items.map(candidateResult).join('') : running ? empty('Оцениваем кандидатов…','Подходящие кандидаты появятся в выдаче по мере проверки.') : empty('Кандидаты не найдены','Попробуйте изменить запрос, область поиска или выбранные фильтры.')) : empty('Начните поиск по базе кандидатов','Введите должность, навык, компанию или фрагмент резюме. При необходимости добавьте условия.')}${state.started && found.total ? `<footer class="sd-pagination">${button('‹','prev','',`aria-label="Назад"${found.page <= 1 ? ' disabled' : ''}`)}${Array.from({length:found.pages},(_,index) => button(String(index+1),'page',index+1 === found.page ? 'page-active' : '',`data-page="${index+1}" aria-label="Страница ${index+1}"${index+1 === found.page ? ' aria-current="page"' : ''}`)).join('')}${button('›','next','',`aria-label="Вперёд"${found.page >= found.pages ? ' disabled' : ''}`)}</footer>` : ''}`;
  }
  const stopReason = reason => ({target:'Найдено нужное количество',dailyLimit:'Достигнут дневной лимит демооценок',datasetEnd:'База просмотрена',batchLimit:'Достигнут лимит попыток',cancelled:'Подборка остановлена'}[reason] || 'Проверка вымышленной базы завершена');
  function renderAll() { renderSidebar(); renderModes(); state.mode === 'ai' ? renderAi() : renderBase(); renderResults(); persist(); }
  function openDialog(kind, title, subtitle, body, footer, extra = {}) {
    returnFocus = document.activeElement; overlay = {kind, ...extra};
    dialog.innerHTML = `<header class="sd-dialog-header"><div><h2 id="sd-dialog-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button type="button" class="sd-icon-button" data-sd-action="close" aria-label="Закрыть">×</button></header><div class="sd-dialog-body">${body}</div><footer class="sd-dialog-footer">${footer}</footer>`;
    if (!dialog.open) dialog.showModal();
    $('input,select,textarea,button', $('.sd-dialog-body',dialog))?.focus();
  }
  function closeDialog() { dialog.close(); overlay = null; if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus(); else $('[data-sd-action="mode-ai"]')?.focus(); }
  function showErrors(errors) {
    const body = $('.sd-dialog-body',dialog); $('.sd-error',body)?.remove();
    if (errors.length) body.insertAdjacentHTML('afterbegin', `<p class="sd-error" role="alert">${errors.map(esc).join('<br>')}</p>`);
  }
  function openSaved() {
    const currentQuery = state.mode === 'ai' ? state.aiPrompt : state.queries.map(item => item.text).filter(Boolean).join(' · ');
    openDialog('saved','Сохранённые поиски','Личные и командные запросы',`${state.savedSearches.length ? `${state.savedSearches.map(snapshot => `<article class="sd-saved-card"><div><b>${esc(snapshot.name)}</b><small>${snapshot.team ? 'Командный · Департамент продукта' : 'Личный'} · демосохранение</small></div>${button('Применить','saved-apply','',`data-id="${esc(snapshot.id)}"`)}${button('Удалить','saved-delete','',`data-id="${esc(snapshot.id)}"`)}</article>`).join('')}<p class="sd-help">Применение и удаление в этом списке — локальная демологика; сохранения доступны только в этом браузере.</p>` : '<div class="sd-dialog-empty">Сохранённых поисков пока нет</div>'}<div class="sd-dialog-fields"><label class="sd-field">Название поиска<input class="sd-input" id="sd-saved-name" aria-label="Название поиска" placeholder="${esc(currentQuery || 'Название текущего поиска')}" maxlength="120"></label><label class="sd-switch-line"><input class="sd-switch" type="checkbox" role="switch" aria-label="Командный запрос" id="sd-saved-team">Командный запрос <span class="sd-help">Департамент продукта</span></label></div>`, `${button('Отмена','close')}${button('Сохранить текущий','saved-save','primary','disabled')}`);
  }
  function openProfile(id) {
    const candidate = localCandidates.find(item => item.id === id); if (!candidate) return;
    const consent = {given:'Получено',unknown:'Не указано',requested:'Запрошено'}[candidate.consent] || 'Не указано';
    openDialog('profile',candidate.name,candidate.position || candidate.role,`<h3 class="sd-subtitle" style="margin-top:0">Профиль кандидата</h3><p class="sd-profile-counts">${candidate.resumes.length} резюме · ${candidate.processes.length} активных процессов · Согласие: ${esc(consent)}</p>${candidate.processes.length ? candidate.processes.map(process => `<div class="sd-profile-process"><div><b>${esc(process.title || vacancies.find(vacancy => vacancy.id === process.vacancyId)?.title || 'Вакансия')}</b><small>${esc(process.stage)}</small></div>${button('Открыть на вакансии','candidate-route','',`data-route="vacancy/${esc(process.vacancyId)}"`)}</div>`).join('') : '<p class="sd-help">Активных процессов подбора нет.</p>'}`, `${button('Закрыть','close')}${button('Взять на другую вакансию','assign','primary',`data-id="${esc(candidate.id)}"`)}`, {candidateId:id});
  }
  function assignmentBody(candidate, config) {
    const vacancy = vacancies.find(item => item.id === config.vacancyId);
    return `<div class="sd-dialog-fields"><label class="sd-field">Вакансия<input class="sd-input" id="sd-vacancy-filter" aria-label="Найти вакансию" placeholder="Найти вакансию"><select class="sd-select" id="sd-assign-vacancy" aria-label="Вакансия">${options(vacancies.map(item => ({id:item.id,label:item.title})),config.vacancyId,'Выберите вакансию')}</select></label>${select('Начальный этап',(vacancy?.stages || []).map(stage => typeof stage === 'string' ? {id:stage,label:stage} : {id:stage.id || stage.name,label:stage.label || stage.name}),config.initialStage,'id="sd-assign-stage"','Первый этап вакансии')}<p class="sd-help">Пусто — первый свой этап воронки вакансии. Настройки ИИ-этапов и автоматизаций здесь не меняются.</p>${select('Резюме',candidate.resumes.map(item => ({id:item.id,label:`${item.title} · ${labelFor('sources',item.source)}`})),config.resumeId,'id="sd-assign-resume"')}<p class="sd-help">Добавление создаёт только демонстрационный процесс в этом макете. Профиль остаётся единым.</p></div>`;
  }
  function openAssignment(id, config = {}) {
    const candidate = localCandidates.find(item => item.id === id); if (!candidate) return;
    const draft = {vacancyId:'',initialStage:'',resumeId:candidate.resumes[0]?.id || '', ...config};
    openDialog('assign','Взять на вакансию',`${candidate.name} · профиль останется единым`,assignmentBody(candidate,draft),`${button('Отмена','close')}${button('Взять на вакансию','assign-confirm','primary','disabled')}`, {candidateId:id,draft});
    $('#sd-assign-stage',dialog).disabled = !draft.vacancyId;
    $('#sd-assign-vacancy',dialog).querySelectorAll('option').forEach(option => {
      option.disabled = !!option.value && candidate.processes.some(process => process.vacancyId === option.value);
    });
    updateAssignment();
  }
  function assignmentConfig() {return {vacancyId:$('#sd-assign-vacancy',dialog)?.value || '',initialStage:$('#sd-assign-stage',dialog)?.value || '',resumeId:$('#sd-assign-resume',dialog)?.value || ''};}
  function updateAssignment() {
    if (overlay?.kind !== 'assign') return;
    const config = assignmentConfig(); overlay.draft = config;
    const errors = M.validateAssignment([overlay.candidateId],config.vacancyId,config.initialStage,{[overlay.candidateId]:config.resumeId},localCandidates);
    const candidate = localCandidates.find(item => item.id === overlay.candidateId);
    const duplicate = candidate?.processes.some(process => process.vacancyId === config.vacancyId);
    $('[data-sd-action="assign-confirm"]',dialog).disabled = !config.vacancyId || errors.length > 0 || duplicate;
    if (duplicate) showErrors(['Кандидат уже находится в активном процессе этой вакансии.']); else showErrors([]);
  }
  function openAutopick(config = {}) {
    const draft = {...M.defaultAutoPick(),vacancyId:vacancies[0]?.id || '',...config};
    const vacancy = vacancies.find(item => item.id === draft.vacancyId);
    draft.initialStage = vacancy?.initialStage || '';
    if (vacancy && !draft.criteria.length) draft.criteria = clone(vacancy.criteria);
    openDialog('autopick','Автоподбор к вакансии','ATS соберёт подборку кандидатов из вашей базы.',`<div class="sd-dialog-fields">${select('Вакансия',vacancies.map(item => ({id:item.id,label:item.title})),draft.vacancyId,'id="sd-auto-vacancy"')}<label class="sd-field">Источник<select class="sd-select" aria-label="Источник подборки" disabled><option>Только база ATS</option></select></label><div class="sd-form-two"><label class="sd-field">Минимальное соответствие, %<input class="sd-input" id="sd-auto-threshold" aria-label="Минимальное соответствие" type="number" min="0" max="100" value="${esc(draft.threshold)}"></label><label class="sd-field">Сколько подходящих найти<input class="sd-input" id="sd-auto-target" aria-label="Сколько подходящих найти" type="number" min="1" max="1000" value="${esc(draft.target)}"></label></div><p class="sd-help">Проверяем базу порциями до нужного количества. Подборка остановится, если закончится база, будет достигнут дневной лимит оценок или пройдено 15 попыток.</p><div><span class="sd-field">Критерии подборки</span>${vacancy ? `<div class="sd-criteria-list">${vacancy.criteria.map(criterion => `<label><input type="checkbox" data-sd-auto-criterion="${esc(criterion.id)}"${draft.criteria.some(item => item.id === criterion.id) ? ' checked' : ''}>${esc(criterion.text)}</label>`).join('')}</div>` : '<p class="sd-help">Выберите вакансию, чтобы увидеть критерии.</p>'}</div><div class="sd-counter-box">Сегодня осталось <strong>${1000-state.usedToday}</strong> демооценок</div></div>`, `${button('Отмена','close')}${button('Сформировать подборку','autopick-run','primary','disabled')}`, {draft});
    updateAutopick();
  }
  function autopickConfig() {
    const vacancyId = $('#sd-auto-vacancy',dialog)?.value || '', vacancy = vacancies.find(item => item.id === vacancyId);
    const selected = new Set([...dialog.querySelectorAll('[data-sd-auto-criterion]:checked')].map(input => input.dataset.sdAutoCriterion));
    return {...overlay.draft,vacancyId,initialStage:vacancy?.initialStage || '',threshold:$('#sd-auto-threshold',dialog)?.value,target:$('#sd-auto-target',dialog)?.value,criteria:clone((vacancy?.criteria || []).filter(item => selected.has(item.id)))};
  }
  function updateAutopick() {if (overlay?.kind === 'autopick') $('[data-sd-action="autopick-run"]',dialog).disabled = M.validateAutoPick(autopickConfig()).length > 0 || state.usedToday >= 1000;}
  function openAssembled(criteria) {
    const parsed = M.parseAiQuery(state.aiPrompt);
    const draft = clone(criteria || parsed.criteria || []);
    const required = draft.filter(item => item.required !== false), desired = draft.filter(item => item.required === false);
    openDialog('assembled','ИИ собрал поисковый запрос','Проверьте условия перед запуском.',`<div class="sd-simulate-head"><span class="sd-chip">✦ ИИ-поиск · Демо</span></div>${(parsed.warnings || []).length ? `<p class="sd-warning">${parsed.warnings.map(esc).join('<br>')}</p>` : ''}<h3 class="sd-subtitle" style="margin-top:0">Обязательные условия</h3><ul class="sd-assembled-list">${required.map(item => `<li>${esc(item.text)}</li>`).join('') || '<li>Рабочие условия не распознаны — уточните запрос.</li>'}</ul><h3 class="sd-subtitle">Желательные условия</h3>${desired.length ? `<ul class="sd-assembled-list">${desired.map(item => `<li>${esc(item.text)}</li>`).join('')}</ul>` : '<p class="sd-help">Желательных условий модель не нашла.</p>'}<h3 class="sd-subtitle">Источники</h3><span class="sd-chip">База ATS</span><p class="sd-help">hh.ru и Авито — холодным поиском на вакансии.</p><label class="sd-field" style="margin-top:18px">Сколько подходящих найти<input class="sd-input" id="sd-ai-target" aria-label="Сколько подходящих найти" type="number" min="1" max="1000" value="20"></label><p class="sd-help">Проверяем базу порциями до нужного количества подходящих кандидатов, исчерпания базы, дневного лимита или 15 попыток. Подходящий кандидат должен пройти все обязательные условия.</p><div class="sd-counter-box" style="margin-top:15px">Сегодня осталось <strong>${1000-state.usedToday}</strong> демооценок</div><p class="sd-help">Вымышленный пример: реальные оценки ИИ не запускаются.</p>`,`${button('Отмена','close')}${button('Запустить поиск','ai-run','primary',!required.length || parsed.uncertain || state.usedToday >= 1000 ? 'disabled' : '')}`, {draft,uncertain:parsed.uncertain});
  }
  const hasBaseCondition = () => state.queries.some(query => query.text.trim()) || state.employment !== 'all' || state.tags.length || state.source !== 'all' || state.period !== 'all';
  function runSearch(showHint = true) {state.started = !!hasBaseCondition(); state.resultKind = 'base'; state.page = 1; state.autoSummary = null; renderResults(); persist(); if (!state.started && showHint) toast('Введите запрос или выберите фильтр.');}
  function syncRunResult(summary = null) {
    const record = {started:true,resultKind:searchRun.kind,page:1,aiResults:clone(searchRun.items),autoSummary:summary};
    state.modeResults[searchRun.mode] = record;
    if (state.mode === searchRun.mode) Object.assign(state,record);
  }
  function finishRun(reason) {
    clearTimeout(runTimer); if (!searchRun) return;
    searchRun.done = true;
    const summary = {processed:searchRun.processed,accepted:searchRun.items.length,excluded:searchRun.excluded,stopReason:reason,target:searchRun.target,vacancyId:searchRun.vacancyId};
    syncRunResult(summary);
    const history = state.autoHistory.find(item => item.id === state.autoHistoryId);
    if (searchRun.kind === 'auto' && history) {history.results = clone(searchRun.items); history.summary = clone(summary); history.status = reason === 'cancelled' ? 'остановлена' : 'завершена';}
    renderResults(); persist();
  }
  function tickRun() {
    if (!searchRun || searchRun.done) return;
    for (let count = 0; count < 3 && searchRun.processed < localCandidates.length; count++) {
      if (state.usedToday >= 1000) {finishRun('dailyLimit');return;}
      state.usedToday++;
      const candidate = localCandidates[searchRun.processed++];
      if (searchRun.kind === 'auto' && candidate.processes.some(process => process.vacancyId === searchRun.vacancyId)) continue;
      if (/без активного процесса|без активных процессов/i.test(searchRun.prompt) && candidate.processes.length) continue;
      const scored = M.scoreCandidate(candidate,searchRun.criteria);
      if (scored.score !== null && scored.score >= searchRun.threshold && (searchRun.kind === 'auto' || scored.explanations.every(item => !item.required || item.status === 'met'))) searchRun.items.push({candidateId:candidate.id,...scored});
      else searchRun.excluded++;
      if (searchRun.items.length >= searchRun.target) {finishRun('target'); return;}
    }
    const history = state.autoHistory.find(item => item.id === state.autoHistoryId);
    if (searchRun.kind === 'auto' && history) {history.results = clone(searchRun.items);history.summary = {processed:searchRun.processed,accepted:searchRun.items.length,excluded:searchRun.excluded,stopReason:'',target:searchRun.target,vacancyId:searchRun.vacancyId};}
    if (searchRun.processed >= localCandidates.length) {finishRun('datasetEnd'); return;}
    if (state.usedToday >= 1000) {finishRun('dailyLimit'); return;}
    if (searchRun.processed >= 300) {finishRun('batchLimit'); return;}
    syncRunResult(); if (state.mode === searchRun.mode) renderResults(); persist(); runTimer = setTimeout(tickRun,220);
  }
  function runAi(criteria, target, kind = 'ai', config = {}) {
    if (state.usedToday >= 1000) {showErrors(['Дневной лимит демонстрационных оценок исчерпан.']);return;}
    if (searchRun && !searchRun.done) finishRun('cancelled');
    if (state.mode !== 'ai') switchMode('ai');
    state.aiCriteria = clone(criteria); state.started = true; state.resultKind = kind; state.page = 1; state.autoSummary = null; state.aiResults = [];
    searchRun = {criteria:clone(criteria),target:Number(target),kind,mode:'ai',items:[],threshold:Number(config.threshold || 0),vacancyId:config.vacancyId || '',processed:0,excluded:0,prompt:kind === 'auto' ? '' : state.aiPrompt,done:false};
    if (kind === 'auto') {
      const timestamp = new Date(), id = `auto-${timestamp.getTime()}`;
      state.autoHistoryId = id; state.autoHistory.unshift({id,dateLabel:timestamp.toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),threshold:searchRun.threshold,target:searchRun.target,vacancyId:searchRun.vacancyId,status:'идёт',results:[],summary:null});
    }
    closeDialog(); renderResults(); persist(); runTimer = setTimeout(tickRun,220);
  }
  document.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-sd-query="text"]')) {state.queries[Number(target.closest('[data-sd-row]').dataset.sdRow)].text = target.value; persist();}
    else if (target.id === 'sd-ai-prompt') {state.aiPrompt = target.value; $('[data-sd-action="assemble-ai"]',workspace).disabled = !target.value.trim(); persist();}
    else if (target.id === 'sd-saved-name') $('[data-sd-action="saved-save"]',dialog).disabled = M.validateSavedSearch(target.value).length > 0;
    else if (target.id === 'sd-vacancy-filter') {
      const value = target.value.toLocaleLowerCase('ru');
      $('#sd-assign-vacancy',dialog).querySelectorAll('option').forEach(option => {option.hidden = !!option.value && !option.textContent.toLocaleLowerCase('ru').includes(value);});
    }
    else if (target.id === 'sd-auto-threshold' || target.id === 'sd-auto-target') updateAutopick();
    else if (target.id === 'sd-ai-target') $('[data-sd-action="ai-run"]',dialog).disabled = overlay?.uncertain || !overlay?.draft?.length || !M.positiveInteger(target.value) || Number(target.value) > 1000 || state.usedToday >= 1000;
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (target.dataset.sdQuery) {state.queries[Number(target.closest('[data-sd-row]').dataset.sdRow)][target.dataset.sdQuery] = target.value; persist();}
    else if (target.dataset.sdState) {
      const key = target.dataset.sdState;
      state[key] = target.type === 'checkbox' ? target.checked : key === 'pageSize' ? Number(target.value) : target.value;
      state.page = 1; if (state.mode === 'base') runSearch(false); else {renderResults();persist();}
    } else if (target.dataset.sdTag) {
      state.tags = target.checked ? [...new Set([...state.tags,target.dataset.sdTag])] : state.tags.filter(id => id !== target.dataset.sdTag);
      if (!state.tags.length) state.excludeTags = false;
      const picker = target.closest('.sd-tag-picker'); $('summary',picker).textContent = state.tags.length ? state.tags.map(tagLabel).join(', ') : 'Все метки';
      $('[data-sd-state="excludeTags"]',workspace).disabled = !state.tags.length; $('[data-sd-state="excludeTags"]',workspace).checked = state.excludeTags;
      state.page = 1; runSearch(false);
    } else if (target.id === 'sd-assign-vacancy') {
      const config = assignmentConfig(); config.initialStage = ''; const id = overlay.candidateId; openAssignment(id,config); $('#sd-assign-vacancy',dialog).focus();
    } else if (target.id === 'sd-assign-stage' || target.id === 'sd-assign-resume') updateAssignment();
    else if (target.id === 'sd-auto-vacancy') {const config = autopickConfig(); config.criteria = []; openAutopick(config); $('#sd-auto-vacancy',dialog).focus();}
    else if (target.dataset.sdAutoCriterion) updateAutopick();
    else if (target.hasAttribute('data-sd-history')) {
      if (searchRun && !searchRun.done) finishRun('cancelled');
      const history = state.autoHistory.find(item => item.id === target.value); if (!history) return;
      state.autoHistoryId = history.id; state.aiResults = clone(history.results); state.autoSummary = clone(history.summary); state.page = 1; state.started = true; state.resultKind = 'auto'; renderResults(); persist();
    }
  });
  document.addEventListener('click', event => {
    const route = event.target.closest('[data-sd-route]');
    if (route && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {event.preventDefault(); persist(); navigate(route.dataset.sdRoute); return;}
    const control = event.target.closest('[data-sd-action]'); if (!control || control.disabled) return;
    const action = control.dataset.sdAction;
    if (action === 'collapse') {state.collapsed = !state.collapsed; renderSidebar(); persist();}
    else if (action === 'assistant') {
      const opener = window.parent !== window ? window.parent.document.querySelector('[data-sb-ai-open],#ai-fab') : null;
      const context = window.parent !== window ? window.parent.document.querySelector('#ai-context') : null;
      if (context) context.textContent = 'Контекст: поиск';
      if (opener) opener.click(); else toast('Общий ИИ-ассистент доступен в командной оболочке макета.');
    }
    else if (action === 'messages') toast('Раздел сообщений ещё не перенесён. Поиск и подборка доступны в этом макете.');
    else if (action === 'mode-base' || action === 'mode-ai') switchMode(action === 'mode-ai' ? 'ai' : 'base');
    else if (action === 'search') runSearch();
    else if (action === 'add-query') {state.queries.push({...M.defaultQuery(),scope:'resume'}); renderBase(); $(`[data-sd-row="${state.queries.length-1}"] input`,workspace)?.focus(); persist();}
    else if (action === 'remove-query') {state.queries.splice(Number(control.dataset.index),1); renderBase(); $('[data-sd-action="add-query"]',workspace).focus(); persist();}
    else if (action === 'employment') {state.employment = control.dataset.value; state.page = 1; renderBase(); runSearch(false);}
    else if (action === 'clear-source') {state.source = 'all';renderBase();runSearch(false);$('[data-sd-state="source"]',workspace).focus();}
    else if (action === 'prev' || action === 'next') {state.page += action === 'next' ? 1 : -1; renderResults(); persist();}
    else if (action === 'page') {state.page = Number(control.dataset.page); renderResults(); persist();}
    else if (action === 'saved') openSaved();
    else if (action === 'saved-save') {
      const name = $('#sd-saved-name',dialog).value.trim(), errors = M.validateSavedSearch(name); if (errors.length) {showErrors(errors); return;}
      const snapshot = M.saveSnapshot(name,M.savedQueryState(state)); snapshot.team = $('#sd-saved-team',dialog).checked;
      state.savedSearches.push(snapshot); closeDialog(); persist(); toast('Поиск сохранён в этом демонстрационном браузере.');
    } else if (action === 'saved-apply') {
      const snapshot = state.savedSearches.find(item => item.id === control.dataset.id); if (!snapshot) return;
      // Запрос — это условия, а не снимок лимита, истории или процессов.
      // Санитизируем также сохранения ранней демоверсии, где был весь runtime.
      if (searchRun && !searchRun.done) finishRun('cancelled');
      const restored = M.savedQueryState(M.restoreSnapshot(snapshot));
      Object.assign(state,restored);
      Object.assign(state,emptyResult(state.mode === 'ai' ? 'ai' : 'base'));
      if (state.mode === 'base') state.started = !!hasBaseCondition();
      closeDialog(); renderAll(); toast('Локальный демозапрос восстановлен вместе с фильтрами.');
    } else if (action === 'saved-delete') {state.savedSearches = state.savedSearches.filter(item => item.id !== control.dataset.id); persist(); openSaved();}
    else if (action === 'profile') openProfile(control.dataset.id);
    else if (action === 'assign') openAssignment(control.dataset.id);
    else if (action === 'assign-confirm') {
      const config = assignmentConfig(), candidate = localCandidates.find(item => item.id === overlay.candidateId);
      const preview = M.previewAssignment([overlay.candidateId],config.vacancyId,config.initialStage,{[overlay.candidateId]:config.resumeId},localCandidates);
      if (preview.errors.length || candidate.processes.some(process => process.vacancyId === config.vacancyId)) {showErrors(preview.errors.length ? preview.errors : ['Кандидат уже добавлен на эту вакансию.']); return;}
      const item = preview.items[0]; if (!item) return;
      candidate.processes.push({vacancyId:item.vacancyId,title:item.vacancyTitle,stage:item.stage}); state.assignments.push(item);
      closeDialog(); renderResults(); persist(); toast('Демонстрационный процесс добавлен. Реальная ATS не менялась.');
    } else if (action === 'candidate-route') {
      const candidate = localCandidates.find(item => item.id === overlay.candidateId);
      const process = candidate?.processes.find(item => item.vacancyId === control.dataset.route.split('/')[1]);
      closeDialog();
      if (candidate && process && window.parent !== window && window.parent.SearchCandidateHandoff?.open(clone(candidate),clone(process))) return;
      navigate(control.dataset.route);
    }
    else if (action === 'autopick') openAutopick();
    else if (action === 'autopick-run') {
      const config = autopickConfig(), errors = M.validateAutoPick(config); if (errors.length) {showErrors(errors); return;}
      runAi(config.criteria,config.target,'auto',config);
    } else if (action === 'stop-run') {finishRun('cancelled'); toast('Локальная подборка остановлена. Найденные результаты сохранены.');}
    else if (action === 'exclude-auto') {
      state.aiResults = state.aiResults.filter(item => item.candidateId !== control.dataset.id);
      if (searchRun && !searchRun.done && searchRun.mode === state.mode) searchRun.items = clone(state.aiResults);
      const history = state.autoHistory.find(item => item.id === state.autoHistoryId); if (history) {history.results = clone(state.aiResults); if (history.summary) history.summary.accepted = state.aiResults.length;}
      if (state.autoSummary) state.autoSummary.accepted = state.aiResults.length;
      renderResults(); persist(); toast('Кандидат исключён только из этой демоподборки. Профиль и процессы не изменены.');
    } else if (action === 'example') {state.aiPrompt = promptExamples[Number(control.dataset.index)][1]; renderAi(); $('#sd-ai-prompt',workspace).focus(); persist();}
    else if (action === 'ai-vacancy') openAutopick();
    else if (action === 'assemble-ai') openAssembled();
    else if (action === 'ai-run') {
      const criteria = overlay.draft, target = $('#sd-ai-target',dialog)?.value;
      if (!criteria.length || overlay.uncertain || !M.positiveInteger(target) || Number(target) > 1000) {showErrors(['Уточните рабочие требования и укажите количество от 1 до 1000.']); return;}
      runAi(criteria,target);
    } else if (action === 'close') closeDialog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.matches('[data-sd-query="text"]') && !dialog.open) {event.preventDefault(); runSearch();}
    if (event.key === 'Escape') document.querySelectorAll('.sd-tag-picker[open]').forEach(node => {node.open = false;});
    if (event.target.id === 'sd-sidebar-resizer' && ['ArrowLeft','ArrowRight','Home'].includes(event.key)) {event.preventDefault(); setSidebarWidth(event.key === 'Home' ? 276 : (state.sidebarWidth || 276) + (event.key === 'ArrowLeft' ? -8 : 8));}
  });
  function setSidebarWidth(width) {state.sidebarWidth = Math.max(200,Math.min(380,Math.round(width))); $('#sd-shell').style.setProperty('--sd-sidebar-width',`${state.sidebarWidth}px`); $('#sd-sidebar-resizer').setAttribute('aria-valuenow',String(state.sidebarWidth));persist();}
  $('#sd-sidebar-resizer').addEventListener('pointerdown',event => {resizeStart = {x:event.clientX,width:state.sidebarWidth || 276}; event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();});
  $('#sd-sidebar-resizer').addEventListener('pointermove',event => {if (resizeStart) setSidebarWidth(resizeStart.width + event.clientX-resizeStart.x);});
  $('#sd-sidebar-resizer').addEventListener('pointerup',() => {resizeStart = null;});
  $('#sd-sidebar-resizer').addEventListener('pointercancel',() => {resizeStart = null;});
  $('#sd-sidebar-resizer').addEventListener('dblclick',() => setSidebarWidth(276));
  dialog.addEventListener('cancel', event => {event.preventDefault(); closeDialog();});
  dialog.addEventListener('click', event => {if (event.target === dialog) {const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();}});
  renderAll();
})();
