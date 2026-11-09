/* ============================================================
   MUOS — 30-more-apps.js (1/2)
   日历 / 设置 / 浏览器 / 音乐 / 文件
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, esc = NM.util.esc, svg = NM.svg, pad = NM.util.pad, clamp = NM.util.clamp;

  /* ============================================================
     日历：月视图 / 选中日期 / 日程
     ============================================================ */
  NM.register('calendar', {
    init: function (v) {
      var d = new Date();
      v.state.y = d.getFullYear(); v.state.m = d.getMonth(); v.state.sel = d.getDate();
      if (!S.data.events) S.data.events = [];
    },
    pages: {
      main: function (v) {
        var y = v.state.y, m = v.state.m, sel = v.state.sel;
        var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
        var prevDays = new Date(y, m, 0).getDate();
        var cells = [];
        for (var i = first - 1; i >= 0; i--) cells.push({ d: prevDays - i, dim: true });
        for (var j = 1; j <= days; j++) cells.push({ d: j, dim: false });
        while (cells.length % 7) cells.push({ d: cells.length - first - days + 1, dim: true });
        var today = new Date();
        var grid = ['日','一','二','三','四','五','六'].map(function (w) { return '<div class="cal-cell week">' + w + '</div>'; }).join('') +
          cells.map(function (c) {
            var isToday = !c.dim && y === today.getFullYear() && m === today.getMonth() && c.d === today.getDate();
            var hasEv = !c.dim && (S.data.events || []).some(function (e) { return e.y === y && e.m === m && e.d === c.d; });
            return '<div class="cal-cell ' + (c.dim ? 'dim ' : '') + (isToday ? 'today ' : '') +
              (!c.dim && sel === c.d ? 'sel ' : '') + (hasEv ? 'has' : '') + '" ' +
              (c.dim ? '' : 'data-a="cal-pick" data-v="' + c.d + '"') + '>' + c.d + '</div>';
          }).join('');
        var evs = (S.data.events || []).filter(function (e) { return e.y === y && e.m === m && e.d === sel; });
        return NM.appBar(v, '日历', '<button class="bar-btn" data-a="cal-today">今天</button>') +
          '<div class="cal-head"><button class="bar-btn" data-a="cal-prev">' + svg('back', 15) + '</button>' +
          '<b>' + y + ' 年 ' + (m + 1) + ' 月</b><button class="bar-btn" data-a="cal-next">' + svg('chevron', 15) + '</button></div>' +
          '<div class="card"><div class="cal-grid">' + grid + '</div></div>' +
          '<div class="section-title">' + (m + 1) + ' 月 ' + sel + ' 日 · 日程 ' + evs.length + ' 项</div>' +
          (evs.length ? evs.map(function (e) {
            return '<div class="row" style="margin-bottom:8px;border-radius:14px"><span class="row-main"><b>' + esc(e.t) + '</b><small>' + esc(e.time) + '</small></span>' +
              '<button data-a="cal-del" data-v="' + e.id + '">' + svg('trash', 16) + '</button></div>';
          }).join('') : '<div class="empty" style="padding:24px">这一天还没有日程</div>') +
          '<div style="display:flex;gap:8px;margin-top:8px"><input data-f="cal-ev" placeholder="添加日程标题" ' +
          'style="flex:1;padding:11px 13px;border-radius:12px;background:var(--surface-2);border:1px solid var(--stroke);font-size:13px">' +
          '<button class="pill-btn" data-a="cal-add">添加</button></div>' + NM.endBar();
      }
    },
    actions: {
      'cal-prev': function (v) { v.state.m--; if (v.state.m < 0) { v.state.m = 11; v.state.y--; } v.state.sel = 1; NM.renderView(v); },
      'cal-next': function (v) { v.state.m++; if (v.state.m > 11) { v.state.m = 0; v.state.y++; } v.state.sel = 1; NM.renderView(v); },
      'cal-today': function (v) { var d = new Date(); v.state.y = d.getFullYear(); v.state.m = d.getMonth(); v.state.sel = d.getDate(); NM.renderView(v); },
      'cal-pick': function (v, d) { v.state.sel = +d; NM.renderView(v); },
      'cal-add': function (v) {
        var t = (v.state.calEv || '').trim(); if (!t) return;
        (S.data.events = S.data.events || []).push({ id: NM.util.uid(), y: v.state.y, m: v.state.m, d: v.state.sel, t: t, time: '全天' });
        v.state.calEv = ''; NM.save(); NM.renderView(v);
        NM.notify('calendar', '日程已添加', (v.state.m + 1) + '月' + v.state.sel + '日 · ' + t, { silent: true });
      },
      'cal-del': function (v, id) { S.data.events = S.data.events.filter(function (e) { return e.id !== id; }); NM.save(); NM.renderView(v); }
    },
    onField: function (v, k, val) { if (k === 'cal-ev') v.state.calEv = val; }
  });

  /* ============================================================
     设置：每个开关都真实写入并立刻生效
     ============================================================ */
  var SET_GROUPS = [
    { k: 'display', i: 'brightness', t: '显示与亮度', s: '深色模式、亮度、字体、动画' },
    { k: 'sound', i: 'volume', t: '声音与触感', s: '媒体音量、系统提示' },
    { k: 'wall', i: 'palette', t: '壁纸与主题', s: '4 套内置壁纸' },
    { k: 'nav', i: 'sliders', t: '系统导航', s: '全面屏手势 / 经典三键' },
    { k: 'security', i: 'lock', t: '隐私与安全', s: '锁屏密码、自动锁屏' },
    { k: 'batterySet', i: 'battery', t: '电池与省电', s: '电量、充电、自动锁屏' },
    { k: 'about', i: 'info', t: '关于本机', s: '版本、硬件、运行状态' }
  ];
  NM.register('settings', {
    init: function (v) { v.state.pinNew = ''; },
    pages: {
      main: function (v) {
        return NM.appBar(v, '设置') +
          '<div class="settings-hero"><span class="avatar">' + svg('cube', 26) + '</span>' +
          '<div><b>MUOS 设备</b><small>MUOS 1.0.1 · 已登录本机账户</small></div></div>' +
          SET_GROUPS.map(function (g) {
            return '<div class="row" style="margin-bottom:9px;border-radius:16px" data-a="set-page" data-v="' + g.k + '">' +
              '<span style="width:30px;height:30px;border-radius:9px;background:var(--surface);display:grid;place-items:center">' + svg(g.i, 17) + '</span>' +
              '<span class="row-main"><b>' + g.t + '</b><small>' + g.s + '</small></span>' + svg('chevron', 16) + '</div>';
          }).join('') +
          '<div class="section-title">维护</div>' +
          '<button class="bar-btn" style="width:100%;padding:13px;margin-bottom:8px" data-a="set-reset">恢复出厂设置</button>' + NM.endBar();
      },
      display: function (v) {
        var st = S.settings;
        return NM.appBar(v, '显示与亮度') +
          '<div class="card"><div class="row-main"><b>外观</b><small>切换后全局立即生效</small></div>' +
          '<div class="segmented" style="margin-top:12px">' +
          ['dark', 'light'].map(function (t) {
            return '<button class="' + (st.theme === t ? 'on' : '') + '" data-a="set-theme" data-v="' + t + '">' + (t === 'dark' ? '深色' : '浅色') + '</button>';
          }).join('') + '</div></div>' +
          '<div class="section-title">亮度</div><div class="slider-row">' + svg('brightness', 19) +
          '<input type="range" min="15" max="100" value="' + st.brightness + '" data-f="brightness"><b>' + st.brightness + '%</b></div>' +
          '<div class="section-title">字体大小</div><div class="card"><div class="segmented">' +
          [[.9, '小'], [1, '标准'], [1.12, '大']].map(function (f) {
            return '<button class="' + (Math.abs(st.fontScale - f[0]) < .01 ? 'on' : '') + '" data-a="set-font" data-v="' + f[0] + '">' + f[1] + '</button>';
          }).join('') + '</div></div>' +
          '<div class="section-title">系统动画</div><div class="row" style="border-radius:16px"><span class="row-main"><b>界面动画</b><small>关闭后所有过渡立即完成</small></span>' +
          '<span class="toggle ' + (st.animations ? 'on' : '') + '" data-a="set-anim"></span></div>' + NM.endBar();
      },
      sound: function (v) {
        var st = S.settings;
        return NM.appBar(v, '声音与触感') + '<div class="section-title">媒体音量</div>' +
          '<div class="slider-row">' + svg('volume', 19) + '<input type="range" min="0" max="100" value="' + st.volume + '" data-f="volume"><b>' + st.volume + '%</b></div>' +
          '<div class="section-title">提示音</div><div class="row" style="border-radius:16px"><span class="row-main"><b>播放测试音</b><small>音量会跟随上方设置</small></span>' +
          '<button class="bar-btn" data-a="test-beep">播放</button></div>' +
          '<div class="section-title">勿扰</div><div class="row" style="border-radius:16px"><span class="row-main"><b>勿扰模式</b><small>通知静默入库，不弹横幅</small></span>' +
          '<span class="toggle ' + (st.dnd ? 'on' : '') + '" data-a="set-toggle" data-v="dnd"></span></div>' + NM.endBar();
      },
      wall: function (v) {
        var st = S.settings;
        return NM.appBar(v, '壁纸与主题') + '<div class="section-title">选择壁纸</div>' +
          '<div class="wall-picks">' + [['nebula','星云'],['aurora','极光'],['sunset','日落'],['mono','石墨']].map(function (w) {
            return '<button class="wall-pick ' + w[0] + ' ' + (st.wall === w[0] ? 'on' : '') + '" data-a="set-wall" data-v="' + w[0] + '"><i></i></button>';
          }).join('') + '</div>' +
          '<div class="card" style="margin-top:18px"><div class="row-main"><b>当前壁纸</b><small>' +
          ({ nebula: '星云', aurora: '极光', sunset: '日落', mono: '石墨' })[st.wall] + ' · 壁纸会同步应用到锁屏与主屏</small></div></div>' + NM.endBar();
      },
      nav: function (v) {
        var st = S.settings;
        return NM.appBar(v, '系统导航') + '<div class="section-title">导航方式</div><div class="card"><div class="segmented">' +
          [['gesture','全面屏手势'], ['buttons','经典三键']].map(function (n) {
            return '<button class="' + (st.nav === n[0] ? 'on' : '') + '" data-a="set-nav" data-v="' + n[0] + '">' + n[1] + '</button>';
          }).join('') + '</div></div>' +
          '<div class="section-title">手势说明</div><div class="card" style="font-size:12px;line-height:2;color:var(--muted)">' +
          '底部上滑 → 回到主屏<br>底部上滑并停顿 → 多任务<br>屏幕左边缘右滑 → 返回上一级<br>顶部左/右下拉 → 通知 / 控制中心</div>' +
          '<div class="card" style="font-size:12px;line-height:2;color:var(--muted)">三键模式下，底部会出现「最近任务 / 主屏 / 返回」三个按钮，行为与手势一致。</div>' + NM.endBar();
      },
      security: function (v) {
        var st = S.settings;
        return NM.appBar(v, '隐私与安全') +
          '<div class="row" style="border-radius:16px;margin-bottom:12px"><span class="row-main"><b>锁屏密码</b><small>上滑后需要输入 4 位数字</small></span>' +
          '<span class="toggle ' + (st.pinOn ? 'on' : '') + '" data-a="set-toggle" data-v="pinOn"></span></div>' +
          '<div class="section-title">修改密码</div><div class="card">' +
          '<input data-f="pin-new" type="tel" maxlength="4" placeholder="输入 4 位新密码" value="' + esc(v.state.pinNew) + '" ' +
          'style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid var(--stroke);font-size:16px;letter-spacing:6px">' +
          '<div style="font-size:11px;color:var(--muted);margin-top:10px">当前密码：' + esc(st.pin) + '</div>' +
          '<button class="pill-btn" style="margin-top:12px" data-a="set-pin-save">保存密码</button></div>' +
          '<div class="section-title">自动锁屏</div><div class="card"><div class="segmented" style="flex-wrap:wrap">' +
          [[30,'30 秒'],[60,'1 分钟'],[300,'5 分钟'],[0,'永不']].map(function (o) {
            return '<button style="flex:none;width:48%" class="' + (st.autolock === o[0] ? 'on' : '') + '" data-a="set-autolock" data-v="' + o[0] + '">' + o[1] + '</button>';
          }).join('') + '</div></div>' + NM.endBar();
      },
      batterySet: function (v) {
        return NM.appBar(v, '电池与省电') +
          '<div class="card" style="text-align:center;padding:24px"><div style="font-size:52px;font-weight:200">' + Math.round(S.battery) + '%</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:6px">' + (S.charging ? '正在充电' : '未连接充电器') + '</div></div>' +
          '<div class="row" style="border-radius:16px;margin-top:12px"><span class="row-main"><b>模拟插入充电器</b><small>电量会随时间回升，状态栏出现充电标记</small></span>' +
          '<span class="toggle ' + (S.charging ? 'on' : '') + '" data-a="set-charging"></span></div>' +
          '<div class="row" style="border-radius:16px;margin-top:9px"><span class="row-main"><b>省电模式</b><small>降低亮度、减缓耗电、关闭动画</small></span>' +
          '<span class="toggle ' + (S.settings.lowpower ? 'on' : '') + '" data-a="set-lowpower"></span></div>' + NM.endBar();
      },
      about: function (v) { return NM.aboutHTML(v); }
    },
    actions: {
      'set-page': function (v, k) { NM.push('settings', k); },
      'set-theme': function (v, t) { S.settings.theme = t; NM.applySettings(); NM.save(); NM.renderView(v); },
      'set-font': function (v, f) { S.settings.fontScale = +f; NM.applySettings(); NM.save(); NM.renderView(v); },
      'set-anim': function (v) { S.settings.animations = !S.settings.animations; NM.applySettings(); NM.save(); NM.renderView(v); },
      'set-wall': function (v, w) { S.settings.wall = w; NM.applySettings(); NM.save(); NM.renderView(v); NM.island('壁纸已更换', 1200); },
      'set-nav': function (v, n) { S.settings.nav = n; NM.applySettings(); NM.save(); NM.renderView(v); NM.island(n === 'buttons' ? '已切换为三键导航' : '已切换为全面屏手势', 1600); },
      'set-toggle': function (v, k) { S.settings[k] = !S.settings[k]; NM.applySettings(); NM.save(); NM.renderView(v); NM.emit('settings'); },
      'set-autolock': function (v, n) { S.settings.autolock = +n; NM.save(); NM.renderView(v); },
      'set-charging': function (v) { S.charging = !S.charging; NM.renderStatusBarIcons(); NM.renderView(v); NM.island(S.charging ? '已连接充电器' : '已断开充电器', 1400); },
      'set-lowpower': function (v) { NM.toggleTile('lowpower'); NM.renderView(v); },
      'set-pin-save': function (v) {
        var p = (v.state.pinNew || '').trim();
        if (!/^\d{4}$/.test(p)) { NM.island('请输入 4 位数字', 1600); return; }
        S.settings.pin = p; NM.save(); NM.island('锁屏密码已更新', 1600); NM.renderView(v);
      },
      'test-beep': function () { NM.beep(); NM.island('测试音已播放', 1100); },
      'set-reset': function () {
        NM.dialog('恢复出厂设置', '将清除本机所有备忘录、照片、通话记录与设置，且无法撤销。',
          [{ t: '确认重置', a: 'do-reset', primary: true }, { t: '取消', a: 'close-dialog' }]);
      }
    },
    onField: function (v, k, val) { if (k === 'pin-new') v.state.pinNew = val; }
  });
  NM.aboutHTML = function (v) {
    var up = Math.floor((Date.now() - S.bootAt) / 1000);
    var mem = (W.performance && W.performance.memory) ? (W.performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : '不可用';
    var rows = [
      ['设备名称', 'MUOS Device'], ['系统版本', 'MUOS 1.0.1'], ['内核构建', 'Build 20261108 · Web'],
      ['屏幕', W.innerWidth + ' × ' + W.innerHeight + ' @ ' + (W.devicePixelRatio || 1) + 'x'],
      ['本次运行', Math.floor(up / 3600) + ' 时 ' + Math.floor(up / 60) % 60 + ' 分 ' + up % 60 + ' 秒'],
      ['后台任务', S.tasks.length + ' 个 / 上限 6 个'], ['通知', S.notifications.length + ' 条'],
      ['JS 堆占用', mem], ['电池', Math.round(S.battery) + '%' + (S.charging ? ' · 充电中' : '')],
      ['存储', JSON.stringify(S.data).length + ' 字节用户数据']
    ];
    return NM.appBar(v, '关于本机') +
      '<div class="card" style="text-align:center;padding:22px"><div class="boot-logo" style="margin:0 auto 12px;width:58px;height:58px;border-radius:16px"><div class="boot-mark" style="transform:scale(.7)"></div></div>' +
      '<b style="font-size:17px;font-weight:500">MUOS 1.0.1</b><div style="font-size:11px;color:var(--muted);margin-top:4px">浏览器里的移动操作系统模拟</div></div>' +
      '<div class="card" style="padding:4px 14px">' + rows.map(function (r) {
        return '<div class="forecast-row"><span style="color:var(--muted)">' + r[0] + '</span><b style="margin-left:auto;font-weight:400">' + esc(r[1]) + '</b></div>';
      }).join('') + '</div>' +
      '<div class="card" style="font-size:11px;line-height:1.8;color:var(--muted)">MUOS 是纯前端的教学演示系统，不会访问你的摄像头、相册、通讯录或任何真实数据。所有内容保存在当前浏览器的本地存储中。</div>' + NM.endBar();
  };

  /* ============================================================
     浏览器：真实网页浏览（iframe）+ 内置 muos:// 页面 + 书签
     · 地址栏可输入任意网址，自动补 https://
     · 词组输入＝搜索引擎新标签打开（大站禁止内嵌，无法 iframe）
     · 部分网站发送 X-Frame-Options 拒绝内嵌 → 提供一键新标签打开
     ============================================================ */
  var BPAGES = {
    'muos://home': { t: 'MUOS 首页', tiles: [
      ['开始使用', '解锁后上滑即可回到主屏'], ['控制中心', '从状态栏右侧下拉'],
      ['多任务', '底部上滑并停顿'], ['系统设置', '所有开关都会真实生效'],
      ['应用管理', '查看运行状态与强制停止'], ['关于本机', '查看模拟环境信息'] ] },
    'muos://news': { t: '今日速览', tiles: [
      ['MUOS 1.0.1 发布', '新增应用生命周期与后台保活'], ['手势导航', '支持全面屏手势与三键切换'],
      ['通知中心', '支持横幅、锁屏与勿扰静默'], ['本地存储', '设置与数据保存在浏览器内'] ] },
    'muos://help': { t: '使用帮助', tiles: [
      ['解锁', '锁屏向上滑动'], ['回主屏', '底部上滑'], ['多任务', '上滑停顿'],
      ['关机', '长按机身右侧电源键'], ['息屏', '短按电源键或等待自动锁屏'] ] }
  };
  /* 允许被 iframe 嵌入的演示站点（大站大多禁止内嵌） */
  var BQUICK = [
    ['示例网站', 'https://example.com'],
    ['开放地图', 'https://www.openstreetmap.org/export/embed.html?bbox=116.2%2C39.8%2C116.6%2C40.05&layer=mapnik'],
    ['维基百科', 'https://www.wikipedia.org'],
    ['WhatIsMyIP', 'https://api.ipify.org?format=json']
  ];
  function normUrl(input) {
    var s = (input || '').trim();
    if (!s) return '';
    if (s.indexOf('muos://') === 0) return s;
    if (/^https:\/\//i.test(s)) return s;
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, 'https://'); /* https 页面禁嵌 http，自动升级 */
    /* 含域名特征 → 当网址；否则当搜索词（新标签打开搜索） */
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#].*)?$/i.test(s)) return 'https://' + s;
    return '';
  }
  NM.register('browser', {
    init: function (v) {
      v.state.url = 'muos://home';
      v.state.stack = ['muos://home']; v.state.idx = 0;
    },
    pages: {
      main: function (v) {
        var net = !S.settings.airplane && (S.settings.wifi || S.settings.cellular);
        var st = v.state, internal = BPAGES[st.url];
        var canBack = st.idx > 0, canFwd = st.idx < st.stack.length - 1;
        var bar =
          '<div class="browser-bar" style="margin:-14px -16px 0;padding:9px 12px">' +
          '<button data-a="br-back" title="后退" style="' + (canBack ? '' : 'opacity:.35') + '">' + svg('back', 15) + '</button>' +
          '<button data-a="br-fwd" title="前进" style="' + (canFwd ? '' : 'opacity:.35') + '">' + svg('chevron', 15) + '</button>' +
          '<input data-f="br-url" value="' + esc(st.brUrl || st.url) + '" placeholder="输入网址或搜索词">' +
          '<button data-a="br-go">前往</button>' +
          '<button data-a="br-newtab" title="在新标签页打开">' + svg('link', 15) + '</button>' +
          '</div>';
        if (!net) {
          return NM.appBar(v, '浏览器', '<button class="bar-btn" data-a="br-bookmark">' + svg('bookmark', 14) + '</button>') + bar +
            '<div class="browser-page"><div class="bp-offline">' + svg('wifi', 40) +
            '<div style="margin:14px 0;font-size:15px;color:var(--text)">无法连接到网络</div>' +
            '飞行模式已开启或 WiFi 与移动数据均已关闭。<br>请到控制中心打开网络后重试。</div></div>' + NM.endBar();
        }
        var content;
        if (internal) {
          content = '<div class="bp-hero"><b>' + esc(internal.t) + '</b><small>MUOS 内置页面</small></div>' +
            '<div class="bp-tiles">' + internal.tiles.map(function (t) {
              return '<div class="bp-tile"><b>' + esc(t[0]) + '</b><small>' + esc(t[1]) + '</small></div>';
            }).join('') + '</div>' +
            '<div class="section-title">快速访问（真实网站）</div><div class="bp-tiles">' +
            BQUICK.map(function (q) {
              return '<div class="bp-tile" data-a="br-open" data-v="' + esc(q[1]) + '"><b>' + esc(q[0]) + '</b><small>' + esc(q[1]) + '</small></div>';
            }).join('') + '</div>' +
            '<div class="section-title">书签 ' + (S.data.bookmarks || []).length + '</div>' +
            ((S.data.bookmarks || []).length ? (S.data.bookmarks || []).map(function (u) {
              return '<div class="row" style="margin-bottom:8px;border-radius:14px" data-a="br-open" data-v="' + esc(u) + '">' +
                svg('link', 17) + '<span class="row-main"><b>' + esc(u) + '</b></span></div>';
            }).join('') : '<div class="empty" style="padding:20px">浏览网页时点右上角书签图标收藏</div>');
        } else {
          content = '<div class="bp-note">部分网站（如百度 / Google / B 站）禁止被嵌入网页显示；若下方空白，点右上角 ↗ 在新标签页打开。</div>' +
            '<div class="browser-frame"><iframe src="' + esc(st.url) + '" referrerpolicy="no-referrer" allowfullscreen></iframe></div>';
        }
        return NM.appBar(v, '浏览器', '<button class="bar-btn" data-a="br-bookmark">' + svg('bookmark', 14) + '</button>') + bar +
          '<div class="browser-page">' + content + '</div>' + NM.endBar();
      }
    },
    actions: {
      'br-go': function (v) {
        var raw = (v.state.brUrl || '').trim();
        var url = normUrl(raw);
        if (!url) { /* 不是网址 → 新标签打开搜索 */
          if (raw) W.open('https://www.bing.com/search?q=' + encodeURIComponent(raw), '_blank');
          NM.island(raw ? '已在系统浏览器打开搜索' : '请输入网址', 1400);
          return;
        }
        var st = v.state;
        st.stack = st.stack.slice(0, st.idx + 1);
        st.stack.push(url); st.idx = st.stack.length - 1;
        st.url = url; st.brUrl = url;
        NM.renderView(v);
      },
      'br-back': function (v) {
        var st = v.state;
        if (st.idx > 0) { st.idx--; st.url = st.stack[st.idx]; st.brUrl = st.url; NM.renderView(v); }
      },
      'br-fwd': function (v) {
        var st = v.state;
        if (st.idx < st.stack.length - 1) { st.idx++; st.url = st.stack[st.idx]; st.brUrl = st.url; NM.renderView(v); }
      },
      'br-newtab': function (v) {
        var u = v.state.url;
        if (u.indexOf('muos://') === 0) { NM.island('内置页面无需新标签', 1300); return; }
        W.open(u, '_blank'); NM.island('已在系统浏览器打开', 1300);
      },
      'br-reload': function (v) { NM.renderView(v); },
      'br-open': function (v, u) {
        var st = v.state;
        st.stack = st.stack.slice(0, st.idx + 1);
        st.stack.push(u); st.idx = st.stack.length - 1;
        st.url = u; st.brUrl = u;
        NM.renderView(v);
      },
      'br-bookmark': function (v) {
        S.data.bookmarks = S.data.bookmarks || [];
        if (S.data.bookmarks.indexOf(v.state.url) < 0) S.data.bookmarks.push(v.state.url);
        NM.save(); NM.renderView(v); NM.island('已添加到书签', 1200);
      }
    },
    onField: function (v, k, val) { if (k === 'br-url') v.state.brUrl = val; }
  });

  /* ============================================================
     音乐：WebAudio 合成旋律，切后台继续播放，音量跟随系统
     ============================================================ */
  NM.SONGS = [
    { title: '星轨序曲', artist: 'MUOS Studio', dur: 96, scale: [523, 587, 659, 784, 659, 587, 523, 440] },
    { title: '午夜信号', artist: 'MUOS Studio', dur: 84, scale: [392, 440, 523, 440, 349, 392, 440, 330] },
    { title: '缓慢旋转', artist: 'MUOS Studio', dur: 108, scale: [659, 622, 587, 523, 587, 659, 784, 880] }
  ];
  NM.tone = function (freq) {
    try {
      var AC = W.AudioContext || W.webkitAudioContext; if (!AC) return;
      if (!NM._ac) NM._ac = new AC();
      var ctx = NM._ac, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      var vol = (S.settings.volume / 100) * .075;
      g.gain.setValueAtTime(.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), ctx.currentTime + .03);
      g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .48);
      o.start(); o.stop(ctx.currentTime + .5);
    } catch (e) { /* 静默 */ }
  };
  NM.musicTick = function () {
    var m = S.music;
    if (!m.playing) return;
    var song = NM.SONGS[m.idx];
    m.pos += .5;
    if (m.pos >= song.dur) { NM.musicNext(true); return; }
    NM.tone(song.scale[Math.floor(m.pos / .5) % song.scale.length]);
    NM.emit('music-tick');
  };
  NM.musicPlay = function () { S.music.playing = true; NM.emit('music-tick'); NM.island('开始播放', 1100); };
  NM.musicPause = function () { S.music.playing = false; NM.emit('music-tick'); NM.island('已暂停', 1100); };
  NM.musicNext = function (auto) {
    S.music.idx = (S.music.idx + 1) % NM.SONGS.length; S.music.pos = 0;
    NM.emit('music-tick'); if (!auto) NM.island('下一首', 1100);
  };
  NM.musicPrev = function () {
    S.music.idx = (S.music.idx - 1 + NM.SONGS.length) % NM.SONGS.length; S.music.pos = 0;
    NM.emit('music-tick');
  };
  var fmtSec = function (s) { return pad(Math.floor(s / 60)) + ':' + pad(Math.floor(s % 60)); };
  NM.register('music', {
    pages: {
      main: function () {
        var m = S.music, s = NM.SONGS[m.idx];
        return NM.appBar(S.views.music, '音乐', '') + '<div style="height:8px"></div>' +
          '<div class="music-art">' + svg('music', 70) + '</div>' +
          '<div class="music-title"><b>' + esc(s.title) + '</b><span>' + esc(s.artist) + '</span></div>' +
          '<div class="music-progress"><i style="width:' + (m.pos / s.dur * 100) + '%" id="music-bar"></i></div>' +
          '<div class="music-time"><span id="music-cur">' + fmtSec(m.pos) + '</span><span>' + fmtSec(s.dur) + '</span></div>' +
          '<div class="music-ctrl"><button data-a="mu-prev">' + svg('prev', 24) + '</button>' +
          '<button class="play" data-a="mu-play">' + svg(m.playing ? 'pause' : 'play', 26) + '</button>' +
          '<button data-a="mu-next">' + svg('next', 24) + '</button></div>' +
          '<div class="section-title">播放列表</div>' + NM.SONGS.map(function (x, i) {
            return '<div class="row" style="margin-bottom:8px;border-radius:14px" data-a="mu-pick" data-v="' + i + '">' +
              '<span class="row-main"><b>' + esc(x.title) + '</b><small>' + esc(x.artist) + ' · ' + fmtSec(x.dur) + '</small></span>' +
              (i === m.idx ? '<span style="color:var(--accent)">' + svg('volume', 17) + '</span>' : '') + '</div>';
          }).join('') + NM.endBar();
      }
    },
    actions: {
      'mu-play': function () { S.music.playing ? NM.musicPause() : NM.musicPlay(); NM.renderView(S.views.music); },
      'mu-next': function () { NM.musicNext(); NM.renderView(S.views.music); },
      'mu-prev': function () { NM.musicPrev(); NM.renderView(S.views.music); },
      'mu-pick': function (v, i) { S.music.idx = +i; S.music.pos = 0; S.music.playing = true; NM.renderView(v); }
    }
  });
  NM.on('music-tick', function () {
    var m = S.music, s = NM.SONGS[m.idx];
    var bar = W.document.getElementById('music-bar'), cur = W.document.getElementById('music-cur');
    if (bar) bar.style.width = (m.pos / s.dur * 100) + '%';
    if (cur) cur.textContent = fmtSec(m.pos);
  });

  /* ============================================================
     文件管理：虚拟文件系统，目录进入走系统返回栈
     ============================================================ */
  NM.register('files', {
    init: function (v) {
      if (!S.data.files.length) {
        S.data.files = [
          { id: 'f1', name: '照片', type: 'folder', parent: 'root', ts: Date.now() },
          { id: 'f2', name: '文档', type: 'folder', parent: 'root', ts: Date.now() },
          { id: 'f3', name: '下载', type: 'folder', parent: 'root', ts: Date.now() },
          { id: 'f4', name: '系统说明.txt', type: 'file', parent: 'root', size: 1024, ts: Date.now() },
          { id: 'f5', name: '欢迎.md', type: 'file', parent: 'f2', size: 512, ts: Date.now() }
        ];
        NM.save();
      }
      v.state.dir = 'root';
    },
    pages: {
      main: function (v, p) {
        var dir = p.dir || 'root'; v.state.dir = dir;
        var list = S.data.files.filter(function (f) { return f.parent === dir; });
        var name = dir === 'root' ? '我的文件' : (S.data.files.filter(function (f) { return f.id === dir; })[0] || {}).name;
        return NM.appBar(v, name || '我的文件', '<button class="bar-btn" data-a="file-new-folder">新建文件夹</button>') +
          '<div class="file-toolbar"><button data-a="file-new-file">新建文件</button><button data-a="file-sort">按名称排序</button>' +
          '<span style="margin-left:auto;font-size:11px;color:var(--faint);align-self:center">' + list.length + ' 项</span></div>' +
          (list.length ? list.map(function (f) {
            return '<div class="file-row" ' + (f.type === 'folder' ? 'data-a="file-open" data-v="' + f.id + '"' : '') + '>' +
              svg(f.type === 'folder' ? 'folder' : 'file', 24) +
              '<span class="fname">' + esc(f.name) + '</span><small>' +
              (f.type === 'folder' ? '文件夹' : (f.size || 0) + ' B') + ' · ' + NM.util.relTime(f.ts) + '</small>' +
              '<button data-a="file-del" data-v="' + f.id + '" style="color:var(--faint)">' + svg('trash', 16) + '</button></div>';
          }).join('') : '<div class="empty">这里还是空的<br>点上方按钮新建文件或文件夹</div>') + NM.endBar();
      }
    },
    actions: {
      'file-open': function (v, id) { NM.push('files', 'main', { dir: id }); },
      'file-new-folder': function (v) {
        S.data.files.push({ id: NM.util.uid(), name: '新建文件夹 ' + (S.data.files.length + 1), type: 'folder', parent: v.state.dir, ts: Date.now() });
        NM.save(); NM.renderView(v);
      },
      'file-new-file': function (v) {
        S.data.files.push({ id: NM.util.uid(), name: '新建文档 ' + (S.data.files.length + 1) + '.txt', type: 'file', parent: v.state.dir, size: 0, ts: Date.now() });
        NM.save(); NM.renderView(v);
      },
      'file-sort': function (v) { S.data.files.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); }); NM.save(); NM.renderView(v); },
      'file-del': function (v, id) {
        S.data.files = S.data.files.filter(function (f) { return f.id !== id && f.parent !== id; });
        NM.save(); NM.renderView(v); NM.island('已删除', 1100);
      }
    }
  });

  /* ============================================================
     终端：可交互 shell，命令真实作用于系统状态
     ============================================================ */
  NM.register('terminal', {
    init: function (v) {
      v.state.lines = [
        { t: 'MUOS Shell 1.0 · Web 内核', c: 'ok' },
        { t: '输入 help 查看可用命令。', c: 'dim' }
      ];
      v.state.hist = []; v.state.hi = 0; v.state.cwd = '/';
    },
    pages: {
      main: function (v) {
        return '<div class="app-bar"><button class="back" data-a="back">' + svg('back', 20) + '</button><h1>终端</h1>' +
          '<div class="bar-actions"><button class="bar-btn" data-a="term-clear">清屏</button></div></div>' +
          '<div class="term-body" id="term-body">' + v.state.lines.map(function (l) {
            return '<div class="term-line ' + (l.c || '') + '">' + esc(l.t) + '</div>';
          }).join('') + '</div>' +
          '<div class="term-input"><span>muos:~$</span><input data-f="term-cmd" data-a="term-enter" ' +
          'autocomplete="off" spellcheck="false" placeholder="输入命令后回车"></div>';
      }
    },
    actions: {
      'term-clear': function (v) { v.state.lines = []; NM.renderView(v); },
      'term-enter': function () { /* 由键盘回车触发，见 90-boot.js */ }
    },
    onPage: function () {
      var b = W.document.getElementById('term-body');
      if (b) b.scrollTop = b.scrollHeight;
    }
  });
  NM.termRun = function (v, raw) {
    var cmd = String(raw || '').trim(); if (!cmd) return;
    var L = v.state.lines, parts = cmd.split(/\s+/), c = parts[0].toLowerCase(), args = parts.slice(1);
    var out = function (t, cls) { L.push({ t: t, c: cls || '' }); };
    out('muos:~$ ' + cmd, 'cmd');
    v.state.hist.unshift(cmd); v.state.hi = 0;
    var help = [
      'help        显示帮助', 'ls / pwd    查看当前目录', 'cat <file>  读取文件',
      'date        当前时间', 'echo <text> 回显', 'whoami      当前用户',
      'uname -a    内核信息', 'battery     电池状态', 'net         网络开关状态',
      'ps          后台任务列表', 'notify <t>  发送一条通知', 'open <app>  打开应用（如 open settings）',
      'clear       清屏', 'neofetch    系统信息卡片', 'reboot      重启系统'
    ];
    switch (c) {
      case 'help': help.forEach(function (x) { out(x); }); break;
      case 'clear': v.state.lines = []; break;
      case 'pwd': out(v.state.cwd); break;
      case 'ls': out('bin/  etc/  home/  usr/  var/  system/  wallpaper/'); break;
      case 'cat': out(args[0] ? '（模拟文件）' + args[0] + '：MUOS 的文件系统保存在浏览器本地存储中。' : 'cat: 缺少文件名', args[0] ? '' : 'err'); break;
      case 'date': out(new Date().toString()); break;
      case 'echo': out(args.join(' ')); break;
      case 'whoami': out('muos_user'); break;
      case 'uname': out('MUOS 1.0.1 WebKernel Build 20261108 javascript'); break;
      case 'battery': out(Math.round(S.battery) + '% · ' + (S.charging ? 'charging' : 'discharging') +
        ' · lowpower=' + S.settings.lowpower); break;
      case 'net': out('airplane=' + S.settings.airplane + ' wifi=' + S.settings.wifi +
        ' cellular=' + S.settings.cellular + ' bluetooth=' + S.settings.bluetooth, 'ok'); break;
      case 'ps': out(S.tasks.length ? S.tasks.map(function (id, i) {
        return (i + 1) + '  ' + id + '  ' + (S.fg === id ? 'foreground' : 'background');
      }).join('\n') : '没有运行中的任务'); break;
      case 'notify': NM.notify('terminal', '来自终端', args.join(' ') || '一条测试通知'); out('通知已发送', 'ok'); break;
      case 'open':
        var id = args[0];
        if (id && NM.appById(id)) { NM.launchApp(id); out('已启动 ' + id, 'ok'); }
        else out('open: 未知应用 ' + (id || ''), 'err');
        break;
      case 'neofetch':
        ['       .--.       muos@' + (W.navigator.platform || 'web'),
         '      | o o |      ---------------',
         '      |  ^  |      OS: MUOS 1.0.1',
         '      | --- |      Kernel: WebKernel',
         '       ----       Uptime: ' + Math.floor((Date.now() - S.bootAt) / 1000) + 's',
         '                 Shell: muos-sh',
         '                 Tasks: ' + S.tasks.length,
         '                 Battery: ' + Math.round(S.battery) + '%',
         '                 Theme: ' + S.settings.theme].forEach(function (x) { out(x, 'ok'); });
        break;
      case 'reboot': out('正在重启…', 'ok'); setTimeout(NM.reboot, 600); break;
      default: out('muos-sh: ' + c + ': command not found', 'err');
    }
    NM.renderView(v);
    var b = W.document.getElementById('term-body'); if (b) b.scrollTop = b.scrollHeight;
    var inp = W.document.querySelector('[data-f=term-cmd]'); if (inp) inp.focus();
  };

  /* ============================================================
     2048：完整合并逻辑 + 滑动手势 + 棋盘持久化
     ============================================================ */
  NM.register('game', {
    init: function (v) {
      if (!S.data.gameBoard) { v.state.board = NM.g2048New(); }
      else v.state.board = S.data.gameBoard.map(function (r) { return r.slice(); });
      v.state.score = S.data.gameScore || 0;
    },
    pages: {
      main: function (v) {
        return NM.appBar(v, '2048', '<button class="bar-btn" data-a="game-new">新游戏</button>') +
          '<div class="game-score"><div><b>' + v.state.score + '</b><small>得分</small></div>' +
          '<div style="text-align:right"><b>' + (S.data.gameBest || 0) + '</b><small>最高纪录</small></div></div>' +
          '<div class="game-grid" id="game-grid">' + v.state.board.map(function (row) {
            return row.map(function (n) { return '<div class="game-cell ' + (n ? 'v' + n : '') + '">' + (n || '') + '</div>'; }).join('');
          }).join('') + '</div>' +
          '<div style="display:flex;justify-content:center;gap:8px;margin-top:16px">' +
          [['←','left'],['↑','up'],['↓','down'],['→','right']].map(function (d) {
            return '<button class="bar-btn" style="padding:12px 18px;font-size:17px" data-a="game-move" data-v="' + d[1] + '">' + d[0] + '</button>';
          }).join('') + '</div>' +
          '<div class="empty" style="padding:18px">滑动棋盘或点方向键移动 · 相同数字合并</div>' + NM.endBar();
      }
    },
    actions: {
      'game-new': function (v) { v.state.board = NM.g2048New(); v.state.score = 0; NM.g2048Save(v); NM.renderView(v); },
      'game-move': function (v, d) { NM.g2048Move(v, d); }
    },
    onPage: function (v) {
      var grid = W.document.getElementById('game-grid'); if (!grid) return;
      var sx = 0, sy = 0;
      grid.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
      grid.addEventListener('pointerup', function (e) {
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        NM.g2048Move(v, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      });
    }
  });
  NM.g2048New = function () {
    var b = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    NM.g2048Add(b); NM.g2048Add(b); return b;
  };
  NM.g2048Add = function (b) {
    var empty = [];
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) if (!b[y][x]) empty.push([y, x]);
    if (!empty.length) return false;
    var p = empty[Math.floor(Math.random() * empty.length)];
    b[p[0]][p[1]] = Math.random() < .9 ? 2 : 4; return true;
  };
  NM.g2048Move = function (v, dir) {
    var b = v.state.board, moved = false, gain = 0;
    var line = function (arr) {
      var a = arr.filter(function (n) { return n; }), out = [];
      for (var i = 0; i < a.length; i++) {
        if (a[i] === a[i + 1]) { out.push(a[i] * 2); gain += a[i] * 2; i++; }
        else out.push(a[i]);
      }
      while (out.length < 4) out.push(0);
      return out;
    };
    for (var i = 0; i < 4; i++) {
      var arr = [];
      for (var j = 0; j < 4; j++) {
        if (dir === 'left') arr.push(b[i][j]);
        if (dir === 'right') arr.push(b[i][3 - j]);
        if (dir === 'up') arr.push(b[j][i]);
        if (dir === 'down') arr.push(b[3 - j][i]);
      }
      var res = line(arr);
      for (var k = 0; k < 4; k++) {
        var y, x;
        if (dir === 'left') { y = i; x = k; } else if (dir === 'right') { y = i; x = 3 - k; }
        else if (dir === 'up') { y = k; x = i; } else { y = 3 - k; x = i; }
        if (b[y][x] !== res[k]) moved = true;
        b[y][x] = res[k];
      }
    }
    if (!moved) return;
    v.state.score += gain; NM.g2048Add(b); NM.g2048Save(v); NM.renderView(v);
    if (gain >= 128) NM.island('合并 +' + gain, 1100);
    var full = true;
    for (var yy = 0; yy < 4; yy++) for (var xx = 0; xx < 4; xx++) {
      if (!b[yy][xx]) full = false;
      if (xx < 3 && b[yy][xx] === b[yy][xx + 1]) full = false;
      if (yy < 3 && b[yy][xx] === b[yy + 1][xx]) full = false;
    }
    if (full) NM.dialog('游戏结束', '本局得分 ' + v.state.score + '，再来一局？',
      [{ t: '再来一局', a: 'game-restart', primary: true }, { t: '返回', a: 'back' }]);
  };
  NM.g2048Save = function (v) {
    S.data.gameBoard = v.state.board.map(function (r) { return r.slice(); });
    S.data.gameScore = v.state.score;
    S.data.gameBest = Math.max(S.data.gameBest || 0, v.state.score);
    NM.save();
  };

  /* ============================================================
     应用商店：接近真机的商店界面
     · 推荐 / 应用 / 游戏 / 榜单 / 我的 五个页签 + 实时搜索
     · 应用详情：截图、介绍、版本更新、权限信息、评分与用户评价
     · 点击「下载」有进度，完成后只把图标添加到桌面（不改写系统应用管理）
     · 商店应用是可点开的演示应用；卸载后图标从桌面与抽屉一起移除
     ============================================================ */
  var CATALOG = [
    { id:'x-lumen', n:'流光', cat:'社交', ic:'message', c1:'#ff9a6b', c2:'#e15a45', dev:'流光工作室', ver:'6.2.1', size:'92.4 MB', rate:4.7, dl:'1.2 亿', hot:98,
      d:'记录生活里的每一个闪光瞬间。流光是一款轻量的社交应用，支持图文动态、话题圈子与私密相册，界面遵循 MUOS 设计规范，通知与系统深色模式实时同步。', news:'· 全新的动态卡片排版\n· 修复后台消息延迟\n· 优化深色模式对比度', perms:'通知、存储、相机', shots:['#ff9a6b','#e15a45'] },
    { id:'x-film', n:'光影', cat:'影音', ic:'play', c1:'#7e8cff', c2:'#4a4fc0', dev:'MUOS 影音', ver:'3.8.0', size:'108 MB', rate:4.8, dl:'8600 万', hot:96,
      d:'为移动端重新设计的播放器：支持倍速、投屏、离线缓存与后台小窗。内置智能字幕与 HDR 色调映射，横屏时自动适配平板与折叠屏内屏。', news:'· 新增后台小窗播放\n· 支持 120Hz 高帧率片源', perms:'存储、网络、悬浮窗', shots:['#7e8cff','#4a4fc0'] },
    { id:'x-lens', n:'棱镜相机', cat:'摄影', ic:'camera', c1:'#6ec6b0', c2:'#2c8f86', dev:'Lens Lab', ver:'2.4.6', size:'76.8 MB', rate:4.6, dl:'4200 万', hot:88,
      d:'手动参数、RAW 拍摄与计算摄影滤镜。提供专业直方图、峰值对焦与一键胶片预设，拍摄的照片直接写入系统相册。', news:'· 新增 6 款胶片预设\n· 折叠屏外屏取景适配', perms:'相机、位置、存储', shots:['#6ec6b0','#2c8f86'] },
    { id:'x-paper', n:'纸间', cat:'阅读', ic:'notes', c1:'#f3b45c', c2:'#d07b2e', dev:'纸间阅读', ver:'5.1.2', size:'54.2 MB', rate:4.9, dl:'3100 万', hot:91,
      d:'安静的本地阅读器，支持 EPUB / PDF / TXT，自动排版、护眼纸张色调与跨设备同步阅读进度。', news:'· 支持双页平板排版\n· 修复竖排标点显示', perms:'存储、网络', shots:['#f3b45c','#d07b2e'] },
    { id:'x-quick', n:'速记 Pro', cat:'效率', ic:'edit', c1:'#8ab4ff', c2:'#4a63c8', dev:'MUOS 实验室', ver:'1.9.4', size:'28.6 MB', rate:4.5, dl:'1800 万', hot:79,
      d:'随手记下灵感，支持 Markdown、待办清单与桌面小组件，内容可以一键发送到系统笔记。', news:'· 新增桌面速记小组件\n· 优化输入延迟', perms:'通知、存储', shots:['#8ab4ff','#4a63c8'] },
    { id:'x-ride', n:'行迹', cat:'出行', ic:'location', c1:'#5bc8a6', c2:'#2f8f80', dev:'行迹科技', ver:'4.3.0', size:'112 MB', rate:4.4, dl:'2600 万', hot:83,
      d:'公交、地铁与步行导航，离线地图包与实时到站提醒。支持在系统锁屏与超级岛上显示行程进度。', news:'· 支持锁屏行程卡片\n· 新增 12 座城市离线包', perms:'位置、通知、网络', shots:['#5bc8a6','#2f8f80'] },
    { id:'x-fit', n:'跃动', cat:'健康', ic:'health', c1:'#f2778f', c2:'#c9406a', dev:'MUOS 健康', ver:'2.7.3', size:'64.1 MB', rate:4.7, dl:'5300 万', hot:93,
      d:'步数、心率、睡眠与训练计划。数据写入系统健康应用，桌面小组件实时展示今日活动圆环。', news:'· 新增训练计划模板\n· 修复睡眠分段统计', perms:'健康数据、通知', shots:['#f2778f','#c9406a'] },
    { id:'x-pay', n:'星云钱包', cat:'金融', ic:'wallet', c1:'#8c9cf0', c2:'#4a55b8', dev:'星云支付', ver:'7.0.1', size:'88.9 MB', rate:4.6, dl:'1.5 亿', hot:95,
      d:'交通卡、门禁卡与付款码集中管理，支持双击电源键快速唤起，所有数据仅保存在本机演示环境中。', news:'· 新增 3 座城市交通卡\n· 优化付款码唤醒速度', perms:'NFC、通知、生物识别', shots:['#8c9cf0','#4a55b8'] },
    { id:'x-learn', n:'知课', cat:'教育', ic:'globe', c1:'#66a9ee', c2:'#2f6bc0', dev:'知课团队', ver:'3.2.8', size:'71.5 MB', rate:4.8, dl:'2900 万', hot:87,
      d:'课程表、作业与错题本三合一，支持平板分栏笔记与离线课件下载。', news:'· 平板横屏分栏适配\n· 新增错题导出', perms:'存储、网络、通知', shots:['#66a9ee','#2f6bc0'] },
    { id:'x-puzzle', n:'方块物语', cat:'游戏', ic:'game', c1:'#e8b45c', c2:'#c07a2b', dev:'像素工坊', ver:'1.6.0', size:'146 MB', rate:4.8, dl:'6800 万', hot:97, game:true,
      d:'轻松的方块解谜游戏，120 个手工关卡，支持高刷新率与触感反馈，进度可以云端存档。', news:'· 新增第 9 章 20 关\n· 支持 120Hz 模式', perms:'存储、网络', shots:['#e8b45c','#c07a2b'] },
    { id:'x-racer', n:'极速轨迹', cat:'游戏', ic:'flash', c1:'#ff7a8a', c2:'#b23a63', dev:'Velocity', ver:'2.1.4', size:'1.2 GB', rate:4.5, dl:'3400 万', hot:90, game:true,
      d:'重力感应竞速，12 条赛道与 30 辆可改装车辆。适配折叠屏内屏的宽视野与平板横屏。', news:'· 新增雨林赛道\n· 优化折叠屏视野', perms:'存储、网络、传感器', shots:['#ff7a8a','#b23a63'] },
    { id:'x-star', n:'星野', cat:'游戏', ic:'star', c1:'#a58bff', c2:'#5c46c8', dev:'Starfield', ver:'1.3.7', size:'860 MB', rate:4.9, dl:'2100 万', hot:92, game:true,
      d:'慢节奏的星空探索游戏，收集星座、记录观测日志，没有失败惩罚，适合睡前玩一会儿。', news:'· 新增冬季星图\n· 修复部分机型闪退', perms:'存储、网络', shots:['#a58bff','#5c46c8'] },
    { id:'x-cloud', n:'云间', cat:'工具', ic:'cloud', c1:'#6ec1e8', c2:'#3179c6', dev:'云间科技', ver:'4.0.2', size:'42.3 MB', rate:4.3, dl:'1500 万', hot:74,
      d:'轻量文件同步工具，相册与文档自动备份，可在系统「我的文件」里直接查看云端目录。', news:'· 支持仅 WiFi 下备份\n· 优化增量同步', perms:'存储、网络、通知', shots:['#6ec1e8','#3179c6'] },
    { id:'x-chart', n:'数据看板', cat:'效率', ic:'chart', c1:'#63d2b2', c2:'#2c9a78', dev:'MUOS 实验室', ver:'1.2.0', size:'33.7 MB', rate:4.4, dl:'980 万', hot:71,
      d:'把系统电池、存储与后台任务数据做成可配置的小组件和图表，支持平板双列仪表盘。', news:'· 新增存储趋势图\n· 支持平板双列小组件', perms:'存储、通知', shots:['#63d2b2','#2c9a78'] }
  ];
  NM.STORE_CATALOG = CATALOG;
  var REVIEWS = [
    { u:'林小满', s:5, t:'界面很干净，跟系统风格统一，用起来很顺手。' },
    { u:'陈屿', s:5, t:'安装很快，桌面图标和小组件都正常，好评。' },
    { u:'苏晓', s:4, t:'功能够用，希望后续能加更多自定义选项。' },
    { u:'夜航船', s:5, t:'平板横屏适配做得不错，没有拉伸变形。' },
    { u:'一颗橘子', s:4, t:'整体不错，个别页面动画还可以再快一点。' }
  ];
  var CATS = ['全部', '社交', '影音', '摄影', '阅读', '效率', '出行', '健康', '金融', '教育', '游戏', '工具'];

  function byId(id) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }
  function storeInstalled() {
    if (!S.data.storeInstalled) S.data.storeInstalled = [];
    return S.data.storeInstalled;
  }
  function isInstalled(id) { return storeInstalled().indexOf(id) >= 0; }
  function appObj(c) {
    if (!c._app) c._app = { id: c.id, name: c.n, icon: c.ic, c1: c.c1, c2: c.c2,
      dock: false, badge: '', sysOnly: false, storeApp: true };
    return c._app;
  }
  /* 已安装的商店应用需要被系统识别为真实应用：不污染 NM.APPS 的默认注册表，
     只在 appById 查不到时按安装列表回落，桌面 / 抽屉 / 多任务都能正常解析。 */
  var BASE_APP_BY_ID = NM.appById;
  NM.appById = function (id) {
    var a = BASE_APP_BY_ID(id); if (a) return a;
    var c = byId(id);
    return c && isInstalled(id) ? appObj(c) : null;
  };
  function installId(id) {
    var list = storeInstalled();
    if (list.indexOf(id) < 0) list.push(id);
    var extra = S.data.installed = S.data.installed || [];
    if (extra.indexOf(id) < 0) extra.push(id);
    var desk = S.data.desktop = S.data.desktop || [];
    if (desk.indexOf(id) < 0) desk.push(id);
    S.data.hidden = (S.data.hidden || []).filter(function (x) { return x !== id; });
  }
  function uninstallId(id) {
    S.data.storeInstalled = storeInstalled().filter(function (x) { return x !== id; });
    S.data.installed = (S.data.installed || []).filter(function (x) { return x !== id; });
    S.data.desktop = (S.data.desktop || []).filter(function (x) { return x !== id; });
  }
  /* 商店应用点开后的演示页：像真机一样是一个可以返回、可以进多任务的应用 */
  NM.STORE_VIEW = {
    pages: {
      main: function (v) {
        var c = byId(v.app.id) || CATALOG[0];
        return NM.appBar(v, c.n) +
          '<div class="stub-hero" style="background:linear-gradient(140deg,' + c.c1 + ',' + c.c2 + ')">' +
            '<span class="stub-ic">' + NM.svg(c.ic, 36) + '</span><b>' + esc(c.n) + '</b>' +
            '<small>v' + esc(c.ver) + ' · ' + esc(c.dev) + '</small></div>' +
          '<div class="card" style="margin-top:14px"><div class="row-main"><b>已安装到 MUOS</b>' +
            '<small>这是从应用商店安装的演示应用。图标已经添加到桌面，可以在多任务卡片里看到它；卸载请回到应用商店「我的」页。</small></div></div>' +
          '<div class="section-title">应用信息</div>' +
          '<div class="card"><div class="set-row slim"><span>分类</span><b>' + esc(c.cat) + '</b></div>' +
          '<div class="set-row slim"><span>安装包</span><b>' + esc(c.size) + '</b></div>' +
          '<div class="set-row slim"><span>所需权限</span><b>' + esc(c.perms) + '</b></div></div>' +
          '<div style="display:flex;gap:8px;margin-top:6px">' +
          '<button class="pill-btn primary" style="flex:1" data-a="store-stub-store">回到应用商店</button>' +
          '<button class="pill-btn danger" style="flex:1" data-a="store-stub-uninstall" data-v="' + c.id + '">卸载</button></div>' +
          NM.endBar();
      }
    },
    actions: {
      'store-stub-store': function (v) { NM.launchApp('store'); },
      'store-stub-uninstall': function (v, id) {
        uninstallId(id);
        NM.killApp(id, true);
        NM.save();
        if (NM.renderPages) NM.renderPages();
        if (NM.renderDrawer) NM.renderDrawer();
        NM.island('已卸载 · 桌面图标已移除', 1600);
        NM.launchApp('store');
      }
    }
  };

  function rateStars(n) {
    var out = '';
    for (var i = 0; i < 5; i++) out += NM.svg('star', 11).replace('<svg ', '<svg class="' + (i < Math.round(n) ? 'on' : '') + '" ');
    return out;
  }
  function installBtn(c, v, big) {
    var d = v && v.state.dl;
    if (d && d.id === c.id) {
      return '<button class="st-btn ' + (big ? 'big' : '') + ' downloading" data-a="st-install" data-v="' + c.id + '">' +
        '<i style="width:' + Math.round(d.pct) + '%"></i><span>' + Math.round(d.pct) + '%</span></button>';
    }
    if (isInstalled(c.id)) {
      return '<button class="st-btn ' + (big ? 'big' : '') + ' installed" data-a="st-launch" data-v="' + c.id + '">打开</button>';
    }
    return '<button class="st-btn ' + (big ? 'big' : '') + '" data-a="st-install" data-v="' + c.id + '">下载</button>';
  }
  function appRow(c, v, rank) {
    return '<div class="st-row" data-a="st-open" data-v="' + c.id + '">' +
      (rank ? '<span class="st-rank ' + (rank <= 3 ? 'top' : '') + '">' + rank + '</span>' : '') +
      '<span class="st-ic" style="background:linear-gradient(140deg,' + c.c1 + ',' + c.c2 + ')">' + NM.svg(c.ic, 24) + '</span>' +
      '<span class="row-main"><b>' + esc(c.n) + '</b><small>' + esc(c.cat) + ' · ' + esc(c.size) +
      ' · ' + c.rate.toFixed(1) + ' 分</small></span>' +
      installBtn(c, v) + '</div>';
  }
  function resultsHtml(q, v) {
    var s = String(q || '').trim().toLowerCase();
    if (!s) return '<div class="empty">输入关键词搜索应用、游戏或开发者</div>';
    var list = CATALOG.filter(function (c) {
      return (c.n + c.cat + c.dev + c.d).toLowerCase().indexOf(s) >= 0;
    });
    if (!list.length) return '<div class="empty">没有找到「' + esc(q) + '」相关的应用<br>换个关键词试试</div>';
    return '<div class="section-title">搜索结果 · ' + list.length + ' 个</div>' +
      list.map(function (c) { return appRow(c, v); }).join('');
  }
  function paintProgress(v) {
    var d = v.state.dl; if (!d) return;
    var nodes = v.el.querySelectorAll('[data-a="st-install"][data-v="' + d.id + '"]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.add('downloading');
      nodes[i].innerHTML = '<i style="width:' + Math.round(d.pct) + '%"></i><span>' + Math.round(d.pct) + '%</span>';
    }
  }
  function finishInstall(v, id) {
    var c = byId(id); if (!c) return;
    installId(id);
    NM.save();
    v.state.dl = null;
    var sv = S.views.store;
    if (sv) { sv.state.dl = null; if (S.fg === 'store') NM.renderView(sv); }
    if (NM.renderPages) NM.renderPages();
    if (NM.renderDrawer) NM.renderDrawer();
    NM.notify('store', '安装完成 · ' + c.n, '图标已添加到主屏幕，可在应用抽屉里找到。', { silent: true });
    NM.island(c.n + ' 已添加到桌面', 1800);
  }

  NM.register('store', {
    init: function (v) { v.state.tab = 'featured'; v.state.cat = '全部'; v.state.q = ''; v.state.dl = null; },
    onField: function (v, f, val) {
      if (f !== 'st-q') { v.state[f] = val; return; }
      v.state.q = val;
      var res = v.el.querySelector('#st-results'), main = v.el.querySelector('#st-main');
      if (!res) return;
      res.innerHTML = resultsHtml(val, v);
      res.style.display = String(val).trim() ? 'block' : 'none';
      if (main) main.style.display = String(val).trim() ? 'none' : 'block';
    },
    pages: {
      main: function (v) {
        var tab = v.state.tab || 'featured', q = v.state.q || '';
        var tabs = [['featured','推荐'],['apps','应用'],['games','游戏'],['rank','榜单'],['mine','我的']];
        var head = NM.appBar(v, '应用商店', '<button class="bar-btn" data-a="st-tab" data-v="mine">' + NM.svg('person', 15) + '</button>') +
          '<div class="st-tabs">' + tabs.map(function (t) {
            return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-a="st-tab" data-v="' + t[0] + '">' + t[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="set-search st-search"><span>' + NM.svg('search', 17) + '</span>' +
          '<input data-f="st-q" placeholder="搜索应用、游戏、开发者" value="' + esc(q) + '">' +
          '<button data-a="st-clearq">' + NM.svg('close', 14) + '</button></div>' +
          '<div id="st-results" style="display:' + (String(q).trim() ? 'block' : 'none') + '">' + resultsHtml(q, v) + '</div>' +
          '<div id="st-main" style="display:' + (String(q).trim() ? 'none' : 'block') + '">';

        var body = '';
        if (tab === 'featured') {
          var hero = CATALOG[0];
          body =
            '<div class="st-hero" style="background:linear-gradient(135deg,' + hero.c1 + ',' + hero.c2 + ')" data-a="st-open" data-v="' + hero.id + '">' +
              '<span class="st-hero-tag">编辑推荐</span>' +
              '<b>' + esc(hero.n) + '</b><small>' + esc(hero.dev) + ' · ' + esc(hero.cat) + ' · ' + hero.rate.toFixed(1) + ' 分</small>' +
              '<p>' + esc(hero.d.slice(0, 46)) + '…</p>' +
              '<span class="st-hero-ic">' + NM.svg(hero.ic, 40) + '</span></div>' +
            '<div class="section-title">分类</div>' +
            '<div class="st-cats">' + CATS.map(function (c) {
              return '<button class="' + (v.state.cat === c ? 'on' : '') + '" data-a="st-cat" data-v="' + c + '">' + c + '</button>';
            }).join('') + '</div>' +
            '<div class="section-title">为你推荐</div>' +
            '<div class="st-hscroll">' + CATALOG.slice(1, 7).map(function (c) {
              return '<div class="st-tile" data-a="st-open" data-v="' + c.id + '">' +
                '<span class="st-ic" style="background:linear-gradient(140deg,' + c.c1 + ',' + c.c2 + ')">' + NM.svg(c.ic, 26) + '</span>' +
                '<b>' + esc(c.n) + '</b><small>' + esc(c.cat) + ' · ' + c.rate.toFixed(1) + ' 分</small>' + installBtn(c, v) + '</div>';
            }).join('') + '</div>' +
            '<div class="section-title">热门应用</div>' +
            CATALOG.slice(0, 6).map(function (c) { return appRow(c, v); }).join('');
        } else if (tab === 'apps' || tab === 'games') {
          var list = CATALOG.filter(function (c) {
            if (tab === 'games') return c.game;
            if (v.state.cat !== '全部' && v.state.cat !== '游戏') return c.cat === v.state.cat && !c.game;
            return !c.game;
          });
          var shownCats = tab === 'games' ? ['全部'] : CATS.filter(function (x) { return x !== '游戏'; });
          body = '<div class="st-cats">' + shownCats.map(function (c) {
            return '<button class="' + (v.state.cat === c ? 'on' : '') + '" data-a="st-cat" data-v="' + c + '">' + c + '</button>';
          }).join('') + '</div>' +
            '<div class="section-title">' + (tab === 'games' ? '精品游戏' : '全部应用') + ' · ' + list.length + ' 个</div>' +
            (list.length ? list.map(function (c) { return appRow(c, v); }).join('') : '<div class="empty">这个分类还没有上架应用</div>');
        } else if (tab === 'rank') {
          var rank = CATALOG.slice().sort(function (a, b) { return b.hot - a.hot; });
          body = '<div class="st-rank-head"><b>热门榜单</b><small>按下载热度与评分综合排序 · 每小时更新</small></div>' +
            rank.map(function (c, i) { return appRow(c, v, i + 1); }).join('');
        } else {
          var ins = storeInstalled().map(byId).filter(Boolean);
          body = '<div class="card st-mine-card"><div class="row-main"><b>本机已安装 ' + ins.length + ' 款商店应用</b>' +
            '<small>下载只会把图标添加到桌面，不会修改系统内置应用。卸载后图标会同时从桌面与应用抽屉移除。</small></div></div>' +
            '<div class="section-title">我的应用</div>' +
            (ins.length ? ins.map(function (c) {
              return '<div class="st-row"><span class="st-ic" style="background:linear-gradient(140deg,' + c.c1 + ',' + c.c2 + ')">' +
                NM.svg(c.ic, 24) + '</span><span class="row-main"><b>' + esc(c.n) + '</b><small>v' + esc(c.ver) +
                ' · ' + esc(c.size) + ' · 已是最新版本</small></span>' +
                '<button class="pill-btn" data-a="st-launch" data-v="' + c.id + '">打开</button>' +
                '<button class="pill-btn danger" data-a="st-uninstall" data-v="' + c.id + '">卸载</button></div>';
            }).join('') : '<div class="empty">还没有安装应用<br>去「推荐」页挑一个吧</div>') +
            '<div class="section-title">应用管理 · 系统内置</div>' +
            NM.APPS.filter(function (a) { return !a.dock; }).slice(0, 8).map(function (a) {
              var running = !!S.views[a.id], st = S.fg === a.id ? '前台运行' : (running ? '后台保活' : '未运行');
              var hidden = (S.data.hidden || []).indexOf(a.id) >= 0;
              return '<div class="st-row"><span class="st-ic" style="background:linear-gradient(140deg,' + a.c1 + ',' + a.c2 + ')">' +
                NM.svg(a.icon, 22) + '</span><span class="row-main"><b>' + esc(a.name) + '</b><small>' + st + ' · v1.0</small></span>' +
                '<button class="pill-btn" data-a="st-manage-open" data-v="' + a.id + '">打开</button>' +
                (running ? '<button class="pill-btn danger" data-a="st-manage-kill" data-v="' + a.id + '">停止</button>' : '') +
                '<button class="pill-btn" data-a="st-manage-hide" data-v="' + a.id + '">' + (hidden ? '显示' : '隐藏') + '</button></div>';
            }).join('');
        }
        return head + body + '</div>' + NM.endBar();
      },
      detail: function (v, p) {
        var c = byId(p && p.id) || CATALOG[0];
        var related = CATALOG.filter(function (x) { return x.cat === c.cat && x.id !== c.id; }).slice(0, 3);
        if (!related.length) related = CATALOG.filter(function (x) { return x.id !== c.id; }).slice(0, 3);
        return NM.appBar(v, c.n, '<button class="bar-btn" data-a="st-share" data-v="' + c.id + '">' + NM.svg('share', 14) + '</button>') +
          '<div class="st-detail-head">' +
            '<span class="st-ic xl" style="background:linear-gradient(140deg,' + c.c1 + ',' + c.c2 + ')">' + NM.svg(c.ic, 34) + '</span>' +
            '<span class="row-main"><b>' + esc(c.n) + '</b><small>' + esc(c.dev) + ' · ' + esc(c.cat) + '</small>' +
            '<span class="st-stars">' + rateStars(c.rate) + '<em>' + c.rate.toFixed(1) + '</em></span></span></div>' +
          '<div class="st-detail-stats">' +
            '<div><b>' + c.rate.toFixed(1) + '</b><small>评分</small></div>' +
            '<div><b>' + esc(c.dl) + '</b><small>下载量</small></div>' +
            '<div><b>' + esc(c.size) + '</b><small>安装包</small></div>' +
            '<div><b>' + esc(c.ver) + '</b><small>版本</small></div></div>' +
          '<div class="st-detail-install">' + installBtn(c, v, true) +
            '<span>' + (isInstalled(c.id) ? '已安装 · 图标在桌面' : '免费 · 无应用内广告') + '</span></div>' +
          '<div class="st-shots">' + [0, 1, 2].map(function (i) {
            return '<div class="st-shot" style="background:linear-gradient(150deg,' + c.shots[i % 2] + ',' + c.c2 + ')">' +
              '<span>' + NM.svg(c.ic, 26) + '</span><i>' + esc(c.n) + ' · 界面预览 ' + (i + 1) + '</i></div>';
          }).join('') + '</div>' +
          '<div class="section-title">应用介绍</div>' +
          '<div class="card st-desc">' + esc(c.d).replace(/\n/g, '<br>') + '</div>' +
          '<div class="section-title">新版本更新</div>' +
          '<div class="card st-desc">' + esc(c.news).replace(/\n/g, '<br>') + '</div>' +
          '<div class="section-title">应用信息</div>' +
          '<div class="card"><div class="set-row slim"><span>开发者</span><b>' + esc(c.dev) + '</b></div>' +
          '<div class="set-row slim"><span>分类</span><b>' + esc(c.cat) + '</b></div>' +
          '<div class="set-row slim"><span>所需权限</span><b>' + esc(c.perms) + '</b></div>' +
          '<div class="set-row slim"><span>兼容性</span><b>MUOS 4.0 及以上</b></div>' +
          '<div class="set-row slim"><span>包名</span><b>muos.store.' + c.id.slice(2) + '</b></div></div>' +
          '<div class="section-title">用户评价 · ' + (Math.round(c.rate * 4200)).toLocaleString('en-US') + ' 条</div>' +
          REVIEWS.map(function (r) {
            return '<div class="card st-review"><div class="st-review-head"><b>' + esc(r.u) + '</b>' +
              '<span class="st-stars">' + rateStars(r.s) + '</span></div><p>' + esc(r.t) + '</p>' +
              '<button class="pill-btn" data-a="st-helpful">有帮助</button></div>';
          }).join('') +
          '<div class="section-title">相关推荐</div>' +
          related.map(function (x) { return appRow(x, v); }).join('') + NM.endBar();
      }
    },
    actions: {
      'st-tab': function (v, t) { v.state.tab = t; v.state.q = ''; NM.renderView(v); },
      'st-cat': function (v, c) { v.state.cat = c; NM.renderView(v); },
      'st-clearq': function (v) { v.state.q = ''; NM.renderView(v); },
      'st-open': function (v, id) { NM.push('store', 'detail', { id: id }); },
      'st-launch': function (v, id) { NM.launchApp(id); },
      'st-share': function (v, id) {
        var c = byId(id);
        NM.dialog('分享应用', c ? c.n + ' · 来自 MUOS 应用商店\n链接已复制到剪贴板（演示）' : '',
          [{ t: '好', a: 'close-dialog', primary: true }]);
      },
      'st-helpful': function () { NM.island('感谢反馈', 1100); },
      'st-install': function (v, id) {
        var c = byId(id); if (!c || v.state.dl) return;
        if (isInstalled(id)) { NM.launchApp(id); return; }
        v.state.dl = { id: id, pct: 0 };
        paintProgress(v);
        var timer = W.setInterval(function () {
          var d = v.state.dl;
          if (!d || d.id !== id) { W.clearInterval(timer); return; }
          d.pct = Math.min(100, d.pct + 9 + Math.round(Math.random() * 13));
          if (d.pct >= 100) { W.clearInterval(timer); finishInstall(v, id); return; }
          paintProgress(v);
        }, 170);
      },
      'st-uninstall': function (v, id) {
        uninstallId(id);
        NM.killApp(id, true);
        NM.save();
        if (NM.renderPages) NM.renderPages();
        if (NM.renderDrawer) NM.renderDrawer();
        NM.island('已卸载 · 桌面图标已移除', 1600);
        NM.renderView(v);
      },
      'st-manage-open': function (v, id) { NM.launchApp(id); },
      'st-manage-kill': function (v, id) { NM.killApp(id); NM.renderView(v); },
      'st-manage-hide': function (v, id) {
        var h = S.data.hidden = S.data.hidden || [], i = h.indexOf(id);
        if (i >= 0) h.splice(i, 1); else h.push(id);
        NM.save(); if (NM.renderPages) NM.renderPages(); NM.renderView(v);
      }
    }
  });

  /* ============================================================
     录音机：计时、波形、录音列表（切后台继续计时）
     ============================================================ */
  NM.register('recorder', {
    init: function (v) { v.state.rec = null; },
    pages: {
      main: function (v) {
        var r = v.state.rec;
        var dur = r ? Math.floor((Date.now() - r.start) / 1000) : 0;
        var bars = '';
        for (var i = 0; i < 28; i++) bars += '<i style="display:inline-block;width:3px;margin:0 2px;border-radius:2px;background:var(--accent);height:' +
          (10 + Math.abs(Math.sin(i * .8)) * (r ? 40 : 8)) + 'px"></i>';
        return NM.appBar(v, '录音机') +
          '<div class="card" style="text-align:center;padding:28px 14px"><div style="font-size:40px;font-weight:200;font-variant-numeric:tabular-nums" id="rec-time">' +
          pad(Math.floor(dur / 60)) + ':' + pad(dur % 60) + '</div>' +
          '<div style="height:52px;display:flex;align-items:center;justify-content:center;margin:16px 0">' + bars + '</div>' +
          '<div style="font-size:11px;color:var(--muted)">' + (r ? '正在录音 · 切到后台也不会停' : '准备就绪') + '</div></div>' +
          '<div style="display:flex;justify-content:center;margin:18px 0"><button class="pill-btn" style="padding:14px 30px" data-a="rec-toggle">' +
          (r ? '停止并保存' : '开始录音') + '</button></div>' +
          '<div class="section-title">录音文件 · ' + (S.data.recordings || []).length + '</div>' +
          ((S.data.recordings || []).length ? S.data.recordings.map(function (x) {
            return '<div class="row" style="margin-bottom:8px;border-radius:14px"><span class="row-main"><b>' + esc(x.name) + '</b>' +
              '<small>' + pad(Math.floor(x.dur / 60)) + ':' + pad(x.dur % 60) + ' · ' + NM.util.relTime(x.ts) + '</small></span>' +
              '<button class="bar-btn" data-a="rec-play" data-v="' + x.id + '">试听</button>' +
              '<button data-a="rec-del" data-v="' + x.id + '">' + svg('trash', 16) + '</button></div>';
          }).join('') : '<div class="empty" style="padding:24px">还没有录音</div>') + NM.endBar();
      }
    },
    actions: {
      'rec-toggle': function (v) {
        if (v.state.rec) {
          var dur = Math.floor((Date.now() - v.state.rec.start) / 1000);
          (S.data.recordings = S.data.recordings || []).unshift({ id: NM.util.uid(), name: '录音 ' + (S.data.recordings.length + 1), dur: dur, ts: Date.now() });
          v.state.rec = null; NM.save(); NM.island('录音已保存', 1400);
          NM.notify('recorder', '录音已保存', '时长 ' + dur + ' 秒，可在录音机中试听', { silent: true });
        } else { v.state.rec = { start: Date.now() }; NM.island('开始录音', 1200); }
        NM.renderView(v);
      },
      'rec-play': function () { NM.beep(); NM.island('试听中（模拟音）', 1200); },
      'rec-del': function (v, id) {
        S.data.recordings = S.data.recordings.filter(function (x) { return x.id !== id; });
        NM.save(); NM.renderView(v);
      }
    },
    onPage: function (v) {
      clearInterval(v.state.recTimer);
      v.state.recTimer = setInterval(function () {
        var el = W.document.getElementById('rec-time'); if (!el || !v.state.rec) return;
        var s = Math.floor((Date.now() - v.state.rec.start) / 1000);
        el.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
      }, 500);
    },
    onKill: function (v) { clearInterval(v.state.recTimer); }
  });

  /* ============================================================
     电池：真实电量曲线 / 耗电排行 / 充电控制
     ============================================================ */
  NM.register('battery', {
    pages: {
      main: function () {
        var pct = Math.round(S.battery);
        return NM.appBar(S.views.battery, '电池') +
          '<div class="card" style="text-align:center;padding:26px"><div style="font-size:56px;font-weight:200">' + pct + '%</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:6px">' + (S.charging ? '正在充电 · 约 ' + (100 - pct) + ' 分钟后充满' : '预计还可用 ' + Math.round(pct / 8) + ' 小时') + '</div>' +
          '<div style="height:8px;border-radius:5px;background:rgba(255,255,255,.1);margin:18px 0 8px;overflow:hidden">' +
          '<i style="display:block;height:100%;width:' + pct + '%;background:' + (S.settings.lowpower ? 'var(--warn)' : 'var(--ok)') + '"></i></div></div>' +
          '<div class="row" style="border-radius:16px;margin-top:12px"><span class="row-main"><b>充电中</b><small>模拟插拔电源，状态栏会同步</small></span>' +
          '<span class="toggle ' + (S.charging ? 'on' : '') + '" data-a="bat-charge"></span></div>' +
          '<div class="row" style="border-radius:16px;margin-top:9px"><span class="row-main"><b>省电模式</b><small>减缓耗电并关闭过渡动画</small></span>' +
          '<span class="toggle ' + (S.settings.lowpower ? 'on' : '') + '" data-a="bat-low"></span></div>' +
          '<div class="section-title">应用耗电</div><div class="card">' +
          (S.tasks.length ? S.tasks.map(function (id, i) {
            var a = NM.appById(id) || { name: id }, p = Math.max(2, 24 - i * 4);
            return '<div class="forecast-row"><span>' + esc(a.name) + '</span><span class="fbar"><i style="width:' + p + '%"></i></span><b>' + p + '%</b></div>';
          }).join('') : '<div class="empty" style="padding:16px">暂无运行中的应用</div>') + '</div>' +
          '<div class="card" style="font-size:11px;line-height:1.8;color:var(--muted)">电池健康度 98% · 循环计数 42 次。这是模拟数据，电量每 12 秒变化 1%，可在设置中关闭自动锁屏长时间观察。</div>' + NM.endBar();
      }
    },
    actions: {
      'bat-charge': function () { S.charging = !S.charging; NM.renderStatusBarIcons(); NM.renderView(S.views.battery); },
      'bat-low': function () { NM.toggleTile('lowpower'); NM.renderView(S.views.battery); }
    }
  });

  /* ============================================================
     地图：离线示意地图，可缩放与切换地点
     ============================================================ */
  var PLACES = [
    { n: '当前位置', x: 50, y: 52 }, { n: '中央公园', x: 28, y: 34 },
    { n: '星海广场', x: 68, y: 28 }, { n: '城市图书馆', x: 38, y: 70 },
    { n: '科技馆', x: 74, y: 66 }
  ];
  NM.register('maps', {
    init: function (v) { v.state.zoom = 1; v.state.place = 0; },
    pages: {
      main: function (v) {
        var z = v.state.zoom, p = PLACES[v.state.place];
        var roads = '';
        for (var i = 1; i < 8; i++) roads += '<i style="position:absolute;left:0;right:0;top:' + (i * 12.5) + '%;height:2px;background:rgba(255,255,255,.09)"></i>' +
          '<i style="position:absolute;top:0;bottom:0;left:' + (i * 12.5) + '%;width:2px;background:rgba(255,255,255,.09)"></i>';
        return '<div class="app-bar"><button class="back" data-a="back">' + svg('back', 20) + '</button><h1>地图</h1>' +
          '<div class="bar-actions"><button class="bar-btn" data-a="map-zoom" data-v="1">＋</button>' +
          '<button class="bar-btn" data-a="map-zoom" data-v="-1">－</button></div></div>' +
          '<div style="flex:1;position:relative;overflow:hidden;background:linear-gradient(150deg,#16202e,#1e3040)">' +
          '<div style="position:absolute;inset:0;transform:scale(' + z + ');transition:transform .3s;background:' +
          'radial-gradient(circle at 30% 30%,rgba(90,160,140,.35),transparent 30%),radial-gradient(circle at 70% 70%,rgba(80,120,190,.3),transparent 35%)">' +
          roads +
          '<div style="position:absolute;left:22%;top:20%;width:22%;height:26%;border-radius:12px;background:rgba(110,226,213,.12)"></div>' +
          '<div style="position:absolute;left:60%;top:52%;width:26%;height:22%;border-radius:12px;background:rgba(138,180,255,.12)"></div>' +
          '<div style="position:absolute;left:50%;top:52%;width:14px;height:14px;border-radius:50%;background:var(--accent);border:3px solid #fff;transform:translate(-50%,-50%);box-shadow:0 0 0 10px rgba(138,180,255,.2)"></div>' +
          PLACES.map(function (q, i) {
            return '<button data-a="map-pick" data-v="' + i + '" style="position:absolute;left:' + q.x + '%;top:' + q.y + '%;transform:translate(-50%,-50%);' +
              'font-size:10px;color:#fff;background:rgba(10,14,22,.6);padding:4px 8px;border-radius:10px;white-space:nowrap">' +
              (i === 0 ? svg('location', 11) : '') + ' ' + q.n + '</button>';
          }).join('') + '</div></div>' +
          '<div style="padding:14px 16px 34px;background:var(--surface-solid)"><b style="font-size:15px;font-weight:500">' + esc(p.n) + '</b>' +
          '<div style="font-size:11px;color:var(--muted);margin-top:4px">缩放 ' + z.toFixed(1) + 'x · 离线示意地图 · 不使用真实定位</div>' +
          '<div class="hour-scroll" style="margin-top:12px">' + PLACES.map(function (q, i) {
            return '<button class="bar-btn" style="flex:none;white-space:nowrap;' + (i === v.state.place ? 'background:var(--accent);color:#0a1020' : '') + '" ' +
              'data-a="map-pick" data-v="' + i + '">' + q.n + '</button>';
          }).join('') + '</div></div>';
      }
    },
    actions: {
      'map-zoom': function (v, d) { v.state.zoom = clamp(v.state.zoom + (+d) * .25, .75, 2); NM.renderView(v); },
      'map-pick': function (v, i) { v.state.place = +i; NM.renderView(v); NM.island(PLACES[+i].n, 1100); }
    }
  });

  /* ============================================================
     关于本机：复用设置页里的真实系统信息
     ============================================================ */
  NM.register('about', { pages: { main: function (v) { return NM.aboutHTML(v); } }, actions: {} });

})(window);
