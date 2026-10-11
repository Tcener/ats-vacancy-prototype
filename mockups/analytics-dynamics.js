/* Динамика аналитики: только вымышленные данные, без операций над ATS. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = (value, digits = 1) => Number(value).toLocaleString('ru-RU', {maximumFractionDigits:digits});
  const present = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const palette = ['#6B53D5','#F664B4','#34B879','#9276DC','#39ADBD','#B47F36','#327CB9','#BB4E76'];
  const definitions = [
    {id:'ttf', name:'Time to Fill', group:'days', unit:'дн.', color:palette[0]},
    {id:'tto', name:'Time to Offer', group:'days', unit:'дн.', color:palette[1]},
    {id:'acceptance', name:'Offer acceptance rate', group:'percent', unit:'%', color:palette[2]},
    {id:'nps', name:'NPS нанимающих', group:'nps', unit:'п.', color:palette[3]},
    {id:'csi', name:'CSI кандидатов', group:'score-5', unit:'/ 5', color:palette[4]}
  ];
  const monthlyCache = new Map(); let cachedDemo = null;
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])])) : value;
  function calculateMonth(metric, filters, range) {
    const demo = window.AnalyticsDemo;
    if (cachedDemo !== demo) {monthlyCache.clear();cachedDemo=demo;}
    const queryFilters = {...filters,period:'Свой диапазон…',from:range.from,to:range.to};
    const key = JSON.stringify(stable({filters:queryFilters,fields:metric.fields || {},pause:!!metric.pause,version:metric.version || 1}));
    if (monthlyCache.has(key)) return monthlyCache.get(key);
    const result = demo?.calculate?.(metric.fields || {},queryFilters,{},!!metric.pause);
    if (monthlyCache.size >= 500) monthlyCache.delete(monthlyCache.keys().next().value);
    monthlyCache.set(key,result);return result;
  }
  const activeMetrics = metrics => (metrics || []).filter(metric => !metric.archived && metric.id != null);
  const customUnit = fields => window.AnalyticsMetricBuilder?.unitFor(fields || {}) ?? (/Длительность/.test(fields?.['Способ расчёта'] || fields?.method || '') ? 'дн.' : /Доля/.test(fields?.['Способ расчёта'] || fields?.method || '') ? '%' : /оценка ИИ/i.test(fields?.['Способ расчёта'] || fields?.method || '') ? '/ 10' : '');
  const groupFor = unit => ['дн.','дня','дней','days'].includes(unit) ? 'days' : unit === '%' ? 'percent' : unit === '/ 5' ? 'score-5' : unit === '/ 10' ? 'score-10' : unit ? `unit:${unit}` : 'count';
  const available = metrics => [...definitions.map(item => ({...item})), ...activeMetrics(metrics).map((metric, index) => ({id:`custom:${metric.id}`, name:metric.name || 'Кастомная метрика', custom:true, metric, unit:customUnit(metric.fields), group:groupFor(customUnit(metric.fields)), color:palette[(index + 5) % palette.length], version:metric.version || 1}))];
  function normalizeSettings(settings = {}, metrics = []) {
    const ids = new Set(available(metrics).map(item => item.id));
    const selected = Array.isArray(settings.selected) ? settings.selected : ['ttf','tto'];
    return {selected:[...new Set(selected)].filter(id => ids.has(id)), mode:settings.mode === 'bar' ? 'bar' : 'line', pickerOpen:!!settings.pickerOpen};
  }
  function monthWindow(month, range) {
    if (!/^\d{4}-\d{2}$/.test(month?.id || '') || !range?.from || !range?.to) return null;
    const [year, index] = month.id.split('-').map(Number);
    if (index < 1 || index > 12) return null;
    const last = new Date(Date.UTC(year,index,0)).toISOString().slice(0,10);
    const first = `${month.id}-01`, from = first > range.from ? first : range.from, to = last < range.to ? last : range.to;
    return from <= to ? {from,to} : null;
  }
  function buildSeries(data = {}, metrics = [], settings = {}, filters = {}) {
    const normalized = normalizeSettings(settings,metrics), months = data.months || [];
    const chosen = available(metrics).filter(item => normalized.selected.includes(item.id));
    return chosen.map(item => {
      const samples = months.map(month => {
        const range = monthWindow(month,data.range);
        if (!range || data.invalidRange || data.incompatibleFilters) return {id:month.id,label:month.label,value:null,observations:0};
        const cohort = (data.records || []).filter(record => record.date >= range.from && record.date <= range.to);
        let value = null, observations = 0, unit = item.unit;
        if (item.custom) {
          const result = calculateMonth(item.metric,filters,range);
          // Событийная метрика может иметь наблюдения из более ранней когорты.
          const fields=item.metric.fields||{},eventBased=fields['Конструктор']==='v2'&&fields['Способ расчёта']==='Количество'&&['Людей','Офферы','HR интервью','Технические интервью','Финальные интервью','Закрытые задачи'].includes(fields['Считать']);
          value = (cohort.length || eventBased&&result?.empty===false) && present(result?.value) ? Number(result.value) : null;
          observations = Number(result?.observations) || 0;
          unit = result?.unit ?? unit;
        } else if (item.id === 'acceptance') {
          const resolved = cohort.filter(record => record.offerResolved);
          observations = resolved.length;
          value = observations ? resolved.filter(record => record.offerAccepted).length / observations * 100 : null;
        } else {
          value = present(month[item.id]) ? Number(month[item.id]) : null;
          observations = Number(month.counts?.[item.id]) || 0;
        }
        return {id:month.id,label:month.label,...range,value,observations,unit};
      });
      const unit = samples.find(sample => present(sample.value))?.unit ?? item.unit;
      return {...item,unit,group:item.id === 'nps' ? 'nps' : groupFor(unit),samples};
    });
  }
  function formatValue(value, unit, id = '') {
    if (!present(value)) return 'Нет наблюдений';
    return `${id === 'nps' && value > 0 ? '+' : ''}${number(value,id === 'nps' ? 0 : 1)}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`;
  }
  const groupLabels = {days:'Сроки · календарные дни',percent:'Конверсии · %',nps:'NPS · от −100 до +100', 'score-5':'CSI · шкала 1–5','score-10':'Оценки ИИ · шкала 0–10',count:'Количество · единиц'};
  function domainFor(group, series, mode = 'line') {
    if (group === 'percent') return {min:0,max:100};
    if (group === 'nps') return {min:-100,max:100};
    if (group === 'score-5') return {min:mode === 'bar' ? 0 : 1,max:5};
    if (group === 'score-10') return {min:0,max:10};
    const values = series.flatMap(item => item.samples.map(sample => sample.value)).filter(present).map(Number);
    const maxValue = Math.max(0,...values), step = maxValue <= 10 ? 2 : maxValue <= 50 ? 10 : maxValue <= 200 ? 50 : Math.pow(10,Math.floor(Math.log10(maxValue)));
    return {min:Math.min(0,...values),max:Math.max(step,Math.ceil(maxValue/step)*step)};
  }
  function drawGroup(group, series, mode, chartIndex) {
    const samples = series[0]?.samples || [], label = groupLabels[group] || `Единицы: ${series[0]?.unit || 'значение'}`;
    const legend = `<div class="ad-dynamics-legend">${series.map(item => `<span><i style="background:${item.color}"></i>${esc(item.name)}${item.custom ? `<small>v${item.version}</small>` : ''}</span>`).join('')}</div>`;
    if (!series.some(item => item.samples.some(sample => present(sample.value)))) return `<section class="ad-dynamics-chart-card"><h3>${esc(label)}</h3>${legend}<div class="ad-dynamics-empty">В выбранном периоде нет наблюдений для этих показателей.</div></section>`;
    const W = 720, H = 250, left = 49, right = 24, top = 24, bottom = 39, plotH = H-top-bottom, plotW = W-left-right;
    const domain = domainFor(group,series,mode), span = domain.max-domain.min || 1;
    const slot = plotW / Math.max(1,samples.length), x = index => left + slot*(index+.5), y = value => top + plotH-(Number(value)-domain.min)/span*plotH;
    const baseline = y(Math.max(domain.min,Math.min(domain.max,0)));
    const grids = Array.from({length:5},(_,index) => {
      const value = domain.min+span*index/4, yy = y(value);
      return `<line x1="${left}" x2="${W-right}" y1="${yy}" y2="${yy}" class="ad-dynamics-grid"/><text x="${left-10}" y="${yy+4}" text-anchor="end">${number(value)}</text>`;
    }).join('');
    const glyphs = series.map((item, seriesIndex) => {
      const title = sample => `${sample.label} · ${item.name}: ${formatValue(sample.value,item.unit,item.id)} · ${number(sample.observations,0)} наблюдений${item.custom ? ` · формула v${item.version}` : ''}`;
      if (mode === 'bar') {
        const barW = Math.min(48,slot*.72 / Math.max(1,series.length));
        return item.samples.map((sample,index) => {
          if (!present(sample.value)) return '';
          const xx = x(index)-barW*series.length/2+seriesIndex*barW, yy = y(sample.value), height = Math.abs(baseline-yy);
          return `<rect x="${xx+1}" y="${Math.min(baseline,yy)}" width="${Math.max(1,barW-2)}" height="${Math.max(1,height)}" rx="4" fill="${item.color}" tabindex="0" role="img" aria-label="${esc(title(sample))}"><title>${esc(title(sample))}</title></rect>`;
        }).join('');
      }
      const segments = []; let segment = [];
      item.samples.forEach((sample,index) => {if (present(sample.value)) segment.push({sample,index});else if (segment.length) {segments.push(segment);segment=[];}});
      if (segment.length) segments.push(segment);
      return segments.map(part => `${part.length > 1 ? `<polyline points="${part.map(({sample,index}) => `${x(index)},${y(sample.value)}`).join(' ')}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${part.map(({sample,index}) => `<circle cx="${x(index)}" cy="${y(sample.value)}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" tabindex="0" role="img" aria-label="${esc(title(sample))}"><title>${esc(title(sample))}</title></circle>`).join('')}`).join('');
    }).join('');
    const ticks = samples.map((sample,index) => `<text x="${x(index)}" y="${H-12}" text-anchor="middle">${esc(sample.label)}</text>`).join('');
    return `<section class="ad-dynamics-chart-card"><h3>${esc(label)}</h3>${legend}<svg class="ad-dynamics-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ad-dynamics-title-${chartIndex} ad-dynamics-desc-${chartIndex}"><title id="ad-dynamics-title-${chartIndex}">${esc(label)} · ${mode === 'bar' ? 'Столбчатая диаграмма' : 'Линейный график'}</title><desc id="ad-dynamics-desc-${chartIndex}">Помесячная динамика. Пропуски означают отсутствие наблюдений, а не нулевой результат.</desc>${grids}<line x1="${left}" x2="${W-right}" y1="${baseline}" y2="${baseline}" class="ad-dynamics-zero"/>${glyphs}${ticks}</svg></section>`;
  }
  function render(data = {}, metrics = [], settings = {}, filters = {}) {
    const normalized = normalizeSettings(settings,metrics), items = available(metrics), series = buildSeries(data,metrics,normalized,filters);
    const pickerRows = (rows, title) => `<fieldset><legend>${esc(title)}</legend>${rows.map(item => `<label class="ad-dynamics-choice"><input type="checkbox" data-ad-dynamics-key="${esc(item.id)}" ${normalized.selected.includes(item.id) ? 'checked' : ''}><i style="background:${item.color}"></i><span>${esc(item.name)}${item.custom ? `<small>Формула v${item.version} · ${esc(item.unit || 'количество')}</small>` : ''}</span></label>`).join('')}</fieldset>`;
    const picker = `<details class="ad-dynamics-picker" data-ad-dynamics-picker ${normalized.pickerOpen ? 'open' : ''}><summary aria-label="Выбрать показатели динамики"><span aria-hidden="true">☷</span> Показатели <b>${normalized.selected.length}</b><span aria-hidden="true">⌄</span></summary><div class="ad-dynamics-menu"><div class="ad-dynamics-presets"><button type="button" data-ad-dynamics-preset="all">Все показатели</button><button type="button" data-ad-dynamics-preset="speed">Только сроки</button><button type="button" data-ad-dynamics-preset="none">Снять выбор</button></div>${pickerRows(items.filter(item => !item.custom),'Основные показатели')}${items.some(item => item.custom) ? pickerRows(items.filter(item => item.custom),'Кастомные метрики') : '<p class="ad-dynamics-menu-hint">Созданные кастомные метрики появятся здесь.</p>'}</div></details>`;
    const view = `<div class="ad-view-toggle" role="group" aria-label="Вид графика динамики"><button type="button" data-ad-dynamics-mode="line" class="${normalized.mode === 'line' ? 'active' : ''}" aria-pressed="${normalized.mode === 'line'}">Линии</button><button type="button" data-ad-dynamics-mode="bar" class="${normalized.mode === 'bar' ? 'active' : ''}" aria-pressed="${normalized.mode === 'bar'}">Столбцы</button></div>`;
    const groups = new Map();series.forEach(item => {if (!groups.has(item.group)) groups.set(item.group,[]);groups.get(item.group).push(item);});
    const body = !series.length ? '<div class="ad-dynamics-empty"><strong>Выберите показатели для графика</strong><span>Нажмите «Показатели» и отметьте нужные основные или кастомные метрики.</span></div>' : `<div class="ad-dynamics-charts ${groups.size === 1 ? 'single' : ''}">${[...groups].map(([group,items],index) => drawGroup(group,items,normalized.mode,index)).join('')}</div>`;
    const custom = series.filter(item => item.custom);
    const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('.') : '';
    const range = data.range?.from && data.range?.to ? `${date(data.range.from)} — ${date(data.range.to)}` : 'Период не выбран';
    return `<article class="ad-panel ad-dynamics" data-ad-dynamics><header class="ad-panel-head"><div><span class="ad-eyebrow">Динамика</span><h2>Как меняются показатели</h2><p>Сроки, конверсии и качество подбора — по месяцам. <span class="ad-dynamics-range">${esc(range)}</span></p></div><div class="ad-panel-actions">${picker}${view}</div></header><div class="ad-panel-body">${body}<p class="ad-dynamics-note">${groups.size > 1 ? 'Показатели с разными единицами показаны на отдельных шкалах. ' : ''}Основные показатели — по месяцу добавления на вакансию; исходы известны до 30.09.2026. Пропуск — нет наблюдений.${custom.length ? ` Кастомные показатели рассчитаны по своей версии формулы для каждого месяца: когорта либо дата события, как задано в метрике.` : ''}</p></div></article>`;
  }
  const mounted = new WeakMap();
  function mount(main, options = {}) {
    if (!main?.addEventListener) return;
    const existing = mounted.get(main);
    if (existing) {existing.options=options;return;}
    const handle = {options};mounted.set(main,handle);
    const handledClicks = new WeakSet();
    const change = (patch, options = {}) => {
      const current = handle.options.settings || {};
      const next = {...current,...patch};
      handle.options.settings = next;
      handle.options.onChange?.(next,options);
    };
    const closePicker = () => {
      main.querySelector('[data-ad-dynamics-picker]')?.removeAttribute?.('open');
      change({pickerOpen:false},{render:false});
    };
    main.addEventListener('click',event => {
      const summary = event.target.closest('[data-ad-dynamics-picker] > summary');
      if (summary) {event.preventDefault();const open = !summary.parentElement.open;summary.parentElement.open=open;change({pickerOpen:open},{render:false});summary.focus();return;}
      const mode = event.target.closest('[data-ad-dynamics-mode]');
      if (mode) {handledClicks.add(event);change({mode:mode.dataset.adDynamicsMode,pickerOpen:false});main.querySelector(`[data-ad-dynamics-mode="${mode.dataset.adDynamicsMode}"]`)?.focus();return;}
      const preset = event.target.closest('[data-ad-dynamics-preset]');
      if (preset) {change({selected:preset.dataset.adDynamicsPreset === 'all' ? [...main.querySelectorAll('[data-ad-dynamics-key]')].map(input => input.dataset.adDynamicsKey) : preset.dataset.adDynamicsPreset === 'speed' ? ['ttf','tto'] : [],pickerOpen:true});main.querySelector(`[data-ad-dynamics-preset="${preset.dataset.adDynamicsPreset}"]`)?.focus();}
    });
    main.addEventListener('change',event => {
      if (!event.target.matches('[data-ad-dynamics-key]')) return;
      const id = event.target.dataset.adDynamicsKey;
      change({selected:[...main.querySelectorAll('[data-ad-dynamics-key]:checked')].map(input => input.dataset.adDynamicsKey),pickerOpen:true});
      [...main.querySelectorAll('[data-ad-dynamics-key]')].find(input => input.dataset.adDynamicsKey === id)?.focus();
    });
    main.ownerDocument.addEventListener('click',event => {
      if (!handledClicks.has(event) && handle.options.settings?.pickerOpen && !event.target.closest('[data-ad-dynamics-picker]')) closePicker();
    });
    main.ownerDocument.addEventListener('keydown',event => {
      if (event.key !== 'Escape' || !handle.options.settings?.pickerOpen) return;
      closePicker();main.querySelector('[data-ad-dynamics-picker] > summary')?.focus();
    });
  }
  window.AnalyticsDynamics = {render,mount,buildSeries,normalizeSettings,monthWindow,domainFor,available};
})();
