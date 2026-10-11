/* Проверенные редакторы Джуна: docs/reference/native-ai-settings.md.
   Справочные значения — вымышленные примеры, без подключения аккаунта. */
window.NativeAiRequirements = (() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=(id,label,value='',required=false)=>({id,label,value,required,type:'text'});
  const number=(id,label,value='',required=false)=>({...text(id,label,value,required),type:'number'});
  const select=(id,label,options,value=options[0])=>({id,label,options,value,type:'select'});
  const action=(id,label,value='отклонить')=>select(id,label,['одобрить','отклонить'],value);
  const lookup=(id,label,value='')=>({...text(id,label,value,true),type:'lookup'});
  const range=(unit,from='',to='')=>[number('from',`От (${unit})`,from),number('to',`До (${unit})`,to)];
  const missing=(value='отклонить')=>action('missing','Если не указано',value);
  const schemas={
    experience:[...range('лет','3')],
    tenure:[select('mode','Как учитывать опыт',['по совокупному опыту','по каждому месту']),{id:'years',label:'Минимум лет на последних местах работы',type:'tenure',value:['1','1']}],
    gap:[number('years','Максимальный перерыв: лет','0'),number('months','Месяцев','6')],
    'companies-count':[number('count','Не менее уникальных компаний','4',true),action('result','Если условие выполнено')],
    freelance:[action('result','Если одновременно фриланс и работа')],
    courses:[],
    industry:[select('presence','Опыт в отрасли',['есть','нет']),select('period','Когда',['когда-либо','сейчас']),lookup('values','Отрасли'),action('missing','Если отрасль не определена')],
    company:[select('presence','Опыт в компании',['есть','нет']),select('period','Когда',['сейчас','за всё время']),lookup('values','Компании'),action('result','При выполнении условия','одобрить')],
    country:[select('mode','Страны',['только','кроме']),lookup('values','Страны','Россия'),action('relocation','Если готов к переезду'),missing()],
    city:[select('mode','Города',['только','кроме']),lookup('values','Города','Москва'),action('relocation','Если готов к переезду'),missing()],
    metro:[lookup('city','Город','Москва'),lookup('values','Станции метро'),action('missing','Если метро не указано')],
    timezone:[text('from','От часового пояса','Москва UTC+3',true),text('to','До часового пояса','',true)],
    'work-format':[{id:'values',label:'Форматы работы',type:'checks',options:['удалённо','в офисе','гибрид','разъездная','вахта'],value:[]},missing()],
    salary:[...range('₽','150000','300000'),missing('одобрить')],
    age:[...range('лет','25','45'),missing('одобрить')],
    citizenship:[select('mode','Что проверять',['гражданство или разрешение','только гражданство']),lookup('values','Страны','Россия'),action('multiple','Если больше одного гражданства','одобрить')],
    education:[select('level','Минимальное образование',['Среднее','Среднее специальное','Неоконченное высшее','Высшее','Бакалавр','Магистр','Кандидат наук','Доктор наук'],'Высшее'),action('unfinished','Если образование не завершено','одобрить'),...range('год окончания'),action('result','Если год в указанном диапазоне','одобрить')],
    gender:[select('value','Рассматриваем',['мужчин','женщин']),missing('одобрить')],
    photo:[action('result','Если есть фото','одобрить')],
    'hh-test':[number('score','Минимальный балл','70',true),...range('секунд на ответ','120','600')],
    'hh-comments':[lookup('values','Фразы в комментариях hh'),action('result','Если содержит фразу')],
    position:[lookup('values','Фразы в желаемой должности'),action('result','Если содержит фразу','одобрить'),missing()]
  };
  const schema=type=>schemas[type]||[];
  function create(type,label,required){return {type,label,required,critical:false,params:Object.fromEntries(schema(type).map(f=>[f.id,Array.isArray(f.value)?[...f.value]:f.value]))}}
  function fields(rule){return `<div class="ve68-native-rule-fields">${schema(rule.type).map(f=>{
    const value=rule.params[f.id],attr=`data-rule-field="${f.id}"`;
    if(f.type==='checks')return `<fieldset><legend>${esc(f.label)}</legend><div class="ve68-native-rule-checks">${f.options.map(o=>`<label><input type="checkbox" ${attr} value="${esc(o)}" ${value.includes(o)?'checked':''}>${esc(o)}</label>`).join('')}</div></fieldset>`;
    if(f.type==='tenure')return `<fieldset><legend>${esc(f.label)}</legend>${value.map((v,i)=>`<label class="ve68-config-field">${i===0?'Последнее место':`Предыдущее место ${i}`}<div class="ve68-native-rule-tenure"><input type="number" min="0" step="0.5" ${attr} data-place="${i}" value="${esc(v)}"><button type="button" class="ve68-config-icon" data-ai-config-action="rule-place-remove" data-index="${i}" ${value.length===1?'disabled':''} aria-label="Убрать место ${i+1}">×</button></div></label>`).join('')}<button type="button" class="ve68-config-btn" data-ai-config-action="rule-place-add">+ Ещё одно место</button></fieldset>`;
    return `<label class="ve68-config-field">${esc(f.label)}${f.type==='lookup'?'<span>Демонстрационный справочник: несколько значений через запятую.</span>':''}${f.type==='select'?`<select ${attr}>${f.options.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input ${attr} type="${f.type==='number'?'number':'text'}" ${f.type==='number'?'min="0" step="any"':''} value="${esc(value)}" ${f.type==='lookup'?'placeholder="Введите значения через запятую"':''}>`}</label>`;
  }).join('')||'<p class="ve68-native-help">Не рассматриваем кандидатов после курсов. Дополнительных параметров у этого условия нет.</p>'}</div><label class="ve68-native-critical"><input type="checkbox" data-rule-critical ${rule.critical?'checked':''} ${!rule.required?'disabled':''}>Критичное обязательное требование</label>`}
  function read(rule,root){
    schema(rule.type).forEach(f=>{
      const nodes=[...root.querySelectorAll(`[data-rule-field="${f.id}"]`)];
      rule.params[f.id]=f.type==='checks'?nodes.filter(n=>n.checked).map(n=>n.value):f.type==='tenure'?nodes.map(n=>n.value):nodes[0]?.value??rule.params[f.id];
    });
    const critical=root.querySelector('[data-rule-critical]');if(critical)rule.critical=rule.required&&critical.checked;
  }
  function validate(rule){
    for(const f of schema(rule.type)){
      const v=rule.params[f.id];if((f.required||f.type==='checks')&&(!v||(Array.isArray(v)?!v.length:!String(v).replace(/,/g,'').trim())))return `Заполните поле «${f.label}».`;
      if(f.type==='number'&&v!==''&&(!Number.isFinite(Number(v))||Number(v)<0))return `Поле «${f.label}» должно быть неотрицательным числом.`;
      if(f.type==='tenure'&&v.some(n=>n===''||!Number.isFinite(Number(n))||Number(n)<0))return 'Укажите неотрицательный срок для каждого места работы.';
    }
    const p=rule.params;if(p.from!==undefined&&p.to!==undefined&&p.from!==''&&p.to!==''&&Number.isFinite(Number(p.from))&&Number.isFinite(Number(p.to))&&Number(p.from)>Number(p.to))return 'Начало диапазона не может быть больше конца.';
    if(rule.type==='hh-test'&&Number(p.score)>100)return 'Балл hh-теста должен быть от 0 до 100.';
    return '';
  }
  function summary(rule){return rule.label+(schema(rule.type).length?' · '+schema(rule.type).filter(f=>rule.params[f.id]!==''&&rule.params[f.id]?.length!==0).map(f=>`${f.label}: ${Array.isArray(rule.params[f.id])?rule.params[f.id].join(', '):rule.params[f.id]}`).join(' · '):'')}
  const symbols={experience:'💼',tenure:'🏃',gap:'⏳','companies-count':'🔢',freelance:'🏖️',courses:'🤓',industry:'🏷️',company:'🏢',country:'🌐',city:'🏙️',metro:'🚇',timezone:'🕘','work-format':'🏠',salary:'💰',age:'🎂',citizenship:'🌍',education:'🧑‍🎓',gender:'🚻',photo:'📷','hh-test':'🎯','hh-comments':'💬',position:'🎯',text:'✍️'};
  const hints={text:'впишите произвольное требование словами',experience:'общий стаж в годах',tenure:'стаж на последних местах работы',gap:'допустимый разрыв в стаже','companies-count':'число компаний в резюме',freelance:'фриланс на последнем месте',courses:'вместо работы — курсы',industry:'сфера компаний: банк, IT, ритейл…',company:'работал в Яндексе, Сбере…',country:'страна проживания',city:'город проживания',metro:'станции метро рядом',timezone:'диапазон таймзон','work-format':'удалёнка, офис, гибрид',salary:'зарплатные ожидания',age:'возраст кандидата',citizenship:'гражданство или патент',education:'минимальное образование',gender:'мужчины / женщины',photo:'наличие фото в резюме','hh-test':'баллы за тест hh','hh-comments':'фразы в комментариях о кандидате',position:'что кандидат ищет в резюме'};
  const icons={
    grip:'<svg width="14" height="22" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="3" r="1.4"/><circle cx="7.5" cy="3" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/></svg>',
    plain:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 8h14M5 12h13M5 16h9"/></svg>',
    ai:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 1L11.05 6.95 17 9 11.05 11.05 9 17 6.95 11.05 1 9 6.95 6.95Z"/><path d="M18.5 13.5 19.4 16.1 22 17 19.4 17.9 18.5 20.5 17.6 17.9 15 17 17.6 16.1Z"/></svg>',
    pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 2.5l9 9-1.3 1.3-1-1-3.9 3.9.1 3.2c0 .4-.5.6-.8.3l-2.9-2.9-4.6 4.6-1.3-1.3 4.6-4.6-2.9-2.9c-.3-.3-.1-.8.3-.8l3.2.1 3.9-3.9-1-1z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm3 2v8h2v-8H9zm4 0v8h2v-8h-2z"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
    transfer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></svg>',
    layers:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 10 5-10 5L2 7l10-5zm-8 9 8 4 8-4 2 1-10 5-10-5 2-1zm0 5 8 4 8-4 2 1-10 5-10-5 2-1z"/></svg>',
    save:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 1v6h10V4H7zm5 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>'
  };
  function inline(rule,index,draft=false){
    const p=rule.params;
    const f=id=>{
      const s=schema(rule.type).find(v=>v.id===id);if(!s)return '';
      const attr=`data-rule-field="${id}" aria-label="${esc(s.label)} — требование ${index+1}"`;
      if(s.type==='select')return `<select ${attr}>${s.options.map(o=>`<option ${o===p[id]?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
      if(s.type==='checks')return `<span class="joon-inline-checks">${s.options.map(o=>`<label><input type="checkbox" ${attr} value="${esc(o)}" ${(p[id]||[]).includes(o)?'checked':''}>${esc(o)}</label>`).join('')}</span>`;
      return `<input ${attr} class="${s.type==='number'?'':'wide'}" type="${s.type==='number'?'number':'text'}" ${s.type==='number'?'min="0" step="any"':''} value="${esc(p[id])}" placeholder="${s.type==='number'?'—':esc(s.label)}">`;
    };
    const decision=id=>`<button type="button" class="joon-decision ${p[id]==='одобрить'?'approve':'reject'}" data-ai-config-action="${draft?'rule-decision':'inline-decision'}" data-index="${index}" data-field="${id}">${esc(p[id])}</button>`;
    const absent=()=>` · если не указан${['age','salary','experience'].includes(rule.type)?'':'о'} — ${decision('missing')}`;
    let body='';
    if(rule.type==='age')body=`возраст от ${f('from')} лет до ${f('to')} лет${absent()}`;
    else if(rule.type==='salary')body=`зарплата от ${f('from')} до ${f('to')} ₽${absent()}`;
    else if(rule.type==='experience')body=`опыт работы от ${f('from')} до ${f('to')} лет`;
    else if(rule.type==='tenure')body=`не смотрим бегунов — считаем ${f('mode')}, минимальный опыт: ${(p.years||[]).map((v,i)=>`<input type="number" min="0" step="0.5" data-rule-field="years" data-place="${i}" aria-label="${i===0?'Последнее':`Предыдущее ${i}`} место — требование ${index+1}" value="${esc(v)}"> год${Number(v)===1?'':'а'} на ${i===0?'последнем':i===1?'предпоследнем':`${i+1}-м последнем`} месте`).join(', ')} <button type="button" class="joon-inline-action" data-ai-config-action="${draft?'rule-place-add':'inline-place-add'}" data-index="${index}">+ место</button> <button type="button" class="joon-inline-action minus" data-ai-config-action="${draft?'rule-place-remove':'inline-place-remove'}" data-index="${draft?(p.years||[]).length-1:index}" ${(p.years||[]).length<2?'disabled':''} aria-label="Убрать последнее место работы">−</button>`;
    else if(rule.type==='gap')body=`перерыв в работе не более ${f('years')} лет ${f('months')} месяцев`;
    else if(rule.type==='companies-count')body=`если не менее ${f('count')} компаний — ${decision('result')}`;
    else if(rule.type==='freelance')body=`если одновременно фриланс и работа — ${decision('result')}`;
    else if(rule.type==='courses')body='не рассматриваем кандидатов после курсов';
    else if(rule.type==='industry'||rule.type==='company')body=`опыт ${f('presence')} ${f('period')} · ${rule.type==='industry'?'отрасли':'компании'} ${f('values')} · ${rule.type==='industry'?`если не определена — ${decision('missing')}`:`при совпадении — ${decision('result')}`}`;
    else if(rule.type==='country'||rule.type==='city')body=`${rule.type==='country'?'страны':'города'} ${f('mode')} ${f('values')} · если готов к переезду — ${decision('relocation')}${absent()}`;
    else if(rule.type==='metro')body=`метро · город ${f('city')} · станции ${f('values')}${absent()}`;
    else if(rule.type==='timezone')body=`часовой пояс от ${f('from')} до ${f('to')}`;
    else if(rule.type==='work-format')body=`формат работы ${f('values')}${absent()}`;
    else if(rule.type==='citizenship')body=`${f('mode')} ${f('values')} · если больше одного гражданства — ${decision('multiple')}`;
    else if(rule.type==='education')body=`образование от ${f('level')} · если не завершено — ${decision('unfinished')} · год окончания от ${f('from')} до ${f('to')} · в диапазоне — ${decision('result')}`;
    else if(rule.type==='gender')body=`рассматриваем ${f('value')}${absent()}`;
    else if(rule.type==='photo')body=`если есть фото — ${decision('result')}`;
    else if(rule.type==='hh-test')body=`hh-тест от ${f('score')} баллов · от ${f('from')} до ${f('to')} секунд на ответ`;
    else if(rule.type==='hh-comments')body=`комментарии hh содержат ${f('values')} — ${decision('result')}`;
    else if(rule.type==='position')body=`желаемая должность содержит ${f('values')} — ${decision('result')}${absent()}`;
    return `<div class="joon-inline">${body}${draft?'':'<span class="joon-inline-help" title="Параметры сохраняются только после подтверждения настройки модуля." aria-label="О параметрах требования">ⓘ</span>'}</div>`;
  }
  return {create,fields,read,validate,summary,inline,symbols,hints,icons};
})();
