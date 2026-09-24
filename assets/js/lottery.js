/* ===================================================================
   蓬溪格勒人民高等中学 · 星图抽奖
   奖品网格版 · 单抽 + 五连抽
   =================================================================== */

(function (window) {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.warn('[lottery] Auth 未就绪');
    return;
  }
  if (!window.LOTTERY_CONFIG) {
    console.error('[lottery] 未找到 lottery-prizes.js 配置');
    return;
  }

  var client = Auth.client;
  var CFG = window.LOTTERY_CONFIG;
  var PRIZES = CFG.prizes.slice();
  var COST = CFG.cost;
  var COST5 = COST * 5;

  var $ = function (id) { return document.getElementById(id); };

  var prizesGrid   = $('prizesGrid');
  var prizesCount  = $('prizesCount');
  var drawBtn      = $('drawBtn');
  var draw5Btn     = $('draw5Btn');
  var balanceEl    = $('balanceAmount');
  var costLabel    = $('costLabel');
  var cost5Label   = $('cost5Label');
  var costAmount   = $('costAmount');
  var todayCount   = $('todayCount');
  var recordList   = $('recordList');

  /* 单抽弹窗 */
  var resultModal  = $('resultModal');
  var resultIcon   = $('resultIcon');
  var resultTitle  = $('resultTitle');
  var resultPrize  = $('resultPrize');
  var resultBalance= $('resultBalance');
  var resultOkBtn  = $('resultOkBtn');

  /* 五连抽弹窗 */
  var result5Modal   = $('result5Modal');
  var result5Grid    = $('result5Grid');
  var result5Balance = $('result5Balance');
  var result5OkBtn   = $('result5OkBtn');

  /* 地址弹窗 */
  var addressModal = $('addressModal');
  var giftPrizeName= $('giftPrizeName');
  var addressForm  = $('addressForm');
  var addrSubmit   = $('addrSubmit');
  var addrLater    = $('addrLater');

  var currentRecordId = null;
  var currentPrizeName = '';
  var pendingGiftRecords = [];  /* 待填地址的礼品记录 */
  var isDrawing = false;

  if (costLabel)  costLabel.textContent  = COST;
  if (cost5Label) cost5Label.textContent = COST5;
  if (costAmount) costAmount.textContent = COST;

  /* ============================================================
     稀有度
     ============================================================ */
  function rarityOf(weight) {
    if (weight >= 20) return { label: '常见', cls: 'common' };
    if (weight >= 10) return { label: '稀有', cls: 'rare' };
    if (weight >= 5)  return { label: '珍贵', cls: 'epic' };
    return { label: '极稀有', cls: 'legendary' };
  }

  function iconFor(p) {
    if (p.type === 'gift') return '🎁';
    if (p.type === 'none') return '💫';
    if (p.reward >= 500) return '💰';
    if (p.reward >= 200) return '💎';
    if (p.reward >= 100) return '🏆';
    if (p.reward >= 50)  return '🎖';
    return '⭐';
  }

  /* ============================================================
     渲染奖品网格
     ============================================================ */
  function renderPrizes() {
    if (!prizesGrid) return;
    if (prizesCount) prizesCount.textContent = '共 ' + PRIZES.length + ' 种奖品';

    var html = '';
    PRIZES.forEach(function (p) {
      var r = rarityOf(p.weight || 0);
      html += '<div class="prize-card ' + r.cls + '" data-prize-id="' + p.id + '">' +
                '<div class="pc-icon">' + iconFor(p) + '</div>' +
                '<div class="pc-name">' + escHtml(p.name) + '</div>' +
                '<span class="pc-tag">' + r.label + '</span>' +
              '</div>';
    });
    prizesGrid.innerHTML = html;
  }

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  /* ============================================================
     权重抽奖
     ============================================================ */
  function pickPrize() {
    var total = 0;
    PRIZES.forEach(function (p) { total += Math.max(0, p.weight || 0); });
    if (total <= 0) return PRIZES[0];
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < PRIZES.length; i++) {
      acc += Math.max(0, PRIZES[i].weight || 0);
      if (r < acc) return PRIZES[i];
    }
    return PRIZES[PRIZES.length - 1];
  }

  /* ============================================================
     单抽：网格扫描动画
     ============================================================ */
  function playGridAnimation(targetPrize, done) {
    var cells = prizesGrid.querySelectorAll('.prize-card');
    if (!cells.length) { done && done(); return; }

    var targetEl = null;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].getAttribute('data-prize-id') === targetPrize.id) {
        targetEl = cells[i]; break;
      }
    }
    if (!targetEl) targetEl = cells[0];

    var total = cells.length;
    var stepCount = 32 + Math.floor(Math.random() * 10);
    var steps = [];
    for (var s = 0; s < stepCount - 1; s++) {
      steps.push(cells[Math.floor(Math.random() * total)]);
    }
    steps.push(targetEl);

    var idx = 0;

    function run() {
      if (idx >= steps.length) {
        cells.forEach(function (c) { c.classList.remove('active'); });
        targetEl.classList.add('active', 'win');

        setTimeout(function () {
          targetEl.classList.remove('active');
          setTimeout(function () {
            cells.forEach(function (c) { c.classList.remove('win'); });
          }, 1600);
          done && done();
        }, 700);
        return;
      }
      cells.forEach(function (c) { c.classList.remove('active'); });
      steps[idx].classList.add('active');

      var p = idx / steps.length;
      var wait = 45 + Math.pow(p, 2.6) * 340;
      idx++;
      setTimeout(run, wait);
    }

    run();
  }

  /* ============================================================
     五连抽：快速扫描 5 个目标，同时高亮
     ============================================================ */
  function playGridAnimation5(targetPrizes, done) {
    var cells = prizesGrid.querySelectorAll('.prize-card');
    if (!cells.length) { done && done(); return; }

    /* 找到 5 个目标 DOM */
    var targetEls = [];
    targetPrizes.forEach(function (p) {
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].getAttribute('data-prize-id') === p.id) {
          targetEls.push(cells[i]); return;
        }
      }
    });
    if (!targetEls.length) { done && done(); return; }

    var total = cells.length;

    /* 快速扫描约 1.2 秒 */
    var scanSteps = 24;
    var idx = 0;

    function scan() {
      if (idx >= scanSteps) {
        /* 扫描结束，依次高亮 5 个目标 */
        cells.forEach(function (c) { c.classList.remove('active'); });
        highlightOneByOne();
        return;
      }
      cells.forEach(function (c) { c.classList.remove('active'); });
      cells[Math.floor(Math.random() * total)].classList.add('active');

      var p = idx / scanSteps;
      var wait = 40 + Math.pow(p, 3) * 180;
      idx++;
      setTimeout(scan, wait);
    }

    function highlightOneByOne() {
      var i = 0;
      function step() {
        if (i >= targetEls.length) {
          /* 全部高亮 win 态 */
          cells.forEach(function (c) { c.classList.remove('active'); });
          targetEls.forEach(function (el, k) {
            setTimeout(function () {
              el.classList.add('win');
            }, k * 80);
          });

          setTimeout(function () {
            targetEls.forEach(function (el) { el.classList.remove('win'); });
            done && done();
          }, 1600);
          return;
        }

        targetEls[i].classList.add('active');
        setTimeout(function () {
          targetEls[i].classList.remove('active');
          i++;
          step();
        }, 140);
      }
      step();
    }

    scan();
  }

  /* ============================================================
     余额
     ============================================================ */
  function refreshBalance() {
    if (!window.Wallet) return Promise.resolve();
    return Wallet.getBalance().then(function (b) {
      if (balanceEl) balanceEl.textContent = (b === null ? '—' : b);
      return b;
    });
  }

  /* ============================================================
     今日抽奖次数
     ============================================================ */
  function refreshTodayCount() {
    var user = Auth.getCurrentUser();
    if (!user || user.isGuest) {
      if (todayCount) todayCount.textContent = '—';
      return Promise.resolve();
    }
    var startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return client
      .from('lottery_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDay.toISOString())
      .then(function (res) {
        var n = (res && res.count) || 0;
        if (todayCount) todayCount.textContent = n + ' 次';
      });
  }

  /* ============================================================
     抽奖记录
     ============================================================ */
  function refreshRecords() {
    var user = Auth.getCurrentUser();
    if (!user || user.isGuest) {
      recordList.innerHTML = '<div class="record-empty">请使用正式账号登录</div>';
      return Promise.resolve();
    }
    return client
      .from('lottery_records')
      .select('id, prize_id, prize_name, prize_type, reward, cost, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(function (res) {
        if (res.error) {
          recordList.innerHTML = '<div class="record-empty">读取记录失败</div>';
          return;
        }
        var list = res.data || [];
        if (!list.length) {
          recordList.innerHTML = '<div class="record-empty">还没有抽奖记录，快来试试手气</div>';
          return;
        }
        var html = '';
        list.forEach(function (r) {
          var time = fmtTime(r.created_at);
          var cls = r.prize_type === 'money' ? 'win' :
                    r.prize_type === 'gift'  ? 'gift' : 'none';
          var rewardText = r.prize_type === 'money'
            ? '+' + r.reward
            : (r.prize_type === 'gift' ? '礼品' : '—');
          html += '<div class="record-item ' + cls + '">' +
                    '<span class="ri-time">' + time + '</span>' +
                    '<span class="ri-name">' + escHtml(r.prize_name) + '</span>' +
                    '<span class="ri-reward">' + rewardText + '</span>' +
                  '</div>';
        });
        recordList.innerHTML = html;
      });
  }

  function fmtTime(s) {
    if (!s) return '';
    var d = new Date(s);
    function p(n) { return n < 10 ? '0' + n : n; }
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ============================================================
     调用 RPC 抽一次
     ============================================================ */
  function rpcDraw(prize) {
    return client.rpc('do_lottery', {
      p_cost: COST,
      p_reward: prize.type === 'money' ? prize.reward : 0,
      p_prize_id: prize.id,
      p_prize_name: prize.name,
      p_prize_type: prize.type
    }).then(function (res) {
      if (res.error) {
        console.error('[lottery] RPC 失败:', res.error);
        return { ok: false, msg: res.error.message || '抽奖失败' };
      }
      return res.data || { ok: false, msg: '抽奖失败' };
    });
  }

  /* ============================================================
     单抽
     ============================================================ */
  function doDraw() {
    if (isDrawing) return;

    var user = Auth.getCurrentUser();
    if (!user) { toast('请先登录'); return; }
    if (user.isGuest) { toast('游客无法抽奖，请使用正式账号'); return; }

    isDrawing = true;
    drawBtn.disabled = true;
    draw5Btn.disabled = true;
    drawBtn.querySelector('.lb-text').textContent = '抽奖中…';

    refreshBalance().then(function (b) {
      if (b === null || b < COST) {
        toast('余额不足，还差 ' + (COST - (b || 0)) + ' 亚斯卢布');
        resetButtons();
        return;
      }

      var prize = pickPrize();

      playGridAnimation(prize, function () {
        rpcDraw(prize).then(function (data) {
          resetButtons();

          if (!data.ok) {
            toast(data.msg || '抽奖失败');
            refreshBalance();
            return;
          }

          if (balanceEl) balanceEl.textContent = data.balance;
          refreshTodayCount();
          refreshRecords();
          if (window.Wallet && Wallet.mountNavBalance) Wallet.mountNavBalance();

          showResult(prize, data);
        });
      });
    });
  }

  /* ============================================================
     五连抽
     ============================================================ */
  function doDraw5() {
    if (isDrawing) return;

    var user = Auth.getCurrentUser();
    if (!user) { toast('请先登录'); return; }
    if (user.isGuest) { toast('游客无法抽奖，请使用正式账号'); return; }

    isDrawing = true;
    drawBtn.disabled = true;
    draw5Btn.disabled = true;
    draw5Btn.querySelector('.lb-text').textContent = '抽奖中…';

    refreshBalance().then(function (b) {
      if (b === null || b < COST5) {
        toast('余额不足，还差 ' + (COST5 - (b || 0)) + ' 亚斯卢布');
        resetButtons();
        return;
      }

      /* 前端一次性抽 5 个 */
      var prizes = [];
      for (var i = 0; i < 5; i++) prizes.push(pickPrize());

      playGridAnimation5(prizes, function () {
        /* 依次调用 5 次 RPC */
        var results = [];
        var chain = Promise.resolve();

        prizes.forEach(function (prize, idx) {
          chain = chain.then(function () {
            return rpcDraw(prize).then(function (data) {
              results.push({ prize: prize, data: data });
            });
          });
        });

        chain.then(function () {
          resetButtons();

          /* 检查是否有失败 */
          var failed = results.filter(function (r) { return !r.data.ok; });
          if (failed.length) {
            console.warn('[lottery] 五连抽部分失败:', failed);
            /* 只要有成功的就展示，失败的跳过 */
            var successResults = results.filter(function (r) { return r.data.ok; });
            if (!successResults.length) {
              toast(failed[0].data.msg || '抽奖失败');
              refreshBalance();
              return;
            }
          }

          /* 取最后一个成功的余额 */
          var lastSuccess = results.filter(function (r) { return r.data.ok; }).pop();
          if (lastSuccess && balanceEl) balanceEl.textContent = lastSuccess.data.balance;

          refreshTodayCount();
          refreshRecords();
          if (window.Wallet && Wallet.mountNavBalance) Wallet.mountNavBalance();

          showResult5(results);
        });
      });
    });
  }

  function resetButtons() {
    isDrawing = false;
    drawBtn.disabled = false;
    draw5Btn.disabled = false;
    drawBtn.querySelector('.lb-text').textContent = '单抽';
    draw5Btn.querySelector('.lb-text').textContent = '五连抽';
  }

  /* ============================================================
     单抽结果弹窗
     ============================================================ */
  function showResult(prize, data) {
    if (prize.type === 'money') {
      resultIcon.textContent = '🎉';
      resultTitle.textContent = '恭喜中奖';
      resultPrize.textContent = prize.name;
      resultBalance.textContent = '当前余额：₽ ' + data.balance;
    } else if (prize.type === 'gift') {
      resultIcon.textContent = '🎁';
      resultTitle.textContent = '恭喜获得实物奖品';
      resultPrize.textContent = prize.name;
      resultBalance.textContent = '请填写收货信息';
    } else {
      resultIcon.textContent = '💫';
      resultTitle.textContent = '谢谢参与';
      resultPrize.textContent = prize.name;
      resultBalance.textContent = '当前余额：₽ ' + data.balance;
    }

    currentRecordId = data.record_id;
    currentPrizeName = prize.name;

    if (resultModal) resultModal.classList.remove('hide');
  }

  if (resultOkBtn) {
    resultOkBtn.addEventListener('click', function () {
      if (resultModal) resultModal.classList.add('hide');

      var prize = PRIZES.filter(function (p) { return p.name === currentPrizeName; })[0];
      if (prize && prize.type === 'gift') {
        if (giftPrizeName) giftPrizeName.textContent = prize.name;
        if (addressModal) addressModal.classList.remove('hide');
      }
    });
  }

  /* ============================================================
     五连抽结果弹窗
     ============================================================ */
  function showResult5(results) {
    if (!result5Grid) return;

    /* 过滤成功的 */
    var success = results.filter(function (r) { return r.data.ok; });

    /* 统计获得亚斯卢布总数 */
    var totalReward = 0;
    var giftCount = 0;
    success.forEach(function (r) {
      if (r.prize.type === 'money') totalReward += r.prize.reward || 0;
      if (r.prize.type === 'gift')  giftCount++;
    });

    var summary = '获得 <b>₽ ' + totalReward + '</b> 亚斯卢布';
    if (giftCount > 0) summary += ' · <b>' + giftCount + '</b> 个实物礼品待填写地址';
    result5Balance.innerHTML = summary;

    /* 渲染 5 张卡片 */
    var html = '';
    success.forEach(function (r, idx) {
      var p = r.prize;
      var cls = p.type === 'money' ? 'money' :
                p.type === 'gift'  ? 'gift' : 'none';
      var rewardText = p.type === 'money'
        ? '+' + p.reward
        : (p.type === 'gift' ? '待填地址' : '—');

      html += '<div class="result5-card ' + cls + '">' +
                '<div class="r5-icon">' + iconFor(p) + '</div>' +
                '<div class="r5-name">' + escHtml(p.name) + '</div>' +
                '<div class="r5-reward">' + rewardText + '</div>' +
              '</div>';
    });
    result5Grid.innerHTML = html;

    /* 保存待填地址的礼品记录 */
    pendingGiftRecords = success
      .filter(function (r) { return r.prize.type === 'gift'; })
      .map(function (r) {
        return { recordId: r.data.record_id, prizeName: r.prize.name };
      });

    if (result5Modal) result5Modal.classList.remove('hide');
  }

  if (result5OkBtn) {
    result5OkBtn.addEventListener('click', function () {
      if (result5Modal) result5Modal.classList.add('hide');

      /* 如果有礼品待填地址，逐个弹 */
      if (pendingGiftRecords.length > 0) {
        var first = pendingGiftRecords.shift();
        currentRecordId = first.recordId;
        currentPrizeName = first.prizeName;
        if (giftPrizeName) giftPrizeName.textContent = first.prizeName;
        if (addressModal) addressModal.classList.remove('hide');
      }
    });
  }

  /* ============================================================
     地址表单
     ============================================================ */
  if (addrLater) {
    addrLater.addEventListener('click', function () {
      if (addressModal) addressModal.classList.add('hide');
      toast('可稍后联系管理员补填地址');
    });
  }

  if (addressForm) {
    addressForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var name    = ($('giftName')    || {}).value || '';
      var phone   = ($('giftPhone')   || {}).value || '';
      var address = ($('giftAddress') || {}).value || '';
      var remark  = ($('giftRemark')  || {}).value || '';

      if (!name.trim())    { toast('请填写收货人姓名'); return; }
      if (!phone.trim())   { toast('请填写联系电话'); return; }
      if (!address.trim()) { toast('请填写收货地址'); return; }
      if (!currentRecordId){ toast('订单来源丢失'); return; }

      addrSubmit.disabled = true;
      addrSubmit.textContent = '提交中…';

      client.rpc('submit_gift_order', {
        p_record_id: currentRecordId,
        p_prize_name: currentPrizeName,
        p_receiver_name: name.trim(),
        p_receiver_phone: phone.trim(),
        p_receiver_address: address.trim(),
        p_remark: remark.trim() || null
      }).then(function (res) {
        addrSubmit.disabled = false;
        addrSubmit.textContent = '提交收货信息';

        if (res.error) {
          console.error('[lottery] 提交订单失败:', res.error);
          toast('提交失败：' + (res.error.message || '未知错误'));
          return;
        }

        var data = res.data || {};
        if (!data.ok) {
          toast(data.msg || '提交失败');
          return;
        }

        if (addressModal) addressModal.classList.add('hide');
        addressForm.reset();
        toast('收货信息已提交，我们会尽快寄出');

        /* 如果还有礼品待填，继续弹下一个 */
        if (pendingGiftRecords.length > 0) {
          setTimeout(function () {
            var next = pendingGiftRecords.shift();
            currentRecordId = next.recordId;
            currentPrizeName = next.prizeName;
            if (giftPrizeName) giftPrizeName.textContent = next.prizeName;
            if (addressModal) addressModal.classList.remove('hide');
          }, 400);
        }
      });
    });
  }

  /* ============================================================
     绑定按钮
     ============================================================ */
  if (drawBtn)  drawBtn.addEventListener('click', doDraw);
  if (draw5Btn) draw5Btn.addEventListener('click', doDraw5);

  function toast(msg) {
    if (window.siteToast) { window.siteToast(msg); return; }
    console.log('[lottery]', msg);
  }

  /* ============================================================
     初始化
     ============================================================ */
  renderPrizes();

  if (Auth.ready && Auth.ready.then) {
    Auth.ready.then(function () {
      setTimeout(function () {
        refreshBalance();
        refreshTodayCount();
        refreshRecords();
      }, 300);
    });
  }

  console.log('%c [Lottery] 抽奖模块已加载（单抽 + 五连抽） ', 'background:#d4af37;color:#241b08;padding:2px 8px;border-radius:3px;font-weight:700');
})(window);