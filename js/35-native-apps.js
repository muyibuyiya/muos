/* ============================================================
   MUOS — 35-native-apps.js
   手机原生应用：联系人 / 健康 / 钱包 / 超级助手
   这四个是真机必备、但桌面系统不会有的应用，用来让 MUOS
   从「浏览器里的迷你电脑」变成「一台手机」。
   全部使用本地模拟数据，不访问任何真实设备能力。
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, esc = NM.util.esc, svg = NM.svg, clamp = NM.util.clamp;

  /* ============================================================
     一、联系人：搜索 / 分组 / 详情 / 呼叫 / 发短信 / 新建 / 删除
     ============================================================ */
  NM.register('contacts', {
    init: function (v) { v.state.q = ''; v.state.sel = null; v.state.adding = false; },
    pages: {
      main: function (v) {
        var q = (v.state.q || '').trim().toLowerCase();
        var list = (S.data.contacts || []).filter(function (c) {
          return !q || (c.n + c.p + (c.tag || '')).toLowerCase().indexOf(q) >= 0;
        });
        var groups = {};
        list.forEach(function (c) { (groups[c.tag || '其他'] = groups[c.tag || '其他'] || []).push(c); });
        var body = '<div class="card contact-me"><span class="avatar-lg">' + svg('person', 26) + '</span>' +
          '<div><b>' + esc(S.settings.accountName) + '</b><small>本机 · 我的名片</small></div></div>' +
          '<div class="set-search"><span>' + svg('search', 17) + '</span>' +
          '<input data-f="ct-q" placeholder="搜索姓名或号码" value="' + esc(v.state.q || '') + '"></div>';
        if (v.state.adding) {
          body += '<div class="card form-card">' +
            '<input data-f="ct-name" placeholder="姓名">' +
            '<input data-f="ct-phone" placeholder="手机号码" type="tel">' +
            '<div class="chip-row">' + ['家人', '同事', '朋友', '其他'].map(function (t) {
              return '<button class="chip ' + ((v.state.tag || '朋友') === t ? 'on' : '') + '" data-a="ct-tag" data-v="' + t + '">' + t + '</button>';
            }).join('') + '</div>' +
            '<div class="form-btns"><button class="pill-btn" data-a="ct-cancel">取消</button>' +
            '<button class="pill-btn primary" data-a="ct-save">保存到本机</button></div></div>';
        }
        Object.keys(groups).forEach(function (g) {
          body += '<div class="section-title">' + esc(g) + ' · ' + groups[g].length + '</div>';
          body += '<div class="card contact-list">' + groups[g].map(function (c) {
            return '<div class="set-row" data-a="ct-open" data-v="' + c.id + '">' +
              '<span class="avatar-sm">' + esc(c.n.slice(0, 1)) + '</span>' +
              '<span class="row-main"><b>' + esc(c.n) + '</b><small>' + esc(c.p) + '</small></span>' +
              svg('chevron', 15) + '</div>';
          }).join('') + '</div>';
        });
        if (!list.length) body += '<div class="empty">没有匹配的联系人</div>';
        return NM.appBar(v, '联系人', '<button data-a="ct-add">' + svg('plus', 20) + '</button>') + body +
          '<div class="set-note">共 ' + (S.data.contacts || []).length + ' 位联系人。拨号与短信都会跳转到对应的系统应用，数据只保存在本机浏览器。</div>' + NM.endBar();
      },
      detail: function (v, p) {
        var c = (S.data.contacts || []).filter(function (x) { return x.id === p.id; })[0];
        if (!c) return NM.appBar(v, '联系人') + '<div class="empty">联系人不存在</div>' + NM.endBar();
        return NM.appBar(v, c.n) +
          '<div class="card contact-me big"><span class="avatar-lg">' + esc(c.n.slice(0, 1)) + '</span>' +
          '<div><b>' + esc(c.n) + '</b><small>' + esc(c.tag || '其他') + '</small></div></div>' +
          '<div class="card"><div class="contact-num"><b>' + esc(c.p) + '</b><small>手机 · 中国</small></div>' +
          '<div class="contact-acts">' +
          '<button data-a="ct-call" data-v="' + c.id + '">' + svg('call', 20) + '<span>呼叫</span></button>' +
          '<button data-a="ct-sms" data-v="' + c.id + '">' + svg('message', 20) + '<span>信息</span></button>' +
          '<button data-a="ct-video" data-v="' + c.id + '">' + svg('camera', 20) + '<span>视频</span></button>' +
          '</div></div>' +
          '<div class="section-title">通话记录</div>' +
          '<div class="card"><div class="set-row"><span class="row-main"><b>暂无通话记录</b>' +
          '<small>拨号后这里会显示记录</small></span></div></div>' +
          '<button class="bar-btn danger" style="width:100%;padding:12px;margin-top:16px" data-a="ct-del" data-v="' + c.id + '">删除联系人</button>' + NM.endBar();
      }
    },
    onPage: function (v) {
      /* 输入时重绘会丢焦点，这里把光标还回去（真机输入法不会中断） */
      if (v.stack[v.stack.length - 1].k === 'main') {
        var el = W.document.querySelector('[data-f=ct-q]');
        if (el && v.state.q) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
      }
    },
    actions: {
      'ct-add': function (v) { v.state.adding = true; NM.renderView(v); },
      'ct-cancel': function (v) { v.state.adding = false; NM.renderView(v); },
      'ct-tag': function (v, t) { v.state.tag = t; NM.renderView(v); },
      'ct-save': function (v) {
        var n = (v.state.ctName || '').trim(), p = (v.state.ctPhone || '').trim();
        if (!n || !p) { NM.island('请填写姓名和号码', 1500); return; }
        S.data.contacts.push({ id: NM.util.uid(), n: n, p: p, tag: v.state.tag || '朋友' });
        v.state.adding = false; v.state.ctName = ''; v.state.ctPhone = '';
        NM.save(); NM.renderView(v); NM.island('联系人已保存', 1400);
      },
      'ct-open': function (v, id) { NM.push('contacts', 'detail', { id: id }); },
      'ct-call': function (v, id) {
        var c = (S.data.contacts || []).filter(function (x) { return x.id === id; })[0]; if (!c) return;
        NM.launchApp('phone'); NM.island('正在呼叫 ' + c.n + ' · ' + c.p, 2200);
        NM.notify('phone', '正在呼叫', c.n + ' · ' + c.p, { silent: true });
      },
      'ct-sms': function (v, id) {
        var c = (S.data.contacts || []).filter(function (x) { return x.id === id; })[0]; if (!c) return;
        NM.launchApp('messages'); NM.island('新建信息 → ' + c.n, 1600);
      },
      'ct-video': function (v) { NM.launchApp('camera'); NM.island('视频通话为模拟功能', 1600); },
      'ct-del': function (v, id) {
        S.data.contacts = (S.data.contacts || []).filter(function (x) { return x.id !== id; });
        NM.save(); v.stack = [{ k: 'main', p: {} }]; NM.renderView(v); NM.island('联系人已删除', 1400);
      }
    },
    onField: function (v, k, val) {
      if (k === 'ct-q') { v.state.q = val; NM.renderView(v); }
      else v.state[k] = val;
    }
  });

  /* ============================================================
     二、健康：步数环 / 心率 / 睡眠 / 一周趋势 / 记录一次运动
     ============================================================ */
  NM.register('health', {
    init: function (v) { v.state.tab = 'today'; },
    pages: {
      main: function (v) {
        var h = S.data.health = S.data.health || { steps: 6432, heart: 72, sleep: 7.2, records: [] };
        var goal = 10000, pct = clamp(h.steps / goal * 100, 0, 100);
        var R = 54, C = 2 * Math.PI * R;
        var week = [6210, 8432, 5120, 9640, 7320, 6432, h.steps];
        var bars = week.map(function (x, i) {
          return '<div class="health-bar"><i style="height:' + clamp(x / 11000 * 100, 4, 100) + '%"></i>' +
            '<small>' + ['一', '二', '三', '四', '五', '六', '日'][i] + '</small></div>';
        }).join('');
        return NM.appBar(v, '健康', '<button data-a="health-add">' + svg('plus', 20) + '</button>') +
          '<div class="card health-ring"><svg viewBox="0 0 140 140" width="150" height="150">' +
          '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="11"/>' +
          '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="url(#hg)" stroke-width="11" stroke-linecap="round" ' +
          'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)) + '" transform="rotate(-90 70 70)"/>' +
          '<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fa8"/><stop offset="1" stop-color="#8ab4ff"/></linearGradient></defs></svg>' +
          '<div class="ring-center"><b>' + h.steps + '</b><small>步 / 目标 ' + goal + '</small></div></div>' +
          '<div class="health-stats">' +
          '<div class="card"><span>' + svg('heart', 18) + '</span><b>' + h.heart + '</b><small>次/分 · 静息心率</small></div>' +
          '<div class="card"><span>' + svg('moon', 18) + '</span><b>' + h.sleep + '</b><small>小时 · 昨夜睡眠</small></div>' +
          '<div class="card"><span>' + svg('bolt', 18) + '</span><b>' + Math.round(h.steps * .04) + '</b><small>千卡 · 活动消耗</small></div>' +
          '</div>' +
          '<div class="section-title">本周步数</div><div class="card health-week">' + bars + '</div>' +
          '<div class="section-title">运动记录</div>' +
          ((h.records || []).length ? '<div class="card">' + h.records.slice().reverse().slice(0, 6).map(function (r) {
            return '<div class="set-row"><span class="row-main"><b>' + esc(r.t) + '</b><small>' + esc(r.d) + '</small></span>' +
              '<b style="color:var(--accent);font-weight:500">' + r.s + ' 步</b></div>';
          }).join('') + '</div>' : '<div class="empty">还没有运动记录<br>点右上角「＋」记录一次散步</div>') +
          '<div class="set-note">健康数据为本地模拟，不会调用计步器、心率传感器或任何真实健康数据。</div>' + NM.endBar();
      }
    },
    actions: {
      'health-add': function (v) {
        var h = S.data.health; var add = 1200 + Math.floor(Math.random() * 1800);
        h.steps += add; h.heart = 68 + Math.floor(Math.random() * 14);
        (h.records = h.records || []).push({
          id: NM.util.uid(), t: '户外步行', d: new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (add / 1000).toFixed(1) + ' 公里', s: add
        });
        NM.save(); NM.renderView(v); NM.island('已记录 ' + add + ' 步', 1600);
      }
    }
  });

  /* ============================================================
     三、钱包：余额 / 交通卡 / 银行卡 / 账单 / 模拟支付
     ============================================================ */
  NM.register('wallet', {
    init: function (v) { v.state.tab = 'card'; },
    pages: {
      main: function (v) {
        var w = S.data.wallet = S.data.wallet || { balance: 238.5, transit: 0, cards: 2, bills: [] };
        return NM.appBar(v, '钱包', '<button data-a="wallet-nfc">' + svg('settings', 19) + '</button>') +
          '<div class="wallet-hero glass"><small>MUOS 支付余额</small><b>¥ ' + w.balance.toFixed(2) + '</b>' +
          '<div class="wallet-btns"><button data-a="wallet-pay">付款码</button><button data-a="wallet-topup">充值</button></div></div>' +
          '<div class="section-title">卡包 · ' + (w.cards + 1) + ' 张</div>' +
          '<div class="wallet-card transit"><span>MUOS 交通卡</span><b>¥ ' + w.transit.toFixed(2) + '</b>' +
          '<small>公交 / 地铁 · ' + (S.settings.nfc ? 'NFC 已开启' : 'NFC 已关闭') + '</small></div>' +
          '<div class="wallet-card bank"><span>储蓄卡 · **** 2026</span><b>MUOS BANK</b><small>已绑定 · 默认支付卡</small></div>' +
          '<div class="section-title">最近交易</div>' +
          ((w.bills || []).length ? '<div class="card">' + w.bills.slice().reverse().slice(0, 8).map(function (b) {
            return '<div class="set-row"><span class="row-main"><b>' + esc(b.t) + '</b><small>' + esc(b.d) + '</small></span>' +
              '<b style="font-weight:500;color:' + (b.v > 0 ? 'var(--ok)' : 'var(--text)') + '">' +
              (b.v > 0 ? '+' : '−') + '¥' + Math.abs(b.v).toFixed(2) + '</b></div>';
          }).join('') + '</div>' : '<div class="empty">暂无交易记录</div>') +
          '<div class="set-note">钱包为纯前端模拟，不涉及真实账户、银行卡或支付接口；NFC 开关与系统设置联动。</div>' + NM.endBar();
      }
    },
    actions: {
      'wallet-pay': function (v) {
        if (!S.settings.nfc) { NM.island('请先在设置中开启 NFC', 1800); return; }
        var w = S.data.wallet, cost = +(8 + Math.random() * 22).toFixed(2);
        if (w.balance < cost) { NM.island('余额不足，请先充值', 1600); return; }
        w.balance -= cost;
        (w.bills = w.bills || []).push({ t: '便捷支付 · 模拟商户', d: '刚刚 · NFC 付款', v: -cost });
        NM.save(); NM.renderView(v); NM.notify('wallet', '支付成功', '已支付 ¥' + cost.toFixed(2) + '，余额 ¥' + w.balance.toFixed(2));
      },
      'wallet-topup': function (v) {
        var w = S.data.wallet; w.balance += 100;
        (w.bills = w.bills || []).push({ t: '余额充值', d: '刚刚 · 模拟充值', v: 100 });
        NM.save(); NM.renderView(v); NM.island('已充值 ¥100.00', 1500);
      },
      'wallet-nfc': function (v) {
        S.settings.nfc = !S.settings.nfc; NM.save(); NM.renderView(v);
        NM.island('NFC 已' + (S.settings.nfc ? '开启' : '关闭'), 1500);
      }
    }
  });

  /* ============================================================
     四、超级助手：本地意图识别，能真的打开应用 / 改设置 / 查天气
     灵感来自小布空间、小艺、蓝心小V、Siri 的「一句话办一件事」
     ============================================================ */
  var QUICK = [
    { t: '今天天气', q: '今天天气怎么样' },
    { t: '打开相机', q: '打开相机' },
    { t: '开启深色模式', q: '开启深色模式' },
    { t: '还有多少电', q: '还有多少电' },
    { t: '放首歌', q: '播放音乐' },
    { t: '清理后台', q: '清理后台' }
  ];
  NM.register('assistant', {
    init: function (v) { v.state.draft = ''; if (!S.data.aiHistory) S.data.aiHistory = []; },
    pages: {
      main: function (v) {
        var hist = S.data.aiHistory || [];
        return NM.appBar(v, '超级助手') +
          '<div class="ai-hero glass"><span class="ai-orb">' + svg('assistant', 30) + '</span>' +
          '<div><b>你好，' + esc(S.settings.accountName) + '</b><small>我可以帮你打开应用、改设置、查信息</small></div></div>' +
          '<div class="section-title">试试这样问我</div><div class="quick-rows">' + QUICK.map(function (x) {
            return '<button class="chip" data-a="ai-ask" data-v="' + esc(x.q) + '">' + esc(x.t) + '</button>';
          }).join('') + '</div>' +
          '<div class="section-title">对话</div>' +
          '<div class="ai-chat" id="ai-chat">' + (hist.length ? hist.slice(-12).map(function (m) {
            return '<div class="ai-msg ' + (m.who === 'me' ? 'me' : '') + '"><span>' + esc(m.text) + '</span></div>';
          }).join('') : '<div class="empty">还没有对话<br>点上面的快捷问题，或在下方输入</div>') + '</div>' +
          '<div class="ai-input"><input data-f="ai-q" placeholder="给超级助手发消息" value="' + esc(v.state.draft || '') + '">' +
          '<button data-a="ai-send">' + svg('send', 19) + '</button></div>' +
          '<div class="set-note">所有回答由本地规则生成，不会联网、不会上传任何内容。对话记录保存在本机浏览器。</div>' + NM.endBar();
      }
    },
    onPage: function (v) {
      var box = W.document.getElementById('ai-chat');
      if (box) box.scrollTop = box.scrollHeight;
      var inp = W.document.querySelector('[data-f=ai-q]');
      if (inp && v.state._typing) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} }
    },
    actions: {
      'ai-ask': function (v, q) { aiSend(v, q); },
      'ai-send': function (v) { aiSend(v, v.state.draft || ''); }
    },
    onField: function (v, k, val) { if (k === 'ai-q') { v.state.draft = val; v.state._typing = true; } }
  });

  function aiSend(v, q) {
    q = (q || '').trim(); if (!q) return;
    v.state._typing = false;
    var H = S.data.aiHistory = S.data.aiHistory || [];
    H.push({ who: 'me', text: q, ts: Date.now() });
    var reply = aiReply(q);
    H.push({ who: 'ai', text: reply, ts: Date.now() });
    if (H.length > 60) H.splice(0, H.length - 60);
    v.state.draft = '';
    NM.save(); NM.renderView(v);
  }
  function aiReply(q) {
    var s = q.toLowerCase(), st = S.settings;
    var w = NM.weatherNow();
    var appMap = { '相机': 'camera', '相册': 'photos', '天气': 'weather', '时钟': 'clock', '日历': 'calendar',
      '计算器': 'calculator', '笔记': 'notes', '音乐': 'music', '设置': 'settings', '浏览器': 'browser',
      '文件': 'files', '联系人': 'contacts', '健康': 'health', '钱包': 'wallet', '地图': 'maps', '电话': 'phone', '信息': 'messages' };
    for (var name in appMap) {
      if (s.indexOf('打开' + name.toLowerCase()) >= 0 || s.indexOf('open ' + name) >= 0) {
        var id = appMap[name];
        W.setTimeout(function () { NM.launchApp(id); }, 120);
        return '好的，正在为你打开「' + name + '」。';
      }
    }
    if (s.indexOf('天气') >= 0) return '北京现在 ' + w.desc + '，' + w.temp + '°C，最高 ' + w.hi + '° / 最低 ' + w.lo + '°，空气质量 ' + w.aqi + ' AQI。';
    if (s.indexOf('电') >= 0 || s.indexOf('battery') >= 0) return '当前电量 ' + Math.round(S.battery) + '%' + (S.charging ? '，正在充电。' : '。') + (S.settings.lowpower ? '省电模式已开启。' : '');
    if (s.indexOf('时间') >= 0 || s.indexOf('几点') >= 0) return '现在是 ' + NM.util.hhmm(new Date()) + '，' + NM.util.fullDate(new Date()) + '。';
    if (s.indexOf('播放音乐') >= 0 || s.indexOf('放首歌') >= 0) { W.setTimeout(function () { NM.launchApp('music'); }, 120); return '好的，正在打开音乐。'; }
    if (s.indexOf('深色') >= 0 || s.indexOf('dark') >= 0) { st.theme = st.theme === 'dark' ? 'light' : 'dark'; NM.applySettings(); NM.save(); return '已切换为' + (st.theme === 'dark' ? '深色' : '浅色') + '模式，状态栏与所有界面已同步。'; }
    if (s.indexOf('wifi') >= 0 || s.indexOf('无线') >= 0) { NM.toggleTile('wifi'); return 'Wi-Fi 已' + (st.wifi ? '开启' : '关闭') + '。'; }
    if (s.indexOf('蓝牙') >= 0) { NM.toggleTile('bluetooth'); return '蓝牙已' + (st.bluetooth ? '开启' : '关闭') + '。'; }
    if (s.indexOf('清理后台') >= 0 || s.indexOf('内存') >= 0) {
      var n = S.tasks.length; S.tasks.slice().forEach(function (id) { if (id !== 'assistant') NM.killApp(id, true); });
      return '已结束 ' + Math.max(0, n - 1) + ' 个后台任务，保留当前会话。';
    }
    if (s.indexOf('备忘录') >= 0 || s.indexOf('笔记') >= 0) return '你有 ' + (S.data.notes || []).length + ' 条笔记。说「打开笔记」我帮你跳过去。';
    if (s.indexOf('步') >= 0 || s.indexOf('健康') >= 0) return '今天已走 ' + ((S.data.health || {}).steps || 0) + ' 步，心率 ' + ((S.data.health || {}).heart || 72) + ' 次/分。';
    if (s.indexOf('你好') >= 0 || s.indexOf('hello') >= 0) return '你好！我是 MUOS 超级助手。可以让我打开应用、切换设置、查天气和电量。';
    return '我可以帮你：打开任意应用、查天气 / 时间 / 电量 / 步数、切换深色模式与 Wi-Fi、清理后台。试着说「打开相机」或「今天天气」。';
  }
})(window);
