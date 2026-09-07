/* Страница согласования заявки — та, что открывается по ссылке.

   Это самая важная находка всего разбора заявки, и она про модель,
   а не про вёрстку: решение по заявке принимается **вне системы**.
   Кнопка «Скопировать ссылку для согласования» в карточке заявки даёт
   адрес вида /request/vacancy/<токен>, по которому открывается вот эта
   страница. Ни входа, ни пароля, ни проверки личности: кто угодно,
   кому попала ссылка, согласует заявку от имени указанного адреса.

   Отсюда и вёрстка: приложения вокруг нет, только логотип и белый лист
   во всю страницу. Оболочку HF здесь не монтируем — она бы соврала.

   Данные вымышленные, структура — снятая в песочнице 3 сентября 2026. */

const FACTS = [
  ['Отдел, подразделение', 'Разработка'],
  ['Зарплата', '250 000 — 350 000 ₽'],
  ['Обязанности кандидата',
    'Разрабатывать и поддерживать серверную часть, писать тесты, участвовать в ревью.'],
  ['Требования к кандидату',
    'Python или Go от трёх лет, PostgreSQL, опыт работы с очередями.'],
  ['Сколько человек нужно нанять', '2'],
];

/* Многострочные поля идут подписью сверху, короткие — в одну строку.
   Так в оригинале: «Зарплата: 250 000» рядом, обязанности — под подписью */
const fact = ([label, value]) => (value.length > 40
  ? `<p class="ra-fact"><b>${HF.esc(label)}:</b><br>${HF.esc(value)}</p>`
  : `<p class="ra-fact"><b>${HF.esc(label)}:</b> ${HF.esc(value)}</p>`);

const head = `
  <h1 class="ra-title">Согласование заявки на подбор</h1>
  <p class="ra-position">Backend-разработчик</p>
  <div class="ra-author">
    <span class="ra-avatar">${HF.icon('userpic', 24)}</span>
    <span class="ra-author-text">
      <b>es@refni.ru</b>
      <span>es@refni.ru</span>
    </span>
  </div>
  <div class="ra-divider"></div>
  ${FACTS.map(fact).join('')}`;

/* Решение принимается в два клика: сначала кнопка, потом подтверждение
   маленьким окошком под ней. Второй клик — единственная защита
   от случайного согласования, других здесь нет */
const paneDecide = (confirm = null) => `
  ${head}
  <div class="ra-divider"></div>
  <label class="ra-label" for="ra-comment">Комментарий (необязательно)</label>
  <textarea class="ra-comment" id="ra-comment" rows="3">${
  confirm === 'approve' ? 'Согласовано, бюджет подтверждён'
    : confirm === 'reject' ? 'Бюджет на этот квартал не согласован, вернитесь в октябре' : ''}</textarea>
  <div class="ra-actions">
    <a class="ra-btn ra-btn--ok${confirm ? ' is-off' : ''}" href="#confirm">Согласовать</a>
    <a class="ra-btn ra-btn--no${confirm ? ' is-off' : ''}" href="#confirm-reject">Отклонить</a>
  </div>
  ${confirm ? `
    <div class="ra-confirm">
      <p class="ra-confirm-title">${confirm === 'approve'
    ? 'Подтверждение заявки на подбор' : 'Отклонение заявки на подбор'}</p>
      <div class="ra-confirm-actions">
        <a class="ra-btn ra-btn--${confirm === 'approve' ? 'ok' : 'no'}"
           href="#${confirm === 'approve' ? 'approved' : 'rejected'}">${
  confirm === 'approve' ? 'Согласовать' : 'Отклонить'}</a>
        <a class="ra-btn ra-btn--plain" href="#">Отмена</a>
      </div>
    </div>` : ''}`;

/* После решения от заявки не остаётся ничего, кроме итога:
   ни полей, ни возможности передумать */
const paneDone = (ok) => `
  <h1 class="ra-title">${ok ? 'Вы одобрили заявку на подбор' : 'Вы отклонили заявку на подбор'}</h1>
  <p class="ra-position">Backend-разработчик</p>
  <p class="ra-done-note">${ok
    ? 'Согласовано, бюджет подтверждён'
    : 'Бюджет на этот квартал не согласован, вернитесь в октябре'}</p>
  <a class="ra-btn ra-btn--plain" href="#">На главную</a>`;

const PANES = {
  '': () => paneDecide(),
  '#confirm': () => paneDecide('approve'),
  '#confirm-reject': () => paneDecide('reject'),
  '#approved': () => paneDone(true),
  '#rejected': () => paneDone(false),
};

const render = () => {
  document.getElementById('approval-screen').innerHTML =
    (PANES[location.hash] || PANES[''])();
};

addEventListener('hashchange', render);
addEventListener('DOMContentLoaded', render);
