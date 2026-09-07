/* Экран «Картина дня». Оболочку строит shell.js — здесь только содержимое.

   Это точка входа в систему: приложение открывается на нём. Экран показывает
   портфель вакансий одним из двух разрезов и больше ничего: ни задач, ни
   встреч, ни писем. «День» в названии — про то, как далеко разошлись сроки,
   а не про сегодняшние дела.

   Данные вымышленные, структура повторена точно. */

// Оригинал сохранён для сравнения; основной адрес показывает адаптированную таблицу.
if (new URLSearchParams(location.hash.slice(1)).get('view') === 'reference') {
const esc = HF.esc;
/* HF.icon не задаёт заливку, а здесь иконки идут внутри текста
   и должны краситься вместе с ним */
const svg = (name, size = 20) =>
  `<svg style="width:${size}px;height:${size}px;fill:currentColor"><use href="#${name}"></use></svg>`;

/* Полоса этапов — та же, что на «Всех кандидатах»: с неё уходят в список */
document.getElementById('stage-tabs-row').innerHTML = HF.STAGES.map(([name, count]) => `
  <a class="ap-tab" href="applicants.html">
    <span class="ap-tab-in">${esc(name)}<span class="ap-tab-count">${count}</span></span>
  </a>`).join('');

/* ── Данные ────────────────────────────────────────────────────
   В обоих разрезах строка одна и та же — вакансия, срок в работе
   и число кандидатов. Меняется только группировка и подпись под
   названием: в разрезе по рекрутерам там подразделение, в разрезе
   по вакансиям — рекрутеры. */

const V = HF.VACANCIES;
const row = (i, days, sub, hold) =>
  ({ name: V[i].name, id: V[i].id, plan: '0/1', days, cands: V[i].count, sub, hold });

const BY_RECRUITER = [
  {
    title: 'Я, Полина', plan: '0/12', avatar: true,
    rows: [
      row(0, 26, 'Рефни'), row(1, 26, 'Рефни'), row(2, 26, 'Рефни'),
      row(3, 104, 'Рефни'), row(4, 320, 'Рефни'), row(5, 58, 'Рефни'),
      row(6, 41, 'Рефни'), row(7, 77, 'Рефни'), row(8, 9, 'Рефни'),
    ],
    /* Список подрезан десятью строками: остальные приходят по кнопке */
    more: [
      { name: 'Системный аналитик', plan: '0/1', days: 12, cands: 4, sub: 'Рефни' },
      { name: 'Технический писатель', plan: '0/1', days: 12, cands: 0, sub: 'Рефни' },
      { name: 'Продуктовый дизайнер', plan: '0/1', days: 33, cands: 21, sub: 'Рефни' },
    ],
  },
  {
    title: 'Артём Кузнецов', plan: '0/4', avatar: true,
    rows: [
      { name: 'Senior Go Developer', plan: '0/2', days: 212, cands: 26, sub: 'Vi.Tech' },
      { name: 'Team Lead (мобильная разработка)', plan: '0/1', days: 178, cands: 3, sub: 'Vi.Tech' },
      { name: 'Инженер по нагрузочному тестированию', plan: '0/1', days: 63, cands: 5, sub: 'Vi.Tech' },
      { name: 'Senior .NET Engineer', plan: '', days: 63, cands: 5, sub: 'Брейнвей', hold: true },
    ],
  },
];

const BY_VACANCY = [
  {
    title: 'Рефни', plan: '0/12',
    rows: BY_RECRUITER[0].rows.map((r) => ({ ...r, sub: 'Полина' })),
    more: BY_RECRUITER[0].more.map((r) => ({ ...r, sub: 'Полина' })),
  },
  {
    title: 'Vi.Tech', plan: '0/4',
    rows: BY_RECRUITER[1].rows.filter((r) => !r.hold).map((r) => ({ ...r, sub: 'Артём Кузнецов' })),
  },
  {
    /* Ставок ноль: единственная вакансия подразделения стоит на паузе,
       и в счётчик группы она не идёт */
    title: 'Брейнвей', plan: '0/0',
    rows: [{ name: 'Senior .NET Engineer', plan: '', days: 63, cands: 5, sub: 'Артём Кузнецов', hold: true }],
  },
];

/* Кто вакансий не ведёт. Людей здесь один, остальное — токены API:
   в модели Хантфлоу токен такой же пользователь, как человек, и попадает
   в общий список наравне с людьми. */
const IDLERS = [
  'Ирина Соколова', 'API: интеграция с 1С', 'API: карьерный сайт',
  'API: выгрузка в аналитику', 'API: тестовый',
];

/* Списки для фильтров. У рекрутеров показана почта — у токенов она
   выдана системой, по ней их и видно. */
const RECRUITERS = [
  ['Я, Полина', 'polina@refni.ru'],
  ['Артём Кузнецов', 'kuznetsov@refni.ru'],
  ['Ирина Соколова', 'sokolova@refni.ru'],
  ['API: интеграция с 1С', 'api-160301-68@refni.ru'],
  ['API: карьерный сайт', 'api-160301-81@refni.ru'],
  ['API: выгрузка в аналитику', 'api-160301-76@refni.ru'],
  ['API: тестовый', 'api-160301-101@refni.ru'],
];

const DEPARTMENTS = ['Рефни', 'Vi.Tech', 'Брейнвей', 'Кортекс', 'Практика', 'ЦИАН', 'ЗВУК'];

/* ── Состояние ─────────────────────────────────────────────────
   Держится в хеше: #g=vacancies — второй разрез, #m=cut и #m=filter —
   раскрытые списки. Но клик обрабатывается и сам: во встроенном
   предпросмотре переход по якорю бывает перехвачен, и экран без этого
   выглядит мёртвым. */
const state = { cut: 'recruiters', menu: '', expanded: false };

const readHash = () => {
  const p = new URLSearchParams(location.hash.replace('#', ''));
  state.cut = p.get('g') === 'vacancies' ? 'vacancies' : 'recruiters';
  state.menu = p.get('m') || '';
};

const writeHash = () => {
  const p = ['view=reference'];
  if (state.cut === 'vacancies') p.push('g=vacancies');
  if (state.menu) p.push(`m=${state.menu}`);
  const h = p.length ? `#${p.join('&')}` : '#';
  if (location.hash !== h) history.replaceState(null, '', h);
};

/* ── Отрисовка ─────────────────────────────────────────────── */

const rowHtml = (r) => `
  <tr>
    <td class="kd-col-vac">
      ${r.hold
        ? `<span class="kd-vac-title is-hold"><span class="kd-vac-hold-icon">${svg('pause-2', 20)}</span>${esc(r.name)}</span>`
        : `<a class="kd-vac-title" href="vacancy.html${r.id ? `#v=${r.id}` : ''}">${esc(r.name)}<span class="kd-vac-count">${r.plan}</span></a>`}
      <div class="kd-vac-sub">${esc(r.sub)}</div>
    </td>
    <td class="kd-col-num"><span class="kd-num">${r.days}</span></td>
    <td class="kd-col-num"><span class="kd-num">${r.cands}</span></td>
  </tr>`;

const groupHtml = (g) => {
  const rows = g.rows.concat(state.expanded && g.more ? g.more : []);
  return `
  <div class="kd-group" data-od-id="group-${esc(g.title)}">
    <div class="kd-group-head">
      <h3 class="kd-group-title">
        ${g.avatar ? `<span class="hf-avatar">${svg('userpic', 16)}</span>` : ''}
        ${esc(g.title)}<span class="kd-group-plan">${g.plan}</span>
      </h3>
      <div class="kd-group-col">В работе, дн</div>
      <div class="kd-group-col">Кандидатов</div>
    </div>
    <table class="kd-table"><tbody>${rows.map(rowHtml).join('')}</tbody></table>
    ${g.more && !state.expanded
      ? `<button class="kd-more" type="button" data-more>Показать еще вакансии ${svg('chevron-down-20', 20)}</button>`
      : ''}
  </div>`;
};

/* Разрезов ровно два, и других не предвидится: меню узкое,
   без поиска, с галочкой у выбранного */
const cutMenuHtml = () => `
  <div class="kd-drop kd-drop--cut" data-od-id="cut-menu">
    ${[['recruiters', 'По рекрутерам'], ['vacancies', 'По вакансиям']].map(([id, label]) => `
      <div class="kd-drop-item${state.cut === id ? ' is-on' : ''}" data-cut="${id}">
        <span class="kd-drop-check${state.cut === id ? '' : ' is-off'}">${svg('checked-item-mark-new', 20)}</span>
        <span class="kd-drop-name">${label}</span>
      </div>`).join('')}
  </div>`;

const filterDropHtml = () => {
  const byPeople = state.cut === 'recruiters';
  const items = byPeople
    ? RECRUITERS.map(([name, mail], i) => `
        <div class="kd-drop-item${i === 0 ? ' is-on' : ''}">
          <span class="hf-avatar">${svg('userpic', 16)}</span>
          <span><span class="kd-drop-name" style="display:block">${esc(name)}</span>
          <span class="kd-drop-mail" style="display:block">${esc(mail)}</span></span>
        </div>`).join('')
    : DEPARTMENTS.map((name, i) => `
        <div class="kd-drop-item${i === 0 ? ' is-on' : ''}">
          <span class="kd-drop-name">${esc(name)}</span>
        </div>`).join('');
  return `
    <div class="kd-drop kd-drop--filter" data-od-id="filter-menu">
      <div class="kd-drop-search">
        ${svg('search-16', 16)}
        <input type="text" placeholder="Поиск..." aria-label="Поиск">
      </div>
      <div class="kd-drop-actions">
        <button class="kd-drop-act" type="button">Сбросить выбор</button>
        ${byPeople ? '' : '<button class="kd-drop-act" type="button">Скрыть архивные</button>'}
      </div>
      <div class="kd-drop-list">${items}</div>
    </div>`;
};

const render = () => {
  const groups = state.cut === 'recruiters' ? BY_RECRUITER : BY_VACANCY;
  document.getElementById('dashboard-screen').innerHTML = `
    <div class="kd-head" data-od-id="dashboard-title">
      ${svg('rocket', 28)}<h1 class="kd-title">Картина дня</h1>
    </div>

    <div class="kd-filters" data-od-id="dashboard-filters">
      <div class="kd-filter">
        <button class="kd-filter-btn${state.menu === 'cut' ? ' is-open' : ''}" type="button" data-menu="cut">
          <span>${state.cut === 'recruiters' ? 'По рекрутерам' : 'По вакансиям'}</span>${svg('chevron-down-24', 24)}
        </button>
        ${state.menu === 'cut' ? cutMenuHtml() : ''}
      </div>
      <div class="kd-filter">
        <button class="kd-filter-btn${state.menu === 'filter' ? ' is-open' : ''}" type="button" data-menu="filter">
          <span>${state.cut === 'recruiters' ? 'Рекрутеры: Все' : 'Подразделение: Все'}</span>${svg('chevron-down-24', 24)}
        </button>
        ${state.menu === 'filter' ? filterDropHtml() : ''}
      </div>
    </div>

    <div class="kd-groups" data-od-id="dashboard-groups">
      ${groups.map(groupHtml).join('')}
    </div>

    ${state.cut === 'recruiters' ? `
      <div class="kd-idlers" data-od-id="idlers">
        <h3 class="kd-idlers-title">Не ведут вакансии<span class="kd-idlers-count">${IDLERS.length}</span></h3>
        <div class="kd-idlers-list">${IDLERS.map(esc).join(', ')}</div>
      </div>` : ''}`;
};

/* ── Поведение ─────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const menu = e.target.closest('[data-menu]');
  if (menu) {
    state.menu = state.menu === menu.dataset.menu ? '' : menu.dataset.menu;
    writeHash(); render(); return;
  }

  const cut = e.target.closest('[data-cut]');
  if (cut) {
    state.cut = cut.dataset.cut;
    state.menu = '';
    state.expanded = false;
    writeHash(); render(); return;
  }

  if (e.target.closest('[data-more]')) { state.expanded = true; render(); return; }

  /* Клик мимо закрывает список, но клик внутри него — нет:
     в фильтре есть поле поиска, и оно должно оставаться живым */
  if (state.menu && !e.target.closest('.kd-drop')) { state.menu = ''; writeHash(); render(); }
});

addEventListener('hashchange', () => { readHash(); render(); });

HF.mount({ active: 'applicants' });
readHash();
render();
}
