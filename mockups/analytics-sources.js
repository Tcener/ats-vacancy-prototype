/* Источники: независимые настройки двух графиков; «Другие» — вычисляемая группа. */
(() => {
  'use strict';
  const keys = ['sources-share','sources-efficiency'];
  const defaults = {'sources-share':{mode:'top',limit:5,selected:[],sort:'hires'},'sources-efficiency':{mode:'top',limit:5,selected:[],sort:'conversion'}};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = (value,digits=0) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU',{maximumFractionDigits:digits,minimumFractionDigits:digits}) : '—';
  const sum = (rows,key) => rows.reduce((total,row)=>total+(Number(row[key])||0),0);
  const pct = (part,total) => total>0 ? `${n(part/total*100,1)}%` : '—';
  const ratio = row => row.taken>0 ? row.hires/row.taken : -1;
  const palette = ['#6B53D5','#FF6FB8','#5EDB8A','#B6A2ED','#6FBBCC','#D9ECA2','#E6B56E','#7C8EE0','#DE8DAD','#86BE94'];
  const baseColors = {hh:'#6B53D5',avito:'#5EDB8A',database:'#FF6FB8',referral:'#D9ECA2',habr:'#B6A2ED',__other:'#6FBBCC'};
  const color = row => baseColors[row.id] || palette[Array.from(row.id).reduce((value,char)=>value+char.charCodeAt(0),0)%palette.length];
  function normalize(settings={},rows=[]) {
    const ids=new Set(rows.map(row=>row.id)), result={};
    for(const key of keys) {
      const input=settings[key]||{}, def=defaults[key];
      result[key]={mode:input.mode==='manual'?'manual':'top',limit:[5,8,10,'all'].includes(input.limit)?input.limit:def.limit,sort:['hires','taken','conversion','name'].includes(input.sort)?input.sort:def.sort,selected:Array.isArray(input.selected)?[...new Set(input.selected.filter(id=>ids.has(id)))]:[]};
    }
    return result;
  }
  function selectRows(rows,settings={},key='sources-share') {
    const config=normalize({[key]:settings},rows)[key];
    const eligible=rows.filter(row=>row.taken>0||row.hires>0||row.offers>0);
    const sorted=[...eligible].sort((a,b)=>{
      const difference=config.sort==='conversion'?ratio(b)-ratio(a):config.sort==='name'?0:(Number(b[config.sort])||0)-(Number(a[config.sort])||0);
      return difference||a.name.localeCompare(b.name,'ru');
    });
    const selected=config.mode==='manual'?sorted.filter(row=>config.selected.includes(row.id)):config.limit==='all'?sorted:sorted.slice(0,config.limit);
    const ids=new Set(selected.map(row=>row.id)), members=sorted.filter(row=>!ids.has(row.id));
    const group=members.length?{id:'__other',name:'Другие источники',group:true,members,taken:sum(members,'taken'),hires:sum(members,'hires'),offers:sum(members,'offers'),interviews:sum(members,'interviews')}:null;
    return {rows:group?[...selected,group]:selected,selected,members,group,totalHires:sum(eligible,'hires'),totalTaken:sum(eligible,'taken'),config};
  }
  const detail = (row,key) => row.group ? `data-as-group="${key}" aria-describedby="as-group-${key}"` : `data-ad-detail="source" data-ad-key="${esc(row.id)}" data-ad-purpose="${key==='sources-share'?'hires':'taken'}"`;
  const toggle = (key,views) => {
    const table=views?.[key]==='table'||views?.[key]==='Таблица';
    return `<div class="ad-view-toggle" role="group" aria-label="Представление источников"><button type="button" data-ad-view="${key}" data-ad-mode="chart" class="${table?'':'active'}" aria-pressed="${!table}">Диаграмма</button><button type="button" data-ad-view="${key}" data-ad-mode="table" class="${table?'active':''}" aria-pressed="${table}">Таблица</button></div>`;
  };
  function configForm(key,all,view) {
    const {config,selected}=view, selectedIds=config.mode==='manual'?config.selected:selected.map(row=>row.id);
    return `<form class="as-config" data-as-config="${key}" id="as-config-${key}" hidden><div class="as-config-head"><strong>Настроить ${key==='sources-share'?'диаграмму вкладов':'график эффективности'}</strong><span>Выбор меняет представление, не выборку данных.</span></div><div class="as-config-fields"><label class="ad-filter"><span>Какие источники</span><select name="mode" aria-label="Состав источников: ${key}"><option value="top"${config.mode==='top'?' selected':''}>Наиболее значимые</option><option value="manual"${config.mode==='manual'?' selected':''}>Выбрать вручную</option></select></label><label class="ad-filter" data-as-limit><span>Показывать отдельно</span><select name="limit" aria-label="Количество источников: ${key}">${[5,8,10,'all'].map(limit=>`<option value="${limit}"${config.limit===limit?' selected':''}>${limit==='all'?'Все источники':`Топ-${limit}`}</option>`).join('')}</select></label><label class="ad-filter"><span>Сортировка</span><select name="sort" aria-label="Сортировка источников: ${key}">${[['hires','По количеству выходов'],['taken','По числу взятых в работу'],['conversion','По конверсии в выход'],['name','По алфавиту']].map(([id,label])=>`<option value="${id}"${config.sort===id?' selected':''}>${label}</option>`).join('')}</select></label></div><div class="as-manual"${config.mode==='manual'?'':' hidden'}><input type="search" data-as-search placeholder="Найти источник…" aria-label="Поиск источника: ${key}"><div class="as-pick-actions"><button type="button" data-as-pick="all">Выбрать найденные</button><button type="button" data-as-pick="none">Снять выбор</button><span data-as-picked></span></div><div class="as-source-picks">${[...all].sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(row=>`<label data-as-source-name="${esc(row.name.toLowerCase())}"><input type="checkbox" name="source" value="${esc(row.id)}"${selectedIds.includes(row.id)?' checked':''}><span>${esc(row.name)}</span><small>${n(row.hires)} выходов · ${n(row.taken)} в работе</small></label>`).join('')}</div><p class="as-no-matches" hidden>Такой источник не найден.</p></div><p class="as-config-note">Непоказанные источники объединяются в «Другие источники». Доли всегда считаются от всех выходов, а конверсия группы — из суммы её выходов и кандидатов.</p><div class="as-config-footer"><button type="button" class="ad-button" data-as-cancel>Отмена</button><button type="submit" class="ad-button brand">Применить</button></div></form>`;
  }
  function groupPopover(key,view) {
    if(!view.group)return '';
    const group=view.group;
    return `<section class="as-group-popover" data-as-popover="${key}" id="as-group-${key}" aria-label="Источники в группе Другие источники" hidden><header><div><strong>Другие источники</strong><span>Группа из ${n(group.members.length)} источников, не отдельный источник</span></div><button type="button" data-as-close-group aria-label="Закрыть состав группы">×</button></header><div class="as-group-total"><strong>${n(group.hires)} выходов из ${n(group.taken)}</strong><span>${key==='sources-share'?`${pct(group.hires,view.totalHires)} всех выходов`:`${pct(group.hires,group.taken)} конверсия группы`}</span></div><div class="as-group-members">${group.members.map(row=>`<button type="button" class="as-group-member" ${detail(row,key)}><i style="background:${color(row)}"></i><span>${esc(row.name)}<small>${n(row.hires)} выходов из ${n(row.taken)} кандидатов</small></span><strong>${key==='sources-share'?pct(row.hires,view.totalHires):pct(row.hires,row.taken)}</strong></button>`).join('')}</div><p>${key==='sources-share'?'Доля каждого источника от всех выходов в выборке.':'Конверсия каждого источника считается отдельно; конверсия группы — взвешенная по числу кандидатов.'}</p></section>`;
  }
  function donut(view,key) {
    const cx=112,cy=112,outer=108,inner=69;
    const point=(radius,angle)=>[cx+radius*Math.cos((angle-90)*Math.PI/180),cy+radius*Math.sin((angle-90)*Math.PI/180)];
    let angle=0;
    const slices=view.rows.filter(row=>row.hires>0).map(row=>{
      const start=angle;angle+=row.hires/view.totalHires*360;const finish=Math.min(angle,start+359.9999),a=point(outer,start),b=point(outer,finish),c=point(inner,finish),d=point(inner,start),large=finish-start>180?1:0;
      return `<path d="M ${a.join(' ')} A ${outer} ${outer} 0 ${large} 1 ${b.join(' ')} L ${c.join(' ')} A ${inner} ${inner} 0 ${large} 0 ${d.join(' ')} Z" fill="${color(row)}" role="button" tabindex="0" ${detail(row,key)} aria-label="${esc(row.name)}: ${n(row.hires)} выходов, ${pct(row.hires,view.totalHires)}${row.group?`, группа из ${row.members.length} источников`:''}"><title>${esc(row.name)} · ${n(row.hires)} выходов · ${pct(row.hires,view.totalHires)}${row.group?` · ${row.members.length} источников в группе`:''}</title></path>`;
    }).join('');
    return `<div class="as-donut-layout"><svg class="as-donut" viewBox="0 0 224 224" role="group" aria-label="Доля источников во всех выходах">${slices}<text x="112" y="110" text-anchor="middle" class="as-donut-total">${n(view.totalHires)}</text><text x="112" y="131" text-anchor="middle" class="as-donut-caption">выходов</text></svg><div class="as-source-legend">${view.rows.map(row=>`<button type="button" class="as-legend-item" ${detail(row,key)}><i style="background:${color(row)}"></i><span>${esc(row.name)}${row.group?`<small>${row.members.length} источников · посмотреть состав</small>`:''}</span><strong>${pct(row.hires,view.totalHires)}<small>${n(row.hires)} выходов</small></strong></button>`).join('')}</div></div>`;
  }
  function bars(view,key) {
    const max=Math.max(.01,...view.rows.map(ratio));
    return `<div class="as-bars-scroll" tabindex="0" aria-label="График эффективности источников${view.rows.length>6?' — прокручивается горизонтально':''}"><div class="as-bars">${view.rows.map(row=>`<button type="button" class="as-bar" ${detail(row,key)} aria-label="${esc(row.name)}: ${pct(row.hires,row.taken)}, ${n(row.hires)} выходов из ${n(row.taken)} кандидатов${row.group?`, группа из ${row.members.length} источников`:''}"><strong>${pct(row.hires,row.taken)}</strong><span class="as-bar-track"><i style="height:${Math.max(row.hires?2:0,Math.max(0,ratio(row))/max*100)}%;background:${color(row)}"></i></span><span class="as-bar-name">${esc(row.name)}</span><small>${n(row.hires)} из ${n(row.taken)}${row.group?`<br>${row.members.length} источников`:''}</small></button>`).join('')}</div></div>${view.rows.length>6?'<p class="as-scroll-hint">↔ Прокрутите график, чтобы посмотреть все источники.</p>':''}`;
  }
  function table(view,key) {
    const share=key==='sources-share';
    return `<div class="ad-table-wrap"><table class="ad-table"><caption>${share?'Вклад источников в выходы':'Эффективность источников'}</caption><thead><tr><th scope="col">Источник</th>${share?'':'<th scope="col">Взято в работу</th><th scope="col">Офферы</th>'}<th scope="col">Выходы</th><th scope="col">${share?'Доля всех выходов':'Конверсия в выход'}</th></tr></thead><tbody>${view.rows.map(row=>`<tr><td><button type="button" class="ad-detail-link" ${detail(row,key)}>${esc(row.name)}${row.group?` <small>(${row.members.length})</small>`:''}</button></td>${share?'':`<td>${n(row.taken)}</td><td>${n(row.offers)}</td>`}<td>${n(row.hires)}</td><td>${share?pct(row.hires,view.totalHires):pct(row.hires,row.taken)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function render(data,views={},settings={}) {
    const all=data.sources||[],configs=normalize(settings,all);
    return keys.map(key=>{
      const share=key==='sources-share', view=selectRows(all,configs[key],key), useTable=views[key]==='table'||views[key]==='Таблица';
      const body=share&&!view.totalHires?'<div class="ad-empty"><strong>За этот период нет подтверждённых выходов</strong><p>Измените фильтры. Отсутствие наблюдений не означает нулевую эффективность.</p></div>':!view.totalTaken?'<div class="ad-empty"><strong>В этой выборке нет кандидатов</strong><p>Измените фильтры.</p></div>':useTable?table(view,key):share?donut(view,key):bars(view,key);
      const summary=configs[key].mode==='manual'?`Выбрано вручную: ${view.selected.length}`:configs[key].limit==='all'?'Все источники':`Топ-${configs[key].limit}`;
      return `<article class="ad-panel as-panel" data-ad-section="sources" data-as-panel="${key}"><header class="ad-panel-head"><div><span class="ad-eyebrow">${share?'Вклад в наймы':'Эффективность'}</span><h2>${share?'Откуда приходят наши сотрудники':'Какие источники лучше конвертируют'}</h2><p>${share?'Доля каждого источника в общем числе выходов.':'Выходы из кандидатов, взятых в работу на вакансии.'}</p></div><div class="ad-panel-actions">${toggle(key,views)}<button type="button" class="ad-button as-config-button" data-as-open="${key}" aria-controls="as-config-${key}" aria-expanded="false">⚙ Настроить</button></div></header>${configForm(key,all,view)}<div class="ad-panel-body"><div class="as-view-summary">${share?`<strong>${n(view.totalHires)} <small>выходов за период</small></strong>`:`<strong>${n(view.totalTaken)} <small>кандидатов в выборке</small></strong>`}<span class="ad-pill">${summary}${view.group?` + группа из ${view.group.members.length}`:''}</span></div>${body}<p class="ad-note">${share?'Один выход учитывается один раз. «Из базы» — повторное использование внутренней базы. «Другие» объединяют источники, не показанные отдельно.':'Конверсия — выходы / взятые в работу внутри источника, не доля общих выходов. Для группы используются суммы, а не среднее процентов.'}</p></div>${groupPopover(key,view)}</article>`;
    }).join('');
  }
  const mounts=new WeakMap();
  function mount(main,{settings={},onChange=()=>{}}={}) {
    mounts.get(main)?.();
    let timer=null, pinned=null, groupTrigger=null, suppressFocus=null;
    const savedForms=new Map([...main.querySelectorAll('[data-as-config]')].map(form=>[form.dataset.asConfig,{mode:form.elements.mode.value,limit:form.elements.limit.value,sort:form.elements.sort.value,selected:[...form.querySelectorAll('input[name="source"]:checked')].map(input=>input.value)}]));
    const popover=key=>main.querySelector(`[data-as-popover="${key}"]`);
    const hideGroups=(restoreFocus=false)=>{
      window.clearTimeout(timer);main.querySelectorAll('[data-as-popover]').forEach(node=>{node.hidden=true;});pinned=null;
      if(restoreFocus&&groupTrigger?.isConnected){suppressFocus=groupTrigger;groupTrigger.focus({preventScroll:true});suppressFocus=null;}
    };
    const showGroup=(trigger,pin=false)=>{
      window.clearTimeout(timer);const key=trigger.dataset.asGroup,node=popover(key);if(!node||pinned&&pinned!==key&&!pin)return;
      groupTrigger=trigger;
      main.querySelectorAll('[data-as-popover]').forEach(other=>{other.hidden=other!==node;});
      node.hidden=false;if(pin)pinned=key;
      const panel=node.closest('[data-as-panel]'),rect=trigger.getBoundingClientRect(),bounds=panel.getBoundingClientRect();
      node.style.top=`${Math.max(72,Math.min(rect.bottom-bounds.top+6,panel.clientHeight-node.offsetHeight-10))}px`;
    };
    const updateForm=form=>{
      const manual=form.elements.mode.value==='manual';form.querySelector('.as-manual').hidden=!manual;form.querySelector('[data-as-limit]').hidden=manual;
      const checks=[...form.querySelectorAll('input[name="source"]')], search=form.querySelector('[data-as-search]').value.trim().toLowerCase();let found=0;
      checks.forEach(input=>{const label=input.closest('label');label.hidden=!label.dataset.asSourceName.includes(search);if(!label.hidden)found++;});
      form.querySelector('[data-as-picked]').textContent=`Выбрано ${checks.filter(input=>input.checked).length} из ${checks.length}`;
      form.querySelector('.as-no-matches').hidden=found>0;
    };
    const restoreForm=form=>{
      const saved=savedForms.get(form.dataset.asConfig);if(!saved)return;
      for(const key of ['mode','limit','sort'])form.elements[key].value=saved[key];
      form.querySelector('[data-as-search]').value='';
      form.querySelectorAll('input[name="source"]').forEach(input=>{input.checked=saved.selected.includes(input.value);});
      // Native и фирменный список должны одновременно отражать сохранённый выбор.
      form.querySelectorAll('select').forEach(select=>select.dispatchEvent(new Event('change',{bubbles:true})));
      updateForm(form);
    };
    const click=event=>{
      const open=event.target.closest('[data-as-open]');
      if(open){const form=main.querySelector(`[data-as-config="${open.dataset.asOpen}"]`);const opening=form.hidden;if(opening)restoreForm(form);form.hidden=!opening;open.setAttribute('aria-expanded',String(opening));hideGroups();return;}
      const cancel=event.target.closest('[data-as-cancel]');if(cancel){const form=cancel.closest('form');restoreForm(form);form.hidden=true;const button=main.querySelector(`[data-as-open="${form.dataset.asConfig}"]`);button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});return;}
      const pick=event.target.closest('[data-as-pick]');if(pick){const form=pick.closest('form');form.querySelectorAll('input[name="source"]').forEach(input=>{if(pick.dataset.asPick==='none'||!input.closest('label').hidden)input.checked=pick.dataset.asPick==='all';});updateForm(form);return;}
      const trigger=event.target.closest('[data-as-group]');if(trigger){event.preventDefault();showGroup(trigger,true);return;}
      if(event.target.closest('[data-as-close-group]')){hideGroups(true);return;}
      if(!event.target.closest('[data-as-popover]'))hideGroups();
    };
    const input=event=>{const form=event.target.closest('[data-as-config]');if(form)updateForm(form);};
    const submit=event=>{
      const form=event.target.closest('[data-as-config]');if(!form)return;event.preventDefault();
      const rows=[...main.querySelectorAll('[data-as-config] input[name="source"]')].map(node=>({id:node.value}));
      const next=normalize(settings,rows),key=form.dataset.asConfig;
      next[key]={mode:form.elements.mode.value,limit:form.elements.limit.value==='all'?'all':Number(form.elements.limit.value),sort:form.elements.sort.value,selected:[...form.querySelectorAll('input[name="source"]:checked')].map(node=>node.value)};
      form.hidden=true;onChange(next);
      const restore=()=>main.querySelector(`[data-as-open="${key}"]`)?.focus({preventScroll:true});
      if(window.requestAnimationFrame)window.requestAnimationFrame(restore);else window.setTimeout(restore,0);
    };
    const over=event=>{const trigger=event.target.closest('[data-as-group]');if(trigger)showGroup(trigger);else if(event.target.closest('[data-as-popover]'))window.clearTimeout(timer);};
    const out=event=>{if(!event.target.closest('[data-as-group],[data-as-popover]')||event.relatedTarget?.closest?.('[data-as-group],[data-as-popover]'))return;window.clearTimeout(timer);if(!pinned)timer=window.setTimeout(hideGroups,180);};
    const focus=event=>{const trigger=event.target.closest('[data-as-group]');if(trigger&&trigger!==suppressFocus)showGroup(trigger);};
    const blur=event=>{if(event.target.closest('[data-as-group],[data-as-popover]')&&!event.relatedTarget?.closest?.('[data-as-group],[data-as-popover]')&&!pinned)hideGroups();};
    const keydown=event=>{
      if(event.key==='Escape'){
        const insideGroup=event.target.closest('[data-as-popover],[data-as-group]');hideGroups(!!insideGroup);
        if(insideGroup){event.preventDefault();event.stopPropagation();}
        const form=event.target.closest('[data-as-config]');if(form){form.querySelector('[data-as-cancel]').click();event.preventDefault();}
      }
      const trigger=event.target.closest('[data-as-group]');if(trigger&&['Enter',' '].includes(event.key)){event.preventDefault();showGroup(trigger,true);popover(trigger.dataset.asGroup)?.querySelector('[data-as-close-group]')?.focus();}
      const source=event.target.closest('svg [data-ad-detail]');if(source&&['Enter',' '].includes(event.key)){event.preventDefault();source.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
    };
    const outside=event=>{if(!main.contains(event.target))hideGroups();};
    const listeners={click,input,change:input,submit,mouseover:over,mouseout:out,focusin:focus,focusout:blur,keydown};
    Object.entries(listeners).forEach(([type,handler])=>main.addEventListener(type,handler));document.addEventListener('click',outside);
    const cleanup=()=>{window.clearTimeout(timer);Object.entries(listeners).forEach(([type,handler])=>main.removeEventListener(type,handler));document.removeEventListener('click',outside);};mounts.set(main,cleanup);
    return cleanup;
  }
  window.AnalyticsSources={render,mount,normalize,selectRows,defaults};
})();
