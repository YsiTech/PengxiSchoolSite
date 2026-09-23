/* ===================================================================
   群聊 · 完整版
   · 创建群 / 邀请好友 / 退出群聊
   · 文本 + 图片 + 撤回
   · 5 秒轮询
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.error('[gc] Auth 未就绪');
    return;
  }

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };
  var POLL_INTERVAL = 5000;
  var pollTimer = null;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    var now = new Date();
    var hm = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    return d.toDateString() === now.toDateString() ? hm : (d.getMonth()+1)+'月'+d.getDate()+'日 '+hm;
  }
  function avatarHTML(p, size) {
    size = size || 26;
    if (p && p.avatar) {
      return '<span class="ava"><img src="' + esc(p.avatar) + '" alt=""></span>';
    }
    var nick = (p && p.nickname) || '?';
    var c = '#' + ['c8102e','1a2b4c','1f8f55','8a6d12','7a3b8f','c85a17','2b6a8b','8b2b4a'][nick.charCodeAt(0) % 8];
    return '<span class="ava" style="background:' + c + '">' + esc(nick.slice(0,1).toUpperCase()) + '</span>';
  }

  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error('fail')); }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadImage(file) {
    var u = Auth.getCurrentUser();
    return compressImage(file, 1280, 0.8).then(function (blob) {
      var path = u.id + '/room_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
      return client.storage.from('blog-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          return client.storage.from('blog-images').getPublicUrl(path).data.publicUrl;
        });
    });
  }

  var me = null;
  var myRooms = [];
  var currentRoom = null;
  var roomMessages = [];
  var lastMsgId = 0;
  var roomMembers = [];
  var allFriends = [];

  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=group-chat.html');
      return;
    }
    me = Auth.getCurrentUser();
    loadRooms();
    loadFriends();

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) {
        loadRooms();
        if (currentRoom) {
          loadRoomMembers();
          loadRoomMessages(false);
        }
      }
    }, POLL_INTERVAL);
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  /* ============================================================
     加载我的群
     ============================================================ */
  function loadRooms() {
    client.from('room_members')
      .select('room_id')
      .eq('user_id', me.id)
      .then(function (res) {
        if (res.error) { console.error('[gc] 加载群失败:', res.error); return; }
        var ids = (res.data || []).map(function (r) { return r.room_id; });
        if (!ids.length) { myRooms = []; renderRooms(); return; }

        client.from('rooms').select('*').in('id', ids)
          .then(function (rres) {
            if (rres.error) { console.error('[gc]', rres.error); return; }
            myRooms = rres.data || [];
            renderRooms();
          });
      });
  }

  function renderRooms() {
    var box = $('roomList');
    if (!box) return;

    if (!myRooms.length) {
      box.innerHTML = '<div class="gc-empty">还没有加入任何群</div>';
      if (!currentRoom) {
        $('gcHeadActions').style.display = 'none';
      }
      return;
    }

    box.innerHTML = myRooms.map(function (r) {
      var active = currentRoom && currentRoom.id === r.id ? ' active' : '';
      return '<div class="gc-room' + active + '" data-room="' + r.id + '">' +
               '<span class="gc-room-icon">#</span>' +
               '<span class="gc-room-name">' + esc(r.name) + '</span>' +
             '</div>';
    }).join('');

    box.querySelectorAll('[data-room]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = parseInt(el.dataset.room, 10);
        var r = myRooms.find(function (x) { return x.id === id; });
        if (r) openRoom(r);
      });
    });
  }

  function openRoom(room) {
    currentRoom = room;
    roomMessages = [];
    lastMsgId = 0;
    renderRooms();
    $('gcHeader').textContent = room.name;
    $('gcHeadActions').style.display = '';
    loadRoomMembers();
    loadRoomMessages(true);
  }

  function loadRoomMembers() {
    if (!currentRoom) return;
    client.from('room_members').select('user_id').eq('room_id', currentRoom.id)
      .then(function (res) {
        var ids = (res.data || []).map(function (r) { return r.user_id; });
        if (!ids.length) { roomMembers = []; return; }
        client.from('profiles').select('*').in('id', ids)
          .then(function (pres) {
            roomMembers = pres.data || [];
            var cnt = $('gcMemberCount');
            if (cnt) cnt.textContent = roomMembers.length;
          });
      });
  }

  function loadRoomMessages(first) {
    if (!currentRoom) return;
    client.from('room_messages')
      .select('*')
      .eq('room_id', currentRoom.id)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(function (res) {
        if (res.error) { console.error('[gc]', res.error); return; }
        roomMessages = res.data || [];
        renderMessages(first);
      });
  }

  function renderMessages(forceScroll) {
    var box = $('gcMessages');
    if (!box) return;

    if (!currentRoom) {
      box.innerHTML = '<div class="gc-empty">从左侧选择一个群</div>';
      return;
    }
    if (!roomMessages.length) {
      box.innerHTML = '<div class="gc-empty">还没有消息</div>';
      return;
    }

    var latest = roomMessages[roomMessages.length - 1].id;
    var isNew = latest !== lastMsgId;
    lastMsgId = latest;

    var memberMap = {};
    roomMembers.forEach(function (m) { memberMap[m.id] = m; });

    box.innerHTML = roomMessages.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? roomMessages[i-1] : null;
      var showTime = !prev || (new Date(m.created_at) - new Date(prev.created_at)) > 5*60*1000;
      var timeHtml = showTime ? '<div class="chat-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';
      var sender = memberMap[m.sender_id];
      var senderName = sender ? (sender.nickname || '匿名') : '未知';

      var inner;
      if (m.recalled) {
        inner = '<div class="chat-bubble chat-recalled">此消息已撤回</div>';
      } else if (m.type === 'image' && m.image_url) {
        inner = '<div class="chat-bubble chat-image-bubble"><img src="' + esc(m.image_url) + '" alt="图片" data-preview="' + esc(m.image_url) + '"></div>';
      } else {
        inner = '<div class="chat-bubble">' + esc(m.content || '').replace(/\n/g, '<br>') + '</div>';
      }

      var nameHtml = (!isSelf && memberMap[m.sender_id])
        ? '<div class="chat-sender">' + esc(senderName) + '</div>' : '';

      return timeHtml +
        '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
          '<div class="chat-msg-inner">' +
            nameHtml +
            inner +
            (isSelf && !m.recalled ?
              '<button class="chat-recall-btn" data-recall="' + m.id + '" type="button" title="撤回">↺</button>' :
              '') +
          '</div>' +
        '</div>';
    }).join('');

    box.querySelectorAll('[data-preview]').forEach(function (img) {
      img.addEventListener('click', function () {
        var overlay = document.createElement('div');
        overlay.className = 'chat-preview-overlay';
        overlay.innerHTML = '<img src="' + esc(img.getAttribute('data-preview')) + '">';
        overlay.addEventListener('click', function () { overlay.remove(); });
        document.body.appendChild(overlay);
      });
    });

    box.querySelectorAll('[data-recall]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.recall, 10);
        if (!confirm('撤回这条消息？')) return;
        client.from('room_messages').update({ recalled: true }).eq('id', id)
          .then(function () { loadRoomMessages(false); });
      });
    });

    if (forceScroll || isNew) {
      setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
    }
  }

  /* ============================================================
     好友列表
     ============================================================ */
  function loadFriends() {
    client.from('friendships')
      .select('*')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .eq('status', 'accepted')
      .then(function (res) {
        var rows = res.data || [];
        var ids = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });
        if (!ids.length) { allFriends = []; return; }
        client.from('profiles').select('*').in('id', ids)
          .then(function (pres) { allFriends = pres.data || []; });
      });
  }

  /* ============================================================
     创建群
     ============================================================ */
  var createBtn = $('gcCreateBtn');
  var createModal = $('gcCreateModal');

  if (createBtn && createModal) {
    createBtn.addEventListener('click', function () {
      createModal.classList.remove('hide');
      renderFriendPicker();
    });
    var closeBtn = $('gcCreateClose');
    var cancelBtn = $('gcCreateCancel');
    if (closeBtn) closeBtn.addEventListener('click', function () { createModal.classList.add('hide'); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { createModal.classList.add('hide'); });
    if (createModal) createModal.addEventListener('click', function (e) {
      if (e.target === createModal) createModal.classList.add('hide');
    });
  }

  function renderFriendPicker() {
    var box = $('gcFriendPicker');
    if (!box) return;
    if (!allFriends.length) {
      box.innerHTML = '<div class="gc-empty">你还没有好友，先去添加好友吧</div>';
      return;
    }
    box.innerHTML = allFriends.map(function (f) {
      return '<label class="gc-pick">' +
               '<input type="checkbox" value="' + f.id + '">' +
               '<span>' + esc(f.nickname || '匿名') + '</span>' +
             '</label>';
    }).join('');
  }

  var createForm = $('gcCreateForm');
  if (createForm) {
    createForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var nameInput = $('gcGroupName');
      var name = (nameInput.value || '').trim();
      if (!name) { window.siteToast && window.siteToast('请输入群名称'); return; }

      var picked = [];
      createForm.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
        picked.push(c.value);
      });

      var submitBtn = createForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '创建中…';

      client.from('rooms').insert({ name: name, creator_id: me.id })
        .then(function (res) {
          if (res.error) {
            console.error('[gc] 插入 rooms 失败:', res.error);
            window.siteToast && window.siteToast('创建失败：' + (res.error.message || '未知错误'));
            submitBtn.disabled = false;
            submitBtn.textContent = '创建';
            return;
          }

          return client.from('rooms')
            .select('*')
            .eq('creator_id', me.id)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(function (rres) {
              if (rres.error || !rres.data) {
                console.error('[gc] 查询 rooms 失败:', rres.error);
                window.siteToast && window.siteToast('创建成功但读取失败，请刷新');
                submitBtn.disabled = false;
                submitBtn.textContent = '创建';
                return;
              }

              var roomId = rres.data.id;
              var members = [me.id].concat(picked);
              var inserts = members.map(function (uid) {
                return { room_id: roomId, user_id: uid };
              });

              return client.from('room_members').insert(inserts)
                .then(function (mres) {
                  if (mres.error) {
                    console.error('[gc]', mres.error);
                    window.siteToast && window.siteToast('成员添加失败');
                    submitBtn.disabled = false;
                    submitBtn.textContent = '创建';
                    return;
                  }
                  window.siteToast && window.siteToast('群创建成功');
                  createModal.classList.add('hide');
                  createForm.reset();
                  submitBtn.disabled = false;
                  submitBtn.textContent = '创建';
                  loadRooms();
                });
            });
        })
        .catch(function (err) {
          console.error('[gc] 创建异常:', err);
          window.siteToast && window.siteToast('创建失败');
          submitBtn.disabled = false;
          submitBtn.textContent = '创建';
        });
    });
  }

  /* ============================================================
     邀请好友进群
     ============================================================ */
  var inviteBtn = $('gcInviteBtn');
  var inviteModal = $('gcInviteModal');

  if (inviteBtn) {
    inviteBtn.addEventListener('click', function () {
      if (!currentRoom) { window.siteToast && window.siteToast('请先选择群'); return; }
      openInviteModal();
    });
  }

  if (inviteModal) {
    var closeInv = $('gcInviteClose');
    var cancelInv = $('gcInviteCancel');
    if (closeInv) closeInv.addEventListener('click', function () { inviteModal.classList.add('hide'); });
    if (cancelInv) cancelInv.addEventListener('click', function () { inviteModal.classList.add('hide'); });
    inviteModal.addEventListener('click', function (e) {
      if (e.target === inviteModal) inviteModal.classList.add('hide');
    });
  }

  function openInviteModal() {
    var box = $('gcInviteList');
    if (!box) return;

    if (!allFriends.length) {
      box.innerHTML = '<div class="gc-invite-empty">你还没有好友，先去添加好友吧</div>';
      inviteModal.classList.remove('hide');
      return;
    }

    /* 当前群成员 id 集合 */
    var inRoomIds = {};
    roomMembers.forEach(function (m) { inRoomIds[m.id] = true; });

    box.innerHTML = allFriends.map(function (f) {
      var already = inRoomIds[f.id];
      return '<label class="gc-invite-item' + (already ? ' already' : '') + '">' +
               '<input type="checkbox" value="' + f.id + '"' + (already ? ' disabled checked' : '') + '>' +
               avatarHTML(f) +
               '<span class="txt">' + esc(f.nickname || '匿名') + (already ? '（已在群）' : '') + '</span>' +
             '</label>';
    }).join('');

    inviteModal.classList.remove('hide');
  }

  var inviteConfirm = $('gcInviteConfirm');
  if (inviteConfirm) {
    inviteConfirm.addEventListener('click', function () {
      if (!currentRoom) return;

      var picked = [];
      var box = $('gcInviteList');
      box.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)').forEach(function (c) {
        picked.push(c.value);
      });

      if (!picked.length) {
        window.siteToast && window.siteToast('请选择要邀请的好友');
        return;
      }

      inviteConfirm.disabled = true;
      inviteConfirm.textContent = '邀请中…';

      var inserts = picked.map(function (uid) {
        return { room_id: currentRoom.id, user_id: uid };
      });

      client.from('room_members').insert(inserts)
        .then(function (res) {
          inviteConfirm.disabled = false;
          inviteConfirm.textContent = '确认邀请';

          if (res.error) {
            console.error('[gc] 邀请失败:', res.error);
            var msg = res.error.message || '邀请失败';
            if (/duplicate|unique/i.test(msg)) msg = '有人已经在群里了';
            window.siteToast && window.siteToast(msg);
            return;
          }
          window.siteToast && window.siteToast('已邀请 ' + picked.length + ' 位好友');
          inviteModal.classList.add('hide');
          loadRoomMembers();
        })
        .catch(function (err) {
          console.error('[gc] 邀请异常:', err);
          inviteConfirm.disabled = false;
          inviteConfirm.textContent = '确认邀请';
          window.siteToast && window.siteToast('邀请失败');
        });
    });
  }

  /* ============================================================
     退出群聊
     ============================================================ */
  var leaveBtn = $('gcLeaveBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', function () {
      if (!currentRoom) return;
      if (!confirm('确定退出「' + currentRoom.name + '」吗？')) return;

      leaveBtn.disabled = true;
      leaveBtn.textContent = '退出中…';

      client.from('room_members')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', me.id)
        .then(function (res) {
          leaveBtn.disabled = false;
          leaveBtn.textContent = '退出群聊';

          if (res.error) {
            console.error('[gc] 退出失败:', res.error);
            window.siteToast && window.siteToast('退出失败');
            return;
          }

          window.siteToast && window.siteToast('已退出群聊');

          /* 清空当前状态 */
          currentRoom = null;
          roomMessages = [];
          roomMembers = [];
          lastMsgId = 0;

          $('gcHeader').textContent = '未选择群';
          $('gcMemberCount').textContent = '0';
          $('gcMessages').innerHTML = '<div class="gc-empty">从左侧选择一个群</div>';
          $('gcHeadActions').style.display = 'none';

          loadRooms();
        });
    });
  }

  /* ============================================================
     发消息
     ============================================================ */
  var form = $('gcForm');
  var input = $('gcInput');
  var sendBtn = $('gcSendBtn');
  var imgBtn = $('gcImageBtn');
  var imgInput = $('gcImageInput');

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentRoom) { window.siteToast && window.siteToast('请先选择群'); return; }
      var text = (input.value || '').trim();
      if (!text) return;

      sendBtn.disabled = true;
      client.from('room_messages').insert({
        room_id: currentRoom.id,
        sender_id: me.id,
        type: 'text',
        content: text
      }).then(function (res) {
        sendBtn.disabled = false;
        if (res.error) { console.error('[gc]', res.error); window.siteToast && window.siteToast('发送失败'); return; }
        input.value = '';
        loadRoomMessages(false);
      });
    });
  }

  if (imgBtn && imgInput) {
    imgBtn.addEventListener('click', function () { imgInput.click(); });
    imgInput.addEventListener('change', function () {
      if (!currentRoom) { window.siteToast && window.siteToast('请先选择群'); return; }
      var f = imgInput.files && imgInput.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { window.siteToast && window.siteToast('图片太大'); return; }

      sendBtn.disabled = true;
      uploadImage(f).then(function (url) {
        return client.from('room_messages').insert({
          room_id: currentRoom.id,
          sender_id: me.id,
          type: 'image',
          image_url: url,
          content: '[图片]'
        });
      }).then(function () {
        sendBtn.disabled = false;
        imgInput.value = '';
        loadRoomMessages(false);
      }).catch(function (err) {
        console.error('[gc]', err);
        sendBtn.disabled = false;
        window.siteToast && window.siteToast('上传失败');
      });
    });
  }

})();