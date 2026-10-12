/* ── Боковая панель: один источник на весь прототип ──────────────
   Раньше панель жила в трёх местах: статикой в ats-product.html,
   в shell.js для страниц-клонов и патчем dashboard-day.js, который
   на Главной переписывал вторую в первую. Теперь разметка одна,
   а страница только говорит, куда ведут ссылки и что подсвечено.

   base='' — внутри SPA, ссылки идут хешем;
   base='ats-product.html?public=071f4207c546' — с обычной страницы, ссылки уводят в SPA. */
window.Sidebar = (() => {
  const NAV = [
    { id: 'home', label: 'Главная', icon: 'home-20', href: 'dashboard.html?public=cb7a70f4cca9', route: 'dashboard' },
    { id: 'search', label: 'Поиск', icon: 'search-20', route: 'search' },
    { id: 'tasks', label: 'Мои задачи', icon: 'check', route: 'tasks', count: 7 },
    { id: 'calendar', label: 'Календарь', icon: 'calendar-20', sleeping: true },
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
  const outlineIcons={
    'home-20':'<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3z"/>',
    'search-20':'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    'calendar-20':'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 2v6M16 2v6M4 11h16"/>',
    'graph-20':'<path d="M4 3v17h17M8 16V9M13 16V5M18 16v-5"/>',
    'settings':'<circle cx="12" cy="12" r="3"/><path d="m10 2-1 3-3 1-3 3 2 3-2 3 3 3 3 1 1 3h4l1-3 3-1 3-3-2-3 2-3-3-3-3-1-1-3z"/>',
    'edit-2-20':'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/>',
    'folder-20':'<path d="M3 6h7l2 3h9v11H3z"/>'
  };
  const icon = name => name === 'check' ? CHECK : outlineIcons[name]?`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${outlineIcons[name]}</svg>`:`<svg class="nav-icon"><use href="assets/icons.svg?public=4ea628562901#${name}"></use></svg>`;

  const navItem = (item, base, active) => {
    if (item.sleeping) return `<button type="button" class="nav-item" data-sidebar-sleep aria-disabled="true" aria-describedby="sidebar-calendar-tooltip">${icon(item.icon)}<span>Календарь</span></button>`;
    const href = item.href ?? `${base}#${item.route}`;
    const route = item.route ? ` data-route="${item.route}"` : '';
    const count = item.count ? `<span class="nav-count">${item.count}</span>` : '';
    return `<a class="nav-item${item.id === active ? ' active' : ''}" href="${href}"${route} title="${esc(item.label)}">${icon(item.icon)}<span>${esc(item.label)}</span>${count}</a>`;
  };

  const html = ({ base = '', active = '' } = {}) => `
    <div class="sidebar-brand-row"><a class="brand" href="dashboard.html?public=cb7a70f4cca9" data-route="dashboard" aria-label="Собесо — главная"><img src="assets/logo-sobesso.png?public=11fd3378f3b0" alt="Собесо"></a><button type="button" class="sidebar-collapse" data-sidebar-collapse aria-label="Свернуть меню" aria-expanded="true"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14m6-9 2 2-2 2"/></svg></button></div>
    <div class="sidebar-scroll">
    <nav class="main-nav" id="main-nav">${NAV.map(i => navItem(i, base, active)).join('')}</nav>
    <section class="vacancy-nav">
      <div class="vacancy-nav-title">${icon('folder-20')}<b>Мои вакансии</b></div>
      ${VACANCIES.map(([id, name]) => `<a class="vacancy-link" href="${base}#vacancy/${id}" data-route="vacancy/${id}">${esc(name)}</a>`).join('')}
      <a class="vacancy-link archive" href="${base}#portfolio" data-route="portfolio">${icon('archive-2-20')}Архив</a>
    </section></div>
    <div class="fab-row">
      <button class="fab" id="create-fab" aria-label="Создать"><span class="fab-plus" aria-hidden="true">+</span><span class="fab-label">Создать</span></button>
      <!-- ИИ-ассистент: гусь стоит в меню рядом с «Создать», а не плавает поверх листа -->
      <button class="ai-mascot-fab" id="ai-fab" data-sb-ai-open data-antd="none" aria-label="Открыть ИИ-ассистента Собесо" title="ИИ-ассистент">✦</button>
    </div>
    <!-- Переключатель режима — инструмент демо, а не часть продукта: бледная строка под «Создать» -->
    <div class="sidebar-demo-footer"><span>Демонстрационный стенд</span><span>↪</span></div><div id="pm-slot"></div><div class="sidebar-resizer" data-sidebar-resizer role="separator" aria-label="Ширина меню" aria-orientation="vertical" aria-valuemin="200" aria-valuemax="380" aria-valuenow="232" tabindex="0"></div>`;

  const scriptURL = document.currentScript?.src || document.baseURI;
  function ensureStyles() {
    if (document.getElementById('unified-sidebar-styles')) return;
    const link = document.createElement('link'); link.id = 'unified-sidebar-styles';
    link.rel = 'stylesheet'; link.href = new URL('unified-navigation.css?public=8b160816b414',scriptURL).href;
    document.head.append(link);
  }
  function updateCollapse() {
    const collapsed = document.body.classList.contains('sidebar-is-collapsed');
    document.querySelectorAll('[data-sidebar-collapse]').forEach(button=>{
      button.setAttribute('aria-label',collapsed?'Развернуть меню':'Свернуть меню');
      button.setAttribute('aria-expanded',String(!collapsed));
    });
  }
  let expandedWidth=232,resizeStart=null;
  function saveLayout(){try{sessionStorage.setItem('sobesso-unified-sidebar-v1',JSON.stringify({collapsed:document.body.classList.contains('sidebar-is-collapsed'),width:expandedWidth}));}catch(_){}}
  function setWidth(value){expandedWidth=Math.max(200,Math.min(380,Math.round(Number(value)||232)));document.body.style?.setProperty?.('--unified-expanded-width',`${expandedWidth}px`);document.querySelectorAll('[data-sidebar-resizer]').forEach(node=>node.setAttribute('aria-valuenow',String(expandedWidth)));saveLayout();hideHint();}
  function calendarHint(anchor) {
    let hint = document.getElementById('sidebar-calendar-tooltip');
    if (!hint) {hint = document.createElement('div');hint.id='sidebar-calendar-tooltip';hint.className='sidebar-sleep-tooltip';hint.setAttribute('role','tooltip');hint.textContent='функционал еще спит';document.body.append(hint);}
    const rect = anchor.getBoundingClientRect();hint.hidden=false;
    hint.style.left=`${Math.min(rect.right+10,Math.max(8,window.innerWidth-195))}px`;
    hint.style.top=`${Math.max(8,Math.min(rect.top+(rect.height-32)/2,window.innerHeight-40))}px`;
  }
  function hideHint() {const hint=document.getElementById('sidebar-calendar-tooltip');if(hint)hint.hidden=true;}
  document.addEventListener('click',event=>{
    const sleeping=event.target.closest?.('[data-sidebar-sleep]');
    if(sleeping){event.preventDefault();event.stopImmediatePropagation();calendarHint(sleeping);return;}
    if(event.target.closest?.('[data-sidebar-collapse]')){
      event.preventDefault();event.stopImmediatePropagation();hideHint();
      document.body.classList.toggle('sidebar-is-collapsed');updateCollapse();
      saveLayout();
      window.dispatchEvent(new Event('sidebar-layout-change'));return;
    }
    hideHint();
  },true);
  document.addEventListener('pointerover',event=>{const anchor=event.target.closest?.('[data-sidebar-sleep]');if(anchor)calendarHint(anchor);});
  document.addEventListener('pointerout',event=>{if(event.target.closest?.('[data-sidebar-sleep]')&&!event.relatedTarget?.closest?.('[data-sidebar-sleep]'))hideHint();});
  document.addEventListener('focusin',event=>{const anchor=event.target.closest?.('[data-sidebar-sleep]');if(anchor)calendarHint(anchor);});
  document.addEventListener('focusout',event=>{if(event.target.closest?.('[data-sidebar-sleep]'))hideHint();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hideHint();if(event.target.matches?.('[data-sidebar-resizer]')&&['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();setWidth(event.key==='Home'?232:expandedWidth+(event.key==='ArrowLeft'?-8:8));}});
  document.addEventListener('pointerdown',event=>{const node=event.target.closest?.('[data-sidebar-resizer]');if(node){resizeStart={x:event.clientX,width:expandedWidth};node.setPointerCapture(event.pointerId);event.preventDefault();}});
  document.addEventListener('pointermove',event=>{if(resizeStart)setWidth(resizeStart.width+event.clientX-resizeStart.x);});
  document.addEventListener('pointerup',()=>{resizeStart=null;});document.addEventListener('pointercancel',()=>{resizeStart=null;});
  document.addEventListener('dblclick',event=>{if(event.target.matches?.('[data-sidebar-resizer]'))setWidth(232);});
  try{const state=JSON.parse(sessionStorage.getItem('sobesso-unified-sidebar-v1')||'null');if(state?.collapsed)document.body.classList.add('sidebar-is-collapsed');if(Number.isFinite(state?.width))expandedWidth=Math.max(200,Math.min(380,state.width));}catch(_){}
  document.body.style?.setProperty?.('--unified-expanded-width',`${expandedWidth}px`);
  window.addEventListener?.('hashchange',hideHint);window.addEventListener?.('resize',hideHint);

  /* Страница-клон отдаёт свой контейнер: снимаем с него оболочку Хантфлоу
     и ставим нашу, вместе с шириной — там родитель flex, а не сетка. */
  function mount(el, opts = {}) {
    const node = typeof el === 'string' ? document.querySelector(el) : el;
    if (!node) return null;
    node.className = 'sidebar' + (opts.inFlex ? ' in-flex' : '');
    node.setAttribute('data-unified-sidebar','');node.setAttribute('data-antd','none');
    node.setAttribute('aria-label', 'Основная навигация');
    node.innerHTML = html(opts);
    ensureStyles();updateCollapse();node.querySelector('[data-sidebar-resizer]')?.setAttribute('aria-valuenow',String(expandedWidth));
    window.ProductMode?.mount();
    window.ProductMode?.decorate(location.hash.slice(1) || '');
    return node;
  }

  /* Вне SPA кнопка «+» ведёт туда, где живёт создание. */
  document.addEventListener('click', e => {
    if (window.CreateMenu?.isInstalled(document)) return;
    if (!e.target.closest('#create-fab') || document.getElementById('screen')) return;
    location.href = 'ats-product.html?public=071f4207c546#create';
  });

  const auto = document.querySelector('[data-sidebar]');
  if (auto) mount(auto, { base: auto.dataset.sidebarBase || '', active: auto.dataset.sidebarActive || '' });

  return { html, mount, NAV, VACANCIES, calendarHint };
})();
