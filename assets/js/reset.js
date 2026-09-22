/* ===================================================================
   蓬溪格勒人民高等中学 · 找回密码 / 重置密码
   =================================================================== */

(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!window.Auth) {
    console.error('[reset] Auth 模块未加载');
    return;
  }

  /* ---------------- 页面状态 ---------------- */
  var stateEmail = document.getElementById('stateEmail');
  var stateReset = document.getElementById('stateReset');
  var stateSent  = document.getElementById('stateSent');

  function show(name) {
    stateEmail.classList.toggle('hide', name !== 'email');
    stateReset.classList.toggle('hide', name !== 'reset');
    stateSent.classList.toggle('hide',  name !== 'sent');
  }

  /* ---------------- 工具 ---------------- */
  function setHint(id, msg, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'auth-hint' + (type ? ' ' + type : '');
  }
  function setLoading(btn, on) {
    if (!btn) return;
    if (on) { btn.disabled = true; btn.classList.add('loading'); }
    else    { btn.disabled = false; btn.classList.remove('loading'); }
  }

  /* ---------------- 密码显隐 ---------------- */
  document.querySelectorAll('.auth-eye').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.for);
      if (!input) return;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '👁' : '🙈';
      btn.classList.toggle('on', !showing);
      input.focus();
    });
  });

  /* ============================================================
     检测 URL 中是否带重置令牌
     Supabase 会在 URL hash 里放 access_token 与 type=recovery
     或通过 PKCE 走 ?code=... 流程
     ============================================================ */
  function detectRecoveryMode() {
    var hash = location.hash || '';
    var search = location.search || '';

    /* hash 中有 type=recovery 或 access_token */
    if (/type=recovery/.test(hash) || /access_token=/.test(hash)) return true;
    /* PKCE 流程 */
    if (/[?&]code=/.test(search)) return true;
    /* 兜底：Supabase SDK 会在 getSession 时处理 hash，稍后 checkSession 也会确认 */

    return false;
  }

  function initRecovery() {
    /* 等 Auth 会话就绪，SDK 会自动把 URL 中的令牌转成会话 */
    Auth.ready.then(function () {
      var user = Auth.getCurrentUser();
      /* 如果已有会话且是 recovery 场景，显示重置表单 */
      if (user) {
        show('reset');
      } else if (detectRecoveryMode()) {
        /* 有令牌但还没换到会话，等一下 */
        setTimeout(function () {
          if (Auth.getCurrentUser()) show('reset');
          else show('email');
        }, 800);
      } else {
        show('email');
      }
    });
  }

  /* ============================================================
     发送重置邮件
     ============================================================ */
  var forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = document.getElementById('forgotEmail').value;
      var btn = forgotForm.querySelector('.auth-submit');

      setHint('forgotHint', '', '');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) {
        setHint('forgotHint', '请输入正确的邮箱地址', 'warn');
        return;
      }

      setLoading(btn, true);

      Auth.sendResetEmail(email).then(function (res) {
        setLoading(btn, false);

        if (!res.ok) {
          setHint('forgotHint', res.msg, 'warn');
          return;
        }
        /* 显示发送成功页 */
        var emailEl = document.getElementById('sentEmail');
        if (emailEl) emailEl.textContent = String(email).trim().toLowerCase();
        show('sent');

        /* 把邮箱暂存，供"重新发送"用 */
        try { sessionStorage.setItem('pxgl_reset_email', String(email).trim().toLowerCase()); } catch (e) {}
      });
    });
  }

  /* ============================================================
     重新发送
     ============================================================ */
  var resendBtn = document.getElementById('resendBtn');
  if (resendBtn) {
    resendBtn.addEventListener('click', function () {
      var email = '';
      try { email = sessionStorage.getItem('pxgl_reset_email') || ''; } catch (e) {}
      if (!email) { show('email'); return; }

      setLoading(resendBtn, true);
      Auth.sendResetEmail(email).then(function (res) {
        setLoading(resendBtn, false);
        if (window.siteToast) {
          window.siteToast(res.ok ? '已重新发送' : (res.msg || '发送失败'));
        } else {
          alert(res.ok ? '已重新发送' : (res.msg || '发送失败'));
        }
      });
    });
  }

  /* ============================================================
     重置密码
     ============================================================ */
  var resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var p1 = document.getElementById('newPassword').value;
      var p2 = document.getElementById('newPassword2').value;
      var btn = resetForm.querySelector('.auth-submit');

      setHint('resetHint', '', '');

      if (!p1 || p1.length < 6) {
        setHint('resetHint', '密码至少 6 位', 'warn');
        return;
      }
      if (p1 !== p2) {
        setHint('resetHint', '两次输入的密码不一致', 'warn');
        return;
      }

      setLoading(btn, true);

      Auth.updatePassword(p1).then(function (res) {
        setLoading(btn, false);

        if (!res.ok) {
          setHint('resetHint', res.msg, 'warn');
          return;
        }

        setHint('resetHint', '密码已更新，正在跳转登录页…', 'ok');

        /* 更新成功后登出，让用户用新密码登录一次 */
        setTimeout(function () {
          if (window.Auth && Auth.client) {
            Auth.client.auth.signOut().finally(function () {
              location.href = 'index.html';
            });
          } else {
            location.href = 'index.html';
          }
        }, 1200);
      });
    });
  }

  /* ---------------- 启动 ---------------- */
  initRecovery();

})();