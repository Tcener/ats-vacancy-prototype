/* Публикации вакансии на работных сайтах — карточка 68.
   Блок в сведениях вакансии, выбор площадки и кабинета, форма под площадку с внешним
   предпросмотром, расхождения, продление и снятие, привязка существующего объявления,
   история отправок, список публикаций в окнах закрытия и паузы вакансии.
   Модель — docs/20-domain/vacancy-publication.md и вопрос 25; экран —
   docs/50-screens/vacancy-publications.md; публичные источники —
   docs/reference/job-sayty-publikatsiya-referensy-2026-10-07.md. Все данные вымышленные:
   кабинеты, номера объявлений и адреса не принадлежат реальным компаниям. */
window.Publications = (() => {
  'use strict';
  const KEY = 'sobesso-publications-v4';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (text) => window.dispatchEvent(new CustomEvent('cr-toast', { detail: text }));
  const paused = () => !!window.CandidacyRuns?.isPaused?.();
  /* Время демо фиксированное: кадры не зависят от часов машины. */
  const NOW = 'сегодня, 10:52';
  const NBSP = (s) => String(s).replace(/ /g, ' ');

  /* ── Площадки и подключённые кабинеты ─────────────────────────── */
  const BOARDS = {
    /* name — в заголовках, short — внутри фраз («на Авито», «с Авито»). */
    hh: { name: 'hh.ru', short: 'hh.ru', logo: 'hh', cls: 'hh', icon: 'assets/job-sites/hh.png?public=ef83cc64a372', connected: true },
    avito: { name: 'Авито Работа', short: 'Авито', logo: 'A', cls: 'avito', icon: 'assets/job-sites/avito.png?public=cd2892258b21', connected: true },
    superjob: { name: 'SuperJob', short: 'SuperJob', logo: 'SJ', cls: 'superjob', icon: 'assets/job-sites/superjob.png?public=4d81d755f6f1', connected: true },
    getmatch: { name: 'GetMatch', short: 'GetMatch', logo: 'GM', cls: 'getmatch', icon: 'assets/job-sites/getmatch.svg?public=0c559bc66257', connected: false },
  };
  const ORDER = ['hh', 'avito', 'superjob', 'getmatch'];
  /* Подключение конкретного пользователя к площадке: плитки показываются всегда,
     даже если пользователь ещё не вошёл под своим аккаунтом. */
  const USER_CONNECTED = { hh: true, avito: true, superjob: false, getmatch: false };
  /* can — операции, которые площадка и кабинет поддерживают (по подключению).
     why — почему кабинет недоступен этому пользователю или для размещения.
     paid — публикация списывает пакет или деньги кабинета, нужна галочка согласия.
     Приостановка у Авито и её отсутствие у SuperJob по открытым источникам не
     подтверждены — см. vacancy-publications.md, «Что не подтверждено». */
  const CABINETS = [
    /* hh.ru: тип публикации списывается из пакета в момент публикации; продление стоит как
       новая публикация; «Стандарт плюс» не продлевается (поднимается сам раз в три дня). */
    { id: 'hh-dt', board: 'hh', name: 'Демо Технологии', legal: 'ООО «Демо Технологии»', paid: true, can: { publish: 1, edit: 1, prolong: 1, pause: 0, attach: 1 },
      types: [['Стандарт', 'Больше откликов в первые 3 дня', 'до 31 декабря'], ['Стандарт плюс', 'Поднимается в поиске каждые 3 дня', 'до 30 ноября'], ['Премиум', '7 дней на первых страницах поиска', 'до 30 ноября']] },
    { id: 'hh-ds', board: 'hh', name: 'Демо Сервис', legal: 'ООО «Демо Сервис»', paid: true, can: { publish: 1, edit: 1, prolong: 1, pause: 0, attach: 1 },
      why: 'Вам не выдано разрешение использовать этот кабинет. Его выдаёт администратор подключений.' },
    /* Авито: «оплата за отклики» — публикация бесплатна, платят за отклики; при пустом
       балансе Авито скрывает объявление (вторичные источники). */
    { id: 'avito-dt', board: 'avito', name: 'Демо Технологии', legal: 'ООО «Демо Технологии»', paid: false, can: { publish: 1, edit: 1, prolong: 0, pause: 1, attach: 1 },
      price: 'Оплата за отклики: публикация бесплатна, отклики списываются с кошелька кабинета по тарифу Авито. Когда баланс закончится, Авито скроет объявление.', cost: 'Публикация бесплатна<br>отклики — по тарифу кабинета' },
    { id: 'avito-ds', board: 'avito', name: 'Демо Сервис', legal: 'ООО «Демо Сервис»', paid: false, can: { publish: 0, edit: 0, prolong: 0, pause: 0, attach: 0 },
      why: 'Размещение вакансий этому кабинету недоступно по тарифу Авито. Подключение работает только для откликов и чатов.' },
    { id: 'sj-dt', board: 'superjob', name: 'Демо Технологии', legal: 'ООО «Демо Технологии»', paid: true, can: { publish: 1, edit: 1, prolong: 0, pause: 0, attach: 1 },
      price: 'Публикация по действующему тарифу кабинета SuperJob.', cost: 'Спишется по тарифу кабинета' },
  ];
  const cab = (id) => CABINETS.find((c) => c.id === id);
  const usable = (c) => c && !c.why && c.can.publish;
  const PACKS = { 'hh-dt': { 'Стандарт': 12, 'Стандарт плюс': 4, 'Премиум': 1 } };
  /* Только демооформление. Список реальных брендшаблонов hh.ru не содержит их рендера. */
  const HH_TEMPLATES = {
    'hh-dt': [
      { id: 'tech', name: 'Tech Purple — разработка', note: 'Фиолетовая подложка и акцентные кнопки' },
      { id: 'lime', name: 'Lime — быстрый найм', note: 'Светлая зелёная подложка' },
      { id: 'classic', name: 'Без шаблона', note: 'Стандартное оформление hh.ru' },
    ],
  };

  /* ── Вакансия глазами объявления: что ATS знает и что уходит на площадку ── */
  /* Android-вакансию изменили 7 октября (бюджет до 450 000, опыт от 5 лет, KMP — плюс):
     PROFILE — текущие сведения, ANDROID_SENT — то, что ушло в прежних редакциях. */
  const ANDROID_SENT = `О продукте:
Мы развиваем мобильное приложение, которым ежедневно пользуются миллионы клиентов. Команда отвечает за ключевые пользовательские сценарии: поиск, оформление заказа, оплату, программу лояльности и персональные рекомендации.

Обязанности:
• развивать Android-приложение для миллионов пользователей;
• участвовать в архитектурных решениях и ревью кода;
• вместе с дизайном и продуктом доводить фичи до релиза;
• проектировать переиспользуемые компоненты и развивать дизайн-систему мобильного приложения;
• улучшать производительность, стабильность и время запуска приложения;
• участвовать в декомпозиции задач, оценке сроков и планировании квартальных целей;
• разбирать продуктовые метрики после релиза и предлагать технические улучшения;
• помогать коллегам расти через парное программирование и содержательное ревью.

Требования:
• Kotlin, Coroutines, Jetpack Compose;
• опыт продуктовой разработки от 4 лет;
• умение писать тесты и разбираться в чужом коде;
• понимание многомодульной архитектуры и принципов Clean Architecture;
• опыт работы с REST API, локальным хранением данных и фоновыми задачами;
• привычка принимать решения на основе данных, а не только личных предпочтений;
• умение понятно объяснять технические ограничения менеджерам и дизайнерам.

Будет плюсом:
• опыт с Kotlin Multiplatform и общим кодом для Android и iOS;
• знание инструментов профилирования и оптимизации производительности;
• опыт постепенной миграции большого приложения на Compose;
• участие в развитии инженерных практик внутри команды или компании.

Как устроена работа:
В продуктовой команде работают Android- и iOS-разработчики, backend-разработчики, QA, дизайнер, аналитик и менеджер продукта. Мы выпускаем небольшие изменения каждую неделю, следим за метриками качества и не отделяем разработку от результата для пользователя.

Условия:
• гибрид или удалённо, офис в Москве;
• ДМС, обучение и конференции за счёт компании;
• техника на выбор и бюджет на рабочее место;
• гибкое начало дня и возможность самостоятельно планировать фокусное время;
• прозрачный пересмотр зарплаты и индивидуальный план развития дважды в год.`;
  const PROFILE = {
    android: { title: 'Senior Android-разработчик', grade: 'Senior', city: 'Москва', format: 'Гибрид', employment: 'Полная занятость', salaryTo: '450 000', skills: 'Kotlin, Coroutines, Jetpack Compose, Android SDK',
      text: ANDROID_SENT.replace('опыт продуктовой разработки от 4 лет;', 'опыт продуктовой разработки от 5 лет; опыт с KMP — плюс;') },
    designer: { title: 'Senior Product Designer', grade: 'Senior', city: 'Москва', format: 'Удалённо', employment: 'Полная занятость', salaryTo: '420 000', skills: 'Figma, дизайн-системы, исследования',
      text: 'Обязанности:\n• проектировать ключевые сценарии продукта;\n• развивать дизайн-систему;\n• проводить исследования вместе с аналитиками.\n\nТребования:\n• портфолио продуктовых кейсов;\n• опыт от 5 лет.\n\nУсловия:\n• удалённо по России;\n• ДМС и техника.' },
    backend: { title: 'Backend-разработчик Go', grade: 'Senior', city: 'Москва', format: 'Гибрид', employment: 'Полная занятость', salaryTo: '420 000', skills: 'Go, PostgreSQL, Kafka, Kubernetes',
      text: 'Обязанности:\n• разрабатывать сервисы платформы на Go;\n• проектировать API и схемы данных;\n• дежурить по своим сервисам по графику команды.\n\nТребования:\n• Go в продакшене от 3 лет;\n• PostgreSQL, очереди сообщений, Kubernetes;\n• понимание принципов надёжности.\n\nУсловия:\n• гибрид, офис в Москве;\n• ДМС, обучение, компенсация спорта.' },
    analyst: { title: 'Data Analyst', grade: 'Middle', city: 'Москва', format: 'Гибрид', employment: 'Полная занятость', salaryTo: '260 000', skills: 'SQL, Python, A/B-тесты',
      text: 'Обязанности:\n• считать продуктовые метрики;\n• проводить A/B-тесты.\n\nТребования:\n• SQL и Python;\n• опыт от 2 лет.\n\nУсловия:\n• гибрид, Москва.' },
    ios: { title: 'Senior iOS-разработчик', grade: 'Senior', city: 'Москва', format: 'Гибрид', employment: 'Полная занятость', salaryTo: '420 000', skills: 'Swift, SwiftUI, Combine',
      text: 'Обязанности:\n• развивать iOS-приложение;\n• участвовать в ревью.\n\nТребования:\n• Swift, SwiftUI;\n• опыт от 4 лет.\n\nУсловия:\n• гибрид, Москва.' },
  };
  /* Вакансия, созданная в демо, — своё название и пустой текст: обязательные поля покажутся
     незаполненными, а не подставятся из чужой вакансии. */
  const profile = (id) => {
    const vacancy = ctx.id === id ? ctx.v : null;
    const base = PROFILE[id] || { title: vacancy?.name || 'Вакансия', grade: vacancy?.grade || 'Middle', city: 'Москва', format: 'Гибрид', employment: 'Полная занятость', salaryTo: '', skills: '', text: '' };
    // Редактор обновляет источник текста, но не отправляет изменения на площадки
    // и не превращает внутренний бюджет в публичную зарплату.
    return { ...base, id, ...(vacancy ? { title: vacancy.name || base.title, grade: vacancy.grade || base.grade,
      ...(Object.prototype.hasOwnProperty.call(vacancy, 'description') ? { text: vacancy.description } : {}) } : {}) };
  };
  /* Справочник «подразделение → профессиональная роль hh.ru» из настроек соответствия.
     Для Platform соответствия нет: обязательное поле hh.ru рекрутер выбирает сам. */
  const HH_ROLE = { android: 'Программист, разработчик', ios: 'Программист, разработчик', designer: 'Дизайнер, художник', analyst: 'Аналитик' };
  const DEPT = { android: 'Mobile', ios: 'Mobile', designer: 'Core Product', analyst: 'BI', backend: 'Platform' };

  const HH_SECTIONS = ['Название и опыт', 'Условия работы', 'График и рабочие часы', 'Город и адрес', 'Оплата', 'Описание и навыки', 'Отклики', 'Способы связи', 'Тариф и публикация'];
  const HH_SCHEDULES = ['6/1', '5/2', '4/4', '4/3', '4/2', '3/3', '3/2', '2/2', '2/1', '1/3', '1/2', 'По выходным', 'Свободный', 'Другое'];
  const HH_HOURS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '24', 'По договорённости', 'Другое'];
  const HH_FORMATS = ['На месте работодателя', 'Удалённо', 'Гибрид', 'Разъездной'];
  /* Поля объявления по площадкам. src — откуда значение берётся по стандартному
     соответствию (раздел настроек «Публикация: соответствие полей»); null — соответствия
     нет, значение выбирает рекрутер в этой публикации. */
  const FIELDS = {
    /* Проверено 10.10.2026: кабинет работодателя + справка + современная OpenAPI.
       Это демонстрационная схема; в продукте условия/словари/тарифы приходят из кабинета.
       Подробности и границы — docs/reference/hh-publication-fields-2026-10-10.md. */
    hh: [
      { k: 'title', l: 'Профессия или должность', section: 0, req: 1, max: 100, type: 'text', wide: 1, src: (p) => p.title, from: 'Название вакансии', help: 'Без зарплаты и условий в названии. Правка опубликованной вакансии может пройти повторную проверку.' },
      { k: 'code', l: 'Код вакансии', section: 0, max: 50, type: 'text', src: null },
      { k: 'role', l: 'Профессиональная роль', section: 0, req: 1, type: 'select', opts: ['Программист, разработчик', 'Дизайнер, художник', 'Аналитик', 'Тестировщик'], src: (p) => HH_ROLE[p.id] || '', from: 'Подразделение → справочник ролей hh.ru',
        missText: (p) => `Обязательно на hh.ru. Для подразделения «${DEPT[p.id] || '—'}» в справочнике ролей нет соответствия — выберите здесь. Без значения не уйдёт только эта публикация.` },
      { k: 'exp', l: 'Требуемый опыт работы', section: 0, type: 'radio', wide: 1, opts: ['Нет опыта', 'От 1 года до 3 лет', 'От 3 до 6 лет', 'Более 6 лет'], src: null, help: 'Не определяем опыт по грейду: выберите требование к кандидату.' },
      { k: 'duration', l: 'Сотрудник нужен', section: 1, type: 'radio', wide: 1, opts: ['Постоянный', 'Временный'], src: () => 'Постоянный', from: 'настройка формы: постоянный' },
      { k: 'employment', l: 'Занятость', section: 1, type: 'radio', wide: 1, opts: (v) => v.duration === 'Временный' ? ['Проект', 'Подработка'] : ['Полная', 'Частичная', 'Вахта'], src: (p) => ({ 'Полная занятость': 'Полная', 'Частичная занятость': 'Частичная' }[p.employment] || ''), from: 'Тип занятости → employment_form hh.ru' },
      { k: 'laborContract', l: 'Трудовой договор', section: 1, type: 'check', wide: 1, src: () => false },
      { k: 'internship', l: 'Стажировка', section: 1, type: 'check', wide: 1, show: (v) => v.employment !== 'Вахта', src: () => false },
      { k: 'civilContracts', l: 'Договор ГПХ', section: 1, type: 'multi', wide: 1, opts: ['С самозанятым', 'С ИП', 'С физлицом'], src: () => [] },
      { k: 'format', l: 'Формат работы', section: 1, type: 'multi', wide: 1, opts: (v) => v.employment === 'Вахта' ? ['На месте работодателя', 'Разъездной'] : HH_FORMATS, src: (p) => [p.format], from: 'Формат работы → work_format hh.ru', help: 'Можно выбрать несколько. Формат работы не заменяет график.' },
      { k: 'schedule', l: 'График работы', section: 2, type: 'multi', wide: 1, opts: HH_SCHEDULES, src: () => [], help: 'Можно выбрать несколько вариантов.' },
      { k: 'hours', l: 'Рабочие часы в день', section: 2, type: 'multi', wide: 1, opts: HH_HOURS, src: () => [] },
      { k: 'night', l: 'Вечерние или ночные смены', section: 2, type: 'check', wide: 1, src: () => false },
      { k: 'shiftDuration', l: 'Длительность вахты, дней', section: 2, type: 'multi', wide: 1, opts: ['15', '20', '30', '40', '45', '60', '90', '120', '180', 'Другое'], show: (v) => v.employment === 'Вахта', src: () => [] },
      { k: 'area', l: 'Город публикации', section: 3, req: 1, type: 'select', opts: ['Москва', 'Санкт-Петербург', 'Новосибирск'], src: (p) => p.city, from: 'Город вакансии', help: 'В ATS каждый город — отдельная публикация и отдельное списание.', lock: 'Город на hh.ru после публикации не меняется' },
      { k: 'address', l: 'Адрес работы', section: 3, type: 'text', show: (v) => !v.anon, src: null, help: 'В продукте — выбор реального адреса кабинета hh.ru. В макете — ручной ввод, адрес не придумываем.' },
      { k: 'hideAddress', l: 'Не показывать адрес в вакансии', section: 3, type: 'check', wide: 1, show: (v) => !v.anon, src: () => false },
      { k: 'salary', l: 'Уровень дохода', section: 4, type: 'salary', wide: 1, src: () => ({ from: '', to: '', currency: '₽', mode: 'За месяц', gross: 'до вычета', frequency: '' }), help: 'Публичный доход задаётся отдельно. Внутренний бюджет вакансии не публикуем автоматически.' },
      { k: 'text', l: 'Описание вакансии', section: 5, req: 1, type: 'textarea', wide: 1, min: 150, max: 10000, src: (p) => p.text, from: 'Обязанности, требования и условия' },
      { k: 'skills', l: 'Ключевые навыки', section: 5, type: 'text', wide: 1, src: (p) => p.skills, from: 'Навыки вакансии', help: 'До 15 навыков, через запятую — ограничение просмотренной веб-формы hh.ru.' },
      { k: 'languages', l: 'Языки', section: 5, type: 'languages', wide: 1, src: () => [] },
      { k: 'license', l: 'Водительские права', section: 5, type: 'multi', wide: 1, opts: ['A', 'B', 'C', 'D', 'E', 'BE', 'CE', 'DE', 'TM', 'TB'], src: () => [] },
      { k: 'incomplete', l: 'Разрешить отклики с неполным резюме', section: 6, type: 'check', wide: 1, src: () => false },
      { k: 'autoApplications', l: 'Принимать автоотклики', section: 6, type: 'check', wide: 1, src: () => false },
      { k: 'coverLetter', l: 'Сопроводительное письмо обязательно', section: 6, type: 'check', wide: 1, src: () => false },
      { k: 'test', l: 'Тест для кандидатов', section: 6, type: 'select', wide: 1, opts: ['Без теста', 'Android — базовые вопросы (демо)'], src: () => 'Без теста', help: 'В продукте список берём из доступных тестов hh.ru, не из тестов ATS.' },
      { k: 'testRequired', l: 'Прохождение теста обязательно', section: 6, type: 'check', wide: 1, show: (v) => v.test && v.test !== 'Без теста', src: () => false },
      { k: 'manager', l: 'Менеджер вакансии на hh.ru', section: 7, type: 'select', wide: 1, opts: ['Елена Крылова (демо)', 'Антон Беляев (демо)'], src: null, help: 'Менеджер подключённого кабинета, не произвольный участник ATS. В продукте — права и список hh.ru.' },
      { k: 'showContacts', l: 'Показывать контактные данные', section: 7, type: 'check', wide: 1, src: () => false },
      { k: 'contactName', l: 'Контактное лицо', section: 7, type: 'text', reqWhen: (v) => v.showContacts, show: (v) => v.showContacts, src: null },
      { k: 'contactEmail', l: 'Контактный email', section: 7, type: 'email', show: (v) => v.showContacts, src: null },
      { k: 'contactPhone', l: 'Телефон', section: 7, type: 'text', reqWhen: (v) => v.showContacts, show: (v) => v.showContacts, src: null, help: 'Международный формат, например +7 000 000-00-00. Контакты появятся в публичном объявлении.' },
      { k: 'contactPhone2', l: 'Дополнительный телефон', section: 7, type: 'text', show: (v) => v.showContacts, src: null },
      { k: 'chat', l: 'Разрешить соискателям писать в чат hh.ru', section: 7, type: 'check', wide: 1, src: () => false },
      { k: 'notifications', l: 'Уведомлять менеджера об откликах', section: 7, type: 'check', wide: 1, src: () => false },
      { k: 'anon', l: 'Анонимная вакансия — скрыть компанию', section: 8, type: 'check', wide: 1, src: () => false, help: 'Отдельное свойство публикации. Адрес не передаётся; доступность и цену нужно получить из кабинета.' },
      { k: 'closed', l: 'Закрыть вакансию для откликов соискателей', section: 8, type: 'check', wide: 1, src: () => false },
      { k: 'pubtype', l: 'Тариф публикации', section: 8, req: 1, type: 'pubtype', wide: 1, src: () => 'Стандарт', from: 'демонстрационный пакет кабинета' },
    ],
    avito: [
      { k: 'title', l: 'Название вакансии (не проверено)', type: 'text', wide: 1, src: (p) => p.title, from: 'Название вакансии' },
      { k: 'sphere', l: 'Сфера деятельности (не проверено)', type: 'text', src: null },
      { k: 'address', l: 'Адрес работы (не проверено)', type: 'text', src: null },
      { k: 'schedule', l: 'График работы (не проверено)', type: 'text', src: null },
      { k: 'exp', l: 'Опыт работы (не проверено)', type: 'text', src: null },
      { k: 'salary', l: 'Зарплата (не проверено)', type: 'salary', wide: 1, src: () => ({ from: '', to: '', gross: 'на руки' }), help: 'Правила оплаты Авито не проверены. Внутренний бюджет не подставляем.' },
      { k: 'text', l: 'Описание (не проверено)', type: 'textarea', wide: 1, src: (p) => p.text, from: 'Обязанности, требования и условия' },
    ],
    superjob: [
      { k: 'title', l: 'Должность', req: 1, type: 'text', wide: 1, src: (p) => p.title, from: 'Название вакансии' },
      { k: 'town', l: 'Город', req: 1, type: 'select', opts: ['Москва', 'Санкт-Петербург'], src: (p) => p.city, from: 'Город вакансии' },
      { k: 'catalog', l: 'Раздел каталога', req: 1, type: 'select', opts: ['IT, Интернет, связь → Разработка', 'Дизайн → Интерфейсы', 'Аналитика → Данные'], src: (p) => ({ designer: 'Дизайн → Интерфейсы', analyst: 'Аналитика → Данные' }[p.id] || 'IT, Интернет, связь → Разработка'), from: 'Подразделение → каталог SuperJob' },
      { k: 'exp', l: 'Опыт работы', req: 1, type: 'select', opts: ['Без опыта', 'От 1 года', 'От 3 лет', 'От 6 лет'], src: (p) => (p.grade === 'Senior' ? 'От 6 лет' : 'От 1 года'), from: 'Грейд → опыт' },
      { k: 'work', l: 'График и занятость', req: 1, type: 'select', opts: ['Полный рабочий день', 'Неполный рабочий день', 'Удалённая работа'], src: (p) => (p.format === 'Удалённо' ? 'Удалённая работа' : 'Полный рабочий день'), from: 'Формат и тип занятости → одно поле SuperJob' },
      { k: 'salary', l: 'Зарплата', type: 'salary', wide: 1, src: (p) => ({ from: '', to: p.salaryTo, gross: 'на руки' }), from: 'Бюджет вакансии: только верхняя граница' },
      { k: 'text', l: 'Обязанности, требования, условия', req: 1, type: 'textarea', wide: 1, min: 100, src: (p) => p.text, from: 'Обязанности, требования и условия', help: 'SuperJob принимает текст без оформления: списки уйдут обычными строками.' },
    ],
  };
  /* Настройка публикации в самой ATS — на площадку не отправляется. Режим приёма откликов
     публикации переопределяет настройку вакансии и компании (вопрос 25). */
  const INTAKE = ['Как у вакансии — автоматически', 'Автоматически', 'С подтверждением пользователя', 'Отключён'];

  /* ── Нормализованные состояния (модель) и их подписи в блоке ─────────
     «Истекла» — нормализованное «снята» с исходным статусом площадки «срок истёк». */
  const STATE = {
    draft: { label: 'Черновик', pill: '', norm: 'подготовка' },
    sending: { label: 'Отправляется', pill: 'purple', norm: 'отправляется' },
    moderation: { label: 'На модерации', pill: 'purple', norm: 'на модерации' },
    published: { label: 'Опубликована', pill: 'good', norm: 'опубликована' },
    paused: { label: 'Приостановлена', pill: 'warn', norm: 'приостановлена' },
    rejected: { label: 'Отклонена', pill: 'danger', norm: 'отклонена' },
    expired: { label: 'Истекла', pill: '', norm: 'снята' },
    withdrawn: { label: 'Снята', pill: '', norm: 'снята' },
    error: { label: 'Ошибка', pill: 'danger', norm: 'ошибка синхронизации' },
  };
  const ACTIVE = ['published', 'paused', 'moderation', 'sending', 'error'];

  /* История: редакция (n — номер) — фактически отправленный снимок; операция (n = null) —
     продление, приостановка, возобновление, снятие: редакцию не создаёт. */
  const rev = (n, at, who, how, result, extra = {}) => ({ n, at, who, how, result, ...extra });
  const op = (at, who, how, result) => ({ n: null, at, who, how, result });

  function seed(id) {
    if (id === 'android') return [
      { id: 'p-a1', cab: 'hh-dt', area: 'Москва', state: 'published', raw: 'Опубликована', rev: 2, type: 'Стандарт', extId: '999012345', url: 'hh.ru/vacancy/999012345', until: '12 октября', days: 5, publishedAt: '13 августа', sentAt: '24 сентября, 15:40', sync: 'сегодня, 09:12', resp: [186, 42, 18],
        external: true, vacStale: true, own: { salary: true }, data: { salary: { from: '350 000', to: '420 000', gross: 'на руки' } },
        history: [rev(2, '24 сентября, 15:40', 'Елена Крылова', 'вручную · изменение', 'принята'), op('12 сентября, 11:05', 'Елена Крылова', 'вручную · продление до 12 октября', 'принято · списана 1 «Стандарт»'), rev(1, '13 августа, 10:20', 'Елена Крылова', 'вручную · первая отправка', 'принята после модерации')] },
      { id: 'p-a4', cab: 'hh-dt', area: 'Санкт-Петербург', state: 'published', raw: 'Опубликована', rev: 1, type: 'Стандарт', extId: '999012346', url: 'hh.ru/vacancy/999012346', until: '28 октября', days: 21, publishedAt: '28 сентября', sentAt: '28 сентября, 12:10', sync: 'сегодня, 09:12', resp: [57, 11, 4],
        external: true, vacStale: true, history: [rev(1, '28 сентября, 12:10', 'Елена Крылова', 'вручную · первая отправка', 'принята после модерации')] },
      { id: 'p-a2', cab: 'avito-dt', state: 'rejected', raw: 'Отклонено модерацией', rev: 1, extId: '9999055501', sentAt: '6 октября, 18:20', sync: 'сегодня, 09:12', resp: [0, 0, 0],
        problem: { text: 'В описании указаны контакты для связи вне Авито — телефон в разделе «Условия».', fields: ['text'], snippet: 'вопросы — +7\u00a0900\u00a0000\u201100\u201100' },
        /* В форме исправления — текущие сведения вакансии и место, которое отметила площадка;
           sentText — то, что ушло 6 октября (до изменения вакансии), для снимка редакции. */
        data: { text: PROFILE.android.text.replace('ДМС, обучение и конференции за счёт компании.', 'ДМС, обучение и конференции за счёт компании; вопросы — +7\u00a0900\u00a0000\u201100\u201100.') },
        sentText: ANDROID_SENT.replace('ДМС, обучение и конференции за счёт компании.', 'ДМС, обучение и конференции за счёт компании; вопросы — +7\u00a0900\u00a0000\u201100\u201100.'),
        history: [rev(1, '6 октября, 18:20', 'Антон Беляев', 'вручную · первая отправка', 'отклонена 6 октября, 19:02')] },
      { id: 'p-a3', cab: 'sj-dt', state: 'moderation', raw: 'На модерации', rev: 1, extId: '99901234', sentAt: 'сегодня, 10:40', sync: 'сегодня, 10:41', resp: [0, 0, 0],
        history: [rev(1, 'сегодня, 10:40', 'Елена Крылова', 'вручную · первая отправка', 'на модерации')] },
    ];
    if (id === 'designer') return [
      { id: 'p-d1', cab: 'hh-dt', area: 'Москва', state: 'expired', raw: 'В архиве: истёк срок размещения', rev: 2, type: 'Стандарт', extId: '999023456', url: 'hh.ru/vacancy/999023456', until: '2 октября', publishedAt: '2 сентября', sentAt: '10 сентября, 12:00', sync: 'сегодня, 09:12', resp: [211, 0, 12],
        history: [rev(2, '10 сентября, 12:00', 'Антон Беляев', 'вручную · изменение', 'принята'), rev(1, '2 сентября, 09:30', 'Антон Беляев', 'вручную · первая отправка', 'принята')] },
      { id: 'p-d2', cab: 'avito-dt', state: 'paused', raw: 'Снято с публикации владельцем', rev: 1, extId: '9999066602', url: 'avito.ru/moskva/vakansii/9999066602', until: '25 октября', publishedAt: '25 сентября', sentAt: '25 сентября, 14:10', pausedAt: '5 октября · Антон Беляев', sync: 'сегодня, 09:12', resp: [64, 0, 5],
        history: [op('5 октября, 16:00', 'Антон Беляев', 'вручную · приостановка', 'принято'), rev(1, '25 сентября, 14:10', 'Антон Беляев', 'вручную · первая отправка', 'принята после модерации')] },
      /* Первая отправка — правилом автопубликации; вторая редакция ушла, но площадка не
         ответила: какая версия сейчас на SuperJob, не подтверждено. */
      { id: 'p-d3', cab: 'sj-dt', state: 'error', raw: 'Нет ответа: требуется повторный вход в кабинет', rev: 2, knownRev: 1, extId: '99902345', url: 'superjob.ru/vakansii/99902345', until: '24 октября', publishedAt: '24 сентября', sentAt: 'вчера, 21:38', sync: 'вчера, 21:40', resp: [23, 3, 2],
        problem: { text: 'Не удалось проверить объявление: кабинет SuperJob требует повторного входа. Ответственный за подключение Ирина Николаева уже получила уведомление.' },
        history: [rev(2, 'вчера, 21:38', 'Антон Беляев', 'вручную · изменение', 'неизвестно — площадка не ответила', { unknown: true }), rev(1, '24 сентября, 16:00', 'Правило «Дизайн и продукт на SuperJob»', 'автоматизация · после перехода вакансии «в работу»', 'принята')] },
    ];
    return [];
  }

  /* ── Хранилище демо ─────────────────────────────────────────────── */
  let db;
  const fresh = () => ({ v: 3, role: 'recruiter', vacancies: {}, hidden: {}, packs: JSON.parse(JSON.stringify(PACKS)) });
  try { db = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { db = fresh(); }
  db.hidden ||= {}; db.packs ||= JSON.parse(JSON.stringify(PACKS));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* демо без хранилища */ } };
  const pubs = (id) => (db.vacancies[id] ||= seed(id));
  const findPub = (pid) => Object.values(db.vacancies).flat().find((p) => p.id === pid);
  const isManager = () => db.role === 'manager';
  const left = (cabId, type) => db.packs[cabId]?.[type] ?? 0;
  const newId = () => 'p-' + Math.random().toString(36).slice(2, 8);
  let ctx = { id: 'android', v: null };

  /* Политика публикации компании — из раздела настроек «Публикация: политики». */
  function policy() {
    try {
      const ws = JSON.parse(localStorage.getItem('sobesso-workspaces-v1'));
      const v = ws?.configs?.['publication-policy']?.find((x) => x.name === 'Политика компании')?.values;
      if (v) return { autoProlong: !!v.autoProlong, paidProlong: String(v.paid || '').startsWith('Разрешено') };
    } catch { /* настройки ещё не открывали */ }
    return { autoProlong: false, paidProlong: false };
  }
  const prolongPolicyText = () => {
    const pol = policy();
    if (!pol.autoProlong) return 'Автопродление выключено политикой компании: продлить можно вручную, с подтверждением списания.';
    return pol.paidProlong ? 'Автопродление включено политикой: в дату окончания ATS продлит публикацию вакансии «в работе» и спишет пакет без нового подтверждения.' : 'Автопродление включено политикой: в дату окончания ATS подготовит продление и попросит подтвердить списание.';
  };

  /* ── Мелкие части разметки ───────────────────────────────────────── */
  const btn = (label, act, kind = '', attrs = '') => `<button type="button" class="btn ${kind}" data-pub="${act}" ${attrs}>${label}</button>`;
  const pill = (state) => `<span class="pill ${STATE[state].pill}">${STATE[state].label}</span>`;
  /* Значок площадки — официальный favicon с её сайта (assets/job-sites/, источники в STATUS.md).
     У SuperJob файл с сайта не отдаётся без капчи — пока буквы. */
  const logo = (board, off = false) => {
    const b = BOARDS[board], cls = `pub-logo ${b.cls}${off ? ' off' : ''}`;
    return b.icon
      ? `<img class="${cls} is-img" src="${b.icon}" alt="${esc(b.name)}" title="${esc(b.name)}">`
      : `<span class="${cls}" role="img" aria-label="${esc(b.name)}">${b.logo}</span>`;
  };
  const ICONS = {
    info: '<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path></svg>',
    success: '<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"></path></svg>',
    warning: '<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path></svg>',
    error: '<svg fill-rule="evenodd" viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64zm127.98 274.82h-.04l-.08.06L512 466.75 384.14 338.88c-.04-.05-.06-.06-.08-.06a.12.12 0 00-.07 0c-.03 0-.05.01-.09.05l-45.02 45.02a.2.2 0 00-.05.09.12.12 0 000 .07v.02a.27.27 0 00.06.06L466.75 512 338.88 639.86c-.05.04-.06.06-.06.08a.12.12 0 000 .07c0 .03.01.05.05.09l45.02 45.02a.2.2 0 00.09.05.12.12 0 00.07 0c.02 0 .04-.01.08-.05L512 557.25l127.86 127.87c.04.04.06.05.08.05a.12.12 0 00.07 0c.03 0 .05-.01.09-.05l45.02-45.02a.2.2 0 00.05-.09.12.12 0 000-.07v-.02a.27.27 0 00-.05-.06L557.25 512l127.87-127.86c.04-.04.05-.06.05-.08a.12.12 0 000-.07c0-.03-.01-.05-.05-.09l-45.02-45.02a.2.2 0 00-.09-.05.12.12 0 00-.07 0z"></path></svg>',
  };
  const ARIA = { info: 'info-circle', success: 'check-circle', warning: 'exclamation-circle', error: 'close-circle' };
  /* Alert showIcon — разметка из antd/sample.html. */
  const alert = (type, title, text = '', extra = '') => `<div data-show="true" class="ant-alert ant-alert-${type} ant-alert-with-description" role="alert" data-antd="Alert" data-antd-props="type=${type} showIcon"><span role="img" aria-label="${ARIA[type]}" class="anticon anticon-${ARIA[type]} ant-alert-icon">${ICONS[type]}</span><div class="ant-alert-section"><div class="ant-alert-title">${title}</div>${text || extra ? `<div class="ant-alert-description">${text}${extra}</div>` : ''}</div></div>`;
  const CHECK = '<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z"></path></svg>';
  /* Steps — разметка из antd/sample.html. */
  const steps = (titles, current) => `<div class="ant-steps ant-steps-horizontal ant-steps-title-horizontal ant-steps-filled pub-steps" data-antd="Steps" data-antd-props="current=${current}" style="--steps-items-offset:0">${titles.map((t, i) => {
    const st = i < current ? 'finish' : i === current ? 'process' : 'wait';
    const icon = st === 'finish' ? `<span role="img" aria-label="check" class="anticon anticon-check ant-steps-item-icon-finish">${CHECK}</span>` : `<span class="ant-steps-item-icon-number">${i + 1}</span>`;
    return `<div class="ant-steps-item ant-steps-item-${st}${st === 'process' ? ' ant-steps-item-active' : ''}"><div class="ant-steps-item-wrapper"><div class="ant-steps-item-icon ant-wave-target">${icon}</div><div class="ant-steps-item-section"><div class="ant-steps-item-header"><div class="ant-steps-item-title">${t}</div>${i < titles.length - 1 ? `<div class="ant-steps-item-rail ant-steps-item-rail-${i < current ? 'process' : 'wait'}"></div>` : ''}</div></div></div></div>`;
  }).join('')}</div>`;
  const STEPS = ['Площадка и кабинет', 'Поля объявления', 'Проверка и отправка'];
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const revCount = (p) => (p.history || []).filter((h) => h.n).length;
  const where = (p) => [BOARDS[cab(p.cab).board].name, p.area].filter(Boolean).join(' · ');

  /* ── Блок «Публикации на работных сайтах» ───────────────────────── */
  function facts(p) {
    const rows = [];
    /* Ссылка и внешний ID — одной строкой: номер объявления и есть ссылка на него. */
    const link = p.url ? `<a href="#" data-pub="open-ext" data-id="${p.id}" title="${esc(p.url)}">№ ${esc(p.extId)} ↗</a>` : (p.extId ? `№ ${esc(p.extId)}` : '—');
    const term = p.until ? `до ${esc(NBSP(p.until))}${p.days != null ? `<small class="pub-left-days">${NBSP(`ещё ${p.days} ${plural(p.days, 'день', 'дня', 'дней')}`)}</small>` : ''}` : '—';
    if (p.state === 'published') rows.push(['Объявление на площадке', link], ['Срок размещения', term], ['Опубликована', esc(p.publishedAt || '—')], ['Последняя сверка', esc(p.sync)]);
    else if (p.state === 'moderation' || p.state === 'sending') rows.push(['Отправлена', esc(p.sentAt)], ['Внешний ID', p.extId ? `№ ${esc(p.extId)}` : 'появится после ответа'], ['Срок размещения', 'начнётся после публикации'], ['Последняя сверка', esc(p.sync || '—')]);
    else if (p.state === 'rejected') rows.push(['Отправлена', esc(p.sentAt)], ['Внешний ID', `№ ${esc(p.extId)}`], ['Ответ площадки', esc(p.raw)], ['Последняя сверка', esc(p.sync)]);
    else if (p.state === 'paused') rows.push(['Объявление на площадке', link], ['Приостановлена', esc(p.pausedAt)], ['Срок размещения', `до ${esc(p.until)}`], ['Последняя сверка', esc(p.sync)]);
    else if (p.state === 'expired') rows.push(['Объявление на площадке', `${link} · в архиве`], ['Размещение', `${esc(p.publishedAt)} — ${esc(p.until)}`], ['Ответ площадки', esc(p.raw)], ['Последняя сверка', esc(p.sync)]);
    else if (p.state === 'withdrawn') rows.push(['Объявление на площадке', link], ['Снята', esc(p.withdrawnAt || 'сегодня')], ['Срок размещения', p.until ? `был до ${esc(p.until)}` : '—'], ['Последняя сверка', esc(p.sync)]);
    else if (p.state === 'error' && !p.url) rows.push(['Отправка', esc(p.sentAt || NOW)], ['Внешний ID', 'не создан'], ['Ответ площадки', esc(p.raw)], ['Последняя сверка', esc(p.sync)]);
    else if (p.state === 'error') rows.push(['Объявление на площадке', link], ['Срок размещения', p.until ? `до ${esc(p.until)}` : '—'], ['Ответ площадки', esc(p.raw)], ['Последняя удачная сверка', esc(p.sync)]);
    else if (p.state === 'draft') rows.push(['Черновик', `сохранён ${esc(p.savedAt || NOW)}`], ['Не хватает', esc(p.missing || '—')], ['Отправок', p.rev ? `${p.rev}, последняя — в истории` : 'ещё не было'], ['Видят соискатели', 'ничего — объявления нет']);
    return `<dl class="pub-facts">${rows.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('')}</dl>`;
  }

  function alerts(p) {
    const c = cab(p.cab), board = BOARDS[c.board].short, out = [];
    const mgr = isManager();
    if (['published', 'paused'].includes(p.state) && p.external && !p.externalKept) out.push(alert('warning', `На ${board} изменили объявление напрямую`, EXT[p.id]?.summary || 'Данные ATS не перезаписаны, работе это не мешает.', mgr ? '' : `<div class="pub-alert-actions">${btn('Сравнить и решить', 'diff', 'tiny', `data-id="${p.id}"`)}</div>`));
    if (['published', 'paused'].includes(p.state) && p.external && p.externalKept) out.push(alert('info', 'Расхождение оставлено', `Объявление на ${board} отличается от данных ATS — решение отложено ${p.keptAt || 'сегодня'}.`, mgr ? '' : `<div class="pub-alert-actions">${btn('Вернуться к сравнению', 'diff', 'tiny', `data-id="${p.id}"`)}</div>`));
    if (p.state === 'published' && p.days != null && p.days <= 7) { const pi = prolongInfo(p); out.push(alert('warning', `Срок размещения заканчивается через ${p.days} ${plural(p.days, 'день', 'дня', 'дней')} — ${p.until}`, pi.ok ? prolongPolicyText() : `Продлить нельзя. ${esc(pi.reason)}`)); }
    if (p.state === 'sending') out.push(alert('info', `Отправляем на ${board}…`, 'Публикация не считается размещённой, пока площадка не подтвердит приём.'));
    if (p.state === 'moderation') out.push(alert('info', `${board} проверяет объявление`, c.board === 'hh' ? 'hh.ru проверяет вакансии вручную. В поиске она может появиться раньше, но размещённой ATS считает её только после подтверждения площадки.' : 'Пока площадка не подтвердила публикацию, ATS не считает её размещённой. Срок проверки определяет площадка.'));
    if (p.state === 'rejected') { const fields = (p.problem?.fields || []).map((k) => fieldLabel(c.board, k)).join(', '); out.push(alert('error', c.board === 'hh' ? 'hh.ru заблокировал вакансию' : `${board} отклонило объявление`, `${esc(p.problem?.text || '')}<p>Проблемное поле: ${fields ? esc(fields) : 'площадка не указала'}. Вакансия и другие публикации продолжают работать.</p>`)); }
    if (p.state === 'paused') out.push(alert('warning', `Объявление скрыто на ${board}`, 'Соискатели его не видят, новые отклики не приходят. Возобновление вернёт его в поиск с прежним текстом.'));
    if (p.state === 'expired') out.push(alert('info', `Срок размещения истёк ${p.until}`, `Объявление в архиве ${board}. Полученные отклики и история сохранены в ATS.${repostNote(p) || ' Разместить снова — новая платная публикация.'}`));
    if (p.state === 'withdrawn') out.push(alert('info', `Снята ${p.withdrawnAt || 'сегодня'}`, `${p.withdrawnWhy ? esc(p.withdrawnWhy) + '. ' : ''}Отклики, история и последний снимок объявления сохранены.${repostNote(p)}`));
    if (p.state === 'error') out.push(alert('error', p.problem?.kind === 'withdraw' ? 'Снятие не подтверждено площадкой' : p.url ? 'Не удаётся сверить публикацию' : `Не удалось отправить на ${board}`, `${esc(p.problem?.text || '')}${p.knownRev ? `<p>Какая редакция сейчас на площадке, не подтверждено: последняя известная — №${p.knownRev}, отправленная №${p.rev} ждёт ответа.</p>` : ''}<p>Повтор безопасен — дубль объявления не создастся. Другие публикации это не затронуло.</p>`));
    if (p.state === 'draft') out.push(alert('warning', 'Черновик не отправлен', `${p.missing && !/ничего/.test(p.missing) ? `Не заполнено обязательное поле ${esc(BOARDS[c.board].short)}: ${esc(p.missing)}. ` : ''}Черновик в историю отправок не попадает. Остальные публикации это не задерживает.`));
    return out.join('');
  }

  /* Прежнюю публикацию уже разместили снова — только если новая запись (или её черновик) существует. */
  const reposted = (p) => !!(p.repostedTo && findPub(p.repostedTo));
  const repostNote = (p) => { const n = p.repostedTo && findPub(p.repostedTo); return !n ? '' : n.state === 'draft' ? ' Готовится повторное размещение — черновик в списке.' : ' Вакансию разместили снова — новая публикация в списке.'; };

  /* Можно ли продлить: площадка сама сообщает доступность и готовую причину отказа
     (у hh.ru — ответ проверки продления); ATS показывает её как есть. */
  function prolongInfo(p) {
    const c = cab(p.cab), b = BOARDS[c.board].short;
    if (!c.can.prolong) return { ok: false, reason: c.board === 'avito' ? 'При оплате за отклики Авито держит объявление, пока на кошельке кабинета есть деньги, — продлевать нечего.' : `Продление на ${b} через подключение недоступно — объявление уйдёт в архив по сроку площадки.` };
    if (c.board === 'hh' && p.type === 'Стандарт плюс') return { ok: false, reason: 'Ответ hh.ru: «Вакансия "Стандарт плюс" не может быть обновлена, это происходит автоматически раз в три дня».' };
    return { ok: true };
  }

  function fieldLabel(board, k) { return (FIELDS[board] || []).find((f) => f.k === k)?.l || k; }

  function metrics(p) {
    if (!['published', 'paused', 'expired', 'withdrawn', 'error'].includes(p.state) || !p.url) return '';
    const [t, n, w] = p.resp || [0, 0, 0];
    return `<div class="publication-metrics"><span><b>${t}</b> ${plural(t, 'отклик', 'отклика', 'откликов')}</span><span><b>${n}</b> ${plural(n, 'новый', 'новых', 'новых')}</span><span><b>${w}</b> в работе</span></div>`;
  }

  function actions(p) {
    const c = cab(p.cab), id = `data-id="${p.id}"`;
    const histBtn = revCount(p) || p.history?.length ? btn(`История отправок · ${revCount(p)}`, 'history', 'quiet', `${id} data-antd-props="type=link"`) : '';
    const inbox = p.url ? btn('Открыть отклики', 'inbox', '', id) : '';
    if (isManager()) return `<div class="pub-actions">${inbox}${histBtn}</div>`;
    const noNew = paused() ? 'disabled title="Вакансия на паузе: новые публикации недоступны"' : '';
    const unsent = p.state === 'error' && !p.url;
    const map = {
      published: inbox + btn('Изменить', 'edit', '', id) + (prolongInfo(p).ok ? btn('Продлить', 'prolong', '', id) : '') + (c.can.pause ? btn('Приостановить', 'pause', '', id) : '') + btn('Снять', 'withdraw', '', id),
      moderation: '',
      sending: '',
      rejected: btn('Исправить и отправить снова', 'fix', '', `${id} ${noNew}`),
      paused: btn('Возобновить', 'resume', '', id) + inbox + btn('Снять', 'withdraw', '', id),
      expired: (reposted(p) ? '' : btn('Разместить снова', 'repost', '', `${id} ${noNew}`)) + inbox,
      withdrawn: (reposted(p) ? '' : btn('Разместить снова', 'repost', '', `${id} ${noNew}`)) + inbox,
      error: unsent ? btn('Отправить снова', 'resend', '', `${id} ${noNew}`) : btn('Повторить проверку', 'retry', '', id) + inbox,
      draft: btn('Продолжить', 'continue', '', `${id} ${noNew}`) + btn('Удалить черновик', 'drop', '', id),
    };
    const notes = [];
    if (p.state === 'published' && !c.can.pause) notes.push(`Приостановки через подключение ${BOARDS[c.board].short} нет — объявление можно снять и позже разместить снова.`);
    if (p.state === 'published' && !prolongInfo(p).ok && !(p.days != null && p.days <= 7)) notes.push(`Продления нет. ${prolongInfo(p).reason}`);
    const note = notes.length ? `<p class="pub-note">${notes.map(esc).join('<br>')}</p>` : '';
    return `<div class="pub-actions">${map[p.state] || ''}${p.state === 'sending' ? '' : histBtn}</div>${note}`;
  }

  function card(p) {
    const c = cab(p.cab), b = BOARDS[c.board];
    const revText = p.rev ? (p.knownRev ? `редакция №${p.rev} не подтверждена` : `редакция №${p.rev}`) : 'не отправлялась';
    const sub = [`Кабинет «${c.name}»`, p.area, p.type, revText].filter(Boolean).join(' · ');
    const prev = p.repostOf ? `<p class="pub-note pub-prev">Повторное размещение: прежнее объявление № ${esc(findPub(p.repostOf)?.extId || '—')} осталось в истории со своими откликами.</p>` : '';
    return `<article class="pub-card state-${p.state}" data-pub-card="${p.id}"><header>${logo(c.board)}<div class="pub-name"><b>${esc(b.name)}</b><small>${esc(sub)}</small></div>${pill(p.state)}</header>${facts(p)}${prev}${alerts(p)}${metrics(p)}${actions(p)}</article>`;
  }

  /* В окне площадки держим на виду только текущее объявление. Диагностика,
     расхождения и прежние размещения остаются доступными ниже, в летописи. */
  function currentPublicationCard(p) {
    if (!p) return '';
    const c = cab(p.cab), id = `data-id="${p.id}"`;
    const sub = [`Кабинет «${c.name}»`, p.area, p.type].filter(Boolean).join(' · ');
    const actionButtons = isManager()
      ? btn('Открыть отклики', 'inbox', 'primary', id)
      : btn('Открыть отклики', 'inbox', 'primary', id)
        + btn('Изменить', 'edit', '', id)
        + (prolongInfo(p).ok ? btn('Продлить', 'prolong', '', id) : '')
        + btn('Убрать в архив', 'withdraw', 'danger', id);
    return `<article class="ve68-current-publication" data-pub-card="${p.id}"><header><div><span class="ve68-current-label">Текущее объявление</span><b>${esc(sub)}</b></div>${pill(p.state)}</header>${facts(p)}${metrics(p)}<div class="ve68-current-actions">${actionButtons}</div></article>`;
  }

  function changeHistory(list, current) {
    const events = [];
    if (current?.vacStale) events.push({ title: 'Сведения вакансии изменены после публикации', meta: '7 октября, 11:20 · изменились бюджет и требования' });
    if (current?.external) events.push({ title: `Объявление изменено напрямую на ${BOARDS[cab(current.cab).board].short}`, meta: EXT[current.id]?.summary || 'Данные ATS не перезаписаны' });
    if (current?.days != null && current.days <= 7) events.push({ title: `Срок размещения заканчивается ${current.until}`, meta: `Осталось ${current.days} ${plural(current.days, 'день', 'дня', 'дней')}` });
    (current?.history || []).forEach((h) => events.push({
      title: h.n ? `Редакция №${h.n}: ${h.result}` : `Операция: ${h.result}`,
      meta: [h.at, h.who, h.how].filter(Boolean).join(' · '),
    }));
    list.filter((p) => !current || p.id !== current.id).forEach((p) => {
      const c = cab(p.cab);
      events.push({
        title: `${p.area || BOARDS[c.board].name} · ${STATE[p.state].label}`,
        meta: [`Объявление №${p.extId || '—'}`, `кабинет «${c.name}»`, p.sync ? `сверка ${p.sync}` : ''].filter(Boolean).join(' · '),
      });
      (p.history || []).forEach((h) => events.push({
        title: h.n ? `${p.area || BOARDS[c.board].name}: редакция №${h.n} — ${h.result}` : `${p.area || BOARDS[c.board].name}: ${h.result}`,
        meta: [h.at, h.who, h.how].filter(Boolean).join(' · '),
      }));
    });
    if (!events.length) return '';
    return `<details class="ve68-pub-change-history"><summary><span><b>История изменений</b><small>${events.length} ${plural(events.length, 'событие', 'события', 'событий')}</small></span><i aria-hidden="true">⌄</i></summary><div class="ve68-pub-timeline">${events.map((event) => `<div><span aria-hidden="true"></span><p><b>${esc(event.title)}</b><small>${esc(event.meta)}</small></p></div>`).join('')}</div></details>`;
  }

  function emptyRow(board) {
    const b = BOARDS[board];
    if (!b.connected) return `<article class="pub-card is-off" data-pub-board="${board}"><header>${logo(board, true)}<div class="pub-name"><b>${esc(b.name)}</b><small>Площадка не подключена к компании</small></div></header></article>`;
    const cabs = CABINETS.filter((c) => c.board === board), ok = cabs.filter(usable);
    const reason = ok.length ? '' : `<p class="pub-inline-reason">${esc(cabs[0]?.why || 'Публикация недоступна в подключённых кабинетах.')}</p>`;
    const noNew = paused() ? 'disabled title="Вакансия на паузе: новые публикации недоступны"' : '';
    const acts = isManager() || !ok.length ? '' : `<div class="pub-actions">${btn('Опубликовать', 'publish', '', `data-board="${board}" ${noNew}`)}${ok.some((c) => c.can.attach) ? btn('Привязать существующее', 'attach', '', `data-board="${board}"`) : ''}</div>`;
    return `<article class="pub-card is-empty" data-pub-board="${board}"><header>${logo(board)}<div class="pub-name"><b>${esc(b.name)}</b><small>${ok.length ? `Кабинет${ok.length > 1 ? 'ы' : ''} ${ok.map((c) => `«${esc(c.name)}»`).join(', ')}` : 'Кабинет подключён'}</small></div><span class="pill" data-antd-props="variant=outlined">Не опубликована</span></header>${reason}${acts}</article>`;
  }

  function demoFold(list) {
    const opts = (cur) => Object.entries(STATE).map(([k, s]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${s.label}</option>`).join('');
    const hidden = !!db.hidden[ctx.id];
    return `<details class="pub-demo"${db.demoOpen ? ' open' : ''}><summary>Проверить состояния в демо</summary><div class="pub-demo-body"><div class="pub-demo-row"><span>Смотреть как</span><select data-pub-demo="role" aria-label="Смотреть как"><option value="recruiter" ${db.role === 'recruiter' ? 'selected' : ''}>Рекрутер вакансии</option><option value="manager" ${db.role === 'manager' ? 'selected' : ''}>Нанимающий менеджер</option></select></div><div class="pub-demo-row"><span>Вакансия скрытая (видят только участники)</span><span><button type="button" role="switch" aria-checked="${hidden}" aria-label="Скрытая вакансия" class="ant-switch ant-switch-small${hidden ? ' ant-switch-checked' : ''}" data-antd="Switch" data-pub="demo-hidden"><div class="ant-switch-handle"></div><span class="ant-switch-inner"><span class="ant-switch-inner-checked"></span><span class="ant-switch-inner-unchecked"></span></span></button></span></div>${list.map((p) => `<div class="pub-demo-row"><span>${esc(where(p))} · «${esc(cab(p.cab).name)}»</span><select data-pub-demo="state" data-id="${p.id}" aria-label="Состояние публикации">${opts(p.state)}</select></div>`).join('')}<div>${btn('Сбросить демо публикаций', 'demo-reset', 'tiny')}</div></div></details>`;
  }

  function section(v, id) {
    ctx = { id, v };
    const list = pubs(id), mgr = isManager();
    const cards = ORDER.flatMap((board) => { const own = list.filter((p) => cab(p.cab).board === board); return own.length ? own.map(card) : [emptyRow(board)]; }).join('');
    const count = (pred) => list.filter(pred).length;
    const live = count((p) => p.state === 'published'), wait = count((p) => ['moderation', 'sending'].includes(p.state)), attention = count((p) => ['rejected', 'error', 'draft'].includes(p.state) || (p.state === 'published' && ((p.external && !p.externalKept) || (p.days != null && p.days <= 7))));
    const summary = list.length ? `<div class="pub-summary"><span>Опубликовано: <b>${live}</b></span><span>Ждут площадку: <b>${wait}</b></span><span>Требуют внимания: <b>${attention}</b></span></div>` : '';
    const head = mgr ? '' : `<div class="pub-head-actions">${btn('Привязать существующее', 'attach')}${btn('+ Опубликовать', 'publish', '', paused() ? 'disabled title="Вакансия на паузе: новые публикации недоступны"' : '')}</div>`;
    const stale = list.filter(isStale).length;
    const changed = !mgr && stale ? alert('info', 'Сведения вакансии изменены после последней отправки', `Изменились бюджет и требования (7 октября, 11:20). Объявления сами не меняются: в ${stale} ${plural(stale, 'публикации', 'публикациях', 'публикациях')} — прежние сведения. Выберите, какие обновить.`, `<div class="pub-alert-actions">${btn('Выбрать, что обновить', 'diff-internal', 'tiny')}</div>`) : '';
    const pausedNote = paused() && !mgr ? alert('warning', 'Вакансия на паузе — новые публикации недоступны', 'Нельзя опубликовать, продолжить черновик, разместить снова или повторно отправить неразмещённое. Привязать уже опубликованное объявление можно — это ничего не публикует. Действующие объявления приносят отклики, если их не приостановили.') : '';
    const hiddenNote = db.hidden[id] && !mgr ? alert('info', 'Скрытая вакансия', 'Автоматически такие вакансии не публикуются. При ручной отправке ATS предупредит, что текст станет виден вне ATS.') : '';
    const hmNote = mgr ? alert('info', 'Вы смотрите как нанимающий менеджер', 'Публикациями управляют рекрутеры вакансии. Вам доступен просмотр состояния, откликов и истории отправок.') : '';
    const lead = [pausedNote, hiddenNote, changed, hmNote].filter(Boolean).map((x) => `<div class="pub-lead">${x}</div>`).join('');
    return `<section class="vacancy-overview-section publications-section pub-section" id="pub-section"><div class="drawer-section-head"><div><h3>Публикации на работных сайтах</h3><p>Каждая площадка, кабинет и город — отдельное размещение со своей модерацией и сроком. Отклики со всех приходят в общий поток вакансии.</p></div>${head}</div>${summary}${lead}<div class="pub-list">${cards}</div>${demoFold(list)}</section>`;
  }

  /* На основном экране показываем только три понятных входа. Вся операционная
     работа с кабинетами и объявлениями остаётся внутри окна площадки. */
  function tiles(v, id) {
    ctx = { id, v };
    const tile = (board) => {
      const b = BOARDS[board], connected = !!USER_CONNECTED[board];
      return `<button type="button" class="ve68-source-tile ${connected ? 'connected' : 'disconnected'}" data-action="publication-board" data-board="${board}">${logo(board)}<span class="ve68-source-copy"><b>${esc(b.name)}</b></span><span class="ve68-source-side"><em>${connected ? 'Подключено' : 'Не подключено'}</em><i aria-hidden="true">→</i></span></button>`;
    };
    return `<section class="vacancy-overview-section ve68-publications"><div class="drawer-section-head"><div><h3>Публикации на работных сайтах</h3><p>Подключите свой аккаунт площадки, чтобы публиковать вакансии и получать отклики в ATS.</p></div></div><div class="ve68-source-grid">${['hh', 'avito', 'superjob'].map(tile).join('')}</div></section>`;
  }

  function boardSection(v, id, board) {
    ctx = { id, v };
    const b = BOARDS[board] || BOARDS.hh, connected = !!USER_CONNECTED[board], list = pubs(id).filter((p) => cab(p.cab).board === board), mgr = isManager();
    const cabinets = CABINETS.filter((c) => c.board === board), usableCabinets = cabinets.filter(usable);
    const cabinetsText = usableCabinets.length ? usableCabinets.map((c) => `«${esc(c.name)}»`).join(', ') : 'Нет доступного кабинета';
    const integration = `<div class="ve68-integration"><div>${logo(board)}<span><b>${connected ? 'Аккаунт подключён' : 'Аккаунт не подключён'}</b><small>${connected ? cabinetsText : `Войдите в ${esc(b.name)} под своим аккаунтом`}</small></span></div><button type="button" class="btn" data-action="publication-integrations" data-board="${board}" data-connected="${connected}">${connected ? 'Настройки подключения' : 'Подключить'}</button></div>`;
    if (!connected) return `<section class="vacancy-overview-section publications-section pub-section ve68-board-section" id="pub-section" data-pub-board-detail="${board}"><div class="drawer-section-head"><div><h3>${esc(b.name)}</h3><p>Подключение личного аккаунта площадки.</p></div></div>${integration}<div class="ve68-connect-empty"><span class="ve68-connect-icon">↗</span><h4>Войдите в ${esc(b.name)}</h4><p>После авторизации здесь появятся доступные кабинеты, публикации и история отправок.</p><button type="button" class="btn primary" data-action="publication-integrations" data-board="${board}" data-connected="false">Подключить аккаунт</button></div></section>`;
    const current = list.find((p) => p.state === 'published');
    const noNew = paused() ? 'disabled title="Вакансия на паузе: новые публикации недоступны"' : '';
    const primaryActions = mgr ? '' : `<div class="ve68-board-cta">${usableCabinets.length ? btn('Опубликовать', 'publish', 've68-publish-main', `data-board="${board}" ${noNew}`) : ''}${usableCabinets.some((c) => c.can.attach) ? btn('Привязать текущую', 'attach', 've68-attach-main', `data-board="${board}"`) : ''}</div>`;
    const currentBlock = current ? currentPublicationCard(current) : '<div class="ve68-no-current"><b>Сейчас ничего не опубликовано</b><small>Все прежние отправки и ответы площадки доступны в истории изменений.</small></div>';
    const drafts = list.filter((p) => p.state === 'draft').map((p) => `<article class="pub-draft-card"><div><b>Черновик · ${esc(cab(p.cab).name)}${p.area ? ` · ${esc(p.area)}` : ''}</b><small>Сохранён ${esc(p.savedAt || '')}. На площадку не отправлен.</small></div>${mgr ? '' : btn('Продолжить черновик', 'continue', '', `data-id="${p.id}" ${noNew}`)}</article>`).join('');
    return `<section class="vacancy-overview-section publications-section pub-section ve68-board-section" id="pub-section" data-pub-board-detail="${board}"><div class="ve68-board-tools">${integration}${primaryActions}</div>${currentBlock}${drafts}${changeHistory(list, current)}</section>`;
  }

  /* Публикация размещена, а сведения вакансии изменились после её последней отправки. */
  const isStale = (p) => !!p.vacStale && ['published', 'paused'].includes(p.state);

  function refresh() {
    const el = document.getElementById('pub-section');
    if (el && ctx.v) el.outerHTML = el.dataset.pubBoardDetail ? boardSection(ctx.v, ctx.id, el.dataset.pubBoardDetail) : section(ctx.v, ctx.id);
  }

  /* ── Окно (своё, поверх панели вакансии) ─────────────────────────── */
  let dlg;
  function dialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'pub-dialog';
    dlg.className = 'modal pub-modal';
    dlg.setAttribute('aria-labelledby', 'pub-title');
    dlg.innerHTML = '<header class="ant-modal-header"><div><h2 id="pub-title" class="ant-modal-title"></h2><p id="pub-sub"></p></div><button type="button" class="icon-btn" data-pub="close" aria-label="Закрыть">×</button></header><div class="modal-body ant-modal-body" id="pub-body"></div><footer class="ant-modal-footer" id="pub-foot"></footer>';
    document.body.append(dlg);
    return dlg;
  }
  function open({ title, sub = '', body, foot = '', size = '' }) {
    const d = dialog(), bodyEl = d.querySelector('#pub-body');
    /* Перерисовка того же окна (выбор радио, вкладка) сохраняет прокрутку. */
    const same = d.open && d.querySelector('#pub-title').textContent === title, top = same ? bodyEl.scrollTop : 0;
    /* Только размер: классы окна antd слой ставит один раз, перезапись className их стёрла бы. */
    d.classList.remove('mid', 'narrow');
    if (size) d.classList.add(size);
    d.querySelector('#pub-title').textContent = title;
    d.querySelector('#pub-sub').textContent = sub;
    bodyEl.innerHTML = body;
    d.querySelector('#pub-foot').innerHTML = foot;
    if (!d.open) d.showModal();
    bodyEl.scrollTop = top;
  }
  const close = () => dlg?.open && dlg.close();
  const setFoot = (html) => { dialog().querySelector('#pub-foot').innerHTML = html; };

  let previewDlg;
  function fullPreviewDialog() {
    if (previewDlg) return previewDlg;
    previewDlg = document.createElement('dialog');
    previewDlg.id = 'pub-preview-dialog';
    previewDlg.className = 'modal pub-modal pub-preview-modal';
    previewDlg.setAttribute('aria-labelledby', 'pub-preview-title');
    previewDlg.innerHTML = '<header class="ant-modal-header"><div><h2 id="pub-preview-title" class="ant-modal-title">Предпросмотр публикации</h2><p id="pub-preview-sub"></p></div><button type="button" class="icon-btn" data-pub="preview-close" aria-label="Закрыть">×</button></header><div class="modal-body ant-modal-body" id="pub-preview-full-body"></div><footer class="ant-modal-footer"><button type="button" class="btn primary" data-pub="preview-close">Вернуться к редактированию</button></footer>';
    document.body.append(previewDlg);
    return previewDlg;
  }
  function openFullPreview() {
    if (!flow?.targets?.length) return;
    const t = flow.targets[flow.tab], c = cab(t.cab), d = fullPreviewDialog();
    d.querySelector('#pub-preview-sub').textContent = `${profile(flow.vac).title} · ${BOARDS[c.board].short} · предпросмотр данных, не финальная страница площадки`;
    d.querySelector('#pub-preview-full-body').innerHTML = preview(t, true);
    if (!d.open) d.showModal();
  }
  const closeFullPreview = () => previewDlg?.open && previewDlg.close();

  /* ── Публикация: выбор → форма → проверка ──────────────────────── */
  let flow = null; // {mode, vac, picked:Set, targets:[], tab, confirm, pubId}

  /* Одна вакансия может иметь несколько публикаций в одном кабинете (например, по городам):
     уже существующие показываются справкой, а не запретом. Дубль может отклонить площадка. */
  function existingIn(cabId) { return pubs(ctx.id).filter((p) => p.cab === cabId && p.id !== flow?.pubId && !['withdrawn', 'expired'].includes(p.state)); }

  function chooseRows() {
    const boards = flow.board ? [flow.board] : ORDER;
    return boards.map((board) => {
      const b = BOARDS[board];
      if (!b.connected) return `<p class="pub-off-line">${logo(board, true)}<span><b>${esc(b.name)}</b> — площадка не подключена к компании. Подключает администратор в\u00a0настройках.</span></p>`;
      const rows = CABINETS.filter((c) => c.board === board && (!flow.board || usable(c))).map((c) => {
        const ex = existingIn(c.id);
        const off = !!c.why, checked = !off && flow.picked.has(c.id);
        const side = off ? '' : c.types ? `В пакетах: ${c.types.map(([n]) => NBSP(`${n} ${left(c.id, n)}`)).join(' · ')}` : c.board === 'avito' ? 'Оплата за отклики' : 'По тарифу кабинета';
        const note = !off && !c.types && c.price ? `<small>${esc(c.price)}</small>` : '';
        const exNote = !off && ex.length ? `<small class="pub-exist">Уже есть: ${ex.map((p) => `${esc(STATE[p.state].label.toLowerCase())}${p.area ? ` · ${esc(p.area)}` : ''}`).join('; ')}. Новая публикация — отдельное размещение, например в другом городе; площадка может отклонить дубль.</small>` : '';
        return `<label class="pub-cab${off ? ' is-off' : ''}${checked ? ' is-checked' : ''}"><input type="checkbox" data-pub-pick="${c.id}" ${checked ? 'checked' : ''} ${off ? 'disabled' : ''} aria-label="${esc(b.name)} · ${esc(c.name)}">${logo(board, off)}<div><b>Кабинет «${esc(c.name)}»</b><small>${esc(c.legal)}</small>${note}${exNote}${off ? `<small class="pub-why">${esc(c.why)}</small>` : ''}</div><span class="pub-cab-side">${side}</span></label>`;
      }).join('');
      return `<div class="pub-board-group"><h4>${esc(b.name)}</h4>${rows || '<p class="pub-note">Нет доступных кабинетов для публикации.</p>'}</div>`;
    }).join('');
  }

  function openPublish(board) {
    /* Пауза вакансии блокирует новые публикации — vacancy.md, «Пауза». */
    if (paused()) { toast('Вакансия на паузе: новые публикации недоступны'); return; }
    flow = { mode: 'new', vac: ctx.id, board, picked: new Set(), targets: [], tab: 0, confirm: false };
    if (board) { const c = CABINETS.find((x) => usable(x) && x.board === board); if (c) flow.picked.add(c.id); }
    renderChoose();
  }

  function renderChoose() {
    const n = flow.picked.size, b = flow.board ? BOARDS[flow.board] : null;
    open({ title: b ? `Опубликовать на ${b.name}` : 'Опубликовать вакансию', sub: `${profile(flow.vac).title} · ${b ? 'выберите доступный кабинет' : 'выберите площадки и кабинеты'}`, size: 'mid',
      body: `${steps(STEPS, 0)}<div class="pub-choose">${chooseRows()}</div><p class="pub-note">${b ? `Показаны только доступные вам кабинеты ${esc(b.name)}.` : 'Показаны все кабинеты компании. Недоступный кабинет не скрыт — рядом причина.'} На каждый выбранный кабинет будет своя форма, свой предпросмотр и свой результат.</p>`,
      foot: `<span class="pub-foot-note">${n ? `Выбрано: <b>${n}</b>` : 'Выберите хотя бы один кабинет'}</span>${btn('Отмена', 'close')}${btn('Далее: поля объявления', 'to-form', 'primary', n ? '' : 'disabled')}` });
  }

  function makeTarget(cabId, base) {
    const c = cab(cabId), p = profile(flow.vac), vals = {}, own = {};
    for (const f of FIELDS[c.board]) vals[f.k] = f.src ? JSON.parse(JSON.stringify(f.src(p))) : '';
    if (base?.data) Object.assign(vals, JSON.parse(JSON.stringify(base.data)));
    if (base?.own) Object.assign(own, base.own);
    if (base?.area && c.board === 'hh') vals.area = base.area;
    if (base?.type && c.types) vals.pubtype = base.type;
    if (c.board === 'hh') {
      /* Дополняем прежние локальные черновики, не стирая их ручных значений. */
      const legacyEmployment = vals.employment;
      vals.employment = ({ 'Полная занятость': 'Полная', 'Частичная занятость': 'Частичная', 'Проектная работа': 'Проект', 'Стажировка': 'Полная' }[legacyEmployment] || legacyEmployment);
      if (legacyEmployment === 'Стажировка') vals.internship = true;
      if (['Проект', 'Подработка'].includes(vals.employment)) vals.duration = 'Временный';
      vals.format = Array.isArray(vals.format) ? vals.format : vals.format ? [vals.format] : [];
      vals.salary = { currency: '₽', mode: 'За месяц', frequency: '', gross: 'до вычета', ...vals.salary };
      vals.languages = Array.isArray(vals.languages) ? vals.languages : [];
    }
    const templates = HH_TEMPLATES[c.id] || [];
    return { cab: cabId, vals, own, intake: base?.intake || INTAKE[0], template: base?.template || templates[0]?.id || '' };
  }

  const visible = (f, v) => !f.show || f.show(v);
  const options = (f, v) => typeof f.opts === 'function' ? f.opts(v) : f.opts || [];
  const required = (f, v) => !!(f.req || f.reqWhen?.(v));
  const money = (v) => Number(String(v ?? '').replace(/[\s ]/g, ''));
  function issue(t, f) {
    const v = t.vals[f.k], all = t.vals;
    if (!visible(f, all)) return '';
    if (f.type === 'salary') {
      if (!(v?.from || v?.to)) return f.req ? 'Укажите хотя бы одну границу дохода.' : '';
      if ([v.from, v.to].some((n) => n && (!/^[\d\s ]+$/.test(n) || money(n) <= 0))) return 'Доход — положительное число, без букв и знаков.';
      if (v.from && v.to && money(v.from) > money(v.to)) return 'Нижняя граница дохода не может быть выше верхней.';
      if (cab(t.cab).board === 'hh' && (!v.currency || !v.mode || !v.gross)) return 'Выберите валюту, период оплаты и учёт налогов.';
      return '';
    }
    if (required(f, all) && !(Array.isArray(v) ? v.length : String(v || '').trim())) return 'Обязательное поле: укажите значение.';
    if (!v || (Array.isArray(v) && !v.length)) return '';
    if (f.min && String(v).trim().length < f.min) return `Не менее ${f.min} знаков.`;
    if (f.max && String(v).length > f.max) return `Не более ${f.max} знаков.`;
    if (['select', 'radio'].includes(f.type) && !options(f, all).includes(v)) return 'Прежнее значение отсутствует в текущем справочнике — выберите заново.';
    if (f.type === 'multi' && (!Array.isArray(v) || v.some((x) => !options(f, all).includes(x)))) return 'Выбранный вариант не совместим с текущими условиями работы.';
    if (f.k === 'skills' && String(v).split(',').filter((x) => x.trim()).length > 15) return 'В просмотренной форме hh.ru можно указать до 15 навыков.';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Проверьте email.';
    if (['contactPhone', 'contactPhone2'].includes(f.k) && (!/^\+\d[\d\s()\-]{8,24}$/.test(v) || String(v).replace(/\D/g, '').length < 10 || String(v).replace(/\D/g, '').length > 15)) return 'Укажите телефон с кодом страны, от 10 до 15 цифр, начиная с +.';
    if (f.type === 'languages' && v.some((x) => !x.name || !x.level)) return 'Для каждого языка выберите название и уровень.';
    if (f.type === 'languages' && new Set(v.map((x) => x.name)).size !== v.length) return 'Каждый язык указывается один раз.';
    return '';
  }
  function availabilityIssue(t) {
    const c = cab(t.cab);
    if (!usable(c)) return c.why || 'Кабинет не может публиковать.';
    if (c.board === 'avito') return 'Форма Авито не проверена: доступен только черновик.';
    if (c.board === 'hh' && t.vals.anon) return 'Доступность и стоимость анонимной публикации не подтверждены кабинетом.';
    if (c.types && flow?.mode !== 'edit' && left(c.id, t.vals.pubtype) < 1) return 'Нет подходящего пакета публикаций.';
    return '';
  }
  function missing(t) {
    const list = FIELDS[cab(t.cab).board].filter((f) => issue(t, f));
    const reason = availabilityIssue(t);
    return reason ? [...list, { k: '_availability', l: reason }] : list;
  }
  function sentValues(t) {
    const v = t.vals;
    return Object.fromEntries(FIELDS[cab(t.cab).board].filter((f) => visible(f, v)).map((f) => [f.k, JSON.parse(JSON.stringify(v[f.k]))]));
  }
  const baseValue = (f) => (f.src ? f.src(profile(flow.vac)) : undefined);
  const mapped = (f) => { const b = baseValue(f); return b !== undefined && b !== '' && b !== null; };
  const problemFields = (t) => (flow.fixProblem && flow.targets[0] === t ? flow.fixProblem.fields || [] : []);

  function fieldHTML(t, f, ti) {
    if (!visible(f, t.vals)) return '';
    const c = cab(t.cab), v = t.vals[f.k], board = BOARDS[c.board].short, error = issue(t, f), miss = !!error, prob = problemFields(t).includes(f.k);
    const locked = flow.mode === 'edit' && f.lock;
    const bad = miss || prob;
    /* Ошибка поля — пропсом компонента (status=error), а не своей рамкой. */
    const attr = `data-pubf="${f.k}" data-t="${ti}"${locked ? ' disabled' : ''}${bad ? ' data-antd-props="status=error"' : ''}`;
    const fid = `pubf-${ti}-${f.k}`;
    let ctrl = '';
    if (['text', 'email'].includes(f.type)) ctrl = `<input type="${f.type}" id="${fid}" ${attr} value="${esc(v)}">`;
    else if (f.type === 'select') ctrl = `<select id="${fid}" ${attr}><option value="">${required(f, t.vals) ? 'Выберите…' : 'Не выбрано'}</option>${options(f, t.vals).map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (['radio', 'multi'].includes(f.type)) ctrl = `<div class="pub-option-list">${options(f, t.vals).map((o) => `<label class="pub-option${(f.type === 'multi' ? Array.isArray(v) && v.includes(o) : v === o) ? ' selected' : ''}"><input type="${f.type === 'multi' ? 'checkbox' : 'radio'}" name="${fid}" ${attr} value="${esc(o)}" ${(f.type === 'multi' ? Array.isArray(v) && v.includes(o) : v === o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
    else if (f.type === 'textarea') ctrl = `<textarea id="${fid}" ${attr} rows="7">${esc(v)}</textarea>`;
    else if (f.type === 'check') ctrl = `<label class="pub-check"><input type="checkbox" id="${fid}" ${attr} ${v ? 'checked' : ''}><span>${esc(f.l)}</span></label>`;
    else if (f.type === 'salary') {
      const select = (part, label, opts) => `<label>${label}<select ${attr} data-part="${part}" aria-label="${label}">${opts.map((o) => `<option value="${esc(o)}" ${v?.[part] === o ? 'selected' : ''}>${esc(o || 'Не выбрано')}</option>`).join('')}</select></label>`;
      ctrl = `<div class="pub-salary"><label>От<input type="text" inputmode="numeric" ${attr} data-part="from" placeholder="Не указано" value="${esc(v?.from)}" aria-label="Зарплата от"></label><label>До<input type="text" inputmode="numeric" ${attr} data-part="to" placeholder="Не указано" value="${esc(v?.to)}" aria-label="Зарплата до"></label>${select('gross', 'Налоги', ['до вычета', 'на руки'])}</div>${c.board === 'hh' ? `<div class="pub-salary">${select('currency', 'Валюта', ['₽', 'USD', 'EUR', 'KZT', 'BYN', 'UZS', 'KGS', 'AZN', 'UAH'])}${select('mode', 'Период оплаты', ['За месяц', 'За смену', 'За час', 'За вахту', 'За услугу'])}${select('frequency', 'Частота выплат', ['', 'Ежедневно', 'Еженедельно', 'Дважды в месяц', 'Раз в месяц', 'По завершении проекта'])}</div>` : ''}`;
    }
    else if (f.type === 'languages') ctrl = `<div class="pub-languages">${(v || []).map((item, i) => `<div class="pub-language"><select ${attr} data-language="${i}" data-part="name" aria-label="Язык ${i + 1}"><option value="">Язык…</option>${['Русский', 'Английский', 'Немецкий', 'Французский', 'Испанский', 'Китайский'].map((o) => `<option ${item.name === o ? 'selected' : ''}>${o}</option>`).join('')}</select><select ${attr} data-language="${i}" data-part="level" aria-label="Уровень языка ${i + 1}"><option value="">Уровень…</option>${['A1 — Начальный', 'A2 — Элементарный', 'B1 — Средний', 'B2 — Средне-продвинутый', 'C1 — Продвинутый', 'C2 — В совершенстве', 'Родной'].map((o) => `<option ${item.level === o ? 'selected' : ''}>${o}</option>`).join('')}</select><button type="button" class="btn" data-pub="language-remove" data-t="${ti}" data-i="${i}" aria-label="Убрать язык ${i + 1}">×</button></div>`).join('')}<button type="button" class="btn" data-pub="language-add" data-t="${ti}">+ Добавить язык</button></div>`;
    else if (f.type === 'pubtype') ctrl = `<div class="pub-types" role="radiogroup" aria-labelledby="${fid}-l">${(c.types || []).map(([n, hint, till]) => `<label class="pub-type${v === n ? ' is-checked' : ''}"><input type="radio" name="pubtype-${ti}" ${attr} value="${esc(n)}" ${v === n ? 'checked' : ''} ${locked || flow.mode === 'edit' ? 'disabled' : ''}><span>${esc(NBSP(n))}<small>${esc(hint)}</small></span><span class="pub-left">в пакете ${left(c.id, n)} · ${esc(till)}</span></label>`).join('')}</div>`;
    const len = f.type === 'textarea' || f.max ? ` · ${String(v || '').length}${f.max ? ` из ${f.max}` : ''} знаков` : '';
    let src;
    if (locked) src = `<small class="pub-src">${esc(f.lock)}.</small>`;
    else if (prob) src = `<small class="pub-src bad">Это поле отметила площадка: ${esc(flow.fixProblem?.text || '')}${flow.fixProblem?.snippet ? ` Место в тексте: «${esc(flow.fixProblem.snippet)}» — подсвечено в предпросмотре.` : ''}</small>`;
    else if (miss) src = `<small class="pub-src bad">${esc(error)}${f.missText && !v ? ` ${esc(f.missText(profile(flow.vac)))}` : ''}</small>`;
    else if (miss && f.max && String(v || '').length > f.max) src = `<small class="pub-src bad">На ${esc(board)} не длиннее ${f.max} знаков${len}.</small>`;
    else if (miss && !mapped(f)) src = `<small class="pub-src bad">Обязательно на ${esc(board)}. Соответствия в настройках нет — выберите здесь. Без значения не уйдёт только эта публикация.</small>`;
    else if (miss) src = `<small class="pub-src bad">Обязательно на ${esc(board)}${f.min ? ` · не короче ${f.min} знаков` : ''}${len}.</small>`;
    else if (f.type === 'pubtype') src = `<small class="pub-src">${flow.mode === 'edit' ? 'Тип публикации при изменении не меняется — списания нет.' : 'Спишется из пакета кабинета в момент публикации. Один город — одна публикация.'}</small>`;
    else if (f.type === 'check') src = '';
    else if (!mapped(f) && v) src = `<small class="pub-src own">Выбрано для этой публикации. Чтобы подставлялось само, нужно соответствие в настройках.</small>`;
    else if (!mapped(f)) src = `<small class="pub-src">Ручная настройка для этой публикации · не подставляется из вакансии</small>`;
    else if (t.own[f.k]) src = `<small class="pub-src own">Своё значение для ${esc(board)} — сохранится, пока вы его не замените. <button type="button" data-pub="reset-field" data-t="${ti}" data-k="${f.k}">${f.k === 'salary' && c.board === 'hh' ? 'Очистить публичный доход' : 'Вернуть из вакансии'}</button></small>`;
    else src = `<small class="pub-src">${f.from ? esc(f.from) : 'Настройка этой публикации'}${len}</small>`;
    const help = f.help && !locked ? `<small class="pub-src">${esc(f.help)}</small>` : '';
    /* Поле из нескольких элементов (зарплата, тип публикации, флажок) — группа без <label>:
       вложенные подписи не нужны. */
    const group = ['salary', 'pubtype', 'check', 'radio', 'multi', 'languages'].includes(f.type);
    const head = `<span id="${fid}-l">${f.type === 'check' ? '' : esc(f.l)}${required(f, t.vals) ? '<em>*</em>' : ''}</span>`;
    return group
      ? `<div class="pub-field${f.wide ? ' wide' : ''}${bad ? ' has-error' : ''}" role="group" aria-labelledby="${fid}-l" data-k="${f.k}">${head}${ctrl}${src}${help}</div>`
      : `<div class="pub-field${f.wide ? ' wide' : ''}${bad ? ' has-error' : ''}" data-k="${f.k}"><label for="${fid}" id="${fid}-l">${esc(f.l)}${required(f, t.vals) ? '<em>*</em>' : ''}</label>${ctrl}${src}${help}</div>`;
  }

  function atsBlock(t, ti) {
    return `<div class="pub-field wide pub-ats-settings" data-k="intake"><label for="pub-intake-${ti}">Приём откликов с этой публикации <small class="pub-tagline">в ATS, на площадку не отправляется</small></label><select id="pub-intake-${ti}" data-pub-intake="${ti}">${INTAKE.map((o) => `<option ${o === t.intake ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select><small class="pub-src">Переопределяет настройку вакансии и компании. «С подтверждением» — отклик ждёт решения рекрутера, прежде чем попасть в воронку.</small></div>`;
  }

  function templateField(t, ti) {
    const c = cab(t.cab), templates = HH_TEMPLATES[c.id] || [];
    if (c.board !== 'hh' || !templates.length) return '';
    return `<div class="pub-field wide pub-template-field" data-k="template"><label for="pub-template-${ti}">Оформление предпросмотра (демо)</label><select id="pub-template-${ti}" data-pub-template="${ti}">${templates.map((item) => `<option value="${item.id}" ${item.id === t.template ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select><small class="pub-template-source">Это демонстрационные оформления, не загруженные шаблоны hh.ru. API списка брендшаблонов не возвращает их макет; точный внешний вид проверяется на площадке.</small></div>`;
  }

  function salaryText(s) {
    if (!s || !(s.from || s.to)) return '';
    const a = s.from ? `от ${s.from}` : '', b = s.to ? `до ${s.to}` : '';
    return `${[a, b].filter(Boolean).join(' ')} ${s.currency || '₽'} ${s.gross === 'до вычета' ? 'до вычета налогов' : s.gross || ''}${s.mode ? ` · ${s.mode.toLowerCase()}` : ''}`.trim();
  }
  function displayValue(v) {
    if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
    if (Array.isArray(v)) return v.map((x) => typeof x === 'object' ? `${x.name || '—'}: ${x.level || '—'}` : x).join(', ') || 'Не указано';
    if (v && typeof v === 'object') return salaryText(v) || 'Не указан';
    return String(v || 'Не указано');
  }

  /* Текст объявления: телефон не рвётся, проблемное место площадки подсвечено. */
  function adText(text, snippet) {
    let h = esc(text || '');
    if (snippet) h = h.replace(esc(snippet), `<mark class="pub-ad-mark">${esc(snippet)}</mark>`);
    return h.replace(/\+7 (\d{3}) (\d{3})-(\d{2})-(\d{2})/g, '+7 $1 $2‑$3‑$4');
  }

  function preview(t, full = false) {
    const c = cab(t.cab), b = c.board, v = t.vals, miss = (k) => `<span class="pub-ad-missing">не заполнено: ${esc(fieldLabel(b, k))}</span>`;
    const templates = HH_TEMPLATES[c.id] || [], template = templates.find((item) => item.id === t.template) || templates[0] || { id: 'classic', name: '' };
    const sal = salaryText(v.salary);
    const meta = b === 'hh' ? [v.exp ? `Требуемый опыт работы: ${esc(v.exp.toLowerCase())}` : '', [v.employment ? `${v.employment} занятость` : '', ...(Array.isArray(v.format) ? v.format : [v.format])].filter(Boolean).map(esc).join(', '), v.area ? esc(v.area) : miss('area'), !v.hideAddress && !v.anon && v.address ? esc(v.address) : '', v.schedule?.length ? `График: ${esc(v.schedule.join(', '))}` : '', v.hours?.length ? `Рабочие часы: ${esc(v.hours.join(', '))}` : '', v.night ? 'Вечерние или ночные смены' : '', v.employment === 'Вахта' && v.shiftDuration?.length ? `Вахта: ${esc(v.shiftDuration.join(', '))} дней` : '', v.salary?.frequency ? `Выплаты: ${esc(v.salary.frequency.toLowerCase())}` : '', v.laborContract ? 'Трудовой договор' : '', v.internship && v.employment !== 'Вахта' ? 'Стажировка' : '', v.civilContracts?.length ? `ГПХ: ${esc(v.civilContracts.join(', '))}` : '', ...(v.languages || []).filter((x) => x.name).map((x) => `${esc(x.name)} — ${esc(x.level)}`), v.license?.length ? `Права: ${esc(v.license.join(', '))}` : '', v.showContacts ? `Контакты: ${[v.contactName, v.contactPhone, v.contactEmail].filter(Boolean).map(esc).join(' · ')}` : '', v.role ? '' : miss('role')].filter(Boolean)
      : b === 'avito' ? [`Опыт: ${esc((v.exp || '').toLowerCase())}`, `График: ${esc((v.schedule || '').toLowerCase())}`, esc(v.address || '')]
        : [`Опыт работы: ${esc((v.exp || '').toLowerCase())}`, esc(v.work || ''), esc(v.town || '')];
    const skills = b === 'hh' && v.skills ? `<div class="pub-ad-skills">${String(v.skills).split(',').map((s) => s.trim()).filter(Boolean).map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : '';
    if (b === 'hh' && v.showContacts && v.contactPhone2) meta.push(`Дополнительный телефон: ${esc(v.contactPhone2)}`);
    const company = b === 'hh' && v.anon ? '<div class="pub-ad-company muted">Компания скрыта работодателем</div>' : `<div class="pub-ad-company">${esc(c.legal)}</div>`;
    const snippet = flow?.fixProblem?.snippet;
    const hero = b === 'hh' && template.id !== 'classic' ? `<div class="pub-ad-template-hero"><span>ДЕМО ТЕХНОЛОГИИ</span><small>Разрабатываем продукты, которыми пользуются миллионы</small></div>` : '';
    const card = `<div class="pub-ad ${BOARDS[b].cls}${b === 'hh' ? ` template-${template.id}` : ''}"><div class="pub-ad-top"></div>${hero}<div class="pub-ad-body"><h3>${esc(v.title || '') || miss('title')}</h3><p class="pub-ad-salary${sal ? '' : ' empty'}">${sal ? esc(sal) : 'Уровень дохода не указан'}</p><div class="pub-ad-meta">${meta.map((m) => `<span>${m}</span>`).join('')}</div>${company}<div class="pub-ad-text${snippet ? ' full' : ''}">${adText(v.text, snippet)}</div>${skills}${b === 'hh' && v.closed ? '<p class="pub-preview-note">Отклики соискателей закрыты</p>' : '<span class="pub-ad-btn">Откликнуться</span>'}</div></div>`;
    const action = full ? '' : 'role="button" tabindex="0" data-pub="preview-full" aria-label="Открыть предпросмотр на весь экран"';
    return `<div class="pub-preview-label"><span>Предпросмотр данных · ${esc(BOARDS[b].short)}</span><span>${b === 'hh' && v.pubtype ? esc(NBSP(v.pubtype)) : ''}</span></div><div class="pub-preview-scroll${full ? ' is-full' : ''}" ${action}>${card}</div><p class="pub-preview-note">${b === 'avito' ? 'Форма и внешний вид Авито пока не проверены. Это набросок, отправка недоступна.' : 'Расположение блоков, оформление и модерацию определяет площадка. Это не точная копия её страницы.'}${full ? '' : ' Нажмите, чтобы открыть и прокрутить предпросмотр целиком.'}</p>`;
  }

  function tabsHTML() {
    if (flow.targets.length < 2) return '';
    return `<nav class="ws-tabs pub-tabs" role="tablist" aria-label="Площадки">${flow.targets.map((t, i) => { const m = missing(t).length; return `<button type="button" role="tab" aria-selected="${i === flow.tab}" class="${i === flow.tab ? 'active' : ''}" data-pub="tab" data-i="${i}">${esc(BOARDS[cab(t.cab).board].short)} · «${esc(cab(t.cab).name)}» ${m ? `<span class="pill danger">${m} ${plural(m, 'поле', 'поля', 'полей')}</span>` : '<span class="pill good">готово</span>'}</button>`; }).join('')}</nav>`;
  }

  function formBody() {
    const t = flow.targets[flow.tab], c = cab(t.cab), board = BOARDS[c.board].short, p = flow.pubId ? findPub(flow.pubId) : null;
    const top = [
      c.board === 'hh' ? alert('info', 'Поля сверены с формой hh.ru', 'Условия и оплату разделили как на площадке. Справочники, адреса, тесты и пакеты в этом макете демонстрационные; в продукте их нужно получать из выбранного кабинета.') : '',
      c.board === 'avito' ? alert('warning', 'Авито: только подготовка черновика', 'Нет доступа к форме работодателя и подтверждённой схеме. Поля ниже — прежний набросок, обязательность и ограничения не проверены. Ничего не отправляем, пока не сверим форму.') : '',
      flow.mode === 'fix' ? alert('error', `${board} отклонило объявление ${flow.fixProblem.at || ''}`.trim(), esc(flow.fixProblem.text)) : '',
      flow.mode === 'repost' ? alert('warning', 'Новое размещение', `Прежнее объявление № ${esc(p?.extId || '—')} останется в истории со своими откликами — эта публикация будет новой. Размещение может быть платным.`) : '',
    ].filter(Boolean).map((x) => `<div class="pub-lead">${x}</div>`).join('');
    const m = missing(t);
    const summary = m.length ? alert('warning', `Проверьте перед отправкой: ${m.map((f) => f.l).join(', ')}`, 'Незаполненные поля, ошибки и недоступные услуги задерживают только эту публикацию.') : '';
    const fields = c.board === 'hh' ? HH_SECTIONS.map((name, si) => `<section class="pub-field-section"><h3>${esc(name)}</h3><div class="pub-form">${FIELDS.hh.filter((f) => f.section === si).map((f) => fieldHTML(t, f, flow.tab)).join('')}${si === 8 ? templateField(t, flow.tab) : ''}</div></section>`).join('') : `<div class="pub-form">${FIELDS[c.board].map((f) => fieldHTML(t, f, flow.tab)).join('')}</div>`;
    return `${flow.mode === 'edit' ? '' : steps(STEPS, 1)}${tabsHTML()}${top}<div class="pub-form-layout"><div><div id="pub-form-summary" class="${m.length ? 'pub-lead' : ''}">${summary}</div>${fields}<div class="pub-form">${atsBlock(t, flow.tab)}</div></div><div class="pub-preview-col" id="pub-preview">${preview(t)}</div></div>`;
  }

  function formFoot() {
    const ready = flow.targets.filter((t) => !missing(t).length).length, all = flow.targets.length;
    const label = flow.mode === 'edit' ? 'Проверить изменения' : flow.mode === 'fix' ? 'Проверить и отправить снова' : 'Проверить и отправить';
    const note = all > 1 ? `Готово к отправке: <b>${ready} из ${all}</b>` : ready ? 'Данные проверены · готово к проверке отправки' : cab(flow.targets[0].cab).board === 'avito' ? 'Авито: доступен только черновик' : 'Проверьте данные и доступность услуги';
    const back = flow.mode === 'new' ? btn('Назад', 'to-choose') : btn('Отмена', 'close');
    return `<span class="pub-foot-note">${note}</span>${back}${flow.mode === 'edit' ? '' : btn('Сохранить черновик', 'save-draft')}${btn(label, 'to-review', 'primary', ready ? '' : 'disabled')}`;
  }

  function formTitle() {
    const c = cab(flow.targets[flow.tab].cab), b = BOARDS[c.board].short;
    return flow.mode === 'edit' ? `Изменить публикацию на ${b}` : flow.mode === 'fix' ? `Исправить публикацию на ${b}` : flow.mode === 'repost' ? `Разместить снова на ${b}` : 'Опубликовать вакансию';
  }
  function renderForm() {
    open({ title: formTitle(), sub: `${profile(flow.vac).title} · поля под площадку и предпросмотр до отправки`, body: formBody(), foot: formFoot() });
  }

  function updateFormLive() {
    const t = flow.targets[flow.tab];
    const pv = document.getElementById('pub-preview'); if (pv) pv.innerHTML = preview(t);
    const c = cab(t.cab), m = missing(t), board = BOARDS[c.board].short;
    const sum = document.getElementById('pub-form-summary');
    if (sum) { sum.innerHTML = m.length ? alert('warning', `Проверьте перед отправкой: ${m.map((f) => f.l).join(', ')}`, 'Незаполненные поля, ошибки и недоступные услуги задерживают только эту публикацию.') : ''; sum.className = m.length ? 'pub-lead' : ''; }
    const nav = document.querySelector('#pub-body .pub-tabs'); if (nav) nav.outerHTML = tabsHTML();
    setFoot(formFoot());
  }

  /* Стоимость отправки по кабинету. Ручная отправка с платным списанием — всегда с согласием
     пользователя (вопрос 25); бесплатная (Авито при оплате за отклики) и изменение — без. */
  function costOf(t) {
    const c = cab(t.cab);
    if (flow.mode === 'edit') return { paid: false, text: 'Изменение без списания' };
    if (c.types) { const n = t.vals.pubtype; return { paid: true, text: `Спишется 1 публикация «${esc(NBSP(n))}»<br>в пакете: ${left(c.id, n)} → ${left(c.id, n) - 1}` }; }
    return { paid: !!c.paid, text: c.cost || '' };
  }
  const readyTargets = () => flow.targets.filter((t) => !missing(t).length);
  const paidAny = () => readyTargets().some((t) => costOf(t).paid);
  const overwritePending = () => !!(flow?.mode === 'edit' && findPub(flow.pubId)?.external && !flow.overwrite);

  function reviewBody() {
    const rows = flow.targets.map((t) => {
      const c = cab(t.cab), b = BOARDS[c.board].short, m = missing(t), cost = m.length ? '' : costOf(t).text;
      const state = m.length ? `<small>Останется черновиком: не заполнено ${m.map((f) => `«${esc(f.l)}»`).join(', ')}. Остальные площадки это не задерживает.</small>` : `<small>${flow.mode === 'edit' ? 'Отправим изменения новой редакцией; площадка может проверить их заново.' : 'Отправим на модерацию. Размещённой публикация станет после ответа площадки.'}</small>`;
      return `<div class="pub-review-row">${logo(c.board, !!m.length)}<div><b>${esc(b)} · кабинет «${esc(c.name)}»${t.vals.area && c.board === 'hh' ? ` · ${esc(t.vals.area)}` : ''}</b>${state}</div><span class="pub-cost">${cost}</span></div>`;
    }).join('');
    const hidden = db.hidden[flow.vac] ? alert('warning', 'Скрытая вакансия станет видна вне ATS', 'В ATS вакансию видят только её участники. После отправки текст и условия увидят все посетители площадки.') : '';
    const pub = alert('info', 'Проверьте публичные данные', 'На площадку уйдут выбранные условия, описание и отдельно заданный доход. Включённые контакты будут публичными. Внутренний бюджет, комментарии, настройки ATS и демооформление не передаются. График и формат работы — разные поля.');
    const payloads = readyTargets().map((t) => `<details class="pub-payload"><summary>Проверить весь состав публикации · ${esc(BOARDS[cab(t.cab).board].short)}</summary><p class="pub-note">Снимок настроек макета, не готовый запрос API. Доступность опций, справочники и ограничения проверяются выбранным кабинетом.</p><dl>${FIELDS[cab(t.cab).board].filter((f) => visible(f, t.vals)).map((f) => `<div><dt>${esc(f.l)}</dt><dd>${esc(displayValue(t.vals[f.k]))}</dd></div>`).join('')}</dl></details>`).join('');
    const paid = paidAny() ? `${alert('warning', 'Платное действие', 'Списание произойдёт в кабинетах площадок. Ручная отправка с платным списанием всегда идёт только с вашего согласия.')}<label class="pub-check"><input type="checkbox" data-pub-confirm ${flow.confirm ? 'checked' : ''}><span>Понимаю, что будут списаны публикации или средства кабинетов, указанные выше</span></label>` : '';
    const overwrite = flow.mode === 'edit' && findPub(flow.pubId)?.external ? `${alert('warning', 'На площадке есть неразобранные изменения', 'Эта отправка заменит их данными формы. Сначала сравните версии или подтвердите замену.')}<label class="pub-check"><input type="checkbox" data-pub-overwrite ${flow.overwrite ? 'checked' : ''}><span>Я проверил версии и подтверждаю замену изменений на площадке</span></label>` : '';
    return `${flow.mode === 'edit' ? '' : steps(STEPS, 2)}<div class="pub-review">${rows}${hidden}${pub}${payloads}${paid}${overwrite}</div>`;
  }

  function reviewFoot() {
    const ready = readyTargets().length;
    const label = flow.mode === 'edit' ? 'Отправить изменения' : ready === 1 ? `Отправить на ${BOARDS[cab(readyTargets()[0].cab).board].short}` : `Отправить на ${ready} ${plural(ready, 'площадку', 'площадки', 'площадок')}`;
    return `<span class="pub-foot-note">${flow.targets.length - ready ? `Не уйдёт: <b>${flow.targets.length - ready}</b> — останется черновиком` : 'Каждая площадка получит свою редакцию'}</span>${btn('Назад к полям', 'to-form')}${btn(label, 'send', 'primary', !ready || paidAny() && !flow.confirm || overwritePending() ? 'disabled' : '')}`;
  }

  function renderReview() {
    open({ title: flow.mode === 'edit' ? 'Проверить изменения' : 'Проверить и отправить', sub: `${profile(flow.vac).title} · отдельный результат по каждой площадке`, size: 'mid', body: reviewBody(), foot: reviewFoot() });
  }

  function blank(cabId) { return { id: newId(), cab: cabId, rev: 0, history: [], resp: [0, 0, 0] }; }

  /* Запись, в которую уходит вкладка формы. Публикация, с которой открыто окно («Изменить»,
     «Исправить», «Продолжить» черновик), — только для своего кабинета: после «Назад» кабинет
     могли сменить, и тогда другой кабинет получает свой черновик или новую запись. */
  function recordFor(t, list) {
    const own = flow.pubId ? findPub(flow.pubId) : null;
    if (own && own.cab === t.cab && (own.state === 'draft' || ['edit', 'fix'].includes(flow.mode))) return own;
    if (['edit', 'fix'].includes(flow.mode)) return null;
    return list.find((x) => x.cab === t.cab && x.state === 'draft' && x !== own && !x.repostOf && (!x.area || x.area === t.vals.area)) || null;
  }

  function send() {
    if (!flow || !readyTargets().length) { toast('Нет готовых к отправке публикаций'); return; }
    if (paidAny() && !flow.confirm) { toast('Сначала подтвердите платное действие'); return; }
    if (overwritePending()) { toast('Сначала сравните версии и подтвердите замену'); return; }
    if (paused() && flow.mode !== 'edit') { toast('Вакансия на паузе: новые публикации недоступны'); return; }
    const list = pubs(flow.vac), ready = readyTargets(), rest = flow.targets.filter((t) => missing(t).length);
    const results = [], multi = ready.length > 1;
    ready.forEach((t) => {
      const c = cab(t.cab), b = BOARDS[c.board].short;
      let p;
      if (flow.mode === 'repost') {
        /* Повторное размещение — новая публикация; прежняя остаётся «Истекла»/«Снята»
           со своим номером объявления и откликами. */
        const old = findPub(flow.pubId); p = blank(t.cab); p.repostOf = old.id; old.repostedTo = p.id; list.push(p);
      } else {
        p = recordFor(t, list);
        if (!p) { p = blank(t.cab); list.push(p); }
      }
      const prevState = p.state;
      p.rev = (p.rev || 0) + 1;
      p.data = sentValues(t); p.own = { ...t.own }; p.intake = t.intake; p.template = t.template;
      p.type = c.types ? t.vals.pubtype : undefined; p.area = c.board === 'hh' ? t.vals.area : undefined;
      p.sentAt = NOW; p.problem = undefined; p.external = false; p.externalKept = false; p.missing = undefined; p.knownRev = undefined; p.vacStale = false; p.sentText = undefined;
      const how = flow.mode === 'edit' ? 'изменение' : flow.mode === 'fix' ? 'исправление после отклонения' : flow.mode === 'repost' ? 'повторное размещение' : 'первая отправка';
      p.history = [rev(p.rev, NOW, 'Елена Крылова', `вручную · ${how}`, 'отправляется', { data: JSON.parse(JSON.stringify(p.data)) }), ...(p.history || [])];
      if (flow.mode === 'edit' && ['published', 'paused'].includes(prevState)) { p.sync = NOW; p.history[0].result = c.board === 'hh' ? 'принята · hh.ru проверит заново' : 'принята'; results.push(`${b}: изменения отправлены редакцией №${p.rev}`); return; }
      if (c.types) db.packs[c.id][t.vals.pubtype] = left(c.id, t.vals.pubtype) - 1;
      p.state = 'sending'; p.sync = undefined; p.until = undefined; p.days = undefined; p.extId = flow.mode === 'fix' ? p.extId : undefined; p.url = undefined;
      /* Демо частичного успеха: при отправке сразу на несколько площадок Авито не отвечает —
         остальные размещения это не откатывает. */
      const fail = multi && c.board === 'avito';
      setTimeout(() => {
        if (fail) { p.state = 'error'; p.sync = NOW; p.raw = 'Нет ответа площадки'; p.problem = { text: 'Авито не ответило на отправку. Объявление не создано, списания не было.' }; p.history[0].result = 'ошибка — нет ответа'; }
        else { p.state = 'moderation'; p.sync = NOW; p.raw = 'На модерации'; p.extId = p.extId || (c.board === 'hh' ? '999045001' : c.board === 'avito' ? '9999077703' : '99903456'); p.history[0].result = 'на модерации'; }
        save(); refresh();
      }, Number(window.__pubSendDelay || 1400));
      results.push(`${b}: отправляется`);
    });
    rest.forEach((t) => {
      const c = cab(t.cab);
      let p = flow.mode === 'repost' ? null : recordFor(t, list);
      if (!p) { p = blank(t.cab); if (flow.mode === 'repost') { p.repostOf = flow.pubId; findPub(flow.pubId).repostedTo = p.id; } list.push(p); }
      Object.assign(p, { state: 'draft', savedAt: NOW, data: JSON.parse(JSON.stringify(t.vals)), own: { ...t.own }, intake: t.intake, template: t.template, area: c.board === 'hh' ? t.vals.area : undefined, missing: missing(t).map((f) => f.l).join(', ') });
      results.push(`${BOARDS[c.board].short}: черновик`);
    });
    save(); close(); refresh(); flow = null;
    toast(results.join(' · '));
  }

  function saveDraft() {
    const list = pubs(flow.vac);
    flow.targets.forEach((t) => {
      const c = cab(t.cab);
      let p = flow.mode === 'repost' ? null : recordFor(t, list);
      if (!p) { p = blank(t.cab); if (flow.mode === 'repost') { p.repostOf = flow.pubId; findPub(flow.pubId).repostedTo = p.id; } list.push(p); }
      if (p.state !== 'rejected') Object.assign(p, { state: 'draft', savedAt: NOW, missing: missing(t).map((f) => f.l).join(', ') || 'ничего — можно отправлять' });
      p.data = JSON.parse(JSON.stringify(t.vals)); p.own = { ...t.own }; p.intake = t.intake; p.template = t.template; if (c.board === 'hh') p.area = t.vals.area;
    });
    save(); close(); refresh(); flow = null;
    toast('Черновик сохранён. Черновики не попадают в историю отправок');
  }

  function openEdit(p, mode) {
    /* Пауза вакансии блокирует всё, что может разместить объявление, которого сейчас нет на
       площадке: черновик, повторное размещение, исправление отклонённой. «Изменить» размещённое — можно. */
    if (mode !== 'edit' && paused()) { toast('Вакансия на паузе: новые публикации недоступны'); return; }
    flow = { mode, vac: ctx.id, picked: new Set([p.cab]), targets: [], tab: 0, confirm: false, pubId: p.id };
    flow.targets = [makeTarget(p.cab, p)];
    if (mode === 'fix') flow.fixProblem = { ...p.problem, at: '6 октября' };
    /* makeTarget сохраняет ручные поля публикации. Ни опыт из грейда, ни новое описание
       поверх своего текста площадки при повторном открытии не придумываются. */
    renderForm();
  }
  const c0 = (p) => cab(p.cab).board;

  /* ── Расхождение ───────────────────────────────────────────────── */
  /* choice — решение отдельно по каждой публикации; pick/replace — обновление по изменению вакансии. */
  let diffState = { tab: 'external', choice: {}, pick: {}, replace: {} };
  const EXT = {
    'p-a1': {
      at: '6 октября, 17:05', by: 'в кабинете hh.ru', found: 'сегодня, 09:12', summary: 'Отличаются зарплата и описание. Данные ATS не перезаписаны, работе это не мешает.',
      rows: [
        ['Зарплата', 'от 350 000 до 420 000 ₽ на руки · своё значение для hh.ru', 'от 300 000 до 400 000 ₽ до вычета налогов'],
        ['Описание · условия', 'гибрид или удалённо, офис в Москве; ДМС, обучение и конференции за счёт компании.', 'гибрид или удалённо, офис в Москве; ДМС, обучение и конференции за счёт компании. <ins>Помогаем с релокацией.</ins>'],
      ], same: 'Остальные 8 полей совпадают: название, роль, город, опыт и другие.',
    },
    'p-a4': {
      at: '5 октября, 12:30', by: 'модератором hh.ru', found: 'сегодня, 09:12', summary: 'Модератор hh.ru убрал зарплату. Данные ATS не перезаписаны, работе это не мешает.',
      rows: [['Зарплата', 'до 420 000 ₽ на руки', '<del>до 420 000 ₽ на руки</del> — уровень дохода не указан']],
      same: 'Остальные 9 полей совпадают.',
    },
  };

  function diffExternal() {
    const list = pubs(ctx.id).filter((p) => p.external && EXT[p.id]);
    if (!list.length) return `<div class="ws-empty empty">Объявления совпадают с данными ATS</div>`;
    return `<p class="pub-note pub-diff-lead">Решение принимается отдельно по каждой публикации. Автоматически «последнее изменение» не выбирается.</p>` + list.map((p) => {
      const c = cab(p.cab), e = EXT[p.id], b = BOARDS[c.board].short, ch = diffState.choice[p.id];
      const choice = (val, title, text) => `<label class="pub-choice${ch === val ? ' is-checked' : ''}"><input type="radio" name="pub-diff-${p.id}" data-pub-choice="${val}" data-id="${p.id}" ${ch === val ? 'checked' : ''}><span><b>${title}</b><small>${text}</small></span></label>`;
      const label = ch === 'accept' ? 'Принять версию площадки' : ch === 'keep' ? 'Оставить расхождение' : ch === 'push' ? `Отправить редакцию №${p.rev + 1}` : 'Выберите решение';
      return `<div class="pub-block" data-diff="${p.id}"><div class="pub-diff-head">${logo(c.board)}<div><b>${esc(where(p))} · кабинет «${esc(c.name)}» · № ${esc(p.extId)}</b><small>Изменено ${esc(e.by)} ${esc(e.at)} · найдено при сверке ${esc(e.found)}</small></div></div><table class="pub-diff-table"><thead><tr><th>Поле</th><th>Отправлено из ATS · редакция №${p.rev}</th><th>Сейчас на ${esc(b)}</th></tr></thead><tbody>${e.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="changed">${r[2]}</td></tr>`).join('')}<tr class="pub-diff-same-row"><td colspan="3">${esc(e.same)}</td></tr></tbody></table><div class="pub-choices" role="radiogroup" aria-label="Решение по ${esc(where(p))}">${choice('accept', 'Принять версию площадки', `Данные публикации в ATS станут как на ${esc(b)}. Сама вакансия не меняется.`)}${choice('push', 'Отправить версию ATS', `На ${esc(b)} уйдёт редакция №${p.rev + 1} с данными ATS. Площадка может проверить её заново.`)}${choice('keep', 'Оставить как есть', 'Ничего не отправляем. Отметка о расхождении останется на публикации.')}</div><div class="pub-block-foot">${btn(label, 'diff-apply', 'primary', `data-id="${p.id}" ${ch ? '' : 'disabled'}`)}</div></div>`;
    }).join('');
  }

  function diffInternal() {
    const list = pubs(ctx.id).filter((p) => !['expired', 'withdrawn'].includes(p.state) || !reposted(p));
    const rows = list.map((p) => {
      const c = cab(p.cab), b = BOARDS[c.board].short, ok = isStale(p);
      const why = !ok ? (['published', 'paused'].includes(p.state) ? `Уже с новыми сведениями — отправлены редакцией №${p.rev}.` : p.state === 'moderation' || p.state === 'sending' ? 'Идёт модерация — изменения можно будет отправить после ответа площадки.' : p.state === 'rejected' ? 'Отклонена — новые данные уйдут при повторной отправке.' : p.state === 'draft' ? 'Черновик — новые данные подставятся при продолжении.' : 'Не размещена — обновлять нечего.') : '';
      if (!(p.id in diffState.pick)) diffState.pick[p.id] = ok;
      const on = ok && diffState.pick[p.id];
      const own = !!p.own?.salary;
      const salNow = own ? `${salaryText(p.data?.salary)} · своё значение для ${b}` : 'до 420 000 ₽ на руки';
      const table = ok ? `<table class="pub-diff-table"><thead><tr><th>Поле</th><th>Сейчас в публикации</th><th>Станет после обновления</th></tr></thead><tbody><tr><td>Требования</td><td>опыт продуктовой разработки от 4 лет</td><td class="changed">опыт продуктовой разработки от <del>4</del> <ins>5</ins> лет; <ins>опыт с KMP — плюс</ins></td></tr><tr><td>Зарплата</td><td>${esc(salNow)}</td><td class="${own && !diffState.replace[p.id] ? '' : 'changed'}">${own && !diffState.replace[p.id] ? `<span class="pub-keep">Своё значение для ${esc(b)} — останется</span>` : 'до 450 000 ₽ на руки'}</td></tr></tbody></table>${own ? `<label class="pub-check pub-replace"><input type="checkbox" data-pub-replace="${p.id}" ${diffState.replace[p.id] ? 'checked' : ''} ${on ? '' : 'disabled'}><span>Заменить своё значение зарплаты на ${esc(b)} значением вакансии</span></label>` : ''}${p.external && !p.externalKept ? `<div class="pub-lead-top">${alert('warning', 'На площадке есть неразобранные изменения — обновление их перезапишет', '', `<div class="pub-alert-actions">${btn('Сравнить', 'diff-tab', 'tiny', 'data-tab="external"')}</div>`)}</div>` : ''}` : '';
      return `<div class="pub-block${ok ? '' : ' is-off'}"><label class="pub-check"><input type="checkbox" data-pub-pickupd="${p.id}" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'}><span><b>${esc(where(p))} · кабинет «${esc(c.name)}»</b> · ${STATE[p.state].label.toLowerCase()}${why ? `<br><small>${esc(why)}</small>` : ''}</span></label>${table}</div>`;
    }).join('');
    return `${alert('info', 'Вакансия изменена 7 октября, 11:20 · Елена Крылова', 'Изменились бюджет (до 450 000 ₽) и требования. Ниже — что получит каждая публикация. Своё значение площадки остаётся, пока вы явно его не замените.')}<div class="pub-diff-list">${rows}</div>`;
  }

  function renderDiff() {
    const extCount = pubs(ctx.id).filter((p) => p.external && EXT[p.id]).length;
    const staleN = pubs(ctx.id).filter(isStale).length, intOn = staleN > 0;
    const tab = (key, label, badge) => `<button type="button" role="tab" aria-selected="${diffState.tab === key}" class="${diffState.tab === key ? 'active' : ''}" data-pub="diff-tab" data-tab="${key}">${label}${badge}</button>`;
    const tabs = `<nav class="ws-tabs pub-tabs" role="tablist" aria-label="Расхождения">${tab('external', 'Изменено на площадке', extCount ? ` <span class="pill warn">${extCount}</span>` : '')}${tab('internal', 'Изменено в вакансии', intOn ? ` <span class="pill purple">${staleN}</span>` : '')}</nav>`;
    const body = tabs + (diffState.tab === 'external' ? diffExternal() : intOn ? diffInternal() : '<div class="ws-empty empty">Вакансия не менялась после последней отправки</div>');
    const n = Object.entries(diffState.pick).filter(([id, v]) => v && findPub(id) && isStale(findPub(id))).length;
    const foot = diffState.tab === 'external'
      ? `<span class="pub-foot-note">Каждая публикация решается своей кнопкой.</span>${btn('Закрыть', 'close')}`
      : `<span class="pub-foot-note">Каждая площадка получит свою редакцию. Неотмеченные объявления не изменятся.</span>${btn('Закрыть', 'close')}${btn(`Обновить ${n} ${plural(n, 'публикацию', 'публикации', 'публикаций')}`, 'diff-update', 'primary', n && intOn ? '' : 'disabled')}`;
    open({ title: 'Расхождения с площадками', sub: `${profile(ctx.id).title} · что отличается и что с этим сделать`, size: 'mid', body, foot });
  }

  /* ── Продление, снятие, пауза ──────────────────────────────────── */
  function openProlong(p) {
    const c = cab(p.cab), b = BOARDS[c.board].short, tp = c.types?.find(([n]) => n === p.type), pol = policy();
    const cost = tp ? `Продление стоит как новая публикация: спишется 1 «${NBSP(tp[0])}» из пакета кабинета «${c.name}» (пакет ${tp[2]}): было ${left(c.id, tp[0])}, станет ${left(c.id, tp[0]) - 1}.` : esc(c.price || 'Стоимость определяет площадка по тарифу кабинета.');
    flow = { mode: 'prolong', pubId: p.id, confirm: false };
    open({ title: `Продлить публикацию на ${b}`, sub: `${profile(ctx.id).title} · ${where(p)} · кабинет «${c.name}»`, size: 'narrow',
      body: `${alert('success', `${b} подтвердил, что продление доступно`, 'Проверено сейчас — по кабинету и типу публикации.')}<dl class="pub-facts pub-facts-2"><div><dt>Сейчас</dt><dd>до ${esc(p.until)} · ещё ${p.days} ${plural(p.days, 'день', 'дня', 'дней')}</dd></div><div><dt>После продления</dt><dd>до 11 ноября · +30 дней</dd></div><div><dt>Тип публикации</dt><dd>${esc(NBSP(p.type || '—'))}</dd></div><div><dt>Автопродление</dt><dd>${pol.autoProlong ? 'включено политикой компании' : 'выключено политикой компании'}</dd></div></dl>${alert('warning', 'Платное действие', cost)}<label class="pub-check pub-confirm"><input type="checkbox" data-pub-confirm><span>Подтверждаю списание за продление</span></label><p class="pub-note">Продление не создаёт новую редакцию: в истории появится строка операции. Отклики и ссылка на объявление сохранятся.</p>`,
      foot: `${btn('Отмена', 'close')}${btn('Продлить и списать', 'prolong-ok', 'primary', 'disabled')}` });
  }

  function openWithdraw(p) {
    const c = cab(p.cab), b = BOARDS[c.board].short;
    flow = { mode: 'withdraw', pubId: p.id };
    open({ title: `Снять публикацию с ${b}`, sub: `${profile(ctx.id).title} · ${where(p)} · кабинет «${c.name}»`, size: 'narrow',
      body: `<p class="pub-lead-text">Объявление перестанет показываться соискателям. Отклики, история отправок и последний снимок объявления сохранятся. Вакансия и другие публикации продолжат работать.</p><div class="pub-field"><label for="pub-reason">Причина</label><select id="pub-reason" data-pub-reason><option>Набрали достаточно кандидатов с этой площадки</option><option>Площадка не даёт подходящих откликов</option><option>Другое</option></select></div><div class="pub-lead pub-lead-top">${alert('info', 'Вернуть можно только новым размещением', `После снятия объявление уходит в архив ${b}. Разместить снова — новая публикация, она может быть платной.`)}</div>`,
      foot: `${btn('Отмена', 'close')}${btn(`Снять с ${b}`, 'withdraw-ok', 'primary danger')}` });
  }

  function simple(title, sub, body, okLabel, act, kind = 'primary') {
    open({ title, sub, size: 'narrow', body, foot: `${btn('Отмена', 'close')}${btn(okLabel, act, kind)}` });
  }

  /* ── Привязка существующего объявления ─────────────────────────── */
  let attach = { value: '', result: null, snapshot: 'external' };
  const EXAMPLES = [
    ['hh.ru/vacancy/999045678', 'ссылка hh.ru'],
    ['999012345', 'номер, уже привязанный'],
    ['avito.ru/moskva/vakansii/9999055599', 'чужой кабинет'],
    ['Backend-разработчик Go', 'только название'],
  ];
  function lookup(raw) {
    const v = raw.trim();
    if (!v) return null;
    if (!/\d{6,}/.test(v)) return { kind: 'title', text: 'Похоже на название, а не на ссылку или номер. По названию объявление не привязывается — слишком легко ошибиться. Вставьте ссылку на объявление или его внешний ID.' };
    if (/999012345/.test(v)) return { kind: 'taken', text: 'Это объявление уже привязано к вакансии «Senior Android-разработчик». Одно объявление не может принадлежать двум вакансиям.' };
    if (/avito/i.test(v)) return { kind: 'foreign', text: 'Объявление на Авито найдено, но размещено из кабинета, который не подключён к компании. Привязать можно только объявление подключённого кабинета.' };
    return { kind: 'found', board: 'hh', cab: 'hh-dt', extId: '999045678', url: 'hh.ru/vacancy/999045678', title: 'Backend-разработчик (Go)', state: 'Опубликована', until: '20 октября', since: '20 сентября', salary: 'от 350 000 до 450 000 ₽ на руки', area: 'Москва', exp: 'От 3 до 6 лет', resp: 37 };
  }
  function attachBody() {
    const r = attach.result;
    let res = '';
    if (r && r.kind !== 'found') res = `<div class="pub-lead pub-lead-top">${alert(r.kind === 'title' ? 'warning' : 'error', r.kind === 'title' ? 'Нужна ссылка или внешний ID' : r.kind === 'taken' ? 'Уже привязано' : 'Кабинет не подключён', esc(r.text))}</div>`;
    if (r?.kind === 'found') {
      const c = cab(r.cab), p = profile(ctx.id);
      res = `<div class="pub-found"><div><div class="pub-preview-label"><span>Найдено на ${esc(BOARDS[r.board].short)}</span><span>ID ${esc(r.extId)}</span></div><div class="pub-ad ${BOARDS[r.board].cls}"><div class="pub-ad-top"></div><div class="pub-ad-body"><h3>${esc(r.title)}</h3><p class="pub-ad-salary">${esc(r.salary)}</p><div class="pub-ad-meta"><span>Требуемый опыт работы: ${esc(r.exp.toLowerCase())}</span><span>${esc(r.area)}</span></div><div class="pub-ad-company">${esc(c.legal)}</div></div></div><dl class="pub-facts pub-facts-2 pub-found-facts"><div><dt>Кабинет</dt><dd>«${esc(c.name)}»</dd></div><div><dt>Опубликовано</dt><dd>${esc(r.since)}</dd></div><div><dt>Срок размещения</dt><dd>до ${esc(r.until)}</dd></div><div><dt>Отклики на площадке</dt><dd>${r.resp}</dd></div></dl></div><div><ul class="pub-checks"><li><span class="ok">✓</span><span>Объявление принадлежит подключённому кабинету «${esc(c.name)}»</span></li><li><span class="ok">✓</span><span>Не привязано к другой вакансии ATS</span></li><li><span class="ok">✓</span><span>${esc(r.state)} · ${esc(r.area)} · до ${esc(r.until)} · ${r.resp} ${plural(r.resp, 'отклик', 'отклика', 'откликов')} на площадке</span></li><li><span class="warn">!</span><span>Название отличается от вакансии: «${esc(r.title)}» и «${esc(p.title)}». Это не мешает привязке — связь создаётся по ID, а не по названию.</span></li></ul><div class="pub-radio-list" role="radiogroup" aria-label="Начальные данные публикации"><b>Начальные данные публикации</b>${[['external', 'Взять данные объявления', 'ATS сохранит объявление как есть. Отличия от вакансии покажем как расхождение.'], ['ats', 'Считать рабочими данные вакансии', 'Объявление пока не меняем. Расхождение появится сразу, отправка — по вашему решению.']].map(([k, t, s]) => `<label class="pub-choice${attach.snapshot === k ? ' is-checked' : ''}"><input type="radio" name="pub-snap" data-pub-snap="${k}" ${attach.snapshot === k ? 'checked' : ''}><span><b>${t}</b><small>${s}</small></span></label>`).join('')}</div></div></div>`;
    }
    return `<div class="pub-field"><label for="pub-attach">Ссылка на объявление или внешний ID</label><div class="pub-attach-row"><input type="text" id="pub-attach" data-pub-attach value="${esc(attach.value)}" placeholder="Например, hh.ru/vacancy/… или номер объявления">${btn('Найти', 'attach-find')}</div></div><div class="pub-examples"><span>Примеры в демо:</span>${EXAMPLES.map(([v, l]) => `<button type="button" class="chip" data-pub="attach-example" data-v="${esc(v)}" title="${esc(v)}">${esc(l)}</button>`).join('')}</div>${res}`;
  }
  function renderAttach() {
    const ok = attach.result?.kind === 'found';
    open({ title: 'Привязать опубликованное объявление', sub: `${profile(ctx.id).title} · объявление уже размещено на площадке без ATS`, size: 'mid', body: attachBody(),
      foot: `<span class="pub-foot-note">Перед привязкой ATS показывает найденное объявление. Похожее название связь не создаёт.</span>${btn('Отмена', 'close')}${btn('Привязать к вакансии', 'attach-ok', 'primary', ok ? '' : 'disabled')}` });
  }

  /* ── История отправок ──────────────────────────────────────────── */
  let openSnap = null;
  function snapshotHTML(p, n) {
    const d = p.history?.find((h) => h.n === n)?.data;
    if (!d) return `<tr class="pub-snap-row"><td colspan="5"><div class="pub-snap">Для старой демонстрационной редакции №${n} снимок не сохранён. Текущие значения не выдаём за исторические.</div></td></tr>`;
    const rows = FIELDS[cab(p.cab).board].filter((f) => Object.hasOwn(d, f.k)).map((f) => [f.l, displayValue(d[f.k])]);
    return `<tr class="pub-snap-row"><td colspan="5"><div class="pub-snap"><b>Редакция №${n} — сохранённый снимок отправки</b><dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></td></tr>`;
  }
  function openHistory(p) {
    const c = cab(p.cab), b = BOARDS[c.board].short;
    const rows = (p.history || []).map((h) => {
      const head = h.n ? `<b>№${h.n}</b>` : '<span class="pub-op">операция</span>';
      const result = h.unknown ? `<span class="pub-unknown">${esc(h.result)}</span><br><small>последняя подтверждённая — №${p.knownRev || h.n - 1}</small>` : esc(h.result);
      const snapBtn = h.n ? btn(openSnap === `${p.id}:${h.n}` ? 'Свернуть' : 'Снимок', 'snapshot', 'quiet', `data-id="${p.id}" data-n="${h.n}" data-antd-props="type=link"`) : '';
      return `<tr class="${h.n ? '' : 'pub-op-row'}"><td>${head}</td><td>${esc(h.at)}</td><td>${esc(h.who)}<br><small>${esc(h.how)}</small></td><td>${result}</td><td>${snapBtn}</td></tr>${openSnap === `${p.id}:${h.n}` ? snapshotHTML(p, h.n) : ''}`;
    }).join('');
    open({ title: `История отправок · ${b}`, sub: `${profile(ctx.id).title} · ${where(p)} · кабинет «${c.name}»`, size: 'mid',
      body: `<table class="data-table pub-history"><thead><tr><th>Редакция</th><th>Когда</th><th>Кто и как</th><th>Ответ площадки</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5">Отправок ещё не было</td></tr>'}</tbody></table><p class="pub-note">Редакция — неизменяемый снимок того, что ушло на площадку; ответ модерации дополняет запись, но не меняет снимок. Строки «операция» — продление, приостановка, снятие: они не создают редакцию. Правки черновика сюда не попадают.</p>`,
      foot: btn('Закрыть', 'close') });
  }

  /* ── Окна закрытия и паузы вакансии (вызываются из ats-product.js) ── */
  const canPause = (p) => cab(p.cab).can.pause && p.state === 'published';
  /* Активная — есть или может быть объявление на площадке. Неудачная отправка без созданного
     объявления сюда не входит: снимать и приостанавливать нечего. */
  const isLive = (p) => ACTIVE.includes(p.state) && !(p.state === 'error' && !p.url);
  function closeBlock(id, mode = 'close') {
    const list = pubs(id).filter(isLive);
    if (!list.length) return `<div class="pub-close-block"><h4>Публикации на работных сайтах</h4><p>Активных публикаций нет — ${mode === 'pause' ? 'приостанавливать' : 'снимать'} нечего.</p></div>`;
    const rows = list.map((p) => {
      const c = cab(p.cab), b = BOARDS[c.board].short;
      const can = mode === 'pause' ? canPause(p) : true;
      const why = mode === 'pause' && !can ? ({ published: `${b}: приостановки через подключение нет — объявление продолжит работать`, paused: 'Уже приостановлена', moderation: 'Ещё на модерации — скрывать нечего', sending: 'Ещё отправляется', error: 'Состояние неизвестно — сначала повторите проверку' }[p.state] || 'Приостановить нельзя') : '';
      const desc = p.state === 'published' ? `опубликована до ${p.until}` : STATE[p.state].label.toLowerCase();
      return `<label class="pub-close-item">${can ? `<input type="checkbox" data-pub-close="${p.id}">` : '<span></span>'}${logo(c.board)}<span><b>${esc(b)}</b>${p.area ? ` · ${esc(p.area)}` : ''} · «${esc(c.name)}»<small>${esc(desc)}${p.resp?.[0] ? ` · ${p.resp[0]} ${plural(p.resp[0], 'отклик', 'отклика', 'откликов')}` : ''}</small></span>${why ? `<span class="pub-close-cant">${esc(why)}</span>` : '<span></span>'}</label>`;
    }).join('');
    const head = mode === 'pause' ? 'Приостановить публикации?' : 'Активные публикации';
    const lead = mode === 'pause' ? 'Пауза вакансии сама объявления не скрывает. Отметьте те, что нужно приостановить; остальные продолжат приносить отклики — они придут без автоматизаций.' : 'Закрытие и отмена вакансии сами ничего не снимают с площадок. Галочки сняты — отметьте объявления, которые нужно снять. Неотмеченные останутся на площадке, их отклики сохранятся как поздние, без активного процесса.';
    const foot = mode === 'pause' ? 'Возобновление вакансии не возобновит объявления — это отдельное действие в блоке публикаций.' : 'Отказ снимать не мешает закрыть вакансию. Если площадка не ответит, вакансия всё равно закроется, а ошибка останется на публикации.';
    return `<div class="pub-close-block" data-mode="${mode}"><h4>${head} · ${list.length}</h4><p>${lead}</p>${rows}<p class="pub-close-foot">${foot}</p></div>`;
  }

  function applyClose(id, mode = 'close') {
    const picked = [...document.querySelectorAll('[data-pub-close]:checked')].map((x) => x.dataset.pubClose);
    const list = pubs(id), active = list.filter(isLive);
    const offered = mode === 'pause' ? active.filter(canPause) : active;
    const done = [], failed = [];
    picked.forEach((pid) => {
      const p = list.find((x) => x.id === pid); if (!p) return;
      const b = BOARDS[cab(p.cab).board].short;
      if (mode === 'pause') { p.state = 'paused'; p.pausedAt = 'сегодня · по паузе вакансии'; p.history = [op(NOW, 'Елена Крылова', 'вручную · приостановка вместе с вакансией', 'принято'), ...(p.history || [])]; done.push(b); return; }
      if (p.state === 'error') { failed.push(b); p.problem = { kind: 'withdraw', text: 'Снятие при закрытии вакансии не подтверждено площадкой: кабинет требует повторного входа. Объявление может оставаться видимым — проверьте после переподключения.' }; p.history = [op(NOW, 'Елена Крылова', 'вручную · снятие при закрытии вакансии', 'ошибка — нет ответа'), ...(p.history || [])]; return; }
      p.state = 'withdrawn'; p.withdrawnAt = 'сегодня'; p.withdrawnWhy = 'Снята при закрытии вакансии по подтверждению рекрутера'; p.history = [op(NOW, 'Елена Крылова', 'вручную · снятие при закрытии вакансии', 'принято'), ...(p.history || [])]; done.push(b);
    });
    save(); refresh();
    if (!offered.length) return '';
    const kept = offered.length - picked.length;
    const verb = mode === 'pause' ? 'приостановлено' : 'снято';
    return `Публикации: ${verb} ${done.length}${kept ? `, оставлено ${kept}` : ''}${failed.length ? `, ошибка площадки — ${failed.join(', ')} (вакансию не блокирует)` : ''}.`;
  }

  /* «Открыть отклики» — рабочий экран вакансии с фильтром источника «Отклики» по этой
     публикации (vacancy-workspace.md: фильтры источника отдельно от этапов). */
  function openInbox(p) {
    document.getElementById('drawer').hidden = true;
    const label = `Отклики · ${where(p)} · «${cab(p.cab).name}»${p.extId ? ` · № ${p.extId}` : ''}`;
    const head = document.querySelector('.candidate-list-head');
    head?.querySelector('.pub-inbox-filter')?.remove();
    head?.insertAdjacentHTML('afterbegin', `<div class="pub-inbox-filter"><span class="pill purple">Источник: ${esc(label)}</span><button type="button" class="btn quiet" data-pub="inbox-clear" data-antd-props="type=link size=small">Сбросить</button></div>`);
    toast(`Фильтр источника: ${label}. Этап воронки не меняется`);
  }

  /* ── События ───────────────────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pub]');
    if (!a || a.disabled) return;
    const act = a.dataset.pub, p = a.dataset.id ? findPub(a.dataset.id) : null;
    e.preventDefault();
    if (act === 'preview-full') { openFullPreview(); return; }
    if (act === 'preview-close') { closeFullPreview(); return; }
    if (act === 'language-add' && flow) { flow.targets[Number(a.dataset.t)].vals.languages.push({ name: '', level: '' }); renderForm(); return; }
    if (act === 'language-remove' && flow) { flow.targets[Number(a.dataset.t)].vals.languages.splice(Number(a.dataset.i), 1); renderForm(); return; }
    if (act === 'close') { close(); flow = null; return; }
    if (act === 'publish') { openPublish(a.dataset.board); return; }
    if (act === 'to-choose') { renderChoose(); return; }
    if (act === 'to-form') {
      const keep = new Map(flow.targets.map((t) => [t.cab, t]));
      flow.targets = [...flow.picked].map((id) => keep.get(id) || makeTarget(id));
      flow.tab = Math.min(flow.tab, flow.targets.length - 1);
      renderForm(); return;
    }
    if (act === 'tab') { flow.tab = Number(a.dataset.i); renderForm(); return; }
    if (act === 'to-review') { renderReview(); return; }
    if (act === 'send') { send(); return; }
    if (act === 'save-draft') { saveDraft(); return; }
    if (act === 'reset-field') { const t = flow.targets[Number(a.dataset.t)], f = FIELDS[cab(t.cab).board].find((x) => x.k === a.dataset.k); t.vals[f.k] = f.src ? JSON.parse(JSON.stringify(f.src(profile(flow.vac)))) : ''; delete t.own[f.k]; renderForm(); return; }
    if (act === 'edit' && p) { openEdit(p, 'edit'); return; }
    if (act === 'fix' && p) { openEdit(p, 'fix'); return; }
    if (act === 'repost' && p) { openEdit(p, 'repost'); return; }
    if (act === 'continue' && p) { openEdit(p, 'new'); return; }
    if (act === 'drop' && p) {
      /* Удалённый черновик повторного размещения возвращает прежней публикации «Разместить снова». */
      const list = pubs(ctx.id), prev = p.repostOf ? findPub(p.repostOf) : null;
      if (prev?.repostedTo === p.id) delete prev.repostedTo;
      list.splice(list.indexOf(p), 1); save(); refresh(); toast('Черновик удалён'); return;
    }
    if (act === 'inbox' && p) { openInbox(p); return; }
    if (act === 'inbox-clear') { a.closest('.pub-inbox-filter')?.remove(); return; }
    if (act === 'open-ext') { toast('В макете внешняя ссылка не открывается: адрес и номер объявления вымышленные'); return; }
    if (act === 'history' && p) { openSnap = null; openHistory(p); return; }
    if (act === 'snapshot' && p) { const k = `${p.id}:${a.dataset.n}`; openSnap = openSnap === k ? null : k; openHistory(p); return; }
    if (act === 'diff') { diffState = { tab: 'external', choice: {}, pick: {}, replace: {} }; renderDiff(); return; }
    if (act === 'diff-internal') { diffState = { tab: 'internal', choice: {}, pick: {}, replace: {} }; renderDiff(); return; }
    if (act === 'diff-tab') { diffState.tab = a.dataset.tab; renderDiff(); return; }
    if (act === 'diff-apply' && p) {
      const ch = diffState.choice[p.id], b = BOARDS[cab(p.cab).board].short;
      if (ch === 'accept') { p.external = false; p.externalKept = false; toast(`Данные публикации приняты с ${b}. Вакансия не изменилась`); }
      else if (ch === 'keep') { p.externalKept = true; p.keptAt = 'сегодня'; toast('Расхождение оставлено — отметка останется на публикации'); }
      else if (ch === 'push') { p.external = false; p.externalKept = false; p.rev += 1; p.sentAt = NOW; p.history = [rev(p.rev, NOW, 'Елена Крылова', 'вручную · версия ATS после расхождения', 'принята'), ...p.history]; toast(`На ${b} отправлена редакция №${p.rev} с данными ATS`); }
      delete diffState.choice[p.id]; save(); refresh();
      if (pubs(ctx.id).some((x) => x.external && !x.externalKept && EXT[x.id])) renderDiff(); else close();
      return;
    }
    if (act === 'diff-update') {
      const ids = Object.entries(diffState.pick).filter(([id, v]) => v && findPub(id) && isStale(findPub(id))).map(([id]) => id);
      ids.forEach((id) => { const x = findPub(id); x.rev += 1; x.sentAt = NOW; x.sync = NOW; x.external = false; x.externalKept = false; x.vacStale = false; x.history = [rev(x.rev, NOW, 'Елена Крылова', 'вручную · обновление по изменению вакансии', 'принята'), ...x.history]; if (diffState.replace[id]) delete (x.own || {}).salary; });
      save(); close(); refresh();
      toast(`Обновлено публикаций: ${ids.length}. Остальные не менялись`); return;
    }
    if (act === 'prolong' && p) { openProlong(p); return; }
    if (act === 'prolong-ok') {
      const x = findPub(flow.pubId), c = cab(x.cab), tp = c.types?.find(([n]) => n === x.type);
      if (tp) db.packs[c.id][tp[0]] = left(c.id, tp[0]) - 1;
      x.until = '11 ноября'; x.days = 35;
      x.history = [op(NOW, 'Елена Крылова', 'вручную · продление до 11 ноября', `принято${tp ? ` · списана 1 «${tp[0]}»` : ''}`), ...x.history];
      save(); close(); refresh(); toast(`Продлено до 11 ноября${tp ? ` · списана 1 публикация «${tp[0]}»` : ''}. Новая редакция не создана`); return;
    }
    if (act === 'withdraw' && p) { openWithdraw(p); return; }
    if (act === 'withdraw-ok') { const x = findPub(flow.pubId), why = document.querySelector('[data-pub-reason]')?.value || ''; x.state = 'withdrawn'; x.withdrawnAt = 'сегодня'; x.withdrawnWhy = `Снята вручную: ${why}`; x.history = [op(NOW, 'Елена Крылова', `вручную · снятие (${why.toLowerCase()})`, 'принято'), ...x.history]; save(); close(); refresh(); toast(`Снято с ${BOARDS[cab(x.cab).board].short}. Вакансия и другие публикации работают`); return; }
    if (act === 'pause' && p) { flow = { pubId: p.id }; simple(`Приостановить на ${BOARDS[cab(p.cab).board].short}`, `${profile(ctx.id).title} · ${where(p)} · кабинет «${cab(p.cab).name}»`, `<p class="pub-lead-text">Объявление скроется из поиска, новые отклики перестанут приходить. Срок размещения определяет площадка. Вакансия и другие публикации продолжат работать.</p>`, 'Приостановить', 'pause-ok'); return; }
    if (act === 'pause-ok') { const x = findPub(flow.pubId); x.state = 'paused'; x.pausedAt = 'сегодня · Елена Крылова'; x.history = [op(NOW, 'Елена Крылова', 'вручную · приостановка', 'принято'), ...x.history]; save(); close(); refresh(); toast('Публикация приостановлена'); return; }
    if (act === 'resume' && p) { flow = { pubId: p.id }; simple(`Возобновить на ${BOARDS[cab(p.cab).board].short}`, `${profile(ctx.id).title} · ${where(p)} · кабинет «${cab(p.cab).name}»`, `<p class="pub-lead-text">Объявление вернётся в поиск с прежним текстом. Если площадка запросит оплату, сумму покажем до подтверждения.</p>`, 'Возобновить', 'resume-ok'); return; }
    if (act === 'resume-ok') { const x = findPub(flow.pubId); x.state = 'published'; x.days = 18; x.until = x.until || '25 октября'; x.history = [op(NOW, 'Елена Крылова', 'вручную · возобновление', 'принято'), ...x.history]; save(); close(); refresh(); toast('Публикация возобновлена'); return; }
    if (act === 'resend' && p && paused()) { toast('Вакансия на паузе: новые публикации недоступны'); return; }
    if (act === 'resend' && p) { p.state = 'sending'; p.sync = undefined; save(); refresh(); setTimeout(() => { p.state = 'moderation'; p.sync = NOW; p.raw = 'На модерации'; p.extId = p.extId || '9999077703'; p.problem = undefined; if (p.history?.[0]) p.history[0].result = 'на модерации после повтора'; save(); refresh(); toast(`${BOARDS[cab(p.cab).board].short}: повтор принят, объявление на модерации`); }, 1200); return; }
    if (act === 'retry' && p) { p.state = 'sending'; save(); refresh(); setTimeout(() => { p.state = 'published'; p.sync = 'только что'; p.problem = undefined; p.knownRev = undefined; if (p.history?.[0]?.unknown) { p.history[0].unknown = false; p.history[0].result = 'принята — подтверждено при сверке'; } p.days = 17; save(); refresh(); toast(`${BOARDS[cab(p.cab).board].short}: сверка прошла, объявление на месте`); }, 1200); return; }
    if (act === 'attach') { attach = { value: '', result: null, snapshot: 'external' }; renderAttach(); return; }
    if (act === 'attach-example') { attach.value = a.dataset.v; attach.result = lookup(attach.value); renderAttach(); return; }
    if (act === 'attach-find') { attach.value = document.querySelector('[data-pub-attach]')?.value || ''; attach.result = lookup(attach.value); renderAttach(); return; }
    if (act === 'attach-ok') {
      const r = attach.result; if (r?.kind !== 'found') return;
      /* Привязка ничего не публикует: в том же кабинете может уже быть публикация этой
         вакансии — это отдельное размещение (например, другой город). */
      pubs(ctx.id).push({ id: newId(), cab: r.cab, area: r.area, state: 'published', raw: 'Опубликована', rev: 0, type: 'Стандарт', extId: r.extId, url: r.url, until: r.until, days: 13, publishedAt: r.since, sync: 'только что', resp: [r.resp, r.resp, 0], external: attach.snapshot === 'ats', history: [] });
      save(); close(); refresh(); toast(`Объявление ${r.extId} привязано. Отклики с него будут приходить в вакансию`); return;
    }
    if (act === 'demo-hidden') { db.hidden[ctx.id] = !db.hidden[ctx.id]; db.demoOpen = true; save(); refresh(); return; }
    if (act === 'demo-reset') { delete db.vacancies[ctx.id]; db.role = 'recruiter'; db.hidden = {}; db.packs = JSON.parse(JSON.stringify(PACKS)); save(); refresh(); toast('Демо публикаций сброшено'); return; }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.pubf !== undefined && flow) {
      const t = flow.targets[Number(el.dataset.t)], k = el.dataset.pubf;
      const f = FIELDS[cab(t.cab).board].find((x) => x.k === k);
      if (el.dataset.language !== undefined) { t.vals[k][Number(el.dataset.language)][el.dataset.part] = el.value; }
      else if (f?.type === 'multi') { const selected = new Set(Array.isArray(t.vals[k]) ? t.vals[k] : []); el.checked ? selected.add(el.value) : selected.delete(el.value); t.vals[k] = [...selected]; }
      else if (el.dataset.part) { t.vals[k] = { ...(t.vals[k] || {}), [el.dataset.part]: el.value }; }
      else t.vals[k] = f?.type === 'check' ? el.checked : el.value;
      if (k === 'duration') {
        const employment = FIELDS.hh.find((x) => x.k === 'employment');
        if (!options(employment, t.vals).includes(t.vals.employment)) t.vals.employment = '';
      }
      if (k === 'employment' && t.vals.employment === 'Вахта') {
        t.vals.format = t.vals.format.filter((x) => !['Удалённо', 'Гибрид'].includes(x));
        t.vals.internship = false;
      }
      if (f?.src) t.own[k] = JSON.stringify(t.vals[k]) !== JSON.stringify(f.src(profile(flow.vac)));
      flow.confirm = false;
      flow.overwrite = false;
      if (['pubtype', 'check', 'radio', 'multi', 'languages'].includes(f?.type) || el.tagName === 'SELECT') {
        const box = el.closest('.pub-field'), ti = Number(el.dataset.t);
        if (['pubtype', 'check', 'radio', 'multi', 'languages'].includes(f?.type) || ['test'].includes(k)) { renderForm(); return; }
        if (box) { const tmp = document.createElement('div'); tmp.innerHTML = fieldHTML(t, f, ti); box.replaceWith(tmp.firstElementChild); }
      } else {
        const box = el.closest('.pub-field'), src = box?.querySelector('.pub-src');
        const tmp = document.createElement('div'); tmp.innerHTML = fieldHTML(t, f, Number(el.dataset.t));
        const fresh = tmp.querySelector('.pub-src');
        if (src && fresh) src.replaceWith(fresh); else if (src && !fresh) src.remove(); else if (!src && fresh) box.append(fresh);
        box?.classList.toggle('has-error', tmp.firstElementChild.classList.contains('has-error'));
      }
      updateFormLive();
    }
    if (el.dataset.pubAttach !== undefined) attach.value = el.value;
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.pubPick) { el.checked ? flow.picked.add(el.dataset.pubPick) : flow.picked.delete(el.dataset.pubPick); renderChoose(); return; }
    if (el.dataset.pubTemplate !== undefined && flow) { flow.targets[Number(el.dataset.pubTemplate)].template = el.value; updateFormLive(); return; }
    if (el.dataset.pubIntake !== undefined && flow) { flow.targets[Number(el.dataset.pubIntake)].intake = el.value; return; }
    if (el.dataset.pubConfirm !== undefined) {
      if (flow) flow.confirm = el.checked;
      if (flow?.targets) { setFoot(reviewFoot()); return; }
      const ok = document.querySelector('#pub-foot [data-pub="send"], #pub-foot [data-pub="prolong-ok"]');
      if (ok) { ok.disabled = !el.checked; ok.classList.toggle('ant-btn-disabled', !el.checked); }
      return;
    }
    if (el.dataset.pubOverwrite !== undefined && flow) { flow.overwrite = el.checked; setFoot(reviewFoot()); return; }
    /* Кнопка окна закрытия или паузы называет, что будет сделано с публикациями. */
    if (el.dataset.pubClose) {
      const block = el.closest('.pub-close-block'), mode = block?.dataset.mode, n = block ? block.querySelectorAll('[data-pub-close]:checked').length : 0;
      const ok = document.querySelector('#modal [data-confirm-modal]');
      if (ok) ok.textContent = mode === 'pause' ? (n ? `Приостановить и скрыть ${n} ${plural(n, 'объявление', 'объявления', 'объявлений')}` : 'Приостановить') : (n ? `Закрыть и снять ${n} ${plural(n, 'публикацию', 'публикации', 'публикаций')}` : 'Закрыть вакансию');
      return;
    }
    if (el.dataset.pubChoice) { diffState.choice[el.dataset.id] = el.dataset.pubChoice; renderDiff(); return; }
    if (el.dataset.pubPickupd) { diffState.pick[el.dataset.pubPickupd] = el.checked; renderDiff(); return; }
    if (el.dataset.pubReplace) { diffState.replace[el.dataset.pubReplace] = el.checked; renderDiff(); return; }
    if (el.dataset.pubSnap) { attach.snapshot = el.dataset.pubSnap; renderAttach(); return; }
    if (el.dataset.pubDemo === 'role') { db.role = el.value; db.demoOpen = true; save(); refresh(); return; }
    if (el.dataset.pubDemo === 'state') {
      const p = findPub(el.dataset.id); p.state = el.value; db.demoOpen = true;
      if (el.value === 'published') { p.url = p.url || `${cab(p.cab).board === 'hh' ? 'hh.ru/vacancy/' : cab(p.cab).board === 'avito' ? 'avito.ru/moskva/vakansii/' : 'superjob.ru/vakansii/'}${p.extId || '999000001'}`; p.until = p.until || '30 октября'; p.days = p.days ?? 23; p.publishedAt = p.publishedAt || '7 октября'; }
      if (el.value === 'rejected' && !p.problem) p.problem = cab(p.cab).board === 'hh'
        ? { text: 'Вакансия ушла в архив hh.ru, публикация вернулась в пакет. Причину hh.ru присылает письмом менеджеру кабинета — через подключение она не передаётся.', fields: [] }
        : { text: 'Площадка отклонила объявление: в тексте есть ссылки на внешние ресурсы.', fields: ['text'] };
      if (el.value === 'error' && !p.problem) p.problem = { text: 'Площадка не ответила на последнюю сверку. Ответственный за подключение получил уведомление.' };
      if (el.value === 'paused') p.pausedAt = p.pausedAt || 'сегодня · демо';
      if (el.value === 'draft') p.missing = p.missing || 'Опыт работы';
      if (el.value === 'sending') p.sentAt = p.sentAt || NOW;
      if (el.value === 'expired') { p.until = p.until || '2 октября'; p.publishedAt = p.publishedAt || '2 сентября'; }
      save(); refresh(); return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!['Enter', ' '].includes(e.key) || !e.target.closest('[data-pub="preview-full"]')) return;
    e.preventDefault(); openFullPreview();
  });
  document.addEventListener('toggle', (e) => { if (e.target.classList?.contains('pub-demo')) { db.demoOpen = e.target.open; save(); } }, true);

  return { section, tiles, boardSection, closeBlock, applyClose, refresh, profile, _db: () => db };
})();
