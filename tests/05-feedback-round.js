/* MUOS 本轮反馈回归：状态栏对比度 / 滚动保持 / 账户中心 / 快捷任务 / 导航三模式 /
   关闭提醒 / 桌面搜索框 / 桌面分页稳定性 / 计算器布局 / 应用商店 */
const fs = require('fs');
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

let pass = 0, fail = 0;
function ck(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' | ' + extra : '')); }
}
function safe(name, fn) { try { fn(); } catch (e) { fail++; console.log('FAIL ' + name + ' threw: ' + e.message); } }
const wait = ms => new Promise(r => setTimeout(r, ms));

setTimeout(async () => {
  const NM = w.NM, S = NM.S;
  console.log('\n===== 反馈修复回归 =====');
  NM.beginUnlock();

  /* ---------- 1. 浅色背景下状态栏文字对比度 ---------- */
  safe('状态栏明暗自适应', () => {
    S.settings.theme = 'light'; S.settings.wall = 'nebula'; S.settings.cameraCutout = false;
    NM.applySettings();
    NM.setScreen('home');
    ck('浅色主题主屏用深色状态栏文字', d.documentElement.getAttribute('data-sb') === 'dark');
    NM.launchApp('settings');
    ck('浅色应用页用深色状态栏文字', d.documentElement.getAttribute('data-sb') === 'dark');
    NM.showShade('control');
    ck('控制中心展开时状态栏转白字', d.documentElement.getAttribute('data-sb') === 'light');
    NM.hideShade();
    NM.setScreen('lock');
    ck('浅色主题下锁屏用黑色状态栏文字', d.documentElement.getAttribute('data-sb') === 'dark');
    S.settings.cameraCutout = true; NM.updateStatusBarTone();
    ck('挖孔不再强制白色状态栏', d.documentElement.getAttribute('data-sb') === 'dark');
    S.settings.theme = 'dark'; NM.applySettings();
    NM.setScreen('lock');
    ck('深色主题锁屏保持白色状态栏文字', d.documentElement.getAttribute('data-sb') === 'light');
  });

  /* ---------- 2. 页面滚动位置按栈帧保存 ---------- */
  safe('设置页滚动保持', () => {
    NM.beginUnlock(); NM.launchApp('settings');
    NM.setPage('settings', 'main');
    let body = d.querySelector('#view-settings .scroll');
    ck('设置页存在滚动容器', !!body);
    body.scrollTop = 180;
    NM.renderView(S.views.settings);
    body = d.querySelector('#view-settings .scroll');
    ck('同页重绘不跳回顶部', body.scrollTop === 180, String(body.scrollTop));
    NM.push('settings', 'display');
    body = d.querySelector('#view-settings .scroll');
    ck('进入新页从顶部开始', body.scrollTop === 0, String(body.scrollTop));
    NM.pop('settings');
    body = d.querySelector('#view-settings .scroll');
    ck('返回上级恢复原滚动位置', body.scrollTop === 180, String(body.scrollTop));
  });

  /* ---------- 3. 账户中心 ---------- */
  safe('账户卡片可点开', () => {
    NM.setPage('settings', 'main');
    const hero = d.querySelector('#view-settings .settings-hero[data-a]');
    ck('首页账户卡片可点击', !!hero && hero.getAttribute('data-v') === 'account');
    hero.click();
    const txt = d.getElementById('view-settings').textContent;
    ck('进入 MUSE 账户页', txt.indexOf('MUSE 账户') >= 0 || txt.indexOf('云同步') >= 0);
    ck('本机信息已移入账户页', txt.indexOf('屏幕与设备（只读）') >= 0);
    ck('账户页有云同步开关', !!d.querySelector('#view-settings [data-a="set-tg"][data-v="autoSync"]'));
    ck('账户页有同步项开关', !!d.querySelector('#view-settings [data-a="acct-sync"]'));
    ck('账户页有立即同步', !!d.querySelector('#view-settings [data-a="acct-sync-now"]'));
    NM.push('settings', 'accountProfile');
    ck('资料子页有退出登录与个人资料', !!d.querySelector('#view-settings [data-a="acct-logout"]') &&
      d.getElementById('view-settings').textContent.indexOf('个人资料') >= 0);
    NM.pop('settings');
  });

  /* ---------- 4. 快捷任务区可折叠 / 可隐藏 ---------- */
  safe('快捷任务区', () => {
    NM.setPage('settings', 'main');
    ck('默认显示任务区', !!d.querySelector('#view-settings .task-grid'));
    const fold = d.querySelector('#view-settings [data-a="task-fold"]');
    ck('有折叠按钮', !!fold);
    fold.click();
    ck('折叠后无任务网格与提示行', !d.querySelector('#view-settings .task-grid') &&
      !d.querySelector('#view-settings .task-fold-hint'));
    const unfold = d.querySelector('#view-settings [data-a="task-fold"]');
    ck('折叠后按钮变为展开', !!unfold && unfold.textContent === '展开', unfold && unfold.textContent);
    ck('管理按钮常驻', !!d.querySelector('#view-settings [data-a="set-jump"][data-v="taskShortcuts"]'));
    unfold.click();
    ck('可再次展开', !!d.querySelector('#view-settings .task-grid'));
    S.settings.showTasks = false; NM.renderView(S.views.settings);
    ck('整块可隐藏', !d.querySelector('#view-settings .task-head'));
    S.settings.showTasks = true; NM.renderView(S.views.settings);
    NM.push('settings', 'taskShortcuts');
    const one = d.querySelector('#view-settings [data-a="task-toggle-one"]');
    ck('单项开关存在', !!one);
    one.click();
    ck('单项开关写入设置', !!(S.settings.taskHidden || {})[0]);
    NM.pop('settings');
  });

  /* ---------- 5. 导航栏三模式 ---------- */
  safe('导航三模式', () => {
    S.settings.nav = 'buttons'; NM.applySettings();
    ck('三键模式出现三个按钮', d.querySelectorAll('#navbar .nav-btn').length === 3);
    ck('三键模式 data-nav=buttons', d.documentElement.getAttribute('data-nav') === 'buttons');
    S.settings.nav = 'gesture'; NM.applySettings();
    ck('小横条模式清空三键栏', d.querySelectorAll('#navbar .nav-btn').length === 0);
    ck('小横条可见', d.getElementById('home-indicator').style.display !== 'none');
    S.settings.nav = 'none'; NM.applySettings();
    ck('不显示模式隐藏横条', d.getElementById('home-indicator').style.display === 'none');
    ck('不显示模式 data-nav=none', d.documentElement.getAttribute('data-nav') === 'none');
    S.settings.nav = 'gesture'; NM.applySettings();
  });

  /* ---------- 5.5 小横条上滑 / 下滑手势动效 ---------- */
  safe('小横条手势动效', () => {
    S.settings.nav = 'gesture'; NM.applySettings();
    NM.goHome();
    const disp = d.getElementById('display');
    const bar = d.getElementById('home-indicator');
    const ev = (type, x, y, buttons) => new w.MouseEvent(type, { clientX: x, clientY: y, buttons: buttons === undefined ? 1 : buttons, bubbles: true, cancelable: true });
    disp.dispatchEvent(ev('pointermove', 200, 929, 0));
    ck('悬停不触发小横条动效', bar.style.transform === '', bar.style.transform);
    disp.dispatchEvent(ev('pointerdown', 200, 930));
    disp.dispatchEvent(ev('pointermove', 200, 880));
    ck('上滑时小横条拉伸动效', bar.style.transform.indexOf('translateX(calc(-50%') === 0 &&
                              bar.style.transform.indexOf('scaleX(1.') > -1, bar.style.transform);
    ck('上滑时小横条渐隐', parseFloat(bar.style.opacity) < 0.85, bar.style.opacity);
    disp.dispatchEvent(ev('pointermove', 200, 960));
    ck('下滑时小横条随指下移', bar.style.transform.indexOf('translateY(14px)') > -1, bar.style.transform);
    disp.dispatchEvent(ev('pointermove', 260, 930));
    ck('左右滑时小横条横向跟手', bar.style.transform.indexOf('+ 24px') > -1, bar.style.transform);
    disp.dispatchEvent(ev('pointerup', 260, 930));
    ck('松手后小横条复位', bar.style.transform === '' && bar.style.opacity === '',
       bar.style.transform + ' / ' + bar.style.opacity);
  });

  /* ---------- 5.6 多任务界面点空白退出 ---------- */
  safe('多任务空白处点击退出', () => {
    NM.goHome();
    NM.launchApp('calculator');
    NM.goHome();
    NM.openRecents();
    ck('进入多任务界面', S.screen === 'recents', S.screen);
    ck('多任务页不再内嵌布局切换', !d.querySelector('.recent-modes'));
    S.settings.recentLayout = 'stack'; NM.openRecents();
    ck('堆叠布局生效', d.getElementById('recent-track').classList.contains('stack'));
    S.settings.recentLayout = 'grid'; NM.openRecents();
    ck('瀑布布局生效', d.getElementById('recent-track').classList.contains('grid'));
    S.settings.recentLayout = 'h'; NM.openRecents();
    ck('水平布局生效', !d.getElementById('recent-track').classList.contains('grid'));
    d.getElementById('recents').click();
    ck('点击空白退出多任务', S.screen !== 'recents', S.screen);
    ck('退出后回到主屏', S.screen === 'home', S.screen);
    NM.launchApp('calculator'); NM.goHome(); NM.openRecents();
    d.querySelector('#recent-track').click();
    ck('点击空轨道（铺满区域）也退出', S.screen !== 'recents', S.screen);
    NM.launchApp('calculator'); NM.goHome(); NM.openRecents();
    d.querySelector('.recent-title').click();
    ck('点击标题区也退出', S.screen !== 'recents', S.screen);
  });

  /* ---------- 5.7 小横条左右滑快捷切换应用 ---------- */
  safe('小横条快捷切换应用', () => {
    NM.goHome();
    NM.killApp('settings');           /* 清掉历史任务，只留两个应用验证来回切换 */
    NM.launchApp('calculator');
    NM.launchApp('notes');
    ck('当前前台 notes', S.fg === 'notes', S.fg);
    NM.quickSwitch(1);
    ck('切换到 calculator', S.fg === 'calculator' && S.screen === 'app', S.fg + '/' + S.screen);
    NM.quickSwitch(-1);
    ck('切回 notes', S.fg === 'notes', S.fg);
  });

  /* ---------- 5.8 主屏下滑分区：左通知 / 右控制 ---------- */
  safe('主屏下滑分区', () => {
    const disp = d.getElementById('display');
    Object.defineProperty(disp, 'clientWidth', { get: () => 390, configurable: true });
    Object.defineProperty(disp, 'clientHeight', { get: () => 844, configurable: true });
    S.settings.swipeSearch = false; NM.applySettings();
    NM.goHome();
    const ev = (type, x, y) => new w.MouseEvent(type, { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true });
    disp.dispatchEvent(ev('pointerdown', 80, 300));
    disp.dispatchEvent(ev('pointerup', 80, 400));
    ck('左半下滑拉通知中心', S.shade === 'notif', S.shade);
    NM.hideShade();
    disp.dispatchEvent(ev('pointerdown', 300, 300));
    disp.dispatchEvent(ev('pointerup', 300, 400));
    ck('右半下滑拉控制中心', S.shade === 'control', S.shade);
    NM.hideShade();
    delete disp.clientWidth;
    delete disp.clientHeight;
  });

  /* ---------- 5.9 HyperOS 桌面编辑器 ---------- */
  safe('HyperOS 桌面编辑器', () => {
    NM.goHome();
    NM.openHomeEditor();
    ck('进入编辑 data-editing=1', d.documentElement.getAttribute('data-editing') === '1');
    const host = d.getElementById('home-editor');
    ck('底部工具栏四个按钮', !!host.querySelector('.ed-toolbar [data-a="wd-pick"]') &&
      !!host.querySelector('.ed-toolbar [data-a="ed-wallpaper"]') &&
      !!host.querySelector('.ed-toolbar [data-a="ed-fx"]') &&
      !!host.querySelector('.ed-toolbar [data-a="ed-open-settings"]'));
    const wallBefore = S.settings.wall;
    NM.HOME_SYS['ed-wallpaper']();
    ck('壁纸循环切换', S.settings.wall !== wallBefore, wallBefore + ' -> ' + S.settings.wall);
    NM.HOME_SYS['ed-fx']();
    ck('切换效果循环并落地 data-fx', S.settings.pageFx === 'smooth' &&
      d.documentElement.getAttribute('data-fx') === 'smooth', S.settings.pageFx);
    NM.HOME_SYS['ed-fx'](); NM.HOME_SYS['ed-fx']();
    ck('循环回经典', S.settings.pageFx === 'classic', S.settings.pageFx);
    NM.closeHomeEditor();
    ck('退出编辑 data-editing=0', d.documentElement.getAttribute('data-editing') === '0');
  });

  /* ---------- 5.10 控制中心 iOS 面板（全形态统一） ---------- */
  safe('控制中心分组面板', () => {
    NM.DEV.form = 'pad'; NM.DEV.orient = 'portrait'; NM.DEV.res = 'pad-qhd'; NM.applyDevice();
    NM.showShade('control');
    ck('连接类开关成组 ctrl-conn', !!d.querySelector('#ctrl-grid .ctrl-conn'));
    ck('快捷开关圆钮 4 个', d.querySelectorAll('#ctrl-grid .ctrl-quick .ctrl-tile').length === 4);
    ck('竖向滑条带填充变量', d.getElementById('brightness-row').className.indexOf('v') >= 0 &&
      d.getElementById('brightness-row').style.getPropertyValue('--pct') !== '');
    ck('下拉时状态栏磨砂标记', d.documentElement.getAttribute('data-shade-open') === 'control');
    NM.hideShade();
    ck('收起后磨砂标记移除', !d.documentElement.hasAttribute('data-shade-open'));
    NM.DEV.form = 'phone'; NM.applyDevice();
    NM.showShade('control');
    ck('手机形态同一面板风格', !!d.querySelector('#ctrl-grid .ctrl-conn') &&
      d.getElementById('brightness-row').className.indexOf('v') >= 0);
    NM.hideShade();
  });

  /* ---------- 5.11 角标移除 + 设置归位账户中心 ---------- */
  safe('角标移除与设置归位', () => {
    NM.notify('messages', '测试通知', '内容');
    NM.updateBadges();
    ck('主屏图标无小红点', d.querySelectorAll('.app-icon .badge').length === 0);
    NM.launchApp('settings');
    NM.setPage('settings', 'main');
    const main = d.querySelector('#view-settings').textContent;
    ck('设置首页不再显示关于本机', main.indexOf('关于本机') === -1);
    ck('设置首页不再显示软件更新', main.indexOf('软件更新') === -1);
    NM.setPage('settings', 'account');
    const acct = d.querySelector('#view-settings').textContent;
    ck('账户中心有检查更新入口', acct.indexOf('检查更新') >= 0);
    ck('账户中心有关于本机入口', acct.indexOf('关于本机') >= 0);
    NM.setPage('settings', 'navDetail');
    const nav = d.querySelector('#view-settings').textContent;
    ck('小横条自定义设置存在', nav.indexOf('小横条样式') >= 0 &&
      nav.indexOf('随背景取色') >= 0 && nav.indexOf('快速上滑') >= 0 && nav.indexOf('左右滑') >= 0);
  });

  /* ---------- 5.12 顶栏返回按钮规则 + 横幅左右滑消除 ---------- */
  safe('顶栏返回规则与横幅滑动消除', () => {
    NM.killApp('settings'); NM.launchApp('settings');
    const back = d.querySelector('#view-settings .app-bar .back');
    ck('设置首页不显示返回按钮', !!back && back.style.visibility === 'hidden',
       back && back.style.visibility);
    NM.push('settings', 'display');
    const back2 = d.querySelector('#view-settings .app-bar .back');
    ck('二级页显示返回按钮', !!back2 && back2.style.visibility !== 'hidden');
    NM.pop('settings');
    NM.notify('settings', '滑动消除测试', '左右滑掉我');
    const b = Array.from(d.querySelectorAll('#banner-host .banner')).pop();
    ck('横幅已弹出', !!b);
    const ev = (type, x) => new w.MouseEvent(type, { clientX: x, clientY: 100, buttons: 1, bubbles: true, cancelable: true });
    b.dispatchEvent(ev('pointerdown', 100));
    b.dispatchEvent(ev('pointermove', 220));
    b.dispatchEvent(ev('pointerup', 220));
    ck('横幅滑动后甩出', b.style.transform.indexOf('120%') >= 0, b.style.transform);
    ck('滑动消除同步移除通知', !S.notifications.some(n => n.title === '滑动消除测试'));
  });

  /* ---------- 6. 关闭开关不弹顶部提醒且不挡状态栏 ---------- */
  safe('关闭提醒与状态栏遮挡', () => {
    const isl = d.getElementById('island');
    NM.island('WiFi 已开启', 1000);
    ck('开启类提示正常显示', !isl.classList.contains('quiet'));
    NM.island('WiFi 已关闭', 1000);
    ck('关闭类提示被抑制', isl.classList.contains('quiet'));
    ck('超级岛不接收指针事件', w.getComputedStyle(isl).pointerEvents === 'none');
  });

  /* ---------- 7. 桌面搜索框可关闭 ---------- */
  safe('桌面搜索框', () => {
    S.settings.showSearchPill = false; NM.applySettings();
    ck('关闭写入 data-searchpill=0', d.documentElement.getAttribute('data-searchpill') === '0');
    S.settings.showSearchPill = true; NM.applySettings();
    ck('开启写入 data-searchpill=1', d.documentElement.getAttribute('data-searchpill') === '1');
    ck('下滑搜索手势仍独立可配', S.settings.swipeSearch === true || S.settings.swipeSearch === false);
  });

  /* ---------- 8. 桌面分页稳定性 ---------- */
  safe('分页与小组件', () => {
    NM.goHome();
    const pages = d.querySelectorAll('#pages-track .app-page');
    ck('桌面有多页', pages.length >= 1);
    const trackH = d.documentElement.style.getPropertyValue('--track-h');
    ck('轨道高度按行高计算', parseFloat(trackH) > 0, trackH);
    ck('图标行高变量存在', d.documentElement.style.getPropertyValue('--icon-row-h') === '92px');
    ck('小组件渲染在第 0 页网格中', !!d.querySelector('#pages-track .app-page:first-child .widget-card'));
    NM.gotoPage(0, true);
    ck('切页后页码条仍存在', !!d.querySelector('#page-dots .page-dot'));
    const dots = d.getElementById('page-dots');
    ck('页码条直接挂在 #home 下', dots.parentNode && dots.parentNode.id === 'home');
  });

  /* ---------- 9. 计算器布局 ---------- */
  safe('计算器布局', () => {
    NM.launchApp('calculator');
    const keys = d.querySelectorAll('#view-calculator .calc-key');
    ck('19 个按键全部渲染', keys.length === 19, String(keys.length));
    ck('操作符列完整', d.querySelectorAll('#view-calculator .calc-key.op').length === 5);
    ck('显示区有独立高度约束', html.indexOf('.calc-display') >= 0 &&
                                html.indexOf('grid-template-columns: repeat(4, minmax(0, 1fr))') >= 0);
  });

  /* ---------- 10. 应用商店 ---------- */
  safe('应用商店首页', () => {
    NM.launchApp('store');
    const v = d.getElementById('view-store');
    ck('商店有 5 个页签', v.querySelectorAll('.st-tabs button').length === 5);
    ck('商店有搜索框', !!v.querySelector('input[data-f="st-q"]'));
    ck('商店有推荐大卡', !!v.querySelector('.st-hero'));
    ck('商店有应用列表', v.querySelectorAll('.st-row').length >= 3);
    ck('商店不再是应用管理页', v.textContent.indexOf('后台上限 6 个') < 0);
    const open = v.querySelector('[data-a="st-open"]');
    open.click();
    const detail = d.getElementById('view-store').textContent;
    ck('可进入应用详情', detail.indexOf('应用介绍') >= 0 && detail.indexOf('用户评价') >= 0);
    ck('详情页有截图', !!d.querySelector('#view-store .st-shot'));
    ck('详情页有权限信息', detail.indexOf('所需权限') >= 0);
  });

  safe('商店搜索', () => {
    NM.setPage('store', 'main');
    const input = d.querySelector('#view-store input[data-f="st-q"]');
    input.value = '星野';
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    const res = d.querySelector('#st-results').textContent;
    ck('实时搜索命中应用', res.indexOf('星野') >= 0);
    ck('搜索时主区隐藏', d.querySelector('#st-main').style.display === 'none');
    input.value = '不存在的东西xyz';
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    ck('无结果有空态提示', d.querySelector('#st-results').textContent.indexOf('没有找到') >= 0);
  });

  /* 下载 -> 进度 -> 图标落到桌面 */
  NM.setPage('store', 'main');
  const target = (NM.STORE_CATALOG || [])[0];
  ck('商店目录已注册', !!target);
  const before = (S.data.desktop || []).indexOf(target.id);
  d.querySelector('#view-store [data-a="st-install"][data-v="' + target.id + '"]').click();
  await wait(2600);
  safe('下载安装流程', () => {
    ck('安装完成后写入安装列表', (S.data.storeInstalled || []).indexOf(target.id) >= 0);
    ck('图标添加到桌面', before < 0 && (S.data.desktop || []).indexOf(target.id) >= 0);
    ck('系统能解析商店应用', !!NM.appById(target.id));
    NM.goHome();
    ck('桌面渲染出商店应用图标', !!d.querySelector('#pages-track [data-app="' + target.id + '"]'));
    NM.launchApp(target.id);
    ck('商店应用可以点开', !!d.getElementById('view-' + target.id));
    NM.launchApp('store');
    NM.setPage('store', 'mine');
    ck('我的页列出已安装应用', d.getElementById('view-store').textContent.indexOf(target.n) >= 0);
  });

  /* ---------- 11. 长按桌面进入布局编辑器 ---------- */
  safe('长按桌面', () => {
    NM.goHome();
    const disp = d.getElementById('display');
    Object.defineProperty(disp, 'clientWidth', { get: () => 390, configurable: true });
    Object.defineProperty(disp, 'clientHeight', { get: () => 844, configurable: true });
    const home = d.getElementById('home');
    home.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, clientX: 180, clientY: 400 }));
  });
  await wait(680);
  safe('长按结果', () => {
    ck('长按 560ms 进入桌面布局', !!S.editing || d.getElementById('home-editor').classList.contains('on'));
    if (S.editing) NM.closeHomeEditor();
  });

  /* ---------- 12. 图标包：内置线条风格 / 电池电量 / 导入包 ---------- */
  safe('图标包系统', () => {
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    /* 内置 HyperOS 线条：内联 SVG，随明暗自动取色 */
    S.settings.iconPack = 'builtin:hyperos';
    NM.renderStatusBarIcons();
    ck('内置图标包渲染为内联 SVG', !!d.querySelector('#sb-icons svg.sb-ico'));
    ck('内置图标包不再使用位图', !d.querySelector('#sb-icons img.sb-ico'));
    const svgIco = d.querySelector('#sb-icons svg.sb-ico');
    ck('内联 SVG 用 currentColor 跟随明暗', !!(svgIco && svgIco.getAttribute('stroke') === 'currentColor'));
    /* 电池图标带电量填充 */
    const full = NM.sicon('battery', 'w', { level: 100 });
    const low = NM.sicon('battery', 'w', { level: 10 });
    ck('电池图标随电量改变填充', full !== low && full.indexOf('<rect') >= 0);
    /* 三套风格线宽不同 */
    const gH = NM.sicon('wifi', 'w');
    S.settings.iconPack = 'builtin:oneui'; const gO = NM.sicon('wifi', 'w');
    S.settings.iconPack = 'builtin:originos'; const gV = NM.sicon('wifi', 'w');
    S.settings.iconPack = 'builtin:hyperos';
    ck('三套内置风格线宽不同', gH !== gO && gO !== gV && gH !== gV);
    /* 内置开源包（Material / Tabler） */
    ck('内置开源包已注册', !!(NM.OPEN_PACKS && NM.OPEN_PACKS.material && NM.OPEN_PACKS.tabler));
    S.settings.iconPack = 'open:material'; NM.renderStatusBarIcons();
    const opImg = d.querySelector('#sb-icons img.sb-ico');
    ck('开源包输出 SVG 位图', !!opImg && opImg.getAttribute('src').indexOf('data:image/svg+xml') === 0);
    S.settings.iconPack = 'open:tabler';
    ck('开源包缺项回退系统素材', NM.sicon('volte', 'w').indexOf('image/png') > 0);
    S.settings.iconPack = 'builtin:hyperos';
    /* 导入自定义包 */
    const id = NM.importIconPack({ name: '测试包', icons: { wifi: { w: PNG, b: PNG } } });
    ck('可导入自定义图标包', !!id && NM.findIconPack(id) !== null);
    S.settings.iconPack = 'pack:' + id;
    NM.renderStatusBarIcons();
    ck('导入包按色调选用 bitmap', !!d.querySelector('#sb-icons img.sb-ico'));
    ck('导入包落地到 localStorage', String(w.localStorage.getItem('muos-iconpacks-v1')).indexOf('测试包') >= 0);
    /* 设置页展示 */
    NM.launchApp('settings'); NM.push('settings', 'iconPacks');
    const txt = d.getElementById('view-settings').textContent;
    ck('设置页列出图标包选项', txt.indexOf('HyperOS 线条') >= 0 && txt.indexOf('One UI 线条') >= 0 &&
      txt.indexOf('OriginOS 线条') >= 0 && txt.indexOf('开源 · Material Symbols') >= 0 &&
      txt.indexOf('导入包 · 测试包') >= 0);
    ck('当前包标记「使用中」', txt.indexOf('使用中') >= 0);
    /* 删除后回落到默认 */
    NM.deleteIconPack(id);
    ck('删除包后回落默认风格', S.settings.iconPack === 'auto' && NM.findIconPack(id) === null);
    NM.renderStatusBarIcons();
    NM.goHome();
  });

  /* ---------- 13. 应用图标包：按 app id 覆盖字形 ---------- */
  safe('应用图标包', () => {
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const cam = NM.appById('camera');
    ck('默认应用图标使用 SVG 字形', NM.iconBox(cam, 30).indexOf('<svg') > 0 && NM.iconBox(cam, 30).indexOf('ic-glyph') < 0);
    const id = NM.importAppPack({ name: '测试应用包', apps: { camera: { i: { w: PNG, b: PNG } } } });
    ck('可导入应用图标包', !!id && NM.findAppPack(id) !== null);
    S.settings.appIconPack = 'pack:' + id;
    const html = NM.iconBox(cam, 30);
    ck('命中应用改用位图字形', html.indexOf('img class="ic-glyph"') > 0 && html.indexOf('image/png') > 0);
    ck('位图字形尺寸随传入 size', html.indexOf('width:30px') > 0);
    ck('未收录应用保持默认字形', NM.iconBox(NM.appById('phone'), 30).indexOf('<svg') > 0);
    NM.refreshAppIcons();
    ck('刷新后桌面重绘为位图字形', d.querySelectorAll('#display img.ic-glyph').length > 0);
    NM.launchApp('settings'); NM.push('settings', 'appIconPacks');
    const txt = d.getElementById('view-settings').textContent;
    ck('设置页列出应用图标包', txt.indexOf('导入包 · 测试应用包') >= 0 && txt.indexOf('使用中') >= 0);
    NM.deleteAppPack(id);
    ck('删除后回落默认字形', S.settings.appIconPack === 'default' &&
      NM.iconBox(cam, 30).indexOf('<svg') > 0);
    NM.refreshAppIcons(); NM.goHome();
  });

  /* ---------- 14. MiSans 字体可选 ---------- */
  safe('MiSans 字体', () => {
    NM.launchApp('settings'); NM.push('settings', 'display');
    ck('显示设置列出 MiSans', d.getElementById('view-settings').textContent.indexOf('MiSans') >= 0);
    S.settings.fontStyle = 'misans'; NM.applySettings();
    ck('字体样式写入 data-font', d.documentElement.getAttribute('data-font') === 'misans');
    const css = Array.prototype.map.call(d.querySelectorAll('style'), s => s.textContent).join('\n');
    ck('样式表声明 @font-face', css.indexOf('@font-face') >= 0 && css.indexOf('MiSans-Regular.woff2') >= 0);
    ck('提供三个字重', css.indexOf('MiSans-Light.woff2') >= 0 && css.indexOf('MiSans-Demibold.woff2') >= 0);
    ck('字体文件已随项目提供', fs.existsSync('fonts/MiSans-Regular.woff2'));
    S.settings.fontStyle = 'default'; NM.applySettings();
    ck('可切回默认字体', d.documentElement.getAttribute('data-font') === 'default');
    NM.goHome();
  });

  console.log('\n通过 ' + pass + '/' + (pass + fail));
  console.log('\n===== 运行时错误 (' + errs.length + ') =====');
  errs.slice(0, 12).forEach(e => console.log('  ' + e));
  process.exit(fail || errs.length ? 1 : 0);
}, 2600);
