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
  return {create,fields,read,validate,summary};
})();
