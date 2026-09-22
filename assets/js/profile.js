/* ===================================================================
   蓬溪格勒人民高等中学 · 个人中心逻辑
   健壮版：所有事件绑定放在最前面，任何错误都不影响按钮
   =================================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ============================================================
     1. DOM 引用 —— 全部先抓，找不到就报错但不中断
     ============================================================ */
  var els = {
    avatarDisplay:    $('avatarDisplay'),
    avatarInput:      $('avatarInput'),
    avatarPickBtn:    $('avatarPickBtn'),
    avatarRemoveBtn:  $('avatarRemoveBtn'),
    profileName:      $('profileName'),
    profileEmail:     $('profileEmail'),
    profileRole:      $('profileRole'),
    nicknameInput:    $('nicknameInput'),
    emailDisplay:     $('emailDisplay'),
    saveProfileBtn:   $('saveProfileBtn'),
    newPassword:      $('newPassword'),
    newPassword2:     $('newPassword2'),
    changePasswordBtn:$('changePasswordBtn'),
    logoutBtn:        $('logoutBtn'),
    guestNotice:      $('guestNotice')
  };

  console.log('[profile] DOM 就绪情况:');
  Object.keys(els).forEach(function (k) {
    if (!els[k]) console.warn('  ✗ 缺少元素:', k);
  });

  /* ============================================================
     2. 简单的 toast 兜底（main.js 未加载时也能用）
     ============================================================ */
  function toast(msg) {
    if (window.siteToast) { window.siteToast(msg); return; }
    console.log('[profile toast]', msg);
    try { alert(msg); } catch (e) {}
  }

  /* ============================================================
     3. 状态
     ============================================================ */
  var pendingAvatar = null;   /* 用户选的新头像；null = 未改动；'' = 清空 */
  var currentUserCache = null;

  /* ============================================================
     4. 头像渲染
     ============================================================ */
  function renderAvatar(dataUrl, nickname) {
    if (!els.avatarDisplay) return;

    if (dataUrl) {
      els.avatarDisplay.innerHTML = '<img src="' + dataUrl + '" alt="">';
      els.avatarDisplay.classList.remove('fallback');
      els.avatarDisplay.style.background = '';
      return;
    }

    var fb = (window.Auth && Auth.avatarFallback)
      ? Auth.avatarFallback(nickname || '?')
      : { initial: String(nickname || '?').slice(0, 1).toUpperCase(), color: '#c8102e' };

    els.avatarDisplay.innerHTML = '<span>' + fb.initial + '</span>';
    els.avatarDisplay.classList.add('fallback');
    els.avatarDisplay.style.background = fb.color;
  }

  /* ============================================================
     5. 图片压缩 —— 96×96，质量 0.7，控制在 3KB 左右
     ============================================================ */
  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          var min = Math.min(w, h);
          var sx = (w - min) / 2;
          var sy = (h - min) / 2;

          var canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);

          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ============================================================
     6. 事件绑定 —— 全部无条件绑定，不依赖 Auth
     ============================================================ */

  /* 6.1 点击相机按钮 → 触发文件选择 */
  if (els.avatarPickBtn) {
    els.avatarPickBtn.addEventListener('click', function () {
      console.log('[profile] 点击更换头像');
      if (els.avatarInput) els.avatarInput.click();
    });
  }

  /* 6.2 文件选择后 → 压缩并预览 */
  if (els.avatarInput) {
    els.avatarInput.addEventListener('change', function () {
      var file = els.avatarInput.files && els.avatarInput.files[0];
      if (!file) return;
      console.log('[profile] 选择文件:', file.name, file.size, 'bytes');

      if (!/^image\//.test(file.type)) {
        toast('请选择图片文件');
        els.avatarInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast('原图请控制在 5MB 以内');
        els.avatarInput.value = '';
        return;
      }

      compressImage(file, 96, 0.7).then(function (dataUrl) {
        console.log('[profile] 压缩后长度:', dataUrl.length, 'chars');
        pendingAvatar = dataUrl;
        renderAvatar(dataUrl, currentUserCache && currentUserCache.nickname);
        toast('头像已就绪，点击「保存修改」生效');
      }).catch(function (err) {
        console.error('[profile] 图片处理失败:', err);
        toast('图片处理失败，请换一张试试');
      });

      els.avatarInput.value = '';
    });
  }

  /* 6.3 移除头像 */
  if (els.avatarRemoveBtn) {
    els.avatarRemoveBtn.addEventListener('click', function () {
      console.log('[profile] 点击移除头像');
      pendingAvatar = '';
      renderAvatar('', currentUserCache && currentUserCache.nickname);
      toast('头像将移除，点击「保存修改」生效');
    });
  }

  /* 6.4 保存资料 */
  if (els.saveProfileBtn) {
    els.saveProfileBtn.addEventListener('click', function () {
      console.log('[profile] 点击保存资料');

      if (!window.Auth) { toast('Auth 模块未加载'); return; }
      if (!Auth.isLoggedIn()) { toast('未登录'); return; }

      var nickname = (els.nicknameInput && els.nicknameInput.value || '').trim();
      if (!nickname) { toast('昵称不能为空'); return; }
      if (nickname.length > 16) { toast('昵称最多 16 个字'); return; }

      var patch = { nickname: nickname };
      if (pendingAvatar !== null) patch.avatar = pendingAvatar;

      console.log('[profile] 提交数据:', {
        nickname: patch.nickname,
        hasAvatar: typeof patch.avatar === 'string',
        avatarLen: typeof patch.avatar === 'string' ? patch.avatar.length : 0
      });

      els.saveProfileBtn.disabled = true;
      els.saveProfileBtn.textContent = '保存中…';

      Auth.updateProfile(patch).then(function (res) {
        console.log('[profile] 保存结果:', res);
        els.saveProfileBtn.disabled = false;
        els.saveProfileBtn.textContent = '保存修改';

        if (!res.ok) { toast(res.msg || '保存失败'); return; }

        pendingAvatar = null;
        currentUserCache = res.user;

        if (els.profileName) els.profileName.textContent = res.user.nickname;
        renderAvatar(res.user.avatar, res.user.nickname);

        if (window.Auth && Auth.mountNavStatus) Auth.mountNavStatus('zh');
        toast('资料已更新');
      }).catch(function (err) {
        console.error('[profile] 保存异常:', err);
        els.saveProfileBtn.disabled = false;
        els.saveProfileBtn.textContent = '保存修改';
        toast('保存出错，请稍后重试');
      });
    });
  }

  /* 6.5 修改密码 */
  if (els.changePasswordBtn) {
    els.changePasswordBtn.addEventListener('click', function () {
      console.log('[profile] 点击修改密码');

      if (!window.Auth) { toast('Auth 模块未加载'); return; }
      if (!Auth.isLoggedIn()) { toast('未登录'); return; }

      var p1 = els.newPassword ? els.newPassword.value : '';
      var p2 = els.newPassword2 ? els.newPassword2.value : '';

      if (!p1) { toast('请输入新密码'); return; }
      if (p1.length < 6) { toast('新密码至少 6 位'); return; }
      if (p1 !== p2) { toast('两次输入的密码不一致'); return; }

      els.changePasswordBtn.disabled = true;
      els.changePasswordBtn.textContent = '提交中…';

      Auth.changePassword(p1, p2).then(function (res) {
        console.log('[profile] 修改密码结果:', res);
        els.changePasswordBtn.disabled = false;
        els.changePasswordBtn.textContent = '修改密码';

        if (!res.ok) { toast(res.msg || '修改失败'); return; }

        if (els.newPassword)  els.newPassword.value = '';
        if (els.newPassword2) els.newPassword2.value = '';
        toast('密码修改成功');
      }).catch(function (err) {
        console.error('[profile] 修改密码异常:', err);
        els.changePasswordBtn.disabled = false;
        els.changePasswordBtn.textContent = '修改密码';
        toast('修改出错，请稍后重试');
      });
    });
  }

  /* 6.6 退出登录 */
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', function () {
      console.log('[profile] 点击退出登录');
      if (!window.Auth) { location.href = 'index.html'; return; }
      if (window.confirm('确定要退出登录吗？')) {
        Auth.logout();
      }
    });
  }

  /* ============================================================
     7. 加载用户数据 —— 放在事件绑定之后，不阻塞按钮
     ============================================================ */
  function loadUser() {
    if (!window.Auth) {
      console.error('[profile] Auth 模块未加载');
      return;
    }

    var user = Auth.getCurrentUser();
    if (!user) {
      console.warn('[profile] 未登录，等待 auth.js 跳转');
      /* auth.js 会自动跳登录页 */
      return;
    }

    currentUserCache = user;

    if (els.profileName)  els.profileName.textContent = user.nickname || '—';
    if (els.profileEmail) els.profileEmail.textContent = user.email || '(游客账号)';
    if (els.profileRole)  els.profileRole.textContent = user.isGuest ? '游客' : '正式用户';

    if (els.nicknameInput) els.nicknameInput.value = user.nickname || '';
    if (els.emailDisplay)  els.emailDisplay.value  = user.email || '(游客账号)';

    renderAvatar(user.avatar, user.nickname);

    if (user.isGuest && els.guestNotice) els.guestNotice.classList.remove('hide');

    console.log('[profile] 用户数据已加载:', user.nickname);
  }

  /* 会话就绪后加载 */
  if (window.Auth && Auth.ready) {
    Auth.ready.then(loadUser).catch(function (err) {
      console.error('[profile] Auth.ready 出错:', err);
    });
  } else {
    /* Auth 未就绪，稍后再试一次 */
    setTimeout(loadUser, 300);
  }

  console.log('[profile] 个人中心已初始化');

})();