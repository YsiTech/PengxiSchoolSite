/* ===================================================================
   蓬溪格勒人民高等中学 · 个人中心逻辑
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth) {
    console.error('[profile] Auth 模块未加载');
    return;
  }

  var avatarDisplay    = document.getElementById('avatarDisplay');
  var avatarInput      = document.getElementById('avatarInput');
  var avatarRemoveBtn  = document.getElementById('avatarRemoveBtn');
  var profileName      = document.getElementById('profileName');
  var profileEmail     = document.getElementById('profileEmail');
  var profileRole      = document.getElementById('profileRole');
  var nicknameInput    = document.getElementById('nicknameInput');
  var emailDisplay     = document.getElementById('emailDisplay');
  var saveProfileBtn   = document.getElementById('saveProfileBtn');
  var newPassword      = document.getElementById('newPassword');
  var newPassword2     = document.getElementById('newPassword2');
  var changePasswordBtn= document.getElementById('changePasswordBtn');
  var logoutBtn        = document.getElementById('logoutBtn');
  var guestNotice      = document.getElementById('guestNotice');

  /* 暂存当前头像的 base64（用户选择新头像后更新，保存时才写入云端） */
  var pendingAvatar = null;
  var originalAvatar = '';

  /* ============================================================
     1. 载入用户数据
     ============================================================ */
  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      /* auth.js 会自动跳登录页，这里再兜底一次 */
      location.replace('index.html?redirect=profile.html');
      return;
    }
    renderUser();
  });

  function renderUser() {
    var user = Auth.getCurrentUser();
    if (!user) return;

    profileName.textContent  = user.nickname || '—';
    profileEmail.textContent = user.email || '(游客账号)';
    profileRole.textContent  = user.isGuest ? '游客' : '正式用户';

    nicknameInput.value = user.nickname || '';
    emailDisplay.value  = user.email || '(游客账号)';

    originalAvatar = user.avatar || '';
    renderAvatar(originalAvatar, user.nickname);

    if (user.isGuest) guestNotice.classList.remove('hide');
  }

  function renderAvatar(dataUrl, nickname) {
    if (dataUrl) {
      avatarDisplay.innerHTML = '<img src="' + dataUrl + '" alt="">';
      avatarDisplay.classList.remove('fallback');
    } else {
      var fb = Auth.avatarFallback(nickname || '?');
      avatarDisplay.innerHTML = '<span>' + fb.initial + '</span>';
      avatarDisplay.style.background = fb.color;
      avatarDisplay.classList.add('fallback');
      return;
    }
    avatarDisplay.style.background = '';
  }

  /* ============================================================
     2. 选择头像 → 压缩为 128x128 JPEG base64
     ============================================================ */
  avatarInput.addEventListener('change', function () {
    var file = avatarInput.files && avatarInput.files[0];
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      window.siteToast && window.siteToast('请选择图片文件');
      avatarInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.siteToast && window.siteToast('原图请控制在 5MB 以内');
      avatarInput.value = '';
      return;
    }

    compressImage(file, 128, 0.85).then(function (dataUrl) {
      pendingAvatar = dataUrl;
      var user = Auth.getCurrentUser();
      renderAvatar(dataUrl, user && user.nickname);
      window.siteToast && window.siteToast('头像已就绪，点击「保存修改」生效');
    }).catch(function (err) {
      console.error('[profile] 图片处理失败:', err);
      window.siteToast && window.siteToast('图片处理失败，请换一张试试');
    });

    avatarInput.value = '';
  });

  /* 用 canvas 压缩图片，返回 base64 dataURL */
  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          /* 计算裁剪成正方形 */
          var min = Math.min(w, h);
          var sx = (w - min) / 2;
          var sy = (h - min) / 2;

          var canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);

          try {
            var dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
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
     3. 移除头像
     ============================================================ */
  avatarRemoveBtn.addEventListener('click', function () {
    var user = Auth.getCurrentUser();
    pendingAvatar = '';       /* 空字符串表示清空 */
    renderAvatar('', user && user.nickname);
    window.siteToast && window.siteToast('头像将移除，点击「保存修改」生效');
  });

  /* ============================================================
     4. 保存资料（昵称 + 头像）
     ============================================================ */
  saveProfileBtn.addEventListener('click', function () {
    var nickname = nicknameInput.value.trim();

    if (!nickname) {
      window.siteToast && window.siteToast('昵称不能为空');
      return;
    }
    if (nickname.length > 16) {
      window.siteToast && window.siteToast('昵称最多 16 个字');
      return;
    }

    var user = Auth.getCurrentUser();
    var patch = { nickname: nickname };

    /* 如果用户动过头像，一并提交 */
    if (pendingAvatar !== null) patch.avatar = pendingAvatar;

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = '保存中…';

    Auth.updateProfile(patch).then(function (res) {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = '保存修改';

      if (!res.ok) {
        window.siteToast && window.siteToast(res.msg || '保存失败');
        return;
      }
      pendingAvatar = null;
      originalAvatar = res.user.avatar || '';
      profileName.textContent = res.user.nickname;
      renderAvatar(res.user.avatar, res.user.nickname);
      /* 刷新顶部栏 */
      if (window.Auth && Auth.mountNavStatus) {
        Auth.mountNavStatus('zh');
      }
      window.siteToast && window.siteToast('资料已更新');
    });
  });

  /* ============================================================
     5. 修改密码
     ============================================================ */
  changePasswordBtn.addEventListener('click', function () {
    var p1 = newPassword.value;
    var p2 = newPassword2.value;

    if (!p1) {
      window.siteToast && window.siteToast('请输入新密码');
      return;
    }
    if (p1.length < 6) {
      window.siteToast && window.siteToast('新密码至少 6 位');
      return;
    }
    if (p1 !== p2) {
      window.siteToast && window.siteToast('两次输入的密码不一致');
      return;
    }

    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = '提交中…';

    Auth.changePassword(p1, p2).then(function (res) {
      changePasswordBtn.disabled = false;
      changePasswordBtn.textContent = '修改密码';

      if (!res.ok) {
        window.siteToast && window.siteToast(res.msg || '修改失败');
        return;
      }
      newPassword.value = '';
      newPassword2.value = '';
      window.siteToast && window.siteToast('密码修改成功');
    });
  });

  /* ============================================================
     6. 退出登录
     ============================================================ */
  logoutBtn.addEventListener('click', function () {
    if (window.confirm('确定要退出登录吗？')) {
      Auth.logout();
    }
  });

})();