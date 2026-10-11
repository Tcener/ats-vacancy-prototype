/* Компактные демонстрационные переходы и время этапов. Разметка, без ATS/API. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const present = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const number = (value, digits = 0) => present(value) ? Number(value).toLocaleString('ru-RU', {minimumFractionDigits:digits, maximumFractionDigits:digits}) : '—';
  const detail = (key, purpose) => `data-ad-detail="stage" data-ad-key="${esc(key)}" data-ad-purpose="${esc(purpose)}"`;
  const isTable = (section, views) => views?.[section] === 'table' || views?.[section] === 'Таблица';
  const terminal = row => !!row.terminal || ['hire','reject'].includes(row.id) || ['Выход','Отказ'].includes(row.name);
  const date = value => String(value ?? '').replace(/^(\d{4})-(\d{2})-(\d{2})(.*)$/, '$3.$2.$1');
  const rangeLabel = data => {
    const range = data?.range || {}, dates = range.from && range.to ? `${date(range.from)} — ${date(range.to)}` : '';
    return range.label && dates && !String(range.label).includes(date(range.from)) ? `${range.label} · ${dates}` : range.label || dates;
  };
  function toggle(section, views) {
    const table = isTable(section, views);
    return `<div class="ad-view-toggle" role="group" aria-label="Представление блока"><button type="button" data-ad-view="${esc(section)}" data-ad-mode="chart" aria-pressed="${!table}" class="${table ? '' : 'active'}">Диаграмма</button><button type="button" data-ad-view="${esc(section)}" data-ad-mode="table" aria-pressed="${table}" class="${table ? 'active' : ''}">Таблица</button></div>`;
  }
  const head = (eyebrow, title, subtitle, section, views) => `<header class="ad-panel-head"><div><span class="ad-eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><div class="ad-panel-actions">${toggle(section, views)}</div></header>`;
  const arrow = () => '<svg class="ad-flow-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const empty = message => `<div class="ad-empty"><strong>${esc(message)}</strong><p>Измените фильтры. Отсутствие наблюдений не означает нулевую эффективность.</p></div>`;
  const table = (headers, rows, caption) => `<div class="ad-table-wrap ad-flow-table"><table class="ad-table"><caption>${esc(caption)}</caption><thead><tr>${headers.map(label => `<th scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const methodology = (title, body) => `<details class="ad-flow-method"><summary>${esc(title)}</summary><p>${esc(body)}</p></details>`;
  function filters(local) {
    const labels = {period:'Период',recruiter:'Рекрутер',pipeline:'Шаблон воронки',department:'Департамент'};
    const blank = {period:'Период экрана',recruiter:'Все рекрутеры',pipeline:'Все шаблоны',department:'Все департаменты'};
    const catalogs = {period:'periods',recruiter:'recruiters',pipeline:'pipelines',department:'departments'};
    const fallbackPeriods = ['Последний год','Последние полгода','Текущий квартал','Последние 30 дней'];
    return `<div class="ad-local-filters" aria-label="Фильтры блока stages">${Object.keys(labels).map(key => {
      const value = local?.[key] || '';
      let options = window.AnalyticsDemo?.options?.[catalogs[key]] || [];
      if (!options.length && key === 'period') options = fallbackPeriods;
      options = options.map(row => typeof row === 'string' ? {id:row,name:row} : {id:row.id,name:row.name || row.label || row.id}).filter(row => !String(row.name).startsWith('Свой диапазон'));
      if (value && !options.some(row => row.id === value || row.name === value)) options.unshift({id:value,name:value});
      return `<label class="ad-filter"><span>${labels[key]}</span><select data-ad-section="stages" data-ad-localkey="${key}" aria-label="${labels[key]}: stages"><option value=""${value === '' ? ' selected' : ''}>${blank[key]}</option>${options.map(row => `<option value="${esc(row.name)}"${value === row.id || value === row.name ? ' selected' : ''}>${esc(row.name)}</option>`).join('')}</select></label>`;
    }).join('')}<button type="button" class="ad-button ghost" data-ad-reset="stages" aria-label="Сбросить фильтры блока stages">Сбросить</button></div>`;
  }
  function funnelRows(data) {
    const supplied = Array.isArray(data?.funnel) && data.funnel.length;
    const rows = supplied ? data.funnel : (data?.stages || []).map(row => ({...row,count:row.visits}));
    return rows.filter(row => row.id !== 'reject' && row.name !== 'Отказ');
  }
  function transitions(data) {
    const rows = funnelRows(data);
    return rows.slice(0,-1).map((from,index) => {
      const to = rows[index+1];
      // nextCount — пересечение кандидатов двух этапов; count следующего этапа
      // может включать прямые входы/пропуски и НЕ является числом этого перехода.
      const crossed = present(from.nextCount) ? Number(from.nextCount) : present(from.transitionCount) ? Number(from.transitionCount) : null;
      const denominator = present(from.count) ? Number(from.count) : null;
      const conversion = present(from.conversion) && Number(from.conversion) >= 0 && Number(from.conversion) <= 100 ? Number(from.conversion) : null;
      return {from,to,crossed,denominator,conversion};
    });
  }
  function funnel(data = {}, views = {}) {
    const rows = funnelRows(data), pairs = transitions(data);
    const noData = data.cohortEmpty === true || data.empty || !rows.length;
    let body;
    if (noData) body = empty('В выбранной когорте нет кандидатов');
    else if (isTable('funnel', views)) body = table(['От этапа','До этапа','Конверсия','Достигли следующего этапа','Кандидатов на исходном этапе'], pairs.map(pair => [
      `<button type="button" class="ad-detail-link" ${detail(pair.from.id,'entered')}>${esc(pair.from.name)}</button>`,
      `<button type="button" class="ad-detail-link" ${detail(pair.to.id,'entered')}>${esc(pair.to.name)}</button>`,
      pair.conversion === null ? '— · нет единого перехода' : `${number(pair.conversion,1)}%`,number(pair.crossed),number(pair.denominator)
    ]), 'Конверсии между этапами');
    else if (!pairs.length) body = `<div class="ad-flow-single"><button type="button" class="ad-detail-link" ${detail(rows[0].id,'entered')}>${esc(rows[0].name)} · ${number(rows[0].count)} кандидатов</button><span>В этой воронке пока нет пары этапов для сравнения.</span></div>`;
    else body = `<div class="ad-flow-toolbar"><span><strong>${number(rows.length)} этапов</strong> · ${number(pairs.length)} переходов</span><span class="ad-flow-toolbar-hint">Вся цепочка в ленте — прокрутите или используйте стрелки</span><div class="ad-flow-navigation" role="group" aria-label="Прокрутка переходов"><button type="button" data-af-scroll="back" aria-controls="ad-flow-transitions" aria-label="Предыдущие переходы">${arrow()}</button><button type="button" data-af-scroll="forward" aria-controls="ad-flow-transitions" aria-label="Следующие переходы">${arrow()}</button></div></div><div id="ad-flow-transitions" class="ad-flow-transitions" data-af-track tabindex="0" role="region" aria-label="Все ${number(pairs.length)} переходов воронки. Стрелки влево и вправо прокручивают ленту.">${pairs.map((pair,index) => {
      const rate = pair.conversion === null ? '—' : `${number(pair.conversion,1)}%`;
      const sample = pair.crossed !== null && pair.denominator !== null ? `${number(pair.crossed)} из ${number(pair.denominator)} кандидатов` : 'Число переходов не передано';
      const alternative = pair.conversion === null || pair.from.alternative === true || pair.from.direct === false;
      return `<article class="ad-flow-transition ${alternative ? 'ad-flow-alternative' : ''}" aria-label="Переход ${index+1} из ${pairs.length}"><div class="ad-flow-transition-route"><button type="button" ${detail(pair.from.id,'entered')} title="${esc(pair.from.name)}">${esc(pair.from.name)}</button>${arrow()}<button type="button" ${detail(pair.to.id,'entered')} title="${esc(pair.to.name)}">${esc(pair.to.name)}</button></div><strong class="ad-flow-rate">${rate}</strong><span class="ad-flow-transition-caption">${alternative ? 'Не единый маршрут' : 'достигли следующего этапа'}</span><span class="ad-flow-transition-sample">${esc(sample)}</span></article>`;
    }).join('')}</div>`;
    const rejectedRow = (data.funnel || []).find(row => row.id === 'reject' || row.name === 'Отказ');
    const suppliedRejected = typeof data.funnelRejected === 'object' ? data.funnelRejected?.count : data.funnelRejected;
    const rejected = present(suppliedRejected) ? suppliedRejected : rejectedRow?.count;
    const outcome = present(rejected) ? `<div class="ad-flow-outcome"><button type="button" class="ad-pill ad-negative" ${detail('reject','entered')}>Отказ · ${number(rejected)} кандидатов</button></div>` : '';
    return `<article class="ad-panel ad-flow-funnel" data-ad-section="funnel">${head('Воронка','Конверсии из этапа в этап','','funnel',views)}<div class="ad-panel-body">${body}${noData ? '' : outcome}${methodology('Как считаются конверсии и альтернативные маршруты','Когорта — кандидаты, добавленные на вакансии в выбранном периоде; исходы известны до даты снимка. Процент — доля кандидатов исходного этапа, достигших следующего выбранного этапа, а не среднее процентов вакансий. Прямые входы на следующий этап не увеличивают число этого перехода. Пропуски и альтернативные маршруты возможны: лента не означает, что каждый кандидат проходит все этапы строго по порядку. Если общего перехода нет, показываем «—», не ноль.')}</div></article>`;
  }
  function stageRows(data) {
    return (data?.stages || []).map(row => {
      const sample = row.completedVisits !== undefined && row.completedVisits !== null ? row.completedVisits : row.visits;
      return {...row,sample:present(sample) ? Math.max(0,Number(sample)) : null,final:terminal(row)};
    });
  }
  function scaleFor(rows) {
    const values = rows.filter(row => !row.final && present(row.days) && Number(row.days) >= 0 && row.sample > 0).map(row => Number(row.days));
    return Math.max(1,...values);
  }
  function stages(data = {}, views = {}, local = {}) {
    const rows = stageRows(data), waiting = rows.filter(row => !row.final), finals = rows.filter(row => row.final), max = scaleFor(rows);
    let body;
    if (data.empty || data.stagesEmpty === true || !rows.length) body = empty('Нет посещений этапов в выбранном периоде');
    else if (isTable('stages', views)) body = table(['Этап','Среднее время, дни','Наблюдений для среднего','Посещений за период','Ожидают сейчас'],rows.map(row => [
      `<button type="button" class="ad-detail-link" ${detail(row.id,'duration')}>${esc(row.name)}</button>`, row.final ? '— · финальный этап' : present(row.days) && row.sample > 0 ? number(row.days,1) : '—',number(row.sample),number(row.visits),row.final ? '— · без ожидания' : number(row.current)
    ]),'Среднее время на всех этапах');
    else body = `<div class="ad-flow-stage-meta"><span><strong>${number(waiting.length)} этапов с ожиданием</strong>${finals.length ? ` · ${number(finals.length)} финальных` : ''}</span><span>Одна шкала: 0 — ${number(max,1)} дн.</span></div><div class="ad-flow-stage-window" tabindex="0" role="region" aria-label="Время на всех ${number(waiting.length)} этапах. При длинной воронке прокрутите список."><div class="ad-flow-stage-grid">${waiting.map(row => {
      const valid = present(row.days) && Number(row.days) >= 0 && row.sample > 0, days = valid ? Number(row.days) : null;
      const width = valid ? Math.min(100,Math.max(0,days/max*100)) : 0;
      const sample = row.sample === null ? 'Выборка не передана' : `${number(row.sample)} завершённых`;
      const missing = row.sample > 0 ? 'среднее время не передано' : 'нет завершённых наблюдений';
      return `<button type="button" class="ad-flow-stage ${valid && days >= max*.8 ? 'ad-flow-stage-slow' : ''}" ${detail(row.id,'duration')} aria-label="${esc(row.name)}: ${valid ? `${number(days,1)} дня, ${number(row.sample)} завершённых посещений` : missing}"><span class="ad-flow-stage-name">${esc(row.name)}</span><strong class="ad-flow-stage-days">${valid ? `${number(days,1)} <small>дн.</small>` : '—'}</strong><span class="ad-flow-stage-track" aria-hidden="true">${valid ? `<i style="width:${width.toFixed(3)}%"></i>` : ''}</span><small class="ad-flow-stage-sample">${esc(sample)}</small></button>`;
    }).join('')}</div></div>${waiting.length > 12 ? `<span class="ad-flow-stage-scroll-hint">Все ${number(waiting.length)} этапов сохранены — прокрутите список, чтобы увидеть остальные.</span>` : ''}${finals.length ? `<div class="ad-flow-finals" role="group" aria-label="Финальные этапы без времени ожидания">${finals.map(row => `<button type="button" ${detail(row.id,'duration')}><strong>${esc(row.name)}</strong><span>Финальный этап · без ожидания</span><small>${number(row.visits)} переходов за период</small></button>`).join('')}</div>` : ''}`;
    return `<article class="ad-panel ad-flow-stages" data-ad-section="stages">${head('Скорость процесса','Время на этапах','','stages',views)}<div class="ad-panel-body">${filters(local)}<div class="ad-flow-scope">${esc(rangeLabel(data))} · среднее по завершённым посещениям</div>${body}${methodology('Методика и незавершённые ожидания','Период отбирает завершённые посещения этапов по дате выхода из этапа. Среднее — от входа до выхода в календарных днях; текущее незавершённое ожидание не смешано с завершёнными посещениями. Нулевое время с наблюдениями показывается как 0,0 дня; отсутствие наблюдений — «—». «Выход» и «Отказ» — такие же этапы воронки, но финальные: у них нет ожидания следующего перехода. Их счётчики показывают события за период, включая кандидатов, добавленных раньше: они могут отличаться от исходов когорты в блоке конверсий. Наблюдения для среднего — посещения с измеренным временем, без финальных этапов. Текущая очередь и выборка доступны при нажатии на этап или в таблице.')}</div></article>`;
  }
  function scrollTrack(track, direction) {
    if (!track) return false;
    const amount = Math.max(220,(track.clientWidth || 0)*.8) * direction;
    track.scrollBy({left:amount,behavior:'smooth'});
    return true;
  }
  function handleClick(target) {
    const button = target?.closest?.('[data-af-scroll]');
    if (!button || button.disabled) return false;
    const panel = button.closest('.ad-flow-funnel'), track = panel?.querySelector('[data-af-track]');
    return scrollTrack(track, button.dataset.afScroll === 'back' ? -1 : 1);
  }
  function handleKeydown(event) {
    const track = event?.target?.matches?.('[data-af-track]') ? event.target : null;
    if (!track || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return false;
    event.preventDefault();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') return scrollTrack(track,event.key === 'ArrowLeft' ? -1 : 1);
    track.scrollTo({left:event.key === 'Home' ? 0 : track.scrollWidth,behavior:'smooth'});
    return true;
  }
  window.AnalyticsFlow = {funnel,stages,handleClick,handleKeydown,transitions,stageRows,scaleFor};
})();
