/* Редактор демовакансии: три независимых текста и локальное сохранение.
   Не публикует объявления и не вызывает рабочую ATS. */
window.VacancyEditorForm = (() => {
  const KEY = 'sobesso-prototype-vacancy-edits-v1';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const fields = ['name', 'department', 'grade', 'priority', 'positions', 'workFormat', 'budget', 'confidential', 'duties', 'requirements', 'conditions'];
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const knownId = (id) => typeof id === 'string' && /^[\w-]+$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
  const DEMO = {
    android: ['Развивать Android-приложение, участвовать в архитектурных решениях и ревью кода.', 'Kotlin, Coroutines и Jetpack Compose; опыт продуктовой разработки от 5 лет, опыт с KMP — плюс.'],
    ios: ['Развивать iOS-приложение и участвовать в ревью кода.', 'Swift, SwiftUI и Combine; опыт продуктовой разработки от 4 лет.'],
    designer: ['Проектировать ключевые сценарии продукта, развивать дизайн-систему и проводить исследования.', 'Портфолио продуктовых кейсов; опыт от 5 лет; Figma и дизайн-системы.'],
    analyst: ['Считать продуктовые метрики и проводить A/B-тесты.', 'SQL и Python; опыт продуктовой аналитики от 2 лет.'],
    backend: ['Разрабатывать сервисы платформы на Go, проектировать API и схемы данных.', 'Go в продакшене от 3 лет; PostgreSQL, очереди сообщений и Kubernetes.'],
    service: ['Развивать клиентский сервис и управлять командой поддержки.', 'Опыт управления поддержкой, работы с метриками сервиса и улучшения процессов.'],
    marketing: ['Запускать продуктовые коммуникации и анализировать результаты продвижения.', 'Опыт продуктового маркетинга, позиционирования и исследования аудитории.'],
    research: ['Проводить пользовательские исследования и помогать команде проверять продуктовые гипотезы.', 'Опыт качественных и количественных исследований; умение связывать выводы с решениями продукта.']
  };
  function description(values) {
    return [['Обязанности', values.duties], ['Требования', values.requirements], ['Условия', values.conditions]].filter(([, text]) => String(text ?? '').trim()).map(([title, text]) => `${title}:\n${String(text).trim()}`).join('\n\n');
  }
  function splitDescription(text) {
    const value = String(text ?? '').replace(/\r\n?/g, '\n');
    const marks = [...value.matchAll(/^(Обязанности|Требования|Условия)\s*:\s*/gmi)];
    if (!marks.length) return { duties: value, requirements: '', conditions: '' };
    const keys = { обязанности: 'duties', требования: 'requirements', условия: 'conditions' };
    const result = { duties: '', requirements: '', conditions: '' };
    // Вступление и дополнительные подзаголовки не теряются при разбиении старого текста.
    marks.forEach((mark, index) => {
      const key = keys[mark[1].toLowerCase()], end = marks[index + 1]?.index ?? value.length;
      result[key] = [result[key], value.slice(mark.index + mark[0].length, end).trim()].filter(Boolean).join('\n\n');
    });
    const intro = value.slice(0, marks[0].index).trim();
    if (intro) result.duties = [intro, result.duties].filter(Boolean).join('\n\n');
    return result;
  }
  function defaults(vacancy = {}, id = '', profile = {}) {
    const base = DEMO[id], oldText = own(vacancy, 'description') ? vacancy.description : profile.text;
    const texts = oldText != null ? splitDescription(oldText) : { duties: base?.[0] || '', requirements: base?.[1] || '', conditions: base ? 'Москва · гибрид или удалённо · ДМС и обучение.' : '' };
    return {
      name: vacancy.name || profile.title || '', department: vacancy.department || '', grade: vacancy.grade || profile.grade || 'Middle',
      priority: vacancy.priority ?? 2, positions: vacancy.positions ?? 1,
      workFormat: vacancy.workFormat ?? (base ? 'Москва · гибрид или удалённо' : ''),
      budget: vacancy.budget ?? (id === 'android' ? 'до 450 000 ₽' : id === 'analyst' ? 'до 260 000 ₽' : base ? 'до 420 000 ₽' : ''),
      confidential: !!vacancy.confidential,
      ...Object.fromEntries(['duties', 'requirements', 'conditions'].map((key) => [key, own(vacancy, key) ? String(vacancy[key] ?? '') : texts[key]]))
    };
  }
  function sanitize(values, minPositions = 1) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) return null;
    const clean = Object.fromEntries(fields.map((key) => [key, key === 'confidential' ? !!values[key] : ['priority', 'positions'].includes(key) ? Number(values[key]) : String(values[key] ?? '').trim()]));
    if (!clean.name || !Number.isSafeInteger(clean.positions) || clean.positions < minPositions || !Number.isInteger(clean.priority) || clean.priority < 1 || clean.priority > 3) return null;
    return { ...clean, description: description(clean) };
  }
  function stored() {
    try { const parsed = JSON.parse(localStorage.getItem(KEY)); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
  }
  function hydrate(vacancies) {
    Object.entries(stored()).forEach(([id, values]) => {
      if (!knownId(id) || !own(vacancies, id)) return;
      const clean = sanitize(values, Math.max(1, Number(vacancies[id].hires || 0) + Number(vacancies[id].waiting || 0)));
      if (clean) Object.assign(vacancies[id], clean);
    });
    return vacancies;
  }
  function save(vacancies, id, values) {
    if (!knownId(id) || !own(vacancies, id)) return { ok: false, persisted: false };
    const clean = sanitize(values, Math.max(1, Number(vacancies[id].hires || 0) + Number(vacancies[id].waiting || 0)));
    if (!clean) return { ok: false, persisted: false };
    Object.assign(vacancies[id], clean);
    try { localStorage.setItem(KEY, JSON.stringify({ ...stored(), [id]: clean })); return { ok: true, persisted: true }; }
    catch { return { ok: true, persisted: false }; }
  }
  function collect(form) {
    const values = {};
    for (const key of fields) {
      const input = form?.querySelector(`[data-vacancy-field="${key}"]`);
      if (!input) return null;
      if (key === 'name' && !input.value.trim()) { input.setCustomValidity('Укажите название вакансии'); input.reportValidity(); return null; }
      input.setCustomValidity('');
      if (!input.reportValidity()) return null;
      values[key] = key === 'confidential' ? input.checked : input.value;
    }
    return sanitize(values, Number(form?.dataset.minPositions || 1));
  }
  const select = (key, label, value, options) => `<label class="field"><span>${label}</span><select data-vacancy-field="${key}">${[...new Set([String(value), ...options.map(String)])].map((item) => `<option value="${esc(item)}"${String(value) === item ? ' selected' : ''}>${key === 'priority' ? ({ 1: '1 · Высокий', 2: '2 · Обычный', 3: '3 · Низкий' }[item] || esc(item)) : esc(item)}</option>`).join('')}</select></label>`;
  const head = (step, title, subtitle, tag) => `<div class="vef-section-head"><span class="vef-step">${step}</span><div><h3>${title}</h3><p>${subtitle}</p></div><span class="vef-tag">${tag}</span></div>`;
  function render(vacancy, id, meta = {}) {
    const v = defaults(vacancy, id, meta.profile), minPositions = Math.max(1, Number(vacancy.hires || 0) + Number(vacancy.waiting || 0));
    return `<div class="ve68-edit-form vef-form" data-min-positions="${minPositions}">
      <section class="vef-section vef-position">${head('01', 'Позиция', 'Название, команда и параметры найма.', 'Основные данные')}
        <div class="form-grid"><label class="field full"><span>Название вакансии</span><input data-vacancy-field="name" value="${esc(v.name)}" required maxlength="200"></label>
          <label class="field"><span>Подразделение</span><input data-vacancy-field="department" value="${esc(v.department)}"></label>${select('grade', 'Грейд', v.grade, ['Junior', 'Middle', 'Middle+', 'Senior', 'Lead'])}
          ${select('priority', 'Приоритет', v.priority, [1, 2, 3])}<label class="field"><span>План найма</span><input data-vacancy-field="positions" type="number" value="${esc(v.positions)}" min="${minPositions}" step="1" required>${minPositions > 1 ? `<small>Не меньше ${minPositions}: столько ставок уже занято или ожидает выхода.</small>` : ''}</label>
          <label class="field"><span>Формат работы</span><input data-vacancy-field="workFormat" value="${esc(v.workFormat)}" placeholder="Город, удалённо, гибрид или офис"></label><label class="field"><span>Внутренний бюджет</span><input data-vacancy-field="budget" value="${esc(v.budget)}" placeholder="Например, до 350 000 ₽"><small>Публичный доход задаётся отдельно при публикации.</small></label>
          <label class="field full vef-confidential"><input data-vacancy-field="confidential" type="checkbox"${v.confidential ? ' checked' : ''}><span>Конфиденциальная вакансия<small>Служебная отметка внутри макета.</small></span></label>
        </div>
      </section>
      <section class="vef-section vef-description">${head('02', 'Описание вакансии', 'Три самостоятельных блока — удобнее заполнять и обновлять.', 'Для кандидата')}
        <div class="vef-text-blocks">${[['duties', 'Обязанности', 'Что предстоит делать', 'Опишите задачи и ожидаемые результаты.'], ['requirements', 'Требования', 'Что важно для этой роли', 'Навыки, опыт и знания, которые нужны кандидату.'], ['conditions', 'Условия', 'Что предлагаем кандидату', 'Формат работы, компенсации и преимущества.']].map(([key, label, hint, placeholder], index) => `<label class="field vef-text-block vef-text-${key}"><span class="vef-text-title"><span class="vef-text-icon" aria-hidden="true">${['✓', '✦', '↗'][index]}</span><span><b>${label}</b><small>${hint}</small></span></span><textarea class="vef-description-input" data-vacancy-field="${key}" rows="4" placeholder="${placeholder}">${esc(v[key])}</textarea></label>`).join('')}</div>
        <p class="vef-description-note">При подготовке объявления блоки собираются в единое описание. Данные на площадках не меняются без отдельной отправки.</p>
      </section>
      <section class="vef-section vef-system ve68-system-data">${head('03', 'Системные данные', 'История создания и действующая конфигурация.', 'Только просмотр')}
        <dl class="vacancy-passport-grid"><div><dt>Создана</dt><dd>22 августа · Ирина Николаева</dd></div><div><dt>Взята в работу</dt><dd>23 августа · Елена Крылова</dd></div><div><dt>Воронка</dt><dd>Шаблон воронки · версия ${esc(meta.version || 1)}</dd></div><div><dt>Номер вакансии</dt><dd>#${esc(meta.number || '')}</dd></div></dl>
      </section>
    </div>`;
  }
  return { fields, defaults, description, splitDescription, sanitize, collect, hydrate, save, render, storageKey: KEY };
})();
