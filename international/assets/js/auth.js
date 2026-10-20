/* ===================================================================
   IECP · 登录 / 注册 / 找回密码 逻辑 (OTP 验证码版)
   =================================================================== */

(function (w) {
  'use strict';
  var I = w.IECP;
  if (!I) return;

  /* ============================================================
     登录页
     ============================================================ */
  w.IECP.initLogin = function () {
    var form = I.$('#loginForm');
    if (!form) return;

    I.client.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        var redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
        location.replace(redirect);
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = I.$('#loginEmail').value.trim();
      var pass  = I.$('#loginPassword').value;
      var btn   = form.querySelector('.btn-submit');
      var hint  = I.$('#loginHint');

      if (!email || !pass) { hint.className='auth-hint warn'; hint.textContent='请填写邮箱和密码'; return; }

      btn.disabled = true;
      hint.className = 'auth-hint';
      hint.textContent = '登录中…';

      I.client.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
        btn.disabled = false;
        if (res.error) {
          var msg = res.error.message || '登录失败';
          if (/invalid/i.test(msg)) msg = '邮箱或密码错误';
          hint.className = 'auth-hint warn';
          hint.textContent = msg;
          return;
        }
        var redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
        location.replace(redirect);
      }).catch(function (err) {
        btn.disabled = false;
        hint.className = 'auth-hint warn';
        hint.textContent = '网络错误：' + err.message;
      });
    });
  };

  /* ============================================================
     注册页 (OTP 版)
     ============================================================ */
  w.IECP.initRegister = function () {
    var form = I.$('#registerForm');
    if (!form) return;

    var flagFile = null, emblemFile = null;
    var sendCodeBtn = I.$('#sendCodeBtn');
    var countdown = 0;

    // 文件预览
    I.$$('.upload-box').forEach(function (box) {
      var input = box.querySelector('input[type=file]');
      if (!input) return;
      box.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) return;
        if (!/^image\//.test(f.type)) { I.toast('请选择图片文件', 'error'); return; }
        if (f.size > 2 * 1024 * 1024) { I.toast('图片请控制在 2MB 以内', 'error'); return; }

        var reader = new FileReader();
        reader.onload = function (e) {
          box.innerHTML = '';
          var img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'preview';
          box.appendChild(img);
          box.appendChild(input);
          if (input.id === 'flagFile') flagFile = f;
          if (input.id === 'emblemFile') emblemFile = f;
        };
        reader.readAsDataURL(f);
      });
    });

    // 发送验证码
    sendCodeBtn.addEventListener('click', function () {
      var email = I.$('#regEmail').value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        I.toast('请输入正确的邮箱', 'error'); return;
      }
      
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = '发送中…';

      // 使用 signInWithOtp 发送验证码
      I.client.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
      }).then(function (res) {
        if (res.error) {
          I.toast('发送失败: ' + res.error.message, 'error');
          sendCodeBtn.disabled = false;
          sendCodeBtn.textContent = '获取验证码';
          return;
        }
        I.toast('验证码已发送，请检查邮箱', 'success');
        // 倒计时 60 秒
        countdown = 60;
        sendCodeBtn.textContent = countdown + 's';
        var timer = setInterval(function () {
          countdown--;
          sendCodeBtn.textContent = countdown + 's';
          if (countdown <= 0) {
            clearInterval(timer);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '获取验证码';
          }
        }, 1000);
      });
    });

    // 提交注册
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hint = I.$('#registerHint');
      var btn  = I.$('#regSubmitBtn');

      var email    = I.$('#regEmail').value.trim();
      var code     = I.$('#regCode').value.trim();
      var pass     = I.$('#regPassword').value;
      var pass2    = I.$('#regPassword2').value;
      var username = I.$('#regUsername').value.trim();
      var social   = I.$('#regSocial').value.trim();
      var capital  = I.$('#regCapital').value.trim();
      var lang     = I.$('#regLanguage').value.trim();

      function fail(msg) { hint.className = 'auth-hint warn'; hint.textContent = msg; btn.disabled = false; }

      if (!code) return fail('请输入验证码');
      if (!pass || pass.length < 6) return fail('密码至少 6 位');
      if (pass !== pass2) return fail('两次输入的密码不一致');
      if (!username || username.length < 2) return fail('国家名至少 2 个字');
      if (!social || !capital || !lang) return fail('请填写完整国家信息');
      if (!flagFile) return fail('请上传国旗');
      if (!emblemFile) return fail('请上传国徽');

      btn.disabled = true;
      hint.className = 'auth-hint';
      hint.textContent = '正在验证验证码…';

      // 1. 校验 OTP
      I.client.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email'
      }).then(function (res) {
        if (res.error) return fail('验证码错误或已过期');
        
        hint.textContent = '验证成功，正在设置密码…';
        
        // 2. 设置密码
        return I.client.auth.updateUser({ password: pass });
      }).then(function (res) {
        if (res.error) return fail('密码设置失败：' + res.error.message);
        
        hint.textContent = '正在上传国旗与国徽…';
        var userId = res.data.user.id;

        // 3. 上传文件
        return uploadFile('flags', userId, flagFile).then(function (flagUrl) {
          return uploadFile('emblems', userId, emblemFile).then(function (emblemUrl) {
            hint.textContent = '正在建立国家档案…';
            // 4. 写入数据库
            return I.client.from('profiles').insert({
              id: userId,
              username: username,
              social_system: social,
              capital: capital,
              official_language: lang,
              flag_url: flagUrl,
              emblem_url: emblemUrl
            });
          });
        });
      }).then(function (r) {
        if (r && r.error) {
          // 如果插入失败，因为已经登录了，最好登出
          I.client.auth.signOut();
          return fail('档案创建失败：' + r.error.message);
        }
        hint.className = 'auth-hint ok';
        hint.textContent = '注册成功！正在跳转…';
        I.toast('欢迎加入 IECP', 'success');
        setTimeout(function () { location.href = 'index.html'; }, 900);
      }).catch(function (err) {
        console.error(err);
        fail('网络错误：' + err.message);
      });
    });

    function uploadFile(bucket, userId, file) {
      var ext = (file.name.split('.').pop() || 'png').toLowerCase();
      var path = userId + '/' + Date.now() + '.' + ext;
      return I.client.storage.from(bucket).upload(path, file, { upsert: true })
        .then(function (r) {
          if (r.error) throw r.error;
          return I.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        });
    }
  };

  /* ============================================================
     找回密码页 (OTP 版)
     ============================================================ */
  w.IECP.initForgot = function () {
    var form = I.$('#forgotForm');
    if (!form) return;

    var sendCodeBtn = I.$('#sendForgotCodeBtn');
    var countdown = 0;

    // 发送验证码
    sendCodeBtn.addEventListener('click', function () {
      var email = I.$('#forgotEmail').value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        I.toast('请输入正确的邮箱', 'error'); return;
      }
      
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = '发送中…';

      // shouldCreateUser: false 表示如果邮箱不存在则报错
      I.client.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: false }
      }).then(function (res) {
        if (res.error) {
          I.toast('发送失败，请确认邮箱是否已注册', 'error');
          sendCodeBtn.disabled = false;
          sendCodeBtn.textContent = '获取验证码';
          return;
        }
        I.toast('验证码已发送，请检查邮箱', 'success');
        countdown = 60;
        sendCodeBtn.textContent = countdown + 's';
        var timer = setInterval(function () {
          countdown--;
          sendCodeBtn.textContent = countdown + 's';
          if (countdown <= 0) {
            clearInterval(timer);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '获取验证码';
          }
        }, 1000);
      });
    });

    // 提交新密码
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hint = I.$('#forgotHint');
      var btn = I.$('#forgotSubmitBtn');

      var email = I.$('#forgotEmail').value.trim();
      var code  = I.$('#forgotCode').value.trim();
      var p1    = I.$('#newPassword').value;
      var p2    = I.$('#newPassword2').value;

      if (!code) return (hint.className='auth-hint warn', hint.textContent='请输入验证码');
      if (!p1 || p1.length < 6) return (hint.className='auth-hint warn', hint.textContent='新密码至少 6 位');
      if (p1 !== p2) return (hint.className='auth-hint warn', hint.textContent='两次输入不一致');

      btn.disabled = true;
      hint.className = 'auth-hint';
      hint.textContent = '正在校验验证码…';

      // 1. 校验 OTP 以恢复会话
      I.client.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email'
      }).then(function (res) {
        if (res.error) {
          btn.disabled = false;
          hint.className = 'auth-hint warn';
          hint.textContent = '验证码错误或已过期';
          return;
        }

        hint.textContent = '验证成功，正在重置密码…';

        // 2. 更新密码
        return I.client.auth.updateUser({ password: p1 });
      }).then(function (res) {
        btn.disabled = false;
        if (!res || res.error) {
          hint.className = 'auth-hint warn';
          hint.textContent = '重置失败：' + (res.error ? res.error.message : '未知错误');
          return;
        }
        
        hint.className = 'auth-hint ok';
        hint.textContent = '密码重置成功！正在跳转登录页…';
        I.toast('密码已更新', 'success');
        
        // 3. 重置成功后登出，让用户用新密码登录
        I.client.auth.signOut().then(function(){
          setTimeout(function () { location.href = 'login.html'; }, 1000);
        });
      }).catch(function(err){
        btn.disabled = false;
        hint.className = 'auth-hint warn';
        hint.textContent = '网络错误：' + err.message;
      });
    });
  };

})(window);