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
  function widgetCard(w, editing) {
    var x = live(w.type);
    return '<div class="widget-card wd-' + w.type + '" data-a="widget-open" data-v="' + x.app + '">' +
      '<span class="w-ic" style="background:' + x.c + '">' + svg(x.ic, 23) + '</span>' +
      '<span class="w-main"><span class="w-city">' + esc(x.title) + '</span>' +
      '<span class="w-temp">' + esc(x.big) + '</span><span class="w-desc">' + esc(x.sub) + '</span></span>' +
      '<span class="w-clock">' + (x.right || '') + '</span>' +
      (editing ? '<button class="wd-del" data-a="wd-del" data-v="' + w.id + '">' + svg('close', 13) + '</button>' : '') +
      '</div>';
  }

  function infoCard(type, app) {
    var x = live(type);
    return '<div class="widget-card" data-a="widget-open" data-v="' + app + '">' +
      '<span class="w-ic" style="background:' + x.c + '">' + svg(x.ic, 23) + '</span>' +
      '<span class="w-main"><span class="w-city">' + esc(x.title) + '</span>' +
      '<span class="w-temp">' + esc(x.big) + '</span><span class="w-desc">' + esc(x.sub) + '</span></span>' +
      '<span class="w-clock">' + (x.right || '') + '</span></div>';
  }

  /* 小组件按「页」渲染进一条横向轨道，与桌面图标轨道同步横滑。
     · 每一页都有自己那一屏小组件，翻页时组件跟着页面滑出，不会凭空消失
     · 轨道高度按所有页里最高的一屏统一设定，图标区永远不会被整体上抬 */
  function syncWidgetTrack(page, instant) {
    var t = document.getElementById('widget-track'); if (!t) return;
    if (instant) t.style.transition = 'none';
    t.style.transform = 'translateX(' + (-page * 100) + '%)';
    if (instant && W.requestAnimationFrame) {
      W.requestAnimationFrame(function () { t.style.transition = ''; });
    }
  }
  NM.renderWidget = function () {
    var host = $('#home-widget'); if (!host) return;
    var count = Math.max(1, (S._pages || [[]]).length), editing = !!S.editing;
    var dev = NM.deviceInfo ? NM.deviceInfo() : { isFoldInner: false, isPad: false };
    var cells = [], slot = 0;
    for (var pi = 0; pi < count; pi++) {
      var list = widgetsOn(pi);
      var showAll = !S.settings.widgetStack || list.length <= 1;
      var idx = pi === S.homePage ? clamp(NM.widgetIndex, 0, Math.max(0, list.length - 1)) : 0;
      var shown = list.length ? (showAll ? list : [list[idx]]) : [];
      var cards = shown.map(function (w) { return widgetCard(w, editing); });
      var bar = (!showAll && list.length > 1) ? '<div class="wd-stack-bar">' + list.map(function (w, i) {
        return '<i class="' + (i === idx ? 'on' : '') + '" data-a="wd-stack" data-v="' + i + '"></i>';
      }).join('') + '<span>' + (idx + 1) + ' / ' + list.length + ' · 左右滑动切换</span></div>' : '';
      var inner;
      if (dev.isFoldInner) {
        /* 与其他形态同一模型：只渲染用户添加的小组件（不再自动注入电池卡）；
           折痕是物理结构，只要这一页有组件就分列折痕两侧 */
        inner = (cards.length
          ? '<div class="widget-fold">' + (cards[0] || '') + '<span class="fold-seam"></span>' + (cards[1] || '') + '</div>'
          : '') + bar;
      } else if (dev.isPad) {
        inner = '<div class="widget-grid">' + cards.join('') + '</div>' + bar;
      } else inner = cards.join('') + bar;
      cells.push('<div class="widget-page" data-wpage="' + pi + '">' + inner + '</div>');
      var rows = shown.length ? ((dev.isPad || dev.isFoldInner) ? Math.ceil(shown.length / 2) : shown.length) : 0;
      if (cards.length) slot = Math.max(slot, rows * 92 + (bar ? 16 : 0));
    }
    host.style.setProperty('--widget-slot-h', (slot ? Math.max(96, slot) : 0) + 'px');
    host.innerHTML = '<div class="widget-track" id="widget-track">' + cells.join('') + '</div>';
    syncWidgetTrack(S.homePage, true);
  };

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
    var pages = [], cursor = 0, p = 0;
    /* 按每页「网格容量 − 小组件占用」顺序装图标，装不下就自动补页 */
    while ((p < pageCount || cursor < ids.length) && p < 12) {
      var cap = Math.max(1, g.per - widgetsOn(p).length * 2);
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
      if (dev.isFoldInner) {
        /* 折叠屏内屏：左右两半各 half 列，中间整列是折痕留空区。
           图标按「行」分到两半，绝不会有任何应用压在接缝上。 */
        var half = Math.max(1, Math.floor(g.cols / 2)), L = [], R = [];
        for (var r = 0; r < g.rows; r++) {
          var row = list.slice(r * g.cols, (r + 1) * g.cols);
          L = L.concat(row.slice(0, half));
          R = R.concat(row.slice(half, g.cols));
        }
        return '<div class="app-page fold-split" data-page="' + pi + '" style="--half-cols:' + half + '">' +
          '<div class="fold-half">' + L.map(icon).join('') + '</div>' +
          '<span class="fold-seam"></span>' +
          '<div class="fold-half">' + R.map(icon).join('') + '</div></div>';
      }
      return '<div class="app-page" data-page="' + pi + '">' + list.map(icon).join('') + '</div>';
    }).join('');
    $('#page-dots').innerHTML = pages.map(function (_, i) {
      return '<i class="page-dot ' + (i === S.homePage ? 'on' : '') + '" data-a="goto-page" data-v="' + i + '"></i>';
    }).join('');
    if (NM.renderWidget) NM.renderWidget();
    NM.gotoPage(S.homePage, true);
    NM.updateBadges();
  };

  var BASE_GOTO = NM.gotoPage;
  NM.gotoPage = function (i, instant) {
    BASE_GOTO(i, instant);
    /* 小组件轨道与图标轨道一起横滑；不重建 DOM，动画才不会闪一下 */
    syncWidgetTrack(S.homePage, !!instant);
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
      '<div class="ed-pages">' + pages.map(function (list, i) {
        return '<button class="ed-page ' + (i === S.homePage ? 'on' : '') + '" data-a="ed-page" data-v="' + i + '">' +
          '<span class="ed-thumb">' + list.slice(0, 8).map(function (id) {
            var a = NM.appById(id); return a ? '<i style="background:linear-gradient(140deg,' + a.c1 + ',' + a.c2 + ')"></i>' : '';
          }).join('') + '</span><small>' + (i === 0 ? '主页面' : '第 ' + (i + 1) + ' 页') + '</small></button>';
      }).join('') +
      '<button class="ed-page add" data-a="ed-add-page">' + svg('plus', 20) + '<small>添加页面</small></button></div>' +
      '<div class="ed-hint">拖动图标排序 · 点图标或小组件左上角「−」移除</div>' +
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
      S.data.widgets = S.data.widgets || [];
      S.data.widgets.push({ id: NM.util.uid(), type: type, page: S.homePage, span: 2 });
      S._wdPicker = false;
      NM.save(); NM.renderPages(); NM.renderWidget(); NM.renderEditor();
      NM.island('已添加「' + WIDGETS[type] + '」小组件', 1600);
    },
    'wd-del': function (id, el, e) {
      if (e) e.stopPropagation();
      S.data.widgets = (S.data.widgets || []).filter(function (w) { return w.id !== id; });
      NM.save(); NM.renderPages(); NM.renderWidget(); NM.renderEditor(); NM.island('小组件已移除', 1400);
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
    drTimer = W.setTimeout(function () { drLong = true; NM.addHomeIcon(id); NM.renderDrawer(); }, 520);
  });
  document.addEventListener('pointerup', function () { clearTimeout(drTimer); });
  document.addEventListener('pointercancel', function () { clearTimeout(drTimer); });

  /* 编辑模式下拖动图标排序：交换 desktop 数组中的位置 */
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    if (!S.editing || S.screen !== 'home') return;
    var el = e.target.closest && e.target.closest('.app-icon[data-app]');
    if (!el || !$('#pages-track') || !$('#pages-track').contains(el)) return;
    drag = { id: el.getAttribute('data-app'), el: el };
  });
  document.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var from = drag.id; drag = null;
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

  /* 回主屏 / 启动应用时收起编辑器和抽屉 */
  var BASE_GOHOME = NM.goHome;
  NM.goHome = function () { BASE_GOHOME(); NM.closeHomeEditor(); NM.closeDrawer(); };
  var BASE_LAUNCH = NM.launchApp;
  NM.launchApp = function (id) { NM.closeHomeEditor(); NM.closeDrawer(); return BASE_LAUNCH(id); };
  NM.toggleEditing = function () { S.editing ? NM.closeHomeEditor() : NM.openHomeEditor(); };

  /* 小部件堆叠左右滑动 */
  var wx = 0;
  W.document.addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target.closest('#home-widget');
    wx = t ? e.clientX : 0;
  });
  W.document.addEventListener('pointerup', function (e) {
    if (!wx || !S.settings.widgetStack) { wx = 0; return; }
    var dx = e.clientX - wx; wx = 0;
    var list = widgetsOn(S.homePage);
    if (list.length < 2 || Math.abs(dx) < 45) return;
    NM.widgetIndex = clamp(NM.widgetIndex + (dx < 0 ? 1 : -1), 0, list.length - 1);
    NM.renderWidget();
  });

  /* 初次渲染（此时 DOM 已就绪） */
  NM.renderEdge();
})(window);
