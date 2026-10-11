/* В основной ATS навигация принадлежит оболочке, iframe — только экрану.
   Содержимое защищённых разделов и их собственные состояния не переписываются. */
(() => {
  'use strict';
  const frames=[...document.querySelectorAll('body > iframe[id$="reference-frame"]')];
  const sidebar=document.querySelector('.app-shell > [data-unified-sidebar]');
  if(!sidebar||!frames.length)return;
  document.body.classList.add('unified-navigation');
  const frameCSS=`
    #sd-sidebar,#sd-sidebar-resizer,[class*="AppShell_resizer__"],aside[aria-label="Основная навигация"]{display:none!important}
    .sd-shell{display:block!important;grid-template-columns:minmax(0,1fr)!important;padding:14px 14px 14px 0!important;gap:0!important}
    [data-document-role="page"][data-canvas-width]{padding-left:0!important;gap:0!important}
    [class*="AppShell_shell__"]{grid-template-columns:minmax(0,1fr)!important;padding-left:0!important;gap:0!important}
    #ats-screen{margin-left:0!important}
  `;
  function prepareFrame(frame){
    try{
      const doc=frame.contentDocument;if(!doc?.head||doc.location.pathname==='blank')return;
      if(!doc.getElementById('unified-frame-layout')){const style=doc.createElement('style');style.id='unified-frame-layout';style.textContent=frameCSS;doc.head.append(style);}
    }catch(_){/* Не читаем документы другого origin. */}
  }
  function refresh(){
    const route=location.hash.slice(1)||'dashboard';
    document.body.classList.toggle('unified-frame-route',frames.some(frame=>!frame.hidden));
    const group=route==='home'?'dashboard':route.split('/')[0];
    sidebar.querySelectorAll('.nav-item[data-route]').forEach(link=>{const active=link.dataset.route===group;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    sidebar.querySelectorAll('.vacancy-link[data-route]').forEach(link=>link.classList.toggle('active',link.dataset.route===route));
    const catalog=window.ATSPrototype?.catalog?.()||[];
    const nav=sidebar.querySelector('.vacancy-nav'),archive=nav?.querySelector('.archive');
    for(const vacancy of catalog){
      if(!/^[a-z0-9-]+$/.test(vacancy.id||''))continue;
      let link=[...nav.querySelectorAll('[data-route]')].find(node=>node.dataset.route==='vacancy/'+vacancy.id);
      if(!link){link=document.createElement('a');link.className='vacancy-link';link.dataset.route='vacancy/'+vacancy.id;link.href='#'+link.dataset.route;nav.insertBefore(link,archive);}
      link.textContent=vacancy.title;link.title=vacancy.title;link.classList.toggle('active',link.dataset.route===route);
    }
    frames.forEach(prepareFrame);
  }
  frames.forEach(frame=>frame.addEventListener('load',refresh));
  const observer=new MutationObserver(refresh);
  frames.forEach(frame=>observer.observe(frame,{attributes:true,attributeFilter:['hidden']}));
  window.addEventListener('hashchange',refresh);window.addEventListener('sidebar-layout-change',refresh);
  refresh();
})();
