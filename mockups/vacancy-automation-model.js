/* Только модель локального дизайн-макета: никакого исполнения правил и внешних запросов. */
window.VacancyAutomationModel = (() => {
  const triggers = {
    entered: 'Кандидат перемещён на этот этап',
    approved: 'Кандидат одобрен ИИ',
    failed: 'Кандидат не прошёл ИИ',
    idle: 'Кандидат не двигается X дней',
    message: 'Получено сообщение от кандидата',
    taskCompleted: 'Задача по кандидату завершена',
    taskOverdue: 'Задача по кандидату просрочена',
    offer: 'Изменилось состояние оффера'
  };
  const actions = {
    move: 'Переместить на следующий этап',
    reject: 'Отказать',
    task: 'Создать задачу',
    email: 'Отправить кандидату письмо',
    notify: 'Уведомить сотрудника',
    tag: 'Добавить метку кандидату',
    slot: 'Пригласить выбрать время интервью',
    survey: 'Отправить опрос качества подбора'
  };
  const timings = {now: 'Сразу', hours: 'Через X часов', days: 'Через X дней'};
  const offerStates = {accepted: 'Оффер принят', declined: 'Оффер отклонён', expired: 'Срок ответа истёк'};
  const surveyTemplates = {candidate: 'Опыт кандидата · CSI', manager: 'Качество подбора · NPS менеджера'};
  const positiveInteger = value => String(value ?? '').trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 1;
  const has = (catalog, value) => Object.hasOwn(catalog, value);
  const timingReady = action => action.timing === 'now' || (['hours', 'days'].includes(action.timing) && positiveInteger(action.delayAmount));
  const defaultAction = () => ({
    type: '', timing: '', delayAmount: '', reason: '', comment: '',
    taskTitle: 'Связаться с кандидатом', taskDescription: '', taskType: 'Связаться',
    assignee: 'Рекрутер вакансии', priority: 'Обычный', deadlineMode: 'relative',
    deadlineAnchor: 'execution', deadlineDays: '2', deadlineCalendar: 'Календарные дни',
    deadlineTime: '18:00', deadlineAt: '', targetCount: '1', template: 'received',
    subject: 'Ваш отклик на {{вакансия}}',
    body: 'Здравствуйте, {{имя}}! Спасибо за интерес к вакансии {{вакансия}}. Мы получили ваш отклик и скоро вернёмся с ответом.',
    survey: 'Оценка опыта кандидата · NPS',
    recipient: 'Рекрутер вакансии', notificationTitle: 'Кандидату требуется внимание',
    notificationBody: 'Проверьте кандидата {{имя}} по вакансии {{вакансия}}.',
    tag: '', organizer: 'Рекрутер вакансии', meetingType: 'HR-интервью', duration: '45',
    slotMessage: 'Здравствуйте, {{имя}}! Выберите удобное время интервью по вакансии {{вакансия}}: {{ссылка_на_встречу}}.',
    surveyTemplate: 'candidate', surveyMessage: 'Поделитесь впечатлениями о подборе по вакансии {{вакансия}}: {{ссылка_на_опрос}}.'
  });
  const defaultRule = index => ({name: `Автоматизация ${index + 1}`, enabled: true, trigger: '', idleDays: '3', triggerTaskType: 'Любая задача', offerState: 'accepted', actions: [defaultAction()]});
  function normalizeRules(rules) {
    return rules.map((rule, index) => ({...defaultRule(index), ...rule, actions: (rule.actions || []).map(action => ({
      ...defaultAction(), ...action,
      // Старый редактор выполнял действие без задержки и считал дедлайн от триггера.
      timing: action.timing ?? (action.type ? 'now' : ''),
      deadlineAnchor: action.deadlineAnchor ?? (action.type ? 'trigger' : 'execution')
    }))}));
  }
  function transitionBlocked(rule, action, context) {
    if (!['move', 'reject'].includes(action.type)) return '';
    if (['approved', 'failed'].includes(rule.trigger)) return 'Исход ИИ управляется настройкой ИИ-этапа. Здесь можно добавить задачу, сообщение или уведомление, но не альтернативный переход.';
    if (action.type === 'move' && ['выход', 'отказ'].includes(String(context.stage ?? '').trim().toLowerCase())) return 'На завершающем этапе нет автоматического перехода дальше.';
    if (action.type === 'move' && !context.nextStage) return 'Следующего этапа нет.';
    if (action.type === 'move' && rule.trigger === 'offer' && context.nextStage === 'Выход') return 'Изменение состояния оффера не подтверждает фактический выход. Выход фиксируется отдельно.';
    return '';
  }
  function validateRules(rules, context, canUseAi) {
    const errors = [];
    const filled = value => String(value ?? '').trim() !== '';
    rules.forEach((rule, index) => {
      const prefix = `Автоматизация ${index + 1}: `;
      if (!filled(rule.name)) errors.push(prefix + 'введите название.');
      if (!has(triggers, rule.trigger)) errors.push(prefix + 'выберите триггер.');
      if (rule.trigger === 'idle' && !positiveInteger(rule.idleDays)) errors.push(prefix + 'укажите число дней ожидания от 1.');
      if (['approved', 'failed'].includes(rule.trigger) && !canUseAi) errors.push(prefix + 'на этом этапе нет оценивающего ИИ-модуля.');
      if (rule.trigger === 'offer' && !has(offerStates, rule.offerState)) errors.push(prefix + 'выберите состояние оффера.');
      if (!rule.actions.length) errors.push(prefix + 'добавьте хотя бы одно действие или удалите правило.');
      if (rule.actions.filter(action => ['move', 'reject'].includes(action.type)).length > 1) errors.push(prefix + 'оставьте одно действие, меняющее этап: перемещение или отказ.');
      rule.actions.forEach((action, actionIndex) => {
        const label = prefix + `действие ${actionIndex + 1} — `;
        if (!has(actions, action.type)) {errors.push(label + 'выберите действие.'); return;}
        if (!has(timings, action.timing)) {errors.push(label + 'выберите время выполнения.'); return;}
        if (!timingReady(action)) {errors.push(label + 'укажите задержку: целое число от 1.'); return;}
        const blocked = transitionBlocked(rule, action, context);
        if (blocked) errors.push(label + blocked);
        if (action.type === 'reject' && !filled(action.reason)) errors.push(label + 'выберите причину отказа.');
        if (action.type === 'task') {
          if (!filled(action.taskTitle)) errors.push(label + 'введите название задачи.');
          if (!filled(action.assignee)) errors.push(label + 'выберите ответственного.');
          if (!['relative', 'fixed', 'none'].includes(action.deadlineMode)) errors.push(label + 'выберите дедлайн задачи.');
          if (action.deadlineMode === 'relative') {
            if (!positiveInteger(action.deadlineDays)) errors.push(label + 'задайте срок от 1 дня.');
            if (!filled(action.deadlineTime)) errors.push(label + 'выберите время дедлайна.');
            if (!['trigger', 'execution'].includes(action.deadlineAnchor)) errors.push(label + 'выберите начало отсчёта дедлайна.');
          }
          if (action.deadlineMode === 'fixed' && !filled(action.deadlineAt)) errors.push(label + 'выберите дату и время дедлайна.');
          if (/X /.test(action.taskType) && !positiveInteger(action.targetCount)) errors.push(label + 'укажите количественную цель от 1.');
        }
        if (action.type === 'email' && (!filled(action.subject) || !filled(action.body))) errors.push(label + 'заполните тему и текст письма.');
        if (action.type === 'notify' && (!filled(action.recipient) || !filled(action.notificationTitle) || !filled(action.notificationBody))) errors.push(label + 'заполните получателя, заголовок и текст уведомления.');
        if (action.type === 'tag' && !filled(action.tag)) errors.push(label + 'выберите метку.');
        if (action.type === 'slot' && (!filled(action.organizer) || !positiveInteger(action.duration) || !filled(action.slotMessage))) errors.push(label + 'заполните организатора, длительность и текст приглашения.');
        if (action.type === 'survey' && (!has(surveyTemplates, action.surveyTemplate) || !filled(action.surveyMessage))) errors.push(label + 'выберите опрос и заполните текст приглашения.');
      });
    });
    return errors;
  }
  return {triggers, actions, timings, offerStates, surveyTemplates, positiveInteger, timingReady, defaultAction, defaultRule, normalizeRules, transitionBlocked, validateRules};
})();
