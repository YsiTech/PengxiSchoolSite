/* ===================================================================
   蓬溪格勒人民高等中学 · 官方网站
   main.js — 完整版（含校徽 logo 替换）
   =================================================================== */

(function () {
  'use strict';

  var IS_RU = /\/ru\//.test(location.pathname) ||
              (document.body && document.body.dataset.lang === 'ru');

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
        { id:'index',      text:'首页',     href:'mainsite.html' },
        { id:'about',      text:'学校概况', href:'about.html' },
        { id:'news',       text:'新闻中心', href:'news.html' },
        { id:'teaching',   text:'教学教研', href:'teaching.html' },
        { id:'students',   text:'学生天地', href:'students.html' },
        { id:'videohub',   text:'视觉蓬中', href:'videohub.html' },
        { id:'campusnet',  text:'校园网',   href:'campusnet.html' },
        { id:'xingtu',     text:'星图',     href:'xingtu.html' },
        { id:'blog',       text:'校园随笔', href:'blog.html' },
        { id:'moral',      text:'德育之窗', href:'moral.html' },
        { id:'admissions', text:'招生招聘', href:'admissions.html' },
        { id:'history',    text:'校史馆',   href:'history.html' },
        { id:'contact',    text:'联系我们', href:'contact.html' },
        { id:'history',    text:'个人中心',   href:'profile.html' }
      ],
      footerAbout: '在红星下求知，在友谊中成长。我们以基础俄语、亚斯史纲要、国际社会学为特色，培养有全球视野的社会主义建设者。',
      footerAddr: '地址：亚斯共和国蓬溪格勒市红星区复兴大道 12 号',
      footerQuick: '快速导航',
      footerService: '服务入口',
      footerLinks: '友情链接',
      footerQuickItems: [
        { text:'学校概况', href:'about.html' },
        { text:'新闻中心', href:'news.html' },
        { text:'教学教研', href:'teaching.html' },
        { text:'校园随笔', href:'blog.html' },
        { text:'莫斯科研学', href:'moscow.html' }
      ],
      footerServiceItems: [
        { text:'视觉蓬中', href:'videohub.html' },
        { text:'校园网订购', href:'campusnet.html' },
        { text:'星图', href:'xingtu.html' },
        { text:'校史馆', href:'history.html' },
        { text:'联系我们', href:'contact.html' }
      ],
      footerLinksItems: [
        { text:'亚斯共和国教育部', href:'#' },
        { text:'苏联教育部', href:'#' },
        { text:'莫斯科国立大学', href:'#' },
        { text:'蓬溪格勒磁悬浮集团', href:'#' },
        { text:'亚斯红日网络科技中心', href:'#' }
      ],
      copyright: '© {year} 蓬溪格勒人民高等中学',
      footerNote: '蓬溪格勒人民高等中学 · 技术支持：亚斯红日网络科技中心 · 备案号：亚斯共和国版本图书馆（2025）第 03698 号',
      disclaimer: '红日网络 · 星图搜索已连接',
      toastEmpty: '请输入关键词',
      toastSearch: '星图搜索：“{kw}” · 已转至搜索页',
      toastRestricted: '该学生信息受保护 · 权限不足',
      confirmRestricted: '警告：检测到受限关键词。\n\n该区域未授权人员不得靠近。\n是否仍要访问？',
      toastBadge3: '红星闪烁 · 请继续',
      confirmBadge5: '检测到校徽连续触发 5 次。\n\n是否进入「莫斯科研学行前准备会」档案？',
      toastForm: '已收到{name} · 校务办公室将在 3 个工作日内回复',
      toastEnroll: '招生系统将在下一学年开放 · 请关注通知公告',
      backTop: '回到顶部',
      sdHistory: '最近搜索',
      sdClear: '清空',
      sdHot: '热门',
      sdEmpty: '未找到相关内容',
      sdViewAll: '查看全部 {n} 条结果 →',
      sdPage: '页面',
      sdNews: '新闻',
      spResultsFor: '关键词：<strong>{kw}</strong>',
      spCount: '共找到 <b>{n}</b> 条相关记录',
      spEmpty: '没有找到与 <strong>{kw}</strong> 相关的内容',
      spHint: '试试「莫斯科研学」「磁悬浮」「核物理」「惊鸿」',
      spSub: '全站检索 · 新闻 · 通知 · 教研 · 校史',
      vhPending: '该视频尚未上线，敬请期待',
      vhLike: '点赞', vhLiked: '已点赞',
      vhFav: '收藏', vhFaved: '已收藏',
      vhShare: '分享', vhShareCopied: '链接已复制到剪贴板',
      vhErr: '视频加载失败，请确认 video/1.mp4 已就位'
    },
    ru: {
      topLeft: 'Министерство образования АСР · Управление образования Понксиграда',
      langAs: '亚斯语',
      langRu: 'Русский',
      schoolName: 'Понксиградская народная средняя школа высшей ступени',
      schoolSub: 'Образцовая школа обмена АСР–СССР · Основана в 1911 г.',
      searchPlaceholder: 'Поиск: объявления / новости / учёба',
      searchBtn: 'Поиск',
      nav: [
        { id:'index',      text:'Главная',    href:'mainsite.html' },
        { id:'about',      text:'О школе',    href:'about.html' },
        { id:'news',       text:'Новости',    href:'news.html' },
        { id:'teaching',   text:'Учёба',      href:'teaching.html' },
        { id:'blog',       text:'Блог',       href:'blog.html' },
        { id:'students',   text:'Учащимся',   href:'students.html' },
        { id:'videohub',   text:'Видео',      href:'videohub.html' },
        { id:'campusnet',  text:'Сеть',       href:'campusnet.html' },
        { id:'xingtu',     text:'Созвездие',  href:'xingtu.html' },
        { id:'moral',      text:'Воспитание', href:'moral.html' },
        { id:'admissions', text:'Приём',      href:'admissions.html' },
        { id:'history',    text:'История',    href:'history.html' },
        { id:'contact',    text:'Контакты',   href:'contact.html' }
      ],
      footerAbout: 'Учиться под красной звездой, расти в дружбе.',
      footerAddr: 'Адрес: АСР, г. Понксиград, Краснозвёздный район, проспект Возрождения, 12',
      footerQuick: 'Быстрые ссылки',
      footerService: 'Сервисы',
      footerLinks: 'Полезные ссылки',
      footerQuickItems: [
        { text:'О школе', href:'about.html' },
        { text:'Новости', href:'news.html' },
        { text:'Учёба', href:'teaching.html' },
        { text:'Блог', href:'blog.html' },
        { text:'Москва', href:'moscow.html' }
      ],
      footerServiceItems: [
        { text:'Видеоцентр', href:'videohub.html' },
        { text:'Заказ сети', href:'campusnet.html' },
        { text:'Созвездие', href:'xingtu.html' },
        { text:'История', href:'history.html' },
        { text:'Контакты', href:'contact.html' }
      ],
      footerLinksItems: [
        { text:'Министерство образования АСР', href:'#' },
        { text:'Министерство образования СССР', href:'#' },
        { text:'МГУ им. М. В. Ломоносова', href:'#' },
        { text:'Понксиградская маглев-корпорация', href:'#' },
        { text:'Краснозвёздный сетевой центр', href:'#' }
      ],
      copyright: '© {year} Понксиградская народная средняя школа высшей ступени',
      footerNote: 'Понксиградская народная средняя школа высшей ступени · Техническая поддержка: Краснозвёздный сетевой центр',
      disclaimer: 'Красная сеть · Поиск «Звёздная карта» подключён',
      toastEmpty: 'Введите ключевое слово',
      toastSearch: 'Поиск «{kw}» · переходим',
      toastRestricted: 'Информация защищена · недостаточно прав',
      confirmRestricted: 'ВНИМАНИЕ: обнаружено закрытое ключевое слово.\n\nПосторонним вход воспрещён.\nПродолжить?',
      toastBadge3: 'Красная звезда мигает · продолжайте',
      confirmBadge5: 'Эмблема нажата 5 раз.\n\nПерейти к архиву «Подготовка к Москве»?',
      toastForm: 'Получено{name} · канцелярия ответит в течение 3 рабочих дней',
      toastEnroll: 'Приёмная система откроется в следующем учебном году',
      backTop: 'Наверх',
      sdHistory: 'История поиска',
      sdClear: 'Очистить',
      sdHot: 'Популярное',
      sdEmpty: 'Ничего не найдено',
      sdViewAll: 'Показать все результаты: {n} →',
      sdPage: 'Страница',
      sdNews: 'Новость',
      spResultsFor: 'Ключевое слово: <strong>{kw}</strong>',
      spCount: 'Найдено: <b>{n}</b>',
      spEmpty: 'Ничего не найдено по запросу <strong>{kw}</strong>',
      spHint: 'Попробуйте: «Москва», «маглев», «ядерная физика»',
      spSub: 'По всему сайту · новости · учёба · история',
      vhPending: 'Видео пока не опубликовано',
      vhLike: 'Нравится', vhLiked: 'Понравилось',
      vhFav: 'В избранное', vhFaved: 'В избранном',
      vhShare: 'Поделиться', vhShareCopied: 'Ссылка скопирована',
      vhErr: 'Не удалось загрузить видео'
    }
  };

  var T = I18N[IS_RU ? 'ru' : 'zh'];

  var SEARCH_INDEX = [
    { href:'mainsite.html',   type:'page', zh:['首页','蓬溪格勒人民高等中学官方网站 · 在红星下求知'],       ru:['Главная','Официальный сайт школы'],       k:'首页 主页 网站 学校 главная' },
    { href:'about.html',      type:'page', zh:['学校概况','学校简介 · 校长致辞 · 校史沿革 · 领导班子'],     ru:['О школе','Описание · директор · история'], k:'学校 概况 简介 校长 领导 школа about' },
    { href:'news.html',       type:'page', zh:['新闻中心','校园新闻 · 通知公告 · 媒体聚焦 · 莫斯科研学'],  ru:['Новости','Школьные новости · объявления'], k:'新闻 通知 公告 消息 новости news' },
    { href:'teaching.html',   type:'page', zh:['教学教研','课程体系 · 俄语特色 · 教研组 · 竞赛成果'],      ru:['Учёба','Учебный план · русский · кафедры'], k:'教学 教研 课程 老师 teaching учёба' },
    { href:'blog.html',       type:'page', zh:['校园随笔','学生博客 · 随笔 · 研学 · 人物 · 科技 · 交流'],  ru:['Блог','Студенческий блог'],                 k:'博客 随笔 校园 blog блог' },
    { href:'students.html',   type:'page', zh:['学生天地','学生会 · 社团活动 · 优秀作品 · 惊鸿十二班'],    ru:['Учащимся','Совет · клубы · работы · класс 12–2'], k:'学生 社团 活动 惊鸿 students' },
    { href:'videohub.html',   type:'page', zh:['视觉蓬中','校园影像 · 研学纪实 · 社团风采 · 活动回顾'],    ru:['Видео Понксина','Кампус · Москва · клубы · события'], k:'视频 影像 宣传片 视频中心 видео' },
    { href:'campusnet.html',  type:'page', zh:['校园网订购','套餐选择 · 亚斯卢布结算 · 校园卡/卢布账户/银行转账'], ru:['Заказ сети','Тарифы · оплата в яс-рублях'], k:'校园网 订购 套餐 宽带 wifi 网络 亚斯卢布 campus net' },
    { href:'xingtu.html',     type:'page', zh:['星图','多人文字 · 文件 · 一对一语音视频 · 点对点通信'],      ru:['Созвездие','Чат · файлы · аудио · видео'], k:'星图 聊天 语音 视频 文件 对讲 созвездие' },
    { href:'moral.html',      type:'page', zh:['德育之窗','亚斯先锋队 · 志愿服务 · 劳动教育'],            ru:['Воспитание','Пионеры · волонтёрство · труд'], k:'德育 先锋队 志愿 劳动 воспитание' },
    { href:'admissions.html', type:'page', zh:['招生招聘','招生简章 · 报名入口 · 教师招聘'],              ru:['Приём','Правила приёма · вакансии'],  k:'招生 报名 招聘 admissions приём' },
    { href:'history.html',    type:'page', zh:['校史馆','建校 1911 年 · 与共和国同行 · 校史沿革'],         ru:['История','Основана в 1911 г. · хронология'], k:'校史 历史 1911 history история' },
    { href:'moscow.html',     type:'page', zh:['莫斯科研学','社会主义城市的现代化变迁 · 红场 · 克里姆林宫'],ru:['Москва','Модернизация социалистического города'], k:'莫斯科 研学 苏联 交流 москва' },
    { href:'contact.html',    type:'page', zh:['联系我们','校务办公室 · 招生咨询 · 天问终端服务'],        ru:['Контакты','Канцелярия · приёмная · Терминал'], k:'联系 电话 地址 contact контакты' }
  ];

  var RESTRICTED = [
    { keywords: ['507', '五〇七', '五零七'], type: 'page', url: IS_RU ? '../warn.html' : 'warn.html' },
    { keywords: ['王宇杭', '穿越', '平行世界', '亚斯共和国', '蓬溪格勒'], type: 'toast' }
  ];

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return (k in vars) ? vars[k] : m;
    });
  }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function escRe(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function highlight(text, kw) {
    if (!kw) return esc(text);
    var re = new RegExp('(' + escRe(kw) + ')', 'gi');
    return esc(text).replace(re, '<mark>$1</mark>');
  }
  function matchKeyword(kw, keywords) {
    var lower = kw.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
      var k = String(keywords[i]).toLowerCase();
      if (k && lower.indexOf(k) !== -1) return true;
    }
    return false;
  }
  function searchIndex(kw, limit) {
    var ql = kw.toLowerCase().trim();
    if (!ql) return [];
    var hits = [];
    var langKey = IS_RU ? 'ru' : 'zh';
    SEARCH_INDEX.forEach(function (item) {
      var lang = item[langKey];
      var haystack = (lang[0] + ' ' + lang[1] + ' ' + item.k).toLowerCase();
      if (haystack.indexOf(ql) !== -1) {
        hits.push({ href: item.href, type: item.type, title: lang[0], desc: lang[1] });
      }
    });
    return limit ? hits.slice(0, limit) : hits;
  }

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

  var HISTORY_KEY = 'pxgl_search_history_' + (IS_RU ? 'ru' : 'zh');
  function getHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function pushHistory(kw) {
    kw = String(kw || '').trim();
    if (!kw) return;
    var list = getHistory().filter(function (x) { return x !== kw; });
    list.unshift(kw);
    list = list.slice(0, 6);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
  }

  /* ============================================================
     站头渲染（含校徽 logo）
     ============================================================ */
  function renderHeader() {
    var host = $('#site-header');
    if (!host) return;
    var page = document.body.dataset.page || 'index';

    var navHtml = T.nav.map(function (item) {
      var cls = (item.id === page) ? ' class="active"' : '';
      return '<a' + cls + ' href="' + item.href + '">' + item.text + '</a>';
    }).join('');

    var pageFile = (location.pathname.split('/').pop() || 'mainsite.html').split('?')[0];
    /* 亚斯语链接：正常（从 ru/ 回主站，或留在主站） */
    var asHref = IS_RU ? '../' + pageFile : pageFile;
    /* 俄语链接：改成跳转到维护页 */
    var ruHref = IS_RU ? '../maintenance.html' : 'maintenance.html';
    var asCls = IS_RU ? '' : ' class="on"';
    var ruCls = IS_RU ? ' class="on"' : '';

    /* 校徽：使用 photo/logo.png */
    var logoPath = IS_RU ? '../photo/logo.png' : 'photo/logo.png';

    host.innerHTML =
      '<div class="topbar">' +
        '<div class="topbar-inner">' +
          '<div class="topbar-left">' + T.topLeft + '</div>' +
          '<div class="topbar-right">' +
            '<a href="' + asHref + '"' + asCls + '>' + T.langAs + '</a>' +
            '<a href="' + ruHref + '"' + ruCls + '>' + T.langRu + '</a>' +
            '<span class="auth-nav"></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<a class="badge" id="schoolBadge" href="' + (IS_RU ? '../mainsite.html' : 'mainsite.html') + '" title="' + T.schoolName + '">' +
            '<img src="' + logoPath + '" alt="' + T.schoolName + '">' +
          '</a>' +
          '<div class="school-name">' +
            '<h1>' + T.schoolName + '</h1>' +
            '<p>Понксиградская народная средняя школа высшей ступени</p>' +
            '<p class="ru">' + T.schoolSub + '</p>' +
          '</div>' +
          '<form class="search" id="siteSearch" autocomplete="off" role="search">' +
            '<input id="searchInput" placeholder="' + T.searchPlaceholder + '" aria-label="' + T.searchBtn + '" aria-autocomplete="list">' +
            '<button type="submit">' + T.searchBtn + '</button>' +
          '</form>' +
        '</div>' +
      '</header>' +
      '<nav class="main-nav" id="mainNav">' +
        '<div class="nav-inner">' + navHtml + '</div>' +
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
      return items.map(function (it) {
        return '<li><a href="' + it.href + '">' + it.text + '</a></li>';
      }).join('');
    }

    host.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-main">' +
          '<div>' +
            '<div class="footer-brand">' +
  '<div class="fb-star">' +
    '<img src="' + (IS_RU ? '../photo/logo.png' : 'photo/logo.png') + '" alt="' + T.schoolName + '">' +
  '</div>' +
  '<div><b>' + T.schoolName + '</b>' +
  '<span>Ponxigrad People\'s Senior High School</span></div>' +
'</div>' +
            '<p>' + T.footerAbout + '</p>' +
            '<p class="small">' + T.footerAddr + '</p>' +
          '</div>' +
          '<div><h4>' + T.footerQuick + '</h4><ul>' + list(T.footerQuickItems) + '</ul></div>' +
          '<div><h4>' + T.footerService + '</h4><ul>' + list(T.footerServiceItems) + '</ul></div>' +
          '<div><h4>' + T.footerLinks + '</h4><ul>' + list(T.footerLinksItems) + '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<strong>' + T.schoolName + '</strong><br>' +
          T.footerNote + '<br>' +
          fmt(T.copyright, { year: year }) +
          '<br><span class="disclaimer">' + T.disclaimer + '</span>' +
        '</div>' +
      '</footer>';
  }

  /* ============================================================
     搜索
     ============================================================ */
  function setupSearchForm(form, input) {
    if (!form || !input) return;
    if (form.dataset.searchInit === '1') return;
    form.dataset.searchInit = '1';

    var dd = document.createElement('div');
    dd.className = 'search-dropdown';
    form.appendChild(dd);

    var activeIdx = -1;

    function close() { dd.classList.remove('show'); activeIdx = -1; }
    function open() { dd.classList.add('show'); }
    function updateActive() {
      $$('.sd-item', dd).forEach(function (el, i) {
        el.classList.toggle('active', i === activeIdx);
      });
    }

    function doSubmit(kw) {
      kw = String(kw || input.value || '').trim();
      if (!kw) { toast(T.toastEmpty); input.focus(); return; }

      var hit = null;
      for (var i = 0; i < RESTRICTED.length; i++) {
        if (matchKeyword(kw, RESTRICTED[i].keywords)) { hit = RESTRICTED[i]; break; }
      }
      if (hit && hit.type === 'page') {
        if (window.confirm(T.confirmRestricted)) location.href = hit.url;
        return;
      }
      if (hit && hit.type === 'toast') { toast(T.toastRestricted); return; }

      pushHistory(kw);
      var target = 'search.html?q=' + encodeURIComponent(kw);
      if (document.body.dataset.page === 'search') {
        location.href = target;
      } else {
        toast(fmt(T.toastSearch, { kw: kw }));
        setTimeout(function () { location.href = target; }, 500);
      }
    }

    function bindItemClicks() {
      $$('.sd-item', dd).forEach(function (el, idx) {
        el.addEventListener('mouseenter', function () { activeIdx = idx; updateActive(); });
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          var href = el.getAttribute('data-href');
          var isKw = el.getAttribute('data-is-kw') === '1';
          var kw = el.getAttribute('data-kw') || input.value;
          if (isKw) doSubmit(kw);
          else if (href) { pushHistory(kw); location.href = href; }
        });
      });
    }

    function renderList(items) {
      var html = '<div class="sd-section">';
      items.forEach(function (it) {
        html += '<div class="sd-item" data-href="' + (it.href || '') + '" ' +
                'data-kw="' + esc(it.kw || '') + '" ' +
                'data-is-kw="' + (it.isKw ? '1' : '0') + '">' +
                  (it.type ? '<span class="sdi-type">' + esc(it.type) + '</span>' : '') +
                  '<span class="sdi-title">' + (it.html || esc(it.title)) + '</span>' +
                  (it.desc ? '<div class="sdi-desc">' + esc(it.desc) + '</div>' : '') +
                '</div>';
      });
      html += '</div>';
      return html;
    }

    function refresh() {
      var kw = (input.value || '').trim();
      var html = '';

      if (!kw) {
        var hist = getHistory();
        if (hist.length) {
          html += '<div class="sd-section"><div class="sd-title">' + esc(T.sdHistory) +
                  '<a class="sd-clear">' + esc(T.sdClear) + '</a></div>';
          hist.forEach(function (h) {
            html += '<div class="sd-item" data-kw="' + esc(h) + '" data-is-kw="1">' +
                      '<span class="sdi-title">' + esc(h) + '</span></div>';
          });
          html += '</div>';
        }
        var hot = IS_RU
          ? ['Москва', 'маглев', 'ядерная физика', 'Тяньвэнь', 'класс 12–2']
          : ['莫斯科研学', '磁悬浮', '核物理', '天问终端', '惊鸿文学社'];
        html += '<div class="sd-section"><div class="sd-title">' + esc(T.sdHot) + '</div>';
        hot.forEach(function (h) {
          html += '<div class="sd-item" data-kw="' + esc(h) + '" data-is-kw="1">' +
                    '<span class="sdi-title">' + esc(h) + '</span></div>';
        });
        html += '</div>';
      } else {
        var hits = searchIndex(kw, 6);
        if (!hits.length) {
          html = '<div class="sd-section"><div class="sd-empty">' + esc(T.sdEmpty) + '</div></div>';
        } else {
          var items = hits.map(function (h) {
            return {
              href: h.href,
              type: h.type === 'news' ? T.sdNews : T.sdPage,
              html: highlight(h.title, kw),
              desc: h.desc, kw: kw
            };
          });
          html += renderList(items);
          html += '<div class="sd-section sd-footer">' +
                    '<div class="sd-item sd-see-all" data-kw="' + esc(kw) + '" data-is-kw="1">' +
                      '<span class="sdi-title">' + fmt(T.sdViewAll, { n: hits.length }) + '</span>' +
                    '</div></div>';
        }
      }

      dd.innerHTML = html;
      activeIdx = -1;

      var clr = $('.sd-clear', dd);
      if (clr) {
        clr.addEventListener('mousedown', function (e) {
          e.preventDefault();
          clearHistory();
          refresh();
        });
      }
      bindItemClicks();
      if (html.trim()) open(); else close();
    }

    input.addEventListener('input', refresh);
    input.addEventListener('focus', refresh);
    input.addEventListener('blur', function () { setTimeout(close, 180); });
    input.addEventListener('keydown', function (e) {
      var items = $$('.sd-item', dd);
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % items.length;
        updateActive();
        items[activeIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + items.length) % items.length;
        updateActive();
        items[activeIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        items[activeIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      } else if (e.key === 'Escape') {
        close();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      doSubmit(input.value);
    });
  }

  function initSearch() {
    var headerForm = $('#siteSearch');
    var headerInput = $('#searchInput');
    if (headerForm && headerInput) setupSearchForm(headerForm, headerInput);
    var pageForm = $('#searchPageForm');
    var pageInput = $('#searchPageInput');
    if (pageForm && pageInput) setupSearchForm(pageForm, pageInput);
  }

  function initSearchPage() {
    if (document.body.dataset.page !== 'search') return;
    var q = '';
    try { q = (new URLSearchParams(location.search).get('q') || '').trim(); } catch (e) {}
    var big = $('#searchPageInput');
    if (big) big.value = q;
    var head = $('#searchPageHeadline');
    if (head) head.innerHTML = q ? fmt(T.spResultsFor, { kw: esc(q) }) : esc(T.spSub);
    var results = $('#searchResults');
    if (!results) return;
    if (!q) {
      results.innerHTML = '<div class="search-empty"><p>' + esc(T.spHint) + '</p></div>';
      return;
    }
    var hits = searchIndex(q);
    if (!hits.length) {
      results.innerHTML =
        '<div class="search-empty">' +
          '<p>' + fmt(T.spEmpty, { kw: esc(q) }) + '</p>' +
          '<p class="small muted">' + esc(T.spHint) + '</p>' +
        '</div>';
      return;
    }
    var html = '<div class="search-count">' + fmt(T.spCount, { n: hits.length }) + '</div>';
    ['page', 'news'].forEach(function (group) {
      var groupHits = hits.filter(function (h) { return h.type === group; });
      if (!groupHits.length) return;
      var groupTitle = group === 'page'
        ? (IS_RU ? 'Страницы' : '页面')
        : (IS_RU ? 'Новости' : '新闻');
      html += '<h3 class="search-group">' + esc(groupTitle) + '</h3>';
      groupHits.forEach(function (h) {
        var typeLabel = group === 'news' ? T.sdNews : T.sdPage;
        html += '<a class="search-result" href="' + h.href + '">' +
                  '<span class="sr-type">' + esc(typeLabel) + '</span>' +
                  '<h4>' + highlight(h.title, q) + '</h4>' +
                  '<p>' + esc(h.desc) + '</p>' +
                '</a>';
      });
    });
    results.innerHTML = html;
  }

  function initVideoHub() {
    if (document.body.dataset.page !== 'videohub') return;
    var player = $('#mainPlayer');
    var titleEl = $('#videoTitle');
    var list = $('#videoList');
    if (!player || !list) return;
    var metaEls = $$('.video-meta span');
    var descEl = $('.video-desc');
    $$('.video-item', list).forEach(function (item) {
      item.addEventListener('click', function () {
        if (item.dataset.pending === '1') { toast(T.vhPending); return; }
        var src = item.dataset.src;
        var title = item.dataset.title;
        if (!src) return;
        $$('.video-item', list).forEach(function (x) { x.classList.remove('active'); });
        item.classList.add('active');
        player.src = src;
        player.load();
        try { player.play(); } catch (e) {}
        if (titleEl && title) titleEl.textContent = title;
        if (metaEls.length >= 4) {
          metaEls[0].textContent = item.dataset.date || '';
          metaEls[1].textContent = item.dataset.cat || '';
          metaEls[2].textContent = item.dataset.duration || '';
          metaEls[3].textContent = item.dataset.views || '';
        }
        if (descEl) descEl.textContent = item.dataset.desc || '';
        if (title) document.title = title + ' · ' + T.schoolName;
      });
    });
    player.addEventListener('error', function () { toast(T.vhErr, 4000); });
    var likeBtn = $('#videoLike');
    var favBtn = $('#videoFav');
    var shareBtn = $('#videoShare');
    if (likeBtn) likeBtn.addEventListener('click', function () {
      var on = likeBtn.classList.toggle('on');
      likeBtn.textContent = on ? T.vhLiked : T.vhLike;
    });
    if (favBtn) favBtn.addEventListener('click', function () {
      var on = favBtn.classList.toggle('on');
      favBtn.textContent = on ? T.vhFaved : T.vhFav;
    });
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var url = location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(function () { toast(T.vhShareCopied); })
          .catch(function () { toast(T.vhShareCopied); });
      } else {
        toast(T.vhShareCopied);
      }
    });
  }

  function initCampusNet() {
    if (document.body.dataset.page !== 'campusnet') return;
    var form = $('#campusNetForm');
    if (!form) return;
    var sumPlan = $('#sumPlan');
    var sumSpeed = $('#sumSpeed');
    var sumPay = $('#sumPay');
    var sumTotal = $('#sumTotal');
    var SPEED_MAP = { basic: '20 Mbps', standard: '50 Mbps', premium: '100 Mbps' };
    function fmtPrice(n) { return Number(n).toLocaleString('en-US') + ' ₽'; }
    function updateSummary() {
      var plan = form.querySelector('input[name="plan"]:checked');
      var pay = form.querySelector('input[name="pay"]:checked');
      if (plan && sumPlan && sumSpeed && sumTotal) {
        sumPlan.textContent = plan.dataset.name || '';
        sumSpeed.textContent = SPEED_MAP[plan.value] || '';
        sumTotal.textContent = fmtPrice(plan.dataset.price || 0);
      }
      if (pay && sumPay) sumPay.textContent = pay.dataset.name || '';
    }
    form.addEventListener('change', updateSummary);
    updateSummary();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = document.getElementById('cnName');
      var idEl = document.getElementById('cnId');
      var roomEl = document.getElementById('cnRoom');
      var agree = document.getElementById('cnAgree');
      var name = nameEl ? nameEl.value.trim() : '';
      var sid = idEl ? idEl.value.trim() : '';
      var room = roomEl ? roomEl.value.trim() : '';
      if (!name || !sid || !room) { toast('请填写完整的用户信息'); return; }
      if (!/^\d{10}$/.test(sid)) { toast('学号应为 10 位数字'); return; }
      if (!agree || !agree.checked) { toast('请先阅读并同意服务协议'); return; }
      var plan = form.querySelector('input[name="plan"]:checked');
      var pay = form.querySelector('input[name="pay"]:checked');
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = '正在提交…'; }
      setTimeout(function () {
        var msg = '订购成功 · ' + (plan ? plan.dataset.name : '') + ' · ' +
                  fmtPrice(plan ? plan.dataset.price : 0) + ' · ' +
                  (pay ? pay.dataset.name : '');
        toast(msg, 3200);
        if (btn) btn.textContent = '订购成功';
        setTimeout(function () {
          location.href = 'https://www.superbba3.cc/#/stage/dashboard';
        }, 1400);
      }, 900);
    });
    form.addEventListener('reset', function () { setTimeout(updateSummary, 0); });
  }

  function initBadge() {
    var badge = $('#schoolBadge');
    if (!badge) return;
    var count = 0, timer = null;
    badge.addEventListener('click', function (e) {
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

  function initBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', T.backTop);
    btn.innerHTML = '↑';
    document.body.appendChild(btn);
    var onScroll = function () { btn.classList.toggle('show', window.scrollY > 420); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

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
          el.textContent = (target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target + suffix;
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    stats.forEach(function (el) { io.observe(el); });
  }

  function initPageExtras() {
    var page = document.body.dataset.page;
    if (page === 'moscow' && location.hash === '#prep') {
      var prep = $('#prep');
      if (prep) setTimeout(function () { prep.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 220);
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

  function initConsole() {
    var style = 'background:#c8102e;color:#f0d98a;padding:3px 8px;border-radius:3px;font-weight:700';
    console.log('%c ' + T.schoolName + ' ', style);
    console.log('%c RedStarOS 5.0 | 星图搜索已连接 | 天问终端适配 ', 'color:#d4af37');
    console.log('%c 提示：站内搜索「507」有惊喜。 ', 'color:#8fa3c2');
    console.log('%c 校徽连续点击 5 次，可进入档案室。 ', 'color:#8fa3c2');
  }

  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !/input|textarea|select/i.test(tag)) {
        e.preventDefault();
        var input = $('#searchPageInput') || $('#searchInput');
        if (input) input.focus();
      }
      if (e.key === 'Escape') {
        var el = $('.toast');
        if (el) el.classList.remove('show');
      }
    });
  }

  function safeCall(name, fn) {
    try { fn(); }
    catch (err) { console.error('[PXGL] ' + name + ' 出错:', err); }
  }

  function init() {
    safeCall('renderHeader', renderHeader);
    safeCall('renderFooter', renderFooter);
    safeCall('initSearch', initSearch);
    safeCall('initSearchPage', initSearchPage);
    safeCall('initVideoHub', initVideoHub);
    safeCall('initCampusNet', initCampusNet);
    safeCall('initBadge', initBadge);
    safeCall('initBackToTop', initBackToTop);
    safeCall('initReveal', initReveal);
    safeCall('initCounters', initCounters);
    safeCall('initPageExtras', initPageExtras);
    safeCall('initConsole', initConsole);
    safeCall('initShortcuts', initShortcuts);
    safeCall('mountAuthNav', function () {
      if (window.Auth && Auth.mountNavStatus) {
        Auth.mountNavStatus(IS_RU ? 'ru' : 'zh');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();