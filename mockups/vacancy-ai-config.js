/* Настройки по Джуну и Собесо: docs/reference/screens/native-ai-settings.md.
   Макет без запросов к сервисам: данные живут в памяти открытой страницы. */
window.VacancyAiConfig = (() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v)),saved={},templates=[];
  let dialog,flow,onUpdate=()=>{};
  const key=c=>`${c.vacancyId}:${c.funnelId}:${c.index}`;
  const kind=stage=>{const n=stage.toLowerCase();return n==='отклик'?'response':['скоринг','скрининг','автоскрининг'].includes(n)?'resume':n==='чат-бот'?'bot':/интервью/.test(n)?'transcription':''};
  const names={response:'Авторазбор откликов',resume:'AI разбор резюме',bot:'AI бот',transcription:'Транскрибация'};
  const isOn=c=>saved[key(c)]?.enabled===true;
  const at=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
  function put(o,p,v){const parts=p.split('.'),last=parts.pop();parts.reduce((v,k)=>v[k],o)[last]=v}
  const btn=(text,action,attrs='',style='')=>`<button type="button" class="ve68-config-btn ${style}" data-ai-config-action="${action}" ${attrs}>${text}</button>`;
  const icon=(text,action,attrs='')=>`<button type="button" class="ve68-config-icon" data-ai-config-action="${action}" ${attrs}>${text}</button>`;
  const opt=(values,value)=>values.map(item=>{const [v,label]=Array.isArray(item)?item:[item,item];return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(label)}</option>`}).join('');
  function field(path,label,type='text',options=[],hint=''){
    const value=at(flow.draft,path),attrs=`data-bind="${path}"`;
    return `<label class="ve68-config-field">${esc(label)}${hint?`<span>${esc(hint)}</span>`:''}${type==='textarea'?`<textarea rows="4" ${attrs}>${esc(value)}</textarea>`:type==='select'?`<select ${attrs} data-refresh>${opt(options,value)}</select>`:`<input type="${type}" ${type==='number'?'min="1" max="10000"':''} ${attrs} value="${esc(value)}">`}</label>`;
  }
  const check=(path,label)=>`<label class="ve68-config-check"><input type="checkbox" data-bind="${path}" ${at(flow.draft,path)?'checked':''}>${esc(label)}</label>`;
  const section=(title,body,helper='')=>`<section class="ve68-native-section"><h3>${title}</h3>${helper?`<p class="ve68-native-help">${helper}</p>`:''}${body}</section>`;
  function notify(text){const t=document.querySelector('#toast');if(!t)return;t.textContent=text;t.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.hidden=true,2600)}
  function defaults(){return {
    criteria:[],criteriaSource:'custom',refusalMode:'score',threshold:8,parseTimes:[],
    channels:{chat:false,av:false},chatRequirements:[],resumeRequirements:[],fixedQuestions:[],fixedQuestionPosition:'end',voiceQuestions:[],deletedQuestions:[],faq:[],
    botThreshold:7,presentsAs:'ИИ',botName:'',botGender:'Мужской',tone:'На вы',allowRecruiter:false,
    answerMinutes:'4',saveAudio:false,saveVideo:false,publicLink:false,confirmEmail:false,requestPhone:false,
    welcome:'Здравствуйте! Давайте познакомимся. Я задам несколько вопросов о вашем опыте.',welcomeVideo:'',
    autoInvite:false,inviteMode:'real',inviteTimes:[],days:[],dailyLimit:'200',inviteStage:'Чат-бот',
    invitation:'Здравствуйте! Спасибо за интерес к вакансии {{ВАКАНСИЯ}}. Приглашаем на короткое интервью с AI-ассистентом. Мы подготовили {{КОЛВО_ВОПРОСОВ}} вопросов. Пройдите его в удобное время: {{ССЫЛКА_НА_ИНТЕРВЬЮ}}',
    followups:[],dialogPing:false,pingHours:'24',noReplyEnabled:false,noReplyDays:'14'
  }}
  function init(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.id='vacancy-ai-config-dialog';dialog.className='ve68-config-dialog';dialog.setAttribute('aria-labelledby','ve68-config-title');document.body.append(dialog);
    dialog.addEventListener('click',event=>{const b=event.target.closest('[data-ai-config-action]');if(b)act(b)});
    dialog.addEventListener('cancel',event=>{if(flow.overlay){event.preventDefault();flow.overlay='';render()}});
    dialog.addEventListener('input',event=>{if(event.target.matches('[data-question-row][data-list="fixedQuestions"] [data-prop="answer"]')){const row=event.target.closest('[data-question-row]');row.querySelector('[data-fixed-score]').textContent=`${event.target.value.trim()?'Повлияет':'Не повлияет'} на итоговую оценку`}});
    dialog.addEventListener('change',event=>{
      if(event.target.matches('[data-english-preset]')){capture();const q=flow.draft.voiceQuestions[Number(event.target.dataset.englishPreset)];q.preset=event.target.value;if(q.preset)q.text=englishPresets[q.preset];render()}
      if(event.target.matches('[data-refresh]')){capture();render()}
      if(event.target.matches('[data-image]')){
        const file=event.target.files[0],index=Number(event.target.dataset.image),current=flow;if(!file)return;
        if(!file.type.startsWith('image/')){flow.error='Выберите файл изображения.';render();return}
        capture();const reader=new FileReader();reader.onload=()=>{if(current!==flow||!flow.draft.voiceQuestions[index])return;flow.draft.voiceQuestions[index].image=reader.result;render()};reader.readAsDataURL(file);
      }
      if(event.target.matches('[data-welcome-video]')){capture();flow.draft.welcomeVideo=event.target.files[0]?.name||'';render()}
    });
  }
  function open(context,update){
    init();onUpdate=update;
    flow={context,kind:kind(context.stage),view:kind(context.stage)==='resume'?'choice':kind(context.stage)==='bot'?'bot':'criteria',step:0,draft:clone(saved[key(context)]||defaults()),error:'',overlay:'',catalogGroup:true};
    render();if(!dialog.open)dialog.showModal();
  }
  function toggle(context,update){
    if(isOn(context)){saved[key(context)].enabled=false;update();notify(`${names[kind(context.stage)]}: отключено`);return}
    if(kind(context.stage)==='transcription'){saved[key(context)]={enabled:true};update();notify('Транскрибация: включено');return}
    open(context,update);
  }
  function responseSettings(){return saved[`${flow.context.vacancyId}:${flow.context.funnelId}:${flow.context.responseIndex}`]}
  function generatedCriteria(){
    const text=window.Publications?.profile(flow.context.vacancyId)?.text||'';
    return [['Требования',true],['Будет плюсом',false]].flatMap(([heading,required])=>{
      const part=(text.match(new RegExp(`${heading}:\\s*\\n([\\s\\S]*?)(?:\\n\\n|$)`,'i'))||[])[1]||'';
      return part.split('\n').filter(l=>l.trim().startsWith('•')).flatMap(l=>l.replace(/^\s*•\s*/,'').split(';').map(title=>title.trim().replace(/[.;]$/,'')).filter(Boolean).map(title=>({title,required:required&&!/плюс/i.test(title),critical:false,type:'text'})));
    });
  }
  function capture(){
    if(flow.overlay==='rule')window.NativeAiRequirements.read(flow.rule,dialog);
    dialog.querySelectorAll('[data-bind]').forEach(el=>{if(el.type==='radio'&&!el.checked)return;put(flow.draft,el.dataset.bind,el.type==='checkbox'?el.checked:el.value)});
    dialog.querySelectorAll('[data-requirement]').forEach(row=>{
      const item=flow.draft[row.dataset.list][Number(row.dataset.requirement)];if(row.querySelector('[data-title]'))item.title=row.querySelector('[data-title]').value;
      if(row.querySelector('[data-group]')){item.required=row.querySelector('[data-group]').value==='required';item.critical=item.required&&row.querySelector('[data-critical]').checked}
      if(row.querySelector('[data-condition]'))item.condition=row.querySelector('[data-condition]').value;
    });
    dialog.querySelectorAll('[data-question-row]').forEach(row=>{const item=flow.draft[row.dataset.list][Number(row.dataset.questionRow)];row.querySelectorAll('[data-prop]').forEach(el=>item[el.dataset.prop]=el.value)});
    dialog.querySelectorAll('[data-faq-row]').forEach(row=>{const item=flow.draft.faq[Number(row.dataset.faqRow)];item.question=row.querySelector('[data-faq-question]').value;item.answer=row.querySelector('[data-faq-answer]').value});
    for(const list of ['parseTimes','inviteTimes']){const nodes=dialog.querySelectorAll(`[data-time-list="${list}"]`);if(nodes.length)flow.draft[list]=[...nodes].map(el=>el.value)}
    const days=dialog.querySelectorAll('[data-day]');if(days.length)flow.draft.days=[...days].filter(el=>el.checked).map(el=>el.value);
    dialog.querySelectorAll('[data-followup]').forEach(row=>{const item=flow.draft.followups[Number(row.dataset.followup)];item.hours=row.querySelector('input').value;item.text=row.querySelector('textarea').value});
  }
  function neighbours(list,index){return list==='criteria'?flow.draft[list].map((r,i)=>r.required===flow.draft[list][index].required?i:-1).filter(i=>i!==-1):flow.draft[list].map((_,i)=>i)}
  function move(list,index,direction){const indices=neighbours(list,index),t=indices[indices.indexOf(index)+direction];if(t===undefined)return;[flow.draft[list][index],flow.draft[list][t]]=[flow.draft[list][t],flow.draft[list][index]]}
  function act(b){
    const action=b.dataset.aiConfigAction,list=b.dataset.list,index=Number(b.dataset.index);
    if(action==='cancel'){dialog.close();return}
    capture();flow.error='';
    if(action==='close-overlay'){flow.overlay='';render();return}
    if(action==='catalog'){flow.overlay='catalog';flow.catalogGroup=b.dataset.group!=='desired'}
    if(action==='catalog-group')flow.catalogGroup=b.dataset.group==='required';
    if(action==='add-rule'){
      if(b.dataset.type==='text'){flow.draft.criteria.push({title:'',required:flow.catalogGroup,critical:false,type:'text'});flow.overlay=''}
      else{flow.rule=window.NativeAiRequirements.create(b.dataset.type,b.dataset.label,flow.catalogGroup);flow.ruleIndex=null;flow.overlay='rule'}
    }
    if(action==='edit-rule'){flow.rule=clone(flow.draft.criteria[index]);flow.ruleIndex=index;flow.overlay='rule'}
    if(action==='rule-place-add')flow.rule.params.years.push('1');
    if(action==='rule-place-remove'&&flow.rule.params.years.length>1)flow.rule.params.years.splice(index,1);
    if(action==='rule-confirm'){
      flow.error=window.NativeAiRequirements.validate(flow.rule);
      if(!flow.error){flow.rule.title=window.NativeAiRequirements.summary(flow.rule);if(flow.ruleIndex===null)flow.draft.criteria.push(clone(flow.rule));else flow.draft.criteria[flow.ruleIndex]=clone(flow.rule);flow.overlay=''}
    }
    if(action==='add-requirement')flow.draft[list].push({title:'',condition:'Подходит если'});
    if(action==='remove'){if(list==='voiceQuestions')flow.draft.deletedQuestions.push(clone(flow.draft[list][index]));flow.draft[list].splice(index,1)}
    if(action==='deleted')flow.overlay='deleted';
    if(action==='restore'){flow.draft.voiceQuestions.push(flow.draft.deletedQuestions.splice(index,1)[0]);flow.overlay=''}
    if(action==='up'||action==='down')move(list,index,action==='up'?-1:1);
    if(action==='generate'){
      const items=generatedCriteria();if(!items.length)flow.error='В описании вакансии пока нет требований. Добавьте их вручную.';
      else for(const item of items)if(!flow.draft[list].some(v=>v.title.toLowerCase()===item.title.toLowerCase()))flow.draft[list].push(list==='criteria'?item:{title:item.title,condition:'Подходит если'});
      if(items.length)notify('Пример требований подготовлен из описания — проверьте формулировки');
    }
    if(action==='correct'){flow.draft.criteria[index].title=flow.draft.criteria[index].title.trim().replace(/^•\s*/,'').replace(/;\s*$/,'');notify('В макете убраны лишние пробелы; AI-корректировка потребует движка Джуна')}
    if(action==='templates')flow.overlay='templates';
    if(action==='template-save'){if(!validRequirements('criteria')){render();return}flow.overlay='template-name'}
    if(action==='template-confirm'){const name=dialog.querySelector('[data-template-name]').value.trim();if(!name)flow.error='Укажите название шаблона.';else{templates.push({name,criteria:clone(flow.draft.criteria)});flow.overlay='';notify('Шаблон сохранён в памяти макета')}}
    if(action==='template-use'){flow.draft.criteria=clone(templates[index].criteria);flow.overlay=''}
    if(action==='reuse'){
      const s=responseSettings();if(!s?.criteria?.length)return;
      for(const p of ['criteria','refusalMode','threshold'])flow.draft[p]=clone(s[p]);flow.draft.criteriaSource='response';finish();return;
    }
    if(action==='custom'){flow.view='criteria';flow.draft.criteriaSource='custom'}
    if(action==='score')flow.draft.botThreshold=index;
    if(action==='time-add')flow.draft[list].push('09:00');
    if(action==='question-add')flow.draft[list].push({text:'',answer:'',type:b.dataset.type||'normal',image:''});
    if(action==='questions-generate'){
      const req=flow.draft.chatRequirements.length?flow.draft.chatRequirements:generatedCriteria();
      for(const r of req.slice(0,5)){const text=`Расскажите на примере вашего проекта: ${r.title.charAt(0).toLowerCase()+r.title.slice(1)}`;if(!flow.draft[list].some(q=>q.text===text))flow.draft[list].push({text,answer:'Оценить конкретный пример, личную роль и результат. Общие слова без примера — недостаточное подтверждение.',type:'normal',image:''})}
      notify('Подготовлены демонстрационные вопросы, без обращения к AI');
    }
    if(action==='answer-generate'){if(!flow.draft[list][index].text.trim())flow.error='Сначала заполните вопрос.';else{flow.draft[list][index].answer='Низкий уровень: общие слова без примера. Средний: описан конкретный подход. Высокий: пример из опыта, объяснение выбора, сложностей и результата.';notify('Добавлен пример подсказки, без реального AI')}}
    if(action==='question-generate'){
      const item=flow.draft[list][index],requirement=generatedCriteria()[index%Math.max(1,generatedCriteria().length)];
      item.text=item.type==='english'?'Tell me about a challenging project and your contribution.':requirement?`Приведите пример из вашего опыта: ${requirement.title}`:'Расскажите о сложной задаче и вашей роли в её решении.';
      item.answer='Оценить конкретность примера, личный вклад и достигнутый результат. Для английского — также понятность речи и способность поддерживать разговор.';notify('Добавлен пример вопроса и подсказки, без реального AI');
    }
    if(action==='faq-add')flow.draft.faq.push({question:'',answer:''});
    if(action==='faq-generate'){
      const p=window.Publications?.profile(flow.context.vacancyId),items=[{question:'Что предстоит делать?',answer:p?.text?.split('Требования:')[0]||'Развивать продукт вместе с командой.'},{question:'Как проходит отбор?',answer:'AI-интервью, HR интервью, техническое и финальное интервью.'}];
      items.forEach(q=>{if(!flow.draft.faq.some(v=>v.question===q.question))flow.draft.faq.push(q)});notify('Пример ответов подготовлен — проверьте информацию о вакансии');
    }
    if(action==='knowledge')flow.overlay='knowledge';
    if(action==='variable')flow.draft.invitation+=` ${b.dataset.variable}`;
    if(action==='message-template')flow.draft.invitation='Здравствуйте! Спасибо за отклик на {{ВАКАНСИЯ}}. Приглашаем ответить на {{КОЛВО_ВОПРОСОВ}} вопросов: {{ССЫЛКА_НА_ИНТЕРВЬЮ}}';
    if(action==='followup-add')flow.draft.followups.push({hours:'24',text:'Здравствуйте! Напоминаем о приглашении на интервью: {{ССЫЛКА_НА_ИНТЕРВЬЮ}}'});
    if(action==='back')flow.step=Math.max(0,flow.step-1);
    if(action==='next'){next();return}
    render();
  }
  function validRequirements(list){
    if(!flow.draft[list].length){flow.error='Добавьте требования вручную или перенесите из описания вакансии.';return false}
    if(flow.draft[list].some(v=>!v.title.trim()||/:\s*$/.test(v.title))){flow.error='Заполните требования или удалите пустые строки.';return false}return true;
  }
  const steps=()=>['format',...(flow.draft.channels.chat?['requirements']:[]),'questions','settings','invite','review'];
  const stepNames={requirements:'Требования',questions:'Вопросы',settings:'Настройки',invite:'Приглашения',review:'Проверка'};
  function next(){
    if(flow.view==='criteria'){
      if(!validRequirements('criteria')){render();return}
      if(flow.draft.refusalMode==='required'&&!flow.draft.criteria.some(r=>r.required))flow.error='Для этого режима нужно хотя бы одно обязательное требование.';
      if(flow.draft.parseTimes.some(v=>!v))flow.error='Укажите время разбора или удалите пустой интервал.';
      if(!flow.error)finish();else render();return;
    }
    const step=steps()[flow.step],d=flow.draft;
    if(step==='format'&&!d.channels.chat&&!d.channels.av)flow.error='Выберите чат-бота, аудио/видео или оба формата.';
    if(step==='requirements'&&!validRequirements('chatRequirements')){render();return}
    if(step==='requirements'&&d.resumeRequirements.some(r=>!r.title.trim()))flow.error='Заполните требования для скоринга резюме или удалите пустые строки.';
    if(step==='questions'){
      if(d.channels.av&&!d.voiceQuestions.length)flow.error='Добавьте хотя бы один вопрос для аудио/видео-интервью.';
      if((d.channels.av&&d.voiceQuestions.some(q=>!q.text.trim()))||(d.channels.chat&&d.fixedQuestions.some(q=>!q.text.trim())))flow.error='Заполните тексты вопросов или удалите пустые строки.';
      if(d.faq.some(q=>!q.question.trim()||!q.answer.trim()))flow.error='Для базы знаний нужны и вопрос, и ответ.';
    }
    if(step==='invite'){
      if(d.autoInvite&&(!d.invitation.trim()||Number(d.dailyLimit)<1))flow.error='Заполните приглашение и положительный лимит диалогов.';
      if(d.autoInvite&&d.inviteMode==='schedule'&&(!d.inviteTimes.length||d.inviteTimes.some(v=>!v)))flow.error='Укажите хотя бы одно время отправки приглашений.';
      if(d.followups.some(v=>Number(v.hours)<1||!v.text.trim()))flow.error='У каждого напоминания нужны срок от 1 часа и текст.';
      if((d.dialogPing&&Number(d.pingHours)<1)||(d.noReplyEnabled&&Number(d.noReplyDays)<=0))flow.error='Срок ожидания должен быть положительным.';
    }
    if(flow.error){render();return}
    if(step==='review'){finish();return}flow.step++;render();
  }
  function finish(){saved[key(flow.context)]={...clone(flow.draft),enabled:true};dialog.close();onUpdate();notify(`${names[flow.kind]}: настройки сохранены, включено`)}
  function orderButtons(list,i){const indices=neighbours(list,i);return `<div class="ve68-native-order">${icon('↑','up',`data-list="${list}" data-index="${i}" aria-label="Поднять строку ${i+1}" ${i===indices[0]?'disabled':''}`)}${icon('↓','down',`data-list="${list}" data-index="${i}" aria-label="Опустить строку ${i+1}" ${i===indices[indices.length-1]?'disabled':''}`)}</div>`}
  function requirementRows(list,required){
    const joon=list==='criteria';
    return `<div class="ve68-native-requirements">${flow.draft[list].map((r,i)=>joon&&r.required!==required?'':`<div class="ve68-native-requirement" data-requirement="${i}" data-list="${list}">${orderButtons(list,i)}<div class="ve68-native-requirement-content">${!joon?`<select data-condition aria-label="Условие требования ${i+1}">${opt(['Подходит если','Не подходит если'],r.condition)}</select>`:''}${r.params?`<p class="ve68-native-rule-summary">${esc(r.title)}</p>${btn('Параметры','edit-rule',`data-index="${i}"`,'small')}`:`<textarea data-title rows="2" aria-label="Требование ${i+1}" placeholder="Сформулируйте требование к опыту или навыкам">${esc(r.title)}</textarea>`}${joon?`<div class="ve68-native-requirement-tools"><select data-group data-refresh aria-label="Обязательность требования ${i+1}">${opt([['required','Обязательное'],['desired','Желательное']],r.required?'required':'desired')}</select><label class="ve68-native-critical"><input type="checkbox" data-critical ${r.critical?'checked':''} ${!r.required?'disabled':''}>Критичное <span title="Несоответствие критичному обязательному требованию означает, что кандидат не подходит.">ⓘ</span></label>${!r.params?btn('✦ Скорректировать','correct',`data-index="${i}"`,'small'):''}</div>`:''}</div>${icon('×','remove',`data-list="${list}" data-index="${i}" aria-label="Удалить требование ${i+1}"`)}</div>`).join('')||'<p class="ve68-native-empty">Требований пока нет</p>'}</div>`;
  }
  function times(list){return `<div class="ve68-native-times">${flow.draft[list].map((t,i)=>`<label>Время <input type="time" data-time-list="${list}" aria-label="Время ${i+1}" value="${esc(t)}">${icon('×','remove',`data-list="${list}" data-index="${i}" aria-label="Удалить время ${i+1}"`)}</label>`).join('')}${btn('+ Ещё одно время','time-add',`data-list="${list}"`)}</div>`}
  function threshold(){return `<div class="ve68-native-score" role="group" aria-label="Проходной балл">${Array.from({length:10},(_,i)=>btn(i+1,'score',`data-index="${i+1}" aria-pressed="${Number(flow.draft.botThreshold)===i+1}"`,Number(flow.draft.botThreshold)===i+1?'selected':'')).join('')}</div>`}
  function criteriaBody(){
    const d=flow.draft;
    return `<div class="ve68-criteria-toolbar"><h3>Требования</h3><div class="ve68-native-toolbar">${btn('+ Добавить требование','catalog')}${btn('✦ Перенести из вакансии','generate','data-list="criteria"','purple')}${btn('Выбрать шаблон','templates')}${btn('Сохранить в шаблон','template-save')}</div></div><p class="ve68-config-demo">В макете генерация демонстрационная. Требования можно изменить перед включением.</p>${section('Обязательные',requirementRows('criteria',true)+btn('+ Обязательное требование','catalog','data-group="required"'),'Сильно влияют на оценку. Критичное требование исключает кандидата при несоответствии.')}${section('Желательные',requirementRows('criteria',false)+btn('+ Желательное требование','catalog','data-group="desired"'),'Помогают ранжировать кандидатов, но не служат самостоятельным фильтром.')}${section('Общие настройки',`<h4>В каком случае отказывать кандидату</h4><div class="ve68-native-radio"><label><input type="radio" name="refusal-mode" data-bind="refusalMode" data-refresh value="required" ${d.refusalMode==='required'?'checked':''}>По обязательным требованиям</label><label><input type="radio" name="refusal-mode" data-bind="refusalMode" data-refresh value="score" ${d.refusalMode==='score'?'checked':''}>По проходному баллу</label></div>${d.refusalMode==='score'?`<label class="ve68-config-field">Проходной балл: <b>${esc(d.threshold)} из 10</b><input type="range" min="1" max="10" step="1" data-bind="threshold" data-refresh value="${esc(d.threshold)}"></label><p class="ve68-native-help">Обязательные требования — 80% оценки, желательные — 20%. Расчёт выполняет встроенный движок, а не этот макет.</p>`:''}`)}${flow.kind==='response'?section('Автоматический разбор откликов с вакансии',times('parseTimes'),'Настройте время разбора входящих откликов.') : ''}<p class="ve68-native-help">Оценка «подходит / не подходит» сама не отправляет отказ. Перемещение и сообщения настраиваются в колонке «Автоматизация».</p>`;
  }
  function choice(){const s=responseSettings(),available=!!s?.criteria?.length;return `<p class="ve68-config-intro">Как AI должен разбирать резюме на этапе скоринга?</p><div class="ve68-config-choices"><button class="ve68-config-choice" data-ai-config-action="reuse" ${available?'':'disabled'}><b>Разбирать по тем же критериям, что и отклики</b><span>${available?`${s.criteria.length} требований, режим оценки и проходной балл из авторазбора откликов`:'Сначала сохраните требования в модуле «Авторазбор откликов».'}</span></button><button class="ve68-config-choice" data-ai-config-action="custom"><b>Настроить</b><span>Собственные обязательные и желательные требования.</span></button></div>`}
  function chatRequirements(){return section('Требования для интервью',requirementRows('chatRequirements')+`<div class="ve68-native-toolbar">${btn('+ Добавить требование','add-requirement','data-list="chatRequirements"')}${btn('✦ Сгенерировать','generate','data-list="chatRequirements"','purple')}</div>`,'По этим требованиям кандидату будут заданы вопросы.')+section('Требования для скоринга резюме',requirementRows('resumeRequirements')+`<div class="ve68-native-toolbar">${btn('+ Добавить требование','add-requirement','data-list="resumeRequirements"')}${btn('✦ Сгенерировать','generate','data-list="resumeRequirements"')}</div>`,'По этим требованиям вопрос не задаётся — только оценка резюме.')}
  const englishPresets={self:'Tell me about yourself',project:'Describe your current project',goals:'Career goals and motivations',challenge:'Challenging technical situation'};
  function questions(list){
    const voice=list==='voiceQuestions';
    return (!voice?field('fixedQuestionPosition','Задать фиксированные вопросы в','select',[['end','конце интервью'],['begin','начале интервью']]):'')+`<div class="ve68-native-questions">${flow.draft[list].map((q,i)=>{
      const english=q.type==='english';
      const image=voice?`${q.image?`<img class="ve68-native-question-image" src="${esc(q.image)}" alt="Изображение к вопросу">`:''}<label class="ve68-native-upload">+ Загрузить изображение<input type="file" accept="image/*" data-image="${i}" aria-label="Изображение к вопросу ${i+1}"></label>`:'';
      const preset=english?`<label class="ve68-config-field">Выберите заготовленный вопрос<select data-english-preset="${i}">${opt([['','Выберите вопрос'],...Object.entries(englishPresets)],q.preset||'')}</select></label>`:'';
      const answer=!english?`<label class="ve68-config-field">${voice?'Правильный ответ или подсказка для оценки':'Ожидаемый ответ (необязательно)'}<textarea rows="3" data-prop="answer" placeholder="${voice?'Опишите признаки хорошего и слабого ответа':'Без ожидаемого ответа вопрос не влияет на итоговую оценку'}">${esc(q.answer)}</textarea></label>${voice?`<div class="ve68-native-toolbar">${btn('✦ Сгенерировать вопрос и ответ','question-generate',`data-list="${list}" data-index="${i}"`)}${btn('✦ Сгенерировать ответ','answer-generate',`data-list="${list}" data-index="${i}"`)}</div>`:`<p class="ve68-native-help" data-fixed-score>${q.answer?.trim()?'Повлияет':'Не повлияет'} на итоговую оценку</p>`}`:'';
      return `<section class="ve68-native-question" data-question-row="${i}" data-list="${list}"><div class="ve68-native-question-head"><b>${english?'Вопрос на знание английского 🇬🇧':`Вопрос ${i+1}/${flow.draft[list].length}`}</b>${orderButtons(list,i)}${icon('×','remove',`data-list="${list}" data-index="${i}" aria-label="Удалить вопрос ${i+1}"`)}</div>${image}${preset}<label class="ve68-config-field">Текст вопроса<textarea data-prop="text" rows="3" placeholder="Что вы хотите спросить у кандидата?">${esc(q.text)}</textarea></label>${answer}${voice?'<p class="ve68-config-demo">Озвучка появится после подключения движка. В макете аудио не генерируется.</p>':''}</section>`;
    }).join('')||'<p class="ve68-native-empty">Вопросы пока не добавлены</p>'}</div><div class="ve68-native-toolbar">${btn('+ '+(voice?'Обычный вопрос':'Добавить вопрос'),'question-add',`data-list="${list}"`)}${voice?btn('+ Вопрос на знание английского 🇬🇧','question-add',`data-list="${list}" data-type="english"`):''}${btn('✦ '+(voice?'Сгенерировать вопросы':'Из требований'),'questions-generate',`data-list="${list}"`)}${voice?btn('Показать удалённые вопросы','deleted'):''}</div>`;
  }
  function faqBody(){return `<p class="ve68-native-help">После интервью AI ищет ответ в базе знаний, в том числе в этих вопросах и ответах.</p>${btn('Подробнее о базе знаний','knowledge')}<div class="ve68-native-questions">${flow.draft.faq.map((q,i)=>`<section class="ve68-native-question" data-faq-row="${i}"><div class="ve68-native-question-head"><b>Вопрос ${i+1}</b>${icon('×','remove',`data-list="faq" data-index="${i}" aria-label="Удалить вопрос базы знаний ${i+1}"`)}</div><label class="ve68-config-field">Вопрос кандидата<textarea rows="2" data-faq-question>${esc(q.question)}</textarea></label><label class="ve68-config-field">Ответ<textarea rows="3" data-faq-answer>${esc(q.answer)}</textarea></label></section>`).join('')}</div><div class="ve68-native-toolbar">${btn('+ Добавить вопрос','faq-add')}${btn('✦ Сгенерировать','faq-generate')}</div>`}
  function botSettings(){const d=flow.draft;return section('Проходной балл',threshold())+(d.channels.chat?section('Основные настройки чат-бота',`<div class="ve68-native-fields">${field('presentsAs','Бот представляется кандидату как','select',['Человек','ИИ'])}${field('botName','Имя бота (опционально)')}${field('botGender','Пол бота','select',['Мужской','Женский'])}${field('tone','Тон общения','select',['На вы','На ты'])}</div>${check('allowRecruiter','Разрешить кандидату звать рекрутера')}`):'')+(d.channels.av?section('Настройки аудио/видео-интервью',`${field('answerMinutes','Время на один ответ','select',[['1','1 минута'],['1.5','1 минута 30 секунд'],['2','2 минуты'],['2.5','2 минуты 30 секунд'],['3','3 минуты'],['3.5','3 минуты 30 секунд'],['4','4 минуты'],['5','5 минут']])}${check('saveAudio','Сохранять аудио запись ответа')}${check('saveVideo','Сохранять видео запись ответа')}${check('publicLink','Публичная ссылка — самостоятельная регистрация кандидатов')}${check('confirmEmail','Подтверждение email при регистрации')}${check('requestPhone','Запрашивать телефон кандидата')}`)+section('Брендирование',`${field('welcome','Приветственное сообщение','textarea')}<p class="ve68-native-help">Озвучка генерируется после сохранения в движке интервью.</p><label class="ve68-native-upload">+ Загрузить видео-кружок<input type="file" accept="video/*" data-welcome-video aria-label="Видео-кружок приветствия"></label>${d.welcomeVideo?`<p>${esc(d.welcomeVideo)} · только локальный пример, не отправляется</p>`:''}`):'')}
  function invitation(){const d=flow.draft;return section('Автоматическая отправка приглашения на интервью',`${check('autoInvite','Включить авто отправку')}<div class="ve68-native-fields">${field('inviteMode','Режим отправки','select',[['real','В реальном времени (каждые 5 мин)'],['schedule','Раз в день']])}${field('dailyLimit','Максимум диалогов в день','number')}</div>${d.inviteMode==='schedule'?`<label class="ve68-config-field">Время отправки<input type="time" data-time-list="inviteTimes" aria-label="Время отправки приглашений" value="${esc(d.inviteTimes[0]||'09:00')}"></label>`:''}<h4>Дни недели для отправки</h4><div class="ve68-native-days">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(day=>`<label><input type="checkbox" data-day value="${day}" ${d.days.includes(day)?'checked':''}><span>${day}</span></label>`).join('')}</div><p class="ve68-native-help">Пустой выбор = любой день недели</p>${field('inviteStage','Кандидатам с этого этапа отправлять приглашения','select',flow.context.stages||['Отклик','Новый Кандидат','Скоринг','Чат-бот'])}<h4>Шаблон сообщения</h4><div class="ve68-native-toolbar">${btn('Выбрать готовый шаблон','message-template')}${['{{ВАКАНСИЯ}}','{{КОЛВО_ВОПРОСОВ}}','{{ССЫЛКА_НА_ИНТЕРВЬЮ}}'].map(v=>btn(v,'variable',`data-variable="${v}"`,'small')).join('')}</div>${field('invitation','Текст приглашения','textarea')}<div class="ve68-native-questions">${d.followups.map((r,i)=>`<section class="ve68-native-question" data-followup="${i}"><div class="ve68-native-question-head"><b>Если не начнет интервью</b>${icon('×','remove',`data-list="followups" data-index="${i}" aria-label="Удалить повторное письмо ${i+1}"`)}</div><label class="ve68-config-field">Отправить через (часов)<input type="number" min="1" value="${esc(r.hours)}"></label><label class="ve68-config-field">Текст письма<textarea>${esc(r.text)}</textarea></label></section>`).join('')}</div>${btn('+ Если не начнет интервью, отправить ещё одно письмо','followup-add')}`)+(d.channels.chat?section('Пинги кандидатам во время диалога',`${check('dialogPing','Отправлять напоминание')}${field('pingHours','Если кандидат не отвечает (часов)','number')}`):'')+section('Перевести в статус «Провал»',`${check('noReplyEnabled','Включить правило для отсутствия ответа')}${field('noReplyDays','Если кандидат не отвечает дольше','select',[['0.041666667','1 часа'],['0.083333333','2 часов'],['1','1 дня'],['2','2 дней'],['3','3 дней'],['5','5 дней'],['7','1 недели'],['14','2 недель'],['30','1 месяца']])}`,'Отключено по умолчанию. Ручное решение рекрутера имеет приоритет.')+'<p class="ve68-config-demo">Приглашения и записи в этом макете не создаются. Переходы после интервью настраиваются в автоматизациях этапа.</p>'}
  function review(){const d=flow.draft,rows=[['Формат',[d.channels.chat?'Чат-бот':'',d.channels.av?'Аудио/видео':''].filter(Boolean).join(' + ')],['Требования для интервью',d.channels.chat?d.chatRequirements.length:'—'],['Требования для скоринга резюме',d.channels.chat?d.resumeRequirements.length:'—'],['Фиксированные вопросы',d.channels.chat?d.fixedQuestions.length:'—'],['Вопросы аудио/видео',d.channels.av?d.voiceQuestions.length:'—'],['База знаний',`${d.faq.length} вопросов`],['Проходной балл',`${d.botThreshold} из 10`],['Авто приглашения',d.autoInvite?'Включены':'Отключены'],['Напоминания о приглашении',d.followups.length],['Отсутствие ответа',d.noReplyEnabled?({0.041666667:'1 час',0.083333333:'2 часа',1:'1 день',2:'2 дня',3:'3 дня',5:'5 дней',7:'1 неделя',14:'2 недели',30:'1 месяц'}[d.noReplyDays]||`${d.noReplyDays} дней`):'Без автоматического провала']];return `<div class="ve68-config-review"><h3>Проверьте настройки перед включением</h3><dl>${rows.map(([label,v])=>`<div><dt>${label}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`}
  function botBody(){const d=flow.draft,step=steps()[flow.step];
    if(step==='format')return '<p class="ve68-config-intro">Выберите один или оба формата. Затем настройте требования, вопросы и поведение бота.</p><div class="ve68-config-choices">'+['chat','av'].map(c=>`<label class="ve68-config-channel"><input type="checkbox" data-bind="channels.${c}" ${d.channels[c]?'checked':''}><span><b>${c==='chat'?'Чат-бот':'Аудио/видео'}</b><small>${c==='chat'?'Диалог по требованиям и фиксированным вопросам.':'Вопросы с подсказками для оценки и настройкой записи.'}</small></span></label>`).join('')+'</div>';
    if(step==='requirements')return chatRequirements();
    if(step==='questions')return (d.channels.chat?section('Фиксированные вопросы',questions('fixedQuestions'),'Эти вопросы бот задаст дополнительно к вопросам по требованиям.'):'')+(d.channels.av?section('Вопросы для аудио/видео-интервью',questions('voiceQuestions')):'')+section('Часто задаваемые вопросы о вакансии',faqBody());
    return step==='settings'?botSettings():step==='invite'?invitation():review();
  }
  const catalog=[['Своё требование',[['text','Своё требование текстом']]],['Опыт и карьера',[['experience','Опыт работы'],['tenure','Не смотрим бегунов'],['gap','Перерыв в работе'],['companies-count','Кол-во мест работы'],['freelance','Фрилансеры'],['courses','После курсов']]],['Компании',[['industry','Отрасль'],['company','Компания']]],['Локация',[['country','Страна'],['city','Город'],['metro','Метро'],['timezone','Часовой пояс'],['work-format','Формат работы']]],['О кандидате',[['salary','Зарплата'],['age','Возраст'],['citizenship','Гражданство'],['education','Уровень образования'],['gender','Пол'],['photo','Фото кандидата'],['hh-test','hh-тест'],['hh-comments','Комментарии в hh'],['position','Желаемая должность']]]];
  function overlay(){
    if(!flow.overlay)return '';let title='',body='';
    if(flow.overlay==='catalog'){title='Добавить требование';body=`<div class="ve68-native-toolbar">${btn('✳ Обязательное','catalog-group','data-group="required"',flow.catalogGroup?'selected':'')}${btn('🔥 Желательное','catalog-group','data-group="desired"',!flow.catalogGroup?'selected':'')}</div><p class="ve68-config-demo">Выберите готовое условие и настройте его параметры или добавьте требование своим текстом.</p><div class="ve68-native-catalog">${catalog.map(([group,items])=>`<section><h4>${group}</h4>${items.map(([type,label])=>btn(esc(label),'add-rule',`data-type="${type}" data-label="${esc(label)}"`)).join('')}</section>`).join('')}</div>`}
    if(flow.overlay==='rule'){title=flow.rule.label;body=window.NativeAiRequirements.fields(flow.rule)+btn(flow.ruleIndex===null?'Добавить требование':'Сохранить параметры','rule-confirm','','primary')}
    if(flow.overlay==='templates'){title='Шаблоны требований';body=templates.length?`<div class="ve68-config-choices">${templates.map((t,i)=>`<button class="ve68-config-choice" data-ai-config-action="template-use" data-index="${i}"><b>${esc(t.name)}</b><span>${t.criteria.length} требований</span></button>`).join('')}</div>`:'<p>Шаблонов пока нет. Сохраните набор требований кнопкой «Сохранить в шаблон».</p>'}
    if(flow.overlay==='template-name'){title='Сохранить в шаблон';body=`<label class="ve68-config-field">Название шаблона<input data-template-name placeholder="Например: Android Senior"></label>${btn('Сохранить шаблон','template-confirm','','primary')}`}
    if(flow.overlay==='knowledge'){title='База знаний AI-бота';body='<p>Ответы о вакансии дополняют общие сведения о компании. Кандидат может задать вопросы после интервью.</p><p class="ve68-native-help">В макете редактируются вопросы и ответы этой вакансии. Общая база знаний компании сюда не копируется.</p>'}
    if(flow.overlay==='deleted'){title='Удалённые вопросы';body=flow.draft.deletedQuestions.length?flow.draft.deletedQuestions.map((q,i)=>`<section class="ve68-native-question"><p>${esc(q.text)||'Пустой вопрос'}</p>${btn('Восстановить','restore',`data-index="${i}"`)}</section>`).join(''):'<p>Удалённых вопросов нет.</p>'}
    return `<div class="ve68-native-overlay"><section role="dialog" aria-modal="true" aria-label="${title}"><header><h3>${title}</h3>${icon('×','close-overlay','aria-label="Закрыть дополнительное окно"')}</header>${flow.error?`<p role="alert" class="ve68-config-error">${esc(flow.error)}</p>`:''}${body}</section></div>`;
  }
  function render(){
    const bot=flow.view==='bot',choiceView=flow.view==='choice',step=bot?steps()[flow.step]:'';
    dialog.innerHTML=`<header ${flow.overlay?'inert':''}><div><h2 id="ve68-config-title">${bot&&step==='format'?'AI бот · формат общения':names[flow.kind]}</h2><p>${esc(flow.context.vacancyName)} · ${esc(flow.context.stage)}</p></div>${icon('×','cancel','aria-label="Закрыть настройку AI"')}</header><div class="ve68-config-body" ${flow.overlay?'inert':''}>${bot&&flow.step>0?`<nav class="ve68-config-steps" aria-label="Шаги настройки">${steps().slice(1).map((name,i)=>`<span class="${flow.step===i+1?'current':flow.step>i+1?'complete':''}">${i+1}. ${stepNames[name]}</span>`).join('')}</nav>`:''}${flow.error&&!flow.overlay?`<p class="ve68-config-error" role="alert">${esc(flow.error)}</p>`:''}${choiceView?choice():bot?botBody():criteriaBody()}</div><footer ${flow.overlay?'inert':''}>${btn('Отмена','cancel')}${bot&&flow.step>0?btn('Назад','back'):''}${!choiceView?btn(bot?(step==='format'?'Подтвердить выбор':step==='review'?'Сохранить и включить':'Далее'):'Сохранить и включить','next','','primary'):''}</footer>${overlay()}`;
    if(flow.overlay)dialog.querySelector('.ve68-native-overlay input, .ve68-native-overlay button')?.focus();
  }
  return {kind,names,isOn,toggle,open};
})();
