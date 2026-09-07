/* Настройки → Шаблоны, оценка и анкеты: письма, мессенджеры, SMS,
   анкеты, формы обратной связи, оценка рекрутмента. Подключается
   после settings.js.

   Половина подвкладок здесь — не настройки, а реклама: «Анкеты» и
   «Оценка рекрутмента» не входят в тариф, SMS требует договора
   с оператором. Пункты меню у первых двух серые и с красным замком
   прямо в иконке. */

const MAIL_TEMPLATES = ['Отказ', 'Подтверждение собеседования', 'Приглашение на вакансию', 'Тестовое задание'];
const MAIL_TEMPLATES_OWN = ['Мой отказ после интервью', 'Напоминание о встрече'];
const IM_TEMPLATES = ['Первое касание в Телеграме'];

/* Переменные подстановки — общий словарь для писем и мессенджеров.
   Видно, из чего у Хантфлоу состоит письмо: кандидат, вакансия,
   встреча, организация и отправитель. Раскрывается по кнопке
   «Вставить переменную» над темой и над содержанием. */
const MAIL_VARS = [
  'Имя кандидата', 'Отчество кандидата', 'Имя и отчество кандидата', 'Фамилия кандидата',
  'Название вакансии', 'Обязанности', 'Требования', 'Условия работы',
  'Дата и время интервью', 'Время другого события', 'Ссылка на видеовстречу',
  'Ссылка на анкету кандидата', 'Название нашей организации',
  'Мое имя', 'Моя должность', 'Мой адрес электронной почты',
];

const FEEDBACK_FORMS = ['Отзыв заказчика после интервью', 'Обратная связь кандидату'];

/* Типы вопроса в конструкторе формы. Их ровно шесть, и это весь
   инструментарий: ни файла, ни даты, ни шкалы с подписями. */
const QUESTION_TYPES = [
  'Строка текста', 'Многострочный текст', 'Выпадающий список',
  'Выбор одного варианта', 'Выбор нескольких вариантов', 'Числовая оценка',
];

const varsMenu = (scope) => `
  <span class="st-vars" data-st-vars-menu="${scope}" hidden>
    ${MAIL_VARS.map((v) => `<button class="st-vars-item" type="button">${HF.esc(v)}</button>`).join('')}
  </span>`;

/* Строка списка: круглая иконка, название и кнопка «сделать копию»
   справа. Так выглядят и шаблоны, и формы обратной связи. */
const circleRow = (name, ic, { dialog = null, copy = true } = {}) => `
  <li class="st-circle-row">
    <button class="st-circle-btn" type="button"${dialog ? ` data-st-dialog="${dialog}"` : ''}>
      <span class="st-circle-ic">${HF.icon(ic, 30)}</span>
      <span class="st-circle-name">${HF.esc(name)}</span>
    </button>
    ${copy ? `<button class="st-circle-copy" type="button" aria-label="Сделать копию">${HF.icon('make-copy')}</button>` : ''}
  </li>`;

/* ── «Шаблоны писем» ─────────────────────────────────────────── */
const paneMailTemplates = () => `
  <h2 class="st-h2">Шаблоны писем</h2>
  <h3 class="st-h3 st-h3--spaced">Подпись отправителя</h3>
  <ul class="st-circle-list">
    ${circleRow('Подпись', 'circle-sign', { dialog: 'signature', copy: false })}
  </ul>
  <div class="st-h2-row st-h2-row--spaced">
    <h3 class="st-h3">Шаблоны писем кандидатам</h3>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button" data-st-dialog="mail-template">
      ${HF.icon('circle-plus')}Добавить шаблон
    </button>
  </div>
  <div class="st-search st-search--plain">${HF.icon('search-20')}<input type="text" placeholder="Поиск"></div>
  <div class="st-subtabs st-subtabs--flat">
    <button class="st-subtab is-active" type="button">Общие шаблоны <span>${MAIL_TEMPLATES.length}</span></button>
    <button class="st-subtab" type="button">Личные шаблоны <span>${MAIL_TEMPLATES_OWN.length}</span></button>
  </div>
  <ul class="st-circle-list">
    ${MAIL_TEMPLATES.map((t) => circleRow(t, 'circle-mail-outline', { dialog: 'mail-template' })).join('')}
  </ul>`;

/* ── «Мессенджеры» ───────────────────────────────────────────── */
const paneImTemplates = () => `
  <h2 class="st-h2">Шаблоны мессенджеров</h2>
  <p class="st-lead">Настройте шаблоны для быстрой отправки сообщений кандидатам
    в Telegram и WhatsApp</p>
  <div class="st-h2-row st-h2-row--spaced">
    <h3 class="st-h3">Шаблоны</h3>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">
      ${HF.icon('circle-plus')}Добавить шаблон
    </button>
  </div>
  <div class="st-subtabs st-subtabs--flat">
    <button class="st-subtab is-active" type="button">Общие шаблоны <span>${IM_TEMPLATES.length}</span></button>
    <button class="st-subtab" type="button">Личные шаблоны <span>0</span></button>
  </div>
  <ul class="st-circle-list">
    ${IM_TEMPLATES.map((t) => circleRow(t, 'circle-mail-outline')).join('')}
  </ul>`;

/* ── «SMS», «Анкеты» и «Оценка рекрутмента» ────────────────────
   Три плашки на общем шаблоне. SMS без бейджа: дело не в тарифе,
   а в договоре с оператором; у анкет картинка сбоку, у оценки —
   ряд звёзд над заголовком. */
const paneSms = () => upsell({
  mod: 'st-promo--plain',
  badge: false,
  title: 'Отправляйте SMS кандидатам',
  lead: 'Подключите интеграцию с SMS-оператором',
  items: [
    'Автоматические напоминания об интервью помогают повысить доходимость на 40%',
    'SMS кандидату одним кликом с просьбой перезвонить или по любому вашему шаблону',
    'Отправка SMS от имени вашего бренда в соответствии со 152-ФЗ',
    'Интеграция с SMS-операторами напрямую, никаких комиссий Хантфлоу',
  ],
  logos: [
    { src: 'quick-telecom.jpg', w: 110, h: 37, alt: 'Quick Telecom' },
    { src: 'rapporto.svg', w: 81, h: 20, alt: 'rapporto' },
  ],
  actions: ['Узнать как подключить'],
});

const surveysPromo = () => upsell({
  title: 'Автоматизируйте заполнение анкет кандидатами',
  lead: 'Создавайте анкеты и опросы для кандидатов прямо из Хантфлоу: для тестирования '
    + 'навыков, сбора дополнительной информации или фидбека от кандидатов на любом этапе найма.',
  items: [
    'Создавайте анкеты и отправляйте кандидатам ссылки прямо из Хантфлоу',
    'Заполненная анкета сохранится в карточке кандидата в Хантфлоу',
    'Управляющий рекрутер, рекрутер и заказчик получат уведомление о каждой заполненной анкете',
  ],
  art: { src: 'survey-form.svg', w: 103, h: 128 },
  actions: ['Заявка на смену тарифа', 'Описание тарифов'],
});

/* Анкета кандидата и форма обратной связи — один и тот же
   конструктор с разными адресами; отличается анкета двумя
   названиями вместо одного: техническим для рекрутера и видимым
   кандидату заголовком. */
const SURVEYS = ['Тестовое задание: Go', 'Анкета кандидата перед интервью'];

const paneSurveys = () => (part('v') === 'locked' ? surveysPromo() : `
  <h2 class="st-h2">Анкеты для кандидатов</h2>
  <p class="st-lead">Отправляйте кандидатам анкеты или тестовые задания на любом
    этапе подбора</p>
  <ul class="st-circle-list st-circle-list--spaced">
    ${SURVEYS.map((n) => circleRow(n, 'circle-survey-type-q', { dialog: 'survey-q' })).join('')}
  </ul>
  <button class="st-add" type="button" data-st-dialog="survey-q">
    ${HF.icon('circle-plus')}Новая анкета
  </button>`);

const ratingPromo = () => upsell({
  stars: true,
  title: 'Автоматизируйте сбор обратной связи от заказчиков',
  lead: 'Каждый раз, когда рекрутер переведет кандидата на этап Оффер принят, автору '
    + 'заявки на подбор будет предложено оценить работу отдела подбора.',
  items: [
    'Автоматизируйте сбор обратной связи о рекрутменте',
    'Узнавайте о проблемах до того, как они станут острыми',
    'Непрерывно улучшайте взаимодействие с заказчиками',
  ],
  actions: ['Заявка на смену тарифа', 'Узнать подробнее'],
});

/* Оценка рекрутмента — единственная настройка с рубильником на всю
   организацию: пока он выключен, письмо заказчику не уходит, но
   форма и вводный текст настраиваются заранее. Состояние показано
   не тумблером, а широкой цветной плашкой во всю ширину острова. */
const paneRating = () => {
  if (part('v') === 'locked') return ratingPromo();
  const on = part('v') === 'on';
  return `
  <p class="st-banner${on ? ' st-banner--on' : ''}">Оценка рекрутмента ${on ? 'включена' : 'выключена'}</p>
  <p class="st-lead st-lead--center">Запрашивайте у заказчиков вакансий обратную связь
    после наема кандидата.</p>
  <p class="st-banner-acts">
    <a class="hf-btn hf-btn--primary hf-btn--s" href="#s=templates&t=rating${on ? '' : '&v=on'}">
      ${on ? 'Выключить' : 'Включить оценку рекрутмента'}</a>
    <a class="hf-btn hf-btn--secondary hf-btn--s" href="#">Узнать подробнее</a>
  </p>
  <h3 class="st-h3 st-h3--spaced">Вводный текст в письме для заказчика</h3>
  <p class="st-lead">Отображается в письме с просьбой оценить работу рекрутера.
    Персональный текст повышает долю обратной связи от заказчика</p>
  <div class="st-mail-field st-mail-field--single">
    <div class="hf-richtext">
      <div class="hf-richtext-bar">
        ${['bold', 'italic', 'bullet-list', 'numbered-list', 'link']
    .map((i) => `<button class="hf-richtext-btn" type="button" aria-label="${i}">${HF.icon(i)}</button>`).join('')}
      </div>
      <div class="hf-richtext-area" contenteditable="true"></div>
    </div>
  </div>
  <p class="st-security-save">
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button" disabled>Сохранить</button>
  </p>
  <h3 class="st-h3 st-h3--spaced">Форма запроса оценки</h3>
  <button class="hf-btn hf-btn--secondary hf-btn--s st-configure" type="button"
          data-st-dialog="rating-form">Настроить поля формы</button>
  <ul class="st-fields-list">
    <li class="st-field">
      <span class="st-field-grip"></span>
      <button class="st-field-btn" type="button" data-st-dialog="rating-form">
        ${HF.icon('rating-16')}<span>Общее впечатление о подборе</span>
      </button>
      <span class="st-label st-label--req">Обязательное поле</span>
    </li>
    <li class="st-field">
      <span class="st-field-grip">&#9776;</span>
      <button class="st-field-btn" type="button" data-st-dialog="rating-form">
        ${HF.icon('settings')}<span>Комментарий</span>
      </button>
      <span class="st-label st-label--req">Обязательное поле</span>
    </li>
  </ul>`;
};

/* ── «Формы обратной связи» ──────────────────────────────────── */
const paneFeedbackForms = () => `
  <h2 class="st-h2">Формы обратной связи</h2>
  <ul class="st-circle-list st-circle-list--spaced">
    ${FEEDBACK_FORMS.map((f) => circleRow(f, 'circle-survey-type-a', { dialog: 'survey' })).join('')}
    <li class="st-circle-row">
      <button class="st-circle-btn st-circle-btn--add" type="button" data-st-dialog="survey">
        <span class="st-circle-ic">${HF.icon('circle-plus', 30)}</span>
        <span class="st-circle-name">Новая форма</span>
      </button>
    </li>
  </ul>`;

Object.assign(SECTIONS, {
  templates: {
    title: 'Шаблоны, оценка и анкеты',
    /* Две подвкладки из шести продаются тарифом. В виде `&v=locked`
       они серые и с замком — так раздел выглядит на младшем тарифе;
       в обычном виде это настоящие настройки. */
    get tabs() {
      const locked = part('v') === 'locked';
      return [
        ['mail', 'Шаблоны писем', 'template-letter', '#f55932', paneMailTemplates],
        ['im', 'Мессенджеры', 'template-messengers', '#6c63eb', paneImTemplates],
        ['sms', 'SMS', 'template-sms', '#e743d6', paneSms],
        ['surveys', 'Анкеты и тестовые задания', 'template-test', locked ? '#bfbfbf' : '#4b83ef',
          paneSurveys, { locked }],
        ['feedback', 'Формы обратной связи', 'template-feedback', '#00b84e', paneFeedbackForms],
        ['rating', 'Оценка рекрутмента', 'template-rating', locked ? '#bfbfbf' : '#f0b10e',
          paneRating, { locked }],
      ];
    },
  },
});

Object.assign(DIALOGS, {
  /* Редактор письма. Слева тема и содержание с настоящим набором
     кнопок панели, справа — скрытая копия, видимость и автор.
     Видимость шаблона всего двузначная: личный или общий. */
  'mail-template': {
    title: 'Общий шаблон: Отказ',
    wide: true,
    body: `
      <div class="st-mail">
        <div class="st-mail-main">
          <div class="st-mail-field">
            <div class="st-mail-label">
              <span class="hf-label">Тема письма</span>
              <span class="st-vars-wrap">
                <button class="st-linkbtn" type="button" data-st-vars="subject">Вставить переменную</button>
                ${varsMenu('subject')}
              </span>
            </div>
            <input class="hf-input" type="text" value="К сожалению, не можем пригласить вас на вакансию">
          </div>
          <div class="st-mail-field">
            <div class="st-mail-label">
              <span class="hf-label">Содержание</span>
              <span class="st-vars-wrap">
                <button class="st-linkbtn" type="button" data-st-vars="body">Вставить переменную</button>
                ${varsMenu('body')}
              </span>
            </div>
            <div class="hf-richtext">
              <div class="hf-richtext-bar">
                ${['bold', 'italic', 'font-size', 'text-color', 'bullet-list', 'numbered-list',
      'image', 'link', 'quote', 'hr', 'table']
      .map((i) => `<button class="hf-richtext-btn" type="button" aria-label="${i}">${HF.icon(i)}</button>`).join('')}
              </div>
              <div class="hf-richtext-area" contenteditable="true">
                <p>Здравствуйте, <span class="st-var">{{Applicant.FirstName}}</span>!</p>
                <p>К сожалению, сейчас мы не можем пригласить вас на вакансию
                  <span class="st-var">{{Vacancy.Position}}</span> в нашей компании
                  <span class="st-var">{{Organization.Name}}</span>. Будем рады пообщаться
                  в будущем по другим вакансиям.</p>
                <p><span class="st-var">{{User.Sign}}</span></p>
              </div>
              <div class="hf-richtext-foot">
                <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">${HF.icon('clip')}Файл</button>
              </div>
            </div>
          </div>
          <div class="st-mail-field">
            <span class="hf-label">Название шаблона</span>
            <input class="hf-input" type="text" value="Отказ">
          </div>
        </div>
        <aside class="st-mail-side">
          <div class="st-mail-side-block">
            <span class="hf-label">Скрытая копия</span>
            <input class="hf-input" type="email" placeholder="Эл. почта">
          </div>
          <div class="st-mail-side-block">
            <span class="hf-label">Видимость шаблона</span>
            <label class="st-check st-check--tight"><input type="radio" name="tpl-visibility">Личный</label>
            <label class="st-check st-check--tight"><input type="radio" name="tpl-visibility" checked>Общий</label>
          </div>
          <div class="st-mail-side-block">
            <span class="st-mail-side-caption">Автор шаблона</span>
            <span class="st-mail-author">${HF.icon('userpic', 24)}Юджин</span>
          </div>
        </aside>
      </div>
      <label class="st-check st-check--tight st-mail-followup">
        <input type="checkbox">Если не ответит, то автоматически отправить ещё одно письмо
      </label>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>
      <button class="st-danger" type="button" data-hf-close>Удалить</button>`,
  },

  /* Подпись — то же письмо, но без темы, адресатов и видимости */
  signature: {
    title: 'Подпись отправителя',
    body: `
      <div class="st-mail-field st-mail-field--single">
        <span class="hf-label">Подпись</span>
        <div class="hf-richtext">
          <div class="hf-richtext-bar">
            ${['bold', 'italic', 'font-size', 'text-color', 'link', 'image']
    .map((i) => `<button class="hf-richtext-btn" type="button" aria-label="${i}">${HF.icon(i)}</button>`).join('')}
          </div>
          <div class="hf-richtext-area" contenteditable="true">
            <p>С уважением, Юджин</p>
            <p>Рефни · es@refni.ru</p>
          </div>
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },

  /* Конструктор формы обратной связи. Один вопрос — одна карточка;
     тип вопроса выбирается при добавлении и потом не меняется. */
  survey: {
    head: `
      <span class="st-dialog-name">
        <b>Отзыв заказчика после интервью</b>
        <span class="st-dialog-sub">Создано 4 июня 2026, 11:31 &nbsp;·&nbsp; Юджин</span>
      </span>`,
    body: `
      <div class="st-survey-head">
        <span class="hf-label">Название формы</span>
        <input class="hf-input" type="text" value="Отзыв заказчика после интервью">
      </div>
      <div class="st-survey-field">
        <div class="st-survey-field-head">
          <span class="st-survey-no">
            <b>Вопрос №1</b>
            <span class="st-survey-kind">Строка текста</span>
          </span>
          <span class="st-survey-acts">
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Дублировать поле</button>
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Удалить</button>
          </span>
        </div>
        <div class="st-survey-body">
          <div class="st-survey-main">
            <span class="hf-label">Формулировка вопроса</span>
            <input class="hf-input" type="text" value="Что понравилось и не понравилось в кандидате">
            <label class="st-check st-check--tight"><input type="checkbox">Подсказка рядом с полем</label>
            <p class="st-survey-params">Параметры</p>
            <span class="hf-label">Подсказка внутри поля до заполнения</span>
            <input class="hf-input" type="text" placeholder="Текст подсказки">
          </div>
          <aside class="st-survey-side">
            <label class="st-check st-check--tight"><input type="checkbox" checked>Обязательный вопрос</label>
            <label class="st-check st-check--tight"><input type="checkbox">Разделитель после вопроса</label>
          </aside>
        </div>
      </div>
      `,
    /* Кнопка добавления висит снаружи модалки у правого края,
       меню типов раскрыто — в макете оно всегда видно */
    extra: `
      <div class="st-survey-add">
        <button class="st-survey-add-btn" type="button" aria-label="Добавить вопрос">${HF.icon('plus')}</button>
        <div class="st-survey-menu">
          <p class="st-survey-menu-title">Добавить вопрос</p>
          ${QUESTION_TYPES.map((t) => `<button class="st-survey-type" type="button">${HF.esc(t)}</button>`).join('')}
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Предпросмотр</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>
      <button class="st-danger" type="button" data-hf-close>Архивировать форму</button>`,
  },

  /* Анкета кандидата: тот же конструктор, что у формы обратной
     связи, с двумя отличиями. Названий два — техническое для своих
     и заголовок, который увидит кандидат; и у вопроса появляются
     варианты ответа с перетаскиванием и файл-приложение — анкету
     заполняет посторонний человек, ему надо объяснить задачу. */
  'survey-q': {
    title: 'Новая анкета',
    body: `
      <div class="st-survey-head">
        <span class="hf-label">Техническое название анкеты</span>
        <input class="hf-input" type="text" value="Тестовое задание: Go">
        <p class="st-note">Не показывается кандидату</p>
        <span class="hf-label">Заголовок анкеты для кандидата</span>
        <input class="hf-input" type="text" value="Ответьте, пожалуйста, на вопросы">
      </div>
      <div class="st-survey-field">
        <div class="st-survey-field-head">
          <span class="st-survey-no">
            <b>Вопрос №1</b>
            <span class="st-survey-kind">Выбор одного варианта</span>
          </span>
          <span class="st-survey-acts">
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Дублировать поле</button>
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Удалить</button>
          </span>
        </div>
        <div class="st-survey-body">
          <div class="st-survey-main">
            <span class="hf-label">Формулировка вопроса</span>
            <input class="hf-input" type="text" value="Сколько лет вы работаете с Go?">
            <label class="st-check st-check--tight"><input type="checkbox">Подсказка рядом с полем</label>
            <p class="st-survey-params">Параметры</p>
            <span class="hf-label">Варианты ответов</span>
            <ul class="st-rows">
              ${['Меньше года', 'От года до трёх', 'Больше трёх лет'].map((o) => stageRow(o)).join('')}
            </ul>
            <button class="st-add" type="button">${HF.icon('circle-plus')}Добавить вариант ответа</button>
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Прикрепить файл к вопросу</button>
          </div>
          <aside class="st-survey-side">
            <label class="st-check st-check--tight"><input type="checkbox" checked>Обязательный вопрос</label>
            <label class="st-check st-check--tight"><input type="checkbox">Разделитель после вопроса</label>
          </aside>
        </div>
      </div>`,
    extra: `
      <div class="st-survey-add">
        <button class="st-survey-add-btn" type="button" aria-label="Добавить вопрос">${HF.icon('plus')}</button>
        <div class="st-survey-menu">
          <p class="st-survey-menu-title">Добавить вопрос</p>
          ${[...QUESTION_TYPES, 'Прикрепление файла']
    .map((t) => `<button class="st-survey-type" type="button">${HF.esc(t)}</button>`).join('')}
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Предпросмотр</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },

  /* Форма оценки рекрутмента: тот же конструктор, но форма одна
     на организацию и завести вторую нельзя. Первое поле системное —
     его не продублировать и не убрать в архив, потому что именно
     по нему считается оценка отдела подбора. */
  'rating-form': {
    head: `
      <span class="st-dialog-name">
        <b>Форма оценки рекрутмента</b>
        <span class="st-dialog-sub">Создано 4 июня 2026, 11:31 &nbsp;·&nbsp; Юджин</span>
      </span>`,
    body: `
      <div class="st-survey-field">
        <div class="st-survey-field-head">
          <span class="st-survey-no">
            <b>Общее впечатление о подборе</b>
            <span class="st-survey-kind">Системное поле</span>
          </span>
        </div>
        <div class="st-survey-body">
          <div class="st-survey-main">
            <span class="hf-label">Название</span>
            <input class="hf-input" type="text" value="Общее впечатление о подборе">
            <label class="st-check st-check--tight"><input type="checkbox">Подсказка рядом с полем</label>
            <p class="st-survey-params">Параметры</p>
            <span class="hf-label">Шкала оценки</span>
            <select class="hf-select"><option>10</option><option>5</option></select>
          </div>
          <aside class="st-survey-side">
            <label class="st-check st-check--tight"><input type="checkbox" checked disabled>Обязательное поле</label>
            <label class="st-check st-check--tight"><input type="checkbox">Разделитель после поля</label>
          </aside>
        </div>
      </div>
      <div class="st-survey-field">
        <div class="st-survey-field-head">
          <span class="st-survey-no">
            <b>Комментарий</b>
            <span class="st-survey-kind">Многострочный текст</span>
          </span>
          <span class="st-survey-acts">
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Дублировать поле</button>
            <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">В архив</button>
          </span>
        </div>
        <div class="st-survey-body">
          <div class="st-survey-main">
            <span class="hf-label">Название</span>
            <input class="hf-input" type="text" value="Комментарий">
            <label class="st-check st-check--tight"><input type="checkbox">Подсказка рядом с полем</label>
            <p class="st-survey-params">Параметры</p>
            <span class="hf-label">Подсказка внутри поля до заполнения</span>
            <input class="hf-input" type="text" placeholder="Текст подсказки">
          </div>
          <aside class="st-survey-side">
            <label class="st-check st-check--tight"><input type="checkbox" checked>Обязательное поле</label>
            <label class="st-check st-check--tight"><input type="checkbox">Разделитель после поля</label>
          </aside>
        </div>
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Предпросмотр</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },
});

/* Список переменных раскрывается на месте: в макете нет роутинга
   внутри модалки, а состояние показать надо */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-st-vars]');
  const menu = btn && document.querySelector(`[data-st-vars-menu="${btn.dataset.stVars}"]`);
  document.querySelectorAll('[data-st-vars-menu]').forEach((m) => {
    if (m !== menu) m.hidden = true;
  });
  if (menu) menu.hidden = !menu.hidden;
});
