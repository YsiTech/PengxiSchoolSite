/* ===================================================================
   IECP · 登录 / 注册 / 找回密码 逻辑 (无感注册 + OTP 登录版)
   =================================================================== */

(function (w) {
  'use strict';
  var I = w.IECP;
  if (!I) return;

  // 通用：发送邮箱验证码
  w.IECP.sendOtpEmail = function (email) {
    return I.client.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: false } // 不允许未注册用户直接发验证码
    });
  };

  w.IECP.initAuthForms = function () {
    /* ================= 1. 密码登录 ================= */
    var formPwdLogin = I.$('#formPwdLogin');
    if (formPwdLogin) {
      formPwdLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = I.$('#loginEmail').value.trim();
        var pass = I.$('#loginPassword').value;
        var hint = I.$('#hintPwdLogin');
        var btn = formPwdLogin.querySelector('button');

        btn.disabled = true; hint.innerText = '';
        I.client.auth.signInWithPassword({ email, password: pass }).then(function (res) {
          btn.disabled = false;
          if (res.error) { hint.innerText = '邮箱或密码错误'; return; }
          location.href = 'index.html';
        });
      });
    }

    /* ================= 2. 验证码登录 ================= */
    var formOtpLogin = I.$('#formOtpLogin');
    if (formOtpLogin) {
      formOtpLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = I.$('#otpLoginEmail').value.trim();
        var code = I.$('#otpLoginCode').value.trim();
        var hint = I.$('#hintOtpLogin');
        var btn = formOtpLogin.querySelector('button[type="submit"]');

        btn.disabled = true; hint.innerText = '';
        I.client.auth.verifyOtp({ email, token: code, type: 'email' }).then(function (res) {
          btn.disabled = false;
          if (res.error) { hint.innerText = '验证码错误或已过期'; return; }
          location.href = 'index.html';
        });
      });
    }

    /* ================= 3. 注册（无验证码） ================= */
    var formRegister = I.$('#formRegister');
    if (formRegister) {
      var regFlagFile = null, regEmblemFile = null;

      // 监听文件上传预览
      I.$('#regFlagFile').addEventListener('change', function() {
        regFlagFile = this.files[0];
        if (regFlagFile) this.parentNode.classList.add('has-file');
      });
      I.$('#regEmblemFile').addEventListener('change', function() {
        regEmblemFile = this.files[0];
        if (regEmblemFile) this.parentNode.classList.add('has-file');
      });

      formRegister.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = I.$('#regEmail').value.trim();
        var pass = I.$('#regPassword').value;
        var username = I.$('#regUsername').value.trim();
        var social = I.$('#regSocial').value.trim();
        var capital = I.$('#regCapital').value.trim();
        var lang = I.$('#regLanguage').value.trim();
        var hint = I.$('#hintRegister');
        var btn = I.$('#btnRegister');

        if (!regFlagFile || !regEmblemFile) { hint.innerText = '请上传国旗和国徽'; return; }
        if (pass.length < 6) { hint.innerText = '密码至少 6 位'; return; }

        btn.disabled = true; hint.innerText = '正在创建账号...';

        // 1. 直接注册
        I.client.auth.signUp({ email, password: pass }).then(function (res) {
          if (res.error) throw new Error(res.error.message);
          if (!res.data.user) throw new Error('注册失败');
          var userId = res.data.user.id;

          hint.innerText = '正在上传国旗和国徽...';

          // 2. 上传图片
          function upload(bucket, file, field) {
            var ext = (file.name.split('.').pop() || 'png').toLowerCase();
            var path = userId + '/' + field + '-' + Date.now() + '.' + ext;
            return I.client.storage.from(bucket).upload(path, file).then(function(r){
              if (r.error) throw new Error('上传失败');
              return I.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            });
          }

          return upload('flags', regFlagFile, 'flag').then(function(flagUrl) {
            return upload('emblems', regEmblemFile, 'emblem').then(function(emblemUrl) {
              hint.innerText = '正在建立国家档案...';
              // 3. 写入数据库
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
          if (r && r.error) throw new Error(r.error.message);
          hint.style.color = 'var(--green)';
          hint.innerText = '注册成功！正在跳转...';
          setTimeout(function () { location.href = 'index.html'; }, 1000);
        }).catch(function (err) {
          btn.disabled = false;
          hint.innerText = err.message || '网络异常';
        });
      });
    }

    /* ================= 4. 找回密码 ================= */
    var formForgot = I.$('#formForgot');
    if (formForgot) {
      formForgot.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = I.$('#forgotEmail').value.trim();
        var code = I.$('#forgotCode').value.trim();
        var newPass = I.$('#forgotPassword').value;
        var hint = I.$('#hintForgot');
        var btn = formForgot.querySelector('button[type="submit"]');

        if (newPass.length < 6) { hint.innerText = '新密码至少 6 位'; return; }

        btn.disabled = true; hint.innerText = '正在验证...';

        // 1. 验证 OTP 获取临时登录状态
        I.client.auth.verifyOtp({ email, token: code, type: 'email' }).then(function (res) {
          if (res.error) throw new Error('验证码错误或已过期');
          hint.innerText = '正在重置密码...';
          // 2. 更新密码
          return I.client.auth.updateUser({ password: newPass });
        }).then(function (res) {
          if (res.error) throw new Error(res.error.message);
          hint.style.color = 'var(--green)';
          hint.innerText = '密码重置成功！正在跳转登录...';
          // 3. 退出当前状态，让用户重新登录
          I.client.auth.signOut().then(function(){
            setTimeout(function () { location.reload(); }, 1000);
          });
        }).catch(function (err) {
          btn.disabled = false;
          hint.innerText = err.message;
        });
      });
    }
  };

})(window);