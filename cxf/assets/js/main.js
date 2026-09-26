/* ===================================================================
   蓬溪格勒磁悬浮集团 · 官网脚本
   =================================================================== */

(function () {
  'use strict';

  /* ============================================================
     配置
     ============================================================ */
  var CONFIG = {
    corpName: '蓬溪格勒磁悬浮集团',
    corpNameRu: 'Понксиградская маглев-корпорация',
    corpNameEn: 'Ponxigrad Maglev Corporation',
    tagline: '让每一座城市，彼此靠近',

    nav: [
      { id:'index',      text:'首页',     href:'index.html' },
      { id:'about',      text:'集团概况', href:'about.html' },
      { id:'technology', text:'技术研发', href:'technology.html' },
      { id:'network',    text:'线路网络', href:'network.html' },
      { id:'business',   text:'业务板块', href:'business.html' },
      { id:'news',       text:'新闻资讯', href:'news.html' },
      { id:'careers',    text:'招聘信息', href:'careers.html' },
      { id:'contact',    text:'联系我们', href:'contact.html' }
    ],

    footerQuick: [
      { text:'集团概况', href:'about.html' },
      { text:'技术研发', href:'technology.html' },
      { text:'线路网络', href:'network.html' },
      { text:'业务板块', href:'business.html' }
    ],
    footerService: [
      { text:'招聘信息', href:'careers.html' },
      { text:'新闻资讯', href:'news.html' },
      { text:'联系我们', href:'contact.html' },
      { text:'乘车指南', href:'#' }
    ],
    footerLinks: [
      { text:'亚斯共和国交通部', href:'#' },
      { text:'苏联铁路集团', href:'#' },
      { text:'蓬溪格勒市政府', href:'#' },
      { text:'国际磁浮协会', href:'#' }
    ]
  };

  /* ============================================================
     工具
     ============================================================ */
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
     Logo SVG（内联，避免图片依赖）
     ============================================================ */
  var LOGO_SVG =
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="#4fc3f7"/>' +
          '<stop offset="100%" stop-color="#1e5aa8"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<circle cx="32" cy="32" r="30" fill="none" stroke="url(#lg1)" stroke-width="2"/>' +
      '<path d="M12 40 Q32 20 52 40" fill="none" stroke="url(#lg1)" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="26" r="5" fill="url(#lg1)"/>' +
      '<path d="M18 46 L46 46" stroke="#c8102e" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="22" cy="52" r="2" fill="#d4af37"/>' +
      '<circle cx="42" cy="52" r="2" fill="#d4af37"/>' +
    '</svg>';

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
          '<div class="topbar-left">亚斯共和国交通部直属国有独资企业 · 成立于 1986 年</div>' +
          '<div class="topbar-right">' +
            '<a href="#">亚斯语</a>' +
            '<a href="#">Русский</a>' +
            '<a href="#">English</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<a class="logo" href="index.html">' +
            '<div class="logo-mark">' + LOGO_SVG + '</div>' +
            '<div class="logo-text">' +
              '<b>' + CONFIG.corpName + '</b>' +
              '<span>' + CONFIG.corpNameEn + '</span>' +
            '</div>' +
          '</a>' +
          '<div class="header-meta">' +
            '<div class="hm-item">客服热线 <b>400-800-1986</b></div>' +
            '<div class="hm-item">运营里程 <b>8,742 km</b></div>' +
          '</div>' +
          '<button class="nav-toggle" type="button" aria-label="菜单">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</header>' +

      '<nav class="main-nav">' +
        '<div class="nav-inner" id="navInner">' + navHtml + '</div>' +
      '</nav>';
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
              '<div class="fb-mark">' + LOGO_SVG + '</div>' +
              '<div>' +
                '<b>' + CONFIG.corpName + '</b>' +
                '<span>' + CONFIG.corpNameEn + '</span>' +
              '</div>' +
            '</div>' +
            '<p style="margin:0 0 12px;font-size:13.5px;line-height:1.9">' +
              '蓬溪格勒磁悬浮集团是亚斯共和国交通部直属国有独资企业，业务覆盖城市磁浮、城际磁浮、磁浮货运、技术输出与海外工程。' +
            '</p>' +
            '<p style="margin:0;font-size:12.5px;color:#5f7794">' +
              '总部：亚斯共和国蓬溪格勒市复兴大道 1 号<br>' +
              '客服热线：400-800-1986' +
            '</p>' +
          '</div>' +
          '<div class="footer-col"><h4>快速导航</h4><ul>' + list(CONFIG.footerQuick) + '</ul></div>' +
          '<div class="footer-col"><h4>服务入口</h4><ul>' + list(CONFIG.footerService) + '</ul></div>' +
          '<div class="footer-col"><h4>友情链接</h4><ul>' + list(CONFIG.footerLinks) + '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<strong>' + CONFIG.corpName + '</strong>' +
          '<span class="sep">·</span>' +
          '亚斯共和国交通部直属' +
          '<span class="sep">·</span>' +
          '备案号：亚斯共和国企业登记（1986）第 0001 号<br>' +
          '© ' + year + ' ' + CONFIG.corpName + ' 版权所有' +
          '<span class="sep">·</span>' +
          '技术支持：亚斯红日网络科技中心' +
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
    if (!nums.length || !('IntersectionObserver' in window)) {
      nums.forEach(function (el) {
        el.textContent = el.dataset.count;
      });
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
          var text = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US');
          el.textContent = text + suffix;
          if (p < 1) requestAnimationFrame(step);
          else {
            el.textContent = (decimals ? target.toFixed(decimals) : target.toLocaleString('en-US')) + suffix;
          }
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
      btn.classList.toggle('show', window.scrollY > 460);
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
      var company = ($('#cCompany') || {}).value || '';
      toast('已收到' + (name ? '，' + name : '') + (company ? '（' + company + '）' : '') + '的留言，我们将在 2 个工作日内回复');
      form.reset();
    });
  }

  /* ============================================================
     线路筛选（线路网络页用）
     ============================================================ */
  function initLineFilter() {
    var tabs = $$('[data-line-filter]');
    if (!tabs.length) return;
    var items = $$('[data-line-cat]');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var f = tab.dataset.lineFilter;
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        items.forEach(function (it) {
          var show = (f === 'all' || it.dataset.lineCat === f);
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
    initLineFilter();

    console.log('%c 蓬溪格勒磁悬浮集团 · 官方网站 ', 'background:#1e5aa8;color:#4fc3f7;padding:3px 8px;border-radius:3px;font-weight:700');
    console.log('%c 让每一座城市，彼此靠近 ', 'color:#7a8a9c');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();