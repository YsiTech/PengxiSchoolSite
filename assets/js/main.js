/* ===================================================================
   蓬溪格勒人民高等中学 · 官方网站
   main.js  —  亚斯共和国 / 平行世界设定站
   支持：亚斯语（中文）+ 俄语双语
   =================================================================== */

(function () {
  'use strict';

  /* ================= 语言检测 ================= */
  /* /ru/ 目录下 或 <body data-lang="ru"> 视为俄语页面 */
  var IS_RU = /\/ru\//.test(location.pathname) ||
              (document.body && document.body.dataset.lang === 'ru');

  /* 语言切换的相对路径：中文页 → ru/xxx.html，俄语页 → ../xxx.html */
  function langSwitchHref(target) {
    if (IS_RU) {
      /* 当前在 ru/ 下，切回中文版 */
      return '../' + target;
    }
    /* 当前在根目录，切到俄语版 */
    return 'ru/' + target;
  }

  /* ================= 双语词条 ================= */
  var I18N = {
    zh: {
      topLeft: '亚斯共和国教育部主管 · 蓬溪格勒市教育局主办',
      langAs: '亚斯语',
      langRu: 'Русский',
      schoolName: '蓬溪格勒人民高等中学',
      schoolSub: '亚斯-苏联青少年交流示范校 · 建校 1911 年',
      searchPlaceholder: '星图搜索：通知 / 新闻 / 教研',
      searchBtn: '搜索',
      nav: [
        { id: 'index',      text: '首页',     href: 'index.html' },
        { id: 'about',      text: '学校概况', href: 'about.html' },
        { id: 'news',       text: '新闻中心', href: 'news.html' },
        { id: 'teaching',   text: '教学教研', href: 'teaching.html' },
        { id: 'students',   text: '学生天地', href: 'students.html' },
        { id: 'moral',      text: '德育之窗', href: 'moral.html' },
        { id: 'admissions', text: '招生招聘', href: 'admissions.html' },
        { id: 'history',    text: '校史馆',   href: 'history.html' },
        { id: 'contact',    text: '联系我们', href: 'contact.html' }
      ],
      footerAbout: '在红星下求知，在友谊中成长。我们以基础俄语、亚斯史纲要、国际社会学为特色，培养有全球视野的社会主义建设者。',
      footerAddr: '地址：亚斯共和国蓬溪格勒市红星区复兴大道 12 号',
      footerQuick: '快速导航',
      footerService: '服务入口',
      footerLinks: '友情链接',
      footerServiceItems: [
        { text: '招生报名', href: 'admissions.html' },
        { text: '校史馆',   href: 'history.html' },
        { text: '德育之窗', href: 'moral.html' },
        { text: '联系我们', href: 'contact.html' },
        { text: '天问终端服务', href: 'contact.html' }
      ],
      footerQuickItems: [
        { text: '学校概况', href: 'about.html' },
        { text: '新闻中心', href: 'news.html' },
        { text: '教学教研', href: 'teaching.html' },
        { text: '学生天地', href: 'students.html' },
        { text: '莫斯科研学', href: 'moscow.html' }
      ],
      footerLinksItems: [
        { text: '亚斯共和国教育部', href: '#' },
        { text: '苏联教育部', href: '#' },
        { text: '莫斯科国立大学', href: '#' },
        { text: '蓬溪格勒磁悬浮集团', href: '#' },
        { text: '亚斯红日网络科技中心', href: '#' }
      ],
      copyright: '© {year} 蓬溪格勒人民高等中学',
      footerNote: '蓬溪格勒人民高等中学 · 技术支持：亚斯红日网络科技中心 · 备案号：亚斯共和国版本图书馆（2025）第 03698 号',
      disclaimer: '红日网络 · 星图搜索已连接',
      toastEmpty: '请输入关键词',
      toastSearch: '星图搜索：“{kw}” · 已转至新闻中心',
      toastLangAs: '已切换至亚斯语（默认）',
      toastLangRu: 'Русский язык · 亚斯语为默认界面语言',
      confirmRestricted: '警告：检测到受限关键词。\n\n该区域未授权人员不得靠近。\n是否仍要访问？',
      toastRestricted: '该学生信息受保护 · 权限不足',
      toastBadge3: '红星闪烁 · 请继续',
      confirmBadge5: '检测到校徽连续触发 5 次。\n\n是否进入「莫斯科研学行前准备会」档案？',
      toastForm: '已收到{name} · 校务办公室将在 3 个工作日内回复',
      toastEnroll: '招生系统将在下一学年开放 · 请关注通知公告',
      searchAlert: '星图搜索关键词：<strong>{kw}</strong> · 已为你过滤相关记录',
      backTop: '回到顶部'
    },
    ru: {
      topLeft: 'Министерство образования АСР · Управление образования Понксиграда',
      langAs: '亚斯语',
      langRu: 'Русский',
      schoolName: 'Понксиградская народная средняя школа высшей ступени',
      schoolSub: 'Образцовая школа молодёжного обмена АСР–СССР · Основана в 1911 г.',
      searchPlaceholder: 'Поиск: объявления / новости / учёба',
      searchBtn: 'Поиск',
      nav: [
        { id: 'index',      text: 'Главная',    href: 'index.html' },
        { id: 'about',      text: 'О школе',    href: 'about.html' },
        { id: 'news',       text: 'Новости',    href: 'news.html' },
        { id: 'teaching',   text: 'Учёба',      href: 'teaching.html' },
        { id: 'students',   text: 'Учащимся',   href: 'students.html' },
        { id: 'moral',      text: 'Воспитание', href: 'moral.html' },
        { id: 'admissions', text: 'Приём',      href: 'admissions.html' },
        { id: 'history',    text: 'История',    href: 'history.html' },
        { id: 'contact',    text: 'Контакты',   href: 'contact.html' }
      ],
      footerAbout: 'Учиться под красной звездой, расти в дружбе. Мы готовим строителей социализма с глобальным кругозором: русский язык, основы истории АСР, международная социология.',
      footerAddr: 'Адрес: АСР, г. Понксиград, Краснозвёздный район, проспект Возрождения, 12',
      footerQuick: 'Быстрые ссылки',
      footerService: 'Сервисы',
      footerLinks: 'Полезные ссылки',
      footerServiceItems: [
        { text: 'Приём',       href: 'admissions.html' },
        { text: 'История',     href: 'history.html' },
        { text: 'Воспитание',  href: 'moral.html' },
        { text: 'Контакты',    href: 'contact.html' },
        { text: 'Терминал «Тяньвэнь»', href: 'contact.html' }
      ],
      footerQuickItems: [
        { text: 'О школе', href: 'about.html' },
        { text: 'Новости', href: 'news.html' },
        { text: 'Учёба',   href: 'teaching.html' },
        { text: 'Учащимся', href: 'students.html' },
        { text: 'Москва',  href: 'moscow.html' }
      ],
      footerLinksItems: [
        { text: 'Министерство образования АСР', href: '#' },
        { text: 'Министерство образования СССР', href: '#' },
        { text: 'МГУ им. М. В. Ломоносова', href: '#' },
        { text: 'Понксиградская маглев-корпорация', href: '#' },
        { text: 'Краснозвёздный сетевой центр', href: '#' }
      ],
      copyright: '© {year} Понксиградская народная средняя школа высшей ступени',
      footerNote: 'Понксиградская народная средняя школа высшей ступени · Техническая поддержка: Краснозвёздный сетевой центр · Рег. № 03698 (2025)',
      disclaimer: 'Красная сеть · Поиск «Звёздная карта» подключён',
      toastEmpty: 'Введите ключевое слово',
      toastSearch: 'Поиск «{kw}» · переходим к новостям',
      toastLangAs: '已切换至亚斯语（默认）',
      toastLangRu: 'Русский язык · 亚斯语为默认界面语言',
      confirmRestricted: 'ВНИМАНИЕ: обнаружено закрытое ключевое слово.\n\nПосторонним вход воспрещён.\nПродолжить?',
      toastRestricted: 'Информация защищена · недостаточно прав',
      toastBadge3: 'Красная звезда мигает · продолжайте',
      confirmBadge5: 'Эмблема нажата 5 раз.\n\nПерейти к архиву «Подготовка к Москве»?',
      toastForm: 'Получено{name} · канцелярия ответит в течение 3 рабочих дней',
      toastEnroll: 'Приёмная система откроется в следующем учебном году',
      searchAlert: 'Ключевое слово: <strong>{kw}</strong> · найдены записи',
      backTop: 'Наверх'
    }
  };

  var T = I18N[IS_RU ? 'ru' : 'zh'];

  /* 受限关键词（双语共用） */
  var RESTRICTED = [
    { keywords: ['507', '五〇七', '五零七'], type: 'page', url: IS_RU ? '../warn.html' : 'warn.html' },
    { keywords: ['王宇杭', '穿越', '平行世界', '亚斯共和国', '蓬溪格勒'], type: 'toast' }
  ];

  /* ================= 工具 ================= */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function fmt(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return (k in vars) ? vars[k] : m;
    });
  }
  function matchKeyword(kw, keywords) {
    var lower = kw.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
      var k = String(keywords[i]).toLowerCase();
      if (k && lower.indexOf(k) !== -1) return true;
    }
    return false;
  }

  /* Toast */
  var toastTimer = null;
  function toast(msg, duration) {
    var el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, duration || 2600);
  }
  window.siteToast = toast;

  /* ================= 站头 ================= */
  function renderHeader() {
    var host = $('#site-header');
    if (!host) return;
    var page = document.body.dataset.page || 'index';

    var navHtml = T.nav.map(function (item) {
      var cls = (item.id === page) ? ' class="active"' : '';
      return '<a' + cls + ' href="' + item.href + '">' + item.text + '</a>';
    }).join('');

    /* 语言切换链接 */
    var pageFile = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
    var asHref = IS_RU ? '../' + pageFile : pageFile;
    var ruHref = IS_RU ? pageFile : 'ru/' + pageFile;

    var asCls = IS_RU ? '' : ' class="on"';
    var ruCls = IS_RU ? ' class="on"' : '';

    host.innerHTML =
      '<div class="topbar">' +
        '<div class="topbar-inner">' +
          '<div class="topbar-left">' + T.topLeft + '</div>' +
          '<div class="topbar-right">' +
            '<a href="' + asHref + '"' + asCls + '>' + T.langAs + '</a>' +
            '<a href="' + ruHref + '"' + ruCls + '>' + T.langRu + '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<a class="badge" id="schoolBadge" href="' + (IS_RU ? '../index.html' : 'index.html') + '" title="' + T.schoolName + '">★</a>' +
          '<div class="school-name">' +
            '<h1>' + T.schoolName + '</h1>' +
            '<p>' + (IS_RU ? 'Понксиградская народная средняя школа высшей ступени' : 'Понксиградская народная средняя школа высшей ступени') + '</p>' +
            '<p class="ru">' + T.schoolSub + '</p>' +
          '</div>' +
          '<form class="search" id="siteSearch" autocomplete="off" role="search">' +
            '<input id="searchInput" placeholder="' + T.searchPlaceholder + '" aria-label="' + T.searchBtn + '">' +
            '<button type="submit">' + T.searchBtn + '</button>' +
          '</form>' +
        '</div>' +
      '</header>' +

      '<nav class="main-nav" id="mainNav" aria-label="' + (IS_RU ? 'Навигация' : '主导航') + '">' +
        '<div class="nav-inner">' + navHtml + '</div>' +
      '</nav>';
  }

  /* ================= 页脚 ================= */
  function renderFooter() {
    var host = $('#site-footer');
    if (!host) return;
    var year = new Date().getFullYear();

    function list(items) {
      return items.map(function (it) {
        return '<li><a href="' + it.href + '">' + it.text + '</a></li>';
      }).join('');
    }

    host.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-main">' +
          '<div>' +
            '<div class="footer-brand">' +
              '<div class="fb-star">★</div>' +
              '<div>' +
                '<b>' + T.schoolName + '</b>' +
                '<span>Ponxigrad People\'s Senior High School</span>' +
              '</div>' +
            '</div>' +
            '<p>' + T.footerAbout + '</p>' +
            '<p class="small">' + T.footerAddr + '</p>' +
          '</div>' +

          '<div>' +
            '<h4>' + T.footerQuick + '</h4>' +
            '<ul>' + list(T.footerQuickItems) + '</ul>' +
          '</div>' +

          '<div>' +
            '<h4>' + T.footerService + '</h4>' +
            '<ul>' + list(T.footerServiceItems) + '</ul>' +
          '</div>' +

          '<div>' +
            '<h4>' + T.footerLinks + '</h4>' +
            '<ul>' + list(T.footerLinksItems) + '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="footer-bottom">' +
          '<strong>' + T.schoolName + '</strong><br>' +
          T.footerNote + '<br>' +
          fmt(T.copyright, { year: year }) +
          '<br><span class="disclaimer">' + T.disclaimer + '</span>' +
        '</div>' +
      '</footer>';
  }

  /* ================= 搜索 ================= */
  function initSearch() {
    var form = $('#siteSearch');
    if (!form) return;
    var input = $('#searchInput');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = (input.value || '').trim();
      if (!kw) { toast(T.toastEmpty); return; }

      var hit = null;
      for (var i = 0; i < RESTRICTED.length; i++) {
        if (matchKeyword(kw, RESTRICTED[i].keywords)) { hit = RESTRICTED[i]; break; }
      }

      if (hit && hit.type === 'page') {
        if (window.confirm(T.confirmRestricted)) { location.href = hit.url; }
        else { input.value = ''; }
        return;
      }
      if (hit && hit.type === 'toast') {
        toast(T.toastRestricted);
        return;
      }

      toast(fmt(T.toastSearch, { kw: kw }));
      setTimeout(function () {
        var target = IS_RU ? '../news.html' : 'news.html';
        location.href = target + '?q=' + encodeURIComponent(kw);
      }, 650);
    });
  }

  /* ================= 校徽彩蛋 ================= */
  function initBadge() {
    var badge = $('#schoolBadge');
    if (!badge) return;
    var count = 0, timer = null;

    badge.addEventListener('click', function (e) {
      /* 如果 badge 是 <a>，点击 5 次后阻止默认跳转 */
      count++;
      clearTimeout(timer);
      timer = setTimeout(function () { count = 0; }, 5000);

      if (count === 3) toast(T.toastBadge3);
      if (count >= 5) {
        e.preventDefault();
        count = 0;
        clearTimeout(timer);
        if (window.confirm(T.confirmBadge5)) {
          location.href = (IS_RU ? '../moscow.html' : 'moscow.html') + '#prep';
        }
      }
    });
  }

  /* ================= 回到顶部 ================= */
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', T.backTop);
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    var onScroll = function () {
      btn.classList.toggle('show', window.scrollY > 420);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ================= 滚动显现 ================= */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var targets = $$('.card, .stat, .person, .figure, .tile');
    if (!targets.length) return;

    targets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
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

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ================= 数字滚动 ================= */
  function initCounters() {
    var stats = $$('.stat b[data-count]');
    if (!stats.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.dataset.count) || 0;
        var suffix = el.dataset.suffix || '';
        var dur = 1200, start = null;

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
    }, { threshold: 0.5 });

    stats.forEach(function (el) { io.observe(el); });
  }

  /* ================= 页面特定逻辑 ================= */
  function initPageExtras() {
    var page = document.body.dataset.page;

    if (page === 'news') {
      var q = null;
      try { q = new URLSearchParams(location.search).get('q'); } catch (err) { q = null; }
      if (q) {
        var bar = document.createElement('div');
        bar.className = 'alert info';
        bar.innerHTML = fmt(T.searchAlert, { kw: q });
        var host = $('.section');
        if (host) host.insertBefore(bar, host.firstChild);
      }
    }

    if (page === 'moscow' && location.hash === '#prep') {
      var prep = $('#prep');
      if (prep) setTimeout(function () {
        prep.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 220);
    }

    var form = $('#contactForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameEl = $('#cName');
        var name = nameEl ? nameEl.value : '';
        toast(fmt(T.toastForm, { name: name ? '，' + name : '' }));
        form.reset();
      });
    }

    $$('[data-enroll]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toast(T.toastEnroll);
      });
    });
  }

  /* ================= 控制台 ================= */
  function initConsole() {
    var style = 'background:#c8102e;color:#f0d98a;padding:3px 8px;border-radius:3px;font-weight:700';
    console.log('%c ' + T.schoolName + ' ', style);
    console.log('%c RedStarOS 5.0 | 星图搜索已连接 | 天问终端适配 ', 'color:#d4af37');
    console.log('%c 提示：站内搜索「507」有惊喜。 ', 'color:#8fa3c2');
    console.log('%c 校徽连续点击 5 次，可进入档案室。 ', 'color:#8fa3c2');
  }

  /* ================= 键盘 ================= */
  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !/input|textarea|select/i.test(tag)) {
        e.preventDefault();
        var input = $('#searchInput');
        if (input) input.focus();
      }
      if (e.key === 'Escape') {
        var el = $('.toast');
        if (el) el.classList.remove('show');
      }
    });
  }

  /* ================= 启动 ================= */
  function init() {
    renderHeader();
    renderFooter();
    initSearch();
    initBadge();
    initBackToTop();
    initReveal();
    initCounters();
    initPageExtras();
    initConsole();
    initShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();