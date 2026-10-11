/* Локальный черновик кандидата. Разбор предлагает значения, но не создаёт профиль. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.CandidateCreateModel=model;})(typeof window==='object'?window:globalThis,()=>{
  'use strict';
  const MAX_FILE_BYTES=10*1024*1024,MAX_TEXT_LENGTH=200000;
  const fields=['lastName','firstName','middleName','position','company','phone','email','city','salary','telegram','whatsapp','max','viber','hhURL','age','relocation','workMode','language','referrer','tags','skills','source','fullText'];
  const clean=value=>String(value??'').replace(/\u0000/g,'').trim();
  const fold=value=>clean(value).toLocaleLowerCase('ru').replace(/ё/g,'е');
  const emptyDraft=()=>Object.fromEntries(fields.map(key=>[key,key==='source'?'other':'']));
  const splitList=value=>[...new Map((Array.isArray(value)?value:clean(value).split(/[,;\n]/)).map(clean).filter(Boolean).map(item=>[fold(item),item])).values()];
  const aliases={lastName:['фамилия','surname','last name'],firstName:['имя','first name'],middleName:['отчество','patronymic'],position:['желаемая должность','должность','позиция','position','job title'],company:['текущая компания','компания','current company'],phone:['телефон','phone','мобильный телефон'],email:['эл. почта','электронная почта','email','e-mail'],city:['город','место проживания','city'],salary:['зарплатные ожидания','желаемая зарплата','зарплата','salary'],telegram:['telegram','телеграм'],whatsapp:['whatsapp'],max:['max'],viber:['viber'],hhURL:['профиль hh.ru','ссылка hh.ru','hh.ru'],age:['возраст','age'],relocation:['готов к переезду','переезд'],workMode:['формат работы','формат'],language:['английский','english'],referrer:['рекомендатель'],tags:['метки','теги'],skills:['ключевые навыки','навыки','технологии','стек','skills','tech stack']};
  const firstNames=new Set('александр алексей анна антон артем борис валерий валерия вера виктор виктория владимир владислав дарья денис дмитрий екатерина елена евгений евгения иван игорь ирина кирилл мария максим михаил наталья никита николай ольга павел петр роман сергей софия татьяна юлия юрий'.split(' '));
  function nameParts(line){
    const words=clean(line).split(/\s+/);
    if(words.length<2||words.length>3||!words.every(word=>/^[А-ЯЁ][а-яё-]{1,50}$/.test(word)))return null;
    const known=words.map(word=>firstNames.has(fold(word))),surname=word=>/(?:ов[а]?|ев[а]?|ин[а]?|ский|ская|енко|юк|чук|ко|ян|дзе)$/i.test(word);
    if(known[0]&&!known[1])return {firstName:words[0],lastName:words[1],middleName:words[2]||''};
    if(known[1]&&(surname(words[0])||!known[0]))return {lastName:words[0],firstName:words[1],middleName:words[2]||''};
    return null;
  }
  function parseText(input){
    const raw=String(input??'').replace(/\u0000/g,''),text=raw.slice(0,MAX_TEXT_LENGTH),lines=text.split(/\r?\n/).map(clean).filter(Boolean),parsed={},warnings=[];
    if(raw.length>MAX_TEXT_LENGTH)warnings.push('Текст длиннее 200 000 символов: разобрана только первая часть.');
    for(const line of lines){
      const match=line.match(/^([^:：]{1,45})\s*[:：]\s*(.+)$/);
      if(!match)continue;
      const key=Object.keys(aliases).find(key=>aliases[key].some(alias=>fold(alias)===fold(match[1])));
      if(key&&!parsed[key])parsed[key]=clean(match[2]);
      if(/^(фио|полное имя|full name)$/i.test(clean(match[1])))Object.assign(parsed,nameParts(match[2])||{});
    }
    if(!parsed.firstName||!parsed.lastName){for(const line of lines.slice(0,8)){const names=nameParts(line);if(names){Object.entries(names).forEach(([key,value])=>{if(!parsed[key])parsed[key]=value;});break;}}}
    if(!parsed.email)parsed.email=text.split(/[\s<>"(),;]+/).filter(token=>token.length<=320&&token.includes('@')).map(token=>token.replace(/^[^:]*:/,'')).find(token=>/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/i.test(token))||'';
    if(!parsed.phone){const phones=text.match(/(?:\+7|8|\+\d{1,3})[\s().-]*\d(?:[\d\s().-]{6,20}\d)/g)||[];parsed.phone=phones.find(value=>value.replace(/\D/g,'').length>=10&&value.replace(/\D/g,'').length<=15)||'';}
    if(!parsed.hhURL)parsed.hhURL=text.match(/https?:\/\/(?:[a-z0-9-]+\.)?hh\.ru\/resume\/[^\s<>"']+/i)?.[0]||'';
    if(!parsed.position)parsed.position=lines.slice(0,14).find(line=>line.length<130&&!line.includes(':')&&/(разработчик|дизайнер|аналитик|менеджер|инженер|developer|designer|analyst|engineer)/i.test(line))||'';
    if(parsed.age)parsed.age=parsed.age.match(/^\d{1,3}(?=\s|$)/)?.[0]||parsed.age;
    if(parsed.skills)parsed.skills=splitList(parsed.skills).join(', ');
    if(parsed.relocation){const value=fold(parsed.relocation);parsed.relocation=/^(да|готов|yes)$/.test(value)?'yes':/^(нет|не готов|no)$/.test(value)?'no':'';}
    if(!lines.length)warnings.push('В резюме нет текста. Заполните поля вручную.');
    if(!parsed.firstName||!parsed.lastName)warnings.push('ФИО распознано не полностью — укажите имя и фамилию вручную.');
    if(!parsed.position)warnings.push('Должность не распознана — укажите её вручную.');
    if(!parsed.phone&&!parsed.email)warnings.push('Контакты не найдены. Их можно добавить вручную.');
    return {fields:Object.fromEntries(Object.entries(parsed).filter(([,value])=>clean(value))),text,status:!lines.length?'empty':parsed.firstName&&parsed.lastName&&parsed.position?'parsed':'partial',warnings};
  }
  function mergeParsed(draft,parsedFields,touched=[]){const result={...emptyDraft(),...draft},protectedKeys=new Set(touched);for(const [key,value] of Object.entries(parsedFields||{})){if(fields.includes(key)&&!protectedKeys.has(key)&&clean(value))result[key]=clean(value);}return result;}
  function allowedStage(stage){return !!stage&&stage.enabled!==false&&stage.disabled!==true&&stage.terminal!==true&&!['выход','отказ'].includes(fold(stage.label))&&!['rejected','refused','exit','hired','outcome'].includes(fold(stage.id));}
  function stageOptions(vacancy){return (Array.isArray(vacancy?.stages)?vacancy.stages:[]).filter(allowedStage);}
  function defaultStage(vacancy){const options=stageOptions(vacancy);return options.some(stage=>stage.id===vacancy?.initialStage)?vacancy.initialStage:options[0]?.id||'';}
  function validate(draft,assignment={},vacancies=[]){
    const errors=[];
    for(const [key,label] of [['lastName','Фамилия'],['firstName','Имя'],['position','Должность']])if(!clean(draft?.[key]))errors.push({field:key,message:`Заполните поле «${label}».`});
    for(const key of fields){const limit=key==='fullText'?MAX_TEXT_LENGTH:['skills','tags'].includes(key)?4000:500;if(String(draft?.[key]??'').length>limit)errors.push({field:key,message:`Поле «${key}» превышает допустимую длину.`});}
    const email=clean(draft?.email),phone=clean(draft?.phone),age=clean(draft?.age),hh=clean(draft?.hhURL);
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.push({field:'email',message:'Проверьте адрес электронной почты.'});
    if(phone&&(phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15||!/^[+\d\s().-]+$/.test(phone)))errors.push({field:'phone',message:'Проверьте телефон: от 7 до 15 цифр.'});
    if(age&&(!/^\d+$/.test(age)||Number(age)<1||Number(age)>120))errors.push({field:'age',message:'Возраст должен быть числом от 1 до 120 либо пустым.'});
    if(hh&&!/^https?:\/\/(?:[a-z0-9-]+\.)?hh\.ru\/[^\s]+$/i.test(hh))errors.push({field:'hhURL',message:'Укажите полный адрес профиля на hh.ru.'});
    const vacancy=vacancies.find(item=>item.id===assignment.vacancyId);
    if(!vacancy)errors.push({field:'vacancyId',message:'Выберите вакансию.'});
    if(!vacancy||!stageOptions(vacancy).some(stage=>stage.id===assignment.stageId))errors.push({field:'stageId',message:'Выберите доступный незавершающий этап этой вакансии.'});
    return errors;
  }
  function buildCandidate(draft,options={}){
    const id=options.id||`local-candidate-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}`;
    if(!/^local-candidate-[a-z0-9-]+$/i.test(id))throw new Error('Неверный локальный идентификатор кандидата.');
    const createdAt=new Date(options.now??Date.now()).toISOString(),value=key=>clean(draft?.[key]),name=[value('lastName'),value('firstName'),value('middleName')].filter(Boolean).join(' '),position=value('position'),contacts=Object.fromEntries(['phone','email','telegram','whatsapp','max','viber','hhURL'].map(key=>[key,value(key)])),skills=splitList(draft?.skills),fullText=value('fullText'),source=value('source')||'other';
    const resume={id:`${id}-resume-1`,candidateId:id,title:position?`${position} · резюме`:'Резюме кандидата',position,source,contacts:{...contacts},skills:[...skills],experience:[],education:'',educationDetails:[],languages:[],text:fullText,fullText,createdAt,updatedAt:createdAt,format:options.format||'manual'};
    return {id,name,firstName:value('firstName'),lastName:value('lastName'),middleName:value('middleName'),initials:[value('firstName'),value('lastName')].filter(Boolean).map(value=>value[0]).join(''),position,role:position,company:value('company'),contacts,city:value('city'),salary:value('salary'),age:value('age')?Number(value('age')):null,relocation:value('relocation'),workMode:value('workMode'),language:value('language'),referrer:value('referrer'),source,skills,tags:splitList(draft?.tags),experience:[],education:'',feedback:'',consent:'unknown',status:'active',searchProvider:'ats',internalHistoryAvailable:true,createdAt,updatedAt:createdAt,processes:[],resumes:[resume]};
  }
  const demoText='Фамилия: Демонстрационный\nИмя: Алексей\nДолжность: Android-разработчик\nТекущая компания: ДемоСтудия\nТелефон: +7 000 000-00-00\nEmail: candidate.demo@example.com\nГород: Москва\nЗарплатные ожидания: 220 000 ₽\nTelegram: @demo_candidate\nВозраст: 30\nГотов к переезду: Нет\nФормат работы: Гибрид\nАнглийский: B2\nНавыки: Kotlin, Android, Jetpack Compose, Coroutines\n\nОпыт работы\n2023 — настоящее время · ДемоСтудия\nРазработка мобильных приложений и автоматических тестов.\n\nВсе сведения в этом образце вымышлены.';
  return Object.freeze({MAX_FILE_BYTES,MAX_TEXT_LENGTH,fields,emptyDraft,splitList,parseText,mergeParsed,allowedStage,stageOptions,defaultStage,validate,buildCandidate,demoText});
});
