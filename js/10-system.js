/* ============================================================
   MUOS — 10-system.js
   系统状态机 / 应用生命周期 / 全局层 / 手势响应入口
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, $ = NM.util.$, $$ = NM.util.$$, esc = NM.util.esc,
    hhmm = NM.util.hhmm, clamp = NM.util.clamp;

  /* ============================================================
     一、状态机：所有界面切换只走 setScreen，保证状态唯一
     状态：off(关机) → boot(开机) → lock(锁屏) → home/app/recents/spotlight
     ============================================================ */
  var LAYERS = ['lock', 'pin', 'home', 'spotlight', 'recents', 'power-menu', 'off', 'boot', 'dialog'];
  NM.setScreen = function (next) {
    S.screen = next;
    $$('.layer').forEach(function (el) { el.classList.remove('on'); });
    var show = [];
    switch (next) {
      case 'off': show = ['off']; break;
      case 'boot': show = ['boot']; break;
      case 'lock': show = ['lock']; break;
      case 'pin': show = ['lock', 'pin']; break;
      case 'home': show = ['home']; break;
      case 'app': show = []; break;
      case 'recents': show = ['recents']; break;
      case 'spotlight': show = ['spotlight']; break;
      case 'power': show = ['power-menu']; break;
    }
    show.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('on'); });
    if (S.dialog) $('#dialog').classList.add('on');

    /* 开机/关机/息屏时不显示系统 UI */
    var chrome = (next !== 'off' && next !== 'boot');
    $('#statusbar').style.display = chrome ? '' : 'none';
    $('#island').style.display = chrome ? '' : 'none';
    $('#navbar').style.display = chrome ? '' : 'none';
    document.documentElement.setAttribute('data-screen', next);
    NM.updateStatusBarTone();
    if (next !== 'lock' && next !== 'pin') $('#lock').classList.remove('slide-up');
    NM.emit('screen', next);
  };

  /* ============================================================
     二、状态栏
     ============================================================ */
/* 状态栏图标明暗自适应：真机会判断「状态栏底下是什么颜色」。
      浅色主题：白底/浅壁纸 → 深色（黑色）图标，深色壁纸 → 白色图标。
      锁屏与主屏共用壁纸色调；通知/控制中心遮罩与深色主题强制白色。 */
  var DARK_WALLS = { aurora: 1, sunset: 1, mono: 1 };
  NM.updateStatusBarTone = function () {
    var st = S.settings, h = document.documentElement, dark = false;
    if (st.theme === 'light') {
      switch (S.screen) {
        case 'home': dark = !DARK_WALLS[st.wall]; break;
        case 'app': dark = true; break;
        case 'lock': case 'pin': dark = st.lockWallSame !== false ? !DARK_WALLS[st.wall] : true; break;
        default: dark = false; /* recents / spotlight / power */
      }
      if (S.shade) dark = false;
    }
    h.setAttribute('data-sb', dark ? 'dark' : 'light');
    /* 图标按状态栏明暗切换白色/黑色版本（带防递归守卫） */
    if (!NM._toneGuard && NM.renderStatusBarIcons) {
      NM._toneGuard = 1;
      try { NM.renderStatusBarIcons(); } finally { NM._toneGuard = 0; }
    }
  };
  NM.renderStatusBarIcons = function () {
    var st = S.settings, out = '';
    var tone = document.documentElement.getAttribute('data-sb') === 'dark' ? 'b' : 'w';
    function ico(name, opt) { return NM.sicon ? NM.sicon(name, tone, opt) : ''; }
    /* 图标避让刘海 / 灵动岛：按剩余宽度决定最多显示几个；
       优先级：Wi‑Fi > 信号 > 蓝牙 > 闹钟 > 勿扰 > 手电筒，电池永远显示 */
    var h = document.documentElement;
    var cam = h.getAttribute('data-cam') || 'none';
    var camW = cam === 'notch' ? 150 : cam === 'island' ? 118 : cam === 'hole' ? 134 : 0;
    var cssW = NM.deviceInfo ? NM.deviceInfo().cssW : 390;
    var avail = Math.max(50, cssW / 2 - camW / 2 - 38 - 40); /* 半屏 − 摄像头半宽 − 边距 − 时间宽 */
    var cap = Math.max(1, Math.floor(avail / 19));
    var opts = [];
    if (st.airplane) opts.push(ico('airplane') || NM.svg('airplane', 14));
    else {
      if (st.wifi) opts.push(ico('wifi') || NM.svg('wifi', 14));
      if (st.cellular) opts.push(ico('signal') || NM.svg('signal', 14));
    }
    if (st.bluetooth && !st.airplane) opts.push(ico('bt') || NM.svg('bluetooth', 13));
    if ((S.data.alarms || []).some(function (a) { return a.on; })) opts.push(ico('alarm'));
    if (st.dnd) opts.push(ico('dnd') || NM.svg('moon', 13));
    if (st.torch) opts.push(ico('torch') || NM.svg('torch', 13));
    /* 电池始终显示：电量数字嵌在电池图标内部 */
    out = opts.slice(0, cap).join('') +
      '<span class="battery-wrap">' +
      (S.charging ? (ico('charging') || '') : '') +
      '<span class="battery-chip">' + (ico('battery', { level: S.battery }) || '') + '<b>' + Math.round(S.battery) + '</b></span>' +
      '</span>';
    var el = $('#sb-icons'); if (el) el.innerHTML = out;
    document.documentElement.setAttribute('data-charging', S.charging ? '1' : '0');
    document.documentElement.setAttribute('data-lowpower', st.lowpower ? '1' : '0');
    NM.updateStatusBarTone();
  };

  /* ============================================================
     三、锁屏、PIN
     ============================================================ */
  NM.renderLockNotifs = function () {
    var host = $('#lock-notifs'); if (!host) return;
    var list = S.notifications.slice(0, 3);
    host.innerHTML = list.map(function (n) {
      return '<div class="lock-notif" data-a="open-notif" data-v="' + n.id + '">' +
        NM.iconBox(n.app, 17) + '<div class="n-txt"><b>' + esc(n.title) + '</b><span>' + esc(n.body) + '</span></div>' +
        '<small>' + NM.util.relTime(n.ts) + '</small></div>';
    }).join('');
    var w = $('#lock-weather');
    if (w) w.textContent = NM.weatherNow().desc + ' · ' + NM.weatherNow().temp + '°C';
  };

  NM.renderPinPad = function () {
    var keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
    $('#pin-pad').innerHTML = keys.map(function (k) {
      if (!k) return '<span class="pin-key blank"></span>';
      if (k === 'del') return '<button class="pin-key" data-a="pin-key" data-v="del">' + NM.svg('del', 24) + '</button>';
      return '<button class="pin-key" data-a="pin-key" data-v="' + k + '">' + k + '</button>';
    }).join('');
    NM.renderPinDots();
  };
  NM.renderPinDots = function () {
    $('#pin-dots').innerHTML = [0,1,2,3].map(function (i) {
      return '<i class="pin-dot ' + (i < S.pinBuf.length ? 'filled' : '') + '"></i>';
    }).join('');
  };
  NM.pinKey = function (k) {
    if (k === 'del') S.pinBuf = S.pinBuf.slice(0, -1);
    else if (S.pinBuf.length < 4) S.pinBuf += k;
    NM.renderPinDots();
    if (S.pinBuf.length === 4) setTimeout(NM.tryUnlock, 160);
  };
  NM.beginUnlock = function () {
    NM.hideShade();
    if (S.settings.pinOn) {
      S.pinBuf = ''; NM.renderPinDots();
      $('#pin-title').textContent = '输入密码';
      NM.setScreen('pin');
    } else NM.finishUnlock();
  };
  NM.tryUnlock = function () {
    if (S.pinBuf === S.settings.pin) {
      NM.finishUnlock();
    } else {
      S.pinTries++;
      S.pinBuf = '';
      $('#pin').classList.add('shake');
      setTimeout(function () { $('#pin').classList.remove('shake'); }, 420);
      $('#pin-title').textContent = S.pinTries >= 3 ? '密码错误，请稍后再试' : '密码错误，再试一次';
      NM.renderPinDots();
      if (S.pinTries >= 3) {
        setTimeout(function () { S.pinTries = 0; $('#pin-title').textContent = '输入密码'; NM.setScreen('lock'); S.pinBuf = ''; }, 1500);
      }
    }
  };
  NM.finishUnlock = function () {
    S.pinBuf = ''; S.pinTries = 0;
    $('#lock').classList.add('slide-up');
    NM.island('已解锁', 1400);
    /* 真实系统：解锁后回到息屏/锁屏之前所在的界面 */
    setTimeout(function () {
      var back = S.lockedFrom;
      $('#lock').classList.remove('slide-up');
      if (back === 'app' && S.fg && S.views[S.fg]) { NM.showForeground(S.fg); NM.setScreen('app'); }
      else NM.goHome();
    }, 260);
  };
  NM.sleep = function () {
    if (S.screen === 'off' || S.power !== 'on') return;
    S.lockedFrom = (S.screen === 'app' || S.screen === 'recents') ? 'app' : 'home';
    if (S.fg) NM.hideForeground();
    NM.hideShade();
    NM.setScreen('off');
  };
  NM.wake = function () {
    if (S.power !== 'on' || S.screen !== 'off') return;
    NM.markInput();
    NM.setScreen('lock');
    NM.renderLockNotifs();
    NM.island('点亮屏幕', 1200);
  };
  NM.powerOff = function () {
    NM.hideShade(); NM.closeDialog();
    NM.setScreen('off');
    S.power = 'off';
    /* 关机清空后台任务栈，重启后是干净状态（真实行为） */
    Object.keys(S.views).forEach(function (id) {
      var v = S.views[id]; if (v.el && v.el.parentNode) v.el.parentNode.removeChild(v.el);
    });
    S.views = {}; S.tasks = []; S.fg = null;
    $('#banner-host').innerHTML = '';
  };
  NM.boot = function () {
    S.power = 'booting';
    NM.setScreen('boot');
    setTimeout(function () {
      S.power = 'on';
      S.bootAt = Date.now();
      S.lockedFrom = 'home';
      NM.setScreen('lock');
      NM.renderAll();
      NM.island('MUOS 已启动', 2400);
    }, 2400);
  };
  NM.reboot = function () {
    NM.closeDialog(); NM.setScreen('off'); S.power = 'off';
    setTimeout(NM.boot, 700);
  };

  /* ============================================================
     四、主屏：分页、Dock、小组件、编辑模式
     ============================================================ */
  /* 旧版小组件渲染：仅在 50-home.js 加载前兜底（加载后即被网格版覆盖） */
  NM.renderWidget = function () {
    var host = $('#home-widget'); if (!host) return;
    var w = NM.weatherNow(), d = new Date();
    host.innerHTML = '<div class="widget-card" data-a="launch" data-v="weather">' +
      '<span class="w-ic">' + NM.svg(w.icon, 24) + '</span>' +
      '<span class="w-main"><span class="w-city">北京 · ' + esc(w.desc) + '</span>' +
      '<span class="w-temp">' + w.temp + '°</span><span class="w-desc">最高 ' + w.hi + '° 最低 ' + w.lo + '° · 空气质量优</span></span>' +
      '<span class="w-clock"><b id="widget-clock">' + hhmm(d) + '</b><span id="widget-date">' + NM.util.dateCN(d) + '</span></span></div>';
  };
  NM.renderPages = function () {
    var per = 12, normal = NM.APPS.filter(function (a) { return !a.dock; });
    var extra = (S.data.installed || []).map(function (id) { return NM.appById(id); }).filter(Boolean);
    var hidden = S.data.hidden || [];
    var all = normal.concat(extra).filter(function (a) { return hidden.indexOf(a.id) < 0; });
    var pages = [];
    for (var i = 0; i < all.length; i += per) pages.push(all.slice(i, i + per));
    if (!pages.length) pages.push([]);
    S._pages = pages;
    $('#pages-track').innerHTML = pages.map(function (list, pi) {
      return '<div class="app-page">' + list.map(function (a) {
        return '<div class="app-icon" data-app="' + a.id + '" data-a="launch" data-v="' + a.id + '">' +
          NM.iconBox(a, 30) + '<span class="ic-name">' + esc(a.name) + '</span></div>';
      }).join('') + '</div>';
    }).join('');
    $('#page-dots').innerHTML = pages.map(function (_, i) {
      return '<i class="page-dot ' + (i === S.homePage ? 'on' : '') + '" data-a="goto-page" data-v="' + i + '"></i>';
    }).join('');
    NM.gotoPage(S.homePage, true);
    NM.updateBadges();
  };
  NM.gotoPage = function (i, instant) {
    var n = S._pages ? S._pages.length : 1;
    S.homePage = clamp(i, 0, n - 1);
    var track = $('#pages-track');
    if (instant) track.style.transition = 'none';
    track.style.transform = 'translateX(' + (-S.homePage * 100) + '%)';
    if (instant) requestAnimationFrame(function () { track.style.transition = ''; });
    $$('#page-dots .page-dot').forEach(function (d, idx) { d.classList.toggle('on', idx === S.homePage); });
  };
  NM.renderDock = function () {
    $('#dock').innerHTML = NM.APPS.filter(function (a) { return a.dock; }).map(function (a) {
      return '<div class="app-icon" data-app="' + a.id + '" data-a="launch" data-v="' + a.id + '">' +
        NM.iconBox(a, 30) + '<span class="ic-name">' + esc(a.name) + '</span></div>';
    }).join('');
  };
  NM.updateBadges = function () {
    /* 历史反馈：应用操作后角标（小红点）无法去除 → 移除角标能力，只负责清掉存量 */
    $$('.app-icon .badge').forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
  };
  NM.toggleEditing = function () {
    S.editing = !S.editing;
    $$('#pages-track .app-icon').forEach(function (el) { el.classList.toggle('jitter', S.editing); });
    NM.island(S.editing ? '主屏编辑模式 · 点图标左上角移除' : '已退出编辑', 1600);
  };

  /* ============================================================
     五、应用生命周期：冷启动 / 热启动 / 后台保活 / 回收
     ============================================================ */
  NM.VIEWS = {};
  NM.register = function (id, def) { NM.VIEWS[id] = def; };

  NM.createView = function (id) {
    var app = NM.appById(id); if (!app) return null;
    var def = NM.VIEWS[id] || (app.storeApp && NM.STORE_VIEW) || {};
    var el = document.createElement('div');
    el.className = 'app-view';
    el.id = 'view-' + id;
    el.setAttribute('data-app', id);
    $('#app-views').appendChild(el);
    var v = { id: id, app: app, def: def, el: el, stack: [{ k: 'main', p: {} }], state: {}, t: Date.now() };
    S.views[id] = v;
    if (def.init) def.init(v);
    NM.renderView(v);
    return v;
  };
  /* 滚动位置按「页面栈帧」保存：同一页重绘（点开关 / 分段按钮）不跳回顶部，
     进入新页面从顶部开始，返回上一级时恢复到离开时的位置——与真机一致。 */
  function readScroll(el) {
    var out = [], list = el.querySelectorAll('.scroll');
    for (var i = 0; i < list.length; i++) out.push([list[i].scrollLeft, list[i].scrollTop]);
    return out;
  }
  function writeScroll(el, pos) {
    if (!pos || !pos.length) return;
    var list = el.querySelectorAll('.scroll');
    for (var i = 0; i < list.length && i < pos.length; i++) {
      list[i].scrollLeft = pos[i][0];
      list[i].scrollTop = pos[i][1];
    }
  }
  NM.renderView = function (v) {
    if (!v) return;
    /* 先把「当前正在显示」的那一帧的滚动位置记下来 */
    if (v._renderEntry) v._renderEntry._scroll = readScroll(v.el);
    var top = v.stack[v.stack.length - 1] || { k: 'main', p: {} };
    var fn = (v.def.pages && v.def.pages[top.k]) || v.def.pages && v.def.pages.main;
    var html = fn ? fn(v, top.p || {}) : '<div class="empty">页面不存在</div>';
    v.el.innerHTML = html;
    v._renderEntry = top;
    writeScroll(v.el, top._scroll);
    /* 部分浏览器在首帧之后才完成布局，补一次恢复避免偶发跳动 */
    if (top._scroll && W.requestAnimationFrame) {
      W.requestAnimationFrame(function () { if (v._renderEntry === top) writeScroll(v.el, top._scroll); });
    }
    if (v.def.onPage) v.def.onPage(v, top.k, top.p || {});
  };
  NM.push = function (id, key, params) {
    var v = S.views[id]; if (!v) return;
    v.stack.push({ k: key, p: params || {} });
    /* 从主屏 / 其他入口直达二级页时确保应用处于前台：
       否则 S.fg 为空，页内所有 data-a 动作委托都会失效（点什么都无响应） */
    if (S.fg !== id) {
      S.fg = id;
      v.t = Date.now();
      if (NM.showForeground) NM.showForeground(id);
      NM.setScreen('app');
      var tasks = S.tasks.filter(function (x) { return x !== id; });
      S.tasks = [id].concat(tasks);
    }
    NM.renderView(v);
  };
  NM.pop = function (id) {
    var v = S.views[id]; if (!v) return;
    if (v.stack.length > 1) { v.stack.pop(); NM.renderView(v); }
    else NM.goHome();
  };
  NM.setPage = function (id, key, params) {
    var v = S.views[id]; if (!v) return;
    v.stack = [{ k: key, p: params || {} }]; NM.renderView(v);
  };
  NM.appBar = function (v, title, actions, cls) {
    /* 栈底（应用首页）不显示返回按钮，仅保留占位以维持标题居中 */
    var atRoot = !(v && v.stack && v.stack.length > 1);
    return '<div class="app-bar"><button class="back" data-a="back"' + (atRoot ? ' style="visibility:hidden"' : '') + '>' +
      NM.svg('back', 20) + '</button>' +
      '<h1>' + esc(title) + '</h1><div class="bar-actions">' + (actions || '') + '</div></div>' +
      '<div class="app-body scroll ' + (cls || '') + '">';
  };
  NM.endBar = function () { return '</div>'; };

  NM.launchApp = function (id) {
    if (S.power !== 'on' || S.screen === 'off') return;
    var app = NM.appById(id); if (!app) return;
    NM.markInput(); NM.hideShade(); NM.closeRecentsQuick();
    var v = S.views[id];
    var cold = !v;
    if (cold) v = NM.createView(id);
    /* 任务栈：最新在前。后台任务不设上限，全部保活（真机式多任务） */
    S.tasks = [id].concat(S.tasks.filter(function (x) { return x !== id; }));
    S.fg = id;
    v.t = Date.now();
    NM.showForeground(id);
    NM.setScreen('app');
    if (v.def.onShow) v.def.onShow(v, cold);
    NM.island(cold ? '冷启动 · ' + app.name : '恢复后台 · ' + app.name, 1400);
  };
  NM.showForeground = function (id) {
    $$('.app-view.foreground').forEach(function (el) { el.classList.remove('foreground'); });
    var v = S.views[id]; if (!v) return;
    if (v.el.parentNode !== $('#app-views')) $('#app-views').appendChild(v.el);
    v.el.classList.add('foreground');
  };
  NM.hideForeground = function () {
    $$('.app-view.foreground').forEach(function (el) { el.classList.remove('foreground'); });
  };
  NM.killApp = function (id, silent) {
    var v = S.views[id];
    if (v) {
      if (v.def.onKill) v.def.onKill(v);
      if (v.el && v.el.parentNode) v.el.parentNode.removeChild(v.el);
      delete S.views[id];
    }
    S.tasks = S.tasks.filter(function (x) { return x !== id; });
    if (S.fg === id) { S.fg = null; if (S.screen === 'app') NM.goHome(); }
    if (!silent) NM.island('已结束 ' + (NM.appById(id) || { name: id }).name, 1300);
  };
  NM.goHome = function () {
    NM.markInput();
    NM.hideShade(); NM.closeDialog();
    NM.closeRecentsQuick();
    NM.hideForeground();
    S.fg = null;
    NM.setScreen('home');
    NM.gotoPage(S.homePage);
  };
  NM.back = function () {
    NM.markInput();
    if (S.screen === 'app' && S.fg) { NM.pop(S.fg); return; }
    if (S.screen === 'spotlight') { $('#spotlight').classList.remove('on'); NM.setScreen('home'); return; }
    if (S.screen === 'recents') { NM.closeRecents(); return; }
    if (S.screen === 'pin') { S.pinBuf = ''; NM.setScreen('lock'); return; }
    if (S.shade) { NM.hideShade(); return; }
    if (S.screen === 'power') { $('#power-menu').classList.remove('on'); NM.setScreen(S.lockedFrom === 'app' ? 'app' : 'home'); return; }
    NM.goHome();
  };

  /* ============================================================
     六、多任务：卡片内嵌后台应用的真实 DOM（非静态截图）
     ============================================================ */
  NM.openRecents = function () {
    NM.markInput(); NM.hideShade(); NM.hideForeground();
    var track = $('#recent-track');
    /* 布局由设置决定（设置 → 主屏幕 → 多任务界面布局），页面内不再提供切换 */
    var lay = S.settings.recentLayout || 'h';
    track.className = 'recent-track' + (lay === 'h' ? '' : ' ' + lay);
    track.innerHTML = '';
    $('#recent-empty').style.display = 'none';
    if (!S.tasks.length) $('#recent-empty').style.display = 'block';
    S._recentIds = S.tasks.slice();
    S._recentIds.forEach(function (id) {
      var v = S.views[id], app = NM.appById(id);
      if (!v || !app) return;
      var card = document.createElement('div');
      card.className = 'recent-card';
      card.setAttribute('data-card', id);
      card.innerHTML = '<div class="recent-meta">' + NM.iconBox(app, 14) + '<span>' + esc(app.name) + '</span>' +
        '<button data-a="kill-task" data-v="' + id + '">' + NM.svg('close', 13) + '</button></div>' +
        '<div class="recent-window"></div>';
      var win = card.querySelector('.recent-window');
      v.el.classList.remove('foreground', 'leaving');
      win.appendChild(v.el); /* 移动真实节点：输入值、滚动、计时器状态全部保留 */
      track.appendChild(card);
    });
    track.scrollLeft = 0;
    NM.setScreen('recents');
  };
  NM.closeRecentsQuick = function () {
    if (S.screen !== 'recents' && !$('#recents.on')) return;
    $$('#recent-track .app-view').forEach(function (el) {
      el.classList.remove('foreground');
      $('#app-views').appendChild(el);
    });
    $('#recents').classList.remove('on');
    $('#recent-track').innerHTML = '';
  };
  NM.closeRecents = function () {
    NM.closeRecentsQuick();
    if (S.fg && S.views[S.fg] && S._restoreFg !== false) {
      NM.showForeground(S.fg); NM.setScreen('app');
    } else NM.goHome();
  };
  NM.resumeTask = function (id) {
    NM.closeRecentsQuick();
    S.fg = id;
    NM.showForeground(id);
    NM.setScreen('app');
    S.tasks = [id].concat(S.tasks.filter(function (x) { return x !== id; }));
    var v = S.views[id]; if (v && v.def.onShow) v.def.onShow(v, false);
  };
  /* 小横条左右滑快捷切换应用：沿最近任务顺序前后切换 */
  NM.quickSwitch = function (dir) {
    var tasks = (S.tasks || []).filter(function (id) { return S.views[id]; });
    if (tasks.length < 2) { NM.island('没有其他最近应用', 1200); return; }
    var idx = tasks.indexOf(S.fg); if (idx < 0) idx = 0;
    var target = tasks[(idx + dir + tasks.length) % tasks.length];
    if (target === S.fg) return;
    NM.resumeTask(target);
    NM.island((NM.appById(target) || { name: target }).name, 900);
  };

  /* ============================================================
     七、通知中心 / 控制中心
     ============================================================ */
  NM.renderNotifShade = function () {
    var host = $('#notif-list'); if (!host) return;
    var list = S.notifications;
    host.innerHTML = list.length ? list.map(function (n) {
      return '<div class="notif-card" data-a="open-notif" data-v="' + n.id + '">' +
        NM.iconBox(n.app, 19) + '<div class="n-main"><div class="n-head"><span>' + esc(n.title) + '</span><small>' +
        NM.util.relTime(n.ts) + '</small></div><div class="n-body">' + esc(n.body) + '</div></div>' +
        '<button class="n-close" data-a="dismiss-notif" data-v="' + n.id + '">×</button></div>';
    }).join('') : '<div class="empty">没有通知<br>下拉状态栏左侧可随时打开这里</div>';
  };
  NM.openNotif = function (id) {
    var n = S.notifications.filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    NM.removeNotif(id);
    NM.hideShade();
    if (n.appId) NM.launchApp(n.appId);
  };

  var TILES = [
    { k: 'airplane', t: '飞行模式', i: 'airplane' }, { k: 'cellular', t: '移动数据', i: 'signal' },
    { k: 'wifi', t: '无线局域网', i: 'wifi' }, { k: 'bluetooth', t: '蓝牙', i: 'bluetooth' },
    { k: 'dnd', t: '勿扰模式', i: 'moon' }, { k: 'torch', t: '手电筒', i: 'torch' },
    { k: 'dark', t: '深色模式', i: 'sun' }, { k: 'lowpower', t: '省电模式', i: 'bolt' }
  ];
  NM.renderControlShade = function () {
    var st = S.settings;
    var tile = function (t) {
      var on = t.k === 'dark' ? st.theme === 'dark' : !!st[t.k];
      return '<button class="ctrl-tile ' + (on ? 'on' : '') + '" data-a="toggle-tile" data-v="' + t.k + '">' +
        NM.svg(t.i, 22) + '<small>' + t.t + '</small></button>';
    };
    /* iOS 式紧凑面板（全形态统一）：连接 2×2 成组卡 + 快捷圆钮行 + 竖向滑条 + 媒体卡；
       面板位置由 CSS 按形态决定：手机/竖折叠居中、平板右对齐、横折叠只在右侧屏 */
    $('#ctrl-grid').innerHTML =
      '<div class="ctrl-conn">' + TILES.slice(0, 4).map(tile).join('') + '</div>' +
      '<div class="ctrl-quick">' + TILES.slice(4).map(tile).join('') + '</div>';
    $('#brightness-row').className = 'slider-row v';
    $('#brightness-row').style.setProperty('--pct', st.brightness + '%');
    $('#brightness-row').innerHTML = NM.svg('brightness', 19) +
      '<input type="range" min="15" max="100" value="' + st.brightness + '" data-f="brightness">' +
      '<b>' + st.brightness + '%</b>';
    $('#volume-row').className = 'slider-row v';
    $('#volume-row').style.setProperty('--pct', st.volume + '%');
    $('#volume-row').innerHTML = NM.svg(st.volume ? 'volume' : 'volumeOff', 19) +
      '<input type="range" min="0" max="100" value="' + st.volume + '" data-f="volume">' +
      '<b>' + st.volume + '%</b>';
    NM.renderNowPlaying();
  };
  NM.renderNowPlaying = function () {
    var m = S.music, songs = NM.SONGS || [], cur = songs[m.idx];
    var el = $('#ctrl-now'); if (!el) return;
    el.innerHTML = '<div class="cn-title">' + (cur ? esc(cur.title) : '未在播放') + '</div>' +
      '<div class="cn-sub">' + (cur ? esc(cur.artist) + ' · ' + (m.playing ? '正在播放' : '已暂停') : '打开音乐应用开始播放') + '</div>' +
      '<div class="cn-bar"><i style="width:' + (cur && cur.dur ? (m.pos / cur.dur * 100) : 0) + '%"></i></div>';
  };
  NM.toggleTile = function (k) {
    var st = S.settings;
    if (k === 'dark') st.theme = st.theme === 'dark' ? 'light' : 'dark';
    else if (k === 'lowpower') {
      st.lowpower = !st.lowpower;
      if (st.lowpower) { st.brightness = Math.min(st.brightness, 60); NM.island('省电模式已开启', 1600); }
    } else {
      st[k] = !st[k];
      /* 飞行模式会一并关掉蜂窝与WiFi（真实联动），关闭时恢复 */
      if (k === 'airplane') {
        if (st.airplane) { st._cellular = st.cellular; st._wifi = st.wifi; st.cellular = false; st.wifi = false; }
        else { st.cellular = st._cellular !== undefined ? st._cellular : true; st.wifi = st._wifi !== undefined ? st._wifi : true; }
        NM.island(st.airplane ? '飞行模式已开启' : '飞行模式已关闭', 1800);
      }
      if (k === 'torch') NM.island(st.torch ? '手电筒已打开' : '手电筒已关闭', 1200);
      if (k === 'dnd') NM.island(st.dnd ? '勿扰模式：通知将静默' : '勿扰模式已关闭', 1800);
      if (k === 'wifi') NM.island('WiFi 已' + (st.wifi ? '开启' : '关闭'), 1400);
      if (k === 'bluetooth') NM.island('蓝牙已' + (st.bluetooth ? '开启' : '关闭'), 1400);
    }
    if (st.airplane && (k === 'wifi' || k === 'cellular')) { st.wifi = false; st.cellular = false; }
    NM.applySettings(); NM.save(); NM.renderControlShade();
    NM.emit('settings');
  };
  NM.showShade = function (which) {
    NM.markInput();
    if (!which) { NM.hideShade(); return; }
    if (S.screen === 'off' || S.power !== 'on') return;
    $$('.shade').forEach(function (el) { el.classList.remove('on'); });
    S.shade = which;
    document.documentElement.setAttribute('data-shade-open', which);
    if (which === 'notif') { NM.renderNotifShade(); $('#notification-shade').classList.add('on'); }
    else { NM.renderControlShade(); $('#control-shade').classList.add('on'); }
    NM.updateStatusBarTone();
    var isl = $('#island'); if (isl) isl.classList.add('quiet');
    NM.island(which === 'notif' ? '通知中心' : '控制中心', 1100);
  };
  NM.hideShade = function () {
    $$('.shade').forEach(function (el) { el.classList.remove('on'); });
    S.shade = null;
    document.documentElement.removeAttribute('data-shade-open');
    NM.updateStatusBarTone();
  };

  /* ============================================================
     八、全局设置落地：每个开关都真实改变系统
     ============================================================ */
  NM.applySettings = function () {
    var st = S.settings, h = document.documentElement;
    h.setAttribute('data-theme', st.theme);
    h.setAttribute('data-wall', st.wall);
    /* 自定义壁纸：直接铺在壁纸层上，预设渐变由 data-wall=custom 隐藏 */
    var wp = $('#wallpaper');
    if (wp) wp.style.backgroundImage = (st.wall === 'custom' && S.data.customWall)
      ? 'url("' + S.data.customWall + '")' : '';
    h.setAttribute('data-nav', st.nav);
    h.setAttribute('data-torch', st.torch ? '1' : '0');
    h.setAttribute('data-anim', st.animations ? '1' : '0');
    h.setAttribute('data-fx', st.pageFx || 'classic');
    h.setAttribute('data-ind', st.indStyle || 'classic');
    h.setAttribute('data-indtint', st.indTint === false ? '0' : '1');
    $('#dim-veil').style.opacity = String(clamp((100 - st.brightness) / 100 * .72, 0, .72));
    $('#display').style.fontSize = (14 * (st.fontScale || 1)) + 'px';
    NM.renderStatusBarIcons();
    NM.renderNavBar();
  };
  NM.renderNavBar = function () {
    var host = $('#navbar'), mode = S.settings.nav;
    document.documentElement.setAttribute('data-nav', mode);
    if (mode === 'buttons') {
      host.innerHTML = '<button class="nav-btn" data-a="recents-btn">' + NM.svg('recent', 19) + '</button>' +
        '<button class="nav-btn" data-a="home-click">' + NM.svg('home', 19) + '</button>' +
        '<button class="nav-btn" data-a="back">' + NM.svg('back', 19) + '</button>';
    } else host.innerHTML = '';
    /* 'gesture' 显示小横条，'none' 完全隐藏导航提示，但底部上滑手势依然可用 */
    var bar = $('#home-indicator');
    if (bar) bar.style.display = (mode === 'none') ? 'none' : '';
  };

  /* ============================================================
     九、全局搜索
     ============================================================ */
  NM.openSpotlight = function () {
    if (S.screen !== 'home') return;
    NM.markInput();
    $('#spot-input').value = '';
    NM.renderSpotlight('');
    NM.setScreen('spotlight');
    setTimeout(function () { $('#spot-input').focus(); }, 120);
  };
  NM.renderSpotlight = function (q) {
    q = (q || '').trim().toLowerCase();
    var out = '';
    var apps = NM.APPS.filter(function (a) { return !q || a.name.toLowerCase().indexOf(q) >= 0 || a.id.indexOf(q) >= 0; });
    if (apps.length) out += '<div class="spot-group">应用</div>' + apps.slice(0, 8).map(function (a) {
      return '<div class="spot-item" data-a="launch" data-v="' + a.id + '">' + NM.iconBox(a, 19) +
        '<span>' + esc(a.name) + '</span><small>打开</small></div>';
    }).join('');
    var notes = (S.data.notes || []).filter(function (n) {
      return q && (n.title + n.body).toLowerCase().indexOf(q) >= 0;
    });
    if (notes.length) out += '<div class="spot-group">备忘录</div>' + notes.slice(0, 5).map(function (n) {
      return '<div class="spot-item" data-a="search-note" data-v="' + n.id + '"><span class="ic-box" style="background:#e5a63a">' +
        NM.svg('notes', 19) + '</span><span>' + esc(n.title) + '</span><small>' + esc(n.body.slice(0, 12)) + '</small></div>';
    }).join('');
    var files = (S.data.files || []).filter(function (f) { return q && f.name.toLowerCase().indexOf(q) >= 0; });
    if (files.length) out += '<div class="spot-group">文件</div>' + files.map(function (f) {
      return '<div class="spot-item" data-a="launch" data-v="files"><span class="ic-box" style="background:#3d7fc6">' +
        NM.svg('file', 19) + '</span><span>' + esc(f.name) + '</span><small>文件</small></div>';
    }).join('');
    if (!out) out = '<div class="empty">没有找到「' + esc(q) + '」<br>可搜索应用名称、备忘录和文件</div>';
    $('#spot-body').innerHTML = out;
  };

  /* ============================================================
     十、一次性渲染入口
     ============================================================ */
  NM.renderAll = function () {
    NM.renderWidget(); NM.renderPages(); NM.renderDock();
    NM.renderPinPad(); NM.renderLockNotifs();
    NM.renderNotifShade(); NM.renderControlShade();
    NM.applySettings(); NM.tickClock();
    NM.updateBadges();
  };
})(window);
