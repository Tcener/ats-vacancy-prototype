/* Экран «Календарь». Оболочку строит shell.js.

   Экран минимальный, и это не упущение переноса: в Хантфлоу у календаря
   один-единственный вид — сетка месяца. Ни недели, ни дня, ни списка нет.
   Дневного вида тоже нет: то, что в ячейку не влезло, показывает карточка
   «Еще N» — она и есть единственный способ увидеть весь день целиком.

   Сетка только показывает. Клик по пустой ячейке не создаёт событие:
   события заводятся из карточки кандидата, а не отсюда.

   Данные вымышленные, структура повторена точно: состав полей карточки
   события, набор кнопок под ней и правила показа сняты с боевого. */

/* esc и icon берём из оболочки */
const { esc } = HF;
const svg = (name, size = 20) =>
  `<svg style="width:${size}px;height:${size}px;fill:currentColor"><use href="#${name}"></use></svg>`;

/* ── Месяцы ────────────────────────────────────────────────── */

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/* Сегодня в макетах — 3 сентября 2026, как и на остальных экранах */
const TODAY = { y: 2026, m: 8, d: 3 };

/* ── События ───────────────────────────────────────────────────
   Ключ — дата. Событие: время, название, тип и состояние.

   type: 'interview' — привязано к кандидату и вакансии, в карточке есть
         «Перейти к кандидату»; 'other' — свободное событие без кандидата.
   cancelled: отменённое не исчезает из сетки, а зачёркивается — и в ячейке,
         и в собственной карточке.
   private: помечается прямо в подзаголовке карточки словом «(приватное)». */

const EVENTS = {
  '2026-08-31': [
    { t: '12:00', end: '12:30', who: 'Гаврилов Иван', vac: 'КА Delphi-разработчик (Маша)' },
    { t: '12:30', end: '13:00', who: 'Гаврилова Мария', vac: 'КА Delphi-разработчик (Маша)' },
    { t: '16:00', end: '17:00', who: 'Виноградов Пётр', vac: 'КА Системный аналитик (Маша)' },
  ],
  '2026-09-01': [
    { t: '15:00', end: '16:00', who: 'Шоколова Дарья', vac: 'КА IT-рекрутер (Тина)' },
  ],
  '2026-09-02': [
    { t: '11:00', end: '12:00', who: 'Рохлов Виктор', vac: 'DBA (Маша)' },
    { t: '13:00', end: '13:30', who: 'Бабичев Илья', vac: 'КА Системный аналитик (Маша)' },
    { t: '16:00', end: '17:00', who: 'Крылова Ольга', vac: 'КА IT-рекрутер (Тина)' },
  ],
  /* Пять событий в одном дне: влезают три, остальные уходят под «Еще 2» */
  '2026-09-03': [
    { t: '10:30', end: '11:30', who: 'Хасанова Аделина', vac: 'КА IT-рекрутер (Тина)' },
    { t: '11:00', end: '12:00', who: 'Кизелевич Александр', vac: 'КА Системный аналитик (Маша)' },
    { t: '12:30', end: '13:00', who: 'Зенкевич Анастасия', vac: 'КА Продуктовый аналитик (Рената)' },
    { t: '14:00', end: '15:00', who: 'Кабалоев Владислав', vac: 'КА Системный аналитик (Маша)' },
    { t: '16:00', end: '16:30', who: 'Цыганов Сергей', vac: 'КА IT-рекрутер (Тина)' },
  ],
  '2026-09-05': [
    { t: '11:00', end: '12:00', who: 'Кувайцева Ирина', vac: 'КА Аналитик данных (Маша)' },
    { t: '12:00', end: '12:30', who: 'Филиппенко Варвара', vac: 'КА IT-рекрутер (Тина)' },
    { t: '18:00', end: '19:00', who: 'Кизелевич Александр', vac: 'КА Системный аналитик (Маша)' },
  ],
  '2026-09-10': [
    { t: '12:30', end: '13:30', who: 'Кабалоев Владислав', vac: 'КА Системный аналитик (Маша)' },
    { t: '15:30', end: '16:00', who: 'Филиппенко Варвара', vac: 'КА IT-рекрутер (Тина)' },
  ],
  '2026-09-12': [
    { t: '14:00', end: '14:30', who: 'Пономарёв Егор', vac: 'КА Аналитик данных (Маша)', phone: true },
    { t: '15:00', end: '16:00', who: 'Зеленова Алина', vac: 'КА Продуктовый аналитик (Рената)' },
  ],
  '2026-09-13': [
    { t: '09:00', end: '10:00', who: 'Дангыраа Айдын', vac: 'КА Системный аналитик (Маша)' },
  ],
  '2026-09-17': [
    { t: '15:00', end: '15:30', who: 'Гурчинский Максим', vac: 'КА Аналитик данных (Маша)', phone: true },
  ],
  '2026-09-20': [
    { t: '15:00', end: '16:00', who: 'Бачев Тимур', vac: 'КА IT-рекрутер (Тина)' },
    { t: '17:00', end: '18:00', who: 'Пономарёв Егор', vac: 'КА Аналитик данных (Маша)' },
  ],
  '2026-09-23': [
    { t: '13:00', end: '13:30', who: 'Кузьмина Полина', vac: 'КА Системный аналитик (Маша)', phone: true },
    { t: '17:00', end: '17:30', who: 'Кириллов Денис', vac: 'КА IT-рекрутер (Тина)', phone: true },
  ],
  /* Отменённое событие остаётся в сетке зачёркнутым. Дубль — не ошибка
     макета: в боевом одно и то же интервью лежит двумя записями */
  '2026-09-24': [
    { t: '19:00', end: '20:00', who: 'Дяченко Александр', vac: 'КА Тестировщик (Саша)', cancelled: true },
    { t: '19:00', end: '20:00', who: 'Дяченко Александр', vac: 'КА Тестировщик (Саша)', cancelled: true },
  ],
  /* Свободное событие: кандидата нет, зато есть описание и место */
  '2026-09-25': [
    { t: '14:30', name: 'Просто напоминание', type: 'other', cancelled: true, priv: true,
      desc: 'Позвонить в агентство по поводу закрытия позиции',
      place: 'Переговорная 4', guests: ['Юджин'] },
  ],
  '2026-09-27': [
    { t: '17:00', end: '18:00', who: 'Губарь Никита', vac: 'КА Продуктовый аналитик (Рената)' },
  ],
  '2026-10-01': [
    { t: '18:00', end: '19:00', who: 'Губарь Никита', vac: 'КА Продуктовый аналитик (Рената)' },
  ],
};

/* Приглашённые на интервью — почты сотрудников, а не кандидата:
   кандидату приглашение уходит письмом, в событие он не попадает */
const GUESTS = ['polina@refni.ru', 'kuznetsov@refni.ru'];

const key = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const title = (e) => e.name
  || `${e.phone ? 'Тел. интервью' : 'Интервью'}: ${e.who} – ${e.vac}`;

/* ── Состояние ─────────────────────────────────────────────────
   #y=2026&m=9 — какой месяц открыт, #d=03&i=1 — открытая карточка
   события, #more=03 — карточка дня целиком, #menu=sources — список
   календарей под шестернёй */
const state = { y: 2026, m: 8, pick: '', more: '', menu: '' };

const readHash = () => {
  const p = new URLSearchParams(location.hash.replace('#', ''));
  state.y = Number(p.get('y')) || 2026;
  state.m = p.get('m') ? Number(p.get('m')) - 1 : 8;
  state.pick = p.get('e') || '';
  state.more = p.get('more') || '';
  state.menu = p.get('menu') || '';
};

const writeHash = () => {
  const p = [];
  if (state.y !== 2026 || state.m !== 8) p.push(`y=${state.y}`, `m=${state.m + 1}`);
  if (state.pick) p.push(`e=${state.pick}`);
  if (state.more) p.push(`more=${state.more}`);
  if (state.menu) p.push(`menu=${state.menu}`);
  const h = p.length ? `#${p.join('&')}` : '#';
  if (location.hash !== h) history.replaceState(null, '', h);
};

/* ── Карточка события ──────────────────────────────────────── */

/* Подзаголовок: дата, время и пояс. У события без конца показывают
   только начало, у приватного дописывают «(приватное)» */
const when = (y, m, d, e) => {
  const range = e.end ? `${e.t} − ${e.end}` : e.t;
  return `${d} ${MONTHS[m]} ${y}, ${range} (GMT+3)${e.priv ? ' (приватное)' : ''}`;
};

const eventCard = (y, m, d, e) => {
  const cancel = e.cancelled ? ' cl-strike' : '';
  const rows = [];
  if (e.desc) rows.push(`<div class="cl-ev-text">${esc(e.desc)}</div>`);
  if (e.place) rows.push(`<dt>Место</dt><dd>${esc(e.place)}</dd>`);
  rows.push(`<dt>Приглашены</dt><dd>${esc((e.guests || GUESTS).join(', '))}</dd>`);

  /* Набор кнопок зависит не от типа события, а от того, живо ли оно:
     у отменённого редактировать нечего, остаётся только удалить */
  const foot = e.cancelled
    ? `<button class="hf-btn hf-btn--secondary hf-btn--s" type="button" data-cl-close>Закрыть</button>
       <button class="hf-btn hf-btn--ghost hf-btn--s cl-ev-remove" type="button">Удалить</button>`
    : `<button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Редактировать</button>
       <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Отменить событие</button>
       <a class="hf-btn hf-btn--secondary hf-btn--s" href="applicants.html">Перейти к кандидату</a>`;

  return `
    <div class="cl-pop cl-pop--event" data-od-id="calendar-event-card">
      <div class="cl-ev-head">
        <h2 class="cl-ev-title${cancel}" title="${esc(title(e))}">${esc(title(e))}</h2>
        <p class="cl-ev-sub${cancel}">${esc(when(y, m, d, e))}</p>
      </div>
      <dl class="cl-ev-body">${rows.join('')}</dl>
      <div class="cl-ev-foot">${foot}</div>
    </div>`;
};

/* Карточка дня: единственное место, где день виден целиком */
const dayCard = (y, m, d, list) => `
  <div class="cl-pop cl-pop--day" data-od-id="calendar-day-card">
    <h2 class="cl-day-title">${d} ${MONTHS[m]} ${y}</h2>
    <div class="cl-day-list">
      ${list.map((e) => `<button class="cl-day-item${e.cancelled ? ' cl-strike' : ''}" type="button">
        ${esc(e.t)} ${esc(title(e))}</button>`).join('')}
    </div>
    <div class="cl-day-foot">
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button" data-cl-close>Закрыть</button>
    </div>
  </div>`;

/* ── Сетка ─────────────────────────────────────────────────── */

const SLOTS = 3;   /* больше трёх в ячейку не влезает */

const cellHtml = (y, m, d, own, col) => {
  const k = key(y, m, d);
  const list = EVENTS[k] || [];
  const shown = list.length > SLOTS ? list.slice(0, SLOTS) : list;
  const rest = list.length - shown.length;
  const dow = new Date(y, m, d).getDay();
  const today = y === TODAY.y && m === TODAY.m && d === TODAY.d;

  /* Карточка не должна уезжать за правый край: у последних колонок
     она прижимается к правому краю ячейки, а не к левому */
  const side = col > 3 ? ' cl-pop-anchor--right' : '';

  /* Карточка встаёт под ту полосу, по которой щёлкнули, а не поверх неё:
     32 — высота числа, 17 — полоса события вместе с зазором */
  const under = (i) => `style="top:${32 + (i + 1) * 17 + 4}px"`;

  const idx = state.pick.startsWith(`${k}:`) ? Number(state.pick.split(':')[1]) : -1;
  const open = list[idx];
  const openMore = state.more === k;

  return `
    <div class="cl-cell${own ? '' : ' cl-cell--filler'}${dow === 0 || dow === 6 ? ' cl-cell--weekend' : ''}${today ? ' cl-cell--today' : ''}">
      <div class="cl-date">${d}</div>
      <div class="cl-slots">
        ${shown.map((e, i) => `
          <button class="cl-slot${e.cancelled ? ' cl-strike' : ''}${state.pick === `${k}:${i}` ? ' is-open' : ''}"
                  type="button" data-ev="${k}:${i}" title="${esc(e.t)} ${esc(title(e))}">
            ${esc(e.t)} ${esc(title(e))}</button>`).join('')}
        ${rest > 0 ? `<button class="cl-more" type="button" data-more="${k}">Еще ${rest}</button>` : ''}
      </div>
      ${open ? `<div class="cl-pop-anchor${side}" ${under(idx)}>${eventCard(y, m, d, open)}</div>` : ''}
      ${openMore ? `<div class="cl-pop-anchor${side}" ${under(SLOTS)}>${dayCard(y, m, d, list)}</div>` : ''}
    </div>`;
};

const gridHtml = () => {
  const first = new Date(state.y, state.m, 1);
  /* Неделя начинается с понедельника; заголовков дней недели в календаре
     нет вовсе — ни «Пн», ни «Вт», только числа */
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(state.y, state.m, 1 - lead);

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push(cellHtml(dt.getFullYear(), dt.getMonth(), dt.getDate(),
      dt.getMonth() === state.m, i % 7));
  }
  return `<div class="cl-grid" data-od-id="calendar-grid">${cells.join('')}</div>`;
};

/* ── Отрисовка ─────────────────────────────────────────────── */

const render = () => {
  document.getElementById('calendar-screen').innerHTML = `
    <div class="hf-island cl-sheet" data-od-id="calendar-sheet">
      <div class="cl-head">
        <div class="cl-head-col">
          <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-step="-1" aria-label="Предыдущий месяц">←</button>
          <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-today>Сегодня</button>
          <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-step="1" aria-label="Следующий месяц">→</button>
        </div>
        <div class="cl-title">${MONTHS_NOM[state.m]} ${state.y}</div>
        <div class="cl-head-col cl-head-col--end">
          <button class="hf-btn hf-btn--secondary hf-btn--l cl-gear${state.menu === 'sources' ? ' is-open' : ''}"
                  type="button" data-menu="sources" aria-label="Календари">${svg('settings', 20)}</button>
          ${state.menu === 'sources' ? `
            <div class="cl-pop cl-pop--sources" data-od-id="calendar-sources">
              <div class="cl-source is-on">${svg('checkmark', 20)}<span>Хантфлоу</span></div>
            </div>` : ''}
        </div>
      </div>
      ${gridHtml()}
    </div>`;
};

/* ── Поведение ─────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) {
    const d = new Date(state.y, state.m + Number(step.dataset.step), 1);
    state.y = d.getFullYear(); state.m = d.getMonth();
    state.pick = ''; state.more = ''; state.menu = '';
    writeHash(); render(); return;
  }
  if (e.target.closest('[data-today]')) {
    state.y = TODAY.y; state.m = TODAY.m;
    state.pick = ''; state.more = ''; state.menu = '';
    writeHash(); render(); return;
  }
  const ev = e.target.closest('[data-ev]');
  if (ev) {
    state.pick = state.pick === ev.dataset.ev ? '' : ev.dataset.ev;
    state.more = ''; state.menu = '';
    writeHash(); render(); return;
  }
  const more = e.target.closest('[data-more]');
  if (more) {
    state.more = state.more === more.dataset.more ? '' : more.dataset.more;
    state.pick = ''; state.menu = '';
    writeHash(); render(); return;
  }
  const menu = e.target.closest('[data-menu]');
  if (menu) {
    state.menu = state.menu === menu.dataset.menu ? '' : menu.dataset.menu;
    state.pick = ''; state.more = '';
    writeHash(); render(); return;
  }
  if (e.target.closest('[data-cl-close]')) {
    state.pick = ''; state.more = ''; writeHash(); render(); return;
  }
  /* Клик мимо закрывает раскрытое — как в оригинале */
  if ((state.pick || state.more || state.menu) && !e.target.closest('.cl-pop')) {
    state.pick = ''; state.more = ''; state.menu = '';
    writeHash(); render();
  }
});

addEventListener('hashchange', () => { readHash(); render(); });

readHash();
HF.mount({ active: 'calendar' });
render();
