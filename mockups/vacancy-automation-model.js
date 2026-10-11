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
  const rejectionReasons = ['Не соответствует требованиям вакансии', 'Недостаточно профильного опыта', 'Не совпали ожидания по условиям', 'Кандидат отказался', 'Выбран другой кандидат', 'Не хватает необходимых навыков', 'Не подходит формат или место работы', 'Нет обязательного образования или квалификации'];
  const reasonModes = {fixed: 'Одна причина для всех', ai: 'По результату ИИ-проверки'};
  const criteriaKinds = {experience: 'Профильный опыт', skills: 'Профессиональные навыки', workMode: 'Место и формат работы', salary: 'Зарплатные ожидания', education: 'Обязательное образование / квалификация', language: 'Рабочий язык', schedule: 'График работы', responsibilities: 'Профиль задач'};
  const multipleReasonModes = {review: 'Передать рекрутеру на проверку', priority: 'Первое совпадение по порядку строк'};
  const reviewModes = {task: 'Оставить на этапе и создать задачу рекрутеру', notify: 'Оставить на этапе и уведомить рекрутера'};
  const defaultReasonMappings = () => Object.keys(criteriaKinds).map(criterion => ({criterion, reason: ({experience: rejectionReasons[1], skills: rejectionReasons[5], workMode: rejectionReasons[6], salary: rejectionReasons[2], education: rejectionReasons[7]})[criterion] || rejectionReasons[0]}));
  // Только вымышленные результаты для предпросмотра. Не используется для оценки людей.
  const demoFailure = (kind, explanation) => ({status: 'completed', outcome: 'failed', current: true, criteria: [{kind, result: 'not_met', required: true, explanation}]});
  const rejectionDemoCases = {
    experience: {label: 'Недостаточно профильного опыта', result: demoFailure('experience', 'Для демовакансии нужен опыт Android от 5 лет; в примере подтверждены 2 года.')},
    skills: {label: 'Нет необходимого навыка', result: demoFailure('skills', 'В демопримере не подтверждён обязательный опыт работы с Jetpack Compose.')},
    workMode: {label: 'Не совпал формат работы', result: demoFailure('workMode', 'В демопримере требуется работа в офисе; кандидат согласен только на удалённый формат.')},
    salary: {label: 'Не совпали зарплатные ожидания', result: demoFailure('salary', 'В демопримере ожидания выше опубликованного диапазона вакансии.')},
    education: {label: 'Нет обязательной квалификации', result: demoFailure('education', 'В демопримере не подтверждён обязательный для работы профессиональный допуск.')},
    multiple: {label: 'Несколько несовпадений', result: {status: 'completed', outcome: 'failed', current: true, criteria: [...demoFailure('experience', 'В демопримере недостаточно профильного опыта.').criteria, ...demoFailure('skills', 'В демопримере не подтверждён обязательный навык.').criteria]}},
    unknown: {label: 'Причина вне сопоставлений', result: demoFailure('unmapped', 'Деморезультат не содержит известной категории причины.')},
    uncertain: {label: 'Недостаточно данных', result: {status: 'completed', outcome: 'failed', current: true, needsReview: true, criteria: [{kind: 'skills', result: 'unknown', required: true, explanation: 'В демопримере недостаточно данных для уверенного результата.'}]}}
  };
  const positiveInteger = value => String(value ?? '').trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 1;
  const has = (catalog, value) => Object.hasOwn(catalog, value);
  const timingReady = action => action.timing === 'now' || (['hours', 'days'].includes(action.timing) && positiveInteger(action.delayAmount));
  const defaultAction = () => ({
    type: '', timing: '', delayAmount: '', reason: '', comment: '',
    reasonMode: 'fixed', reasonMappings: defaultReasonMappings(), multipleReasons: 'review',
    reviewMode: 'task', reasonPreviewCase: 'experience', reasonModeInitialized: false,
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
      reasonMappings: action.reasonMappings === undefined ? defaultReasonMappings() : Array.isArray(action.reasonMappings) ? action.reasonMappings.map(mapping => mapping && typeof mapping === 'object' ? {...mapping} : mapping) : action.reasonMappings,
      reasonModeInitialized: action.reasonModeInitialized ?? (action.type === 'reject'),
      // Старый редактор выполнял действие без задержки и считал дедлайн от триггера.
      timing: action.timing ?? (action.type ? 'now' : ''),
      deadlineAnchor: action.deadlineAnchor ?? (action.type ? 'trigger' : 'execution')
    }))}));
  }
  function transitionBlocked(rule, action, context) {
    if (!['move', 'reject'].includes(action.type)) return '';
    if (action.type === 'move' && ['выход', 'отказ'].includes(String(context.stage ?? '').trim().toLowerCase())) return 'На завершающем этапе нет автоматического перехода дальше.';
    if (action.type === 'move' && !context.nextStage) return 'Следующего этапа нет.';
    if (action.type === 'move' && rule.trigger === 'offer' && context.nextStage === 'Выход') return 'Изменение состояния оффера не подтверждает фактический выход. Выход фиксируется отдельно.';
    return '';
  }
  function rejectionErrors(action) {
    const messages = [];
    const mode = action.reasonMode === undefined ? 'fixed' : action.reasonMode;
    if (!has(reasonModes, mode)) return ['выберите способ определения причины отказа.'];
    if (mode === 'fixed') return String(action.reason ?? '').trim() ? [] : ['выберите причину отказа.'];
    if (!has(multipleReasonModes, action.multipleReasons)) messages.push('выберите правило для нескольких несовпадений.');
    if (!has(reviewModes, action.reviewMode)) messages.push('выберите действие для ручной проверки.');
    if (!Array.isArray(action.reasonMappings) || !action.reasonMappings.length || action.reasonMappings.length > 8) return [...messages, 'добавьте от 1 до 8 сопоставлений критериев и причин.'];
    const used = new Set();
    action.reasonMappings.forEach((mapping, index) => {
      if (!mapping || !has(criteriaKinds, mapping.criterion)) messages.push(`сопоставление ${index + 1} — выберите критерий ИИ из списка.`);
      else if (used.has(mapping.criterion)) messages.push(`сопоставление ${index + 1} — критерий ИИ уже используется.`);
      else used.add(mapping.criterion);
      if (!mapping || !String(mapping.reason ?? '').trim()) messages.push(`сопоставление ${index + 1} — выберите причину отказа.`);
    });
    return messages;
  }
  function previewRejection(action, result) {
    const explanations = Array.isArray(result?.criteria) ? result.criteria.filter(item => item && typeof item.explanation === 'string').map(item => item.explanation) : [];
    const manual = message => ({status: 'manual', reason: '', criterion: '', message, explanations, reviewMode: has(reviewModes, action?.reviewMode) ? action.reviewMode : 'task'});
    if (!action || rejectionErrors(action).length) return manual('Заполните настройки причины, чтобы проверить демопример.');
    if (!result || result.status !== 'completed' || result.outcome !== 'failed' || result.current !== true || result.needsReview) return manual('Нет актуального уверенного результата ИИ: отказ не применяется, нужна проверка рекрутера.');
    if ((action.reasonMode ?? 'fixed') === 'fixed') return {status: 'mapped', reason: action.reason, criterion: '', message: 'В демопримере выбрана фиксированная причина. Объяснения ИИ сохраняются отдельно.', explanations, reviewMode: action.reviewMode};
    if (!Array.isArray(result.criteria) || result.criteria.some(item => !item || typeof item !== 'object' || (item.required === true && (!has(criteriaKinds, item.kind) || !['met', 'not_met'].includes(item.result))))) return manual('Есть неясные результаты проверки: отказ не применяется.');
    const failed = result.criteria.filter(item => item.required === true && item.result === 'not_met');
    if (!failed.length) return manual('Нет подтверждённого несовпадения обязательного рабочего критерия: нужна проверка рекрутера.');
    if (failed.some(item => !has(criteriaKinds, item.kind) || !action.reasonMappings.some(mapping => mapping.criterion === item.kind))) return manual('Для части причин нет сопоставления. Кандидат остаётся на этапе для ручной проверки.');
    const matched = action.reasonMappings.filter(mapping => failed.some(item => item.kind === mapping.criterion));
    if (matched.length > 1 && action.multipleReasons === 'review') return manual('Найдено несколько несовпадений: основную причину выбирает рекрутер.');
    const first = matched[0];
    return {status: 'mapped', reason: first.reason, criterion: first.criterion, message: matched.length > 1 ? 'Основная причина выбрана по порядку строк; все объяснения ИИ сохранены.' : 'Причина выбрана по обязательному критерию из структурированного деморезультата.', explanations, reviewMode: action.reviewMode};
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
        if (action.type === 'reject') {
          errors.push(...rejectionErrors(action).map(message => label + message));
          if (action.reasonMode === 'ai' && (rule.trigger !== 'failed' || !canUseAi)) errors.push(label + 'причина по ИИ доступна для триггера «Кандидат не прошёл ИИ» на оценивающем этапе.');
        }
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
    for (const trigger of ['approved', 'failed']) {
      const changing = rules.filter(rule => rule.enabled && rule.trigger === trigger && rule.actions.some(action => ['move', 'reject'].includes(action.type)));
      if (changing.length > 1) errors.push(`Триггер «${triggers[trigger]}»: конфликт переходов — оставьте одно активное правило с перемещением или отказом.`);
    }
    return errors;
  }
  return {triggers, actions, timings, offerStates, surveyTemplates, rejectionReasons, reasonModes, criteriaKinds, multipleReasonModes, reviewModes, defaultReasonMappings, rejectionDemoCases, previewRejection, positiveInteger, timingReady, defaultAction, defaultRule, normalizeRules, transitionBlocked, validateRules};
})();
