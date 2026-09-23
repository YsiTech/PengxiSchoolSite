/* ===================================================================
   管理后台 · 逻辑
   独立运行，不依赖主站 auth.js
   =================================================================== */

(function (window) {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ============================================================
     配置存储
     ============================================================ */
  var CFG_KEY = 'pxgl_admin_cfg';

  function loadCfg() {
    try {
      var raw = localStorage.getItem(CFG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveCfg(cfg) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  var cfg = loadCfg();
  var client = null;

  /* ============================================================
     Toast
     ============================================================ */
  var toastTimer = null;
  function toast(msg, duration) {
    var el = $('#adminToast');
    if (!el) return;
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, duration || 2400);
  }

  /* ============================================================
     连接状态
     ============================================================ */
  function setConnStatus(text, cls) {
    var el = $('#connStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'ah-status' + (cls ? ' ' + cls : '');
  }

  /* ============================================================
     初始化 Supabase
     ============================================================ */
  function initClient() {
    if (!cfg.url || !cfg.key) {
      setConnStatus('未连接', '');
      return false;
    }
    if (!window.supabase || !window.supabase.createClient) {
      setConnStatus('SDK 未加载', 'err');
      return false;
    }

    try {
      // 如果有配置代理，这里可以封装 fetch，但 Supabase 的 createClient 支持直接传入 URL
      // 为了适配 Cloudflare Worker 代理，通常直接用原 URL，或者在前端做请求拦截
      // 这里保持原样直连，如果被墙用户自己在浏览器挂代理
      client = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: false }
      });
      setConnStatus('已连接', 'ok');
      return true;
    } catch (e) {
      console.error('[admin] init error', e);
      setConnStatus('连接失败', 'err');
      return false;
    }
  }

  /* ============================================================
     工具函数
     ============================================================ */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtTime(s) {
    if (!s) return '—';
    var d = new Date(s);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDate(s) {
    if (!s) return '—';
    var d = new Date(s);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function downloadCSV(filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? '' : cell).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(',');
    }).join('\r\n');

    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // 记录管理员操作日志
  function logAdminAction(action, targetId, details) {
    if (!client) return;
    client.from('admin_logs').insert({
      admin_action: action,
      target_user_id: targetId || null,
      details: details || ''
    }).then(function(res) {
      if (res.error) console.warn('日志写入失败（可能是表不存在）', res.error);
    });
  }

  /* ============================================================
     Tab 切换
     ============================================================ */
  var currentTab = 'stats';

  $$('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.dataset.tab;
      currentTab = name;
      $$('.admin-tab').forEach(function (t) { t.classList.toggle('on', t === tab); });
      $$('.admin-panel').forEach(function (p) { p.classList.toggle('on', p.dataset.panel === name); });

      /* 切换时懒加载对应数据 */
      if (name === 'stats') loadStats();
      if (name === 'records') loadRecords();
      if (name === 'orders') loadOrders();
      if (name === 'users') loadUsers();
      if (name === 'wallets') loadWallets();
      if (name === 'announcements') loadAnnouncements();
      if (name === 'news') loadNews();
      if (name === 'logs') loadLogs();
    });
  });

  /* ============================================================
     设置弹窗
     ============================================================ */
  var settingsModal = $('#settingsModal');
  var cfgUrlInput = $('#cfgUrl');
  var cfgKeyInput = $('#cfgKey');
  var cfgProxyInput = $('#cfgProxy');

  function openSettings() {
    if (cfgUrlInput) cfgUrlInput.value = cfg.url || '';
    if (cfgKeyInput) cfgKeyInput.value = cfg.key || '';
    if (cfgProxyInput) cfgProxyInput.value = cfg.proxy || '';
    settingsModal.classList.remove('hide');
  }
  function closeSettings() { settingsModal.classList.add('hide'); }

  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settingsClose').addEventListener('click', closeSettings);

  $('#settingsSave').addEventListener('click', function () {
    var url = (cfgUrlInput.value || '').trim().replace(/\/+$/, '');
    var key = (cfgKeyInput.value || '').trim();
    var proxy = (cfgProxyInput.value || '').trim().replace(/\/+$/, '');

    if (!url) { toast('请填写 Supabase URL'); return; }
    if (!key) { toast('请填写 Service Role Key'); return; }

    cfg = { url: url, key: key, proxy: proxy };
    saveCfg(cfg);

    if (initClient()) {
      toast('已保存并连接');
      closeSettings();
      loadStats();
      loadRecords();
      loadOrders();
      loadUsers();
      loadWallets();
      loadAnnouncements();
      loadNews();
      loadLogs();
    }
  });

  $('#settingsClear').addEventListener('click', function () {
    if (!confirm('清空已保存的连接信息？')) return;
    cfg = {};
    saveCfg(cfg);
    client = null;
    setConnStatus('未连接', '');
    cfgUrlInput.value = '';
    cfgKeyInput.value = '';
    cfgProxyInput.value = '';
    toast('已清空');
  });

  /* ============================================================
     1. 数据统计
     ============================================================ */
  function loadStats() {
    if (!client) return;

    // 全部使用 count 查询，避免拉取大数据量
    Promise.all([
      client.from('user_wallets').select('*', { count: 'exact', head: true }),
      client.from('lottery_records').select('*', { count: 'exact', head: true }),
      client.from('lottery_records').select('cost').eq('prize_type', 'money'),
      client.from('gift_orders').select('*', { count: 'exact', head: true }),
      client.from('checkins').select('*', { count: 'exact', head: true }),
      client.from('user_wallets').select('balance')
    ]).then(function (results) {
      var userCount = results[0].count || 0;
      var lotteryCount = results[1].count || 0;
      var moneyRecords = results[2].data || [];
      var orderCount = results[3].count || 0;
      var checkinCount = results[4].count || 0;
      var wallets = results[5].data || [];

      var totalTurnover = moneyRecords.reduce(function (sum, r) { return sum + (r.cost || 0); }, 0);
      var totalBalance = wallets.reduce(function (sum, w) { return sum + (w.balance || 0); }, 0);

      $('#statUsers').textContent = userCount;
      $('#statLottery').textContent = lotteryCount;
      $('#statTurnover').textContent = '₽ ' + totalTurnover;
      $('#statOrders').textContent = orderCount;
      $('#statCheckins').textContent = checkinCount;
      $('#statBalance').textContent = '₽ ' + totalBalance;
    }).catch(function (e) {
      console.error('加载统计数据失败', e);
      toast('统计数据加载失败，请检查表结构');
    });
  }
  $('#statsRefresh').addEventListener('click', loadStats);

  /* ============================================================
     2. 奖品管理
     ============================================================ */
  var prizes = [];
  var prizeCost = 50;

  function initPrizesFromConfig() {
    if (window.LOTTERY_CONFIG) {
      prizeCost = window.LOTTERY_CONFIG.cost || 50;
      prizes = (window.LOTTERY_CONFIG.prizes || []).map(function (p) {
        return { id: p.id, name: p.name, type: p.type, reward: p.reward || 0, weight: p.weight || 0 };
      });
    }
    if (!prizes.length) {
      prizes = [{ id: 'p' + Date.now(), name: '示例奖品', type: 'money', reward: 50, weight: 10 }];
    }
  }

  function renderPrizes() {
    var list = $('#prizeList');
    if (!list) return;

    if (!prizes.length) {
      list.innerHTML = '<div class="prize-empty">还没有奖品，点击右上角「添加奖品」开始</div>';
      updatePrizeStats(); renderPreview(); return;
    }

    var html = '';
    prizes.forEach(function (p, idx) {
      html += '<div class="prize-row" data-idx="' + idx + '">' +
        '<div class="pr-handle">⋮⋮</div>' +
        '<div class="pr-fields">' +
        '<div class="pr-field"><label>奖品名称</label><input type="text" data-field="name" value="' + escapeHtml(p.name) + '" placeholder="例如：100 亚斯卢布"></div>' +
        '<div class="pr-field"><label>类型</label><select data-field="type">' +
        '<option value="money"' + (p.type === 'money' ? ' selected' : '') + '>奖励</option>' +
        '<option value="gift"' + (p.type === 'gift' ? ' selected' : '') + '>礼品</option>' +
        '<option value="none"' + (p.type === 'none' ? ' selected' : '') + '>再接再厉</option>' +
        '</select></div>' +
        '<div class="pr-field"><label>奖励金额（仅奖励类）</label><input type="number" data-field="reward" value="' + (p.reward || 0) + '" min="0"></div>' +
        '<div class="pr-field"><label>权重（越大越易中）</label><input type="number" data-field="weight" value="' + (p.weight || 0) + '" min="0"></div>' +
        '</div>' +
        '<div class="pr-prob">中奖率<b data-prob="' + idx + '">—</b></div>' +
        '<div class="pr-actions">' +
        '<button class="btn-mini" data-act="up" type="button" title="上移">↑</button>' +
        '<button class="btn-mini" data-act="down" type="button" title="下移">↓</button>' +
        '<button class="btn-mini danger" data-act="del" type="button" title="删除">删除</button>' +
        '</div></div>';
    });

    list.innerHTML = html;
    updatePrizeStats(); renderPreview(); bindPrizeEvents();
  }

  function bindPrizeEvents() {
    var list = $('#prizeList');
    if (!list) return;

    $$('.prize-row', list).forEach(function (row) {
      var idx = parseInt(row.dataset.idx, 10);
      $$('input, select', row).forEach(function (input) {
        input.addEventListener('input', function () {
          var field = input.dataset.field;
          if (!field) return;
          var val = input.value;
          if (field === 'reward' || field === 'weight') val = parseInt(val, 10) || 0;
          prizes[idx][field] = val;
          updatePrizeStats(); renderPreview(); updateProbCells();
        });
      });
    });

    $$('[data-act]', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.prize-row');
        var idx = parseInt(row.dataset.idx, 10);
        var act = btn.dataset.act;

        if (act === 'up' && idx > 0) {
          var tmp = prizes[idx - 1]; prizes[idx - 1] = prizes[idx]; prizes[idx] = tmp;
        } else if (act === 'down' && idx < prizes.length - 1) {
          var tmp2 = prizes[idx + 1]; prizes[idx + 1] = prizes[idx]; prizes[idx] = tmp2;
        } else if (act === 'del') {
          if (!confirm('确定删除「' + prizes[idx].name + '」？')) return;
          prizes.splice(idx, 1);
        }
        renderPrizes();
      });
    });
  }

  function updatePrizeStats() {
    var total = prizes.reduce(function (s, p) { return s + Math.max(0, p.weight || 0); }, 0);
    if ($('#prizeCount')) $('#prizeCount').textContent = prizes.length;
    if ($('#prizeWeight')) $('#prizeWeight').textContent = total;
  }

  function updateProbCells() {
    var total = prizes.reduce(function (s, p) { return s + Math.max(0, p.weight || 0); }, 0);
    $$('[data-prob]').forEach(function (el) {
      var idx = parseInt(el.dataset.prob, 10);
      var w = Math.max(0, prizes[idx].weight || 0);
      el.textContent = total > 0 ? (w / total * 100).toFixed(1) + '%' : '—';
    });
  }

  function renderPreview() {
    var wrap = $('#previewBars');
    if (!wrap) return;
    var total = prizes.reduce(function (s, p) { return s + Math.max(0, p.weight || 0); }, 0);
    if (!prizes.length || total === 0) {
      wrap.innerHTML = '<div style="color:#6b6256;font-size:13px;text-align:center;padding:14px">还没有有效的奖品</div>';
      return;
    }
    var html = '';
    prizes.forEach(function (p) {
      var w = Math.max(0, p.weight || 0);
      var pct = w / total * 100;
      html += '<div class="preview-bar">' +
        '<span class="pb-name">' + escapeHtml(p.name) + '</span>' +
        '<div class="pb-track"><div class="pb-fill" style="width:' + pct.toFixed(2) + '%"></div></div>' +
        '<span class="pb-pct">' + pct.toFixed(1) + '%</span>' +
        '</div>';
    });
    wrap.innerHTML = html;
  }

  $('#prizeAddBtn').addEventListener('click', function () {
    prizes.push({ id: 'p' + Date.now() + '_' + Math.floor(Math.random() * 1000), name: '新奖品', type: 'money', reward: 50, weight: 10 });
    renderPrizes();
  });

  var prizeCostInput = $('#prizeCost');
  if (prizeCostInput) {
    prizeCostInput.value = prizeCost;
    prizeCostInput.addEventListener('input', function () { prizeCost = parseInt(prizeCostInput.value, 10) || 0; });
  }

  $('#prizeExportBtn').addEventListener('click', function () {
    var lines = [
      '/* ===================================================================',
      '   星图抽奖 · 奖品配置',
      '   （由管理后台导出 · ' + new Date().toLocaleString('zh-CN') + '）',
      '   =================================================================== */',
      '',
      'window.LOTTERY_CONFIG = {',
      '',
      '  cost: ' + prizeCost + ',',
      '',
      '  prizes: ['
    ];
    prizes.forEach(function (p, idx) {
      var comma = idx < prizes.length - 1 ? ',' : '';
      lines.push('    { id: \'' + p.id + '\', name: \'' + String(p.name).replace(/'/g, "\\'") + '\', type: \'' + p.type + '\', reward: ' + (p.reward || 0) + ', weight: ' + (p.weight || 0) + ' }' + comma);
    });
    lines.push('  ]');
    lines.push('};');
    lines.push('');

    var ta = $('#exportCode');
    if (ta) ta.value = lines.join('\n');
    $('#exportModal').classList.remove('hide');
  });

  $('#exportClose').addEventListener('click', function () { $('#exportModal').classList.add('hide'); });
  $('#exportDone').addEventListener('click', function () { $('#exportModal').classList.add('hide'); });
  $('#exportCopy').addEventListener('click', function () {
    var ta = $('#exportCode');
    if (!ta) return;
    ta.select(); ta.setSelectionRange(0, 99999);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(function () { toast('已复制到剪贴板'); });
      } else { document.execCommand('copy'); toast('已复制到剪贴板'); }
    } catch (e) { toast('复制失败，请手动选择'); }
  });

  /* ============================================================
     3. 中奖记录
     ============================================================ */
  var recordsCache = [];
  var usersCache = {};
  var usersLoaded = false;

  function loadRecords() {
    if (!client) { renderRecords(); return; }
    var tbody = $('#recordsTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="td-empty">加载中…</td></tr>';

    client.from('lottery_records')
      .select('id, user_id, prize_id, prize_name, prize_type, reward, cost, created_at')
      .order('created_at', { ascending: false }).limit(300)
      .then(function (res) {
        if (res.error) { console.error('[admin] load records', res.error); recordsCache = []; renderRecords(); return; }
        recordsCache = res.data || [];
        loadUserMap().then(renderRecords);
      });
  }

  function loadUserMap() {
    if (usersLoaded) return Promise.resolve();
    return client.auth.admin.listUsers().then(function (res) {
      if (res.error) { console.warn('[admin] listUsers', res.error); return; }
      (res.data.users || []).forEach(function (u) {
        var meta = u.user_metadata || {};
        usersCache[u.id] = {
          id: u.id, email: u.email || '',
          nickname: meta.nickname || (u.email ? u.email.split('@')[0] : '用户'),
          isGuest: u.is_anonymous === true || meta.is_guest === true
        };
      });
      usersLoaded = true;
    }).catch(function (e) { console.warn('[admin] listUsers exception', e); });
  }

  function renderRecords() {
    var tbody = $('#recordsTable tbody');
    if (!tbody) return;
    var kw = ($('#recordsSearch') && $('#recordsSearch').value || '').trim().toLowerCase();
    var filter = ($('#recordsFilter') && $('#recordsFilter').value) || '';

    var list = recordsCache.filter(function (r) {
      if (filter && r.prize_type !== filter) return false;
      if (!kw) return true;
      var u = usersCache[r.user_id] || {};
      var hay = (u.nickname || '') + ' ' + (u.email || '') + ' ' + (r.prize_name || '');
      return hay.toLowerCase().indexOf(kw) !== -1;
    });

    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="td-empty">没有记录</td></tr>'; return; }
    var html = '';
    list.forEach(function (r) {
      var u = usersCache[r.user_id] || {};
      var tagCls = r.prize_type === 'money' ? 'money' : r.prize_type === 'gift' ? 'gift' : 'none';
      var tagText = r.prize_type === 'money' ? '奖励' : r.prize_type === 'gift' ? '礼品' : '再接再厉';
      var rewardText = r.prize_type === 'money' ? '+' + r.reward : '—';
      html += '<tr><td class="td-mono">' + fmtTime(r.created_at) + '</td>' +
        '<td>' + escapeHtml(u.nickname || '—') + '<div style="font-size:11.5px;color:#6b6256">' + escapeHtml(u.email || '') + '</div></td>' +
        '<td>' + escapeHtml(r.prize_name) + '</td>' +
        '<td><span class="tag ' + tagCls + '">' + tagText + '</span></td>' +
        '<td>' + rewardText + '</td><td>' + (r.cost || 0) + '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  $('#recordsRefresh').addEventListener('click', loadRecords);
  $('#recordsSearch').addEventListener('input', renderRecords);
  $('#recordsFilter').addEventListener('change', renderRecords);
  $('#recordsExport').addEventListener('click', function () {
    if (!recordsCache.length) { toast('没有可导出的记录'); return; }
    var rows = [['时间', '用户ID', '昵称', '邮箱', '奖品', '类型', '奖励', '消耗']];
    recordsCache.forEach(function (r) {
      var u = usersCache[r.user_id] || {};
      rows.push([fmtTime(r.created_at), r.user_id, u.nickname || '', u.email || '', r.prize_name, r.prize_type, r.reward, r.cost]);
    });
    downloadCSV('lottery-records-' + fmtDate(new Date()) + '.csv', rows);
    toast('已导出');
  });

  /* ============================================================
     4. 礼品订单
     ============================================================ */
  var ordersCache = [];

  function loadOrders() {
    if (!client) { renderOrders(); return; }
    var tbody = $('#ordersTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="td-empty">加载中…</td></tr>';

    client.from('gift_orders')
      .select('id, user_id, prize_name, receiver_name, receiver_phone, receiver_address, remark, status, created_at')
      .order('created_at', { ascending: false }).limit(300)
      .then(function (res) {
        if (res.error) { console.error('[admin] load orders', res.error); ordersCache = []; renderOrders(); return; }
        ordersCache = res.data || [];
        renderOrders();
      });
  }

  function renderOrders() {
    var tbody = $('#ordersTable tbody');
    if (!tbody) return;
    if (!ordersCache.length) { tbody.innerHTML = '<tr><td colspan="7" class="td-empty">还没有礼品订单</td></tr>'; return; }
    var html = '';
    ordersCache.forEach(function (o) {
      var st = o.status || 'pending';
      var stText = st === 'pending' ? '待发货' : st === 'shipped' ? '已发货' : st === 'done' ? '已完成' : st;
      var stCls = st === 'shipped' ? 'shipped' : st === 'done' ? 'done' : 'pending';
      html += '<tr><td class="td-mono">' + fmtTime(o.created_at) + '</td>' +
        '<td>' + escapeHtml(o.prize_name) + '</td>' +
        '<td>' + escapeHtml(o.receiver_name) + '</td>' +
        '<td class="td-mono">' + escapeHtml(o.receiver_phone) + '</td>' +
        '<td style="max-width:280px;word-break:break-all">' + escapeHtml(o.receiver_address) + '</td>' +
        '<td style="max-width:160px;word-break:break-all;color:#6b6256">' + escapeHtml(o.remark || '—') + '</td>' +
        '<td><span class="tag ' + stCls + '">' + stText + '</span>' +
        '<div class="btn-row" style="margin-top:6px">' +
        (st !== 'shipped' && st !== 'done' ? '<button class="btn-mini primary" data-order-act="shipped" data-id="' + o.id + '">标记已发货</button>' : '') +
        (st !== 'done' ? '<button class="btn-mini" data-order-act="done" data-id="' + o.id + '">标记完成</button>' : '') +
        '</div></td></tr>';
    });
    tbody.innerHTML = html;
    $$('[data-order-act]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.id, 10);
        var act = btn.dataset.orderAct;
        updateOrderStatus(id, act);
      });
    });
  }

  function updateOrderStatus(id, status) {
    if (!client) return;
    client.from('gift_orders').update({ status: status }).eq('id', id).then(function (res) {
      if (res.error) { toast('更新失败：' + res.error.message); return; }
      toast('已更新');
      logAdminAction('更新订单状态', null, '订单ID: ' + id + ' 更新为: ' + status);
      loadOrders();
    });
  }

  $('#ordersRefresh').addEventListener('click', loadOrders);
  $('#ordersExport').addEventListener('click', function () {
    if (!ordersCache.length) { toast('没有可导出的订单'); return; }
    var rows = [['时间', '奖品', '收货人', '电话', '地址', '备注', '状态']];
    ordersCache.forEach(function (o) {
      rows.push([fmtTime(o.created_at), o.prize_name, o.receiver_name, o.receiver_phone, o.receiver_address, o.remark || '', o.status || 'pending']);
    });
    downloadCSV('gift-orders-' + fmtDate(new Date()) + '.csv', rows);
    toast('已导出');
  });

  /* ============================================================
     5. 用户列表 & 6. 钱包管理 (共享用户数据)
     ============================================================ */
  var usersList = [];
  var walletsCache = [];

  function loadUsers() {
    if (!client) { renderUsers(); return; }
    var tbody = $('#usersTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="td-empty">加载中…</td></tr>';

    Promise.all([
      client.auth.admin.listUsers(),
      client.from('user_wallets').select('user_id, balance, updated_at')
    ]).then(function (results) {
      var ures = results[0], wres = results[1];
      if (ures.error) { console.error('[admin] listUsers', ures.error); usersList = []; renderUsers(); return; }

      var walletMap = {};
      ((wres && wres.data) || []).forEach(function (w) { walletMap[w.user_id] = w; });

      usersList = (ures.data.users || []).map(function (u) {
        var meta = u.user_metadata || {};
        return {
          id: u.id, email: u.email || '',
          nickname: meta.nickname || (u.email ? u.email.split('@')[0] : '用户'),
          isGuest: u.is_anonymous === true || meta.is_guest === true,
          balance: walletMap[u.id] ? (walletMap[u.id].balance || 0) : 0,
          createdAt: u.created_at, lastSignIn: u.last_sign_in_at
        };
      });

      usersList.forEach(function (u) {
        usersCache[u.id] = { id: u.id, email: u.email, nickname: u.nickname, isGuest: u.isGuest };
      });
      usersLoaded = true;
      renderUsers();
      loadWallets(); // 同时刷新钱包
    }).catch(function (e) { console.error('[admin] load users', e); renderUsers(); });
  }

  function renderUsers() {
    var tbody = $('#usersTable tbody');
    if (!tbody) return;
    var kw = ($('#usersSearch') && $('#usersSearch').value || '').trim().toLowerCase();
    var filter = ($('#usersFilter') && $('#usersFilter').value) || '';

    var list = usersList.filter(function (u) {
      if (filter === 'user' && u.isGuest) return false;
      if (filter === 'guest' && !u.isGuest) return false;
      if (!kw) return true;
      return (u.nickname + ' ' + u.email).toLowerCase().indexOf(kw) !== -1;
    });

    if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="td-empty">没有用户</td></tr>'; return; }
    var html = '';
    list.forEach(function (u) {
      html += '<tr><td class="td-mono" style="max-width:120px;overflow:hidden;text-overflow:ellipsis">' + u.id + '</td>' +
        '<td>' + escapeHtml(u.email || '—') + '</td><td>' + escapeHtml(u.nickname) + '</td>' +
        '<td><span class="tag ' + (u.isGuest ? 'guest' : 'user') + '">' + (u.isGuest ? '游客' : '正式用户') + '</span></td>' +
        '<td style="font-weight:800;color:#c8102e">₽ ' + (u.balance || 0) + '</td>' +
        '<td class="td-mono">' + fmtTime(u.createdAt) + '</td><td class="td-mono">' + fmtTime(u.lastSignIn) + '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  $('#usersRefresh').addEventListener('click', function () { usersLoaded = false; loadUsers(); });
  $('#usersSearch').addEventListener('input', renderUsers);
  $('#usersFilter').addEventListener('change', renderUsers);
  $('#usersExport').addEventListener('click', function () {
    if (!usersList.length) { toast('没有可导出的用户'); return; }
    var rows = [['UID', '邮箱', '昵称', '类型', '余额', '注册时间', '最后登录']];
    usersList.forEach(function (u) {
      rows.push([u.id, u.email, u.nickname, u.isGuest ? '游客' : '正式用户', u.balance, fmtTime(u.createdAt), fmtTime(u.lastSignIn)]);
    });
    downloadCSV('users-' + fmtDate(new Date()) + '.csv', rows);
    toast('已导出');
  });

  function loadWallets() {
    if (!client) { renderWallets(); return; }
    var tbody = $('#walletsTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="td-empty">加载中…</td></tr>';

    client.from('user_wallets').select('user_id, balance, updated_at').order('updated_at', { ascending: false }).limit(500)
      .then(function (res) {
        if (res.error) { console.error('[admin] load wallets', res.error); walletsCache = []; renderWallets(); return; }
        walletsCache = res.data || [];
        renderWallets();
      });
  }

  function renderWallets() {
    var tbody = $('#walletsTable tbody');
    if (!tbody) return;
    if (!walletsCache.length) { tbody.innerHTML = '<tr><td colspan="4" class="td-empty">还没有钱包记录</td></tr>'; return; }
    var html = '';
    walletsCache.forEach(function (w) {
      var u = usersCache[w.user_id] || {};
      html += '<tr><td>' + escapeHtml(u.nickname || '—') + '<div class="td-mono" style="margin-top:2px">' + escapeHtml(u.email || w.user_id) + '</div></td>' +
        '<td style="font-weight:800;color:#c8102e;font-size:15px">₽ ' + (w.balance || 0) + '</td>' +
        '<td class="td-mono">' + fmtTime(w.updated_at) + '</td>' +
        '<td><button class="btn-mini" data-wallet-edit="' + w.user_id + '" data-balance="' + (w.balance || 0) + '">调整</button></td></tr>';
    });
    tbody.innerHTML = html;

    $$('[data-wallet-edit]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () { openBalanceModal(btn.dataset.walletEdit, parseInt(btn.dataset.balance, 10) || 0); });
    });
  }

  $('#walletsRefresh').addEventListener('click', function () { usersLoaded = false; loadUsers(); });
  $('#walletsExport').addEventListener('click', function () {
    if (!walletsCache.length) { toast('没有可导出的钱包'); return; }
    var rows = [['UID', '昵称', '邮箱', '余额', '更新时间']];
    walletsCache.forEach(function (w) {
      var u = usersCache[w.user_id] || {};
      rows.push([w.user_id, u.nickname || '', u.email || '', w.balance || 0, fmtTime(w.updated_at)]);
    });
    downloadCSV('wallets-' + fmtDate(new Date()) + '.csv', rows);
    toast('已导出');
  });

  /* 调整余额弹窗 */
  var balanceModal = $('#balanceModal');
  var balanceUserTip = $('#balanceUserTip');
  var balanceCurrent = $('#balanceCurrent');
  var balanceDelta = $('#balanceDelta');
  var balancePreview = $('#balancePreview');
  var currentWalletUserId = null;
  var currentWalletBalance = 0;

  function openBalanceModal(userId, balance) {
    currentWalletUserId = userId; currentWalletBalance = balance;
    var u = usersCache[userId] || {};
    balanceUserTip.textContent = '正在操作：' + (u.nickname || userId) + ' (' + (u.email || '') + ')';
    balanceCurrent.value = '₽ ' + balance; balanceDelta.value = ''; balancePreview.value = '₽ ' + balance;
    balanceModal.classList.remove('hide');
  }

  function closeBalanceModal() { balanceModal.classList.add('hide'); currentWalletUserId = null; }
  $('#balanceClose').addEventListener('click', closeBalanceModal);
  $('#balanceCancel').addEventListener('click', closeBalanceModal);

  balanceDelta.addEventListener('input', function () {
    var d = parseInt(balanceDelta.value, 10) || 0;
    var next = currentWalletBalance + d;
    balancePreview.value = '₽ ' + next + (d !== 0 ? ' (' + (d > 0 ? '+' : '') + d + ')' : '');
  });

  $('#balanceConfirm').addEventListener('click', function () {
    if (!client || !currentWalletUserId) return;
    var d = parseInt(balanceDelta.value, 10) || 0;
    if (d === 0) { toast('请输入调整数量'); return; }
    var newBalance = currentWalletBalance + d;
    if (newBalance < 0 && !confirm('调整后余额为负数，确定继续？')) return;

    client.from('user_wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', currentWalletUserId)
      .then(function (res) {
        if (res.error) { toast('调整失败：' + res.error.message); return; }
        toast('已调整 · 新余额 ₽ ' + newBalance);
        logAdminAction('调整余额', currentWalletUserId, '从 ₽' + currentWalletBalance + ' 调整为 ₽' + newBalance);
        closeBalanceModal(); loadUsers();
      });
  });

  /* ============================================================
     7. 公告管理
     ============================================================ */
  var annCache = [];

  function loadAnnouncements() {
    if (!client) { renderAnn(); return; }
    var tbody = $('#annTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="td-empty">加载中…</td></tr>';

    client.from('announcements').select('*').order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) {
          tbody.innerHTML = '<tr><td colspan="5" class="td-empty" style="color:var(--red)">加载失败：请确保已创建 announcements 表</td></tr>';
          return;
        }
        annCache = res.data || [];
        renderAnn();
      });
  }

  function renderAnn() {
    var tbody = $('#annTable tbody');
    if (!tbody) return;
    if (!annCache.length) { tbody.innerHTML = '<tr><td colspan="5" class="td-empty">还没有公告</td></tr>'; return; }
    var html = '';
    annCache.forEach(function (a) {
      html += '<tr><td class="td-mono">' + fmtTime(a.created_at) + '</td>' +
        '<td>' + escapeHtml(a.title) + '</td>' +
        '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(a.content) + '</td>' +
        '<td><span class="tag ' + (a.is_active ? 'done' : 'none') + '">' + (a.is_active ? '已启用' : '已隐藏') + '</span></td>' +
        '<td><div class="btn-row">' +
        '<button class="btn-mini" data-ann-edit="' + a.id + '">编辑</button>' +
        '<button class="btn-mini danger" data-ann-del="' + a.id + '">删除</button>' +
        '</div></td></tr>';
    });
    tbody.innerHTML = html;

    $$('[data-ann-edit]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.annEdit;
        var item = annCache.find(function (a) { return a.id == id; });
        if (item) openContentModal('announcement', item);
      });
    });
    $$('[data-ann-del]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('确定删除此公告？')) return;
        client.from('announcements').delete().eq('id', btn.dataset.annDel).then(function (res) {
          if (res.error) { toast('删除失败'); return; }
          toast('已删除'); logAdminAction('删除公告', null, '公告ID: ' + btn.dataset.annDel);
          loadAnnouncements();
        });
      });
    });
  }

  $('#annAddBtn').addEventListener('click', function () { openContentModal('announcement', null); });
  $('#annRefresh').addEventListener('click', loadAnnouncements);

  /* ============================================================
     8. 新闻管理
     ============================================================ */
  var newsCache = [];

  function loadNews() {
    if (!client) { renderNews(); return; }
    var tbody = $('#newsTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="td-empty">加载中…</td></tr>';

    client.from('news').select('*').order('news_id', { ascending: true })
      .then(function (res) {
        if (res.error) {
          tbody.innerHTML = '<tr><td colspan="5" class="td-empty" style="color:var(--red)">加载失败：请确保已创建 news 表</td></tr>';
          return;
        }
        newsCache = res.data || [];
        renderNews();
      });
  }

  function renderNews() {
    var tbody = $('#newsTable tbody');
    if (!tbody) return;
    if (!newsCache.length) { tbody.innerHTML = '<tr><td colspan="5" class="td-empty">还没有新闻</td></tr>'; return; }
    var html = '';
    newsCache.forEach(function (n) {
      html += '<tr><td class="td-mono">' + escapeHtml(n.news_id) + '</td>' +
        '<td>' + escapeHtml(n.title) + '</td>' +
        '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(n.content) + '</td>' +
        '<td class="td-mono">' + fmtTime(n.created_at) + '</td>' +
        '<td><div class="btn-row">' +
        '<button class="btn-mini" data-news-edit="' + n.id + '">编辑</button>' +
        '<button class="btn-mini danger" data-news-del="' + n.id + '">删除</button>' +
        '</div></td></tr>';
    });
    tbody.innerHTML = html;

    $$('[data-news-edit]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.newsEdit;
        var item = newsCache.find(function (n) { return n.id == id; });
        if (item) openContentModal('news', item);
      });
    });
    $$('[data-news-del]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('确定删除此新闻？')) return;
        client.from('news').delete().eq('id', btn.dataset.newsDel).then(function (res) {
          if (res.error) { toast('删除失败'); return; }
          toast('已删除'); logAdminAction('删除新闻', null, '新闻ID: ' + btn.dataset.newsDel);
          loadNews();
        });
      });
    });
  }

  $('#newsAddBtn').addEventListener('click', function () { openContentModal('news', null); });
  $('#newsRefresh').addEventListener('click', loadNews);

  /* ============================================================
     通用内容弹窗（公告/新闻共用）
     ============================================================ */
  var contentModal = $('#contentModal');
  var contentTypeInput = $('#contentType');
  var contentIdInput = $('#contentId');
  var contentTitleInput = $('#contentTitle');
  var contentNewsIdField = $('#contentNewsIdField');
  var contentNewsIdInput = $('#contentNewsId');
  var contentBodyInput = $('#contentBody');
  var contentActiveField = $('#contentActiveField');
  var contentActiveSelect = $('#contentActive');

  function openContentModal(type, data) {
    contentTypeInput.value = type;
    contentIdInput.value = data ? data.id : '';
    contentTitleInput.value = data ? data.title : '';
    contentBodyInput.value = data ? data.content : '';
    
    if (type === 'news') {
      $('#contentModalTitle').textContent = data ? '编辑新闻' : '添加新闻';
      contentNewsIdField.style.display = 'flex';
      contentNewsIdInput.value = data ? data.news_id : '';
      contentActiveField.style.display = 'none';
    } else {
      $('#contentModalTitle').textContent = data ? '编辑公告' : '发布公告';
      contentNewsIdField.style.display = 'none';
      contentActiveField.style.display = 'flex';
      contentActiveSelect.value = data && data.is_active ? 'true' : 'false';
    }
    contentModal.classList.remove('hide');
  }

  function closeContentModal() { contentModal.classList.add('hide'); }

  $('#contentClose').addEventListener('click', closeContentModal);
  $('#contentCancel').addEventListener('click', closeContentModal);

  $('#contentSave').addEventListener('click', function () {
    if (!client) { toast('请先连接数据库'); return; }
    var type = contentTypeInput.value;
    var id = contentIdInput.value;
    var title = contentTitleInput.value.trim();
    var content = contentBodyInput.value.trim();

    if (!title) { toast('请填写标题'); return; }
    if (!content) { toast('请填写内容'); return; }

    var table = type === 'news' ? 'news' : 'announcements';
    var payload = { title: title, content: content };

    if (type === 'news') {
      var newsId = contentNewsIdInput.value.trim();
      if (!newsId) { toast('请填写新闻编号（如 news-01）'); return; }
      payload.news_id = newsId;
    } else {
      payload.is_active = contentActiveSelect.value === 'true';
    }

    var query = id ? client.from(table).update(payload).eq('id', id) : client.from(table).insert(payload);

    query.then(function (res) {
      if (res.error) { toast('保存失败：' + res.error.message); return; }
      toast('保存成功');
      logAdminAction((id ? '编辑' : '新增') + (type === 'news' ? '新闻' : '公告'), null, title);
      closeContentModal();
      if (type === 'news') loadNews(); else loadAnnouncements();
    });
  });

  /* ============================================================
     9. 批量操作
     ============================================================ */
  $('#batchSubmit').addEventListener('click', function () {
    if (!client) { toast('请先连接数据库'); return; }
    var amount = parseInt($('#batchAmount').value, 10);
    var remark = $('#batchRemark').value.trim();
    var scope = $('#batchScope').value;

    if (!amount || amount <= 0) { toast('请输入有效的补偿金额'); return; }
    if (!confirm('确定要给「' + (scope === 'all' ? '全部' : scope === 'guest' ? '游客' : '正式用户') + '」每人发放 ₽' + amount + ' 吗？此操作不可撤销！')) return;

    var btn = $('#batchSubmit');
    btn.disabled = true; btn.textContent = '正在发放…';

    client.auth.admin.listUsers().then(function (res) {
      if (res.error) { toast('获取用户失败'); btn.disabled = false; btn.textContent = '确认发放'; return; }
      
      var targets = (res.data.users || []).filter(function (u) {
        var meta = u.user_metadata || {};
        var isGuest = u.is_anonymous === true || meta.is_guest === true;
        if (scope === 'guest') return isGuest;
        if (scope === 'user') return !isGuest;
        return true;
      });

      if (!targets.length) {
        toast('没有符合条件的用户'); btn.disabled = false; btn.textContent = '确认发放'; return;
      }

      // 批量更新钱包 (采用 Promise.all 并发，虽然可能触发频率限制，但对于小规模站点够用)
      var updates = targets.map(function (u) {
        return client.from('user_wallets').select('balance').eq('user_id', u.id).single().then(function (wres) {
          var currentBalance = (wres.data && wres.data.balance) || 0;
          return client.from('user_wallets').upsert({
            user_id: u.id,
            balance: currentBalance + amount,
            updated_at: new Date().toISOString()
          });
        });
      });

      Promise.all(updates).then(function (results) {
        var success = results.filter(function (r) { return !r.error; }).length;
        toast('发放完成：成功 ' + success + ' / ' + targets.length + ' 人');
        logAdminAction('批量发钱', null, '范围: ' + scope + ' 金额: ₽' + amount + ' 备注: ' + (remark || '无'));
        btn.disabled = false; btn.textContent = '确认发放';
        loadUsers(); // 刷新数据
      }).catch(function (e) {
        console.error('批量操作异常', e);
        toast('发放过程出现异常，请检查控制台');
        btn.disabled = false; btn.textContent = '确认发放';
      });
    });
  });

  /* ============================================================
     10. 操作日志
     ============================================================ */
  var logsCache = [];

  function loadLogs() {
    if (!client) { renderLogs(); return; }
    var tbody = $('#logsTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="td-empty">加载中…</td></tr>';

    client.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(200)
      .then(function (res) {
        if (res.error) {
          tbody.innerHTML = '<tr><td colspan="4" class="td-empty" style="color:var(--red)">加载失败：请确保已创建 admin_logs 表</td></tr>';
          return;
        }
        logsCache = res.data || [];
        renderLogs();
      });
  }

  function renderLogs() {
    var tbody = $('#logsTable tbody');
    if (!tbody) return;
    if (!logsCache.length) { tbody.innerHTML = '<tr><td colspan="4" class="td-empty">暂无操作日志</td></tr>'; return; }
    var html = '';
    logsCache.forEach(function (l) {
      var target = l.target_user_id ? (usersCache[l.target_user_id] ? usersCache[l.target_user_id].nickname : l.target_user_id) : '—';
      html += '<tr><td class="td-mono">' + fmtTime(l.created_at) + '</td>' +
        '<td><span class="tag user">' + escapeHtml(l.admin_action) + '</span></td>' +
        '<td>' + escapeHtml(target) + '</td>' +
        '<td style="color:var(--muted);font-size:12.5px">' + escapeHtml(l.details || '') + '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  $('#logsRefresh').addEventListener('click', loadLogs);
  $('#logsExport').addEventListener('click', function () {
    if (!logsCache.length) { toast('没有可导出的日志'); return; }
    var rows = [['时间', '操作类型', '关联用户', '详情']];
    logsCache.forEach(function (l) {
      var target = l.target_user_id ? (usersCache[l.target_user_id] ? usersCache[l.target_user_id].nickname : l.target_user_id) : '—';
      rows.push([fmtTime(l.created_at), l.admin_action, target, l.details || '']);
    });
    downloadCSV('admin-logs-' + fmtDate(new Date()) + '.csv', rows);
    toast('已导出');
  });

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    initPrizesFromConfig();
    renderPrizes();

    if (cfg.url && cfg.key) {
      if (initClient()) {
        loadStats(); // 默认加载数据统计
      }
    } else {
      setConnStatus('未连接', '');
      setTimeout(function () {
        if (!client) toast('请先点击右上角「连接设置」填入 Supabase 信息', 4200);
      }, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  /* ============================================================
     11. 一键清除游客（危险操作）
     ============================================================ */
  $('#batchCleanGuests').addEventListener('click', function () {
    if (!client) { toast('请先连接数据库'); return; }
    
    // 第一重确认
    if (!confirm('⚠️ 警告：此操作将删除所有游客账号及其所有关联数据（钱包、抽奖记录、签到、订单），且无法恢复！\n\n确定要继续吗？')) return;
    
    // 第二重确认（防止误触）
    if (!confirm('再次确认：真的要删除所有游客吗？此操作不可逆！')) return;

    var btn = this;
    btn.disabled = true;
    btn.textContent = '正在清理，请稍候…';

    client.auth.admin.listUsers().then(function (res) {
      if (res.error) {
        toast('获取用户失败：' + res.error.message);
        btn.disabled = false; btn.textContent = '一键清除所有游客';
        return;
      }

      // 筛选出游客（is_anonymous 为 true，或 metadata.is_guest 为 true）
      var guests = (res.data.users || []).filter(function (u) {
        return u.is_anonymous === true || (u.user_metadata && u.user_metadata.is_guest === true);
      });

      if (!guests.length) {
        toast('没有找到游客账号');
        btn.disabled = false; btn.textContent = '一键清除所有游客';
        return;
      }

      var total = guests.length;
      var done = 0;
      var failed = 0;

      // 使用递归串行处理，避免并发过高导致 Supabase API 限流或数据库锁表
      function processNext() {
        if (done + failed >= total) {
          toast('清理完成：成功 ' + done + ' 个，失败 ' + failed + ' 个');
          btn.disabled = false; btn.textContent = '一键清除所有游客';
          logAdminAction('一键清除游客', null, '清理成功: ' + done + ' 个，失败: ' + failed + ' 个');
          loadUsers(); // 刷新用户列表和钱包
          return;
        }

        var u = guests[done + failed];

        // 1. 先清理关联表数据（解决外键约束和 lottery_record_id 等字段报错问题）
        Promise.all([
          client.from('user_wallets').delete().eq('user_id', u.id),
          client.from('checkins').delete().eq('user_id', u.id),
          client.from('lottery_records').delete().eq('user_id', u.id),
          client.from('gift_orders').delete().eq('user_id', u.id)
        ]).then(function () {
          // 2. 再删除 Auth 账号
          client.auth.admin.deleteUser(u.id).then(function (delRes) {
            if (delRes.error) {
              console.error('删除游客 Auth 失败', u.id, delRes.error);
              failed++;
            } else {
              done++;
            }
            processNext(); // 处理下一个
          }).catch(function () { failed++; processNext(); });
        }).catch(function (err) {
          console.error('清理游客关联数据失败', u.id, err);
          failed++;
          processNext(); // 继续处理下一个，不中断
        });
      }

      // 开始处理
      processNext();
    });
  });
  console.log('%c [Admin] 管理后台完整版已加载 ', 'background:#1a2b4c;color:#f0d98a;padding:3px 10px;border-radius:3px;font-weight:700');
})(window);