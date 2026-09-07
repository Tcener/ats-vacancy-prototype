/* ─────────────────────────────────────────────────────────────
   Оболочка приложения: шапка, сайдбар, меню, модалки.
   Одинакова на всех экранах, поэтому живёт здесь, а не копируется
   в каждый файл. Экран подключает shell.js и вызывает HF.mount().

   Все данные ниже — вымышленные. Структура повторяет боевой Хантфлоу,
   содержимое намеренно другое: реальным кандидатам не место в макете.
   ───────────────────────────────────────────────────────────── */

const HF = (() => {

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const icon = (name, size) =>
    `<svg${size ? ` style="width:${size}px;height:${size}px"` : ''}><use href="#${name}"></use></svg>`;

  /* ── Данные ───────────────────────────────────────────────── */

  const VACANCIES = [
    { id: 'analyst', name: 'Analyst', org: 'Рефни', count: 46 },
    { id: 'data-analyst', name: 'Data Analyst', org: 'Рефни', count: 0 },
    { id: 'data-scientist', name: 'Data scientist', org: 'Рефни', count: 0 },
    { id: 'fullstack-node', name: 'Fullstack-разработчик (Node)', org: 'Рефни', count: 122 },
    { id: 'java', name: 'Java', org: 'Рефни', count: 9 },
    { id: 'product-analyst', name: 'Product Analyst', org: 'Рефни', count: 31 },
    { id: 'qa-automation', name: 'QA Automation', org: 'Рефни', count: 17 },
    { id: 'backend', name: 'Backend-разработчик', org: 'Рефни', count: 64 },
    { id: 'devops', name: 'DevOps-инженер', org: 'Рефни', count: 12 },
  ];

  /* Этапы подбора вакансии и сколько кандидатов на них сейчас.
     Лежат в оболочке, а не в экране вакансии: теми же этапами
     подписана статистика на экране сведений о вакансии. */
  const FUNNEL = [
    ['В работе', 122, true], ['Новые', 5], ['Отправлено письмо', 94],
    ['Оценка заказчиком', 6], ['Интервью с HR', 12], ['Интервью с заказчиком', 4],
    ['Техническое собеседование', 3], ['Выставлен оффер', 1], ['Отказ', 47],
  ];

  /* Полоса вкладок над списком всех кандидатов: этапы всех воронок
     сразу, а не одной вакансии. Общая для «Всех кандидатов» и «Картины
     дня» — это один экран приложения с двумя вкладками. */
  const STAGES = [
    ['Все', 55902, true], ['Новые', 4570], ['Отправлено письмо', 1305],
    ['Оценка заказчиком', 501], ['Интервью с HR', 235], ['Интервью с заказчиком', 188],
    ['Техническое собеседование', 79], ['Принятие решения', 1], ['Выставлен оффер', 9],
    ['Оффер принят', 1], ['Отказ', 3181],
  ];

  /* Разделы настроек, у которых уже есть макет. Это же меню —
     единственный способ попасть в настройки, не выходя из работы:
     внутри самих настроек соседних разделов не видно, там только
     подвкладки текущего. */
  const SETTINGS_LINKS = {
    'Настройки Собессо': 'settings.html#s=home',
    'Мой профиль': 'settings.html#s=profile',
    'Руководство пользователя': 'settings.html#s=home',
    'Бухгалтерские документы': 'settings.html#s=home',
    'Рекрутеры и заказчики': 'settings.html#s=users&t=recruiters',
    'Организация': 'settings.html#s=org&t=company',
    'Воронка': 'settings.html#s=funnel&t=stages',
    'Бизнес-процесс': 'settings.html#s=business&t=requests',
    'Шаблоны, оценка и анкеты': 'settings.html#s=templates&t=mail',
    'Сбор откликов': 'settings.html#s=response',
    'API и вебхуки': 'settings.html#s=api',
  };

  const MENUS = {
    plus: {
      width: 300,
      items: [
        ['Добавить вакансию', 'business-vacancy'],
        ['Добавить кандидата', 'applicants'],
        /* Форм заявки в компании может быть несколько, поэтому пункт
           не открывает форму сразу, а раскрывает список форм */
        ['Добавить заявку на подбор', 'edit-2-20', { menu: 'request-forms' }],
        ['Добавить событие', 'calendar-20'],
      ],
    },
    /* Второй уровень меню «+»: какой формой заводить заявку.
       Список берётся из настроек бизнес-процесса — там же он и правится */
    'request-forms': {
      width: 300,
      items: [
        ['Заявка на подбор', 'business-request', { modal: 'request-start', form: 'request' }],
        ['Заявка с согласованием', 'business-request', { modal: 'request-start', form: 'request-approval' }],
      ],
    },
    account: {
      width: 300,
      title: 'Рефни',
      items: [
        ['Настройки Хантфлоу', 'settings'],
        ['Мой профиль', 'userpic'],
        ['Руководство пользователя', 'info'],
        ['Бухгалтерские документы', 'download'],
        ['Выйти', 'x-close'],
      ],
    },
    settings: {
      width: 980,
      columns: [
        ['Настройки', [
          ['Рекрутеры и заказчики', 'settings-users'],
          ['Организация', 'settings-organization'],
          ['Воронка', 'settings-funnel'],
          ['Бизнес-процесс', 'settings-business'],
          ['Шаблоны, оценка и анкеты', 'settings-templates'],
          ['Темы оформления', 'settings-themes'],
          ['Сбор откликов', 'settings-response'],
          ['API и вебхуки', 'settings-api'],
        ]],
        ['Мои настройки', [
          ['Мой профиль', 'settings-profile'],
          ['Почта и календарь', 'settings-calendar'],
          ['Волшебная кнопка', 'settings-magic-button'],
          ['Джоб-сайты', 'settings-jobsites'],
          ['Интеграции', 'settings-integrations'],
        ]],
        ['Аккаунт и помощь', [
          ['Настройки Собессо', 'settings'],
          ['Руководство пользователя', 'info'],
          ['Бухгалтерские документы', 'download'],
          ['Выйти', 'x-close'],
        ]],
      ],
    },
  };

  /* ── Поле формы ───────────────────────────────────────────────
     Подпись, контрол, подсказка под ним. Подсказка занимает место,
     только когда она есть: у заявки она обязательная часть поля —
     в форме заявки текст подсказки задаёт заказчик в настройках. */
  const field = (label, inner, hint = '') =>
    `<div class="hf-field"><label class="hf-label">${esc(label)}</label>${inner}${
      hint ? `<p class="hf-hint">${esc(hint)}</p>` : ''}</div>`;

  const richtext = () =>
    '<div class="hf-richtext"><div class="hf-richtext-bar">' +
    ['Ж', 'К', 'Ч', '•', '1.'].map((b) => `<span>${b}</span>`).join('') +
    '</div><div class="hf-richtext-area" contenteditable="true"></div></div>';

  /* Поле по описанию. Строкой задаётся обычный текстовый инпут —
     так описано большинство полей, и расписывать их объектом незачем */
  const renderField = (f) => {
    if (typeof f === 'string') return field(f, '<input class="hf-input" type="text">');
    const { label, type = 'text', hint = '', value = '', options = [], rows = 6, width } = f;
    const style = width ? ` style="width:${width}px"` : '';
    if (type === 'rich') return field(label, richtext(), hint);
    if (type === 'select') {
      return field(label, `<select class="hf-select"${style}>${
        options.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`, hint);
    }
    if (type === 'textarea') {
      return field(label, `<textarea class="hf-input hf-textarea" rows="${rows}"></textarea>`, hint);
    }
    if (type === 'attach') {
      return `<button class="hf-btn hf-btn--secondary hf-btn--s" type="button">${esc(label)}</button>`;
    }
    /* Поданную заявку не редактируют — её читают. Поэтому те же поля
       в карточке показываются строкой «подпись: значение», а не полем */
    if (f.readonly) {
      /* Короткое значение стоит рядом с подписью, длинное — под ней.
         Так в оригинале: «Зарплата: 250 000» одной строкой,
         обязанности — абзацем под заголовком */
      return `<p class="hf-fact"><b>${esc(label)}:</b>${
        value.length > 40 ? '<br>' : ' '}${esc(value)}</p>`;
    }
    return field(label, `<input class="hf-input" type="text" value="${esc(value)}"${style}>`, hint);
  };

  /* Содержимое поданной заявки: во всех трёх состояниях оно одно
     и то же, меняется только лента решений справа */
  const REQUEST_FACTS = [
    { label: 'Отдел, подразделение', value: 'Разработка', readonly: true },
    { label: 'Зарплата', value: '250 000 — 350 000 ₽', readonly: true },
    { label: 'Обязанности кандидата', readonly: true,
      value: 'Разрабатывать и поддерживать серверную часть, писать тесты, участвовать в ревью.' },
    { label: 'Требования к кандидату', readonly: true,
      value: 'Python или Go от трёх лет, PostgreSQL, опыт работы с очередями.' },
  ];

  /* Поля модалок — ровно те, что в боевой системе */
  const MODALS = {
    candidate: {
      title: 'Новый кандидат',
      avatar: true,
      head: [['Импорт из почты', 'mail'], ['Загрузка из файла', 'download']],
      left: ['Фамилия', 'Имя', 'Отчество', 'Телефон', 'Электронная почта',
             'Telegram', 'Max', 'Кем и где работает', 'Зарплатные ожидания', 'Дата рождения'],
      right: [
        { label: 'Источник', type: 'select', options: ['Другой источник', 'HeadHunter', 'Рекомендация', 'Джун (отклики)'] },
        { label: 'Текст резюме', type: 'textarea', rows: 16 },
      ],
      rightExtra: 'Прикрепить файл',
    },
    vacancy: {
      title: 'Новая вакансия',
      left: ['Должность', 'Отдел/подразделение', 'Зарплата'],
      leftRich: ['Обязанности', 'Требования'],
      right: [
        { label: 'Назначенные рекрутеры', type: 'select', options: ['Я, Юджин'] },
        { label: 'Сколько человек нужно нанять', type: 'input', value: '1' },
        { label: 'Видимость', type: 'select', options: ['Видна всем', 'Только рекрутерам'] },
        { label: 'Приоритет', type: 'select', options: ['Обычный', 'Высокий'] },
        { label: 'Этапы подбора', type: 'select', options: ['Стандартная воронка'] },
        { label: 'Шаблон оффера', type: 'select', options: ['Не выбран'] },
      ],
    },

    /* ── Заявка на подбор ───────────────────────────────────────
       Заводится в два шага, и первый шаг — не формальность.
       Сначала спрашивают, писать заявку с нуля или подставить
       текст из прошлой; только потом показывают саму форму.

       Форм заявки в компании несколько, и они разные: набор полей,
       подсказки под полями и наличие согласования настраиваются
       отдельно по каждой (Настройки → Бизнес-процесс). Поэтому
       здесь две формы, а не одна с переключателем. */
    'request-start': {
      title: 'Заявка на подбор',
      narrow: true,
      body: `
        <div class="hf-radios">
          <label class="hf-radio"><input type="radio" name="hf-request-start" checked>
            <span>Новая заявка</span></label>
          <label class="hf-radio"><input type="radio" name="hf-request-start">
            <span>Подставить текст из прошлой заявки</span></label>
        </div>`,
      foot: `
        <button class="hf-btn hf-btn--primary hf-btn--l" type="button"
                data-hf-request-continue>Продолжить</button>
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
    },

    /* Форма без согласования: заявка сохраняется и сразу живёт */
    request: {
      title: 'Заявка на подбор',
      headLink: 'Настроить поля заявки',
      cols: 'request',
      leftFields: [
        'Должность',
        { label: 'Отдел, подразделение',
          type: 'select',
          options: ['Не выбрано', 'Разработка', 'Аналитика', 'Продукт'],
          hint: 'Добавляют, удаляют и настраивают порядок и вложенность пунктов в настройках' },
        'Зарплата',
        { label: 'Обязанности кандидата', type: 'rich' },
        { label: 'Требования к кандидату', type: 'rich' },
        { label: 'Комментарии', type: 'rich' },
        { label: 'Прикрепить файл', type: 'attach' },
      ],
      rightFields: [
        { label: 'Сколько человек нужно нанять', type: 'text', value: '1', width: 70 },
      ],
    },

    /* Форма с согласованием. Отличается не кнопкой, а составом:
       поля другие, подсказки под ними свои, и добавлен блок
       «Отправить на согласование» — согласующих заказчик вписывает
       почтой сам, списка сотрудников тут нет */
    'request-approval': {
      title: 'Заявка на подбор',
      headLink: 'Настроить поля заявки',
      cols: 'request',
      leftFields: [
        'Должность',
        { label: 'Отдел, подразделение',
          type: 'select',
          options: ['Не выбрано', 'Разработка', 'Аналитика', 'Продукт'],
          hint: 'Добавляют, удаляют и настраивают порядок и вложенность пунктов в настройках' },
        'Зарплата',
        { label: 'Бюджет на подбор', hint: 'Сколько готовы потратить на закрытие' },
        { label: 'Прикрепить файл', type: 'attach' },
      ],
      rightFields: [
        { label: 'Сколько человек нужно нанять',
          type: 'text', value: '1', width: 70,
          hint: 'Это количество позиций, а не количество кандидатов' },
      ],
      rightBlock: {
        title: 'Отправить на согласование',
        placeholder: 'Эл. почта согласующего',
        hint: 'Добавьте хотя бы одного согласующего',
      },
    },

    /* ── Карточка поданной заявки ───────────────────────────────
       Слева поля заявки, справа не поля, а лента решений: кто
       подал, кто ждёт, кто решил и что написал. Каждый шаг с датой.
       Различаются три состояния только этой лентой и кнопками
       внизу — сами поля во всех трёх одинаковы. */
    'request-card-pending': {
      title: 'Backend-разработчик',
      headLink: 'Настроить поля формы',
      cols: 'request',
      readonly: true,
      leftFields: REQUEST_FACTS,
      rightFields: [{ label: 'Сколько человек нужно нанять', value: '2', readonly: true }],
      trail: [
        ['Заказчик, 03.09.2026', 'es@refni.ru'],
        ['Ожидание согласования', 'es@refni.ru', 'pending'],
      ],
      foot: `
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button">Скопировать ссылку для согласования</button>
        <button class="hf-btn hf-btn--danger hf-btn--l hf-push" type="button" data-hf-close>Удалить</button>`,
    },

    'request-card-hr': {
      title: 'Аналитик данных',
      headLink: 'Настроить поля формы',
      cols: 'request',
      readonly: true,
      leftFields: [
        { label: 'Отдел, подразделение', value: 'Аналитика', readonly: true },
        { label: 'Зарплата', value: '200 000 — 260 000 ₽', readonly: true },
        { label: 'Обязанности кандидата', readonly: true,
          value: 'Считать продуктовые метрики, поддерживать витрины, отвечать на вопросы команд.' },
        { label: 'Требования к кандидату', readonly: true,
          value: 'SQL на уровне оконных функций, Python, опыт работы с дашбордами.' },
      ],
      rightFields: [{ label: 'Сколько человек нужно нанять', value: '2', readonly: true }],
      trail: [
        ['Заказчик, 03.09.2026', 'es@refni.ru'],
        ['Согласовано, 03.09.2026', 'es@refni.ru', 'ok', 'Согласовано, бюджет подтверждён'],
        ['Заявка получена', 'Отдел HR'],
      ],
      foot: `
        <button class="hf-btn hf-btn--primary hf-btn--l" type="button">Взять в работу</button>
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button">Редактировать</button>
        <button class="hf-btn hf-btn--danger hf-btn--l hf-push" type="button" data-hf-close>Не брать в работу</button>`,
    },

    /* Отклонённую заявку нельзя исправить — только отправить снова
       тому же согласующему и тем же текстом. «Верните с правками»
       в их модели не существует */
    'request-card-rejected': {
      title: 'Frontend-разработчик',
      headLink: 'Настроить поля формы',
      cols: 'request',
      readonly: true,
      leftFields: REQUEST_FACTS,
      rightFields: [{ label: 'Сколько человек нужно нанять', value: '2', readonly: true }],
      trail: [
        ['Заказчик, 03.09.2026', 'es@refni.ru'],
        ['Отказ, 03.09.2026', 'es@refni.ru', 'no',
          'Бюджет на этот квартал не согласован, вернитесь в октябре'],
      ],
      foot: `
        <button class="hf-btn hf-btn--primary hf-btn--l" type="button">Отправить повторно</button>
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>
        <button class="hf-btn hf-btn--danger hf-btn--l hf-push" type="button" data-hf-close>Удалить</button>`,
    },

    /* Очередь согласований. Тем же виджетом карточек выбирают
       прошлую заявку, когда копируют её текст в новую */
    'request-queue': {
      title: 'Заявки на согласовании',
      head: [['Настроить вид', 'options-20']],
      narrow: true,
      body: `
        <div class="hf-request-card" data-od-id="request-queue-card">
          <span class="hf-badge hf-badge--orange">На согласовании 0/1</span>
          <a class="hf-request-card-title" href="#" data-hf-modal="request-card-pending">Заявка от 03.09.2026 — 0/2</a>
          <dl class="hf-request-card-meta">
            <dt>Заказчик:</dt><dd>es@refni.ru</dd>
            <dt>Отдел, подразделение:</dt><dd>Разработка</dd>
          </dl>
          <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Скопировать ссылку для согласования</button>
        </div>`,
      foot: '<button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>',
    },
  };

  /* ── Заявки в сайдбаре ────────────────────────────────────────
     У заявки нет своего экрана: она живёт строкой в сайдбаре,
     свёрстанной точно как строка вакансии. То есть заявка занимает
     место вакансии ещё до того, как вакансия существует.

     Пока заявок нет — неактивная строка «Заявок нет». Как только
     появились, блок раскрывается: сверху счётчик тех, что ждут
     решения, ниже сами заявки. Состояние показано цветным кружком,
     и это единственное, чем строки различаются. */
  const REQUESTS = [
    { title: 'Backend-разработчик', state: 'pending', label: 'На согласовании' },
    { title: 'Аналитик данных', state: 'hr', label: 'Передана в HR' },
    { title: 'Frontend-разработчик', state: 'rejected', label: 'Отказано' },
  ];

  /* Заявок в сайдбаре нет ровно в двух случаях: их не заводили
     или по всем уже созданы вакансии. Второе видно по адресу:
     applicants.html#requests=none */
  const requestsHtml = () => {
    if (/requests=none/.test(location.hash)) {
      return `<div class="hf-nav-link is-disabled" data-od-id="requests-empty">${
        icon('edit-2-20')}<span class="hf-nav-title">Заявок нет</span></div>`;
    }
    const pending = REQUESTS.filter((r) => r.state === 'pending').length;
    return `
      <div class="hf-requests" data-od-id="requests">
        <div class="hf-nav-link hf-requests-head">
          ${icon('edit-2-20')}<span class="hf-nav-title">Заявки</span>
          <span class="hf-requests-toggle">Свернуть</span>
        </div>
        ${pending ? `
        <button class="hf-request hf-request--group" type="button" data-hf-modal="request-queue">
          <span class="hf-request-dot is-pending"></span>
          <span class="hf-request-text">
            <span class="hf-request-title">На согласовании</span>
            <span class="hf-request-note">${pending} заявка</span>
          </span>
        </button>` : ''}
        ${REQUESTS.map((r) => `
          <button class="hf-request" type="button" data-hf-modal="request-card-${r.state}">
            <span class="hf-request-dot is-${r.state}"></span>
            <span class="hf-request-text">
              <span class="hf-request-title">${esc(r.title)}</span>
              <span class="hf-request-note">${esc(r.label)}</span>
            </span>
          </button>`).join('')}
      </div>`;
  };

  /* ── Шапка ────────────────────────────────────────────────── */

  let pageTitle = '';

  const headerActionsHtml = () => `
      <div class="hf-header-title">${pageTitle}</div>
      <div class="hf-header-item">
        <button class="hf-icon-btn" type="button" data-hf-search aria-label="Поиск">${icon('search-20')}</button>
      </div>
      <div class="hf-header-item">
        <button class="hf-icon-btn" type="button" data-hf-menu="settings" aria-label="Настройки">${icon('options-main')}</button>
      </div>
      <div class="hf-header-sep"></div>
      <div class="hf-header-item is-auto">
        <button class="hf-account" type="button" data-hf-menu="account">Рефни ${icon('chevron-down')}</button>
      </div>`;

  const headerHtml = () => `
    <div class="hf-logo-wrap">
      <a class="hf-logo" href="applicants.html" aria-label="Хантфлоу — на главную">
        <img src="assets/logo-huntflow.svg" width="152" height="36" alt="Хантфлоу">
      </a>
    </div>
    <div class="hf-header-right" data-hf-headerbar>${headerActionsHtml()}</div>`;

  /* Панель поиска подменяет шапку целиком — так же, как в оригинале.
     Строки запроса у самого экрана поиска нет: она живёт здесь, и здесь же
     выбирают, что ищут — кандидатов или вакансии. */
  const SEARCH_SUBJECTS = { applicants: 'Кандидаты', vacancies: 'Вакансии' };
  let searchSubject = 'applicants';

  const searchbarHtml = (query = '') => `
    <div class="hf-searchbar">
      <span class="hf-search-icon">${icon('search-20')}</span>
      <button class="hf-search-scope" type="button" data-hf-menu="search-scope">
        ${SEARCH_SUBJECTS[searchSubject]} ${icon('chevron-down-16')}</button>
      <input class="hf-search-input" type="text" placeholder="Поиск в базе"
             value="${esc(query)}" data-hf-search-input autofocus>
      <button class="hf-icon-btn" type="button" data-hf-search-close aria-label="Закрыть поиск">${icon('x-close')}</button>
    </div>
    <div class="hf-header-item">
      <button class="hf-icon-btn" type="button" data-hf-menu="settings" aria-label="Настройки">${icon('options-main')}</button>
    </div>
    <div class="hf-header-sep"></div>
    <div class="hf-header-item is-auto">
      <button class="hf-account" type="button" data-hf-menu="account">Рефни ${icon('chevron-down')}</button>
    </div>`;

  /* ── Сайдбар ──────────────────────────────────────────────── */

  const sidebarHtml = (active) => {
    const nav = [
      ['applicants', 'Все кандидаты', 'home-20', 'applicants.html'],
      ['analytics', 'Аналитика', 'graph-20', '#'],
      ['calendar', 'Календарь', 'calendar-20', 'calendar.html'],
    ];
    return `
      <div class="hf-sidebar-scroll">
        <div class="hf-sidebar-inner">
          <ul class="hf-nav">
            ${nav.map(([id, label, ic, href]) => `
              <li><a class="hf-nav-link${id === active ? ' is-active' : ''}" href="${href}">
                ${icon(ic)}<span class="hf-nav-title">${label}</span></a></li>`).join('')}
          </ul>
          <hr class="hf-sidebar-divider">
          ${requestsHtml()}
          <hr class="hf-sidebar-divider">
          <div class="hf-sidebar-group-title" data-hf-menu="recruiter">
            ${icon('folder-20')}<span class="hf-nav-title">Мои вакансии</span>${icon('chevron-down-20')}
          </div>
          ${VACANCIES.map((v) => `
            <a class="hf-vacancy-link${v.id === active ? ' is-active' : ''}" href="vacancy.html#v=${v.id}">
              <div class="hf-vacancy-name">${esc(v.name)}</div>
              <div class="hf-vacancy-org">${esc(v.org)}</div>
            </a>`).join('')}
          <hr class="hf-sidebar-divider">
          <a class="hf-nav-link" href="search.html#s=vacancies&state=hold">${icon('pause-2-20')}<span class="hf-nav-title">На паузе</span></a>
          <a class="hf-nav-link" href="search.html#s=vacancies&state=closed">${icon('archive-2-20')}<span class="hf-nav-title">Закрытые вакансии</span></a>
        </div>
      </div>
      <button class="hf-fab" type="button" data-hf-menu="plus" aria-label="Создать">${icon('plus', 28)}</button>`;
  };

  /* ── Меню ─────────────────────────────────────────────────── */

  const menuHtml = (key) => {
    /* Предмет поиска. Их ровно два, и это не фильтр, а другой экран:
       у кандидатов и вакансий разные фильтры и разная выдача */
    if (key === 'search-scope') {
      return `<div class="hf-menu" style="width:200px">
        ${Object.entries(SEARCH_SUBJECTS).map(([id, label]) => `
          <a class="hf-menu-item" href="search.html#s=${id}">
            <span class="hf-menu-check">${id === searchSubject ? icon('checkmark') : ''}</span>${esc(label)}</a>`).join('')}
      </div>`;
    }
    if (key === 'recruiter') {
      return `<div class="hf-menu" style="width:300px">
        <input class="hf-input" type="search" placeholder="Поиск" style="margin-bottom:8px">
        <button class="hf-menu-item" type="button">${icon('userpic')}Я, Юджин</button>
        <button class="hf-menu-item" type="button">${icon('link-20')}API-аккаунт</button>
      </div>`;
    }
    const m = MENUS[key];
    if (!m) return '';
    if (m.columns) {
      return `<div class="hf-menu hf-menu--wide" style="width:${m.width}px">
        ${m.columns.map(([title, items]) => `
          <div class="hf-menu-col">
            <div class="hf-menu-title">${esc(title)}</div>
            ${items.map(([label, ic]) => {
              /* Перенесённые разделы настроек — настоящие ссылки, остальные пока заглушки */
              const href = SETTINGS_LINKS[label];
              return href
                ? `<a class="hf-menu-item" href="${href}">${icon(ic)}${esc(label)}</a>`
                : `<button class="hf-menu-item" type="button">${icon(ic)}${esc(label)}</button>`;
            }).join('')}
          </div>`).join('')}
      </div>`;
    }
    return `<div class="hf-menu" style="width:${m.width}px">
      ${m.title ? `<div class="hf-menu-title">${esc(m.title)}</div>` : ''}
      ${m.items.map(([label, ic, opt = {}]) => {
        const href = SETTINGS_LINKS[label];
        if (href) return `<a class="hf-menu-item" href="${href}">${icon(ic)}${esc(label)}</a>`;
        const target = opt.modal || (label === 'Добавить кандидата' ? 'candidate'
          : label === 'Добавить вакансию' ? 'vacancy' : '');
        /* Пункт либо открывает модалку, либо раскрывает следующее меню.
           Форма заявки — второй случай: сначала выбирают, какой формой */
        const attr = (opt.menu ? ` data-hf-menu="${opt.menu}"`
          : target ? ` data-hf-modal="${target}"` : '')
          + (opt.form ? ` data-hf-request-form="${opt.form}"` : '');
        return `<button class="hf-menu-item" type="button"${attr}>${icon(ic)}${esc(label)}</button>`;
      }).join('')}
    </div>`;
  };

  /* ── Модалки ──────────────────────────────────────────────── */

  const modalHtml = (key) => {
    const m = MODALS[key];
    if (!m) return '';

    const left = m.leftFields ? m.leftFields.map(renderField).join('') : [
      ...(m.left || []).map((l) => field(l, '<input class="hf-input" type="text">')),
      ...(m.leftRich || []).map((l) => field(l, richtext())),
    ].join('');

    /* Лента решений: кто подал, кто ждёт, кто решил. Цвет несёт смысл —
       оранжевый ждёт, зелёный согласовал, красный отказал */
    const trail = (m.trail || []).map(([title, who, tone = '', note = '']) => `
      <div class="hf-trail-step${tone ? ` is-${tone}` : ''}">
        <p class="hf-trail-title">${esc(title)}</p>
        <p class="hf-trail-who">${esc(who)}</p>
        ${note ? `<p class="hf-trail-note">${esc(note)}</p>` : ''}
      </div>`).join('');

    const right = m.rightFields ? [
      ...m.rightFields.map(renderField),
      trail ? `<div class="hf-trail">${trail}</div>` : '',
      m.rightBlock ? `
        <div class="hf-modal-block">
          <p class="hf-label">${esc(m.rightBlock.title)}</p>
          <input class="hf-input" type="search" placeholder="${esc(m.rightBlock.placeholder)}">
          <p class="hf-hint">${esc(m.rightBlock.hint)}</p>
        </div>` : '',
    ].join('') : [
      ...(m.right || []).map(renderField),
      m.rightExtra ? `<button class="hf-btn hf-btn--secondary" type="button">${icon('download')}${esc(m.rightExtra)}</button>` : '',
    ].join('');

    /* Тело модалки бывает двух видов: две колонки полей — как у кандидата,
       вакансии и заявки — или готовая разметка, если колонок нет вовсе.
       Второе нужно первому шагу заявки: там один вопрос и два варианта */
    const body = m.body
      ? `<div class="hf-modal-body">${m.body}</div>`
      : `<div class="hf-modal-body hf-modal-cols${m.cols ? ` hf-modal-cols--${m.cols}` : ''}">
           <div class="hf-modal-col">${left}</div>
           <div class="hf-modal-col">${right}</div>
         </div>`;

    return `
      <div class="hf-overlay" data-hf-overlay="${key}">
        <div class="hf-modal${m.narrow ? ' hf-modal--narrow' : ''}" role="dialog" aria-modal="true"
             aria-label="${esc(m.title)}">
          <div class="hf-modal-head">
            ${m.avatar ? `<span class="hf-avatar" style="width:56px;height:56px">${icon('userpic', 28)}</span>` : ''}
            <div style="flex:1;min-width:0">
              <h2 class="hf-h2">${esc(m.title)}</h2>
              ${m.head ? `<div class="hf-modal-head-actions">${m.head
                .map(([l, ic]) => `<button class="hf-btn hf-btn--secondary hf-btn--s" type="button">${icon(ic)}${esc(l)}</button>`)
                .join('')}</div>` : ''}
            </div>
            ${m.headLink ? `<a class="hf-btn hf-btn--secondary hf-btn--s"
              href="settings.html#s=business&t=requests">${esc(m.headLink)}</a>` : ''}
            <button class="hf-icon-btn hf-icon-btn--dark" type="button" data-hf-close aria-label="Закрыть">${icon('x-close')}</button>
          </div>
          ${body}
          <div class="hf-modal-foot">
            ${m.foot || `
            <button class="hf-btn hf-btn--primary hf-btn--l" type="button">Сохранить</button>
            <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`}
          </div>
        </div>
      </div>`;
  };

  /* ── Поведение ────────────────────────────────────────────── */

  let openMenu = null;
  /* Форма, выбранная в подменю «+»: с неё начинается заявка */
  let requestForm = 'request';

  const closeMenu = () => { openMenu?.remove(); openMenu = null; };

  const showMenu = (trigger, key) => {
    const same = openMenu?.dataset.key === key;
    closeMenu();
    if (same) return;
    const node = document.createElement('div');
    node.innerHTML = menuHtml(key);
    const menu = node.firstElementChild;
    if (!menu) return;
    menu.dataset.key = key;
    menu.style.position = 'fixed';
    document.body.appendChild(menu);
    const above = key === 'plus' || key === 'request-forms';
    /* Подменю встаёт туда же, где стояло меню «+», а не под пунктом,
       по которому кликнули: в оригинале оно заменяет собой первое */
    const anchor = (key === 'request-forms'
      && document.querySelector('[data-hf-menu="plus"]')) || trigger;
    const t = anchor.getBoundingClientRect();
    const w = menu.offsetWidth;
    /* Меню шапки прижимаются к правому краю кнопки, выбор предмета поиска —
       к левому: он стоит слева и должен раскрываться под своим словом */
    const inSidebar = !!trigger.closest('.hf-sidebar');
    const byLeft = above || key === 'search-scope' || inSidebar;
    menu.style.left = Math.max(8, Math.min(
      inSidebar ? t.right + 8 : byLeft ? t.left : t.right - w, innerWidth - w - 8)) + 'px';
    menu.style.top = above ? '' : inSidebar
      ? Math.max(8, Math.min(t.top, innerHeight - menu.offsetHeight - 8)) + 'px'
      : (t.bottom + 8) + 'px';
    if (above) menu.style.bottom = (innerHeight - t.top + 8) + 'px';
    openMenu = menu;
  };

  const openModal = (key) => {
    document.querySelectorAll('[data-hf-overlay]').forEach((o) => o.classList.remove('is-open'));
    document.querySelector(`[data-hf-overlay="${key}"]`)?.classList.add('is-open');
  };
  const closeModal = () =>
    document.querySelectorAll('[data-hf-overlay]').forEach((o) => o.classList.remove('is-open'));

  const toggleSearch = (on, query = '') => {
    const bar = document.querySelector('[data-hf-headerbar]');
    if (!bar) return;
    bar.innerHTML = on ? searchbarHtml(query) : headerActionsHtml();
    if (on) bar.querySelector('.hf-search-input')?.focus();
  };

  /* search: { subject, query } — экран поиска. Он открывается уже с раскрытой
     строкой запроса, и сайдбар на нём пуст: место занято, списка вакансий нет */
  const mount = ({ active = 'applicants', title = '', search = null } = {}) => {
    pageTitle = title;
    if (search) searchSubject = search.subject || 'applicants';
    const header = document.getElementById('hf-header');
    const sidebar = document.getElementById('hf-sidebar');
    if (header) header.innerHTML = headerHtml();
    if (sidebar) {
      sidebar.innerHTML = search ? '' : sidebarHtml(active);
      sidebar.classList.toggle('hf-sidebar--empty', !!search);
    }
    if (search) toggleSearch(true, search.query || '');
    document.body.insertAdjacentHTML('beforeend',
      Object.keys(MODALS).map(modalHtml).join(''));

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-hf-menu]');
      if (trigger) { e.preventDefault(); showMenu(trigger, trigger.dataset.hfMenu); return; }

      const modal = e.target.closest('[data-hf-modal]');
      if (modal) {
        e.preventDefault(); closeMenu();
        /* Какой формой заводят заявку, выбирают до первого шага,
           а нужна она только после него — поэтому запоминаем */
        if (modal.dataset.hfRequestForm) requestForm = modal.dataset.hfRequestForm;
        openModal(modal.dataset.hfModal);
        return;
      }

      if (e.target.closest('[data-hf-request-continue]')) { openModal(requestForm); return; }

      if (e.target.closest('[data-hf-close]')) { closeModal(); return; }
      if (e.target.matches('[data-hf-overlay]')) { closeModal(); return; }
      if (e.target.closest('[data-hf-search]')) { closeMenu(); toggleSearch(true); return; }
      if (e.target.closest('[data-hf-search-close]')) {
        /* На самом экране поиска крестик закрывает не строку, а поиск целиком */
        if (search) { location.href = 'applicants.html'; return; }
        toggleSearch(false); return;
      }
      if (!e.target.closest('.hf-menu')) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeMenu(); closeModal(); }
      /* Запрос отправляется по Enter — кнопки «искать» в оригинале нет */
      if (e.key === 'Enter' && e.target.matches('[data-hf-search-input]')) {
        const q = e.target.value.trim();
        location.href = `search.html#s=${searchSubject}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      }
    });

    /* Состояние адресуется хешем: страница.html#new-candidate открывает модалку */
    const fromHash = () => {
      const h = location.hash.replace('#', '');
      if (h === 'new-candidate') openModal('candidate');
      else if (h === 'new-vacancy') openModal('vacancy');
      else if (h === 'new-request') openModal('request-start');
      else if (h === 'new-request-form') openModal('request');
      else if (h === 'new-request-approval') openModal('request-approval');
      else if (h === 'request-queue') openModal('request-queue');
      else if (h === 'request-pending') openModal('request-card-pending');
      else if (h === 'request-hr') openModal('request-card-hr');
      else if (h === 'request-rejected') openModal('request-card-rejected');
    };
    addEventListener('hashchange', fromHash);
    fromHash();
  };

  /* Строку запроса перерисовывает экран поиска: предмет меняется по хешу,
     а живёт строка в шапке, то есть в оболочке */
  const searchbar = (subject, query) => {
    searchSubject = subject in SEARCH_SUBJECTS ? subject : 'applicants';
    toggleSearch(true, query);
  };

  return { mount, esc, icon, searchbar, VACANCIES, FUNNEL, STAGES };
})();
