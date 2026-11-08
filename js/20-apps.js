/* ============================================================
   MUOS — 20-apps.js (1/2)
   天气数据 / 电话 / 信息 / 相机 / 相册
   每个应用通过 NM.register 注册：pages 返回页面 HTML，
   actions 处理该应用内的点击，state 保存跨后台的输入状态。
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, esc = NM.util.esc, svg = NM.svg, clamp = NM.util.clamp;

  /* ---------------- 天气数据源（本地确定性模拟，同一天不会乱跳） ---------------- */
  var CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都'];
  var KINDS = [
    { d: '晴', i: 'sun' }, { d: '多云', i: 'cloud' }, { d: '阴', i: 'cloud' },
    { d: '小雨', i: 'rain' }, { d: '阵雨', i: 'rain' }, { d: '雪', i: 'snow' }
  ];
  NM.weatherNow = function (city) {
    var d = new Date(), day = Math.floor(Date.now() / 86400000);
    var bias = CITIES.indexOf(city || '北京');
    if (bias < 0) bias = 0;
    var seed = (day * 9301 + 49297 + bias * 7919) % 233280;
    var rnd = function (n) { return ((seed * (n + 17) * 7919 + 104729) % 100000) / 100000; };
    var m = d.getMonth() + 1;
    var base = (m >= 6 && m <= 8) ? 29 : (m >= 11 || m <= 2 ? 3 : 18);
    var temp = Math.round(base + (rnd(1) - .5) * 9 + (d.getHours() - 12) * .28 + bias);
    var k = KINDS[Math.floor(rnd(2) * KINDS.length) % KINDS.length];
    var hourly = [], week = [];
    for (var i = 0; i < 12; i++) {
      var h = (d.getHours() + i) % 24;
      hourly.push({ h: h, t: temp + Math.round(Math.sin((h - 14) / 4) * 4 + rnd(i + 10) * 2), i: KINDS[(i + Math.floor(rnd(3) * 3)) % 3].i });
    }
    for (var j = 0; j < 7; j++) {
      week.push({ d: j === 0 ? '今天' : ['周日','周一','周二','周三','周四','周五','周六'][(d.getDay() + j) % 7],
        lo: temp - 5 + Math.floor(rnd(j + 30) * 4), hi: temp + 3 + Math.floor(rnd(j + 40) * 5),
        i: KINDS[Math.floor(rnd(j + 50) * 4) % 4].i });
    }
    return { city: city || '北京', temp: temp, hi: temp + 4, lo: temp - 6, desc: k.d, icon: k.i,
      aqi: 20 + Math.floor(rnd(60) * 45), humid: 35 + Math.floor(rnd(70) * 45),
      wind: 1 + Math.floor(rnd(80) * 4), hourly: hourly, week: week };
  };

  /* ============================================================
     电话：最近通话 / 拨号盘 / 联系人 / 真实通话计时
     ============================================================ */
  var CONTACTS = [
    { n: '林晓', p: '138 0013 8000', c: '#8ab4ff' }, { n: '陈默', p: '139 2234 5678', c: '#c4a6ff' },
    { n: 'MUOS 客服', p: '10086', c: '#6ee2d5' }, { n: '妈妈', p: '136 8888 6666', c: '#ffb0c4' },
    { n: '快递员', p: '157 0000 1234', c: '#ffc46b' }, { n: '周然', p: '186 1024 0033', c: '#9ad1ff' }
  ];
  NM.CONTACTS = CONTACTS;
  NM.register('phone', {
    init: function (v) { v.state.tab = 'recent'; v.state.number = ''; },
    pages: {
      main: function (v) {
        var tab = v.state.tab || 'recent';
        var seg = '<div class="segmented">' + [['recent','最近'],['dial','拨号'],['contacts','联系人']].map(function (x) {
          return '<button class="' + (tab === x[0] ? 'on' : '') + '" data-a="phone-tab" data-v="' + x[0] + '">' + x[1] + '</button>';
        }).join('') + '</div>';
        var inner = '';
        if (tab === 'recent') {
          var logs = S.data.callLog || [];
          inner = logs.length ? logs.map(function (c) {
            return '<div class="row" data-a="phone-redial" data-v="' + esc(c.num) + '"><span class="chat-avatar" style="background:' + c.color + '">' +
              esc((c.name || c.num).slice(0, 1)) + '</span><div class="row-main"><b style="color:' + (c.missed ? 'var(--danger)' : 'inherit') + '">' +
              esc(c.name || c.num) + (c.missed ? '（未接）' : '') + '</b><small>' + esc(c.num) + ' · ' + NM.util.relTime(c.ts) + '</small></div>' +
              svg('phone', 18) + '</div>';
          }).join('') : '<div class="empty">暂无通话记录<br>去拨号盘打一个电话吧</div>';
          inner += '<div style="text-align:center;margin-top:18px"><button class="bar-btn" data-a="sim-incoming">模拟一通来电</button></div>';
        } else if (tab === 'dial') {
          var n = v.state.number || '';
          var keys = [['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['*',''],['0','+'],['#','']];
          inner = '<div class="dial-display"><b>' + (esc(n) || '&nbsp;') + '</b><small>' +
            (n ? (CONTACTS.filter(function (c) { return c.p.replace(/\s/g,'').indexOf(n) >= 0; })[0] || {}).n || '未知号码' : '输入号码或从最近通话选择') + '</small></div>' +
            '<div class="dial-pad">' + keys.map(function (k) {
              return '<button class="dial-key" data-a="phone-digit" data-v="' + k[0] + '"><b>' + k[0] + '</b><small>' + k[1] + '</small></button>';
            }).join('') + '</div>' +
            '<div class="dial-actions"><span style="width:40px"></span>' +
            '<button class="dial-call" data-a="phone-call">' + svg('phone', 26) + '</button>' +
            '<button class="dial-del" data-a="phone-del">' + svg('del', 22) + '</button></div>';
        } else {
          inner = CONTACTS.map(function (c) {
            return '<div class="row" data-a="phone-contact" data-v="' + esc(c.p) + '"><span class="chat-avatar" style="background:' + c.c + '">' + esc(c.n[0]) + '</span>' +
              '<div class="row-main"><b>' + esc(c.n) + '</b><small>' + esc(c.p) + '</small></div>' + svg('phone', 18) + '</div>';
          }).join('');
        }
        return NM.appBar(v, '电话', '') + seg + '<div class="section-title">' +
          ({ recent: '最近通话', dial: '拨号键盘', contacts: '全部联系人' })[tab] + '</div>' + inner + NM.endBar();
      },
      call: function (v, p) {
        return '<div class="app-bar"><button class="back" data-a="back">' + svg('back', 20) + '</button><h1>通话中</h1></div>' +
          '<div class="call-screen" style="flex:1"><div class="call-avatar">' + esc((p.name || '#')[0]) + '</div>' +
          '<div class="call-name">' + esc(p.name || p.num) + '</div>' +
          '<div class="call-state">' + (p.incoming ? '来电已接听' : '正在呼叫…') + '</div>' +
          '<div class="call-timer" id="call-timer">00:00</div>' +
          '<div class="call-actions"><button class="call-circle" data-a="phone-mute">' + svg('mic', 24) + '</button>' +
          '<button class="call-circle hang" data-a="phone-hang">' + svg('phone', 24) + '</button>' +
          '<button class="call-circle" data-a="phone-speaker">' + svg('volume', 24) + '</button></div></div>';
      }
    },
    actions: {
      'phone-tab': function (v, val) { v.state.tab = val; NM.renderView(v); },
      'phone-digit': function (v, val) { v.state.number = (v.state.number || '') + val; NM.renderView(v); },
      'phone-del': function (v) { v.state.number = (v.state.number || '').slice(0, -1); NM.renderView(v); },
      'phone-call': function (v) {
        if (!v.state.number) { NM.island('请先输入号码', 1400); return; }
        NM.startCall(v, v.state.number);
      },
      'phone-redial': function (v, val) { v.state.number = val.replace(/\s/g, ''); NM.startCall(v, val); },
      'phone-contact': function (v, val) { NM.startCall(v, val); },
      'phone-hang': function (v) {
        var c = S.call;
        if (c) {
          var dur = Math.floor((Date.now() - c.start) / 1000);
          S.data.callLog.unshift({ num: c.num, name: c.name, ts: Date.now(), missed: false, dur: dur, color: '#6ee2d5' });
          S.data.callLog = S.data.callLog.slice(0, 30); NM.save();
        }
        clearInterval(v.state.callTimer); S.call = null; v.state.callTimer = 0;
        NM.pop('phone'); NM.updateBadges(); NM.island('通话结束', 1300);
      },
      'phone-mute': function () { NM.island('已静音', 1100); },
      'phone-speaker': function () { NM.island('已切换免提', 1100); },
      'sim-incoming': function () {
        var c = CONTACTS[Math.floor(Math.random() * CONTACTS.length)];
        NM.notify('phone', '来电 · ' + c.n, c.p + ' 正在呼叫你，点击接听', { silent: false });
        NM.dialog('来电 · ' + c.n, c.p + ' 正在呼叫你',
          [{ t: '接听', a: 'answer-call', v: c.p + '|' + c.n, primary: true }, { t: '挂断', a: 'miss-call', v: c.p }]);
      }
    },
    onPage: function (v, key) {
      if (key === 'call' && S.call) {
        var upd = function () {
          var el = W.document.getElementById('call-timer');
          if (el) { var s = Math.floor((Date.now() - S.call.start) / 1000); el.textContent = NM.util.pad(Math.floor(s / 60)) + ':' + NM.util.pad(s % 60); }
        };
        upd();
        clearInterval(v.state.callTimer);
        v.state.callTimer = setInterval(upd, 1000);
      }
    },
    onKill: function (v) { clearInterval(v.state.callTimer); if (S.call) S.call = null; }
  });
  NM.startCall = function (v, num) {
    var c = CONTACTS.filter(function (x) { return x.p.replace(/\s/g, '') === num.replace(/\s/g, ''); })[0];
    S.call = { num: num, name: c ? c.n : '', start: Date.now(), incoming: false };
    NM.push('phone', 'call', { num: num, name: c ? c.n : '', incoming: false });
    NM.island('正在呼叫 ' + (c ? c.n : num), 2000);
  };
  NM.answerCall = function (payload) {
    var parts = payload.split('|');
    var v = S.views.phone;
    if (!v) { NM.launchApp('phone'); v = S.views.phone; }
    S.call = { num: parts[0], name: parts[1], start: Date.now(), incoming: true };
    NM.closeDialog();
    NM.setPage('phone', 'call', { num: parts[0], name: parts[1], incoming: true });
    S.fg = 'phone'; NM.showForeground('phone'); NM.setScreen('app');
  };
  NM.missCall = function (num) {
    S.data.callLog.unshift({ num: num, name: '', ts: Date.now(), missed: true, color: '#ff6b81' });
    NM.save(); NM.closeDialog(); NM.updateBadges();
    NM.notify('phone', '未接来电', num, { silent: true });
  };

  /* ============================================================
     信息：会话列表 / 气泡对话 / 自动回复与通知
     ============================================================ */
  var SEED_CHATS = [
    { id: 'c1', name: '林晓', color: '#8ab4ff', msgs: [
      { me: false, t: '周末一起去看展吗？', ts: Date.now() - 3600000 },
      { me: true, t: '好啊，几点？', ts: Date.now() - 3500000 },
      { me: false, t: '下午两点，门口见', ts: Date.now() - 3400000 } ] },
    { id: 'c2', name: 'MUOS 助手', color: '#6ee2d5', msgs: [
      { me: false, t: '欢迎使用 MUOS，有任何问题随时找我。', ts: Date.now() - 86400000 } ] },
    { id: 'c3', name: '妈妈', color: '#ffb0c4', msgs: [
      { me: false, t: '记得吃饭', ts: Date.now() - 172800000 },
      { me: true, t: '知道啦', ts: Date.now() - 172000000 } ] }
  ];
  var REPLIES = ['收到，我看到了。', '好的，稍后回复你。', '哈哈，有意思。', '没问题，就这么定。', '我在忙，晚点聊～', '这句话我记下了。'];
  NM.register('messages', {
    init: function (v) {
      if (!S.data.chats || !S.data.chats.length) { S.data.chats = JSON.parse(JSON.stringify(SEED_CHATS)); NM.save(); }
    },
    pages: {
      main: function (v) {
        var list = S.data.chats || [];
        return NM.appBar(v, '信息', '<button class="bar-btn" data-a="new-chat">新建</button>') +
          '<div class="chat-list">' + list.map(function (c) {
            var last = c.msgs[c.msgs.length - 1] || { t: '' };
            return '<div class="row" data-a="open-chat" data-v="' + c.id + '" style="margin-bottom:9px;border-radius:16px">' +
              '<span class="chat-avatar" style="background:' + c.color + '">' + esc(c.name[0]) + '</span>' +
              '<span class="row-main"><b>' + esc(c.name) + '</b><small>' + esc(last.t) + '</small></span>' +
              '<span style="text-align:right"><span class="chat-time">' + NM.util.relTime(last.ts) + '</span>' +
              (c.unread ? '<i class="chat-unread" style="display:block;margin:6px 0 0 auto"></i>' : '') + '</span></div>';
          }).join('') + '</div>' + NM.endBar();
      },
      thread: function (v, p) {
        var c = NM.findChat(p.id) || { name: '会话', msgs: [], color: '#8ab4ff' };
        return NM.appBar(v, c.name, '') + '<div class="chat-thread" id="chat-thread">' +
          c.msgs.map(function (m) {
            return '<div class="bubble ' + (m.me ? 'me' : 'them') + '">' + esc(m.t) +
              '<div class="bubble-time">' + NM.util.hhmm(new Date(m.ts)) + '</div></div>';
          }).join('') + '</div>' + NM.endBar() +
          '<div class="chat-compose"><input data-f="chat-draft" placeholder="发送信息" value="' + esc(v.state.draft || '') + '" ' +
          'autocomplete="off"><button data-a="send-msg">' + svg('send', 18) + '</button></div>';
      }
    },
    actions: {
      'open-chat': function (v, id) {
        var c = NM.findChat(id); if (c) c.unread = false;
        NM.save(); NM.push('messages', 'thread', { id: id });
        setTimeout(function () { var b = W.document.getElementById('chat-thread'); if (b) b.parentNode.scrollTop = b.scrollHeight; }, 30);
      },
      'new-chat': function () {
        var id = NM.util.uid();
        S.data.chats.unshift({ id: id, name: '新联系人 ' + (S.data.chats.length + 1), color: '#c4a6ff', msgs: [] });
        NM.save(); NM.renderView(S.views.messages);
      },
      'send-msg': function (v) {
        var text = (v.state.draft || '').trim(); if (!text) return;
        var top = v.stack[v.stack.length - 1], c = NM.findChat(top.p.id); if (!c) return;
        c.msgs.push({ me: true, t: text, ts: Date.now() });
        v.state.draft = ''; NM.save(); NM.renderView(v);
        var b = W.document.getElementById('chat-thread'); if (b) b.parentNode.scrollTop = b.scrollHeight;
        /* 对方自动回复：应用切到后台也会送达，并产生系统通知 */
        setTimeout(function () {
          var reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
          c.msgs.push({ me: false, t: reply, ts: Date.now() });
          NM.save();
          if (S.fg === 'messages' && S.views.messages) {
            var cur = S.views.messages.stack[S.views.messages.stack.length - 1];
            if (cur.k === 'thread' && cur.p.id === c.id) NM.renderView(S.views.messages);
          } else { c.unread = true; NM.notify('messages', c.name, reply); }
        }, 1400);
      }
    },
    onShow: function (v) {
      var top = v.stack[v.stack.length - 1];
      if (top.k === 'thread') { var c = NM.findChat(top.p.id); if (c) c.unread = false; }
      NM.updateBadges();
    }
  });
  NM.findChat = function (id) {
    return (S.data.chats || []).filter(function (c) { return c.id === id; })[0];
  };

  /* ============================================================
     相机：取景 / 前后摄 / 滤镜 / 拍照写入相册
     ============================================================ */
  var SCENES = [
    'radial-gradient(circle at 30% 25%, #ffd9a0, transparent 45%), linear-gradient(165deg,#2a4a72,#7bb4c9 55%,#d7c08a)',
    'radial-gradient(circle at 70% 20%, #ffb1c8, transparent 50%), linear-gradient(170deg,#3a2352,#a4538d 55%,#f0a477)',
    'radial-gradient(circle at 50% 15%, #b9f0e0, transparent 45%), linear-gradient(170deg,#123a3a,#2f8f7a 55%,#a8d5a2)',
    'radial-gradient(circle at 25% 70%, #8fb6ff, transparent 50%), linear-gradient(160deg,#141a33,#3d4f8f 55%,#c08fc0)',
    'radial-gradient(circle at 60% 30%, #fff0c0, transparent 42%), linear-gradient(175deg,#1d2b22,#5c7a4a 55%,#c9b47a)'
  ];
  NM.register('camera', {
    init: function (v) { v.state.scene = 0; v.state.front = false; v.state.mode = '照片'; },
    pages: {
      main: function (v) {
        var photos = S.data.photos || [], last = photos[photos.length - 1];
        var bg = SCENES[v.state.scene % SCENES.length];
        var filter = v.state.front ? 'saturate(.8) brightness(1.15)' : (v.state.mode === '人像' ? 'saturate(1.2) blur(1px)' : 'none');
        return '<div class="app-bar"><button class="back" data-a="back">' + svg('back', 20) + '</button><h1>相机</h1>' +
          '<div class="bar-actions"><button class="bar-btn" data-a="cam-flash">' + svg('flash', 15) + '</button></div></div>' +
          '<div class="cam-view"><div class="cam-scene" style="background:' + bg + ';filter:' + filter + '"></div>' +
          '<div class="cam-grid">' + new Array(10).join('<i></i>') + '</div>' +
          '<div class="cam-focus" id="cam-focus"></div>' +
          '<div class="cam-top"><button data-a="cam-mode" data-v="照片" class="' + (v.state.mode === '照片' ? 'on' : '') + '">照片</button>' +
          '<button data-a="cam-mode" data-v="人像" class="' + (v.state.mode === '人像' ? 'on' : '') + '">人像</button>' +
          '<button data-a="cam-mode" data-v="全景" class="' + (v.state.mode === '全景' ? 'on' : '') + '">全景</button></div>' +
          '<div class="cam-modes"><span data-a="cam-scene">' + svg('refresh', 13) + ' 切换场景</span><b>' + v.state.mode + '</b></div>' +
          '<div class="cam-bottom"><button class="cam-thumb" data-a="cam-gallery" ' +
          (last ? 'style="background:' + last.bg + '"' : '') + '></button>' +
          '<button class="cam-shutter" data-a="cam-shoot"><i></i></button>' +
          '<button class="cam-flip" data-a="cam-flip">' + svg('flip', 22) + '</button></div></div>';
      }
    },
    actions: {
      'cam-shoot': function (v) {
        var bg = SCENES[v.state.scene % SCENES.length];
        S.data.photos.push({ id: NM.util.uid(), bg: bg, ts: Date.now(), mode: v.state.mode });
        NM.save(); NM.renderView(v);
        var f = W.document.getElementById('cam-focus');
        if (f) { f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); }
        NM.island('照片已保存到相册', 1600);
        NM.notify('photos', '照片已保存', '新照片已加入「相册」，点击查看', { silent: true });
      },
      'cam-flip': function (v) { v.state.front = !v.state.front; NM.renderView(v); NM.island(v.state.front ? '前置摄像头' : '后置摄像头', 1200); },
      'cam-scene': function (v) { v.state.scene++; NM.renderView(v); },
      'cam-mode': function (v, val) { v.state.mode = val; NM.renderView(v); },
      'cam-flash': function () { NM.S.settings.torch = !NM.S.settings.torch; NM.applySettings(); NM.save(); },
      'cam-gallery': function () { NM.launchApp('photos'); }
    }
  });

  /* ============================================================
     相册：预置照片 + 相机实拍，支持大图与删除
     ============================================================ */
  var PRESET_PHOTOS = [
    'radial-gradient(circle at 30% 30%, #ffd9a0, transparent 55%), linear-gradient(150deg,#2a4a72,#e0b87a)',
    'radial-gradient(circle at 70% 25%, #ffb1c8, transparent 55%), linear-gradient(150deg,#3a2352,#f0a477)',
    'radial-gradient(circle at 45% 20%, #b9f0e0, transparent 55%), linear-gradient(150deg,#123a3a,#a8d5a2)',
    'radial-gradient(circle at 25% 70%, #8fb6ff, transparent 55%), linear-gradient(150deg,#141a33,#c08fc0)',
    'radial-gradient(circle at 60% 35%, #fff0c0, transparent 50%), linear-gradient(150deg,#1d2b22,#c9b47a)',
    'radial-gradient(circle at 40% 60%, #c4a6ff, transparent 55%), linear-gradient(150deg,#1b1b3a,#8ab4ff)'
  ];
  NM.register('photos', {
    pages: {
      main: function () {
        var mine = (S.data.photos || []).slice().reverse();
        var all = mine.map(function (p) { return { id: p.id, bg: p.bg, own: true }; })
          .concat(PRESET_PHOTOS.map(function (b, i) { return { id: 'p' + i, bg: b, own: false }; }));
        return NM.appBar(S.views.photos, '相册', '') +
          '<div class="section-title">全部照片 · ' + all.length + ' 张</div><div class="photo-grid">' +
          all.map(function (p) {
            return '<div class="photo-cell" style="background:' + p.bg + '" data-a="view-photo" data-v="' + p.id + '"></div>';
          }).join('') + '</div>' + NM.endBar();
      },
      viewer: function (v, p) {
        var all = (S.data.photos || []).concat(PRESET_PHOTOS.map(function (b, i) { return { id: 'p' + i, bg: b }; }));
        var photo = all.filter(function (x) { return x.id === p.id; })[0] || all[0];
        return '<div class="app-bar"><button class="back" data-a="back">' + svg('back', 20) + '</button><h1>照片</h1>' +
          '<div class="bar-actions"><button class="bar-btn" data-a="del-photo" data-v="' + p.id + '">删除</button></div></div>' +
          '<div class="photo-viewer" style="position:relative;flex:1"><div class="pv-img" style="background:' + photo.bg + '"></div></div>';
      }
    },
    actions: {
      'view-photo': function (v, id) { NM.push('photos', 'viewer', { id: id }); },
      'del-photo': function (v, id) {
        S.data.photos = (S.data.photos || []).filter(function (p) { return p.id !== id; });
        NM.save(); NM.pop('photos'); NM.island('照片已删除', 1200);
      }
    }
  });

  /* ============================================================
     时钟：世界时钟 / 闹钟 / 秒表 / 计时器，切后台继续走时
     ============================================================ */
  var WORLD = [
    { c: '北京', z: 8 }, { c: '东京', z: 9 }, { c: '伦敦', z: 1 },
    { c: '纽约', z: -4 }, { c: '悉尼', z: 11 }
  ];
  var fmtDur = function (ms) {
    var t = Math.max(0, Math.floor(ms / 10));
    return NM.util.pad(Math.floor(t / 6000)) + ':' + NM.util.pad(Math.floor(t / 100) % 60) + '.' + NM.util.pad(t % 100);
  };
  NM.register('clock', {
    init: function (v) {
      v.state.tab = 'world';
      v.state.sw = { start: 0, acc: 0, running: false, laps: [] };
      v.state.tm = { end: 0, left: 0, running: false, mins: 5 };
    },
    pages: {
      main: function (v) {
        var tab = v.state.tab, inner = '';
        var seg = '<div class="segmented">' + [['world','世界'],['alarm','闹钟'],['stop','秒表'],['timer','计时']].map(function (x) {
          return '<button class="' + (tab === x[0] ? 'on' : '') + '" data-a="clock-tab" data-v="' + x[0] + '">' + x[1] + '</button>';
        }).join('') + '</div>';
        if (tab === 'world') {
          var now = new Date();
          var utc = now.getTime() + now.getTimezoneOffset() * 60000;
          inner = '<div class="clock-big"><b id="clock-local">' + NM.util.hhmm(now) + '</b><span>本地时间 · ' + NM.util.dateCN(now) + '</span></div>' +
            WORLD.map(function (w) {
              var d = new Date(utc + w.z * 3600000);
              var diff = w.z - (-now.getTimezoneOffset() / 60);
              return '<div class="row" style="margin-bottom:9px;border-radius:16px"><span class="row-main"><b>' + w.c + '</b>' +
                '<small>' + (diff >= 0 ? '+' : '') + diff + ' 小时 · ' + NM.util.dateCN(d) + '</small></span>' +
                '<b style="font-size:22px;font-weight:300" class="world-t" data-z="' + w.z + '">' + NM.util.hhmm(d) + '</b></div>';
            }).join('');
        } else if (tab === 'alarm') {
          var alarms = S.data.alarms || [];
          inner = (alarms.length ? alarms.map(function (a, i) {
            return '<div class="row" style="margin-bottom:9px;border-radius:16px"><span class="row-main"><b style="font-size:24px;font-weight:300">' + esc(a.t) + '</b>' +
              '<small>' + esc(a.label || '闹钟') + ' · ' + (a.repeat ? '每天' : '仅一次') + '</small></span>' +
              '<span class="toggle ' + (a.on ? 'on' : '') + '" data-a="alarm-toggle" data-v="' + i + '"></span>' +
              '<button data-a="alarm-del" data-v="' + i + '">' + svg('trash', 17) + '</button></div>';
          }).join('') : '<div class="empty">还没有闹钟</div>') +
            '<div style="text-align:center;margin-top:16px"><button class="pill-btn" data-a="alarm-add">添加闹钟</button></div>';
        } else if (tab === 'stop') {
          var sw = v.state.sw;
          inner = '<div class="stopwatch-ring" id="sw-display">' + fmtDur(NM.swElapsed(v)) + '</div>' +
            '<div class="clock-actions"><button class="bar-btn" data-a="sw-lap">' + (sw.running ? '计次' : '复位') + '</button>' +
            '<button class="pill-btn" data-a="sw-toggle">' + (sw.running ? '暂停' : '开始') + '</button></div>' +
            '<div class="section-title">计次</div><div id="sw-laps">' +
            (sw.laps.length ? sw.laps.map(function (l, i) {
              return '<div class="forecast-row"><span>计次 ' + (i + 1) + '</span><b style="margin-left:auto">' + fmtDur(l) + '</b></div>';
            }).join('') : '<div class="empty">点击「计次」记录分段</div>') + '</div>';
        } else {
          var tm = v.state.tm;
          var left = tm.running ? Math.max(0, tm.end - Date.now()) : tm.left || tm.mins * 60000;
          inner = '<div class="stopwatch-ring" id="tm-display">' + NM.util.pad(Math.floor(left / 60000)) + ':' + NM.util.pad(Math.floor(left / 1000) % 60) + '</div>' +
            '<div class="clock-actions">' + [1, 3, 5, 10].map(function (m) {
              return '<button class="bar-btn ' + (tm.mins === m ? 'on' : '') + '" data-a="tm-min" data-v="' + m + '">' + m + ' 分</button>';
            }).join('') + '</div>' +
            '<div class="clock-actions"><button class="pill-btn" data-a="tm-toggle">' + (tm.running ? '暂停' : '开始') + '</button>' +
            '<button class="bar-btn" data-a="tm-reset">重置</button></div>';
        }
        return NM.appBar(v, '时钟') + seg + '<div style="height:14px"></div>' + inner + NM.endBar();
      }
    },
    actions: {
      'clock-tab': function (v, val) { v.state.tab = val; NM.renderView(v); },
      'alarm-add': function (v) {
        S.data.alarms.push({ t: NM.util.pad(7 + (S.data.alarms.length % 5)) + ':00', label: '闹钟', on: true, repeat: true });
        NM.save(); NM.renderView(v);
      },
      'alarm-toggle': function (v, i) { S.data.alarms[i].on = !S.data.alarms[i].on; NM.save(); NM.renderView(v); },
      'alarm-del': function (v, i) { S.data.alarms.splice(i, 1); NM.save(); NM.renderView(v); },
      'sw-toggle': function (v) {
        var sw = v.state.sw;
        if (sw.running) { sw.acc = NM.swElapsed(v); sw.running = false; }
        else { sw.start = Date.now(); sw.running = true; }
        NM.renderView(v);
      },
      'sw-lap': function (v) {
        var sw = v.state.sw;
        if (sw.running) sw.laps.unshift(NM.swElapsed(v));
        else { sw.acc = 0; sw.start = 0; sw.laps = []; }
        NM.renderView(v);
      },
      'tm-min': function (v, m) { v.state.tm.mins = +m; v.state.tm.left = m * 60000; v.state.tm.running = false; NM.renderView(v); },
      'tm-toggle': function (v) {
        var tm = v.state.tm;
        if (tm.running) { tm.left = Math.max(0, tm.end - Date.now()); tm.running = false; }
        else { tm.end = Date.now() + (tm.left || tm.mins * 60000); tm.running = true; }
        NM.renderView(v);
      },
      'tm-reset': function (v) { v.state.tm.running = false; v.state.tm.left = v.state.tm.mins * 60000; NM.renderView(v); }
    },
    onPage: function (v, key) {
      clearInterval(v.state.clockTimer);
      v.state.clockTimer = setInterval(function () {
        if (S.screen !== 'app' || S.fg !== 'clock') return;
        var swd = W.document.getElementById('sw-display');
        if (swd) swd.textContent = fmtDur(NM.swElapsed(v));
        var tmd = W.document.getElementById('tm-display');
        if (tmd) {
          var tm = v.state.tm;
          var left = tm.running ? Math.max(0, tm.end - Date.now()) : (tm.left || tm.mins * 60000);
          tmd.textContent = NM.util.pad(Math.floor(left / 60000)) + ':' + NM.util.pad(Math.floor(left / 1000) % 60);
          if (tm.running && left <= 0) {
            tm.running = false; tm.left = 0;
            NM.notify('clock', '计时结束', tm.mins + ' 分钟计时器已完成');
            NM.beep(); NM.island('计时结束', 2600);
            NM.renderView(v);
          }
        }
        var cl = W.document.getElementById('clock-local');
        if (cl) cl.textContent = NM.util.hhmm(new Date());
        W.document.querySelectorAll('.world-t').forEach(function (el) {
          var n = new Date(), utc = n.getTime() + n.getTimezoneOffset() * 60000;
          el.textContent = NM.util.hhmm(new Date(utc + (+el.dataset.z) * 3600000));
        });
      }, 200);
    },
    onKill: function (v) { clearInterval(v.state.clockTimer); }
  });
  NM.swElapsed = function (v) {
    var sw = v.state.sw;
    return sw.acc + (sw.running ? Date.now() - sw.start : 0);
  };
  NM.beep = function () {
    try {
      var AC = W.AudioContext || W.webkitAudioContext; if (!AC) return;
      var ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = (S.settings.volume / 100) * .12;
      o.start(); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .5);
      o.stop(ctx.currentTime + .5);
    } catch (e) { /* 无音频环境时静默 */ }
  };

  /* ============================================================
     天气：城市 / 逐小时 / 七日 / 生活指数
     ============================================================ */
  NM.register('weather', {
    init: function (v) { v.state.city = '北京'; },
    pages: {
      main: function (v) {
        var w = NM.weatherNow(v.state.city);
        var chips = '<div class="hour-scroll" style="margin-bottom:14px">' + CITIES.map(function (c) {
          return '<button class="bar-btn" style="flex:none;white-space:nowrap;' +
            (c === v.state.city ? 'background:var(--accent);color:#0a1020' : '') + '" data-a="weather-city" data-v="' + c + '">' + c + '</button>';
        }).join('') + '</div>';
        var hero = '<div class="weather-hero"><div class="w-city">' + esc(w.city) + '</div>' +
          '<div class="w-temp">' + w.temp + '°</div><div class="w-desc">' + esc(w.desc) + '</div>' +
          '<div class="w-hl">最高 ' + w.hi + '° · 最低 ' + w.lo + '°</div></div>';
        var hours = '<div class="section-title">未来 12 小时</div><div class="card" style="padding:10px"><div class="hour-scroll">' +
          w.hourly.map(function (h) {
            return '<div class="hour-cell"><small>' + NM.util.pad(h.h) + ':00</small>' + svg(h.i, 22) + '<b>' + h.t + '°</b></div>';
          }).join('') + '</div></div>';
        var week = '<div class="section-title">未来 7 天</div><div class="card">' +
          w.week.map(function (d) {
            return '<div class="forecast-row"><span style="width:38px">' + d.d + '</span>' + svg(d.i, 16) +
              '<span style="width:30px;text-align:right;color:var(--muted)">' + d.lo + '°</span>' +
              '<span class="fbar"><i style="left:0;width:80%"></i></span>' +
              '<span style="width:30px">' + d.hi + '°</span></div>';
          }).join('') + '</div>';
        var idx = '<div class="section-title">生活指数</div><div class="card"><div class="forecast-row"><span>空气质量</span><b style="margin-left:auto">' + w.aqi + ' 优</b></div>' +
          '<div class="forecast-row"><span>湿度</span><b style="margin-left:auto">' + w.humid + '%</b></div>' +
          '<div class="forecast-row"><span>风速</span><b style="margin-left:auto">' + w.wind + ' 级</b></div>' +
          '<div class="forecast-row"><span>紫外线</span><b style="margin-left:auto">中等</b></div></div>';
        return NM.appBar(v, '天气') + chips + hero + hours + week + idx + NM.endBar();
      }
    },
    actions: { 'weather-city': function (v, c) { v.state.city = c; NM.renderView(v); } }
  });

  /* ============================================================
     计算器：表达式求值，输入状态跨后台保留
     ============================================================ */
  NM.register('calculator', {
    init: function (v) { v.state.expr = ''; v.state.result = '0'; v.state.done = false; },
    pages: {
      main: function (v) {
        var keys = [
          ['AC','fn'],['+/−','fn'],['%','fn'],['÷','op'],
          ['7',''],['8',''],['9',''],['×','op'],
          ['4',''],['5',''],['6',''],['−','op'],
          ['1',''],['2',''],['3',''],['+','op'],
          ['0','zero'],['.',''],['=','op']
        ];
        return '<div class="app-bar"><button class="back" data-a="back">' + svg('back', 20) + '</button><h1>计算器</h1>' +
          '<div class="bar-actions"><button class="bar-btn" data-a="calc-copy">复制</button></div></div>' +
          '<div class="calc-display"><div class="calc-expr">' + esc(v.state.expr || '　') + '</div>' +
          '<div class="calc-value">' + esc(v.state.result) + '</div></div>' +
          '<div class="calc-grid">' + keys.map(function (k) {
            return '<button class="calc-key ' + k[1] + '" data-a="calc-key" data-v="' + k[0] + '">' + k[0] + '</button>';
          }).join('') + '</div>';
      }
    },
    actions: {
      'calc-key': function (v, k) {
        /* expr 始终保存完整表达式，result 只是屏幕上显示的当前值。
           早期版本在按运算符后没有把后续数字追加回 expr，导致 "7+8" 求值时
           表达式停在 "7 + "，这里改成单一数据源，避免两处状态不同步。 */
        var s = v.state, OPS = '+−×÷';
        if (k === 'AC') { s.expr = ''; s.result = '0'; s.done = false; }
        else if (k === '+/−') {
          var m = /(\d+(?:\.\d+)?)$/.exec(s.expr);
          if (m) {
            var neg = -parseFloat(m[1]);
            s.expr = s.expr.slice(0, m.index) + '(' + neg + ')';
            s.result = String(neg);
          }
        } else if (k === '%') {
          var m2 = /(\d+(?:\.\d+)?)$/.exec(s.expr);
          if (m2) {
            var pct = parseFloat(m2[1]) / 100;
            s.expr = s.expr.slice(0, m2.index) + '(' + pct + ')';
            s.result = String(pct);
          }
        } else if (k === '=') {
          try {
            var ex = s.expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            if (!/^[0-9+\-*/().\s]+$/.test(ex) || !ex.trim()) throw new Error('bad');
            var val = W.Function('"use strict";return (' + ex + ')')();
            s.result = String(Math.round(val * 1e10) / 1e10);
            s.expr = s.result;
          } catch (e) { s.result = '错误'; s.expr = ''; }
          s.done = true;
        } else if (OPS.indexOf(k) >= 0) {
          if (s.done) { s.expr = s.result + ' ' + k + ' '; s.done = false; }
          else if (/[+−×÷]\s*$/.test(s.expr)) s.expr = s.expr.replace(/[+−×÷]\s*$/, k + ' ');
          else s.expr = (s.expr || s.result) + ' ' + k + ' ';
        } else {
          if (s.done || s.result === '错误') { s.expr = ''; s.done = false; }
          if (k === '.' && /\.(\d*)$/.test(s.expr)) { /* 避免重复小数点 */ }
          else s.expr += k;
          var seg = /(?:^|[+−×÷\s])([0-9.]+)$/.exec(s.expr);
          s.result = seg ? seg[1] : k;
        }
        NM.renderView(v);
      },
      'calc-copy': function (v) {
        try { W.navigator.clipboard.writeText(v.state.result); } catch (e) {}
        NM.island('已复制 ' + v.state.result, 1200);
      }
    }
  });

  /* ============================================================
     备忘录：自动保存，切后台内容不丢
     ============================================================ */
  NM.register('notes', {
    init: function (v) { v.state.editId = null; },
    pages: {
      main: function (v) {
        var list = S.data.notes || [];
        return NM.appBar(v, '备忘录', '<button class="bar-btn" data-a="note-new">新建</button>') +
          '<div class="section-title">全部备忘录 · ' + list.length + '</div>' +
          (list.length ? list.map(function (n) {
            return '<div class="note-item" data-a="note-open" data-v="' + n.id + '"><b>' + esc(n.title || '无标题') + '</b>' +
              '<p>' + esc((n.body || '').replace(/\n/g, ' ')) + '</p><small>' + NM.util.relTime(n.ts) + '</small></div>';
          }).join('') : '<div class="empty">还没有备忘录<br>点右上角新建一条</div>') + NM.endBar();
      },
      edit: function (v, p) {
        var n = (S.data.notes || []).filter(function (x) { return x.id === p.id; })[0];
        if (!n) { n = { id: NM.util.uid(), title: '', body: '', ts: Date.now() }; S.data.notes.unshift(n); NM.save(); }
        v.state.editId = n.id;
        return NM.appBar(v, n.title || '新备忘录', '<button class="bar-btn" data-a="note-del" data-v="' + n.id + '">删除</button>') +
          '<input class="note-title-input" data-f="note-title" placeholder="标题" value="' + esc(n.title) + '">' +
          '<div style="font-size:11px;color:var(--faint);margin-bottom:10px">' + NM.util.fullDate(new Date(n.ts)) + ' · 自动保存</div>' +
          '<textarea class="note-editor" data-f="note-body" placeholder="开始输入…">' + esc(n.body) + '</textarea>';
      }
    },
    actions: {
      'note-new': function (v) {
        var n = { id: NM.util.uid(), title: '', body: '', ts: Date.now() };
        S.data.notes.unshift(n); NM.save();
        NM.push('notes', 'edit', { id: n.id });
      },
      'note-open': function (v, id) { NM.push('notes', 'edit', { id: id }); },
      'note-del': function (v, id) {
        S.data.notes = S.data.notes.filter(function (n) { return n.id !== id; });
        NM.save(); NM.pop('notes'); NM.island('备忘录已删除', 1200);
      }
    },
    onField: function (v, key, val) {
      var n = (S.data.notes || []).filter(function (x) { return x.id === v.state.editId; })[0];
      if (!n) return;
      if (key === 'note-title') n.title = val;
      if (key === 'note-body') n.body = val;
      n.ts = Date.now(); NM.save();
      var h = v.el.querySelector('.app-bar h1'); if (h && key === 'note-title') h.textContent = val || '新备忘录';
    }
  });

})(window);
