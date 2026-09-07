/* Настройки → Бизнес-процесс: формы заявки, доп. поля, справочники,
   источники, типы интервью, метки. Подключается после settings.js
   и берёт оттуда stageRow. */

/* ── Бизнес-процесс ──────────────────────────────────────────── */

/* Поле формы: системное (замок, не трогается) или добавленное
   (перетаскивается за ручку и настраивается шестерёнкой). */
const REQUEST_FORMS = [
  {
    no: 1,
    name: 'Заявка на подбор',
    who: 'Все пользователи и через API',
    approval: 'Выключено',
    fields: [
      ['Должность', 'lock', 'req'],
      ['Отдел, подразделение', 'lock', 'req'],
      ['Зарплата', 'lock'],
      ['Обязанности кандидата', 'own', 'req'],
      ['Требования к кандидату', 'own', 'req'],
      ['Комментарии', 'own'],
      ['Сколько человек нужно нанять', 'lock'],
    ],
  },
  {
    no: 2,
    name: 'Заявка с согласованием',
    who: 'Все пользователи и через API',
    approval: 'Включено и обязательно',
    source: 'Заказчик указывает согласующих вручную',
    fields: [
      ['Должность', 'lock', 'req'],
      ['Отдел, подразделение', 'lock', 'req'],
      ['Зарплата', 'lock', 'req'],
      ['Бюджет на подбор', 'own'],
      ['Сколько человек нужно нанять', 'lock', 'req'],
    ],
  },
];

const VACANCY_FIELDS = [
  ['Должность', 'lock', 'req'],
  ['Отдел, подразделение', 'lock', 'req'],
  ['Зарплата', 'lock'],
  ['Обязанности', 'lock'],
  ['Требования', 'lock'],
  ['Условия работы', 'lock'],
  ['Сколько человек нужно нанять', 'lock', 'req'],
];

const APPLICANT_FIELDS = [
  ['Локация', 'own', 'api'],
  ['Дата выхода на работу', 'own'],
  ['Готовность к переезду', 'own', 'api'],
  ['Откуда узнал о нас', 'own', 'req'],
];

const DICTIONARIES = ['Грейд рекрутера', 'Способ получения согласия на обработку'];
const SOURCES = ['hh.ru', 'Хабр Карьера', 'Рекомендация', 'Карьерный сайт'];
const INTERVIEW_TYPES = ['Интервью с HR', 'Техническое интервью', 'Интервью с заказчиком', 'Финальное интервью'];
const TAGS = [
  ['Кадровый резерв', '#7b5cf0'],
  ['Готов к переезду', '#1ec997'],
  ['Знает домен', '#1f7ae0'],
  ['Резерв на 2027', '#f5a623'],
  ['Не беспокоить', '#050505'],
];

/* Строка поля формы: её нельзя переименовать прямо здесь, только
   открыть настройку — поэтому это не input, а строка с кнопкой. */
const fieldRow = ([name, kind, badge]) => `
  <li class="st-field">
    <span class="st-field-grip">${kind === 'own' ? '&#9776;' : ''}</span>
    <button class="st-field-btn" type="button">
      ${HF.icon(kind === 'own' ? 'settings' : 'lock-outline')}<span>${HF.esc(name)}</span>
    </button>
    ${badge === 'req' ? '<span class="st-label st-label--req">Обязательное поле</span>' : ''}
    ${badge === 'api' ? '<span class="st-label st-label--api">Заполняется через API</span>' : ''}
  </li>`;

/* Список, который правится целиком: строка-поле, ручка,
   у системных — замок вместо крестика, внизу пара «Сохранить/Вернуть» */
const editableList = (items, addLabel, note) => `
  <ul class="st-rows">
    ${items.map((name, i) => stageRow(name, { locked: i < 2 })).join('')}
  </ul>
  <button class="st-add-wide" type="button">${HF.esc(addLabel)}</button>
  <div class="st-foot">
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button" disabled>Сохранить</button>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button" disabled>Вернуть</button>
  </div>
  ${note ? `<p class="st-hintline">${HF.esc(note)}</p>` : ''}`;

const paneRequests = () => `
  <div class="st-h2-row">
    <h2 class="st-h2">Заявки на подбор</h2>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">${HF.icon('circle-plus')}Добавить форму</button>
  </div>
  <p class="st-lead">Добавляйте необходимые поля в форму заявки, например «Кто будет
    проводить интервью», «Критерии оценки» или любые другие. И при необходимости
    настраивайте согласование заявки под ваши бизнес-процессы.</p>
  ${REQUEST_FORMS.map((f) => `
    <section class="st-form" data-od-id="request-form-${f.no}">
      <p class="st-form-no">Форма заявки №${f.no}</p>
      <p class="st-form-name">${HF.esc(f.name)}${HF.icon('link-20')}</p>
      <dl class="st-form-meta">
        <dt>Отправка заявки:</dt><dd>${HF.esc(f.who)}</dd>
        <dt>Согласование:</dt><dd>${HF.esc(f.approval)}</dd>
        ${f.source ? `<dt>Источник согласующих:</dt><dd>${HF.esc(f.source)}</dd>` : ''}
      </dl>
      <div class="st-form-actions">
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Настроить поля заявки</button>
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button"
                data-st-dialog="approval">Настроить заявку и согласование</button>
        <button class="st-remove" type="button" aria-label="Удалить форму">${HF.icon('trash-20')}</button>
      </div>
      <ul class="st-fields-list">${f.fields.map(fieldRow).join('')}</ul>
    </section>`).join('')}`;

const fieldsPane = (title, lead, fields) => `
  <h2 class="st-h2">${HF.esc(title)}</h2>
  <p class="st-lead">${HF.esc(lead)}</p>
  <button class="hf-btn hf-btn--secondary hf-btn--s st-configure" type="button">Настроить поля формы</button>
  <ul class="st-fields-list">${fields.map(fieldRow).join('')}</ul>`;

const paneVacancyFields = () => fieldsPane('Доп. поля вакансии',
  'Добавляйте необходимые поля на форму вакансии, например «Грейд», «Категория вакансии» '
  + 'или любые другие для полноты информации о вакансии, детальной аналитики и удобного поиска',
  VACANCY_FIELDS);

const paneApplicantFields = () => fieldsPane('Доп. поля кандидата',
  'Добавьте доп. поля в карточку кандидата для полноты информации и детальной аналитики. '
  + 'Форма доп. инфо заполняется по кнопке вверху карточки кандидата.',
  APPLICANT_FIELDS);

const paneDictionaries = () => `
  <h2 class="st-h2">Дополнительные справочники</h2>
  <ul class="st-sets">
    ${DICTIONARIES.map((d) => `
      <li class="st-set">
        <span class="st-set-mark" aria-hidden="true">&#9776;</span>
        <a href="#s=business&t=dictionaries">${HF.esc(d)}</a>
      </li>`).join('')}
  </ul>
  <button class="st-add" type="button">${HF.icon('circle-plus')}Добавить</button>`;

const paneSources = () => `
  <h2 class="st-h2">Источники резюме</h2>
  ${editableList(SOURCES, 'Добавить источник',
    'Источники резюме с замком нельзя удалить, потому что сохранение с них '
    + 'осуществляется системно с помощью Волшебной кнопки')}`;

const paneInterviewTypes = () => `
  <h2 class="st-h2">Типы интервью</h2>
  <p class="st-lead">Используются в отчёте по интервью</p>
  ${editableList(INTERVIEW_TYPES, 'Добавить вид интервью',
    'Типы интервью с замком не могут быть удалены, потому что они используются '
    + 'в Хантфлоу по умолчанию')}`;

/* У метки, в отличие от остальных списков, есть цвет —
   квадратный образец справа от поля */
const paneTags = () => `
  <h2 class="st-h2">Метки</h2>
  <p class="st-lead">Помогают отмечать кандидатов по навыкам, компетенциям и другим
    параметрам и быстро находить их в поиске, например для кадрового резерва</p>
  <div class="st-search st-search--plain">${HF.icon('search-20')}<input type="text" placeholder="Поиск…"></div>
  <ul class="st-rows st-rows--tags">
    ${TAGS.map(([name, color]) => `
      <li class="st-row">
        <div class="st-row-line">
          <input class="st-input st-input--tag" type="text" value="${HF.esc(name)}">
          <span class="st-swatch" style="background:${color}"></span>
          <button class="st-remove" type="button" aria-label="Удалить метку">${HF.icon('remove')}</button>
        </div>
      </li>`).join('')}
  </ul>
  <input class="st-input st-input--add" type="text" placeholder="Добавить метку">
  <div class="st-foot">
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button" disabled>Сохранить</button>
    <button class="hf-btn hf-btn--secondary hf-btn--s" type="button" disabled>Вернуть</button>
  </div>`;

Object.assign(SECTIONS, {
  business: {
    title: 'Бизнес-процесс',
    tabs: [
      ['requests', 'Заявки на подбор', 'business-request', '#28bad3', paneRequests],
      ['vacancy-fields', 'Доп. поля вакансии', 'business-request', '#28bad3', paneVacancyFields],
      ['applicant-fields', 'Доп. поля кандидата', 'business-applicant', '#00b84e', paneApplicantFields],
      ['dictionaries', 'Доп. справочники', 'business-book', '#f0b10e', paneDictionaries],
      ['sources', 'Источники резюме', 'business-folder', '#4b83ef', paneSources],
      ['interviews', 'Типы интервью', 'interview-types', '#050505', paneInterviewTypes],
      ['tags', 'Метки', 'business-tags', '#f55932', paneTags],
    ],
  },
});

Object.assign(DIALOGS, {
  /* Согласование у Хантфлоу плоское: не маршрут со ступенями,
     а список почт, который заполняет заказчик в самой заявке */
  approval: {
    title: 'Настройки заявки: Заявка с согласованием',
    body: `
      <div class="st-block">
        <p class="st-block-title">Кто может подавать заявку</p>
        <p class="st-block-note">Укажите, кто может подавать заявку с помощью этой формы</p>
        <select class="hf-select st-block-select">
          <option>Все пользователи и через API</option>
          <option>Только заказчики</option>
          <option>Только рекрутеры</option>
        </select>
      </div>
      <div class="st-block st-block--split">
        <p class="st-block-title">Согласование заявки</p>
        <div class="st-toggle-card">
          <span class="st-toggle is-on" aria-hidden="true"></span>
          <span>
            <b>Согласование включено</b>
            <span>В форме заявки можно будет указать электронную почту
              одного или нескольких согласующих</span>
          </span>
        </div>
        <p class="st-block-title">Обязательность</p>
        <label class="st-check"><input type="checkbox" checked>Требовать указать
          хотя бы одного согласующего</label>
        <p class="st-block-title">Источник согласующих</p>
        <select class="hf-select st-block-select">
          <option>Заказчик вручную указывает эл. почту согласующих</option>
          <option disabled>Передача из внешнего сервиса через API</option>
        </select>
        <p class="st-block-title">Подсказка для добавления согласующих
          <span class="st-hint" aria-hidden="true">?</span></p>
        <div class="hf-richtext">
          <div class="hf-richtext-bar">${['bold', 'italic', 'bullet-list', 'numbered-list', 'link']
    .map((i) => `<button class="hf-richtext-btn" type="button" aria-label="${i}">${HF.icon(i)}</button>`).join('')}</div>
          <div class="hf-richtext-area" contenteditable="true">Укажите руководителя,
            который подтвердит бюджет</div>
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>
      <button class="st-danger" type="button" data-hf-close>Архивировать заявку</button>`,
  },
});
