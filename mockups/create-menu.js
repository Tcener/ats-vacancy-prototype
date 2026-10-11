/* Общее немодальное меню создания. Живёт рядом с кнопкой того document,
   где её нажали; выбранный сценарий открывается в основной оболочке. */
window.CreateMenu = (() => {
  'use strict';
  const instances = new WeakMap();
  const triggerSelector = '#create-fab, .sd-side-create, [data-create-menu-trigger]';
  const kinds = ['requisition', 'vacancy', 'candidate'];
  const labels = ['Заявка на вакансию', 'Новая вакансия', 'Добавить кандидата'];
  const descriptions = ['Сформулировать потребность в подборе', 'Настроить новую вакансию', 'Добавить профиль и резюме'];
  const icons = [
    '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v3h4v-3"/>',
    '<circle cx="10" cy="8" r="4"/><path d="M3 21v-2a7 7 0 0 1 11-5M18 14v8M14 18h8"/>'
  ];
  const styleHref = new URL('create-menu.css?public=0e74c56f4c02', document.currentScript?.src || document.baseURI || location.href).href;

  function findTrigger(target) {
    if (!target?.closest) return null;
    const marked = target.closest(triggerSelector);
    if (marked) return marked;
    // У снятой карточки кандидата кнопка ещё без имени класса и id.
    const button = target.closest('button');
    if (!button?.closest('aside[aria-label="Основная навигация"]')) return null;
    return button.textContent.replace(/\s+/g, '').replace(/^\+/, '') === 'Создать' ? button : null;
  }

  function decorate(trigger) {
    trigger.setAttribute('data-create-menu-trigger', '');
    trigger.setAttribute('aria-haspopup', 'menu');
    if (!trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'false');
  }

  function ensureStyles(doc) {
    if (doc.getElementById('create-menu-styles')) return;
    const link = doc.createElement('link');
    link.id = 'create-menu-styles'; link.rel = 'stylesheet'; link.href = styleHref;
    doc.head.append(link);
  }

  function defaultNavigate(doc, route) {
    const view = doc.defaultView || window;
    try {
      if (view.parent && view.parent !== view && view.parent.location.origin === view.location.origin) {
        view.parent.location.hash = route;
        return;
      }
    } catch (_) { /* В чужом frame не управляем страницей владельца. */ }
    if (/\/ats-product\.html$/.test(view.location.pathname || '')) view.location.hash = route;
    else view.location.href = new URL(`ats-product.html?public=f6f1137d9eeb#${route}`, doc.baseURI || view.location.href).href;
  }

  function install(doc = document, options = {}) {
    const existing = instances.get(doc);
    if (existing) { if (typeof options.navigate === 'function') existing.navigate = options.navigate; return existing.api; }
    ensureStyles(doc);
    const view = doc.defaultView || window;
    const state = {anchor:null,menu:null,navigate:options.navigate,observer:null};
    const allTriggers = () => {
      doc.querySelectorAll(triggerSelector).forEach(decorate);
      doc.querySelectorAll('aside[aria-label="Основная навигация"] button').forEach(button => {
        if (findTrigger(button)) decorate(button);
      });
    };
    const items = () => state.menu ? [...state.menu.querySelectorAll('[data-create-kind]')] : [];

    function close(restoreFocus = false) {
      const anchor = state.anchor;
      state.menu?.remove();
      state.menu = null; state.anchor = null;
      if (anchor) { anchor.setAttribute('aria-expanded', 'false'); anchor.removeAttribute('aria-controls'); }
      if (restoreFocus && anchor?.isConnected) anchor.focus();
    }

    function position() {
      if (!state.menu || !state.anchor?.isConnected) { close(); return; }
      const rect = state.anchor.getBoundingClientRect();
      const width = view.innerWidth || doc.documentElement.clientWidth || 1024;
      const height = view.innerHeight || doc.documentElement.clientHeight || 768;
      const available = Math.max(0, Math.min(rect.top, height - 8) - 18);
      state.menu.style.maxHeight = `${available}px`;
      const menuWidth = state.menu.offsetWidth || 296;
      const menuHeight = Math.min(state.menu.offsetHeight || 232, available);
      state.menu.style.left = `${Math.max(8, Math.min(rect.left, width - menuWidth - 8))}px`;
      state.menu.style.top = `${Math.max(8, Math.min(rect.top, height - 8) - menuHeight - 10)}px`;
    }

    function open(anchor, initialIndex = 0) {
      if (!anchor || anchor.disabled) return;
      if (state.anchor === anchor) { close(true); return; }
      close(); decorate(anchor);
      const menu = doc.createElement('div');
      menu.id = 'create-menu-popover'; menu.className = 'create-menu';
      menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Создать');
      menu.setAttribute('data-antd', 'none');
      menu.innerHTML = kinds.map((kind, index) => `<button type="button" class="create-menu-item" role="menuitem" tabindex="-1" data-create-kind="${kind}"><span class="create-menu-icon ${kind}" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[index]}</svg></span><span class="create-menu-copy"><span class="create-menu-title">${labels[index]}</span><span class="create-menu-description">${descriptions[index]}</span></span></button>`).join('');
      state.anchor = anchor; state.menu = menu; doc.body.append(menu);
      anchor.setAttribute('aria-expanded', 'true'); anchor.setAttribute('aria-controls', menu.id);
      position(); items()[initialIndex]?.focus();
    }

    function choose(kind) {
      if (!kinds.includes(kind)) return;
      close();
      const route = `create/${kind}`;
      if (typeof state.navigate === 'function') state.navigate(route);
      else defaultNavigate(doc, route);
    }

    function click(event) {
      const trigger = findTrigger(event.target);
      if (trigger) {
        event.preventDefault(); event.stopImmediatePropagation();
        open(trigger); return;
      }
      const item = event.target.closest?.('[data-create-kind]');
      if (item && state.menu?.contains(item)) {
        event.preventDefault(); event.stopImmediatePropagation(); choose(item.dataset.createKind); return;
      }
      if (state.menu && !state.menu.contains(event.target)) close();
    }

    function keydown(event) {
      const trigger = findTrigger(event.target);
      if (trigger && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (state.anchor === trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) items()[event.key === 'ArrowUp' ? 2 : 0]?.focus();
        else open(trigger, event.key === 'ArrowUp' ? 2 : 0);
        return;
      }
      if (!state.menu) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(true); return; }
      if (event.key === 'Tab') { close(true); return; }
      if (!state.menu.contains(event.target)) return;
      const buttons = items(), current = buttons.indexOf(doc.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
        : event.key === 'ArrowDown' ? (current + 1) % 3 : event.key === 'ArrowUp' ? (current + 2) % 3 : -1;
      if (next >= 0) { event.preventDefault(); event.stopImmediatePropagation(); buttons[next].focus(); }
      else if (['Enter', ' '].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation(); choose(event.target.closest('[data-create-kind]')?.dataset.createKind);
      }
    }

    const onHashChange = () => close();
    doc.addEventListener('click', click, true);
    doc.addEventListener('keydown', keydown, true);
    doc.addEventListener('scroll', position, true);
    view.addEventListener('resize', position);
    view.addEventListener('hashchange', onHashChange);
    try {
      if (view.parent !== view && view.parent.location.origin === view.location.origin) view.parent.addEventListener?.('hashchange', onHashChange);
    } catch (_) { /* Для чужого frame остаются события его собственного document. */ }
    if (view.MutationObserver) {
      state.observer = new view.MutationObserver(() => {
        if (state.anchor && !state.anchor.isConnected) close();
        allTriggers();
      });
      state.observer.observe(doc.body, {childList:true,subtree:true});
    }
    allTriggers();
    state.api = {open,close,isOpen:() => !!state.menu};
    instances.set(doc, state);
    return state.api;
  }

  const api = {install,isInstalled:doc => instances.has(doc)};
  install(document);
  return api;
})();
