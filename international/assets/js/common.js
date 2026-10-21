(function (w) {
  'use strict';
  if (!w.supabase || !w.supabase.createClient) return;

  var cfg = w.IECP_CONFIG || {};
  var client = w.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  w.IECP = w.IECP || {};
  w.IECP.client = client;

  w.IECP.$  = function (s, c) { return (c || document).querySelector(s); };
  w.IECP.$$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  w.IECP.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  };
  w.IECP.fmtNumber = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  w.IECP.fmtDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
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

  w.IECP.canViewBalance = function () { return false; };
  w.IECP.formatBalance = function (balance) {
    return '<span style="color:var(--muted); font-size:12px; border:1px solid var(--border); padding:2px 8px; border-radius:4px; background:var(--glass)"><i class="fa-solid fa-lock" style="font-size:10px; margin-right:4px;"></i>机密</span>';
  };

  w.IECP.toast = function (msg, type, duration) {
    var el = document.querySelector('.iecp-toast');
    if (!el) {
      el = document.createElement('div'); el.className = 'iecp-toast';
      el.innerHTML = '<i class="fa-solid fa-circle-info"></i><span></span>';
      document.body.appendChild(el);
    }
    var icon = el.querySelector('i'); var text = el.querySelector('span');
    el.className = 'iecp-toast show ' + (type || '');
    icon.className = 'fa-solid ' + (type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
    text.textContent = msg;
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(function () { el.classList.remove('show'); }, duration || 2600);
  };

  var profileCache = null;
  w.IECP.getProfile = function (force) {
    if (profileCache && !force) return Promise.resolve(profileCache);
    return client.auth.getUser().then(function (res) {
      if (!res.data || !res.data.user) throw new Error('未登录或登录已过期');
      return client.from('profiles').select('*').eq('id', res.data.user.id).maybeSingle().then(function (r) {
        if (r.error) throw new Error(r.error.message);
        profileCache = r.data; w.IECP._currentProfileCache = profileCache;
        return profileCache;
      });
    });
  };

  w.IECP.clearProfileCache = function () { profileCache = null; w.IECP._currentProfileCache = null; };
  w.IECP.requireAuth = function () {
    return client.auth.getSession().then(function (res) {
      if (!res.data.session) { location.replace('login.html'); return false; }
      return true;
    });
  };
  w.IECP.logout = function () { client.auth.signOut().then(function () { w.IECP.clearProfileCache(); location.href = 'login.html'; }); };
  w.IECP.avatarFallback = function (name) {
    var initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    var colors = ['#d4af37','#4fc3f7','#a78bfa','#f87171','#22c55e','#f59e0b','#ec4899'];
    var h = 0; for (var i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="' + colors[h % colors.length] + '"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-size="50" font-weight="700" fill="#0a0e1a" font-family="sans-serif">' + initial + '</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  w.IECP.renderNav = function (activeId) {
    var host = document.getElementById('iecp-nav'); if (!host) return;
    var items = [
      { id:'index', icon:'fa-globe', text:'首页', href:'index.html' },
      { id:'countries', icon:'fa-flag', text:'国家列表', href:'countries.html' },
      { id:'news', icon:'fa-newspaper', text:'新闻发布', href:'news.html' },
      { id:'diplomacy', icon:'fa-handshake', text:'交流中心', href:'diplomacy.html' },
      { id:'market', icon:'fa-store', text:'交易行', href:'market.html' },
      { id:'transfer', icon:'fa-money-bill-transfer', text:'跨国汇款', href:'transfer.html' },
      { id:'military', icon:'fa-industry', text:'军工厂', href:'military.html' },
      { id:'research', icon:'fa-flask', text:'研究所', href:'research.html' },
      { id:'forecast', icon:'fa-cloud-bolt', text:'灾害预报', href:'forecast.html' },
      { id:'wars', icon:'fa-shield-halved', text:'战争系统', href:'wars.html' }
    ];
    host.innerHTML = items.map(function (it) {
      return '<a' + (it.id === activeId ? ' class="active"' : '') + ' href="' + it.href + '"><i class="fa-solid ' + it.icon + '"></i>' + it.text + '</a>';
    }).join('');
  };

  w.IECP.renderUserBadge = function () {
    var host = document.getElementById('iecp-user'); if (!host) return;
    w.IECP.getProfile().then(function (p) {
      var flag = p.flag_url || w.IECP.avatarFallback(p.username);
      
      var notifHtml = `
        <div class="notif-wrapper" id="notifWrapper" onclick="toggleNotif(event)">
          <i class="fa-solid fa-bell notif-icon"></i>
          <span class="notif-badge" id="notifBadge">0</span>
          <div class="notif-dropdown" id="notifDropdown">
            <div class="notif-header">
              <span>消息通知</span>
              <span style="font-size:12px; cursor:pointer; color:var(--cyan); font-weight:normal;" onclick="markAllRead(event)">全部已读</span>
            </div>
            <div class="notif-list" id="notifList"><div style="text-align:center;color:var(--muted);padding:20px;">暂无消息</div></div>
          </div>
        </div>
      `;

      host.innerHTML = notifHtml +
        '<a href="profile.html" class="user-badge-link">' +
          '<img class="iecp-user-avatar" src="' + w.IECP.escapeHtml(flag) + '">' +
          '<span class="iecp-user-name">' + w.IECP.escapeHtml(p.username) + '</span>' +
          '<i class="fa-solid fa-wallet user-wallet-icon"></i>' +
        '</a>';

      w.IECP.loadNotifications(p.id);
      
      // 偶尔触发灾害检测
      if (Math.random() < 0.15 && window.location.pathname.indexOf('index.html') > -1) {
        w.IECP.client.rpc('check_disaster', { p_country_id: p.id }).then(function(res) {
          if (res.data && res.data.disaster) {
            var names = { fire: '火灾', flood: '洪水', earthquake: '地震', drought: '旱灾' };
            w.IECP.toast(`天灾降临：发生了${names[res.data.disaster]}，损失了资源！`, 'error', 5000);
            w.IECP.client.rpc('send_notification', { p_user_id: p.id, p_type: 'disaster', p_title: '自然灾害', p_content: `发生了${names[res.data.disaster]}，造成了 ${w.IECP.fmtNumber(res.data.amount)} 的资源损失。` });
          }
        });
      }

    }).catch(function(){ host.innerHTML = '<a class="btn btn-ghost btn-sm" href="login.html">登录</a>'; });
  };

  w.IECP.loadNotifications = function(userId) {
    w.IECP.client.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20).then(function(res) {
      var list = res.data || [];
      var unreadCount = list.filter(n => !n.is_read).length;
      var badge = document.getElementById('notifBadge');
      if (badge) { badge.textContent = unreadCount > 99 ? '99+' : unreadCount; badge.style.display = unreadCount > 0 ? 'block' : 'none'; }

      var listWrap = document.getElementById('notifList');
      if (!listWrap) return;
      if (!list.length) { listWrap.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">暂无消息</div>'; return; }

      var iconMap = { trade: 'fa-store', war: 'fa-shield-halved', ally: 'fa-handshake', disaster: 'fa-house-crack', system: 'fa-bullhorn' };
      listWrap.innerHTML = list.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}">
          <div class="notif-title"><i class="fa-solid ${iconMap[n.type] || 'fa-bell'}" style="color:var(--gold-2);"></i> ${w.IECP.escapeHtml(n.title)}</div>
          <div style="color:var(--ink-2); line-height:1.5;">${w.IECP.escapeHtml(n.content)}</div>
          <div class="notif-time">${w.IECP.relativeTime(n.created_at)}</div>
        </div>
      `).join('');
    });
  };

  window.toggleNotif = function(e) {
    e.stopPropagation();
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.toggle('show');
  };
  window.markAllRead = function(e) {
    e.stopPropagation();
    var p = w.IECP._currentProfileCache;
    if (!p) return;
    w.IECP.client.from('notifications').update({ is_read: true }).eq('user_id', p.id).eq('is_read', false).then(function(){ w.IECP.loadNotifications(p.id); });
  };
  document.addEventListener('click', function(e) {
    var dd = document.getElementById('notifDropdown');
    if (dd && dd.classList.contains('show') && !e.target.closest('.notif-wrapper')) dd.classList.remove('show');
  });
  setInterval(function() { if (w.IECP._currentProfileCache) w.IECP.loadNotifications(w.IECP._currentProfileCache.id); }, 60000);

  w.IECP.initTopbar = function (activeId) { w.IECP.renderNav(activeId); w.IECP.renderUserBadge(); };
})(window);