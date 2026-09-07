/* Экран «Все кандидаты». Оболочку (шапку, сайдбар, меню, модалки)
   строит shell.js — здесь только содержимое экрана. */

/* Демонстрационные данные экрана. Реальные кандидаты из боевой системы сюда
   намеренно не переносятся: структура повторена точно, содержимое вымышлено.
   Сами этапы лежат в оболочке: та же полоса стоит на «Картине дня». */

/* Полоса этапов */
document.getElementById('stage-tabs-row').innerHTML = HF.STAGES.map(([name, count, active]) => `
  <a class="ap-tab${active ? ' is-active' : ''}" href="#stage-${encodeURIComponent(name)}" data-stage="${esc(name)}">
    <span class="ap-tab-in">${esc(name)}<span class="ap-tab-count">${count}</span></span>
  </a>`).join('');

/* Состояние экрана держится в хеше: applicants.html#c5 открывает нужного кандидата */
function apply() {
  const id = location.hash.replace('#', '') || CANDIDATES[0].id;
  const c = CANDIDATES.find(x => x.id === id) || CANDIDATES[0];
  renderList(c.id);
  renderDetail(c);
}
addEventListener('hashchange', apply);

HF.mount({ active: 'applicants' });
apply();

/* Переключение вкладок-этапов и подвкладок карточки */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.ap-tab[data-stage]');
  if (tab) {
    e.preventDefault();
    document.querySelectorAll('.ap-tab[data-stage]').forEach(t => t.classList.toggle('is-active', t === tab));
    return;
  }
  const sub = e.target.closest('.ap-subtab');
  if (sub) {
    sub.parentElement.querySelectorAll('.ap-subtab').forEach(s => s.classList.toggle('is-active', s === sub));
  }
});
