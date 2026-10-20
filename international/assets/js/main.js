/* IECP 全局脚本 */
(function (window) {
  'use strict';
  var cfg = window.IECP_CONFIG;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function toast(msg, dur) {
    var el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; void el.offsetWidth; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, dur || 3000);
  }
  window.siteToast = toast;

  function renderNav() {
    var host = $('#site-nav');
    if (!host) return;
    var page = document.body.dataset.page || 'index';
    var nav = [
      { id: 'index', text: '首页', href: 'index.html' },
      { id: 'news', text: '新闻', href: 'news.html' },
      { id: 'countries', text: '成员国', href: 'countries.html' },
      { id: 'about', text: '关于', href: 'about.html' }
    ];
    host.innerHTML =
      '<div class="nav-inner">' +
        '<a href="index.html" class="brand">' +
          '<img src="photo/un.png" alt="IECP" class="brand-logo">' +
          '<div class="brand-text"><span class="brand-cn">国际交流与合作平台</span><span class="brand-en">IECP</span></div>' +
        '</a>' +
        '<nav class="nav-links">' +
          nav.map(function (i) { return '<a href="' + i.href + '" class="' + (i.id === page ? 'active' : '') + '">' + i.text + '</a>'; }).join('') +
        '</nav>' +
        '<div class="nav-actions" id="navActions"></div>' +
        '<button class="nav-toggle" aria-label="菜单"><i class="fa-solid fa-bars"></i></button>' +
      '</div>';
    window.Auth && window.Auth.mountNav($('#navActions'));
    $('.nav-toggle').addEventListener('click', function () { $('.nav-links').classList.toggle('open'); });
  }

  function renderFooter() {
    var host = $('#site-footer');
    if (!host) return;
    var year = new Date().getFullYear();
    host.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-top">' +
          '<div class="footer-col footer-brand-col">' +
            '<img src="photo/un.png" alt="IECP" class="footer-logo">' +
            '<div><b>' + cfg.siteName + '</b><span>' + cfg.siteNameEn + '</span></div>' +
            '<p class="footer-desc">联结文明，共享未来。IECP 为各成员国提供一个开放、平等、互鉴的国际交流与合作平台。</p>' +
          '</div>' +
          '<div class="footer-col"><h4>平台</h4><ul><li><a href="about.html">关于 IECP</a></li><li><a href="news.html">新闻动态</a></li><li><a href="countries.html">成员国</a></li></ul></div>' +
          '<div class="footer-col"><h4>服务</h4><ul><li><a href="news-publish.html">发布新闻</a></li><li><a href="profile.html">用户中心</a></li><li><a href="register.html">加入我们</a></li></ul></div>' +
          '<div class="footer-col"><h4>联系</h4><ul><li>总部：蓬溪格勒 · 复兴大道 8 号</li><li>邮箱：contact@iecpl.org</li><li>电话：+086 10 6600 1986</li></ul></div>' +
        '</div>' +
        '<div class="footer-bottom"><span>© ' + year + ' ' + cfg.siteName + ' · ' + cfg.siteShort + '</span><span>Est. ' + cfg.year + '</span></div>' +
      '</footer>';
  }

  function init() {
    renderNav();
    renderFooter();
    window.addEventListener('scroll', function () {
      var header = $('#site-nav');
      if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})(window);