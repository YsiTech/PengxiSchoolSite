/* ===================================================================
   苏联教育部 · 中文版
   页面脚本 · 注入中文页头 / 页脚
   =================================================================== */

(function (window, document) {
  'use strict';

  /* ============================================================
     站点配置
     ============================================================ */
  var CONFIG = {
    siteTitle: '苏维埃社会主义共和国联盟教育部',
    siteTitleShort: '苏联教育部',
    siteSub: '苏维埃社会主义共和国联盟',
    motto: '科学和教育属于人民',
    nav: [
      { id:'index',     text:'首页',     href:'index.html' },
      { id:'about',     text:'关于本部', href:'about.html' },
      { id:'news',      text:'新闻',     href:'news.html' },
      { id:'structure', text:'机构设置', href:'structure.html' },
      { id:'documents', text:'文件公告', href:'documents.html' },
      { id:'contact',   text:'联系我们', href:'contact.html' }
    ]
  };

  /* ============================================================
     徽章（SVG）
     ============================================================ */
  var EMBLEM_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M50 6 L86 16 L86 48 C86 72 68 88 50 95 C32 88 14 72 14 48 L14 16 Z" ' +
            'fill="#B01C2E" stroke="#C9A227" stroke-width="2"/>' +
      '<path d="M50 13 L79 21 L79 48 C79 68 64 82 50 88 C36 82 21 68 21 48 L21 21 Z" ' +
            'fill="#7A101F" opacity="0.6"/>' +
      '<g transform="translate(50 50)">' +
        '<path d="M-15 6 C-8 -2 2 -6 10 -2 L8 3 C2 0 -5 3 -10 9 Z" fill="#C9A227"/>' +
        '<rect x="-3" y="-14" width="5" height="26" fill="#C9A227" rx="1"/>' +
        '<rect x="-9" y="-10" width="18" height="4" fill="#C9A227" rx="1"/>' +
      '</g>' +
      '<path d="M50 22 L53 30 L61 30 L55 35 L57 43 L50 38 L43 43 L45 35 L39 30 L47 30 Z" ' +
            'fill="#C9A227"/>' +
      '<g stroke="#C9A227" stroke-width="1.2" fill="none" opacity="0.85">' +
        '<path d="M22 60 Q18 55 22 48"/>' +
        '<path d="M78 60 Q82 55 78 48"/>' +
      '</g>' +
    '</svg>';

  /* ============================================================
     页头
     ============================================================ */
  function renderHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;

    var current = document.body.dataset.page || 'index';

    var navHtml = CONFIG.nav.map(function (item) {
      var cls = (item.id === current) ? ' class="active"' : '';
      return '<a' + cls + ' href="' + item.href + '">' + item.text + '</a>';
    }).join('');

    host.innerHTML =
      '<div class="topbar">' +
        '<div class="topbar-inner">' +
          '<div class="topbar-left">苏联部长会议直属 · 教育部官方网站</div>' +
          '<div class="topbar-right">' +
            '<a href="#" data-lang="cn">中文</a>' +
            '<span class="sep">|</span>' +
            '<a href="../index.html" data-lang="ru">Русский</a>' +
            '<span class="sep">|</span>' +
            '<a href="#">无障碍浏览</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<a class="emblem" href="index.html" title="' + CONFIG.siteTitle + '">' +
            EMBLEM_SVG +
          '</a>' +
          '<div class="header-title">' +
            '<h1>' + CONFIG.siteTitle + '</h1>' +
            '<p class="sub">' + CONFIG.siteSub + '</p>' +
            '<p class="motto">' + CONFIG.motto + '</p>' +
          '</div>' +
          '<div class="header-actions">' +
            '<form class="header-search" onsubmit="return false">' +
              '<input type="search" placeholder="站内搜索..." aria-label="搜索">' +
              '<button type="submit">搜索</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</header>' +

      '<nav class="main-nav">' +
        '<div class="nav-inner">' + navHtml + '</div>' +
      '</nav>';
  }

  /* ============================================================
     页脚
     ============================================================ */
  function renderFooter() {
    var host = document.getElementById('site-footer');
    if (!host) return;

    var year = new Date().getFullYear();

    host.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-main">' +

          '<div class="footer-col">' +
            '<div class="footer-brand">' +
              '<div class="fb-mark">★</div>' +
              '<div>' +
                '<b>' + CONFIG.siteTitle + '</b>' +
                '<span>' + CONFIG.siteSub + '</span>' +
              '</div>' +
            '</div>' +
            '<p>苏联国家教育管理中央机关。统一领导各加盟共和国的国民教育事业，' +
               '保障全国教育空间的统一，培养全面发展的共产主义建设者。</p>' +
          '</div>' +

          '<div class="footer-col">' +
            '<h4>栏目导航</h4>' +
            '<ul>' +
              '<li><a href="about.html">关于本部</a></li>' +
              '<li><a href="structure.html">机构设置</a></li>' +
              '<li><a href="news.html">新闻</a></li>' +
              '<li><a href="documents.html">文件公告</a></li>' +
            '</ul>' +
          '</div>' +

          '<div class="footer-col">' +
            '<h4>相关机构</h4>' +
            '<ul>' +
              '<li><a href="#">苏联科学院</a></li>' +
              '<li><a href="#">苏联教育科学院</a></li>' +
              '<li><a href="#">「启蒙」出版社</a></li>' +
              '<li><a href="#">《国民教育》杂志</a></li>' +
            '</ul>' +
          '</div>' +

          '<div class="footer-col">' +
            '<h4>联系方式</h4>' +
            '<ul>' +
              '<li>莫斯科市教育街 1 号</li>' +
              '<li>电话：8 (495) 000-00-00</li>' +
              '<li>邮箱：press@minobr.su</li>' +
            '</ul>' +
          '</div>' +

        '</div>' +
        '<div class="footer-bottom">' +
          '<strong>' + CONFIG.siteTitleShort + '</strong> · ' + CONFIG.siteSub + '<br>' +
          '© ' + year + ' 苏联教育部 · 版权所有<br>' +
          '<span class="muted small">本网站为虚构设定站，仅供文学创作使用。</span>' +
        '</div>' +
      '</footer>';
  }

  /* ============================================================
     滚动显现
     ============================================================ */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var targets = document.querySelectorAll('.card, .tile, .structure-item, .news-detail');
    if (!targets.length) return;

    Array.prototype.forEach.call(targets, function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      el.style.transition = 'opacity .5s ease, transform .5s ease';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.opacity = '1';
        en.target.style.transform = 'translateY(0)';
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* ============================================================
     数字滚动
     ============================================================ */
  function initCounters() {
    var stats = document.querySelectorAll('.hero-stat b[data-count]');
    if (!stats.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.dataset.count) || 0;
        var suffix = el.dataset.suffix || '';
        var dur = 1400, start = null;

        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = target * eased;
          el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target + suffix;
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(stats, function (el) { io.observe(el); });
  }

  /* ============================================================
     控制台标语
     ============================================================ */
  function initConsole() {
    var style = 'background:#B01C2E;color:#E5CB6E;padding:3px 10px;border-radius:2px;font-weight:700;letter-spacing:1px';
    console.log('%c 苏联教育部 · 官方网站 ', style);
    console.log('%c 中文版 · 仅供文学创作使用 ', 'color:#C9A227');
  }

  /* ============================================================
     初始化
     ============================================================ */
  function init() {
    try { renderHeader(); } catch (e) { console.error('[cn] renderHeader', e); }
    try { renderFooter(); } catch (e) { console.error('[cn] renderFooter', e); }
    try { initReveal();    } catch (e) { console.error('[cn] reveal', e); }
    try { initCounters();  } catch (e) { console.error('[cn] counters', e); }
    try { initConsole();   } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);