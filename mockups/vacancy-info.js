/* Экран «Сведения о вакансии». В Хантфлоу это отдельный роут
   /view/vacancy/{id}, а не вкладка внутри экрана вакансии: здесь
   не кандидаты, а сам паспорт вакансии — кто её ведёт, когда открыта
   и сколько кандидатов прошло через каждый этап.

   Данные вымышленные, структура — с боевого экрана. */

const vacancyId = () => (location.hash.match(/v=([\w-]+)/) || [])[1] || 'fullstack-node';
const vacancy = () => HF.VACANCIES.find((v) => v.id === vacancyId()) || HF.VACANCIES[0];

/* Семь площадок публикации, снятые в песочнице 3 сентября. Порядок
   и состав — как в оригинале. Существенно последнее: «Встроенный
   карьерный сайт» стоит в одном ряду с чужими досками и ничем
   не выделен. Для Хантфлоу собственный карьерный сайт — такая же
   площадка публикации, как HeadHunter, а не часть системы.

   Второе поле — подключён ли аккаунт площадки. Ни один не подключён:
   так выглядит компания, которая ещё ничего никуда не публиковала. */
const JOB_SITES = [
  ['HeadHunter', false],
  ['Avito', false],
  ['Superjob', false],
  ['Хабр Карьера', false],
  ['Rabota.by', false],
  ['Rabota.ru', false],
  ['Встроенный карьерный сайт', false],
];

const INFO = {
  salary: '260 000 р.',
  /* Счётчик найма считается не по вакансии, а по заявкам на подбор:
     клик по нему открывает список заявок с их собственными «нанято/нужно». */
  hired: '0/2',
  requests: [
    ['Заявка от 14.04.2026 — 0/2', 'Создана автоматически при добавлении вакансии рекрутером'],
  ],
  recruiters: [
    ['Я, Юджин', 'ведёт подбор'],
    ['Марина Соколова', 'помогает с интервью'],
  ],
  clients: [
    ['Илья Ковалёв', 'руководитель разработки'],
    ['Анна Дорохова', 'продуктовое направление'],
  ],
  events: [
    ['Открыта', 'Юджин', '14 апреля 2026, 11:20'],
    ['Создана', 'Юджин', '14 апреля 2026, 11:05'],
  ],
  /* «Сколько кандидатов было на каждом этапе» — счётчик накопительный:
     кандидат остаётся в числе каждого этапа, который он прошёл. Поэтому
     сумма по этапам больше, чем «Всего», и числа убывают по воронке. */
  total: 169,
  passed: {
    'Новые': 169,
    'Отправлено письмо': 151,
    'Оценка заказчиком': 38,
    'Интервью с HR': 26,
    'Интервью с заказчиком': 11,
    'Техническое собеседование': 7,
    'Выставлен оффер': 3,
    'Отказ': 47,
  },
  notifications: 'По всем этапам, сразу',
  duties: [
    'Развивать серверную часть продукта на Node.js и TypeScript',
    'Проектировать API для веб-клиента и мобильных приложений',
    'Отвечать за свою часть сервиса целиком: от схемы данных до выката',
  ],
  requirements: [
    'Коммерческий опыт с Node.js от трёх лет',
    'Уверенное знание PostgreSQL и понимание, откуда берутся медленные запросы',
    'Опыт работы с очередями и фоновой обработкой',
  ],
  conditions: [
    'Гибрид: два дня в офисе на Хамовниках, остальные из дома',
    'Оформление в штат, годовой бонус по результатам ревью',
  ],
};

/* Кнопки ряда действий: две чёрные — так в оригинале, это разные действия */
const ACTIONS = [
  ['Редактировать', 'secondary'],
  ['Посмотреть заявку', 'primary'],
  ['Приостановить работу', 'primary'],
  ['Закрыть вакансию', 'secondary'],
  ['Выгрузить в Excel', 'secondary'],
  ['Удалить', 'secondary'],
];

const person = ([name, role]) => `
  <li class="vi-person">
    <span class="hf-avatar" aria-hidden="true">${HF.icon('userpic', 16)}</span>
    <span>${HF.esc(name)}<span class="vi-person-role">, ${HF.esc(role)}</span></span>
  </li>`;

const addBtn = (label) => `
  <button class="vi-add" type="button">${HF.icon('system-plus', 16)}${HF.esc(label)}</button>`;

/* Строка статистики: название слева, число справа, между ними точки.
   Точки — фон-градиент у строки, а белая подложка у текста их разрывает. */
const stats = () => {
  const rows = HF.FUNNEL
    .filter(([name]) => name !== 'В работе')
    .map(([name]) => [name, INFO.passed[name]])
    .filter(([, n]) => n != null);
  return [['Всего', INFO.total], ...rows].map(([name, n]) => `
    <li class="vi-stat">
      <span class="vi-stat-num">${n}</span><span class="vi-stat-label">${HF.esc(name)}</span>
    </li>`).join('');
};

const render = () => {
  const v = vacancy();
  document.getElementById('vacancy-info').innerHTML = `
    <h1 class="vi-title" data-od-id="vacancy-title">${HF.esc(v.name)}</h1>
    <p class="vi-sub">${HF.esc(v.org)} / ${HF.esc(INFO.salary)}</p>
    <p class="vi-sub">Нанято:
      <button class="vi-link" type="button" data-vi-dialog="requests"
              data-od-id="vacancy-quota">${HF.esc(INFO.hired)}</button>
    </p>
    <p class="vi-sub">
      <button class="vi-link" type="button" data-vi-dialog="description"
              data-od-id="vacancy-info-link">Информация о вакансии</button>
    </p>

    <div class="vi-actions" data-od-id="vacancy-actions">
      ${ACTIONS.map(([label, kind]) =>
        `<button class="hf-btn hf-btn--${kind} hf-btn--s" type="button">${HF.esc(label)}</button>`).join('')}
    </div>

    <div class="vi-cols">
      <div class="vi-col">
        <div class="vi-block" data-od-id="block-recruiters">
          <p class="vi-block-title">Назначенные рекрутеры</p>
          <ul class="vi-people">${INFO.recruiters.map(person).join('')}</ul>
          ${addBtn('Добавить')}
        </div>
        <div class="vi-block" data-od-id="block-clients">
          <p class="vi-block-title">Заказчики</p>
          ${INFO.clients.length ? `<ul class="vi-people">${INFO.clients.map(person).join('')}</ul>` : ''}
          ${addBtn('Добавить')}
        </div>
      </div>

      <div class="vi-col">
        <div class="vi-block" data-od-id="block-lifecycle">
          <p class="vi-block-title">Вакансия</p>
          ${INFO.events.map(([name, who, when]) => `
            <div class="vi-event">
              <p class="vi-event-name">${HF.esc(name)}</p>
              <div class="vi-event-by">
                <span class="hf-avatar" aria-hidden="true">${HF.icon('userpic', 16)}</span>
                <span><b>${HF.esc(who)},</b> ${HF.esc(when)}</span>
              </div>
            </div>`).join('')}
        </div>
        <!-- Блока нет вовсе, пока по вакансии не было ни одного кандидата -->
        <div class="vi-block" data-od-id="block-stats">
          <p class="vi-block-title">Сколько кандидатов было на каждом этапе</p>
          <ul class="vi-stats">${stats()}</ul>
        </div>
      </div>
    </div>

    <!-- Ниже колонок — две секции во всю ширину -->
    <section class="vi-section" data-od-id="block-notifications">
      <h3 class="vi-section-title">Почтовые уведомления по этой вакансии</h3>
      <p class="vi-section-text">${HF.esc(INFO.notifications)}</p>
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Настроить</button>
    </section>

    <section class="vi-section" data-od-id="block-jobsites">
      <h3 class="vi-section-title">Джоб-сайты</h3>
      <p class="vi-section-text">Вакансия пока не опубликована на джоб-сайтах</p>
      <div class="vi-section-btns">
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button"
                data-vi-dialog="publish">Перейти к публикациям</button>
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button"
                data-vi-dialog="attach">Прикрепить уже опубликованную</button>
      </div>
    </section>`;
};

/* ── Две модалки экрана ──────────────────────────────────────────
   Обе простые: заголовок, текст, кнопка «Закрыть». Закрытие,
   Escape и клик по подложке уже разбирает оболочка — ей достаточно
   атрибутов data-hf-overlay и data-hf-close.                     */

const descList = (title, items) => `
  <h4 class="vi-dl-title">${HF.esc(title)}</h4>
  <ul class="vi-dl">${items.map((t) => `<li>${HF.esc(t)}</li>`).join('')}</ul>`;

const dialogHtml = (key, title, body) => `
  <div class="hf-overlay" data-hf-overlay="${key}">
    <div class="hf-modal vi-dialog" role="dialog" aria-modal="true" aria-label="${HF.esc(title)}">
      <div class="hf-modal-head">
        <h2 class="hf-h2">${HF.esc(title)}</h2>
        <button class="hf-icon-btn hf-icon-btn--dark" type="button" data-hf-close
                aria-label="Закрыть">${HF.icon('x-close')}</button>
      </div>
      <div class="hf-modal-body">${body}</div>
      <div class="hf-modal-foot">
        <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>
      </div>
    </div>
  </div>`;

/* Строка площадки. Кнопка есть у всех семи одинаковая, но нажатие
   на площадку с неподключённым аккаунтом публикацию не начинает:
   вместо формы разворачивается её реклама с предложением подключиться.
   То есть подключение площадки — предварительное условие публикации,
   а не её шаг, и в интерфейсе это нигде не написано заранее. */
const jobSite = ([name], i) => `
  <li class="vi-site" data-od-id="site-${i}">
    <span class="vi-site-name">${HF.esc(name)}</span>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button"
            data-vi-promo="${i}">Опубликовать вакансию</button>
  </li>`;

/* Реклама неподключённой площадки — то, что показывают вместо формы.
   Снята она только у встроенного карьерного сайта: у внешних площадок
   нажатие в песочнице не показало ничего, и что там на самом деле,
   мы не знаем. Поэтому текст рекламы здесь ровно один, а не сочинён
   на все семь: макет, который догадывается, врёт убедительнее пустого */
const sitePromo = (i) => (i !== 6 ? '' : `
  <div class="vi-site-promo" data-od-id="site-promo">
    <p class="vi-site-promo-title">${HF.esc(JOB_SITES[6][0])}</p>
    <p class="vi-site-promo-text">Собирайте отклики из соцсетей и мессенджеров
      с&nbsp;помощью встроенного карьерного сайта</p>
    <p class="vi-site-promo-links">
      <a class="vi-link-a" href="#">Узнать подробнее →</a>
      <a class="vi-link-a" href="#">Настроить карьерный сайт →</a>
    </p>
  </div>`);

const renderDialogs = (promo = null) => {
  const v = vacancy();
  document.getElementById('vi-dialogs').innerHTML =
    dialogHtml('vi-description', v.name,
      descList('Обязанности', INFO.duties) +
      descList('Требования', INFO.requirements) +
      descList('Условия работы', INFO.conditions)) +
    dialogHtml('vi-requests', `Заявки в работе: ${v.name}`,
      INFO.requests.map(([head, note]) => `
        <div class="vi-request">
          <p class="vi-request-head">${HF.esc(head)}</p>
          <p class="vi-request-note">${HF.esc(note)}</p>
        </div>`).join('')) +
    dialogHtml('vi-publish', 'Публикация на джоб-сайтах',
      `<ul class="vi-sites">${JOB_SITES.map(jobSite).join('')}</ul>${
        promo === null ? '' : sitePromo(promo)}`) +
    /* Прикрепить можно только то, куда есть доступ. Без единого
       подключённого аккаунта окно пустое — один заголовок */
    dialogHtml('vi-attach', 'Выберите джоб-сайт',
      '<p class="vi-empty">Нет подключённых джоб-сайтов</p>');
};

/* Открытая модалка и раскрытая реклама площадки адресуются хешем:
   обзорный холст показывает состояния кадрами, а не кликами */
const openDialog = (key) => {
  document.querySelectorAll('[data-hf-overlay^="vi-"]').forEach((o) => {
    o.classList.toggle('is-open', o.dataset.hfOverlay === `vi-${key}`);
  });
};

const syncDialog = () => {
  const want = (location.hash.match(/d=([\w-]+)/) || [])[1];
  const promo = (location.hash.match(/promo=(\d+)/) || [])[1];
  renderDialogs(promo === undefined ? null : Number(promo));
  if (want) openDialog(want);
};

document.addEventListener('click', (e) => {
  const promo = e.target.closest('[data-vi-promo]');
  if (promo) {
    renderDialogs(Number(promo.dataset.viPromo));
    openDialog('publish');
    return;
  }
  const btn = e.target.closest('[data-vi-dialog]');
  if (!btn) return;
  openDialog(btn.dataset.viDialog);
});

addEventListener('hashchange', () => { render(); syncDialog(); });

HF.mount({
  active: vacancyId(),
  /* В шапке этого роута не название вакансии, а возврат к её кандидатам:
     название стоит в шапке на самом экране вакансии и ведёт сюда. */
  title: `<a class="hf-back" href="vacancy.html#v=${vacancyId()}" data-od-id="back-to-work">${
    HF.icon('arrow-left', 20)}<span>Вернуться к работе</span></a>`,
});
document.body.insertAdjacentHTML('beforeend', '<div id="vi-dialogs"></div>');
render();
syncDialog();
