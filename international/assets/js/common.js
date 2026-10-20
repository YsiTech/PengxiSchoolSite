/* ===================================================================
   IECP · 通用脚本 (修复错误捕获版)
   =================================================================== */

(function (w) {
  'use strict';

  if (!w.supabase || !w.supabase.createClient) {
    console.error('[IECP] Supabase SDK 未加载');
    return;
  }

  var cfg = w.IECP_CONFIG || {};
  var client = w.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  w.IECP = w.IECP || {};
  w.IECP.client = client;

  /* ---------------- 工具 ---------------- */
  w.IECP.$  = function (s, c) { return (c || document).querySelector(s); };
  w.IECP.$$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  w.IECP.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  };

  w.IECP.fmtNumber = function (n) {
    return Number(n || 0).toLocaleString('en-US');
  };

  w.IECP.fmtDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes());
  };

  w.IECP.relativeTime = function (iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
    return w.IECP.fmtDate(iso);
  };

  /* Toast */
  var toastTimer = null;
  w.IECP.toast = function (msg, type, duration) {
    var el = document.querySelector('.iecp-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'iecp-toast';
      el.innerHTML = '<i class="fa-solid fa-circle-info"></i><span></span>';
      document.body.appendChild(el);
    }
    var icon = el.querySelector('i');
    var text = el.querySelector('span');
    el.className = 'iecp-toast show ' + (type || '');
    icon.className = 'fa-solid ' + (
      type === 'success' ? 'fa-circle-check' :
      type === 'error' ? 'fa-circle-exclamation' :
      'fa-circle-info'
    );
    text.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, duration || 2600);
  };

  /* 当前用户缓存 */
  var profileCache = null;

  w.IECP.getProfile = function (force) {
    if (profileCache && !force) return Promise.resolve(profileCache);
    return client.auth.getUser().then(function (res) {
      if (!res.data || !res.data.user) throw new Error('未登录或登录已过期');
      return client.from('profiles').select('*').eq('id', res.data.user.id).maybeSingle()
        .then(function (r) {
          if (r.error) {
            console.error('获取档案失败:', r.error);
            throw new Error(r.error.message); // 🚨 抛出错误，让前端能捕获
          }
          if (!r.data) {
            throw new Error('数据库中没有你的档案，请检查是否建表或数据插入失败');
          }
          profileCache = r.data;
          return profileCache;
        });
    });
  };

  w.IECP.refreshProfile = function () {
    profileCache = null;
    return w.IECP.getProfile(true);
  };

  w.IECP.clearProfileCache = function () {
    profileCache = null;
  };

  w.IECP.getUser = function () {
    return client.auth.getUser().then(function (r) {
      return (r.data && r.data.user) || null;
    });
  };

  w.IECP.requireAuth = function () {
    return client.auth.getSession().then(function (res) {
      var s = res.data && res.data.session;
      if (!s) {
        location.replace('login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html'));
        return false;
      }
      return true;
    });
  };

  w.IECP.logout = function () {
    client.auth.signOut().then(function () {
      profileCache = null;
      location.href = 'login.html';
    });
  };

  w.IECP.avatarFallback = function (name) {
    var initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    var colors = ['#d4af37','#4fc3f7','#a78bfa','#f87171','#22c55e','#f59e0b','#ec4899'];
    var h = 0;
    for (var i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    var color = colors[h % colors.length];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
              '<rect width="100" height="100" fill="' + color + '"/>' +
              '<text x="50" y="50" dy=".35em" text-anchor="middle" font-size="50" font-weight="700" fill="#0a0e1a" font-family="sans-serif">' +
              initial + '</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  w.IECP.renderNav = function (activeId) {
    var host = document.getElementById('iecp-nav');
    if (!host) return;

    var items = [
      { id:'index',      icon:'fa-globe',          text:'首页',     href:'index.html' },
      { id:'countries',  icon:'fa-flag',           text:'国家列表', href:'countries.html' },
      { id:'news',       icon:'fa-newspaper',      text:'新闻发布', href:'news.html' },
      { id:'diplomacy',  icon:'fa-handshake',      text:'交流中心', href:'diplomacy.html' },
      { id:'market',     icon:'fa-store',          text:'交易行',   href:'market.html' },
      { id:'wars',       icon:'fa-shield-halved',  text:'战争系统', href:'wars.html' },
      { id:'profile',    icon:'fa-user',           text:'用户中心', href:'profile.html' }
    ];

    host.innerHTML = items.map(function (it) {
      var cls = it.id === activeId ? ' class="active"' : '';
      return '<a' + cls + ' href="' + it.href + '">' +
             '<i class="fa-solid ' + it.icon + '"></i>' + it.text + '</a>';
    }).join('');
  };

  w.IECP.renderUserBadge = function () {
    var host = document.getElementById('iecp-user');
    if (!host) return;

    w.IECP.getProfile().then(function (profile) {
      if (!profile) {
        host.innerHTML = '<a class="btn btn-ghost btn-sm" href="login.html">登录</a>';
        return;
      }
      var flag = profile.flag_url || w.IECP.avatarFallback(profile.username);
      host.innerHTML =
        '<a href="profile.html" style="display:flex;align-items:center;gap:10px">' +
          '<img class="iecp-user-avatar" src="' + w.IECP.escapeHtml(flag) + '" alt="">' +
          '<span class="iecp-user-name">' + w.IECP.escapeHtml(profile.username) + '</span>' +
        '</a>' +
        '<span class="iecp-user-balance"><i class="fa-solid fa-coins"></i>' + w.IECP.fmtNumber(profile.balance) + ' ₽</span>';
    }).catch(function(){
        // 如果获取失败，只显示“个人中心”文字
        host.innerHTML = '<a class="btn btn-ghost btn-sm" href="profile.html">个人中心</a>';
    });
  };

  w.IECP.initTopbar = function (activeId) {
    w.IECP.renderNav(activeId);
    w.IECP.renderUserBadge();
  };

})(window);