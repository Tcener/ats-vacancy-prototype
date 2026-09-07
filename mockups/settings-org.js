/* Настройки → Организация: о компании, оргструктура, безопасность,
   уведомления, интеграции. Подключается после settings.js и берёт
   оттуда dictRow. */

const TIMEZONES = ['GMT+03:00 Москва', 'GMT+05:00 Екатеринбург', 'GMT+07:00 Новосибирск'];
const DOMAINS = ['refni.ru'];

/* Подразделение — не отдельная сущность настроек, а пункт справочника:
   роут у «Оргструктуры» тот же, что у любого другого справочника,
   dictionary-list/account_division. Вложенность рисуется отступом
   у дочерней строки и «галочкой» у родительской. */
const DIVISIONS = [
  ['Разработка', ['Бэкенд', 'Фронтенд', 'Мобильная разработка']],
  ['Продукт и дизайн', []],
  ['Продажи', ['Прямые продажи', 'Партнёрская сеть']],
  ['Маркетинг', []],
  ['Финансы', []],
  ['Персонал и подбор', []],
];
const DIVISIONS_ARCHIVED = ['Отдел внедрения'];

const paneCompany = () => `
  <section class="st-org" data-od-id="org-name">
    <h2 class="st-h2">Название организации</h2>
    <input class="hf-input st-org-input" type="text" value="Рефни" aria-label="Название организации">
    <p class="st-org-label">Короткое название для адреса (URL)</p>
    <input class="hf-input st-org-input" type="text" value="refni" aria-label="Короткое название для адреса">
    <p class="st-org-url">https://huntflow.ru/my/<b>refni</b></p>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Сохранить</button>
  </section>

  <section class="st-org" data-od-id="org-timezone">
    <h2 class="st-h2">Часовой пояс организации</h2>
    <select class="hf-select st-org-input" aria-label="Часовой пояс организации">
      ${TIMEZONES.map((z) => `<option>${HF.esc(z)}</option>`).join('')}
    </select>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Сохранить</button>
  </section>

  <section class="st-org" data-od-id="org-logo">
    <h3 class="st-h3">Ваш логотип</h3>
    <p class="st-org-note">Для файлов с резюме и офферов</p>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Загрузить</button>
  </section>

  <section class="st-org" data-od-id="org-domains">
    <h3 class="st-h3">Домены почтовых адресов для исключения синхронизации переписки</h3>
    <p class="st-lead">Добавьте все корпоративные домены, чтобы исключить синхронизацию
      переписки с кандидатами, у которых они теоретически могут быть указаны</p>
    <ul class="st-domains">
      ${DOMAINS.map((d) => `
        <li class="st-row-line">
          <input class="st-input st-input--domain" type="text" value="${HF.esc(d)}" aria-label="Домен">
          <button class="st-remove" type="button" aria-label="Удалить домен">${HF.icon('remove')}</button>
        </li>`).join('')}
    </ul>
    <button class="st-add-wide" type="button">Добавить домен, например yourcompany.com</button>
    <div class="st-foot">
      <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Сохранить</button>
    </div>
  </section>`;

const paneStructure = () => `
  <div class="st-h2-row">
    <h2 class="st-h2">Отделы, подразделения</h2>
    <div class="st-h2-actions">
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button"
              data-st-dialog="dictionary" aria-label="Настройки списка">${HF.icon('settings')}</button>
    </div>
  </div>
  <div class="st-search">${HF.icon('search-20')}<input type="text" placeholder="Поиск…"></div>
  <div class="st-bulk">
    <button class="st-bulk-add" type="button" aria-label="Добавить подразделение">${HF.icon('system-plus')}</button>
    <span>Объединить</span><span>Переместить</span><span>В архив</span>
    <span class="st-bulk-end">Скрыть архивные</span>
  </div>
  <ul class="st-tree" data-od-id="divisions">
    ${DIVISIONS.map(([name, kids]) => `
      ${dictRow(name, { caret: kids.length > 0 })}
      ${kids.length ? `<li><ul class="st-tree st-tree--nested">${kids.map((k) => dictRow(k)).join('')}</ul></li>` : ''}
    `).join('')}
    ${DIVISIONS_ARCHIVED.map((d) => dictRow(d, { archived: true })).join('')}
  </ul>`;

/* ── «Безопасность» ───────────────────────────────────────────
   Раздел с двумя лицами. На младшем тарифе настроек нет вовсе —
   вместо них рассказ о том, что появится после перехода; этот вид
   открывается адресом `&v=locked`. На «Максимальном» те же два
   блока настраиваются по-настоящему.

   Второй блок примечателен тем, что защищает базу не от чужих,
   а от своих: лимиты считаются на пользователя за сутки, и письмо
   о превышении уходит управляющему рекрутеру. */
const LIMITS = [
  ['Просмотр кандидатов', 'кандидатов'],
  ['Выгрузка кандидатов в Excel', 'кандидатов'],
  ['Скачивание файлов резюме', 'резюме'],
  ['Отправка резюме на почту', 'резюме'],
];

const securityPromo = () => upsell({
  mod: 'st-promo--shield',
  title: 'Усильте защиту базы резюме',
  lead: 'Настройте лимиты на работу с базой резюме и включите обязательную '
    + 'двухфакторную аутентификацию в организации.',
  items: [
    'Дополнительная проверка пользователей при входе',
    'Настройка суточных лимитов на скачивание, печать и отправку резюме '
      + 'на эл. почту для защиты от кражи сотрудником компании',
    'Уведомления на эл. почту при превышении лимитов',
  ],
  actions: ['Заявка на смену тарифа', 'Описание тарифов'],
});

const paneSecurity = () => (part('v') === 'locked' ? securityPromo() : `
  <h2 class="st-h2">Безопасность</h2>
  <h3 class="st-h2 st-h3--spaced">Обязательная двухфакторная аутентификация</h3>
  <p class="st-lead">Дополнительная защита аккаунтов пользователей от взлома.
    Всем рекрутерам и заказчикам в организации надо будет включить двухфакторную
    аутентификацию.</p>
  <select class="hf-select st-select st-select--half">
    <option>Выключено</option>
    <option>Включено</option>
  </select>
  <p class="st-security-save">
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button" disabled>Сохранить</button>
  </p>
  <h3 class="st-h2 st-h3--spaced">Лимиты на работу с базой резюме</h3>
  <p class="st-lead">Получайте уведомления на почту в случае превышения пользователем
    установленных суточных лимитов на работу с резюме.</p>
  <ul class="st-limits">
    ${LIMITS.map(([name]) => `
      <li class="st-limit">
        <button class="st-limit-btn" type="button" data-st-dialog="limit">
          ${HF.icon('settings')}<span>${HF.esc(name)}</span>
          <span class="st-limit-value">без лимита</span>
        </button>
      </li>`).join('')}
  </ul>
  <h3 class="st-h2 st-h3--spaced">Пользователи без лимитов</h3>
  <button class="st-add" type="button">${HF.icon('circle-plus')}Добавить рекрутера</button>`);

/* Уведомления лежат в разделе организации, но настраиваются на себя:
   «по моим вакансиям», «получайте на почту». Общекомпанейского
   переключателя тут нет — только личный. */
const NOTIFY_CARDS = [
  {
    title: 'Новые действия по моим вакансиям',
    note: 'Получайте уведомления о новых действиях с кандидатами на ваших вакансиях: '
      + 'смена этапов подбора, новые комментарии, назначенные интервью и др.',
    freq: ['Сразу', 'Раз в 15 минут', 'Раз в час', 'Раз в день'],
  },
  {
    title: 'Новые заявки на вакансии',
    note: 'Получайте новые заявки на почту, чтобы не пропустить ничего важного',
  },
  {
    title: 'Превышение времени нахождения кандидата на этапе',
    note: 'Получайте ежедневные напоминания о кандидатах, зависших на этапах воронки '
      + 'дольше целевого срока нахождения кандидата на этапе',
    link: ['Настроить время на этапе', '#s=funnel&t=time'],
  },
  {
    title: 'Дни рождения кандидатов 🎂',
    note: 'Получайте напоминания о днях рождения кандидатов на ваших вакансиях',
  },
];

const paneNotifications = () => `
  <h2 class="st-h2">Уведомления</h2>
  <p class="st-lead">Выберите, о каких событиях вы хотите получать письма на эл. почту</p>
  <div class="st-notify">
    ${NOTIFY_CARDS.map((c, i) => `
      <section class="st-notify-card">
        <div class="st-notify-head">
          <span class="st-toggle is-on" aria-hidden="true"></span>
          <h3 class="st-notify-title">${HF.esc(c.title)}</h3>
        </div>
        <p class="st-notify-note">${HF.esc(c.note)}</p>
        ${c.link ? `<p class="st-notify-link"><a href="${c.link[1]}">${HF.esc(c.link[0])}</a></p>` : ''}
        ${c.freq ? `
          <p class="st-notify-subtitle">Получение уведомлений</p>
          <div class="st-notify-freq">
            ${c.freq.map((f, j) => `
              <label class="st-check st-check--tight">
                <input type="radio" name="freq-${i}"${j ? '' : ' checked'}>${HF.esc(f)}
              </label>`).join('')}
          </div>` : ''}
      </section>`).join('')}
  </div>`;

const paneIntegrations = () => `
  <section class="st-integration" data-od-id="integration-kontur-talk">
    <div class="st-integration-head">
      <img class="st-integration-logo" src="assets/kontur-talk.svg"
           width="32" height="32" alt="Контур.Толк">
      <h3 class="st-h3">Видеовстречи Контур.Толк</h3>
    </div>
    <p class="st-lead">Хантфлоу автоматически создаст ссылку на видеовстречу в Контур.Толк.
      Ссылка на видеовстречу прикрепится ко встрече в календаре у всех участников
      и будет добавлена в приглашение кандидату по эл. почте, SMS или в Телеграм.</p>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Подключить</button>
  </section>`;

Object.assign(SECTIONS, {
  org: {
    title: 'Организация',
    /* Список подвкладок читается заново при каждой отрисовке, потому
       что одна из них меняется вместе с тарифом: в виде `&v=locked`
       «Безопасность» серая и с замком, в обычном — обычная. */
    get tabs() {
      const locked = part('v') === 'locked';
      return [
        ['company', 'О компании', 'org-info', '#e743d6', paneCompany],
        ['structure', 'Оргструктура', 'org-structure', '#a4bb13', paneStructure],
        ['security', 'Безопасность', 'org-afety', locked ? '#bfbfbf' : '#f0b10e',
          paneSecurity, { locked }],
        ['notifications', 'Уведомления', 'org-notifications', '#f55932', paneNotifications],
        ['integrations', 'Интеграции', 'settings-integrations', '#6c63eb', paneIntegrations],
      ];
    },
  },
});

Object.assign(DIALOGS, {
  /* Настройки справочника одинаковы у всех справочников: откуда
     берутся пункты, как сортируются и есть ли у пункта внешний ID */
  dictionary: {
    title: 'Справочник: Отделы, подразделения',
    body: `
      <div class="st-dict-form">
        <label class="hf-field">
          <span class="hf-label">Управление справочником</span>
          <select class="hf-select">
            <option>Вручную</option>
            <option>Через API</option>
          </select>
        </label>
        <label class="hf-field">
          <span class="hf-label">Сортировка</span>
          <select class="hf-select">
            <option>Без сортировки (новые добавляются в конец)</option>
            <option>По алфавиту</option>
          </select>
        </label>
        <label class="st-check">
          <input type="checkbox">
          <span>Для каждого пункта указывать ID из вашей внутренней системы
            <span class="st-hint" aria-hidden="true">?</span></span>
        </label>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },

  /* Редактор суточного лимита. Лимит двухступенчатый: сначала «есть
     он или нет», и только потом число — поле появляется по выбору
     «Есть». Единица измерения меняется от строки к строке: у первых
     двух лимитов это кандидаты, у вторых двух — резюме. */
  limit: {
    title: 'Просмотр кандидатов',
    body: `
      <div class="st-fields">
        <label class="hf-field">
          <span class="hf-label">Лимит</span>
          <select class="hf-select">
            <option>Есть</option>
            <option>Без лимита</option>
          </select>
        </label>
        <div class="st-limit-count">
          <span class="hf-label">Не более</span>
          <input class="hf-input" type="number" value="50">
          <span class="st-limit-unit">кандидатов</span>
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },
});
