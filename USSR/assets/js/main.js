/* ===================================================================
   Министерство образования СССР
   Основной скрипт · Инъекция шапки и подвала
   =================================================================== */

(function (window, document) {
  'use strict';

  /* ============================================================
     Конфигурация
     ============================================================ */
  var CONFIG = {
    siteTitle: 'Министерство образования СССР',
    siteTitleShort: 'Минобразования СССР',
    siteSub: 'Союза Советских Социалистических Республик',
    motto: 'Наука и просвещение — народу',
    nav: [
      { id:'index',       text:'Главная',         href:'index.html' },
      { id:'about',       text:'О министерстве',  href:'about.html' },
      { id:'news',        text:'Новости',         href:'news.html' },
      { id:'structure',   text:'Структура',       href:'structure.html' },
      { id:'documents',   text:'Документы',       href:'documents.html' },
      { id:'contact',     text:'Контакты',        href:'contact.html' }
    ]
  };

  /* ============================================================
     Эмблема (SVG)
     ============================================================ */
  var EMBLEM_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      /* Щит */
      '<path d="M50 6 L86 16 L86 48 C86 72 68 88 50 95 C32 88 14 72 14 48 L14 16 Z" ' +
            'fill="#B01C2E" stroke="#C9A227" stroke-width="2"/>' +
      /* Внутренний щит */
      '<path d="M50 13 L79 21 L79 48 C79 68 64 82 50 88 C36 82 21 68 21 48 L21 21 Z" ' +
            'fill="#7A101F" opacity="0.6"/>' +
      /* Серп и молот */
      '<g transform="translate(50 50)">' +
        '<path d="M-15 6 C-8 -2 2 -6 10 -2 L8 3 C2 0 -5 3 -10 9 Z" fill="#C9A227"/>' +
        '<rect x="-3" y="-14" width="5" height="26" fill="#C9A227" rx="1"/>' +
        '<rect x="-9" y="-10" width="18" height="4" fill="#C9A227" rx="1"/>' +
      '</g>' +
      /* Звезда */
      '<path d="M50 22 L53 30 L61 30 L55 35 L57 43 L50 38 L43 43 L45 35 L39 30 L47 30 Z" ' +
            'fill="#C9A227"/>' +
      /* Колосья */
      '<g stroke="#C9A227" stroke-width="1.2" fill="none" opacity="0.85">' +
        '<path d="M22 60 Q18 55 22 48"/>' +
        '<path d="M78 60 Q82 55 78 48"/>' +
      '</g>' +
    '</svg>';

  /* ============================================================
     Инъекция шапки
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
          '<div class="topbar-left">Официальный сайт Министерства образования СССР</div>' +
          '<div class="topbar-right">' +
            '<a href="#">Русский</a>' +
            '<span class="sep">|</span>' +
            '<a href="cn/index.html">中文</a>' +
            '<span class="sep">|</span>' +
            '<a href="#">Версия для слабовидящих</a>' +
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
              '<input type="search" placeholder="Поиск по сайту..." aria-label="Поиск">' +
              '<button type="submit">Найти</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</header>' +

      '<nav class="main-nav">' +
        '<div class="nav-inner">' + navHtml + '</div>' +
      '</nav>';
  }

  /* ============================================================
     Инъекция подвала
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
            '<p>Центральный орган государственного управления в области образования. ' +
               'Осуществляет руководство делом народного просвещения во всех союзных республиках.</p>' +
          '</div>' +

          '<div class="footer-col">' +
            '<h4>Разделы</h4>' +
            '<ul>' +
              '<li><a href="about.html">О министерстве</a></li>' +
              '<li><a href="structure.html">Структура</a></li>' +
              '<li><a href="news.html">Новости</a></li>' +
              '<li><a href="documents.html">Документы</a></li>' +
            '</ul>' +
          '</div>' +

          '<div class="footer-col">' +
            '<h4>Ресурсы</h4>' +
            '<ul>' +
              '<li><a href="#">Академия наук СССР</a></li>' +
              '<li><a href="#">Академия педагогических наук</a></li>' +
              '<li><a href="#">Издательство «Просвещение»</a></li>' +
              '<li><a href="#">Журнал «Народное образование»</a></li>' +
            '</ul>' +
          '</div>' +

          '<div class="footer-col">' +
            '<h4>Контакты</h4>' +
            '<ul>' +
              '<li>г. Москва, ул. Просвещения, 1</li>' +
              '<li>Телефон: 8 (495) 000-00-00</li>' +
              '<li>Эл. почта: press@minobr.su</li>' +
            '</ul>' +
          '</div>' +

        '</div>' +
        '<div class="footer-bottom">' +
          '<strong>' + CONFIG.siteTitleShort + '</strong> · ' + CONFIG.siteSub + '<br>' +
          '© ' + year + ' Министерство образования СССР · Все права защищены<br>' +
          '<span class="muted small">Официальный сайт. Вся информация носит справочный характер.</span>' +
        '</div>' +
      '</footer>';
  }

  /* ============================================================
     Плавное появление карточек
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
     Счётчики в баннере
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
          el.textContent = (target % 1 === 0
            ? Math.round(val)
            : val.toFixed(1)) + suffix;
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
     Логотип: печать года
     ============================================================ */
  function initConsole() {
    var style = 'background:#B01C2E;color:#E5CB6E;padding:3px 10px;border-radius:2px;font-weight:700;letter-spacing:1px';
    console.log('%c Министерство образования СССР ', style);
    console.log('%c Официальный сайт · Только для служебного пользования ', 'color:#C9A227');
  }

  /* ============================================================
     Инициализация
     ============================================================ */
  function init() {
    try { renderHeader(); } catch (e) { console.error('[main] renderHeader', e); }
    try { renderFooter(); } catch (e) { console.error('[main] renderFooter', e); }
    try { initReveal();    } catch (e) { console.error('[main] reveal', e); }
    try { initCounters();  } catch (e) { console.error('[main] counters', e); }
    try { initConsole();   } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);