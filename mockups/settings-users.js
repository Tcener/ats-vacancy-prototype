/* Настройки → Рекрутеры и заказчики: два списка людей, карточка
   человека и приглашение. Подключается после settings.js. */

const RECRUITERS = [
  { name: 'Я, Юджин', mail: 'es@refni.ru', role: 'Управляющий рекрутер', owner: true },
];
const MANAGERS = [
  { name: 'Ольга Васильева', mail: 'ov@refni.ru', role: 'Заказчик' },
];

/* Права рекрутера: десять галочек, восемь из них включены сразу.
   Выключены ровно две — «Видит только свои вакансии» (иначе новый
   человек не увидел бы чужой работы) и «Управлять справочниками
   организации» (справочники общие на всю компанию). */
const RIGHTS = [
  ['Управлять вакансиями', true],
  ['Удалять вакансии', true],
  ['Назначать рекрутеров на вакансии', true],
  ['Видит только свои вакансии', false],
  ['Приглашать и назначать заказчиков', true],
  ['Удалять кандидатов', true],
  ['Управлять справочниками организации', false],
  ['Управлять общими шаблонами писем', true],
  ['Управлять метками', true],
  ['Получает заявки на вакансии', true],
];

/* Приглашение уходит на почту и до его принятия висит в отдельной
   вкладке: строку не открыть, права не поправить, приглашение
   не отозвать — единственное действие с ним у Хантфлоу отсутствует. */
const INVITES = [
  { name: 'Анна Петрова', mail: 'ap@refni.ru', sent: '12 июня 2026' },
];

/* ── «Рекрутеры» и «Заказчики» ─────────────────────────────────
   Оба списка устроены одинаково; отличие одно и оно существенное:
   рекрутер занимает платное рабочее место, заказчик — нет. Роль
   человека здесь не поле, а список, в который его пригласили. */
const personRow = (p) => `
  <li class="st-person"${p.dialog ? ` data-st-dialog="${p.dialog}"` : ''}>
    <span class="st-person-pic${p.owner ? ' is-owner' : ''}">
      ${HF.icon('userpic', 24)}${p.owner ? `<span class="st-crown">${HF.icon('crown')}</span>` : ''}
    </span>
    <span class="st-person-text">
      <b>${HF.esc(p.name)}</b>
      <span class="st-person-mail">${HF.esc(p.first)}</span>
      <span class="st-person-role">${HF.esc(p.second)}</span>
    </span>
  </li>`;

const peoplePane = (title, people, { seats = null, invite = 'invite', tab = '' } = {}) => {
  const invites = part('v') === 'invites';
  const href = (v) => `#s=users&t=${tab}${v ? `&v=${v}` : ''}`;
  return `
  <div class="st-h2-row">
    <h2 class="st-h2">${HF.esc(title)}</h2>
    <button class="hf-btn hf-btn--primary hf-btn--s" type="button" data-st-dialog="${invite}">
      ${HF.icon('circle-plus')}Пригласить
    </button>
  </div>
  <div class="st-search">${HF.icon('search-20')}<input type="text" placeholder="Поиск по имени или эл. почте"></div>
  <p class="st-excel"><a href="#">${HF.icon('download')}В Excel</a></p>
  <div class="st-subtabs">
    <a class="st-subtab${invites ? '' : ' is-active'}" href="${href('')}">${HF.esc(title)} <span>${people.length}</span></a>
    <a class="st-subtab${invites ? ' is-active' : ''}" href="${href('invites')}">Отправленные приглашения <span>${INVITES.length}</span></a>
  </div>
  <div class="st-people-row">
    <ul class="st-people">
      ${invites
    ? INVITES.map((i) => personRow({
      name: i.name, first: `Приглашение отправлено ${i.sent}`, second: i.mail,
    })).join('')
    : people.map((p) => personRow({
      name: p.name, first: p.mail, second: p.role, owner: p.owner,
      dialog: p.owner ? 'self' : 'person',
    })).join('')}
    </ul>
    ${seats ? `
      <aside class="st-seats">
        <p>${HF.esc(seats)}</p>
        <button class="hf-btn hf-btn--secondary hf-btn--s" type="button">Заказать доп. место</button>
      </aside>` : ''}
  </div>`;
};

const paneRecruiters = () => peoplePane('Рекрутеры', RECRUITERS, {
  seats: '1 рабочее место занято', invite: 'invite-recruiter', tab: 'recruiters',
});
const paneManagers = () => peoplePane('Заказчики', MANAGERS, { tab: 'managers' });

/* ── Модалки: карточка человека и приглашение ──────────────────
   Приватность и уведомления в обеих одинаковые: приглашение —
   это та же карточка, только с пустыми почтой и именем. */
const PREFS = (scope) => `
  <div class="st-prefs">
    <p class="st-prefs-title">Приватность</p>
    <label class="st-check"><input type="checkbox">Скрывать зарплату кандидатов</label>
    <p class="st-prefs-title">Получение уведомлений по вакансиям</p>
    ${['Сразу', 'Раз в 15 минут', 'Раз в час', 'Раз в день', 'Уведомления отключены']
      .map((o, i) => `<label class="st-check"><input type="radio" name="notify-${scope}"${i ? '' : ' checked'}>${o}</label>`).join('')}
    <p class="st-prefs-title">Другие уведомления</p>
    <label class="st-check"><input type="checkbox">Получать уведомления о превышении времени
      нахождения кандидата на этапе</label>
    <p class="st-prefs-note">При необходимости приватность и уведомления можно настроить
      для каждой вакансии отдельно</p>
  </div>`;

Object.assign(SECTIONS, {
  users: {
    title: 'Рекрутеры и заказчики',
    tabs: [
      ['recruiters', 'Рекрутеры', 'user-recruiters', '#00b84e', paneRecruiters],
      ['managers', 'Заказчики', 'user-hiring-managers', '#fa633e', paneManagers],
    ],
  },
});

Object.assign(DIALOGS, {
  person: {
    head: `
      <span class="st-dialog-pic">${HF.icon('userpic', 34)}</span>
      <span class="st-dialog-name">
        <b>Ольга Васильева</b>
        <span class="hf-badge hf-badge--green">Заказчик</span>
      </span>`,
    body: `
      <ul class="st-dialog-meta">
        <li>${HF.icon('mail')}ov@refni.ru</li>
        <li class="is-warn">${HF.icon('lock')}Двухфакторная аутентификация не включена
          <span class="st-hint" aria-hidden="true">?</span></li>
      </ul>
      ${PREFS('person')}`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>
      <button class="st-danger" type="button" data-hf-close>Удалить</button>`,
  },
  /* Свою карточку управляющий рекрутер не настраивает: в ней только
     почта и двухфакторка, приватности и уведомлений нет */
  self: {
    head: `
      <span class="st-dialog-pic">${HF.icon('userpic', 34)}</span>
      <span class="st-dialog-name">
        <b>Юджин</b>
        <span class="hf-badge hf-badge--green">Управляющий рекрутер</span>
      </span>`,
    body: `
      <ul class="st-dialog-meta">
        <li>${HF.icon('mail')}es@refni.ru</li>
        <li class="is-warn">${HF.icon('lock')}Двухфакторная аутентификация не включена
          <span class="st-hint" aria-hidden="true">?</span></li>
      </ul>`,
    foot: '<button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Закрыть</button>',
  },
  /* Приглашение рекрутера — единственное место, где вообще видны
     права. Права выставляются один раз, при отправке приглашения;
     дальше человек либо принял его и стал строкой в списке, либо
     висит в «Отправленных», где ни прав, ни отзыва нет.

     Девять прав из десяти разрешают, и только одно — «Видит
     только свои вакансии» — запрещает. Из-за этого список читается
     наполовину наоборот: снятая галочка рядом с ним означает
     «видит все», а не «ничего не видит».

     Поле «Руководитель» есть на любом тарифе, но открывается
     не списком людей, а рассказом про тариф «Премьер»: команды
     рекрутеров продаются отдельно. */
  'invite-recruiter': {
    title: 'Приглашение нового рекрутера',
    body: `
      <div class="st-fields">
        <label class="hf-field"><span class="hf-label">Эл. почта для приглашения</span>
          <input class="hf-input" type="email"></label>
        <label class="hf-field"><span class="hf-label">ФИО</span>
          <input class="hf-input" type="text"></label>
        <label class="hf-field"><span class="hf-label">Роль</span>
          <select class="hf-select">
            <option>Рекрутер</option>
            <option>Управляющий рекрутер</option>
          </select></label>
        <div class="hf-field">
          <span class="hf-label">Руководитель</span>
          <button class="hf-select st-select-btn" type="button">Без руководителя</button>
          <div class="st-premier">
            <span class="st-promo-badge">Тариф Премьер</span>
            <b class="st-premier-title">Объединяйте рекрутеров в команды</b>
            <p class="st-premier-text">Перейдите на тариф «Премьер», чтобы объединять
              рекрутеров в команды, у каждой из которых есть свой руководитель. Это нужно,
              чтобы в дашборде, поиске и статистике видеть информацию по команде целиком.</p>
            <p class="st-premier-acts">
              <a href="#">Заявка на смену тарифа</a><a href="#">Описание тарифов</a>
            </p>
          </div>
        </div>
      </div>
      <p class="st-prefs-title">Права</p>
      <div class="st-rights">
        ${RIGHTS.map(([name, on]) => `
          <label class="st-check st-check--tight">
            <input type="checkbox"${on ? ' checked' : ''}>${HF.esc(name)}
          </label>`).join('')}
      </div>`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Пригласить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },

  invite: {
    title: 'Приглашение нового заказчика',
    body: `
      <div class="st-fields">
        <label class="hf-field"><span class="hf-label">Эл. почта для приглашения</span>
          <input class="hf-input" type="email"></label>
        <label class="hf-field"><span class="hf-label">ФИО</span>
          <input class="hf-input" type="text"></label>
      </div>
      ${PREFS('invite')}`,
    foot: `
      <button class="hf-btn hf-btn--primary hf-btn--l" type="button" data-hf-close>Сохранить</button>
      <button class="hf-btn hf-btn--secondary hf-btn--l" type="button" data-hf-close>Отмена</button>`,
  },
});
