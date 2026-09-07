/* Настройки → Воронка: этапы подбора, наборы этапов, время на этапе,
   причины отказа. Подключается после settings.js и берёт оттуда
   part, stageRow и dictRow. */

/* Этапы берём из общей воронки макета — это те же самые этапы,
   которыми подписаны колонки на экране вакансии */
const STAGES = HF.FUNNEL
  .filter(([name]) => name !== 'В работе' && name !== 'Отказ')
  .map(([name]) => name);

const GROUPS = ['Массовый подбор', 'Executive search'];

const REASON_GROUPS = [['Отказ заказчика', ['Недостаточно опыта']]];
const REASONS = [
  'Высокие запросы по зарплате',
  'Закрыли вакансию другим',
  'Кандидат отказался сам',
  'Неприемлемые личные качества',
  'Несоответствующая квалификация',
  'Перестал отвечать',
  'Плохо выполнено тестовое задание',
  'Принял другой оффер',
  'Принял контроффер',
];

/* ── «Этапы подбора» ─────────────────────────────────────────── */
const paneStages = () => `
  <h2 class="st-h2">Этапы подбора</h2>
  <div class="st-section">
    <ul class="st-rows">
      ${STAGES.map((s) => stageRow(s)).join('')}
      ${stageRow('Оффер принят', {
        locked: true,
        note: 'Этот этап означает окончание работы рекрутера по кандидату. <a href="#">Как его использовать?</a>',
      })}
      <li class="st-row-plain">
        <span>Отказ&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#s=funnel&t=reasons">Настроить типовые причины</a></span>
        ${HF.icon('lock')}
      </li>
    </ul>
    <button class="st-add-wide" type="button">Добавить этап подбора</button>
    <div class="st-foot">
      <button class="hf-btn hf-btn--primary hf-btn--s" type="button" disabled>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button" disabled>Вернуть</button>
    </div>
  </div>`;

/* ── «Наборы этапов» ─────────────────────────────────────────── */
const paneGroups = () => `
  <h2 class="st-h2">Набор этапов подбора</h2>
  <p class="st-lead">Для разных воронок по разным вакансиям</p>
  <ul class="st-sets">
    ${GROUPS.map((g) => `
      <li class="st-set">
        <span class="st-set-mark" aria-hidden="true">&#9776;</span>
        <a href="#s=funnel&t=groups">${HF.esc(g)}</a>
      </li>`).join('')}
  </ul>
  <button class="st-add" type="button">${HF.icon('circle-plus')}Добавить набор этапов</button>`;

/* ── «Время на этапе» ────────────────────────────────────────── */
const paneTime = () => `
  <h2 class="st-h2">Ограничение времени нахождения кандидата на этапе</h2>
  <p class="st-lead"><b>Контролируйте SLA</b>: установите, через сколько дней нахождения
    кандидата на этапе он будет подсвечиваться в интерфейсе красным, а рекрутер будет
    получать ежедневные напоминания о таких кандидатах</p>
  <select class="hf-select st-select">
    <option>По общей воронке (в которую входят все этапы подбора)</option>
    <option>По набору этапов «Массовый подбор»</option>
  </select>
  <ul class="st-limits">
    ${[...STAGES, 'Оффер принят'].map((s) => `
      <li class="st-limit">
        <button class="st-limit-btn" type="button">${HF.icon('settings')}<span>${HF.esc(s)}</span></button>
      </li>`).join('')}
  </ul>`;

/* ── «Причины отказа» ────────────────────────────────────────── */
const paneReasons = () => `
  <div class="st-h2-row">
    <h2 class="st-h2">Причины отказа <span class="st-hint" aria-hidden="true">?</span></h2>
    <div class="st-h2-actions">
      <button class="hf-btn hf-btn--primary hf-btn--s" type="button">${HF.icon('circle-plus')}Добавить</button>
      <button class="hf-btn hf-btn--primary hf-btn--s" type="button" aria-label="Добавить папку">${HF.icon('circle-plus')}${HF.icon('folder-20')}</button>
      <button class="hf-btn hf-btn--secondary hf-btn--s" type="button" aria-label="Настройки списка">${HF.icon('settings')}</button>
    </div>
  </div>
  <div class="st-search">${HF.icon('search-20')}<input type="text" placeholder="Поиск…"></div>
  <div class="st-bulk">
    <span>Объединить</span><span>Переместить</span><span>В архив</span>
  </div>
  <ul class="st-tree">
    ${REASON_GROUPS.map(([group, items]) => `
      <li class="st-group">
        <div class="st-group-head">
          <span class="st-caret" aria-hidden="true">${HF.icon('chevron-down-16')}</span>
          ${HF.icon('folder-20')}
          <span class="st-group-name">${HF.esc(group)}</span>
          <span class="st-group-count">${items.length}</span>
          <span class="st-group-actions">
            ${HF.icon('edit-2-20')}${HF.icon('plus')}${HF.icon('trash-20')}
          </span>
        </div>
        <ul class="st-tree st-tree--nested">
          ${items.map((i) => dictRow(i)).join('')}
        </ul>
      </li>`).join('')}
    ${REASONS.map((r) => dictRow(r)).join('')}
  </ul>`;

Object.assign(SECTIONS, {
  funnel: {
    title: 'Воронка',
    tabs: [
      ['stages', 'Этапы подбора', 'funnel-stages', '#6c63eb', paneStages],
      ['groups', 'Наборы этапов', 'funnel-funnels', '#e743d6', paneGroups],
      ['time', 'Время на этапе', 'funnel-clock', '#28bad3', paneTime],
      ['reasons', 'Причины отказа', 'funnel-refusal', '#f55932', paneReasons],
    ],
  },
});
