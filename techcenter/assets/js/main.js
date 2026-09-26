/* ===================================================================
   亚斯红日网络科技中心 · 官网脚本
   =================================================================== */

(function () {
  'use strict';

  var CONFIG = {
    corpName: '亚斯红日网络科技中心',
    corpNameEn: 'Red Sun Network Technology Center',
    tagline: '让算力成为共和国的基础设施',

    nav: [
      { id:'index',      text:'首页',     href:'index.html' },
      { id:'about',      text:'关于我们', href:'about.html' },
      { id:'services',   text:'业务领域', href:'services.html' },
      { id:'solutions',  text:'解决方案', href:'solutions.html' },
      { id:'technology', text:'技术能力', href:'technology.html' },
      { id:'news',       text:'新闻动态', href:'news.html' },
      { id:'careers',    text:'加入我们', href:'careers.html' },
      { id:'contact',    text:'联系我们', href:'contact.html' }
    ],

    footerQuick: [
      { text:'关于我们', href:'about.html' },
      { text:'业务领域', href:'services.html' },
      { text:'解决方案', href:'solutions.html' },
      { text:'技术能力', href:'technology.html' }
    ],
    footerService: [
      { text:'新闻动态', href:'news.html' },
      { text:'加入我们', href:'careers.html' },
      { text:'联系我们', href:'contact.html' },
      { text:'服务状态', href:'#' }
    ],
    footerLinks: [
      { text:'亚斯共和国数字发展部', href:'#' },
      { text:'苏联国家计算中心', href:'#' },
      { text:'蓬溪格勒市政府', href:'#' },
      { text:'亚斯互联网协会', href:'#' }
    ]
  };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function toast(msg, dur) {
    var el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, dur || 2600);
  }
  window.siteToast = toast;

  /* ============================================================
     页头
     ============================================================ */
  function renderHeader() {
    var host = $('#site-header');
    if (!host) return;

    var page = document.body.dataset.page || 'index';

    var navHtml = CONFIG.nav.map(function (item) {
      var cls = item.id === page ? ' class="active"' : '';
      return '<a' + cls + ' href="' + item.href + '">' + item.text + '</a>';
    }).join('');

    host.innerHTML =
      '<div class="topbar">' +
        '<div class="topbar-inner">' +
          '<div class="topbar-left">' +
            '<span class="pulse"></span>' +
            '<span>全网络运行正常 · 数据中心负载 68%</span>' +
          '</div>' +
          '<div class="topbar-right">' +
            '<a href="#">亚斯语</a>' +
            '<a href="#">Русский</a>' +
            '<a href="#">状态页</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<a class="logo" href="index.html">' +
            '<img class="logo-img" src="logo.png" alt="' + CONFIG.corpName + '">' +
            '<div class="logo-text">' +
              '<b>' + CONFIG.corpName + '</b>' +
              '<span>' + CONFIG.corpNameEn + '</span>' +
            '</div>' +
          '</a>' +

          '<nav class="main-nav" id="navInner">' + navHtml + '</nav>' +

          '<button class="nav-toggle" type="button" aria-label="菜单">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</header>';
  }

  /* ============================================================
     页脚
     ============================================================ */
  function renderFooter() {
    var host = $('#site-footer');
    if (!host) return;
    var year = new Date().getFullYear();

    function list(items) {
      return items.map(function (i) {
        return '<li><a href="' + i.href + '">' + i.text + '</a></li>';
      }).join('');
    }

    host.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-main">' +
          '<div>' +
            '<div class="footer-brand">' +
              '<img class="footer-logo" src="logo.png" alt="">' +
              '<div class="footer-brand-text">' +
                '<b>' + CONFIG.corpName + '</b>' +
                '<span>' + CONFIG.corpNameEn + '</span>' +
              '</div>' +
            '</div>' +
            '<p class="footer-desc">' +
              '亚斯共和国数字发展部直属国有骨干企业，承担国家云计算基础设施、政务数字化与网络安全的建设任务。' +
            '</p>' +
            '<div class="footer-contact">' +
              '总部：蓬溪格勒市红星区复兴大道 88 号<br>' +
              '总机：400-800-1950<br>' +
              '合作：hello@redsun.asr' +
            '</div>' +
          '</div>' +
          '<div class="footer-col"><h4>快速导航</h4><ul>' + list(CONFIG.footerQuick) + '</ul></div>' +
          '<div class="footer-col"><h4>服务入口</h4><ul>' + list(CONFIG.footerService) + '</ul></div>' +
          '<div class="footer-col"><h4>友情链接</h4><ul>' + list(CONFIG.footerLinks) + '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<strong>' + CONFIG.corpName + '</strong>' +
          '<span class="sep">/</span>' +
          '亚斯共和国数字发展部直属' +
          '<span class="sep">/</span>' +
          '登记号：亚斯企业（2011）第 0088 号<br>' +
          '© ' + year + ' ' + CONFIG.corpNameEn +
          '<span class="sep">/</span>' +
          '技术支持：本中心运维团队' +
        '</div>' +
      '</footer>';
  }

  /* ============================================================
     移动端菜单
     ============================================================ */
  function initMobileNav() {
    var btn = $('.nav-toggle');
    var nav = $('#navInner');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  /* ============================================================
     数字滚动
     ============================================================ */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;
    if (!('IntersectionObserver' in window)) {
      nums.forEach(function (el) { el.textContent = el.dataset.count; });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
        var dur = 1400;
        var start = null;

        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = target * eased;
          el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US')) + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = (decimals ? target.toFixed(decimals) : target.toLocaleString('en-US')) + suffix;
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });

    nums.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     滚动显现
     ============================================================ */
  function initReveal() {
    var targets = $$('.reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     回到顶部
     ============================================================ */
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '回到顶部');
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    var onScroll = function () {
      btn.classList.toggle('show', window.scrollY > 480);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ============================================================
     联系表单
     ============================================================ */
  function initContactForm() {
    var form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('#cName') || {}).value || '';
      var org = ($('#cOrg') || {}).value || '';
      toast('已收到' + (name ? '，' + name : '') + (org ? '（' + org + '）' : '') + '的需求，我们将在 2 个工作日内联系你');
      form.reset();
    });
  }

  /* ============================================================
     新闻分类筛选
     ============================================================ */
  function initNewsFilter() {
    var tabs = $$('[data-news-filter]');
    if (!tabs.length) return;
    var items = $$('[data-news-cat]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var f = tab.dataset.newsFilter;
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        items.forEach(function (it) {
          var show = (f === 'all' || it.dataset.newsCat === f);
          it.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    renderHeader();
    renderFooter();
    initMobileNav();
    initCounters();
    initReveal();
    initBackToTop();
    initContactForm();
    initNewsFilter();

    console.log('%c 亚斯红日网络科技中心 ', 'background:#a8201a;color:#fff;padding:3px 10px;border-radius:3px;font-weight:700;letter-spacing:1px');
    console.log('%c 让算力成为共和国的基础设施 ', 'color:#8a8078');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();