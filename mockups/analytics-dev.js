/* Кликабельная локальная копия аналитики Dev. Шаблоны взяты из DOM стенда. */
(() => {
  'use strict';
  const S = window.AnalyticsDevSnapshots || {};
  const storageKey = 'sobesso-analytics-dev-copy-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const cls = part => `[class*="Analytics_${part}__"]`;
  const text = node => node?.textContent.trim() || '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse = html => { const template = document.createElement('template'); template.innerHTML = html || ''; return template.content; };
  const raw = value => typeof value === 'string' ? value : Array.isArray(value) ? value.join('') : value?.dialogs?.join('') || value?.html || value?.bodyHTML || '';
  const snapshot = key => raw(S.overlays?.[key] || S.filters?.[key] || S[key]);
  const today = () => new Date().toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
  const initialMain = $('#ats-screen');
  if (!initialMain) return;
  const dashboard = raw(S.dashboard) || initialMain.outerHTML;
  const base = parse(dashboard);
  const baseFilters = $(cls('filterbar'), base)?.outerHTML || '';
  const articleFor = (root, name) => $$('article', root).find(article => text($('h2', article)) === name);
  const initialSource = articleFor(base, 'Эффективность источников')?.outerHTML || '';
  const initialFunnel = articleFor(base, 'Конверсии из этапа в этап')?.outerHTML || '';
  const read = () => { try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (_) { return null; } };
  let state = read() || {filters:{period:'Текущий квартал', recruiter:'', department:'', manager:'', from:'', to:''}, pins:{}, metrics:null, exports:[]};
  state.filters ||= {period:'Текущий квартал', recruiter:'', department:'', manager:'', from:'', to:''};
  state.pins ||= {}; state.exports ||= [];
  let sourceView = 'Диаграмма', funnelView = 'Диаграмма', formMetric = null, formDraft = null;
  let activeOverlay = null, overlayReturnFocus = null, activeDropdown = null, calendarStart = null, calendarDate = new Date(2026, 8, 1), calendarLimit = null;
  let manualDatePending = false, dateCommitTimer = null;
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {} };
  const seedCards = $$(cls('metricCard'), base).map((card, index) => ({
    id:`captured-${index}`, name:text($('b', card)), description:$$('small',card).length>2?text($$('small',card).at(-1)):'',
    value:text($(cls('metricValue'),card)), observations:Number(text($('small',card)).match(/\d+/)?.[0]||7), version:1, archived:false,
    formulaDisplay:text($$('small',card)[1]).replace(/ · версия \d+$/,''),
    fields:{'Название':text($('b',card)),'Что показывает и зачем':$$('small',card).length>2?text($$('small',card).at(-1)):'', 'Способ расчёта':'Доля дошедших', 'Из тех, у кого было':index ? 'Этап «Оффер»' : 'Вошёл на этап категории…', 'Сколько потом дошли до':'Оффер принят', 'Из тех, у кого было:detail':index?'':'Оффер'},
    visibility:'Все с доступом к аналитике', breakdowns:['vacancy','recruiter','source'], versions:[]
  }));
  if (!Array.isArray(state.metrics)) state.metrics = seedCards;
  // Новая визуальная версия использует отдельный, согласованный демогод.
  // Пользовательские метрики, закрепления и журнал не сбрасываются.
  if (window.AnalyticsDemo && state.demoRevision !== 1) {
    state.filters = {...state.filters, period:'Последний год', from:'', to:''};
    state.demoRevision = 1;
  }
  state.localFilters ||= {};
  state.sourceDisplay ||= {};
  state.dynamics ||= {};
  const redesignViews = {};
  let recruiterMetric = state.recruiterMetric === 'activity' ? 'activity' : 'hires';
  const demoData = (local = {}) => window.AnalyticsDemo?.query(state.filters, local);
  const button = (label, action, primary = false) => `<button type="button" data-dev-action="${action}" class="ant-btn css-var-_r_0_ ${primary?'ant-btn-primary ant-btn-color-primary ant-btn-variant-solid':'ant-btn-default ant-btn-color-default ant-btn-variant-outlined'}"><span>${esc(label)}</span></button>`;
  function notify(message, undo) {
    $('#analytics-dev-toast')?.remove();
    const node = document.createElement('div'); node.id = 'analytics-dev-toast';
    node.setAttribute('role','status'); node.className = 'analytics-dev-toast';
    node.innerHTML = `<span>${esc(message)}</span>${undo?'<button type="button">Отменить</button>':''}`;
    document.body.append(node); if (undo) $('button',node).onclick = () => {undo(); node.remove();};
    setTimeout(()=>node.remove(), 6500);
  }
  function overlayTemplate(key) {
    const fragment = parse(snapshot(key));
    const overlay = $('.ant-drawer-open', fragment) || $('.ant-modal-root', fragment) || $('.ant-drawer', fragment);
    if (!overlay) return null;
    overlay.querySelectorAll('[class]').forEach(node => [...node.classList].filter(c=>c.includes('-motion')||c.endsWith('-appear')||c.endsWith('-appear-active')).forEach(c=>node.classList.remove(c)));
    return overlay;
  }
  function closeDropdown() {
    activeDropdown?.remove(); activeDropdown = null;
    $$('.ant-select-open').forEach(node=>node.classList.remove('ant-select-open'));
    $$('.ant-select [aria-expanded="true"]').forEach(node=>node.setAttribute('aria-expanded','false'));
  }
  function closeOverlay() {
    closeDropdown(); window.AnalyticsSelects?.close(); activeOverlay?.remove(); activeOverlay = null; formMetric = null; formDraft = null;
    if(overlayReturnFocus?.isConnected)overlayReturnFocus.focus({preventScroll:true});overlayReturnFocus=null;
  }
  function openOverlay(key) {
    closeOverlay(); const node = overlayTemplate(key); if (!node) { notify('Этот экран ещё не снят'); return null; }
    overlayReturnFocus=document.activeElement;
    node.dataset.devOverlay = key; document.body.append(node); activeOverlay = node;
    localDrillLinks(node);
    $('.ant-drawer-close, .ant-modal-close',node)?.focus(); return node;
  }
  function localDrillLinks(node) {
    $$('a[href]',node).forEach(link=>{const href=link.getAttribute('href');if(href.includes('candidacy=')||href.includes('/candidate')){link.href='candidate-card-current.html?public=b9f3518e687f';link.dataset.devCandidate='true';}else if(href.includes('/vacanc'))link.href='ats-product.html?public=b30f98548b33#vacancy';});
  }
  function setSelect(node, value) {
    if (!node) return;
    let display = $('.ant-select-content-value, .ant-select-placeholder', node);
    if (!display) { display = document.createElement('div'); $('.ant-select-content',node)?.prepend(display); }
    if (display) {display.className = value ? 'ant-select-content-value' : 'ant-select-placeholder'; display.style.visibility='visible'; display.textContent=value; display.title=value;}
    node.dataset.devValue = value;
  }
  function optionTexts(key, fallback) {
    if(window.AnalyticsDemo&&key==='metric-stage-options')return window.AnalyticsDemo.options.stages.map(stage=>stage.name);
    const fragment=parse(snapshot(key));
    const menus=$$('.ant-select-dropdown',fragment);
    const menu=menus.filter(node=>!node.classList.contains('ant-select-dropdown-hidden')).at(-1)||menus.at(-1)||fragment;
    const options=$$('.ant-select-item-option-content',menu).map(text);
    return [...new Set(options.length?options:fallback)];
  }
  const fallbackOptions = {
    'filter-period':['Последние 30 дней','Текущий квартал','Последние полгода','Последний год','Свой диапазон…'],
    'metric-formula-options':['Длительность между событиями','Доля дошедших','Количество','Средняя оценка ИИ'],
    'metric-event-options':['Добавлен на вакансию','Вошёл на этап…','Вошёл на этап категории…','Этап «Оффер»','Оффер отправлен','Оффер принят','Вышел на работу','Отказ'],
    'metric-category-options':['Скрининг','Интервью','Оффер','Прочее'],
    'metric-aggregate-options':['Медиана','Среднее'],
    'metric-stage-options':['Новые','Скоринг резюме','Чат-бот','Интервью с HR','Техническое собеседование','Голосовое интервью','Оценка заказчиком','Отправлено письмо','Выставлен оффер','финальный собес','Оффер','Выход','Отказ'],
    'metric-ai-stage-options':['Любой этап — последняя оценка','Скоринг резюме','Чат-бот','Голосовое интервью']
  };
  function openSelect(node, key, choose, extra = []) {
    if (node === activeDropdown?.devAnchor) {closeDropdown(); return;}
    closeDropdown();
    window.AnalyticsSelects?.close();
    const options = [...extra, ...optionTexts(key,fallbackOptions[key]||[])];
    const menu = document.createElement('div');
    menu.className='ant-select-dropdown css-var-_r_0_ ant-select-css-var analytics-dev-dropdown';
    const current=node.dataset.devValue || text($('.ant-select-content-value',node));
    menu.innerHTML=`<div role="listbox" id="analytics-dev-options">${options.map((label,index)=>`<div class="ant-select-item ant-select-item-option ${label===current?'ant-select-item-option-selected':''}" role="option" aria-selected="${label===current}" tabindex="0" data-dev-option="${index}" title="${esc(label)}"><div class="ant-select-item-option-content">${esc(label)}</div></div>`).join('')}</div>`;
    const rect=node.getBoundingClientRect();
    Object.assign(menu.style,{position:'fixed',width:`${Math.max(rect.width,180)}px`,left:`${Math.min(rect.left,innerWidth-220)}px`,top:`${Math.min(rect.bottom+4,innerHeight-260)}px`,maxHeight:'256px',overflowY:'auto',zIndex:1500});
    menu.devAnchor=node; activeDropdown=menu; document.body.append(menu);
    node.classList.add('ant-select-open'); $('input',node)?.setAttribute('aria-expanded','true');$('input',node)?.setAttribute('aria-controls','analytics-dev-options');
    const input=$('input:not([readonly])',node);
    if(input){input.oninput=()=>$$('[data-dev-option]',menu).forEach(option=>option.hidden=!text(option).toLocaleLowerCase().includes(input.value.toLocaleLowerCase()));}
    menu.onclick=event=>{const option=event.target.closest('[data-dev-option]');if(!option)return;const value=options[+option.dataset.devOption];setSelect(node,value);if(input)input.value='';closeDropdown();choose(value);};
    const focusOption=direction=>{
      const visible=$$('[data-dev-option]',menu).filter(option=>!option.hidden);
      if(!visible.length)return;
      const index=visible.indexOf(document.activeElement);
      const next=direction==='first'?0:direction==='last'?visible.length-1:Math.max(0,Math.min(visible.length-1,index+direction));
      visible[next].focus();visible[next].scrollIntoView({block:'nearest'});
    };
    menu.onkeydown=event=>{
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();focusOption(event.key==='Home'?'first':event.key==='End'?'last':event.key==='ArrowDown'?1:-1);}
      else if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();event.target.closest('[data-dev-option]')?.click();}
      else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDropdown();$('input',node)?.focus();}
      else if(event.key==='Tab')closeDropdown();
    };
    if(input)input.onkeydown=event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();focusOption(event.key==='ArrowDown'?'first':'last');}};
  }
  const filterKeys={'Период':'period','Рекрутер':'recruiter','Департамент':'department','Нанимающий менеджер':'manager'};
  const filterDefaults={recruiter:'Все рекрутеры',department:'Все департаменты',manager:'Все нанимающие'};
  function renderFilters() {
    if (window.AnalyticsRedesign) {$$('[data-ad-date]').forEach(input=>{input.value=state.filters[input.dataset.adDate]||'';});return;}
    const current=$(cls('filterbar')); if(!current)return;
    let template = baseFilters;
    if (state.filters.period.startsWith('Свой диапазон')) {
      const custom=parse(raw(S.filterCustom)||snapshot('filter-custom')); template=$(cls('filterbar'),custom)?.outerHTML||template;
    }
    const fragment=parse(template); const section=$(cls('filterbar'),fragment); if(!section)return;
    current.replaceWith(section);
    if(state.filters.period.startsWith('Свой диапазон')&&!$('.ant-picker',section)){
      const dates=parse('<label class="Analytics_field__KbXJq"><span>С — по</span><div class="ant-picker ant-picker-range ant-picker-outlined css-var-_r_0_ ant-picker-css-var"><div class="ant-picker-input"><input placeholder="Начальная дата" size="12"></div><span class="ant-picker-range-separator">→</span><div class="ant-picker-input"><input placeholder="Конечная дата" size="12"></div><span class="ant-picker-suffix">▦</span></div></label>');
      $(cls('filterRow'),section).insertBefore(dates,$(cls('field'),section)?.nextSibling);
    }
    $$(cls('field'),section).forEach(label=>{const key=filterKeys[text($(':scope > span',label))];if(!key)return;const select=$('.ant-select',label);select.dataset.devFilter=key;setSelect(select,state.filters[key]||filterDefaults[key]||state.filters.period);});
    const scope=$(cls('scope')+' > span',section);
    if(scope)scope.textContent=[state.filters.period.replace('…',''),state.filters.recruiter||filterDefaults.recruiter,state.filters.department||filterDefaults.department,state.filters.manager||filterDefaults.manager].join(' · ');
    const dates=$$('.ant-picker input',section);
    dates.forEach((input,index)=>{input.value=index?state.filters.to:state.filters.from;input.dataset.devDate=index?'to':'from';input.readOnly=false;input.setAttribute('aria-invalid','false');});
    const filtered=state.filters.period!=='Текущий квартал'||state.filters.recruiter||state.filters.department||state.filters.manager;
    let reset=$$('button',section).find(node=>text(node)==='Сбросить');
    if(filtered&&!reset){const fragment=parse(button('Сбросить','reset'));reset=$('button',fragment);$(cls('filterRow'),section).append(reset);}
    if(reset){reset.dataset.devAction='reset';reset.hidden=!filtered;}
  }
  function renderScope() {
    manualDatePending=false;
    const range=customRangeStatus();
    const customIncomplete=state.filters.period.startsWith('Свой диапазон')&&!range.valid;
    if (window.AnalyticsRedesign && window.AnalyticsDemo) {
      document.body.classList.add('analytics-redesign');
      const main=$('#ats-screen');
      const data=demoData();
      const sectionsData=Object.fromEntries(['stages','reasons','recruiters','sources','funnel'].map(key=>[key,demoData(state.localFilters[key]||{})]));
      main.classList.add('ad-page');
      main.innerHTML=window.AnalyticsRedesign.render(state,data,{views:redesignViews,localFilters:state.localFilters,sectionsData,recruiterMetric,rangeError:customIncomplete?(range.reason||'Выберите начало и конец периода.') : ''});
      $$('[data-ad-date]',main).forEach(input=>{input.dataset.devDate=input.dataset.adDate;input.setAttribute('aria-invalid',String(customIncomplete&&!!range.reason));});
      renderPins(); renderMetrics();
      window.AnalyticsSources?.mount(main,{settings:state.sourceDisplay,onChange:settings=>{state.sourceDisplay=settings;save();renderScope();}});
      window.AnalyticsDynamics?.mount(main,{settings:state.dynamics,onChange:(settings,options={})=>{state.dynamics=settings;save();if(options.render!==false)renderScope();}});
      window.AnalyticsSelects?.enhance(main);
      const fmt=value=>Number.isFinite(value)?value.toLocaleString('ru-RU',{maximumFractionDigits:1}):'—';
      state.homeMetricSnapshot=[
        {id:'ttf',name:'Time to Fill',value:`${fmt(data.kpis.ttf)} дня`,delta:'Демоданные',tone:'purple',coverage:`${data.kpis.counts.ttf} наблюдений · ${data.range.label}`},
        {id:'tto',name:'Time to Offer',value:`${fmt(data.kpis.tto)} дня`,delta:'Демоданные',tone:'purple',coverage:`${data.kpis.counts.tto} наблюдений · ${data.range.label}`},
        {id:'offer',name:'Offer acceptance rate',value:`${fmt(data.kpis.acceptance)}%`,delta:'Демоданные',tone:'purple',coverage:`${data.kpis.counts.offersAccepted} из ${data.kpis.counts.offersResolved} · ${data.range.label}`}
      ];
      save();
      return;
    }
    const source=customIncomplete?raw(S.filterCustom):dashboard;
    if(source){const fragment=parse(source),main=$('#ats-screen',fragment);if(main)$('#ats-screen').replaceWith(main);}
    renderFilters();renderPins();renderMetrics();
    if(customIncomplete&&range.reason){const title=$('[class*="PageState_title__"]'),description=$('[class*="PageState_text__"]');if(title)title.textContent='Проверьте даты периода';if(description)description.textContent=range.reason;$$('.ant-picker input').forEach(input=>input.setAttribute('aria-invalid','true'));}
    if(!customIncomplete){if(sourceView==='Таблица')tableArticle('Эффективность источников',sourceView);if(funnelView==='Таблица')tableArticle('Конверсии из этапа в этап',funnelView);}
    applyProjection();
  }
  function customRangeStatus() {
    const dates=[state.filters.from,state.filters.to];if(dates.some(date=>!date))return {valid:false};
    const parsed=dates.map(value=>{const match=String(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);if(!match)return null;const date=new Date(+match[3],+match[2]-1,+match[1]);return date.getFullYear()===+match[3]&&date.getMonth()===+match[2]-1&&date.getDate()===+match[1]?date:null;});
    if(parsed.some(date=>!date))return {valid:false,reason:'Введите даты в формате ДД.ММ.ГГГГ.'};
    if(parsed[0]>parsed[1])return {valid:false,reason:'Начальная дата должна быть не позже конечной.'};
    if(parsed.some(date=>date>calendarCutoff()))return {valid:false,reason:'Период не может включать будущие даты.'};
    const limit=new Date(parsed[0]);limit.setFullYear(limit.getFullYear()+1);
    if(parsed[1]>limit)return {valid:false,reason:'Свой диапазон — не длиннее года.'};
    return {valid:true};
  }
  function calendarCutoff() {
    if(window.AnalyticsDemo){const parts=window.AnalyticsDemo.cutoff.split('-');calendarLimit=new Date(+parts[0],+parts[1]-1,+parts[2]);return calendarLimit;}
    if(!calendarLimit){const dateTitle=$('.ant-picker-cell-today',parse(snapshot('filter-calendar')))?.title,parts=dateTitle?.split('-');calendarLimit=parts?new Date(+parts[0],+parts[1]-1,+parts[2]):new Date();calendarLimit.setHours(0,0,0,0);}
    return calendarLimit;
  }
  function updateManualDate(input) {
    state.filters[input.dataset.devDate]=input.value;
    manualDatePending=true;save();
  }
  function commitManualDates(event) {
    const next=event.relatedTarget;
    if(next?.closest?.('.analytics-dev-calendar'))return;
    const leavingRange=event.type==='focusout'&&next&&!next.matches?.('[data-dev-date]');
    clearTimeout(dateCommitTimer);
    dateCommitTimer=setTimeout(()=>{
      if(!manualDatePending||document.activeElement?.matches?.('[data-dev-date]'))return;
      if(activeDropdown?.classList.contains('analytics-dev-calendar')){
        if(!leavingRange)return;
        closeDropdown();
      }
      renderScope();
    },0);
  }
  function applyProjection() {
    const selected=[state.filters.recruiter,state.filters.department,state.filters.manager].filter(Boolean);
    const factor=selected.length?Math.max(.08, .6/selected.length):1;
    const team=articleFor(document,'По рекрутёрам');
    if(team)$$('tbody tr:not(.ant-table-measure-row)',team).forEach(row=>{row.hidden=!!state.filters.recruiter&&text($('td:first-child',row))!==state.filters.recruiter;});
    const scope=$(cls('scope')+' small');
    if(scope){const vacancy=Math.round(1810*factor),candidates=Math.max(1,Math.round(38*factor));scope.textContent=`Обновлено ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} · вакансий: ${vacancy} · кандидатов начато в периоде: ${candidates}`;}
    // Для локальной копии фильтруем воспроизводимую снятую выборку.
    $$(cls('node')+' strong').forEach(node=>{const value=$('button',node)||node;if(!value.dataset.devBase)value.dataset.devBase=text(value);const n=+value.dataset.devBase;if(Number.isFinite(n))value.textContent=String(Math.round(n*factor));});
    const source=articleFor(document,'Эффективность источников');
    if(source)$$(cls('sourceRow'),source).forEach(row=>{const small=$('small',row);if(!small)return;small.dataset.devBase||=text(small);small.textContent=small.dataset.devBase.replace(/из (\d+) кандидатов/,(_,n)=>`из ${Math.max(1,Math.round(+n*factor))} кандидатов`);});
  }
  function renderPins() {
    if(window.AnalyticsRedesign){$$('[data-dev-pin]').forEach(pin=>{const on=state.pins[pin.dataset.devPin]??true;pin.textContent=on?'✓ На главной':'＋ На главную';pin.setAttribute('aria-pressed',String(on));pin.classList.toggle('active',on);pin.title=on?'Убрать с главной':'Вывести на главную';});return;}
    $$(cls('pin')).forEach((pin,index)=>{const card=pin.closest('article'),name=text($('header > span',card));pin.dataset.devPin=name;const on=state.pins[name]??true;pin.classList.toggle('Analytics_pinActive___xNMZ',on);pin.textContent=on?'✓ На главной':'＋ На главную';pin.title=on?'Убрать с главной':'Вывести на главную';});
  }
  function calculation(metric) {
    const method=metric.fields['Способ расчёта'];
    if(window.AnalyticsDemo?.calculate){const result=window.AnalyticsDemo.calculate(metric.fields,state.filters,{},!!metric.pause);return {value:result.display,observations:result.observations};}
    const data=demoData();
    if(data){
      const n=value=>Number.isFinite(value)?value.toLocaleString('ru-RU',{maximumFractionDigits:1}):'—';
      if(data.empty)return {value:'—',observations:0};
      if(method==='Количество')return {value:n(data.totals.candidates),observations:data.totals.candidates};
      if(method==='Средняя оценка ИИ')return {value:'7,8 / 10',observations:data.stages.find(stage=>stage.name==='ИИ Скрининг')?.visits||0};
      if(method==='Доля дошедших')return {value:`${n(data.kpis.acceptance)}%`,observations:data.kpis.counts.offersResolved};
      return {value:`${n(data.kpis.tto)} дня`,observations:data.kpis.counts.tto};
    }
    if(method==='Количество')return {value:metric.fields['Считать']==='Людей'?'32':'38',observations:38};
    if(method==='Средняя оценка ИИ')return {value:'7,4 / 10',observations:9};
    if(method==='Доля дошедших')return {value:'28,6%',observations:7};
    return {value:metric.fields['Агрегирование']==='Среднее'?'2,4 дня':'0,1 дня',observations:5};
  }
  function formula(metric) {
    if(window.AnalyticsMetricBuilder&&metric.fields['Конструктор']==='v2')return window.AnalyticsMetricBuilder.summary(metric,window.AnalyticsDemo?.options||{});
    const f=metric.fields,withDetail=key=>f[key]+(f[`${key}:detail`]?` «${f[`${key}:detail`]}»`:'');
    if(f['Способ расчёта']==='Количество')return `Количество: ${withDetail('Событие')} · ${f['Считать']||'Процессы на вакансиях'}`;
    if(f['Способ расчёта']==='Средняя оценка ИИ')return `Средняя оценка ИИ · ${f['Оценка на этапе']||'Любой этап — последняя оценка'}`;
    const start=f['Способ расчёта']==='Доля дошедших'?'Из тех, у кого было':'От события',end=start==='От события'?'До события':'Сколько потом дошли до';
    return `${start==='От события'?(f['Агрегирование']||'Медиана'):'Доля дошедших'} от «${withDetail(start)}» до «${withDetail(end)}»${start==='От события'&&metric.pause?' · без пауз вакансии':''}`;
  }
  function renderMetrics() {
    const container=$(cls('metricCards'));if(!container)return;
    if(window.AnalyticsDemo)state.metrics.forEach(metric=>{const result=calculation(metric);metric.value=result.value;metric.observations=result.observations;});
    container.innerHTML=state.metrics.filter(metric=>!metric.archived).map(metric=>`<div class="Analytics_metricCard__T3NYs" data-dev-metric="${metric.id}"><div class="Analytics_metricCardHead__0XWCg"><b>${esc(metric.name)}</b>${metric.visibility==='Только я'?'<small>Только я</small>':''}</div><strong class="Analytics_metricValue__vNz5y">${esc(metric.value)}</strong><small class="Analytics_muted__l7Q4B">по ${metric.observations??7} наблюдениям · демоданные</small><small class="Analytics_muted__l7Q4B">${esc(metric.formulaDisplay||formula(metric))} · версия ${metric.version}</small>${metric.description?`<small>${esc(metric.description)}</small>`:''}<div class="Analytics_metricActions__R0SXJ">${['По разрезу','Версии','Изменить','В архив'].map((label,index)=>`<button type="button" ${index===0&&metric.breakdowns?.length===0?'disabled':''} data-dev-action="${['breakdown','versions','edit','archive'][index]}" class="ant-btn css-var-_r_0_ ant-btn-link ${index===3?'ant-btn-dangerous ant-btn-color-dangerous':'ant-btn-color-link'} ant-btn-variant-link ant-btn-sm"><span>${label}</span></button>`).join('')}</div></div>`).join('');
  }
  function directLabels(form) {return $$(':scope > label',form);}
  function collectForm() {
    const form=$(cls('metricForm'),activeOverlay); if(!form)return formDraft;
    if(form.matches('.amb-form')){
      const fields={...formDraft.fields};$$('[data-metric-field]',form).forEach(input=>fields[input.dataset.metricField]=input.value);
      return {...formDraft,fields,visibility:fields['Кто видит']||formDraft.visibility,breakdowns:$$('[data-metric-breakdown]:checked',form).map(input=>input.value),pause:$('.ant-switch',form)?.getAttribute('aria-checked')==='true'};
    }
    const fields={...formDraft.fields};directLabels(form).forEach(label=>{const key=text($(':scope > span',label));if(!key)return;const input=$('input:not([type="radio"]):not([type="checkbox"]):not(.ant-select-input),textarea',label),selects=$$('.ant-select',label);if(input)fields[key]=input.value;else if(selects.length){fields[key]=selects[0].dataset.devValue||text($('.ant-select-content-value',selects[0]));if(selects[1])fields[`${key}:detail`]=selects[1].dataset.devValue||text($('.ant-select-content-value',selects[1]));else delete fields[`${key}:detail`];}else if($('.ant-segmented',label))fields[key]=text($('.ant-segmented-item-selected .ant-segmented-item-label',label));});
    return {...formDraft,fields,visibility:fields['Кто видит']||formDraft.visibility,breakdowns:$$('input[type="checkbox"]:checked',form).map(input=>input.value),pause:$('.ant-switch',form)?$('.ant-switch',form).getAttribute('aria-checked')==='true':formDraft.pause};
  }
  function setFormValues(draft) {
    if(window.AnalyticsMetricBuilder){renderMetricBuilder(draft);return;}
    const form=$(cls('metricForm'),activeOverlay);if(!form)return;
    directLabels(form).forEach(label=>{const key=text($(':scope > span',label));if(!key)return;const value=draft.fields[key];const input=$('input:not([type="radio"]):not([type="checkbox"]):not(.ant-select-input),textarea',label);if(input&&value!==undefined)input.value=value;
      let selects=$$('.ant-select',label);selects.forEach((select,index)=>select.dataset.devField=index?`${key}:detail`:key);
      if(selects[0]&&value!==undefined&&value.includes('…')){eventDetail(selects[0],value);selects=$$('.ant-select',label);}
      selects.forEach((select,index)=>{const v=draft.fields[index?`${key}:detail`:key];if(v!==undefined)setSelect(select,v);select.dataset.devField=index?`${key}:detail`:key;});
      const segmented=$('.ant-segmented',label);if(segmented){const chosen=value||draft.visibility;$$('.ant-segmented-item',segmented).forEach(item=>{const on=text($('.ant-segmented-item-label',item))===chosen;item.classList.toggle('ant-segmented-item-selected',on);$('input',item).checked=on;$('.ant-segmented-item-label',item)?.setAttribute('aria-checked',String(on));});}
    });
    $$('input[type="checkbox"]',form).forEach(input=>{input.checked=draft.breakdowns?.includes(input.value)??true;syncCheckbox(input);});
    const pause=$('.ant-switch',form);if(pause){pause.setAttribute('aria-checked',String(!!draft.pause));pause.classList.toggle('ant-switch-checked',!!draft.pause);}
    validateForm();
  }
  function validateForm() {
    const form=$(cls('metricForm'),activeOverlay);if(!form)return;
    if(form.matches('.amb-form')){
      const draft=collectForm(),status=window.AnalyticsMetricBuilder.validate(draft);
      const publish=$('.ant-drawer-extra button',activeOverlay);if(publish)publish.disabled=!status.valid;
      const alert=$('.amb-errors',form);if(alert){alert.hidden=status.valid;alert.innerHTML=status.errors.map(error=>`<p data-metric-error="${esc(error.field)}">${esc(error.message)}</p>`).join('');}
      $$('[data-metric-field]',form).forEach(input=>{const invalid=status.errors.some(error=>error.field===input.dataset.metricField);input.setAttribute('aria-invalid',String(invalid));input.closest('.ad-select-wrap')?.querySelector('.ad-select-trigger')?.setAttribute('aria-invalid',String(invalid));});
      const summary=$('[data-metric-summary]',form);if(summary)summary.textContent=window.AnalyticsMetricBuilder.summary(draft,window.AnalyticsDemo?.options||{});
      const result=$('.amb-preview',form);
      if(result?.dataset.signature&&result.dataset.signature!==window.AnalyticsMetricBuilder.signature(draft)){
        result.innerHTML='<button type="button" data-dev-action="preview">Проверить на данных</button><small>Настройки изменились — проверьте результат заново.</small>';delete result.dataset.signature;
      }
      const preview=$('[data-dev-action="preview"]',form);if(preview)preview.disabled=!status.valid;
      return;
    }
    const input=$('input[maxlength="120"]',form);const publish=$('.ant-drawer-extra button',activeOverlay);if(publish)publish.disabled=!input?.value.trim();
    const alert=$('.ant-alert',form);if(alert)alert.hidden=!!input?.value.trim();
  }
  function renderMetricBuilder(draft, changedField) {
    window.AnalyticsSelects?.close();
    formDraft=window.AnalyticsMetricBuilder.defaults(draft);
    const form=$(cls('metricForm'),activeOverlay),body=$('.ant-drawer-body',activeOverlay);
    if(!body)return;
    const conditionsOpen=$('.amb-conditions',form)?.open,focusField=changedField||document.activeElement?.closest('.amb-field')?.querySelector('[data-metric-field]')?.dataset.metricField;
    const content=parse(window.AnalyticsMetricBuilder.render(formDraft,window.AnalyticsDemo?.options||{}));
    if(form)form.replaceWith(content);else body.replaceChildren(content);
    activeOverlay.classList.add('amb-overlay');
    if(conditionsOpen!==undefined){const conditions=$('.amb-conditions',body);if(conditions)conditions.open=conditionsOpen;}
    window.AnalyticsSelects?.enhance(body);validateForm();
    if(focusField){const input=$$('[data-metric-field]',body).find(node=>node.dataset.metricField===focusField);(input?.closest('.ad-select-wrap')?.querySelector('.ad-select-trigger')||input)?.focus({preventScroll:true});}
  }
  function openMetric(metric) {
    const method=metric?.fields['Способ расчёта']||'Длительность между событиями';
    const key={'Доля дошедших':'metric-share','Количество':'metric-count','Средняя оценка ИИ':'metric-ai'}[method]||'metric-new';
    const overlay=openOverlay(metric?'metric-edit':key);if(!overlay)return;
    formMetric=metric?.id||null;
    formDraft=metric?JSON.parse(JSON.stringify(metric)):{id:`local-${Date.now()}`,version:1,fields:{'Название':'','Что показывает и зачем':'','Способ расчёта':method,'От события':'Добавлен на вакансию','До события':'Оффер отправлен','Агрегирование':'Медиана'},visibility:'Все с доступом к аналитике',breakdowns:['vacancy','recruiter','source'],pause:false,versions:[]};
    if(metric&&method!=='Доля дошедших'){const appropriate=overlayTemplate(key);const form=$(cls('metricForm'),appropriate);if(form)$(cls('metricForm'),overlay).replaceWith(form);}
    $('.ant-drawer-title',overlay).textContent=metric?`Метрика «${metric.name}»`:'Новая метрика';
    const publish=$('.ant-drawer-extra button',overlay);publish.dataset.devAction='publish';publish.textContent=metric?'Сохранить':'Опубликовать';
    setFormValues(formDraft);
  }
  function switchMethod(method) {
    const draft=collectForm();const metricId=formMetric;
    if(window.AnalyticsMetricBuilder){draft.fields['Способ расчёта']=method;renderMetricBuilder(draft);formMetric=metricId;return;}
    const key={'Доля дошедших':'metric-share','Количество':'metric-count','Средняя оценка ИИ':'metric-ai'}[method]||'metric-new';
    const template=overlayTemplate(key); const form=$(cls('metricForm'),template);if(!form)return;
    draft.fields['Способ расчёта']=method;
    if(method==='Доля дошедших'){draft.fields['Из тех, у кого было']||=draft.fields['От события']||'Добавлен на вакансию';draft.fields['Сколько потом дошли до']||=draft.fields['До события']||'Оффер отправлен';}
    if(method==='Количество'){draft.fields['Событие']||='Добавлен на вакансию';draft.fields['Считать']||='Процессы на вакансиях';}
    if(method==='Средняя оценка ИИ')draft.fields['Оценка на этапе']||='Любой этап — последняя оценка';
    $(cls('metricForm'),activeOverlay).replaceWith(form);formDraft=draft;formMetric=metricId;setFormValues(draft);
  }
  function eventDetail(select, value) {
    const row=select.closest(cls('metricEvent'));if(!row)return;
    const old=$$('.ant-select',row).slice(1);old.forEach(node=>node.remove());
    if(!value.includes('этап…')&&!value.includes('категории…'))return;
    const detail=select.cloneNode(true),field=select.dataset.devField;
    detail.dataset.devField=`${field}:detail`;detail.dataset.devDetail=value.includes('категории')?'category':'stage';
    setSelect(detail,value.includes('категории')?'Скрининг':'Скоринг резюме');row.append(detail);
  }
  function publishMetric() {
    const draft=collectForm();const name=draft.fields['Название']?.trim();if(!name){$('input[maxlength="120"]',activeOverlay)?.focus();return;}
    if(window.AnalyticsMetricBuilder&&!window.AnalyticsMetricBuilder.validate(draft).valid){validateForm();return;}
    const original=state.metrics.find(metric=>metric.id===formMetric);
    const originalFormula=original?formula(original):'',nextFormula=formula(draft);
    const changed=original?(window.AnalyticsMetricBuilder?window.AnalyticsMetricBuilder.signature(original)!==window.AnalyticsMetricBuilder.signature(draft):originalFormula!==nextFormula):true;
    const version=original?original.version+(changed?1:0):1;
    const metric={...draft,name,description:draft.fields['Что показывает и зачем']?.trim()||'',version,archived:false,...calculation(draft)};
    delete metric.formulaDisplay;
    metric.versions=[...(original?.versions||[])];
    if(!metric.versions.length&&original)metric.versions.push({number:original.version,formula:original.formulaDisplay||originalFormula,date:'10.10.2026 13:53'});
    if(!original||changed)metric.versions.push({number:version,formula:nextFormula,date:today()});
    if(original)state.metrics[state.metrics.indexOf(original)]=metric;else state.metrics.push(metric);
    save();closeOverlay();renderScope();notify(original?`Метрика сохранена · версия ${version}`:'Метрика опубликована');
  }
  function openVersions(metric) {
    const overlay=openOverlay('metric-versions');if(!overlay)return;
    $('.ant-drawer-title',overlay).textContent=`Версии «${metric.name}»`;
    const versions=metric.versions?.length?metric.versions:[{number:metric.version,formula:metric.formulaDisplay||formula(metric),date:'10.10.2026 13:53'}];
    $('tbody',overlay).innerHTML=versions.map(version=>`<tr class="ant-table-row"><td class="ant-table-cell">${version.number}</td><td class="ant-table-cell">${esc(version.formula)}</td><td class="ant-table-cell">${esc(version.date)} · Вы</td></tr>`).join('');
  }
  let breakdownMetric=null;
  function openBreakdown(metric, key='vacancy') {
    if(!metric||metric.breakdowns?.length===0)return;
    const overlay=openOverlay(`metric-breakdown-${['vacancy','recruiter','source'].includes(key)?key:'vacancy'}`);if(!overlay)return;
    breakdownMetric=metric.id;overlay.dataset.devMetric=metric.id;
    $('.ant-drawer-title',overlay).textContent=`${metric.name} — по разрезу`;
    const group=$('.ant-segmented',overlay),names={vacancy:'Вакансии',recruiter:'Рекрутеры',source:'Источники',department:'Департаменты',pipeline:'Шаблоны воронки'};
    if(group){const controls=document.createElement('div');controls.className='ad-view-toggle amb-breakdown-controls';controls.setAttribute('aria-label','Разрез метрики');controls.innerHTML=(metric.breakdowns||['vacancy','recruiter','source']).map(id=>`<button type="button" data-dev-breakdown="${esc(id)}" class="${key===id?'active':''}" aria-pressed="${key===id}">${esc(names[id]||id)}</button>`).join('');group.replaceWith(controls);}
    if(window.AnalyticsDemo){
      const data=demoData();
      const dimension={vacancy:['vacancyId','vacancy'],recruiter:['recruiterId','recruiter'],source:['sourceId','source'],department:['departmentId','department'],pipeline:['pipelineId','pipeline']}[key]||['vacancyId','vacancy'];
      const groups=[...new Map((data.observationRecords||data.records).map(record=>[record[dimension[0]],{id:record[dimension[0]],name:record[dimension[1]]}])).values()].filter(group=>group.id);
      const tbody=$('tbody',overlay);
      const rows=groups.length?groups:(key==='vacancy'?[...new Map(data.records.map(record=>[record.vacancyId,{id:record.vacancyId,name:record.vacancy}])).values()]:[]);
      if(tbody)tbody.innerHTML=rows.map(group=>{const local={[key]:group.id};const result=window.AnalyticsDemo.calculate(metric.fields,state.filters,local,!!metric.pause);return `<tr class="ant-table-row"><td class="ant-table-cell">${esc(group.name)}</td><td class="ant-table-cell">${esc(result.display)}</td><td class="ant-table-cell">${esc(result.observations)}</td></tr>`;}).join('')||'<tr><td colspan="3">Нет данных для выбранного периода и фильтров.</td></tr>';
      const headings=$$('thead th',overlay);if(headings[1])headings[1].textContent='Значение';if(headings[2])headings[2].textContent='Наблюдений';
      const note=document.createElement('p');note.className='ad-note';note.textContent='Тот же период, фильтры и версия формулы. Все записи и значения демонстрационные.';$('.ant-drawer-body',overlay)?.prepend(note);
      return;
    }
    const method=metric.fields['Способ расчёта'];
    if(method!=='Доля дошедших')$$('tbody tr',overlay).forEach((row,index)=>{const cells=$$('td',row);if(!cells[1])return;cells[1].textContent=method==='Количество'?text(cells[2]):method==='Средняя оценка ИИ'?['7,4 / 10','8,1 / 10','6,8 / 10'][index%3]:['0,1 дня','1,2 дня','0 дней'][index%3];});
  }
  function previewMetric() {
    const draft=collectForm(),preview=$(cls('metricPreview'),activeOverlay);if(!preview)return;
    if(window.AnalyticsMetricBuilder&&preview.matches('.amb-preview')){
      if(!window.AnalyticsMetricBuilder.validate(draft).valid){validateForm();return;}
      const result=window.AnalyticsDemo.calculate(draft.fields,state.filters,{},!!draft.pause);
      preview.innerHTML=window.AnalyticsMetricBuilder.preview(result);preview.dataset.signature=window.AnalyticsMetricBuilder.signature(draft);return;
    }
    const result=calculation(draft);
    const capture=overlayTemplate('metric-preview'),resultTemplate=$(cls('metricPreview'),capture);
    if(resultTemplate)preview.innerHTML=resultTemplate.innerHTML;
    else preview.innerHTML=`${button('Проверить на данных','preview')}<strong>${esc(result.value)}</strong><small>За период экрана, с его фильтрами: по ${result.observations} наблюдениям</small>`;
    const strong=$('strong, b',preview);if(strong)strong.textContent=result.value;
    const small=$('small, '+cls('muted'),preview);if(small)small.textContent=`За период экрана, с его фильтрами: по ${result.observations} наблюдениям`;
  }
  function syncCheckbox(input) {
    input.closest('.ant-checkbox')?.classList.toggle('ant-checkbox-checked',input.checked);
    input.closest('.ant-checkbox-wrapper')?.classList.toggle('ant-checkbox-wrapper-checked',input.checked);
  }
  function setSegmented(item) {
    const group=item.closest('.ant-segmented');$$('.ant-segmented-item',group).forEach(sibling=>{const on=sibling===item;sibling.classList.toggle('ant-segmented-item-selected',on);$('input',sibling).checked=on;$('.ant-segmented-item-label',sibling)?.setAttribute('aria-checked',String(on));});
  }
  function tableArticle(name, mode) {
    const current=articleFor(document,name);if(!current)return;
    const source=name==='Эффективность источников';
    const html=mode==='Таблица'?raw(source?S.sourcesTable:S.funnelTable):(source?initialSource:initialFunnel);
    const fragment=parse(html);let replacement=articleFor(fragment,name)||$('article',fragment);
    if(!replacement){const wrapper=current.cloneNode(true),content=parse(html);$$(':scope > :not(header)',wrapper).forEach(node=>node.remove());wrapper.append(content);replacement=wrapper;}
    current.replaceWith(replacement);applyProjection();
  }
  function openDrill(trigger) {
    const article=trigger.closest('article'),source=text($('h2',article))==='Эффективность источников';
    const row=trigger.closest('tr'),node=trigger.closest(cls('node'));
    const sourceColumn=source&&row?$$('td',row).indexOf(trigger.closest('td')):1;
    const sourceKey={2:'source-drill-interviews',3:'source-drill-offers',4:'source-drill-hires'}[sourceColumn]||'source-drill';
    let label=source?(row?text($('td:first-child',row)):text(trigger)):row?text($('td:first-child',row)):text($('span',node));
    const currentStage=text($('h2',article))==='Время на этапе';
    const overlay=openOverlay(source?sourceKey:currentStage?'current-stage-drill':'stage-drill')||openOverlay('source-drill');if(!overlay)return;
    const title=$('.ant-drawer-title',overlay),count=source?(trigger.closest(cls('sourceRow'))?.textContent.match(/из (\d+) кандидатов/)?.[1]||(row?(Number.isFinite(+text(trigger))?text(trigger):text($$('td',row)[1])):'12')):text(trigger);
    const purpose=source?({2:'дошли до интервью',3:'получили оффер',4:'вышли на работу'}[sourceColumn]||'кандидаты'):currentStage?'стоят сейчас':'вошли';
    title.textContent=`${label} · ${purpose} — ${count}`;
    if(currentStage&&label)$$('tbody tr',overlay).forEach(row=>{const cells=$$('td',row);if(cells[2])cells[2].textContent=label;});
    const exportButton=$$('button',overlay).find(node=>text(node)==='Выгрузить в Excel');if(exportButton)exportButton.dataset.devAction='export';
    overlay.dataset.devDrillLabel=label;overlay.dataset.devDrillCount=count;
    overlay.devDrillSeeds=[];
    const keys=source?[sourceKey]:currentStage?['current-stage-drill','current-stage-drill-page2','current-stage-drill-page3']:['stage-drill','stage-drill-page2'];
    keys.forEach(key=>{const captured=overlayTemplate(key);if(captured)overlay.devDrillSeeds.push(...$$('tbody tr:not(.ant-table-measure-row)',captured).map(row=>row.cloneNode(true)));});
    if(!overlay.devDrillSeeds.length)overlay.devDrillSeeds=$$('tbody tr',overlay).map(row=>row.cloneNode(true));
    overlay.devDrillRows=Array.from({length:Math.max(0,Number(count)||0)},(_,index)=>{
      const seed=overlay.devDrillSeeds[index%overlay.devDrillSeeds.length]?.cloneNode(true);if(!seed)return null;
      seed.dataset.rowKey=`demo-drill-${index}`;
      const cells=$$('td',seed);
      if(index>=overlay.devDrillSeeds.length){const name=$('a,button',cells[0])||cells[0];if(name)name.textContent=`Демо-кандидат ${String(index+1).padStart(2,'0')}`;}
      if(currentStage&&cells[2])cells[2].textContent=label;
      return seed;
    }).filter(Boolean);
    drillPage(1);
  }
  function drillPage(page) {
    if(!activeOverlay?.dataset.devDrillLabel)return;
    const total=Number(activeOverlay.dataset.devDrillCount)||0,last=Math.max(1,Math.ceil(total/20));page=Math.min(last,Math.max(1,page||1));
    const current=activeOverlay.dataset.devOverlay.includes('current-stage'),source=activeOverlay.dataset.devOverlay.includes('source');
    const key=page===1?activeOverlay.dataset.devOverlay:current?`current-stage-drill-page${page}`:`stage-drill-page${page}`;
    if(!activeOverlay.dataset.adDemoDrill){const template=overlayTemplate(key)||overlayTemplate(activeOverlay.dataset.devOverlay),body=$('.ant-drawer-body',template);
      if(!body)return;$('.ant-drawer-body',activeOverlay).replaceWith(body);}
    const tbody=$('tbody',activeOverlay);if(tbody&&activeOverlay.devDrillRows){tbody.replaceChildren(...activeOverlay.devDrillRows.slice((page-1)*20,page*20).map(row=>row.cloneNode(true)));}
    localDrillLinks(activeOverlay);
    const exportButton=$$('button',activeOverlay).find(node=>text(node)==='Выгрузить в Excel');if(exportButton)exportButton.dataset.devAction='export';
    activeOverlay.dataset.devPage=String(page);
    let pager=$('.ant-pagination',activeOverlay);
    if(last>1&&!pager){pager=document.createElement('ul');pager.className='ant-pagination ant-pagination-mini ant-table-pagination ant-table-pagination-right css-var-_r_0_';$('.ant-table-wrapper',activeOverlay)?.append(pager);}
    if(pager){const pages=[...new Set([1,Math.max(1,page-1),page,Math.min(last,page+1),last])].sort((a,b)=>a-b);pager.hidden=last<=1;pager.innerHTML=`<li class="ant-pagination-prev ${page===1?'ant-pagination-disabled':''}" aria-disabled="${page===1}"><button class="ant-pagination-item-link" type="button" aria-label="Предыдущая страница">‹</button></li>${pages.map((n,index)=>`${index&&n>pages[index-1]+1?'<li aria-hidden="true">…</li>':''}<li class="ant-pagination-item ant-pagination-item-${n} ${page===n?'ant-pagination-item-active':''}" title="${n}"><a role="button" tabindex="0">${n}</a></li>`).join('')}<li class="ant-pagination-next ${page===last?'ant-pagination-disabled':''}" aria-disabled="${page===last}"><button class="ant-pagination-item-link" type="button" aria-label="Следующая страница">›</button></li>`;}
  }
  function openDemoDetail(trigger) {
    const type=trigger.dataset.adDetail,key=trigger.dataset.adKey,section=trigger.closest('[data-ad-section]')?.dataset.adSection;
    const data=demoData(state.localFilters[section]||{});
    if(type==='recruiter-vacancies'&&window.AnalyticsRecruiters){
      closeOverlay();overlayReturnFocus=trigger;
      const node=document.createElement('div');node.className='ant-modal-root ar-modal-root';node.dataset.devOverlay='recruiter-vacancies';
      node.innerHTML=`<div class="ant-modal-mask"></div><div class="ar-modal-wrap"><div class="ar-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="ar-modal-title"><header class="ar-modal-header"><div><span class="ad-eyebrow">Текущая нагрузка</span><h2 id="ar-modal-title">Вакансии рекрутера</h2></div><button type="button" class="ant-modal-close" aria-label="Закрыть вакансии рекрутера">×</button></header><div class="ar-modal-body">${window.AnalyticsRecruiters.modalVacancies(data,key)}</div></div></div>`;
      document.body.append(node);activeOverlay=node;$('.ant-modal-close',node).focus();return;
    }
    const overlay=openOverlay('source-drill');if(!overlay)return;
    const body=$('.ant-drawer-body',overlay),title=$('.ant-drawer-title',overlay);
    const fmt=value=>Number.isFinite(value)?value.toLocaleString('ru-RU',{maximumFractionDigits:1}):'—';
    if(type==='kpi'){
      const definitions={
        ttf:['Time to Fill',`${fmt(data.kpis.ttf)} дня`,'Медиана календарных дней: согласование заявки → принятие оффера.',data.kpis.counts.ttf],
        tto:['Time to Offer',`${fmt(data.kpis.tto)} дня`,'Медиана календарных дней: добавление кандидата на вакансию → отправка оффера.',data.kpis.counts.tto],
        acceptance:['Offer acceptance rate',`${fmt(data.kpis.acceptance)}%`,'Принятые / (принятые + отклонённые + истёкшие офферы) × 100%. Ожидающие и отозванные исключены.',data.kpis.counts.offersResolved],
        nps:['NPS нанимающих менеджеров',`${data.kpis.nps>0?'+':''}${fmt(data.kpis.nps)}`,'Доля ответов 9–10 минус доля ответов 0–6. Ответы 7–8 входят в базу, но не в числитель.',data.kpis.counts.nps],
        csi:['CSI · опыт кандидата',`${fmt(data.kpis.csi)} / 5`,'Среднее арифметическое оценок опыта кандидата по шкале 1–5.',data.kpis.counts.csi]
      };
      const metric=definitions[key];if(!metric){closeOverlay();return;}
      overlay.devExportRows=[['Собесо · демонстрационные данные',data.range.from,data.range.to],['Показатель',metric[0]],['Значение',metric[1]],['Методика',metric[2]],['Наблюдений',metric[3]]];
      const pinName={ttf:'Time to Fill',tto:'Time to Offer',acceptance:'Offer acceptance rate'}[key];
      const pinned=pinName&&(state.pins[pinName]??true);
      const pin=pinName?`<button type="button" class="ad-button ${pinned?'secondary':'primary'}" data-dev-pin="${esc(pinName)}" aria-pressed="${!!pinned}">${pinned?'✓ На главной':'＋ На главную'}</button>`:'';
      title.textContent=metric[0];body.innerHTML=`<div class="ad-method-summary"><span class="ad-eyebrow">Методика расчёта</span><strong>${esc(metric[1])}</strong><p>${esc(metric[2])}</p><p>${metric[3]} наблюдений · ${esc(data.range.label)}</p>${pin}<div class="ad-notice">Вымышленные данные для демонстрации интерфейса, не результаты Dev.</div></div>`;
      return;
    }
    const collection={source:'sources',stage:'stages',reason:'reasons',recruiter:'recruiters',funnel:'stages'}[type];
    const group=data[collection]?.find(item=>item.id===key||item.name===key);
    const label=group?.name||trigger.dataset.adLabel||text(trigger);
    let records=[...((type==='stage'&&trigger.dataset.adPurpose==='duration'||type==='reason')?(data.observationRecords||data.records||[]):type==='recruiter'&&trigger.dataset.adPurpose==='current'?(data.currentRecords||[]):(data.records||[]))];
    if(type==='source')records=records.filter(record=>(record.sourceId===key||record.source===label)&&(!['hires','hire'].includes(trigger.dataset.adPurpose)||record.hired||record.hires));
    if(type==='reason')records=records.filter(record=>(record.rejectReasonId===key||record.rejectReason===label)&&record.events?.['Отказ']>=data.range.from&&record.events?.['Отказ']<=data.range.to);
    if(type==='recruiter')records=records.filter(record=>record.recruiterId===key||record.recruiter===label);
    if(type==='stage'||type==='funnel')records=records.filter(record=>(record.stageVisits||record.visits)?.some(visit=>(visit.id===key||visit.stageId===key||visit.name===label||visit.stage===label)&&(trigger.dataset.adPurpose!=='duration'||visit.completed&&visit.exitDate>=data.range.from&&visit.exitDate<=data.range.to)));
    title.textContent=`${label} · ${records.length} кандидатов`;
    body.innerHTML=`<p class="ad-note">${esc(data.range.label)} · вымышленные записи. Карточка кандидата открывает общий пример интерфейса.</p><div class="ad-table-scroll"><table class="ad-table"><thead><tr><th>Кандидат</th><th>Вакансия</th><th>Текущий этап</th><th>Источник</th><th>Рекрутер</th></tr></thead><tbody></tbody></table></div><ul class="ant-pagination"></ul>`;
    overlay.dataset.adDemoDrill='true';overlay.dataset.devDrillLabel=label;overlay.dataset.devDrillCount=String(records.length);
    overlay.devDrillRows=records.map(record=>{const row=document.createElement('tr');row.innerHTML=`<td><a href="ats-product.html?public=b30f98548b33#vacancy/android" data-dev-route="vacancy/android">${esc(record.name||record.id)}</a></td><td>${esc(record.vacancy||record.vacancyName||'Демонстрационная вакансия')}</td><td>${esc(record.currentStage||record.stage||'—')}</td><td>${esc(record.source||'—')}</td><td>${esc(record.recruiter||'—')}</td>`;return row;});
    const exportButton=$$('button',overlay).find(button=>text(button)==='Выгрузить в Excel');if(exportButton)exportButton.dataset.devAction='export';
    drillPage(1);
    if(!records.length)$('tbody',overlay).innerHTML='<tr><td colspan="5">Нет кандидатов в этой выборке.</td></tr>';
  }
  function downloadTables(scope) {
    const tables=$$('table',scope);let rows=tables.flatMap(table=>$$('tr:not(.ant-table-measure-row)',table).filter(row=>!row.hidden).map(row=>$$('th,td',row).map(text)));
    if(activeOverlay?.devExportRows)rows=activeOverlay.devExportRows;
    if(activeOverlay?.devDrillRows){const headings=$$('thead th',activeOverlay).map(text);rows=[headings,...activeOverlay.devDrillRows.map(row=>$$('td',row).map(text))];}
    if(window.AnalyticsDemo&&!activeOverlay){
      const data=demoData(),local=key=>demoData(state.localFilters[key]||{});
      const sourceData=local('sources'),stageData=local('stages'),reasonData=local('reasons'),teamData=local('recruiters');
      const rangeLabel=d=>`${d.range.label}: ${d.range.from||'—'} — ${d.range.to||'—'}`;
      rows=[['Собесо · демонстрационные данные',rangeLabel(data)],['Общие фильтры',state.filters.recruiter||'Все рекрутеры',state.filters.department||'Все департаменты',state.filters.manager||'Все нанимающие'],['Показатель','Значение'],...Object.entries(data.kpis).filter(([key])=>['ttf','tto','acceptance','nps','csi'].includes(key)),['Помесячная динамика','TTF, дни','TTO, дни','Выходы'],...data.months.map(m=>[m.label,m.ttf??'—',m.tto??'—',m.hires]),['Источники',rangeLabel(sourceData)],['Источник','Взято в работу','Интервью','Офферы','Выходы','Доля выходов, %','Конверсия, %'],...sourceData.sources.map(s=>[s.name,s.taken,s.interviews,s.offers,s.hires,sourceData.totals.hires?s.hires/sourceData.totals.hires*100:'—',s.taken?s.hires/s.taken*100:'—']),['Воронка','Кандидатов','Перешли дальше','Конверсия, %'],...data.funnel.map(s=>[s.name,s.count,s.nextCount??'—',s.conversion??'—']),['Отказ в когорте',data.funnelRejected],['Время на этапах',rangeLabel(stageData)],['Этап','Среднее, дней','Завершённых прохождений'],...stageData.stages.map(s=>[s.name,s.days??(s.terminal?'Завершение пути':'Нет наблюдений'),s.completedVisits??s.visits]),['Причины отказов',rangeLabel(reasonData)],['Причина','Инициатор','Количество'],...reasonData.reasons.map(r=>[r.name,r.initiatorName||r.initiator,r.count]),['Рекрутеры',rangeLabel(teamData)],['Рекрутер','Вакансий сейчас','Кандидатов сейчас','Выходы за период','Офферы','Добавлены','Обработаны','Интервью','Задачи закрыты'],...teamData.recruiters.map(r=>[r.name,r.loadVacancies,r.loadCandidates,r.hires,r.offers,r.added,r.screened,r.interviews,r.tasksClosed]),['Кастомные метрики'],...state.metrics.filter(m=>!m.archived).map(m=>[m.name,m.value])];
    }
    if(!rows.length)rows=[['Показатель','Значение'],...state.metrics.filter(metric=>!metric.archived).map(metric=>[metric.name,metric.value])];
    if(window.AnalyticsDemo&&!activeOverlay){
      const team=demoData(state.localFilters.recruiters||{}),start=rows.findIndex(row=>row[0]==='Рекрутеры');
      if(start>=0)rows.splice(start+1,team.recruiters.length+1,['Рекрутер','Вакансий сейчас','Кандидатов сейчас','Выходы выбранной когорты','Добавлено в базу (дата события)','HR интервью проведено','Технических интервью проведено','Финальных интервью проведено','Офферов отправлено (дата события)'],...team.recruiters.map(row=>[row.name,row.loadVacancies,row.loadCandidates,row.hires,row.addedBase,row.hrInterviews,row.techInterviews,row.finalInterviews,row.activityOffers]));
    }
    rows=rows.map(row=>row.map(value=>value&&typeof value==='object'?(value.count??JSON.stringify(value)):value));
    const blob=xlsx(rows),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`Собесо — ${activeOverlay?text($('.ant-drawer-title',activeOverlay)):'Аналитика'} — ${new Date().toISOString().slice(0,10)}.xlsx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    state.exports.unshift({date:today(),who:'Вы',what:activeOverlay?text($('.ant-drawer-title',activeOverlay)):'Дашборд подбора',rows:Math.max(0,rows.length-1)});save();notify('Выгрузка скачана');
  }
  function xlsx(rows) {
    const xml=value=>String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
    const column=index=>{let result='';for(let n=index+1;n;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result;};
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols><col min="1" max="2" width="34" customWidth="1"/><col min="3" max="24" width="23" customWidth="1"/></cols><sheetData>${rows.map((row,index)=>`<row r="${index+1}">${row.map((value,cell)=>`<c r="${column(cell)}${index+1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const files={
      '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Аналитика" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml':sheet
    };
    const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;
    const crc=bytes=>{let n=0xffffffff;for(const byte of bytes){n^=byte;for(let bit=0;bit<8;bit++)n=(n>>>1)^(n&1?0xedb88320:0);}return(n^0xffffffff)>>>0;};
    const record=(length,values)=>{const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);values.forEach(([at,size,value])=>size===2?view.setUint16(at,value,true):view.setUint32(at,value,true));return bytes;};
    Object.entries(files).forEach(([name,content])=>{const path=encoder.encode(name),data=encoder.encode(content),checksum=crc(data),head=record(30,[[0,4,0x04034b50],[4,2,20],[6,2,0x0800],[14,4,checksum],[18,4,data.length],[22,4,data.length],[26,2,path.length]]);chunks.push(head,path,data);const directory=record(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,0x0800],[16,4,checksum],[20,4,data.length],[24,4,data.length],[28,2,path.length],[42,4,offset]]);central.push(directory,path);offset+=head.length+path.length+data.length;});
    const centralSize=central.reduce((total,bytes)=>total+bytes.length,0),end=record(22,[[0,4,0x06054b50],[8,2,Object.keys(files).length],[10,2,Object.keys(files).length],[12,4,centralSize],[16,4,offset]]);
    return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function openJournal() {
    const overlay=openOverlay('export-journal');if(!overlay)return;
    const tbody=$('tbody',overlay);if(tbody)state.exports.slice().reverse().forEach(record=>{const tr=document.createElement('tr');tr.className='ant-table-row';tr.innerHTML=[record.date,record.who,record.what,record.rows].map(value=>`<td class="ant-table-cell">${esc(value)}</td>`).join('');tbody.prepend(tr);});
  }
  function openCalendar(input, view='date') {
    closeDropdown();const fragment=parse(snapshot(view==='date'?'filter-calendar':`filter-calendar-${view}`)),captured=$('.ant-picker-dropdown',fragment);if(!captured)return;
    calendarCutoff();
    const node=captured.cloneNode(true);node.classList.remove('ant-picker-dropdown-hidden');node.className+=' analytics-dev-calendar';
    const rect=input.getBoundingClientRect();Object.assign(node.style,{position:'fixed',inset:'auto',left:`${Math.min(rect.left,innerWidth-600)}px`,top:`${Math.min(rect.bottom+4,innerHeight-340)}px`,zIndex:1500});
    node.dataset.devCalendar=input.dataset.devDate;node.dataset.devCalendarView=view;activeDropdown=node;document.body.append(node);renderCalendarGrid(node);
    $$('.ant-picker-cell',node).forEach(cell=>{cell.onclick=event=>{
      event.preventDefault();event.stopPropagation();if(cell.classList.contains('ant-picker-cell-disabled'))return;
      const date=cell.title||cell.getAttribute('date');if(!date)return;
      if(view==='decade'){calendarDate.setFullYear(Number(date.split('-')[0]));openCalendar(input,'year');return;}
      if(view==='year'){calendarDate.setFullYear(Number(date));openCalendar(input,'month');return;}
      const [year,month,day]=date.split('-');
      if(view==='month'){calendarDate=new Date(+year,+month-1,1);openCalendar(input);return;}
      manualDatePending=false;
      state.filters[input.dataset.devDate]=`${day}.${month}.${year}`;
      if(input.dataset.devDate==='from'){calendarStart=state.filters.from;const other=$('[data-dev-date="to"]');save();closeDropdown();renderFilters();if(other)openCalendar($('[data-dev-date="to"]'));}
      else{save();closeDropdown();renderScope();}
    };});
    $$('button',node).forEach(button=>{button.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      if(button.classList.contains('ant-picker-month-btn')){const panels=$$('.ant-picker-date-panel',node),index=panels.indexOf(button.closest('.ant-picker-date-panel'));if(index>0)calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+index,1);openCalendar(input,'month');return;}
      if(button.classList.contains('ant-picker-year-btn')){const selectedYear=Number(text(button));if(selectedYear)calendarDate.setFullYear(selectedYear);openCalendar(input,'year');return;}
      if(button.classList.contains('ant-picker-decade-btn')){openCalendar(input,'decade');return;}
      const direction=button.className.includes('prev')?-1:button.className.includes('next')?1:0;if(!direction)return;
      if(view==='date')calendarDate.setMonth(calendarDate.getMonth()+direction*(button.className.includes('super')?12:1));
      else calendarDate.setFullYear(calendarDate.getFullYear()+direction*({month:1,year:10,decade:100}[view]));
      renderCalendarGrid(node);
    });});
  }
  function renderCalendarGrid(node) {
    const view=node.dataset.devCalendarView;
    if(view==='date'){
      $$('.ant-picker-date-panel',node).forEach((panel,index)=>{const date=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+index,1),start=new Date(date);start.setDate(1-(date.getDay()+6)%7);const month=$('.ant-picker-month-btn',panel),year=$('.ant-picker-year-btn',panel);if(month)month.textContent=date.toLocaleDateString('ru-RU',{month:'short'});if(year)year.textContent=String(date.getFullYear());$$('.ant-picker-cell',panel).forEach((cell,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);cell.title=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;const inner=$('.ant-picker-cell-inner',cell);if(inner)inner.textContent=day.getDate();cell.classList.toggle('ant-picker-cell-in-view',day.getMonth()===date.getMonth());cell.classList.toggle('ant-picker-cell-disabled',day>calendarLimit);cell.classList.toggle('ant-picker-cell-today',+day===+calendarLimit);cell.classList.remove('ant-picker-cell-selected','ant-picker-cell-range-start','ant-picker-cell-range-end','ant-picker-cell-in-range');const display=`${String(day.getDate()).padStart(2,'0')}.${String(day.getMonth()+1).padStart(2,'0')}.${day.getFullYear()}`;if(display===state.filters.from)cell.classList.add('ant-picker-cell-range-start','ant-picker-cell-selected');if(display===state.filters.to)cell.classList.add('ant-picker-cell-range-end','ant-picker-cell-selected');});});
      return;
    }
    const year=calendarDate.getFullYear(),decade=Math.floor(year/10)*10,century=Math.floor(year/100)*100;
    const heading=$('.ant-picker-header-view',node);
    if(view==='month')$('.ant-picker-year-btn',node).textContent=year;
    else if(view==='year')$('.ant-picker-decade-btn',node).textContent=`${decade}-${decade+9}`;
    else if(heading)heading.textContent=`${century}-${century+99}`;
    $$('.ant-picker-cell',node).forEach((cell,index)=>{const inner=$('.ant-picker-cell-inner',cell);cell.classList.remove('ant-picker-cell-selected');
      if(view==='month'){cell.title=`${year}-${String(index+1).padStart(2,'0')}`;if(inner)inner.textContent=new Date(year,index,1).toLocaleDateString('ru-RU',{month:'short'});cell.classList.toggle('ant-picker-cell-selected',index===calendarDate.getMonth());cell.classList.toggle('ant-picker-cell-disabled',new Date(year,index,1)>calendarLimit);}
      else if(view==='year'){const current=decade-1+index;cell.title=String(current);if(inner)inner.textContent=current;cell.classList.toggle('ant-picker-cell-in-view',current>=decade&&current<decade+10);cell.classList.toggle('ant-picker-cell-selected',current===year);cell.classList.toggle('ant-picker-cell-disabled',current>calendarLimit.getFullYear());}
      else{const current=century-10+index*10;cell.title=`${current}-${current+9}`;if(inner)inner.textContent=cell.title;cell.classList.toggle('ant-picker-cell-in-view',current>=century&&current<century+100);cell.classList.toggle('ant-picker-cell-selected',current===decade);cell.classList.toggle('ant-picker-cell-disabled',current>calendarLimit.getFullYear());}
    });
  }
  document.addEventListener('change',event=>{
    const target=event.target;
    if(target.matches('[data-metric-field], [data-metric-breakdown]')){
      formDraft=collectForm();
      const field=target.dataset.metricField;
      if(['От события','До события','Из тех, у кого было','Сколько потом дошли до','Событие'].includes(field))delete formDraft.fields[`${field}:detail`];
      if(field==='Способ расчёта'&&target.value==='Средняя оценка ИИ')formDraft.fields['Агрегирование']='Среднее';
      if(target.matches('select[data-metric-field]'))renderMetricBuilder(formDraft,field);else validateForm();
    }
    else if(target.matches('[data-ad-filter]')){state.filters[target.dataset.adFilter]=target.value;save();renderScope();}
    else if(target.matches('[data-ad-localkey]')){const section=target.dataset.adSection;state.localFilters[section]||={};state.localFilters[section][target.dataset.adLocalkey]=target.value;save();renderScope();}
    else if(target.matches('[data-ad-date]')){updateManualDate(target);commitManualDates(event);}
    else if(target.matches('[data-dev-date]')){updateManualDate(target);commitManualDates(event);}else if(target.matches('input[type="checkbox"]'))syncCheckbox(target);
  });
  document.addEventListener('input',event=>{if(event.target.matches('[data-dev-date]'))updateManualDate(event.target);else if(event.target.closest(cls('metricForm')))validateForm();});
  document.addEventListener('focusout',event=>{if(event.target.matches('[data-dev-date]')){updateManualDate(event.target);commitManualDates(event);}});
  document.addEventListener('keydown',event=>{
    if(window.AnalyticsFlow?.handleKeydown(event))return;
    if(event.key==='Tab'&&activeOverlay?.matches('.ar-modal-root')&&!document.querySelector('.ad-select-popup')){
      const controls=$$('button:not([disabled]), a[href], summary, [tabindex="0"]',activeOverlay).filter(node=>node.getClientRects().length);
      if(controls.length){const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
    }
    if(event.key==='Escape'){if(activeDropdown)closeDropdown();else if(!document.querySelector('.ad-select-popup'))closeOverlay();}
    if(event.key==='Enter'&&event.target.closest('.ant-select'))event.target.closest('.ant-select').click();if(['Enter',' '].includes(event.key)&&event.target.matches('.ant-pagination-item a[role="button"]')){event.preventDefault();event.target.click();}
  });
  document.addEventListener('click',event=>{
    const target=event.target,select=target.closest('.ant-select');
    if(window.AnalyticsFlow?.handleClick(target))return;
    const detail=target.closest('[data-ad-detail]');if(detail){openDemoDetail(detail);return;}
    const view=target.closest('[data-ad-view]');if(view){redesignViews[view.dataset.adView]=view.dataset.adMode;renderScope();return;}
    const activity=target.closest('[data-ad-recruiter-metric]');if(activity){recruiterMetric=activity.dataset.adRecruiterMetric;state.recruiterMetric=recruiterMetric;save();renderScope();return;}
    const breakdown=target.closest('[data-dev-breakdown]');if(breakdown){openBreakdown(state.metrics.find(metric=>metric.id===breakdownMetric),breakdown.dataset.devBreakdown);return;}
    const resetLocal=target.closest('[data-ad-reset]');if(resetLocal){state.localFilters[resetLocal.dataset.adReset]={};save();renderScope();return;}
    const routeLink=target.closest('[data-dev-route], [data-dev-document]');
    if(routeLink&&window.parent!==window){event.preventDefault();if(routeLink.dataset.devDocument)window.parent.location.href=routeLink.href;else window.parent.location.hash=routeLink.dataset.devRoute;return;}
    if(activeDropdown&&!activeDropdown.contains(target)&&!activeDropdown.devAnchor?.contains(target)&&!target.closest('.ant-picker'))closeDropdown();
    if(target.closest('.ant-drawer-close, .ant-drawer-mask, .ant-modal-close, .ant-modal-mask')){closeOverlay();return;}
    if(target.closest('[data-dev-date]')){openCalendar(target.closest('[data-dev-date]'));return;}
    if(select){
      event.preventDefault();$('input',select)?.focus();
      if(select.dataset.devFilter){const key=select.dataset.devFilter;openSelect(select,`filter-${key}`,value=>{state.filters[key]=value.startsWith('Все ')?'':value;save();renderScope();},key==='period'?[]:[filterDefaults[key]]);return;}
      if(select.closest(cls('metricForm'))){const field=select.dataset.devField||text($(':scope > span',select.closest('label')));select.dataset.devField=field;
        const optionKey=field==='Способ расчёта'?'metric-formula-options':field==='Агрегирование'?'aggregate-options':field==='Оценка на этапе'?'metric-stage-options':field.endsWith(':detail')?(select.dataset.devDetail==='stage'?'metric-stage-options':'metric-category-options'):'metric-event-options';
        openSelect(select,optionKey,value=>{if(field==='Способ расчёта')switchMethod(value);else if(!field.endsWith(':detail'))eventDetail(select,value);formDraft=collectForm();},field==='Оценка на этапе'?['Любой этап — последняя оценка']:[]);return;}
    }
    const segmented=target.closest('.ant-segmented-item');
    if(segmented){setSegmented(segmented);if(segmented.dataset.devBreakdown){const metric=state.metrics.find(metric=>metric.id===breakdownMetric);openBreakdown(metric,segmented.dataset.devBreakdown);return;}
      const article=segmented.closest('article'),name=text($('h2',article)),mode=text($('.ant-segmented-item-label',segmented));if(name==='Эффективность источников'){sourceView=mode;tableArticle(name,mode);}else if(name==='Конверсии из этапа в этап'){funnelView=mode;tableArticle(name,mode);}return;}
    const pin=target.closest('[data-dev-pin]');if(pin){state.pins[pin.dataset.devPin]=!(state.pins[pin.dataset.devPin]??true);save();renderPins();return;}
    const switchButton=target.closest('.ant-switch');if(switchButton){const on=switchButton.getAttribute('aria-checked')!=='true';switchButton.setAttribute('aria-checked',String(on));switchButton.classList.toggle('ant-switch-checked',on);if(switchButton.closest('.amb-form'))validateForm();return;}
    const pagination=target.closest('.ant-pagination-item, .ant-pagination-next, .ant-pagination-prev');
    if(pagination&&activeOverlay){event.preventDefault();if(pagination.classList.contains('ant-pagination-disabled'))return;const current=Number(activeOverlay.dataset.devPage)||1,page=pagination.classList.contains('ant-pagination-next')?current+1:pagination.classList.contains('ant-pagination-prev')?current-1:Number(pagination.title||text(pagination));drillPage(page);return;}
    const buttonTarget=target.closest('button');if(!buttonTarget)return;
    const label=text(buttonTarget),action=buttonTarget.dataset.devAction,metricId=buttonTarget.closest('[data-dev-metric]')?.dataset.devMetric,metric=state.metrics.find(metric=>metric.id===metricId);
    if(action==='reset'||label==='Сбросить'){state.filters={period:window.AnalyticsDemo?'Последний год':'Текущий квартал',recruiter:'',department:'',manager:'',from:'',to:''};state.localFilters={};save();renderScope();}
    else if(action==='publish')publishMetric();
    else if(action==='new-metric'||label==='Новая метрика')openMetric();
    else if(action==='edit'&&metric)openMetric(metric);
    else if(action==='versions'&&metric)openVersions(metric);
    else if(action==='breakdown'&&metric)openBreakdown(metric,metric.breakdowns?.[0]||'vacancy');
    else if(action==='archive'&&metric){metric.archived=true;save();renderScope();notify(`«${metric.name}» в архиве`,()=>{metric.archived=false;save();renderScope();});}
    else if(label==='Проверить на данных'||action==='preview')previewMetric();
    else if(action==='journal'||label==='Журнал выгрузок')openJournal();
    else if(label==='Выгрузить в Excel'||action==='export')downloadTables(activeOverlay||$('#ats-screen'));
    else if(buttonTarget.matches(cls('drill')))openDrill(buttonTarget);
    else if(buttonTarget.title==='Свернуть меню'||buttonTarget.title==='Развернуть меню'||buttonTarget.getAttribute('aria-label')?.includes('меню')){const sidebar=$('aside'),shell=$('[class*="AppShell_shell__"]'),collapsed=!sidebar.classList.contains('Sidebar_collapsed__vtMg5');sidebar.classList.toggle('Sidebar_collapsed__vtMg5',collapsed);shell.classList.toggle('AppShell_collapsed__fbh7Q',collapsed);buttonTarget.setAttribute('aria-label',collapsed?'Развернуть меню':'Свернуть меню');buttonTarget.setAttribute('aria-expanded',String(!collapsed));}
  });
  // Ссылки оболочки ведут в основной макет; они никогда не обращаются к стенду.
  const routes={'/home':'dashboard','/tasks':'tasks','/calendar':'calendar','/analytics':'analytics','/applications':'requisitions','/requisitions':'requisitions','/settings':'settings','/search':'search','/candidates':'search','/vacancies':'vacancy','/notifications':'tasks','/messages':'tasks','/archive':'portfolio'};
  $$('a').forEach(link=>{try{const path=new URL(link.getAttribute('href'),location.href).pathname;if(path==='/analytics'){link.href='#';return;}if(path==='/home'){link.href='./dashboard.html';link.dataset.devDocument='dashboard';}else if(routes[path]){link.href=`./ats-product.html#${routes[path]}`;link.dataset.devRoute=routes[path];}else if(path.startsWith('/vacanc')){link.href='./ats-product.html#vacancy';link.dataset.devRoute='vacancy';}else if(path.startsWith('/candidate'))link.href='./candidate-card-current.html';}catch(_){}});
  window.AnalyticsSelects?.install(document);
  renderScope();
  save();
  window.AnalyticsDevCopy={reset(){localStorage.removeItem(storageKey);location.reload();},getState:()=>JSON.parse(JSON.stringify(state)),openMetric,openJournal,xlsx};
})();
