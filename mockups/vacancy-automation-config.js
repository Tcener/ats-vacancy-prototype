/* Конструктор дизайн-макета. Правила сохраняются в памяти, но не исполняются. */
window.VacancyAutomationConfig = (() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const saved={};
  const key=context=>`${context.vacancyId}:${context.funnelId}:${context.index}`;
  const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
  const model=window.VacancyAutomationModel;
  const triggers=model.triggers,targets=model.actions;
  // Вымышленные примеры справочников компании, без подключения к реальной ATS.
  const reasons=model.rejectionReasons;
  const taskTypes=['Связаться','Получить фидбек','Добавить X кандидатов','Назначить X интервью','Другая задача'];
  const assignees=['Рекрутер вакансии','Елена Крылова','Антон Беляев','Алексей Мельников','Ольга Селезнёва'];
  const mailTemplates={
    received:{name:'Отклик получен',subject:'Ваш отклик на {{вакансия}}',body:'Здравствуйте, {{имя}}! Спасибо за интерес к вакансии {{вакансия}}. Мы получили ваш отклик и скоро вернёмся с ответом.'},
    interview:{name:'Приглашение на интервью',subject:'Следующий этап по вакансии {{вакансия}}',body:'Здравствуйте, {{имя}}! Приглашаем вас на следующий этап. Пожалуйста, выберите удобное время по ссылке {{ссылка_на_встречу}}.'},
    status:{name:'Обратная связь по подбору',subject:'Новости по вакансии {{вакансия}}',body:'Здравствуйте, {{имя}}! Спасибо за общение с нашей командой. Мы готовы обсудить дальнейшие шаги по вакансии {{вакансия}}.'},
    nps:{name:'Оценка подбора · NPS',subject:'Как прошёл ваш опыт общения с нами?',body:'Здравствуйте, {{имя}}! Поделитесь впечатлениями о подборе по вакансии {{вакансия}}. Короткий опрос: {{ссылка_на_опрос}}.'},
    custom:{name:'Свой текст',subject:'',body:''}
  };
  let dialog,flow,onUpdate=()=>{};
  const defaultAction=model.defaultAction;
  const canUseAi=()=>['response','resume','bot'].includes(window.VacancyAiConfig.kind(flow.context.stage));
  const options=(values,current)=>values.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('');
  const input=(label,field,value,extra='')=>`<label class="ve68-config-field">${label}<input aria-label="${esc(label)}" data-auto-field="${field}" value="${esc(value)}" ${extra}></label>`;
  const select=(label,field,values,current)=>`<label class="ve68-config-field">${label}<select aria-label="${esc(label)}" data-auto-field="${field}">${options(values,current)}</select></label>`;
  const catalogSelect=(label,field,catalog,current,placeholder='',extra='')=>`<label class="ve68-config-field">${label}<select ${extra.includes('aria-label=')?'':`aria-label="${esc(label)}"`} data-auto-field="${field}" ${extra}>${placeholder?`<option value="" ${!current?'selected':''}>${esc(placeholder)}</option>`:''}${Object.entries(catalog).map(([id,text])=>`<option value="${id}" ${id===current?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
  const textarea=(label,field,value)=>`<label class="ve68-config-field full">${label}<textarea aria-label="${esc(label)}" rows="3" data-auto-field="${field}">${esc(value)}</textarea></label>`;
  function summary(context){
    const rules=saved[key(context)]||[],actions=rules.reduce((total,rule)=>total+rule.actions.length,0),active=rules.filter(rule=>rule.enabled).length;
    return {rules:rules.length,actions,active:active>0,label:`${actions} ${plural(actions,'действие','действия','действий')}`,rulesLabel:active?`${rules.length} ${plural(rules.length,'правило','правила','правил')}`:'Все правила на паузе'};
  }
  function init(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.id='vacancy-automation-dialog';dialog.className='ve68-config-dialog ve68-automation-dialog';dialog.setAttribute('aria-labelledby','ve68-auto-title');document.body.append(dialog);
    dialog.addEventListener('input',event=>{
      const actionNode=event.target.closest('[data-auto-action]'),ruleNode=event.target.closest('[data-auto-rule]');
      const action=actionNode&&flow.rules[Number(ruleNode.dataset.autoRule)]?.actions[Number(actionNode.dataset.autoAction)];
      const wasReady=action&&model.timingReady(action);
      capture();
      // Перерисовываем числовой ввод только при открытии/закрытии параметров, сохраняя фокус.
      if(event.target.dataset.autoField==='delayAmount'&&wasReady!==model.timingReady(action)){flow.errors=[];render(true)}
    });
    dialog.addEventListener('change',event=>{
      capture();const field=event.target.dataset.autoField;
      if(!event.target.dataset.autoMappingField&&!['trigger','type','timing','template','deadlineMode','deadlineAnchor','taskType','enabled','offerState','surveyTemplate','reasonMode','multipleReasons','reviewMode','reasonPreviewCase'].includes(field))return;
      flow.errors=[];
      if(['type','reasonMode'].includes(field)){
        const rule=flow.rules[Number(event.target.closest('[data-auto-rule]').dataset.autoRule)],action=rule.actions[Number(event.target.closest('[data-auto-action]').dataset.autoAction)];
        if(field==='type'&&action.type==='reject'&&!action.reasonModeInitialized){
          if(rule.trigger==='failed'&&!action.reason)action.reasonMode='ai';
          action.reasonModeInitialized=true;
        }
        if(field==='reasonMode')action.reasonModeInitialized=true;
      }
      if(field==='template'){
        const rule=flow.rules[Number(event.target.closest('[data-auto-rule]').dataset.autoRule)],action=rule.actions[Number(event.target.closest('[data-auto-action]').dataset.autoAction)],template=mailTemplates[action.template];
        action.subject=template.subject;action.body=template.body;
      }
      render(true);
    });
    dialog.addEventListener('click',event=>{
      const button=event.target.closest('[data-auto-command]');if(!button)return;
      const command=button.dataset.autoCommand;capture();flow.errors=[];
      if(command==='cancel'){dialog.close();return}
      if(command==='add-rule')flow.rules.push(model.defaultRule(flow.rules.length));
      if(command==='remove-rule')flow.rules.splice(Number(button.dataset.rule),1);
      if(command==='add-action')flow.rules[Number(button.dataset.rule)].actions.push(defaultAction());
      if(command==='remove-action')flow.rules[Number(button.dataset.rule)].actions.splice(Number(button.dataset.actionIndex),1);
      if(['add-mapping','remove-mapping','mapping-up','mapping-down'].includes(command)){
        const action=flow.rules[Number(button.dataset.rule)].actions[Number(button.dataset.actionIndex)],mappings=action.reasonMappings,index=Number(button.dataset.mappingIndex);
        if(command==='add-mapping'&&mappings.length<8)mappings.push({criterion:'',reason:''});
        if(command==='remove-mapping')mappings.splice(index,1);
        const destination=command==='mapping-up'?index-1:index+1;
        if(['mapping-up','mapping-down'].includes(command)&&destination>=0&&destination<mappings.length)[mappings[index],mappings[destination]]=[mappings[destination],mappings[index]];
      }
      if(command==='save'){
        if(!validate()){render();return}
        saved[key(flow.context)]=clone(flow.rules);dialog.close();onUpdate();
        const toast=document.querySelector('#toast');if(toast){toast.textContent='Автоматизации сохранены в макете';toast.hidden=false;clearTimeout(init.toastTimer);init.toastTimer=setTimeout(()=>toast.hidden=true,2600)}return;
      }
      render(true);
      if(command==='add-rule')dialog.querySelector('[data-auto-rule]:last-child [data-auto-field="name"]').focus();
      if(command==='add-action')dialog.querySelector(`[data-auto-rule="${button.dataset.rule}"] [data-auto-action]:last-child select`).focus();
      if(command==='add-mapping')dialog.querySelector(`[data-auto-rule="${button.dataset.rule}"] [data-auto-action="${button.dataset.actionIndex}"] [data-auto-mapping-index]:last-child select`)?.focus();
      if(['remove-mapping','mapping-up','mapping-down'].includes(command)){
        const action=flow.rules[Number(button.dataset.rule)].actions[Number(button.dataset.actionIndex)],oldIndex=Number(button.dataset.mappingIndex),newIndex=command==='mapping-up'?oldIndex-1:command==='mapping-down'?oldIndex+1:Math.min(oldIndex,action.reasonMappings.length-1);
        const row=dialog.querySelector(`[data-auto-rule="${button.dataset.rule}"] [data-auto-action="${button.dataset.actionIndex}"] [data-auto-mapping-index="${newIndex}"]`);
        (row?.querySelector('select')||dialog.querySelector(`[data-auto-rule="${button.dataset.rule}"] [data-auto-action="${button.dataset.actionIndex}"] [data-auto-command="add-mapping"]`))?.focus({preventScroll:true});
      }
    });
  }
  function open(context,update){init();onUpdate=update;flow={context,rules:model.normalizeRules(clone(saved[key(context)]||[])),errors:[]};render();if(!dialog.open)dialog.showModal()}
  function capture(){
    if(!flow)return;
    dialog.querySelectorAll('[data-auto-rule]').forEach(ruleNode=>{
      const rule=flow.rules[Number(ruleNode.dataset.autoRule)];if(!rule)return;
      ruleNode.querySelectorAll('[data-auto-field]').forEach(field=>{
        const actionNode=field.closest('[data-auto-action]'),target=actionNode?rule.actions[Number(actionNode.dataset.autoAction)]:rule;
        if(target)target[field.dataset.autoField]=field.type==='checkbox'?field.checked:field.value;
      });
      ruleNode.querySelectorAll('[data-auto-mapping-field]').forEach(field=>{
        const actionNode=field.closest('[data-auto-action]'),mappingNode=field.closest('[data-auto-mapping-index]'),mapping=rule.actions[Number(actionNode.dataset.autoAction)]?.reasonMappings[Number(mappingNode.dataset.autoMappingIndex)];
        if(mapping)mapping[field.dataset.autoMappingField]=field.value;
      });
    });
  }
  function validate(){
    flow.errors=model.validateRules(flow.rules,flow.context,canUseAi());return !flow.errors.length;
  }
  function taskFields(action){
    return `<div class="ve68-auto-fields">${input('Название задачи','taskTitle',action.taskTitle)}${select('Тип задачи','taskType',taskTypes,action.taskType)}${select('Ответственный','assignee',assignees,action.assignee)}${select('Приоритет','priority',['Низкий','Обычный','Высокий','Критический'],action.priority)}${catalogSelect('Дедлайн задачи','deadlineMode',{relative:'Через X дней',fixed:'Конкретная дата и время',none:'Без срока'},action.deadlineMode)}${action.deadlineMode==='relative'?`${input('Срок задачи в днях','deadlineDays',action.deadlineDays,'type="number" min="1" step="1"')}${catalogSelect('Отсчёт дедлайна','deadlineAnchor',{execution:'От создания задачи',trigger:'От срабатывания триггера'},action.deadlineAnchor)}${select('Как считать дни','deadlineCalendar',['Календарные дни','Рабочие дни'],action.deadlineCalendar)}${input('Время дедлайна','deadlineTime',action.deadlineTime,'type="time"')}`:action.deadlineMode==='fixed'?input('Дата и время дедлайна','deadlineAt',action.deadlineAt,'type="datetime-local"'):''}${/X /.test(action.taskType)?input('Количественная цель','targetCount',action.targetCount,'type="number" min="1" step="1"'):''}${textarea('Описание задачи','taskDescription',action.taskDescription)}<p class="ve68-config-demo full">Время выполнения выше определяет, когда создать задачу. Дедлайн — когда её нужно завершить.</p></div>`;
  }
  function emailFields(action){
    return `<div class="ve68-auto-fields"><label class="ve68-config-field full">Шаблон письма<select data-auto-field="template">${Object.entries(mailTemplates).map(([id,template])=>`<option value="${id}" ${id===action.template?'selected':''}>${template.name}</option>`).join('')}</select></label>${action.template==='nps'?select('Форма оценки','survey',['Оценка опыта кандидата · NPS','Оценка интервью · NPS'],action.survey):''}<div class="full">${input('Тема письма','subject',action.subject)}</div>${textarea('Текст письма','body',action.body)}<p class="ve68-config-demo full">Переменные: {{имя}}, {{вакансия}}, {{ссылка_на_встречу}}, {{ссылка_на_опрос}}. В макете письма и опросы не отправляются.</p></div>`;
  }
  function rejectionFields(action,ruleIndex,actionIndex){
    const mode=catalogSelect('Как выбрать причину отказа','reasonMode',model.reasonModes,action.reasonMode)+(action.reasonMode==='ai'&&(flow.rules[ruleIndex].trigger!=='failed'||!canUseAi())?'<p class="ve68-config-error">Для динамической причины выберите триггер «Кандидат не прошёл ИИ» на оценивающем этапе. Для других событий используйте «Одна причина для всех».</p>':'');
    if(action.reasonMode!=='ai')return `<div class="ve68-auto-fields">${mode}${select('Причина отказа','reason',['',...reasons],action.reason).replace('value="" selected>','value="" selected>Выберите причину')}${textarea('Комментарий к отказу','comment',action.comment)}<p class="ve68-config-demo full">Кандидат переместится на этап «Отказ» с выбранной причиной. Правило не отправляет письмо само по себе.</p></div>`;
    const mappings=action.reasonMappings,commands=`data-rule="${ruleIndex}" data-action-index="${actionIndex}"`;
    const mappingRows=mappings.map((mapping,index)=>`<div class="ve68-auto-reason-row" data-auto-mapping-index="${index}"><span class="ve68-auto-reason-number">${index+1}</span><label class="ve68-config-field">Критерий ИИ<select aria-label="Критерий ИИ ${index+1}" data-auto-mapping-field="criterion"><option value="" ${!mapping.criterion?'selected':''}>Выберите критерий</option>${Object.entries(model.criteriaKinds).map(([id,label])=>`<option value="${id}" ${id===mapping.criterion?'selected':''}>${esc(label)}</option>`).join('')}</select></label><label class="ve68-config-field">Причина отказа<select aria-label="Причина отказа ${index+1}" data-auto-mapping-field="reason"><option value="" ${!mapping.reason?'selected':''}>Выберите причину</option>${options(reasons,mapping.reason)}</select></label><div class="ve68-auto-reason-tools"><button type="button" class="ve68-config-icon" data-auto-command="mapping-up" ${commands} data-mapping-index="${index}" aria-label="Поднять соответствие ${index+1}" ${index===0?'disabled':''}>↑</button><button type="button" class="ve68-config-icon" data-auto-command="mapping-down" ${commands} data-mapping-index="${index}" aria-label="Опустить соответствие ${index+1}" ${index===mappings.length-1?'disabled':''}>↓</button><button type="button" class="ve68-config-icon" data-auto-command="remove-mapping" ${commands} data-mapping-index="${index}" aria-label="Удалить соответствие ${index+1}">×</button></div></div>`).join('');
    const demo=model.rejectionDemoCases[action.reasonPreviewCase],preview=model.previewRejection(action,demo?.result),mapped=preview.status==='mapped';
    return `<div class="ve68-auto-fields"><div class="full">${mode}</div><section class="ve68-auto-reason-map full"><div class="ve68-auto-reason-heading"><div><h4>Критерий → причина отказа</h4><p>Сопоставьте обязательное требование вакансии с причиной из справочника.</p></div><span>${mappings.length} из 8</span></div><div class="ve68-auto-reason-rows">${mappingRows||'<p class="ve68-config-demo">Добавьте хотя бы одно соответствие.</p>'}</div><button type="button" class="ve68-config-btn" data-auto-command="add-mapping" ${commands} ${mappings.length>=8?'disabled':''}>+ Добавить соответствие</button></section><div class="full">${catalogSelect('Если не совпало несколько требований','multipleReasons',model.multipleReasonModes,action.multipleReasons)}</div><div class="full">${catalogSelect('Если нет ясной причины или результат неполный','reviewMode',model.reviewModes,action.reviewMode)}</div>${textarea('Комментарий к отказу','comment',action.comment)}<p class="ve68-config-demo full">Причина выбирается по структурированному результату обязательных требований, а не по свободному тексту резюме или ИИ-саммари. Возраст и другие защищённые признаки не используются. Неполный, устаревший или неопределённый результат требует проверки рекрутером.</p><section class="ve68-auto-reason-demo full"><div class="ve68-auto-reason-heading"><div><h4>Проверить на примере</h4><p>Демонстрация выбора причины — кандидат не изменится.</p></div><span>Демо</span></div>${catalogSelect('Пример результата ИИ','reasonPreviewCase',Object.fromEntries(Object.entries(model.rejectionDemoCases).map(([id,item])=>[id,item.label])),action.reasonPreviewCase)}<div class="ve68-auto-reason-preview ${mapped?'mapped':'review'}" role="status"><span>${mapped?'Причина отказа':'Проверка рекрутером'}</span><b>${esc(mapped?preview.reason:preview.message)}</b>${mapped&&preview.message?`<p>${esc(preview.message)}</p>`:''}${preview.explanations?.length?`<ul>${preview.explanations.map(explanation=>`<li>${esc(explanation)}</li>`).join('')}</ul>`:''}${!mapped?`<p>${esc(model.reviewModes[preview.reviewMode]||model.reviewModes[action.reviewMode])}</p>`:''}</div></section></div>`;
  }
  function detailFields(action,ruleIndex,actionIndex){
    if(action.type==='task')return taskFields(action);
    if(action.type==='email')return emailFields(action);
    if(action.type==='reject')return rejectionFields(action,ruleIndex,actionIndex);
    if(action.type==='move')return `<div class="ve68-auto-destination"><span>Следующий этап</span><b>${esc(flow.context.nextStage||'Следующего этапа нет')}</b></div>`;
    if(action.type==='notify')return `<div class="ve68-auto-fields">${select('Получатель','recipient',['Рекрутер вакансии','Нанимающий менеджер вакансии',...assignees.slice(1)],action.recipient)}${input('Заголовок уведомления','notificationTitle',action.notificationTitle)}${textarea('Текст уведомления','notificationBody',action.notificationBody)}<p class="ve68-config-demo full">Внутреннее уведомление в ATS. Получатель должен иметь доступ к кандидату и вакансии.</p></div>`;
    if(action.type==='tag')return `<div class="ve68-auto-fields">${select('Метка','tag',['','Сильный кандидат','На будущее','Повторный контакт','Рекомендован коллегой'],action.tag).replace('value="" selected>','value="" selected>Выберите метку')}<p class="ve68-config-demo full">Метки из демонстрационного справочника компании. Метка не меняет этап кандидата.</p></div>`;
    if(action.type==='slot')return `<div class="ve68-auto-fields">${select('Организатор интервью','organizer',assignees,action.organizer)}${select('Тип встречи','meetingType',['HR-интервью','Техническое интервью','Финальное интервью','Другая встреча'],action.meetingType)}${input('Длительность, минут','duration',action.duration,'type="number" min="1" step="1"')}${textarea('Текст приглашения','slotMessage',action.slotMessage)}<p class="ve68-config-demo full">Кандидат получит ссылку для выбора свободного времени. Это приглашение, не подтверждённая встреча; нужны подключённый календарь организатора и адрес кандидата.</p></div>`;
    if(action.type==='survey')return `<div class="ve68-auto-fields">${catalogSelect('Шаблон опроса','surveyTemplate',model.surveyTemplates,action.surveyTemplate)}<div class="ve68-auto-destination"><span>Получатель</span><b>${action.surveyTemplate==='manager'?'Нанимающий менеджер вакансии':'Кандидат'}</b></div>${textarea('Текст приглашения к опросу','surveyMessage',action.surveyMessage)}<p class="ve68-config-demo full">Отправляется приглашение к опубликованной версии анкеты. Опрос качества подбора не является фидбеком по интервью.</p></div>`;
    return '';
  }
  function timingFields(action,ruleIndex,index){
    const delayed=['hours','days'].includes(action.timing);
    return `<div class="ve68-auto-timing">${catalogSelect('Когда выполнить','timing',model.timings,action.timing,'Выберите время выполнения',`aria-label="Время действия ${index+1} автоматизации ${ruleIndex+1}"`)}${delayed?input(action.timing==='hours'?'Количество часов':'Количество дней','delayAmount',action.delayAmount,'type="number" min="1" step="1" placeholder="Например, 2"'):''}${delayed?`<p class="ve68-config-demo">После срабатывания триггера${action.timing==='days'?', календарные дни':''}. Введите целое число от 1.</p>`:''}</div>`;
  }
  function actionCard(action,ruleIndex,index){
    const rule=flow.rules[ruleIndex],ready=model.timingReady(action),blocked=model.transitionBlocked(rule,action,flow.context);
    const actionOptions=Object.entries(targets).map(([id,label])=>`<option value="${id}" ${id===action.type?'selected':''}>${label}</option>`).join('');
    const hint=['approved','failed'].includes(rule.trigger)&&['move','reject'].includes(action.type)?'<p class="ve68-config-demo">Переход по результату ИИ настраивается этим действием. Он не должен дублировать переход для того же исхода в настройках ИИ-модуля.</p>':'';
    return `<section class="ve68-auto-action" data-auto-action="${index}"><div class="ve68-auto-action-head"><span>Действие ${index+1}</span><button class="ve68-config-icon" data-auto-command="remove-action" data-rule="${ruleIndex}" data-action-index="${index}" aria-label="Удалить действие ${index+1} автоматизации ${ruleIndex+1}">×</button></div><label class="ve68-config-field">Что сделать<select data-auto-field="type" aria-label="Действие ${index+1} автоматизации ${ruleIndex+1}"><option value="" ${!action.type?'selected':''}>Выберите действие</option>${actionOptions}</select></label>${hint}${action.type?timingFields(action,ruleIndex,index):''}${action.type&&ready?`<div class="ve68-auto-details" data-auto-details>${blocked?`<p class="ve68-config-error">${esc(blocked)}</p>`:''}${detailFields(action,ruleIndex,index)}</div>`:''}</section>`;
  }
  function ruleCard(rule,index){
    return `<section class="ve68-auto-rule" data-auto-rule="${index}"><div class="ve68-auto-rule-head"><input data-auto-field="name" aria-label="Название автоматизации ${index+1}" value="${esc(rule.name)}"><label class="ve68-config-check"><input type="checkbox" data-auto-field="enabled" ${rule.enabled?'checked':''}>${rule.enabled?'Активна':'На паузе'}</label><button class="ve68-config-icon" data-auto-command="remove-rule" data-rule="${index}" aria-label="Удалить автоматизацию ${index+1}">×</button></div><div class="ve68-auto-trigger"><span class="ve68-auto-label">Когда</span><label class="ve68-config-field">Триггер<select data-auto-field="trigger" aria-label="Триггер автоматизации ${index+1}"><option value="" ${!rule.trigger?'selected':''}>Выберите триггер</option>${Object.entries(triggers).map(([id,label])=>`<option value="${id}" ${id===rule.trigger?'selected':''} ${['approved','failed'].includes(id)&&!canUseAi()?'disabled':''}>${label}</option>`).join('')}</select></label>${rule.trigger==='idle'?input('Не двигается дней','idleDays',rule.idleDays,'type="number" min="1" step="1"'):''}${['taskCompleted','taskOverdue'].includes(rule.trigger)?select('Тип связанной задачи','triggerTaskType',['Любая задача',...taskTypes],rule.triggerTaskType):''}${rule.trigger==='offer'?catalogSelect('Состояние оффера','offerState',model.offerStates,rule.offerState):''}${!canUseAi()?'<small>ИИ-триггеры доступны на этапах авторазбора, скоринга и ИИ-бота.</small>':''}</div>${rule.trigger?`<div class="ve68-auto-actions"><div class="ve68-auto-actions-heading"><span class="ve68-auto-label">Тогда</span><b>${rule.actions.length} ${plural(rule.actions.length,'действие','действия','действий')}</b></div>${rule.actions.map((action,actionIndex)=>actionCard(action,index,actionIndex)).join('')}<button class="ve68-config-btn" data-auto-command="add-action" data-rule="${index}">+ Добавить действие</button></div>`:'<p class="ve68-auto-prompt">Выберите событие, чтобы добавить действие.</p>'}</section>`;
  }
  function render(keepScroll=false){
    const active=keepScroll&&dialog.contains(document.activeElement)?document.activeElement:null;
    const focus=active&&(active.dataset.autoField||active.dataset.autoMappingField)?{field:active.dataset.autoField,mappingField:active.dataset.autoMappingField,mapping:active.closest('[data-auto-mapping-index]')?.dataset.autoMappingIndex,rule:active.closest('[data-auto-rule]')?.dataset.autoRule,action:active.closest('[data-auto-action]')?.dataset.autoAction,start:active.selectionStart,end:active.selectionEnd}:null;
    const oldScroll=keepScroll?dialog.querySelector('.ve68-config-body')?.scrollTop||0:0;
    const count=flow.rules.reduce((total,rule)=>total+rule.actions.filter(action=>action.type).length,0);
    dialog.innerHTML=`<header><div><h2 id="ve68-auto-title">Автоматизации · ${esc(flow.context.stage)}</h2><p>${esc(flow.context.vacancyName)}</p></div><button class="ve68-config-icon" data-auto-command="cancel" aria-label="Закрыть автоматизации">×</button></header><div class="ve68-config-body"><div class="ve68-auto-intro"><div><h3>Действия на этапе</h3><p>Выберите триггер → действие → время выполнения → заполните параметры.</p></div><span>${flow.rules.length} ${plural(flow.rules.length,'правило','правила','правил')} · ${count} ${plural(count,'действие','действия','действий')}</span></div>${flow.errors.length?`<div class="ve68-config-error" role="alert">${flow.errors.map(error=>`<p>${esc(error)}</p>`).join('')}</div>`:''}<div class="ve68-auto-rules">${flow.rules.length?flow.rules.map(ruleCard).join(''):'<div class="ve68-config-empty">На этом этапе пока нет автоматизаций.<br>Добавьте правило и выберите, когда и что должно произойти.</div>'}</div><button class="ve68-config-btn purple" data-auto-command="add-rule">+ Добавить автоматизацию</button><p class="ve68-config-demo">Дизайн-макет: справочники демонстрационные, правила не исполняются и не меняют кандидатов. Сохранение действует до перезагрузки страницы.</p></div><footer><button class="ve68-config-btn" data-auto-command="cancel">Отмена</button><button class="ve68-config-btn primary" data-auto-command="save">Сохранить автоматизации</button></footer>`;
    dialog.querySelector('.ve68-config-body').scrollTop=oldScroll;
    if(focus){
      const selector=`[data-auto-rule="${focus.rule}"] ${focus.action!==undefined?`[data-auto-action="${focus.action}"] `:''}${focus.mappingField?`[data-auto-mapping-index="${focus.mapping}"] [data-auto-mapping-field="${focus.mappingField}"]`:`[data-auto-field="${focus.field}"]`}`;
      const field=dialog.querySelector(selector);if(field){field.focus({preventScroll:true});if(focus.start!==null&&typeof field.setSelectionRange==='function')field.setSelectionRange(focus.start,focus.end)}
    }
  }
  return {open,summary};
})();
