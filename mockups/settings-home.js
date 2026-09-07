/* Корень настроек — экран `/app/settings`.

   Это единственное место, откуда можно попасть из одного раздела
   настроек в другой. Внутри раздела меню слева показывает только его
   собственные подвкладки, соседних разделов в нём нет вовсе: чтобы
   уйти из «Воронки» в «Организацию», надо сначала вернуться сюда
   ссылкой «Настройки Рефни» в левом верхнем углу.

   Разделов тринадцать, и они разбиты на две группы: восемь настроек
   организации и пять личных под заголовком «Мой Хантфлоу». Граница
   между группами проходит не по важности, а по тому, кого касается
   изменение: слева настройка меняет работу всей компании, справа —
   только твою собственную. */

/* Раздел: имя, описание, иконка, её цвет и адрес в макете.
   Пустой адрес — раздел, который мы не переносили; карточка на месте,
   но никуда не ведёт, как и в оригинале у ещё не купленного раздела. */
const HOME_ORG = [
  ['Рекрутеры и заказчики', 'Добавление пользователей и настройка прав',
    'settings-users', '#f55932', '#s=users&t=recruiters'],
  ['Организация', 'Название, оргструктура, безопасность и уведомления',
    'settings-organization', '#6c63eb', '#s=org&t=company'],
  ['Воронка', 'Этапы подбора, воронки, отказы и контроль сроков',
    'settings-funnel', '#e743d6', '#s=funnel&t=stages'],
  ['Бизнес-процесс', 'Заявки, вакансии, справочники, метки и источники резюме',
    'settings-business', '#00b84e', '#s=business&t=requests'],
  ['Шаблоны, оценка и анкеты', 'Письма, анкеты, обратная связь и оценка рекрутмента',
    'settings-templates', '#28bad3', '#s=templates&t=mail'],
  ['Темы оформления', 'Сделайте ваш Хантфлоу по‑настоящему уютным',
    'settings-themes', '#a4bb13', '#s=themes'],
  ['Сбор откликов', 'Карьерный сайт и публикация вакансий',
    'settings-response', '#f0b10e', '#s=response'],
  ['API и вебхуки', 'Интеграция с вашими внутренними ресурсами',
    'settings-api', '#4b83ef', '#s=api'],
];

const HOME_MY = [
  ['Профиль', 'Обо мне, часовой пояс, аккаунт, язык интерфейса',
    'settings-profile', '#f0b10e', '#s=profile'],
  ['Почта и календарь', 'Google, Exchange, Outlook365 и другие',
    'settings-calendar', '#28bad3', '#s=connections'],
  ['Волшебная кнопка', 'Сохранение резюме с 20+ сайтов одним кликом',
    'settings-magic-button', '#f55932', '#s=magic'],
  ['Джоб-сайты', 'HH, Avito, Хабр Карьера, AmazingHiring и другие',
    'settings-jobsites', '#e743d6', '#s=social'],
  ['Интеграции', 'Zoom, MS Teams, Google Meet и другие',
    'settings-integrations', '#6c63eb', '#s=integrations'],
];

/* Карточка раздела: цветная иконка, название и строка про то,
   что внутри. Описание здесь важнее, чем кажется: по названиям
   «Организация» и «Бизнес-процесс» не догадаться, где искать
   оргструктуру, а где справочники. */
const homeCard = ([name, note, ic, color, href]) => {
  const inner = `
    <span class="st-home-icon" style="color:${color}">${HF.icon(ic, 20)}</span>
    <span class="st-home-text">
      <span class="st-home-name">${HF.esc(name)}</span>
      <span class="st-home-note">${HF.esc(note)}</span>
    </span>`;
  return href
    ? `<a class="st-home-card" href="${href}" data-od-id="settings-card-${ic}">${inner}</a>`
    : `<span class="st-home-card is-flat" data-od-id="settings-card-${ic}">${inner}</span>`;
};

const paneHome = () => `
  <div class="st-home-org">
    <h2 class="st-home-title">Рефни</h2>
    <p class="st-home-meta">
      <button class="st-home-id" type="button">ID 227</button>
      <span>·</span><span>Тариф «Максимальный» до 29.08.2027</span>
      <span>·</span><span>Управляющий рекрутер</span>
    </p>
  </div>
  <div class="st-search st-search--plain">
    ${HF.icon('search-20')}<input type="search" placeholder="Поиск">
  </div>
  <div class="st-home-grid" data-od-id="settings-sections-org">
    ${HOME_ORG.map(homeCard).join('')}
  </div>
  <h2 class="st-home-title st-home-title--group">Мой Хантфлоу</h2>
  <div class="st-home-grid" data-od-id="settings-sections-my">
    ${HOME_MY.map(homeCard).join('')}
  </div>`;

Object.assign(SECTIONS, {
  home: { title: 'Настройки Хантфлоу', pane: paneHome, home: true },
});
