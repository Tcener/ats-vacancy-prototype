/* Настройки → Сбор откликов: карьерный сайт.

   Единственный раздел настроек без подвкладок: меню слева нет вовсе,
   одна страница на всю ширину острова. Поэтому в SECTIONS он описан
   через `pane`, а не через `tabs` — ядро рисует такой раздел без меню.

   Содержимое раздела — не «сайт», а его настройки: адрес, публичная
   карточка компании, логотип и счётчики аналитики. Сам сайт живёт
   снаружи: список открытых вакансий, описание компании, форма отклика.

   Два состояния, и они не похожи друг на друга. Пока сайт не включён,
   настроек нет вовсе: реклама возможностей, одно поле с будущим адресом
   и кнопка. Ни описания, ни логотипа, ни счётчиков до включения не
   существует. Выключенное состояние снято в песочнице — в боевом
   аккаунте сайт работает, а гасить его ради снимка нельзя.

   Подключается после settings.js. */

/* Счётчики аналитики: подпись и подсказка внутри поля.
   Пять систем, все — чужие сервисы, значение хранится строкой. */
const ANALYTICS = [
  ['Яндекс Метрика', 'Идентификатор счетчика'],
  ['Google Analytics', 'Идентификатор отслеживания'],
  ['Pixel ВКонтакте', 'id пикселя'],
  ['Facebook pixel', 'id пикселя'],
  ['Pixel Top.Mail.ru (MyTarget)', 'id счетчика'],
];

/* Поле формы карьерного сайта: подпись, контрол, подсказка под ним.
   Подсказка занимает место только когда она есть. */
const csField = (label, { value = '', placeholder = '', hint = '', control = '' } = {}) => `
  <div class="hf-field">
    <label class="hf-label">${HF.esc(label)}</label>
    ${control || `<input class="hf-input st-cs-control" type="text"
      value="${HF.esc(value)}"${placeholder ? ` placeholder="${HF.esc(placeholder)}"` : ''}
      aria-label="${HF.esc(label)}">`}
    ${hint ? `<p class="st-cs-hint">${hint}</p>` : ''}
  </div>`;

/* Что обещает раздел, пока сайт не включён. Шесть пунктов — это,
   по сути, список возможностей карьерного сайта из первых рук. */
const PROMO = [
  'Карьерный сайт с названием, логотипом и описанием вашей компании',
  'Публикация вакансии прямо из интерфейса Хантфлоу',
  'Автоматическое создание привлекательной картинки для отображения вакансии в соцсетях',
  'Автоматическая загрузка откликов',
  'Отслеживание эффективности подбора с сайта в отчетах Хантфлоу',
  'Подключение Яндекс Метрики, Google Analytics, пикселей Facebook, Вконтакте и myTarget '
    + 'для отслеживания эффективности вложений в маркетинг сайта',
];

/* ── Сайт выключен ────────────────────────────────────────────
   Включение — это выдача адреса, и больше ничего: одно поле,
   одна кнопка. Значит, короткое имя в адресе не настройка сайта,
   а условие его существования. */
const paneCareerSiteOff = () => `
  <section class="st-cs-promo" data-od-id="career-site-promo">
    <div class="st-cs-promo-in">
      <h2 class="st-cs-promo-title">Карьерный сайт</h2>
      <p class="st-cs-promo-lead">Собирайте отклики из соцсетей и мессенджеров
        с&nbsp;помощью встроенного карьерного сайта</p>
      <ul class="st-cs-promo-list">
        ${PROMO.map((i) => `<li>${HF.esc(i)}</li>`).join('')}
      </ul>
    </div>
  </section>

  <section class="st-cs-block" data-od-id="career-site-enable">
    <h2 class="st-h2 st-h2--s">Включение карьерного сайта</h2>
    <div class="st-cs-form">
      ${csField('Короткое название для адреса (URL)', {
    value: 'refni',
    hint: 'https://<b>refni</b>.huntflow.io',
  })}
    </div>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Настроить карьерный сайт&nbsp;→</button>
  </section>`;

/* ── Сайт работает ───────────────────────────────────────────── */
const paneCareerSiteOn = () => `
  <section class="st-cs-status" data-od-id="career-site-status">
    <a class="st-cs-banner" href="#" data-od-id="career-site-link">refni.huntflow.io&nbsp;→</a>
    <p class="st-cs-state">Ваш бесплатный карьерный сайт
      <b class="st-cs-on">работает</b></p>
    <div class="st-cs-actions">
      <a class="hf-btn hf-btn--secondary hf-btn--s" href="#">Перейти на сайт</a>
      <button class="st-cs-off" type="button">Выключить</button>
    </div>
  </section>

  <section class="st-cs-block" data-od-id="career-site-public">
    <h2 class="st-h2 st-h2--s">Публичная информация о компании</h2>
    <div class="st-cs-form">
      ${csField('Название компании', { value: 'Рефни' })}
      ${csField('Короткое название для адреса (URL)', {
    value: 'refni',
    hint: 'https://<b>refni</b>.huntflow.io',
  })}
      ${csField('Описание компании', {
    control: `
        <div class="hf-richtext">
          <div class="hf-richtext-bar">${['bold', 'italic', 'bullet-list', 'numbered-list', 'link']
    .map((i) => `<button class="hf-richtext-btn" type="button" aria-label="${i}">${HF.icon(i)}</button>`).join('')}</div>
          <div class="hf-richtext-area st-cs-area" contenteditable="true"><p><b>Рефни (Refni) — это
            платформа для внешнего реферального рекрутинга, которая специализируется на поиске
            IT- и digital-специалистов.</b> Сервис позволяет любому человеку рекомендовать знакомых
            на открытые вакансии и получать денежное вознаграждение в случае успешного
            трудоустройства кандидата.</p></div>
        </div>`,
  })}
      ${csField('Ссылка на ваш корпоративный сайт', { value: 'https://refni.ru/' })}
      ${csField('Ссылка на ваше согласие обработки перс. данных')}
      ${csField('Ссылка на вашу политику обработки перс. данных')}
      ${csField('Язык карьерного сайта', {
    control: `<select class="hf-select st-cs-control" aria-label="Язык карьерного сайта">
          <option>Русский</option><option>English</option>
        </select>`,
  })}
      <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Сохранить</button>
    </div>
  </section>

  <section class="st-cs-block" data-od-id="career-site-logo">
    <h2 class="st-h2 st-h2--s">Ваш логотип для карьерного сайта</h2>
    <img class="st-cs-logo" src="assets/logo-refni.jpg" width="75" height="75"
         alt="Логотип компании Рефни">
    <div class="st-cs-actions st-cs-actions--left">
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Загрузить новый</button>
      <button class="st-cs-off" type="button">Удалить</button>
    </div>
  </section>

  <section class="st-cs-block" data-od-id="career-site-analytics">
    <h2 class="st-h2 st-h2--s">Системы аналитики</h2>
    <div class="st-cs-form">
      ${ANALYTICS.map(([label, placeholder]) => csField(label, { placeholder })).join('')}
      <button class="hf-btn hf-btn--primary hf-btn--s" type="button">Сохранить</button>
    </div>
  </section>`;

/* Состояние адресуется хешем, как и всё остальное в макетах:
   #s=response&mode=off — сайт ещё не включён */
const paneCareerSite = () => (part('mode') === 'off' ? paneCareerSiteOff() : paneCareerSiteOn());

Object.assign(SECTIONS, {
  response: { title: 'Сбор откликов', pane: paneCareerSite },
});
