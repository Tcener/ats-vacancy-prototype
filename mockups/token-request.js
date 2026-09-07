/* Страница получения токена API — та, что открывается по ссылке.

   Находка про модель, а не про вёрстку: тот, кто заводит токен,
   сам его никогда не видит. В приложении администратор получает
   ссылку на три рабочих дня и передаёт её разработчику; ключ
   существует только у получателя. Это заметно аккуратнее обычного
   «скопируйте ключ и перешлите» — секрет не оседает в переписке.

   Второе: токен на самом деле пара. Access и refresh, по 64 символа,
   каждый со своей кнопкой копирования. Одно имя в списке настроек —
   упрощение интерфейса, а не устройство.

   Третье, и самое неудобное: ссылка одноразовая, но в списке токенов
   это никак не отражается. Администратор не может узнать, забрал
   разработчик ключ или ссылка протухла неиспользованной.

   Оболочку HF здесь не монтируем — приложения вокруг нет.

   Значения вымышленные, структура — снятая в песочнице 3 сентября 2026. */

/* Длина настоящая, 64 символа. Значения выдуманы: настоящие ключи
   в репозиторий не кладём даже из песочницы */
const ACCESS = 'aG9sZGVyX2FjY2Vzc190b2tlbl9tb2NrX3ZhbHVlX2Zvcl9sYXlvdXRfMDAwMQ';
const REFRESH = 'aG9sZGVyX3JlZnJlc2hfdG9rZW5fbW9ja192YWx1ZV9mb3JfbGF5b3V0XzAwMDI';

const title = 'Получение токена API Хантфлоу';

/* Шаг первый. Никаких полей и никакого выбора: страница знает,
   какой токен выдаёт, из самой ссылки */
const paneOffer = () => `
  <h1 class="ra-title">${title}</h1>
  <p class="tr-note">Токен можно получить один раз</p>
  <div class="ra-actions">
    <a class="ra-btn ra-btn--ok" href="#issued" data-tr-go="#issued">Получить токен</a>
  </div>`;

/* Поле с ключом: подпись, значение и «Копировать» справа.
   Значение показывается целиком — прятать его звёздочками
   здесь не от кого, страницу и так открыл получатель */
const field = (label, value) => `
  <div class="tr-field">
    <span class="hf-label">${HF.esc(label)}</span>
    <div class="tr-row">
      <input class="hf-input tr-value" type="text" value="${HF.esc(value)}" readonly>
      <button class="hf-btn hf-btn--secondary" type="button">Копировать</button>
    </div>
  </div>`;

/* Шаг второй и последний. Кнопки «Готово» нет: закрыть вкладку —
   единственный выход, и после него значения не вернуть */
const paneIssued = () => `
  <h1 class="ra-title">${title}</h1>
  ${field('Access token', ACCESS)}
  ${field('Refresh token', REFRESH)}
  <p class="tr-warn">Скопируйте токены, они отображаются только один раз
    и далее станут недоступны</p>
  <a class="tr-link" href="#">Документация по API Хантфлоу</a>`;

/* Повторный заход. Ни кнопок, ни объяснения, когда именно
   и с какого адреса ссылку использовали */
const paneUsed = () => `
  <h1 class="ra-title">Токен по этой ссылке уже получен</h1>
  <p class="tr-note">При необходимости сгенерируйте новую ссылку на токен
    в интерфейсе Хантфлоу</p>
  <a class="tr-link" href="#">Документация по API Хантфлоу</a>`;

const PANES = {
  '': paneOffer,
  '#issued': paneIssued,
  '#used': paneUsed,
};

const render = () => {
  document.getElementById('token-screen').innerHTML =
    (PANES[location.hash] || PANES[''])();
};

/* Во встроенном предпросмотре переход по href="#…" бывает перехвачен:
   адрес не меняется, hashchange не приходит, и экран выглядит мёртвым.
   Поэтому клик обрабатываем сами, а адрес обновляем по возможности */
addEventListener('click', (e) => {
  const go = e.target.closest('[data-tr-go]');
  if (!go) return;
  e.preventDefault();
  const to = go.dataset.trGo;
  try { history.replaceState(null, '', to); } catch { /* предпросмотр */ }
  document.getElementById('token-screen').innerHTML = (PANES[to] || PANES[''])();
});

addEventListener('hashchange', render);
addEventListener('DOMContentLoaded', render);
