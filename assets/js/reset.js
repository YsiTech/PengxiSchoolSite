/* ===================================================================
   蓬溪格勒人民高等中学 · 密码重置（第二步：验证码 + 新密码）
   =================================================================== */

(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!window.Auth || !Auth.client) {
    console.error('[reset] Auth 模块未加载');
    return;
  }

  var client = Auth.client;

  var stateVerify  = document.getElementById('stateVerify');
  var stateSuccess = document.getElementById('stateSuccess');

  /* 从 sessionStorage / localStorage 读邮箱 */
  var email = '';
  try {
    email = sessionStorage.getItem('pxgl_reset_email') ||
            localStorage.getItem('pxgl_last_email') || '';
  } catch (e) {}

  /* 没邮箱 → 回到第一步 */
  if (!email) {
    console.warn('[reset] 没有邮箱，跳回第一步');
    location.replace('forgot-password.html');
    return;
  }

  /* 显示邮箱 */
  var displayEmail = document.getElementById('displayEmail');
  if (displayEmail) displayEmail.textContent = email;

  /* 密码显隐 */
  document.querySelectorAll('.auth-eye').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.for);
      if (!input) return;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '👁' : '🙈';
      input.focus();
    });
  });

  function setHint(msg, type) {
    var el = document.getElementById('verifyHint');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'auth-hint' + (type ? ' ' + type : '');
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) { btn.disabled = true; btn.classList.add('loading'); }
    else    { btn.disabled = false; btn.classList.remove('loading'); }
  }

  var form = document.getElementById('verifyForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var token = (document.getElementById('vToken').value || '').trim();
    var pwd   = document.getElementById('vPassword').value || '';
    var pwd2  = document.getElementById('vPassword2').value || '';

    setHint('', '');

    if (!/^\d{6}$/.test(token)) {
      setHint('验证码是 6 位数字', 'warn'); return;
    }
    if (pwd.length < 6) {
      setHint('新密码至少 6 位', 'warn'); return;
    }
    if (pwd !== pwd2) {
      setHint('两次输入的密码不一致', 'warn'); return;
    }

    var btn = form.querySelector('.auth-submit');
    setLoading(btn, true);
    setHint('正在验证…', '');

    /* 第一步：验证 OTP */
    client.auth.verifyOtp({
      email: email,
      token: token,
      type: 'recovery'
    }).then(function (res) {
      if (res.error) {
        console.error('[reset] verifyOtp 失败:', res.error);
        var msg = String(res.error.message || '');
        var userMsg = '验证失败';
        if (/expired/i.test(msg)) userMsg = '验证码已过期，请返回上一步重新获取';
        else if (/invalid|token/i.test(msg)) userMsg = '验证码不正确';
        else if (/rate limit/i.test(msg)) userMsg = '请求过于频繁，请稍后再试';
        else userMsg = msg;
        setHint(userMsg, 'warn');
        setLoading(btn, false);
        return;
      }

      /* 第二步：改密码 */
      return client.auth.updateUser({ password: pwd }).then(function (res2) {
        if (res2.error) {
          console.error('[reset] updateUser 失败:', res2.error);
          setHint(res2.error.message || '密码修改失败', 'warn');
          setLoading(btn, false);
          return;
        }

        /* 第三步：登出，跳回登录页 */
        return client.auth.signOut().then(function () {
          setLoading(btn, false);
          stateVerify.classList.add('hide');
          stateSuccess.classList.remove('hide');
          try {
            sessionStorage.removeItem('pxgl_reset_email');
            localStorage.removeItem('pxgl_last_email');
          } catch (e) {}
        });
      });
    }).catch(function (err) {
      console.error('[reset] 异常:', err);
      setLoading(btn, false);
      setHint('网络错误，请稍后重试', 'warn');
    });
  });

})();