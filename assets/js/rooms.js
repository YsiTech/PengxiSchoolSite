/* ===================================================================
   群聊 · 完整逻辑
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.error('[rooms] Auth 未就绪');
    return;
  }

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var POLL_INTERVAL = 4000;
  var pollTimer = null;

  var me = null;
  var myRooms = [];
  var myFriends = [];
  var activeRoom = null;
  var activeMessages = [];
  var memberMap = {};
  var lastLatestId = 0;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var hm = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    if (sameDay) return hm;
    return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
  }
  function initial(name) {
    return String(name || '?').slice(0, 1).toUpperCase();
  }
  function colorOf(name) {
    var c = ['#c8102e','#1a2b4c','#1f8f55','#8a6d12','#7a3b8f','#c85a17','#2b6a8b','#8b2b4a'];
    var h = 0;
    for (var i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return c[h % c.length];
  }

  /* ============================================================
     启动
     ============================================================ */
  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=rooms.html');
      return;
    }
    me = Auth.getCurrentUser();
    loadFriends();
    loadMyRooms();
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  /* ============================================================
     加载好友（邀请/建群用）
     ============================================================ */
  function loadFriends() {
    client.from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .then(function (res) {
        if (res.error) { console.warn('[rooms] friends', res.error); return; }
        var rows = res.data || [];
        var ids = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });
        if (!ids.length) { myFriends = []; return; }
        client.from('profiles').select('*').in('id', ids).then(function (pres) {
          myFriends = pres.data || [];
        });
      });
  }

  /* ============================================================
     加载我加入的群
     ============================================================ */
  function loadMyRooms() {
    var listEl = $('groupList');
    if (listEl) listEl.innerHTML = '<div class="friends-loading" style="padding:20px">正在加载…</div>';

    client.from('room_members')
      .select('room_id')
      .eq('user_id', me.id)
      .then(function (res) {
        if (res.error) {
          console.error('[rooms]', res.error);
          if (listEl) listEl.innerHTML = '<div class="friends-loading" style="padding:20px">加载失败</div>';
          return;
        }
        var roomIds = (res.data || []).map(function (r) { return r.room_id; });

        if (!roomIds.length) {
          myRooms = [];
          renderRoomList();
          return;
        }

        client.from('rooms').select('*').in('id', roomIds)
          .order('created_at', { ascending: false })
          .then(function (rres) {
            var rooms = rres.data || [];

            /* 查每个群的成员数 */
            client.from('room_members').select('room_id').in('room_id', roomIds)
              .then(function (mres) {
                var countMap = {};
                (mres.data || []).forEach(function (m) {
                  countMap[m.room_id] = (countMap[m.room_id] || 0) + 1;
                });
                myRooms = rooms.map(function (r) {
                  return { room: r, memberCount: countMap[r.id] || 0 };
                });
                renderRoomList();
              });
          });
      });
  }

  function renderRoomList() {
    var listEl = $('groupList');
    if (!listEl) return;

    if (!myRooms.length) {
      listEl.innerHTML =
        '<div class="friends-empty" style="padding:26px 12px">' +
          '<div class="fe-icon">💬</div>' +
          '<div class="fe-title">还没有群组</div>' +
          '<div class="fe-sub">点击"+ 创建"建立第一个群</div>' +
        '</div>';
      return;
    }

    listEl.innerHTML = myRooms.map(function (it) {
      var r = it.room;
      var c = colorOf(r.name);
      var active = activeRoom && activeRoom.id === r.id ? ' active' : '';
      return '' +
        '<div class="group-item' + active + '" data-room="' + r.id + '">' +
          '<div class="g-avatar" style="background:linear-gradient(135deg,' + c + ',var(--blue))">' +
            esc(initial(r.name)) +
          '</div>' +
          '<div class="g-body">' +
            '<div class="g-name">' + esc(r.name) + '</div>' +
            '<div class="g-meta">' + it.memberCount + ' 位成员</div>' +
          '</div>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('[data-room]').forEach(function (el) {
      el.addEventListener('click', function () {
        enterRoom(parseInt(el.dataset.room, 10));
      });
    });
  }

  /* ============================================================
     进入群
     ============================================================ */
  function enterRoom(roomId) {
    var found = myRooms.find(function (x) { return x.room.id === roomId; });
    if (!found) return;
    activeRoom = found.room;
    activeMessages = [];
    memberMap = {};
    lastLatestId = 0;

    renderRoomList();

    $('groupEmpty').classList.add('hide');
    $('groupHead').classList.remove('hide');
    $('groupMessages').classList.remove('hide');
    $('groupForm').classList.remove('hide');

    $('groupTitle').textContent = activeRoom.name;
    $('groupMeta').textContent = found.memberCount + ' 位成员';

    loadMembers();
    loadMessages(true);

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden && activeRoom) loadMessages(false);
    }, POLL_INTERVAL);
  }

  function loadMembers() {
    if (!activeRoom) return;
    client.from('room_members').select('user_id').eq('room_id', activeRoom.id)
      .then(function (res) {
        var ids = (res.data || []).map(function (r) { return r.user_id; });
        if (!ids.length) return;
        client.from('profiles').select('*').in('id', ids).then(function (pres) {
          memberMap = {};
          (pres.data || []).forEach(function (p) { memberMap[p.id] = p; });
          renderMessages(false);
        });
      });
  }

  /* ============================================================
     加载消息
     ============================================================ */
  function loadMessages(first) {
    if (!activeRoom) return;
    client.from('room_messages')
      .select('*')
      .eq('room_id', activeRoom.id)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(function (res) {
        if (res.error) {
          console.error('[rooms] msg', res.error);
          if (first) $('groupMessages').innerHTML = '<div class="chat-error">加载失败</div>';
          return;
        }
        activeMessages = res.data || [];

        var senderIds = [];
        activeMessages.forEach(function (m) {
          if (senderIds.indexOf(m.sender_id) === -1) senderIds.push(m.sender_id);
        });

        function render() {
          renderMessages(first);
        }

        if (!senderIds.length) { render(); return; }

        client.from('profiles').select('*').in('id', senderIds).then(function (pres) {
          (pres.data || []).forEach(function (p) { memberMap[p.id] = p; });
          render();
        });
      });
  }

  function renderMessages(forceScroll) {
    var box = $('groupMessages');
    if (!box) return;

    if (!activeMessages.length) {
      box.innerHTML = '<div class="chat-empty">还没有消息。说点什么吧 👋</div>';
      return;
    }

    var latestId = activeMessages[activeMessages.length - 1].id;
    var isNew = latestId !== lastLatestId;
    lastLatestId = latestId;

    box.innerHTML = activeMessages.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? activeMessages[i - 1] : null;
      var showTime = !prev ||
        (new Date(m.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;

      var timeHtml = showTime ? '<div class="chat-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';
      var sender = memberMap[m.sender_id] || { nickname: '未知用户' };
      var name = sender.nickname || '匿名';
      var c = colorOf(name);

      if (m.deleted) {
        return timeHtml +
          '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
            '<div class="chat-revoked">消息已撤回</div>' +
          '</div>';
      }

      if (m.type === 'image' && m.image_url) {
        var wrapImg =
          '<div class="chat-msg-wrap ' + (isSelf ? 'self' : '') + '">' +
            '<div class="chat-bubble chat-bubble-img">' +
              '<img src="' + esc(m.image_url) + '" onclick="window.open(this.src,\'_blank\')" alt="">' +
            '</div>' +
            (isSelf ? '<button class="chat-revoke-btn" data-revoke="' + m.id + '" title="撤回">⋮</button>' : '') +
          '</div>';
        return timeHtml +
          '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
            (isSelf ? '' : '<div class="chat-msg-sender" style="color:' + c + '">' + esc(name) + '</div>') +
            wrapImg +
          '</div>';
      }

      var bubble = '<div class="chat-bubble">' + esc(m.content || '').replace(/\n/g, '<br>') + '</div>';
      var wrapTxt =
        '<div class="chat-msg-wrap ' + (isSelf ? 'self' : '') + '">' +
          bubble +
          (isSelf ? '<button class="chat-revoke-btn" data-revoke="' + m.id + '" title="撤回">⋮</button>' : '') +
        '</div>';

      return timeHtml +
        '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
          (isSelf ? '' : '<div class="chat-msg-sender" style="color:' + c + '">' + esc(name) + '</div>') +
          wrapTxt +
        '</div>';
    }).join('');

    box.querySelectorAll('[data-revoke]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('撤回这条消息？')) revokeMessage(parseInt(btn.dataset.revoke, 10));
      });
    });

    if (forceScroll || isNew) {
      setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
    }
  }

  /* ============================================================
     撤回
     ============================================================ */
  function revokeMessage(id) {
    client.from('room_messages').update({
      deleted: true, content: null, image_url: null
    }).eq('id', id).eq('sender_id', me.id).then(function (res) {
      if (res.error) { window.siteToast && window.siteToast('撤回失败'); return; }
      window.siteToast && window.siteToast('已撤回');
      loadMessages(false);
    });
  }

  /* ============================================================
     发送文字
     ============================================================ */
  var form = $('groupForm');
  var input = $('groupInput');
  var sendBtn = $('groupSendBtn');

  if (input) {
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!activeRoom) return;
      var text = (input.value || '').trim();
      if (!text) return;

      sendBtn.disabled = true;
      sendBtn.textContent = '发送中…';

      client.from('room_messages').insert({
        room_id: activeRoom.id,
        sender_id: me.id,
        type: 'text',
        content: text
      }).then(function (res) {
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';
        if (res.error) { window.siteToast && window.siteToast('发送失败'); return; }
        input.value = '';
        input.style.height = 'auto';
        input.focus();
        loadMessages(false);
      });
    });
  }

  /* ============================================================
     发送图片
     ============================================================ */
  var imgBtn = $('groupImageBtn');
  var imgInput = $('groupImageInput');

  if (imgBtn && imgInput) {
    imgBtn.addEventListener('click', function () { imgInput.click(); });
    imgInput.addEventListener('change', function () {
      var file = imgInput.files && imgInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        window.siteToast && window.siteToast('请选择图片');
        imgInput.value = '';
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        window.siteToast && window.siteToast('图片请控制在 8MB 以内');
        imgInput.value = '';
        return;
      }
      sendImage(file);
      imgInput.value = '';
    });
  }

  function compressImage(file, maxW, maxH, q) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          var ratio = Math.min(maxW / w, maxH / h, 1);
          var nw = Math.round(w * ratio), nh = Math.round(h * ratio);
          var canvas = document.createElement('canvas');
          canvas.width = nw; canvas.height = nh;
          canvas.getContext('2d').drawImage(img, 0, 0, nw, nh);
          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('处理失败'));
            resolve(blob);
          }, 'image/jpeg', q);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function sendImage(file) {
    if (!activeRoom) return;
    window.siteToast && window.siteToast('上传图片中…');
    compressImage(file, 1280, 1280, 0.82).then(function (blob) {
      var path = 'room/' + activeRoom.id + '/' + me.id + '/' +
                 Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
      return client.storage.from('blog-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          return client.storage.from('blog-images').getPublicUrl(path).data.publicUrl;
        });
    }).then(function (url) {
      return client.from('room_messages').insert({
        room_id: activeRoom.id, sender_id: me.id,
        type: 'image', image_url: url, content: '[图片]'
      });
    }).then(function (res) {
      if (res.error) { window.siteToast && window.siteToast('发送失败'); return; }
      loadMessages(false);
    }).catch(function (err) {
      console.error('[rooms] image', err);
      window.siteToast && window.siteToast('图片发送失败');
    });
  }

  /* ============================================================
     创建群
     ============================================================ */
  var createModal = $('createModal');
  var createForm = $('createForm');
  var createBtn = $('createRoomBtn');

  function openCreate() {
    if (!createModal) return;
    createModal.classList.remove('hide');
    document.body.style.overflow = 'hidden';
    $('roomName').value = '';
    setCreateHint('', '');
    renderPicker($('friendPicker'), myFriends, []);
  }
  function closeCreate() {
    if (createModal) createModal.classList.add('hide');
    document.body.style.overflow = '';
  }

  if (createBtn) createBtn.addEventListener('click', openCreate);
  if ($('createClose')) $('createClose').addEventListener('click', closeCreate);
  if ($('createCancel')) $('createCancel').addEventListener('click', closeCreate);
  if (createModal) {
    createModal.addEventListener('click', function (e) {
      if (e.target === createModal) closeCreate();
    });
  }

  /* 好友选择器（通用） */
  function renderPicker(container, list, selectedIds) {
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<div class="picker-empty">还没有好友。先去<a href="friends.html">加好友</a>。</div>';
      return;
    }
    container.innerHTML = list.map(function (p) {
      var checked = selectedIds.indexOf(p.id) !== -1;
      var c = colorOf(p.nickname || '?');
      var ava = p.avatar
        ? '<img src="' + esc(p.avatar) + '" alt="">'
        : '<span class="picker-ava-letter" style="background:' + c + '">' + esc(initial(p.nickname)) + '</span>';
      return '' +
        '<label class="picker-item">' +
          '<input type="checkbox" value="' + p.id + '"' + (checked ? ' checked' : '') + '>' +
          ava +
          '<div class="picker-info">' +
            '<div class="picker-name">' + esc(p.nickname || '匿名') + '</div>' +
            '<div class="picker-meta">' + (p.is_guest ? '游客' : '正式用户') + '</div>' +
          '</div>' +
        '</label>';
    }).join('');
  }

  if (createForm) {
    createForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('roomName').value || '').trim();
      if (!name) { setCreateHint('请输入群名称', 'warn'); return; }

      var checked = $$('#friendPicker input[type="checkbox"]:checked')
        .map(function (c) { return c.value; });

      var btn = createForm.querySelector('.blog-publish-submit');
      btn.disabled = true;
      setCreateHint('正在创建…', '');

      client.from('rooms').insert({ name: name, owner_id: me.id })
        .select().single()
        .then(function (res) {
          if (res.error) {
            btn.disabled = false;
            setCreateHint(res.error.message || '创建失败', 'warn');
            return;
          }
          var roomId = res.data.id;
          var members = [{ room_id: roomId, user_id: me.id }];
          checked.forEach(function (uid) { members.push({ room_id: roomId, user_id: uid }); });

          return client.from('room_members').insert(members).then(function (mres) {
            btn.disabled = false;
            if (mres.error) {
              setCreateHint(mres.error.message || '成员添加失败', 'warn');
              return;
            }
            setCreateHint('创建成功', 'ok');
            window.siteToast && window.siteToast('群组已创建');
            setTimeout(function () {
              closeCreate();
              loadMyRooms();
            }, 500);
          });
        }).catch(function (err) {
          btn.disabled = false;
          setCreateHint(err.message || '网络错误', 'warn');
        });
    });
  }

  function setCreateHint(msg, type) {
    var el = $('createHint');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'blog-publish-hint' + (type ? ' ' + type : '');
  }

  /* ============================================================
     邀请好友
     ============================================================ */
  var inviteModal = $('inviteModal');
  var inviteForm = $('inviteForm');
  var inviteBtn = $('inviteBtn');

  function openInvite() {
    if (!activeRoom || !inviteModal) return;
    inviteModal.classList.remove('hide');
    document.body.style.overflow = 'hidden';
    setInviteHint('', '');

    client.from('room_members').select('user_id').eq('room_id', activeRoom.id)
      .then(function (res) {
        var already = (res.data || []).map(function (r) { return r.user_id; });
        var candidates = myFriends.filter(function (p) { return already.indexOf(p.id) === -1; });
        renderPicker($('invitePicker'), candidates, []);
      });
  }
  function closeInvite() {
    if (inviteModal) inviteModal.classList.add('hide');
    document.body.style.overflow = '';
  }

  if (inviteBtn) inviteBtn.addEventListener('click', openInvite);
  if ($('inviteClose')) $('inviteClose').addEventListener('click', closeInvite);
  if ($('inviteCancel')) $('inviteCancel').addEventListener('click', closeInvite);
  if (inviteModal) {
    inviteModal.addEventListener('click', function (e) {
      if (e.target === inviteModal) closeInvite();
    });
  }

  if (inviteForm) {
    inviteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!activeRoom) return;
      var checked = $$('#invitePicker input[type="checkbox"]:checked')
        .map(function (c) { return c.value; });
      if (!checked.length) { setInviteHint('请选择至少一位好友', 'warn'); return; }

      var btn = inviteForm.querySelector('.blog-publish-submit');
      btn.disabled = true;
      setInviteHint('正在邀请…', '');

      var rows = checked.map(function (uid) {
        return { room_id: activeRoom.id, user_id: uid };
      });

      client.from('room_members').insert(rows).then(function (res) {
        btn.disabled = false;
        if (res.error) {
          var msg = res.error.message || '邀请失败';
          if (/duplicate|unique/i.test(msg)) msg = '对方已经在群里了';
          setInviteHint(msg, 'warn');
          return;
        }
        setInviteHint('邀请成功', 'ok');
        window.siteToast && window.siteToast('已邀请');
        setTimeout(function () {
          closeInvite();
          loadMembers();
          loadMyRooms();
        }, 500);
      });
    });
  }

  function setInviteHint(msg, type) {
    var el = $('inviteHint');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'blog-publish-hint' + (type ? ' ' + type : '');
  }

  /* ============================================================
     退出群
     ============================================================ */
  var leaveBtn = $('leaveRoomBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', function () {
      if (!activeRoom) return;
      if (!confirm('确定退出「' + activeRoom.name + '」吗？')) return;

      client.from('room_members').delete()
        .eq('room_id', activeRoom.id).eq('user_id', me.id)
        .then(function (res) {
          if (res.error) { window.siteToast && window.siteToast('退出失败'); return; }
          window.siteToast && window.siteToast('已退出');
          activeRoom = null;
          if (pollTimer) clearInterval(pollTimer);
          $('groupEmpty').classList.remove('hide');
          $('groupHead').classList.add('hide');
          $('groupMessages').classList.add('hide');
          $('groupForm').classList.add('hide');
          loadMyRooms();
        });
    });
  }

})();