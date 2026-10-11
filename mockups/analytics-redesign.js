/* Фирменный демонстрационный дашборд. Только разметка: данные и действия живут отдельно. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = (value, digits = 0) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU', {maximumFractionDigits:digits, minimumFractionDigits:digits}) : '—';
  const sum = (rows, key) => (rows || []).reduce((total, row) => total + (Number(row[key]) || 0), 0);
  const percent = (part, total, digits = 1) => total > 0 ? `${n(part / total * 100, digits)}%` : '—';
  const colors = ['#6B53D5','#5EDB8A','#FF6FB8','#D9ECA2','#B6A2ED','#6FBBCC','#F0CA73','#C9C5D4'];
  const icon = name => ({export:'↗',journal:'◷',plus:'＋',info:'ⓘ',arrow:'→'}[name] || '');
  const detail = (kind, key, purpose = '') => `data-ad-detail="${esc(kind)}" data-ad-key="${esc(key)}"${purpose ? ` data-ad-purpose="${esc(purpose)}"` : ''}`;
  const empty = (label = 'В этой выборке пока нет данных') => `<div class="ad-empty"><span aria-hidden="true">◌</span><strong>${esc(label)}</strong><p>Измените фильтры. Отсутствие наблюдений не означает нулевую эффективность.</p></div>`;
  const labelFor = (value, fallback = '') => typeof value === 'string' ? value : value?.name || value?.label || value?.id || fallback;
  const options = key => window.AnalyticsDemo?.options?.[key] || [];
  const selected = (value, option) => String(value ?? '') === String(option ?? '') ? ' selected' : '';
  const date = value => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value);
  };
  const rangeLabel = data => {
    const range = data?.range || {}, dates = range.from && range.to ? `${date(range.from)} — ${date(range.to)}` : '';
    return range.label && dates && !String(range.label).includes(date(range.from)) ? `${range.label} · ${dates}` : range.label || dates;
  };
  function selectField(label, key, value, section = '', blank = '') {
    const periods = ['Последний год','Последние полгода','Текущий квартал','Последние 30 дней','Свой диапазон…'];
    const map = {period:'periods',recruiter:'recruiters',department:'departments',manager:'managers',pipeline:'pipelines',source:'sources',initiator:'rejectInitiators'};
    let rows = options(map[key]);
    if (!rows.length && key === 'period') rows = periods;
    if (section && key === 'period') rows = rows.filter(row => !labelFor(row).startsWith('Свой диапазон'));
    if (!rows.length && key === 'initiator') rows = ['Компания','Кандидат','Автоматизация'];
    const values = rows.map(row => ({value:labelFor(row), id:row.id, name:labelFor(row)}));
    if (value && !values.some(row => row.value === value || row.id === value)) values.unshift({value,name:value});
    const attributes = section ? `data-ad-section="${esc(section)}" data-ad-localkey="${esc(key)}"` : `data-ad-filter="${esc(key)}"`;
    return `<label class="ad-filter"><span>${esc(label)}</span><select ${attributes} aria-label="${esc(label)}${section ? `: ${esc(section)}` : ''}">${blank ? `<option value=""${selected(value,'')}>${esc(blank)}</option>` : ''}${values.map(row => `<option value="${esc(row.value)}"${value === row.id ? ' selected' : selected(value,row.value)}>${esc(row.name)}</option>`).join('')}</select></label>`;
  }
  function filters(section, values, fields) {
    const labels = {period:'Период',recruiter:'Рекрутер',department:'Департамент',pipeline:'Шаблон воронки',source:'Источник',initiator:'Кто отказал'};
    const blanks = {period:'Период экрана',recruiter:'Все рекрутеры',department:'Все департаменты',pipeline:'Все шаблоны',source:'Все источники',initiator:'Все отказы'};
    return `<div class="ad-local-filters" aria-label="Фильтры блока ${esc(section)}">${fields.map(key => selectField(labels[key],key,values?.[key] || '',section,blanks[key])).join('')}<button type="button" class="ad-button ghost" data-ad-reset="${esc(section)}" aria-label="Сбросить фильтры блока ${esc(section)}">Сбросить</button></div>`;
  }
  function toggle(section, views) {
    const table = views?.[section] === 'table' || views?.[section] === 'Таблица';
    return `<div class="ad-view-toggle" role="group" aria-label="Представление блока"><button type="button" data-ad-view="${section}" data-ad-mode="chart" aria-pressed="${!table}" class="${table ? '' : 'active'}">Диаграмма</button><button type="button" data-ad-view="${section}" data-ad-mode="table" aria-pressed="${table}" class="${table ? 'active' : ''}">Таблица</button></div>`;
  }
  const isTable = (section, views) => views?.[section] === 'table' || views?.[section] === 'Таблица';
  function panelHead(eyebrow, title, subtitle = '', actions = '') {
    return `<header class="ad-panel-head"><div><span class="ad-eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${actions ? `<div class="ad-panel-actions">${actions}</div>` : ''}</header>`;
  }
  function table(headers, rows, caption = '') {
    return `<div class="ad-table-wrap"><table class="ad-table">${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${headers.map(header => `<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function sparkline(values, tone = '#6B53D5') {
    const numbers = values.filter(value => value !== null && value !== undefined && value !== '').map(Number).filter(Number.isFinite);
    if (numbers.length < 2) return '';
    const min = Math.min(...numbers), span = Math.max(...numbers) - min || 1;
    const points = numbers.map((value,index) => `${index / (numbers.length - 1) * 86},${23 - (value-min)/span*18}`).join(' ');
    return `<svg class="ad-kpi-mini" viewBox="0 0 88 27" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function delta(value, lowerIsBetter, unit = '') {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '<span class="ad-kpi-delta ad-muted">Нет сопоставимого периода</span>';
    const number = Number(value), good = lowerIsBetter ? number < 0 : number > 0;
    return `<span class="ad-kpi-delta ${number === 0 ? 'ad-muted' : good ? 'ad-positive' : 'ad-negative'}">${number < 0 ? '↘' : number > 0 ? '↗' : '→'} ${number > 0 ? '+' : ''}${n(number,1)}${unit ? ` ${esc(unit)}` : ''} <small>к предыдущему периоду</small></span>`;
  }
  function kpis(state, data) {
    const k = data.kpis || {}, counts = k.counts || {}, deltas = k.deltas || {}, months = data.months || [];
    const definitions = [
      {key:'ttf',name:'Time to Fill',value:k.ttf,unit:'дня',hint:'От согласования заявки до принятия оффера',sample:`${n(counts.ttf)} закрытых позиций`,lower:true,tone:'#6B53D5'},
      {key:'tto',name:'Time to Offer',value:k.tto,unit:'дня',hint:'От добавления на вакансию до отправки оффера',sample:`${n(counts.tto)} кандидатов с оффером`,lower:true,tone:'#FF6FB8'},
      {key:'acceptance',name:'Offer acceptance rate',value:k.acceptance,unit:'%',hint:'Принятые офферы среди офферов с итоговым ответом',sample:`${n(counts.offersAccepted)} из ${n(counts.offersResolved)} офферов`,tone:'#5EDB8A'},
      {key:'nps',name:'NPS нанимающих',value:k.nps,unit:'',hint:'Готовность нанимающих рекомендовать сервис подбора',sample:`${n(counts.nps)} ответов · шкала от −100 до +100`,tone:'#6B53D5'},
      {key:'csi',name:'CSI кандидатов',value:k.csi,unit:'/ 5',hint:'Удовлетворённость кандидатов процессом найма',sample:`${n(counts.csi)} ответов · шкала от 1 до 5`,tone:'#5EDB8A'}
    ];
    return `<section class="ad-kpis" aria-label="Ключевые показатели">${definitions.map((item,index) => {
      const value = data.empty || item.value === null || item.value === undefined ? '—' : `${item.key === 'nps' && item.value > 0 ? '+' : ''}${n(item.value,item.key === 'nps' ? 0 : 1)}`;
      const pinned = state.pins?.[item.name] !== false;
      return `<article class="ad-kpi"><div class="ad-kpi-top"><span class="ad-kpi-label">${esc(item.name)}</span>${index < 3 ? `<button type="button" class="ad-pin ${pinned ? 'active' : ''}" data-dev-pin="${item.name}" aria-pressed="${pinned}" title="${pinned ? 'Убрать с главной' : 'Вывести на главную'}">${pinned ? '✓' : '＋'} ${pinned ? 'На главной' : 'На главную'}</button>` : ''}</div><button type="button" class="ad-kpi-detail" ${detail('kpi',item.key)} aria-label="Как считается ${esc(item.name)}"><div class="ad-kpi-value">${value}<small>${data.empty ? '' : esc(item.unit)}</small></div>${delta(data.empty ? null : deltas[item.key],item.lower,item.key === 'csi' ? 'балла' : item.key === 'ttf' || item.key === 'tto' ? 'дня' : 'п.п.')}<p>${esc(item.hint)}</p><span class="ad-kpi-foot">${esc(item.sample)}</span>${data.empty ? '' : sparkline(months.map(month => month[item.key]),item.tone)}</button></article>`;
    }).join('')}</section>`;
  }
  function trend(data) {
    const months = data.months || [];
    if (!months.length || data.empty) return empty('Для графика скорости нет завершённых наблюдений');
    const W = 1120, H = 246, left = 45, right = 22, top = 20, bottom = 37;
    const present = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    const values = months.flatMap(month => [month.ttf,month.tto]).filter(present).map(Number);
    if (!values.length) return empty('Для графика скорости нет завершённых наблюдений');
    const max = Math.max(10,Math.ceil(Math.max(...values) / 10) * 10), plotH = H-top-bottom, plotW = W-left-right;
    const x = index => left + index / Math.max(1,months.length-1) * plotW;
    const y = value => top + plotH - Number(value)/max*plotH;
    const grids = Array.from({length:5},(_,index) => {
      const value = max / 4 * index, yy = y(value);
      return `<line x1="${left}" x2="${W-right}" y1="${yy}" y2="${yy}" stroke="#EDEAF4"/><text x="${left-12}" y="${yy+4}" text-anchor="end">${n(value)}</text>`;
    }).join('');
    const series = [{key:'ttf',label:'Time to Fill',color:'#6B53D5'},{key:'tto',label:'Time to Offer',color:'#FF6FB8'}];
    const lines = series.map(item => {
      const segments = []; let current = [];
      months.forEach((month,index) => { if (present(month[item.key])) current.push({month,index}); else if (current.length) {segments.push(current);current=[];} });
      if (current.length) segments.push(current);
      return segments.map(segment => {
        const points = segment.map(({month,index}) => `${x(index)},${y(month[item.key])}`).join(' ');
        const fill = `${x(segment[0].index)},${H-bottom} ${points} ${x(segment.at(-1).index)},${H-bottom}`;
        return `${segment.length > 1 ? `<polygon points="${fill}" fill="${item.color}" fill-opacity="${item.key === 'ttf' ? '.035' : '.025'}"/><polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${segment.map(({month,index}) => `<circle cx="${x(index)}" cy="${y(month[item.key])}" r="4" fill="#fff" stroke="${item.color}" stroke-width="2"><title>${esc(month.label)} · ${item.label}: ${n(month[item.key],1)} дня</title></circle>`).join('')}`;
      }).join('');
    }).join('');
    const ticks = months.map((month,index) => `<text x="${x(index)}" y="${H-12}" text-anchor="middle">${esc(month.label)}</text>`).join('');
    return `<div class="ad-trend-legend"><span><i style="background:#6B53D5"></i>Time to Fill</span><span><i style="background:#FF6FB8"></i>Time to Offer</span><small>Медиана, календарные дни · группировка по месяцу начала процесса</small></div><div class="ad-chart"><svg class="ad-trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Динамика скорости найма"><title>Time to Fill и Time to Offer по месяцам</title>${grids}${lines}${ticks}</svg></div>`;
  }
  function donut(rows, total, key, title, unit = 'выходов', kind = 'source') {
    let angle = 0;
    const stops = rows.map((row,index) => {
      const start = angle; angle += total ? Number(row[key])/total*100 : 0;
      return `${colors[index % colors.length]} ${start.toFixed(3)}% ${angle.toFixed(3)}%`;
    });
    if (!rows.length || !total) return empty();
    return `<div class="ad-chart-layout"><div class="ad-donut" role="img" aria-label="${esc(title)}: ${n(total)} ${esc(unit)}" style="background:conic-gradient(${stops.join(',')})"><span class="ad-donut-center"><strong>${n(total)}</strong><small>${esc(unit)}</small></span></div><div class="ad-legend">${rows.map((row,index) => `<button type="button" class="ad-legend-item" ${detail(kind,row.id,kind === 'source' ? 'hires' : '')}><i class="ad-legend-dot" style="background:${colors[index % colors.length]}"></i><span class="ad-legend-name">${esc(row.name)}</span><span class="ad-legend-meta"><strong>${percent(row[key],total)}</strong><small>${n(row[key])} ${esc(unit)}</small></span></button>`).join('')}</div></div>`;
  }
  function sourceShare(data, views) {
    const rows = data.sources || [], total = sum(rows,'hires');
    const body = data.empty || !total ? empty('За этот период нет подтверждённых выходов') : isTable('sources-share',views) ? table(['Источник','Выходы','Доля всех выходов'],rows.map(row => [
      `<button type="button" class="ad-detail-link" ${detail('source',row.id,'hires')}>${esc(row.name)}</button>`, n(row.hires),percent(row.hires,total)
    ]),'Вклад источников в выходы') : donut(rows,total,'hires','Доля источников во всех выходах');
    return `<article class="ad-panel" data-ad-section="sources">${panelHead('Вклад в наймы','Откуда приходят наши сотрудники','Доля каждого источника в общем числе выходов.',toggle('sources-share',views))}<div class="ad-panel-body"><div class="ad-team-summary"><strong>${n(total)} <small>выходов за период</small></strong>${total ? '<span class="ad-pill">100% распределены по источникам</span>' : ''}</div>${body}<p class="ad-note">Один выход учитывается один раз по закреплённому источнику кандидата. «Из базы» — повторное использование внутренней базы.</p></div></article>`;
  }
  function sourceEfficiency(data, views) {
    const rows = data.sources || [];
    const max = Math.max(1,...rows.map(row => row.taken ? row.hires/row.taken*100 : 0));
    let body;
    if (data.empty || !sum(rows,'taken')) body = empty();
    else if (isTable('sources-efficiency',views)) body = table(['Источник','Взято в работу','Офферы','Выходы','Конверсия в выход'],rows.map(row => [
      `<button type="button" class="ad-detail-link" ${detail('source',row.id,'taken')}>${esc(row.name)}</button>`,n(row.taken),n(row.offers),n(row.hires),percent(row.hires,row.taken)
    ]),'Эффективность источников');
    else body = `<div class="ad-chart"><div class="ad-columns" role="group" aria-label="Конверсия источников в выход">${rows.map((row,index) => {
      const rate = row.taken ? row.hires/row.taken*100 : 0;
      return `<button type="button" class="ad-column" ${detail('source',row.id,'taken')} aria-label="${esc(row.name)}: ${n(row.hires)} выходов из ${n(row.taken)} взятых в работу, ${percent(row.hires,row.taken)}"><strong class="ad-column-value">${percent(row.hires,row.taken)}</strong><span class="ad-column-track"><i class="ad-column-fill" style="height:${Math.max(rate ? 3 : 0,rate/max*100)}%;background:${colors[index % colors.length]}"></i></span><span class="ad-column-label">${esc(row.name)}</span><small>${n(row.hires)} из ${n(row.taken)}</small></button>`;
    }).join('')}</div></div>`;
    return `<article class="ad-panel" data-ad-section="sources">${panelHead('Эффективность','Какие источники лучше конвертируют','Выходы из кандидатов, взятых в работу на вакансии.',toggle('sources-efficiency',views))}<div class="ad-panel-body">${body}<p class="ad-note">Проценты — конверсия внутри каждого источника, а не доля общей массы. Сравнивайте с учётом размера выборки и сложности вакансий.</p></div></article>`;
  }
  function funnel(data, views) {
    const supplied = Array.isArray(data.funnel) && data.funnel.length;
    const rows = supplied ? data.funnel.filter(stage => stage.name !== 'Отказ') : (data.stages || []).filter(stage => !['Выход','Отказ'].includes(stage.name)).map(stage => ({...stage,count:stage.visits}));
    if (!rows.length || data.empty) return `<article class="ad-panel" data-ad-section="funnel">${panelHead('Воронка','Конверсии из этапа в этап','Общая картина по выбранным вакансиям.',toggle('funnel',views))}<div class="ad-panel-body">${empty()}</div></article>`;
    const body = isTable('funnel',views) ? table(['Этап','Кандидатов на этапе','Следующий переход','Конверсия'],rows.map((row,index) => [
      `<button type="button" class="ad-detail-link" ${detail('stage',row.id,'entered')}>${esc(row.name)}</button>`,n(row.count),index < rows.length-1 ? esc(rows[index+1].name) : '—', row.conversion === null || row.conversion === undefined ? '—' : `${n(row.conversion,1)}%`
    ]),'Общая воронка') : `<div class="ad-funnel-row">${rows.map((row,index) => `<div class="ad-funnel-step"><button type="button" ${detail('stage',row.id,'entered')}><span>${esc(row.name)}</span><strong>${n(row.count)}</strong><small>кандидатов</small></button></div>${index < rows.length-1 ? `<div class="ad-funnel-arrow"><strong>${row.conversion === null || row.conversion === undefined ? '—' : `${n(row.conversion,1)}%`}</strong><span aria-hidden="true">→</span><small>${row.conversion === null || row.conversion === undefined ? 'не единый переход' : 'перешли дальше'}</small></div>` : ''}`).join('')}</div>`;
    const rejected = typeof data.funnelRejected === 'object' ? data.funnelRejected?.count : data.funnelRejected;
    const terminalBranch = rejected === undefined || rejected === null ? '' : `<div class="ad-funnel-outcome"><button type="button" class="ad-pill ad-negative" ${detail('stage','reject','entered')}>Отказ · ${n(rejected)} кандидатов</button><span class="ad-muted">Отдельная финальная ветка: переход возможен с любого этапа, а не после «Выхода».</span></div>`;
    return `<article class="ad-panel" data-ad-section="funnel">${panelHead('Воронка','Конверсии из этапа в этап','Общие переходы по всем вакансиям выбранного периода.',toggle('funnel',views))}<div class="ad-panel-body">${body}${terminalBranch}<p class="ad-note">Когорта — кандидаты, добавленные в выбранном периоде; последующие события учтены до даты снимка. Каждая конверсия рассчитывается по кандидатам, прошедшим соответствующий переход, не как среднее процентов вакансий. Пропущенные и альтернативные этапы учитываются отдельно.</p></div></article>`;
  }
  function stages(data, views, local) {
    const rows = (data.stages || []).map(row => ({...row,sample:row.completedVisits ?? row.visits})), durationRows = rows.filter(row => Number.isFinite(row.days) && row.sample > 0);
    const max = Math.max(1,...durationRows.map(row => row.days));
    let body;
    if (data.empty || !rows.length) body = empty('Нет посещений этапов в выбранном периоде');
    else if (isTable('stages',views)) body = table(['Этап','Среднее время, дни','Завершённых посещений','Сейчас на этапе'],rows.map(row => [
      `<button type="button" class="ad-detail-link" ${detail('stage',row.id,'duration')}>${esc(row.name)}</button>`,row.days === null || row.days === undefined ? '—' : n(row.days,1),n(row.sample),n(row.current)
    ]),'Среднее время на этапах');
    else body = `<div class="ad-bars" role="group" aria-label="Среднее время на всех этапах воронки">${rows.map(row => {
      const terminal = ['Выход','Отказ'].includes(row.name), noTime = row.days === null || row.days === undefined;
      const explanation = terminal ? 'Финальный этап' : noTime ? 'Нет завершённых посещений' : '';
      return `<button type="button" class="ad-bar-item ${terminal ? 'ad-bar-terminal' : ''}" ${detail('stage',row.id,'duration')} aria-label="${esc(row.name)}: ${noTime ? explanation : `${n(row.days,1)} дня, ${n(row.sample)} завершённых посещений`}"><span class="ad-bar-label">${esc(row.name)}</span><span class="ad-bar-track">${!noTime ? `<i class="ad-bar-fill" style="width:${Math.max(row.days ? 2 : 0,row.days/max*100)}%;background:${row.days >= max*.8 ? '#FF6FB8' : '#6B53D5'}"></i>` : `<span class="ad-muted">${explanation}</span>`}</span><span class="ad-bar-value"><strong>${noTime ? '—' : `${n(row.days,1)} дн.`}</strong><small>${terminal ? 'не ожидание' : `${n(row.sample)} завершённых`}</small></span></button>`;
    }).join('')}</div>`;
    return `<article class="ad-panel" data-ad-section="stages">${panelHead('Скорость процесса','Время на этапах','Где процесс идёт быстро, а где кандидатам приходится ждать.',toggle('stages',views))}<div class="ad-panel-body">${filters('stages',local,['period','recruiter','pipeline','department'])}<div class="ad-scope">${esc(rangeLabel(data))} · среднее время по завершённым посещениям</div>${body}<p class="ad-note">Период отбирает завершённые посещения этапов. Среднее — от входа до выхода, в календарных днях; незавершённое ожидание не смешано с завершёнными посещениями. «Выход» и «Отказ» остаются в воронке как финальные этапы, но не имеют времени ожидания следующего перехода.</p></div></article>`;
  }
  function reasons(data, views, local) {
    const rows = (data.reasons || []).slice().sort((a,b) => b.count-a.count), total = sum(rows,'count');
    const company = sum(rows.filter(row => row.initiator === 'Компания' || row.initiator === 'company'),'count');
    const candidate = sum(rows.filter(row => row.initiator === 'Кандидат' || row.initiator === 'candidate'),'count');
    const automatic = sum(rows.filter(row => row.initiator === 'Автоматически' || row.initiator === 'automatic'),'count');
    const body = data.empty || !total ? empty('За этот период нет отказов') : isTable('reasons',views) ? table(['Причина','Кто отказал','Отказов','Доля отказов'],rows.map(row => [
      `<button type="button" class="ad-detail-link" ${detail('reason',row.id)}> ${esc(row.name)}</button>`,esc(row.initiatorName || ({company:'Компания',candidate:'Кандидат',automatic:'Автоматизация'}[row.initiator] || row.initiator)),n(row.count),percent(row.count,total)
    ]),'Причины отказов') : donut(rows,total,'count','Распределение причин отказов','отказов','reason');
    return `<article class="ad-panel" data-ad-section="reasons">${panelHead('Причины отказов','Почему процесс заканчивается отказом','Отказы компании и кандидатов — отдельно, с понятными причинами.',toggle('reasons',views))}<div class="ad-panel-body">${filters('reasons',local,['period','recruiter','pipeline','source','initiator'])}<div class="ad-team-summary"><div class="ad-stat"><strong>${n(total)}</strong><span>отказов за период</span></div><div class="ad-stat"><strong>${n(company)}</strong><span>решение компании</span></div><div class="ad-stat"><strong>${n(candidate)}</strong><span>решение кандидата</span></div><div class="ad-stat"><strong>${n(automatic)}</strong><span>автоматический переход</span></div></div>${body}<p class="ad-note">Считаются переходы на этап «Отказ» по дате отказа, а не по дате добавления кандидата. Поэтому число отказов не обязано совпадать с потерями когорты воронки. Возврат и повторный отказ отражаются отдельными событиями.</p></div></article>`;
  }
  function recruiters(data, views, local, metric = 'hires') {
    const rows = data.recruiters || [], hires = sum(rows,'hires'), activity = row => (Number(row.added)||0)+(Number(row.screened)||0)+(Number(row.interviews)||0)+(Number(row.tasksClosed)||0);
    const max = Math.max(1,...rows.map(row => metric === 'activity' ? activity(row) : row.hires));
    const teamSummary = `<div class="ad-team-summary"><div class="ad-stat"><strong>${n(sum(rows,'loadVacancies'))}</strong><span>вакансий в работе сейчас</span></div><div class="ad-stat"><strong>${n(hires)}</strong><span>выходов за период</span></div><div class="ad-stat"><strong>${n(sum(rows,'interviews'))}</strong><span>проведённых интервью</span></div><div class="ad-stat"><strong>${n(sum(rows,'tasksClosed'))}</strong><span>закрытых задач</span></div></div>`;
    const load = rows.length ? `<div class="ad-load-grid">${rows.map(row => `<button type="button" class="ad-load-card" ${detail('recruiter',row.id,'current')}><span class="ad-avatar">${esc(row.initials)}</span><span><strong>${esc(row.name)}</strong><small>${n(row.loadCandidates)} кандидатов · ${n(row.loadTasks)} задач</small></span><b>${n(row.loadVacancies)}<small>вакансий</small></b></button>`).join('')}</div>` : '';
    let body;
    if (data.empty || !rows.length) body = empty('В этой выборке нет работы рекрутеров');
    else if (isTable('recruiters',views)) body = table(['Рекрутер','Выходы','Офферы','Добавлено','Скрининги','Интервью','Закрыто задач','TTF, дни','Реакция, ч','В рамках SLA'],rows.map(row => [
      `<button type="button" class="ad-detail-link" ${detail('recruiter',row.id)}><span class="ad-avatar">${esc(row.initials)}</span>${esc(row.name)}</button>`, `<strong>${n(row.hires)}</strong>`,n(row.offers),n(row.added),n(row.screened),n(row.interviews),n(row.tasksClosed),row.ttf === null ? '—' : n(row.ttf,1),row.responseHours === null ? '—' : n(row.responseHours,1),row.slaPercent === null ? '—' : `${n(row.slaPercent,0)}%`
    ]),'Результаты и активность рекрутеров за период');
    else body = `<div class="ad-team-chart-head"><div class="ad-view-toggle" role="group" aria-label="Показатель рекрутеров"><button type="button" data-ad-recruiter-metric="hires" class="${metric === 'hires' ? 'active' : ''}" aria-pressed="${metric === 'hires'}">Выходы</button><button type="button" data-ad-recruiter-metric="activity" class="${metric === 'activity' ? 'active' : ''}" aria-pressed="${metric === 'activity'}">Активность</button></div><span class="ad-muted">${metric === 'activity' ? 'Добавления + скрининги + интервью + закрытые задачи' : 'Подтверждённые выходы за выбранный период'}</span></div><div class="ad-chart"><div class="ad-columns" role="group" aria-label="${metric === 'activity' ? 'Активность' : 'Выходы'} по рекрутерам">${rows.map((row,index) => {
      const value = metric === 'activity' ? activity(row) : row.hires, deltaHires = row.previousHires === null || row.previousHires === undefined ? null : row.hires-row.previousHires;
      return `<button type="button" class="ad-column" ${detail('recruiter',row.id)} aria-label="${esc(row.name)}: ${n(value)} ${metric === 'activity' ? 'действий' : 'выходов'}"><strong class="ad-column-value">${n(value)}</strong><span class="ad-column-track"><i class="ad-column-fill" style="height:${Math.max(value ? 3 : 0,value/max*100)}%;background:${colors[index % colors.length]}"></i></span><span class="ad-column-label">${esc(row.name)}</span><small>${metric === 'activity' ? `${n(row.interviews)} интервью · ${n(row.tasksClosed)} задач` : deltaHires === null ? 'нет прошлого периода' : `${deltaHires > 0 ? '+' : ''}${n(deltaHires)} к предыдущему периоду`}</small></button>`;
    }).join('')}</div></div>`;
    return `<article class="ad-panel" data-ad-section="recruiters">${panelHead('Команда','Результаты и активность рекрутеров','Текущая нагрузка и работа за период — два разных среза.',toggle('recruiters',views))}<div class="ad-panel-body">${filters('recruiters',local,['period','recruiter','department'])}${teamSummary}<h3 class="ad-block-title">Текущая нагрузка <small>на 30 сентября 2026</small></h3>${load}<h3 class="ad-block-title">Результаты за период <small>${esc(rangeLabel(data))}</small></h3>${body}<p class="ad-note">Показаны наблюдаемые действия, скорость и результаты, а не автоматическая оценка сотрудников. Объём работы зависит от сложности вакансий, рынка и роли рекрутера; число действий само по себе не доказывает эффективность. Нагрузка — текущий снимок, период влияет только на результаты и активность.</p></div></article>`;
  }
  function render(state, data, settings = {}) {
    state ||= {}; data ||= {}; const views = settings.views || {}, local = settings.localFilters || {}, sectional = settings.sectionsData || {}, f = state.filters || {};
    const sourcesData = sectional.sources || data;
    const reset = `<button type="button" class="ad-button ghost" data-dev-action="reset">Сбросить</button>`;
    const dates = f.period?.startsWith('Свой диапазон') ? `<label class="ad-filter ad-date-filter"><span>С — по</span><div><input data-ad-date="from" value="${esc(f.from)}" placeholder="ДД.ММ.ГГГГ" aria-label="Начальная дата" aria-invalid="${!!settings.rangeError}" inputmode="numeric"><span>→</span><input data-ad-date="to" value="${esc(f.to)}" placeholder="ДД.ММ.ГГГГ" aria-label="Конечная дата" aria-invalid="${!!settings.rangeError}" inputmode="numeric"></div></label>` : '';
    const globalFilters = `<section class="ad-filterbar" aria-label="Фильтры дашборда"><div class="ad-filter-row">${selectField('Период','period',f.period || 'Последний год')}${selectField('Рекрутер','recruiter',f.recruiter,'','Все рекрутеры')}${selectField('Департамент','department',f.department,'','Все департаменты')}${selectField('Нанимающий менеджер','manager',f.manager,'','Все нанимающие')}${dates}${reset}</div><div class="ad-scope"><span>${esc(rangeLabel(data))} · ${esc(f.recruiter || 'Все рекрутеры')} · ${esc(f.department || 'Все департаменты')} · ${esc(f.manager || 'Все нанимающие')}</span><small>${n(data.totals?.vacancies)} вакансий · ${n(data.totals?.candidates)} кандидатов</small></div></section>`;
    const customMetrics = `<article class="ad-panel">${panelHead('Своя система показателей','Кастомные метрики','Настраиваемые показатели компании: формулы, разрезы и история версий.',`<button type="button" class="ad-button primary" data-dev-action="new-metric"><span aria-hidden="true">${icon('plus')}</span> Новая метрика</button>`)}<div class="ad-panel-body"><div class="ad-metric-cards Analytics_metricCards__redesign"></div></div></article>`;
    const rangeNote = settings.rangeError ? `<div class="ad-data-notice" role="alert"><strong>Проверьте даты периода</strong><span>${esc(typeof settings.rangeError === 'string' ? settings.rangeError : settings.rangeError.reason || 'Введите корректные начальную и конечную даты.')}</span></div>` : data.empty ? `<div class="ad-data-notice">${esc(data.emptyReason || 'Нет наблюдений в выбранной области.')} Показатели не подменяются общими данными.</div>` : '';
    const hero = `<header class="ad-hero"><div><span class="ad-eyebrow">Аналитика найма</span><h1 class="ad-title">Дашборд подбора</h1><p class="ad-subtitle">От общей картины — к причинам и решениям.</p></div><div class="ad-hero-actions"><span class="ad-demo">Демонстрационные данные · 2025–2026</span><button type="button" class="ad-button secondary" data-dev-action="journal"><span aria-hidden="true">${icon('journal')}</span> Журнал выгрузок</button><button type="button" class="ad-button action" data-dev-action="export"><span aria-hidden="true">${icon('export')}</span> Выгрузить в Excel</button></div></header>`;
    const speed = `<article class="ad-panel">${panelHead('Динамика','Скорость найма','Как менялись сроки подбора за последние месяцы.',`<span class="ad-pill">${esc(rangeLabel(data))}</span>`)}<div class="ad-panel-body">${trend(data)}</div></article>`;
    const sources = `<section class="ad-sources-section" data-ad-section="sources"><div class="ad-section-head"><div><span class="ad-eyebrow">Каналы привлечения</span><h2>Источники кандидатов</h2></div></div>${filters('sources',local.sources,['period','recruiter','department','pipeline'])}<div class="ad-grid two">${sourceShare(sourcesData,views)}${sourceEfficiency(sourcesData,views)}</div></section>`;
    return `<div class="ad-page">${[
      hero,globalFilters,rangeNote,kpis(state,data),speed,customMetrics,sources,
      funnel(sectional.funnel || data,views),stages(sectional.stages || data,views,local.stages),
      reasons(sectional.reasons || data,views,local.reasons),
      recruiters(sectional.recruiters || data,views,local.recruiters,settings.recruiterMetric || 'hires'),
      '<footer class="ad-footer">Макет для обсуждения интерфейса. Все значения и люди вымышлены; это не отчёт из рабочей ATS. Дата снимка — 30.09.2026.</footer>'
    ].join('')}</div>`;
  }
  window.AnalyticsRedesign = {render, sections:{sourcesShare:sourceShare,sourcesEfficiency:sourceEfficiency,funnel,stages,reasons,recruiters}};
})();
