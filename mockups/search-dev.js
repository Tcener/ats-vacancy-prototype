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
  const defaults = () => ({...M.defaultState(), mode:'base', started:false, aiPrompt:'', aiCriteria:[],aiOrigin:'ai',aiSearchConfig:{}, resultKind:'base', savedSearches:[], assignments:[], aiResults:[], autoSummary:null, autoHistory:[], autoHistoryId:'', modeResults:{base:emptyResult('base'),ai:emptyResult('ai')}, collapsed:false,sidebarWidth:232,dailyDate:today,usedToday:0,selectedCandidateId:'',selectedResumeId:'',showAiEditor:false,atsFilters:null});
  let state = defaults();
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (stored && stored.version === 1 && stored.state) {
      state = {...defaults(), ...stored.state, ...M.restoreSnapshot({version:1,state:stored.state})};
      state.queries.forEach((query,index) => {if (typeof stored.state.queries?.[index]?.runtimeId === 'string') query.runtimeId = stored.state.queries[index].runtimeId;});
    }
  } catch (_) { /* Блокировка хранилища не мешает проверять макет. */ }
  if (!Array.isArray(state.savedSearches)) state.savedSearches = [];
  if (!Array.isArray(state.assignments)) state.assignments = [];
  if (!Array.isArray(state.autoHistory)) state.autoHistory = [];
  if (!state.modeResults || typeof state.modeResults !== 'object') state.modeResults = {base:emptyResult('base'),ai:emptyResult('ai')};
  if (state.dailyDate !== today) {state.dailyDate = today;state.usedToday = 0;}
  state.usedToday = Math.max(0,Math.min(1000,Number(state.usedToday) || 0));
  for (const history of state.autoHistory) if (history.status === 'идёт' || history.status === 'пауза') {history.status = 'остановлена'; if (history.summary) history.summary.stopReason = 'cancelled';}
  const restoredHistory = state.autoHistory.find(item => item.id === state.autoHistoryId);
  if (restoredHistory?.summary && state.resultKind === 'auto' && !state.autoSummary) state.autoSummary = clone(restoredHistory.summary);
  if (restoredHistory?.summary && state.modeResults.ai?.resultKind === 'auto' && !state.modeResults.ai.autoSummary) state.modeResults.ai.autoSummary = clone(restoredHistory.summary);
  if (!Array.isArray(state.queries) || !state.queries.length) state.queries = [M.defaultQuery()];
  // Черновик строки не меняет уже показанную выдачу до нажатия «Найти».
  let submittedBaseQuery = M.normalizeState(state);
  let localCandidates = clone(M.candidates || []), localHhCandidates = clone(M.hhCandidates || []);
  const allCandidates = () => [...localCandidates,...localHhCandidates.filter(item => !localCandidates.some(internal => internal.id === item.id))];
  const findCandidate = id => allCandidates().find(item => item.id === id);
  const currentDataset = () => M.selectResultsDataset(state.searchProvider,localCandidates,localHhCandidates);
  const providerName = () => state.searchProvider === 'both' ? 'База ATS + hh.ru · Демо' : state.searchProvider === 'hh' ? 'hh.ru · Демо' : 'База ATS';
  // Выбор строк — временное состояние выдачи, не часть сохранённого запроса.
  const selectedCandidateIds = new Set();
  let querySequence = 0;
  for (const assignment of state.assignments) {
    let candidate = findCandidate(assignment.candidateId);
    if (candidate?.searchProvider === 'hh' && !candidate.importedToATS) {
      candidate = {...clone(candidate),importedToATS:true,internalHistoryAvailable:true};
      localCandidates.push(candidate);
    }
    if (candidate && !candidate.processes.some(process => process.vacancyId === assignment.vacancyId)) candidate.processes.push({vacancyId:assignment.vacancyId,title:assignment.vacancyTitle,stage:assignment.stage});
    if (candidate?.searchProvider === 'hh') Object.assign(localHhCandidates.find(item => item.id === candidate.id) || {},clone(candidate));
  }
  let overlay = null, returnFocus = null, toastTimer, runTimer, searchRun = null, resizeStart = null;
  const workspace = $('#sd-workspace'), results = $('#sd-results'), dialog = $('#sd-dialog');
  const stashResult = () => {state.modeResults[state.mode] = clone({started:state.started,resultKind:state.resultKind,page:state.page,aiResults:state.aiResults,autoSummary:state.autoSummary});};
  const persist = () => {stashResult(); try { sessionStorage.setItem(storageKey, JSON.stringify({version:1,state})); } catch (_) {} };
  function switchMode(mode) {selectedCandidateIds.clear();stashResult(); state.mode = mode;if (mode === 'base') state.showAiEditor = false; Object.assign(state,state.modeResults[mode] || emptyResult(mode === 'ai' ? 'ai' : 'base')); renderModes(); renderBase(); renderResults(); persist();}
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
      else location.href = `ats-product.html?public=19d1ad2510ee#${route}`;
    }
  }
  function renderSidebar() {
    const nav = [['dashboard','Главная','home'],['search','Поиск','search'],['tasks','Мои задачи','check'],['calendar','Календарь','calendar'],['analytics','Аналитика','chart'],['requisitions','Заявки','list'],['settings','Настройки','settings']];
    $('#sd-sidebar').innerHTML = `<div class="sd-brand"><a href="dashboard.html?public=509f70c12929" data-sd-route="dashboard" aria-label="Собесо — главная"><img src="assets/logo-sobesso.png?public=11fd3378f3b0" alt="Собесо"></a><button type="button" class="sd-collapse" data-sd-action="collapse" aria-label="${state.collapsed ? 'Развернуть меню' : 'Свернуть меню'}" aria-expanded="${!state.collapsed}">${svg('menu')}</button></div><nav class="sd-nav">${nav.map(([route,label,icon]) => `<a href="${route === 'dashboard' ? 'dashboard.html?public=509f70c12929' : `ats-product.html?public=19d1ad2510ee#${route}`}" data-sd-route="${route}" title="${esc(label)}"${route === 'search' ? ' aria-current="page"' : ''}>${svg(icon)}<span class="sd-nav-label">${esc(label)}</span>${route === 'tasks' ? '<span class="sd-nav-count">7</span>' : route === 'requisitions' ? '<span class="sd-nav-count">3</span>' : ''}</a>`).join('')}</nav><section class="sd-side-vacancies"><h2>${svg('folder')} Мои вакансии</h2>${vacancies.map(vacancy => `<a href="ats-product.html?public=19d1ad2510ee#vacancy/${esc(vacancy.id)}" data-sd-route="vacancy/${esc(vacancy.id)}">${esc(vacancy.title)}</a>`).join('')}<a class="sd-archive" href="ats-product.html?public=19d1ad2510ee#portfolio" data-sd-route="portfolio">Архив</a></section><div class="sd-side-bottom"><a class="sd-side-create" href="ats-product.html?public=19d1ad2510ee#create" data-sd-route="create"><span aria-hidden="true">+</span><span class="sd-create-label">Создать</span></a><div class="sd-side-footer"><span>Демонстрационный стенд</span><span>↪</span></div></div>`;
    $('#sd-shell').classList.toggle('sd-sidebar-collapsed', !!state.collapsed);
    $('#sd-shell').style.setProperty('--sd-sidebar-width',`${state.sidebarWidth || 276}px`);
    $('#sd-sidebar-resizer').setAttribute('aria-valuenow',String(state.sidebarWidth || 276));
    const message = document.createElement('button'); message.type = 'button'; message.className = 'sd-nav-shell-button'; message.dataset.sdAction = 'messages'; message.title = 'Сообщения';
    message.innerHTML = `${svg('messages')}<span class="sd-nav-label">Сообщения</span>`; $('.sd-nav',document).children[3].before(message);
    const assistant = document.createElement('button'); assistant.type = 'button'; assistant.className = 'sd-shell-assistant'; assistant.dataset.sdAction = 'assistant'; assistant.setAttribute('aria-label','Открыть ИИ-ассистента'); assistant.title = 'ИИ-ассистент';assistant.textContent = '✦';
    $('.sd-side-create',document).after(assistant);
  }
  function renderModes() {
    $('#sd-mode-tabs').innerHTML = `${state.mode === 'ai' && state.started ? '<button type="button" data-sd-action="mode-base">← К обычному поиску</button>' : ''}<button type="button" data-sd-action="saved">${svg('folder')} Сохранённые поиски</button>`;
  }
  function queryRow(query, index) {
    return `<div class="sd-query-row${index ? '' : ' is-first'}" data-sd-row="${index}">${index ? `<select class="sd-select" aria-label="Связка строки ${index+1}" data-sd-query="join">${options(C.joins,query.join)}</select>` : ''}<input class="sd-input" aria-label="${index ? `Условие поиска ${index+1}` : 'Поисковый запрос'}" placeholder="${index ? 'Добавьте ещё одно условие' : 'Должность, навык, компания или текст из резюме'}" value="${esc(query.text)}" data-sd-query="text"><select class="sd-select" aria-label="Область поиска ${index+1}" data-sd-query="scope">${options(C.scopes,query.scope)}</select><select class="sd-select" aria-label="Условие строки ${index+1}" data-sd-query="condition">${options(C.conditions,query.condition)}</select>${index ? `<button type="button" class="sd-icon-button" data-sd-action="remove-query" data-index="${index}" aria-label="Удалить строку ${index+1}">×</button>` : button('Найти','search','primary')}</div>`;
  }
  function renderBase() {
    const external = state.searchProvider !== 'ats';
    const providers = `<div class="sd-provider-row" aria-label="Где искать"><span class="sd-provider-label">Где искать</span><button type="button" class="sd-provider" data-sd-action="provider" data-provider="ats" aria-pressed="${state.searchProvider !== 'hh'}"><span class="sd-provider-dot" aria-hidden="true"></span>База ATS <small>${localCandidates.length}</small></button><button type="button" class="sd-provider" data-sd-action="provider" data-provider="hh" aria-pressed="${external}"><span class="sd-provider-hh" aria-hidden="true">hh</span>hh.ru <small>Демо</small></button><div class="sd-tooltip-wrap sd-provider-sleep" tabindex="0" aria-label="Авито Работа — недоступно" aria-describedby="sd-avito-tip"><button type="button" class="sd-provider" disabled><span class="sd-provider-muted">Авито Работа</span></button><span class="sd-tooltip" role="tooltip" id="sd-avito-tip">Функционал пока спит</span></div><span class="sd-provider-note">${state.searchProvider === 'both' ? 'Общая выдача двух источников. Внешние резюме не добавляются в ATS автоматически.' : external ? 'Вымышленная выдача hh.ru. Подключение к сервису не используется.' : 'Поиск в собственной базе, с метками и историей подбора.'}</span></div>`;
    const actions = [
      ['autopick','Поиск по вакансии','Выберите вакансию, запустится поиск по описанию и требованиям','Умная подборка','✦',''],
      ['resume-search','Поиск по резюме','Загрузите резюме, поиск найдет похожие','Похожие кандидаты','↥','resume'],
      ['open-ai','AI поиск','ИИ помощник построит поиск по вашему запросу','Запрос обычным языком','✧','ai']
    ].map(([action,title,tip,subtitle,icon,style],index) => `<div class="sd-tooltip-wrap"><button type="button" class="sd-discovery-action ${style}" data-sd-action="${action}" aria-describedby="sd-action-tip-${index}"><span class="sd-discovery-icon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${subtitle}</small></span><span class="sd-arrow" aria-hidden="true">→</span></button><span class="sd-tooltip" role="tooltip" id="sd-action-tip-${index}">${tip}</span></div>`).join('');
    workspace.innerHTML = `<section class="sd-panel sd-search-builder" aria-label="Условия поиска">${providers}${state.queries.map(queryRow).join('')}${button('+ Добавить строку','add-query','sd-query-add')}<div class="sd-filter-grid"><div class="sd-field"><span>Занятость</span><div class="sd-segment" aria-label="Занятость">${(C.employment || []).map(item => `<button type="button" data-sd-action="employment" data-value="${esc(item.id)}" aria-pressed="${state.employment === item.id}"${external ? ' disabled title="История процессов ATS недоступна во внешней выдаче"' : ''}>${esc(item.label)}</button>`).join('')}</div></div><div><span class="sd-field">Метки</span><details class="sd-tag-picker"><summary${external ? ' tabindex="-1" aria-disabled="true"' : ''}>${external ? 'Недоступны в hh.ru' : state.tags.length ? esc(state.tags.map(tagLabel).join(', ')) : 'Все метки'}</summary><div class="sd-tag-options">${tags.map(tag => `<label><input type="checkbox" data-sd-tag="${esc(tag.id)}"${state.tags.includes(tag.id) ? ' checked' : ''}${external ? ' disabled' : ''}>${esc(tag.label)}</label>`).join('')}</div></details><label class="sd-check"><input type="checkbox" data-sd-state="excludeTags"${state.excludeTags ? ' checked' : ''}${!state.tags.length || external ? ' disabled' : ''}>Исключить</label></div>${select('Источник резюме',[{id:'all',label:external ? 'hh.ru' : 'Все источники'},...C.sources],state.source,`data-sd-state="source"${external ? ' disabled' : ''}`)}</div><div class="sd-search-footer"><span>${external ? 'Демовыдача hh.ru: только вымышленные резюме' : 'Метки, занятость и комментарии относятся только к вашей базе'}</span><span>Никаких запросов к внешним сервисам</span></div></section><div class="sd-discovery-actions" aria-label="Умный поиск">${actions}</div>${state.showAiEditor ? aiEditor() : ''}${state.mode === 'ai' && state.started ? `<div class="sd-ai-context"><p><b>${state.resultKind === 'auto' ? 'Подборка по вакансии' : state.resultKind === 'resume' ? 'Похожие по резюме' : 'AI поиск'}</b> · ${esc(providerName())}</p>${button('Обычный поиск','mode-base')}</div>` : ''}`;
    const filters = $('.sd-filter-grid',workspace), add = $('[data-sd-action="add-query"]',workspace);
    filters.prepend(add);
    const source = $('[data-sd-state="source"]',workspace); source.parentElement.classList.add('sd-source-field');
    source.insertAdjacentHTML('afterend',`<button type="button" class="sd-source-clear" data-sd-action="clear-source" aria-label="Очистить источник" title="Очистить источник"${state.source === 'all' || external ? ' hidden' : ''}>×</button>`);
    if (external) {
      $('.sd-tag-picker summary',workspace).addEventListener('click',event => event.preventDefault());
      workspace.querySelectorAll('[data-sd-query="scope"]').forEach(node => {node.querySelectorAll('option').forEach(option => {option.disabled = option.value === 'feedback';});});
    }
    if (external) $('.sd-search-footer',workspace).firstElementChild.textContent = 'Для hh.ru и совместного поиска доступны общие поля резюме; история и метки ATS не используются.';
    if (state.mode === 'ai' && state.aiCriteria.length) {
      if (!$('.sd-ai-context',workspace)) workspace.insertAdjacentHTML('beforeend',`<div class="sd-ai-context"><p><b>Условия поиска восстановлены</b> · ${esc(providerName())}</p>${button('Обычный поиск','mode-base')}</div>`);
      $('.sd-ai-context',workspace).insertAdjacentHTML('beforeend',button('Проверить условия','review-recipe'));
    }
  }
  const promptExamples = [
    ['Android-разработчики под вакансию','Android-разработчики под вакансию'],
    ['Дизайнеры с финтех-опытом','Дизайнеры с финтех-опытом'],
    ['Кандидаты из нашей базы без активного процесса','Кандидаты из нашей базы без активного процесса']
  ];
  function aiEditor() {
    return `<section class="sd-panel sd-ai-workspace"><div><span class="sd-chip pink">✧ AI поиск · Демо</span><h2>Кого будем искать?</h2><p>Опишите профессиональные навыки и опыт. Перед запуском проверим, какие условия получилось собрать.</p><label class="sd-field">Запрос обычным языком<textarea class="sd-textarea" id="sd-ai-prompt" aria-label="Запрос обычным языком" placeholder="Например: Android-разработчик с Kotlin и Jetpack Compose, опыт от 4 лет">${esc(state.aiPrompt)}</textarea></label><div class="sd-ai-examples">${promptExamples.map(([label],index) => `<button type="button" data-sd-action="example" data-index="${index}">${esc(label)}</button>`).join('')}</div><div class="sd-ai-actions">${button('Проверить условия','assemble-ai','purple',state.aiPrompt.trim() ? '' : 'disabled')}${button('Свернуть','hide-ai')}</div></div><aside><h3>Вы управляете поиском</h3><ol><li>Опишите обязательное и желательное.</li><li>Проверьте собранные условия.</li><li>Просматривайте подходящие резюме справа.</li></ol><small>Сейчас ищем в</small><span class="sd-chip">${esc(providerName())}</span><p class="sd-help">В макете оценка выполняется локально, без реального ИИ и отправки данных.</p></aside></section>`;
  }
  function renderAi() {state.showAiEditor = true;renderBase();}
  function candidateResult(candidate) {
    const age = candidate.age ? `${candidate.age} ${plural(candidate.age,['год','года','лет'])}` : 'Возраст не указан';
    const processes = candidate.processes || [], experience = candidate.experience?.[0];
    const score = state.resultKind !== 'base' ? state.aiResults.find(item => item.candidateId === candidate.id) : null;
    const external = candidate.searchProvider === 'hh' && !candidate.importedToATS;
    return `<article class="sd-candidate${state.selectedCandidateId === candidate.id ? ' is-selected' : ''}" data-sd-candidate="${esc(candidate.id)}" tabindex="0" aria-label="Просмотреть резюме: ${esc(candidate.name)}">
      <button type="button" class="sd-avatar" style="${esc(portraitStyle(candidate))}" data-sd-action="profile" data-id="${esc(candidate.id)}" aria-label="Просмотреть резюме ${esc(candidate.name)}">${portraitFallback(candidate)}</button>
      <div><div class="sd-candidate-title-line"><div><button type="button" class="sd-candidate-name" data-sd-action="profile" data-id="${esc(candidate.id)}">${esc(candidate.name)}</button><p class="sd-candidate-role">${esc(candidate.position || candidate.role)}</p></div></div><div class="sd-candidate-meta"><span>${esc(age)}</span><span>${esc(candidate.city)}</span><span>${esc(labelFor('sources',candidate.source))}</span><span>${esc(dateLabel(candidate.updatedAt))}</span></div><div class="sd-candidate-process${external ? ' external' : ''}">${external ? 'История ATS недоступна' : processes.length ? `В работе: ${processes.length} ${plural(processes.length,['вакансия','вакансии','вакансий'])}` : 'Нет активных процессов'}</div><div class="sd-candidate-experience"><span>Последний опыт</span><div><b>${esc(experience?.company || candidate.company)}</b> · ${esc(experience?.role || candidate.position)}</div></div><div class="sd-candidate-skills">${(candidate.skills || []).slice(0,6).map(skill => `<span>${esc(skill)}</span>`).join('')}</div></div>
      <div class="sd-candidate-checkbox-column"><label class="sd-candidate-select"><input type="checkbox" data-sd-check-candidate="${esc(candidate.id)}" aria-label="Выбрать кандидата: ${esc(candidate.name)}"${selectedCandidateIds.has(candidate.id) ? ' checked' : ''}></label><span class="sd-chip ${external ? 'pink' : 'green'}">${external ? 'hh.ru · Демо' : 'Своя база'}</span></div>
      <div class="sd-candidate-actions">${score ? `<div class="sd-score"><strong>${score.score === null ? '—' : esc(score.score)+'%'}</strong>${score.score === null ? 'Нужна проверка' : 'соответствие'}</div>` : ''}${button('На вакансию','assign','green',`data-id="${esc(candidate.id)}"`)}${state.resultKind === 'auto' ? button('×','exclude-auto','text',`data-id="${esc(candidate.id)}" aria-label="Исключить из подборки: ${esc(candidate.name)}" title="Исключить из подборки"`) : ''}</div></article>`;
  }
  const portraitStyle = candidate => window.SearchDemoPortraits?.style(candidate.photoIndex) || '';
  const portraitFallback = candidate => portraitStyle(candidate) ? '' : `<span class="sd-photo-fallback">${esc(candidate.initials || candidate.name.split(' ').slice(0,2).map(word => word[0]).join(''))}</span>`;
  function activeSearch() {
    let source = currentDataset();
    let query = {...submittedBaseQuery,page:state.page,pageSize:state.pageSize,sort:state.sort};
    if (state.resultKind !== 'base') {
      const ids = new Set(state.aiResults.map(item => item.candidateId));
      source = currentDataset().filter(item => ids.has(item.id));
      query = {...M.defaultState(),searchProvider:state.searchProvider,page:state.page,pageSize:state.pageSize};
    }
    const found = M.search(query, source);
    if (state.resultKind !== 'base') {
      found.allItems.sort((left,right) => (state.aiResults.find(item => item.candidateId === right.id)?.score || 0) - (state.aiResults.find(item => item.candidateId === left.id)?.score || 0));
      found.items = found.allItems.slice((found.page-1)*found.pageSize,found.page*found.pageSize);
    }
    return found;
  }
  function renderResults() {
    results.hidden = false;
    const found = state.started ? activeSearch() : {items:[],total:0,page:1,pages:1,pageSize:state.pageSize};
    const available = new Set((found.allItems || []).map(item => item.id));
    for (const id of selectedCandidateIds) if (!available.has(id)) selectedCandidateIds.delete(id);
    state.page = found.page;
    const summary = state.autoSummary;
    const running = !!searchRun && !searchRun.done && searchRun.mode === state.mode;
    const ai = state.resultKind !== 'base';
    const title = running ? 'Оцениваем кандидатов…' : state.started ? `${found.total} ${plural(found.total,['кандидат','кандидата','кандидатов'])}` : 'Результаты поиска';
    const runVacancy = state.resultKind === 'auto' ? vacancies.find(item => item.id === (summary?.vacancyId || searchRun?.vacancyId))?.title : '';
    const subtitle = running ? `${runVacancy ? `${runVacancy} · ` : ''}Найдено ${state.aiResults.length} из ${searchRun.target} · оценено ${searchRun.processed}` : !state.started ? 'Резюме появятся здесь после запуска поиска' : `${runVacancy ? `${runVacancy} · ` : ''}${providerName()} — ${found.total}${runVacancy ? ` · не ниже ${state.autoHistory.find(item => item.id === state.autoHistoryId)?.threshold || 0}%` : ''}`;
    const excluded = running ? searchRun.excluded : summary?.excluded;
    const currentVacancyId = state.autoHistory.find(item => item.id === state.autoHistoryId)?.vacancyId;
    const controls = `${state.resultKind === 'auto' && state.autoHistory.length ? select('Подборка вакансии',state.autoHistory.filter(item => item.vacancyId === currentVacancyId && (item.searchProvider || 'ats') === state.searchProvider).map(item => ({id:item.id,label:`${item.dateLabel} · ${item.results.length} из ${item.target} · от ${item.threshold}% · ${item.status}`})),state.autoHistoryId,'data-sd-history') : ''}${!ai ? select('Период обновления резюме',C.periods,state.period,'data-sd-state="period"') : ''}${select('Сортировка',ai ? [{id:'match',label:'По соответствию'}] : C.sorts,ai ? 'match' : state.sort,'data-sd-state="sort"')}${select('Размер страницы',[{id:20,label:'20 резюме'},{id:50,label:'50 резюме'}],state.pageSize,'data-sd-state="pageSize"')}`;
    const runNote = running ? `<div class="sd-run-progress"><div><b>${searchRun.paused ? 'Поиск на паузе' : 'Ищем подходящих'}</b><span>${state.aiResults.length} из ${searchRun.target}</span></div><progress max="${searchRun.target}" value="${state.aiResults.length}" aria-label="Сколько подходящих уже найдено"></progress>${button(searchRun.paused ? 'Продолжить' : 'Пауза','pause-run')}${button('Остановить','stop-run')}<p>Резюме появляются по мере оценки. Уже найденные не потеряются.</p><small>Локальная демонстрация · осталось ${1000-state.usedToday} оценок сегодня</small></div>` : summary && ai ? `<p class="sd-run-status">${summary.stopReason === 'datasetEnd' && summary.accepted < summary.target ? `Оценили всю демобазу (${summary.processed}). Подходящих ${summary.accepted} из ${summary.target}.` : esc(stopReason(summary.stopReason))}</p>` : '';
    results.innerHTML = `<header class="sd-results-head"><div class="sd-results-title"><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="sd-result-controls">${controls}</div></header>${excluded ? `<p class="sd-run-status">${excluded} не подошли по условиям и не включены в выдачу.</p>` : ''}${runNote}${state.started ? (found.items.length ? found.items.map(candidateResult).join('') : running ? empty('Оцениваем кандидатов…','Подходящие кандидаты появятся в выдаче по мере проверки.') : empty('Кандидаты не найдены','Попробуйте изменить запрос, область поиска или выбранные фильтры.')) : empty('Кого будем искать?','Введите должность, навык, компанию или фрагмент резюме. Или попробуйте один из вариантов умного поиска.')}${state.started && found.total ? `<footer class="sd-pagination">${button('‹','prev','',`aria-label="Назад"${found.page <= 1 ? ' disabled' : ''}`)}${Array.from({length:found.pages},(_,index) => button(String(index+1),'page',index+1 === found.page ? 'page-active' : '',`data-page="${index+1}" aria-label="Страница ${index+1}"${index+1 === found.page ? ' aria-current="page"' : ''}`)).join('')}${button('›','next','',`aria-label="Вперёд"${found.page >= found.pages ? ' disabled' : ''}`)}</footer>` : ''}`;
    if (found.items.length) {
      const checked = found.items.filter(item => selectedCandidateIds.has(item.id)).length;
      $('.sd-results-head',results).insertAdjacentHTML('afterend',`<div class="sd-bulk-toolbar"><label class="sd-bulk-select-page"><input type="checkbox" data-sd-select-page aria-label="Выбрать всех кандидатов на странице"${checked === found.items.length ? ' checked' : ''}>На странице</label><span aria-live="polite">Выбрано ${selectedCandidateIds.size}</span>${button('На вакансию','bulk-assign','green',selectedCandidateIds.size ? '' : 'disabled')}${selectedCandidateIds.size ? button('Снять выбор','bulk-clear','text') : ''}</div>`);
      $('[data-sd-select-page]',results).indeterminate = checked > 0 && checked < found.items.length;
    }
    if (state.started && !found.allItems?.some(candidate => candidate.id === state.selectedCandidateId)) {state.selectedCandidateId = '';state.selectedResumeId = '';}
    renderPreview();
  }
  const stopReason = reason => ({target:'Найдено нужное количество',dailyLimit:'Достигнут дневной лимит демооценок',datasetEnd:'База просмотрена',batchLimit:'Достигнут лимит попыток',cancelled:'Подборка остановлена'}[reason] || 'Проверка вымышленной базы завершена');
  function renderAll() { renderSidebar(); renderModes(); renderBase(); renderResults(); persist(); }
  function openDialog(kind, title, subtitle, body, footer, extra = {}) {
    returnFocus = document.activeElement; overlay = {kind, ...extra};
    dialog.innerHTML = `<header class="sd-dialog-header"><div><h2 id="sd-dialog-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button type="button" class="sd-icon-button" data-sd-action="close" aria-label="Закрыть">×</button></header><div class="sd-dialog-body">${body}</div><footer class="sd-dialog-footer">${footer}</footer>`;
    if (!dialog.open) dialog.showModal();
    $('input,select,textarea,button', $('.sd-dialog-body',dialog))?.focus();
  }
  function closeDialog() { dialog.close(); overlay = null; if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus(); else $('[data-sd-action="saved"]')?.focus(); }
  function showErrors(errors) {
    const body = $('.sd-dialog-body',dialog); $('.sd-error',body)?.remove();
    if (errors.length) body.insertAdjacentHTML('afterbegin', `<p class="sd-error" role="alert">${errors.map(esc).join('<br>')}</p>`);
  }
  function openSaved() {
    const currentQuery = state.mode === 'ai' ? state.aiPrompt : state.queries.map(item => item.text).filter(Boolean).join(' · ');
    openDialog('saved','Сохранённые поиски','Личные и командные запросы',`${state.savedSearches.length ? `${state.savedSearches.map(snapshot => `<article class="sd-saved-card"><div><b>${esc(snapshot.name)}</b><small>${snapshot.team ? 'Командный · Департамент продукта' : 'Личный'} · демосохранение</small></div>${button('Применить','saved-apply','',`data-id="${esc(snapshot.id)}"`)}${button('Удалить','saved-delete','',`data-id="${esc(snapshot.id)}"`)}</article>`).join('')}<p class="sd-help">Применение и удаление в этом списке — локальная демологика; сохранения доступны только в этом браузере.</p>` : '<div class="sd-dialog-empty">Сохранённых поисков пока нет</div>'}<div class="sd-dialog-fields"><label class="sd-field">Название поиска<input class="sd-input" id="sd-saved-name" aria-label="Название поиска" placeholder="${esc(currentQuery || 'Название текущего поиска')}" maxlength="120"></label><label class="sd-switch-line"><input class="sd-switch" type="checkbox" role="switch" aria-label="Командный запрос" id="sd-saved-team">Командный запрос <span class="sd-help">Департамент продукта</span></label></div>`, `${button('Отмена','close')}${button('Сохранить текущий','saved-save','primary','disabled')}`);
  }
  function openProfile(id) {
    const candidate = findCandidate(id); if (!candidate) return;
    state.selectedCandidateId = id;
    if (!candidate.resumes.some(item => item.id === state.selectedResumeId)) state.selectedResumeId = candidate.resumes[0]?.id || '';
    renderResults();persist();
  }
  function resumeDuration(months) {
    if (!Number.isFinite(months) || months <= 0) return '';
    const total = Math.round(months), years = Math.floor(total / 12), rest = total % 12;
    return [years ? `${years} ${plural(years,['год','года','лет'])}` : '', rest ? `${rest} ${plural(rest,['месяц','месяца','месяцев'])}` : ''].filter(Boolean).join(' ');
  }
  function resumeMonth(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''))) return '';
    return new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}-01T12:00:00Z`));
  }
  function resumeJobMonths(job) {
    if (Number.isFinite(job.durationMonths) && job.durationMonths > 0) return job.durationMonths;
    return Number.isFinite(job.years) && job.years > 0 ? job.years * 12 : 0;
  }
  function renderResumeExperience(resume) {
    const jobs = Array.isArray(resume?.experience) ? resume.experience : [];
    const total = resumeDuration(jobs.reduce((sum,job) => sum + resumeJobMonths(job),0));
    const paragraphs = values => (Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value.trim()).map(value => `<p>${esc(value)}</p>`).join('');
    return `<section class="sd-preview-section sd-resume-experience"><div class="sd-resume-section-head"><h3>Опыт работы${total ? ` <span>· ${esc(total)}</span>` : ''}</h3><span class="sd-resume-source">${esc(labelFor('sources',resume?.source || 'none'))}</span></div>${jobs.length ? `<div class="sd-resume-timeline">${jobs.map(job => {
      const start = resumeMonth(job.startDate), end = job.current === true ? 'настоящее время' : resumeMonth(job.endDate);
      const period = start || end ? `${start || 'Начало не указано'} — ${end || 'окончание не указано'}` : 'Период не указан';
      const duration = resumeDuration(resumeJobMonths(job));
      const duties = paragraphs(job.responsibilities), achievements = paragraphs(job.achievements);
      return `<article class="sd-experience-item"><p class="sd-job-dates">${esc(period)}</p><h4>${esc(job.company || 'Компания не указана')}</h4>${job.industry ? `<p class="sd-job-industry">${esc(job.industry)}</p>` : ''}<p class="sd-job-role"><strong>${esc(job.role || 'Должность не указана')}</strong>${duration ? `<span> · ${esc(duration)}</span>` : ''}</p><div class="sd-job-description">${duties || `<p>${esc(job.text || 'Описание задач не указано в этом резюме.')}</p>`}</div>${achievements ? `<div class="sd-job-achievements"><h5>Результаты</h5>${achievements}</div>` : ''}</article>`;
    }).join('')}</div>` : '<p class="sd-resume-missing">Опыт не указан в этой версии резюме.</p>'}</section>`;
  }
  function renderResumeDetails(resume) {
    const education = Array.isArray(resume?.educationDetails) ? resume.educationDetails : [];
    const languages = Array.isArray(resume?.languages) ? resume.languages : [];
    const skills = Array.isArray(resume?.skills) ? resume.skills : [];
    return `<section class="sd-preview-section sd-resume-skills"><h3>Ключевые навыки</h3><div class="sd-preview-skills">${skills.map(skill => `<span>${esc(skill)}</span>`).join('') || '<p class="sd-resume-missing">Навыки не указаны в этом резюме.</p>'}</div></section><div class="sd-resume-details-grid"><section class="sd-resume-detail-card"><h3>Образование</h3>${education.length ? education.map(item => `<article class="sd-education-item">${item.level ? `<p class="sd-education-level">${esc(item.level)}</p>` : ''}<h4>${esc(item.institution || 'Учебное заведение не указано')}</h4>${item.faculty ? `<p>${esc(item.faculty)}</p>` : ''}${item.qualification ? `<p>${esc(item.qualification)}</p>` : ''}${item.year ? `<p class="sd-education-year">${esc(item.year)} г.</p>` : ''}</article>`).join('') : `<p class="sd-resume-missing">${esc(resume?.education || 'Образование не указано в этой версии резюме.')}</p>`}</section><section class="sd-resume-detail-card"><h3>Знание языков</h3>${languages.length ? `<ul class="sd-resume-languages">${languages.map(item => `<li><strong>${esc(item.name || 'Язык не указан')}</strong>${item.level ? ` — ${esc(item.level)}` : ' — уровень не указан'}</li>`).join('')}</ul>` : '<p class="sd-resume-missing">Языки не указаны в этой версии резюме.</p>'}</section></div>${resume?.about ? `<section class="sd-preview-section sd-resume-about"><h3>О себе</h3><p>${esc(resume.about)}</p></section>` : ''}`;
  }
  function renderPreview() {
    const preview = $('#sd-preview'), candidate = findCandidate(state.selectedCandidateId);
    if (!candidate) {
      preview.innerHTML = '<div class="sd-preview-empty"><div class="sd-preview-illustration" aria-hidden="true"><span></span><span></span><span></span></div><h2>Резюме всегда под рукой</h2><p>Выберите кандидата слева — здесь откроются его опыт, навыки и история подбора.</p></div>';
      preview.dataset.resumeKey = '';preview.scrollTop = 0;
      return;
    }
    const resume = candidate.resumes.find(item => item.id === state.selectedResumeId) || candidate.resumes[0];
    state.selectedResumeId = resume?.id || '';
    const resumeKey = `${candidate.id}:${state.selectedResumeId}`, changedDocument = preview.dataset.resumeKey !== resumeKey;
    const external = candidate.searchProvider === 'hh' && !candidate.importedToATS;
    const score = state.resultKind !== 'base' ? state.aiResults.find(item => item.candidateId === candidate.id) : null;
    preview.innerHTML = `${window.SearchPreviewHeader.render(candidate,resume,{external,score,selectedResumeId:state.selectedResumeId,esc,select,svg,portraitStyle,portraitFallback,labelFor,dateLabel,tagLabel})}
    <div class="sd-resume-document" aria-label="Содержание выбранного резюме">${renderResumeExperience(resume)}${renderResumeDetails(resume)}</div>
    <div class="sd-preview-ats-history"><section class="sd-preview-section"><h3>Процессы подбора <small>${external ? 'Неизвестны' : candidate.processes.length}</small></h3>${external ? '<p>Это внешнее деморезюме. История, метки и заметки ATS появятся только после явного добавления кандидата на вакансию.</p>' : candidate.processes.length ? candidate.processes.map(process => `<div class="sd-profile-process"><div><b>${esc(process.title || vacancies.find(vacancy => vacancy.id === process.vacancyId)?.title || 'Вакансия')}</b><small>${esc(process.stage)}</small></div>${button('Открыть на вакансии','candidate-route','',`data-id="${esc(candidate.id)}" data-route="vacancy/${esc(process.vacancyId)}"`)}</div>`).join('') : '<p>Нет активных процессов.</p>'}</section>${!external ? `<section class="sd-preview-section"><h3>Метки и комментарии</h3><div class="sd-preview-skills">${(candidate.tags || []).map(tag => `<span>${esc(tagLabel(tag))}</span>`).join('') || '<p>Меток пока нет.</p>'}</div>${candidate.feedback ? `<p style="margin-top:12px">${esc(candidate.feedback)}</p>` : ''}</section>` : ''}</div>
    <footer class="sd-preview-footer"><small>Демопрофиль и фото вымышлены</small>${button(external ? 'Добавить на вакансию' : 'Взять на вакансию','assign','green',`data-id="${esc(candidate.id)}"`)}</footer>`;
    preview.dataset.resumeKey = resumeKey;
    if (changedDocument) preview.scrollTop = 0;
  }
  function assignmentBody(candidate, config) {
    const vacancy = vacancies.find(item => item.id === config.vacancyId);
    return `<div class="sd-dialog-fields"><label class="sd-field">Вакансия<input class="sd-input" id="sd-vacancy-filter" aria-label="Найти вакансию" placeholder="Найти вакансию"><select class="sd-select" id="sd-assign-vacancy" aria-label="Вакансия">${options(vacancies.map(item => ({id:item.id,label:item.title})),config.vacancyId,'Выберите вакансию')}</select></label>${select('Начальный этап',(vacancy?.stages || []).map(stage => typeof stage === 'string' ? {id:stage,label:stage} : {id:stage.id || stage.name,label:stage.label || stage.name}),config.initialStage,'id="sd-assign-stage"','Первый этап вакансии')}<p class="sd-help">Пусто — первый свой этап воронки вакансии. Настройки ИИ-этапов и автоматизаций здесь не меняются.</p>${select('Резюме',candidate.resumes.map(item => ({id:item.id,label:`${item.title} · ${labelFor('sources',item.source)}`})),config.resumeId,'id="sd-assign-resume"')}<p class="sd-help">${candidate.searchProvider === 'hh' && !candidate.importedToATS ? 'После подтверждения внешнее деморезюме будет добавлено в вашу демонстрационную базу и на выбранную вакансию. Реальный импорт из hh.ru не выполняется.' : 'Добавление создаёт только демонстрационный процесс в этом макете. Профиль остаётся единым.'}</p></div>`;
  }
  function openAssignment(id, config = {}) {
    const candidate = findCandidate(id); if (!candidate) return;
    const draft = {vacancyId:'',initialStage:'',resumeId:state.selectedCandidateId === id && candidate.resumes.some(resume => resume.id === state.selectedResumeId) ? state.selectedResumeId : candidate.resumes[0]?.id || '', ...config};
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
    const errors = M.validateAssignment([overlay.candidateId],config.vacancyId,config.initialStage,{[overlay.candidateId]:config.resumeId},allCandidates());
    const candidate = findCandidate(overlay.candidateId);
    const duplicate = candidate?.processes.some(process => process.vacancyId === config.vacancyId);
    $('[data-sd-action="assign-confirm"]',dialog).disabled = !config.vacancyId || errors.length > 0 || duplicate;
    if (duplicate) showErrors(['Кандидат уже находится в активном процессе этой вакансии.']); else showErrors([]);
  }
  function bulkAssignmentConfig() {
    const resumeIds = {...overlay.draft.resumeIds};
    dialog.querySelectorAll('[data-sd-bulk-resume]').forEach(node => {resumeIds[node.dataset.sdBulkResume] = node.value;});
    return {vacancyId:$('#sd-bulk-vacancy',dialog)?.value || '',initialStage:$('#sd-bulk-stage',dialog)?.value || '',resumeIds};
  }
  function openBulkAssignment(ids = [...selectedCandidateIds], config = {}) {
    const candidates = [...new Set(ids)].map(findCandidate);
    if (!candidates.length || candidates.some(item => !item)) {toast('Выберите кандидатов из текущей выдачи.');return;}
    const resumeIds = Object.fromEntries(candidates.map(candidate => [candidate.id,state.selectedCandidateId === candidate.id && candidate.resumes.some(resume => resume.id === state.selectedResumeId) ? state.selectedResumeId : candidate.resumes[0]?.id || '']));
    const draft = {vacancyId:'',initialStage:'',...config,resumeIds:{...resumeIds,...config.resumeIds}};
    const vacancy = vacancies.find(item => item.id === draft.vacancyId);
    const body = `<div class="sd-dialog-fields">${select('Вакансия',vacancies.map(item => ({id:item.id,label:item.title})),draft.vacancyId,'id="sd-bulk-vacancy"','Выберите вакансию')}${select('Начальный этап',(vacancy?.stages || []).map(stage => typeof stage === 'string' ? {id:stage,label:stage} : {id:stage.id || stage.name,label:stage.label || stage.name}),draft.initialStage,'id="sd-bulk-stage"','Первый этап вакансии')}<p class="sd-help">Один этап для всей группы. Для каждого кандидата выберите его собственное резюме.</p><div class="sd-bulk-candidates">${candidates.map(candidate => `<section class="sd-bulk-candidate" data-sd-bulk-id="${esc(candidate.id)}"><strong>${esc(candidate.name)}</strong>${select(`Резюме: ${candidate.name}`,candidate.resumes.map(resume => ({id:resume.id,label:resume.title})),draft.resumeIds[candidate.id],`data-sd-bulk-resume="${esc(candidate.id)}"`)}<small data-sd-bulk-status></small></section>`).join('')}</div><p class="sd-bulk-summary" id="sd-bulk-summary" aria-live="polite">Выберите вакансию, чтобы проверить группу.</p><p class="sd-help">Уже добавленных на эту вакансию пропустим, без дублей.${candidates.some(candidate => candidate.searchProvider === 'hh' && !candidate.importedToATS) ? ' Внешние деморезюме будут импортированы в демонстрационную базу только после подтверждения.' : ''} Реальная ATS и hh.ru не меняются.</p></div>`;
    openDialog('bulk-assign','Добавить группу на вакансию',`Выбрано ${candidates.length} ${plural(candidates.length,['кандидат','кандидата','кандидатов'])}`,body,`${button('Отмена','close')}${button('Добавить кандидатов','bulk-confirm','primary','disabled')}`,{candidateIds:candidates.map(candidate => candidate.id),draft});
    $('#sd-bulk-stage',dialog).disabled = !draft.vacancyId;
    updateBulkAssignment();
  }
  function updateBulkAssignment() {
    if (overlay?.kind !== 'bulk-assign') return;
    const config = bulkAssignmentConfig();overlay.draft = config;
    const preview = M.previewBulkAssignment(overlay.candidateIds.map(findCandidate),config,vacancies);
    $('[data-sd-action="bulk-confirm"]',dialog).disabled = !config.vacancyId || !!preview.errors.length;
    $('#sd-bulk-summary',dialog).textContent = config.vacancyId ? `Добавим: ${preview.eligible.length} · Пропустим: ${preview.skipped.length}` : 'Выберите вакансию, чтобы проверить группу.';
    dialog.querySelectorAll('[data-sd-bulk-id]').forEach(node => {
      const skipped = preview.skipped.find(item => item.candidateId === node.dataset.sdBulkId);
      $('[data-sd-bulk-status]',node).textContent = skipped ? skipped.reason : config.vacancyId && !preview.errors.length ? 'Будет добавлен' : '';
    });
    showErrors(config.vacancyId ? preview.errors : []);
  }
  function commitDemoAssignment(item) {
    let candidate = findCandidate(item.candidateId);
    if (candidate.searchProvider === 'hh' && !candidate.importedToATS) {candidate = {...clone(candidate),importedToATS:true,internalHistoryAvailable:true};localCandidates.push(candidate);}
    candidate.processes.push({vacancyId:item.vacancyId,title:item.vacancyTitle,stage:item.stage});state.assignments.push(item);
    if (candidate.searchProvider === 'hh') Object.assign(localHhCandidates.find(external => external.id === candidate.id) || {},clone(candidate));
  }
  function openAutopick(config = {}) {
    const draft = {...M.defaultAutoPick(),vacancyId:vacancies[0]?.id || '',...config};
    const vacancy = vacancies.find(item => item.id === draft.vacancyId);
    draft.initialStage = vacancy?.initialStage || '';
    if (vacancy && !draft.criteria.length) draft.criteria = clone(vacancy.criteria);
    openDialog('autopick','Поиск по вакансии','Соберём критерии из описания и требований вакансии.',`<div class="sd-dialog-fields">${select('Вакансия',vacancies.map(item => ({id:item.id,label:item.title})),draft.vacancyId,'id="sd-auto-vacancy"')}<label class="sd-field">Где искать<select class="sd-select" aria-label="Источник подборки" disabled><option>${esc(providerName())}</option></select></label><div class="sd-form-two"><label class="sd-field">Минимальное соответствие, %<input class="sd-input" id="sd-auto-threshold" aria-label="Минимальное соответствие" type="number" min="0" max="100" value="${esc(draft.threshold)}"></label><label class="sd-field">Сколько подходящих найти<input class="sd-input" id="sd-auto-target" aria-label="Сколько подходящих найти" type="number" min="1" max="1000" value="${esc(draft.target)}"></label></div><p class="sd-help">Проверяем базу порциями до нужного количества. Подборка остановится, если закончится база, будет достигнут дневной лимит оценок или пройдено 15 попыток.</p><div><span class="sd-field">Критерии подборки</span>${vacancy ? `<div class="sd-criteria-list">${vacancy.criteria.map(criterion => `<label><input type="checkbox" data-sd-auto-criterion="${esc(criterion.id)}"${draft.criteria.some(item => item.id === criterion.id) ? ' checked' : ''}>${esc(criterion.text)}</label>`).join('')}</div>` : '<p class="sd-help">Выберите вакансию, чтобы увидеть критерии.</p>'}</div><div class="sd-counter-box">Сегодня осталось <strong>${1000-state.usedToday}</strong> демооценок</div><p class="sd-help">Поиск в макете работает только с вымышленными данными, без отправки во внешние сервисы.</p></div>`, `${button('Отмена','close')}${button('Сформировать подборку','autopick-run','purple','disabled')}`, {draft});
    updateAutopick();
  }
  function autopickConfig() {
    const vacancyId = $('#sd-auto-vacancy',dialog)?.value || '', vacancy = vacancies.find(item => item.id === vacancyId);
    const selected = new Set([...dialog.querySelectorAll('[data-sd-auto-criterion]:checked')].map(input => input.dataset.sdAutoCriterion));
    return {...overlay.draft,vacancyId,initialStage:vacancy?.initialStage || '',threshold:$('#sd-auto-threshold',dialog)?.value,target:$('#sd-auto-target',dialog)?.value,criteria:clone((vacancy?.criteria || []).filter(item => selected.has(item.id)))};
  }
  function updateAutopick() {if (overlay?.kind === 'autopick') $('[data-sd-action="autopick-run"]',dialog).disabled = M.validateAutoPick(autopickConfig()).length > 0 || state.usedToday >= 1000;}
  function openAssembled(criteria, origin = 'ai', parsedOverride = null, config = {}) {
    const parsed = parsedOverride || M.parseAiQuery(state.aiPrompt);
    const draft = clone(criteria || parsed.criteria || []);
    const required = draft.filter(item => item.required !== false), desired = draft.filter(item => item.required === false);
    const valid = origin === 'resume' ? draft.length > 0 : required.length > 0;
    const target = M.positiveInteger(config.target) && Number(config.target) <= 1000 ? Number(config.target) : 20;
    openDialog('assembled',origin === 'resume' ? 'Найдём похожих по навыкам' : 'Проверьте условия поиска','Запрос собран локально — это демонстрация.',`<div class="sd-simulate-head"><span class="sd-chip">${origin === 'resume' ? 'Поиск по резюме' : 'AI поиск'} · Демо</span></div>${(parsed.warnings || []).length ? `<p class="sd-warning">${parsed.warnings.map(esc).join('<br>')}</p>` : ''}${origin === 'resume' ? '<p class="sd-help">Сравниваем распознанные профессиональные навыки. В демо показываем резюме с соответствием от 60%. Личные данные файла не используются.</p>' : `<h3 class="sd-subtitle" style="margin-top:0">Обязательные условия</h3><ul class="sd-assembled-list">${required.map(item => `<li>${esc(item.text)}</li>`).join('') || '<li>Рабочие условия не распознаны — уточните запрос.</li>'}</ul>`}<h3 class="sd-subtitle">${origin === 'resume' ? 'Навыки для сравнения' : 'Желательные условия'}</h3>${desired.length ? `<ul class="sd-assembled-list">${desired.map(item => `<li>${esc(item.text)}</li>`).join('')}</ul>` : '<p class="sd-help">Желательных условий модель не нашла.</p>'}<h3 class="sd-subtitle">Где искать</h3><span class="sd-chip">${esc(providerName())}</span><label class="sd-field" style="margin-top:18px">Сколько подходящих найти<input class="sd-input" id="sd-ai-target" aria-label="Сколько подходящих найти" type="number" min="1" max="1000" value="${target}"></label><p class="sd-help">Проверяем базу порциями до нужного количества, исчерпания базы, дневного лимита или 15 попыток.${origin === 'ai' ? ' Кандидат должен пройти все обязательные условия.' : ''}</p><div class="sd-counter-box" style="margin-top:15px">Сегодня осталось <strong>${1000-state.usedToday}</strong> демооценок</div>`,`${button('Отмена','close')}${button('Запустить поиск','ai-run','purple',!valid || parsed.uncertain || state.usedToday >= 1000 ? 'disabled' : '')}`, {draft,origin,uncertain:parsed.uncertain});
  }
  function openResumeSearch() {
    openDialog('resume','Поиск по резюме','Загрузите резюме — найдём похожие профессиональные профили.',`<div class="sd-resume-upload">${svg('list')}<h3>Выберите резюме</h3><input type="file" id="sd-resume-file" accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Загрузить резюме"><p class="sd-help">TXT анализируется только в вашем браузере. Файл и его полный текст нигде не сохраняются и не отправляются.</p></div><div id="sd-upload-summary" class="sd-upload-summary" aria-live="polite"><p>Для проверки сценария можно использовать вымышленный образец.</p></div>`,`${button('Использовать деморезюме','resume-example')}${button('Отмена','close')}${button('Проверить условия','resume-assemble','purple','disabled')}`,{parsed:null,readToken:null});
  }
  function renderUploadSummary(parsed, message) {
    const area = $('#sd-upload-summary',dialog); if (!area) return;
    area.innerHTML = `<p>${esc(message)}</p>${parsed ? `<b>Распознано ${parsed.terms.length} ${plural(parsed.terms.length,['навык','навыка','навыков'])}</b><div class="sd-upload-terms">${parsed.terms.map(term => `<span>${esc(term)}</span>`).join('')}</div>${parsed.warnings.length ? `<p class="sd-warning">${parsed.warnings.map(esc).join('<br>')}</p>` : ''}${parsed.uncertain ? '<p>Не удалось собрать достаточно рабочих условий. Используйте деморезюме или TXT с известными навыками.</p>' : ''}` : ''}`;
    $('[data-sd-action="resume-assemble"]',dialog).disabled = !parsed?.criteria.length || parsed.uncertain;
  }
  async function readResumeFile(input) {
    if (overlay?.kind !== 'resume') return;
    const file = input.files?.[0], token = {};
    overlay.parsed = null;overlay.readToken = token;
    if (!file) {renderUploadSummary(null,'Файл не выбран.');return;}
    if (!/\.txt$/i.test(file.name)) {renderUploadSummary(null,'Файл выбран. В демо чтение PDF/DOCX не подключено. Нажмите «Использовать деморезюме», чтобы проверить поиск на вымышленном образце.');return;}
    if (file.size > 1048576) {renderUploadSummary(null,'Для локальной демонстрации выберите TXT размером до 1 МБ.');return;}
    renderUploadSummary(null,'Читаем TXT локально…');
    try {
      const text = await file.text();
      if (overlay?.kind !== 'resume' || overlay.readToken !== token) return;
      const parsed = M.parseResumeQuery(text);
      overlay.parsed = parsed;renderUploadSummary(parsed,'Профессиональные навыки извлечены локально. Полный текст и название файла не сохраняются.');
    } catch (_) {if (overlay?.kind === 'resume' && overlay.readToken === token) renderUploadSummary(null,'Не получилось прочитать TXT. Попробуйте другой файл или деморезюме.');}
  }
  const hasBaseCondition = () => state.searchProvider !== 'ats' || state.queries.some(query => query.text.trim()) || state.employment !== 'all' || state.tags.length || state.source !== 'all' || state.period !== 'all';
  function runSearch(showHint = true, clearSelection = true) {if (clearSelection) selectedCandidateIds.clear();if (state.mode !== 'base') switchMode('base');submittedBaseQuery = M.normalizeState(state);state.started = !!hasBaseCondition(); state.resultKind = 'base'; state.page = 1; state.autoSummary = null; renderModes();renderBase();renderResults(); persist(); if (!state.started && showHint) toast('Введите запрос или выберите фильтр.');}
  function providerAfterToggle(provider) {
    if (!['ats','hh'].includes(provider)) return state.searchProvider;
    if (state.searchProvider === 'both') return provider === 'ats' ? 'hh' : 'ats';
    return state.searchProvider === provider ? state.searchProvider : 'both';
  }
  function switchProvider(provider, confirmed = false) {
    if (!['ats','hh','both'].includes(provider) || state.searchProvider === provider) return;
    const wasExternal = state.searchProvider !== 'ats', willExternal = provider !== 'ats';
    const unsupported = state.employment !== 'all' || state.tags.length || state.excludeTags || state.source !== 'all' || state.queries.some(query => query.scope === 'feedback' && query.text.trim());
    if (!wasExternal && willExternal && unsupported && !confirmed) {
      openDialog('provider-confirm','Добавить hh.ru в поиск?','Во внешней выдаче нет меток, занятости и комментариев вашей ATS.', '<p>Для совместного поиска временно уберём условия по истории ATS и источнику резюме. Строки по комментариям будут искать во всех данных резюме. Это расширит запрос.</p><p class="sd-help">Условия ATS сохраним и вернём при отключении hh.ru. Неизменённые строки по комментариям также восстановятся. Можно отменить и оставить текущий поиск.</p>',`${button('Оставить текущий поиск','close')}${button('Продолжить по общим условиям','provider-confirm','primary')}`,{provider});
      return;
    }
    if (searchRun && !searchRun.done) finishRun('cancelled');
    if (!wasExternal && willExternal) {
      state.queries.forEach(query => {if (!query.runtimeId) query.runtimeId = `row-${Date.now()}-${++querySequence}`;});
      state.atsFilters = {employment:state.employment,tags:clone(state.tags),excludeTags:state.excludeTags,source:state.source,feedbackRows:clone(state.queries.filter(query => query.scope === 'feedback'))};
      state.employment = 'all';state.tags = [];state.excludeTags = false;state.source = 'all';
      state.queries.forEach(query => {if (query.scope === 'feedback') query.scope = 'all';});
    } else if (wasExternal && !willExternal && state.atsFilters) {
      const {feedbackRows = [],...filters} = state.atsFilters;Object.assign(state,clone(filters));
      feedbackRows.forEach(row => {const query = state.queries.find(item => item.runtimeId === row.runtimeId);if (query && query.text === row.text && query.condition === row.condition && query.join === row.join && query.scope === 'all') query.scope = 'feedback';});
      state.atsFilters = null;
    }
    selectedCandidateIds.clear();
    state.searchProvider = provider;state.mode = 'base';state.selectedCandidateId = '';state.selectedResumeId = '';
    state.modeResults = {base:emptyResult('base'),ai:emptyResult('ai')};Object.assign(state,emptyResult('base'));
    renderAll();runSearch(false);
  }
  function syncRunResult(summary = null) {
    const record = {started:true,resultKind:searchRun.kind,page:1,aiResults:clone(searchRun.items),autoSummary:summary};
    state.modeResults[searchRun.mode] = record;
    if (state.mode === searchRun.mode) Object.assign(state,record);
  }
  function finishRun(reason) {
    clearTimeout(runTimer); if (!searchRun) return;
    searchRun.done = true;
    const summary = {processed:searchRun.processed,accepted:searchRun.items.length,excluded:searchRun.excluded,stopReason:reason,target:searchRun.target,vacancyId:searchRun.vacancyId,searchProvider:searchRun.searchProvider};
    syncRunResult(summary);
    const history = state.autoHistory.find(item => item.id === state.autoHistoryId);
    if (searchRun.kind === 'auto' && history) {history.results = clone(searchRun.items); history.summary = clone(summary); history.status = reason === 'cancelled' ? 'остановлена' : 'завершена';}
    renderResults(); persist();
  }
  function tickRun() {
    if (!searchRun || searchRun.done || searchRun.paused) return;
    for (let count = 0; count < 3 && searchRun.processed < searchRun.dataset.length; count++) {
      if (state.usedToday >= 1000) {finishRun('dailyLimit');return;}
      state.usedToday++;
      const candidate = searchRun.dataset[searchRun.processed++];
      if (searchRun.kind === 'auto' && candidate.processes.some(process => process.vacancyId === searchRun.vacancyId)) continue;
      if (/без активного процесса|без активных процессов/i.test(searchRun.prompt) && candidate.internalHistoryAvailable && candidate.processes.length) continue;
      const scored = M.scoreCandidate(candidate,searchRun.criteria);
      if (scored.score !== null && scored.score >= searchRun.threshold && (searchRun.kind === 'auto' || scored.explanations.every(item => !item.required || item.status === 'met'))) searchRun.items.push({candidateId:candidate.id,...scored});
      else searchRun.excluded++;
      if (searchRun.items.length >= searchRun.target) {finishRun('target'); return;}
    }
    const history = state.autoHistory.find(item => item.id === state.autoHistoryId);
    if (searchRun.kind === 'auto' && history) {history.results = clone(searchRun.items);history.summary = {processed:searchRun.processed,accepted:searchRun.items.length,excluded:searchRun.excluded,stopReason:'',target:searchRun.target,vacancyId:searchRun.vacancyId};}
    if (searchRun.processed >= searchRun.dataset.length) {finishRun('datasetEnd'); return;}
    if (state.usedToday >= 1000) {finishRun('dailyLimit'); return;}
    if (searchRun.processed >= 300) {finishRun('batchLimit'); return;}
    syncRunResult(); if (state.mode === searchRun.mode) renderResults(); persist(); runTimer = setTimeout(tickRun,220);
  }
  function runAi(criteria, target, kind = 'ai', config = {}) {
    if (state.usedToday >= 1000) {showErrors(['Дневной лимит демонстрационных оценок исчерпан.']);return;}
    if (searchRun && !searchRun.done) finishRun('cancelled');
    if (state.mode !== 'ai') switchMode('ai');
    state.aiCriteria = clone(criteria);state.aiOrigin = kind;state.aiSearchConfig = {vacancyId:config.vacancyId || '',threshold:Number(config.threshold || 0),target:Number(target)};
    if (kind === 'resume') state.aiPrompt = criteria.map(criterion => criterion.text).join(', ');
    else if (kind === 'auto') state.aiPrompt = `${vacancies.find(vacancy => vacancy.id === config.vacancyId)?.title || 'Вакансия'}: ${criteria.map(criterion => criterion.text).join('; ')}`;
    state.started = true; state.resultKind = kind; state.page = 1; state.autoSummary = null; state.aiResults = [];
    searchRun = {criteria:clone(criteria),target:Number(target),kind,mode:'ai',searchProvider:state.searchProvider,dataset:currentDataset(),items:[],threshold:Number(config.threshold || 0),vacancyId:config.vacancyId || '',processed:0,excluded:0,prompt:kind === 'auto' || kind === 'resume' ? '' : state.aiPrompt,done:false,paused:false};
    if (kind === 'auto') {
      const timestamp = new Date(), id = `auto-${timestamp.getTime()}`;
      state.autoHistoryId = id; state.autoHistory.unshift({id,dateLabel:timestamp.toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),threshold:searchRun.threshold,target:searchRun.target,vacancyId:searchRun.vacancyId,searchProvider:searchRun.searchProvider,status:'идёт',results:[],summary:null});
    }
    closeDialog();state.showAiEditor = false;renderModes();renderBase();renderResults();persist(); runTimer = setTimeout(tickRun,220);
  }
  document.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-sd-query="text"]')) {state.queries[Number(target.closest('[data-sd-row]').dataset.sdRow)].text = target.value; persist();}
    else if (target.id === 'sd-ai-prompt') {state.aiPrompt = target.value;state.aiOrigin = 'ai';state.aiCriteria = [];state.aiSearchConfig = {}; $('[data-sd-action="assemble-ai"]',workspace).disabled = !target.value.trim(); persist();}
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
    else if (target.hasAttribute('data-sd-check-candidate')) {
      const id = target.dataset.sdCheckCandidate;if (target.checked) selectedCandidateIds.add(id);else selectedCandidateIds.delete(id);renderResults();
      [...results.querySelectorAll('[data-sd-check-candidate]')].find(node => node.dataset.sdCheckCandidate === id)?.focus?.();
    }
    else if (target.hasAttribute('data-sd-select-page')) {results.querySelectorAll('[data-sd-candidate]').forEach(node => {if (target.checked) selectedCandidateIds.add(node.dataset.sdCandidate);else selectedCandidateIds.delete(node.dataset.sdCandidate);});renderResults();$('[data-sd-select-page]',results)?.focus?.();}
    else if (target.id === 'sd-resume-file') readResumeFile(target);
    else if (target.id === 'sd-preview-resume') {state.selectedResumeId = target.value;renderPreview();persist();}
    else if (target.dataset.sdState) {
      const key = target.dataset.sdState;
      state[key] = target.type === 'checkbox' ? target.checked : key === 'pageSize' ? Number(target.value) : target.value;
      state.page = 1; if (state.mode === 'base' && !['sort','pageSize'].includes(key)) runSearch(false); else {renderResults();persist();}
    } else if (target.dataset.sdTag) {
      state.tags = target.checked ? [...new Set([...state.tags,target.dataset.sdTag])] : state.tags.filter(id => id !== target.dataset.sdTag);
      if (!state.tags.length) state.excludeTags = false;
      const picker = target.closest('.sd-tag-picker'); $('summary',picker).textContent = state.tags.length ? state.tags.map(tagLabel).join(', ') : 'Все метки';
      $('[data-sd-state="excludeTags"]',workspace).disabled = !state.tags.length; $('[data-sd-state="excludeTags"]',workspace).checked = state.excludeTags;
      state.page = 1; runSearch(false);
    } else if (target.id === 'sd-assign-vacancy') {
      const config = assignmentConfig(); config.initialStage = ''; const id = overlay.candidateId; openAssignment(id,config); $('#sd-assign-vacancy',dialog).focus();
    } else if (target.id === 'sd-assign-stage' || target.id === 'sd-assign-resume') updateAssignment();
    else if (target.id === 'sd-bulk-vacancy') {const config = bulkAssignmentConfig();config.initialStage = '';openBulkAssignment(overlay.candidateIds,config);$('#sd-bulk-vacancy',dialog).focus();}
    else if (target.id === 'sd-bulk-stage' || target.hasAttribute('data-sd-bulk-resume')) updateBulkAssignment();
    else if (target.id === 'sd-auto-vacancy') {const config = autopickConfig(); config.criteria = []; openAutopick(config); $('#sd-auto-vacancy',dialog).focus();}
    else if (target.dataset.sdAutoCriterion) updateAutopick();
    else if (target.hasAttribute('data-sd-history')) {
      if (searchRun && !searchRun.done) finishRun('cancelled');
      const history = state.autoHistory.find(item => item.id === target.value); if (!history) return;
      selectedCandidateIds.clear();
      state.autoHistoryId = history.id;state.searchProvider = history.searchProvider || 'ats';state.aiResults = clone(history.results); state.autoSummary = clone(history.summary); state.page = 1; state.started = true; state.resultKind = 'auto';renderBase(); renderResults(); persist();
    }
  });
  document.addEventListener('click', event => {
    const route = event.target.closest('[data-sd-route]');
    if (route && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {event.preventDefault(); persist(); navigate(route.dataset.sdRoute); return;}
    const control = event.target.closest('[data-sd-action]');
    if (!control) {
      const candidate = event.target.closest('[data-sd-candidate]');
      if (candidate && !event.target.closest('button,a,input,select,textarea,label,details') && !window.getSelection()?.toString()) openProfile(candidate.dataset.sdCandidate);
      return;
    }
    if (control.disabled) return;
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
    else if (action === 'provider') {const provider = providerAfterToggle(control.dataset.provider);if (provider === state.searchProvider) toast('Оставьте хотя бы один источник поиска.');else switchProvider(provider);}
    else if (action === 'provider-confirm') {const provider = overlay?.provider;if (overlay?.kind !== 'provider-confirm') return;closeDialog();switchProvider(provider,true);}
    else if (action === 'open-ai') {state.showAiEditor = true;switchMode('ai');$('#sd-ai-prompt',workspace)?.focus();persist();}
    else if (action === 'hide-ai') {state.showAiEditor = false;renderBase();$('[data-sd-action="open-ai"]',workspace)?.focus();persist();}
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
      selectedCandidateIds.clear();state.atsFilters = null;
      Object.assign(state,restored);
      submittedBaseQuery = M.normalizeState(state);
      Object.assign(state,emptyResult(state.mode === 'ai' ? 'ai' : 'base'));
      if (state.mode === 'base') state.started = !!hasBaseCondition();
      state.showAiEditor = state.mode === 'ai' && state.aiOrigin === 'ai';
      closeDialog(); renderAll(); toast('Локальный демозапрос восстановлен вместе с фильтрами.');
    } else if (action === 'saved-delete') {state.savedSearches = state.savedSearches.filter(item => item.id !== control.dataset.id); persist(); openSaved();}
    else if (action === 'profile') openProfile(control.dataset.id);
    else if (action === 'clear-preview') {state.selectedCandidateId = '';state.selectedResumeId = '';renderResults();persist();}
    else if (action === 'assign') openAssignment(control.dataset.id);
    else if (action === 'bulk-clear') {selectedCandidateIds.clear();renderResults();}
    else if (action === 'bulk-assign') openBulkAssignment();
    else if (action === 'bulk-confirm') {
      if (overlay?.kind !== 'bulk-assign') return;
      const preview = M.previewBulkAssignment(overlay.candidateIds.map(findCandidate),bulkAssignmentConfig(),vacancies);
      if (preview.errors.length) {showErrors(preview.errors);return;}
      preview.eligible.forEach(commitDemoAssignment);
      selectedCandidateIds.clear();closeDialog();renderBase();renderResults();persist();
      toast(`Добавлено ${preview.eligible.length} · пропущено ${preview.skipped.length}. Только в демонстрационном макете.`);
    }
    else if (action === 'assign-confirm') {
      const config = assignmentConfig();let candidate = findCandidate(overlay.candidateId);
      const preview = M.previewAssignment([overlay.candidateId],config.vacancyId,config.initialStage,{[overlay.candidateId]:config.resumeId},allCandidates());
      if (preview.errors.length || candidate.processes.some(process => process.vacancyId === config.vacancyId)) {showErrors(preview.errors.length ? preview.errors : ['Кандидат уже добавлен на эту вакансию.']); return;}
      const item = preview.items[0]; if (!item) return;
      commitDemoAssignment(item);
      closeDialog();renderBase();renderResults();persist();toast('Демонстрационный процесс добавлен. Реальная ATS не менялась.');
    } else if (action === 'candidate-route') {
      const candidate = findCandidate(control.dataset.id || overlay?.candidateId || state.selectedCandidateId);
      const process = candidate?.processes.find(item => item.vacancyId === control.dataset.route.split('/')[1]);
      if (dialog.open) closeDialog();persist();
      if (candidate && process && window.parent !== window && window.parent.SearchCandidateHandoff?.open(clone(candidate),clone(process))) return;
      navigate(control.dataset.route);
    }
    else if (action === 'autopick') openAutopick();
    else if (action === 'resume-search') openResumeSearch();
    else if (action === 'resume-example') {
      if (overlay?.kind !== 'resume') return;
      overlay.readToken = null;overlay.parsed = M.parseResumeQuery('Android-разработчик\nНавыки: Kotlin, Android, Jetpack Compose, Coroutines, REST API');
      $('#sd-resume-file',dialog).value = '';renderUploadSummary(overlay.parsed,'Используется вымышленное деморезюме Android-разработчика. Это не результат чтения PDF/DOCX.');
    } else if (action === 'resume-assemble') {
      if (overlay?.kind !== 'resume' || !overlay.parsed?.criteria.length || overlay.parsed.uncertain) return;
      const parsed = clone(overlay.parsed);openAssembled(parsed.criteria,'resume',parsed);
    }
    else if (action === 'autopick-run') {
      const config = autopickConfig(), errors = M.validateAutoPick(config); if (errors.length) {showErrors(errors); return;}
      runAi(config.criteria,config.target,'auto',config);
    } else if (action === 'stop-run') {finishRun('cancelled'); toast('Локальная подборка остановлена. Найденные результаты сохранены.');}
    else if (action === 'pause-run') {
      if (!searchRun || searchRun.done) return;
      searchRun.paused = !searchRun.paused;clearTimeout(runTimer);
      const history = state.autoHistory.find(item => item.id === state.autoHistoryId);if (searchRun.kind === 'auto' && history) history.status = searchRun.paused ? 'пауза' : 'идёт';
      renderResults();persist();if (!searchRun.paused) runTimer = setTimeout(tickRun,220);
    }
    else if (action === 'exclude-auto') {
      state.aiResults = state.aiResults.filter(item => item.candidateId !== control.dataset.id);
      if (searchRun && !searchRun.done && searchRun.mode === state.mode) searchRun.items = clone(state.aiResults);
      const history = state.autoHistory.find(item => item.id === state.autoHistoryId); if (history) {history.results = clone(state.aiResults); if (history.summary) history.summary.accepted = state.aiResults.length;}
      if (state.autoSummary) state.autoSummary.accepted = state.aiResults.length;
      renderResults(); persist(); toast('Кандидат исключён только из этой демоподборки. Профиль и процессы не изменены.');
    } else if (action === 'example') {state.aiPrompt = promptExamples[Number(control.dataset.index)][1]; renderAi(); $('#sd-ai-prompt',workspace).focus(); persist();}
    else if (action === 'ai-vacancy') openAutopick();
    else if (action === 'assemble-ai') openAssembled();
    else if (action === 'review-recipe') {
      if (state.aiOrigin === 'auto') openAutopick({...state.aiSearchConfig,criteria:clone(state.aiCriteria)});
      else if (state.aiOrigin === 'resume') openAssembled(state.aiCriteria,'resume',{criteria:clone(state.aiCriteria),warnings:[],uncertain:false},state.aiSearchConfig);
      else openAssembled(undefined,'ai',null,state.aiSearchConfig);
    }
    else if (action === 'ai-run') {
      const criteria = overlay.draft, origin = overlay.origin || 'ai',target = $('#sd-ai-target',dialog)?.value;
      if (!criteria.length || overlay.uncertain || !M.positiveInteger(target) || Number(target) > 1000) {showErrors(['Уточните рабочие требования и укажите количество от 1 до 1000.']); return;}
      runAi(criteria,target,origin,origin === 'resume' ? {threshold:60} : {});
    } else if (action === 'close') closeDialog();
  });
  document.addEventListener('keydown', event => {
    if (['Enter',' '].includes(event.key) && event.target.matches('[data-sd-candidate]')) {event.preventDefault();openProfile(event.target.dataset.sdCandidate);}
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
