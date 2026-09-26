/* ===================================================================
   亚斯共和国教育部 · 官网脚本
   =================================================================== */

(function () {
  'use strict';

  var CONFIG = {
    deptName: '亚斯共和国教育部',
    deptNameEn: 'Ministry of Education of the Republic of Asya',
    deptNameRu: 'Министерство образования Республики Ася',

    nav: [
      { id:'index',    text:'首页',     href:'index.html' },
      { id:'about',    text:'部门简介', href:'about.html' },
      { id:'news',     text:'要闻动态', href:'news.html' },
      { id:'policy',   text:'政策法规', href:'policy.html' },
      { id:'data',     text:'数据发布', href:'data.html' },
      { id:'services', text:'政务服务', href:'services.html' },
      { id:'contact',  text:'联系我们', href:'contact.html' }
    ],

    footerAbout: [
      { text:'部门简介', href:'about.html' },
      { text:'机构设置', href:'about.html#org' },
      { text:'部领导',   href:'about.html#leaders' },
      { text:'主要职能', href:'about.html#duty' }
    ],
    footerService: [
      { text:'政务服务', href:'services.html' },
      { text:'数据发布', href:'data.html' },
      { text:'政策法规', href:'policy.html' },
      { text:'在线咨询', href:'contact.html' }
    ],
    footerLinks: [
      { text:'亚斯共和国政府门户', href:'#' },
      { text:'苏联教育部',           href:'#' },
      { text:'蓬溪格勒市教育局',     href:'#' },
      { text:'亚斯国家教育研究院',   href:'#' }
    ]
  };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function toast(msg, dur) {
    var el = $('.gov-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'gov-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, dur || 2600);
  }
  window.siteToast = toast;

  /* 徽章 SVG */
  var EMBLEM_SVG =
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6">' +
      '<circle cx="32" cy="32" r="29"/>' +
      '<circle cx="32" cy="32" r="25" stroke-width="1"/>' +
      '<path d="M32 12 L36 24 L49 24 L39 32 L43 44 L32 36 L21 44 L25 32 L15 24 L28 24 Z" fill="currentColor" stroke="none"/>' +
      '<path d="M14 50 Q32 44 50 50" stroke-width="1.8"/>' +
      '<circle cx="32" cy="52" r="1.6" fill="currentColor" stroke="none"/>' +
    '</svg>';

  /* ============================================================
     页头
     ============================================================ */
  function renderHeader() {
    var host = $('#site-header');
    if (!host) return;

    var page = document.body.dataset.page || 'index';

    /* 当前日期 */
    var now = new Date();
    var dateStr = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';

    var navHtml = CONFIG.nav.map(function (item) {
      var cls = (item.id === page) ? ' class="active"' : '';
      return '<a' + cls + ' href="' + item.href + '">' + item.text + '</a>';
    }).join('');

    host.innerHTML =
      /* 顶端细条 */
      '<div class="gov-topbar">' +
        '<div class="gov-topbar-inner">' +
          '<div class="gt-left">' +
            '<span class="gt-dot"></span>' +
            '<span>亚斯共和国教育部 · 官方网站</span>' +
          '</div>' +
          '<div class="gt-right">' +
            '<span>' + dateStr + '</span>' +
            '<span class="sep">|</span>' +
            '<a href="#">简体</a>' +
            '<span class="sep">|</span>' +
            '<a href="#">Русский</a>' +
            '<span class="sep">|</span>' +
            '<a href="#">English</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 主头部 */
      '<div class="gov-masthead">' +
        '<div class="gov-masthead-inner">' +
          '<a class="gov-brand" href="index.html">' +
            '<div class="gov-emblem">' + EMBLEM_SVG + '</div>' +
            '<div class="gov-brand-text">' +
              '<b>' + CONFIG.deptName + '</b>' +
              '<span>' + CONFIG.deptNameEn + '</span>' +
            '</div>' +
          '</a>' +
          '<div class="gov-masthead-tools">' +
            '<form class="gov-search" id="govSearchForm">' +
              '<input id="govSearchInput" type="text" placeholder="请输入关键词" aria-label="站内搜索">' +
              '<button type="submit">搜索</button>' +
            '</form>' +
            '<div class="gov-quick-links">' +
              '<a href="services.html">办事大厅</a>' +
              '<a href="contact.html">部长信箱</a>' +
              '<a href="contact.html">常见问题</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 主导航 */
      '<nav class="gov-nav">' +
        '<div class="gov-nav-inner" id="govNavInner">' + navHtml + '</div>' +
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
      '<footer class="gov-footer">' +
        '<div class="gov-footer-main">' +
          '<div class="gov-footer-col">' +
            '<div class="gov-footer-brand">' +
              '<div class="fb-emblem">' + EMBLEM_SVG + '</div>' +
              '<div>' +
                '<b>' + CONFIG.deptName + '</b>' +
                '<span>' + CONFIG.deptNameEn + '</span>' +
              '</div>' +
            '</div>' +
            '<p style="margin:0 0 10px">主管全国教育事业和语言文字工作，统筹规划教育改革发展，组织实施教育方针政策与法律法规。</p>' +
            '<p style="margin:0;font-size:12px;color:#5f7794">' +
              '地址：亚斯共和国蓬溪格勒市红星区复兴大道 2 号<br>' +
              '邮编：100010' +
            '</p>' +
          '</div>' +
          '<div class="gov-footer-col">' +
            '<h4>机构信息</h4>' +
            '<ul>' + list(CONFIG.footerAbout) + '</ul>' +
          '</div>' +
          '<div class="gov-footer-col">' +
            '<h4>政务服务</h4>' +
            '<ul>' + list(CONFIG.footerService) + '</ul>' +
          '</div>' +
          '<div class="gov-footer-col">' +
            '<h4>友情链接</h4>' +
            '<ul>' + list(CONFIG.footerLinks) + '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="gov-footer-bottom">' +
          '<strong>' + CONFIG.deptName + '</strong>' +
          '<span class="sep">|</span>' +
          '亚斯共和国政府组成部门' +
          '<span class="sep">|</span>' +
          '备案号：亚斯共和国政府网站备案 0001 号<br>' +
          '© ' + year + ' ' + CONFIG.deptName + ' 版权所有' +
          '<span class="sep">|</span>' +
          '技术支持：亚斯红日网络科技中心' +
        '</div>' +
      '</footer>';
  }

  /* ============================================================
     移动端菜单
     ============================================================ */
  function initMobileNav() {
    var nav = $('#govNavInner');
    if (!nav) return;

    var btn = document.createElement('button');
    btn.className = 'gov-nav-toggle';
    btn.type = 'button';
    btn.textContent = '☰ 菜单';
    btn.setAttribute('aria-label', '菜单');
    nav.parentNode.insertBefore(btn, nav);

    btn.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  /* ============================================================
     搜索
     ============================================================ */
  function initSearch() {
    var form = $('#govSearchForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = ($('#govSearchInput') || {}).value || '';
      kw = kw.trim();
      if (!kw) { toast('请输入关键词'); return; }
      toast('正在检索：' + kw);
    });
  }

  /* ============================================================
     数字滚动
     ============================================================ */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    if (!('IntersectionObserver' in window)) {
      nums.forEach(function (el) {
        el.textContent = el.dataset.count + (el.dataset.suffix || '');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var decimals = parseInt(el.dataset.decimals || 0);
        var dur = 1200;
        var start = null;

        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var v = target * eased;
          el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')) + suffix;
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
     联系表单
     ============================================================ */
  function initContactForm() {
    var form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('#cName') || {}).value || '';
      toast('已收到' + (name ? '，' + name : '') + '的来信，我们将在 5 个工作日内答复');
      form.reset();
    });
  }

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    renderHeader();
    renderFooter();
    initMobileNav();
    initSearch();
    initCounters();
    initContactForm();

    console.log('%c 亚斯共和国教育部 · 官方网站 ', 'background:#1e3a5f;color:#d4af37;padding:3px 10px;font-weight:700;letter-spacing:1px');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();