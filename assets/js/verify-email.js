/* ===================================================================
   蓬溪格勒人民高等中学 · 邮箱验证页
   =================================================================== */

(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!window.Auth || !Auth.client) {
    console.error('[verify] Auth 模块未加载');
    return;
  }

  var client = Auth.client;

  /* 从 sessionStorage 读取刚注册的邮箱和密码 */
  var email = '';
  var password = '';
  try {
    email = sessionStorage.getItem('pxgl_pending_email') || '';
    password = sessionStorage.getItem('pxgl_pending_password') || '';
  } catch (e) {}

  if (!email) {
    console.warn('[verify] 没有待验证邮箱，跳回注册页');
    location.replace('index.html');
    return;
  }

  var displayEmail = document.getElementById('displayEmail');
  if (displayEmail) displayEmail.textContent = email;

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

  /* ============================================================
     提交验证码
     ============================================================ */
  var form = document.getElementById('verifyForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var token = (document.getElementById('vToken').value || '').trim();
      setHint('', '');

      if (!/^\d{6}$/.test(token)) {
        setHint('验证码是 6 位数字', 'warn');
        return;
      }

      var btn = form.querySelector('.auth-submit');
      setLoading(btn, true);
      setHint('正在验证…', '');

      /* 1. 验证注册 OTP */
      client.auth.verifyOtp({
        email: email,
        token: token,
        type: 'signup'
      }).then(function (res) {
        if (res.error) {
          console.error('[verify] verifyOtp 失败:', res.error);
          var msg = String(res.error.message || '');
          var userMsg = '验证失败';
          if (/expired/i.test(msg)) userMsg = '验证码已过期，请重新发送';
          else if (/invalid|token/i.test(msg)) userMsg = '验证码不正确';
          else if (/rate limit/i.test(msg)) userMsg = '请求过于频繁，请稍后再试';
          else userMsg = msg;
          setHint(userMsg, 'warn');
          setLoading(btn, false);
          return;
        }

        /* 2. 验证成功，自动登录 */
        setHint('验证成功，正在登录…', 'ok');

        return client.auth.signInWithPassword({
          email: email,
          password: password
        }).then(function (signRes) {
          setLoading(btn, false);

          if (signRes.error) {
            /* 登录失败（密码可能已丢失），回登录页让用户手动登录 */
            console.warn('[verify] 自动登录失败:', signRes.error);
            try {
              sessionStorage.removeItem('pxgl_pending_email');
              sessionStorage.removeItem('pxgl_pending_password');
            } catch (e) {}
            setHint('邮箱验证成功！请返回登录页使用你的密码登录', 'ok');
            setTimeout(function () {
              location.href = 'index.html';
            }, 2000);
            return;
          }

          /* 3. 登录成功，跳主页 */
          try {
            sessionStorage.removeItem('pxgl_pending_email');
            sessionStorage.removeItem('pxgl_pending_password');
          } catch (e) {}

          /* 更新 Auth 会话 */
          if (Auth.ready) {
            Auth.ready = Promise.resolve(signRes.data.user);
          }

          location.href = 'mainsite.html';
        });
      }).catch(function (err) {
        console.error('[verify] 异常:', err);
        setLoading(btn, false);
        setHint('网络错误，请稍后重试', 'warn');
      });
    });
  }

  /* ============================================================
     重新发送验证码
     ============================================================ */
  var resendBtn = document.getElementById('resendBtn');
  var resendText = document.getElementById('resendText');

  if (resendBtn) {
    resendBtn.addEventListener('click', function () {
      if (!email) return;

      resendBtn.disabled = true;
      var oldText = resendText ? resendText.textContent : '';
      if (resendText) resendText.textContent = '发送中…';
      setHint('正在重新发送…', '');

      /* 重新触发注册，Supabase 会再发一次 OTP */
      client.auth.resend({
        type: 'signup',
        email: email
      }).then(function (res) {
        if (res.error) {
          console.error('[verify] resend 失败:', res.error);
          var msg = res.error.message || '发送失败';
          if (/rate limit/i.test(msg)) msg = '发送过于频繁，请稍后再试';
          setHint(msg, 'warn');
          resendBtn.disabled = false;
          if (resendText) resendText.textContent = oldText;
          return;
        }

        setHint('验证码已重新发送到 ' + email, 'ok');

        /* 60 秒倒计时 */
        var countdown = 60;
        if (resendText) resendText.textContent = countdown + ' 秒后可重发';
        var t = setInterval(function () {
          countdown--;
          if (countdown <= 0) {
            clearInterval(t);
            resendBtn.disabled = false;
            if (resendText) resendText.textContent = oldText;
          } else {
            if (resendText) resendText.textContent = countdown + ' 秒后可重发';
          }
        }, 1000);
      }).catch(function (err) {
        console.error('[verify] 异常:', err);
        setHint('网络错误，请稍后重试', 'warn');
        resendBtn.disabled = false;
        if (resendText) resendText.textContent = oldText;
      });
    });
  }

})();