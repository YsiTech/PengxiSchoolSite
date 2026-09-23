/* ===================================================================
   群聊 · 群列表 + 建群
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) return;
  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };
  var me = null;
  var myGroups = [];
  var allGroups = [];

  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=group.html');
      return;
    }
    me = Auth.getCurrentUser();
    loadAll();
  });

  function loadAll() {
    client.from('rooms').select('*').order('created_at', { ascending: false })
      .then(function (res) {
        allGroups = res.data || [];
        client.from('room_members').select('room_id').eq('user_id', me.id)
          .then(function (mres) {
            var myIds = (mres.data || []).map(function (m) { return m.room_id; });
            myGroups = allGroups.filter(function (g) { return myIds.indexOf(g.id) !== -1; });
            renderMy();
            renderAll();
          });
      });
  }

  function renderMy() {
    var grid = $('myGroupsGrid');
    var empty = $('myGroupsEmpty');
    if (!grid) return;
    if (!myGroups.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');
    grid.innerHTML = myGroups.map(groupCardHTML).join('');
    bindGroupClick(grid);
  }

  function renderAll() {
    var grid = $('allGroupsGrid');
    if (!grid) return;
    var ids = myGroups.map(function (g) { return g.id; });
    var others = allGroups.filter(function (g) { return ids.indexOf(g.id) === -1; });
    if (!others.length) {
      grid.innerHTML = '<div class="friends-empty" style="grid-column:1/-1;padding:20px">没有其他公开群</div>';
      return;
    }
    grid.innerHTML = others.map(function (g) {
      return '<div class="group-card">' +
        '<div class="group-icon">#</div>' +
        '<div class="group-info">' +
          '<div class="group-name">' + esc(g.name) + '</div>' +
          '<div class="group-meta">群主：' + esc(g.owner_id.slice(0, 8)) + '</div>' +
        '</div>' +
        '<div class="friend-actions">' +
          '<button class="f-btn f-btn-primary" data-join="' + g.id + '" type="button">加入</button>' +
        '</div>' +
      '</div>';
    }).join('');

    grid.querySelectorAll('[data-join]').forEach(function (btn) {
      btn.addEventListener('click', function () { joinGroup(parseInt(btn.dataset.join, 10)); });
    });
  }

  function groupCardHTML(g) {
    return '<a class="group-card" href="group-chat.html?id=' + g.id + '">' +
      '<div class="group-icon">#</div>' +
      '<div class="group-info">' +
        '<div class="group-name">' + esc(g.name) + '</div>' +
        '<div class="group-meta">点击进入群聊</div>' +
      '</div>' +
    '</a>';
  }

  function bindGroupClick(grid) {
    // 已经是 <a> 标签，无需额外绑定
  }

  function joinGroup(id) {
    client.from('room_members').insert({ room_id: id, user_id: me.id })
      .then(function (res) {
        if (res.error) { window.siteToast && window.siteToast('加入失败'); return; }
        window.siteToast && window.siteToast('已加入');
        loadAll();
      });
  }

  /* 建群 */
  var modal = $('createGroupModal');
  var form = $('createGroupForm');
  var hint = $('groupHint');

  if ($('createGroupBtn')) {
    $('createGroupBtn').addEventListener('click', function () {
      modal.classList.remove('hide');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { $('gName').focus(); }, 200);
    });
  }

  function closeModal() {
    modal.classList.add('hide');
    document.body.style.overflow = '';
    hint.textContent = '';
  }

  if ($('groupClose')) $('groupClose').addEventListener('click', closeModal);
  if ($('groupCancel')) $('groupCancel').addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('gName').value || '').trim();
      if (!name || name.length < 2) {
        hint.textContent = '群名称至少 2 个字';
        hint.className = 'blog-publish-hint warn';
        return;
      }
      hint.textContent = '创建中…';
      hint.className = 'blog-publish-hint';

      client.from('rooms').insert({ name: name, owner_id: me.id }).select().single()
        .then(function (res) {
          if (res.error) {
            hint.textContent = '创建失败：' + res.error.message;
            hint.className = 'blog-publish-hint warn';
            return;
          }
          // 群主自动加入
          return client.from('room_members').insert({
            room_id: res.data.id,
            user_id: me.id
          }).then(function () {
            window.siteToast && window.siteToast('已创建');
            closeModal();
            form.reset();
            setTimeout(function () {
              location.href = 'group-chat.html?id=' + res.data.id;
            }, 500);
          });
        })
        .catch(function (err) {
          console.error('[group] 建群失败:', err);
          hint.textContent = '创建失败';
          hint.className = 'blog-publish-hint warn';
        });
    });
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

})();