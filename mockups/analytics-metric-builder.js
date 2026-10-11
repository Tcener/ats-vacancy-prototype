/* Понятный конструктор метрик. Только разрешённые события и вымышленные данные. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const methods = [
    {value:'Длительность между событиями',label:'Длительность между событиями'},
    {value:'Доля дошедших',label:'Доля / конверсия'},
    {value:'Количество',label:'Количество объектов или действий'},
    {value:'Средняя оценка ИИ',label:'Средняя оценка'}
  ];
  const entities = [
    {value:'Процессы на вакансиях',label:'Процессы на вакансиях'},
    {value:'Людей',label:'Кандидаты в базе · без дублей'},
    {value:'Вакансии',label:'Вакансии · без дублей'},
    {value:'Офферы',label:'Офферы'},
    {value:'HR интервью',label:'HR интервью'},
    {value:'Технические интервью',label:'Технические интервью'},
    {value:'Финальные интервью',label:'Финальные интервью'},
    {value:'Закрытые задачи',label:'Закрытые задачи'}
  ];
  const events = ['Добавлен на вакансию','Вошёл на этап…','Вошёл на этап категории…','Заявка согласована','Оффер отправлен','Оффер принят','Вышел на работу','Отказ'];
  const conditions = [
    {field:'Условие:Источник',label:'Источник',option:'sources',property:'sourceId',name:'source'},
    {field:'Условие:Рекрутер',label:'Рекрутер',option:'recruiters',property:'recruiterId',name:'recruiter'},
    {field:'Условие:Департамент',label:'Департамент',option:'departments',property:'departmentId',name:'department'},
    {field:'Условие:Шаблон воронки',label:'Шаблон воронки',option:'pipelines',property:'pipelineId',name:'pipeline'},
    {field:'Условие:Текущий этап',label:'Текущий этап · на дату снимка',option:'stages',property:'currentStageId',name:'currentStage'},
    {field:'Условие:Исход процесса',label:'Исход процесса · на дату снимка'},
    {field:'Условие:Оценка ИИ',label:'Оценка ИИ · не ниже'}
  ];
  const breakdowns = [
    {id:'vacancy',name:'Вакансии'}, {id:'recruiter',name:'Рекрутеры'},
    {id:'source',name:'Источники'}, {id:'department',name:'Департаменты'},
    {id:'pipeline',name:'Шаблоны воронки'}
  ];
  const clone = value => JSON.parse(JSON.stringify(value || {}));
  const methodOf = fields => fields['Способ расчёта'] || fields.method || 'Длительность между событиями';
  const countOf = fields => fields['Считать'] || 'Процессы на вакансиях';
  const isEventCount = fields => ['Офферы','HR интервью','Технические интервью','Финальные интервью','Закрытые задачи','Людей'].includes(countOf(fields));
  const unitFor = fields => /Длительность/.test(methodOf(fields)) ? 'дн.' : /Доля/.test(methodOf(fields)) ? '%' : /оценка/i.test(methodOf(fields)) ? fields['Показатель оценки'] === 'Опыт кандидата (CSI)' ? '/ 5' : '/ 10' : '';
  function defaults(draft = {}) {
    const value = clone(draft), fields = {...value.fields};
    fields['Конструктор'] = 'v2';
    fields['Название'] ??= value.name || '';
    fields['Что показывает и зачем'] ??= value.description || '';
    fields['Способ расчёта'] ||= 'Длительность между событиями';
    fields['От события'] ||= 'Добавлен на вакансию'; fields['До события'] ||= 'Оффер отправлен';
    fields['Из тех, у кого было'] ||= fields['От события']; fields['Сколько потом дошли до'] ||= fields['До события'];
    fields['Событие'] ||= 'Добавлен на вакансию'; fields['Считать'] ||= 'Процессы на вакансиях';
    fields['Исход оффера'] ||= 'Отправлен'; fields['Агрегирование'] ||= /оценка/i.test(methodOf(fields)) ? 'Среднее' : 'Медиана';
    fields['Оценка на этапе'] ||= 'Любой этап — последняя оценка'; fields['Показатель оценки'] ||= 'Оценка ИИ';
    fields['Точность'] ??= '1';
    fields['Кто видит'] ||= value.visibility || 'Все с доступом к аналитике';
    for (const condition of conditions) fields[condition.field] ??= '';
    return {...value,fields,visibility:fields['Кто видит'],breakdowns:Array.isArray(value.breakdowns) ? [...value.breakdowns] : ['vacancy','recruiter','source'],pause:!!value.pause};
  }
  const asOptions = values => (values || []).map(value => typeof value === 'string' ? {value,label:value} : {value:value.value ?? value.id ?? value.name,label:value.label ?? value.name ?? value.value,disabled:!!value.disabled});
  function optionCatalog(field, draft = {}, options = {}) {
    const fields = draft.fields || draft;
    let values;
    if (field === 'Способ расчёта') values = methods;
    else if (field === 'Считать') values = entities;
    else if (field === 'Кто видит') values = ['Все с доступом к аналитике','Только я'];
    else if (field === 'Агрегирование') values = ['Медиана','Среднее','75-й перцентиль','90-й перцентиль'];
    else if (field === 'Показатель оценки') values = ['Оценка ИИ','Опыт кандидата (CSI)'];
    else if (field === 'Исход оффера') values = ['Отправлен','Принят','Отклонён','Ожидает ответа'];
    else if (field === 'Точность') values = [{value:'0',label:'Без десятичных'},{value:'1',label:'Один знак'},{value:'2',label:'Два знака'}];
    else if (field === 'Оценка на этапе') values = ['Любой этап — последняя оценка',...(options.aiStages || ['ИИ Скрининг','Скоринг резюме','Чат-бот','Голосовое интервью'])];
    else if (field === 'Условие:Исход процесса') values = [{value:'',label:'Любой исход'},{value:'active',label:'В работе'},{value:'hire',label:'Выход'},{value:'reject',label:'Отказ'}];
    else if (field === 'Условие:Оценка ИИ') values = [{value:'',label:'Любая оценка'},...'6789'.split('').map(value => ({value,label:`${value} из 10 и выше`}))];
    else if (conditions.some(condition => condition.field === field)) {
      const condition = conditions.find(condition => condition.field === field);
      values = [{value:'',label:'Без ограничения'},...asOptions(options[condition.option] || [])];
    } else if (field.endsWith(':detail')) {
      const parent = field.slice(0,-7);
      values = /категории/.test(fields[parent]) ? (options.categories || ['Скрининг','Интервью','Оффер','Прочее']) : (options.stages || []);
      values = asOptions(values).map(option => ({...option,value:option.label}));
    } else values = options.events || events;
    const normalized = asOptions(values);
    const current = fields[field];
    // Сохраняем прежнее значение при открытии старой формулы, даже если его нет в топе.
    if (current != null && current !== '' && !normalized.some(option => String(option.value) === String(current))) normalized.push({value:current,label:`${current} · сохранённое значение`});
    return normalized;
  }
  function summary(draft = {}, options = {}) {
    const fields = draft.fields || {}, method = methodOf(fields);
    const event = field => `${fields[field] || 'не выбрано'}${fields[`${field}:detail`] ? ` «${fields[`${field}:detail`]}»` : ''}`;
    let result;
    if (/Длительность/.test(method)) result = `${fields['Агрегирование'] || 'Медиана'} календарных дней: ${event('От события')} → ${event('До события')}${draft.pause ? '; без пауз вакансии' : ''}`;
    else if (/Доля/.test(method)) result = `Доля процессов: из тех, у кого было «${event('Из тех, у кого было')}», затем дошли до «${event('Сколько потом дошли до')}»`;
    else if (/оценка/i.test(method)) result = `${fields['Агрегирование'] || 'Среднее'}: ${fields['Показатель оценки'] || 'Оценка ИИ'}${fields['Показатель оценки'] === 'Опыт кандидата (CSI)' ? ' · шкала 1–5' : ` · ${fields['Оценка на этапе'] || 'Любой этап — последняя оценка'} · шкала 0–10`}`;
    else {
      const entity = entities.find(item => item.value === countOf(fields));
      result = `Количество: ${entity?.label || countOf(fields)}`;
      if (countOf(fields) === 'Офферы') result += ` · ${fields['Исход оффера'] || 'Отправлен'}`;
      else if (!isEventCount(fields)) result += ` · ${event('Событие')}`;
    }
    const active = conditions.filter(condition => fields[condition.field] !== '' && fields[condition.field] != null).map(condition => {
      const label = optionCatalog(condition.field,draft,options).find(option => String(option.value) === String(fields[condition.field]))?.label || fields[condition.field];
      return `${condition.label}: ${label}`;
    });
    if (active.length) result += `; только где ${active.join(', ')}`;
    if (draft.breakdowns?.length) result += `; разрезы: ${draft.breakdowns.map(id => breakdowns.find(item => item.id === id)?.name || id).join(', ')}`;
    return result;
  }
  function signature(draft = {}) {
    const fields = draft.fields || {}, method = methodOf(fields);
    const normalized = defaults(draft).fields;
    const keys = ['Способ расчёта',...conditions.map(item => item.field)];
    if (method !== 'Количество') keys.push('Точность');
    if (/Длительность/.test(method)) keys.push('От события','От события:detail','До события','До события:detail','Агрегирование');
    else if (/Доля/.test(method)) keys.push('Из тех, у кого было','Из тех, у кого было:detail','Сколько потом дошли до','Сколько потом дошли до:detail');
    else if (/оценка/i.test(method)) keys.push('Показатель оценки','Оценка на этапе','Агрегирование');
    else {keys.push('Считать');if (!isEventCount(normalized)) keys.push('Событие','Событие:detail');if (countOf(normalized) === 'Офферы') keys.push('Исход оффера');}
    const countSemantics = method === 'Количество' && isEventCount(normalized) ? fields['Конструктор'] === 'v2' ? 'по дате события' : 'старая когорта' : 'когорта';
    return JSON.stringify({fields:Object.fromEntries(keys.sort().map(key => [key,normalized[key] || ''])),countSemantics,pause:/Длительность/.test(method) && !!draft.pause,breakdowns:[...(draft.breakdowns || [])].sort()});
  }
  function validate(draft = {}) {
    const fields = draft.fields || {}, errors = [], method = methodOf(fields);
    const add = (field,message) => errors.push({field,message});
    if (!String(fields['Название'] || draft.name || '').trim()) add('Название','Назовите метрику, чтобы сохранить её.');
    if (String(fields['Название'] || draft.name || '').length > 120) add('Название','Название — не длиннее 120 символов.');
    if (!methods.some(item => item.value === method) && !['Длительность','Доля'].includes(method)) add('Способ расчёта','Выберите один из четырёх способов расчёта.');
    const required = /Длительность/.test(method) ? ['От события','До события'] : /Доля/.test(method) ? ['Из тех, у кого было','Сколько потом дошли до'] : method === 'Количество' && !isEventCount(fields) ? ['Событие'] : [];
    for (const field of required) {
      if (!fields[field]) add(field,'Выберите событие.');
      if (/этап…|категории…/.test(fields[field]) && !fields[`${field}:detail`]) add(`${field}:detail`,'Уточните этап или категорию.');
    }
    if (required.length === 2 && fields[required[0]] && fields[required[0]] === fields[required[1]] && (fields[`${required[0]}:detail`] || '') === (fields[`${required[1]}:detail`] || '')) add(required[1],'Выберите разные события начала и результата.');
    if (method === 'Количество' && !entities.some(item => item.value === countOf(fields))) add('Считать','Выберите доступный объект расчёта.');
    const numeric = fields['Условие:Оценка ИИ'];
    if (numeric != null && numeric !== '' && (!Number.isFinite(Number(numeric)) || Number(numeric) < 0 || Number(numeric) > 10)) add('Условие:Оценка ИИ','Порог оценки должен быть от 0 до 10.');
    return {valid:!errors.length,errors,warnings:[]};
  }
  function render(draft = {}, options = {}) {
    const value = defaults(draft), fields = value.fields, method = methodOf(fields), status = validate(value);
    const readonly = !!options.readonly, disabled = readonly ? ' disabled' : '';
    const invalid = field => status.errors.some(error => error.field === field) ? ' aria-invalid="true"' : '';
    const select = (field,label = field) => `<label class="amb-field${field === 'Способ расчёта' ? ' amb-wide' : ''}"><span>${esc(label)}</span><select data-metric-field="${esc(field)}" aria-label="${esc(label)}"${invalid(field)}${disabled}>${optionCatalog(field,value,options).map(option => `<option value="${esc(option.value)}"${String(option.value) === String(fields[field] ?? '') ? ' selected' : ''}${option.disabled ? ' disabled' : ''}>${esc(option.label)}</option>`).join('')}</select></label>`;
    const event = field => `<div class="amb-event">${select(field)}${/этап…|категории…/.test(fields[field]) ? select(`${field}:detail`,/категории/.test(fields[field]) ? 'Категория этапа' : 'Этап воронки') : ''}</div>`;
    let formulaFields = '';
    if (/Длительность/.test(method)) formulaFields = `${event('От события')}${event('До события')}${select('Агрегирование')}<div class="amb-pause"><button type="button" role="switch" aria-label="Не считать паузы вакансии" aria-checked="${value.pause}" class="ant-switch${value.pause ? ' ant-switch-checked' : ''}"${disabled}><span class="ant-switch-handle"></span></button><span>Не считать паузы вакансии</span></div>`;
    else if (/Доля/.test(method)) formulaFields = `${event('Из тех, у кого было')}${event('Сколько потом дошли до')}<p class="amb-help amb-wide">Знаменатель — процессы с первым событием. В числитель попадают только те, у кого второе событие произошло не раньше первого.</p>`;
    else if (/оценка/i.test(method)) formulaFields = `${select('Показатель оценки')}${fields['Показатель оценки'] === 'Опыт кандидата (CSI)' ? '<p class="amb-help">Только ответы кандидатов по шкале 1–5. Отсутствующий ответ — не ноль.</p>' : select('Оценка на этапе')}${select('Агрегирование')}`;
    else formulaFields = `${select('Считать','Что считаем')}${countOf(fields) === 'Офферы' ? select('Исход оффера') : !isEventCount(fields) ? event('Событие') : `<p class="amb-help">${countOf(fields) === 'Людей' ? 'По дате добавления в базу. Один человек считается один раз.' : countOf(fields) === 'Закрытые задачи' ? 'По дате завершения задачи. Каждая задача считается один раз.' : 'Только проведённые интервью, по дате завершения. Каждое интервью считается один раз.'}</p>`}`;
    const eventSemantics = method === 'Количество' && isEventCount(fields);
    const activeConditions = conditions.filter(condition => fields[condition.field] !== '').length;
    return `<div class="Analytics_metricForm__builder amb-form" data-metric-builder="v2">
      <section class="amb-panel amb-main"><header><span class="amb-step">1</span><div><h3>Основное</h3><p>Дайте показателю понятное имя и смысл.</p></div></header><div class="amb-grid">
        <label class="amb-field amb-wide"><span>Название</span><input type="text" maxlength="120" required data-metric-field="Название" aria-label="Название" placeholder="Например: время до технического интервью" value="${esc(fields['Название'])}"${invalid('Название')}${readonly ? ' readonly' : ''}></label>
        <label class="amb-field amb-wide"><span>Что показывает и зачем</span><textarea rows="2" data-metric-field="Что показывает и зачем" aria-label="Что показывает и зачем" placeholder="Какое решение поможет принять эта метрика?"${readonly ? ' readonly' : ''}>${esc(fields['Что показывает и зачем'])}</textarea></label>${select('Кто видит')}</div></section>
      <section class="amb-panel amb-calculate"><header><span class="amb-step">2</span><div><h3>Что считаем</h3><p>Четыре простых способа, без формул и кода.</p></div></header><div class="amb-grid">${select('Способ расчёта')}${formulaFields}</div><p class="amb-time-note">${eventSemantics ? 'Период отбирает даты действий. Берём события только в выбранном диапазоне.' : 'Когорта — процессы, добавленные на вакансии за период. Последующие события учитываются до даты снимка.'}</p></section>
      <details class="amb-panel amb-conditions"${activeConditions ? ' open' : ''}><summary><span class="amb-step">3</span><span><b>Условия</b><small>${activeConditions ? `${activeConditions} ограничений` : 'Необязательно · считаем всю доступную выборку'}</small></span><span aria-hidden="true" class="amb-chevron">⌄</span></summary><div class="amb-grid">${conditions.map(condition => select(condition.field,condition.label)).join('')}</div><p class="amb-help">Все выбранные условия применяются одновременно и дополняют фильтры экрана. Текущий этап и исход относятся к дате снимка, не к прошлому периоду.</p></details>
      <section class="amb-panel amb-display"><header><span class="amb-step">4</span><div><h3>Разрезы и отображение</h3><p>Сравнивайте показатель по нужным группам.</p></div></header><fieldset class="amb-breakdowns"><legend class="amb-sr-only">Доступные разрезы</legend>${breakdowns.map(item => `<label><input type="checkbox" data-metric-breakdown="${item.id}" value="${item.id}"${value.breakdowns.includes(item.id) ? ' checked' : ''}${disabled}><span>${item.name}</span></label>`).join('')}</fieldset>${method === 'Количество' ? '<p class="amb-help">Количество отображается целым числом.</p>' : select('Точность','Точность значения')}<p class="amb-help">Метрику можно выбрать на общем графике динамики: линии или столбцы, с отдельной шкалой её единицы измерения.</p></section>
      <section class="amb-panel amb-check"><header><span class="amb-step">5</span><div><h3>Проверка</h3><p>Сначала проверьте результат, затем публикуйте.</p></div></header><div class="amb-formula" role="status" aria-live="polite" data-metric-summary>${esc(summary(value,options))}</div><div class="amb-errors" role="alert"${status.valid ? ' hidden' : ''}>${status.errors.map(error => `<p data-metric-error="${esc(error.field)}">${esc(error.message)}</p>`).join('')}</div><div class="Analytics_metricPreview__builder amb-preview"><button type="button" data-dev-action="preview"${!status.valid || readonly ? ' disabled' : ''}>Проверить на данных</button><small>По текущему периоду и фильтрам экрана. Все данные демонстрационные.</small></div><p class="amb-help">Изменение методики, условий или разрезов сохранится новой версией. Прежние версии и отчёты не переписываются.</p></section>
      <input type="hidden" data-metric-field="Конструктор" value="v2">
    </div>`;
  }
  const round = (value,places = 1) => value == null || !Number.isFinite(value) ? null : Number(value.toFixed(places));
  const timestamp = value => !value ? null : Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  const percentile = (values,fraction) => {if (!values.length) return null; const sorted = [...values].sort((a,b) => a-b), point = (sorted.length-1)*fraction, lower = Math.floor(point); return sorted[lower]+(sorted[Math.ceil(point)]-sorted[lower])*(point-lower);};
  const aggregate = (values,mode) => !values.length ? null : /90/.test(mode) ? percentile(values,.9) : /75/.test(mode) ? percentile(values,.75) : /Средн/i.test(mode) ? values.reduce((sum,value) => sum+value,0)/values.length : percentile(values,.5);
  function eventFor(record,label,detail,delegate) {
    if (delegate) return delegate(record,label,detail);
    if (record.events?.[label]) return record.events[label];
    if (/Вошёл на этап…?/.test(label)) return record.events?.[`Вошёл на этап…:${detail}`] || null;
    const quoted = String(label).match(/(?:Этап|этап)\s*[«“"](.+?)[»”"]/);
    return quoted ? record.events?.[`Вошёл на этап…:${quoted[1]}`] || null : null;
  }
  function filterRecords(records,fields = {}) {
    return records.filter(record => conditions.every(condition => {
      const value = fields[condition.field]; if (value == null || value === '') return true;
      if (condition.property) return String(record[condition.property] || '') === String(value) || String(record[condition.name] || '') === String(value);
      if (condition.field === 'Условие:Оценка ИИ') return Number.isFinite(record.aiScore) && record.aiScore >= Number(value);
      if (value === 'active') return !!record.active;
      if (value === 'hire') return record.currentStageId === 'hire';
      if (value === 'reject') return record.currentStageId === 'reject';
      return false;
    }));
  }
  function calculate(metric = {}, data = {}, options = {}) {
    const fields = metric.fields || metric;
    if (fields['Конструктор'] !== 'v2' && !conditions.some(condition => fields[condition.field]) && !['Офферы','HR интервью','Технические интервью','Финальные интервью','Закрытые задачи'].includes(countOf(fields)) && !fields['Показатель оценки']) return null;
    const method = methodOf(fields), cohort = filterRecords(data.records || [],fields), observationsSource = filterRecords(data.observationRecords || data.records || [],fields);
    const detail = label => fields[`${label}:detail`] || fields[`${label}:stage`] || fields['Этап'] || '';
    const event = (record,label,key) => eventFor(record,label,detail(key || label),options.eventFor);
    const rangeFrom = data.range?.from, rangeTo = data.range?.to;
    const inRange = date => !!date && (!rangeFrom || String(date).slice(0,10) >= rangeFrom) && (!rangeTo || String(date).slice(0,10) <= rangeTo) && (!data.cutoff || String(date).slice(0,10) <= data.cutoff);
    let value = null, observations = 0, numerator = null, denominator = null, excluded = 0;
    const unit = unitFor(fields), places = ['0','1','2'].includes(String(fields['Точность'])) ? Number(fields['Точность']) : 1;
    if (data.invalidRange || data.incompatibleFilters) return {value:null,unit,observations:0,numerator:null,denominator:null,empty:true,display:'—',excluded:0};
    // Нет доступных объектов — не доказательство нулевой активности. Настоящий
    // ноль показываем только при непустой области, в которой нет искомых событий.
    if (!(method === 'Количество' && isEventCount(fields) ? observationsSource : cohort).length) return {value:null,unit,observations:0,numerator:null,denominator:/Доля/.test(method) ? 0 : null,empty:true,display:'—',excluded:0};
    if (/Длительность/.test(method)) {
      const values = [], excludePauses = !!options.excludePauses || !!metric.pause || !!fields.pause;
      for (const record of cohort) {
        const from = timestamp(event(record,fields['От события'] || 'Добавлен на вакансию','От события')), to = timestamp(event(record,fields['До события'] || 'Оффер отправлен','До события'));
        if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {excluded++;continue;}
        const pause = excludePauses ? (record.pauses || []).reduce((sum,item) => {const start = timestamp(item.from), end = timestamp(item.to);return sum + (Number.isFinite(start) && Number.isFinite(end) ? Math.max(0,Math.min(to,end)-Math.max(from,start))/86400000 : 0);},0) : 0;
        values.push(Math.max(0,(to-from)/86400000-pause));
      }
      value = round(aggregate(values,fields['Агрегирование'] || 'Медиана'),places); observations = values.length;
    } else if (/Доля/.test(method)) {
      const subset = cohort.filter(record => event(record,fields['Из тех, у кого было'] || 'Добавлен на вакансию','Из тех, у кого было'));
      denominator = subset.length;
      numerator = subset.filter(record => {const from = timestamp(event(record,fields['Из тех, у кого было'] || 'Добавлен на вакансию','Из тех, у кого было')), to = timestamp(event(record,fields['Сколько потом дошли до'] || 'Вышел на работу','Сколько потом дошли до'));return Number.isFinite(from) && Number.isFinite(to) && to >= from;}).length;
      value = denominator ? round(numerator/denominator*100,places) : null; observations = denominator; excluded = cohort.length-denominator;
    } else if (/оценка/i.test(method)) {
      const values = cohort.map(record => fields['Показатель оценки'] === 'Опыт кандидата (CSI)' ? record.csiScore : /Любой этап/.test(fields['Оценка на этапе'] || 'Любой этап') ? record.aiScore : record.aiScores?.[fields['Оценка на этапе']]).filter(score => typeof score === 'number' && Number.isFinite(score));
      value = round(aggregate(values,fields['Агрегирование'] || 'Среднее'),places); observations = values.length; excluded = cohort.length-observations;
    } else if (method === 'Количество') {
      const entity = countOf(fields);
      if (entity === 'Людей') {
        const subset = observationsSource.filter(record => inRange(record.baseAddedAt));
        value = new Set(subset.map(record => record.personId).filter(Boolean)).size; observations = subset.length;
      } else if (entity === 'Офферы') {
        const outcome = fields['Исход оффера'] || 'Отправлен';
        const subset = observationsSource.filter(record => outcome === 'Принят' ? inRange(record.events?.['Оффер принят']) : outcome === 'Отклонён' ? record.offerResolved && !record.offerAccepted && inRange(record.events?.['Отказ']) : outcome === 'Ожидает ответа' ? record.offer && !record.offerResolved && inRange(record.events?.['Оффер отправлен']) : inRange(record.events?.['Оффер отправлен']));
        value = new Set(subset.map(record => record.offerId || record.id).filter(Boolean)).size; observations = subset.length;
      } else if (entity === 'Закрытые задачи' || /интервью/.test(entity)) {
        const type = {'HR интервью':'hr','Технические интервью':'tech','Финальные интервью':'final'}[entity];
        const actions = observationsSource.flatMap(record => (entity === 'Закрытые задачи' ? record.taskEvents || [] : record.interviewEvents || []).filter(action => (!type || action.type === type) && action.outcome === 'completed' && inRange(action.completedAt)));
        value = new Set(actions.map(action => action.id).filter(Boolean)).size; observations = actions.length;
      } else if (entity === 'Процессы на вакансиях' || entity === 'Вакансии') {
        const subset = cohort.filter(record => event(record,fields['Событие'] || 'Добавлен на вакансию','Событие'));
        value = entity === 'Вакансии' ? new Set(subset.map(record => record.vacancyId).filter(Boolean)).size : subset.length; observations = subset.length;
      }
    }
    return {value,unit,observations,numerator,denominator,excluded,empty:value == null,display:value == null ? '—' : `${String(value).replace('.',',')}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`};
  }
  function preview(result = {}) {
    return `<button type="button" data-dev-action="preview">Проверить ещё раз</button><strong>${esc(result.display || '—')}</strong><small>${esc(result.observations || 0)} наблюдений${result.denominator != null ? ` · ${esc(result.numerator || 0)} из ${esc(result.denominator)}` : ''}${result.excluded ? ` · исключено без полного результата: ${esc(result.excluded)}` : ''}</small>${result.empty ? '<p>Нет завершённых наблюдений. Отсутствующие данные не считаются нулём.</p>' : '<p>Проверка использует тот же период, фильтры и правила, что опубликованная метрика.</p>'}`;
  }
  window.AnalyticsMetricBuilder = {render,defaults,optionCatalog,validate,summary,signature,calculate,preview,filterRecords,methods,entities,events,conditions,breakdowns,unitFor};
})();
