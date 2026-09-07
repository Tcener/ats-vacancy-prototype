/* Настройки: ядро экрана.

   В Хантфлоу настройки живут на своих роутах /app/settings/orgs/<org>/…
   и выглядят иначе, чем рабочие экраны: сайдбара вакансий нет, вместо
   него белый остров во всю ширину и своё меню подразделов слева.

   Здесь только то, что общее для всех разделов: адрес состояния,
   строительные блоки, из которых собраны сразу несколько подвкладок,
   и отрисовка. Сами разделы лежат по файлу на штуку и дописывают себя
   в SECTIONS и DIALOGS. Порядок подключения в settings.html важен:
   ядро первым, разделы после, всё со `defer`. Отрисовка отложена
   до DOMContentLoaded — к этому моменту все разделы уже загружены.

   Данные вымышленные, структура — снятая. */

/* Адрес состояния: #s=<раздел>&t=<подвкладка>

   Адрес хранится не только в строке браузера, но и здесь. Причина
   в предпросмотрах: макет часто смотрят не в отдельной вкладке,
   а внутри другого приложения (OpenDesign, редактор кода), а там
   переход по ссылке-якорю бывает перехвачен — адрес не меняется,
   `hashchange` не приходит, и экран выглядит намертво мёртвым.
   Поэтому клик обрабатывается сам, а строка браузера обновляется
   по возможности; `route` — то, что мы решили показать. */
let route = null;
const part = (key, dflt) => ((route === null ? location.hash : route)
  .match(new RegExp(key + '=([\\w-]+)')) || [])[1] || dflt;

/* Разделы и модалки дописывают себя сюда сами */
const SECTIONS = {};
const DIALOGS = {};

/* ── Строка-поле ──────────────────────────────────────────────
   Поле ввода с ручкой перетаскивания поверх левого отступа
   и крестиком справа за пределами поля; вместо крестика может
   стоять замок — такую строку не удалить. Так устроены этапы
   подбора, источники резюме и типы интервью. */
const stageRow = (name, { locked = false, note = '' } = {}) => `
  <li class="st-row${note ? ' is-marked' : ''}">
    <div class="st-row-line">
      <span class="st-drag" aria-hidden="true">&#9776;</span>
      <input class="st-input" type="text" value="${HF.esc(name)}"${locked ? ' readonly' : ''}>
      ${locked ? `<span class="st-lock" aria-hidden="true">${HF.icon('lock')}</span>` : ''}
      ${locked ? '' : `<button class="st-remove" type="button" aria-label="Удалить этап">${HF.icon('remove')}</button>`}
    </div>
    ${note ? `<p class="st-note">${note}</p>` : ''}
  </li>`;

/* ── Справочник ───────────────────────────────────────────────
   «Причины отказа» и «Оргструктура» — в Хантфлоу буквально один
   виджет (роут dictionary-list): поиск, групповые действия, дерево
   с чекбоксами. Поэтому строка у них общая, а не своя на каждый
   раздел. Действия строки — переименовать, добавить вложенный,
   удалить — в оригинале проявляются по наведению. */
const dictRow = (name, { caret = false, archived = false } = {}) => `
  <li class="st-leaf${archived ? ' is-archived' : ''}">
    <span class="st-leaf-caret" aria-hidden="true">${caret ? HF.icon('chevron-down-16') : ''}</span>
    <input type="checkbox">
    <span class="st-leaf-name">${HF.esc(name)}</span>
    ${archived ? '<span class="st-label st-label--api">В архиве</span>' : ''}
    <span class="st-leaf-actions">
      <button class="st-leaf-act" type="button" aria-label="Переименовать">${HF.icon('edit')}</button>
      <button class="st-leaf-act" type="button" aria-label="Добавить вложенный">${HF.icon('system-plus')}</button>
      <button class="st-leaf-act" type="button" aria-label="Удалить">${HF.icon('trash')}</button>
    </span>
  </li>`;

/* ── Плашка «раздела нет на тарифе» ───────────────────────────
   Четыре подвкладки в двух разделах устроены одинаково: бейдж
   тарифа, заголовок, список того, что появится, и две кнопки.
   Отличаются картинкой и тем, есть ли бейдж вообще: у SMS дело
   не в тарифе, а в договоре с оператором. */
const upsell = ({ title, lead, items, actions, badge = true, art = null,
  stars = false, logos = null, mod = '' }) => `
  <div class="st-promo${mod ? ` ${mod}` : ''}">
    ${badge ? '<span class="st-promo-badge">Тариф Максимальный</span>' : ''}
    ${stars ? `<div class="st-promo-stars">${
  '<img src="assets/star-rating.svg" width="53" height="53" alt="">'.repeat(5)}</div>` : ''}
    <h2 class="st-promo-title">${HF.esc(title)}</h2>
    <div class="st-promo-body">
      <div class="st-promo-text">
        <p class="st-promo-lead">${HF.esc(lead)}</p>
        <ul class="st-promo-list">${items.map((i) => `<li>${HF.esc(i)}</li>`).join('')}</ul>
        ${logos ? `<div class="st-promo-logos">${logos.map((l) => `<img src="assets/${l.src}"
          width="${l.w}" height="${l.h}" alt="${HF.esc(l.alt)}">`).join('')}</div>` : ''}
      </div>
      ${art ? `<img class="st-promo-art" src="assets/${art.src}"
                   width="${art.w}" height="${art.h}" alt="">` : ''}
    </div>
    <div class="st-promo-foot">
      <button class="hf-btn hf-btn--accent hf-btn--s" type="button">${HF.esc(actions[0])}</button>
      ${actions[1] ? `<a class="hf-btn hf-btn--secondary hf-btn--s" href="#">${HF.esc(actions[1])}</a>` : ''}
    </div>
  </div>`;

const dialogHtml = (key, d) => `
  <div class="hf-overlay" data-hf-overlay="st-${key}">
    <div class="hf-modal st-dialog${d.wide ? ' st-dialog--wide' : ''}" role="dialog" aria-modal="true"
         aria-label="${HF.esc(d.title || 'Карточка пользователя')}">
      <div class="hf-modal-head">
        ${d.head || `<h2 class="hf-h2">${HF.esc(d.title)}</h2>`}
        <button class="hf-icon-btn hf-icon-btn--dark" type="button" data-hf-close
                aria-label="Закрыть">${HF.icon('x-close')}</button>
      </div>
      <div class="hf-modal-body">${d.body}</div>
      <div class="hf-modal-foot">${d.foot}</div>
      ${d.extra || ''}
    </div>
  </div>`;

/* ── Сборка экрана ───────────────────────────────────────────── */
const render = () => {
  const sectionId = SECTIONS[part('s', 'home')] ? part('s', 'home') : 'home';
  const section = SECTIONS[sectionId];

  /* Раздел бывает двух видов. Обычный — меню подразделов слева,
     содержимое справа. Одностраничный (`pane` вместо `tabs`) — меню
     нет вовсе, содержимое занимает весь остров. Так устроен «Сбор
     откликов»: у него одна страница и ни одной подвкладки. */
  const plain = !section.tabs;
  const active = plain ? null
    : (section.tabs.some(([id]) => id === part('t')) ? part('t') : section.tabs[0][0]);
  const pane = plain ? section.pane
    : (section.tabs.find(([id]) => id === active) || section.tabs[0])[4];

  document.getElementById('settings-screen').innerHTML = `
    <div class="st-head${section.home ? ' st-head--home' : ''}">
      ${section.home ? '' : `<a class="st-back" href="#s=home">${
  HF.icon('arrow-left', 18)}Настройки Рефни</a>`}
      <h1 class="st-title" data-od-id="settings-title">${HF.esc(section.title)}</h1>
    </div>
    <div class="st-body${plain ? ' st-body--plain' : ''}">
      ${plain ? '' : `
      <ul class="st-tabs" data-od-id="settings-tabs">
        ${section.tabs.map(([id, label, ic, color, , opt = {}]) => `
          <li>
            <a class="st-tab${id === active ? ' is-active' : ''}"
               href="#s=${sectionId}&t=${id}" data-od-id="tab-${id}">
              <span class="st-tab-icon${opt.locked ? ' is-locked' : ''}"
                    style="color:${color}">${HF.icon(ic, 20)}</span>
              <span class="st-tab-label">${HF.esc(label)}</span>
            </a>
          </li>`).join('')}
      </ul>`}
      <div class="st-pane" data-od-id="settings-pane">${pane()}</div>
    </div>`;
};

document.addEventListener('click', (e) => {
  /* Внутренняя ссылка: показываем сами и только потом просим браузер
     поправить адрес. Сюда же попадают пункты меню настроек в шапке —
     они написаны полным адресом `settings.html#…`, но, раз мы уже
     на этой странице, это тот же переход. Заглушки `href="#"`
     остаются заглушками — но без прыжка страницы наверх */
  const link = e.target.closest('a[href*="#"]');
  if (link) {
    const [file, hash] = link.getAttribute('href').split('#');
    if (file && file !== 'settings.html') return;
    e.preventDefault();
    if (!hash) return;
    route = `#${hash}`;
    location.hash = hash;
    render();
    syncDialog();
    return;
  }
  const trigger = e.target.closest('[data-st-dialog]');
  if (!trigger) return;
  document.querySelector(`[data-hf-overlay="st-${trigger.dataset.stDialog}"]`)?.classList.add('is-open');
});

/* Модалку тоже можно открыть адресом: #s=…&t=…&d=<модалка>.
   Нужно обзорному холсту — он показывает состояния кадрами,
   а не кликами. */
const syncDialog = () => {
  const want = part('d');
  document.querySelectorAll('[data-hf-overlay^="st-"]').forEach((o) => {
    o.classList.toggle('is-open', o.dataset.hfOverlay === `st-${want}`);
  });
};

/* Адрес поменяли снаружи — например, обзорный холст открыл кадр
   со своим состоянием. Он главнее того, что мы решили сами */
addEventListener('hashchange', () => { route = null; render(); syncDialog(); });

/* Отрисовка после того, как все разделы дописали себя в SECTIONS:
   defer-скрипты выполняются раньше DOMContentLoaded */
addEventListener('DOMContentLoaded', () => {
  HF.mount({ title: '<a class="hf-back" href="applicants.html" data-od-id="back-to-work">'
    + HF.icon('arrow-left', 20) + '<span>Кандидаты и вакансии</span></a>' });
  document.body.insertAdjacentHTML('beforeend',
    Object.entries(DIALOGS).map(([k, d]) => dialogHtml(k, d)).join(''));
  render();
  syncDialog();
});
