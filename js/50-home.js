/* ============================================================
   MUOS — 50-home.js
   主屏幕系统：桌面布局编辑器 / 小组件 / 应用抽屉 / 边缘面板
   · 长按桌面进入「桌面布局」，可添加 10 类实时小组件、移除图标、
     拖动排序、增删页面、切网格、锁定布局
   · 小部件堆叠（HyperOS 4）：同页多个组件叠成一摞，左右切换
   · 应用抽屉：主屏上滑打开，长按或点「＋」把应用放回桌面
   · 桌面图标与网格同时受「外层设备形态」与「系统内主屏幕设置」影响
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, esc = NM.util.esc, svg = NM.svg, clamp = NM.util.clamp;
  var $ = NM.util.$, $$ = NM.util.$$;

  /* ============================================================
     一、小组件目录：每一类都读系统真实数据，不是静态占位图
     ============================================================ */
  function live(kind) {
    var d = new Date(), st = S.settings;
    switch (kind) {
      case 'weather': {
        var w = NM.weatherNow();
        return { app: 'weather', ic: 'weather', c: 'linear-gradient(135deg,#f0b45e,#ef7d52)',
          title: w.city + ' · ' + w.desc, big: w.temp + '°', sub: '最高 ' + w.hi + '°  最低 ' + w.lo + '° · ' + w.aqi + ' AQI',
          right: '<b id="widget-clock">' + NM.util.hhmm(d) + '</b><span id="widget-date">' + NM.util.dateCN(d) + '</span>' };
      }
      case 'clock':
        return { app: 'clock', ic: 'clock', c: 'linear-gradient(135deg,#5566a8,#282f52)',
          title: '当前时间', big: NM.util.hhmm(d), sub: NM.util.fullDate(d),
          right: '<small>' + ((S.data.alarms || []).filter(function (a) { return a.on; }).length) + ' 个闹钟</small>' };
      case 'battery':
        return { app: 'battery', ic: 'battery', c: 'linear-gradient(135deg,#5fd39a,#238a63)',
          title: S.charging ? '正在充电' : '电池', big: Math.round(S.battery) + '%',
          sub: (S.charging ? '预计 ' + Math.max(1, Math.round((100 - S.battery) * .6)) + ' 分钟充满' : '预计可用 ' + Math.round(S.battery / 8) + ' 小时') +
               (st.lowpower ? ' · 省电模式' : ''),
          right: '<small>' + (st.batteryProtect ? '保护上限 80%' : '健康度 98%') + '</small>' };
      case 'calendar':
        return { app: 'calendar', ic: 'calendar', c: 'linear-gradient(135deg,#f06b6b,#c33b5b)',
          title: NM.util.dateCN(d), big: String(d.getDate()), sub: (S.data.events || []).length + ' 个日程 · ' + (d.getMonth() + 1) + ' 月',
          right: '<small>' + NM.util.pad(d.getMonth() + 1) + '/' + d.getFullYear() + '</small>' };
      case 'notes': {
        var n = (S.data.notes || [])[0];
        return { app: 'notes', ic: 'notes', c: 'linear-gradient(135deg,#ffd066,#e59a2b)',
          title: '最新笔记', big: (S.data.notes || []).length + ' 条',
          sub: n ? n.title + ' · ' + n.body.replace(/\s+/g, ' ').slice(0, 22) : '还没有笔记',
          right: '<small>点按打开</small>' };
      }
      case 'music': {
        var cur = (NM.SONGS || [])[S.music.idx];
        return { app: 'music', ic: 'music', c: 'linear-gradient(135deg,#e9708f,#a445c4)',
          title: cur ? esc(cur.title) : '未在播放', big: S.music.playing ? '♪' : 'Ⅱ',
          sub: cur ? esc(cur.artist) + ' · ' + (S.music.playing ? '正在播放' : '已暂停') : '打开音乐开始播放',
          right: '<button class="wd-play" data-a="widget-play">' + svg(S.music.playing ? 'pause' : 'play', 17) + '</button>' };
      }
      case 'quick':
        return { app: 'settings', ic: 'sliders', c: 'linear-gradient(135deg,#8ab4ff,#5b7fd6)',
          title: '快捷开关', big: '4', sub: '点击图标直接切换系统开关',
          right: '<div class="wd-quick">' + [['wifi', 'wifi'], ['dnd', 'moon'], ['torch', 'torch'], ['lowpower', 'bolt']].map(function (x) {
            return '<button class="' + (S.settings[x[0]] ? 'on' : '') + '" data-a="widget-tile" data-v="' + x[0] + '">' + svg(x[1], 14) + '</button>';
          }).join('') + '</div>' };
      case 'health': {
        var h = S.data.health || {};
        return { app: 'health', ic: 'health', c: 'linear-gradient(135deg,#f2778f,#c9406a)',
          title: '今日活动', big: (h.steps || 0) + '', sub: '步 · 心率 ' + (h.heart || 72) + ' 次/分 · 睡眠 ' + (h.sleep || 7.2) + ' 小时',
          right: '<small>目标 10000</small>' };
      }
      case 'storage':
        return { app: 'files', ic: 'storage', c: 'linear-gradient(135deg,#63b6ee,#3179c6)',
          title: '设备维护', big: (JSON.stringify(S.data).length / 1024).toFixed(1) + ' KB',
          sub: '后台 ' + S.tasks.length + ' 个 · ' + (S.data.files || []).length + ' 个文件',
          right: '<small>内存 ' + (1.2 + S.tasks.length * .18).toFixed(1) + ' GB</small>' };
      case 'notif': {
        var n2 = S.notifications[0];
        return { app: 'messages', ic: 'bell', c: 'linear-gradient(135deg,#9aa4ff,#5a5fd0)',
          title: '通知', big: S.notifications.length + ' 条',
          sub: n2 ? n2.title + ' · ' + n2.body.slice(0, 20) : '暂时没有通知',
          right: '<small>' + (st.dnd ? '勿扰中' : '正常') + '</small>' };
      }
    }
    return { app: 'settings', ic: 'info', c: '#555', title: kind, big: '', sub: '', right: '' };
  }

  var WIDGETS = {
    weather: '天气时钟', clock: '数字时钟', battery: '电池状态', calendar: '日历日程',
    notes: '最新笔记', music: '音乐播放', quick: '快捷开关', health: '健康活动',
    storage: '设备维护', notif: '通知速览'
  };
  NM.WIDGET_TYPES = WIDGETS;
  NM.widgetIndex = 0;

  function widgetsOn(page) {
    return (S.data.widgets || []).filter(function (w) { return (w.page || 0) === page; });
  }

  /* ============================================================
     小组件系统（真实 Launcher 模式）：与图标同网格、自由拖动、多尺寸
     · 每个小组件占 w×h 个格子，渲染进对应页的 .app-page 网格
     · 图标自动绕开被占用的格子（CSS Grid 自动避让）
     · 编辑模式：拖动移动（网格吸附）、右下角按钮循环切换尺寸
     ============================================================ */
  var WSIZES = {
    weather: [[2, 2], [2, 4], [4, 2]],
    clock: [[2, 2], [1, 2], [1, 4]],
    battery: [[2, 1], [2, 2], [1, 2]],
    calendar: [[2, 2], [1, 2], [1, 4]],
    notes: [[2, 2], [1, 2], [1, 4]],
    music: [[4, 2], [2, 2]],
    quick: [[4, 1], [4, 2], [2, 2]],
    health: [[2, 2], [1, 2], [1, 4]],
    storage: [[2, 2], [1, 2], [1, 4]],
    notif: [[2, 2], [1, 2], [1, 4]]
  };
  function wdSize(type) { var l = WSIZES[type] || [[2, 2]]; return l[0]; }
  function isFoldInner() { return !!(NM.deviceInfo && NM.deviceInfo().isFoldInner); }

  /* 某页 (col,row,w,h) 区域是否空闲；折叠内屏的接缝列视为占用 */
  function areaFree(page, col, row, w, h, ignoreId) {
    var g = grid();
    if (col < 0 || row < 0 || col + w > g.cols || row + h > g.rows) return false;
    var occ = {};
    if (isFoldInner()) {
      var half = Math.floor(g.cols / 2);
      for (var rr = 0; rr < g.rows; rr++) occ[half + ',' + rr] = 1;
    }
    widgetsOn(page).forEach(function (wd) {
      if (ignoreId && wd.id === ignoreId) return;
      var c0 = wd.col || 0, r0 = wd.row || 0;
      for (var c = c0; c < c0 + (wd.w || 2); c++)
        for (var r = r0; r < r0 + (wd.h || 2); r++) occ[c + ',' + r] = 1;
    });
    for (var c2 = col; c2 < col + w; c2++)
      for (var r2 = row; r2 < row + h; r2++) if (occ[c2 + ',' + r2]) return false;
    return true;
  }
  /* 逐行扫描第一个能放下 w×h 的空闲位置 */
  function freePos(page, w, h, ignoreId) {
    var g = grid();
    for (var r = 0; r + h <= g.rows; r++)
      for (var c = 0; c + w <= g.cols; c++)
        if (areaFree(page, c, r, w, h, ignoreId)) return { col: c, row: r };
    return null;
  }

  function widgetCard(wd) {
    var x = live(wd.type), w = wd.w || 2, h = wd.h || 2;
    var wide = w >= 2 && h <= 2 ? ' wide' : '';
    return '<div class="widget-card' + wide + '" style="grid-column:' + ((wd.col || 0) + 1) + ' / span ' + w +
      ';grid-row:' + ((wd.row || 0) + 1) + ' / span ' + h + '" data-wd="' + wd.id + '" data-a="widget-open" data-v="' + x.app + '">' +
      '<span class="w-ic" style="background:' + x.c + '">' + svg(x.ic, 23) + '</span>' +
      '<span class="w-main"><span class="w-city">' + esc(x.title) + '</span>' +
      '<span class="w-temp">' + esc(x.big) + '</span><span class="w-desc">' + esc(x.sub) + '</span></span>' +
      '<span class="w-clock">' + (x.right || '') + '</span>' +
      (S.editing
        ? '<button class="wd-del" data-a="wd-del" data-v="' + wd.id + '" title="移除">' + svg('close', 13) + '</button>' +
          '<button class="wd-resize" data-a="wd-resize" data-v="' + wd.id + '" title="调整大小">' + svg('grid', 11) + '</button>'
        : '') +
      '</div>';
  }

  /* ============================================================
     二、桌面分页：桌面图标集 + 网格 + 页面数 + 形态栏数
     ============================================================ */
  function grid() {
    var dev = NM.deviceInfo ? NM.deviceInfo() : { cols: 4 };
    var g = S.settings.homeGrid || '4x6';
    var extra = g === '5x6' ? 1 : 0, rows = g === '4x5' ? 5 : 6;
    var cols = dev.cols + extra;
    /* 折叠外屏更矮：减少每页行数，一屏放不下的图标自动流到第二屏 */
    if (NM.deviceInfo && NM.deviceInfo().isCover) rows = Math.min(rows, 5);
    if (S.settings.easyMode) { cols = Math.max(3, cols - 1); rows = 5; }
    return { cols: cols, rows: rows, per: cols * rows };
  }
  NM.homeGridInfo = grid;

  function desktopApps() {
    var hidden = S.data.hidden || [];
    var list;
    if (S.settings.homeLayout === 'only') {
      list = NM.APPS.filter(function (a) { return !a.sysOnly && !a.dock; }).map(function (a) { return a.id; });
    } else list = (S.data.desktop || []).slice();
    (S.data.installed || []).forEach(function (id) { if (list.indexOf(id) < 0) list.push(id); });
    return list.filter(function (id) {
      var a = NM.appById(id);
      return a && hidden.indexOf(id) < 0 && (!a.sysOnly || (id === 'terminal' && S.settings.terminalEnabled));
    });
  }

  NM.renderPages = function () {
    var g = grid(), ids = desktopApps();
    var dev = NM.deviceInfo ? NM.deviceInfo() : { isFoldInner: false };
    var pageCount = Math.max(1, S.data.pageCount || 1);
    /* 迁移旧数据：没有坐标的小组件按默认尺寸自动找空位 */
    (S.data.widgets || []).forEach(function (wd) {
      if (wd._placed) return;
      var sz = wdSize(wd.type);
      wd.w = Math.min(wd.w || sz[0], g.cols); wd.h = Math.min(wd.h || sz[1], g.rows);
      var fp = freePos(wd.page || 0, wd.w, wd.h, wd.id);
      wd.col = fp ? fp.col : 0; wd.row = fp ? fp.row : 0;
      wd._placed = 1;
    });
    var pages = [], cursor = 0, p = 0;
    /* 按每页「网格容量 − 小组件占用格数」装图标，装不下自动补页 */
    while ((p < pageCount || cursor < ids.length) && p < 12) {
      var cells = 0;
      widgetsOn(p).forEach(function (wd) { cells += (wd.w || 2) * (wd.h || 2); });
      var cap = Math.max(1, g.per - cells);
      pages.push(ids.slice(cursor, cursor + cap));
      cursor += cap; p++;
    }
    if (!pages.length) pages.push([]);
    S._pages = pages;
    S.data.pageCount = pages.length;
    document.documentElement.style.setProperty('--home-cols', String(g.cols));
    document.documentElement.style.setProperty('--home-rows', String(g.rows));
    /* 行高与间距统一由变量驱动，轨道高度与栅格严格一致，应用名称不会被裁掉 */
    var cover = NM.deviceInfo && NM.deviceInfo().isCover;
    var rowH = cover ? 76 : 92, rowGap = cover ? 8 : 10;
    document.documentElement.style.setProperty('--icon-row-h', rowH + 'px');
    document.documentElement.style.setProperty('--icon-row-gap', rowGap + 'px');
    var usedRows = Math.max.apply(null, pages.map(function (list) {
      return Math.max(1, Math.ceil(list.length / g.cols));
    }).concat([1]));
    document.documentElement.style.setProperty('--track-h', (usedRows * rowH + (usedRows - 1) * rowGap) + 'px');
    function icon(id) {
      var a = NM.appById(id); if (!a) return '';
      return '<div class="app-icon' + (S.editing ? ' jitter' : '') + '" data-app="' + id + '" data-a="launch" data-v="' + id + '">' +
        NM.iconBox(a, 30) + '<span class="ic-name">' + esc(a.name) + '</span></div>';
    }
    $('#pages-track').innerHTML = pages.map(function (list, pi) {
      var wds = widgetsOn(pi);
      var widgetsHtml = wds.map(function (wd) { return widgetCard(wd); }).join('');
      if (dev.isFoldInner) {
        /* 折叠内屏：网格中缝留一条接缝列（占位符占住），图标与小组件都不会压缝 */
        var half = Math.max(1, Math.floor(g.cols / 2));
        return '<div class="app-page fold-grid" data-page="' + pi + '" style="--half-cols:' + half + '">' +
          '<span class="fold-seam-spacer"></span>' + widgetsHtml + list.map(icon).join('') + '</div>';
      }
      return '<div class="app-page" data-page="' + pi + '">' + widgetsHtml + list.map(icon).join('') + '</div>';
    }).join('');
    $('#page-dots').innerHTML = pages.map(function (_, i) {
      return '<i class="page-dot ' + (i === S.homePage ? 'on' : '') + '" data-a="goto-page" data-v="' + i + '"></i>';
    }).join('');
    NM.gotoPage(S.homePage, true);
    NM.updateBadges();
  };
  /* 兼容旧调用点（applyDevice / 设置项等）：重渲桌面即同步小组件 */
  NM.renderWidget = function () { NM.renderPages(); };

  var BASE_GOTO = NM.gotoPage;
  NM.gotoPage = function (i, instant) {
    BASE_GOTO(i, instant);
    if (NM.renderEditor) NM.renderEditor();
  };

  /* Dock：平板上显示更多常用入口，像真机的底部任务栏 */
  NM.renderDock = function () {
    var dev = NM.deviceInfo ? NM.deviceInfo() : { form: 'phone' };
    var dock = NM.APPS.filter(function (a) { return a.dock; });
    if (dev.form === 'pad') {
      ['messages', 'weather', 'music', 'files', 'settings'].forEach(function (id) {
        var a = NM.appById(id); if (a && !dock.some(function (x) { return x.id === id; })) dock.push(a);
      });
    }
    $('#dock').innerHTML = dock.map(function (a) {
      return '<div class="app-icon" data-app="' + a.id + '" data-a="launch" data-v="' + a.id + '">' +
        NM.iconBox(a, 30) + '<span class="ic-name">' + esc(a.name) + '</span></div>';
    }).join('');
    $('#dock').style.setProperty('--dock-cols', String(dock.length));
  };

  /* ============================================================
     三、桌面布局编辑器
     ============================================================ */
  NM.openHomeEditor = function () {
    if (S.settings.layoutLocked) { NM.island('主屏幕布局已锁定 · 请先在设置中解锁', 1900); return; }
    if (S.screen !== 'home') NM.goHome();
    S.editing = true;
    document.documentElement.setAttribute('data-editing', '1');
    var el = $('#home-editor'); if (el) el.classList.add('on');
    NM.renderPages(); NM.renderWidget(); NM.renderEditor();
  };
  NM.closeHomeEditor = function () {
    if (!S.editing) return;
    S.editing = false;
    document.documentElement.setAttribute('data-editing', '0');
    var el = $('#home-editor'); if (el) el.classList.remove('on');
    S._wdPicker = false;
    NM.renderPages(); NM.renderWidget(); NM.save();
  };
  NM.removeHomeIcon = function (id) {
    S.data.hidden = S.data.hidden || [];
    if (S.data.hidden.indexOf(id) < 0) S.data.hidden.push(id);
    S.data.desktop = (S.data.desktop || []).filter(function (x) { return x !== id; });
    NM.save(); NM.renderPages(); NM.island('已从桌面移除 · 可在应用抽屉或设置里恢复', 1800);
  };
  NM.addHomeIcon = function (id) {
    S.data.hidden = (S.data.hidden || []).filter(function (x) { return x !== id; });
    S.data.desktop = S.data.desktop || [];
    if (S.data.desktop.indexOf(id) < 0) S.data.desktop.push(id);
    NM.save(); NM.renderPages(); NM.island('已添加到主屏幕', 1500);
  };

  NM.renderEditor = function () {
    var host = $('#home-editor'); if (!host || !S.editing) return;
    var pages = S._pages || [[]];
    host.innerHTML =
      '<div class="ed-topbar"><button data-a="ed-done">完成</button></div>' +
      '<div class="ed-hint">左右滑动桌面可翻页 · 最后一页继续左滑新建页面 · 拖动图标排序 · 点「−」移除</div>' +
      (S._wdPicker ? widgetPicker() : '') +
      '<div class="ed-toolbar">' +
      '<button data-a="wd-pick">' + svg('stack', 20) + '<span>小组件</span></button>' +
      '<button data-a="ed-wallpaper">' + svg('palette', 20) + '<span>壁纸</span></button>' +
      '<button data-a="ed-fx">' + svg('sliders', 20) + '<span>切换效果</span></button>' +
      '<button data-a="ed-open-settings">' + svg('settings', 20) + '<span>设置</span></button>' +
      '</div>';
  };
  function widgetPicker() {
    return '<div class="wd-picker"><div class="ed-section">选择小组件 · 会添加到当前页面</div><div class="wd-grid">' +
      Object.keys(WIDGETS).map(function (k) {
        var x = live(k);
        return '<button class="wd-item" data-a="wd-add" data-v="' + k + '">' +
          '<span class="wd-prev" style="background:' + x.c + '">' + svg(x.ic, 19) + '</span>' +
          '<b>' + WIDGETS[k] + '</b><small>' + esc(x.title) + '</small></button>';
      }).join('') + '</div></div>';
  }

  /* ============================================================
     四、应用抽屉
     ============================================================ */
  function drawerApps() {
    var q = (S._drawerQ || '').toLowerCase(), hidden = S.data.hidden || [];
    /* 已安装的商店应用不在默认注册表里，按安装列表补进抽屉 */
    var base = NM.APPS.slice();
    (S.data.installed || []).forEach(function (id) {
      var a = NM.appById(id);
      if (a && a.storeApp && base.indexOf(a) < 0) base.push(a);
    });
    return base.filter(function (a) {
      if (a.sysOnly && !(a.id === 'terminal' && S.settings.terminalEnabled) && !S.settings.devOn) return false;
      return !q || a.name.toLowerCase().indexOf(q) >= 0 || a.id.indexOf(q) >= 0;
    }).map(function (a) { return { a: a, hidden: hidden.indexOf(a.id) >= 0 }; });
  }
  NM.renderDrawer = function () {
    var host = $('#app-drawer'); if (!host) return;
    var list = drawerApps(), g = S.settings.appGrid || '4x6';
    var cols = g === '5x6' ? 5 : 4;
    host.innerHTML = '<div class="dr-head"><div class="set-search"><span>' + svg('search', 17) + '</span>' +
      '<input data-f="dr-q" placeholder="搜索 ' + NM.APPS.length + ' 个应用" value="' + esc(S._drawerQ || '') + '"></div>' +
      '<button data-a="dr-close">完成</button></div>' +
      '<div class="dr-hint">长按图标或点「＋」把应用添加到主屏幕 · ' + esc(NM.deviceInfo().brand) + '</div>' +
      '<div class="dr-grid" style="--dr-cols:' + cols + '">' + list.map(function (x) {
        var a = x.a;
        return '<div class="dr-app" data-app="' + a.id + '">' +
          '<div class="app-icon" data-a="dr-open" data-v="' + a.id + '">' + NM.iconBox(a, 30) +
          '<span class="ic-name">' + esc(a.name) + '</span></div>' +
          (x.hidden ? '<button class="dr-add" data-a="dr-add" data-v="' + a.id + '">' + svg('plus', 13) + '</button>' :
            '<span class="dr-on">已在桌面</span>') + '</div>';
      }).join('') + '</div>' +
      (list.length ? '' : '<div class="empty">没有找到应用</div>') +
      '<div class="dr-foot">' + esc(NM.deviceInfo().resW + ' × ' + NM.deviceInfo().resH) + ' · ' +
      esc(NM.deviceInfo().hz + ' Hz') + ' · ' + esc(NM.deviceInfo().brand) + '</div>';
  };
  NM.openDrawer = function () {
    if (S.settings.homeLayout === 'only') {
      /* 仅主屏幕布局下没有抽屉，改为提示，与真机一致 */
      NM.island('当前为「仅主屏幕」布局，所有应用已在桌面', 1700); return;
    }
    NM.closeHomeEditor();
    S._drawerQ = '';
    NM.renderDrawer();
    var el = $('#app-drawer'); if (el) el.classList.add('on');
    NM.island('应用抽屉 · 长按图标添加到桌面', 1600);
  };
  NM.closeDrawer = function () {
    var el = $('#app-drawer'); if (el) el.classList.remove('on');
  };

  /* ============================================================
     五、边缘面板（Edge panel）
     ============================================================ */
  NM.renderEdge = function () {
    var host = $('#edge-panel'); if (!host) return;
    var on = !!S.settings.edgePanel;
    host.style.display = on ? '' : 'none';
    if (!on) return;
    var ids = ['camera', 'notes', 'calculator', 'clock', 'contacts', 'settings'];
    host.innerHTML = '<div class="edge-handle"></div><div class="edge-list">' + ids.map(function (id) {
      var a = NM.appById(id); if (!a) return '';
      return '<button data-a="edge-open" data-v="' + id + '" title="' + esc(a.name) + '">' + NM.iconBox(a, 18) + '</button>';
    }).join('') + '</div>';
  };

  /* ============================================================
     六、动作表：由 90-boot.js 的统一委托分发
     ============================================================ */
  NM.HOME_SYS = {
    'launch': function (id) {
      if (S.editing) { NM.removeHomeIcon(id); return; }
      NM.launchApp(id);
    },
    'ed-done': function () { NM.closeHomeEditor(); },
    'ed-page': function (i) { NM.gotoPage(+i); },
    'ed-add-page': function () {
      S.data.pageCount = Math.min(6, (S.data.pageCount || 1) + 1);
      NM.save(); NM.renderPages(); NM.renderEditor(); NM.island('已添加桌面页面', 1400);
    },
    'ed-del-page': function () {
      if ((S.data.pageCount || 1) <= 1) { NM.island('至少保留一个主屏页面', 1500); return; }
      var p = S.homePage;
      S.data.widgets = (S.data.widgets || []).map(function (w) {
        return { id: w.id, type: w.type, page: (w.page || 0) > p ? w.page - 1 : Math.max(0, Math.min(w.page || 0, p)), span: w.span };
      });
      S.data.pageCount--; S.homePage = Math.max(0, p - 1);
      NM.save(); NM.renderPages(); NM.renderWidget(); NM.renderEditor(); NM.island('已删除该页面', 1400);
    },
    'ed-grid': function (g) { S.settings.homeGrid = g; NM.save(); NM.renderPages(); NM.renderEditor(); },
    'ed-tg': function (k) {
      S.settings[k] = !S.settings[k]; NM.save(); NM.renderEditor();
      NM.applySettings(); NM.emit('settings');
      NM.island((S.settings[k] ? '已开启 · ' : '已关闭 · ') + ({
        swipeSearch: '下滑打开搜索', swipeUpDrawer: '上滑打开抽屉', widgetStack: '小部件堆叠', layoutLocked: '锁定布局'
      }[k] || k), 1500);
    },
    'ed-open-drawer': function () { NM.closeHomeEditor(); NM.openDrawer(); },
    'ed-wallpaper': function () {
      /* 循环切换壁纸（与设置 → 壁纸和风格共用同一字段） */
      var order = ['hyper', 'aurora', 'sunset', 'mono'];
      var names = { hyper: 'Hyper 光晕', aurora: '极光', sunset: '日落', mono: '曜石' };
      var cur = order.indexOf(S.settings.wall);
      S.settings.wall = order[(cur + 1 + order.length) % order.length];
      NM.applySettings(); NM.save();
      NM.island('壁纸 · ' + (names[S.settings.wall] || S.settings.wall), 1200);
    },
    'ed-fx': function () {
      /* 循环切换主屏翻页效果 */
      var order = ['classic', 'smooth', 'snappy'];
      var names = { classic: '经典', smooth: '柔和', snappy: '畅快' };
      var cur = order.indexOf(S.settings.pageFx || 'classic');
      S.settings.pageFx = order[(cur + 1) % order.length];
      NM.save(); NM.applySettings();
      NM.island('切换效果 · ' + names[S.settings.pageFx], 1200);
    },
    'ed-open-settings': function () {
      NM.closeHomeEditor(); NM.launchApp('settings');
      W.setTimeout(function () { NM.push('settings', 'homeSettings'); }, 80);
    },
    'wd-pick': function () {
      S._wdPicker = !S._wdPicker; NM.renderEditor();
      /* 打开选择器时自动滚到选择区，不用用户再往下找 */
      var host = $('#home-editor');
      if (S._wdPicker && host) host.scrollTop = host.scrollHeight;
    },
    'wd-add': function (type) {
      if (!WIDGETS[type]) return;
      var sz = wdSize(type);
      var fp = freePos(S.homePage, sz[0], sz[1]);
      if (!fp) { NM.island('当前页空间不足 · 请翻页或缩小其他小组件', 1900); return; }
      S.data.widgets = S.data.widgets || [];
      S.data.widgets.push({ id: NM.util.uid(), type: type, page: S.homePage,
        col: fp.col, row: fp.row, w: sz[0], h: sz[1], _placed: 1 });
      S._wdPicker = false;
      NM.save(); NM.renderPages(); NM.renderEditor();
      NM.island('已添加「' + WIDGETS[type] + '」小组件 ' + sz[0] + '×' + sz[1], 1600);
    },
    'wd-resize': function (id) {
      var wd = (S.data.widgets || []).filter(function (x) { return x.id === id; })[0]; if (!wd) return;
      var sizes = WSIZES[wd.type] || [[2, 2]];
      var i = -1;
      sizes.forEach(function (s, k) { if (s[0] === (wd.w || 2) && s[1] === (wd.h || 2)) i = k; });
      var oldW = wd.w || 2, oldH = wd.h || 2;
      var next = sizes[(i + 1) % sizes.length];
      wd.w = next[0]; wd.h = next[1];
      if (!areaFree(wd.page, wd.col || 0, wd.row || 0, wd.w, wd.h, wd.id)) {
        var fp = freePos(wd.page, wd.w, wd.h, wd.id);
        if (!fp) { wd.w = oldW; wd.h = oldH; NM.renderPages(); NM.island('页面上没有更大空位', 1500); return; }
        wd.col = fp.col; wd.row = fp.row;
      }
      NM.save(); NM.renderPages(); NM.island('小组件 ' + wd.w + '×' + wd.h, 1100);
    },
    'wd-del': function (id, el, e) {
      if (e) e.stopPropagation();
      S.data.widgets = (S.data.widgets || []).filter(function (w) { return w.id !== id; });
      NM.save(); NM.renderPages(); NM.renderEditor(); NM.island('小组件已移除', 1400);
    },
    'wd-stack': function (i, el, e) {
      if (e) e.stopPropagation();
      NM.widgetIndex = +i; NM.renderWidget();
    },
    'widget-open': function (id) { if (!S.editing) NM.launchApp(id); },
    'widget-play': function (v, el, e) {
      if (e) e.stopPropagation();
      var v2 = S.views.music;
      if (!v2) { NM.launchApp('music'); return; }
      if (v2.def.actions && v2.def.actions['mu-play']) v2.def.actions['mu-play'](v2);
      NM.renderWidget();
    },
    'widget-tile': function (k, el, e) {
      if (e) e.stopPropagation();
      NM.toggleTile(k === 'lowpower' ? 'lowpower' : k); NM.renderWidget();
    },
    'dr-open': function (id) {
      if (drLong) { drLong = false; return; }
      NM.closeDrawer(); NM.launchApp(id);
    },
    'dr-add': function (id) { NM.addHomeIcon(id); NM.renderDrawer(); },
    'dr-close': function () { NM.closeDrawer(); },
    'edge-open': function (id) { NM.launchApp(id); }
  };

  /* 应用抽屉搜索：输入框不在 app view 里，单独委托 */
  document.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-f') === 'dr-q') {
      S._drawerQ = e.target.value; NM.renderDrawer();
      var inp = document.querySelector('[data-f=dr-q]');
      if (inp) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (err) {} }
    }
  });
  /* 抽屉长按添加：与真机一致 */
  var drTimer = 0, drLong = false;
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest('.dr-app'); if (!el) return;
    var id = el.getAttribute('data-app');
    drLong = false;
    drTimer = W.setTimeout(function () {
      /* 正在用鼠标拖动滚动列表时，松手前不算长按 */
      if (NM.dragScrollActive) return;
      drLong = true; NM.addHomeIcon(id); NM.renderDrawer();
    }, 520);
  });
  document.addEventListener('pointerup', function () { clearTimeout(drTimer); });
  document.addEventListener('pointercancel', function () { clearTimeout(drTimer); });

  /* 编辑模式下拖动图标排序：交换 desktop 数组中的位置（大幅移动＝翻页手势，不交换） */
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    if (!S.editing || S.screen !== 'home') return;
    var el = e.target.closest && e.target.closest('.app-icon[data-app]');
    if (!el || !$('#pages-track') || !$('#pages-track').contains(el)) return;
    drag = { id: el.getAttribute('data-app'), el: el, x: e.clientX, y: e.clientY };
  });
  document.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    var from = drag.id; drag = null;
    if (Math.abs(dx) > 60 || Math.abs(dy) > 60) return;   /* 翻页滑动，不参与排序 */
    if (!W.document.elementFromPoint) return;
    var t = W.document.elementFromPoint(e.clientX, e.clientY);
    var to = t && t.closest ? t.closest('.app-icon[data-app]') : null;
    if (!to) return;
    var id2 = to.getAttribute('data-app'); if (!id2 || id2 === from) return;
    var arr = S.data.desktop = S.data.desktop || [];
    var i = arr.indexOf(from), j = arr.indexOf(id2);
    if (i < 0 || j < 0) return;
    arr[i] = id2; arr[j] = from;
    NM.save(); NM.renderPages(); NM.island('已调整图标顺序', 1200);
  });

  /* 编辑模式：小组件自由拖动（网格吸附），拖动结束落点换算为行列 */
  var wdrag = null;
  document.addEventListener('pointerdown', function (e) {
    if (!S.editing || S.screen !== 'home') return;
    var el = e.target.closest && e.target.closest('.app-page .widget-card');
    if (!el || (e.target.closest && e.target.closest('[data-a]'))) return;
    wdrag = { el: el, id: el.getAttribute('data-wd'), x: e.clientX, y: e.clientY, moved: false };
    NM._widgetDrag = true;
  });
  document.addEventListener('pointermove', function (e) {
    if (!wdrag) return;
    var dx = e.clientX - wdrag.x, dy = e.clientY - wdrag.y;
    if (!wdrag.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
    wdrag.moved = true;
    wdrag.el.style.transition = 'none';
    wdrag.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.03)';
    wdrag.el.style.zIndex = '6';
  });
  document.addEventListener('pointerup', function (e) {
    if (!wdrag) return;
    var dx = e.clientX - wdrag.x, dy = e.clientY - wdrag.y;
    var moved = wdrag.moved, el = wdrag.el, id = wdrag.id;
    wdrag = null; NM._widgetDrag = false;
    el.style.transition = ''; el.style.transform = ''; el.style.zIndex = '';
    if (!moved || Math.abs(dx) + Math.abs(dy) < 8) return;
    var wd = (S.data.widgets || []).filter(function (x) { return x.id === id; })[0]; if (!wd) return;
    var s = NM.stageScale ? NM.stageScale() : 1;
    dx /= s; dy /= s;
    var g = grid();
    var cellW = el.offsetWidth / (wd.w || 2), rowH = 92 + 10;
    if (!cellW) return;
    var nc = clamp(Math.round((wd.col || 0) + dx / cellW), 0, g.cols - (wd.w || 2));
    var nr = clamp(Math.round((wd.row || 0) + dy / rowH), 0, g.rows - (wd.h || 2));
    if (nc === (wd.col || 0) && nr === (wd.row || 0)) return;
    if (!areaFree(wd.page, nc, nr, wd.w || 2, wd.h || 2, wd.id)) {
      var fp = freePos(wd.page, wd.w || 2, wd.h || 2, wd.id);
      if (!fp) { NM.island('目标位置被占用', 1300); return; }
      nc = fp.col; nr = fp.row;
    }
    wd.col = nc; wd.row = nr; NM.save(); NM.renderPages();
    NM.island('小组件已移动', 1000);
  });

  /* 回主屏 / 启动应用时收起编辑器和抽屉 */
  var BASE_GOHOME = NM.goHome;
  NM.goHome = function () { BASE_GOHOME(); NM.closeHomeEditor(); NM.closeDrawer(); };
  var BASE_LAUNCH = NM.launchApp;
  NM.launchApp = function (id) { NM.closeHomeEditor(); NM.closeDrawer(); return BASE_LAUNCH(id); };
  NM.toggleEditing = function () { S.editing ? NM.closeHomeEditor() : NM.openHomeEditor(); };

  /* 小部件堆叠（旧横条模式）已由网格小组件取代 */

  /* 初次渲染（此时 DOM 已就绪） */
  NM.renderEdge();
})(window);
