/* ============================================================
   MUOS — 00-core.js
   基础设施：工具函数 / SVG 图标库 / 应用注册表 / 全局状态 /
   持久化 / 通知总线 / 实时时钟 / 灵动岛 / 系统对话框
   ============================================================ */
(function (W) {
  'use strict';

  var NM = W.NM = W.NM || {};

  /* ---------------- 小工具 ---------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  /* 12/24 小时制与系统语言由「常规管理」实时决定，状态栏/锁屏/小组件共用 */
  var hhmm = function (d) {
    var h = d.getHours(), m = pad(d.getMinutes());
    var st = NM.S && NM.S.settings;
    if (st && st.hour24 === false) return (h < 12 ? '上午 ' : '下午 ') + (h % 12 || 12) + ':' + m;
    return pad(h) + ':' + m;
  };
  var dateCN = function (d) {
    var st = NM.S && NM.S.settings;
    if (st && st.language === 'en-US') {
      var mon = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var wd = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return mon[d.getMonth()] + ' ' + d.getDate() + ', ' + wd[d.getDay()];
    }
    var wk = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + wk[d.getDay()];
  };
  var fullDate = function (d) {
    var st = NM.S && NM.S.settings;
    if (st && st.language === 'en-US') {
      var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return wd[d.getDay()] + ', ' + mon[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' +
      ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  };
  var relTime = function (ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
    return hhmm(new Date(ts));
  };
  NM.util = { $: $, $$: $$, pad: pad, clamp: clamp, esc: esc, uid: uid, hhmm: hhmm, dateCN: dateCN, fullDate: fullDate, relTime: relTime };

  /* ---------------- SVG 图标库（全系统不用 emoji） ---------------- */
  var P = {
    phone: '<path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 0 0 6 6l1.5-2L21 14.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
    message: '<path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-3.5A3 3 0 0 1 3 15V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/><path d="M7.5 9h9M7.5 12.5h6"/>',
    camera: '<path d="M3 8h3l1.5-2h9L18 8h3v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
    photos: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    weather: '<circle cx="8" cy="8" r="3.2"/><path d="M18.5 17.5a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-10 1.6A3.4 3.4 0 0 0 8.5 18h9.5"/><path d="M18.5 17.5H8"/>',
    calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h.01M8 18h2M12 18h2M16 18h.01"/>',
    notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 18h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 7 2.6h.1A1.7 1.7 0 0 0 8.3 1V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 2.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9z"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    files: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M6 9l3 3-3 3M11.5 15H17"/>',
    game: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    store: '<path d="M4 8h16l-1 12H5L4 8z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
    recorder: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    battery: '<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 11v2"/><path d="M6 12h8"/>',
    maps: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    torch: '<path d="M9 3h6v4l3 4v2H6v-2l3-4zM10 17h4M10 20h4"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
    bluetooth: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
    airplane: '<path d="M21 15.5l-8-4V5.8a1.6 1.6 0 0 0-3 0v5.7l-8 4V18l8-2.5V20l-2 1.2V22l3.5-1 3.5 1v-.8L13 20v-4.5l8 2.5z"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    signal: '<path d="M3 19h2v-4H3zM8 19h2v-7H8zM13 19h2V9h-2zM18 19h2V5h-2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    send: '<path d="M21 3L3 10.5l7 3 3 7z"/><path d="M10 13.5L21 3"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    prev: '<path d="M6 5v14M19 5L9 12l10 7z"/>',
    next: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
    power: '<path d="M12 3v9M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    brightness: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    recent: '<rect x="3" y="6" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
    square: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    call: '<path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 0 0 6 6l1.5-2L21 14.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
    del: '<path d="M20 6H9l-5 6 5 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1zM16 10l-4 4M12 10l4 4"/>',
    flip: '<path d="M4 8a8 8 0 0 1 14-3M20 5v4h-4M20 16a8 8 0 0 1-14 3M4 19v-4h4"/>',
    flash: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
    heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    storage: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16zM13 7l4 4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6M12 2v3"/>',
    stopwatch: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3M18 6l2-2"/>',
    alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M5 3L2 6M19 3l3 3"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4 6 6 0 0 0-9-6z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01M8 17h8"/>',
    rain: '<path d="M18.5 15a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-10 1.6A3.4 3.4 0 0 0 8.5 15M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
    cloud: '<path d="M18.5 18a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-10 1.6A3.4 3.4 0 0 0 8.5 18z"/>',
    snow: '<path d="M18.5 15a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-10 1.6A3.4 3.4 0 0 0 8.5 15M8 18h.01M12 19h.01M16 18h.01"/>',
    mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    bolt: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
    location: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    cube: '<path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
    volumeOff: '<path d="M4 9v6h4l5 4V5L8 9H4zM17 9l4 6M21 9l-4 6"/>',
    contacts: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0M3 5h4M17 5h4"/>',
    health: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
    assistant: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>',
    stack: '<rect x="3" y="4" width="14" height="14" rx="2"/><path d="M7 20h12a2 2 0 0 0 2-2V8"/>',
    person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    moonstar: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4"/><path d="M18 3l.7 1.8L20.5 5.5l-1.8.7L18 8l-.7-1.8-1.8-.7 1.8-.7z"/>'
  };
  NM.ICON = P;
  NM.svg = function (name, size) {
    var s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (P[name] || P.info) + '</svg>';
  };

  /* ---------------- 应用注册表 ---------------- */
  /* sysOnly：系统内部页面，不作为桌面图标出现（真机里「关于本机」「电池」在设置内） */
  var A = function (id, name, icon, c1, c2, dock, badge, sysOnly) {
    return { id: id, name: name, icon: icon, c1: c1, c2: c2, dock: !!dock, badge: badge || '', sysOnly: !!sysOnly };
  };
  NM.APPS = [
    /* Dock：与真机一致的四个常用入口 */
    A('phone', '电话', 'phone', '#43d17f', '#169b57', 1),
    A('messages', '信息', 'message', '#5cb0ff', '#2b6fd6', 1),
    A('browser', '浏览器', 'globe', '#6f95ff', '#3b5bdb', 1),
    A('camera', '相机', 'camera', '#9aa3b5', '#4c5261', 1),
    /* 桌面应用 */
    A('weather', '天气', 'weather', '#f0a95e', '#e5714f'),
    A('clock', '时钟', 'clock', '#3b4256', '#171b2a'),
    A('photos', '相册', 'photos', '#f07ea8', '#b952c9'),
    A('calculator', '计算器', 'calculator', '#626a80', '#2d3345'),
    A('notes', '笔记', 'notes', '#ffd066', '#e59a2b'),
    A('calendar', '日历', 'calendar', '#f06b6b', '#c33b5b'),
    A('music', '音乐', 'music', '#e9708f', '#a445c4'),
    A('contacts', '联系人', 'contacts', '#62c6a8', '#2f8f80'),
    A('health', '健康', 'health', '#f2778f', '#c9406a'),
    A('wallet', '钱包', 'wallet', '#8c9cf0', '#4a55b8'),
    A('assistant', '超级助手', 'assistant', '#7fb6ff', '#4564d8'),
    A('settings', '设置', 'settings', '#8f98ad', '#565f75'),
    A('files', '我的文件', 'files', '#63b6ee', '#3179c6'),
    A('store', '应用商店', 'store', '#6a8dff', '#3d55cf'),
    A('recorder', '录音机', 'recorder', '#f06b6b', '#b93a55'),
    A('maps', '地图', 'maps', '#5cc0a8', '#2c7f86'),
    A('game', '2048', 'game', '#e8b45c', '#c07a2b'),
    /* 系统内部：终端需在「开发者选项」里开启后才出现在应用抽屉 */
    A('terminal', '终端', 'terminal', '#3f4a5c', '#161c28', 0, '', 1),
    A('battery', '电池', 'battery', '#5fd39a', '#238a63', 0, '', 1),
    A('about', '关于本机', 'about', '#8f98ad', '#565f75', 0, '', 1)
  ];
  NM.appById = function (id) {
    for (var i = 0; i < NM.APPS.length; i++) if (NM.APPS[i].id === id) return NM.APPS[i];
    return null;
  };
  NM.iconBox = function (app, size) {
    var s = size || 20;
    return '<span class="ic-box" style="background:linear-gradient(140deg,' + app.c1 + ',' + app.c2 + ')">' +
      NM.svg(app.icon, s) + '</span>';
  };

  /* ---------------- 默认设置与用户数据 ---------------- */
  var DEFAULT_SETTINGS = {
    /* 连接 */
    airplane: false, wifi: true, cellular: true, bluetooth: true, nfc: true,
    hotspot: false, dataSaver: false, wifiAuto: true,
    /* 声音与振动 */
    volume: 55, ringVol: 70, notifVol: 60, sysVol: 50,
    ringTone: 'muos_origin', notifTone: 'chime', vibration: 2,
    systemSound: true, dolby: true, touchSound: true,
    /* 通知 */
    appNotif: {}, lockNotif: true, hideSensitive: false, notifPop: 'brief',
      badgeStyle: 'number', pageFx: 'classic', panelMode: 'split', notifStack: true,
    /* 显示 */
    theme: 'dark', darkSchedule: false, brightness: 82, adaptiveBright: false,
    extraBright: false, motion: 'adaptive', eyeShield: false, eyeSchedule: false,
    screenMode: 'vivid', whiteBalance: 50, fontScale: 1, boldFont: false,
    fontStyle: 'default', screenZoom: 1, resolution: 'fhd',
    easyMode: false, edgePanel: false, touchSensitivity: false,
    chargeInfo: true, screenSaver: false, cameraCutout: false,
    privacyDisplay: false, privacyAuto: false, privacyMax: false, privacyPin: false,
    /* 壁纸与风格 / 主题 */
    wall: 'hyper', palette: 'blue', paletteIcons: false, lockWallSame: true,
    dynamicLock: false, themePack: 'hyperos', iconShape: 'squircle',
    /* 主屏幕 */
    swipeSearch: true, homeLayout: 'both', homeGrid: '4x6', appGrid: '4x6',
    folderGrid: '3x3', swipeUpDrawer: true, addNewApps: true,
    layoutLocked: false, rotateLandscape: false, showSearchPill: true,
    /* 设置首页快捷任务：整块可关、可折叠，单项也可单独隐藏 */
    showTasks: true, taskFolded: false, taskHidden: {},
    /* 锁定屏幕与息屏显示 */
    pinOn: false, pin: '1314', autolock: 60, lockClock: 'digital',
    lockNotifStyle: 'stack', aod: false, aodMode: 'tap', aodClock: 'line',
    aodBright: 50, nowBar: true, lockOwner: '',
    lockShortcutLeft: 'torch', lockShortcutRight: 'camera',
    /* 生物识别与安全 / 隐私 / 位置 / 紧急 */
    fingerprint: false, face: false, secureFolder: false, autoBlocker: false,
    findMyPhone: true, lockAfterRestart: true,
    camAccess: true, micAccess: true, clipboardAlert: true, diagData: false,
    permissions: {}, location: true, precise: true, wifiScan: true, btScan: true,
    emergencySos: true, medicalInfo: '', wirelessAlert: true,
    /* 账户 / AI / 高级功能 / 模式 */
    accountName: 'MUOS 用户', autoSync: true, backupWifi: true, lastBackup: 0,
    /* MUOS 账户中心：登录态、云同步、同步项、设备绑定 */
    accountLoggedIn: true, muosId: 'MUOS_20261108', accountPhone: '138 0013 8000',
    accountEmail: 'muos@device.local', cloudSync: true, findDevice: true, lastSync: 0,
    syncItems: { contacts: true, notes: true, photos: false, settings: true },
    accountAvatar: 'blue',
    aiCircle: true, aiCall: false, aiWrite: true, aiPhoto: true,
    aiBrowse: true, aiTranscribe: true, aiNudge: true, aiOnDevice: true,
    aiLang: 'zh-CN', multiWindow: true, liftToWake: false,
    doubleTapWake: true, flipMute: false, sideKeyDouble: 'camera',
    oneHanded: false, dualMessenger: false, foldMode: false, labs: false,
    focusMode: false, bedtimeMode: false, dnd: false,
    /* 数字健康 / 电池 / 常规 / 辅助 / 更新 / 开发者 */
    appTimers: {}, wellbeingGoal: 120, lowpower: false, batteryProtect: false,
    bgLimit: 999, autoOptimize: false, language: 'zh-CN', hour24: true,
    autoTime: true, keyboard: 'default', highContrast: false,
    reduceAnim: false, colorCorrection: false, colorInvert: false,
    magnification: false, hearingBoost: false, touchHold: 1,
    a11yShortcut: false, autoUpdate: true, lastUpdateCheck: 0,
    devOn: false, showTaps: false, animScale: 1, usbDebug: false,
    gpuOverlay: false, terminalEnabled: false, buildTaps: 0,
    /* HyperOS 4「生命感美学」与超级岛 */
    softGlass: true, tapGlow: true, dragGlow: true, widgetStack: true,
    bigFolder: false, superIsland: true, islandServices: {},
    /* 二级页面里用到的补充开关 */
    fullscreenApps: false, pocketGuard: true, dndRepeat: true, dndAlarm: true,
    dndCalls: false, dndMessages: false, dndSchedule: false, aiCallOn: false,
    defBrowser: 'browser', defPhone: 'phone', defSms: 'messages', defGallery: 'photos',
    unknownSources: false, overlayPerm: false, ignoreBatteryOpt: false,
    writeSettings: false, highContrastKbd: false, spen: false, chargingMirror: false,
    /* 基础 */
    nav: 'gesture', indStyle: 'classic', indTint: true, indSwitch: true, recentLayout: 'h', deviceName: '', animations: true, torch: false
  };
  var DEFAULT_DATA = {
    notes: [
      { id: 'n1', title: '欢迎使用MUOS', body: '这是一台运行在浏览器里的手机。\n\n· 底部上滑回到主屏\n· 上滑停顿打开多任务\n· 左侧边缘右滑返回上一级\n· 从顶部左/右分别下拉通知与控制中心\n\n备忘录内容会自动保存，切到后台也不会丢。', ts: Date.now() - 86400000 }
    ],
    photos: [], chats: [], callLog: [], alarms: [], bookmarks: [], files: [],
    recordings: [], gameBest: 0, gameScore: 0, gameBoard: null, installed: [],
    storeInstalled: [], hidden: [], events: [], wallFav: 'nebula', customWall: '',
    /* 桌面布局：desktop 为空时表示使用系统默认图标集 */
    desktop: ['weather','clock','photos','notes','calendar','music','contacts',
              'health','wallet','assistant','settings','maps','calculator',
              'recorder','store','files'],
    widgets: [{ id: 'w-weather', type: 'weather', page: 0, span: 2 }],
    widgetStacks: {}, usage: {}, pageCount: 1, folders: [],
    contacts: [
      { id:'c1', n:'林小满', p:'138 0013 8000', tag:'家人' },
      { id:'c2', n:'陈屿', p:'139 2200 4471', tag:'同事' },
      { id:'c3', n:'苏晓', p:'186 7788 0123', tag:'朋友' },
      { id:'c4', n:'MUOS 客服', p:'10086', tag:'服务' }
    ],
    health: { steps: 6432, heart: 72, sleep: 7.2, records: [] },
    wallet: { balance: 238.5, transit: 0, cards: 2, bills: [] },
    aiHistory: [], privacyLog: [], biometrics: [], routines: [], bgRestrict: [],
    backup: null
  };
  NM.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  NM.DEFAULT_DATA = DEFAULT_DATA;

  /* ---------------- 全局运行时状态 ---------------- */
  NM.S = {
    power: 'off',
    screen: 'off',
    lockedFrom: 'home',
    fg: null,
    tasks: [],
    views: {},
    homePage: 0,
    editing: false,
    shade: null,
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    data: JSON.parse(JSON.stringify(DEFAULT_DATA)),
    battery: 76,
    charging: false,
    notifications: [],
    lastInput: Date.now(),
    bootAt: Date.now(),
    islandTimer: 0,
    pinBuf: '',
    pinTries: 0,
    pendingNotif: null,
    music: { playing: false, idx: 0, pos: 0, timer: 0 },
    call: null,
    dialog: null,
    ctrlSlider: null
  };

  /* ---------------- 持久化 ---------------- */
  var KEY = 'muos-v1';
  NM.load = function () {
    try {
      var raw = W.localStorage.getItem(KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o.settings) Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (o.settings[k] !== undefined) NM.S.settings[k] = o.settings[k];
      });
      if (o.data) Object.keys(DEFAULT_DATA).forEach(function (k) {
        if (o.data[k] !== undefined) NM.S.data[k] = o.data[k];
      });
    } catch (e) { /* 隐私模式 / file:// 下存储不可用时静默降级为内存态 */ }
  };
  NM.save = function () {
    try { W.localStorage.setItem(KEY, JSON.stringify({ settings: NM.S.settings, data: NM.S.data })); }
    catch (e) { /* 同上 */ }
  };

  /* ---------------- 极简事件总线 ---------------- */
  var listeners = {};
  NM.on = function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); };
  NM.emit = function (name, payload) {
    (listeners[name] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.warn(e); } });
  };

  /* ---------------- 通知系统 ---------------- */
  NM.notify = function (appId, title, body, opts) {
    opts = opts || {};
    var st = NM.S.settings;
    /* 「应用通知」逐应用开关：关掉的应用不入库，与真机一致 */
    if (st.appNotif && st.appNotif[appId] === false) return null;
    var app = NM.appById(appId) || { c1: '#8ab4ff', c2: '#5b7fd6', icon: 'info', name: '系统' };
    var n = { id: uid(), appId: appId, app: app, title: title, body: body, ts: Date.now() };
    NM.S.notifications.unshift(n);
    if (NM.S.notifications.length > 40) NM.S.notifications.length = 40;
    NM.emit('notif', n);
    NM.renderNotifShade();
    NM.renderLockNotifs();
    NM.updateBadges();
    /* 勿扰模式：静默入库，不弹横幅、不点亮屏幕 */
    if (!NM.S.settings.dnd && !opts.silent && NM.S.power === 'on' && NM.S.screen !== 'off') {
      NM.showBanner(n);
      NM.island(title, 2200);
    }
    return n;
  };
  NM.showBanner = function (n) {
    var host = $('#banner-host');
    if (!host) return;
    var d = document.createElement('div');
    d.className = 'banner';
    d.setAttribute('data-a', 'open-notif');
    d.setAttribute('data-v', n.id);
    d.innerHTML = NM.iconBox(n.app, 19) + '<div class="n-main"><b>' + esc(n.title) + '</b><span>' + esc(n.body) + '</span></div>' +
      '<small>现在</small>';
    host.appendChild(d);
    var timer = setTimeout(function () {
      d.classList.add('out');
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 320);
    }, 3600);
    /* 左右滑消除：拖动跟手，超过阈值甩出并从通知中心移除 */
    var bx = 0, bdx = 0, swiped = false;
    function endSwipe() {
      if (!bx) return;
      bx = 0;
      d.style.transition = '';
      if (Math.abs(bdx) > 70) {
        swiped = true;
        d.style.transform = 'translateX(' + (bdx > 0 ? '120%' : '-120%') + ')';
        d.style.opacity = '0';
        clearTimeout(timer);
        if (n && n.id) { NM.S.notifications = NM.S.notifications.filter(function (x) { return x.id !== n.id; }); NM.renderNotifShade(); NM.renderLockNotifs(); NM.updateBadges(); }
        setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 240);
      } else { d.style.transform = ''; d.style.opacity = ''; }
    }
    d.addEventListener('pointerdown', function (e) {
      bx = e.clientX; bdx = 0; swiped = false;
      if (d.setPointerCapture) try { d.setPointerCapture(e.pointerId); } catch (err) {}
    });
    d.addEventListener('pointermove', function (e) {
      if (!bx || !e.buttons) return;
      bdx = e.clientX - bx;
      if (Math.abs(bdx) < 4) return;
      d.style.transition = 'none';
      d.style.transform = 'translateX(' + bdx + 'px)';
      d.style.opacity = String(Math.max(.3, 1 - Math.abs(bdx) / 150));
    });
    d.addEventListener('pointerup', endSwipe);
    d.addEventListener('pointercancel', endSwipe);
    /* 滑动过的横幅不再触发点击打开 */
    d.addEventListener('click', function (e) { if (swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
  };
  NM.removeNotif = function (id) {
    NM.S.notifications = NM.S.notifications.filter(function (n) { return n.id !== id; });
    NM.renderNotifShade(); NM.renderLockNotifs(); NM.updateBadges();
  };

  /* ---------------- 灵动岛 ---------------- */
  NM.island = function (text, ms) {
    var el = $('#island'), t = $('#island-text');
    if (!el) return;
    clearTimeout(NM.S.islandTimer);
    /* 关闭类操作不再弹提醒：真机关掉开关只会改变控件本身，不会占住顶部状态栏 */
    if (/已关闭|关闭了|已停用|已禁用|已隐藏/.test(String(text))) {
      el.classList.add('quiet');
      return;
    }
    /* 通知 / 控制中心展开时不让超级岛浮在面板上方 */
    if (NM.S.shade) { el.classList.add('quiet'); return; }
    t.textContent = text;
    el.classList.remove('quiet');
    el.classList.toggle('wide', String(text).length > 8);
    NM.S.islandTimer = setTimeout(function () { el.classList.add('quiet'); }, ms || 2000);
  };

  /* ---------------- 系统对话框 ---------------- */
  NM.dialog = function (title, body, buttons) {
    var host = $('#sys-dialog');
    if (!host) return;
    NM.S.dialog = { title: title, body: body, buttons: buttons };
    host.innerHTML = '<h3>' + esc(title) + '</h3><p>' + esc(body) + '</p><div class="dlg-btns">' +
      (buttons || [{ t: '好', a: 'close-dialog' }]).map(function (b, i) {
        return '<button class="' + (b.primary ? 'primary' : '') + '" data-a="' + b.a + '" data-v="' + (b.v || '') + '">' + esc(b.t) + '</button>';
      }).join('') + '</div>';
    $('#dialog').classList.add('on');
  };
  NM.closeDialog = function () { $('#dialog').classList.remove('on'); NM.S.dialog = null; };

  /* ---------------- 实时时钟（每秒刷新轻量 DOM） ---------------- */
  NM.tickClock = function () {
    var d = new Date();
    var t = hhmm(d);
    var sb = $('#sb-time'); if (sb) sb.textContent = t;
    var lt = $('#lock-time'); if (lt) lt.textContent = t;
    var ld = $('#lock-date'); if (ld) ld.textContent = dateCN(d);
    var nd = $('#notif-date'); if (nd) nd.textContent = fullDate(d);
    var cd = $('#ctrl-date'); if (cd) cd.textContent = fullDate(d);
    var wc = $('#widget-clock'); if (wc) wc.textContent = t;
    var wd = $('#widget-date'); if (wd) wd.textContent = dateCN(d);
    /* 小组件按页渲染后可能有多张时钟卡，统一用 class 批量刷新 */
    NM.util.$$('.wclock-h').forEach(function (n) { n.textContent = t; });
    NM.util.$$('.wclock-d').forEach(function (n) { n.textContent = dateCN(d); });
    NM.renderStatusBarIcons();
  };

  /* ---------------- 电量：缓慢消耗 / 充电 / 低电量 ---------------- */
  NM.tickBattery = function () {
    var S = NM.S;
    if (S.power !== 'on') return;
    if (S.charging) S.battery = clamp(S.battery + 1, 0, 100);
    else S.battery = clamp(S.battery - (S.settings.lowpower ? 0 : 1), 0, 100);
    if (S.battery <= 20 && !S._lowWarned && !S.charging) {
      S._lowWarned = true;
      NM.notify('battery', '电量偏低', '剩余 ' + S.battery + '%，建议开启省电模式或连接充电器。');
      NM.dialog('电量偏低', '剩余 ' + S.battery + '%，是否开启省电模式？',
        [{ t: '开启省电', a: 'enable-lowpower', primary: true }, { t: '稍后', a: 'close-dialog' }]);
    }
    if (S.battery > 25) S._lowWarned = false;
    if (S.battery >= 100 && S.charging) { S.charging = false; NM.island('充电完成 · 100%', 2600); }
    NM.renderStatusBarIcons();
    NM.emit('battery');
  };

  /* ---------------- 自动锁屏 ---------------- */
  NM.tickIdle = function () {
    var S = NM.S;
    if (S.power !== 'on' || S.screen === 'off' || S.screen === 'boot' || S.screen === 'power') return;
    var limit = S.settings.autolock;
    if (!limit) return;
    if (Date.now() - S.lastInput > limit * 1000) NM.sleep();
  };
  NM.markInput = function () { NM.S.lastInput = Date.now(); };
})(window);
