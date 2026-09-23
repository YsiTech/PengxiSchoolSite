/* ===================================================================
   蓬溪格勒人民高等中学 · 找回密码（第一步：填写邮箱）
   =================================================================== */

(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!window.Auth || !Auth.client) {
    console.error('[forgot] Auth 模块未加载');
    return;
  }

  var client = Auth.client;

  /* 自动填充上次用的邮箱 */
  try {
    var saved = localStorage.getItem('pxgl_last_email');
    if (saved) {
      var el = document.getElementById('fEmail');
      if (el) el.value = saved;
    }
  } catch (e) {}

  function setHint(msg, type) {
    var el = document.getElementById('forgotHint');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'auth-hint' + (type ? ' ' + type : '');
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) { btn.disabled = true; btn.classList.add('loading'); }
    else    { btn.disabled = false; btn.classList.remove('loading'); }
  }

  var form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var email = (document.getElementById('fEmail').value || '').trim().toLowerCase();

    setHint('', '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setHint('请输入正确的邮箱地址', 'warn');
      return;
    }

    var btn = form.querySelector('.auth-submit');
    setLoading(btn, true);
    setHint('正在发送验证码…', '');

    client.auth.resetPasswordForEmail(email).then(function (res) {
      setLoading(btn, false);

      if (res.error) {
        console.error('[forgot] 发送失败:', res.error);
        var msg = String(res.error.message || '');
        var userMsg = '发送失败';
        if (/rate limit|too many/i.test(msg)) userMsg = '请求过于频繁，请稍后再试';
        else if (/invalid.*email/i.test(msg)) userMsg = '邮箱格式无效';
        else userMsg = msg;
        setHint(userMsg, 'warn');
        return;
      }

      /* 保存邮箱，供第二步使用 */
      try {
        sessionStorage.setItem('pxgl_reset_email', email);
        localStorage.setItem('pxgl_last_email', email);
      } catch (e) {}

      setHint('验证码已发送到 ' + email + '，正在跳转…', 'ok');

      setTimeout(function () {
        location.href = 'reset-password.html';
      }, 800);
    }).catch(function (err) {
      console.error('[forgot] 异常:', err);
      setLoading(btn, false);
      setHint('网络错误，请稍后重试', 'warn');
    });
  });

})();