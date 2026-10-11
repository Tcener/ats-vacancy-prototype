/* Текст резюме извлекается в браузере: файл не отправляется на сервер. */
window.CandidateResumeFiles = (() => {
  'use strict';
  const MAX_BYTES = 10 * 1024 * 1024, MAX_TEXT = 200000;
  const base = document.currentScript?.src || document.baseURI;
  let pdfRuntime;
  function bounded(text, format, warnings = []) {
    if (text.length > MAX_TEXT) warnings.push('Резюме длинное: показаны первые 200 000 символов.');
    return {text:text.replace(/\u0000/g, '').slice(0, MAX_TEXT), format, warnings};
  }
  async function pdf(file) {
    pdfRuntime ||= import(new URL('assets/vendor/pdfjs/pdf.min.mjs?public=2221020ea508', base).href);
    const runtime = await pdfRuntime;
    runtime.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdfjs/pdf.worker.min.mjs?public=51a2fd1ea47f', base).href;
    const task = runtime.getDocument({data:new Uint8Array(await file.arrayBuffer()), isEvalSupported:false, disableFontFace:true, useSystemFonts:false});
    let document;
    try {
      document = await task.promise;
      let text = ''; const pages = Math.min(30, document.numPages), warnings = [];
      for (let number = 1; number <= pages && text.length <= MAX_TEXT; number++) {
        const page = await document.getPage(number), content = await page.getTextContent();
        text += content.items.map(item => item.str ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('') + '\n';
        page.cleanup();
      }
      if (document.numPages > pages) warnings.push('Прочитаны первые 30 страниц.');
      if (!text.trim()) warnings.push('В PDF нет текстового слоя. Для скана заполните поля вручную или загрузите текстовое резюме.');
      return bounded(text, 'pdf', warnings);
    } finally { if (document) await document.destroy(); else await task.destroy(); }
  }
  async function docx(file) {
    const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
    if(bytes.length<22)throw new Error('Повреждённый DOCX.');
    let end = bytes.length - 22;
    while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
    if (end < 0 || end < bytes.length - 65557) throw new Error('Не удалось прочитать DOCX. Попробуйте пересохранить файл.');
    const count = view.getUint16(end + 10, true), offset = view.getUint32(end + 16, true);
    if (count > 4096 || offset >= bytes.length) throw new Error('Слишком сложный DOCX. Загрузите PDF или TXT.');
    let entry = offset;
    for (let i = 0; i < count; i++) {
      if (entry + 46 > bytes.length || view.getUint32(entry, true) !== 0x02014b50) break;
      const nameLength = view.getUint16(entry + 28, true), extra = view.getUint16(entry + 30, true), comment = view.getUint16(entry + 32, true);
      if(entry+46+nameLength+extra+comment>end)throw new Error('Повреждённый каталог DOCX.');
      const name = new TextDecoder().decode(bytes.subarray(entry + 46, entry + 46 + nameLength));
      if (name === 'word/document.xml') {
        const flags = view.getUint16(entry + 8, true), method = view.getUint16(entry + 10, true), compressed = view.getUint32(entry + 20, true), size = view.getUint32(entry + 24, true), local = view.getUint32(entry + 42, true);
        if (flags & 1 || size > 2 * 1024 * 1024 || compressed > MAX_BYTES || local + 30 > bytes.length) throw new Error('DOCX зашифрован или слишком велик. Загрузите PDF или TXT.');
        if (view.getUint32(local, true) !== 0x04034b50) throw new Error('Повреждённый DOCX.');
        const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
        if (start + compressed > bytes.length) throw new Error('Повреждённый DOCX.');
        const data = bytes.subarray(start, start + compressed);
        let xmlBytes;
        if (method === 0) {if(data.length>2*1024*1024)throw new Error('DOCX содержит слишком много текста.');xmlBytes = data;}
        else if (method === 8 && typeof DecompressionStream === 'function') {
          const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
          const chunks = []; let total = 0;
          try { while (true) { const {value, done} = await reader.read(); if (done) break; total += value.length; if (total > 2 * 1024 * 1024) {await reader.cancel(); throw new Error('DOCX содержит слишком много текста.');} chunks.push(value); } }
          finally {reader.releaseLock();}
          xmlBytes = new Uint8Array(total); let pos = 0; for (const chunk of chunks) {xmlBytes.set(chunk, pos); pos += chunk.length;}
        } else throw new Error('Этот браузер не умеет прочитать DOCX. Загрузите PDF или TXT.');
        const xml = new TextDecoder().decode(xmlBytes);
        if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Необычный формат DOCX. Загрузите PDF или TXT.');
        const document = new DOMParser().parseFromString(xml, 'application/xml');
        if (document.getElementsByTagName('parsererror').length) throw new Error('Повреждённый текст DOCX.');
        const text = [...document.getElementsByTagNameNS('*', 'p')].map(paragraph => [...paragraph.getElementsByTagNameNS('*', 't')].map(node => node.textContent).join('')).join('\n');
        return bounded(text, 'docx');
      }
      entry += 46 + nameLength + extra + comment;
    }
    throw new Error('В DOCX не найден текст резюме.');
  }
  async function read(file) {
    if (!file || file.size > MAX_BYTES) throw new Error('Загрузите файл до 10 МБ.');
    const format = String(file.name).split('.').pop().toLowerCase();
    if (format === 'txt') return bounded(await file.text(), 'txt');
    if (format === 'pdf') return pdf(file);
    if (format === 'docx') return docx(file);
    throw new Error('Поддерживаются PDF, DOCX и TXT. Для старого DOC пересохраните файл в DOCX.');
  }
  return {read};
})();
