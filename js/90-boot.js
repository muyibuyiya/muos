/* ============================================================
   MUOS — 90-boot.js
   全局事件委托 / 手势识别 / 电源键 / 定时服务 / 启动流程
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, $ = NM.util.$, $$ = NM.util.$$, clamp = NM.util.clamp;

  /* ============================================================
     一、系统级动作表（应用自定义动作在前台 view.def.actions 中）
     ============================================================ */
  var SYS = {
    'launch': function (v) { NM.launchApp(v); },
    'goto-page': function (v) { NM.gotoPage(+v); },
    'back': function () {
      /* 锁屏快捷进入相机后，返回必须回到锁屏而不是主屏（真机行为） */
      if (S.cameraFromLock && S.fg === 'camera') {
        S.cameraFromLock = false; NM.hideForeground(); S.fg = null;
        NM.setScreen('lock'); return;
      }
      NM.back();
    },
    'home-click': function () {
      var now = Date.now();
      if (now - (SYS._homeAt || 0) < 330) { SYS._homeAt = 0; NM.openRecents(); }
      else { SYS._homeAt = now; setTimeout(function () { if (SYS._homeAt && Date.now() - SYS._homeAt >= 300) { SYS._homeAt = 0; NM.goHome(); } }, 320); }
    },
    'recents-btn': function () { NM.hideShade(); NM.openRecents(); },
    'recent-layout': function (lay) { S.settings.recentLayout = lay; NM.save(); NM.openRecents(); },
    'open-recents': function () { NM.hideShade(); NM.openRecents(); },
    'open-settings': function () { NM.hideShade(); NM.launchApp('settings'); },
    'open-spotlight': function () { NM.openSpotlight(); },
    'close-spotlight': function () { $('#spotlight').classList.remove('on'); NM.setScreen('home'); },
    'open-notifications': function () { NM.showShade(S.shade === 'notif' ? null : 'notif'); },
    'open-control': function () { NM.showShade(S.shade === 'control' ? null : 'control'); },
    'clear-notifs': function () { S.notifications = []; NM.renderNotifShade(); NM.renderLockNotifs(); NM.updateBadges(); NM.island('通知已清空', 1200); },
    'open-notif': function (v) { NM.openNotif(v); },
    'dismiss-notif': function (v, el, e) { e.stopPropagation(); NM.removeNotif(v); },
    'toggle-tile': function (v) { NM.toggleTile(v); },
    'toggle-torch': function () {
      S.settings.torch = !S.settings.torch; NM.applySettings(); NM.save();
      if (S.shade === 'control') NM.renderControlShade();
      NM.island(S.settings.torch ? '手电筒已打开' : '手电筒已关闭', 1300);
    },
    'lock-camera': function () {
      if (!S.settings.pinOn) {
        S.cameraFromLock = true;
        NM.launchApp('camera');
        NM.island('锁屏快捷相机 · 返回后仍会锁定', 1800);
      } else NM.dialog('需要解锁', '锁屏相机在设置密码后需要先解锁才能使用。', [{ t: '去解锁', a: 'pin-from-dialog', primary: true }, { t: '取消', a: 'close-dialog' }]);
    },
    'pin-from-dialog': function () { NM.closeDialog(); NM.beginUnlock(); },
    'pin-key': function (v) { NM.pinKey(v); },
    'pin-cancel': function () { S.pinBuf = ''; NM.setScreen('lock'); },
    'kill-task': function (v, el, e) {
      e.stopPropagation();
      var card = el.closest('.recent-card');
      if (card) { card.style.transform = 'translateY(-120%)'; card.style.opacity = '0'; }
      setTimeout(function () { NM.killApp(v); NM.openRecents(); }, 220);
    },
    'resume-task': function (v) { NM.resumeTask(v); },
    'power-menu': function () { NM.openPowerMenu(); },
    'close-power': function () { $('#power-menu').classList.remove('on'); },
    'power-key': function () { NM.toggleSleepWake(); },
    'vol-up': function () {
      S.settings.volume = clamp(S.settings.volume + 10, 0, 100);
      NM.applySettings(); NM.save(); NM.island('音量 ' + S.settings.volume + '%', 1000);
      if (S.shade === 'control') NM.renderControlShade();
    },
    'vol-down': function () {
      S.settings.volume = clamp(S.settings.volume - 10, 0, 100);
      NM.applySettings(); NM.save(); NM.island('音量 ' + S.settings.volume + '%', 1000);
      if (S.shade === 'control') NM.renderControlShade();
    },
    'reboot': function () { $('#power-menu').classList.remove('on'); NM.reboot(); },
    'close-dialog': function () { NM.closeDialog(); },
    'enable-lowpower': function () { S.settings.lowpower = true; NM.applySettings(); NM.save(); NM.closeDialog(); NM.island('省电模式已开启', 1500); },
    'do-reset': function () {
      try { W.localStorage.removeItem('muos-v1'); } catch (e) {}
      S.settings = JSON.parse(JSON.stringify(NM.DEFAULT_SETTINGS));
      S.data = JSON.parse(JSON.stringify(NM.DEFAULT_DATA));
      S.notifications = []; S.battery = 100;
      NM.closeDialog(); $('#power-menu').classList.remove('on');
      NM.island('正在恢复出厂设置', 1600);
      setTimeout(NM.reboot, 800);
    },
    'game-restart': function () {
      NM.closeDialog();
      var v = S.views.game;
      if (v) { v.state.board = NM.g2048New(); v.state.score = 0; NM.g2048Save(v); NM.renderView(v); }
    },
    'answer-call': function (v) { NM.answerCall(v); },
    'miss-call': function (v) { NM.missCall(v); },
    'search-note': function (v) {
      $('#spotlight').classList.remove('on');
      NM.launchApp('notes');
      setTimeout(function () { NM.push('notes', 'edit', { id: v }); }, 60);
    },
    'toggle-edit': function () { NM.toggleEditing(); }
  };

  /* 电源相关补充 */
  NM.toggleSleepWake = function () {
    NM.markInput();
    if (S.power !== 'on') { if (S.screen === 'off') NM.boot(); return; }
    if (S.screen === 'off') NM.wake(); else NM.sleep();
  };
  NM.openPowerMenu = function () {
    if (S.power !== 'on') return;
    NM.hideShade(); NM.closeDialog();
    $('#power-slider').querySelector('i').style.left = '4px';
    $('#power-menu').classList.add('on');
  };

  /* ============================================================
     二、统一点击委托
     ============================================================ */
  function dispatch(a, v, el, e) {
    NM.markInput();
    /* 桌面布局 / 小组件 / 应用抽屉 / 边缘面板的动作表由 50-home.js 提供 */
    if (NM.HOME_SYS && NM.HOME_SYS[a]) { NM.HOME_SYS[a](v, el, e); return; }
    if (SYS[a]) { SYS[a](v, el, e); return; }
    var view = S.fg && S.views[S.fg];
    if (view && view.def.actions && view.def.actions[a]) { view.def.actions[a](view, v, el, e); return; }
    /* 多任务卡片空白点击 = 恢复应用；滑动浏览时（位移 > 12px）不算点击 */
    var card = el.closest && el.closest('.recent-card');
    if (card && !a) {
      if (Math.abs(e.clientX - holdX) + Math.abs(e.clientY - holdY) > 12) return;
      NM.resumeTask(card.getAttribute('data-card'));
    }
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-a]') : null;
    if (t) { dispatch(t.getAttribute('data-a'), t.getAttribute('data-v') || '', t, e); return; }
    /* 点击多任务卡片本体恢复应用；滑动浏览时（位移 > 12px）不算点击 */
    var card = e.target.closest ? e.target.closest('.recent-card') : null;
    if (card && S.screen === 'recents') {
      if (Math.abs(e.clientX - holdX) + Math.abs(e.clientY - holdY) > 12) return;
      NM.resumeTask(card.getAttribute('data-card')); return;
    }
    /* 点击多任务界面空白处（背景 / 标题 / 空态 / 空轨道）退出，回到进入前的应用或主屏 */
    if (S.screen === 'recents' && !e.target.closest('.recent-card') && !e.target.closest('[data-a]')) {
      NM.closeRecents(); return;
    }
    /* 关机状态下点屏幕 = 按下电源键开机 */
    if (S.power === 'off' && e.target.closest('#off')) NM.boot();
    /* 点击遮罩关闭电源菜单 */
    if (e.target.id === 'power-menu') $('#power-menu').classList.remove('on');
  });

  /* ============================================================
     三、输入委托：设置滑块、全局搜索、应用内字段
     ============================================================ */
  document.addEventListener('input', function (e) {
    var t = e.target, f = t.getAttribute('data-f'); if (!f) return;
    NM.markInput();
    if (f === 'brightness' || f === 'volume') {
      S.settings[f] = +t.value; NM.applySettings(); NM.save();
      var b = t.parentNode.querySelector('b'); if (b) b.textContent = t.value + '%';
      var rowEl = t.closest('.slider-row');
      if (rowEl) rowEl.style.setProperty('--pct', t.value + '%');
      NM.emit('settings'); return;
    }
    if (f === 'spot-q') { NM.renderSpotlight(t.value); return; }
    if (f === 'dev-name') { S.settings.deviceName = t.value.trim().slice(0, 24); NM.save(); return; }
    if (f === 'wc-zoom') { if (NM.wallZoom) NM.wallZoom(+t.value / 100); return; }
    var v = S.fg && S.views[S.fg];
    if (!v) return;
    if (f === 'chat-draft') v.state.draft = t.value;
    else if (v.def.onField) v.def.onField(v, f, t.value, t);
    else v.state[f] = t.value;
  });

  /* ============================================================
     四、键盘：回车、ESC 返回、方向键、终端历史
     ============================================================ */
  document.addEventListener('keydown', function (e) {
    NM.markInput();
    var t = e.target;
    if (t.id === 'spot-input') { NM.renderSpotlight(t.value); return; }
    if (t.getAttribute && t.getAttribute('data-f') === 'term-cmd') {
      var v = S.views.terminal;
      if (e.key === 'Enter' && v) { NM.termRun(v, t.value); t.value = ''; e.preventDefault(); }
      if (e.key === 'ArrowUp' && v) {
        e.preventDefault(); v.state.hi = clamp(v.state.hi - 1, 0, v.state.hist.length);
        t.value = v.state.hist[v.state.hi - 1] || '';
      }
      if (e.key === 'ArrowDown' && v) {
        e.preventDefault(); v.state.hi = clamp(v.state.hi + 1, 0, v.state.hist.length);
        t.value = v.state.hist[v.state.hi - 1] || '';
      }
      return;
    }
    if (e.key === 'Escape') { NM.back(); return; }
    if (S.screen === 'app' && S.fg === 'game') {
      var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (map[e.key] && S.views.game) { e.preventDefault(); NM.g2048Move(S.views.game, map[e.key]); }
    }
  });

  /* ============================================================
     五、全局手势：全部按真机规则判定
     ============================================================ */
  var G = { x: 0, y: 0, t: 0, active: false, kind: '' };
  var display = $('#display');
  /* 小横条松手回正：所有方向统一用同一组快速过渡 */
  function resetIndicator() {
    var bar = $('#home-indicator');
    if (!bar || (!bar.style.transform && !bar.style.opacity)) return;
    bar.style.transition = 'transform .14s cubic-bezier(.2,.8,.2,1), opacity .12s ease';
    bar.style.transform = ''; bar.style.opacity = '';
    setTimeout(function () { bar.style.transition = ''; }, 180);
  }
  function local(cx, cy) {
    return NM.localPoint ? NM.localPoint(cx, cy) : { x: cx, y: cy, scale: 1 };
  }
  function startKind(x, y, target) {
    var h = display.clientHeight, w = display.clientWidth;
    if (S.power !== 'on') return '';
    if (S.screen === 'off' || S.screen === 'boot') return '';
    /* 竖向小折叠外屏是受限界面，只响应自己的快捷入口；
       横向折叠外屏是一台完整可用的窄长手机，内屏手势照常生效 */
    if (NM.DEV && NM.DEV.screen === 'cover' && NM.DEV.form === 'flip') return '';
    if (y < 56) return 'top';                       /* 下拉通知 / 控制中心 */
    if (y > h - 30) return 'bottom';                /* 上滑回主屏 / 多任务 */
    if (S.screen === 'lock') return 'lock';         /* 锁屏上滑解锁 / 左滑相机 */
    if (S.screen === 'recents') return 'recent';    /* 卡片上滑杀进程 */
    if (x < 26 && S.screen === 'app') return 'edge';/* 左边缘右滑返回 */
    if (S.screen === 'home') return 'home';         /* 主屏翻页 / 下拉搜索 */
    return '';
  }
  display.addEventListener('pointerdown', function (e) {
    if (e.target.closest('input,textarea,[type=range],.side-key')) return;
    /* 编辑模式下小组件由专属拖动系统接管，不进入全局手势 */
    if (S.editing && e.target.closest && e.target.closest('.widget-card')) return;
    G.x = e.clientX; G.y = e.clientY; G.t = Date.now();
    /* 机身缩放后必须换算到屏幕内部坐标，否则顶部/边缘手势判定会整体偏移 */
    var p = local(e.clientX, e.clientY);
    G.scale = p.scale || 1;
    G.kind = startKind(p.x, p.y, e.target);
    G.active = !!G.kind;
    G.card = e.target.closest ? e.target.closest('.recent-card') : null;
    /* 手势是否从小横条上开始：只有这种滑动才需要抑制紧随的 click（home-click） */
    G.ind = !!(e.target.closest && e.target.closest('#home-indicator'));
    if (G.kind === 'recent' && !G.card) G.active = false;
  });
  display.addEventListener('pointermove', function (e) {
    if (!G.active) return;
    var s = G.scale || 1;
    var dx = (e.clientX - G.x) / s, dy = (e.clientY - G.y) / s;
    /* 仅在按住拖动时给反馈：鼠标悬停（无按键）直接清除激活状态，
       避免上次松手在屏幕外导致动效被「冻结」、悬停就触发动画的问题 */
    if (!e.buttons) {
      G.active = false;
      var stale = $('#home-indicator');
      if (stale) { stale.style.transition = ''; stale.style.transform = ''; stale.style.opacity = ''; }
      $$('.shade').forEach(function (sh) { sh.style.transition = ''; sh.style.transform = ''; });
      $('#lock').style.transform = '';
      return;
    }
    /* 拖动过程中给一点实时反馈 */
    if (G.kind === 'top' && dy > 0 && dy < 120 && !S.shade) {
      var shade = local(G.x, G.y).x < display.clientWidth / 2 ? $('#notification-shade') : $('#control-shade');
      shade.style.transition = 'none';
      shade.style.transform = 'translateY(' + (-100 + dy / 1.5) + '%)';
    }
    if (G.kind === 'lock' && dy < 0) $('#lock').style.transform = 'translateY(' + Math.max(dy, -180) + 'px)';
    /* 小横条手势动效：上滑拉伸并向上漂浮渐隐、下滑随指下移、左右滑横向跟手。
       位移超过阈值才开始，微动 / 误触不触发。 */
    if (G.kind === 'bottom' && !S.shade && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      var bar = $('#home-indicator');
      if (bar) {
        bar.style.transition = 'none';
        var up = Math.min(Math.max(0, -dy), 110), down = Math.min(Math.max(0, dy), 40);
        var side = Math.round(clamp(dx * .4, -56, 56));
        bar.style.transform = 'translateX(calc(-50% + ' + side + 'px)) translateY(' +
          Math.round(-up * .22 + down * .45) + 'px) scaleX(' +
          (1 + up / 110 * .45 - down / 40 * .2).toFixed(3) + ')';
        bar.style.opacity = (.85 - up / 110 * .55).toFixed(3);
      }
    }
  });
  display.addEventListener('pointerup', function (e) {
    if (!G.active) return;
    G.active = false;
    var s = G.scale || 1;
    var dx = (e.clientX - G.x) / s, dy = (e.clientY - G.y) / s, dt = Date.now() - G.t;
    $$('.shade').forEach(function (sh) { sh.style.transition = ''; sh.style.transform = ''; });
    $('#lock').style.transform = '';
    resetIndicator();
    /* 小横条上的有效滑动短暂抑制 click，避免左右滑切换被 home-click 回主屏掩盖 */
    if (G.ind && (Math.abs(dx) > 38 || Math.abs(dy) > 38)) SYS._swipeAt = Date.now();
    var relX = local(G.x, G.y).x;
    switch (G.kind) {
      case 'top':
        if (dy > 38) NM.showShade(relX < display.clientWidth / 2 ? 'notif' : 'control');
        break;
      case 'bottom':
        if (dy < -38) {
          if (S.screen === 'lock') NM.beginUnlock();
          else if (S.screen === 'off') NM.wake();
          else if (dt > 1000) NM.openRecents();   /* 上滑拖住满 1 秒 → 多任务 */
          else NM.goHome();                        /* 快速 / 大幅上滑 → 主界面 */
        } else if (dy > 38 && Math.abs(dx) < 60) {
          /* 小横条下滑：通知 / 控制中心展开时收起，否则回到桌面 */
          if (S.shade) NM.hideShade();
          else if (S.screen !== 'home') NM.goHome();
        } else if (Math.abs(dx) > 40 && Math.abs(dy) < 70 && S.screen === 'app') {
          /* 小横条左右滑：在最近应用间快捷切换（dx<0 = 下一个），可在设置中关闭 */
          if (S.settings.indSwitch !== false) NM.quickSwitch(dx < 0 ? 1 : -1);
        }
        break;
      case 'lock':
        if (dy < -55) NM.beginUnlock();
        else if (dx < -60) SYS['lock-camera']();
        else if (dy > 55 && S.screen === 'lock' && S.power === 'on') NM.showShade('notif');
        break;
      case 'edge':
        if (dx > 55 && Math.abs(dy) < 90) SYS['back']();
        break;
      case 'home':
        if (Math.abs(dx) > 55 && Math.abs(dy) < 60) {
          /* 编辑模式下在最后一页继续向左滑 = 新建一页并向后翻 */
          if (S.editing && dx < 0 && dx < -70 && S.homePage >= (S._pages || [1]).length - 1 &&
              NM.HOME_SYS && NM.HOME_SYS['ed-add-page']) {
            NM.HOME_SYS['ed-add-page']();
            NM.gotoPage((S._pages || []).length - 1, true);
            NM.island('已新建桌面页', 1200);
          } else NM.gotoPage(S.homePage + (dx < 0 ? 1 : -1));
        } else if (dy > 70 && Math.abs(dx) < 60) {
          /* 主屏下滑：左侧拉通知中心、右侧拉控制中心（真机分区行为）；
             「下滑打开搜索」开启时，从中部下滑仍优先搜索 */
          var half = relX < display.clientWidth / 2 ? 'notif' : 'control';
          var middle = relX > display.clientWidth * .3 && relX < display.clientWidth * .7;
          if (S.settings.swipeSearch && middle) NM.openSpotlight();
          else NM.showShade(half);
        } else if (dy < -70 && Math.abs(dx) < 60) {
          if (S.settings.swipeUpDrawer) NM.openDrawer();
        } else if (Math.abs(dx) > 40 && S.settings.widgetStack) {
          var wl = (S.data.widgets || []).filter(function (w) { return (w.page || 0) === S.homePage; });
          if (wl.length > 1) {
            NM.widgetIndex = Math.max(0, Math.min(wl.length - 1, NM.widgetIndex + (dx < 0 ? 1 : -1)));
            NM.renderWidget();
          }
        }
        break;
      case 'recent':
        if (G.card && dy < -80) {
          var id = G.card.getAttribute('data-card');
          G.card.style.transform = 'translateY(-120%)'; G.card.style.opacity = '0';
          setTimeout(function () { NM.killApp(id); NM.openRecents(); }, 200);
        }
        break;
    }
  });
  display.addEventListener('pointercancel', function () {
    G.active = false;
    $$('.shade').forEach(function (s) { s.style.transition = ''; s.style.transform = ''; });
    $('#lock').style.transform = '';
    resetIndicator();
  });

  /* 长按主屏进入桌面布局；长按 Home 条进多任务。
     命中区域放宽到整个主屏（图标、空白、小组件都可长按），
     手指移动超过阈值就取消，长按后抑制紧随其后的 click 以免误启动应用。 */
  var holdTimer = 0, holdAt = 0, holdX = 0, holdY = 0;
  document.addEventListener('click', function (e) {
    /* 长按后与手势滑动后抑制紧随其后的 click（小横条左右滑切换不被 home-click 回主屏掩盖） */
    if (Date.now() - holdAt < 600 || Date.now() - (SYS._swipeAt || 0) < 450) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('pointerdown', function (e) {
    holdX = e.clientX; holdY = e.clientY;
    var homeBar = e.target.closest && e.target.closest('#home-indicator');
    var inHome = e.target.closest && e.target.closest('#home');
    var typing = e.target.closest && e.target.closest('input,textarea,[type=range]');
    if (homeBar) {
      holdTimer = setTimeout(function () { holdAt = Date.now(); NM.openRecents(); }, 520);
    } else if (S.screen === 'home' && !S.editing && inHome && !typing) {
      holdTimer = setTimeout(function () { holdAt = Date.now(); NM.openHomeEditor(); }, 560);
    }
  });
  document.addEventListener('pointermove', function (e) {
    if (holdTimer && Math.abs(e.clientX - holdX) + Math.abs(e.clientY - holdY) > 16) {
      clearTimeout(holdTimer); holdTimer = 0;
    }
  });
  document.addEventListener('pointerup', function () { clearTimeout(holdTimer); holdTimer = 0; });
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest('#display')) e.preventDefault();
  });

  /* 电源键：短按息屏/点亮，长按弹关机菜单 */
  var pbtn = $('.sk-power'), powerHold = 0;
  if (pbtn) {
    pbtn.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      powerHold = setTimeout(function () { pbtn.dataset.long = '1'; NM.openPowerMenu(); }, 620);
    });
    pbtn.addEventListener('pointerup', function (e) {
      e.stopPropagation(); clearTimeout(powerHold);
      if (pbtn.dataset.long !== '1') NM.toggleSleepWake();
      pbtn.dataset.long = '';
    });
  }
  /* 滑动关机：把滑块拖到右侧才真正关机 */
  var slider = $('#power-slider'), knob = slider.querySelector('i');
  slider.addEventListener('pointerdown', function (e) { slider.setPointerCapture && slider.setPointerCapture(e.pointerId); });
  slider.addEventListener('pointermove', function (e) {
    if (!e.buttons) return;
    var r = slider.getBoundingClientRect();
    var s = NM.stageScale ? NM.stageScale() : 1;
    var w = (r.width || slider.offsetWidth) / s;
    var x = clamp((e.clientX - r.left) / s - 22, 4, Math.max(4, w - 44));
    knob.style.left = x + 'px';
    if (x > w - 60) { knob.style.left = '4px'; NM.powerOff(); $('#power-menu').classList.remove('on'); }
  });

  /* ============================================================
     六、桌面适配：按窗口高度缩放机身
     ============================================================ */
  function fit() {
    /* 外层设备控制台按当前形态 / 分辨率计算缩放；窄屏时自动全屏 */
    if (NM.fitDevice) return NM.fitDevice();
  }
  W.addEventListener('resize', fit);

  /* ============================================================
     七、启动
     ============================================================ */
  NM.load();
  NM.applyDevice();
  NM.applySettings();
  NM.renderAll();
  NM.renderEdge();
  fit();
  NM.boot();

  setInterval(NM.tickClock, 1000);
  setInterval(NM.tickBattery, 12000);
  setInterval(NM.tickIdle, 1000);
  setInterval(NM.musicTick, 500);
  setInterval(NM.tickSystemExtras, 1000);
  NM.on('settings', function () { NM.renderStatusBarIcons(); NM.renderControlShade(); NM.renderEdge(); });

  /* 开机后系统自己发一条欢迎通知（静默进入通知中心与锁屏） */
  setTimeout(function () {
    NM.notify('about', '欢迎使用 MUOS', '从底部上滑开始体验；所有设置都会真实生效。', { silent: true });
  }, 3200);
})(window);
