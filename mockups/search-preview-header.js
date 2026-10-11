/* Шапка собственного демопрофиля: общий дизайн карточки кандидата в вакансии. */
(() => {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icons = {
    location:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    phone:'<path d="m7 3 3 4-2 3c2 3 3 4 6 6l3-2 4 3c0 3-2 5-5 4C9 19 5 15 3 8c-1-3 1-5 4-5Z"/>',
    shield:'<path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5z"/><path d="m8 11 3 3 5-6"/>'
  };
  const icon = name => `<svg class="sd-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  const yearsLabel = age => `${age} ${age % 100 >= 11 && age % 100 <= 14 ? 'лет' : age % 10 === 1 ? 'год' : age % 10 >= 2 && age % 10 <= 4 ? 'года' : 'лет'}`;
  const tagColor = (tag,index) => /легенда|рекомендация/i.test(tag) ? 'lime' : /повторный|собесо/i.test(tag) ? 'pink' : /резерв|будущее/i.test(tag) ? 'purple' : ['purple','pink','lime'][index % 3];
  function render(candidate, requestedResume, options = {}) {
    if (!candidate) return '';
    const esc = options.esc || escapeHTML;
    const resumes = Array.isArray(candidate.resumes) ? candidate.resumes : [];
    // Даже неверный ID снаружи не подмешивает документ другого кандидата.
    const resume = resumes.find(item => item.id === requestedResume?.id) || resumes.find(item => item.id === options.selectedResumeId) || resumes[0];
    const external = options.external === true || (candidate.searchProvider === 'hh' && !candidate.importedToATS);
    const source = resume?.source || candidate.source;
    const sourceLabel = options.labelFor ? options.labelFor('sources',source) : source === 'hh' ? 'hh.ru' : source || 'Не указан';
    const date = options.dateLabel ? options.dateLabel(resume?.updatedAt || candidate.updatedAt) : '';
    const consent = external ? 'Неизвестно · внешний профиль' : {given:'Получено',requested:'Запрошено',unknown:'Не указано'}[candidate.consent] || 'Не указано';
    const score = options.score;
    const tagLabel = options.tagLabel || (value => value);
    const tags = external ? [] : Array.isArray(candidate.tags) ? candidate.tags : [];
    const email = external ? '' : candidate.contacts?.email || '';
    const phone = external ? '' : candidate.contacts?.phone || '';
    const portraitStyle = options.portraitStyle ? options.portraitStyle(candidate) : '';
    const portraitFallback = options.portraitFallback ? options.portraitFallback(candidate) : `<span class="sd-photo-fallback">${esc(candidate.initials || '')}</span>`;
    const select = options.select || ((label,items,current,attrs) => `<label class="sd-field"><span class="sd-label">${esc(label)}</span><select class="sd-select" aria-label="${esc(label)}" ${attrs}>${items.map(item => `<option value="${esc(item.id)}"${item.id === current ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label>`);
    return `<header class="sd-preview-head sd-candidate-header">
      <div class="sd-preview-topline"><span class="sd-candidate-header-origin ${external ? 'external' : ''}"><span aria-hidden="true"></span>${external ? 'Внешний демопрофиль hh.ru' : 'Кандидат в вашей базе'}</span><button type="button" class="sd-icon-button" data-sd-action="clear-preview" aria-label="Закрыть просмотр резюме">×</button></div>
      <div class="sd-preview-identity sd-candidate-header-main"><div class="sd-photo" style="${esc(portraitStyle)}" role="img" aria-label="Вымышленный портрет ${esc(candidate.name)}">${portraitFallback}</div><div class="sd-candidate-header-copy"><div class="sd-candidate-header-title"><h2>${esc(candidate.name)}</h2>${score ? `<span class="sd-chip sd-candidate-header-score">${score.score === null ? 'Нужна проверка' : `${esc(score.score)}% соответствия`}</span>` : ''}</div><p class="sd-candidate-header-role">${esc(resume?.position || candidate.position || candidate.role || 'Должность не указана')}</p>
      <div class="sd-preview-contacts">${phone ? `<span>${icon('phone')}${esc(phone)}</span>` : ''}${email ? `<a href="mailto:${esc(email)}">${icon('email')}${esc(email)}</a>` : ''}<span>${icon('location')}${esc(candidate.city || 'Город не указан')}</span>${Number.isFinite(candidate.age) && candidate.age > 0 ? `<span>${esc(yearsLabel(candidate.age))}</span>` : ''}</div>
      ${tags.length ? `<div class="sd-candidate-header-tags" aria-label="Метки кандидата"><span class="sd-candidate-tag-label">Метки</span>${tags.map((tag,index) => `<span class="sd-candidate-tag ${tagColor(String(tag),index)}">${esc(tagLabel(tag))}</span>`).join('')}</div>` : ''}
      </div></div>
      <div class="sd-candidate-header-tools"><div class="sd-preview-resume">${select('Резюме кандидата',resumes.map(item => ({id:item.id,label:item.title})),resume?.id || '','id="sd-preview-resume"')}<span class="sd-candidate-resume-meta"><span class="sd-candidate-resume-source ${source === 'hh' ? 'hh' : ''}">${source === 'hh' ? '<b aria-hidden="true">hh</b>' : ''}${esc(sourceLabel)}</span>${resumes.length} ${resumes.length === 1 ? 'резюме' : 'резюме'}${date ? ` · ${esc(date)}` : ''}</span></div><div class="sd-preview-consent sd-candidate-header-consent ${external || candidate.consent !== 'given' ? 'is-unknown' : ''}">${icon('shield')}<span>Согласие на обработку данных <b>${esc(consent)}</b></span></div></div>
    </header>`;
  }
  window.SearchPreviewHeader = Object.freeze({render});
})();
