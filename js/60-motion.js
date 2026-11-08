/* ============================================================
   MUOS — 60-motion.js
   系统级动效层：把各家系统的设计语言落成真实可感的交互反馈
   · HyperOS 4：柔光玻璃、超级岛、小部件堆叠、生命感缩放
   · ColorOS 17：流体动效、凝光随指流动、点按拉伸回弹
   · HarmonyOS 7：光随指动、光晕引力、通知消散光感粒子
   · iOS 27：液态玻璃的折射层次与高对比可读性
   · OriginOS：原子动效 7.0 弹性 / Q 弹果冻反馈、交互可打断
   所有动效都由开关控制，且不会阻塞任何点击（pointer-events: none）
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, clamp = NM.util.clamp, esc = NM.util.esc, svg = NM.svg;
  var $ = NM.util.$;

  function enabled() {
    var st = S.settings;
    return st.animations && !st.reduceAnim && st.animScale !== 0 &&
      document.documentElement.getAttribute('data-anim') !== '0';
  }
  NM.fxEnabled = enabled;

  /* ------------------------------------------------------------
     一、凝光 / 光晕引力：跟随指尖的柔光（ColorOS + HarmonyOS）
     ------------------------------------------------------------ */
  var glow = null, tx = 50, ty = 40, cx = 50, cy = 40, lastFrame = 0;
  function ensureGlow() {
    if (glow) return glow;
    glow = document.getElementById('glow-veil');
    return glow;
  }
  var display = document.getElementById('display');
  if (display) {
    display.addEventListener('pointermove', function (e) {
      var r = display.getBoundingClientRect();
      tx = clamp((e.clientX - r.left) / (r.width || 1) * 100, 0, 100);
      ty = clamp((e.clientY - r.top) / (r.height || 1) * 100, 0, 100);
    }, { passive: true });
    display.addEventListener('pointerleave', function () { tx = 50; ty = 40; }, { passive: true });
  }

  function frame(ts) {
    W.requestAnimationFrame(frame);
    /* 刷新率决定光晕的更新频率：60 / 90 / 120 Hz 真的有区别 */
    var hz = (NM.DEV && +NM.DEV.hz) || 120;
    var step = 1000 / hz;
    if (ts - lastFrame < step) return;
    lastFrame = ts;
    var g = ensureGlow(); if (!g) return;
    var on = enabled() && (S.settings.dragGlow || S.settings.tapGlow);
    g.style.opacity = on ? '1' : '0';
    if (!on) return;
    cx += (tx - cx) * .12; cy += (ty - cy) * .12;
    g.style.setProperty('--gx', cx.toFixed(1) + '%');
    g.style.setProperty('--gy', cy.toFixed(1) + '%');
    var wp = document.getElementById('wallpaper');
    if (wp) {
      wp.style.setProperty('--mx', ((cx - 50) / 50 * 10).toFixed(2) + 'px');
      wp.style.setProperty('--my', ((cy - 50) / 50 * 10).toFixed(2) + 'px');
    }
  }
  if (W.requestAnimationFrame) W.requestAnimationFrame(frame);

  /* ------------------------------------------------------------
     二、点按涟漪 + 拖尾光点 + 弹性回弹
     ------------------------------------------------------------ */
  function spawnRipple(x, y, big) {
    if (!enabled() || !S.settings.tapGlow) return;
    var host = document.getElementById('fx-layer'); if (!host) return;
    var d = document.createElement('i');
    d.className = 'fx-ripple' + (big ? ' big' : '');
    d.style.left = x + 'px'; d.style.top = y + 'px';
    host.appendChild(d);
    W.setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 720);
  }
  var trailAt = 0;
  function spawnTrail(x, y) {
    if (!enabled() || !S.settings.dragGlow) return;
    var now = Date.now(); if (now - trailAt < 55) return;
    trailAt = now;
    var host = document.getElementById('fx-layer'); if (!host) return;
    var d = document.createElement('i');
    d.className = 'fx-trail';
    d.style.left = x + 'px'; d.style.top = y + 'px';
    host.appendChild(d);
    W.setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 620);
  }
  NM.fxTap = spawnRipple;

  /* 光感粒子：清除通知时通知卡化作粒子飘散（HarmonyOS 7） */
  NM.fxParticles = function (el, n) {
    if (!enabled() || !el) return;
    var host = document.getElementById('fx-layer'); if (!host) return;
    var r = el.getBoundingClientRect(), stage = document.getElementById('display');
    if (!stage || !r.width) return;
    var sr = stage.getBoundingClientRect();
    /* 机身可能被外层 scale() 缩放：屏幕像素必须换算回 #display 内部像素 */
    var s = NM.stageScale ? NM.stageScale() : 1;
    for (var i = 0; i < (n || 10); i++) {
      var p = document.createElement('i');
      p.className = 'fx-particle';
      p.style.left = ((r.left - sr.left + Math.random() * r.width) / s) + 'px';
      p.style.top = ((r.top - sr.top + Math.random() * r.height) / s) + 'px';
      p.style.setProperty('--dx', ((Math.random() - .5) * 150).toFixed(0) + 'px');
      p.style.setProperty('--dy', (-30 - Math.random() * 110).toFixed(0) + 'px');
      p.style.animationDelay = (Math.random() * .16).toFixed(2) + 's';
      host.appendChild(p);
      (function (node) { W.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1100); })(p);
    }
  };

  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('#display')) return;
    if (e.target.closest('input,textarea,[type=range]')) return;
    var stage = document.getElementById('display'); if (!stage) return;
    /* 缩放机身时，clientX/Y 是宿主像素；涟漪层在 #display 内部，必须用局部坐标 */
    var p = NM.localPoint ? NM.localPoint(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    spawnRipple(p.x, p.y, !!e.target.closest('.app-icon,.ctrl-tile,.task-chip'));
    /* Q 弹：按下时图标轻微挤压，松手自然回弹 */
    var ic = e.target.closest('.app-icon .ic-box, .ctrl-tile, .task-chip, .wd-item');
    if (ic && enabled()) {
      ic.classList.remove('q-bounce'); void ic.offsetWidth; ic.classList.add('q-bounce');
      W.setTimeout(function () { ic.classList.remove('q-bounce'); }, 420);
    }
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!e.buttons || !e.target.closest || !e.target.closest('#display')) return;
    if (!document.getElementById('display')) return;
    var p = NM.localPoint ? NM.localPoint(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    spawnTrail(p.x, p.y);
  }, { passive: true, capture: true });

  /* 通知消散粒子：捕获阶段触发，此时卡片还没被移除 */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'dismiss-notif') {
      var card = b.closest('.notif-card'); if (card) NM.fxParticles(card, 9);
    } else if (a === 'clear-notifs') {
      var list = document.querySelectorAll('.notif-card');
      for (var i = 0; i < Math.min(list.length, 4); i++) NM.fxParticles(list[i], 6);
    }
  }, true);

  /* ------------------------------------------------------------
     三、超级岛 / 灵动岛扩展动画
     ------------------------------------------------------------ */
  var BASE_ISLAND = NM.island;
  NM.island = function (text, ms) {
    BASE_ISLAND(text, ms);
    var el = document.getElementById('island');
    if (!el || !enabled()) return;
    el.classList.remove('island-pop'); void el.offsetWidth; el.classList.add('island-pop');
    W.setTimeout(function () { el.classList.remove('island-pop'); }, 520);
  };

  /* ------------------------------------------------------------
     四、锁屏 Now Bar / 开发者 GPU 叠加层 / 隐私显示
     ------------------------------------------------------------ */
  NM.renderNowBar = function () {
    var el = document.getElementById('now-bar'); if (!el) return;
    if (!S.settings.nowBar || S.screen !== 'lock') { el.innerHTML = ''; el.classList.remove('on'); return; }
    var songs = NM.SONGS || [], cur = songs[S.music.idx];
    var bits = [];
    if (cur && S.music.playing) bits.push('<span>' + svg('music', 13) + esc(cur.title) + '</span>');
    if (S.charging) bits.push('<span>' + svg('bolt', 13) + '充电中 ' + Math.round(S.battery) + '%</span>');
    else bits.push('<span>' + svg('battery', 13) + Math.round(S.battery) + '%</span>');
    if (S.notifications.length) bits.push('<span>' + svg('bell', 13) + S.notifications.length + ' 条通知</span>');
    el.innerHTML = bits.join('');
    el.classList.toggle('on', bits.length > 0);
  };
  NM.renderGpuHud = function () {
    var el = document.getElementById('gpu-hud'); if (!el) return;
    if (!S.settings.gpuOverlay) { el.style.display = 'none'; return; }
    var hz = (NM.DEV && NM.DEV.hz) || 120;
    el.style.display = '';
    el.textContent = 'GPU · ' + hz + 'Hz · ' + (S.settings.motion === 'adaptive' ? '自适应' : '标准') + ' · ' + S.tasks.length + ' 任务';
  };

  var BASE_APPLY = NM.applySettings;
  NM.applySettings = function () {
    BASE_APPLY();
    var h = document.documentElement, st = S.settings;
    h.setAttribute('data-fluid', st.motion === 'adaptive' ? '1' : '0');
    h.setAttribute('data-glass-style', st.softGlass ? 'soft' : 'flat');
    h.setAttribute('data-style', st.themePack || 'hyperos');
    h.setAttribute('data-privacy-pin', st.privacyPin ? '1' : '0');
    NM.renderNowBar(); NM.renderGpuHud();
  };
  var BASE_CLOCK = NM.tickClock;
  NM.tickClock = function () { BASE_CLOCK(); NM.renderNowBar(); };
})(window);
