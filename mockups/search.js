/* Экран «Поиск». Оболочку строит shell.js, карточку кандидата — candidate.js.

   Это одна оболочка на два предмета: кандидаты и вакансии. Предмет выбирают
   не здесь, а в строке запроса в шапке, и от него меняется всё: полоса
   фильтров, вид строки и раскладка выдачи. Своей строки ввода у экрана нет.

   Закрытые вакансии и вакансии на паузе — не отдельные разделы, а этот же
   поиск с предустановленным фильтром состояния; ссылки из сайдбара ведут сюда.

   Данные вымышленные, структура повторена точно. Списки значений фильтров —
   настоящие: это конфигурация системы, а не чьи-то персональные данные. */

/* esc объявлен в candidate.js — он подключён раньше */
const svg = (name, size = 20) =>
  `<svg style="width:${size}px;height:${size}px;fill:currentColor"><use href="#${name}"></use></svg>`;

/* ── Значения фильтров ─────────────────────────────────────── */

/* Область поиска: два вопроса — как соединять слова и где искать.
   Второй список — прямой перечень того, что у них проиндексировано */
const MATCH = ['Все слова есть', 'Любое из слов есть', 'Ни одного из слов нет'];
const SCOPE = ['Во всем резюме', 'В опыте работы', 'В образовании', 'В желаемой должности'];

/* Согласие на хранение персональных данных — состояние самого кандидата,
   а не отметка рекрутера: по нему фильтруют базу */
const PD_STATUSES = [
  'Кандидат разрешил хранение ПД', 'Кандидат запретил хранение ПД',
  'Ожидается решение кандидата', 'Не отправлен запрос на хранение ПД',
  'Срок действия согласия истек',
];

const SOURCES = [
  'Агентство', 'Внутренняя база', 'Карьерный сайт', 'Рекомендация',
  'Холодный поиск', 'Зарплата.ру', 'Отклик с Хабр Карьеры', 'Отклик с Avito',
  'Отклик с HeadHunter', 'Отклик с Rabota.ru',
];

const TAGS = [
  ['Резерв', '#7b61ff'], ['Для разработки', '#1ec997'], ['Рекомендация', '#0a84ff'],
  ['Импорт 12.05.2026 14:27', '#0a84ff'], ['Импорт 03.02.2026 22:16', '#050505'],
  ['Черный список', '#e8503a'],
];

const PERIODS = ['За все время', 'За период'];
const QUICK = ['Сегодня', 'Вчера', 'Неделя', 'Месяц', 'Квартал', 'Год'];

const RECRUITERS = [
  ['Я, Полина', 'polina@refni.ru'],
  ['Артём Кузнецов', 'kuznetsov@refni.ru'],
  ['Ирина Соколова', 'sokolova@refni.ru'],
  ['API: интеграция с 1С', 'api-160301-68@refni.ru'],
  ['API: карьерный сайт', 'api-160301-81@refni.ru'],
];

const FUNNEL_SETS = ['Все наборы этапов', 'Основная воронка', 'Массовый подбор'];
const STAGE_WHEN = ['Был на этапе', 'Сейчас на этапе'];
const SORTS = ['По соответствию', 'По алфавиту', 'По дате открытия', 'По дате последнего действия'];
const VAC_STATES = [
  ['all', 'Все вакансии'], ['open', 'Открытые'],
  ['hold', 'Приостановленные'], ['closed', 'Закрытые'],
];

/* ── Данные выдачи ─────────────────────────────────────────── */

/* Строка кандидата в поиске — не та же, что в списке всех кандидатов:
   здесь показывают резюме (желаемая должность, зарплата, стаж, последнее
   место работы), а не участие в подборе */
const FOUND = [
  { id: 'c1', name: 'Смирнова Анастасия', init: 'СА',
    want: 'Бизнес/ системный аналитик', pay: '150 000 RUR', age: '34 года (8 января 1992)',
    exp: 'Общий стаж: 11 лет', lastPos: 'Системный аналитик', lastOrg: 'Кортекс',
    src: 'HeadHunter' },
  { id: 'c6', name: 'Соколов Михаил', init: 'СМ',
    want: 'Бизнес/ системный аналитик', pay: '200 000 RUR', age: '41 год (19 августа 1985)',
    exp: 'Общий стаж: 18 лет 4 месяца', lastPos: 'Ведущий бизнес-аналитик', lastOrg: 'Практика',
    src: 'HeadHunter' },
  { id: 'c7', name: 'Ковалёва Ирина', init: 'КИ',
    want: 'Аналитик данных', pay: '90–150 тыс.', age: '31 год (2 апреля 1995)',
    exp: 'Общий стаж: 10 лет 4 месяца', lastPos: 'Аналитик данных', lastOrg: 'ЗВУК',
    src: 'Карьерный сайт' },
  { id: 'c4', name: 'Аникеев Роман Витальевич', init: 'АР',
    want: 'Продуктовый аналитик', pay: '180 000 RUR', age: '28 лет (9 июля 1998)',
    exp: 'Общий стаж: 6 лет', lastPos: 'Продуктовый аналитик', lastOrg: 'Vi.Tech',
    src: 'Рекомендация' },
  { id: 'c5', name: 'Маргарян Лусине', init: 'МЛ',
    want: 'Системный аналитик', pay: '', age: '35 лет (5 марта 1991)',
    exp: 'Общий стаж: 12 лет 7 месяцев', lastPos: 'Системный аналитик', lastOrg: 'Брейнвей',
    src: 'Внутренняя база' },
  { id: 'c8', name: 'Тимофеев Артём', init: 'ТА',
    want: 'Аналитик 1С / Консультант 1С', pay: '', age: '29 лет (14 января 1997)',
    exp: 'Общий стаж: 8 лет 1 месяц', lastPos: '1С Консультант/Аналитик', lastOrg: 'Рефни',
    src: 'Агентство' },
];

/* Вакансии в выдаче. Состав строки меняется вместе с состоянием:
   у закрытой — дата закрытия, у приостановленной — дата паузы и иконка */
const VAC_FOUND = [
  { name: 'Аналитик данных (Senior)', org: 'Кортекс', state: 'closed',
    open: '2 июля 2024', end: '2 сентября 2024', last: '5 августа 2024', rec: 'Полина' },
  { name: 'Системный аналитик', org: 'ЦИАН', state: 'closed',
    open: '7 декабря 2023', end: '8 февраля 2024', last: '8 февраля 2024', rec: 'Полина' },
  { name: 'Продуктовый аналитик (Маша)', org: 'ЦИАН', state: 'closed',
    open: '5 февраля 2024', end: '8 февраля 2024', last: '7 февраля 2024', rec: 'Полина' },
  { name: 'Бизнес-аналитик', org: 'Практика', state: 'closed',
    open: '24 сентября 2023', end: '31 октября 2023', last: '31 октября 2023', rec: 'Артём Кузнецов' },
  { name: '.NET-разработчик', org: 'Брейнвей', state: 'hold',
    open: '21 марта 2023', end: '6 марта 2025', last: '29 апреля 2025', rec: 'Полина',
    offer: 'Гурчинский М. М.' },
  { name: 'Android-разработчик', org: 'Кортекс', state: 'hold',
    open: '15 сентября 2025', end: '21 ноября 2025', last: '1 ноября 2025', rec: 'Полина' },
  { name: 'Application Security Engineer', org: 'Vi.Tech', state: 'hold',
    open: '5 августа 2025', end: '20 января 2026', last: '27 августа 2025', rec: 'Артём Кузнецов' },
  { name: 'Automation QA Engineer (Java)', org: 'Практика', state: 'hold',
    open: '9 августа 2024', end: '15 января 2025', last: '22 ноября 2024', rec: 'Полина' },
];

/* ── Состояние ─────────────────────────────────────────────────
   Держится в хеше: #s=vacancies&state=closed — закрытые вакансии,
   #q=аналитик&c=c1 — выдача с открытым кандидатом, #m=filters —
   раскрытая панель. Клик обрабатывается и сам: во встроенном
   предпросмотре переход по якорю бывает перехвачен. */
const state = { subject: 'applicants', q: '', vac: 'all', menu: '', sub: '', pick: '', modal: false };

const readHash = () => {
  const p = new URLSearchParams(location.hash.replace('#', ''));
  state.subject = p.get('s') === 'vacancies' ? 'vacancies' : 'applicants';
  state.q = p.get('q') || '';
  state.vac = ['open', 'hold', 'closed'].includes(p.get('state')) ? p.get('state') : 'all';
  state.menu = p.get('m') || '';
  state.sub = p.get('mm') || '';
  state.pick = p.get('c') || '';
  state.modal = p.get('settings') === '1';
};

const writeHash = () => {
  const p = [];
  if (state.subject === 'vacancies') p.push('s=vacancies');
  if (state.q) p.push(`q=${encodeURIComponent(state.q)}`);
  if (state.vac !== 'all') p.push(`state=${state.vac}`);
  if (state.menu) p.push(`m=${state.menu}`);
  if (state.sub) p.push(`mm=${state.sub}`);
  if (state.pick) p.push(`c=${state.pick}`);
  if (state.modal) p.push('settings=1');
  const h = p.length ? `#${p.join('&')}` : '#';
  if (location.hash !== h) history.replaceState(null, '', h);
};

/* ── Выпадающие списки ─────────────────────────────────────── */

/* Селект внутри панели фильтра. Раскрытый список встаёт под ним и правее,
   не закрывая панель целиком — так же, как в оригинале */
const dropSelect = (label, key) => `
  <div class="se-sel">
    <button class="kd-filter-btn se-select${state.sub === key ? ' is-open' : ''}"
            type="button" data-sub="${key}"><span>${esc(label)}</span>${svg('chevron-down-24', 24)}</button>
    ${state.sub === key ? `<div class="se-subpop">${subDrop()}</div>` : ''}
  </div>`;

/* Список значений: у всех выпадашек Хантфлоу один вид — сверху могут стоять
   уточняющие селекты, дальше поиск, «Сбросить выбор» и сам список */
const dropList = (items, { search = false, reset = true, checked = '', head = '' } = {}) => `
  <div class="kd-drop se-drop-list" data-od-id="drop-list">
    ${head ? `<div class="se-drop-head">${head}</div>` : ''}
    ${search ? `<div class="kd-drop-search">${svg('search-16', 16)}
      <input type="text" placeholder="Поиск..." aria-label="Поиск"></div>` : ''}
    ${reset ? `<div class="kd-drop-actions">
      <button class="kd-drop-act" type="button">Сбросить выбор</button></div>` : ''}
    <div class="kd-drop-list">
      ${items.map((it) => {
        const [name, note, color, group] = Array.isArray(it) ? it : [it];
        if (group) return `<div class="se-drop-group">${esc(name)}</div>`;
        return `<div class="kd-drop-item${name === checked ? ' is-on' : ''}">
          <span>
            <span class="kd-drop-name" style="display:block">${esc(name)}</span>
            ${note ? `<span class="kd-drop-mail" style="display:block">${esc(note)}</span>` : ''}
          </span>
          ${color ? `<span class="se-tag-dot" style="background:${color}"></span>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;

/* Вложенный список: раскрывается поверх панели, из которой его позвали */
const subDrop = () => {
  const map = {
    match: () => dropList(MATCH, { reset: false, checked: MATCH[0] }),
    scope: () => dropList(SCOPE, { reset: false, checked: SCOPE[0] }),
    recruiters: () => dropList(RECRUITERS, { search: true }),
    period: () => dropList(PERIODS, { reset: false, checked: PERIODS[0] }),
    sources: () => dropList(SOURCES),
    pd: () => dropList(PD_STATUSES),
    /* Вакансию выбирают не из плоского списка: сверху стоит подразделение,
       а сами вакансии сгруппированы — сначала свои */
    vacancies: () => dropList(
      [['Без вакансии'], ['Мои вакансии', '', '', true],
        ...HF.VACANCIES.map((v) => [v.name, v.org])],
      { search: true, head: selectStub('Подразделение: Все') }),
    /* Этап — это не одно значение: сначала выбирают набор этапов и то,
       ищем ли по нынешнему этапу или по всей истории кандидата */
    stages: () => dropList(HF.STAGES.slice(1).map(([n]) => [n]),
      { search: true, head: selectStub(FUNNEL_SETS[0]) + selectStub(STAGE_WHEN[1]) }),
    depts: () => dropList(['Рефни', 'Vi.Tech', 'Брейнвей', 'Кортекс', 'Практика'], { search: true }),
  };
  return map[state.sub] ? map[state.sub]() : '';
};

/* Селект внутри уже раскрытого списка. Третьего уровня раскрытия
   в макете нет: в оригинале он есть, но ничего нового не показывает */
const selectStub = (label) => `
  <button class="kd-filter-btn se-select" type="button">
    <span>${esc(label)}</span>${svg('chevron-down-24', 24)}</button>`;

/* Панели полосы фильтров. Каждая — своя карточка под своей кнопкой */
const panelHtml = (key) => {
  const panels = {
    scope: `<div class="se-panel" style="width:450px">
      ${dropSelect(MATCH[0], 'match')}
      ${dropSelect(SCOPE[0], 'scope')}
    </div>`,
    filters: `<div class="se-panel" style="width:450px">
      <div class="se-panel-title">Кто добавил в базу</div>
      ${dropSelect('Рекрутеры: Все', 'recruiters')}
      ${dropSelect(PERIODS[0], 'period')}
      <div class="se-quick">${QUICK.map((q) => `<button class="se-quick-item" type="button">${q}</button>`).join('')}</div>
      ${dropSelect('Источники: Все', 'sources')}
      ${dropSelect('Статусы ПД: Все', 'pd')}
    </div>`,
    tags: dropList(TAGS.map(([n, c]) => [n, '', c]), { search: true }),
    vacancies: `<div class="se-panel" style="width:450px">
      ${dropSelect('Вакансии: Все', 'vacancies')}
      ${dropSelect('Этапы: Все', 'stages')}
    </div>`,
    /* Доп. инфо не настроено — вместо фильтра рекламная карточка */
    extra: `<div class="se-panel se-promo" style="width:400px">
      <div class="se-promo-title">Расширьте возможности фильтрации кандидатов</div>
      <p class="se-promo-text">Добавьте в карточку кандидата поля с выбором значений
        из справочника, например «Грейд специалиста», «Откуда узнал о вакансии» или любые
        необходимые для полноты информации, детальной аналитики и удобного поиска</p>
      <a class="ap-btn ap-btn--s" href="settings.html#s=business&t=fields">Добавить поля доп. инфо</a>
    </div>`,
    vacstate: dropList(VAC_STATES.map(([, l]) => l), { reset: false,
      checked: VAC_STATES.find(([id]) => id === state.vac)[1] }),
    vacrecruiters: dropList(RECRUITERS, { search: true }),
    vacfilters: `<div class="se-panel" style="width:450px">
      ${dropSelect('Подразделение: Все', 'depts')}
      <div class="se-panel-title">Период работы над вакансией</div>
      ${dropSelect(PERIODS[0], 'period')}
      <div class="se-quick">${QUICK.map((q) => `<button class="se-quick-item" type="button">${q}</button>`).join('')}</div>
    </div>`,
    sort: dropList(SORTS, { reset: false, checked: SORTS[0] }),
  };
  return panels[key] || '';
};

/* Кнопка полосы фильтров вместе с раскрытой под ней панелью */
const filterBtn = (key, label, wide) => `
  <div class="se-filter">
    <button class="se-filter-btn${state.menu === key ? ' is-open' : ''}" type="button" data-menu="${key}">
      ${esc(label)}${svg('chevron-down-20', 20)}</button>
    ${state.menu === key ? `<div class="se-pop${wide ? ' se-pop--wide' : ''}">${panelHtml(key)}</div>` : ''}
  </div>`;

/* ── Выдача ────────────────────────────────────────────────── */

const foundCard = (c) => `
  <div class="se-card${state.pick === c.id ? ' is-active' : ''}" data-pick="${c.id}">
    <span class="se-card-photo">${esc(c.init)}</span>
    <span class="se-card-body">
      <span class="se-card-name">${esc(c.name)}</span>
      ${[c.want, c.pay, c.age, c.exp, c.lastPos, c.lastOrg, `Источник: ${c.src}`]
        .filter(Boolean).map((l) => `<span class="se-card-info">${esc(l)}</span>`).join('')}
    </span>
  </div>`;

const applicantsResults = () => {
  /* Без запроса выдачи нет вовсе: экран стоит пустой, только полоса фильтров */
  if (!state.q) return '';
  const c = CANDIDATES.find((x) => x.id === state.pick);
  return `
    <div class="se-results" data-od-id="search-results">
      <div class="hf-island se-list" data-od-id="search-list">
        <div class="se-counter">Найдено кандидатов: 10000</div>
        <div class="se-cards">${FOUND.map(foundCard).join('')}</div>
      </div>
      <div class="hf-island se-detail" data-od-id="search-detail">
        ${c ? '<div id="candidate-detail"></div>'
            : '<div class="se-empty">Выберите кандидата<br>из списка</div>'}
      </div>
    </div>`;
};

const vacRow = (v) => {
  const hold = v.state === 'hold';
  return `
  <li class="se-vac${hold ? ' is-hold' : ''}">
    <a class="se-vac-title" href="vacancy-info.html">
      ${hold ? `<span class="se-vac-pause">${svg('pause-2', 12)}</span>`
             : '<span class="se-vac-tag">Закрыта</span>'}${esc(v.name)}</a>
    <div class="se-vac-org">${esc(v.org)}</div>
    <div class="se-vac-dates">
      <span>Открыта: <b>${esc(v.open)}</b></span>
      <span>${hold ? 'Приостановлена' : 'Закрыта'}: <b>${esc(v.end)}</b></span>
    </div>
    <div class="se-vac-line">Последнее действие: <b>${esc(v.last)}</b></div>
    <div class="se-vac-line">Рекрутер: <b>${esc(v.rec)}</b></div>
    ${v.offer ? `<div class="se-vac-line">Оффер принят: <b>${esc(v.offer)}</b></div>` : ''}
  </li>`;
};

const vacanciesResults = () => {
  /* «Все вакансии» без запроса — тоже пусто: состояние здесь такой же
     критерий отбора, как слово в строке */
  if (state.vac === 'all' && !state.q) return '';
  const rows = VAC_FOUND.filter((v) => state.vac === 'all' || v.state === state.vac);
  return `
    <div class="hf-island se-vac-sheet" data-od-id="search-vacancies">
      <div class="se-counter">Найдено вакансий: ${state.vac === 'hold' ? 11 : 1504}</div>
      <ul class="se-vac-list">${rows.map(vacRow).join('')}</ul>
    </div>`;
};

/* ── Модалка настройки списков ─────────────────────────────── */

const LIST_FIELDS = [
  ['ФИО кандидата', true, true], ['Желаемая должность'], ['Желаемая зарплата'],
  ['Возраст и дата рождения'], ['Общий стаж'], ['Должность на последнем месте работы'],
  ['Последнее место работы'], ['Источник'],
  ['Число вакансий, на которых кандидат в работе'], ['Метки'],
];

const listSettingsHtml = () => `
  <div class="hf-overlay is-open" data-se-overlay>
    <div class="hf-modal" style="width:760px" data-od-id="list-settings">
      <div class="hf-modal-head">
        <h2 class="hf-h2">Настройка списков кандидатов</h2>
        <button class="hf-icon-btn hf-icon-btn--dark" type="button" data-se-close aria-label="Закрыть">${svg('x-close', 20)}</button>
      </div>
      <div class="hf-modal-body">
        <div class="se-set-title">Показывать всех кандидатов на этапах</div>
        <label class="se-radio"><input type="radio" name="se-scope"> <span>Только по моим вакансиям</span></label>
        <label class="se-radio"><input type="radio" name="se-scope" checked> <span>По всем открытым вакансиям</span></label>
        <hr class="se-set-line">
        <div class="se-set-title">Отображать в списках кандидатов</div>
        ${LIST_FIELDS.map(([label, on, lock]) => `
          <label class="se-check${lock ? ' is-locked' : ''}">
            <input type="checkbox" ${on === false ? '' : 'checked'} ${lock ? 'disabled' : ''}>
            <span>${esc(label)}</span></label>`).join('')}
      </div>
      <div class="hf-modal-foot">
        <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-se-close>Сохранить</button>
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-se-close>Отмена</button>
      </div>
    </div>
  </div>`;

/* ── Отрисовка ─────────────────────────────────────────────── */

const render = () => {
  const app = state.subject === 'applicants';
  const bar = app
    ? `<div class="hf-island se-bar">
         <div class="se-bar-items">
           ${filterBtn('scope', 'Область поиска')}
           ${filterBtn('filters', 'Фильтры')}
           ${filterBtn('tags', 'Метки: Все')}
           ${filterBtn('vacancies', 'Вакансии')}
           ${filterBtn('extra', 'Доп. инфо')}
         </div>
         <button class="se-export" type="button">${svg('download', 20)}В Excel</button>
       </div>
       <div class="hf-island se-bar-side">
         <button class="hf-icon-btn se-list-settings" type="button" data-settings aria-label="Настройка списков">
           ${svg('options-2-24', 24)}</button>
       </div>`
    : `<div class="hf-island se-bar">
         <div class="se-bar-items">
           ${filterBtn('vacstate', VAC_STATES.find(([id]) => id === state.vac)[1])}
           ${filterBtn('vacrecruiters', 'Рекрутеры: Все')}
           ${filterBtn('vacfilters', 'Фильтры')}
         </div>
       </div>
       <div class="hf-island se-bar-side se-sort">
         <div class="se-filter">
           <button class="se-filter-btn${state.menu === 'sort' ? ' is-open' : ''}" type="button" data-menu="sort">
             ${svg('sorting', 24)}${SORTS[0]}${svg('chevron-down-20', 20)}</button>
           ${state.menu === 'sort' ? `<div class="se-pop se-pop--right">${panelHtml('sort')}</div>` : ''}
         </div>
       </div>`;

  document.getElementById('search-screen').innerHTML = `
    <div class="se-bar-row" data-od-id="search-filters">${bar}</div>
    ${app ? applicantsResults() : vacanciesResults()}
    ${state.modal ? listSettingsHtml() : ''}`;

  /* Карточка кандидата — общая с экраном «Все кандидаты»: в оригинале
     это буквально та же панель, отличается только список слева */
  const c = CANDIDATES.find((x) => x.id === state.pick);
  if (app && state.q && c) renderDetail(c, { banner: false });

  HF.searchbar(state.subject, state.q);
};

/* ── Поведение ─────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const menu = e.target.closest('[data-menu]');
  if (menu) {
    const key = menu.dataset.menu;
    state.menu = state.menu === key ? '' : key;
    state.sub = '';
    writeHash(); render(); return;
  }
  const sub = e.target.closest('[data-sub]');
  if (sub) {
    state.sub = state.sub === sub.dataset.sub ? '' : sub.dataset.sub;
    writeHash(); render(); return;
  }
  const pick = e.target.closest('[data-pick]');
  if (pick) { state.pick = pick.dataset.pick; writeHash(); render(); return; }
  if (e.target.closest('[data-settings]')) { state.modal = true; writeHash(); render(); return; }
  if (e.target.closest('[data-se-close]') || e.target.matches('[data-se-overlay]')) {
    state.modal = false; writeHash(); render(); return;
  }
  /* Клик мимо закрывает раскрытую панель — как в оригинале */
  if (state.menu && !e.target.closest('.se-filter') && !e.target.closest('.kd-drop')) {
    state.menu = ''; state.sub = ''; writeHash(); render();
  }
});

addEventListener('hashchange', () => { readHash(); render(); });

readHash();
HF.mount({ active: 'search', title: 'Поиск', search: { subject: state.subject, query: state.q } });
render();
