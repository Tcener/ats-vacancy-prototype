/* ── Боковая панель: один источник на весь прототип ──────────────
   Раньше панель жила в трёх местах: статикой в ats-product.html,
   в shell.js для страниц-клонов и патчем dashboard-day.js, который
   на Главной переписывал вторую в первую. Теперь разметка одна,
   а страница только говорит, куда ведут ссылки и что подсвечено.

   base='' — внутри SPA, ссылки идут хешем;
   base='ats-product.html?public=19d1ad2510ee' — с обычной страницы, ссылки уводят в SPA. */
window.Sidebar = (() => {
  const NAV = [
    { id: 'home', label: 'Главная', icon: 'home-20', href: 'dashboard.html?public=509f70c12929' },
    { id: 'search', label: 'Поиск', icon: 'search-20', route: 'search' },
    { id: 'tasks', label: 'Мои задачи', icon: 'check', route: 'tasks', count: 7 },
    { id: 'calendar', label: 'Календарь', icon: 'calendar-20', route: 'calendar' },
    { id: 'analytics', label: 'Аналитика', icon: 'graph-20', route: 'analytics' },
    { id: 'requisitions', label: 'Заявки', icon: 'edit-2-20', route: 'requisitions', count: 3 },
    { id: 'settings', label: 'Настройки', icon: 'settings', route: 'settings' }
  ];

  const VACANCIES = [
    ['android', 'Senior Android-разработчик'],
    ['designer', 'Senior Product Designer'],
    ['analyst', 'Data Analyst'],
    ['backend', 'Backend-разработчик Go'],
    ['ios', 'Senior iOS-разработчик']
  ];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* В спрайте значок check — залитый круг с белой галкой: на тёмном меню он выглядел сплошным кружком. */
  const CHECK = '<svg class="nav-icon" viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="m8 12.2 2.8 2.8 5.4-5.6"/></svg>';
  const icon = name => name === 'check' ? CHECK : `<svg class="nav-icon"><use href="assets/icons.svg?public=4ea628562901#${name}"></use></svg>`;

  const navItem = (item, base, active) => {
    const href = item.href ?? `${base}#${item.route}`;
    const route = item.route ? ` data-route="${item.route}"` : '';
    const count = item.count ? `<span class="nav-count">${item.count}</span>` : '';
    return `<a class="nav-item${item.id === active ? ' active' : ''}" href="${href}"${route}>${icon(item.icon)}<span>${esc(item.label)}</span>${count}</a>`;
  };

  const html = ({ base = '', active = '' } = {}) => `
    <a class="brand" href="dashboard.html?public=509f70c12929" aria-label="Собесо — главная"><img src="assets/logo-sobesso.png?public=11fd3378f3b0" alt="Собесо"></a>
    <nav class="main-nav" id="main-nav">${NAV.map(i => navItem(i, base, active)).join('')}</nav>
    <section class="vacancy-nav">
      <div class="vacancy-nav-title">${icon('folder-20')}<b>Мои вакансии</b>${icon('chevron-down-20')}</div>
      ${VACANCIES.map(([id, name]) => `<a class="vacancy-link" href="${base}#vacancy/${id}" data-route="vacancy/${id}">${esc(name)}</a>`).join('')}
      <a class="vacancy-link archive" href="${base}#portfolio" data-route="portfolio">${icon('archive-2-20')}Архив</a>
    </section>
    <div class="fab-row">
      <button class="fab" id="create-fab" aria-label="Создать"><span class="fab-plus" aria-hidden="true">+</span><span class="fab-label">Создать</span></button>
      <!-- ИИ-ассистент: гусь стоит в меню рядом с «Создать», а не плавает поверх листа -->
      <button class="ai-mascot-fab" id="ai-fab" data-sb-ai-open data-antd="none" aria-label="Открыть ИИ-ассистента Собесо" title="ИИ-ассистент"><img src="assets/mascot-sobesso.png?public=93ff3b87fcd3" alt=""></button>
    </div>
    <!-- Переключатель режима — инструмент демо, а не часть продукта: бледная строка под «Создать» -->
    <div id="pm-slot"></div>`;

  /* Страница-клон отдаёт свой контейнер: снимаем с него оболочку Хантфлоу
     и ставим нашу, вместе с шириной — там родитель flex, а не сетка. */
  function mount(el, opts = {}) {
    const node = typeof el === 'string' ? document.querySelector(el) : el;
    if (!node) return null;
    node.className = 'sidebar' + (opts.inFlex ? ' in-flex' : '');
    node.setAttribute('aria-label', 'Основная навигация');
    node.innerHTML = html(opts);
    window.ProductMode?.mount();
    window.ProductMode?.decorate(location.hash.slice(1) || '');
    return node;
  }

  /* Вне SPA кнопка «+» ведёт туда, где живёт создание. */
  document.addEventListener('click', e => {
    if (!e.target.closest('#create-fab') || document.getElementById('screen')) return;
    location.href = 'ats-product.html?public=19d1ad2510ee#create';
  });

  const auto = document.querySelector('[data-sidebar]');
  if (auto) mount(auto, { base: auto.dataset.sidebarBase || '', active: auto.dataset.sidebarActive || '' });

  return { html, mount, NAV, VACANCIES };
})();
