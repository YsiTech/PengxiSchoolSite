/* ===================================================================
   管理后台 · 逻辑 (完整无省略版)
   =================================================================== */

(function (window) {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var CFG_KEY = 'pxgl_admin_cfg';
  function loadCfg() { try { var raw = localStorage.getItem(CFG_KEY); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; } }
  function saveCfg(cfg) { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }
  var cfg = loadCfg();
  var client = null;

  var toastTimer = null;
  function toast(msg, duration) {
    var el = $('#adminToast'); if (!el) return;
    el.textContent = msg; void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, duration || 2400);
  }
  function setConnStatus(text, cls) {
    var el = $('#connStatus'); if (!el) return;
    el.textContent = text; el.className = 'ah-status' + (cls ? ' ' + cls : '');
  }
  function initClient() {
    if (!cfg.url || !cfg.key) { setConnStatus('未连接', ''); return false; }
    if (!window.supabase || !window.supabase.createClient) { setConnStatus('SDK 未加载', 'err'); return false; }
    try {
      client = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
      setConnStatus('已连接', 'ok'); return true;
    } catch (e) { console.error(e); setConnStatus('连接失败', 'err'); return false; }
  }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtTime(s) { if (!s) return '—'; var d = new Date(s); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtDate(s) { if (!s) return '—'; var d = new Date(s); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function downloadCSV(filename, rows) {
    var csv = rows.map(function (row) { return row.map(function (cell) { var s = String(cell == null ? '' : cell).replace(/"/g, '""'); return '"' + s + '"'; }).join(','); }).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob); var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* Tab 切换 */
  $$('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.dataset.tab;
      $$('.admin-tab').forEach(function (t) { t.classList.toggle('on', t === tab); });
      $$('.admin-panel').forEach(function (p) { p.classList.toggle('on', p.dataset.panel === name); });
      if (name === 'records') loadRecords();
      if (name === 'orders')  loadOrders();
      if (name === 'users')   loadUsers();
      if (name === 'wallets') loadWallets();
      if (name === 'email')   loadEmailUsers();
      if (name === 'transactions') loadTransactions();
      if (name === 'roles')   loadRoleConfigs();
    });
  });

  /* 设置 */
  $('#settingsBtn').addEventListener('click', function () {
    if ($('#cfgUrl')) $('#cfgUrl').value = cfg.url || '';
    if ($('#cfgKey')) $('#cfgKey').value = cfg.key || '';
    if ($('#cfgProxy')) $('#cfgProxy').value = cfg.proxy || '';
    $('#settingsModal').classList.remove('hide');
  });
  $('#settingsClose').addEventListener('click', function () { $('#settingsModal').classList.add('hide'); });
  $('#settingsSave').addEventListener('click', function () {
    var url = ($('#cfgUrl').value || '').trim().replace(/\/+$/, '');
    var key = ($('#cfgKey').value || '').trim();
    var proxy = ($('#cfgProxy').value || '').trim().replace(/\/+$/, '');
    if (!url || !key) { toast('请填写 URL 和 Key'); return; }
    cfg = { url: url, key: key, proxy: proxy }; saveCfg(cfg);
    if (initClient()) { toast('已连接'); $('#settingsModal').classList.add('hide'); loadRecords(); loadOrders(); loadUsers(); loadWallets(); loadTransactions(); loadEmailUsers(); loadRoleConfigs(); }
  });
  $('#settingsClear').addEventListener('click', function () { if(!confirm('清空连接信息？')) return; cfg = {}; saveCfg(cfg); client = null; setConnStatus('未连接', ''); toast('已清空'); });

  /* 角色配置 */
  var roleConfigsCache = [];
  function loadRoleConfigs() {
    if (!client) return; $('#rolesTable tbody').innerHTML = '<tr><td colspan="5" class="td-empty">加载中…</td></tr>';
    client.from('role_configs').select('*').order('role').then(function (res) {
      if (res.error) { console.error(res.error); $('#rolesTable tbody').innerHTML = '<tr><td colspan="5" class="td-empty">读取失败，请检查数据库</td></tr>'; return; }
      roleConfigsCache = res.data || []; renderRoleConfigs();
    });
  }
  function renderRoleConfigs() {
    var tbody = $('#rolesTable tbody'); if (!tbody) return;
    if (!roleConfigsCache.length) { tbody.innerHTML = '<tr><td colspan="5" class="td-empty">暂无角色配置，请在 SQL Editor 插入默认数据</td></tr>'; return; }
    var roleNames = { 'user': '普通用户', 'vip': 'VIP 用户', 'subscriber': '订阅用户', 'admin': '管理员', 'teacher': '老师' };
    var html = '';
    roleConfigsCache.forEach(function (r) {
      html += '<tr>' +
        '<td class="td-mono">' + escapeHtml(r.role) + '</td>' +
        '<td>' + (roleNames[r.role] || r.role) + '</td>' +
        '<td><input type="number" class="role-input checkin-input" data-role="' + r.role + '" value="' + (r.daily_checkin_reward || 0) + '" min="0" style="width:80px;padding:4px;border:1px solid var(--line);border-radius:4px;"></td>' +
        '<td><input type="number" class="role-input lottery-input" data-role="' + r.role + '" value="' + (r.lottery_cost || 0) + '" min="0" style="width:80px;padding:4px;border:1px solid var(--line);border-radius:4px;"></td>' +
        '<td><button class="btn-mini primary" data-role-save="' + r.role + '">保存</button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
    $$('[data-role-save]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var role = btn.dataset.roleSave;
        var checkinVal = parseInt($('.checkin-input[data-role="' + role + '"]').value, 10) || 0;
        var lotteryVal = parseInt($('.lottery-input[data-role="' + role + '"]').value, 10) || 0;
        client.from('role_configs').update({ daily_checkin_reward: checkinVal, lottery_cost: lotteryVal, updated_at: new Date().toISOString() }).eq('role', role).then(function (res) {
          if (res.error) { toast('保存失败：' + res.error.message); return; }
          toast('已保存 ' + (roleNames[role] || role) + ' 的配置');
        });
      });
    });
  }
  if ($('#rolesRefresh')) $('#rolesRefresh').addEventListener('click', loadRoleConfigs);

  /* 奖品管理 */
  var prizes = [], prizeCost = 50;
  function initPrizesFromConfig() {
    if (window.LOTTERY_CONFIG) {
      prizeCost = window.LOTTERY_CONFIG.cost || 50;
      prizes = (window.LOTTERY_CONFIG.prizes || []).map(function (p) { return { id: p.id, name: p.name, type: p.type, reward: p.reward || 0, weight: p.weight || 0 }; });
    }
    if (!prizes.length) prizes = [{ id: 'p' + Date.now(), name: '示例奖品', type: 'money', reward: 50, weight: 10 }];
  }
  function renderPrizes() {
    var list = $('#prizeList'); if (!list) return;
    if (!prizes.length) { list.innerHTML = '<div class="prize-empty">还没有奖品</div>'; return; }
    var html = '';
    prizes.forEach(function (p, idx) {
      html += '<div class="prize-row" data-idx="' + idx + '"><div class="pr-handle">⋮⋮</div><div class="pr-fields">' +
        '<div class="pr-field"><label>奖品名称</label><input type="text" data-field="name" value="' + escapeHtml(p.name) + '"></div>' +
        '<div class="pr-field"><label>类型</label><select data-field="type">' +
        '<option value="money"' + (p.type === 'money' ? ' selected' : '') + '>奖励</option>' +
        '<option value="gift"' + (p.type === 'gift' ? ' selected' : '') + '>礼品</option>' +
        '<option value="none"' + (p.type === 'none' ? ' selected' : '') + '>再接再厉</option></select></div>' +
        '<div class="pr-field"><label>奖励金额</label><input type="number" data-field="reward" value="' + (p.reward || 0) + '" min="0"></div>' +
        '<div class="pr-field"><label>权重</label><input type="number" data-field="weight" value="' + (p.weight || 0) + '" min="0"></div></div>' +
        '<div class="pr-prob">中奖率<b data-prob="' + idx + '">—</b></div>' +
        '<div class="pr-actions"><button class="btn-mini" data-act="up">↑</button><button class="btn-mini" data-act="down">↓</button><button class="btn-mini danger" data-act="del">删除</button></div></div>';
    });
    list.innerHTML = html; updatePrizeStats(); renderPreview(); bindPrizeEvents();
  }
  function bindPrizeEvents() {
    var list = $('#prizeList'); if (!list) return;
    $$('.prize-row', list).forEach(function (row) {
      var idx = parseInt(row.dataset.idx, 10);
      $$('input, select', row).forEach(function (input) {
        input.addEventListener('input', function () {
          var field = input.dataset.field; if (!field) return;
          var val = input.value; if (field === 'reward' || field === 'weight') val = parseInt(val, 10) || 0;
          prizes[idx][field] = val; updatePrizeStats(); renderPreview(); updateProbCells();
        });
      });
    });
    $$('[data-act]', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.prize-row'); var idx = parseInt(row.dataset.idx, 10); var act = btn.dataset.act;
        if (act === 'up' && idx > 0) { var tmp = prizes[idx - 1]; prizes[idx - 1] = prizes[idx]; prizes[idx] = tmp; }
        else if (act === 'down' && idx < prizes.length - 1) { var tmp2 = prizes[idx + 1]; prizes[idx + 1] = prizes[idx]; prizes[idx] = tmp2; }
        else if (act === 'del') { if (!confirm('确定删除？')) return; prizes.splice(idx, 1); }
        renderPrizes();
      });
    });
  }
  function updatePrizeStats() { var total = prizes.reduce(function (s, p) { return s + Math.max(0, p.weight || 0); }, 0); if ($('#prizeCount')) $('#prizeCount').textContent = prizes.length; if ($('#prizeWeight')) $('#prizeWeight').textContent = total; }
  function updateProbCells() { var total = prizes.reduce(function (s, p) { return s + Math.max(0, p.weight || 0); }, 0); $$('[data-prob]').forEach(function (el) { var idx = parseInt(el.dataset.prob, 10); var w = Math.max(0, prizes[idx].weight || 0); el.textContent = total > 0 ? (w / total * 100).toFixed(1) + '%' : '—'; }); }
  function renderPreview() { var wrap = $('#previewBars'); if (!wrap) return; var total = prizes.reduce(function (s, p) { return s + Math.max(0, p.weight || 0); }, 0); if (!prizes.length || total === 0) { wrap.innerHTML = '<div style="color:#6b6256;font-size:13px;text-align:center;padding:14px">还没有有效的奖品</div>'; return; } var html = ''; prizes.forEach(function (p) { var w = Math.max(0, p.weight || 0); var pct = w / total * 100; html += '<div class="preview-bar"><span class="pb-name">' + escapeHtml(p.name) + '</span><div class="pb-track"><div class="pb-fill" style="width:' + pct.toFixed(2) + '%"></div></div><span class="pb-pct">' + pct.toFixed(1) + '%</span></div>'; }); wrap.innerHTML = html; }
  if ($('#prizeAddBtn')) $('#prizeAddBtn').addEventListener('click', function () { prizes.push({ id: 'p' + Date.now(), name: '新奖品', type: 'money', reward: 50, weight: 10 }); renderPrizes(); });
  if ($('#prizeCost')) { $('#prizeCost').value = prizeCost; $('#prizeCost').addEventListener('input', function () { prizeCost = parseInt($('#prizeCost').value, 10) || 0; }); }
  if ($('#prizeExportBtn')) $('#prizeExportBtn').addEventListener('click', function () { var lines = ['/* 星图抽奖 · 奖品配置 */', '', 'window.LOTTERY_CONFIG = {', '  cost: ' + prizeCost + ',', '  prizes: [']; prizes.forEach(function (p, idx) { lines.push('    { id: \'' + p.id + '\', name: \'' + String(p.name).replace(/'/g, "\\'") + '\', type: \'' + p.type + '\', reward: ' + (p.reward || 0) + ', weight: ' + (p.weight || 0) + ' }' + (idx < prizes.length - 1 ? ',' : '')); }); lines.push('  ]', '};', ''); $('#exportCode').value = lines.join('\n'); $('#exportModal').classList.remove('hide'); });
  if ($('#exportClose')) $('#exportClose').addEventListener('click', function () { $('#exportModal').classList.add('hide'); });
  if ($('#exportDone')) $('#exportDone').addEventListener('click', function () { $('#exportModal').classList.add('hide'); });
  if ($('#exportCopy')) $('#exportCopy').addEventListener('click', function () { $('#exportCode').select(); document.execCommand('copy'); toast('已复制'); });

  /* 缓存 */
  var usersCache = {}, usersLoaded = false;
  function loadUserMap() {
    if (usersLoaded) return Promise.resolve();
    return client.auth.admin.listUsers().then(function (res) {
      if (res.error) return;
      (res.data.users || []).forEach(function (u) {
        var meta = u.user_metadata || {};
        usersCache[u.id] = { id: u.id, email: u.email || '', nickname: meta.nickname || (u.email ? u.email.split('@')[0] : '用户'), isGuest: u.is_anonymous === true || meta.is_guest === true, role: meta.role || 'user' };
      }); usersLoaded = true;
    }).catch(function () {});
  }

  /* 中奖记录 */
  var recordsCache = [];
  function loadRecords() {
    if (!client) return; $('#recordsTable tbody').innerHTML = '<tr><td colspan="6" class="td-empty">加载中…</td></tr>';
    client.from('lottery_records').select('*').order('created_at', { ascending: false }).limit(300).then(function (res) {
      if (res.error) { recordsCache = []; renderRecords(); return; }
      recordsCache = res.data || []; loadUserMap().then(renderRecords);
    });
  }
  function renderRecords() {
    var tbody = $('#recordsTable tbody'); if (!tbody) return;
    var kw = ($('#recordsSearch') && $('#recordsSearch').value || '').toLowerCase();
    var filter = $('#recordsFilter') ? $('#recordsFilter').value : '';
    var list = recordsCache.filter(function (r) {
      if (filter && r.prize_type !== filter) return false; if (!kw) return true;
      var u = usersCache[r.user_id] || {}; return ((u.nickname||'') + (u.email||'') + (r.prize_name||'')).toLowerCase().indexOf(kw) !== -1;
    });
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="td-empty">没有记录</td></tr>'; return; }
    var html = ''; list.forEach(function (r) {
      var u = usersCache[r.user_id] || {};
      html += '<tr><td class="td-mono">' + fmtTime(r.created_at) + '</td><td>' + escapeHtml(u.nickname||'—') + '<div style="font-size:11.5px;color:#6b6256">' + escapeHtml(u.email||'') + '</div></td><td>' + escapeHtml(r.prize_name) + '</td><td>' + r.prize_type + '</td><td>' + (r.prize_type==='money'?'+'+r.reward:'—') + '</td><td>' + (r.cost||0) + '</td></tr>';
    }); tbody.innerHTML = html;
  }
  if ($('#recordsRefresh')) $('#recordsRefresh').addEventListener('click', loadRecords);
  if ($('#recordsSearch')) $('#recordsSearch').addEventListener('input', renderRecords);
  if ($('#recordsFilter')) $('#recordsFilter').addEventListener('change', renderRecords);

  /* 礼品订单 */
  var ordersCache = [];
  function loadOrders() {
    if (!client) return; $('#ordersTable tbody').innerHTML = '<tr><td colspan="7" class="td-empty">加载中…</td></tr>';
    client.from('gift_orders').select('*').order('created_at', { ascending: false }).limit(300).then(function (res) {
      if (res.error) { console.error(res.error); ordersCache = []; renderOrders(); return; }
      ordersCache = res.data || []; renderOrders();
    });
  }
  function renderOrders() {
    var tbody = $('#ordersTable tbody'); if (!tbody) return;
    if (!ordersCache.length) { tbody.innerHTML = '<tr><td colspan="7" class="td-empty">还没有订单</td></tr>'; return; }
    var html = '';
    ordersCache.forEach(function (o) {
      var st = o.status || 'pending';
      var stText = st === 'pending' ? '待发货' : st === 'shipped' ? '已发货' : st === 'delivered' ? '已签收' : '已完成';
      var stCls = st === 'shipped' ? 'shipped' : st === 'delivered' ? 'delivered' : 'pending';
      var logiHtml = '—';
      if (o.tracking_company && o.tracking_number) {
        var logiUrl = 'https://www.baidu.com/s?wd=' + encodeURIComponent(o.tracking_company + ' ' + o.tracking_number);
        logiHtml = '<div class="td-logistics"><span class="logi-company">' + escapeHtml(o.tracking_company) + '</span><div class="logi-no">' + escapeHtml(o.tracking_number) + '</div><a class="logi-link" href="' + logiUrl + '" target="_blank">查看物流</a></div>';
      } else if (st === 'shipped' || st === 'delivered') {
        logiHtml = '<span style="color:var(--muted);font-size:12px;">未填写单号</span>';
      }
      var actionHtml = '';
      if (st === 'pending') {
        actionHtml = '<button class="btn-mini primary" data-order-act="shipping" data-id="' + o.id + '">填写物流发货</button>';
      } else {
        actionHtml = '<button class="btn-mini" data-order-act="edit-shipping" data-id="' + o.id + '" data-company="' + escapeHtml(o.tracking_company||'') + '" data-no="' + escapeHtml(o.tracking_number||'') + '">修改物流</button>';
        if (st !== 'delivered') actionHtml += '<button class="btn-mini" data-order-act="delivered" data-id="' + o.id + '">标记已签收</button>';
      }
      html += '<tr><td class="td-mono">' + fmtTime(o.created_at) + '</td><td>' + escapeHtml(o.prize_name) + '</td><td>' + escapeHtml(o.receiver_name) + '</td><td class="td-mono">' + escapeHtml(o.receiver_phone) + '</td><td style="max-width:200px;word-break:break-all">' + escapeHtml(o.receiver_address) + '</td><td>' + logiHtml + '</td><td><span class="tag ' + stCls + '">' + stText + '</span><div class="btn-row" style="margin-top:6px">' + actionHtml + '</div></td></tr>';
    });
    tbody.innerHTML = html;
    $$('[data-order-act]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id; var act = btn.dataset.orderAct;
        if (act === 'shipping' || act === 'edit-shipping') { openShippingModal(id, btn.dataset.company, btn.dataset.no); }
        else if (act === 'delivered') {
          if (confirm('确定标记该订单为已签收吗？')) {
            client.from('gift_orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', id).then(function (res) {
              if (res.error) { toast('操作失败'); return; } toast('已标记签收'); loadOrders();
            });
          }
        }
      });
    });
  }
  if ($('#ordersRefresh')) $('#ordersRefresh').addEventListener('click', loadOrders);
  if ($('#ordersExport')) $('#ordersExport').addEventListener('click', function () {
    if (!ordersCache.length) { toast('没有可导出的订单'); return; }
    var rows = [['时间', '奖品', '收货人', '电话', '地址', '快递公司', '快递单号', '状态']];
    ordersCache.forEach(function (o) { rows.push([fmtTime(o.created_at), o.prize_name, o.receiver_name, o.receiver_phone, o.receiver_address, o.tracking_company||'', o.tracking_number||'', o.status||'pending']); });
    downloadCSV('gift-orders-' + fmtDate(new Date()) + '.csv', rows); toast('已导出');
  });

  var shippingModal = $('#shippingModal'), currentShippingOrderId = null;
  function openShippingModal(orderId, company, no) {
    currentShippingOrderId = orderId;
    var order = ordersCache.find(function (o) { return String(o.id) === String(orderId); }) || {};
    if ($('#shippingOrderTip')) $('#shippingOrderTip').textContent = '正在操作：' + (order.receiver_name||'') + ' - ' + (order.prize_name||'');
    if ($('#shippingCompany')) $('#shippingCompany').value = company || '顺丰速运';
    if ($('#shippingNo')) $('#shippingNo').value = no || '';
    if ($('#shippingRemark')) $('#shippingRemark').value = order.admin_remark || '';
    shippingModal.classList.remove('hide');
  }
  if ($('#shippingClose')) $('#shippingClose').addEventListener('click', function () { shippingModal.classList.add('hide'); });
  if ($('#shippingCancel')) $('#shippingCancel').addEventListener('click', function () { shippingModal.classList.add('hide'); });
  if ($('#shippingConfirm')) $('#shippingConfirm').addEventListener('click', function () {
    if (!client || !currentShippingOrderId) return;
    var company = $('#shippingCompany').value;
    var no = $('#shippingNo').value.trim();
    var remark = $('#shippingRemark').value.trim();
    if (!no) { toast('请填写快递单号'); return; }
    var updateData = { status: 'shipped', tracking_company: company, tracking_number: no, admin_remark: remark };
    if (!ordersCache.find(o => String(o.id) === String(currentShippingOrderId))?.shipped_at) {
      updateData.shipped_at = new Date().toISOString();
    }
    client.from('gift_orders').update(updateData).eq('id', currentShippingOrderId).then(function (res) {
      if (res.error) { toast('保存失败：' + res.error.message); return; }
      toast('物流信息已保存'); shippingModal.classList.add('hide'); loadOrders();
    });
  });

  /* 用户列表 */
  var usersList = [];
  function loadUsers() {
    if (!client) return; $('#usersTable tbody').innerHTML = '<tr><td colspan="7" class="td-empty">加载中…</td></tr>';
    Promise.all([client.auth.admin.listUsers(), client.from('user_wallets').select('*')]).then(function (results) {
      var ures = results[0], wres = results[1];
      if (ures.error) { usersList = []; renderUsers(); return; }
      var walletMap = {}; ((wres && wres.data) || []).forEach(function (w) { walletMap[w.user_id] = w; });
      usersList = (ures.data.users || []).map(function (u) {
        var meta = u.user_metadata || {}; var isGuest = u.is_anonymous === true || meta.is_guest === true;
        var wallet = walletMap[u.id] || {};
        return { id: u.id, email: u.email || '', nickname: meta.nickname || (u.email ? u.email.split('@')[0] : '用户'), isGuest, role: wallet.role || meta.role || 'user', user_metadata: meta, balance: wallet.balance || 0, createdAt: u.created_at, lastSignIn: u.last_sign_in_at };
      });
      usersList.forEach(function (u) { usersCache[u.id] = { id: u.id, email: u.email, nickname: u.nickname, isGuest: u.isGuest, role: u.role }; });
      usersLoaded = true; renderUsers();
    }).catch(function () { renderUsers(); });
  }
  function renderUsers() {
    var tbody = $('#usersTable tbody'); if (!tbody) return;
    var kw = ($('#usersSearch') && $('#usersSearch').value || '').toLowerCase();
    var filter = $('#usersFilter') ? $('#usersFilter').value : '';
    var list = usersList.filter(function (u) {
      if (filter === 'user' && u.isGuest) return false; if (filter === 'guest' && !u.isGuest) return false;
      if (!kw) return true; return ((u.nickname + ' ' + u.email).toLowerCase().indexOf(kw) !== -1);
    });
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="td-empty">没有用户</td></tr>'; return; }
    var roleNames = { 'user': '普通用户', 'vip': 'VIP 用户', 'subscriber': '订阅用户', 'admin': '管理员', 'teacher': '老师' };
    var html = '';
    list.forEach(function (u) {
      html += '<tr><td class="td-mono" style="max-width:100px;overflow:hidden;text-overflow:ellipsis">' + u.id + '</td><td>' + escapeHtml(u.email||'—') + '</td><td>' + escapeHtml(u.nickname) + '</td><td>' + (u.isGuest?'游客':'正式') + '</td><td><span class="tag role-' + u.role + '">' + (roleNames[u.role]||'普通用户') + '</span></td><td>₽ ' + (u.balance||0) + '</td><td><button class="btn-mini" data-user-edit="' + u.id + '" data-role="' + u.role + '">修改角色</button></td></tr>';
    });
    tbody.innerHTML = html;
    $$('[data-user-edit]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () { openRoleModal(btn.dataset.userEdit, btn.dataset.role); });
    });
  }
  if ($('#usersRefresh')) $('#usersRefresh').addEventListener('click', function () { usersLoaded = false; loadUsers(); });
  if ($('#usersSearch')) $('#usersSearch').addEventListener('input', renderUsers);
  if ($('#usersFilter')) $('#usersFilter').addEventListener('change', renderUsers);

  var roleModal = $('#roleModal'), currentRoleUserId = null;
  function openRoleModal(userId, role) {
    currentRoleUserId = userId;
    var u = usersList.find(function (item) { return item.id === userId; }) || {};
    if ($('#roleUserTip')) $('#roleUserTip').textContent = '正在操作：' + (u.nickname||'') + ' (' + (u.email||'') + ')';
    if ($('#roleSelect')) $('#roleSelect').value = role || 'user';
    roleModal.classList.remove('hide');
  }
  if ($('#roleClose')) $('#roleClose').addEventListener('click', function () { roleModal.classList.add('hide'); });
  if ($('#roleCancel')) $('#roleCancel').addEventListener('click', function () { roleModal.classList.add('hide'); });
  if ($('#roleConfirm')) $('#roleConfirm').addEventListener('click', function () {
    if (!client || !currentRoleUserId) return;
    var newRole = $('#roleSelect').value;
    client.from('user_wallets').upsert({ user_id: currentRoleUserId, role: newRole }, { onConflict: 'user_id' }).then(function (res) {
      if (res.error) { toast('修改失败：' + res.error.message); return; }
      toast('角色修改成功'); roleModal.classList.add('hide'); loadUsers();
    });
  });

  /* 钱包管理 */
  var walletsCache = [];
  function loadWallets() {
    if (!client) return; $('#walletsTable tbody').innerHTML = '<tr><td colspan="4" class="td-empty">加载中…</td></tr>';
    client.from('user_wallets').select('*').order('updated_at', { ascending: false }).limit(500).then(function (res) {
      walletsCache = res.data || []; loadUserMap().then(renderWallets);
    });
  }
  function renderWallets() {
    var tbody = $('#walletsTable tbody'); if (!tbody) return;
    if (!walletsCache.length) { tbody.innerHTML = '<tr><td colspan="4" class="td-empty">还没有钱包记录</td></tr>'; return; }
    var html = '';
    walletsCache.forEach(function (w) {
      var u = usersCache[w.user_id] || {};
      html += '<tr><td>' + escapeHtml(u.nickname||'—') + '<div class="td-mono" style="margin-top:2px">' + escapeHtml(u.email||w.user_id) + '</div></td><td>₽ ' + (w.balance||0) + '</td><td class="td-mono">' + fmtTime(w.updated_at) + '</td><td><button class="btn-mini" data-wallet-edit="' + w.user_id + '" data-balance="' + (w.balance||0) + '">调整</button></td></tr>';
    });
    tbody.innerHTML = html;
    $$('[data-wallet-edit]', tbody).forEach(function (btn) { btn.addEventListener('click', function () { openBalanceModal(btn.dataset.walletEdit, parseInt(btn.dataset.balance, 10) || 0); }); });
  }
  if ($('#walletsRefresh')) $('#walletsRefresh').addEventListener('click', loadWallets);

  var balanceModal = $('#balanceModal'), currentWalletUserId = null, currentWalletBalance = 0;
  function openBalanceModal(userId, balance) {
    currentWalletUserId = userId; currentWalletBalance = balance;
    var u = usersCache[userId] || {};
    if ($('#balanceUserTip')) $('#balanceUserTip').textContent = '正在操作：' + (u.nickname || userId) + ' (' + (u.email || '') + ')';
    if ($('#balanceCurrent')) $('#balanceCurrent').value = '₽ ' + balance;
    if ($('#balanceDelta')) $('#balanceDelta').value = '';
    if ($('#balancePreview')) $('#balancePreview').value = '₽ ' + balance;
    balanceModal.classList.remove('hide');
  }
  if ($('#balanceClose')) $('#balanceClose').addEventListener('click', function () { balanceModal.classList.add('hide'); });
  if ($('#balanceCancel')) $('#balanceCancel').addEventListener('click', function () { balanceModal.classList.add('hide'); });
  if ($('#balanceDelta')) $('#balanceDelta').addEventListener('input', function () {
    var d = parseInt(this.value, 10) || 0;
    if ($('#balancePreview')) $('#balancePreview').value = '₽ ' + (currentWalletBalance + d) + (d !== 0 ? ' (' + (d > 0 ? '+' : '') + d + ')' : '');
  });
  if ($('#balanceConfirm')) $('#balanceConfirm').addEventListener('click', function () {
    if (!client || !currentWalletUserId) return;
    var d = parseInt($('#balanceDelta').value, 10) || 0;
    if (d === 0) { toast('请输入调整数量'); return; }
    var newBalance = currentWalletBalance + d;
    client.from('user_wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', currentWalletUserId).then(function (res) {
      if (res.error) { toast('调整失败：' + res.error.message); return; }
      toast('已调整'); balanceModal.classList.add('hide'); loadWallets();
    });
  });

  /* 邮件群发 */
  var emailUsers = [];
  function loadEmailUsers() {
    if (!client) return;
    client.auth.admin.listUsers().then(function (res) {
      emailUsers = (res.data.users || []).map(function (u) {
        var meta = u.user_metadata || {}; return { id: u.id, email: u.email || '', nickname: meta.nickname || (u.email ? u.email.split('@')[0] : '用户'), isGuest: u.is_anonymous === true || meta.is_guest === true };
      });
      renderEmailUsers();
    });
  }
  function renderEmailUsers(kw) {
    var list = $('#emailUserList'); if (!list) return;
    if (!emailUsers.length) { list.innerHTML = '<div style="padding:8px;color:#6b6256;font-size:13px;">暂无用户数据</div>'; return; }
    kw = (kw || '').toLowerCase();
    var filtered = emailUsers.filter(function (u) { return !kw || (u.nickname + ' ' + u.email).toLowerCase().indexOf(kw) !== -1; });
    var html = '';
    filtered.forEach(function (u) {
      html += '<div class="email-user-item"><input type="checkbox" class="email-user-cb" value="' + u.id + '" id="cb_' + u.id + '"><label for="cb_' + u.id + '">' + escapeHtml(u.nickname) + ' (' + escapeHtml(u.email) + ')' + (u.isGuest ? ' <span style="color:#b8860b;font-size:11px;">[游客]</span>' : '') + '</label></div>';
    });
    list.innerHTML = html;
  }
  if ($('#emailScope')) $('#emailScope').addEventListener('change', function () {
    if ($('#emailCustomUserBox')) $('#emailCustomUserBox').classList.toggle('hide', this.value !== 'selected');
  });
  if ($('#emailUserSearch')) $('#emailUserSearch').addEventListener('input', function () { renderEmailUsers(this.value); });

  async function sendEmails() {
    const subject = $('#emailSubject').value.trim();
    const content = $('#emailContent').value.trim();
    const scope = $('#emailScope').value;
    if (!subject || !content) { toast('请填写邮件主题和内容'); return; }
    if (!client) { toast('请先连接数据库'); return; }
    let targets = [];
    if (scope === 'selected') {
      var checkedIds = $$('.email-user-cb:checked').map(function (cb) { return cb.value; });
      targets = emailUsers.filter(function (u) { return checkedIds.indexOf(u.id) !== -1; });
      if (!targets.length) { toast('请至少选择一个用户'); return; }
    } else {
      var allUsers = emailUsers.length ? emailUsers : (await client.auth.admin.listUsers()).data.users;
      targets = allUsers.filter(function (u) {
        const meta = u.user_metadata || {}; const isGuest = u.is_anonymous === true || meta.is_guest === true;
        if (scope === 'user' && isGuest) return false; if (scope === 'guest' && !isGuest) return false; return !!u.email;
      });
    }
    if (!targets.length) { toast('没有找到符合条件的用户'); return; }
    const progressModal = $('#progressModal'), progressText = $('#progressText');
    progressModal.classList.remove('hide');
    const FUNC_URL = `${cfg.url}/functions/v1/send-email`;
    let success = 0, fail = 0, firstErrorMessage = '';
    for (let i = 0; i < targets.length; i++) {
      const user = targets[i]; progressText.textContent = `${i + 1} / ${targets.length}`;
      try {
        const res = await fetch(FUNC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` }, body: JSON.stringify({ to: user.email, subject: subject, html: content }) });
        const result = await res.json();
        if (result.success) success++; else { fail++; if (i === 0 && result.error) firstErrorMessage = result.error; }
      } catch (e) { fail++; if (i === 0) firstErrorMessage = e.message; }
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 200));
    }
    progressModal.classList.add('hide');
    toast(`发送完成：成功 ${success} 封，失败 ${fail} 封` + (firstErrorMessage ? `。原因：${firstErrorMessage}` : ''), 6000);
  }
  if ($('#emailSendBtn')) $('#emailSendBtn').addEventListener('click', sendEmails);

  /* 余额明细 */
  var txCache = [];
  function loadTransactions() {
    if (!client) return; $('#txTable tbody').innerHTML = '<tr><td colspan="6" class="td-empty">加载中…</td></tr>';
    client.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(500).then(res => {
      txCache = res.data || []; loadUserMap().then(renderTransactions);
    });
  }
  function renderTransactions() {
    var tbody = $('#txTable tbody'); if (!tbody) return;
    var kw = ($('#txSearch') && $('#txSearch').value || '').toLowerCase();
    var filter = $('#txFilter') ? $('#txFilter').value : '';
    var list = txCache.filter(tx => {
      if (filter && tx.type !== filter) return false;
      if (!kw) return true; var u = usersCache[tx.user_id] || {}; return ((u.nickname||'') + (u.email||'')).toLowerCase().indexOf(kw) !== -1;
    });
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="td-empty">没有流水记录</td></tr>'; return; }
    var typeTextMap = { 'checkin': '签到', 'lottery': '抽奖', 'admin': '管理员调整', 'gift': '礼品' };
    var html = ''; list.forEach(tx => {
      var u = usersCache[tx.user_id] || {};
      html += `<tr><td class="td-mono">${fmtTime(tx.created_at)}</td><td>${escapeHtml(u.nickname||'—')}<div style="font-size:11.5px;color:#6b6256">${escapeHtml(u.email||'')}</div></td><td><span class="${tx.amount>0?'tag money':'tag none'}">${(tx.amount>0?'+':'')+tx.amount}</span></td><td>₽ ${tx.balance_after}</td><td>${typeTextMap[tx.type]||tx.type}</td><td>${escapeHtml(tx.description||'—')}</td></tr>`;
    }); tbody.innerHTML = html;
  }
  if ($('#txRefresh')) $('#txRefresh').addEventListener('click', loadTransactions);
  if ($('#txSearch')) $('#txSearch').addEventListener('input', renderTransactions);
  if ($('#txFilter')) $('#txFilter').addEventListener('change', renderTransactions);

  /* 批量操作 */
  if ($('#batchSubmit')) $('#batchSubmit').addEventListener('click', async function () {
    const amountStr = $('#batchAmount').value.trim(), remark = $('#batchRemark').value.trim() || '管理员批量补偿', scope = $('#batchScope').value;
    if (!amountStr) { toast('请输入补偿金额'); return; }
    const amount = parseInt(amountStr, 10); if (isNaN(amount) || amount <= 0) { toast('补偿金额必须是正整数'); return; }
    if (!confirm(`确定要给【${scope === 'all' ? '全部' : scope === 'user' ? '仅正式' : '仅游客'}】用户每人发放 ₽ ${amount} 吗？`)) return;
    const { data: { users }, error } = await client.auth.admin.listUsers(); if (error) { toast('获取用户失败'); return; }
    const targets = users.filter(u => { const meta = u.user_metadata || {}; const isGuest = u.is_anonymous === true || meta.is_guest === true; if (scope === 'user' && isGuest) return false; if (scope === 'guest' && !isGuest) return false; return true; });
    if (!targets.length) { toast('没有符合条件的目标用户'); return; }
    const progressModal = $('#progressModal'), progressText = $('#progressText'); progressModal.classList.remove('hide');
    let success = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      progressText.textContent = `发放中… ${i + 1} / ${targets.length}`;
      try {
        const { data: wallet } = await client.from('user_wallets').select('balance').eq('user_id', targets[i].id).single();
        const newBalance = (wallet ? wallet.balance : 0) + amount;
        await client.from('user_wallets').upsert({ user_id: targets[i].id, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        await client.from('wallet_transactions').insert({ user_id: targets[i].id, amount: amount, balance_after: newBalance, type: 'admin', description: remark });
        success++;
      } catch (e) { fail++; }
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 200));
    }
    progressModal.classList.add('hide'); toast(`批量发放完成：成功 ${success} 人，失败 ${fail} 人`, 5000);
    usersLoaded = false; loadWallets(); loadTransactions();
  });

  if ($('#clearGuestsBtn')) $('#clearGuestsBtn').addEventListener('click', async function () {
    if (!client) { toast('请先连接数据库'); return; }
    if (!confirm('⚠️ 确定要清除所有游客账号吗？此操作不可逆！关联数据也会被清除。')) return;
    if (prompt('请输入「确认删除」以执行：') !== '确认删除') { toast('已取消操作'); return; }
    const { data: { users }, error } = await client.auth.admin.listUsers(); if (error) { toast('获取用户失败'); return; }
    const guests = users.filter(u => { const meta = u.user_metadata || {}; return u.is_anonymous === true || meta.is_guest === true; });
    if (!guests.length) { toast('没有找到游客账号'); return; }
    const progressModal = $('#progressModal'), progressText = $('#progressText'); progressModal.classList.remove('hide');
    let success = 0, fail = 0;
    for (let i = 0; i < guests.length; i++) {
      progressText.textContent = `清除中… ${i + 1} / ${guests.length}`;
      try { const { error: delErr } = await client.auth.admin.deleteUser(guests[i].id); if (delErr) throw delErr; success++; } catch (e) { fail++; }
      if (i < guests.length - 1) await new Promise(r => setTimeout(r, 200));
    }
    progressModal.classList.add('hide'); toast(`清除完成：成功 ${success} 人，失败 ${fail} 人`, 5000);
    usersLoaded = false; loadUsers(); loadWallets(); loadTransactions();
  });

  /* 启动 */
  function boot() {
    initPrizesFromConfig(); renderPrizes();
    if (cfg.url && cfg.key) { initClient(); }
    else { setConnStatus('未连接', ''); setTimeout(function () { if (!client) toast('请先点击右上角「连接设置」填入 Supabase 信息', 4200); }, 600); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  console.log('%c [Admin] 管理后台已加载 ', 'background:#1a2b4c;color:#f0d98a;padding:3px 10px;border-radius:3px;font-weight:700');
})(window);