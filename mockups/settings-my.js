/* Настройки → «Мой Хантфлоу»: пять личных разделов.

   Карточка экрана: docs/reference/screens/settings-my.md

   Разделов пять, и все пять — одностраничники без подвкладок,
   каждый в двадцать-тридцать строк. По общему правилу проекта раздел
   получает свой файл, но пять файлов по тридцать строк читаются хуже
   одного: разделы связаны одним смыслом — это настройки, которые
   меняют работу одного человека, а не компании.

   Граница между группами в корне настроек проходит именно здесь,
   и она содержательная: слева «Организация» и «Воронка» — то, что
   управляющий рекрутер меняет всем сразу; справа «Профиль» и «Почта» —
   то, что каждый настраивает себе. Прав на чужие личные настройки
   в интерфейсе нет вовсе: посмотреть, какие почты подключил коллега,
   нельзя ниоткуда.

   Все пять описаны через `pane`, а не `tabs`.

   Данные вымышленные, структура — снятая с боевого экрана.

   Подключается после settings.js. */

/* ── Профиль ─────────────────────────────────────────────────────
   Единственный из пяти, где есть форма с кнопкой «Сохранить».
   Ниже формы — три блока, каждый со своим действием: почта для входа,
   почта для уведомлений и двухфакторная аутентификация. То, что почта
   для входа и почта для уведомлений — разные поля, стоит запомнить:
   у нас это два разных адреса одного человека, а не одно поле. */

const PROFILE_SESSIONS = [
  ['Chrome · Этот браузер', 'Последняя активность сегодня, 14:52', '178.140.12.7', false],
  ['Chrome', 'Последняя активность сегодня, 01:35', '178.140.12.7', true],
  ['Safari · iPhone', 'Последняя активность вчера, 19:08', '95.24.180.44', true],
];

const profileRow = (label, value, action) => `
  <div class="st-my-row">
    <div class="st-my-row-text">
      <span class="st-my-row-label">${HF.esc(label)}</span>
      <span class="st-my-row-value">${HF.esc(value)}</span>
    </div>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">${HF.esc(action)}</button>
  </div>`;

const paneProfile = () => `
  <div class="st-my-form" data-od-id="profile-form">
    <div class="st-my-photo">
      <span class="st-my-avatar">${HF.icon('userpic', 40)}</span>
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Загрузить фото</button>
    </div>
    <label class="hf-field"><span class="hf-label">Мое имя</span>
      <input class="hf-input" type="text" value="Юджин"></label>
    <label class="hf-field"><span class="hf-label">Моя должность</span>
      <input class="hf-input" type="text" value="Ведущий рекрутер"></label>
    <label class="hf-field"><span class="hf-label">Телефон для связи</span>
      <input class="hf-input" type="tel" value="+7 916 000-00-00"></label>
    <label class="hf-field"><span class="hf-label">Язык</span>
      <select class="hf-select"><option>Русский</option><option>English</option></select></label>
    <label class="hf-field"><span class="hf-label">Мой часовой пояс</span>
      <select class="hf-select"><option>GMT+03:00 Москва</option></select></label>
    <button class="hf-btn hf-btn--primary hf-btn--l" type="button">Сохранить</button>
  </div>

  <div class="st-my-block" data-od-id="profile-accounts">
    ${profileRow('Рабочая почта для входа', 'es@refni.ru', 'Изменить')}
    ${profileRow('Эл. почта для уведомлений', 'es@refni.ru', 'Изменить')}
    ${profileRow('Двухфакторная аутентификация',
    'Двухфакторная аутентификация не включена', 'Включить')}
  </div>

  <div class="st-my-block" data-od-id="profile-security">
    <h3 class="st-plain-h3">Безопасность</h3>
    <p class="st-plain-lead">Вы вошли в свой аккаунт Хантфлоу в браузерах:</p>
    <ul class="st-my-list">
      ${PROFILE_SESSIONS.map(([name, when, ip, canQuit]) => `
        <li class="st-my-item">
          <span class="st-my-item-text">
            <span class="st-my-item-name">${HF.esc(name)}</span>
            <span class="st-my-item-note">${HF.esc(when)} · ${HF.esc(ip)}</span>
          </span>
          ${canQuit ? '<button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Выйти</button>' : ''}
        </li>`).join('')}
    </ul>
  </div>`;

/* ── Почта и календарь ───────────────────────────────────────────
   Два списка подключений. Почт может быть много — письма кандидатам
   уходят с выбранного адреса; календарь по факту один. Строка
   «Календарь Хантфлоу» стоит в списке наравне с внешними, как
   встроенный карьерный сайт среди джоб-сайтов: своё показано
   такой же строкой, что и чужое. */

const MAILBOXES = [
  'va@refni.ru', 'ep@refni.ru', 'rv@refni.ru', 'zm@refni.ru', 'mo@refni.ru',
];

const paneConnections = () => `
  <div class="st-my-block" data-od-id="connections-mail">
    <h3 class="st-plain-h3">Почта</h3>
    <p class="st-plain-lead">Подключите адрес своей почты и отправляйте письма
      кандидатам прямо из Хантфлоу</p>
    <ul class="st-my-list">
      ${MAILBOXES.map((m) => `
        <li class="st-my-item">
          <span class="st-my-item-name">${HF.esc(m)}</span>
          <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Отключить</button>
        </li>`).join('')}
    </ul>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Добавить почту</button>
  </div>

  <div class="st-my-block" data-od-id="connections-calendar">
    <h3 class="st-plain-h3">Календарь</h3>
    <p class="st-plain-lead">Подключите свой корпоративный календарь и назначайте
      интервью, встречи и напоминания прямо из Хантфлоу</p>
    <ul class="st-my-list">
      <li class="st-my-item"><span class="st-my-item-name">Календарь Хантфлоу</span></li>
    </ul>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Добавить календарь</button>
  </div>`;

/* ── Волшебная кнопка ────────────────────────────────────────────
   Раздел, в котором нечего настраивать: расширение браузера, которое
   сохраняет резюме с работных сайтов в базу. Для нашей модели важен
   сам факт — резюме попадают в базу не только через отклики и загрузку
   файлом, но и «щелчком с чужого сайта». Это третий путь появления
   кандидата, и он в ТЗ пока не описан. */

const paneMagic = () => `
  <p class="st-plain-lead">Она сохраняет резюме кандидатов в вашу базу
    прямо с работных сайтов</p>
  <div class="st-my-block" data-od-id="magic-install">
    <h3 class="st-plain-h3">Установите Волшебную кнопку в ваш браузер</h3>
    <button class="hf-btn hf-btn--primary hf-btn--l" type="button">Установить</button>
  </div>
  <div class="st-my-block" data-od-id="magic-hint">
    <p class="st-plain-lead">Одновременно нажмите клавиши
      <kbd class="st-kbd">Alt</kbd> + <kbd class="st-kbd">S</kbd> для сохранения резюме
      или иконку Хантфлоу в правой верхней части вашего браузера</p>
  </div>`;

/* ── Джоб-сайты ──────────────────────────────────────────────────
   Личные аккаунты на работных сайтах: подключает их каждый себе,
   и загрузка резюме идёт от его имени. Это существенно расходится
   с публикацией вакансии, которая настраивается на компанию:
   публикуют — от организации, а резюме тянут — от человека.

   Одиннадцать площадок; подключён один HeadHunter — так и было
   в боевом аккаунте, и это удобно: оба состояния строки видно рядом. */

const MY_JOB_SITES = [
  ['HeadHunter', 'ad@refni.ru'],
  ['Avito', null],
  ['SuperJob', null],
  ['Зарплата.ру', null],
  ['Хабр Карьера', null],
  ['rabota.by', null],
  ['Мэтчи (AmazingHiring)', null],
  ['VK', null],
  ['getmatch', null],
  ['Podbor.io', null],
  ['Работа.ру', null],
];

const paneSocial = () => `
  <p class="st-plain-lead">Для удобной загрузки резюме кандидатов к себе одним кликом</p>
  <ul class="st-my-list" data-od-id="jobsites-list">
    ${MY_JOB_SITES.map(([name, account], i) => `
      <li class="st-my-item" data-od-id="jobsite-${i}">
        <span class="st-my-item-text">
          <span class="st-my-item-name">${HF.esc(name)}</span>
          ${account ? `<span class="st-my-item-note">${HF.esc(account)}</span>` : ''}
        </span>
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">${
  account ? 'Отключить' : 'Подключить'}</button>
      </li>`).join('')}
  </ul>`;

/* ── Интеграции ──────────────────────────────────────────────────
   Разделов с этим названием у Хантфлоу два: один в «Организации»,
   другой здесь. В организации подключение цепляет сервис ко всей
   компании, здесь — к себе. Названия одинаковые, смысл разный,
   и из интерфейса эта разница никак не видна. В макете они разведены
   именами `paneIntegrations` и `paneMyIntegrations`.

   Вопреки названию — только видеосвязь, шесть сервисов. Никаких
   «интеграций» в широком смысле здесь нет: обмен данными живёт
   в «API и вебхуках», почта в «Почте и календаре», работные сайты
   в своём разделе. То есть слово «Интеграции» у Хантфлоу означает
   «чем звонить кандидату».

   Ни один не подключён: подключение цепляет внешний сервис
   ко всей компании, и в боевом аккаунте мы это не трогали. */

const MEETINGS = ['Zoom', 'Контур.Толк', 'Яндекс.Телемост', 'МТС Линк', 'MS Teams', 'Google Meet'];

const paneMyIntegrations = () => `
  <ul class="st-my-list" data-od-id="integrations-list">
    ${MEETINGS.map((name, i) => `
      <li class="st-my-item" data-od-id="integration-${i}">
        <span class="st-my-item-name">${HF.esc(name)}</span>
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Подключить</button>
      </li>`).join('')}
  </ul>`;

Object.assign(SECTIONS, {
  profile: { title: 'Профиль', pane: paneProfile },
  connections: { title: 'Почта и календарь', pane: paneConnections },
  magic: { title: 'Волшебная кнопка', pane: paneMagic },
  social: { title: 'Джоб-сайты', pane: paneSocial },
  integrations: { title: 'Интеграции', pane: paneMyIntegrations },
});
