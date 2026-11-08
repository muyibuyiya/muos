/* MUOS 本轮回归：设备方向 / 外屏 / 折叠接缝 / 页码定位 / 实体按键 / 缩放坐标 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const file = process.argv[2] || 'standalone.html';
const html = fs.readFileSync(file, 'utf8');
const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true,
  url: 'http://localhost/', virtualConsole: vc
});
const w = dom.window, d = w.document;
w.addEventListener('error', e => errs.push('window.error: ' + e.message));

/* jsdom 不做布局：手工给 #display / #device 补尺寸，模拟被 scale 缩放的机身 */
function mockLayout(scale) {
  const disp = d.getElementById('display');
  Object.defineProperty(disp, 'offsetWidth', { get: () => disp.clientWidth || 390, configurable: true });
  disp.getBoundingClientRect = () => ({
    left: 100, top: 50, width: 390 * scale, height: 844 * scale,
    right: 100 + 390 * scale, bottom: 50 + 844 * scale, x: 100, y: 50
  });
  Object.defineProperty(disp, 'clientWidth', { get: () => 390, configurable: true });
  Object.defineProperty(disp, 'clientHeight', { get: () => 844, configurable: true });
}

let pass = 0, fail = 0;
function ck(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' | ' + extra : '')); }
}
function safe(name, fn) { try { fn(); } catch (e) { fail++; console.log('FAIL ' + name + ' threw: ' + e.message); } }

setTimeout(() => {
  const NM = w.NM, S = NM.S, DEV = NM.DEV;
  console.log('\n===== 设备形态 / 外屏 / 接缝 / 坐标 回归 =====');

  safe('设备控制台与实体按键', () => {
    const p = d.getElementById('device-console');
    ck('控制台存在', !!p);
    ck('含音量 + / − 按键', !!p.querySelector('[data-d="key"][data-v="vol-up"]') &&
                            !!p.querySelector('[data-d="key"][data-v="vol-down"]'));
    ck('含电源键与电源菜单', !!p.querySelector('[data-d="power"]') &&
                              !!p.querySelector('[data-d="key"][data-v="power-menu"]'));
    const before = S.settings.volume;
    p.querySelector('[data-d="key"][data-v="vol-up"]').click();
    ck('控制台音量键真实改音量', S.settings.volume === Math.min(100, before + 10),
       before + ' -> ' + S.settings.volume);
  });

  safe('平板方向切换', () => {
    NM.DEV.form = 'pad'; NM.DEV.screen = 'main'; NM.DEV.res = 'pad-qhd';
    NM.DEV.orient = 'portrait'; NM.applyDevice();
    const a = NM.deviceInfo();
    ck('平板竖屏品牌 MUSE PAD', a.brand === 'MUSE PAD', a.brand);
    ck('平板竖屏方向 = portrait', a.orient === 'portrait');
    ck('平板竖屏分辨率方向正确', a.resW < a.resH, a.resW + 'x' + a.resH);
    ck('html data-orient=portrait', d.documentElement.getAttribute('data-orient') === 'portrait');
    NM.DEV.orient = 'landscape'; NM.applyDevice();
    const b = NM.deviceInfo();
    ck('平板横屏方向 = landscape', b.orient === 'landscape');
    ck('平板横屏分辨率翻转', b.resW > b.resH, b.resW + 'x' + b.resH);
    ck('平板横屏机身变宽', b.cssW > b.cssH, b.cssW + 'x' + b.cssH);
    ck('平板横屏栅格 8 列', b.cols === 8, String(b.cols));
    ck('html data-orient=landscape', d.documentElement.getAttribute('data-orient') === 'landscape');
    ck('控制台出现方向开关', !!d.querySelector('#device-console [data-d="orient"]'));
  });

  safe('旋转前后视觉尺寸一致 + 画面缩放', () => {
    mockLayout(1);
    DEV.form = 'pad'; DEV.screen = 'main'; DEV.res = 'pad-qhd';
    DEV.orient = 'portrait'; DEV.zoom = 1; DEV.open = true;
    NM.applyDevice();
    function curScale() {
      var m = d.getElementById('device').style.transform.match(/scale\(([\d.]+)\)/);
      return m ? parseFloat(m[1]) : 1;
    }
    const sP = curScale();
    DEV.orient = 'landscape'; NM.applyDevice();
    const sL = curScale();
    ck('平板竖横屏缩放一致（旋转不改变大小）', Math.abs(sP - sL) < 0.001, sP + ' vs ' + sL);
    DEV.zoom = 1.25; NM.applyDevice();
    const sZ = curScale();
    ck('画面缩放滑块生效', Math.abs(sZ - sP * 1.25) < 0.01, sZ + ' vs ' + (sP * 1.25).toFixed(3));
    ck('控制台含画面缩放滑块', !!d.querySelector('#device-console [data-f="dev-zoom"]'));
    NM.DEV.zoom = 1; NM.DEV.orient = 'portrait'; NM.applyDevice();
  });

  safe('APEX 设备命名与前置摄像头', () => {
    DEV.form = 'phone'; DEV.cutout = 'none'; DEV.camSide = 'screen'; NM.applyDevice();
    let i = NM.deviceInfo();
    ck('手机默认名称 APEX 15 Pro', i.name === 'APEX 15 Pro' && i.model === 'MU-AP15P', i.name + '/' + i.model);
    DEV.form = 'pad'; NM.applyDevice();
    i = NM.deviceInfo();
    ck('平板默认名称 APEX Pad 6', i.name === 'APEX Pad 6' && i.model === 'MU-KRD4', i.name + '/' + i.model);
    DEV.form = 'fold'; NM.applyDevice();
    i = NM.deviceInfo();
    ck('横折叠名称 APEX Fold 4', i.name === 'APEX Fold 4' && i.model === 'MU-WFD3C', i.name + '/' + i.model);
    DEV.form = 'flip'; NM.applyDevice();
    i = NM.deviceInfo();
    ck('竖折叠名称 APEX Flip 3', i.name === 'APEX Flip 3' && i.model === 'MU-WEX2', i.name + '/' + i.model);
    S.settings.deviceName = '我的折叠'; NM.applyDevice();
    ck('设备名称可自定义，认证型号不变', NM.deviceInfo().name === '我的折叠' &&
      NM.deviceInfo().model === 'MU-WEX2', NM.deviceInfo().name);
    S.settings.deviceName = '';
    DEV.form = 'pad'; DEV.cutout = 'hole'; DEV.camSide = 'screen'; NM.applyDevice();
    ck('挖孔形态落地 data-cam=hole', d.documentElement.getAttribute('data-cam') === 'hole');
    DEV.camSide = 'frame'; NM.applyDevice();
    ck('平板摄像头可放边框上', d.documentElement.getAttribute('data-cam-side') === 'frame');
    ck('控制台含摄像头选择', !!d.querySelector('#device-console [data-d="cam"][data-v="notch"]') &&
      !!d.querySelector('#device-console [data-d="camside"]'));
    DEV.cutout = 'none'; DEV.camSide = 'screen'; DEV.form = 'phone'; NM.applyDevice();
    ck('无挖孔时 cameraCutout 同步为 false', S.settings.cameraCutout === false);
    /* 灵动岛是实体挖孔：舱内不显示文字，提示走顶部轻提示 */
    DEV.cutout = 'island'; DEV.camSide = 'screen'; NM.applyDevice();
    NM.island('测试提示', 800);
    ck('灵动岛舱内无文字且改为轻提示', !d.getElementById('island-text').textContent &&
      !!d.querySelector('#banner-host .sb-toast'));
    DEV.cutout = 'none'; NM.applyDevice();
  });

  safe('折叠屏选项仅折叠形态展示', () => {
    DEV.form = 'phone'; NM.applyDevice();
    NM.launchApp('settings'); NM.push('settings', 'advanced');
    let t = d.getElementById('view-settings').textContent;
    ck('手机形态不显示折叠屏体验', t.indexOf('折叠屏体验') === -1);
    DEV.form = 'fold'; NM.applyDevice();
    t = d.getElementById('view-settings').textContent;
    ck('折叠形态显示折叠屏体验', t.indexOf('折叠屏体验') >= 0);
    NM.pop('settings');
    DEV.form = 'phone'; NM.applyDevice();
  });

  safe('折叠屏内外屏切换', () => {
    NM.DEV.form = 'fold'; NM.DEV.orient = 'portrait'; NM.DEV.screen = 'main';
    NM.DEV.res = 'fold-qhd'; NM.applyDevice();
    let i = NM.deviceInfo();
    ck('内屏标记 isFoldInner', i.isFoldInner === true);
    ck('内屏 data-seam=1', d.documentElement.getAttribute('data-seam') === '1');
    ck('内屏无 cover 标记', d.documentElement.getAttribute('data-cover') === '0');
    ck('外屏面板默认隐藏', d.getElementById('cover-panel').style.display === 'none');
    ck('控制台出现内外屏开关', !!d.querySelector('#device-console [data-d="screen"][data-v="cover"]'));
    NM.DEV.screen = 'cover'; NM.DEV.res = 'fold-cover'; NM.applyDevice();
    i = NM.deviceInfo();
    ck('外屏标记 isCover', i.isCover === true);
    ck('外屏无接缝', d.documentElement.getAttribute('data-seam') === '0');
    ck('外屏 data-cover=1', d.documentElement.getAttribute('data-cover') === '1');
    /* 横向折叠的外屏是一台可完整使用的窄长直板机：不盖遮罩，系统 UI 照常可用 */
    ck('横向折叠外屏为完整模式', d.documentElement.getAttribute('data-cover-mode') === 'full');
    ck('完整外屏不显示受限遮罩', d.getElementById('cover-panel').style.display === 'none');
    ck('完整外屏系统界面仍在', d.getElementById('home').classList.contains('on') ||
                              d.getElementById('statusbar').style.display !== 'none');
    ck('外屏机身变窄', i.cssW < 400, String(i.cssW));
  });

  safe('小折叠 Flex Window', () => {
    NM.DEV.form = 'flip'; NM.DEV.screen = 'cover'; NM.DEV.res = 'flip-cover'; NM.applyDevice();
    const i = NM.deviceInfo();
    ck('小折叠外屏标记', i.isCover === true && i.screenLabel.indexOf('Flex') >= 0, i.screenLabel);
    ck('小折叠外屏近方形', Math.abs(i.cssW - i.cssH) < 120, i.cssW + 'x' + i.cssH);
    ck('外屏面板 cp-flip 样式', d.getElementById('cover-panel').classList.contains('cp-flip'));
    ck('小折叠外屏为受限模式', d.documentElement.getAttribute('data-cover-mode') === 'restricted');
    ck('受限外屏能看通知', !!d.querySelector('#cover-panel [data-cp="tab"][data-cpv="notif"]'));
    ck('受限外屏能看小组件', !!d.querySelector('#cover-panel [data-cp="tab"][data-cpv="widget"]'));
    ck('受限外屏不能启动普通应用', !d.querySelector('#cover-panel [data-cp="camera"]'));
    d.querySelector('#cover-panel [data-cp="tab"][data-cpv="widget"]').click();
    ck('小组件页有天气/电量/时间', d.querySelectorAll('#cover-panel .cp-mini').length >= 3);
  });

  safe('外屏快捷入口', () => {
    NM.DEV.form = 'flip'; NM.DEV.screen = 'cover'; NM.DEV.res = 'flip-cover'; NM.applyDevice();
    const t = !!S.settings.torch;
    d.querySelector('[data-cp=torch]').click();
    ck('外屏手电筒真生效', S.settings.torch !== t);
    d.querySelector('[data-cp=expand]').click();
    ck('展开按钮切回内屏', NM.DEV.screen === 'main');
    ck('展开后外屏面板隐藏', d.getElementById('cover-panel').style.display === 'none');
  });

  safe('折叠内屏避开接缝', () => {
    NM.DEV.form = 'fold'; NM.DEV.screen = 'main'; NM.DEV.res = 'fold-qhd'; NM.applyDevice();
    const pages = d.querySelectorAll('#pages-track .app-page');
    ck('桌面分页存在', pages.length >= 1);
    ck('内屏使用 fold-grid 折痕栅格', pages[0].classList.contains('fold-grid'));
    ck('存在折痕占位列', !!pages[0].querySelector(':scope > .fold-seam-spacer'));
    ck('左右各留 3 列', pages[0].getAttribute('style').indexOf('--half-cols:3') >= 0,
       pages[0].getAttribute('style'));
    ck('小组件并入内屏网格且不占接缝', (function () {
      const wc = pages[0].querySelector('.widget-card');
      return !!wc && wc.getAttribute('style').indexOf('span 1') < 0 &&
        wc.style.gridColumn.indexOf('4') !== 0;
    })());
  });

  safe('平板桌面布局', () => {
    NM.DEV.form = 'pad'; NM.DEV.screen = 'main'; NM.DEV.res = 'pad-qhd';
    NM.DEV.orient = 'portrait'; NM.applyDevice();
    ck('平板小组件并入网格', !!d.querySelector('#pages-track .widget-card'));
    ck('平板 Dock 入口更多', d.querySelectorAll('#dock .app-icon').length >= 8,
       String(d.querySelectorAll('#dock .app-icon').length));
    ck('平板状态栏 PAD 角标', d.getElementById('sb-brand').textContent.indexOf('PAD') >= 0,
       d.getElementById('sb-brand').textContent);
    ck('开机标题为 MUSE PAD', d.querySelector('.boot-name').textContent === 'MUSE PAD');
  });

  safe('页码指示条定位', () => {
    const dots = d.getElementById('page-dots');
    ck('页码条是 #home 的直接子元素', dots.parentElement.id === 'home');
    ck('页码条不在滚动容器里', dots.parentElement.className.indexOf('home-scroll') < 0);
    const css = fs.readFileSync(path.join(path.dirname(file), 'app.css'), 'utf8');
    ck('CSS 用绝对定位 fixed bottom', /#page-dots\.page-dots\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*132px/s.test(css));
    ck('平板方向也有独立定位', /html\[data-form="pad"\]\[data-orient="landscape"\] #page-dots\.page-dots/.test(css));
    /* 没有应用时页码仍在 */
    const save = S.data.desktop;
    S.data.desktop = []; NM.renderPages();
    ck('无应用时页码条仍渲染', d.querySelectorAll('#page-dots .page-dot').length >= 1);
    S.data.desktop = save; NM.renderPages();
  });

  safe('缩放坐标换算', () => {
    NM.DEV.form = 'phone'; NM.DEV.screen = 'main'; NM.DEV.res = 'fhd'; NM.applyDevice();
    mockLayout(0.6);
    ck('stageScale 读到缩放值', Math.abs(NM.stageScale() - 0.6) < 0.001, String(NM.stageScale()));
    const p = NM.localPoint(100 + 390 * 0.6 / 2, 50 + 844 * 0.6 / 2);
    ck('局部坐标换算到屏幕内部', Math.abs(p.x - 195) < .01 && Math.abs(p.y - 422) < .01,
       p.x + ',' + p.y);
    const before = d.querySelectorAll('#fx-layer .fx-ripple').length;
    const ev = new w.MouseEvent('pointerdown', { bubbles: true, clientX: 100 + 117, clientY: 50 + 253 });
    d.getElementById('display').dispatchEvent(ev);
    ck('缩放后点按仍生成涟漪', d.querySelectorAll('#fx-layer .fx-ripple').length > before);
    const r = d.querySelector('#fx-layer .fx-ripple:last-child');
    if (r) ck('涟漪位置使用内部坐标', parseFloat(r.style.left) < 300 && parseFloat(r.style.top) < 700,
              r.style.left + ',' + r.style.top);
  });

  safe('系统内只读展示', () => {
    NM.DEV.form = 'pad'; NM.DEV.orient = 'landscape'; NM.DEV.screen = 'main';
    NM.DEV.res = 'pad-qhd'; NM.applyDevice();
    NM.beginUnlock(); NM.launchApp('about');
    const txt = d.getElementById('view-about') ? d.getElementById('view-about').textContent : '';
    ck('关于本机显示方向只读值', txt.indexOf('横向') >= 0);
    ck('关于本机显示使用屏幕', txt.indexOf('内屏') >= 0);
    ck('关于本机不提供方向开关', !d.querySelector('#view-about [data-a="set-orient"]'));
  });

  console.log('\n通过 ' + pass + '/' + (pass + fail));
  console.log('\n===== 运行时错误 (' + errs.length + ') =====');
  errs.slice(0, 12).forEach(e => console.log('  ' + e));
  process.exit(fail || errs.length ? 1 : 0);
}, 2600);
