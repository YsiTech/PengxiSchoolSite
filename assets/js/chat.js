/* ===================================================================
   好友聊天 · 完整版
   · 文本 + 图片
   · 撤回
   · 已读回执
   · 离线消息
   · 5 秒轮询
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) return;

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
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var hm = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    if (sameDay) return hm;
    return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
  }

  /* 图片压缩 */
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
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('处理失败'));
            resolve(blob);
          }, 'image/jpeg', quality);
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
      var path = u.id + '/chat_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
      return client.storage.from('blog-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          var pub = client.storage.from('blog-images').getPublicUrl(path);
          return pub.data.publicUrl;
        });
    });
  }

  var me = null;
  var peerId = null;
  var peerProfile = null;
  var lastRenderedId = 0;
  var allMessages = [];

  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    me = Auth.getCurrentUser();

    var params = new URLSearchParams(location.search);
    peerId = params.get('with');
    if (!peerId) {
      $('chatMessages').innerHTML = '<div class="chat-error">未指定聊天对象，<a href="friends.html">返回好友列表</a></div>';
      return;
    }

    loadPeer();
    loadMessages(true);

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) loadMessages(false);
    }, POLL_INTERVAL);
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  function loadPeer() {
    client.from('profiles').select('*').eq('id', peerId).maybeSingle()
      .then(function (res) {
        if (!res.data) return;
        peerProfile = res.data;
        var name = peerProfile.nickname || '匿名';
        document.title = '与 ' + name + ' 聊天 · 蓬溪格勒人民高等中学';
        $('chatTitle').textContent = '与 ' + name + ' 聊天';

        var peer = $('chatPeer');
        var c = '#' + ['c8102e','1a2b4c','1f8f55','8a6d12','7a3b8f','c85a17','2b6a8b','8b2b4a'][name.charCodeAt(0) % 8];
        var ava = peerProfile.avatar
          ? '<img src="' + esc(peerProfile.avatar) + '" alt="">'
          : '<span style="background:' + c + '">' + esc(name.slice(0, 1).toUpperCase()) + '</span>';
        peer.querySelector('.chat-peer-avatar').innerHTML = ava;
        peer.querySelector('.chat-peer-info b').textContent = name;
        peer.querySelector('.chat-peer-info span').textContent =
          peerProfile.is_guest ? '游客' : '正式用户';
      });
  }

  function loadMessages(first) {
    client.from('messages')
      .select('*')
      .or(
        'and(sender_id.eq.' + me.id + ',receiver_id.eq.' + peerId + '),' +
        'and(sender_id.eq.' + peerId + ',receiver_id.eq.' + me.id + ')'
      )
      .order('created_at', { ascending: true })
      .limit(300)
      .then(function (res) {
        if (res.error) {
          console.error('[chat] 加载失败:', res.error);
          if (first) $('chatMessages').innerHTML = '<div class="chat-error">加载失败</div>';
          return;
        }
        allMessages = res.data || [];
        renderMessages(first);
        markAsRead();
      });
  }

  function renderMessages(forceScroll) {
    var box = $('chatMessages');
    if (!box) return;

    if (!allMessages.length) {
      box.innerHTML = '<div class="chat-empty">还没有消息。打个招呼吧 👋</div>';
      return;
    }

    var latestId = allMessages[allMessages.length - 1].id;
    var isNew = latestId !== lastRenderedId;
    lastRenderedId = latestId;

    box.innerHTML = allMessages.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? allMessages[i - 1] : null;
      var showTime = !prev || (new Date(m.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;
      var timeHtml = showTime ? '<div class="chat-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';

      var inner;
      if (m.recalled) {
        inner = '<div class="chat-bubble chat-recalled">此消息已撤回</div>';
      } else if (m.type === 'image' && m.image_url) {
        inner = '<div class="chat-bubble chat-image-bubble">' +
                  '<img src="' + esc(m.image_url) + '" alt="图片" data-preview="' + esc(m.image_url) + '">' +
                '</div>';
      } else {
        inner = '<div class="chat-bubble">' + esc(m.content || '').replace(/\n/g, '<br>') + '</div>';
      }

      /* 已读回执（只对自己的消息显示） */
      var receipt = '';
      if (isSelf && !m.recalled) {
        receipt = '<div class="chat-receipt">' + (m.is_read ? '已读' : '未读') + '</div>';
      }

      return timeHtml +
        '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '" data-id="' + m.id + '">' +
          '<div class="chat-msg-inner">' +
            inner +
            receipt +
            (isSelf && !m.recalled ?
              '<button class="chat-recall-btn" data-recall="' + m.id + '" type="button" title="撤回">↺</button>' :
              '') +
          '</div>' +
        '</div>';
    }).join('');

    /* 图片点击放大 */
    box.querySelectorAll('[data-preview]').forEach(function (img) {
      img.addEventListener('click', function () {
        showImagePreview(img.getAttribute('data-preview'));
      });
    });
    /* 撤回按钮 */
    box.querySelectorAll('[data-recall]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.recall, 10);
        if (confirm('撤回这条消息？')) recallMessage(id);
      });
    });

    if (forceScroll || isNew) {
      setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
    }
  }

  function recallMessage(id) {
    client.from('messages').update({ recalled: true }).eq('id', id)
      .then(function (res) {
        if (res.error) { window.siteToast && window.siteToast('撤回失败'); return; }
        window.siteToast && window.siteToast('已撤回');
        loadMessages(false);
      });
  }

  function markAsRead() {
    client.from('messages')
      .update({ is_read: true })
      .eq('receiver_id', me.id)
      .eq('sender_id', peerId)
      .eq('is_read', false)
      .then(function () {});
  }

  /* ============================================================
     图片预览弹窗
     ============================================================ */
  function showImagePreview(url) {
    var overlay = document.createElement('div');
    overlay.className = 'chat-preview-overlay';
    overlay.innerHTML = '<img src="' + esc(url) + '" alt="">';
    overlay.addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ============================================================
     发送
     ============================================================ */
  var form = $('chatForm');
  var input = $('chatInput');
  var sendBtn = $('chatSendBtn');
  var imageInput = $('chatImageInput');

  if (input) {
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  }

  /* 图片上传按钮 */
  var imgBtn = $('chatImageBtn');
  if (imgBtn && imageInput) {
    imgBtn.addEventListener('click', function () { imageInput.click(); });
    imageInput.addEventListener('change', function () {
      var f = imageInput.files && imageInput.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { window.siteToast && window.siteToast('请选择图片'); return; }
      if (f.size > 8 * 1024 * 1024) { window.siteToast && window.siteToast('图片请控制在 8MB 以内'); return; }

      sendBtn.disabled = true;
      sendBtn.textContent = '上传中…';
      uploadImage(f).then(function (url) {
        return client.from('messages').insert({
          sender_id: me.id,
          receiver_id: peerId,
          type: 'image',
          image_url: url,
          content: '[图片]'
        });
      }).then(function (res) {
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';
        if (res && res.error) { window.siteToast && window.siteToast('发送失败'); return; }
        imageInput.value = '';
        loadMessages(false);
      }).catch(function (err) {
        console.error(err);
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';
        window.siteToast && window.siteToast('上传失败');
      });
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (input.value || '').trim();
      if (!text) return;

      sendBtn.disabled = true;
      sendBtn.textContent = '发送中…';

      client.from('messages').insert({
        sender_id: me.id,
        receiver_id: peerId,
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

})();