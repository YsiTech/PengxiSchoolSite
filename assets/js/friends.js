/* ===================================================================
   好友系统
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.error('[friends] Auth 未就绪');
    return;
  }

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function avatarHTML(profile) {
    if (profile && profile.avatar) {
      return '<img src="' + esc(profile.avatar) + '" alt="">';
    }
    var nick = (profile && profile.nickname) || '?';
    var c = '#' + ['c8102e','1a2b4c','1f8f55','8a6d12','7a3b8f','c85a17','2b6a8b','8b2b4a'][nick.charCodeAt(0) % 8];
    return '<span class="f-avatar-letter" style="background:' + c + '">' +
           esc(nick.slice(0, 1).toUpperCase()) + '</span>';
  }

  /* ============================================================
     状态
     ============================================================ */
  var me = null;
  var myProfile = null;
  var friends = [];      // 已互为好友的 [{ profile, fs }]
  var incoming = [];     // 收到的请求 [{ profile, fs }]
  var outgoing = [];     // 发出的请求 [{ profile, fs }]

  /* ============================================================
     启动
     ============================================================ */
  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=friends.html');
      return;
    }
    if (Auth.isGuest && Auth.isGuest()) {
      // 游客可以使用，但提示一下
      console.warn('[friends] 游客模式');
    }
    me = Auth.getCurrentUser();
    loadAll();
  });

  /* ============================================================
     加载全部数据
     ============================================================ */
  function loadAll() {
    loadMyProfile();
    loadFriendships();
  }

  function loadMyProfile() {
    client.from('profiles').select('*').eq('id', me.id).maybeSingle()
      .then(function (res) {
        myProfile = res.data || null;
      });
  }

  function loadFriendships() {
    $('friendsLoading').style.display = '';
    $('requestsLoading').style.display = '';

    /* 拉取所有和我相关的 friendships */
    client.from('friendships')
      .select('*')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .order('updated_at', { ascending: false })
      .then(function (res) {
        $('friendsLoading').style.display = 'none';
        $('requestsLoading').style.display = 'none';

        if (res.error) {
          console.error('[friends] 加载失败:', res.error);
          return;
        }

        var rows = res.data || [];
        var otherIds = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });

        if (!otherIds.length) {
          classify([], rows);
          return;
        }

        /* 批量查对方 profile */
        client.from('profiles').select('*').in('id', otherIds)
          .then(function (pres) {
            var map = {};
            (pres.data || []).forEach(function (p) { map[p.id] = p; });
            classify(map, rows);
          });
      });
  }

  function classify(profileMap, rows) {
    friends = [];
    incoming = [];
    outgoing = [];

    rows.forEach(function (r) {
      var otherId = r.requester_id === me.id ? r.addressee_id : r.requester_id;
      var p = profileMap[otherId] || { id: otherId, nickname: '未知用户', avatar: '' };
      var item = { profile: p, fs: r };

      if (r.status === 'accepted') {
        friends.push(item);
      } else if (r.status === 'pending') {
        if (r.addressee_id === me.id) incoming.push(item);
        else outgoing.push(item);
      }
    });

    renderFriends();
    renderIncoming();
    renderOutgoing();
    updateBadges();
  }

  function updateBadges() {
    var bf = $('badgeFriends');
    var br = $('badgeRequests');
    if (bf) {
      bf.textContent = friends.length;
      bf.classList.toggle('hide', friends.length === 0);
    }
    if (br) {
      br.textContent = incoming.length;
      br.classList.toggle('hide', incoming.length === 0);
    }
  }

  /* ============================================================
     Tab 切换
     ============================================================ */
  document.querySelectorAll('.friends-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.dataset.tab;
      document.querySelectorAll('.friends-tab').forEach(function (t) {
        t.classList.toggle('on', t === tab);
      });
      document.querySelectorAll('.friends-panel').forEach(function (p) {
        p.classList.toggle('on', p.dataset.panel === name);
      });
    });
  });

  /* ============================================================
     渲染：好友列表
     ============================================================ */
  function renderFriends() {
    var grid = $('friendsGrid');
    var empty = $('friendsEmpty');
    if (!grid) return;

    if (!friends.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');

    grid.innerHTML = friends.map(function (it) {
      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(it.profile) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(it.profile.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">' +
              (it.profile.is_guest ? '游客' : '正式用户') +
            '</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="f-btn f-btn-danger" data-remove="' + it.fs.id + '" type="button">删除好友</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('确定删除这位好友吗？')) {
          removeFriendship(parseInt(btn.dataset.remove, 10));
        }
      });
    });
  }

  /* ============================================================
     渲染：收到的请求
     ============================================================ */
  function renderIncoming() {
    var grid = $('incomingGrid');
    var empty = $('incomingEmpty');
    if (!grid) return;

    if (!incoming.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');

    grid.innerHTML = incoming.map(function (it) {
      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(it.profile) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(it.profile.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">请求加你为好友</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="f-btn f-btn-primary" data-accept="' + it.fs.id + '" type="button">接受</button>' +
            '<button class="f-btn" data-reject="' + it.fs.id + '" type="button">拒绝</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('[data-accept]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        acceptRequest(parseInt(btn.dataset.accept, 10));
      });
    });
    grid.querySelectorAll('[data-reject]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rejectRequest(parseInt(btn.dataset.reject, 10));
      });
    });
  }

  /* ============================================================
     渲染：我发出的请求
     ============================================================ */
  function renderOutgoing() {
    var grid = $('outgoingGrid');
    var empty = $('outgoingEmpty');
    if (!grid) return;

    if (!outgoing.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');

    grid.innerHTML = outgoing.map(function (it) {
      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(it.profile) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(it.profile.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">等待对方接受</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="f-btn" data-cancel="' + it.fs.id + '" type="button">撤销</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('[data-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeFriendship(parseInt(btn.dataset.cancel, 10));
      });
    });
  }

  /* ============================================================
     操作：接受请求
     ============================================================ */
  function acceptRequest(id) {
    client.from('friendships').update({
      status: 'accepted',
      updated_at: new Date().toISOString()
    }).eq('id', id).then(function (res) {
      if (res.error) {
        window.siteToast && window.siteToast('操作失败：' + res.error.message);
        return;
      }
      window.siteToast && window.siteToast('已接受');
      loadFriendships();
    });
  }

  /* ============================================================
     操作：拒绝请求
     ============================================================ */
  function rejectRequest(id) {
    if (!confirm('拒绝这个请求？')) return;
    client.from('friendships').delete().eq('id', id).then(function (res) {
      if (res.error) {
        window.siteToast && window.siteToast('操作失败');
        return;
      }
      window.siteToast && window.siteToast('已拒绝');
      loadFriendships();
    });
  }

  /* ============================================================
     操作：删除好友/撤销请求
     ============================================================ */
  function removeFriendship(id) {
    client.from('friendships').delete().eq('id', id).then(function (res) {
      if (res.error) {
        window.siteToast && window.siteToast('操作失败');
        return;
      }
      window.siteToast && window.siteToast('已删除');
      loadFriendships();
    });
  }

  /* ============================================================
     搜索用户
     ============================================================ */
  var searchForm = $('searchForm');
  var searchInput = $('searchInput');
  var searchGrid = $('searchGrid');
  var searchHint = $('searchHint');

  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = (searchInput.value || '').trim();
      if (kw.length < 2) {
        searchHint.textContent = '请输入至少 2 个字符';
        searchGrid.innerHTML = '';
        return;
      }
      searchHint.textContent = '正在搜索…';
      searchGrid.innerHTML = '';
      doSearch(kw);
    });
  }

  function doSearch(kw) {
    client.from('profiles')
      .select('id, nickname, avatar, is_guest')
      .ilike('nickname', '%' + kw + '%')
      .neq('id', me.id)
      .limit(20)
      .then(function (res) {
        if (res.error) {
          searchHint.textContent = '搜索失败：' + res.error.message;
          return;
        }
        var list = res.data || [];
        searchHint.textContent = list.length ? ('找到 ' + list.length + ' 位用户') : '没有找到匹配的用户';
        renderSearchResults(list);
      });
  }

  function renderSearchResults(list) {
    if (!searchGrid) return;

    /* 建立关系映射：otherId → status */
    var relationMap = {};
    friends.forEach(function (it) { relationMap[it.profile.id] = 'friend'; });
    incoming.forEach(function (it) { relationMap[it.profile.id] = 'incoming'; });
    outgoing.forEach(function (it) { relationMap[it.profile.id] = 'outgoing'; });

    searchGrid.innerHTML = list.map(function (p) {
      var rel = relationMap[p.id];
      var actionHTML = '';

      if (rel === 'friend') {
        actionHTML = '<span class="f-badge f-badge-ok">已是好友</span>';
      } else if (rel === 'incoming') {
        actionHTML = '<button class="f-btn f-btn-primary" data-send="' + p.id + '" type="button">接受请求</button>';
      } else if (rel === 'outgoing') {
        actionHTML = '<span class="f-badge">请求已发送</span>';
      } else {
        actionHTML = '<button class="f-btn f-btn-primary" data-send="' + p.id + '" type="button">加好友</button>';
      }

      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(p) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(p.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">' + (p.is_guest ? '游客' : '正式用户') + '</div>' +
          '</div>' +
          '<div class="friend-actions">' + actionHTML + '</div>' +
        '</div>';
    }).join('');

    searchGrid.querySelectorAll('[data-send]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sendRequest(btn.dataset.send);
      });
    });
  }

  /* ============================================================
     操作：发送请求
     ============================================================ */
  function sendRequest(targetId) {
    if (targetId === me.id) {
      window.siteToast && window.siteToast('不能加自己');
      return;
    }

    /* 先检查是否已有反向请求 */
    var reverse = incoming.find(function (it) { return it.profile.id === targetId; });
    if (reverse) {
      acceptRequest(reverse.fs.id);
      return;
    }

    client.from('friendships').insert({
      requester_id: me.id,
      addressee_id: targetId,
      status: 'pending'
    }).then(function (res) {
      if (res.error) {
        var msg = res.error.message || '发送失败';
        if (/duplicate|unique/i.test(msg)) {
          msg = '已经发送过请求了';
        }
        window.siteToast && window.siteToast(msg);
        return;
      }
      window.siteToast && window.siteToast('请求已发送');
      loadFriendships();
      /* 重新搜索以刷新状态 */
      if (searchInput && searchInput.value.trim().length >= 2) {
        setTimeout(function () {
          doSearch(searchInput.value.trim());
        }, 300);
      }
    });
  }

})();