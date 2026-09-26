/* ===================================================================
   星图搜索 · 全网搜索（Tavily）
   依赖：main.js 里的 SITE_SEARCH_INDEX
   =================================================================== */

(function () {
  'use strict';

  /* ============================================================
     1. 你的 Worker 地址
     ============================================================ */
  var TAVILY_PROXY = 'https://api.ponxigrad.tech/tavily';

  /* ============================================================
     2. 状态
     ============================================================ */
  var currentScope = 'all';
  var currentQuery = '';
  var cache = {};

  /* ============================================================
     3. DOM
     ============================================================ */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  var resultsEl = $('#searchResults');
  var headEl    = $('#searchPageHeadline');
  var tabsEl    = $('#searchTabs');

  if (!resultsEl) {
    console.warn('[websearch] 非搜索页，跳过');
    return;
  }

  /* ============================================================
     4. 读取 URL 参数
     ============================================================ */
  var q = '';
  var scope = 'all';
  try {
    var params = new URLSearchParams(location.search);
    q = (params.get('q') || '').trim();
    scope = params.get('scope') || 'all';
    if (['all', 'site', 'web'].indexOf(scope) === -1) scope = 'all';
  } catch (e) {}

  currentQuery = q;
  currentScope = scope;

  $$('.search-tab').forEach(function (tab) {
    tab.classList.toggle('on', tab.dataset.scope === scope);
  });

  /* ============================================================
     5. 工具
     ============================================================ */
  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function escRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function highlight(text, kw) {
    if (!kw || !text) return escHtml(text);
    var re = new RegExp('(' + escRe(kw) + ')', 'gi');
    return escHtml(text).replace(re, '<mark>$1</mark>');
  }
  function setHeadline(html) {
    if (headEl) headEl.innerHTML = html;
  }

  /* ============================================================
     6. Tab 切换
     ============================================================ */
  if (tabsEl) {
    tabsEl.addEventListener('click', function (e) {
      var tab = e.target.closest('.search-tab');
      if (!tab) return;
      var s = tab.dataset.scope;
      if (s === currentScope) return;

      $$('.search-tab').forEach(function (t) { t.classList.toggle('on', t === tab); });
      currentScope = s;

      try {
        var p = new URLSearchParams(location.search);
        p.set('scope', s);
        history.replaceState(null, '', location.pathname + '?' + p.toString());
      } catch (err) {}

      runSearch();
    });
  }

  /* ============================================================
     7. 本站搜索
     ============================================================ */
  function searchSite(kw) {
    if (!window.SITE_SEARCH_INDEX) {
      console.warn('[websearch] SITE_SEARCH_INDEX 未定义');
      return [];
    }
    var ql = kw.toLowerCase();
    var hits = [];
    var isRu = /\/ru\//.test(location.pathname);

    window.SITE_SEARCH_INDEX.forEach(function (item) {
      var lang = item[isRu ? 'ru' : 'zh'];
      if (!lang) return;
      var hay = (lang[0] + ' ' + lang[1] + ' ' + item.k).toLowerCase();
      if (hay.indexOf(ql) !== -1) {
        hits.push({
          href: item.href,
          title: lang[0],
          desc: lang[1],
          type: item.type
        });
      }
    });
    return hits;
  }

  /* ============================================================
     8. 全网搜索（Tavily）
     ============================================================ */
  function searchWeb(kw) {
    if (cache[kw]) return Promise.resolve(cache[kw]);

    return fetch(TAVILY_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: kw })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      if (data.error) throw new Error(data.error);
      cache[kw] = data;
      return data;
    });
  }

  /* ============================================================
     9. 渲染
     ============================================================ */
  function renderSiteHits(hits, kw) {
    if (!hits.length) return '';
    var html = '<h3 class="search-group">本站结果</h3>';
    hits.forEach(function (h) {
      var label = h.type === 'news' ? '新闻' : '页面';
      html += '<a class="search-result" href="' + h.href + '">' +
                '<span class="sr-type">' + label + '</span>' +
                '<h4>' + highlight(h.title, kw) + '</h4>' +
                '<p>' + escHtml(h.desc) + '</p>' +
              '</a>';
    });
    return html;
  }

  function renderWebHits(data, kw) {
    var results = data.results || [];
    if (!results.length) return '';

    var html = '<h3 class="search-group">全网结果' +
      (data.answer ? ' <span class="tavily-badge">Tavily</span>' : '') +
      '</h3>';

    if (data.answer) {
      html += '<div class="search-answer">' +
                '<div class="sa-label">星图摘要</div>' +
                '<div class="sa-body">' + escHtml(data.answer) + '</div>' +
              '</div>';
    }

    results.forEach(function (r) {
      var host = '';
      try { host = new URL(r.url).hostname; } catch (e) {}
      html += '<a class="search-result" href="' + escHtml(r.url) + '" target="_blank" rel="noopener">' +
                '<span class="sr-type">' + escHtml(host) + '</span>' +
                '<h4>' + highlight(r.title || '', kw) + '</h4>' +
                '<p>' + escHtml(r.content || '') + '</p>' +
              '</a>';
    });
    return html;
  }

  /* ============================================================
     10. 执行搜索
     ============================================================ */
  function runSearch() {
    if (!currentQuery) {
      setHeadline('全站检索 · 校园 + 全网');
      resultsEl.innerHTML =
        '<div class="search-empty">' +
          '<p>输入关键词开始搜索</p>' +
          '<p class="small muted">试试「莫斯科研学」「磁悬浮」「核物理」</p>' +
        '</div>';
      return;
    }

    setHeadline('关键词：<strong>' + escHtml(currentQuery) + '</strong>');

    var siteHits = searchSite(currentQuery);

    /* 只搜索本站 */
    if (currentScope === 'site') {
      var siteHtml = renderSiteHits(siteHits, currentQuery);
      resultsEl.innerHTML = siteHtml
        ? '<div class="search-count">本站找到 <b>' + siteHits.length + '</b> 条</div>' + siteHtml
        : '<div class="search-empty"><p>本站未找到与 <strong>' + escHtml(currentQuery) + '</strong> 相关的内容</p></div>';
      return;
    }

    /* 综合 / 全网：先渲染本站，再请求 Tavily */
    var loadingHtml = '<div class="search-loading">' +
      '<span class="spinner"></span>正在检索全网…' +
      '</div>';

    var initial = '';
    if (currentScope === 'all' && siteHits.length) {
      initial += '<div class="search-count">本站找到 <b>' + siteHits.length + '</b> 条</div>';
      initial += renderSiteHits(siteHits, currentQuery);
    }
    initial += loadingHtml;
    resultsEl.innerHTML = initial;

    searchWeb(currentQuery).then(function (data) {
      var webHtml = renderWebHits(data, currentQuery);

      var final = '';
      if (currentScope === 'all' && siteHits.length) {
        final += '<div class="search-count">本站找到 <b>' + siteHits.length + '</b> 条</div>';
        final += renderSiteHits(siteHits, currentQuery);
      }
      if (webHtml) final += webHtml;
      else final += '<div class="search-empty"><p>全网未找到相关结果</p></div>';

      resultsEl.innerHTML = final;
    }).catch(function (err) {
      console.error('[websearch] Tavily 请求失败:', err);
      var msg = String(err.message || err);

      var errTip = '全网搜索暂时不可用';
      if (/failed to fetch|network/i.test(msg)) errTip = '无法连接搜索服务，请检查网络';
      else if (/401|403|api key/i.test(msg))    errTip = '搜索服务密钥无效';
      else if (/429|rate/i.test(msg))           errTip = '搜索请求过于频繁，请稍后再试';

      var final = '';
      if (currentScope === 'all' && siteHits.length) {
        final += '<div class="search-count">本站找到 <b>' + siteHits.length + '</b> 条</div>';
        final += renderSiteHits(siteHits, currentQuery);
      }
      final += '<div class="search-empty">' +
                 '<p>' + errTip + '</p>' +
                 '<p class="small muted">' + escHtml(msg) + '</p>' +
               '</div>';
      resultsEl.innerHTML = final;
    });
  }

  /* ============================================================
     11. 启动
     ============================================================ */
  function boot() {
    if (window.SITE_SEARCH_INDEX) { runSearch(); return; }
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (window.SITE_SEARCH_INDEX || tries > 15) {
        clearInterval(timer);
        runSearch();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();