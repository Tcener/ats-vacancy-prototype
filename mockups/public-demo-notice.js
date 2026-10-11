(() => {
  if (window.top !== window) return;
  const show = () => {
    if (document.getElementById('public-demo-notice')) return;
    const badge = document.createElement('span');
    badge.id = 'public-demo-notice';
    badge.textContent = 'Демонстрационный макет · данные вымышлены';
    badge.style.cssText = 'position:fixed;right:12px;bottom:8px;z-index:2147483647;padding:5px 9px;border:1px solid #ded7f7;border-radius:9px;background:rgba(255,255,255,.96);color:#6e6b7a;font:11px/1.3 system-ui,sans-serif;pointer-events:none;box-shadow:0 2px 9px #00000008';
    document.body.append(badge);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once:true});
  else show();
})();
