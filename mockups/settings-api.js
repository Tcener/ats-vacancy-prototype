/* Настройки → API и вебхуки: токены доступа и подписки на события.

   Второй раздел настроек без подвкладок (первый — «Сбор откликов»):
   меню слева нет, одна страница во всю ширину острова. Поэтому в
   SECTIONS он описан через `pane`, а не через `tabs`.

   Раздел устроен предельно скупо, и это само по себе находка:

   — Токен состоит из одного имени. При создании спрашивают только
     название, в списке видно только название. Ни срока, ни прав,
     ни владельца, ни даты последнего обращения. Отозвать токен
     из интерфейса нельзя вовсе: у строки нет ни действий по наведению,
     ни карточки по клику. Серая строка — единственное состояние,
     которое список умеет показать.

   — Но сам ключ администратору не показывают вообще. После
     «Сгенерировать» он получает одноразовую ссылку на три рабочих
     дня и передаёт её разработчику, а тот забирает пару access
     и refresh на отдельной странице вне приложения — token-request.html.
     Забрал разработчик ключ или ссылка протухла, в списке не видно:
     строка выглядит одинаково в обоих случаях. Снято в песочнице
     3 сентября: в боевом аккаунте так не проверить, там это
     настоящий ключ ко всем данным компании.

   — Вебхук подписывается не на событие, а на семейство событий:
     «по кандидату», «по откликам». Семи галочек хватает на всё,
     что система умеет рассказать наружу, — и это и есть список того,
     о чём вообще можно узнать из ATS в реальном времени.

   Подключается после settings.js и берёт оттуда part.

   Данные вымышленные, структура — снятая. */

/* Токены: только имя и признак «неактивен». Больше в списке нет ничего */
const API_TOKENS = [
  ['Интеграция с 1С', {}],
  ['Портал сотрудника', {}],
  ['Выгрузка в BI', {}],
  ['Телеграм-бот рекрутера', {}],
  ['Импорт из старой ATS', { inactive: true }],
  ['Проверочный', {}],
];

/* Вебхуки: в списке видно только адрес. Всё остальное — в карточке */
const API_HOOKS = [
  'https://api.refni.ru/huntflow/webhook',
  'https://bi.refni.ru/hooks/huntflow/8f2c41d0-0e77-4a3b-9d16-2b5f1c7ae904',
  'https://bot.refni.ru/hf/events',
];

/* Семь семейств событий — весь словарь того, о чём Хантфлоу
   рассказывает наружу. Подписка идёт на семейство целиком:
   выбрать «кандидат перешёл на этап», но не «кандидат создан»,
   нельзя. Отмечены два — столько же, сколько в оригинале */
const API_EVENTS = [
  ['По кандидату', true],
  ['По вакансии', false],
  ['По откликам', true],
  ['По офферам', false],
  ['По заявкам', false],
  ['По оценке найма', false],
  ['По анкетам кандидатов', false],
];

/* Заголовок списка: название слева, кнопка добавления справа,
   тонкая линия под ними. Одинаково устроен у токенов и вебхуков */
const apiListHead = (title, action, dialog) => `
  <div class="st-api-head">
    <h3 class="st-api-h3">${HF.esc(title)}</h3>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button"
            data-st-dialog="${dialog}">${HF.icon('plus', 12)}${HF.esc(action)}</button>
  </div>`;

const paneApi = () => `
  <section class="st-api-promo" data-od-id="api-promo">
    <h2 class="st-api-promo-title">Хантфлоу API &amp; Webhooks</h2>
    <p class="st-api-promo-lead">Интеграция Хантфлоу с корпоративными ресурсами
      силами ваших разработчиков</p>
    <a class="st-api-promo-link" href="#">Документация по API Хантфлоу&nbsp;→</a>
  </section>

  <section class="st-api-block" data-od-id="api-tokens">
    ${apiListHead('Токены', 'Добавить токен', 'api-token')}
    <ul class="st-api-list">
      ${API_TOKENS.map(([name, { inactive = false }]) => `
        <li class="st-api-token${inactive ? ' is-inactive' : ''}">
          ${HF.icon('api-token', 27)}<span>${HF.esc(name)}</span>
        </li>`).join('')}
    </ul>
  </section>

  <section class="st-api-block" data-od-id="api-hooks">
    ${apiListHead('Вебхуки', 'Добавить вебхук', 'api-hook')}
    <ul class="st-api-list st-api-list--hooks">
      ${API_HOOKS.map((url) => `
        <li>
          <button class="st-api-hook" type="button" data-st-dialog="api-hook">
            ${HF.icon('circle-hook', 30)}<span>${HF.esc(url)}</span>
          </button>
        </li>`).join('')}
    </ul>
  </section>`;

Object.assign(SECTIONS, {
  api: { title: 'API и вебхуки', pane: paneApi },
});

Object.assign(DIALOGS, {
  /* Новый токен: одно поле и кнопка. Значение показывают один раз
     после генерации — в списке его уже не увидеть */
  'api-token': {
    title: 'Новый токен API',
    body: `
      <div class="st-fields st-fields--flat">
        <label class="hf-field"><span class="hf-label">Название токена</span>
          <input class="hf-input" type="text" placeholder="Например: Интеграция с 1C"></label>
      </div>`,
    foot: `
      <a class="hf-btn hf-btn--primary hf-btn--l" href="#s=api&d=api-token-link">Сгенерировать</a>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },

  /* Что показывают после «Сгенерировать» — и это не ключ.
     Администратору выдают ссылку на три рабочих дня, которую он
     передаёт разработчику; сам секрет он не увидит ни здесь,
     ни потом. Продолжение — на token-request.html, странице
     вне приложения, где разработчик забирает пару access/refresh */
  'api-token-link': {
    title: 'Новый токен сгенерирован',
    body: `
      <p class="st-api-token-name">${HF.icon('api-token', 27)}<span>Токен API: Интеграция с 1С</span></p>
      <p class="st-api-token-hint">Скопируйте ссылку на получение токена и передайте
        разработчику. Ссылка действует 3 рабочих дня</p>
      <div class="st-api-token-row">
        <input class="hf-input st-api-token-link" type="text" readonly
               value="https://refni.huntflow.ru/token_request/8f2c41d00e774a3b9d162b5f1c7ae90463d1">
        <a class="hf-btn hf-btn--secondary" href="token-request.html">Открыть</a>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button">Копировать</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>`,
  },

  /* Карточка вебхука. Слева адрес, ключ, события и выключатель;
     справа — кому жаловаться, если вебхук перестал отвечать.
     По умолчанию письма о проблемах идут всем управляющим
     рекрутерам, дополнительных адресатов добавляют почтой */
  'api-hook': {
    title: 'Просмотр вебхука',
    body: `
      <div class="st-api-cols">
        <div>
          <label class="hf-field"><span class="hf-label">URL</span>
            <input class="hf-input" type="text" value="https://api.refni.ru/huntflow/webhook"></label>
          <label class="hf-field"><span class="hf-label">Секретный ключ</span>
            <input class="hf-input" type="text" value="••••••••••••••••"></label>
          <div class="hf-field st-api-events-field">
            <span class="hf-label">События</span>
            <button class="hf-select st-api-events-btn" type="button" data-st-events>
              ${API_EVENTS.filter(([, on]) => on).length} события
            </button>
            <ul class="st-api-events" data-st-events-list hidden>
              ${API_EVENTS.map(([name, on]) => `
                <li class="st-api-event${on ? ' is-on' : ''}">
                  <span class="st-api-event-mark">${on ? HF.icon('checked-item-mark-new', 16) : ''}</span>
                  <span>${HF.esc(name)}</span>
                </li>`).join('')}
            </ul>
          </div>
          <label class="st-api-active">
            <span class="st-toggle is-on" aria-hidden="true"></span>
            <span>Вебхук активен</span>
          </label>
        </div>
        <div class="st-api-notify">
          <span class="hf-label">Уведомления о&nbsp;проблемах с&nbsp;вебхуком получают</span>
          <p class="st-api-owners">${HF.icon('crown', 20)}Все управ. рекрутеры</p>
          <input class="hf-input" type="search" placeholder="Эл. почта">
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>
      <button class="st-danger" type="button" data-hf-close>Удалить</button>`,
  },
});

/* Список событий раскрывается по клику. Обзорный холст показывает
   состояния кадрами, а не кликами, поэтому у раскрытого списка есть
   и свой адрес: #s=api&d=api-hook&events=1 */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-st-events]')) {
    document.querySelector('[data-st-events-list]')?.toggleAttribute('hidden');
  }
});

const syncEvents = () => {
  const list = document.querySelector('[data-st-events-list]');
  if (list) list.toggleAttribute('hidden', part('events') !== '1');
};
addEventListener('hashchange', syncEvents);
addEventListener('DOMContentLoaded', syncEvents);
