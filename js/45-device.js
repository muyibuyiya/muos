/* ============================================================
   MUOS — 45-device.js
   外层「设备控制台」：运行在模拟系统之外的宿主层。
   · 形态（手机 / 平板 / 折叠屏 / 小折叠）、显示方向、内屏/外屏、
     屏幕分辨率、刷新率、机身缩放、实体按键都在这里设置
   · 模拟系统内部不提供这些开关，只在「关于本机 / 显示」里只读展示
   · 平板形态时系统品牌显示为 MUOS PAD（开机动画、状态栏、关于本机）
   · 参数独立持久化于 muos-device-v1，系统内「恢复出厂设置」不会清除
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, esc = NM.util.esc, clamp = NM.util.clamp, svg = NM.svg;
  var KEY = 'muos-device-v1';

  /* ------------------------------------------------------------
     一、坐标系：机身被 CSS scale() 缩放后，clientX/Y 是「屏幕像素」，
     而 #display 内部所有层用的是「未缩放的 CSS 像素」。
     特效、手势、关机滑块都必须经 localPoint() 换算，否则点哪亮哪会错位。
     ------------------------------------------------------------ */
  NM.stageScale = function () {
    var d = document.getElementById('display'); if (!d) return 1;
    var r = d.getBoundingClientRect();
    var s = (r.width && d.offsetWidth) ? r.width / d.offsetWidth : 1;
    return s > .05 && s < 8 ? s : 1;
  };
  NM.localPoint = function (cx, cy) {
    var d = document.getElementById('display');
    if (!d) return { x: cx, y: cy, scale: 1 };
    var r = d.getBoundingClientRect(), s = NM.stageScale();
    return { x: (cx - r.left) / s, y: (cy - r.top) / s, scale: s };
  };

  /* ------------------------------------------------------------
     二、设备形态表
     · orientation: 是否支持竖向 / 横向（平板）
     · cover: 外屏（折叠屏的 Cover Screen / 小折叠的 Flex Window）
     ------------------------------------------------------------ */
  var FORMS = {
    phone: {
      t: '手机', sub: '直板 · 390dp', w: 390, h: 844, r: 52, pad: 11, cols: 4,
      name: 'APEX 15 Pro', model: 'MU-AP15P',
      brand: 'MUSE', tag: '', diag: 6.7,
      orientation: false, cover: null,
      res: [
        { k: 'hd', t: 'HD+', w: 720, h: 1600, s: .92 },
        { k: 'fhd', t: 'FHD+', w: 1080, h: 2400, s: 1 },
        { k: 'qhd', t: 'QHD+', w: 1440, h: 3200, s: 1.08 }
      ], defRes: 'fhd'
    },
    pad: {
      t: '平板', sub: '竖屏 · 820dp', w: 820, h: 1180, r: 30, pad: 14, cols: 6,
      name: 'APEX Pad 6', model: 'MU-KRD4',
      brand: 'MUSE PAD', tag: 'PAD', diag: 11,
      orientation: true,
      /* 横屏不是第二台机身：宽高直接由竖屏互换得到，只有桌面栅格列数变化 */
      landscape: { cols: 8 },
      cover: null,
      res: [
        { k: 'pad-fhd', t: '1600×2560', w: 1600, h: 2560, s: .94 },
        { k: 'pad-qhd', t: '2000×3200', w: 2000, h: 3200, s: 1 },
        { k: 'pad-uhd', t: '2560×3840', w: 2560, h: 3840, s: 1.06 }
      ], defRes: 'pad-qhd'
    },
    fold: {
      t: '折叠屏', sub: '内屏 · 展开', w: 690, h: 840, r: 26, pad: 12, cols: 6,
      name: 'APEX Fold 4', model: 'MU-WFD3C',
      brand: 'MUSE FOLD', tag: 'FOLD', diag: 7.6,
      orientation: false,
      /* 外屏：合盖后是一台窄长的直板机，没有折痕 */
      cover: {
        t: '外屏 · Cover Screen', w: 330, h: 748, r: 40, pad: 9, cols: 4,
        tag: 'FOLD', diag: 6.3,
        res: [{ k: 'fold-cover', t: '968×2376', w: 968, h: 2376, s: 1 }],
        defRes: 'fold-cover'
      },
      res: [
        { k: 'fold-fhd', t: '1812×2176', w: 1812, h: 2176, s: .95 },
        { k: 'fold-qhd', t: '2200×2480', w: 2200, h: 2480, s: 1 }
      ], defRes: 'fold-qhd'
    },
    flip: {
      t: '小折叠', sub: '内屏 · 竖向', w: 360, h: 760, r: 42, pad: 10, cols: 4,
      name: 'APEX Flip 3', model: 'MU-WEX2',
      brand: 'MUSE FLIP', tag: 'FLIP', diag: 6.7,
      orientation: false,
      /* 外屏：接近正方形的 Flex Window，只显示时钟与快捷信息 */
      cover: {
        t: '外屏 · Flex Window', w: 360, h: 392, r: 34, pad: 9, cols: 3,
        tag: 'FLIP', diag: 3.4,
        res: [{ k: 'flip-cover', t: '720×748', w: 720, h: 748, s: 1 }],
        defRes: 'flip-cover'
      },
      res: [
        { k: 'flip-hd', t: '720×1600', w: 720, h: 1600, s: .95 },
        { k: 'flip-fhd', t: '1080×2400', w: 1080, h: 2400, s: 1 }
      ], defRes: 'flip-fhd'
    }
  };
  NM.DEVICE_FORMS = FORMS;

  /* form 形态 / orient 显示方向 / screen 当前使用的屏幕（main 内屏、cover 外屏）
     cutout 前置摄像头形态 / camSide 摄像头位置（平板可放边框上） */
  var DEV = { form: 'phone', orient: 'portrait', screen: 'main', res: 'fhd', hz: 120, zoom: 1,
    cutout: 'none', camSide: 'screen', open: true };
  NM.DEV = DEV;

  /* 当前生效的几何与分辨率档位：切换形态 / 方向 / 屏幕后自动归一化 */
  function geometry() {
    var f = FORMS[DEV.form] || FORMS.phone;
    var isCover = DEV.screen === 'cover' && !!f.cover;
    var land = !isCover && DEV.orient === 'landscape' && !!f.orientation && !!f.landscape;
    var g = isCover ? f.cover : f;
    var w = g.w, h = g.h, cols = g.cols, radius = g.r, pad = g.pad;
    if (land) {
      /* 同一台设备旋转 90°：宽高互换，机身边框圆角与厚度完全沿用竖向机身，
         只把桌面栅格改成更宽的横屏列数，绝不生成另一种机身。 */
      w = f.h; h = f.w;
      cols = (f.landscape && f.landscape.cols) || 8;
      radius = f.r; pad = f.pad;
    }
    var list = isCover ? f.cover.res : f.res;
    var defRes = isCover ? f.cover.defRes : f.defRes;
    var res = list.filter(function (x) { return x.k === DEV.res; })[0];
    if (!res) { DEV.res = defRes; res = list.filter(function (x) { return x.k === DEV.res; })[0] || list[0]; }
    var rw = res.w, rh = res.h, label = res.t;
    if (land) { rw = res.h; rh = res.w; label = res.h + '×' + res.w; }
    return {
      f: f, isCover: isCover, land: land, w: w, h: h, cols: cols,
      radius: radius, pad: pad, res: res, resW: rw, resH: rh, resLabel: label,
      list: list, defRes: defRes, diag: g.diag || f.diag
    };
  }

  NM.loadDevice = function () {
    try {
      var o = JSON.parse(W.localStorage.getItem(KEY) || 'null');
      if (o) Object.keys(DEV).forEach(function (k) { if (o[k] !== undefined) DEV[k] = o[k]; });
    } catch (e) {}
    if (!FORMS[DEV.form]) DEV.form = 'phone';
    geometry();  /* 顺带把不属于当前屏幕的旧分辨率回落掉 */
  };
  NM.saveDevice = function () {
    try { W.localStorage.setItem(KEY, JSON.stringify(DEV)); } catch (e) {}
  };

  /* 当前生效的完整设备参数：系统内部所有只读展示都取这里 */
  NM.deviceInfo = function () {
    var g = geometry(), f = g.f;
    var cssW = Math.round(g.w * g.res.s), cssH = Math.round(g.h * g.res.s);
    var diagPx = Math.sqrt(g.resW * g.resW + g.resH * g.resH);
    return {
      form: DEV.form, formLabel: f.t, brand: f.brand,
      /* 设备名称可由用户自定义（账户中心 / 关于本机），认证型号不可改 */
      name: ((S.settings.deviceName || '').trim()) || f.name, defName: f.name, model: f.model,
      cutout: DEV.cutout || 'none', camSide: DEV.camSide || 'screen',
      tag: f.tag, cols: g.cols, cssW: cssW, cssH: cssH,
      radius: g.radius, framePad: g.pad,
      resKey: g.res.k, resLabel: g.resLabel, resW: g.resW, resH: g.resH,
      dpr: (g.resW / cssW).toFixed(2), ppi: Math.round(diagPx / g.diag),
      hz: DEV.hz, zoom: DEV.zoom,
      orient: g.land ? 'landscape' : 'portrait',
      orientLabel: g.land ? '横向' : '竖向',
      screen: g.isCover ? 'cover' : 'main',
      screenLabel: g.isCover ? f.cover.t : '内屏 · 展开',
      isCover: g.isCover, isFoldInner: DEV.form === 'fold' && !g.isCover,
      isPad: DEV.form === 'pad', hasOrientation: !!f.orientation, hasCover: !!f.cover
    };
  };

  /* ------------------------------------------------------------
     三、落地：改机身尺寸、栅格、品牌，并同步系统内的只读展示
     ------------------------------------------------------------ */
  NM.applyDevice = function () {
    var i = NM.deviceInfo(), h = document.documentElement, root = h.style;
    root.setProperty('--pw', i.cssW + 'px');
    root.setProperty('--ph', i.cssH + 'px');
    root.setProperty('--frame-r', i.radius + 'px');
    root.setProperty('--frame-pad', i.framePad + 'px');
    root.setProperty('--home-cols', String(i.cols));
    root.setProperty('--snap-scale', String(300 / i.cssW));
    h.setAttribute('data-form', i.form);
    h.setAttribute('data-orient', i.orient);
    h.setAttribute('data-cover', i.isCover ? '1' : '0');
    h.setAttribute('data-seam', i.isFoldInner ? '1' : '0');
    h.setAttribute('data-hz', String(i.hz));
    h.setAttribute('data-res', i.resKey);
    h.setAttribute('data-device-brand', i.brand);
    h.setAttribute('data-rotatable', i.hasOrientation ? '1' : '0');
    /* 前置摄像头形态（挖孔 / 灵动岛 / 刘海）与位置；平板可放边框上并加宽边框 */
    h.setAttribute('data-cam', i.cutout);
    h.setAttribute('data-cam-side', (i.isPad && i.camSide === 'frame' && i.cutout !== 'none') ? 'frame' : 'screen');
    S.settings.cameraCutout = i.cutout !== 'none';   /* 供状态栏明暗等系统逻辑只读使用 */
    /* 横向折叠外屏＝完整系统；竖向小折叠外屏＝只能看通知与小组件 */
    var coverMode = !i.isCover ? 'none' : (DEV.form === 'flip' ? 'restricted' : 'full');
    h.setAttribute('data-cover-mode', coverMode);
    /* 品牌：开机动画 / 桌面标题 / 状态角标 / 系统内只读字段 */
    var boot = document.querySelector('.boot-name'); if (boot) boot.textContent = i.brand;
    var hint = document.querySelector('#stage-hint strong');
    if (hint) hint.textContent = i.brand + ' · 浏览器里的完整手机系统';
    var sb = document.getElementById('sb-brand');
    if (sb) {
      sb.textContent = i.isCover ? i.tag + ' 外屏' : i.tag;
      sb.style.display = i.tag ? '' : 'none';
    }
    /* 系统内设置页 / 关于本机若正开着，刷新只读数据但不重建 DOM */
    var av = S.views && S.views.about, sv = S.views && S.views.settings;
    if (av && S.fg === 'about') NM.renderView(av);
    if (sv && S.fg === 'settings') NM.renderView(sv);
    if (NM.renderPages) NM.renderPages();
    if (NM.renderWidget) NM.renderWidget();
    if (NM.renderDock) NM.renderDock();
    NM.renderCoverPanel();
    NM.fitDevice();
    NM.renderDevicePanel();
    NM.saveDevice();
  };

  /* 按窗口大小缩放机身：默认不放大，避免平板横屏被撑到顶到视口边界。
     用「中心缩放 + 上下等分补偿外边距」，视觉高度始终等于布局占位高度。 */
  NM.fitDevice = function () {
    var dev = document.getElementById('device'); if (!dev) return;
    var i = NM.deviceInfo();
    if (W.innerWidth <= 520) {
      dev.style.transform = 'none'; dev.style.margin = ''; dev.style.transformOrigin = '';
      return;
    }
    /* 控制台是左侧固定浮层：宽机身（平板横屏 / 折叠内屏）必须让出它的宽度，
       否则机身左半会被控制台盖住。可用区中心相对视口中心的偏移就是 translateX。 */
    var consoleRight = (DEV.open && W.innerWidth > 760) ? 310 : (W.innerWidth > 760 ? 204 : 0);
    var rightGap = 28;
    var availW = Math.max(240, W.innerWidth - consoleRight - rightGap);
    var availH = Math.max(320, W.innerHeight - 138); /* 预留舞台提示与上下留白 */
    var s = Math.min(availW / i.cssW, availH / i.cssH, 1);
    /* 平板旋转是同一台机身：竖 / 横两向必须得到同一个缩放值，
       否则旋转 90° 后视觉大小突变。用两向都能容纳的更小值做上限。 */
    if (i.hasOrientation) {
      s = Math.min(s, availW / Math.max(i.cssW, i.cssH), availH / Math.max(i.cssW, i.cssH));
    }
    s = clamp(s * (DEV.zoom || 1), .3, 1.35);
    var shift = consoleRight ? (consoleRight - rightGap) / 2 : 0;
    dev.style.transformOrigin = 'center center';
    dev.style.transform = 'translateX(' + Math.round(shift) + 'px) scale(' + s + ')';
    var extra = Math.round(i.cssH * (s - 1));
    dev.style.marginTop = Math.round(extra / 2) + 'px';
    dev.style.marginBottom = Math.round(extra / 2) + 'px';
    dev.style.marginLeft = '';
    dev.style.marginRight = '';
  };

  /* ------------------------------------------------------------
     四、外屏锁屏面板：合盖时只显示时钟 / 电量 / 通知 / 两个快捷入口
     ------------------------------------------------------------ */
  NM.renderCoverPanel = function () {
    var el = document.getElementById('cover-panel'); if (!el) return;
    var i = NM.deviceInfo();
    /* 横向折叠（fold）合盖后外屏就是一台可完整使用的窄长直板机：
       不盖遮罩，锁屏 / 主屏 / 应用 / 通知中心全部照常工作。 */
    if (!i.isCover || DEV.form !== 'flip') { el.style.display = 'none'; return; }
    /* 竖向小折叠（flip）的 Flex Window：只能查看通知、系统小组件与时钟 */
    el.style.display = 'flex';
    el.classList.add('cp-flip');
    var d = new Date(), tab = DEV.coverTab || 'notif';
    var notes = (S.notifications || []).slice(0, 4);
    var w = NM.weatherNow ? NM.weatherNow() : { desc: '晴', temp: 22 };
    var listHtml = notes.length ? notes.map(function (n) {
      return '<div class="cp-notif" data-cp="open-notif" data-cpv="' + esc(n.id) + '">' +
        NM.iconBox(n.app, 15) + '<span><b>' + esc(n.title) + '</b><small>' + esc(n.body) + '</small></span></div>';
    }).join('') : '<div class="cp-empty">暂无通知</div>';
    var mini = [
      ['天气', w.desc + ' · ' + w.temp + '°', 'cloud'],
      ['电量', Math.round(S.battery) + '%' + (S.charging ? ' · 充电中' : ''), 'battery'],
      ['时间', NM.util.hhmm(d) + ' · ' + NM.util.dateCN(d), 'clock']
    ].map(function (x) {
      return '<div class="cp-mini"><span>' + svg(x[2] === 'battery' ? 'power' : x[2], 16) + '</span>' +
        '<b>' + esc(x[1]) + '</b><small>' + esc(x[0]) + '</small></div>';
    }).join('');
    el.innerHTML =
      '<div class="cp-status"><span>' + esc(i.brand) + ' · Flex Window</span><span>' +
        Math.round(S.battery) + '%' + (S.charging ? ' ⚡' : '') + '</span></div>' +
      '<div class="cp-clock"><b>' + NM.util.hhmm(d) + '</b><small>' + NM.util.dateCN(d) + '</small></div>' +
      '<div class="cp-tabs"><button class="' + (tab === 'notif' ? 'on' : '') +
        '" data-cp="tab" data-cpv="notif">通知</button>' +
        '<button class="' + (tab === 'widget' ? 'on' : '') + '" data-cp="tab" data-cpv="widget">小组件</button></div>' +
      '<div class="cp-body">' + (tab === 'notif' ? listHtml : '<div class="cp-minis">' + mini + '</div>') + '</div>' +
      '<div class="cp-actions">' +
        '<button data-cp="torch">手电筒' + (S.settings.torch ? ' · 开' : '') + '</button>' +
        '<button data-cp="expand">展开内屏</button>' +
      '</div>' +
      '<div class="cp-hint">外屏仅提供系统通知与小组件 · 在左侧控制台可切回内屏使用全部应用</div>';
  };

  /* 外屏快捷入口：手电筒真生效；相机等于「展开手机 → 打开相机」 */
  function initCoverKeys() {
    var el = document.getElementById('cover-panel'); if (!el) return;
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-cp]'); if (!b) return;
      var a = b.getAttribute('data-cp'), val = b.getAttribute('data-cpv') || '';
      if (a === 'torch') {
        S.settings.torch = !S.settings.torch;
        NM.applySettings(); NM.save(); NM.renderCoverPanel();
      } else if (a === 'camera') {
        DEV.screen = 'main'; NM.applyDevice();
        if (S.screen === 'lock') NM.beginUnlock();
        NM.launchApp('camera');
      } else if (a === 'expand') {
        DEV.screen = 'main'; NM.applyDevice();
        if (S.screen === 'lock') NM.beginUnlock();
      } else if (a === 'tab') {
        DEV.coverTab = val; NM.renderCoverPanel();
      } else if (a === 'open-notif') {
        if (NM.openNotif) NM.openNotif(val);
      }
      if (NM.markInput) NM.markInput();
    });
  }

  /* ------------------------------------------------------------
     五、外层控制台 UI（宿主层 DOM，不属于模拟系统）
     ------------------------------------------------------------ */
  var panel = null;
  function formIcon(k) {
    var m = {
      phone: '<rect x="7" y="2" width="10" height="20" rx="2"/>',
      pad: '<rect x="2" y="4" width="20" height="16" rx="2"/>',
      fold: '<path d="M3 5h8v14H3zM13 5h8v14h-8zM11 5h2v14h-2"/>',
      flip: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 12h12"/>'
    };
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">' + (m[k] || m.phone) + '</svg>';
  }
  function chips(items, current, action) {
    return '<div class="dc-chips">' + items.map(function (x) {
      return '<button class="' + (x[0] === current ? 'on' : '') + '" data-d="' + action + '" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  NM.renderDevicePanel = function () {
    if (!panel) return;
    var i = NM.deviceInfo(), g = geometry(), f = g.f;
    panel.classList.toggle('collapsed', !DEV.open);
    panel.innerHTML =
      '<div class="dc-head"><span class="dc-dot"></span><div><b>设备控制台</b><small>DEVICE · 宿主层参数</small></div>' +
      '<button data-d="toggle" title="收起 / 展开">' + NM.svg('chevron', 16) + '</button></div>' +
      '<div class="dc-body">' +
      '<div class="dc-label">设备形态 <span>切换后系统品牌随之变化</span></div>' +
      '<div class="dc-forms">' + Object.keys(FORMS).map(function (k) {
        var x = FORMS[k];
        return '<button class="dc-form ' + (k === DEV.form ? 'on' : '') + '" data-d="form" data-v="' + k + '">' +
          formIcon(k) + '<b>' + x.t + '</b><small>' + x.sub + '</small></button>';
      }).join('') + '</div>' +
      /* 折叠屏 / 小折叠：内屏与外屏切换 */
      (f.cover ? '<div class="dc-label">使用屏幕 <span>' + esc(i.screenLabel) + '</span></div>' +
        chips([['main', '内屏展开'], ['cover', '外屏']], DEV.screen, 'screen') : '') +
      /* 平板：竖向 / 横向 */
      (f.orientation ? '<div class="dc-label">显示方向 <span>' + esc(i.orientLabel) + '</span></div>' +
        chips([['portrait', '竖向'], ['landscape', '横向']], DEV.orient, 'orient') : '') +
      '<div class="dc-label">屏幕分辨率 <span>' + i.resW + ' × ' + i.resH + '</span></div>' +
      '<div class="dc-chips">' + g.list.map(function (r) {
        return '<button class="' + (r.k === DEV.res ? 'on' : '') + '" data-d="res" data-v="' + r.k + '">' + r.t + '</button>';
      }).join('') + '</div>' +
      '<div class="dc-label">刷新率 <span>' + i.hz + ' Hz</span></div>' +
      chips([['60', '60 Hz'], ['90', '90 Hz'], ['120', '120 Hz']], String(i.hz), 'hz') +
      '<div class="dc-label">前置摄像头 <span>状态栏区域的形态</span></div>' +
      chips([['none', '无'], ['hole', '挖孔'], ['island', '灵动岛'], ['notch', '刘海']], i.cutout, 'cam') +
      (i.isPad ? '<div class="dc-label">摄像头位置 <span>放边框上会加宽顶部边框</span></div>' +
        chips([['screen', '屏幕内'], ['frame', '边框上']], DEV.camSide, 'camside') : '') +
      '<div class="dc-label">画面缩放 <span id="dc-zoom-val">' + Math.round((DEV.zoom || 1) * 100) + '%</span></div>' +
      '<input class="dc-range" type="range" min="60" max="130" value="' + Math.round((DEV.zoom || 1) * 100) + '" data-f="dev-zoom">' +
      '<div class="dc-label">实体按键 <span>与机身侧键等效</span></div>' +
      '<div class="dc-keys">' +
      '<button data-d="key" data-v="vol-up" title="音量 +">' + svg('plus', 14) + ' 音量 +</button>' +
      '<button data-d="key" data-v="vol-down" title="音量 −">' + svg('minus', 14) + ' 音量 −</button>' +
      '<button class="dc-power" data-d="power" title="短按息屏 / 点亮，长按弹出关机菜单">电源键 · 长按关机</button>' +
      '<button data-d="key" data-v="power-menu" title="直接打开电源菜单">电源菜单</button>' +
      '</div>' +
      '<div class="dc-readout">' +
      '<div><span>设备名称</span><b>' + esc(i.name) + '</b></div>' +
      '<div><span>认证型号</span><b>' + esc(i.model) + '</b></div>' +
      (f.cover ? '<div><span>使用屏幕</span><b>' + esc(i.isCover ? '外屏' : '内屏') + '</b></div>' : '') +
      (f.orientation ? '<div><span>显示方向</span><b>' + esc(i.orientLabel) + '</b></div>' : '') +
      '<div><span>逻辑视口</span><b>' + i.cssW + ' × ' + i.cssH + ' dp</b></div>' +
      '<div><span>物理分辨率</span><b>' + i.resW + ' × ' + i.resH + '</b></div>' +
      '<div><span>像素密度</span><b>' + i.ppi + ' ppi · ' + i.dpr + 'x</b></div>' +
      '<div><span>桌面栅格</span><b>' + i.cols + ' 列</b></div>' +
      '</div>' +
      '<div class="dc-note">以上参数由外层控制台设定。模拟系统内的「关于本机 / 显示」只做只读展示，不能反向修改硬件。</div>' +
      '<div class="dc-foot"><button data-d="reboot">重启模拟系统</button><button data-d="reset">恢复默认参数</button></div>' +
      '</div>';
  };

  /* 宿主层硬件按键：直接改系统状态，和机身右侧实体键走同一套逻辑 */
  function hwKey(k) {
    if (k === 'vol-up' || k === 'vol-down') {
      S.settings.volume = clamp(S.settings.volume + (k === 'vol-up' ? 10 : -10), 0, 100);
      NM.applySettings(); NM.save();
      NM.island('音量 ' + S.settings.volume + '%', 1000);
      if (S.shade === 'control' && NM.renderControlShade) NM.renderControlShade();
    } else if (k === 'power-menu') {
      if (NM.openPowerMenu) NM.openPowerMenu();
    } else if (k === 'power') {
      if (NM.toggleSleepWake) NM.toggleSleepWake();
    }
    if (NM.markInput) NM.markInput();
  }

  function initPanel() {
    panel = document.createElement('aside');
    panel.id = 'device-console';
    document.body.appendChild(panel);
    panel.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-d]'); if (!b) return;
      var a = b.getAttribute('data-d'), v = b.getAttribute('data-v') || '';
      if (a === 'power') return;              /* 电源键由 pointerdown/up 处理长按 */
      if (a === 'toggle') DEV.open = !DEV.open;
      else if (a === 'form' && FORMS[v]) {
        DEV.form = v; DEV.orient = 'portrait'; DEV.screen = 'main'; DEV.res = FORMS[v].defRes;
      } else if (a === 'screen') DEV.screen = v;
      else if (a === 'orient') DEV.orient = v;
      else if (a === 'res') DEV.res = v;
      else if (a === 'hz') DEV.hz = +v;
      else if (a === 'cam') DEV.cutout = v;
      else if (a === 'camside') DEV.camSide = v;
      else if (a === 'key') { hwKey(v); return; }
      else if (a === 'reset') {
        DEV.form = 'phone'; DEV.orient = 'portrait'; DEV.screen = 'main';
        DEV.res = 'fhd'; DEV.hz = 120; DEV.zoom = 1; DEV.open = true;
        DEV.cutout = 'none'; DEV.camSide = 'screen';
      } else if (a === 'reboot') {
        if (NM.reboot) NM.reboot();
        NM.applyDevice(); return;
      }
      NM.applyDevice();
      if (NM.markInput) NM.markInput();
    });
    panel.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-f') !== 'dev-zoom') return;
      DEV.zoom = +e.target.value / 100;
      var lab = panel.querySelector('#dc-zoom-val');
      if (lab) lab.textContent = e.target.value + '%';
      NM.fitDevice(); NM.saveDevice();
    });
    /* 电源键短按 / 长按（与机身右侧 .sk-power 行为一致） */
    var hold = 0, long = false;
    panel.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('[data-d="power"]'); if (!b) return;
      long = false;
      hold = W.setTimeout(function () { long = true; if (NM.openPowerMenu) NM.openPowerMenu(); }, 620);
    });
    panel.addEventListener('pointerup', function (e) {
      var b = e.target.closest && e.target.closest('[data-d="power"]'); if (!b) return;
      W.clearTimeout(hold);
      if (!long) hwKey('power');
      long = false;
    });
    panel.addEventListener('pointercancel', function () { W.clearTimeout(hold); long = false; });
    NM.renderDevicePanel();
  }

  NM.loadDevice();
  NM.applyDevice();           /* 先落地 CSS 变量，宿主层不依赖系统开机状态 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initPanel(); initCoverKeys(); });
  } else { initPanel(); initCoverKeys(); }
  W.addEventListener('resize', function () { NM.fitDevice(); });
  W.setInterval(NM.renderCoverPanel, 1000);
})(window);
