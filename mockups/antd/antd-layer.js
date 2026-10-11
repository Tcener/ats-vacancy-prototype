/* Общий слой Ant Design для макета (карточка 49). Общий файл: проходы по экранам его НЕ правят.
 *
 * Макет собран строками-шаблонами на семи семьях классов (.btn, .ws-btn, .rq-button…).
 * Этот файл — единственное место, где семья превращается в компонент Ant Design:
 * элементу дописываются настоящие классы antd и пометка data-antd / data-antd-props.
 * Старые классы остаются (на них держатся раскладка и обработчики), но их внешний вид
 * проигрывает: старые стили подключены в каскадный слой legacy, antd — вне слоя.
 *
 * Как пользоваться из экрана:
 *   • старый класс семьи (class="btn primary") — переведётся сам, по таблице RULES;
 *   • класс семьи + свои пропсы: <button class="btn" data-antd-props="color=purple variant=solid"> — пропсы из исходника
 *     сильнее выведенных из класса (так ставится фиолетовая кнопка);
 *   • явная пометка без классов antd: <button data-antd="Button" data-antd-props="color=purple variant=solid">
 *     — классы построит слой (умеет Button, Tag, Input, Switch);
 *   • готовая разметка из antd/sample.html с data-antd — слой её не трогает;
 *   • data-antd="none" — не трогать элемент и всё внутри него.
 * Не хватает общего элемента — не править этот файл, а записать в antd/REQUESTS.md.
 */
(function () {
  'use strict';
  const has = (el, ...names) => names.some((n) => el.classList.contains(n));
  const parseProps = (s) => Object.fromEntries((s || '').split(/\s+/).filter(Boolean).map((p) => { const [k, v] = p.split('='); return [k, v === undefined ? true : v]; }));
  const fmtProps = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== '').map(([k, v]) => (v === true ? k : `${k}=${v}`)).join(' ');

  /* ── пропсы → классы antd 6 ─────────────────────────────────────── */
  const TYPE = { primary: ['primary', 'solid'], default: ['default', 'outlined'], dashed: ['default', 'dashed'], text: ['default', 'text'], link: ['link', 'link'] };
  const SIZE = { small: 'sm', large: 'lg' };
  const build = {
    Button(p) {
      const type = p.color || p.variant ? 'default' : p.type || 'default';
      let [color, variant] = TYPE[p.type || 'default'] || TYPE.default;
      if (p.danger) color = 'dangerous';
      if (p.color) color = p.color === 'danger' ? 'dangerous' : p.color;
      if (p.variant) variant = p.variant;
      return ['ant-btn', `ant-btn-${type}`, `ant-btn-color-${color}`, `ant-btn-variant-${variant}`, p.danger && 'ant-btn-dangerous', SIZE[p.size] && `ant-btn-${SIZE[p.size]}`, p.shape && `ant-btn-${p.shape}`, p.icon && 'ant-btn-icon-only', p.block && 'ant-btn-block'];
    },
    Tag: (p) => ['ant-tag', `ant-tag-${p.variant || 'filled'}`, p.color && `ant-tag-${p.color}`],
    Input: (p) => ['ant-input', `ant-input-${p.variant || 'outlined'}`, SIZE[p.size] && `ant-input-${SIZE[p.size]}`, p.status && `ant-input-status-${p.status}`],
    'Input.TextArea': (p) => build.Input(p),
    Switch: (p) => ['ant-switch', p.size === 'small' && 'ant-switch-small', p.checked && 'ant-switch-checked', p.disabled && 'ant-switch-disabled'],
    'Tag.CheckableTag': (p) => ['ant-tag', 'ant-tag-checkable', p.checked && 'ant-tag-checkable-checked'],
  };

  /* ── таблица «семья классов макета → компонент и пропсы» ────────── */
  const tagColor = (el) => (has(el, 'good', 'green', 'hf-badge--green') ? 'success' : has(el, 'warn', 'amber', 'hold', 'distribution', 'hf-badge--orange') ? 'warning' : has(el, 'danger', 'red', 'hf-badge--red') ? 'error' : has(el, 'gray') ? 'default' : has(el, 'purple', 'ws-tag', 'vp-status', 'hf-badge--cyan') ? 'purple' : 'default');
  const wrapLabel = (el, cls) => { if (el.firstElementChild?.classList.contains(cls)) return; const d = document.createElement('div'); d.className = cls; d.append(...el.childNodes); el.append(d); };
  const dialogParts = (kind) => (el) => {
    const q = (s) => [...el.querySelectorAll(s)].filter((x) => x.closest('[class*="-flat"]') === el);
    q(':scope > header, .vs-dialog-head, .hf-modal-head').forEach((h) => { h.classList.add(`ant-${kind}-header`); h.querySelector('h2')?.classList.add(`ant-${kind}-title`); });
    q('.modal-body, .drawer-body, .ws-dialog-body, .an-dialog-body, .vs-dialog-body, .hf-modal-body').forEach((b) => b.classList.add(`ant-${kind}-body`));
    q(':scope > footer, .vs-dialog-foot, .hf-modal-foot').forEach((f) => f.classList.add(`ant-${kind}-footer`));
  };

  const T = ':is(.data-table, .ws-table, .vp-table, .kd-table, .an-table-wrap table)';
  const RULES = [
    { sel: '.btn, .ws-btn, .rq-button, .pm-btn, .vp-btn, .cr-mini, .vs-mini, .hf-btn, .an-apply, .an-reset, .an-head-actions button, .an-dialog footer button, .an-filter-row button',
      c: 'Button',
      props: (el) => ({
        type: has(el, 'primary', 'hf-btn--primary', 'hf-btn--accent', 'an-apply') ? 'primary' : has(el, 'ghost', 'quiet', 'an-reset', 'hf-btn--ghost') ? 'text' : undefined,
        danger: has(el, 'danger', 'hf-btn--danger'),
        size: has(el, 'cr-mini', 'vs-mini', 'tiny', 'hf-btn--s') ? 'small' : has(el, 'hf-btn--l', 'hf-btn--xl') ? 'large' : undefined,
      }) },
    { sel: '.icon-btn, .hf-icon-btn, .an-dialog > header > button', c: 'Button', props: () => ({ type: 'text', icon: true }) },
    { sel: '.vs-stage-btn', c: 'Button', props: () => ({ type: 'text', size: 'small', icon: true }) },
    { sel: '.ws-link, .sb-text-btn, .text-action', c: 'Button', props: () => ({ type: 'link' }) },

    { sel: '.pill, .ws-tag, .rq-status, .vp-status, .hf-badge', c: 'Tag', props: (el) => ({ color: tagColor(el) }) },
    { sel: '.chip, .an-pin', c: 'Tag.CheckableTag', props: (el) => ({ checked: has(el, 'active', 'is-on') }), watch: true },

    { sel: '.vs-switch', c: 'Switch', props: (el) => ({ checked: has(el, 'is-on'), size: 'small', disabled: el.disabled }), watch: true,
      after: (el) => { if (!el.querySelector('.ant-switch-handle')) el.insertAdjacentHTML('afterbegin', '<div class="ant-switch-handle"></div>'); } },

    { sel: '.segments, .vs-seg, .rq-segments, .vp-view-switch, .search-mode-tabs, .an-view-toggle', c: 'Segmented', props: (el) => ({ shape: has(el, 'segments', 'search-mode-tabs') ? 'round' : undefined }),
      classes: (p) => ['ant-segmented', 'ant-segmented-group', p.shape && 'ant-segmented-shape-round'] },
    { sel: ':is(.segments, .vs-seg, .rq-segments, .vp-view-switch, .search-mode-tabs, .an-view-toggle) > button', c: null, watch: true,
      classes: (p, el) => ['ant-segmented-item', has(el, 'active', 'is-on') && 'ant-segmented-item-selected'], after: (el) => wrapLabel(el, 'ant-segmented-item-label') },

    { sel: '.ws-tabs, .vacancy-detail-tabs, .sb-work-tabs', c: 'Tabs', props: () => ({}), classes: () => ['ant-tabs', 'ant-tabs-top', 'ant-tabs-flat'] },
    { sel: ':is(.ws-tabs, .vacancy-detail-tabs, .sb-work-tabs) > button', c: null, watch: true,
      classes: (p, el) => ['ant-tabs-tab', has(el, 'active') && 'ant-tabs-tab-active'], after: (el) => wrapLabel(el, 'ant-tabs-tab-btn') },

    { sel: '.data-table, .ws-table, .vp-table, .kd-table, .an-table-wrap table', c: 'Table', props: (el) => ({ size: has(el, 'vp-table', 'kd-table') ? 'middle' : undefined }),
      classes: (p) => ['ant-table', p.size && `ant-table-${p.size}`],
      after: (el) => el.parentElement?.classList.add('ant-table-wrapper') },
    { sel: `${T} thead`, c: null, classes: () => ['ant-table-thead'] },
    { sel: `${T} tbody`, c: null, classes: () => ['ant-table-tbody'] },
    { sel: `${T} tbody > tr`, c: null, classes: () => ['ant-table-row'] },
    { sel: `${T} :is(th, td)`, c: null, classes: () => ['ant-table-cell'] },

    { sel: '.modal, .ws-dialog, .an-dialog, .vp-dialog, .sb-work-dialog, .sb-ai-dialog, .vs-dialog, .hf-modal', c: 'Modal', props: () => ({}),
      classes: () => ['ant-modal-flat', 'ant-modal-container'], after: dialogParts('modal') },
    { sel: '.drawer', c: 'Drawer', props: () => ({ placement: 'right' }), classes: () => ['ant-drawer-flat'], after: dialogParts('drawer') },
    { sel: '.profile-popover, .stage-change-popover', c: 'Popover', props: () => ({}), classes: () => ['ant-popover-flat', 'ant-popover-container'] },
    { sel: '.pm-menu, .hf-menu', c: 'Dropdown', props: () => ({}), classes: () => ['ant-dropdown-flat', 'ant-dropdown-menu'] },
    { sel: '.pm-option, .hf-menu-item', c: null, classes: () => ['ant-dropdown-menu-item'] },
    { sel: '.toast, .ws-toast, .rq-toast', c: 'message', props: () => ({}), classes: () => ['ant-message-flat', 'ant-message-notice-content'] },

    { sel: '.avatar, .person-avatar, .hf-avatar, .vp-person-avatar, .resume-avatar', c: 'Avatar', props: (el) => ({ size: has(el, 'hf-avatar--xl') ? 'large' : undefined }),
      classes: (p) => ['ant-avatar', 'ant-avatar-circle', p.size === 'large' && 'ant-avatar-lg'] },
    { sel: '.empty, .ws-empty, .rq-empty, .vp-empty, .vp-view-empty, .sb-work-empty, .search-empty, .candidate-empty', c: 'Empty', props: () => ({}), classes: () => ['ant-empty', 'ant-empty-normal'] },

    /* Нативные элементы форм — все разом, какой бы семье ни принадлежала обёртка. */
    { sel: '.rq-search', c: 'Input', props: () => ({ prefix: true }), classes: () => ['ant-input-affix-wrapper', 'ant-input-outlined'] },
    { sel: 'input:not([type=checkbox],[type=radio],[type=range],[type=file],[type=hidden],[type=color],[type=submit],[type=button])', c: 'Input',
      props: (el) => ({ variant: el.closest('.rq-search, .ai-compose, .sb-ai-compose') ? 'borderless' : undefined, type: el.type !== 'text' ? el.type : undefined }), classes: (p) => build.Input(p) },
    { sel: 'textarea', c: 'Input.TextArea', props: (el) => ({ rows: el.rows > 0 ? el.rows : undefined }), classes: (p) => build.Input(p) },
    { sel: 'select', c: 'Select', props: (el) => ({ mode: el.multiple ? 'multiple' : undefined }), classes: () => ['antd-native-select'] },
    { sel: 'input[type=checkbox]', c: 'Checkbox', props: () => ({}), classes: () => ['antd-native-checkbox'] },
    { sel: 'input[type=radio]', c: 'Radio', props: () => ({}), classes: () => ['antd-native-radio'] },
  ];

  /* ── значки вместо символов шрифта ──────────────────────────────
     Макет рисует значки юникодом (× ↑ ✎ ⌕ 🔒…): они кривые, разного веса и размера.
     Текстовый узел, целиком состоящий из такого символа, заменяется на svg в обёртке anticon. */
  const P = (d) => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    close: P('<path d="M18 6 6 18M6 6l12 12"/>'), up: P('<path d="M12 19V5M5 12l7-7 7 7"/>'), down: P('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
    left: P('<path d="M19 12H5M12 19l-7-7 7-7"/>'), right: P('<path d="M5 12h14M12 5l7 7-7 7"/>'), out: P('<path d="M7 17 17 7M7 7h10v10"/>'),
    edit: P('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'), search: P('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'),
    lock: P('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'), chevUp: P('<path d="m18 15-6-6-6 6"/>'), chevDown: P('<path d="m6 9 6 6 6-6"/>'),
    chevRight: P('<path d="m9 18 6-6-6-6"/>'), check: P('<path d="M20 6 9 17l-5-5"/>'), sort: P('<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>'), clip: P('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
    clock: P('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'), plus: P('<path d="M12 5v14M5 12h14"/>'), grid: P('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    mail: P('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'), star: P('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z"/>'), list: P('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    ban: P('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'), pin: P('<path d="M12 17v5M9 3h6l-1 6 4 4v2H6v-2l4-4Z"/>'),
  };
  const GLYPH = { '×': 'close', '✕': 'close', '✖': 'close', '↑': 'up', '↓': 'down', '←': 'left', '→': 'right', '↗': 'out', '✎': 'edit', '⌕': 'search', '🔒': 'lock', '⌃': 'chevUp', '⌄': 'chevDown', '›': 'chevRight', '✓': 'check', '↕': 'sort', '📎': 'clip', '◷': 'clock', '＋': 'plus', '▦': 'grid', '▣': 'grid', '✉': 'mail', '☆': 'star', '☷': 'list', '⊘': 'ban', '📌': 'pin' };
  const GLYPH_RE = new RegExp(`^\\s*(${Object.keys(GLYPH).join('|')})\\uFE0F?\\s*$`, 'u');
  function glyphs(root) {
    if (root.nodeType !== 1 || root.closest('[data-antd="none"], svg, script, style, textarea, [contenteditable]')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) { const m = GLYPH_RE.exec(n.nodeValue); if (m && !n.parentElement.closest('svg, textarea, option, [contenteditable]')) hits.push([n, m[1]]); }
    for (const [n, g] of hits) { const s = document.createElement('span'); s.className = 'anticon antd-glyph'; s.dataset.glyph = g; s.innerHTML = ICON[GLYPH[g]]; n.replaceWith(s); }
  }

  /* ── применение ─────────────────────────────────────────────────── */
  const OWN = Symbol('antd-layer'), CLS = Symbol('antd-layer-classes'), AUTHORED = Symbol('antd-layer-authored');
  const skip = (el) => el.closest('[data-antd="none"], [contenteditable], .ant-select, .ant-picker');

  function apply(el, rule) {
    if (skip(el)) return;
    const mine = el[OWN];
    const explicit = mine ? mine === EXPLICIT : el.hasAttribute('data-antd');
    if (explicit && !mine && /(^|\s)ant-/.test(el.className)) return; // готовая разметка из sample.html
    if (mine && mine !== rule) return; // элемент уже забрало более раннее правило
    // Пропсы, написанные в исходнике рядом с классом семьи (class="btn" data-antd-props="color=purple variant=solid"),
    // сильнее выведенных из класса: так экран выбирает вариант, не трогая этот файл.
    if (!mine && !explicit && el.hasAttribute('data-antd-props')) el[AUTHORED] = parseProps(el.getAttribute('data-antd-props'));
    const props = explicit ? parseProps(el.getAttribute('data-antd-props')) : { ...(rule.props ? rule.props(el) : {}), ...el[AUTHORED] };
    if (el[AUTHORED] && (props.color || props.variant)) delete props.type;
    const name = explicit ? el.getAttribute('data-antd') : rule.c;
    const make = (explicit ? build[name] : rule.classes) || build[name];
    if (!make) return;
    const next = make(props, el).filter(Boolean);
    const prev = el[CLS] || [];
    prev.filter((c) => !next.includes(c)).forEach((c) => el.classList.remove(c));
    next.filter((c) => !el.classList.contains(c)).forEach((c) => el.classList.add(c));
    el[OWN] = rule; el[CLS] = next;
    if (name && !explicit) {
      if (el.getAttribute('data-antd') !== name) el.setAttribute('data-antd', name);
      const s = fmtProps(props);
      if ((el.getAttribute('data-antd-props') || '') !== s) s ? el.setAttribute('data-antd-props', s) : el.removeAttribute('data-antd-props');
    }
    rule.after?.(el);
    if (explicit && name === 'Switch') {
      if (!el.querySelector('.ant-switch-handle')) el.insertAdjacentHTML('afterbegin', '<div class="ant-switch-handle"></div>');
      el.setAttribute('role', 'switch'); el.setAttribute('aria-checked', String(!!props.checked));
    }
  }

  const EXPLICIT = { sel: '[data-antd]:not([data-antd="none"])' };
  function upgrade(root, deep = true) {
    if (root.nodeType !== 1) return;
    if (deep) glyphs(root);
    for (const rule of [EXPLICIT, ...RULES]) {
      if (root.matches(rule.sel)) apply(root, rule);
      if (deep) root.querySelectorAll(rule.sel).forEach((el) => apply(el, rule));
    }
  }

  // Наблюдатель стоит с самого начала разбора страницы: элемент получает классы antd
  // в той же микрозадаче, в которой появился, — до первой отрисовки, без мигания.
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => (n.nodeType === 3 ? n.parentElement && glyphs(n.parentElement) : upgrade(n)));
      else if (m.target[OWN]?.watch) apply(m.target, m.target[OWN]); // active / is-on переключили классом
      else if (!m.target[OWN]) upgrade(m.target, false);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
  // Единственное поведение слоя: переключатель из явной пометки щёлкает сам (пропс checked в пометке).
  document.addEventListener('click', (e) => {
    const sw = e.target.closest?.('[data-antd="Switch"]');
    if (!sw || sw[OWN] !== EXPLICIT || sw.disabled) return;
    const p = parseProps(sw.getAttribute('data-antd-props'));
    p.checked = !p.checked;
    sw.setAttribute('data-antd-props', fmtProps(p));
    apply(sw, EXPLICIT);
    sw.dispatchEvent(new CustomEvent('antd-change', { bubbles: true, detail: { checked: p.checked } }));
  });
  window.AntdLayer = { RULES, build, upgrade };
  if (document.body) upgrade(document.body);
})();
