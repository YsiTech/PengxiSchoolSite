/* ===================================================================
   蓬溪格勒人民高等中学 · 官方网站
   main.js  —  亚斯共和国 / 平行世界设定站
   重写版：修复受限关键词匹配，改为数组结构
   修订：移除页脚虚构声明
   =================================================================== */

(function () {
  'use strict';

  /* ================= 配置 ================= */
  var CONFIG = {
    siteName: '蓬溪格勒人民高等中学',
    ruName: 'Понксиградская народная средняя школа высшей ступени',

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

    /*
      受限关键词：数组结构，每项独立配置
      - keywords: 触发词数组，只要命中任意一个就触发
      - type: 'page' 跳转受限页 / 'toast' 仅弹提示
      - url: type='page' 时的跳转目标
      - confirm: type='page' 时的确认文案
      - msg: type='toast' 时的提示文案
    */
    restricted: [
      {
        keywords: ['507', '五〇七', '五零七'],
        type: 'page',
        url: 'warn.html',
        confirm: '警告：检测到受限关键词。\n\n该区域未授权人员不得靠近。\n是否仍要访问？'
      },
      {
        keywords: ['王宇杭', '穿越', '平行世界', '亚斯共和国', '蓬溪格勒'],
        type: 'toast',
        msg: '该学生信息受保护 · 权限不足'
      }
    ]
  };

  /* ================= 工具 ================= */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* 判断关键词是否命中（大小写不敏感，兼容中文） */
  function matchKeyword(kw, keywords) {
    var lower = kw.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
      var k = String(keywords[i]).toLowerCase();
      if (k && lower.indexOf(k) !== -1) return true;
    }
    return false;
  }

  /* Toast 轻提示 */
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

  /* ================= 站头注入 ================= */
  function renderHeader() {
    var host = $('#site-header');
    if (!host) return;
    var page = document.body.dataset.page || 'index';

    var navHtml = CONFIG.nav.map(function (item) {
      var cls = (item.id === page) ? ' class="active"' : '';
      return '<a' + cls + ' href="' + item.href + '">' + item.text + '</a>';
    }).join('');

    host.innerHTML =
      '<div class="topbar">' +
        '<div class="topbar-inner">' +
          '<div class="topbar-left">亚斯共和国教育部主管 · 蓬溪格勒市教育局主办</div>' +
          '<div class="topbar-right">' +
            '<a href="#" data-lang="as">亚斯语</a>' +
            '<a href="#" data-lang="ru">Русский</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<div class="badge" id="schoolBadge" title="蓬溪格勒人民高等中学 · 点击有惊喜">★</div>' +
          '<div class="school-name">' +
            '<h1>蓬溪格勒<span>人民高等中学</span></h1>' +
            '<p>' + CONFIG.ruName + '</p>' +
            '<p class="ru">亚斯-苏联青少年交流示范校 · 建校 1911 年</p>' +
          '</div>' +
          '<form class="search" id="siteSearch" autocomplete="off" role="search">' +
            '<input id="searchInput" placeholder="星图搜索：通知 / 新闻 / 教研" aria-label="站内搜索">' +
            '<button type="submit">搜索</button>' +
          '</form>' +
        '</div>' +
      '</header>' +

      '<nav class="main-nav" id="mainNav" aria-label="主导航">' +
        '<div class="nav-inner">' + navHtml + '</div>' +
      '</nav>';
  }

  /* ================= 页脚注入 ================= */
  function renderFooter() {
    var host = $('#site-footer');
    if (!host) return;
    var year = new Date().getFullYear();

    host.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-main">' +
          '<div>' +
            '<div class="footer-brand">' +
              '<div class="fb-star">★</div>' +
              '<div>' +
                '<b>蓬溪格勒人民高等中学</b>' +
                '<span>Ponxigrad People\'s Senior High School</span>' +
              '</div>' +
            '</div>' +
            '<p>在红星下求知，在友谊中成长。我们以基础俄语、亚斯史纲要、国际社会学为特色，培养有全球视野的社会主义建设者。</p>' +
            '<p class="small">地址：亚斯共和国蓬溪格勒市红星区复兴大道 12 号</p>' +
          '</div>' +

          '<div>' +
            '<h4>快速导航</h4>' +
            '<ul>' +
              '<li><a href="about.html">学校概况</a></li>' +
              '<li><a href="news.html">新闻中心</a></li>' +
              '<li><a href="teaching.html">教学教研</a></li>' +
              '<li><a href="students.html">学生天地</a></li>' +
              '<li><a href="moscow.html">莫斯科研学</a></li>' +
            '</ul>' +
          '</div>' +

          '<div>' +
            '<h4>服务入口</h4>' +
            '<ul>' +
              '<li><a href="admissions.html">招生报名</a></li>' +
              '<li><a href="history.html">校史馆</a></li>' +
              '<li><a href="moral.html">德育之窗</a></li>' +
              '<li><a href="contact.html">联系我们</a></li>' +
              '<li><a href="contact.html">天问终端服务</a></li>' +
            '</ul>' +
          '</div>' +

          '<div>' +
            '<h4>友情链接</h4>' +
            '<ul>' +
              '<li><a href="#">亚斯共和国教育部</a></li>' +
              '<li><a href="#">苏联教育部</a></li>' +
              '<li><a href="#">莫斯科国立大学</a></li>' +
              '<li><a href="#">蓬溪格勒磁悬浮集团</a></li>' +
              '<li><a href="#">亚斯红日网络科技中心</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="footer-bottom">' +
          '<strong>蓬溪格勒人民高等中学</strong> · 技术支持：亚斯红日网络科技中心 · 备案号：亚斯共和国版本图书馆（2025）第 03698 号<br>' +
          '© ' + year + ' 蓬溪格勒人民高等中学' +
          '<br><span class="disclaimer">红日网络 · 星图搜索已连接</span>' +
        '</div>' +
      '</footer>';
  }

  /* ================= 搜索（含彩蛋） ================= */
  function initSearch() {
    var form = $('#siteSearch');
    if (!form) return;
    var input = $('#searchInput');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = (input.value || '').trim();
      if (!kw) { toast('请输入关键词'); return; }

      /* 逐条匹配受限关键词 */
      var hit = null;
      for (var i = 0; i < CONFIG.restricted.length; i++) {
        var rule = CONFIG.restricted[i];
        if (matchKeyword(kw, rule.keywords)) { hit = rule; break; }
      }

      /* 命中受限页 */
      if (hit && hit.type === 'page') {
        var go = window.confirm(hit.confirm || '是否继续访问？');
        if (go) { location.href = hit.url; }
        else { input.value = ''; }
        return;
      }

      /* 命中提示类 */
      if (hit && hit.type === 'toast') {
        toast(hit.msg || '权限不足');
        return;
      }

      /* 普通搜索 → 新闻中心 */
      toast('星图搜索：“' + kw + '” · 已转至新闻中心');
      setTimeout(function () {
        location.href = 'news.html?q=' + encodeURIComponent(kw);
      }, 650);
    });

    /* 语言切换彩蛋 */
    $$('.topbar-right a[data-lang]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        toast(a.dataset.lang === 'ru'
          ? 'Русский язык · 亚斯语为默认界面语言'
          : '已切换至亚斯语（默认）');
      });
    });
  }

  /* ================= 校徽彩蛋 ================= */
  function initBadge() {
    var badge = $('#schoolBadge');
    if (!badge) return;
    var count = 0;
    var timer = null;

    badge.addEventListener('click', function () {
      count++;
      clearTimeout(timer);
      timer = setTimeout(function () { count = 0; }, 5000);

      if (count === 3) toast('红星闪烁 · 请继续');
      if (count >= 5) {
        count = 0;
        clearTimeout(timer);
        if (window.confirm('检测到校徽连续触发 5 次。\n\n是否进入「莫斯科研学行前准备会」档案？')) {
          location.href = 'moscow.html#prep';
        }
      }
    });
  }

  /* ================= 回到顶部 ================= */
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '回到顶部');
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
        var dur = 1200;
        var start = null;

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

    /* 新闻页：解析 ?q= 关键词 */
    if (page === 'news') {
      var q = null;
      try {
        q = new URLSearchParams(location.search).get('q');
      } catch (err) {
        q = null;
      }
      if (q) {
        var bar = document.createElement('div');
        bar.className = 'alert info';
        bar.innerHTML = '星图搜索关键词：<strong>' + q + '</strong> · 已为你过滤相关记录';
        var host = $('.section');
        if (host) host.insertBefore(bar, host.firstChild);
      }
    }

    /* 莫斯科研学页：锚点定位 */
    if (page === 'moscow' && location.hash === '#prep') {
      var prep = $('#prep');
      if (prep) {
        setTimeout(function () {
          prep.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 220);
      }
    }

    /* 联系页：表单假提交 */
    var form = $('#contactForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameEl = $('#cName');
        var name = nameEl ? nameEl.value : '';
        toast('已收到' + (name ? '，' + name : '') + ' · 校务办公室将在 3 个工作日内回复');
        form.reset();
      });
    }

    /* 招生页：报名按钮 */
    $$('[data-enroll]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toast('招生系统将在下一学年开放 · 请关注通知公告');
      });
    });
  }

  /* ================= 控制台彩蛋 ================= */
  function initConsole() {
    var style = 'background:#c8102e;color:#f0d98a;padding:3px 8px;border-radius:3px;font-weight:700';
    console.log('%c 蓬溪格勒人民高等中学 ', style);
    console.log('%c RedStarOS 5.0 | 星图搜索已连接 | 天问终端适配 ', 'color:#d4af37');
    console.log('%c 提示：站内搜索「507」有惊喜。 ', 'color:#8fa3c2');
    console.log('%c 校徽连续点击 5 次，可进入档案室。 ', 'color:#8fa3c2');
  }

  /* ================= 键盘快捷键 ================= */
  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      /* “/” 聚焦搜索 */
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !/input|textarea|select/i.test(tag)) {
        e.preventDefault();
        var input = $('#searchInput');
        if (input) input.focus();
      }
      /* Esc 关闭提示 */
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