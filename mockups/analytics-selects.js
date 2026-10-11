/* Фирменные списки поверх native select: события и значения остаются у исходного поля. */
(() => {
  'use strict';
  const documents = new WeakMap();
  let sequence = 0;
  const normalize = value => String(value || '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  const optionsFor = select => [...select.options].map((option, index) => ({
    index, value: option.value, label: option.label || option.textContent || '',
    disabled: !!option.disabled || !!option.parentElement?.disabled,
    group: option.parentElement?.tagName === 'OPTGROUP' ? option.parentElement.label : '',
    selected: index === select.selectedIndex
  }));
  const filterOptions = (options, query) => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return options.filter(option => terms.every(term => normalize(`${option.label} ${option.group || ''}`).includes(term)));
  };
  function nextIndex(options, current, direction) {
    const available = options.filter(option => !option.disabled);
    if (!available.length) return -1;
    if (direction === 'first') return available[0].index;
    if (direction === 'last') return available.at(-1).index;
    const position = available.findIndex(option => option.index === current);
    if (position < 0) return direction > 0 ? available[0].index : available.at(-1).index;
    return available[(position + direction + available.length) % available.length].index;
  }
  function popupPosition(rect, viewportWidth, viewportHeight, measuredHeight) {
    const padding = 12, gap = 6;
    const width = Math.max(1, Math.min(Math.max(rect.width, 240), viewportWidth - padding * 2));
    const below = Math.max(0, viewportHeight - rect.bottom - padding - gap);
    const above = Math.max(0, rect.top - padding - gap);
    const useBelow = below >= Math.min(measuredHeight, 180) || below >= above;
    const maxHeight = Math.max(1, Math.min(330, useBelow ? below : above, viewportHeight - padding * 2));
    const height = Math.min(measuredHeight, maxHeight);
    return {
      width, maxHeight,
      left: Math.max(padding, Math.min(rect.left, viewportWidth - width - padding)),
      top: Math.max(padding, Math.min(useBelow ? rect.bottom + gap : rect.top - gap - height, viewportHeight - height - padding))
    };
  }
  function make(doc, tag, className, attributes = {}) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }
  const set = (element, key, value) => {
    const text = String(value);
    if (element.getAttribute(key) !== text) element.setAttribute(key, text);
  };
  function fieldLabel(select) {
    const labelledBy = select.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labels = labelledBy.split(/\s+/).map(id => select.ownerDocument.getElementById(id)?.textContent?.trim()).filter(Boolean);
      if (labels.length) return labels.join(' ');
    }
    return select.getAttribute('aria-label') || select.labels?.[0]?.querySelector(':scope > span')?.textContent?.trim() || select.name || 'Выбор варианта';
  }
  const identity = select => [select.id, select.getAttribute('aria-label'), select.name, select.dataset.adFilter, select.dataset.adSection, select.dataset.adLocalkey].join('|');
  function refresh(record) {
    const {select, button, value} = record;
    const selected = select.options[select.selectedIndex];
    const label = selected?.label || selected?.textContent || 'Выберите вариант';
    if (value.textContent !== label) value.textContent = label;
    button.disabled = select.disabled;
    record.wrapper.classList.toggle('is-disabled', select.disabled);
    set(button, 'aria-label', fieldLabel(select));
    set(button, 'data-ad-select-label', fieldLabel(select));
    set(button, 'aria-required', select.required);
    set(button, 'title', label);
    if (select.validity?.valid) button.removeAttribute('aria-invalid');
    if (record.docState.open?.record === record && select.disabled) close(record.docState);
  }
  function close(state, restoreFocus = false) {
    const open = state.open;
    if (!open) return;
    state.open = null;
    open.popup.remove();
    set(open.record.button, 'aria-expanded', false);
    open.record.button.removeAttribute('aria-activedescendant');
    open.record.wrapper.classList.remove('is-open');
    if (restoreFocus && open.record.button.isConnected && !open.record.button.disabled) open.record.button.focus({preventScroll:true});
  }
  function position(state) {
    const open = state.open;
    if (!open) return;
    if (!open.record.select.isConnected) { close(state); return; }
    const view = state.doc.defaultView;
    const rect = open.record.button.getBoundingClientRect();
    const size = popupPosition(rect, view.innerWidth, view.innerHeight, Math.min(330, open.popup.scrollHeight || 330));
    Object.assign(open.popup.style, {width:`${size.width}px`, left:`${size.left}px`, top:`${size.top}px`, maxHeight:`${size.maxHeight}px`});
  }
  function activate(state, index, scroll = true) {
    const open = state.open;
    if (!open) return;
    open.active = index;
    open.list.querySelectorAll('[data-ad-option]').forEach(option => {
      const active = Number(option.dataset.adOption) === index;
      option.classList.toggle('is-active', active);
      if (active) {
        const activeId = option.id;
        set(open.record.button, 'aria-activedescendant', activeId);
        if (open.search) set(open.search, 'aria-activedescendant', activeId);
        if (scroll) option.scrollIntoView({block:'nearest'});
      }
    });
    if (index < 0) {
      open.record.button.removeAttribute('aria-activedescendant');
      open.search?.removeAttribute('aria-activedescendant');
    }
  }
  function renderOptions(state) {
    const open = state.open;
    if (!open) return;
    open.filtered = filterOptions(optionsFor(open.record.select), open.search?.value || '');
    open.list.replaceChildren();
    let group = '';
    for (const option of open.filtered) {
      if (option.group && option.group !== group) {
        const heading = make(state.doc, 'div', 'ad-select-group', {role:'presentation'});
        heading.textContent = option.group; open.list.append(heading);
      }
      group = option.group;
      const item = make(state.doc, 'div', 'ad-select-option', {
        id:`${open.record.listId}-option-${option.index}`, role:'option', 'aria-selected':option.selected, 'aria-disabled':option.disabled,
        'data-ad-option':option.index
      });
      const label = make(state.doc, 'span', 'ad-select-option-label'); label.textContent = option.label;
      const check = make(state.doc, 'span', 'ad-select-check', {'aria-hidden':'true'}); check.textContent = option.selected ? '✓' : '';
      item.append(label, check); open.list.append(item);
    }
    open.empty.hidden = !!open.filtered.length;
    activate(state, open.filtered.some(option => option.index === open.active && !option.disabled) ? open.active : nextIndex(open.filtered, -1, 'first'), false);
    position(state);
  }
  function openList(record, searchFocus = false) {
    const state = record.docState;
    if (record.select.disabled) return;
    if (state.open?.record === record) { close(state, true); return; }
    close(state);
    const popup = make(state.doc, 'div', 'ad-select-popup');
    const list = make(state.doc, 'div', 'ad-select-options', {id:record.listId, role:'listbox', 'aria-label':fieldLabel(record.select)});
    let search = null;
    if (record.select.options.length > 10) {
      search = make(state.doc, 'input', 'ad-select-search', {type:'search', placeholder:'Найти в списке…', 'aria-label':`Найти вариант: ${fieldLabel(record.select)}`, 'aria-controls':record.listId, autocomplete:'off'});
      popup.append(search);
    }
    const empty = make(state.doc, 'div', 'ad-select-empty', {role:'status'}); empty.textContent = 'Ничего не найдено'; empty.hidden = true;
    popup.append(list, empty); state.doc.body.append(popup);
    state.open = {record, popup, list, search, empty, active:record.select.selectedIndex, filtered:[]};
    set(record.button, 'aria-expanded', true); record.wrapper.classList.add('is-open');
    renderOptions(state);
    if (searchFocus && search) search.focus({preventScroll:true});
    else record.button.focus({preventScroll:true});
  }
  function choose(state, index) {
    const open = state.open;
    const option = optionsFor(open?.record.select || {options:[]}).find(row => row.index === index);
    if (!open || !option || option.disabled) return;
    const {select} = open.record;
    const key = identity(select), changed = select.selectedIndex !== index;
    select.selectedIndex = index;
    refresh(open.record); close(state, true);
    if (changed) {
      select.dispatchEvent(new state.doc.defaultView.Event('input', {bubbles:true}));
      select.dispatchEvent(new state.doc.defaultView.Event('change', {bubbles:true}));
      // Контроллер может целиком перерисовать экран во время change.
      if (!select.isConnected) {
        enhance(state.doc);
        const replacement = [...state.records].find(record => record.select.isConnected && identity(record.select) === key);
        if (replacement && state.doc.activeElement === state.doc.body) replacement.button.focus({preventScroll:true});
      }
    }
  }
  function handleKey(state, event) {
    const target = event.target;
    const record = state.buttons.get(target.closest?.('.ad-select-trigger'));
    const insideSearch = state.open?.search === target;
    if (!record && !insideSearch) return;
    const current = record || state.open.record;
    if (event.key === 'Tab') { close(state); return; }
    if (event.key === 'Escape' && state.open) {
      event.preventDefault(); event.stopPropagation(); close(state, true); return;
    }
    const movement = {ArrowDown:1, ArrowUp:-1, Home:'first', End:'last'}[event.key];
    if (movement !== undefined) {
      event.preventDefault(); event.stopPropagation();
      if (!state.open || state.open.record !== current) openList(current);
      if (state.open) activate(state, nextIndex(state.open.filtered, state.open.active, movement));
      return;
    }
    if (event.key === 'Enter' || (event.key === ' ' && !insideSearch)) {
      event.preventDefault(); event.stopPropagation();
      if (state.open?.record === current) choose(state, state.open.active);
      else openList(current);
      return;
    }
    if (!insideSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); event.stopPropagation();
      if (!state.open || state.open.record !== current) openList(current);
      if (state.open?.search) {
        state.open.search.value += event.key; state.open.search.focus({preventScroll:true}); renderOptions(state);
      } else if (state.open) {
        const now = Date.now(); state.typeahead = now - (state.lastType || 0) < 700 ? state.typeahead + event.key : event.key;
        state.lastType = now;
        const matching = state.open.filtered.find(option => !option.disabled && normalize(option.label).startsWith(normalize(state.typeahead)));
        if (matching) activate(state, matching.index);
      }
    }
  }
  function createState(doc) {
    const state = {doc, records:new Set(), selects:new WeakMap(), buttons:new WeakMap(), open:null, observer:null, queued:false, typeahead:'', lastType:0};
    state.handlers = {
      click:event => {
        const trigger = event.target.closest?.('.ad-select-trigger'), record = state.buttons.get(trigger) || state.selects.get(event.target);
        if (record) { event.preventDefault(); openList(record, true); return; }
        const option = event.target.closest?.('[data-ad-option]');
        if (option && state.open?.popup.contains(option)) { event.preventDefault(); choose(state, Number(option.dataset.adOption)); return; }
        if (state.open && !state.open.popup.contains(event.target)) close(state);
      },
      keydown:event => handleKey(state, event),
      input:event => { if (state.open?.search === event.target) renderOptions(state); },
      change:event => { const record = state.selects.get(event.target); if (record) refresh(record); },
      pointermove:event => {
        const option = event.target.closest?.('[data-ad-option]');
        if (option && state.open?.popup.contains(option) && option.getAttribute('aria-disabled') !== 'true') activate(state, Number(option.dataset.adOption), false);
      },
      invalid:event => { const record = state.selects.get(event.target); if (record) { event.preventDefault(); set(record.button, 'aria-invalid', true); record.button.focus(); } },
      reposition:event => { if (!state.open?.popup.contains(event.target)) position(state); }
    };
    for (const name of ['click','input','change','pointermove']) doc.addEventListener(name, state.handlers[name]);
    doc.addEventListener('keydown', state.handlers.keydown, true);
    doc.addEventListener('invalid', state.handlers.invalid, true);
    doc.defaultView.addEventListener('resize', state.handlers.reposition);
    doc.addEventListener('scroll', state.handlers.reposition, true);
    if (doc.defaultView.MutationObserver) {
      state.observer = new doc.defaultView.MutationObserver(mutations => {
        const relevant = mutations.some(mutation => {
          if (mutation.type === 'attributes') return ['SELECT','OPTION','OPTGROUP'].includes(mutation.target.tagName);
          return !mutation.target.closest?.('.ad-select-popup') && !mutation.target.closest?.('.ad-select-trigger');
        });
        if (!relevant || state.queued) return;
        state.queued = true;
        (doc.defaultView.queueMicrotask || queueMicrotask)(() => { state.queued = false; if (documents.get(doc) === state) enhance(doc); });
      });
      state.observer.observe(doc.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['disabled','required','selected','value','label','aria-label','aria-labelledby','multiple']});
    }
    documents.set(doc, state); return state;
  }
  function enhance(root = document) {
    const doc = root.nodeType === 9 ? root : root.ownerDocument;
    if (!doc?.defaultView) return;
    const state = documents.get(doc) || createState(doc);
    for (const record of state.records) {
      if (!record.select.isConnected) { if (state.open?.record === record) close(state); state.records.delete(record); continue; }
      refresh(record);
    }
    const selects = root.matches?.('select') ? [root] : [...root.querySelectorAll('select')];
    for (const select of selects) {
      if (state.selects.has(select) || select.multiple || select.hidden || select.dataset.adNative === 'true') continue;
      const original = {tabindex:select.getAttribute('tabindex'), ariaHidden:select.getAttribute('aria-hidden')};
      const wrapper = make(doc, 'span', 'ad-select');
      const button = make(doc, 'button', 'ad-select-trigger', {type:'button', role:'combobox', 'aria-haspopup':'listbox', 'aria-expanded':false});
      const value = make(doc, 'span', 'ad-select-value');
      const chevron = make(doc, 'span', 'ad-select-chevron', {'aria-hidden':'true'});
      chevron.textContent = '⌄';
      const listId = `ad-select-list-${++sequence}`; set(button, 'aria-controls', listId);
      button.append(value, chevron);
      select.before(wrapper); wrapper.append(select, button);
      select.classList.add('ad-select-native'); select.setAttribute('tabindex','-1'); select.setAttribute('aria-hidden','true');
      const record = {select, button, value, wrapper, listId, original, docState:state};
      state.records.add(record); state.selects.set(select, record); state.buttons.set(button, record); refresh(record);
    }
    if (state.open) renderOptions(state);
  }
  function destroy(doc = document) {
    const state = documents.get(doc); if (!state) return;
    close(state); state.observer?.disconnect();
    for (const name of ['click','input','change','pointermove']) doc.removeEventListener(name, state.handlers[name]);
    doc.removeEventListener('keydown', state.handlers.keydown, true); doc.removeEventListener('invalid', state.handlers.invalid, true);
    doc.removeEventListener('scroll', state.handlers.reposition, true); doc.defaultView.removeEventListener('resize', state.handlers.reposition);
    for (const record of state.records) {
      const {select, wrapper, original} = record;
      if (wrapper.isConnected) { wrapper.before(select); wrapper.remove(); }
      select.classList.remove('ad-select-native');
      for (const [attribute, value] of [['tabindex',original.tabindex],['aria-hidden',original.ariaHidden]]) {
        if (value === null) select.removeAttribute(attribute); else select.setAttribute(attribute, value);
      }
    }
    documents.delete(doc);
  }
  window.AnalyticsSelects = Object.freeze({
    enhance, install:enhance, destroy,
    close:(doc = document) => { const state = documents.get(doc); if (state) close(state); },
    helpers:Object.freeze({normalize, optionsFor, filterOptions, nextIndex, popupPosition})
  });
})();
