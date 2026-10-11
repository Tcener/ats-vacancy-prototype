/* Настройка вакансии — перенос работающего экрана Собесо в макет, сведённый с моделью ТЗ.
   Из Собесо: модульная воронка строками, три состояния строки, требования по зонам, автосохранение.
   Из ТЗ: системные этапы «Отклик», «Ожидание выхода», «Отказ»; переименование при неизменном типе;
   явный целевой этап у исхода (по умолчанию — следующий по воронке).
   Данные вымышленные. */
window.VacancySetup = (() => {
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const KEY = 'sobesso-vacancy-setup-v5';
  const MODE_KEY = 'sobesso-vacancy-edit-mode';
  const screen = () => document.querySelector('#screen');

  /* ─────────── словари ─────────── */

  const MODULE_LABEL = { scoring: 'ИИ-ревью резюме', 'chat-bot': 'ИИ-чат', voice: 'ИИ-интервью' };
  const KICKER = { response: 'вход', scoring: 'отбор', 'chat-bot': 'переписка', voice: 'разговор', manual: 'вручную', awaiting: 'после оффера', rejection: 'конец пути' };
  /* Системное назначение этапа — из ТЗ. Тип не меняется никогда, имя меняется у любого. */
  const SYSTEM_NOTE = {
    response: 'системный этап · сюда попадают все отклики',
    awaiting: 'системный этап · после оффера, до выхода',
    rejection: 'системный этап · сюда собираются отказы',
  };

  const ZONES = [
    { id: 'resume', name: 'Только резюме', who: 'проверяет скоринг' },
    { id: 'both', name: 'Резюме + интервью', who: 'скоринг и вопрос в чат-боте' },
    { id: 'interview', name: 'Только интервью', who: 'вопрос в чат-боте, в резюме не смотрим' },
  ];

  const KINDS = [
    { id: 'text', icon: '📝', name: 'Своими словами', hint: 'свободная формулировка — модель читает её как есть' },
    { id: 'experience', icon: '🧭', name: 'Опыт работы', hint: 'стаж в годах по профилю' },
    { id: 'city', icon: '📍', name: 'Город', hint: 'место жительства или готовность к переезду' },
    { id: 'education', icon: '🎓', name: 'Образование', hint: 'уровень и профиль' },
    { id: 'salary', icon: '💰', name: 'Зарплатные ожидания', hint: 'вилка, которую просит кандидат' },
    { id: 'english', icon: '🇬🇧', name: 'Английский', hint: 'уровень языка; проверяется отдельным вопросом' },
  ];
  const kindOf = id => KINDS.find(k => k.id === id) || KINDS[0];

  const CHANNELS = [
    { id: 'hh', name: 'HeadHunter', logo: 'hh', icon: 'assets/job-sites/hh.png?public=ef83cc64a372', statuses: ['Подумать', 'Приглашение', 'Отказ'] },
    { id: 'potok', name: 'Хантфлоу', logo: 'Х', icon: 'assets/logo-huntflow.svg?public=b19be3bb9a27', statuses: ['Новый', 'Интервью', 'Отклонён'] },
  ];
  /* Значок канала — официальный favicon площадки (assets/job-sites/) или логотип Хантфлоу вместо букв. */
  const chLogo = ch => ch.icon
    ? `<img class="vs-channel-logo is-img" src="${ch.icon}" alt="${esc(ch.name)}" title="${esc(ch.name)}">`
    : `<span class="vs-channel-logo" role="img" aria-label="${esc(ch.name)}">${ch.logo}</span>`;

  const DELAYS = ['сразу без задержки', 'через 1 час', 'через 2 часа', 'через 6 часов', 'через 12 часов', 'через 1 день', 'через 2 дня', 'через 3 дня'];

  /* Разговорные модули — наборы из работающего Собесо. */
  const BOT_FACE = [['human', 'Человек'], ['ai', 'ИИ']];
  const BOT_GENDER = [['female', 'Женский'], ['male', 'Мужской']];
  const BOT_TONE = [['formal', 'На вы'], ['informal', 'На ты']];
  const PING_DELAYS = ['1 час', '3 часа', '6 часов', '12 часов', '1 день', '2 дня', '3 дня'];
  const ANSWER_TIME = [[60, '1 минута'], [90, '1 минута 30 секунд'], [120, '2 минуты'], [150, '2 минуты 30 секунд'], [180, '3 минуты'], [210, '3 минуты 30 секунд'], [240, '4 минуты'], [300, '5 минут']];
  const REMIND_DAYS = Array.from({ length: 10 }, (_, i) => [i + 1, `${i + 1} ${i === 0 ? 'день' : i < 4 ? 'дня' : 'дней'}`]);
  const ASK_WHEN = [['end', 'конце интервью'], ['start', 'начале интервью']];

  /* Холодный поиск — перенос из работающего Собесо: сохранённый запрос к базе резюме площадки. */
  const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const EXPERIENCE = ['Нет опыта', 'От 1 года до 3 лет', 'От 3 до 6 лет', 'Более 6 лет'];
  const RUN_STEPS = [
    ['seen', 'просмотрено в выдаче'],
    ['skipped', 'отсеяно до резюме'],
    ['pulled', 'вытянуто резюме'],
    ['scored', 'оценено скорингом'],
    ['passed', 'прошло'],
  ];
  const RUN_LABEL = { idle: 'Не запускался', running: 'Идёт', stopping: 'Останавливается — уже вытянутых доскорим', done: 'Завершён' };

  const plural = (n, one, few, many) =>
    n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
  const qWord = n => `${n} ${plural(n, 'вопрос', 'вопроса', 'вопросов')}`;
  const timeLabel = sec => (ANSWER_TIME.find(x => x[0] === +sec) || ANSWER_TIME[2])[1];

  /* ─────────── состояние ─────────── */

  const seed = () => ({
    title: 'Android-разработчик (Kotlin)',
    description: 'Ищем Android-разработчика в команду мобильного банка. Работаем на Kotlin, переезжаем на Compose, релиз раз в две недели.',
    source: 'hh',
    autoProcessing: true,
    ats: 'potok',
    factors: [
      { id: uid(), kind: 'experience', text: 'Коммерческая разработка под Android от 3 лет', zone: 'resume', critical: true, negate: false },
      { id: uid(), kind: 'city', text: 'Москва или готовность к переезду', zone: 'resume', critical: false, negate: false },
      { id: uid(), kind: 'text', text: 'В опыте только аутсорс без собственных продуктов', zone: 'resume', critical: false, negate: true },
      { id: uid(), kind: 'text', text: 'Работал с Jetpack Compose на проде', zone: 'both', critical: true, negate: false },
      { id: uid(), kind: 'text', text: 'Вёл или менторил джунов', zone: 'interview', critical: false, negate: false },
    ],
    faq: [
      { id: 'q1', q: 'Есть ли удалённый формат?', a: 'Гибрид: два дня в офисе на Павелецкой, остальное из дома.' },
      { id: 'q2', q: 'Сколько этапов в отборе?', a: 'Интервью с ботом, техническое интервью с тимлидом и финальная встреча с руководителем.' },
      { id: 'q3', q: 'Когда будет ответ?', a: 'По интервью с ботом — в тот же день, по техническому — в течение двух рабочих дней.' },
    ],
    searches: [
      {
        id: 'cs1', name: 'Android-разработчики, Москва', origin: 'requirements',
        query: { words: ['Android', 'Kotlin', 'Compose'], regions: ['Москва', 'Московская область'], from: 250000, to: 400000, exp: ['От 3 до 6 лет'] },
        target: 20, schedule: { on: true, at: '09:00', days: ['Пн', 'Ср', 'Пт'] },
        run: { status: 'done', at: '15 сентября, 09:00', auto: true, seen: 412, skipped: 265, pulled: 147, scored: 147, passed: 18 },
      },
      {
        id: 'cs2', name: 'Ссылка с hh.ru — Kotlin senior', origin: 'url', url: 'https://hh.ru/search/resume?text=kotlin&experience=between3And6',
        query: { words: ['Kotlin', 'senior'], regions: [], from: null, to: null, exp: [] },
        target: 10, schedule: { on: false, at: '09:00', days: [] },
        run: null,
      },
    ],
    found: [
      { id: 'f1', name: 'Игорь Самойлов', role: 'Android-разработчик · Тинькофф', salary: 'от 320 000 ₽', score: 9, search: 'cs1', at: '15 сентября', state: 'waiting' },
      { id: 'f2', name: 'Дарья Пелевина', role: 'Mobile-разработчик · Ozon', salary: 'от 280 000 ₽', score: 8, search: 'cs1', at: '15 сентября', state: 'waiting' },
      { id: 'f3', name: 'Артём Хвостов', role: 'Android Lead · Авито', salary: 'от 400 000 ₽', score: 8, search: 'cs1', at: '15 сентября', state: 'moved' },
      { id: 'f4', name: 'Сергей Балакирев', role: 'Android-разработчик · СберЗдоровье', salary: 'от 250 000 ₽', score: 6, search: 'cs1', at: '12 сентября', state: 'waiting' },
      { id: 'f5', name: 'Ольга Тучина', role: 'Kotlin-разработчик · Яндекс', salary: 'от 350 000 ₽', score: 7, search: 'cs1', at: '12 сентября', state: 'rejected' },
    ],
    stages: [
      { id: 'sys-response', kind: 'system', purpose: 'response', name: 'Отклик', enabled: true, rules: {} },
      { id: uid(), kind: 'scoring', name: '', enabled: true, score: 7, rules: {} },
      {
        id: 'stg-chat', kind: 'chat-bot', name: '', enabled: true, score: 7, askWhen: 'end',
        invite: {
          text: 'Здравствуйте, {имя}! Вы откликнулись на вакансию «{вакансия}». Я задам несколько вопросов — это минут десять, отвечать можно текстом.',
          reminders: [{ days: 1, at: '12:00', text: 'Здравствуйте! Напоминаю про интервью по вакансии «{вакансия}» — ответьте, когда будет удобно.' }],
        },
        bot: { face: 'human', name: 'Алиса', gender: 'female', tone: 'formal', callRecruiter: false },
        questions: [
          { id: uid(), text: 'Расскажите про самый сложный проект под Android, который вы вели.', expected: 'Назван конкретный проект, роль кандидата и техническое решение.' },
          { id: uid(), text: 'Какая вилка по деньгам вам подходит?', expected: '' },
        ],
        pings: { on: true, items: [{ delay: '3 часа', text: 'Вы ещё здесь? Продолжим интервью — остался последний блок вопросов.' }], reject: '2 недели' },
        rules: {},
      },
      { id: uid(), kind: 'manual', name: 'Тех. интервью с тимлидом', enabled: true, rules: {} },
      {
        id: 'stg-voice', kind: 'voice', name: '', enabled: false, score: 0,
        invite: { text: 'Здравствуйте, {имя}! Осталось голосовое интервью — минут пятнадцать, нужны наушники и тихое место.', reminders: [] },
        voice: { answerTime: 120, saveAudio: true, saveVideo: true, allowSkipVideo: false },
        questions: [
          { id: uid(), text: 'Опишите архитектуру приложения, над которым работали последним.', expected: 'Слои, способ навигации, работа с сетью и хранением.', english: false },
          { id: uid(), text: 'Tell us about your last project in English.', expected: '', english: true },
        ],
        brand: { greeting: 'Привет! Меня зовут Алиса, я помогу пройти интервью. Отвечайте спокойно, записи смотрит только команда найма.', video: '' },
        link: { on: false, verifyEmail: false, askPhone: false },
        pings: { reject: '3 дня' },
        rules: {},
      },
      { id: uid(), kind: 'manual', name: 'Финальное интервью', enabled: false, rules: {} },
      { id: 'sys-awaiting', kind: 'system', purpose: 'awaiting', name: 'Ожидание выхода', enabled: true, rules: {} },
      { id: 'sys-rejection', kind: 'system', purpose: 'rejection', name: 'Отказ', enabled: true, rules: {} },
    ],
  });

  let state, ui, vacancyId = 'android';
  const clone = x => JSON.parse(JSON.stringify(x));
  const scopedKey = () => 'sobesso-ai-vacancy-v6-' + vacancyId;
  const demoRole = () => localStorage.getItem('sobesso-ai-demo-role') || 'lead';
  const canConfigure = () => demoRole() !== 'reader';
  const canAutoReject = () => demoRole() === 'lead';

  const TITLES = { android: 'Senior Android-разработчик', designer: 'Senior Product Designer', analyst: 'Data Analyst', backend: 'Backend-разработчик Go', ios: 'Senior iOS-разработчик' };
  function draft(s) {
    return { kind: s.kind, score: +s.score || 7, factors: clone(state.factors || []),
      questions: clone((s.questions || []).filter(q => !q.deleted)), invite: clone(s.invite || {}),
      bot: clone(s.bot || {}), voice: clone(s.voice || {}), brand: clone(s.brand || {}),
      pings: clone(s.pings || {}), faq: clone(state.faq || []), policy: clone(s.policy || {}) };
  }
  function issues(s) {
    const out = [];
    if (!(+s.score >= 1 && +s.score <= 10)) out.push('Выберите проходной балл от 1 до 10');
    if (s.kind === 'scoring' && !state.factors.some(f => f.zone !== 'interview' && f.text.trim())) out.push('Добавьте критерии оценки резюме');
    if (s.kind !== 'scoring' && !(s.questions || []).some(q => !q.deleted && q.text?.trim())) out.push('Добавьте вопросы и сценарий разговора');
    if (s.kind !== 'scoring' && !(s.invite?.text || '').trim()) out.push('Настройте приглашение');
    if (s.policy?.silent && !(+s.policy.hours > 0)) out.push('Укажите положительный срок ожидания ответа');
    return out;
  }
  function initialize() {
    state.structureVersion ??= 1;
    state.autoRejectAllowed = localStorage.getItem('sobesso-company-autoreject') === 'true';
    state.stages.forEach(s => {
      if (!MODULE_LABEL[s.kind]) return;
      s.score = +s.score || 7;
      s.policy ??= { pass: 'manual', fail: 'manual', refused: false, silent: false, hours: 48 };
      s.pings ??= {};
      s.pings.reject = 'не отклонять';
      if (!Object.hasOwn(s, 'published')) {
        s.published = vacancyId === 'ios' || issues(s).length ? null : { version: 1, config: draft(s), at: new Date().toISOString() };
      }
    });
  }
  function load(id = vacancyId) {
    vacancyId = id;
    try { state = JSON.parse(localStorage.getItem(scopedKey())); } catch { state = null; }
    if (!state?.stages?.length) {
      if (id === 'android') { try { state = JSON.parse(localStorage.getItem(KEY)); } catch {} }
      if (!state?.stages?.length) state = seed();
      state.title = TITLES[id] || 'Новая вакансия';
      if (id !== 'android') {
        state.description = 'Ищем ' + state.title + ' в продуктовую команду. Важны практический опыт, самостоятельность и работа с коллегами.';
        const skills = { designer: 'Figma и продуктовый дизайн', analyst: 'SQL и продуктовая аналитика', backend: 'Go и разработка сервисов', ios: 'Swift и iOS' };
        state.factors = [{ id: uid(), kind: 'text', text: 'Практический опыт: ' + skills[id], zone: 'both', critical: true },
          { id: uid(), kind: 'text', text: 'Умение объяснять свои решения и работать в команде', zone: 'interview', critical: false }];
        state.stages.filter(x => MODULE_LABEL[x.kind] && x.kind !== 'scoring').forEach(x => {
          x.questions = [{ id: uid(), text: 'Расскажите о проекте, где вы использовали ' + skills[id] + '.', expected: 'Конкретный пример, роль кандидата и результат.' }];
        });
      }
    }
    initialize();
    persist();
  }
  const persist = () => { try { localStorage.setItem(scopedKey(), JSON.stringify(state)); localStorage.setItem('sobesso-company-autoreject', String(state.autoRejectAllowed)); } catch {} };
  function context(id) {
    if (!state || vacancyId !== id) { clearTimeout(saveTimer); load(id); ui = null; }
  }
  function snapshot(id) {
    if (!state) load();
    const s = state.stages.find(x => x.id === id);
    return s?.published ? clone({ ...s.published, id: s.id, kind: s.kind, name: stageTitle(s), structureVersion: state.structureVersion }) : null;
  }
  function openStage(id) {
    if (!canConfigure()) { toast('Нет права настройки. Подготовить ИИ-этап может Елена Крылова, руководитель рекрутмента'); return; }
    ui ??= { open: {}, dialog: null };
    ui.jumpTo = 'section-' + id;
    closeDrawer();
    if (location.hash === '#vacancy/' + vacancyId + '/setup') { ui.mode = 'all'; repaint(); document.querySelector('#section-' + id)?.scrollIntoView({ block: 'start' }); }
    else location.hash = 'vacancy/' + vacancyId + '/setup';
  }
  function confirmStage(id) {
    if (!canConfigure()) { toast('Нет права настройки ИИ-этапа'); return false; }
    const st = state.stages.find(x => x.id === id), errors = issues(st);
    if (errors.length) { toast(errors.join('. ')); return false; }
    if (!canAutoReject() && (st.policy.fail === 'auto' || st.policy.refused || st.policy.silent)) { toast('Для включения автоотказа требуется отдельное право. Обратитесь к Елене Крыловой'); return false; }
    if (!state.autoRejectAllowed && (st.policy.fail === 'auto' || st.policy.refused || st.policy.silent)) { toast('Сначала разрешите автоотказ в политике компании'); return false; }
    if (st.published && JSON.stringify(st.published.config) === JSON.stringify(draft(st))) { toast('Эта версия уже действует'); return true; }
    st.published = { version: (st.published?.version || 0) + 1, config: draft(st), at: new Date().toISOString() };
    touch();
    window.dispatchEvent(new CustomEvent('ai-stage-configured', { detail: { vacancyId, stageId: id } }));
    toast('Логика этапа подтверждена · версия ' + st.published.version);
    return true;
  }
  function readiness(s) {
    if (!MODULE_LABEL[s.kind]) return '';
    const dirty = s.published && JSON.stringify(draft(s)) !== JSON.stringify(s.published.config);
    const errors = issues(s);
    return `<section class="vs-block ai-readiness ant-card ant-card-bordered" data-antd="Card" data-ai-readiness="${s.id}"><div class="vs-block-body ant-card-body">
      <div class="vs-row"><span class="pill ${s.published ? dirty ? 'warn' : 'purple' : 'warn'}">${s.published ? 'Действует версия ' + s.published.version : 'Нужна настройка'}</span>
      ${dirty ? '<span class="pill warn">Изменения в черновике</span>' : ''}</div>
      <p class="vs-note">Первый вход запускает модуль по подтверждённой логике. Повторный вход показывает историю и требует команды «Запустить заново». Настройки относятся только к этой вакансии.</p>
      ${errors.length ? plate(errors.map(esc).join(' · ')) : ''}
      <label class="vs-check">${swf(`|autoRejectAllowed`, state.autoRejectAllowed)} Компания разрешает автоотказы</label>
      <p class="vs-note">Общая политика всех вакансий. Отключение сразу блокирует новые автоотказы. Изменение политики требует права руководителя рекрутмента.</p>
      <div><button class="btn" data-vs="confirm-logic" data-id="${s.id}" ${errors.length ? 'disabled' : ''}>${s.published ? 'Подтвердить новую версию' : 'Подтвердить логику этапа'}</button></div>
      ${dirty ? '<p class="vs-note">До подтверждения работает прежняя версия. Текущие прогоны сохраняют свои вопросы и критерии.</p>' : ''}
    </div></section>`;
  }

  /* ─────────── автосохранение ─────────── */

  let saveTimer, saveStage = 'saved';
  const SAVE_TEXT = { saved: 'Все изменения сохранены', dirty: 'Есть несохранённые изменения', saving: 'Сохранение…' };

  function paintSaveState() {
    const box = document.querySelector('[data-vs-save]');
    if (!box) return;
    box.className = 'vs-save-state is-' + saveStage;
    box.textContent = SAVE_TEXT[saveStage];
  }
  function touch() {
    persist();
    document.querySelectorAll('[data-ai-readiness]').forEach(node => {
      const stage = state.stages.find(s => s.id === node.dataset.aiReadiness);
      if (stage) node.outerHTML = readiness(stage);
    });
    saveStage = 'dirty'; paintSaveState();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveStage = 'saving'; paintSaveState();
      saveTimer = setTimeout(() => { saveStage = 'saved'; paintSaveState(); }, 550);
    }, 800);
  }

  /* ─────────── производные ─────────── */

  const isSystem = s => s.kind === 'system';
  /* Отображаемое имя: своё, иначе подпись типа. Тип при переименовании не меняется. */
  const stageTitle = s => s.name || MODULE_LABEL[s.kind] || 'Этап';
  const work = () => state.stages.filter(s => !isSystem(s));                 // рабочие строки
  const live = kind => state.stages.some(s => s.kind === kind && s.enabled);
  const has = kind => state.stages.some(s => s.kind === kind);
  const sys = purpose => state.stages.find(s => s.purpose === purpose);
  const enabledWork = () => work().filter(s => s.enabled);
  const showRequirements = () => has('scoring') || has('chat-bot');
  const factorsIn = zone => state.factors.filter(f => f.zone === zone);

  /* Следующий по воронке — ближайший включённый рабочий справа; считаем по полному списку,
     иначе у выключенной строки «следующим» оказался бы первый этап воронки. */
  function nextStage(stage) {
    const i = state.stages.indexOf(stage);
    return state.stages.slice(i + 1).find(s => !isSystem(s) && s.enabled && !s.inherited) || null;
  }
  /* Куда исход ведёт по умолчанию: «прошёл» — дальше или в ожидание выхода, «не прошёл» — в отказ. */
  function defaultTarget(stage, outcome) {
    if (outcome === 'fail') return sys('rejection');
    if (nextStage(stage)) return nextStage(stage);
    const tail = window.ProductMode?.tail().stages?.[0];
    if (tail) return { id: tail[0], kind: 'manual', name: tail[1] };
    const handoff = window.ProductMode?.handoff();
    return handoff ? { id: 'handed', kind: 'system', purpose: 'awaiting', name: handoff } : sys('awaiting');
  }
  function targetOf(stage, outcome) { return defaultTarget(stage, outcome); }

  /* Путь кончается на системном терминальном этапе — только оттуда говорят наружу. */
  const endsPath = t => !!t && isSystem(t) && t.purpose !== 'response';

  /* Что видно в составе воронки: настроенные строки плюс то, что дописывает
     режим. Офферный хвост и конец пути не настраиваются — но без них состав
     воронки и рабочая лента расходятся, а это главное, что показывает макет. */
  function displayChain() {
    const handoff = window.ProductMode?.handoff?.();
    const modeName = window.ProductMode?.info?.().name || 'Своя ATS';
    const extra = ((window.ProductMode?.tail?.() || {}).stages || [])
      .map(([, name]) => ({ name, note: 'офферная часть режима, настроек нет' }));
    const chain = [sys('response'), ...work()].map(stage => ({ stage })).concat(extra.map(mode => ({ mode })));
    const terminals = [
      handoff ? { mode: { name: handoff, note: `режим «${modeName}» — дальше кандидат вне системы` } } : { stage: sys('awaiting') },
      { stage: sys('rejection') },
    ];
    return { chain, terminals };
  }

  /* Читатели зоны: у «Только резюме» это скоринг, у «Только интервью» — чат-бот, у средней оба. */
  function zoneNote(zoneId) {
    const needScoring = zoneId !== 'interview', needChat = zoneId !== 'resume';
    const scoringAlive = needScoring && live('scoring');
    const chatAlive = needChat && live('chat-bot');
    if (!scoringAlive && !chatAlive) return { text: 'сейчас ни на что не влияют', muted: true };
    if (needScoring && !scoringAlive) return { text: 'скоринг выключен — только вопросом в чат-боте', muted: false };
    if (needChat && !chatAlive && zoneId === 'both') return { text: 'чат-бот выключен — проверяются только по резюме', muted: false };
    return null;
  }

  /* ─────────── кирпичи разметки ─────────── */

  /* Значки Ant Design: разметка взята из antd/sample.html, руками не сочинялась. */
  const ICON = {
    right: 'M765.7 486.8L314.9 134.7A7.97 7.97 0 00302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281.1c-3.9 3-6.1 7.7-6.1 12.6V883c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 000-50.4z',
    'info-circle': 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z',
    'exclamation-circle': 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z',
    check: 'M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z',
  };
  const icon = (name, cls, style = '') =>
    `<span role="img" aria-label="${name}" class="anticon anticon-${name} ${cls}"><svg viewBox="64 64 896 896" focusable="false"${style ? ` style="${style}"` : ''} data-icon="${name}" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="${ICON[name]}"></path></svg></span>`;

  /* Плашка = Alert. Разметка antd, старый класс остаётся на раскладке. */
  const plate = (text, kind = 'warning') =>
    `<div class="vs-plate ${kind === 'info' ? 'is-info' : ''} ant-alert ant-alert-${kind}" role="alert"
       data-antd="Alert" data-antd-props="type=${kind} showIcon">${icon(kind === 'info' ? 'info-circle' : 'exclamation-circle', 'ant-alert-icon')}<div class="ant-alert-section"><div class="ant-alert-title">${text}</div></div></div>`;

  const sw = (on, act, id = '', disabled = false, title = '') =>
    `<button class="vs-switch ${on ? 'is-on' : ''}" data-vs="${act}" data-id="${id}" ${disabled ? 'disabled' : ''}
       ${title ? `title="${esc(title)}"` : ''} aria-pressed="${on}" aria-label="${on ? 'в воронке' : 'выключен'}"></button>`;

  function block(key, title, sum, body, { open = false, collapsible = true } = {}) {
    if (ui.forceOpen) { open = true; collapsible = false; }
    /* Collapse: разметка antd (sample.html), старые классы оставлены — на них раскладка и обработчик fold. */
    return `
    <section class="vs-block ${open ? 'is-open' : ''} ant-collapse ant-collapse-icon-placement-start"
      data-antd="Collapse" data-antd-props="${collapsible ? 'accordion=false' : 'collapsible=disabled'}">
      <div class="ant-collapse-item ${open ? 'ant-collapse-item-active' : ''}">
        <header class="vs-block-head ant-collapse-header" role="button" aria-expanded="${open}" aria-disabled="${!collapsible}"
          ${collapsible ? `tabindex="0" data-vs="fold" data-id="${key}"` : ''}>
          ${collapsible ? `<div class="ant-collapse-expand-icon">${icon('right', 'ant-collapse-arrow', open ? '-ms-transform:rotate(90deg);transform:rotate(90deg)' : '')}</div>` : ''}
          <span class="ant-collapse-title"><h3>${esc(title)}</h3></span>
          ${sum ? `<span class="vs-block-sum">${sum}</span>` : ''}
        </header>
        ${open ? `<div class="ant-collapse-panel ant-collapse-panel-active"><div class="vs-block-body ant-collapse-body">${body}</div></div>` : ''}
      </div>
    </section>`;
  }

  const isOpen = key => ui.forceOpen || !!ui.open[key];

  /* Единый писарь: data-vs-field="этап|путь.в.объекте" — и для полей, и для кнопок. */
  const owner = id => state.stages.find(s => s.id === id) || state;
  const readPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
  function writePath(obj, path, value) {
    const keys = path.split('.'), last = keys.pop();
    keys.reduce((o, k) => (o[k] ??= {}), obj)[last] = value;
  }

  const opt = (o, value) => {
    const [v, label] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(value) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  };
  const sel = (field, value, options) => `<select data-vs-field="${field}">${options.map(o => opt(o, value)).join('')}</select>`;
  const seg = (field, value, options) => `<div class="vs-seg">${options.map(([v, label]) =>
    `<button class="${v === value ? 'is-on' : ''}" data-vs="set" data-field="${field}" data-val="${v}">${esc(label)}</button>`).join('')}</div>`;
  const swf = (field, on, title = '') =>
    `<button class="vs-switch ${on ? 'is-on' : ''}" data-vs="flip" data-field="${field}" ${title ? `title="${esc(title)}"` : ''}
       aria-pressed="${on}" aria-label="${on ? 'включено' : 'выключено'}"></button>`;
  const fld = (label, inner) => `<label class="vs-field"><span>${esc(label)}</span>${inner}</label>`;
  const txt = (field, value, ph = '') => `<input type="text" data-vs-field="${field}" value="${esc(value)}" placeholder="${esc(ph)}">`;
  const area = (field, value, ph = '', rows = 3) => `<textarea data-vs-field="${field}" rows="${rows}" placeholder="${esc(ph)}">${esc(value)}</textarea>`;
  const smallBtn = (act, stageId, n, label, title, disabled = false) =>
    `<button class="vs-stage-btn" data-vs="${act}" data-id="${stageId}" data-n="${n}" ${disabled ? 'disabled' : ''} title="${esc(title)}">${label}</button>`;

  const scoreRow = s => `<div class="vs-score">${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
    `<button class="${n <= s.score ? 'is-on' : ''}" data-vs="score" data-id="${s.id}" data-n="${n}">${n}</button>`).join('')}</div>`;

  /* ─────────── «Путь кандидата» ─────────── */

  function stageSub(s) {
    if (isSystem(s)) return { text: SYSTEM_NOTE[s.purpose].split(' · ')[1] };
    if (!s.enabled) return { text: 'выключен' };
    if (MODULE_LABEL[s.kind] && !s.published) return { text: 'нужна настройка', warn: true };
    if (s.inherited) return { text: 'наследуемый · вход закрыт' };
    if (s.kind === 'scoring') return { text: `проходной балл ${s.score}` };
    if (s.kind === 'chat-bot') {
      const n = liveQ(s).length;
      return { text: `проходной балл ${s.score}${n ? ` · ${qWord(n)} своих` : ''}` };
    }
    if (s.kind === 'voice') {
      const n = liveQ(s).length;
      return n ? { text: `${qWord(n)} · ${timeLabel(s.voice?.answerTime)} на ответ` } : { text: 'нет вопросов', warn: true };
    }
    return { text: 'кандидатов двигают руками' };
  }

  function node(s, num) {
    const sub = stageSub(s);
    return `<button class="vs-node ${s.enabled ? '' : 'is-off'} ${isSystem(s) ? 'is-system' : ''}" data-vs="goto" data-id="section-${s.id}">
      <span class="vs-node-kicker">${KICKER[isSystem(s) ? s.purpose : s.kind]}</span>
      <span class="vs-node-name">${num ? `<span class="vs-node-num">${num}</span>` : ''}${esc(stageTitle(s))}</span>
      <span class="vs-node-sub ${sub.warn ? 'is-warn' : ''}">${esc(sub.text)}</span></button>`;
  }

  function modeNode(m) {
    return `<span class="vs-node is-system is-mode">
      <span class="vs-node-kicker">от режима</span>
      <span class="vs-node-name">${esc(m.name)}</span>
      <span class="vs-node-sub">${esc(m.note)}</span></span>`;
  }

  function routeCard() {
    let n = 0;
    const parts = displayChain();
    const draw = x => x.mode ? modeNode(x.mode) : node(x.stage, isSystem(x.stage) ? 0 : ++n);
    const chain = parts.chain.map(draw);
    const terminals = parts.terminals.map(draw);
    return `<section class="panel vs-route" id="section-route">
      <header class="panel-head"><h2>Путь кандидата</h2>
        <div class="actions"><button class="btn" data-vs="composer">Состав воронки</button></div></header>
      <div class="panel-body">
        <div class="vs-route-nodes">
          ${chain.join('<span class="vs-node-arrow">→</span>')}
          <span class="vs-node-split" aria-hidden="true"></span>
          ${terminals.join('')}
        </div>
        <p class="vs-route-hint">Настройки ниже идут теми же этапами — клик по узлу открывает нужный. Системные этапы переименовываются, но из воронки не убираются. Пунктирные без номера приходят от режима работы: они есть в работе, но не настраиваются.</p>
      </div></section>`;
  }

  /* ─────────── требования по трём зонам ─────────── */

  function factorRow(f) {
    const k = kindOf(f.kind);
    return `<div class="vs-factor" draggable="true" data-factor="${f.id}">
      <button class="vs-factor-kind" data-antd="Button" data-antd-props="type=text shape=circle size=small icon" data-vs="factor-kind" data-id="${f.id}" title="${esc(k.name)}">${k.icon}</button>
      <input type="text" value="${esc(f.text)}" data-vs-text="${f.id}" aria-label="Текст требования">
      ${k.id === 'text' ? `<button class="vs-factor-mark ${f.negate ? 'is-on' : ''}" data-antd="Button" data-antd-props="${f.negate ? 'color=danger variant=filled' : 'type=text'} shape=circle size=small icon" data-vs="factor-negate" data-id="${f.id}" title="Не подходит если">⊘</button>` : ''}
      <button class="vs-factor-mark ${f.critical ? 'is-on' : ''}" data-antd="Button" data-antd-props="${f.critical ? 'color=purple variant=filled' : 'type=text'} shape=circle size=small icon" data-vs="factor-critical" data-id="${f.id}" title="Критичное требование">📌</button>
      <button class="vs-factor-mark" data-antd="Button" data-antd-props="type=text shape=circle size=small icon" data-vs="factor-remove" data-id="${f.id}" title="Убрать требование">✕</button>
    </div>`;
  }

  function zoneBox(z) {
    const rows = factorsIn(z.id);
    const note = zoneNote(z.id);
    return `<div class="vs-zone ${note?.muted ? 'is-muted' : ''}" data-zone="${z.id}">
      <div class="vs-zone-head">
        <b>${z.name}</b><span class="vs-zone-who">${z.who}</span>
        ${note ? `<span class="vs-zone-off-note">· ${esc(note.text)}</span>` : ''}
        <button class="vs-zone-add" data-antd="Button" data-antd-props="type=link size=small" data-vs="factor-add" data-id="${z.id}">+ Добавить</button>
      </div>
      <div class="vs-zone-rows">
        ${rows.length ? rows.map(factorRow).join('') : '<div class="vs-zone-empty">Перетащите требование сюда или добавьте новое</div>'}
      </div></div>`;
  }

  function requirementsBlock() {
    const critical = state.factors.filter(f => f.critical).length;
    const sum = `${state.factors.length} из 15${critical ? ` · ${critical} критичных` : ''}`;
    const body = `
      <p class="vs-note">Где требование проверяется, задаёт зона — перетащите строку между зонами. Порядок зон повторяет путь кандидата.</p>
      <div><button class="btn" data-antd-props="color=purple variant=solid" data-vs="factors-generate">Сгенерировать</button></div>
      ${ZONES.map(zoneBox).join('')}`;
    return block('requirements', 'Требования к кандидату', sum, body, { open: isOpen('requirements') });
  }

  /* ─────────── скоринг ─────────── */

  function scoringBlock(s) {
    return block('scoring-' + s.id, 'Проходной балл', '', `${scoreRow(s)}
      <p class="vs-note">Два исхода: прошёл — набрал ${s.score} и выше; не прошёл — ниже порога. Ошибка обработки не является отрицательной оценкой.</p>`, { open: true, collapsible: false });
  }

  /* ─────────── разговорные модули: чат-бот и голос ─────────── */

  const talkers = () => work().filter(s => s.kind === 'chat-bot' || s.kind === 'voice');

  /* Сценарий разговора включает приглашение независимо от источника кандидата. */
  function inviteBlock(stage) {
    const inv = stage.invite || {};
    const rem = inv.reminders || [];
    const sum = rem.length ? `${rem.length} ${plural(rem.length, 'напоминание', 'напоминания', 'напоминаний')}` : 'без напоминаний';
    const isFirst = talkers().filter(s => s.enabled)[0] === stage;
    const rows = rem.map((r, i) => `
      <div class="vs-q">
        <div class="vs-row">
          ${i === 0 ? 'Если не начнёт, напомнить через' : 'Если и после первого молчит, напомнить через'}
          ${sel(`${stage.id}|invite.reminders.${i}.days`, r.days, REMIND_DAYS)}
          в ${sel(`${stage.id}|invite.reminders.${i}.at`, r.at, ['09:00', '12:00', '15:00', '18:00'])}
          <span class="vs-q-tools">${smallBtn('rem-del', stage.id, i, '✕', 'Убрать напоминание')}</span>
        </div>
        ${area(`${stage.id}|invite.reminders.${i}.text`, r.text, 'Текст напоминания', 2)}
      </div>`).join('');
    const body = `
      ${fld('Текст приглашения', area(`${stage.id}|invite.text`, inv.text, 'Текст, с которого начинается разговор', 3))}
      <p class="vs-note">${isFirst
        ? 'Этим текстом начинается разговор с кандидатом. В фигурных скобках — подстановки: {имя}, {вакансия}, {компания}.'
        : 'Кандидат уже говорил с предыдущим модулем — это текст перехода к следующему разговору.'}</p>
      <div class="vs-sub-block">
        <b style="font-size:12px">Напоминания, если не начал</b>
        ${rows || '<p class="vs-note">Напоминаний нет — кандидат либо начнёт сам, либо останется молчать.</p>'}
        <div class="vs-add-row">
          <button class="btn" data-vs="rem-add" data-id="${stage.id}" ${rem.length >= 2 ? 'disabled' : ''}>+ Добавить напоминание</button>
          ${rem.length >= 2 ? '<span class="vs-note">Больше двух напоминаний не ставим.</span>' : ''}
        </div>
      </div>`;
    return block('invite-' + stage.id, 'Приглашение и напоминания', sum, body, { open: isOpen('invite-' + stage.id) });
  }

  /* ── чат-бот ── */

  function personaBlock(stage) {
    const b = stage.bot || {};
    const label = (arr, v) => (arr.find(x => x[0] === v) || arr[0])[1];
    const sum = `${label(BOT_FACE, b.face)} · ${label(BOT_GENDER, b.gender)} · ${label(BOT_TONE, b.tone)}`;
    const critical = state.factors.filter(f => f.critical).length;
    const body = `
      <div class="vs-sub-block">
        ${fld('Бот представляется кандидату как', seg(`${stage.id}|bot.face`, b.face, BOT_FACE))}
        ${fld('Имя бота (необязательно)', txt(`${stage.id}|bot.name`, b.name, 'Введите имя бота'))}
        ${fld('Пол бота', seg(`${stage.id}|bot.gender`, b.gender, BOT_GENDER))}
        ${fld('Тон общения', seg(`${stage.id}|bot.tone`, b.tone, BOT_TONE))}
        <label class="vs-check">${swf(`${stage.id}|bot.callRecruiter`, !!b.callRecruiter)} Разрешить кандидату звать рекрутера</label>
        <p class="vs-note">Кандидат сможет позвать рекрутера в чат: интервью встанет на паузу, а в списке кандидатов появится пометка о вызове.</p>
      </div>`;
    return block('persona-' + stage.id, 'Как общается бот', sum, body, { open: isOpen('persona-' + stage.id) });
  }

  function questionCard(stage, q, pos, total) {
    const i = stage.questions.indexOf(q);           // место в полном массиве — по нему адресуются поля
    const scored = !!(q.expected || '').trim();
    return `<div class="vs-q">
      <div class="vs-q-head">
        <b>Вопрос ${pos + 1} из ${total}${q.english ? ' 🇬🇧' : ''}</b>
        ${stage.kind === 'chat-bot' ? `<span class="vs-badge ${scored ? 'is-on' : ''}" data-antd="Tag" data-antd-props="color=${scored ? 'purple' : 'default'} variant=${scored ? 'filled' : 'outlined'}">${scored ? 'Повлияет на итоговую оценку' : 'Не повлияет на итоговую оценку'}</span>` : ''}
        <span class="vs-q-tools">
          ${smallBtn('q-up', stage.id, i, '↑', 'Выше', pos === 0)}
          ${smallBtn('q-down', stage.id, i, '↓', 'Ниже', pos === total - 1)}
          ${smallBtn('q-del', stage.id, i, '✕', 'Убрать вопрос')}
        </span>
      </div>
      ${fld('Текст вопроса', area(`${stage.id}|questions.${i}.text`, q.text, 'О чём спросить кандидата', 2))}
      ${q.english
        ? '<p class="vs-note">Заготовленный вопрос на уровень английского — ответ оценивается по шкале A1–C2, свой критерий не нужен.</p>'
        : fld(stage.kind === 'voice' ? 'Правильный ответ или подсказка для оценки' : 'Ожидаемый ответ (необязательно)',
            area(`${stage.id}|questions.${i}.expected`, q.expected, 'По этому тексту модель сверяет ответ', 2))}
      <div class="vs-add-row">
        ${q.file
          ? `<span class="vs-chip" data-antd="Tag" data-antd-props="color=purple">📎 ${esc(q.file)}<button data-vs="q-file-del" data-antd="Button" data-antd-props="type=text size=small icon" data-id="${stage.id}" data-n="${i}" title="Убрать вложение">✕</button></span>`
          : `<button class="vs-mini" data-vs="q-file" data-id="${stage.id}" data-n="${i}">📎 Вложение к вопросу</button>`}
        <button class="vs-mini" data-antd-props="color=purple variant=filled size=small" data-vs="q-gen" data-id="${stage.id}" data-n="${i}">✨ Сгенерировать вопрос и ответ</button>
        ${q.english ? '' : `<button class="vs-mini" data-antd-props="color=purple variant=filled size=small" data-vs="q-gen-answer" data-id="${stage.id}" data-n="${i}">✨ Сгенерировать ответ</button>`}
      </div>
    </div>`;
  }

  /* Убранный вопрос не пропадает: он уезжает в корзину блока и возвращается оттуда целиком. */
  const liveQ = stage => (stage.questions || []).filter(q => !q.deleted);
  const deadQ = stage => (stage.questions || []).filter(q => q.deleted);

  function questionsTools(stage) {
    const dead = deadQ(stage);
    const key = 'trash-' + stage.id;
    return `<div class="vs-add-row">
        <button class="vs-mini" data-antd-props="color=purple variant=filled size=small" data-vs="q-regen" data-id="${stage.id}">✨ Перегенерировать вопросы</button>
        ${dead.length ? `<button class="vs-mini" data-vs="fold" data-id="${key}">${isOpen(key) ? 'Скрыть удалённые' : `Показать удалённые (${dead.length})`}</button>` : ''}
      </div>
      ${dead.length && isOpen(key) ? `<div class="vs-trash">${dead.map(q => `
        <div class="vs-trash-row">
          <span>${esc((q.text || 'Пустой вопрос').slice(0, 90))}</span>
          <button class="vs-mini" data-vs="q-restore" data-id="${stage.id}" data-n="${stage.questions.indexOf(q)}">Вернуть</button>
        </div>`).join('')}</div>` : ''}`;
  }

  function chatQuestionsBlock(stage) {
    const qs = liveQ(stage);
    const body = `
      <p class="vs-note">Эти вопросы бот задаёт каждому, кто дошёл до интервью. Остальные он собирает сам по требованиям из зон «Резюме + интервью» и «Только интервью».</p>
      ${questionsTools(stage)}
      ${qs.map((q, i) => questionCard(stage, q, i, qs.length)).join('')
        || '<p class="vs-note">Добавьте вопросы или сгенерируйте план разговора до подтверждения логики.</p>'}
      <div class="vs-add-row"><button class="btn" data-vs="q-add" data-id="${stage.id}">+ Добавить вопрос</button></div>
      ${qs.length ? `<div class="vs-row vs-sub-block">Задать эти вопросы в ${sel(`${stage.id}|askWhen`, stage.askWhen || 'end', ASK_WHEN)}</div>` : ''}`;
    return block('q-' + stage.id, 'Вопросы интервью', qWord(qs.length), body, { open: isOpen('q-' + stage.id) });
  }

  function chatSilenceBlock(stage) {
    const p = stage.pings || {}, policy = stage.policy;
    return block('silence-' + stage.id, 'Если кандидат не отвечает или отказался', policy.silent || policy.refused ? 'есть автоотказ' : 'решает рекрутер', `
      <label class="vs-check">${swf(`${stage.id}|policy.refused`, policy.refused)} Автоотказ при явном отказе от общения</label>
      <p class="vs-note">Кнопка отказа или однозначное сообщение. Сомнение передаётся рекрутеру без отказа.</p>
      <label class="vs-check">${swf(`${stage.id}|policy.silent`, policy.silent)} Автоотказ при отсутствии ответа</label>
      ${policy.silent ? fld('Срок ожидания ответа, часов', `<input type="number" min="1" max="720" value="${policy.hours}" data-vs-field="${stage.id}|policy.hours">`) : ''}
      <p class="vs-note">Отсчёт после доставленного приглашения или вопроса, требующего ответа. Ответ отменяет отсчёт. Ошибка доставки не считается молчанием. По умолчанию оба автоотказа выключены.</p>
      <label class="vs-check">${swf(`${stage.id}|pings.on`, !!p.on)} Напоминать кандидату</label>
      <p class="vs-note">При отказе от общения и уходе с этапа бот и неотправленные напоминания останавливаются.</p>

    `, { open: true });
  }

  /* ── голос ── */

  function voiceSettingsBlock(stage) {
    const v = stage.voice || {};
    const sum = `${timeLabel(v.answerTime)} на ответ · ${[v.saveAudio && 'аудио', v.saveVideo && 'видео'].filter(Boolean).join(' и ') || 'без записи'}`;
    const body = `
      <div class="vs-sub-block">
        <div class="vs-row">Время на один ответ ${sel(`${stage.id}|voice.answerTime`, v.answerTime, ANSWER_TIME)}</div>
        <label class="vs-check">${swf(`${stage.id}|voice.saveAudio`, !!v.saveAudio)} Сохранять аудиозапись ответа</label>
        <label class="vs-check">${swf(`${stage.id}|voice.saveVideo`, !!v.saveVideo)} Сохранять видеозапись ответа</label>
        ${v.saveVideo ? `<label class="vs-check is-nested">${swf(`${stage.id}|voice.allowSkipVideo`, !!v.allowSkipVideo)} Разрешить кандидату пропустить запись видео</label>` : ''}
      </div>`;
    return block('vset-' + stage.id, 'Настройки интервью', sum, body, { open: isOpen('vset-' + stage.id) });
  }

  function voiceQuestionsBlock(stage) {
    const qs = liveQ(stage);
    const eng = qs.filter(q => q.english).length;
    const body = `
      ${questionsTools(stage)}
      ${qs.map((q, i) => questionCard(stage, q, i, qs.length)).join('')
        || plate('Добавьте вопросы: без плана разговора логику этапа нельзя подтвердить и запустить.')}
      <div class="vs-add-row">
        <button class="btn" data-vs="q-add" data-id="${stage.id}">+ Обычный вопрос</button>
        <button class="btn" data-vs="q-add" data-id="${stage.id}" data-kind="english">+ Вопрос на знание английского 🇬🇧</button>
      </div>
      <p class="vs-note">Озвучка вопросов генерируется после сохранения — это занимает до пяти минут.</p>`;
    return block('q-' + stage.id, 'Вопросы для интервью', qWord(qs.length) + (eng ? ` · ${eng} на английском` : ''), body, { open: isOpen('q-' + stage.id) });
  }

  function brandBlock(stage) {
    const b = stage.brand || {};
    const body = `
      ${fld('Приветственное сообщение', area(`${stage.id}|brand.greeting`, b.greeting, 'Введите текст приветствия…', 3))}
      <p class="vs-note">Озвучка приветствия генерируется в течение нескольких минут после сохранения.</p>
      <div class="vs-sub-block">
        <b style="font-size:12px">Видео-кружок</b>
        <div class="vs-link">
          <span>${b.video ? esc(b.video) : 'Видео не загружено'}</span>
          <span class="vs-q-tools">
            <button class="btn" data-vs="brand-video" data-id="${stage.id}">${b.video ? 'Заменить' : 'Загрузить видео'}</button>
            ${b.video ? `<button class="btn" data-vs="brand-video-del" data-id="${stage.id}">Удалить</button>` : ''}
          </span>
        </div>
        <p class="vs-note">Запишите кружок в Telegram, скачайте и загрузите сюда. MP4, MOV или AVI до 30 МБ.</p>
      </div>`;
    return block('brand-' + stage.id, 'Брендирование', b.video ? 'приветствие и кружок' : 'только приветствие', body, { open: isOpen('brand-' + stage.id) });
  }

  function publicLinkBlock(stage) {
    const l = stage.link || {};
    const body = `
      <label class="vs-check">${swf(`${stage.id}|link.on`, !!l.on)} Разрешить запись по публичной ссылке</label>
      <p class="vs-note">По ссылке кандидат записывается на интервью сам, не дожидаясь приглашения с площадки.</p>
      ${l.on ? `<div class="vs-sub-block">
        <div class="vs-link"><code>example.com/interview/public/android-kotlin</code>
          <button class="btn" data-vs="copy-link">Скопировать ссылку</button></div>
        <label class="vs-check">${swf(`${stage.id}|link.verifyEmail`, !!l.verifyEmail)} Подтверждение email при регистрации</label>
        <label class="vs-check">${swf(`${stage.id}|link.askPhone`, !!l.askPhone)} Запрашивать телефон кандидата</label>
      </div>` : ''}`;
    return block('link-' + stage.id, 'Публичная ссылка', l.on ? 'включена' : 'выключена', body, { open: isOpen('link-' + stage.id) });
  }

  function voiceSilenceBlock(stage) { return chatSilenceBlock(stage); }

  /* ─────────── «Что делать с кандидатом» ─────────── */

  const channelsOf = () => [...(state.source ? [CHANNELS[0]] : []), ...(state.ats ? [CHANNELS[1]] : [])];

  function ruleRow(stage, outcome, ch) {
    const rule = stage.rules?.[outcome]?.[ch.id] || {};
    return `<div class="vs-rule">
      <div class="vs-rule-channel">${chLogo(ch)}<b>${ch.name}</b></div>
      <div class="vs-rule-line">Перемещать на
        <select data-antd-props="showSearch" data-vs-rule="${stage.id}|${outcome}|${ch.id}|status">
          <option value="">${esc('Выберите статус ' + ch.name)}</option>
          ${ch.statuses.map(st => `<option ${rule.status === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      ${rule.status ? `<div class="vs-rule-line">Когда
        <select data-vs-rule="${stage.id}|${outcome}|${ch.id}|delay">
          ${DELAYS.map(d => `<option ${(rule.delay || DELAYS[0]) === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select></div>` : ''}
    </div>`;
  }

  function outcomeGroup(stage, outcome, headline) {
    const target = targetOf(stage, outcome), field = outcome === 'pass' ? 'pass' : 'fail';
    return `<div class="vs-outcome"><b>${esc(headline)}</b>
      ${MODULE_LABEL[stage.kind] ? fld('Применение исхода', sel(`${stage.id}|policy.${field}`, stage.policy[field], [['manual', 'Ручное решение'], ['auto', outcome === 'pass' ? 'Автоматически на следующий этап' : 'Автоматический отказ']])) : ''}
      <p class="vs-note">${outcome === 'pass' ? 'Следующий этап' : 'Отказ'}: <b>${esc(target ? stageTitle(target) : 'Нет следующего этапа')}</b>. Произвольные ветки не настраиваются.</p>
      ${endsPath(target) ? channelsOf().map(c => ruleRow(stage, outcome, c)).join('') : '<span class="vs-note">До конца нашего пути результат наружу не передаётся.</span>'}
    </div>`;
  }

  function outwardBlock(stage) {
    const chs = channelsOf();
    const low = (MODULE_LABEL[stage.kind] || stageTitle(stage)).toLowerCase();
    const speaks = ['pass', 'fail'].filter(o => endsPath(targetOf(stage, o)));
    let sum;
    if (!speaks.length) sum = 'кандидат идёт дальше';
    else if (!chs.length) sum = 'сообщать некуда';
    else {
      const n = speaks.reduce((acc, o) => acc + chs.filter(c => stage.rules?.[o]?.[c.id]?.status).length, 0);
      sum = n ? `${n} ${n === 1 ? 'правило' : n < 5 ? 'правила' : 'правил'}` : 'правил нет';
    }
    const body = `
      ${stage.enabled ? '' : '<p class="vs-note">Модуль выключен — эти правила сейчас не работают. Правки лягут впрок.</p>'}
      ${outcomeGroup(stage, 'pass', `Кандидат прошёл ${low}`)}
      ${outcomeGroup(stage, 'fail', `Кандидат не прошёл ${low}`)}`;
    if (MODULE_LABEL[stage.kind]) sum = `прошёл: ${stage.policy.pass==='auto'?'автоматически':'вручную'} · не прошёл: ${stage.policy.fail==='auto'?'автоотказ':'вручную'}`;
    return block('outward-' + stage.id, 'Два исхода оценки', sum, body, { open: true });
  }

  /* ─────────── частые вопросы ─────────── */

  function faqBlock() {
    const rows = state.faq.map((f, i) => `
      <div class="vs-q">
        <div class="vs-q-head"><b>Вопрос ${i + 1}</b>
          <span class="vs-q-tools">${smallBtn('faq-del', '', i, '✕', 'Убрать вопрос')}</span></div>
        ${fld('О чём спрашивают', `<input type="text" data-vs-field="|faq.${i}.q" value="${esc(f.q)}" placeholder="Например: есть ли удалённый формат?">`)}
        ${fld('Что отвечать', area(`|faq.${i}.a`, f.a, 'Ответ, который бот даст кандидату', 2))}
      </div>`).join('');
    const body = `
      <p class="vs-note">Бот отвечает этими текстами, когда кандидат спрашивает сам. Чего здесь нет — на то бот честно скажет, что не знает, и позовёт рекрутера.</p>
      ${rows || '<p class="vs-note">Пока пусто — бот будет отправлять все вопросы рекрутеру.</p>'}
      <div class="vs-add-row"><button class="btn" data-vs="faq-add">+ Добавить вопрос</button></div>`;
    return block('faq', 'Частые вопросы', `${state.faq.length} ${plural(state.faq.length, 'вопрос', 'вопроса', 'вопросов')}`, body, { open: isOpen('faq') });
  }

  /* ─────────── холодный поиск ─────────── */

  /* Поиск виден там, где ему есть куда отдать найденного: площадка HH и скоринг первым в воронке. */
  function coldGate() {
    if (state.source !== 'hh') return { ok: false, why: 'Холодный поиск работает по базе резюме HeadHunter — подключите площадку источником кандидатов.' };
    const first = enabledWork()[0];
    if (!first || first.kind !== 'scoring') return { ok: false, why: 'Найденных некому оценить: поставьте скоринг резюме первым включённым этапом воронки.' };
    return { ok: true };
  }

  const searchById = id => state.searches.find(s => s.id === id);
  const foundOf = id => state.found.filter(f => f.search === id);

  function scheduleNote(s) {
    if (!s.schedule.on) return 'без расписания';
    const d = s.schedule.days;
    return `${d.length ? d.join(', ') : 'каждый день'} в ${s.schedule.at}`;
  }

  function searchSummary(s) {
    const q = s.query, tags = [];
    q.words.forEach(w => tags.push(`<span class="vs-tag" data-antd="Tag" data-antd-props="color=purple">${esc(w)}</span>`));
    if (q.regions?.length) tags.push(`<span class="vs-tag is-plain" data-antd="Tag" data-antd-props="color=default">📍 ${esc(q.regions.join(', '))}</span>`);
    if (q.from || q.to) tags.push(`<span class="vs-tag is-plain" data-antd="Tag" data-antd-props="color=default">💰 ${q.from ? 'от ' + q.from.toLocaleString('ru') : ''}${q.to ? ' до ' + q.to.toLocaleString('ru') : ''} ₽</span>`);
    if (q.exp?.length) tags.push(`<span class="vs-tag is-plain" data-antd="Tag" data-antd-props="color=default">🧭 ${esc(q.exp.join(', '))}</span>`);
    return `<div class="vs-tags">${tags.join('')}</div>`;
  }

  function runPanel(s) {
    const r = s.run;
    const status = r?.status || 'idle';
    const busy = status === 'running' || status === 'stopping';
    const got = r?.passed || 0;
    return `<div class="vs-run">
      <div class="vs-run-head">
        <span class="vs-tag ${busy ? 'is-live' : status === 'done' ? 'is-done' : 'is-plain'}" data-antd="Tag" data-antd-props="${busy ? 'color=purple variant=solid' : status === 'done' ? 'color=success' : 'color=default'}">${RUN_LABEL[status]}</span>
        ${r?.at ? `<span class="vs-note">последний запуск: ${esc(r.at)}${r.auto ? ' · по расписанию' : ''}</span>` : '<span class="vs-note">ещё ни разу не запускался</span>'}
        <span class="vs-q-tools">
          ${busy
            ? `<button class="btn" data-vs="cs-stop" data-id="${s.id}">Остановить</button>`
            : `<button class="btn" data-vs="cs-run" data-id="${s.id}">Запустить</button>`}
        </span>
      </div>
      ${r ? `
        <div class="vs-progress"><span style="width:${Math.min(100, Math.round(got / s.target * 100))}%"></span></div>
        <p class="vs-note">${got} из ${s.target} подходящих набрано${status === 'done' ? ' — поиск остановился сам' : ''}</p>
        <div class="vs-chain">${RUN_STEPS.map(([k, label], i) =>
          `<span class="vs-chain-step"><b>${r[k] ?? 0}</b><small>${label}</small></span>${i < RUN_STEPS.length - 1 ? '<span class="vs-chain-arrow">→</span>' : ''}`).join('')}</div>
        <p class="vs-note">Просмотр выдачи площадку не тратит. Платный просмотр резюме открывается только на скоринге — деньги считаются по тем, кто до него дошёл.</p>`
        : ''}
    </div>`;
  }

  function searchCard(s, withRun) {
    const waiting = foundOf(s.id).filter(f => f.state === 'waiting').length;
    return `<section class="vs-search">
      <div class="vs-search-head">
        <div class="vs-stage-name">
          <b>${esc(s.name)}</b>
          <small>${s.origin === 'url' ? 'по ссылке с hh.ru' : 'собран по требованиям вакансии'} · цель ${s.target} · ${esc(scheduleNote(s))}</small>
        </div>
        <span class="vs-q-tools">
          ${waiting ? `<span class="vs-tag is-wait" data-antd="Tag" data-antd-props="color=warning">${waiting} ждут подтверждения</span>` : ''}
          <button class="vs-mini" data-vs="cs-open-hh" data-id="${s.id}">Открыть в hh.ru</button>
          <button class="vs-mini" data-vs="cs-drop" data-id="${s.id}" title="Удалить поиск">✕</button>
        </span>
      </div>
      ${searchSummary(s)}
      ${withRun ? runPanel(s) : ''}
      <div class="vs-sub-block">
        <div class="vs-row">Набрать за запуск
          <input type="number" min="1" max="500" value="${s.target}" data-vs-field="|searches.${state.searches.indexOf(s)}.target" style="width:88px">
          подходящих</div>
        <p class="vs-note">Набрав цель, поиск останавливается сам. Больше 500 за раз не берём.</p>
        <label class="vs-check">${swf(`|searches.${state.searches.indexOf(s)}.schedule.on`, s.schedule.on)} Запускать автоматически по расписанию</label>
        ${s.schedule.on ? `<div class="vs-row is-nested">
          Время ${sel(`|searches.${state.searches.indexOf(s)}.schedule.at`, s.schedule.at, ['06:00', '09:00', '12:00', '18:00', '22:00'])}
          <span class="vs-days">${WEEK.map(d => `<button class="chip ${s.schedule.days.includes(d) ? 'active' : ''}" data-vs="cs-day" data-id="${s.id}" data-day="${d}">${d}</button>`).join('')}</span>
        </div>
        ${s.schedule.days.length ? '' : '<p class="vs-note is-nested">Дни не выбраны — значит каждый день.</p>'}` : ''}
      </div>
    </section>`;
  }

  function coldHead() {
    const n = state.searches.length;
    return `<p class="vs-note">Сохранённый поиск — запрос к базе резюме площадки. Найденных оценит скоринг, и дальше пойдут только те, кого вы подтвердите.</p>
      <div class="vs-add-row">
        <button class="btn" data-antd-props="color=purple variant=solid" data-vs="cs-new-generate">Сгенерировать по требованиям</button>
        <button class="btn" data-vs="cs-new-url">Вставить ссылку hh.ru</button>
      </div>
      ${n ? '' : '<p class="vs-note">Поисков пока нет — создайте первый.</p>'}`;
  }

  /* Блок в настройке вакансии: только состав и расписание, запуск живёт на своём экране. */
  function coldBlock() {
    const gate = coldGate();
    const n = state.searches.length;
    const sum = gate.ok ? `${n} ${plural(n, 'поиск', 'поиска', 'поисков')}` : 'недоступен';
    const body = gate.ok
      ? `${coldHead()}
         ${state.searches.map(s => searchCard(s, false)).join('')}
         <div class="vs-add-row"><button class="btn" data-antd-props="type=link" data-vs="cs-goto">Запуски и найденные →</button></div>`
      : plate(esc(gate.why));
    return block('cold', 'Холодный поиск', sum, body, { open: isOpen('cold') });
  }

  /* ── экран запусков и найденных ── */

  const csFilter = () => (ui.cs ??= { waiting: false, search: '', picked: {} });

  function foundRows() {
    const f = csFilter();
    let rows = state.found;
    if (f.search) rows = rows.filter(r => r.search === f.search);
    if (f.waiting) rows = rows.filter(r => r.state === 'waiting');
    return rows;
  }

  const FOUND_STATE = { waiting: ['Ждёт подтверждения', 'is-wait'], moved: ['Переведён', 'is-done'], rejected: ['Отказ', 'is-plain'] };
  const TAG_COLOR = { 'is-wait': 'warning', 'is-done': 'success', 'is-plain': 'default', 'is-live': 'purple' };

  function foundTable() {
    const f = csFilter();
    const rows = foundRows();
    const picked = Object.keys(f.picked).filter(k => f.picked[k]);
    const canMove = picked.filter(id => state.found.find(x => x.id === id)?.state === 'waiting').length;
    return `<section class="panel">
      <header class="panel-head"><h2>Найденные</h2>
        <div class="actions">
          <button class="btn" ${f.waiting ? 'data-antd-props="variant=filled"' : ''} data-vs="cs-filter-waiting">Ждут подтверждения</button>
          <select data-vs-cs-search>${[['', 'Все поиски'], ...state.searches.map(s => [s.id, s.name])].map(o => opt(o, f.search)).join('')}</select>
          <button class="btn primary" data-vs="cs-move" ${canMove ? '' : 'disabled'}>Перевести${canMove ? ' ' + canMove : ''}</button>
        </div>
      </header>
      <div class="panel-body">
        ${rows.length ? `<div class="vs-found">${rows.map(r => {
          const [label, cls] = FOUND_STATE[r.state];
          return `<label class="vs-found-row">
            <input type="checkbox" data-vs="cs-pick" data-id="${r.id}" ${f.picked[r.id] ? 'checked' : ''}>
            <span class="vs-stage-name"><b>${esc(r.name)}</b><small>${esc(r.role)} · ${esc(r.salary)}</small></span>
            <span class="vs-tag is-plain" data-antd="Tag" data-antd-props="color=default">${esc(searchById(r.search)?.name || 'поиск удалён')}</span>
            <span class="vs-found-score">${r.score}</span>
            <span class="vs-tag ${cls}" data-antd="Tag" data-antd-props="color=${TAG_COLOR[cls] || 'default'}">${label}</span>
            <span class="vs-note">${esc(r.at)}</span>
          </label>`;
        }).join('')}</div>`
        : '<p class="vs-note">По этому фильтру никого нет.</p>'}
      </div></section>`;
  }

  function paintCold() {
    const gate = coldGate();
    screen().innerHTML = `
      <div class="vs-head" data-vs-cold>
        <button class="vs-back" data-antd="Button" data-antd-props="type=text shape=circle icon" data-vs="back" aria-label="Вернуться к вакансии">←</button>
        <h1>Холодный поиск</h1>
        <div class="vs-head-tools">
          <span class="vs-note">${esc(state.title)}</span>
          <button class="btn" data-vs="open-setup">Настройка вакансии</button>
        </div>
      </div>
      ${gate.ok ? `
        <section class="panel"><header class="panel-head"><h2>Сохранённые поиски</h2></header>
          <div class="panel-body">${coldHead()}${state.searches.map(s => searchCard(s, true)).join('')}</div></section>
        ${foundTable()}`
        : `<section class="panel"><div class="panel-body">${plate(esc(gate.why))}</div></section>`}`;
  }

  /* Имитация прогона: счётчики бегут, пока не набрана цель или пока не остановили. */
  let runTimer;
  function startRun(s) {
    s.run = { status: 'running', at: 'только что', auto: false, seen: 0, skipped: 0, pulled: 0, scored: 0, passed: 0 };
    clearInterval(runTimer);
    runTimer = setInterval(() => {
      const r = s.run;
      if (!r || r.status === 'done') { clearInterval(runTimer); return; }
      r.seen += 17 + Math.floor(Math.random() * 12);
      r.skipped = Math.round(r.seen * 0.64);
      r.pulled = r.seen - r.skipped;
      r.scored = Math.max(0, r.pulled - 2);
      r.passed = Math.min(s.target, Math.round(r.scored * 0.12));
      if (r.passed >= s.target || (r.status === 'stopping' && r.scored >= r.pulled)) { r.status = 'done'; clearInterval(runTimer); }
      persist(); repaint();
    }, 650);
  }

  /* ─────────── секции ─────────── */

  function section({ id, num, title, kicker, toggle, off, body }) {
    return `<section class="vs-section ${off ? 'is-off' : ''}" id="${id}">
      <header class="vs-section-head">
        ${num ? `<span class="vs-section-num">${num}</span>` : ''}
        <h2>${esc(title)}</h2>
        ${kicker ? `<span class="vs-section-kicker">${esc(kicker)}</span>` : ''}
        ${toggle || ''}
      </header>
      <div class="vs-section-body">${body}</div>
    </section>`;
  }

  const descriptionBlock = () => block('description', 'Описание вакансии', '',
    `<textarea style="width:100%;min-height:120px;padding:10px;border:1px solid #d5cfdd;border-radius:9px;font-size:12px" data-vs-desc>${esc(state.description)}</textarea>`,
    { open: isOpen('description') });

  function sharedSection() {
    const blocks = [
      `<section class="vs-block ant-card ant-card-bordered" data-antd="Card"><div class="vs-block-body ant-card-body">
        <input class="vs-title-input" type="text" value="${esc(state.title)}" data-vs-title aria-label="Название вакансии">
      </div></section>`,
      showRequirements() ? requirementsBlock() : '',
      talkers().length ? faqBlock() : '',
      descriptionBlock(),
    ];
    return section({ id: 'section-shared', title: 'Общее — не привязано к одному этапу', body: blocks.filter(Boolean).join('') });
  }

  /* Секция системного этапа «Отклик» — здесь же живут источники и приём откликов. */
  const sourceBlock = () => block('source', 'Источники кандидатов', 'HeadHunter', `
        <p class="vs-note">Откуда берётся вакансия и приходят кандидаты. Задаётся один раз.</p>
        <div class="vs-rule-channel">${chLogo(CHANNELS[0])}<b>HeadHunter</b><span class="pill good" style="margin-left:6px">Подключён</span></div>
        <label class="field full">Ссылка на вакансию HeadHunter<input type="text" value="https://hh.ru/vacancy/104882170"></label>`,
    { open: isOpen('source') });

  const intakeBlock = () => block('auto', 'Приём откликов', state.autoProcessing ? 'автоматический' : 'вручную', `
        <label class="vs-check">${sw(state.autoProcessing, 'auto')} Забирать новые отклики и заводить их в воронку автоматически</label>
        <p class="vs-note">Выключите, чтобы разбирать отклики вручную на вкладке «Обработка кандидатов».</p>`,
    { open: isOpen('auto') });

  function responseSection() {
    const s = sys('response');
    const body = [sourceBlock(), intakeBlock(), coldBlock()].join('');
    return section({ id: 'section-' + s.id, title: stageTitle(s), kicker: SYSTEM_NOTE.response, body });
  }

  function stageSection(stage, num) {
    const parts = [readiness(stage)];
    /* Порядок карточек повторяет работающий Собесо: приглашение, настройки модуля, вопросы, молчание, исход. */
    if (stage.kind === 'chat-bot' || stage.kind === 'voice') {
      parts.push(inviteBlock(stage));
    }
    if (stage.kind === 'scoring') parts.push(scoringBlock(stage));
    if (stage.kind === 'chat-bot') parts.push(scoringBlock(stage), personaBlock(stage), chatQuestionsBlock(stage), chatSilenceBlock(stage));
    if (stage.kind === 'voice') parts.push(scoringBlock(stage), voiceSettingsBlock(stage), voiceQuestionsBlock(stage), brandBlock(stage), publicLinkBlock(stage), voiceSilenceBlock(stage));
    if (stage.kind === 'manual') parts.push(`<section class="vs-block ant-card ant-card-bordered" data-antd="Card"><div class="vs-block-body ant-card-body">
      <p class="vs-note">Свой этап — кандидатов двигают руками. Настраивать здесь нечего, кроме того, что произойдёт на выходе.</p>
    </div></section>`);
    parts.push(outwardBlock(stage));
    const last = stage.enabled && enabledWork().length === 1;
    const toggle = `<span class="vs-section-toggle">${stage.enabled ? 'в воронке' : 'выключен'}
      <span class="pill">${stage.enabled ? 'В шаблоне' : 'Не используется'}</span></span>`;
    return section({ id: 'section-' + stage.id, num, title: stageTitle(stage), toggle, off: !stage.enabled, body: parts.join('') });
  }

  /* ── Три внешних слота ───────────────────────────────────────────
     Режим работы продукта — не настройка и не отдельная сборка: он
     целиком выражается тем, заполнен ли слот приёмника. Поэтому
     переключается он здесь, у вакансии, а не в общих настройках. */
  const mode = () => window.ProductMode?.get?.() || 'ats';
  const sinkName = () => window.ProductMode?.sink?.() || null;

  /* state.ats — производное от режима, а не второй источник правды. */
  function syncSink() { const want = mode() === 'layer' ? 'potok' : ''; if (state.ats !== want) state.ats = want; }

  const SINK_PICK = [
    ['ats', 'Остаётся здесь', 'ведём подбор до выхода на работу: заявки, интервью, оффер'],
    ['layer', 'Хантфлоу', 'отдаём отобранных, дальше работают у себя'],
    ['board', 'Никуда', 'отобрали — дальше рекрутёр связывается сам']
  ];
  /* Карточка подписана тем же именем режима, что и переключатель: выбор
     приёмника и есть выбор режима, называть его дважды по-разному нельзя. */
  const modeName = id => window.ProductMode?.MODES?.[id]?.name || '';

  const slotRow = (label, value, note, action) => `<div class="vs-slot">
      <span class="vs-slot-label">${esc(label)}</span>
      <b>${value}</b>
      ${note ? `<small>${esc(note)}</small>` : ''}
      ${action || ''}
    </div>`;

  /* Своего чата у нас нет: перепиской бот говорит в чате площадки,
     голосом — на нашей странице интервью, куда ведёт ссылка. */
  const talkValue = () => {
    const live = enabledWork();
    const board = state.source === 'hh' ? 'чат hh.ru' : 'чат джоб-борда';
    const chat = live.some(x => x.kind === 'chat-bot');
    const voice = live.some(x => x.kind === 'voice');
    if (chat && voice) return { v: `${board} и наша страница интервью`, n: 'перепиской бот говорит на площадке, голосом — у нас по ссылке' };
    if (chat) return { v: board, n: 'бот пишет в переписку площадки, копия остаётся здесь' };
    if (voice) return { v: 'Наша страница интервью', n: 'кандидат заходит по ссылке из чата площадки или из письма' };
    return { v: 'Разговора нет', n: 'ни чат-бота, ни голоса в воронке — говорить с кандидатом некому' };
  };

  const slotsBlock = () => {
    const talk = talkValue();
    const slot = window.ProductMode?.info?.().slot || 'Результат остаётся здесь';
    return block('slots', 'Три связи', slot.charAt(0).toLowerCase() + slot.slice(1), `
      <p class="vs-note">Откуда приходят кандидаты, где мы с ними говорим и куда отдаём результат. Третья строка решает, как работает продукт.</p>
      ${slotRow('Откуда кандидаты', state.source ? chLogo(CHANNELS[0]) + ' HeadHunter' : 'Вручную',
        state.source ? 'отклики забираются автоматически' : 'кандидатов заводят руками',
        '<button class="btn" data-vs="goto" data-id="section-sys-response">Настроить</button>')}
      ${slotRow('Где идёт разговор', esc(talk.v), talk.n,
        '<button class="btn" data-vs="goto" data-id="section-route">К воронке</button>')}
      <div class="vs-slot is-pick">
        <span class="vs-slot-label">Куда отдаём результат</span>
        <div class="vs-pick">${SINK_PICK.map(([id, name, sub]) => `
          <button class="vs-pick-card ${mode() === id ? 'is-on' : ''}" data-vs="sink-pick" data-mode="${id}">
            <b>${esc(name)}</b><small>${esc(modeName(id))} · ${esc(sub)}</small></button>`).join('')}</div>
      </div>
      ${plate('Отдельной настройки «режим работы» нет: всё решает третья строка. Отключить приёмник можно в любой момент — кандидаты, воронка и переписка останутся здесь.', 'info')}`,
      { open: isOpen('slots') });
  };

  const exchangeBlock = () => block('exchange', 'Что уходит в ' + sinkName(), 'и что приходит обратно', `
      <p class="vs-note"><b>Туда</b> — как только кандидат прошёл или не прошёл наш этап: карточка, резюме, отчёт интервью, оценка с причиной.</p>
      <p class="vs-note"><b>Обратно</b> — только их статус. Показываем его в карточке кандидата, но на нашу воронку он не влияет.</p>
      <div class="vs-rule-channel">${chLogo(CHANNELS[1])}<b>${esc(sinkName())}</b><span class="pill good" style="margin-left:6px">Подключён</span></div>
      <p class="vs-note">Привязана к: Android-разработчик (Kotlin) · воронка «Внешний подбор»</p>
      <div class="actions"><button class="btn" data-vs="sink-pick" data-mode="ats">Отвязать приёмник</button></div>`,
    { open: isOpen('exchange') });

  const atsBlock = () => slotsBlock() + (mode() === 'layer' ? exchangeBlock() : '');

  const resultSection = () => section({ id: 'section-links', title: 'Внешние связи', kicker: 'откуда кандидаты, где говорим, куда отдаём', body: atsBlock() });

  /* ─────────── окно «Состав воронки» ─────────── */

  function stageRow(stage, i, num) {
    const label = isSystem(stage) ? SYSTEM_NOTE[stage.purpose]
      : stage.kind === 'manual' ? 'свой этап — кандидатов двигают руками'
      : 'модуль · ' + MODULE_LABEL[stage.kind].toLowerCase();
    const last = stage.enabled && enabledWork().length === 1;
    const renaming = ui.renaming === stage.id;
    const wk = work();
    const first = wk.indexOf(stage) === 0, tail = wk.indexOf(stage) === wk.length - 1;
    return `<div class="vs-stage-row ${stage.enabled ? '' : 'is-off'} ${isSystem(stage) ? 'is-system' : ''}">
      <span class="vs-stage-num">${num || '—'}</span>
      <span class="vs-stage-name">
        ${renaming
          ? `<input type="text" value="${esc(stageTitle(stage))}" data-vs-rename="${stage.id}" aria-label="Название этапа">`
          : `<b>${esc(stageTitle(stage))}</b><small>${esc(label)}</small>`}
      </span>
      ${renaming ? '' : `<button class="vs-stage-btn" data-vs="rename" data-id="${stage.id}" title="Переименовать">✎</button>`}
      ${isSystem(stage) ? '' : `
        <button class="vs-stage-btn" data-vs="move-up" data-id="${stage.id}" ${first ? 'disabled' : ''} title="Выше">↑</button>
        <button class="vs-stage-btn" data-vs="move-down" data-id="${stage.id}" ${tail ? 'disabled' : ''} title="Ниже">↓</button>
        <button class="vs-mini" data-vs="stage-toggle" data-id="${stage.id}">${stage.enabled ? 'Убрать из шаблона' : 'Добавить в шаблон'}</button>`}
    </div>`;
  }

  const modeRow = (m, cls) => `<div class="${cls} is-system is-mode">
      <span class="vs-stage-num">—</span>
      <span class="vs-stage-name"><b>${esc(m.name)}</b><small>${esc(m.note)}</small></span>
      <span class="vs-stage-lock" title="Этап приходит от режима работы — настроить его нельзя">🔒</span>
    </div>`;

  function composerHtml() {
    const addable = Object.keys(MODULE_LABEL);
    let n = 0;
    const parts = displayChain();
    const rows = [...parts.chain, ...parts.terminals]
      .map((x, i) => x.mode ? modeRow(x.mode, 'vs-stage-row') : stageRow(x.stage, i, isSystem(x.stage) ? 0 : ++n)).join('');
    return `<div class="vs-overlay" data-vs-overlay><div class="vs-dialog" role="dialog" aria-label="Состав воронки">
      <div class="vs-dialog-head">
        <h2>Версия шаблона воронки</h2>
        <p>Порядок задаётся шаблоном. Каждое изменение применяется новой версией после предпросмотра. Занятый убранный этап сохраняется с закрытым входом. Настройки ИИ принадлежат вакансии и сохраняются для того же этапа и типа модуля.</p>
      </div>
      <div class="vs-dialog-body">
        ${rows}
        <div class="vs-stage-add">
          <input type="text" placeholder="Название своего этапа" maxlength="120" data-vs-newstage>
          <button class="btn" data-vs="add-manual">+ Добавить свой этап</button>
          ${addable.length ? `<span class="vs-menu">
            <button class="btn" data-vs="add-menu">+ Добавить модуль</button>
            ${ui.addMenu ? `<span class="vs-menu-list ant-dropdown-flat ant-dropdown-menu" data-antd="Dropdown" role="menu">${addable.map(k => `<button class="ant-dropdown-menu-item" role="menuitem" data-vs="add-module" data-id="${k}">${MODULE_LABEL[k]}</button>`).join('')}</span>` : ''}
          </span>` : ''}
        </div>
      </div>
      <div class="vs-dialog-foot"><button class="btn primary" data-vs="close-dialog">Закрыть</button></div>
    </div></div>`;
  }

  /* ─────────── каталог видов требований ─────────── */

  function catalogHtml() {
    return `<div class="vs-overlay" data-vs-overlay><div class="vs-dialog" role="dialog" aria-label="Виды требований">
      <div class="vs-dialog-head"><h2>Что проверяем</h2>
        <p>Вид задаёт, как требование читается моделью. Виды, которые в этой зоне не живут, показаны бледными.</p></div>
      <div class="vs-dialog-body">
        ${KINDS.map(k => {
          const offZone = k.id === 'english' && ui.catalogZone === 'resume';
          return `<button class="vs-stage-row ${offZone ? 'is-off' : ''}" style="text-align:left" data-vs="pick-kind" data-id="${k.id}">
            <span class="vs-factor-kind" aria-hidden="true">${k.icon}</span>
            <span class="vs-stage-name"><b>${k.name}</b><small>${esc(k.hint)}</small></span>
          </button>`;
        }).join('')}
      </div>
      <div class="vs-dialog-foot"><button class="btn primary" data-vs="close-dialog">Закрыть</button></div>
    </div></div>`;
  }

  /* ─────────── создание холодного поиска ─────────── */

  const form = () => (ui.form ??= {});

  function csGenerateHtml() {
    const f = form();
    return `<div class="vs-overlay" data-vs-overlay><div class="vs-dialog" role="dialog" aria-label="Поиск по требованиям вакансии">
      <div class="vs-dialog-head"><h2>Поиск по требованиям вакансии</h2>
        <p>Запрос соберёт модель по описанию и требованиям. Заполненные поля перекрывают то, что она предложит.</p></div>
      <div class="vs-dialog-body">
        ${fld('Название поиска', `<input type="text" data-vs-form="name" value="${esc(f.name || '')}" placeholder="по умолчанию — название вакансии">`)}
        ${fld('Регион', `<input type="text" data-vs-form="regions" value="${esc(f.regions || '')}" placeholder="город, область или страна">`)}
        <div class="vs-row">Зарплата
          <input type="number" step="1000" data-vs-form="from" value="${esc(f.from || '')}" placeholder="от" style="width:120px">
          <input type="number" step="1000" data-vs-form="to" value="${esc(f.to || '')}" placeholder="до" style="width:120px"> ₽ в месяц</div>
        ${fld('Опыт работы', `<select data-vs-form="exp">${[['', 'не важно'], ...EXPERIENCE.map(e => [e, e])].map(o => opt(o, f.exp || '')).join('')}</select>`)}
      </div>
      <div class="vs-dialog-foot">
        <button class="btn" data-vs="close-dialog">Отмена</button>
        <button class="btn primary" data-vs="cs-create" data-id="requirements">Создать</button>
      </div></div></div>`;
  }

  function csUrlHtml() {
    const f = form();
    return `<div class="vs-overlay" data-vs-overlay><div class="vs-dialog" role="dialog" aria-label="Поиск по ссылке с hh.ru">
      <div class="vs-dialog-head"><h2>Поиск по ссылке с hh.ru</h2>
        <p>Соберите выдачу на hh.ru как привыкли и вставьте ссылку — дальше поиск работает так же, как собранный по требованиям.</p></div>
      <div class="vs-dialog-body">
        ${fld('Ссылка на выдачу', `<textarea rows="3" data-vs-form="url" placeholder="https://hh.ru/search/resume?text=...">${esc(f.url || '')}</textarea>`)}
        ${fld('Название поиска', `<input type="text" data-vs-form="name" value="${esc(f.name || '')}" placeholder="по умолчанию — название вакансии">`)}
      </div>
      <div class="vs-dialog-foot">
        <button class="btn" data-vs="close-dialog">Отмена</button>
        <button class="btn primary" data-vs="cs-create" data-id="url" ${(f.url || '').trim() ? '' : 'disabled'}>Создать</button>
      </div></div></div>`;
  }

  /* ─────────── мастер создания вакансии ─────────── */

  const WIZ_STEPS = ['Воронка', 'Источник', 'Наполнение'];
  const SOURCES = [
    { id: 'hh', name: 'HeadHunter' },
    { id: 'avito', name: 'Avito', off: 'Avito не подключён — подключите в настройках компании' },
    { id: 'potok', name: 'Хантфлоу' },
    { id: 'manual', name: 'Вручную' },
  ];
  const TEMPLATES = [
    { id: 't1', name: 'Мобильная разработка', sum: 'Скоринг → Чат-бот · требования, фиксированные вопросы · 2 сентября' },
    { id: 't2', name: 'Массовый подбор в поддержку', sum: 'Скоринг → Голос · требования, вопросы интервью · 28 августа' },
  ];

  const wiz = () => (ui.wiz ??= {
    step: 1, from: 'scratch', template: '',
    modules: { scoring: true, 'chat-bot': true, voice: false },
    source: 'hh', link: '', description: '',
    fill: 'generate', count: 5, qtype: 'regular',
  });

  /* Гейт шага: пока не выполнен, «Продолжить» не даёт идти дальше и говорит почему. */
  function wizGate() {
    const w = wiz();
    if (w.step === 1) {
      if (w.from === 'template' && !w.template) return 'Выберите шаблон, из которого создаём вакансию';
      if (!Object.values(w.modules).some(Boolean)) return 'Выберите хотя бы один модуль — воронке нужен минимум один шаг';
    }
    if (w.step === 2) {
      if (w.source === 'manual' && !w.description.trim()) return 'Вставьте описание вакансии';
      if (w.source !== 'manual' && !w.link.trim()) return 'Вставьте ссылку на вакансию';
    }
    return '';
  }

  const manualOff = () => (wiz().modules['chat-bot']
    ? 'Чат-бот разговаривает с кандидатом в чате площадки — без ссылки на вакансию боту не через что писать'
    : '');

  /* Шкала шагов мастера — Steps, разметка из antd/sample.html. */
  function wizSteps(current) {
    const items = WIZ_STEPS.map((title, i) => {
      const n = i + 1;
      const state = n < current ? 'finish' : n === current ? 'process' : 'wait';
      const mark = state === 'finish' ? icon('check', 'ant-steps-item-icon-finish') : `<span class="ant-steps-item-icon-number">${n}</span>`;
      const rail = i === WIZ_STEPS.length - 1 ? ''
        : `<div class="ant-steps-item-rail ant-steps-item-rail-${n < current ? 'process' : 'wait'}"></div>`;
      return `<div class="ant-steps-item ant-steps-item-${state} ${state === 'process' ? 'ant-steps-item-active' : ''}">
        <div class="ant-steps-item-wrapper">
          <div class="ant-steps-item-icon">${mark}</div>
          <div class="ant-steps-item-section"><div class="ant-steps-item-header">
            <div class="ant-steps-item-title">${esc(title)}</div>${rail}</div></div>
        </div></div>`;
    }).join('');
    return `<div class="vs-wiz-steps ant-steps ant-steps-horizontal ant-steps-title-horizontal ant-steps-filled" style="--steps-items-offset:0"
      data-antd="Steps" data-antd-props="current=${current - 1}">${items}</div>`;
  }

  function wizardHtml() {
    const w = wiz();
    const gate = wizGate();
    const src = SOURCES.find(s => s.id === w.source);
    let body;

    if (w.step === 1) {
      body = `
        <div class="vs-seg">
          <button class="${w.from === 'scratch' ? 'is-on' : ''}" data-vs="wiz-set" data-field="from" data-val="scratch">Собрать с нуля</button>
          <button class="${w.from === 'template' ? 'is-on' : ''}" data-vs="wiz-set" data-field="from" data-val="template">Начать с шаблона</button>
        </div>
        ${w.from === 'template' ? `
          ${fld('Шаблон', `<select data-vs-wiz="template">${[['', 'Выберите шаблон'], ...TEMPLATES.map(t => [t.id, t.name])].map(o => opt(o, w.template)).join('')}</select>`)}
          ${w.template ? `<p class="vs-note">${esc(TEMPLATES.find(t => t.id === w.template).sum)}</p>` : ''}
          <p class="vs-note">Шаблон задаёт состав; логику каждого ИИ-этапа нужно настроить и подтвердить для новой вакансии.</p>` : ''}
        <div class="vs-pick">
          ${Object.keys(MODULE_LABEL).map(k => `
            <button class="vs-pick-card ${w.modules[k] ? 'is-on' : ''}" role="checkbox" aria-checked="${!!w.modules[k]}" data-vs="wiz-module" data-id="${k}">
              <b>${MODULE_LABEL[k]}</b>
              <small>${k === 'scoring' ? 'читает резюме и ставит балл' : k === 'chat-bot' ? 'интервью перепиской' : 'разговор голосом с записью'}</small>
            </button>`).join('')}
        </div>
        <p class="vs-note">Модуль — это этап воронки: включили здесь, он встанет в маршрут кандидата. Свои ручные этапы добавите потом.</p>`;

    } else if (w.step === 2) {
      body = `
        <div class="vs-pick">
          ${SOURCES.map(s => {
            const off = s.off || (s.id === 'manual' ? manualOff() : '');
            return `<button class="vs-pick-card ${w.source === s.id ? 'is-on' : ''}" data-vs="wiz-source" data-id="${s.id}" ${off ? 'disabled' : ''} title="${esc(off)}">
              <b>${s.name}</b>${off ? `<small>${esc(off)}</small>` : ''}</button>`;
          }).join('')}
        </div>
        ${w.source === 'manual'
          ? fld('Описание вакансии', `<textarea rows="6" maxlength="10000" data-vs-wiz="description" placeholder="Вставьте текст вакансии — по нему соберутся требования и вопросы">${esc(w.description)}</textarea>`)
          : fld('Ссылка на вакансию ' + src.name, `<input type="text" data-vs-wiz="link" value="${esc(w.link)}" placeholder="https://hh.ru/vacancy/104882170">`)}
        <p class="vs-note">${w.source === 'manual'
          ? 'Кандидаты в такую вакансию попадают по публичной ссылке или заводятся руками — откликов с площадки не будет.'
          : 'Название и описание приедут с площадки один раз: дальше правки на площадке сюда не доезжают.'}</p>`;

    } else {
      const chips = [
        w.modules.scoring || w.modules['chat-bot'] ? 'требования к кандидату' : '',
        w.modules['chat-bot'] ? 'фиксированные вопросы бота' : '',
        w.modules['chat-bot'] || w.modules.voice ? 'частые вопросы для бота' : '',
        w.modules.voice ? 'вопросы голосового интервью' : '',
      ].filter(Boolean);
      body = `
        <div class="vs-pick">
          <button class="vs-pick-card ${w.fill === 'generate' ? 'is-on' : ''}" data-vs="wiz-set" data-field="fill" data-val="generate">
            <b>Сгенерировать по описанию</b><small>модель соберёт содержание, пока вы настраиваете остальное</small></button>
          <button class="vs-pick-card ${w.fill === 'empty' ? 'is-on' : ''}" data-vs="wiz-set" data-field="fill" data-val="empty">
            <b>Пустая вакансия</b><small>всё заполните сами</small></button>
        </div>
        ${w.fill === 'generate' ? `<div class="vs-tags">${chips.map(c => `<span class="vs-tag" data-antd="Tag" data-antd-props="color=default">${esc(c)}</span>`).join('')}</div>` : ''}
        ${w.fill === 'generate' && w.modules.voice ? `
          <div class="vs-sub-block">
            <div class="vs-row">Количество вопросов
              <select data-vs-wiz="count">${[5, 10, 15].map(o => opt([o, o], w.count)).join('')}</select></div>
            <div class="vs-row">Тип вопросов
              <select data-vs-wiz="qtype">${[['regular', 'Обычные вопросы'], ['star', 'STAR методология']].map(o => opt(o, w.qtype)).join('')}</select></div>
          </div>` : ''}`;
    }

    return `<div class="vs-overlay" data-vs-overlay><div class="vs-dialog" role="dialog" aria-label="Добавление вакансии">
      <div class="vs-dialog-head"><h2>Добавление вакансии</h2>
        ${wizSteps(w.step)}</div>
      <div class="vs-dialog-body">${body}${gate ? plate(esc(gate)) : ''}</div>
      <div class="vs-dialog-foot">
        <button class="btn" data-vs="${w.step === 1 ? 'close-dialog' : 'wiz-back'}">${w.step === 1 ? 'Отмена' : 'Назад'}</button>
        <button class="btn primary" data-vs="${w.step === 3 ? 'wiz-create' : 'wiz-next'}" ${gate ? 'disabled' : ''}>${w.step === 3 ? 'Создать вакансию' : 'Продолжить'}</button>
      </div></div></div>`;
  }

  /* Новая вакансия хранится отдельно; выбранные модули начинают с черновика логики. */
  function wizCreate() {
    const w = wiz();
    const previous = state;
    vacancyId = 'draft-' + Date.now();
    state = clone(previous);
    window.ATSPrototype?.register(vacancyId, w.source === 'manual' ? 'Новая вакансия' : 'Android-разработчик (Kotlin)');
    const order = ['scoring', 'chat-bot', 'voice'];
    const fresh = order.filter(k => w.modules[k]).map(k => {
      const base = { id: 'stg-' + k, kind: k, name: '', enabled: true, rules: {}, published: null, policy: { pass: 'manual', fail: 'manual', refused: false, silent: false, hours: 48 } };
      if (k === 'scoring') return { ...base, score: 7 };
      if (k === 'chat-bot') return {
        ...base, score: 7, askWhen: 'end',
        invite: { text: '', reminders: [] },
        bot: { face: 'human', name: '', gender: 'female', tone: 'formal', callRecruiter: false },
        questions: [], pings: { on: true, items: [], reject: '2 недели' },
      };
      return {
        ...base, score: 7,
        invite: { text: '', reminders: [] },
        voice: { answerTime: 120, saveAudio: true, saveVideo: true, allowSkipVideo: false },
        questions: [], brand: { greeting: '', video: '' },
        link: { on: false, verifyEmail: false, askPhone: false }, pings: { reject: '3 дня' },
      };
    });
    state.title = w.source === 'manual' ? 'Новая вакансия' : 'Android-разработчик (Kotlin)';
    state.description = w.source === 'manual' ? w.description : 'Описание приехало с площадки вместе с названием.';
    state.source = w.source === 'hh' ? 'hh' : '';
    state.ats = '';
    state.factors = [];
    state.faq = [];
    state.searches = [];
    state.found = [];
    state.stages = [
      state.stages.find(s => s.purpose === 'response'),
      ...fresh,
      state.stages.find(s => s.purpose === 'awaiting'),
      state.stages.find(s => s.purpose === 'rejection'),
    ];
    ui.dialog = null; ui.wiz = null; ui.step = null; ui.visited = {}; ui.wizardDone = true;
    touch();
    toast(w.fill === 'generate' ? 'Вакансия создана — содержание собирается моделью, настраивать можно уже сейчас' : 'Вакансия создана пустой');
    location.hash = 'vacancy/' + vacancyId + '/setup';
    if (location.hash === '#vacancy/' + vacancyId + '/setup') render('vacancy/' + vacancyId + '/setup');
  }

  /* ─────────── подтверждения ─────────── */


  /* ─────────── пошаговый режим ─────────── */

  /* Шаги модуля повторяют работающий Собесо: секция режима «Все блоки», разрезанная по карточкам. */
  function moduleSteps(s) {
    const tail = [{ key: 'out', title: 'Что делать дальше' }];
    if (MODULE_LABEL[s.kind]) tail.push({ key: 'confirm', title: 'Подтвердить логику' });
    const invite = state.source ? [{ key: 'invite', title: 'Приглашение' }] : [];
    if (s.kind === 'scoring') return [{ key: 'score', title: 'Проходной балл' }, ...tail];
    if (s.kind === 'chat-bot') return [...invite,
      { key: 'persona', title: 'Как общается бот' }, { key: 'questions', title: 'Вопросы' },
      { key: 'silence', title: 'Если замолчал' }, ...tail];
    if (s.kind === 'voice') return [...invite,
      { key: 'vset', title: 'Как проходит интервью' }, { key: 'questions', title: 'Вопросы' },
      { key: 'brand', title: 'Оформление' }, { key: 'silence', title: 'Если не дошёл' }, ...tail];
    return tail;
  }

  /* Единственное предупреждение маршрута: живой голос, которому нечего спросить. */
  const stageWarn = s => (s.kind === 'voice' && s.enabled && !liveQ(s).length ? 'нет вопросов' : null);

  function stepNodes() {
    const nodes = [{
      id: 'shared', title: 'Общее', kicker: 'вакансия',
      steps: [
        showRequirements() ? { key: 'req', title: 'Требования' } : { key: 'desc', title: 'Описание вакансии' },
        ...(talkers().length ? [{ key: 'faq', title: 'Частые вопросы' }] : []),
      ],
    }, {
      id: 'source', title: stageTitle(sys('response')), kicker: KICKER.response,
      steps: [
        { key: 'where', title: 'Откуда берём кандидатов' },
        ...(state.source ? [{ key: 'intake', title: 'Как забираем отклики' }] : []),
        ...(coldGate().ok ? [{ key: 'cold', title: 'Холодный поиск', optional: true }] : []),
      ],
    }];
    work().forEach(s => nodes.push({
      id: 'stage:' + s.id, title: stageTitle(s), kicker: KICKER[s.kind],
      stage: s, warn: stageWarn(s), steps: moduleSteps(s),
    }));
    nodes.push({ id: 'ats', title: 'Внешние связи', kicker: 'снаружи', steps: [{ key: 'main', title: 'Внешние связи' }] });
    nodes.push({ id: 'launch', title: 'Проверка и запуск', kicker: 'финал', steps: [{ key: 'main', title: 'Проверка и запуск' }] });
    return nodes;
  }

  const flatSteps = () => stepNodes().flatMap(n => n.steps.map(s => ({ ...s, id: n.id + '/' + s.key, node: n })));
  const currentStep = () => { const all = flatSteps(); return all.find(s => s.id === ui.step) || all[0]; };

  function launchSummary() {
    const row = (label, value, warn) => `<div class="vs-sum-row"><span>${esc(label)}</span><b class="${warn ? 'is-warn' : ''}">${value}</b></div>`;
    const chain = enabledWork().map(stageTitle).join(' → ');
    const voice = work().find(s => s.kind === 'voice' && s.enabled);
    const body = `
      <div class="vs-sum">
        ${row('Название', `<input class="vs-title-input" type="text" value="${esc(state.title)}" data-vs-title aria-label="Название вакансии">`)}
        ${row('Кандидаты', state.source ? 'HeadHunter' : 'вручную — кандидатов заводят руками', !state.source)}
        ${row('Воронка', chain ? esc(chain) : 'пусто', !chain)}
        ${row('Режим работы', esc(window.ProductMode?.info?.().name || 'Своя ATS'))}
        ${row('Результат', sinkName() ? esc(sinkName()) + ' · Android-разработчик (Kotlin)' : mode() === 'board' ? 'Наружу не уходит — кандидата забирает рекрутёр' : 'Остаётся здесь: весь путь до выхода на работу ведём мы')}
        ${voice && !liveQ(voice).length ? row('Голос', 'Вопросов нет — спрашивать кандидата будет нечего', true) : ''}
      </div>`;
    return block('launch', 'Что получилось', '', body, { open: true, collapsible: false })
      + (state.source ? block('auto-launch', 'Автоматическая обработка', state.autoProcessing ? 'включена' : 'выключена', `
        <label class="vs-check">${sw(state.autoProcessing, 'auto')} Забирать новые отклики и заводить их в воронку</label>
        <p class="vs-note">Включённая обработка сразу начинает таскать кандидатов с площадки — поэтому тумблер стоит здесь, а не рядом с параметрами приёма.</p>`,
        { open: true, collapsible: false }) : '');
  }

  function stepBody(step) {
    const n = step.node, s = n.stage;
    if (n.id === 'shared') return step.key === 'req' ? requirementsBlock() : step.key === 'faq' ? faqBlock() : descriptionBlock();
    if (n.id === 'source') return step.key === 'where' ? sourceBlock() : step.key === 'intake' ? intakeBlock() : coldBlock();
    if (n.id === 'ats') return atsBlock();
    if (n.id === 'launch') return launchSummary();
    const off = s.enabled ? '' : plate('Модуль выключен: новые кандидаты сюда не пойдут. Настройки останутся на месте — правки лягут впрок.');
    const inner =
      step.key === 'invite' ? inviteBlock(s)
      : step.key === 'score' ? scoringBlock(s)
      : step.key === 'persona' ? personaBlock(s)
      : step.key === 'questions' ? (s.kind === 'voice' ? voiceQuestionsBlock(s) : chatQuestionsBlock(s))
      : step.key === 'silence' ? (s.kind === 'voice' ? voiceSilenceBlock(s) : chatSilenceBlock(s))
      : step.key === 'vset' ? voiceSettingsBlock(s)
      : step.key === 'brand' ? brandBlock(s) + publicLinkBlock(s)
      : step.key === 'confirm' ? readiness(s)
      : step.key === 'out' ? outwardBlock(s)
      : `<section class="vs-block ant-card ant-card-bordered" data-antd="Card"><div class="vs-block-body ant-card-body"><p class="vs-note">Свой этап — кандидатов двигают руками. Настраивать здесь нечего, кроме того, что произойдёт на выходе.</p></div></section>${outwardBlock(s)}`;
    return off + inner;
  }

  function railNode(n, active) {
    const s = n.stage;
    const sub = s ? stageSub(s) : null;
    return `<div class="vs-rail-node ${active ? 'is-active' : ''} ${s && !s.enabled ? 'is-off' : ''}" ${active ? 'aria-current="step"' : ''}>
      <button class="vs-rail-head" data-vs="step-go" data-id="${n.id + '/' + n.steps[0].key}">
        <span class="vs-node-kicker">${esc(n.kicker)}</span>
        <span class="vs-node-name">${esc(n.title)}</span>
        ${n.warn ? `<span class="vs-node-sub is-warn">● ${esc(n.warn)}</span>`
          : sub ? `<span class="vs-node-sub">${esc(sub.text)}</span>` : ''}
      </button>
      ${s ? `<span class="vs-rail-toggle">${sw(s.enabled, 'stage-toggle', s.id, s.enabled && enabledWork().length === 1, 'В воронке должен остаться хотя бы один включённый модуль')}</span>` : ''}
      ${active && n.steps.length > 1 ? `<div class="vs-rail-subs">${n.steps.map((st, i) => {
        const id = n.id + '/' + st.key;
        return `<button class="${ui.step === id ? 'is-active' : ''} ${ui.visited?.[id] ? 'is-done' : ''}" data-vs="step-go" data-id="${id}">
          <i>${i + 1}</i>${esc(st.title)}${st.optional ? '<small>необязательно</small>' : ''}</button>`;
      }).join('')}</div>` : ''}
    </div>`;
  }

  function paintSteps() {
    const all = flatSteps();
    const step = currentStep();
    ui.step = step.id;
    (ui.visited ??= {})[step.id] = true;
    const i = all.findIndex(x => x.id === step.id);
    const next = all[i + 1], prev = all[i - 1];

    ui.forceOpen = true;
    const body = stepBody(step);
    ui.forceOpen = false;
    /* Подпись под заголовком шага повторяла его слово в слово, когда у узла один шаг. */
    const sub = [step.node.title === step.title ? '' : step.node.title, step.optional ? 'необязательный шаг' : ''].filter(Boolean).join(' · ');

    screen().innerHTML = `
      <div class="vs-head">
        <button class="vs-back" data-antd="Button" data-antd-props="type=text shape=circle icon" data-vs="back" aria-label="Вернуться к вакансии">←</button>
        <h1>Редактирование</h1>
        <div class="vs-head-tools">
          <div class="segments">
            <button class="active">Пошагово</button>
            <button data-vs="mode-all">Все блоки</button>
          </div>
          <span class="vs-save-state is-${saveStage}" data-vs-save aria-live="polite">${SAVE_TEXT[saveStage]}</span>
          <button class="btn" data-vs="save-template">Сохранить как шаблон</button>
        </div>
      </div>
      <div class="vs-steps">
        <aside class="vs-rail">
          <button class="btn" data-vs="composer">Состав воронки</button>
          <div class="vs-rail-nodes">${stepNodes().map(n => railNode(n, n.id === step.node.id)).join('')}</div>
        </aside>
        <div class="vs-step-work">
          <div class="vs-step-head"><h2>${esc(step.title)}</h2>
            ${sub ? `<span class="vs-note">${esc(sub)}</span>` : ''}</div>
          ${body}
          <div class="vs-step-foot">
            <button class="btn" data-vs="step-prev" ${prev ? '' : 'disabled'}>Назад</button>
            ${next
              ? `<button class="btn primary" data-vs="step-next">Далее: ${esc(next.title)}</button>`
              : '<button class="btn primary" data-vs="step-done">Готово</button>'}
          </div>
        </div>
      </div>`;
    bindDrag();
  }

  /* ─────────── сборка страницы ─────────── */

  function paint() {
    let num = 0;
    const sections = [sharedSection(), responseSection()];
    work().forEach(s => sections.push(stageSection(s, ++num)));
    sections.push(resultSection());

    screen().innerHTML = `
      <div class="vs-head">
        <button class="vs-back" data-antd="Button" data-antd-props="type=text shape=circle icon" data-vs="back" aria-label="Вернуться к вакансии">←</button>
        <h1>Редактирование</h1>
        <div class="vs-head-tools">
          <div class="segments">
            <button data-vs="mode-steps">Пошагово</button>
            <button class="active">Все блоки</button>
          </div>
          <span class="vs-save-state is-${saveStage}" data-vs-save aria-live="polite">${SAVE_TEXT[saveStage]}</span>
          <button class="btn" data-vs="save-template">Сохранить как шаблон</button>
        </div>
      </div>
      ${routeCard()}
      ${sections.join('')}
      <div class="vs-sticky"><button class="btn primary" data-vs="save">Сохранить</button></div>`;
    bindDrag();
  }

  /* Диалоги живут в своём контейнере на body: их зовут и со страницы, и из панели вакансии. */
  function dialogHost() {
    let host = document.querySelector('#vs-dialogs');
    if (!host) { host = document.createElement('div'); host.id = 'vs-dialogs'; document.body.appendChild(host); }
    return host;
  }
  function paintDialogs() {
    if (ui.dialog === 'template-preview') { dialogHost().innerHTML = templatePreviewHTML(); return; }
    dialogHost().innerHTML =
      ui.dialog === 'composer' ? composerHtml()
      : ui.dialog === 'catalog' ? catalogHtml()
      : ui.dialog === 'cs-generate' ? csGenerateHtml()
      : ui.dialog === 'cs-url' ? csUrlHtml()
      : ui.dialog === 'wizard' ? wizardHtml()
      : '';
  }

  /* Перерисовать всё, что сейчас на экране: страницу, вкладку панели, диалоги. */
  function repaint() {
    if (screen()?.querySelector('[data-vs-cold]')) paintCold();
    else if (screen()?.querySelector('.vs-steps')) paintSteps();
    else if (screen()?.querySelector('.vs-head')) paint();
    const host = document.querySelector('#drawer-body .vs-panel');
    if (host) host.innerHTML = panelInner();
    paintDialogs();
  }

  /* ─────────── перетаскивание требований ─────────── */

  function bindDrag() {
    let dragged = null;
    screen().querySelectorAll('.vs-factor').forEach(row => {
      row.addEventListener('dragstart', e => { dragged = row.dataset.factor; row.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => { dragged = null; row.classList.remove('is-dragging'); });
    });
    screen().querySelectorAll('.vs-zone').forEach(zone => {
      zone.addEventListener('dragover', e => { if (dragged) { e.preventDefault(); zone.classList.add('is-drop'); } });
      zone.addEventListener('dragleave', () => zone.classList.remove('is-drop'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('is-drop');
        const f = state.factors.find(x => x.id === dragged);
        if (f && f.zone !== zone.dataset.zone) { f.zone = zone.dataset.zone; touch(); repaint(); }
      });
    });
  }

  /* ─────────── действия ─────────── */

  function toast(text) {
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = text; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function closeDrawer() {
    const d = document.querySelector('#drawer');
    if (d) { d.hidden = true; d.classList.remove('vacancy-details-drawer'); }
  }

  function onClick(e) {
    const overlay = e.target.closest('[data-vs-overlay]');
    if (overlay && e.target === overlay) { ui.dialog = null; ui.addMenu = false; repaint(); return; }

    const el = e.target.closest('[data-vs]');
    if (!el || !el.closest('#screen, #drawer, #vs-dialogs')) return;
    const act = el.dataset.vs, id = el.dataset.id;
    if (!canConfigure() && !['fold','goto','back','close-dialog','open-setup','open-section','cs-goto'].includes(act)) { toast('Нет права настройки. Обратитесь к Елене Крыловой'); return; }
    const stage = state.stages.find(s => s.id === id);

    if (act === 'confirm-logic') { confirmStage(id); repaint(); }
    else if (act === 'fold') { ui.open[id] = !ui.open[id]; repaint(); }
    else if (act === 'goto') { document.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (act === 'back') { location.hash = location.hash.endsWith('/setup') ? 'vacancy/' + vacancyId + '/edit' : 'vacancy/' + vacancyId; }
    else if (act === 'mode-steps' || act === 'mode-all') {
      ui.mode = act === 'mode-steps' ? 'steps' : 'all';
      try { localStorage.setItem(MODE_KEY, ui.mode); } catch { /* приватное окно */ }
      ui.mode === 'steps' ? paintSteps() : paint();
    }
    else if (act === 'step-go') { ui.step = id; paintSteps(); screen().scrollTop = 0; }
    else if (act === 'step-prev' || act === 'step-next') {
      const all = flatSteps(), i = all.findIndex(x => x.id === ui.step);
      const target = all[i + (act === 'step-next' ? 1 : -1)];
      if (target) { ui.step = target.id; paintSteps(); screen().scrollTop = 0; }
    }
    else if (act === 'step-done') { location.hash = 'vacancy/' + vacancyId; }
    else if (act === 'save' || act === 'save-template') { toast(act === 'save' ? 'Изменения сохранены' : 'Вакансия сохранена в шаблон'); }

    else if (act === 'apply-template') { applyTemplate(ui.pendingTemplate); ui.dialog = null; repaint(); toast('Новая версия шаблона применена'); }
    else if (act === 'composer') { ui.dialog = 'composer'; repaint(); }
    else if (act === 'close-dialog') { ui.dialog = null; ui.addMenu = false; ui.renaming = null; repaint(); }

    else if (act === 'stage-toggle') {
      ui.pendingTemplate = clone(state.stages);
      ui.pendingTemplate.find(s => s.id === id).enabled = !stage.enabled;
      ui.dialog = 'template-preview'; repaint();
    }
    else if (act === 'move-up' || act === 'move-down') {
      const i = state.stages.indexOf(stage), j = i + (act === 'move-up' ? -1 : 1);
      const other = state.stages[j];
      if (other && !isSystem(other)) { ui.pendingTemplate = clone(state.stages); [ui.pendingTemplate[i], ui.pendingTemplate[j]] = [ui.pendingTemplate[j], ui.pendingTemplate[i]]; ui.dialog = 'template-preview'; repaint(); }
    }
    else if (act === 'rename') { ui.renaming = id; repaint(); (document.querySelector('#drawer-body') || screen()).querySelector(`[data-vs-rename="${id}"]`)?.focus(); }
    else if (act === 'add-manual') {
      const input = document.querySelector('[data-vs-newstage]');
      const name = (input?.value || '').trim();
      if (!name) { input?.focus(); return; }
      ui.pendingTemplate = clone(state.stages); ui.pendingTemplate.splice(ui.pendingTemplate.findIndex(x => x.purpose === 'awaiting'), 0, { id: uid(), kind: 'manual', name, enabled: true, rules: {} }); ui.dialog = 'template-preview'; repaint();
    }
    else if (act === 'add-menu') { ui.addMenu = !ui.addMenu; repaint(); }
    else if (act === 'add-module') {
      ui.addMenu = false;
      const fresh = { id: uid(), kind: id, name: '', enabled: true, rules: {}, score: 7, published: null, policy: { pass: 'manual', fail: 'manual', refused: false, silent: false, hours: 48 }, pings: {}, questions: [], invite: { text: '', reminders: [] }, bot: {}, voice: {}, brand: {}, link: {} };
      ui.pendingTemplate = clone(state.stages); ui.pendingTemplate.splice(ui.pendingTemplate.findIndex(x => x.purpose === 'awaiting'), 0, fresh); ui.dialog = 'template-preview'; repaint();
    }

    else if (act === 'set' || act === 'flip') {
      const [sid, path] = el.dataset.field.split('|');
      if (!canAutoReject() && (path === 'autoRejectAllowed' || path === 'policy.refused' || path === 'policy.silent')) { toast('Нет права включения автоотказа. Обратитесь к Елене Крыловой'); return; }
      const target = owner(sid);
      if (act === 'flip') writePath(target, path, !readPath(target, path));
      else { const raw = el.dataset.val; writePath(target, path, /^-?\d+$/.test(raw) ? +raw : raw); }
      touch(); repaint();
    }
    else if (act === 'q-add') {
      stage.questions ??= [];
      stage.questions.push(el.dataset.kind === 'english'
        ? { id: uid(), text: 'Tell us about your last project in English.', expected: '', english: true }
        : { id: uid(), text: '', expected: '', english: false });
      touch(); repaint();
    }
    else if (act === 'q-del') { stage.questions[+el.dataset.n].deleted = true; touch(); repaint(); }
    else if (act === 'q-restore') { delete stage.questions[+el.dataset.n].deleted; touch(); repaint(); }
    else if (act === 'q-up' || act === 'q-down') {
      const qs = stage.questions, i = +el.dataset.n, step = act === 'q-up' ? -1 : 1;
      let j = i + step;
      while (qs[j]?.deleted) j += step;        // удалённые в перестановке не участвуют
      if (qs[j]) { [qs[i], qs[j]] = [qs[j], qs[i]]; touch(); repaint(); }
    }
    else if (act === 'q-file') { stage.questions[+el.dataset.n].file = 'shema-arhitektury.png'; touch(); repaint(); toast('Вложение добавится к вопросу — кандидат увидит его вместе с текстом'); }
    else if (act === 'q-file-del') { delete stage.questions[+el.dataset.n].file; touch(); repaint(); }
    else if (act === 'q-gen') { toast('Модель напишет вопрос и ответ по описанию вакансии и требованиям'); }
    else if (act === 'q-gen-answer') { toast('Модель напишет ожидаемый ответ по тексту вопроса'); }
    else if (act === 'q-regen') { toast('Модель пересоберёт весь список вопросов — прежние уедут в удалённые'); }
    else if (act === 'rem-add') {
      stage.invite.reminders ??= [];
      if (stage.invite.reminders.length >= 2) return;
      stage.invite.reminders.push({ days: 1, at: '12:00', text: '' });
      touch(); repaint();
    }
    else if (act === 'rem-del') { stage.invite.reminders.splice(+el.dataset.n, 1); touch(); repaint(); }
    else if (act === 'ping-add') {
      stage.pings.items ??= [];
      if (stage.pings.items.length >= 2) return;
      stage.pings.items.push({ delay: '1 день', text: '' });
      touch(); repaint();
    }
    else if (act === 'ping-del') { stage.pings.items.splice(+el.dataset.n, 1); touch(); repaint(); }
    else if (act === 'brand-video') { stage.brand.video = 'kruzhok-android.mp4'; touch(); repaint(); toast('Видео-кружок загружен'); }
    else if (act === 'brand-video-del') { stage.brand.video = ''; touch(); repaint(); }
    else if (act === 'copy-link') { toast('Ссылка скопирована'); }

    else if (act === 'wiz-set') { wiz()[el.dataset.field] = el.dataset.val; paintDialogs(); }
    else if (act === 'wiz-module') { const m = wiz().modules; m[id] = !m[id]; paintDialogs(); }
    else if (act === 'wiz-source') { wiz().source = id; paintDialogs(); }
    else if (act === 'wiz-next') { if (!wizGate()) { wiz().step++; paintDialogs(); } }
    else if (act === 'wiz-back') { wiz().step--; paintDialogs(); }
    else if (act === 'wiz-create') { if (!wizGate()) wizCreate(); }

    else if (act === 'faq-add') { state.faq.push({ id: uid(), q: '', a: '' }); touch(); repaint(); }
    else if (act === 'faq-del') { state.faq.splice(+el.dataset.n, 1); touch(); repaint(); }

    else if (act === 'cs-new-generate') { ui.form = {}; ui.dialog = 'cs-generate'; repaint(); }
    else if (act === 'cs-new-url') { ui.form = {}; ui.dialog = 'cs-url'; repaint(); }
    else if (act === 'cs-create') {
      const f = form();
      if (id === 'url' && !(f.url || '').trim()) return;
      const words = id === 'url'
        ? [...decodeURIComponent(f.url).matchAll(/text=([^&]+)/g)].flatMap(m => m[1].split('+')).slice(0, 4)
        : String(state.title).split(/[\s(),]+/).filter(w => w.length > 2).slice(0, 3);
      state.searches.push({
        id: uid(),
        name: (f.name || '').trim() || state.title,
        origin: id === 'url' ? 'url' : 'requirements',
        url: id === 'url' ? f.url : '',
        query: {
          words: words.length ? words : ['Android'],
          regions: (f.regions || '').split(',').map(x => x.trim()).filter(Boolean),
          from: +f.from || null, to: +f.to || null,
          exp: f.exp ? [f.exp] : [],
        },
        target: 20, schedule: { on: false, at: '09:00', days: [] }, run: null,
      });
      ui.dialog = null; ui.form = {};
      touch(); repaint();
      toast(id === 'url' ? 'Поиск создан по ссылке — запустите его на экране холодного поиска' : 'Модель собрала запрос — проверьте параметры и запустите');
    }
    else if (act === 'cs-drop') { state.searches = state.searches.filter(s => s.id !== id); touch(); repaint(); }
    else if (act === 'cs-day') {
      const s = searchById(id), d = el.dataset.day;
      s.schedule.days = s.schedule.days.includes(d) ? s.schedule.days.filter(x => x !== d) : [...s.schedule.days, d].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b));
      touch(); repaint();
    }
    else if (act === 'cs-run') { startRun(searchById(id)); touch(); repaint(); }
    else if (act === 'cs-stop') { const s = searchById(id); if (s.run) s.run.status = 'stopping'; touch(); repaint(); }
    else if (act === 'cs-open-hh') { toast('Выдача откроется на hh.ru в новой вкладке'); }
    else if (act === 'cs-goto') { closeDrawer(); location.hash = 'vacancy/android/cold-search'; }
    else if (act === 'cs-filter-waiting') { csFilter().waiting = !csFilter().waiting; repaint(); }
    else if (act === 'cs-pick') { csFilter().picked[id] = el.checked; repaint(); }
    else if (act === 'cs-move') {
      const f = csFilter();
      const ids = Object.keys(f.picked).filter(k => f.picked[k]);
      let n = 0;
      ids.forEach(x => { const r = state.found.find(y => y.id === x); if (r?.state === 'waiting') { r.state = 'moved'; n++; } });
      f.picked = {};
      touch(); repaint();
      toast(`${n} ${plural(n, 'кандидат переведён', 'кандидата переведены', 'кандидатов переведены')} на следующий этап`);
    }

    else if (act === 'score') { stage.score = +el.dataset.n; touch(); repaint(); }
    else if (act === 'auto') { state.autoProcessing = !state.autoProcessing; touch(); repaint(); }
    else if (act === 'sink-pick') { window.ProductMode?.set?.(el.dataset.mode); syncSink(); touch(); repaint(); }
    else if (act === 'ats-bind') { window.ProductMode?.set?.('layer'); syncSink(); touch(); repaint(); }
    else if (act === 'ats-unbind') { window.ProductMode?.set?.('ats'); syncSink(); touch(); repaint(); }

    else if (act === 'factor-critical') { const f = state.factors.find(x => x.id === id); f.critical = !f.critical; touch(); repaint(); }
    else if (act === 'factor-negate') { const f = state.factors.find(x => x.id === id); f.negate = !f.negate; touch(); repaint(); }
    else if (act === 'factor-remove') { state.factors = state.factors.filter(x => x.id !== id); touch(); repaint(); }
    else if (act === 'factor-add') {
      if (state.factors.length >= 15) { toast('Больше 15 требований на вакансию не ставим'); return; }
      ui.catalogZone = id; ui.catalogFactor = null; ui.dialog = 'catalog'; repaint();
    }
    else if (act === 'factor-kind') { const f = state.factors.find(x => x.id === id); ui.catalogZone = f.zone; ui.catalogFactor = id; ui.dialog = 'catalog'; repaint(); }
    else if (act === 'pick-kind') {
      if (ui.catalogFactor) { state.factors.find(x => x.id === ui.catalogFactor).kind = id; ui.dialog = null; }
      else state.factors.push({ id: uid(), kind: id, text: '', zone: ui.catalogZone, critical: false, negate: false });
      touch(); repaint();
    }
    else if (act === 'factors-generate') { toast('Требования собираются моделью по описанию вакансии'); }

    /* панель вакансии */
    else if (act === 'open-setup') { closeDrawer(); location.hash = 'vacancy/' + vacancyId + '/setup'; }
    else if (act === 'open-section') { closeDrawer(); ui.jumpTo = 'section-' + id; location.hash = 'vacancy/' + vacancyId + '/setup'; }
    else if (act === 'add-menu-panel') { ui.dialog = 'composer'; repaint(); }
  }

  function onInput(e) {
    const t = e.target;
    if (e.type === 'change' && t.tagName !== 'SELECT') return;
    if (t.dataset.vsWiz !== undefined) {
      const key = t.dataset.vsWiz;
      const was = wizGate();
      wiz()[key] = key === 'count' ? +t.value : t.value;
      /* Перерисовываем только когда меняется «можно ли дальше» — иначе каретка прыгает на каждой букве. */
      if (t.tagName === 'SELECT' || !!was !== !!wizGate()) paintDialogs();
      return;
    }
    if (t.dataset.vsForm !== undefined) {
      form()[t.dataset.vsForm] = t.value;
      if (t.tagName === 'TEXTAREA') paintDialogs();   // кнопка «Создать» оживает от ссылки
      return;
    }
    if (t.hasAttribute('data-vs-cs-search')) { csFilter().search = t.value; repaint(); return; }
    if (t.dataset.vsField) {
      const [sid, path] = t.dataset.vsField.split('|');
      const isSelect = t.tagName === 'SELECT';
      writePath(owner(sid), path, (t.type === 'number' || isSelect && /^-?\d+$/.test(t.value)) ? +t.value : t.value);
      touch();
      if (isSelect) repaint();   // селект может открыть или закрыть соседние строки
      return;
    }
    if (t.dataset.vsText) { const f = state.factors.find(x => x.id === t.dataset.vsText); if (f) { f.text = t.value; touch(); } }
    else if (t.hasAttribute('data-vs-title')) { state.title = t.value; touch(); }
    else if (t.hasAttribute('data-vs-desc')) { state.description = t.value; touch(); }
    else if (t.dataset.vsRename) { const s = state.stages.find(x => x.id === t.dataset.vsRename); if (s) { s.name = t.value; touch(); } }
    else if (t.dataset.vsTarget) {
      const [stageId, outcome] = t.dataset.vsTarget.split('|');
      const s = state.stages.find(x => x.id === stageId);
      s.rules[outcome] ??= {};
      delete s.rules[outcome].target;
      touch(); repaint();
    }
    else if (t.dataset.vsRule) {
      const [stageId, outcome, ch, field] = t.dataset.vsRule.split('|');
      const s = state.stages.find(x => x.id === stageId);
      s.rules[outcome] ??= {}; s.rules[outcome][ch] ??= {};
      s.rules[outcome][ch][field] = t.value;
      if (field === 'status' && !t.value) delete s.rules[outcome][ch];
      touch(); repaint();
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && e.target.dataset.vsRename && ui) { ui.renaming = null; repaint(); }
    if (e.key === 'Enter' && e.target.hasAttribute('data-vs-newstage')) document.querySelector('[data-vs="add-manual"]')?.click();
    if (e.key === 'Escape' && ui?.dialog) { ui.dialog = null; ui.addMenu = false; repaint(); }
  }

  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('keydown', onKey);


  /* ─────────── вкладка «Воронка и ИИ» в панели вакансии ─────────── */

  function previewTemplate(next) {
    const old = state.stages;
    return next.filter(x => MODULE_LABEL[x.kind]).map(x => ({ id: x.id, name: stageTitle(x),
      preserved: old.some(y => y.id === x.id && y.kind === x.kind && y.published) }));
  }
  function templatePreviewHTML() {
    const preview = previewTemplate(ui.pendingTemplate);
    return `<div class="vs-overlay" data-vs-overlay><div class="vs-dialog" role="dialog" aria-label="Предпросмотр шаблона">
      <div class="vs-dialog-head"><h2>Применить новую версию шаблона</h2></div><div class="vs-dialog-body">
      <p>Состав и порядок: ${ui.pendingTemplate.filter(x => !isSystem(x) && x.enabled).map(stageTitle).map(esc).join(' → ')}</p>
      ${preview.map(x => `<p><b>${esc(x.name)}</b> — ${x.preserved ? 'локальная логика сохраняется' : 'требует настройки'}</p>`).join('')}
      <p class="vs-note">Кандидаты не перемещаются. Удалённый занятый этап сохраняется с закрытым входом. Старые прогоны не выполняют переходов по новой версии.</p>
      </div><div class="vs-dialog-foot"><button class="btn" data-vs="close-dialog">Отмена</button><button class="btn primary" data-vs="apply-template">Применить</button></div></div></div>`;
  }
  function applyTemplate(next) {
    if (!canConfigure()) { toast('Нет права настройки шаблона. Обратитесь к Елене Крыловой'); return false; }
    const old = state.stages;
    const merged = clone(next).map(x => {
      const prior = old.find(y => y.id === x.id && y.kind === x.kind);
      return prior ? clone({ ...prior, name: x.name, enabled: x.enabled }) : { ...x, published: null };
    });
    old.filter(x => !isSystem(x) && (!merged.some(y => y.id === x.id && y.enabled) && window.CandidacyRuns?.occupied(x.id))).forEach(x => {
      const inherited = clone(x); inherited.enabled = true; inherited.inherited = true;
      const i = merged.findIndex(y => y.id === x.id);
      if (i >= 0) merged[i] = inherited; else merged.splice(merged.findIndex(y => y.purpose === 'awaiting'), 0, inherited);
    });
    state.stages = merged; state.structureVersion++;
    state.templateHistory ??= []; state.templateHistory.unshift({at:Date.now(),version:state.structureVersion}); touch();
    return true;
  }

  function panelRow(stage, num) {
    const label = isSystem(stage) ? SYSTEM_NOTE[stage.purpose]
      : stage.kind === 'manual' ? 'свой этап — кандидатов двигают руками'
      : 'модуль · ' + MODULE_LABEL[stage.kind].toLowerCase();
    const last = stage.enabled && enabledWork().length === 1;
    const renaming = ui.renaming === stage.id;
    const wk = work();
    const first = wk.indexOf(stage) === 0, tail = wk.indexOf(stage) === wk.length - 1;
    return `<div class="vs-panel-row ${stage.enabled ? '' : 'is-off'} ${isSystem(stage) ? 'is-system' : ''}">
      <span class="vs-stage-num">${num || '—'}</span>
      <span class="vs-stage-name">
        ${renaming
          ? `<input type="text" value="${esc(stageTitle(stage))}" data-vs-rename="${stage.id}" aria-label="Название этапа">`
          : `<b>${esc(stageTitle(stage))}</b><small>${esc(label)}</small>`}
      </span>
      ${isSystem(stage) || (stage.kind === 'manual' && stage.enabled) ? ''
        : `<span class="vs-panel-sub">${esc(stageSub(stage).text)}</span>`}
      ${renaming ? '' : `<button class="vs-stage-btn" data-vs="rename" data-id="${stage.id}" title="Переименовать">✎</button>`}
      ${isSystem(stage) ? '<span class="vs-stage-lock" title="Системный этап: имя меняется, назначение нет">🔒</span>' : `
        <button class="vs-stage-btn" data-vs="move-up" data-id="${stage.id}" ${first ? 'disabled' : ''} title="Выше">↑</button>
        <button class="vs-stage-btn" data-vs="move-down" data-id="${stage.id}" ${tail ? 'disabled' : ''} title="Ниже">↓</button>
        <button class="vs-mini" data-vs="stage-toggle" data-id="${stage.id}">${stage.enabled ? 'Убрать из шаблона' : 'Добавить в шаблон'}</button>`}
      ${isSystem(stage) ? '' : `<button class="vs-panel-open" data-vs="open-section" data-id="${stage.id}" title="Открыть настройки этапа">→</button>`}
    </div>`;
  }

  function panelInner() {
    if (!state) load();
    ui = ui || { open: { requirements: true, slots: true, 'persona-stg-chat': true, 'q-stg-chat': true }, dialog: null, addMenu: false, renaming: null };
    let n = 0;
    const parts = displayChain();
    const rows = [...parts.chain, ...parts.terminals]
      .map(x => x.mode ? modeRow(x.mode, 'vs-panel-row') : panelRow(x.stage, isSystem(x.stage) ? 0 : ++n)).join('');
    const modules = work().filter(s => MODULE_LABEL[s.kind]);
    const liveModules = modules.filter(s => s.enabled).length;
    return `
      <section class="vacancy-overview-section">
        <div class="drawer-section-head">
          <div><h3>Воронка и ИИ</h3>
            <p>Этапы идут сверху вниз — тем же порядком их проходит кандидат. ИИ-модуль это этап: включили — он встал в воронку.</p></div>
          <span class="pill purple">${liveModules} из ${modules.length || 0} модулей включено</span>
        </div>
        <div class="vs-panel-rows">${rows}</div>
        <div class="vs-panel-foot">
          <button class="btn" data-vs="add-menu-panel">+ Добавить модуль или этап</button>
          <button class="btn" data-vs="open-setup">Все настройки вакансии <span>→</span></button>
        </div>
      </section>
      ${(() => {
        const gate = coldGate();
        const waiting = state.found.filter(f => f.state === 'waiting').length;
        return `<section class="vacancy-overview-section">
          <div class="drawer-section-head">
            <div><h3>Холодный поиск</h3>
              <p>Сохранённые запросы к базе резюме площадки. Найденных оценит скоринг, дальше — только с вашим подтверждением.</p></div>
            ${gate.ok && waiting ? `<span class="pill warn">${waiting} ждут подтверждения</span>` : ''}
          </div>
          ${gate.ok ? `<div class="vs-panel-rows">${state.searches.map(s => `
            <div class="vs-panel-row">
              <span class="vs-stage-name"><b>${esc(s.name)}</b><small>цель ${s.target} · ${esc(scheduleNote(s))}</small></span>
              <span class="vs-panel-sub">${s.run ? esc(RUN_LABEL[s.run.status].split(' —')[0]) + ' · ' + (s.run.passed || 0) + ' подошли' : 'не запускался'}</span>
            </div>`).join('') || '<p class="vs-note">Поисков пока нет.</p>'}</div>
            <div class="vs-panel-foot"><button class="btn" data-vs="cs-goto">Запуски и найденные →</button></div>`
          : `<p class="vs-note">${esc(gate.why)}</p>`}
        </section>`;
      })()}
      <section class="vacancy-overview-section">
        <div class="drawer-section-head"><div><h3>Куда уходит результат</h3>
          <p>Наружу говорит тот исход, на котором путь кандидата кончается. Настраивается на строке этапа.</p></div></div>
        <div class="vs-panel-channels">
          ${channelsOf().map(c => `<div class="vs-rule-channel">${chLogo(c)}<b>${c.name}</b></div>`).join('')
            || '<p class="vs-note">Ни площадки, ни привязанной АТС — сообщать об исходах некуда.</p>'}
        </div>
      </section>`;
  }

  const panel = () => `<div class="vs-panel">${panelInner()}</div>`;

  /* ─────────── контракт с роутером ─────────── */

  function render(route) {
    const cold = /^vacancy\/[^/]+\/cold-search$/.test(route);
    if (!cold && !/^vacancy\/[^/]+\/(edit|setup)$/.test(route)) return false;
    if (!state) load();
    ui = ui || { open: { requirements: true, slots: true, 'persona-stg-chat': true, 'q-stg-chat': true }, dialog: null, addMenu: false, renaming: null };
    if (!canConfigure()) { screen().innerHTML = `<div class="vs-head"><button data-vs="back" class="vs-back" data-antd="Button" data-antd-props="type=text shape=circle icon" aria-label="Вернуться к вакансии">←</button><h1>Настройки ИИ-этапа</h1></div><div class="note"><b>Нет права настройки</b><p>Подготовить ИИ-этап может Елена Крылова, руководитель рекрутмента. Кандидат остаётся на прежнем этапе.</p><button class="btn" data-vs="back">Вернуться к вакансии</button></div>`; return true; }
    ui.dialog = null;
    syncSink();   // режим и слот приёмника — одно и то же
    if (cold) { paintCold(); paintDialogs(); return true; }
    if (ui.mode === undefined) { try { ui.mode = localStorage.getItem(MODE_KEY) || 'all'; } catch { ui.mode = 'all'; } }
    if (ui.jumpTo) ui.mode = 'all';   // из панели ведут к конкретной секции — она живёт в «Все блоки»
    if (ui.wizardDone) { ui.wizardDone = false; ui.mode = 'steps'; ui.step = null; }
    ui.mode === 'steps' ? paintSteps() : paint();
    paintDialogs();
    if (ui.jumpTo) { const t = ui.jumpTo; ui.jumpTo = null; setTimeout(() => document.querySelector('#' + t)?.scrollIntoView({ block: 'start' }), 30); }
    return true;
  }

  /* Панель вакансии читает отсюда состав воронки — чтобы витрина и рабочее место не разъезжались. */
  function funnel() {
    if (!state) load();
    return state.stages.map(s => ({
      id: s.id, kind: s.kind, purpose: s.purpose || null, system: isSystem(s),
      name: stageTitle(s), enabled: s.enabled, inherited: !!s.inherited, sub: stageSub(s).text, ready: !!s.published, version: s.published?.version || null, score: s.published?.config.score || s.score,
    }));
  }

  /* Мастер зовут снаружи — из общей кнопки «Создать» продукта. */
  function wizard() {
    if (!state) load();
    ui = ui || { open: { requirements: true, slots: true }, dialog: null, addMenu: false, renaming: null };
    ui.wiz = null; ui.dialog = 'wizard';
    paintDialogs();
  }

  /* Карточка кандидата читает отсюда требования и вопросы — прогоны показывают то, что настроено. */
  const requirements = () => { if (!state) load(); return state.factors.map(f => ({ text: f.text, zone: f.zone, critical: f.critical, negate: f.negate })); };
  const questionsOf = kind => {
    if (!state) load();
    const s = state.stages.find(x => x.kind === kind);
    return (s?.questions || []).filter(q => !q.deleted).map(q => ({ text: q.text, english: !!q.english, expected: q.expected }));
  };

  return { render, funnel, panel, wizard, requirements, questionsOf, context, snapshot, openStage, confirmStage, canConfigure, canAutoReject, demoRole, vacancy: () => vacancyId, policyAllowed: () => !!state.autoRejectAllowed, structureVersion: () => state.structureVersion, templateHistory: () => clone(state.templateHistory || []), previewTemplate, applyTemplate };
})();
