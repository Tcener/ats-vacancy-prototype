/* Настройки по Джуну и Собесо: docs/reference/screens/native-ai-settings.md.
   Макет без запросов к сервисам: данные живут в памяти открытой страницы. */
window.VacancyAiConfig = (() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v)),saved={},templates=[];
  let dialog,flow,onUpdate=()=>{},uploadSerial=0;
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
    answerMinutes:'4',saveAudio:false,saveVideo:false,skipVideo:false,publicLink:false,confirmEmail:false,requestPhone:false,
    welcome:'Здравствуйте! Давайте познакомимся. Я задам несколько вопросов о вашем опыте.',welcomeVideo:'',welcomeVideoData:'',
    autoInvite:false,inviteMode:'real',inviteTimes:[],days:[],dailyLimit:'200',inviteStage:'Чат-бот',
    invitation:'Здравствуйте! Спасибо за интерес к вакансии {{ВАКАНСИЯ}}. Приглашаем на короткое интервью с AI-ассистентом. Мы подготовили {{КОЛВО_ВОПРОСОВ}} вопросов. Пройдите его в удобное время: {{ССЫЛКА_НА_ИНТЕРВЬЮ}}',
    followups:[],dialogPing:false,pingHours:'24',noReplyEnabled:false,noReplyDays:'14'
  }}
  function init(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.id='vacancy-ai-config-dialog';dialog.className='ve68-config-dialog';dialog.setAttribute('aria-labelledby','ve68-config-title');document.body.append(dialog);
    dialog.addEventListener('click',event=>{const b=event.target.closest('[data-ai-config-action]');if(b)act(b)});
    dialog.addEventListener('cancel',event=>{if(flow.overlay){event.preventDefault();if(flow.overlay==='catalog'&&flow.rule)flow.rule=null;else flow.overlay='';flow.error='';render()}});
    dialog.addEventListener('input',event=>{if(event.target.matches('[data-question-row][data-list="fixedQuestions"] [data-prop="answer"]')){const row=event.target.closest('[data-question-row]');row.querySelector('[data-fixed-score]').textContent=`${event.target.value.trim()?'Повлияет':'Не повлияет'} на итоговую оценку`}});
    dialog.addEventListener('change',event=>{
      if(event.target.matches('[data-audio-rate]')){const audio=dialog.querySelector(`#${event.target.dataset.audioRate}`),rate=Number(event.target.value);if(audio&&[0.75,1,1.25,1.5,2].includes(rate))audio.playbackRate=rate;return}
      if(event.target.matches('[data-english-preset]')){capture();const q=flow.draft.voiceQuestions[Number(event.target.dataset.englishPreset)];q.preset=event.target.value;if(q.preset)q.text=englishPresets[q.preset];render()}
      if(event.target.matches('[data-refresh]')){capture();render()}
      if(event.target.matches('[data-image]'))readBotFile(event.target.files?.[0],Number(event.target.dataset.image),'image');
      if(event.target.matches('[data-welcome-video]'))readBotFile(event.target.files?.[0],null,'video');
    });
    dialog.addEventListener('dragstart',event=>{const native=event.target.closest('[data-bot-drag-list]');if(native){capture();flow.botDrag={list:native.dataset.botDragList,index:Number(native.dataset.index)};event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(flow.botDrag.index));return}const grip=event.target.closest('.joon-grip');if(!grip)return;capture();flow.dragIndex=Number(grip.dataset.index);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(flow.dragIndex))});
    dialog.addEventListener('dragover',event=>{if(flow.botDrag){const target=event.target.closest('[data-requirement], [data-question-row]');if(target?.dataset.list===flow.botDrag.list){event.preventDefault();event.dataTransfer.dropEffect='move'}return}if(flow.dragIndex===undefined)return;const target=event.target.closest('[data-requirement], [data-joon-group]');if(target){event.preventDefault();event.dataTransfer.dropEffect='move'}});
    dialog.addEventListener('drop',event=>{if(flow.botDrag){const target=event.target.closest('[data-requirement], [data-question-row]');if(target?.dataset.list!==flow.botDrag.list)return;event.preventDefault();const {list,index}=flow.botDrag,to=Number(target.dataset.requirement??target.dataset.questionRow),items=flow.draft[list];if(index!==to&&items[index]&&items[to])items.splice(to,0,items.splice(index,1)[0]);flow.botDrag=null;render();return}if(flow.dragIndex===undefined)return;const target=event.target.closest('[data-requirement], [data-joon-group]');if(!target)return;event.preventDefault();const from=flow.dragIndex,to=target.hasAttribute('data-requirement')?Number(target.dataset.requirement):null,required=target.closest('[data-joon-group]').dataset.joonGroup==='required';moveRequirement(from,to,required);flow.dragIndex=undefined;render()});
    dialog.addEventListener('dragend',()=>{if(flow){flow.dragIndex=undefined;flow.botDrag=null}});
  }
  function open(context,update){
    init();onUpdate=update;
    const previous=saved[key(context)],draft={...defaults(),...clone(previous||{})};draft.channels={chat:false,av:false,...draft.channels};
    flow={context,kind:kind(context.stage),view:kind(context.stage)==='resume'?'choice':kind(context.stage)==='bot'?'bot':'criteria',step:previous&&(draft.channels.chat||draft.channels.av)?1:0,draft,error:'',overlay:'',catalogGroup:true,resetScroll:true,botMode:draft.channels.chat?'chat':'av',sections:{description:false},pendingUploads:0};
    render();if(!dialog.open)dialog.showModal();
  }
  function readBotFile(file,index,type){
    if(!file)return;capture();const current=flow,question=type==='image'?flow.draft.voiceQuestions[index]:null;
    const allowed=type==='image'?['image/png','image/jpeg','image/webp','image/gif']:['video/mp4','video/webm','video/quicktime'];
    const limit=(type==='image'?5:20)*1024*1024;
    if(!allowed.includes(file.type)||!Number.isFinite(file.size)||file.size<=0||file.size>limit){flow.error=type==='image'?'Выберите PNG, JPEG, WebP или GIF до 5 МБ.':'Выберите MP4, WebM или MOV до 20 МБ.';render();return}
    if(type==='image'&&!question)return;
    const token=++uploadSerial;if(question)question.imageUploadToken=token;else flow.videoUploadToken=token;
    flow.pendingUploads++;const reader=new FileReader();
    const active=()=>current===flow&&dialog.open&&(question?flow.draft.voiceQuestions.includes(question)&&question.imageUploadToken===token:flow.videoUploadToken===token);
    const complete=()=>{if(current===flow)flow.pendingUploads=Math.max(0,flow.pendingUploads-1)};
    reader.onload=()=>{complete();if(!active())return;capture();if(question)question.image=reader.result;else{flow.draft.welcomeVideo=file.name;flow.draft.welcomeVideoData=reader.result}flow.error='';render()};
    reader.onerror=()=>{complete();if(active()){capture();flow.error='Не удалось прочитать файл. Попробуйте выбрать его ещё раз.';render()}};
    reader.readAsDataURL(file);
  }
  function toggle(context,update){
    if(isOn(context)){saved[key(context)].enabled=false;update();notify(`${names[kind(context.stage)]}: отключено`);return}
    if(kind(context.stage)==='transcription'){saved[key(context)]={enabled:true};update();notify('Транскрибация: включено');return}
    open(context,update);
  }
  function responseSettings(){return saved[`${flow.context.vacancyId}:${flow.context.funnelId}:${flow.context.responseIndex}`]}
  function generatedCriteria(){
    const text=window.Publications?.profile(flow.context.vacancyId)?.text||'';
    const headings=[...text.matchAll(/^(Требования|Будет плюсом|Обязанности|Условия|Как устроена работа|О продукте)\s*:[\t ]*(?:\n)?/gmi)];
    return headings.flatMap((heading,index)=>{
      if(!/^(Требования|Будет плюсом)$/i.test(heading[1]))return [];
      const required=/^Требования$/i.test(heading[1]);
      const part=text.slice(heading.index+heading[0].length,headings[index+1]?.index??text.length);
      // Отдельное поле требований допускает обычный текст, строки и списки.
      // Обязанности и условия в критерии оценки не попадают.
      return part.split('\n').flatMap(line=>line.replace(/^\s*(?:[•*\-]|\d+[.)])\s*/,'').split(';')
        .map(title=>title.trim().replace(/[.;]$/,''))).filter(Boolean)
        .map(title=>({title,required:required&&!/плюс/i.test(title),critical:false,type:'text'}));
    });
  }
  function capture(){
    dialog.querySelectorAll('[data-sobesso-section]').forEach(el=>flow.sections[el.dataset.sobessoSection]=el.hasAttribute('open'));
    if(flow.overlay==='rule')window.NativeAiRequirements.read(flow.rule,dialog);
    if(flow.overlay==='catalog'&&flow.rule){const editor=dialog.querySelector('.joon-catalog-editor');if(editor)window.NativeAiRequirements.read(flow.rule,editor)}
    const replace=dialog.querySelector('[data-template-replace]');if(replace)flow.templateReplace=replace.checked;
    dialog.querySelectorAll('[data-bind]').forEach(el=>{if(el.type==='radio'&&!el.checked)return;put(flow.draft,el.dataset.bind,el.type==='checkbox'?el.checked:el.value)});
    dialog.querySelectorAll('[data-requirement]').forEach(row=>{
      const item=flow.draft[row.dataset.list][Number(row.dataset.requirement)];if(row.querySelector('[data-title]'))item.title=row.querySelector('[data-title]').value;
      if(item.params){window.NativeAiRequirements.read(item,row);item.title=window.NativeAiRequirements.summary(item)}
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
  function moveRequirement(from,to,required){
    if(from===to)return;const item=flow.draft.criteria.splice(from,1)[0];if(!item)return;item.required=required;if(!required)item.critical=false;
    const target=to===null?flow.draft.criteria.length:to-(from<to?1:0);flow.draft.criteria.splice(target,0,item);
  }
  function act(b){
    const action=b.dataset.aiConfigAction,list=b.dataset.list,index=Number(b.dataset.index);
    if(action==='cancel'){dialog.close();return}
    capture();flow.error='';
    if(action==='bot-mode'){flow.botMode=b.dataset.mode;flow.resetScroll=true}
    if(action==='bot-format'){flow.step=0;flow.resetScroll=true}
    if(action==='bot-segment')put(flow.draft,b.dataset.field,b.dataset.value);
    if(action==='bot-review')flow.overlay='bot-review';
    if(action==='bot-save'){saveBot();return}
    if(action==='image-remove'){const q=flow.draft.voiceQuestions[index];if(q){q.image='';q.imageUploadToken=++uploadSerial}}
    if(action==='welcome-video-remove'){flow.draft.welcomeVideo='';flow.draft.welcomeVideoData='';flow.videoUploadToken=++uploadSerial}
    if(action==='insert-variable'){const selected=dialog.querySelector('[data-bot-variable]')?.value;if(selected)flow.draft.invitation+=` ${selected}`}
    if(action==='invite-template'){flow.draft.invitation=b.dataset.template==='hh'?'Здравствуйте! Вы откликнулись на вакансию {{ВАКАНСИЯ}}. Для знакомства с командой ответьте на {{КОЛВО_ВОПРОСОВ}} вопросов: {{ССЫЛКА_НА_ИНТЕРВЬЮ}}':'Здравствуйте! Приглашаем вас на короткое интервью по вакансии {{ВАКАНСИЯ}}. В интервью {{КОЛВО_ВОПРОСОВ}} вопросов. Ссылка: {{ССЫЛКА_НА_ИНТЕРВЬЮ}}';notify('Выбран демонстрационный шаблон приглашения')}
    if(action==='close-overlay'){flow.overlay='';flow.rule=null;render();return}
    if(action==='catalog'){flow.overlay='catalog';flow.rule=null;flow.catalogGroup=b.dataset.group!=='desired'}
    if(action==='catalog-group'){flow.catalogGroup=b.dataset.group==='required';if(flow.rule){flow.rule.required=flow.catalogGroup;if(!flow.catalogGroup)flow.rule.critical=false}}
    if(action==='row-menu')flow.rowMenu=flow.rowMenu===index?null:index;
    if(action==='change-group'){const r=flow.draft.criteria[index];r.required=!r.required;r.critical=false;flow.rowMenu=null}
    if(action==='pin'){const r=flow.draft.criteria[index];if(r.required)r.critical=!r.critical}
    if(action==='inline-decision'){const r=flow.draft.criteria[index];r.params[b.dataset.field]=r.params[b.dataset.field]==='одобрить'?'отклонить':'одобрить';r.title=window.NativeAiRequirements.summary(r)}
    if(action==='inline-place-add')flow.draft.criteria[index].params.years.push('1');
    if(action==='inline-place-remove'&&flow.draft.criteria[index].params.years.length>1)flow.draft.criteria[index].params.years.pop();
    if(action==='add-rule'){
      if(b.dataset.type==='text'){flow.draft.criteria.push({title:'',required:flow.catalogGroup,critical:false,type:'text'});flow.rule=null;flow.overlay='catalog'}
      else{const existing=flow.draft.criteria.findIndex(r=>r.type===b.dataset.type&&r.params);flow.ruleIndex=existing===-1?null:existing;flow.rule=existing===-1?window.NativeAiRequirements.create(b.dataset.type,b.dataset.label,flow.catalogGroup):clone(flow.draft.criteria[existing]);flow.overlay='catalog'}
    }
    if(action==='edit-rule'){flow.rule=clone(flow.draft.criteria[index]);flow.ruleIndex=index;flow.overlay='rule'}
    if(action==='rule-place-add')flow.rule.params.years.push('1');
    if(action==='rule-place-remove'&&flow.rule.params.years.length>1)flow.rule.params.years.splice(index,1);
    if(action==='rule-decision')flow.rule.params[b.dataset.field]=flow.rule.params[b.dataset.field]==='одобрить'?'отклонить':'одобрить';
    if(action==='rule-pin'&&flow.rule.required)flow.rule.critical=!flow.rule.critical;
    if(action==='rule-close')flow.rule=null;
    if(action==='rule-delete'){if(flow.ruleIndex!==null)flow.draft.criteria.splice(flow.ruleIndex,1);flow.rule=null}
    if(action==='rule-confirm'){
      flow.error=window.NativeAiRequirements.validate(flow.rule);
      if(!flow.error){flow.rule.title=window.NativeAiRequirements.summary(flow.rule);if(flow.ruleIndex===null)flow.draft.criteria.push(clone(flow.rule));else flow.draft.criteria[flow.ruleIndex]=clone(flow.rule);flow.overlay=flow.overlay==='catalog'?'catalog':'';flow.rule=null}
    }
    if(action==='add-requirement')flow.draft[list].push({title:'',condition:'Подходит если'});
    if(action==='remove'){if(list==='voiceQuestions')flow.draft.deletedQuestions.push(clone(flow.draft[list][index]));flow.draft[list].splice(index,1)}
    if(action==='deleted')flow.overlay='deleted';
    if(action==='restore'){flow.draft.voiceQuestions.push(flow.draft.deletedQuestions.splice(index,1)[0]);flow.overlay=''}
    if(action==='up'||action==='down'){move(list,index,action==='up'?-1:1);flow.rowMenu=null}
    if(action==='generate'){
      const items=generatedCriteria();if(!items.length)flow.error='В описании вакансии пока нет требований. Добавьте их вручную.';
      else for(const item of items)if(!flow.draft[list].some(v=>v.title.toLowerCase()===item.title.toLowerCase()))flow.draft[list].push(list==='criteria'?{...item,origin:'ai'}:{title:item.title,condition:'Подходит если'});
      if(items.length)notify('Пример требований подготовлен из описания — проверьте формулировки');
    }
    if(action==='correct'){flow.draft.criteria[index].title=flow.draft.criteria[index].title.trim().replace(/^•\s*/,'').replace(/;\s*$/,'');notify('В макете убраны лишние пробелы; AI-корректировка потребует движка Джуна')}
    if(action==='templates'){flow.overlay='templates';flow.selectedTemplate=null;flow.templateReplace=true}
    if(action==='template-preview')flow.selectedTemplate=index;
    if(action==='template-save'){if(!validRequirements('criteria')){render();return}flow.overlay='template-name'}
    if(action==='template-confirm'){const name=dialog.querySelector('[data-template-name]').value.trim();if(!name)flow.error='Укажите название шаблона.';else{templates.push({name,criteria:clone(flow.draft.criteria)});flow.overlay='';notify('Шаблон сохранён в памяти макета')}}
    if(action==='template-use'){const t=templates[flow.selectedTemplate];if(!t)return;flow.draft.criteria=flow.templateReplace?clone(t.criteria):[...flow.draft.criteria,...clone(t.criteria)];flow.overlay=''}
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
      if(!req.length)flow.error='Сначала добавьте требования или заполните описание вакансии.';else notify('Подготовлены демонстрационные вопросы, без обращения к AI');
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
    if(action==='back'){flow.step=Math.max(0,flow.step-1);flow.resetScroll=true}
    if(action==='next'){next();return}
    render();
  }
  function validRequirements(list){
    if(!flow.draft[list].length){flow.error='Добавьте требования вручную или перенесите из описания вакансии.';return false}
    if(flow.draft[list].some(v=>!v.title.trim()||/:\s*$/.test(v.title))){flow.error='Заполните требования или удалите пустые строки.';return false}
    for(const r of flow.draft[list])if(r.params){const error=window.NativeAiRequirements.validate(r);if(error){flow.error=error;return false}}return true;
  }
  const answerDurations=['1','1.5','2','2.5','3','3.5','4','5'];
  const noReplyPeriods=['0.041666667','0.083333333','1','2','3','5','7','14','30'];
  const positiveInteger=(value,max=10000)=>Number.isFinite(Number(value))&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=max;
  function validateBot(){
    const d=flow.draft;
    if(!d.channels.chat&&!d.channels.av)return 'Выберите чат-бота, аудио/видео или оба формата.';
    if(!positiveInteger(d.botThreshold,10))return 'Проходной балл должен быть целым числом от 1 до 10.';
    if(d.channels.chat){
      if(!validRequirements('chatRequirements'))return flow.error;
      if(d.resumeRequirements.some(r=>!r.title.trim()))return 'Заполните требования для скоринга резюме или удалите пустые строки.';
      if(d.fixedQuestions.some(q=>!q.text.trim()))return 'Заполните фиксированные вопросы или удалите пустые строки.';
      if(!['begin','end'].includes(d.fixedQuestionPosition))return 'Выберите начало или конец интервью для фиксированных вопросов.';
      if(!['Человек','ИИ'].includes(d.presentsAs)||!['Мужской','Женский'].includes(d.botGender)||!['На вы','На ты'].includes(d.tone))return 'Проверьте основные настройки чат-бота.';
      if(d.dialogPing&&!positiveInteger(d.pingHours))return 'Срок напоминания должен быть целым числом от 1 до 10 000 часов.';
    }
    if(d.channels.av){
      if(!d.voiceQuestions.length)return 'Добавьте хотя бы один вопрос для аудио/видео-интервью.';
      if(d.voiceQuestions.some(q=>!q.text.trim()))return 'Заполните вопросы для интервью или удалите пустые строки.';
      if(!answerDurations.includes(String(d.answerMinutes)))return 'Выберите время на ответ из списка от 1 до 5 минут.';
      if(d.voiceQuestions.some(q=>q.type==='english'&&q.preset&&!Object.hasOwn(englishPresets,q.preset)))return 'Выберите английский вопрос из списка или введите свой текст.';
    }
    if(d.faq.some(q=>!q.question.trim()||!q.answer.trim()))return 'Для базы знаний нужны и вопрос, и ответ.';
    if(d.autoInvite){
      if(!d.invitation.trim()||(String(d.dailyLimit).trim()&&!positiveInteger(d.dailyLimit)))return 'Заполните приглашение; лимит — целое число от 1 до 10 000 или пустое поле без лимита.';
      if(!['real','schedule'].includes(d.inviteMode))return 'Выберите режим отправки приглашений.';
      if(d.inviteMode==='schedule'&&(!d.inviteTimes.length||d.inviteTimes.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))))return 'Укажите корректное время отправки приглашений.';
      if(!flow.context.stages?.includes(d.inviteStage))return 'Выберите существующий этап для отправки приглашений.';
      if(d.followups.some(q=>!positiveInteger(q.hours)||!q.text.trim()))return 'У каждого повторного письма нужны текст и целый срок от 1 до 10 000 часов.';
    }
    if(d.noReplyEnabled&&!noReplyPeriods.includes(String(d.noReplyDays)))return 'Выберите период отсутствия ответа из списка.';
    if(flow.pendingUploads)return 'Дождитесь завершения загрузки выбранного файла.';
    return '';
  }
  function saveBot(){flow.error=validateBot();if(flow.error){flow.resetScroll=true;render();return}finish()}
  function next(){
    if(flow.view==='criteria'){
      if(!validRequirements('criteria')){render();return}
      if(flow.draft.refusalMode==='required'&&!flow.draft.criteria.some(r=>r.required))flow.error='Для этого режима нужно хотя бы одно обязательное требование.';
      if(flow.draft.parseTimes.some(v=>!v))flow.error='Укажите время разбора или удалите пустой интервал.';
      if(!flow.error)finish();else render();return;
    }
    if(flow.step===0){
      if(!flow.draft.channels.chat&&!flow.draft.channels.av){flow.error='Выберите чат-бота, аудио/видео или оба формата.';render();return}
      flow.step=1;flow.botMode=flow.draft.channels.chat?'chat':'av';flow.resetScroll=true;render();return;
    }
    saveBot();
  }
  function finish(){saved[key(flow.context)]={...clone(flow.draft),enabled:true};dialog.close();onUpdate();notify(`${names[flow.kind]}: настройки сохранены, включено`)}
  function orderButtons(list,i){const indices=neighbours(list,i);return `<div class="ve68-native-order">${icon('↑','up',`data-list="${list}" data-index="${i}" aria-label="Поднять строку ${i+1}" ${i===indices[0]?'disabled':''}`)}${icon('↓','down',`data-list="${list}" data-index="${i}" aria-label="Опустить строку ${i+1}" ${i===indices[indices.length-1]?'disabled':''}`)}</div>`}
  function requirementRows(list,required){
    const joon=list==='criteria';
    if(joon)return joonRows(required);
    return `<div class="ve68-native-requirements">${flow.draft[list].map((r,i)=>joon&&r.required!==required?'':`<div class="ve68-native-requirement" data-requirement="${i}" data-list="${list}">${orderButtons(list,i)}<div class="ve68-native-requirement-content">${!joon?`<select data-condition aria-label="Условие требования ${i+1}">${opt(['Подходит если','Не подходит если'],r.condition)}</select>`:''}${r.params?`<p class="ve68-native-rule-summary">${esc(r.title)}</p>${btn('Параметры','edit-rule',`data-index="${i}"`,'small')}`:`<textarea data-title rows="2" aria-label="Требование ${i+1}" placeholder="Сформулируйте требование к опыту или навыкам">${esc(r.title)}</textarea>`}${joon?`<div class="ve68-native-requirement-tools"><select data-group data-refresh aria-label="Обязательность требования ${i+1}">${opt([['required','Обязательное'],['desired','Желательное']],r.required?'required':'desired')}</select><label class="ve68-native-critical"><input type="checkbox" data-critical ${r.critical?'checked':''} ${!r.required?'disabled':''}>Критичное <span title="Несоответствие критичному обязательному требованию означает, что кандидат не подходит.">ⓘ</span></label>${!r.params?btn('✦ Скорректировать','correct',`data-index="${i}"`,'small'):''}</div>`:''}</div>${icon('×','remove',`data-list="${list}" data-index="${i}" aria-label="Удалить требование ${i+1}"`)}</div>`).join('')||'<p class="ve68-native-empty">Требований пока нет</p>'}</div>`;
  }
  const joonIcon=name=>window.NativeAiRequirements.icons[name];
  const joonButton=(name,label,action,attrs='',style='')=>`<button type="button" class="joon-btn ${style}" data-ai-config-action="${action}" ${attrs}>${joonIcon(name)}<span>${label}</span></button>`;
  function joonRows(required){
    return `<div class="joon-requirements-list" role="list" aria-label="${required?'Обязательные':'Желательные'} требования">${flow.draft.criteria.map((r,i)=>{
      if(r.required!==required)return '';const origin=r.params?window.NativeAiRequirements.symbols[r.type]:joonIcon(r.origin==='ai'?'ai':'plain');
      const content=r.params?window.NativeAiRequirements.inline(r,i):`<div class="joon-text-line"><input data-title aria-label="Требование ${i+1}" placeholder="впишите требование…" value="${esc(r.title)}">${joonButton('ai','скорректировать','correct',`data-index="${i}" title="AI перепишет формулировку требования. В макете — демонстрационная корректировка."`,'joon-refine')}</div>`;
      return `<div class="joon-requirement" role="listitem" data-requirement="${i}" data-list="criteria"><div class="joon-grip-wrap"><button type="button" class="joon-grip" draggable="true" data-ai-config-action="row-menu" data-index="${i}" aria-label="Переместить требование ${i+1}" aria-expanded="${flow.rowMenu===i}" title="Перетащите, чтобы изменить порядок или перенести в другую группу">${joonIcon('grip')}</button>${flow.rowMenu===i?`<div class="joon-row-menu" role="group" aria-label="Порядок требования">${orderButtons('criteria',i)}${btn(required?'В желательные':'В обязательные','change-group',`data-index="${i}"`)}</div>`:''}</div><span class="joon-origin ${r.origin==='ai'?'ai':''}" aria-label="${r.params?'Готовое условие':r.origin==='ai'?'Из описания вакансии':'Своё требование'}">${origin}</span><div class="joon-requirement-content">${content}</div><button type="button" class="joon-pin" data-ai-config-action="pin" data-index="${i}" aria-label="Критичное требование ${i+1}" aria-pressed="${!!r.critical}" ${required?'':'disabled'} title="${required?'Критичное: несоответствие сразу означает отрицательный результат':'Критичность доступна только обязательным требованиям'}">${joonIcon('pin')}</button><button type="button" class="joon-delete" data-ai-config-action="remove" data-list="criteria" data-index="${i}" aria-label="Удалить требование ${i+1}">${joonIcon('trash')}</button></div>`;
    }).join('')||'<p class="joon-empty">Требований пока нет. Добавьте своё или перенесите из вакансии.</p>'}</div>`;
  }
  function times(list){return `<div class="ve68-native-times">${flow.draft[list].map((t,i)=>`<label>Время <input type="time" data-time-list="${list}" aria-label="Время ${i+1}" value="${esc(t)}">${icon('×','remove',`data-list="${list}" data-index="${i}" aria-label="Удалить время ${i+1}"`)}</label>`).join('')}${btn('+ Ещё одно время','time-add',`data-list="${list}"`)}</div>`}
  function threshold(){return `<div class="ve68-native-score" role="group" aria-label="Проходной балл">${Array.from({length:10},(_,i)=>btn(i+1,'score',`data-index="${i+1}" aria-label="Проходной балл ${i+1}" aria-pressed="${Number(flow.draft.botThreshold)===i+1}"`,Number(flow.draft.botThreshold)<=i+1?'selected':'')).join('')}</div><p class="sobesso-score-help">Кандидат проходит при оценке <b>${esc(flow.draft.botThreshold)}–10</b>. Оценка сама не отправляет отказ — исходы настраиваются в автоматизациях этапа.</p>`}
  function criteriaBody(){
    const d=flow.draft;
    const group=(required,title,help)=>`<section class="joon-group" data-joon-group="${required?'required':'desired'}"><h4>${title}</h4><p class="joon-help">${help}</p>${joonRows(required)}</section>`;
    return `<section class="joon-requirements-card"><header class="joon-requirements-head"><h3>Требования</h3><div class="joon-requirements-actions">${joonButton('plus','Добавить требование','catalog','','add')}${joonButton('transfer','перенести из вакансии','generate','data-list="criteria"')}${joonButton('layers','выбрать шаблон','templates')}${joonButton('save','сохранить в шаблон','template-save')}</div></header>${group(true,'Обязательные','Каждое совпадение заметно повышает оценку кандидата — эти требования весят больше всего. Отметьте требование <b>критичным</b> (булавкой) — тогда несоответствие сразу отклоняет кандидата.')}${group(false,'Желательные','Совпадение добавляет к оценке, но с меньшим весом. Не отсеивают, а помогают ранжировать кандидатов.')}</section><section class="joon-settings-card"><p class="joon-eyebrow">Автоматизация разбора</p><h3>Общие настройки</h3><h4>В каком случае отказывать кандидату</h4><div class="ve68-native-radio"><label><input type="radio" name="refusal-mode" data-bind="refusalMode" data-refresh value="required" ${d.refusalMode==='required'?'checked':''}>По обязательным требованиям</label><label><input type="radio" name="refusal-mode" data-bind="refusalMode" data-refresh value="score" ${d.refusalMode==='score'?'checked':''}>По проходному баллу</label></div>${d.refusalMode==='score'?`<p class="joon-help">Отказ уходит, если итоговая оценка кандидата ниже выбранного балла. Обязательные требования дают 80% оценки, желательные — 20%.</p><label class="ve68-config-field joon-threshold">Проходной балл<input type="range" min="1" max="10" step="1" data-bind="threshold" data-refresh value="${esc(d.threshold)}"><b>${esc(d.threshold)} / 10</b></label>`:''}${flow.kind==='response'?`<h4>Автоматический разбор откликов с вакансии</h4>${times('parseTimes')}`:''}</section><p class="joon-demo-note">Демонстрационный макет: генерация, справочники и шаблоны локальные. Движок Джуна не подключён. Оценка сама не отправляет отказ — действия настраиваются в автоматизациях этапа.</p>`;
  }
  function choice(){const s=responseSettings(),available=!!s?.criteria?.length;return `<p class="ve68-config-intro">Как AI должен разбирать резюме на этапе скоринга?</p><div class="ve68-config-choices"><button class="ve68-config-choice" data-ai-config-action="reuse" ${available?'':'disabled'}><b>Разбирать по тем же критериям, что и отклики</b><span>${available?`${s.criteria.length} требований, режим оценки и проходной балл из авторазбора откликов`:'Сначала сохраните требования в модуле «Авторазбор откликов».'}</span></button><button class="ve68-config-choice" data-ai-config-action="custom"><b>Настроить</b><span>Собственные обязательные и желательные требования.</span></button></div>`}
  const englishPresets={self:'Tell me about yourself',project:'Describe your current project',goals:'Career goals and motivations',challenge:'Challenging technical situation'};
  const sobessoVariables=[['{{ВАКАНСИЯ}}','Название вакансии'],['{{КОЛВО_ВОПРОСОВ}}','Количество вопросов'],['{{ССЫЛКА_НА_ИНТЕРВЬЮ}}','Ссылка на интервью']];
  const sobessoAudioFiles={'sobesso-question-demo.wav':'assets/audio/sobesso-question-demo.wav?public=f2c17c90dc93','english-demo.wav':'assets/audio/english-demo.wav?public=f86c3ef63775','welcome-demo.wav':'assets/audio/welcome-demo.wav?public=95a7bb487785'};
  const trashSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const botTrash=(list,index,label)=>`<button type="button" class="ve68-config-icon sobesso-trash" data-ai-config-action="remove" data-list="${list}" data-index="${index}" aria-label="${esc(label)}">${trashSvg}</button>`;
  const botGrip=(list,index)=>`<span class="sobesso-grip" draggable="true" data-bot-drag-list="${list}" data-index="${index}" title="Перетащить строку" aria-hidden="true">⠿</span>`;
  function botSection(id,title,body,help=''){
    return `<details class="ve68-native-section sobesso-section" data-sobesso-section="${id}" ${flow.sections[id]===false?'':'open'}><summary><h3>${title}</h3><span class="sobesso-chevron" aria-hidden="true"></span></summary><div class="sobesso-section-body">${help?`<p class="ve68-native-help">${help}</p>`:''}${body}</div></details>`;
  }
  function botSwitch(path,label,disabled=false,hint=''){
    return `<label class="sobesso-switch-row ${disabled?'is-disabled':''}"><span>${esc(label)}${hint?`<small>${esc(hint)}</small>`:''}</span><input type="checkbox" role="switch" data-bind="${path}" data-refresh ${at(flow.draft,path)?'checked':''} ${disabled?'disabled':''}><span class="sobesso-switch" aria-hidden="true"></span></label>`;
  }
  function botSegments(path,label,values){
    return `<div class="sobesso-segment-field"><span>${esc(label)}</span><div class="sobesso-segments" role="group" aria-label="${esc(label)}">${values.map(value=>btn(esc(value),'bot-segment',`data-field="${path}" data-value="${esc(value)}" aria-pressed="${at(flow.draft,path)===value}"`,at(flow.draft,path)===value?'selected':'')).join('')}</div></div>`;
  }
  function botRequirements(list){
    return `<div class="sobesso-requirements">${flow.draft[list].map((r,i)=>`<div class="sobesso-requirement" data-requirement="${i}" data-list="${list}">${botGrip(list,i)}<div class="sobesso-requirement-main"><select data-condition aria-label="Условие требования ${i+1}">${opt(['Подходит если','Не подходит если'],r.condition)}</select><textarea data-title rows="2" aria-label="Требование ${i+1}" placeholder="Опишите требование к опыту или навыкам">${esc(r.title)}</textarea></div>${orderButtons(list,i)}${botTrash(list,i,`Удалить требование ${i+1}`)}</div>`).join('')||'<p class="sobesso-empty">Добавьте требования вручную или сгенерируйте их из описания вакансии.</p>'}</div><div class="ve68-native-toolbar">${btn('+ Добавить требование','add-requirement',`data-list="${list}"`)}${btn('✦ Сгенерировать','generate',`data-list="${list}"`,'purple')}</div>`;
  }
  function botChatRequirements(){
    return botSection('requirements','Требования',`<h4>Требования для интервью</h4><p class="ve68-native-help">По этим требованиям кандидату будут заданы вопросы.</p>${botRequirements('chatRequirements')}<div class="sobesso-divider"></div><h4>Требования для скоринга резюме</h4><p class="ve68-native-help">По этим требованиям вопрос не задаётся — оценивается только резюме.</p>${botRequirements('resumeRequirements')}`);
  }
  function botAudio(id,file,label){
    const source=sobessoAudioFiles[file];
    return `<div class="sobesso-audio"><audio id="${id}" controls preload="metadata" src="${source}" aria-label="${esc(label)}"></audio><label class="sobesso-speed">Скорость<select data-audio-rate="${id}" aria-label="Скорость: ${esc(label)}">${opt([['0.75','0,75×'],['1','1×'],['1.25','1,25×'],['1.5','1,5×'],['2','2×']],'1')}</select></label><a class="sobesso-audio-download" href="${source}" download aria-label="Скачать демонстрационную озвучку">↓</a></div><p class="sobesso-demo-small">Демонстрационная запись. Она не озвучивает введённый вами текст; движок Собесо не подключён.</p>`;
  }
  function botQuestions(list){
    const voice=list==='voiceQuestions';
    const top=voice?`<div class="ve68-native-toolbar sobesso-top-tools">${btn('+ Обычный вопрос','question-add',`data-list="${list}"`)}${btn('+ Вопрос на знание английского 🇬🇧','question-add',`data-list="${list}" data-type="english"`)}${btn('✦ Перегенерировать вопросы','questions-generate',`data-list="${list}"`,'purple')}${btn('Показать удалённые вопросы','deleted')}</div>`:field('fixedQuestionPosition','Задать фиксированные вопросы в','select',[['begin','начале интервью'],['end','конце интервью']]);
    const rows=flow.draft[list].map((q,i)=>{
      const english=q.type==='english';
      const image=voice?`<div class="sobesso-image-upload">${q.image?`<img class="ve68-native-question-image" src="${esc(q.image)}" alt="Изображение к вопросу ${i+1}">${btn('Удалить изображение','image-remove',`data-index="${i}"`,'small')}`:''}<label class="ve68-native-upload">${q.image?'Заменить изображение':'+ Загрузить изображение'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-image="${i}" aria-label="Изображение к вопросу ${i+1}"></label><small>PNG, JPEG, WebP или GIF · до 5 МБ · только в этом макете</small></div>`:'';
      const preset=english?`<label class="ve68-config-field">Выберите заготовленный вопрос<select data-english-preset="${i}">${opt([['','Свой вопрос'],...Object.entries(englishPresets)],q.preset||'')}</select></label>`:'';
      const speech=voice&&!english?`<label class="ve68-config-field">Текст для озвучки <span>Необязательно. Можно уточнить произношение и обозначить ударения.</span><textarea data-prop="speechText" rows="2" placeholder="Если оставить пустым — используется текст вопроса">${esc(q.speechText||'')}</textarea></label>`:'';
      const answer=!english?`<label class="ve68-config-field">${voice?'Правильный ответ или подсказка для оценки':'Ожидаемый ответ (необязательно)'}<textarea rows="3" data-prop="answer" placeholder="${voice?'Опишите признаки хорошего и слабого ответа':'Без ожидаемого ответа вопрос не влияет на итоговую оценку'}">${esc(q.answer)}</textarea></label>${voice?`<div class="ve68-native-toolbar">${btn('✦ Сгенерировать вопрос и ответ','question-generate',`data-list="${list}" data-index="${i}"`,'purple')}${btn('✦ Сгенерировать ответ','answer-generate',`data-list="${list}" data-index="${i}"`)}</div>`:`<p class="sobesso-score-status" data-fixed-score>${q.answer?.trim()?'Повлияет':'Не повлияет'} на итоговую оценку</p>`}`:'';
      return `<article class="ve68-native-question sobesso-question" data-question-row="${i}" data-list="${list}"><div class="ve68-native-question-head">${botGrip(list,i)}<b>${i+1}/${flow.draft[list].length}${english?' · Вопрос на знание английского 🇬🇧':''}</b>${orderButtons(list,i)}${botTrash(list,i,`Удалить вопрос ${i+1}`)}</div>${image}${preset}<label class="ve68-config-field">Текст вопроса<textarea data-prop="text" rows="3" placeholder="Что вы хотите спросить у кандидата?">${esc(q.text)}</textarea></label>${voice?botAudio(`sobesso-question-audio-${i}`,english?'english-demo.wav':'sobesso-question-demo.wav',`Озвучка вопроса ${i+1}`):''}${speech}${answer}</article>`;
    }).join('');
    const bottom=voice?'':`<div class="ve68-native-toolbar">${btn('+ Добавить вопрос','question-add',`data-list="${list}"`)}${btn('✦ Из требований','questions-generate',`data-list="${list}"`,'purple')}</div>`;
    return top+`<div class="ve68-native-questions">${rows||'<p class="sobesso-empty">Вопросов пока нет. Добавьте вопрос или подготовьте примеры по требованиям вакансии.</p>'}</div>`+bottom;
  }
  function botFaq(){
    const content=`<div class="sobesso-info-strip"><span aria-hidden="true">ⓘ</span><p>После интервью кандидат может задать вопросы. Бот ищет ответы в базе знаний, в том числе в этих вопросах и ответах.${btn('Подробнее о базе знаний','knowledge','','small')}</p></div><div class="ve68-native-toolbar">${btn('✦ Сгенерировать','faq-generate','','purple')}${btn('+ Добавить вопрос','faq-add')}</div><div class="ve68-native-questions">${flow.draft.faq.map((q,i)=>`<article class="ve68-native-question sobesso-question" data-faq-row="${i}"><div class="ve68-native-question-head"><b>Вопрос ${i+1}</b>${botTrash('faq',i,`Удалить вопрос базы знаний ${i+1}`)}</div><label class="ve68-config-field">Вопрос кандидата<textarea rows="2" data-faq-question>${esc(q.question)}</textarea></label><label class="ve68-config-field">Ответ<textarea rows="3" data-faq-answer>${esc(q.answer)}</textarea></label></article>`).join('')}</div>`;
    return botSection('faq','Часто задаваемые вопросы о вакансии',content);
  }
  function botChatSettings(){
    return botSection('chat-settings','Основные настройки',`<h4>Проходной балл</h4>${threshold()}${botSegments('presentsAs','Бот представляется кандидату как',['Человек','ИИ'])}${field('botName','Имя бота (опционально)')}<div class="sobesso-setting-grid">${botSegments('botGender','Пол бота',['Мужской','Женский'])}${botSegments('tone','Тон общения',['На вы','На ты'])}</div>${botSwitch('allowRecruiter','Разрешить кандидату звать рекрутера')}`);
  }
  function botAvSettings(){
    return botSection('av-settings','Настройки интервью',`<h4>Проходной балл</h4>${threshold()}${field('answerMinutes','Время на один ответ','select',[['1','1 минута'],['1.5','1 минута 30 секунд'],['2','2 минуты'],['2.5','2 минуты 30 секунд'],['3','3 минуты'],['3.5','3 минуты 30 секунд'],['4','4 минуты'],['5','5 минут']])}${botSwitch('saveAudio','Сохранять аудиозапись ответа')}${botSwitch('saveVideo','Сохранять видеозапись ответа')}${botSwitch('skipVideo','Разрешить кандидату пропустить запись видео',!flow.draft.saveVideo,!flow.draft.saveVideo?'Доступно при включённой видеозаписи':'')}${botSwitch('publicLink','Публичная ссылка — самостоятельная регистрация кандидатов')}${botSwitch('confirmEmail','Подтверждение email при регистрации')}${botSwitch('requestPhone','Запрашивать телефон кандидата')}`);
  }
  function botInvitations(){
    const d=flow.draft;
    const limit=`<label class="ve68-config-field">Максимум диалогов в день<input type="number" min="1" max="10000" placeholder="Безлимита" data-bind="dailyLimit" value="${esc(d.dailyLimit)}"></label>`;
    const templates=`<div class="sobesso-message-tools"><details class="sobesso-template-menu"><summary>Шаблоны Собесо <span aria-hidden="true">⌄</span></summary><div>${btn('Приглашение на интервью','invite-template','data-template="sobesso"')}</div></details><details class="sobesso-template-menu"><summary>Шаблоны hh.ru <span aria-hidden="true">⌄</span></summary><div>${btn('Ответ на отклик','invite-template','data-template="hh"')}</div></details><label class="sobesso-variable">Переменная<select data-bot-variable aria-label="Переменная сообщения">${opt(sobessoVariables,sobessoVariables[0][0])}</select></label>${btn('Вставить','insert-variable','','small')}</div>`;
    const followups=d.followups.map((r,i)=>`<article class="ve68-native-question sobesso-question" data-followup="${i}"><div class="ve68-native-question-head"><b>Если не начнёт интервью — письмо ${i+1}</b>${botTrash('followups',i,`Удалить повторное письмо ${i+1}`)}</div><label class="ve68-config-field">Отправить через (часов)<input type="number" min="1" max="10000" value="${esc(r.hours)}"></label><label class="ve68-config-field">Текст письма<textarea rows="3">${esc(r.text)}</textarea></label></article>`).join('');
    return botSection('invitations','Автоматическая отправка приглашения на интервью',`${botSwitch('autoInvite','Включить автоотправку')}<p class="sobesso-demo-small">${d.autoInvite?'Настройки будут применены только после сохранения. Макет не отправляет сообщения.':'Автоотправка отключена. Можно заранее подготовить настройки и текст.'}</p><div class="sobesso-setting-grid">${field('inviteMode','Режим отправки','select',[['real','В реальном времени (каждые 5 мин)'],['schedule','Раз в день']])}${limit}</div>${d.inviteMode==='schedule'?`<div class="sobesso-schedule">${(d.inviteTimes.length?d.inviteTimes:['09:00']).map((time,i)=>`<label class="ve68-config-field">Время отправки ${i+1}<input type="time" data-time-list="inviteTimes" aria-label="Время отправки приглашений ${i+1}" value="${esc(time)}"></label>`).join('')}</div>`:''}<h4>Дни недели для отправки</h4><div class="ve68-native-days">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(day=>`<label><input type="checkbox" data-day value="${day}" ${d.days.includes(day)?'checked':''}><span>${day}</span></label>`).join('')}</div><p class="ve68-native-help">Пустой выбор — любой день недели.</p>${field('inviteStage','Кандидатам с этого этапа отправлять приглашения','select',flow.context.stages||['Отклик','Новый Кандидат','Скоринг','Чат-бот'])}<h4>Шаблон сообщения</h4>${templates}${field('invitation','Текст приглашения','textarea')}<div class="ve68-native-questions">${followups}</div>${btn('+ Если не начнёт интервью, отправить ещё одно письмо','followup-add')}`);
  }
  function botPings(){
    return botSection('pings','Пинги кандидатам во время диалога',`${botSwitch('dialogPing','Отправлять напоминание')}${field('pingHours','Если кандидат не отвечает (часов)','number')}`,'Напоминание внутри начавшегося чата, отдельно от повторного приглашения.');
  }
  function botNoReply(){
    return botSection('no-reply','Перевести в статус «Провал»',`${botSwitch('noReplyEnabled','Включить правило для отсутствия ответа')}${field('noReplyDays','Если кандидат не отвечает дольше','select',[['0.041666667','1 часа'],['0.083333333','2 часов'],['1','1 дня'],['2','2 дней'],['3','3 дней'],['5','5 дней'],['7','1 недели'],['14','2 недель'],['30','1 месяца']])}`,'Отключено по умолчанию. Ручное решение рекрутера имеет приоритет; переходы после интервью настраиваются в автоматизациях этапа.');
  }
  function botBranding(){
    const d=flow.draft;
    return botSection('branding','Брендирование',`${field('welcome','Приветственное сообщение','textarea')}${botAudio('sobesso-welcome-audio','welcome-demo.wav','Озвучка приветствия')}<p class="ve68-native-help">В Собесо новая озвучка появляется через несколько минут после сохранения. В этом макете воспроизводится только демонстрационный пример.</p><div class="sobesso-info-strip"><span aria-hidden="true">ⓘ</span><p>Можно добавить видео-кружок с приветствием, например подготовленный в Telegram. Файл останется только в памяти этой страницы.</p></div>${d.welcomeVideoData?`<video class="sobesso-welcome-video" src="${esc(d.welcomeVideoData)}" controls playsinline aria-label="Предпросмотр видео-приветствия"></video>`:''}${d.welcomeVideo?`<p class="sobesso-file-name">${esc(d.welcomeVideo)}${btn('Удалить видео','welcome-video-remove','','small')}</p>`:''}<label class="ve68-native-upload">${d.welcomeVideo?'Заменить видео-кружок':'+ Загрузить видео-кружок'}<input type="file" accept="video/mp4,video/webm,video/quicktime" data-welcome-video aria-label="Видео-кружок приветствия"></label><p class="sobesso-demo-small">MP4, WebM или MOV · до 20 МБ. Просмотр зависит от поддерживаемых браузером форматов.</p>`);
  }
  function botBody(){
    const d=flow.draft;
    if(flow.step===0)return '<p class="ve68-config-intro">Выберите один или оба формата. Настройки каждого формата сохраняются независимо от открытой вкладки.</p><div class="ve68-config-choices">'+['chat','av'].map(c=>`<label class="ve68-config-channel"><input type="checkbox" data-bind="channels.${c}" ${d.channels[c]?'checked':''}><span><b>${c==='chat'?'Чат-бот':'Аудио/видео'}</b><small>${c==='chat'?'Диалог по требованиям, фиксированные вопросы и ответы о вакансии.':'Вопросы с изображениями, озвучкой и настройкой записи.'}</small></span></label>`).join('')+'</div>';
    const chat=flow.botMode==='chat',profile=window.Publications?.profile(flow.context.vacancyId),description=profile?.text||'Описание пока не заполнено. Его можно добавить в карточке вакансии.';
    const tabs=d.channels.chat&&d.channels.av?`<div class="sobesso-mode-tabs" role="tablist" aria-label="Формат интервью">${['chat','av'].map(mode=>`<button type="button" role="tab" aria-selected="${flow.botMode===mode}" class="${flow.botMode===mode?'selected':''}" data-ai-config-action="bot-mode" data-mode="${mode}">${mode==='chat'?'Чат-бот':'Аудио/видео'}</button>`).join('')}</div>`:`<span class="sobesso-mode-badge">${chat?'Чат-бот':'Аудио/видео'}</span>`;
    const intro=`<div class="sobesso-page-intro">${tabs}<span class="sobesso-draft-label">Черновик · сохранится после подтверждения</span></div>${botSection('description','Описание вакансии',`<p class="ve68-native-help">Описание берётся из текущей вакансии и используется при подготовке вопросов.</p><div class="sobesso-vacancy-description">${esc(description)}</div>`)} `;
    return intro+(chat?botChatRequirements()+botSection('fixed-questions','Фиксированные вопросы',botQuestions('fixedQuestions'),'Эти вопросы дополняют вопросы по требованиям. Без ожидаемого ответа вопрос не влияет на итоговую оценку.')+botFaq()+botChatSettings()+botInvitations()+botPings()+botNoReply():botAvSettings()+botInvitations()+botNoReply()+botSection('voice-questions','Вопросы для интервью',botQuestions('voiceQuestions'))+botFaq()+botBranding())+'<p class="sobesso-editor-note">Демонстрационный макет: генерация локальная, приглашения не отправляются, рабочие движки не подключены. Настройки сохраняются в памяти страницы.</p>';
  }
  function review(){const d=flow.draft,rows=[['Формат',[d.channels.chat?'Чат-бот':'',d.channels.av?'Аудио/видео':''].filter(Boolean).join(' + ')],['Требования для интервью',d.channels.chat?d.chatRequirements.length:'—'],['Требования для скоринга резюме',d.channels.chat?d.resumeRequirements.length:'—'],['Фиксированные вопросы',d.channels.chat?d.fixedQuestions.length:'—'],['Вопросы аудио/видео',d.channels.av?d.voiceQuestions.length:'—'],['База знаний',`${d.faq.length} вопросов`],['Проходной балл',`${d.botThreshold} из 10`],['Авто приглашения',d.autoInvite?'Включены':'Отключены'],['Напоминания о приглашении',d.followups.length],['Отсутствие ответа',d.noReplyEnabled?({0.041666667:'1 час',0.083333333:'2 часа',1:'1 день',2:'2 дня',3:'3 дня',5:'5 дней',7:'1 неделя',14:'2 недели',30:'1 месяц'}[d.noReplyDays]||`${d.noReplyDays} дней`):'Без автоматического провала']];return `<div class="ve68-config-review"><h3>Проверьте настройки перед включением</h3><dl>${rows.map(([label,v])=>`<div><dt>${label}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`}
  const catalog=[['Своё требование',[['text','Своё требование текстом']]],['Опыт и карьера',[['experience','Опыт работы'],['tenure','Не смотрим бегунов'],['gap','Перерыв в работе'],['companies-count','Кол-во мест работы'],['freelance','Фрилансеры'],['courses','После курсов']]],['Компании',[['industry','Отрасль'],['company','Компания']]],['Локация',[['country','Страна'],['city','Город'],['metro','Метро'],['timezone','Часовой пояс'],['work-format','Формат работы']]],['О кандидате',[['salary','Зарплата'],['age','Возраст'],['citizenship','Гражданство'],['education','Уровень образования'],['gender','Пол'],['photo','Фото кандидата'],['hh-test','hh-тест'],['hh-comments','Комментарии в hh'],['position','Желаемая должность']]]];
  function catalogEditor(){
    if(flow.overlay!=='catalog'||!flow.rule)return '';
    const r=flow.rule;
    return `<article class="joon-catalog-editor" role="group" aria-label="Параметры: ${esc(r.label)}"><header><h4><span aria-hidden="true">${window.NativeAiRequirements.symbols[r.type]}</span> ${esc(r.label)}</h4>${icon('×','rule-close','aria-label="Закрыть параметры требования"')}</header>${flow.error?`<p role="alert" class="ve68-config-error">${esc(flow.error)}</p>`:''}${window.NativeAiRequirements.inline(r,flow.ruleIndex??flow.draft.criteria.length,true)}<footer><button type="button" class="joon-catalog-critical ${r.critical?'active':''}" data-ai-config-action="rule-pin" aria-pressed="${r.critical}" ${r.required?'':'disabled'}>${joonIcon('pin')} критично</button>${flow.ruleIndex!==null?btn('убрать','rule-delete'):''}${btn('готово','rule-confirm','','primary')}</footer></article>`;
  }
  function overlay(){
    if(!flow.overlay)return '';let title='',body='';
    if(flow.overlay==='catalog'){title='добавить требование';body=`<div class="joon-catalog-target"><span>куда:</span>${btn('✳ обязательное','catalog-group','data-group="required"',flow.catalogGroup?'selected':'')}${btn('🔥 желательное','catalog-group','data-group="desired"',!flow.catalogGroup?'selected':'')}</div><div class="joon-catalog">${catalog.map(([group,items],g)=>`<section class="joon-catalog-group">${g?`<h4>${group}</h4>`:''}<div class="joon-catalog-grid">${items.map(([type,label])=>`<button type="button" class="joon-catalog-item ${type==='text'?'custom':''}" data-ai-config-action="add-rule" data-type="${type}" data-label="${esc(label)}"><span class="joon-origin">${window.NativeAiRequirements.symbols[type]}</span><span><b>${esc(label)}</b><small>${window.NativeAiRequirements.hints[type]}</small></span>${flow.draft.criteria.some(r=>r.type===type)&&type!=='text'?'<span class="joon-catalog-present">✓</span>':''}${type==='text'?'<span class="joon-catalog-present">→</span>':''}</button>`).join('')}</div></section>`).join('')}</div><div class="joon-catalog-footer"><small>Выберите требование — их можно добавить несколько подряд</small>${btn('готово','close-overlay','','primary')}</div>`}
    if(flow.overlay==='rule'){title=flow.rule.label;body=window.NativeAiRequirements.fields(flow.rule)+btn(flow.ruleIndex===null?'Добавить требование':'Сохранить параметры','rule-confirm','','primary')}
    if(flow.overlay==='templates'){title='Шаблоны требований';const t=templates[flow.selectedTemplate];body=`<p class="joon-help">Шаблон — сохранённый набор требований. При применении он заменяет требования вакансии или добавляется к ним — на выбор.</p><div class="joon-template-layout"><aside><h4>Локальные шаблоны</h4>${templates.map((t,i)=>`<button class="joon-template-item ${flow.selectedTemplate===i?'selected':''}" data-ai-config-action="template-preview" data-index="${i}"><b>${esc(t.name)}</b><small>требований: ${t.criteria.length} · обязательных: ${t.criteria.filter(r=>r.required).length}</small></button>`).join('')||'<p class="joon-help">Шаблонов пока нет. Сохраните набор требований кнопкой «сохранить в шаблон».</p>'}</aside><section>${t?`<h4>${esc(t.name)}</h4>${[true,false].map(required=>`<h5>${required?'Обязательные':'Желательные'}</h5>${t.criteria.filter(r=>r.required===required).map(r=>`<p class="joon-template-rule">${esc(r.title)}${r.critical?' · критичное':''}</p>`).join('')}`).join('')}`:'<p class="joon-help">Выберите шаблон слева, чтобы увидеть его требования</p>'}</section></div><div class="joon-template-footer"><label><input type="checkbox" data-template-replace ${flow.templateReplace?'checked':''}>заменить текущие требования вакансии</label>${btn('Закрыть','close-overlay')}${btn('Применить шаблон','template-use',t?'':'disabled')}</div>`}
    if(flow.overlay==='template-name'){title='Сохранить в шаблон';body=`<label class="ve68-config-field">Название шаблона<input data-template-name placeholder="Например: Android Senior"></label>${btn('Сохранить шаблон','template-confirm','','primary')}`}
    if(flow.overlay==='knowledge'){title='База знаний AI-бота';body='<p>Ответы о вакансии дополняют общие сведения о компании. Кандидат может задать вопросы после интервью.</p><p class="ve68-native-help">В макете редактируются вопросы и ответы этой вакансии. Общая база знаний компании сюда не копируется.</p>'}
    if(flow.overlay==='deleted'){title='Удалённые вопросы';body=flow.draft.deletedQuestions.length?flow.draft.deletedQuestions.map((q,i)=>`<section class="ve68-native-question"><p>${esc(q.text)||'Пустой вопрос'}</p>${btn('Восстановить','restore',`data-index="${i}"`)}</section>`).join(''):'<p>Удалённых вопросов нет.</p>'}
    if(flow.overlay==='bot-review'){title='Проверка настройки интервью';body=review()+`<p class="sobesso-demo-small">Подтверждение включает только локальный модуль макета; сообщения и реальные интервью не запускаются.</p><div class="ve68-native-toolbar">${btn('Вернуться к настройкам','close-overlay')}${btn('Сохранить и включить','bot-save','','primary')}</div>`}
    return `<div class="ve68-native-overlay ${flow.overlay==='catalog'?'joon-catalog-overlay':flow.overlay==='templates'?'joon-template-overlay':''}"><section role="dialog" aria-modal="true" aria-label="${title}"><header><h3>${title}</h3>${icon('×','close-overlay','aria-label="Закрыть дополнительное окно"')}</header>${flow.error&&!(flow.overlay==='catalog'&&flow.rule)?`<p role="alert" class="ve68-config-error">${esc(flow.error)}</p>`:''}${body}</section>${catalogEditor()}</div>`;
  }
  function render(){
    const bot=flow.view==='bot',choiceView=flow.view==='choice';
    const scrollTop=flow.resetScroll?0:dialog.querySelector('.ve68-config-body')?.scrollTop||0;
    const overlayScroll=dialog.querySelector('.ve68-native-overlay > section')?.scrollTop||0;flow.resetScroll=false;
    dialog.classList.toggle('ve68-joon-dialog',flow.view==='criteria');
    dialog.classList.toggle('ve68-sobesso-dialog',bot);
    dialog.innerHTML=`<header ${flow.overlay?'inert':''}><div><h2 id="ve68-config-title">${bot?(flow.step===0?'AI бот · формат общения':flow.botMode==='chat'?'Настройки чат-бота':'Настройки аудио/видео-интервью'):names[flow.kind]}</h2><p>${esc(flow.context.vacancyName)} · ${esc(flow.context.stage)}</p></div>${icon('×','cancel','aria-label="Закрыть настройку AI"')}</header><div class="ve68-config-body" ${flow.overlay?'inert':''}>${flow.error&&!flow.overlay?`<p class="ve68-config-error" role="alert">${esc(flow.error)}</p>`:''}${choiceView?choice():bot?botBody():criteriaBody()}</div><footer ${flow.overlay?'inert':''}>${btn('Отмена','cancel')}${bot&&flow.step>0?`<span class="sobesso-footer-spacer"></span>${btn('Изменить форматы','bot-format')}${btn('Проверить','bot-review')}`:''}${!choiceView?btn(bot&&flow.step===0?'Подтвердить выбор':'Сохранить и включить','next','','primary'):''}</footer>${overlay()}`;
    const body=dialog.querySelector('.ve68-config-body');if(body)body.scrollTop=scrollTop;
    if(flow.overlay){dialog.querySelector(flow.overlay==='catalog'&&flow.rule?'.joon-catalog-editor input, .joon-catalog-editor button':'.ve68-native-overlay input, .ve68-native-overlay button')?.focus({preventScroll:true});const pane=dialog.querySelector('.ve68-native-overlay > section');if(pane)pane.scrollTop=overlayScroll}
  }
  return {kind,names,isOn,toggle,open};
})();
