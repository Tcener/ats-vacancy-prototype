/* Рекрутеры: текущие вакансии отдельно от результатов и пяти типов активности. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const n = value => number(value) == null ? '—' : number(value).toLocaleString('ru-RU',{maximumFractionDigits:0});
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? value.split('-').reverse().join('.') : String(value || '');
  const rangeLabel = data => [data.range?.label,data.range?.from && data.range?.to ? `${date(data.range.from)} — ${date(data.range.to)}` : ''].filter(Boolean).join(' · ');
  const sum = (rows,key) => rows.length && rows.every(row=>number(row[key])!=null) ? rows.reduce((total,row)=>total+number(row[key]),0) : null;
  const colors = ['#6B53D5','#5EDB8A','#FF6FB8','#D9ECA2','#B6A2ED','#6FBBCC'];
  const activityFields = [
    {key:'addedBase',label:'Добавлено в базу',short:'В базу',color:'#6B53D5'},
    {key:'hrInterviews',label:'HR интервью',short:'HR интервью',color:'#FF6FB8'},
    {key:'techInterviews',label:'Технические интервью',short:'Тех. интервью',color:'#58CFA0'},
    {key:'finalInterviews',label:'Финальные интервью',short:'Финальные',color:'#AA8FE4'},
    {key:'activityOffers',label:'Офферы отправлены',short:'Офферы',color:'#ADC763'}
  ];
  const detail = (id,purpose='current',kind='recruiter-vacancies') => `data-ad-detail="${kind}" data-ad-key="${esc(id)}" data-ad-purpose="${purpose}"`;
  const toggles = (views={}) => {
    const table=views.recruiters==='table'||views.recruiters==='Таблица';
    return `<div class="ad-view-toggle" role="group" aria-label="Представление рекрутеров"><button type="button" data-ad-view="recruiters" data-ad-mode="chart" class="${table?'':'active'}" aria-pressed="${!table}">Диаграмма</button><button type="button" data-ad-view="recruiters" data-ad-mode="table" class="${table?'active':''}" aria-pressed="${table}">Таблица</button></div>`;
  };
  const empty = text => `<div class="ad-empty"><strong>${esc(text)}</strong><p>Измените фильтры. Неизвестные значения обозначены прочерком, а не нулём.</p></div>`;
  const labels={period:'Период',recruiter:'Рекрутер',department:'Департамент'};
  const blanks={period:'Период экрана',recruiter:'Все рекрутеры',department:'Все департаменты'};
  function filters(local={}) {
    const keys={period:'periods',recruiter:'recruiters',department:'departments'};
    return `<div class="ad-local-filters" aria-label="Фильтры блока recruiters">${Object.keys(keys).map(key=>{
      const options=window.AnalyticsDemo?.options?.[keys[key]]||[], value=local[key]||'';
      const rows=options.map(item=>typeof item==='string'?{id:item,name:item}:item).filter(item=>key!=='period'||!item.name.startsWith('Свой диапазон'));
      if(value&&!rows.some(row=>row.id===value||row.name===value))rows.unshift({id:value,name:value});
      return `<label class="ad-filter"><span>${labels[key]}</span><select data-ad-section="recruiters" data-ad-localkey="${key}" aria-label="${labels[key]}: recruiters"><option value=""${!value?' selected':''}>${blanks[key]}</option>${rows.map(row=>`<option value="${esc(row.name)}"${value===row.id||value===row.name?' selected':''}>${esc(row.name)}</option>`).join('')}</select></label>`;
    }).join('')}<button type="button" class="ad-button ghost" data-ad-reset="recruiters" aria-label="Сбросить фильтры блока recruiters">Сбросить</button></div>`;
  }
  function activity(rows) {
    const maxima=Object.fromEntries(activityFields.map(field=>[field.key,Math.max(1,...rows.map(row=>number(row[field.key])||0))]));
    return `<div class="ar-matrix-scroll" tabindex="0" aria-label="Активность по рекрутерам — пять отдельных показателей"><table class="ar-activity-matrix"><caption>Активность по рекрутерам</caption><thead><tr><th scope="col">Рекрутер</th>${activityFields.map(field=>`<th scope="col"><i style="background:${field.color}" aria-hidden="true"></i>${field.short}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><th scope="row"><button type="button" class="ar-recruiter-name" ${detail(row.id)}><span class="ad-avatar">${esc(row.initials)}</span><span>${esc(row.name)}</span></button></th>${activityFields.map(field=>{
      const value=number(row[field.key]), width=value==null?0:value/maxima[field.key]*100;
      return `<td><span class="ar-activity-cell" aria-label="${esc(row.name)}: ${esc(field.label)}, ${value==null?'нет данных':n(value)}"><strong>${n(value)}</strong><span class="ar-mini-track" aria-hidden="true"><i style="width:${width}%;background:${field.color}"></i></span></span></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function hires(rows) {
    const max=Math.max(1,...rows.map(row=>number(row.hires)||0));
    return `<div class="ar-hires-scroll" tabindex="0" aria-label="Выходы по рекрутерам"><div class="ad-columns ar-hires-columns" role="group" aria-label="Выходы по рекрутерам">${rows.map((row,index)=>{
      const value=number(row.hires), delta=value!=null&&number(row.previousHires)!=null?value-number(row.previousHires):null;
      return `<button type="button" class="ad-column" ${detail(row.id,'hires','recruiter')} aria-label="${esc(row.name)}: ${value==null?'нет данных':`${n(value)} выходов`}"><strong class="ad-column-value">${n(value)}</strong><span class="ad-column-track"><i class="ad-column-fill" style="height:${value==null?0:value/max*100}%;background:${colors[index%colors.length]}"></i></span><span class="ad-column-label">${esc(row.name)}</span><small>${delta==null?'Нет сопоставимого периода':`${delta>0?'+':''}${delta.toLocaleString('ru-RU')} к предыдущему периоду`}</small></button>`;
    }).join('')}</div></div>`;
  }
  function table(rows) {
    return `<div class="ad-table-wrap"><table class="ad-table ar-results-table"><caption>Результаты и активность рекрутеров за период</caption><thead><tr><th scope="col">Рекрутер</th><th scope="col">Выходы</th>${activityFields.map(field=>`<th scope="col">${esc(field.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><th scope="row"><button type="button" class="ar-recruiter-name" ${detail(row.id)}><span class="ad-avatar">${esc(row.initials)}</span><span>${esc(row.name)}</span></button></th><td><strong>${n(row.hires)}</strong></td>${activityFields.map(field=>`<td>${n(row[field.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function render(data={},views={},local={},metric='hires') {
    const rows=data.recruiters||[], isTable=views.recruiters==='table'||views.recruiters==='Таблица', useActivity=metric==='activity';
    const snapshot=date(data.cutoff||window.AnalyticsDemo?.cutoff||'2026-09-30');
    const summary=`<div class="ad-team-summary ar-summary">${[['loadVacancies','вакансий в работе сейчас'],['hires','выходов выбранной когорты'],['activityOffers','офферов отправлено за период'],['addedBase','добавлено в базу за период']].map(([key,label])=>`<div class="ad-stat"><strong>${n(sum(rows,key))}</strong><span>${label}</span></div>`).join('')}</div>`;
    const load=rows.length?`<div class="ad-load-grid">${rows.map(row=>`<button type="button" class="ad-load-card" ${detail(row.id)} aria-label="Вакансии рекрутера ${esc(row.name)} — ${n(row.loadVacancies)} в работе сейчас"><span class="ad-avatar">${esc(row.initials)}</span><span><strong>${esc(row.name)}</strong><small>${n(row.loadCandidates)} кандидатов · ${n(row.loadTasks)} задач</small></span><b>${n(row.loadVacancies)}<small>вакансий</small></b></button>`).join('')}</div>`:empty('Нет текущей нагрузки в этой области');
    const controls=`<div class="ad-team-chart-head ar-chart-head"><div class="ad-view-toggle" role="group" aria-label="Показатель рекрутеров"><button type="button" data-ad-recruiter-metric="hires" class="${useActivity?'':'active'}" aria-pressed="${!useActivity}">Выходы</button><button type="button" data-ad-recruiter-metric="activity" class="${useActivity?'active':''}" aria-pressed="${useActivity}">Активность</button></div><span class="ad-muted">${useActivity?'5 отдельных показателей за выбранный период':'Подтверждённые выходы выбранной когорты'}</span></div>`;
    const body=!rows.length||data.invalidRange?empty('Нет результатов в этой выборке'):isTable?table(rows):controls+(useActivity?activity(rows):hires(rows));
    return `<article class="ad-panel ar-panel" data-ad-section="recruiters"><header class="ad-panel-head"><div><span class="ad-eyebrow">Команда</span><h2>Результаты и активность рекрутеров</h2><p>Текущая нагрузка и работа за период — два разных среза.</p></div><div class="ad-panel-actions">${toggles(views)}</div></header><div class="ad-panel-body">${filters(local)}${summary}<h3 class="ad-block-title">Текущая нагрузка <small>на ${esc(snapshot)}</small></h3>${load}<h3 class="ad-block-title">Результаты за период <small>${esc(rangeLabel(data))}</small></h3>${body}<details class="ar-methodology"><summary>Как считаем активность и нагрузку</summary><p>Добавление в базу — уникальный кандидат по дате первого добавления. Интервью учитывается один раз по ID завершённой встречи и дате её проведения; отменённые и будущие встречи не входят. HR, технические и финальные интервью разделены по типу, не по названию этапа. Офферы — по дате отправки.</p><p>Интервью относятся к вакансиям рекрутера: это не означает, что техническое интервью провёл он лично. Пять показателей не суммируются в оценку сотрудника. Выходы — результаты когорты добавленных на вакансии, поэтому могут не совпадать с событийными офферами за период.</p><p>Нагрузка — снимок на ${esc(snapshot)}: период её не меняет, а фильтры рекрутера, департамента и нанимающего ограничивают область. Числа активности сами по себе не доказывают эффективность.</p></details></div></article>`;
  }
  // data должен быть уже ограничен пересечением глобальных и локальных фильтров.
  // Период intentionally не проверяется: это текущие вакансии на дату снимка.
  function getCurrentVacancies(data={},recruiterId) {
    if(data.incompatibleFilters)return [];
    if(Array.isArray(data.currentVacancies))return data.currentVacancies.filter(row=>row.recruiterId===recruiterId).map(row=>({...row}));
    const grouped=new Map();
    for(const record of data.currentRecords||[]) {
      if(record.recruiterId!==recruiterId||!record.vacancyId)continue;
      let row=grouped.get(record.vacancyId);
      if(!row) {
        row={id:record.vacancyId,name:record.vacancy||record.vacancyName||'Вакансия без названия',recruiterId,recruiter:record.recruiter,department:record.department,pipeline:record.pipeline,manager:record.manager,status:'В работе',route:record.vacancyRoute||null,candidates:0,stageCounts:{}};
        grouped.set(record.vacancyId,row);
      }
      row.candidates++;
      const stage=record.currentStage||'Этап не указан';row.stageCounts[stage]=(row.stageCounts[stage]||0)+1;
    }
    return [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru')||a.id.localeCompare(b.id));
  }
  const knownRoutes=new Set(['android','designer','analyst','service','ios','backend','marketing','research'].map(id=>`vacancy/${id}`));
  function routeFor(row) {
    const route=String(row.route||'').replace(/^#/,'');
    return knownRoutes.has(route)?route:null;
  }
  function modalVacancies(data={},recruiterId,context={}) {
    const rows=getCurrentVacancies(Array.isArray(context.vacancies)?{currentVacancies:context.vacancies}:data,recruiterId);
    const recruiter=data.recruiters?.find(row=>row.id===recruiterId), name=context.name||recruiter?.name||'Рекрутер', snapshot=date(data.cutoff||window.AnalyticsDemo?.cutoff||'2026-09-30');
    const html=rows.length?`<div class="ar-vacancies-list">${rows.map((row,index)=>{
      const route=routeFor(row), stages=Object.entries(row.stageCounts||{});
      return `<details class="ar-vacancy-card"><summary><span class="ar-vacancy-order">${index+1}</span><span class="ar-vacancy-title"><strong>${esc(row.name)}</strong><small>${esc(row.department||'Департамент не указан')} · ${n(row.candidates)} кандидатов в процессе</small></span><span class="ad-pill ar-status">${esc(row.status||'В работе')}</span><span class="ar-vacancy-chevron" aria-hidden="true">⌄</span></summary><div class="ar-vacancy-details"><dl>${[['Рекрутер',row.recruiter||name],['Нанимающий',row.manager||'Не указан'],['Воронка',row.pipeline||'Не указана']].map(([key,value])=>`<div><dt>${key}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${stages.length?`<div class="ar-vacancy-stages" aria-label="Кандидаты по текущим этапам">${stages.map(([stage,count])=>`<span>${esc(stage)} <b>${n(count)}</b></span>`).join('')}</div>`:''}${route?`<a class="ad-button brand ar-open-vacancy" href="ats-product.html?public=e18d6b491900#${route}" data-dev-route="${route}">Открыть вакансию →</a>`:'<p class="ar-demo-hint">Демонстрационная вакансия. Сведения доступны здесь; отдельный экран для неё не создан.</p>'}</div></details>`;
    }).join('')}</div>`:empty('В этой области нет вакансий в работе');
    return `<section class="ar-vacancies-modal" aria-label="Вакансии рекрутера ${esc(name)}"><div class="ar-vacancies-summary"><span class="ad-avatar">${esc(recruiter?.initials||'Р')}</span><div><strong>${esc(name)}</strong><span>${n(rows.length)} вакансий в работе · на ${esc(snapshot)}</span></div></div><p class="ar-modal-caption">Текущий список в рамках выбранных рекрутера, департамента и нанимающего. Период отчёта не меняет нагрузку. Раскройте вакансию, чтобы посмотреть её сведения.</p>${html}</section>`;
  }
  window.AnalyticsRecruiters={render,modalVacancies,getCurrentVacancies,activityFields:activityFields.map(field=>({...field})),routeFor};
})();
