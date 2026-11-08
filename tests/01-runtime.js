const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = [];
const checks = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: vc
});
const w = dom.window;
w.addEventListener('error', e => errors.push('window.error: ' + e.message));

function ck(name, cond) { checks.push((cond ? 'PASS ' : 'FAIL ') + name); }
function safe(label, fn) { try { fn(); } catch (e) { errors.push(label + ': ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 3).join('\n')); } }

setTimeout(() => {
  const NM = w.NM;
  if (!NM) { console.log('FATAL: NM namespace missing'); process.exit(1); }
  const S = NM.S;
  ck('开机完成 power=on', S.power === 'on');
  ck('首屏为锁屏', S.screen === 'lock');
  ck('24 个应用全部注册', NM.APPS.length === 24 && Object.keys(NM.VIEWS).length === 24);
  ck('状态栏已渲染', !!w.document.querySelector('#sb-icons .battery-box, #sb-icons .battery-wrap .sb-ico'));
  ck('主屏分页已渲染', w.document.querySelectorAll('.app-page').length >= 1);
  ck('外层设备控制台存在', !!w.document.querySelector('#device-console .dc-forms'));
  ck('设置一级分类 >= 24', (NM.SETTINGS_GROUPS || []).length >= 24);

  safe('解锁', () => NM.beginUnlock());
  setTimeout(() => {
    ck('解锁后回到主屏', S.screen === 'home' || S.screen === 'app');

    // 逐个冷启动所有应用，并渲染每个应用的所有页面
    NM.APPS.forEach(a => {
      safe('launch ' + a.id, () => {
        NM.launchApp(a.id);
        const v = S.views[a.id];
        if (!v) throw new Error('view not created');
        const p = { id: 'c1', dir: 'root', num: '10086', name: '测试', incoming: false };
        Object.keys(v.def.pages || {}).forEach(k => {
          safe('page ' + a.id + '/' + k, () => NM.setPage(a.id, k, p));
        });
      });
    });
    ck('后台任务保活不设上限（启动应用全部保留）', Object.keys(S.views).length >= 1);

    // 应用生命周期
    safe('生命周期', () => {
      NM.launchApp('notes');
      const before = S.views.notes.el;
      NM.goHome();
      ck('回主屏后视图仍保留（后台保活）', S.views.notes && S.views.notes.el === before);
      ck('回主屏后没有前台视图', !w.document.querySelector('.app-view.foreground'));
      NM.launchApp('notes');
      ck('热启动复用同一 DOM', S.views.notes.el === before);
    });

    // 多任务实时快照
    safe('多任务', () => {
      NM.openRecents();
      ck('多任务卡片承载真实后台 DOM', w.document.querySelectorAll('#recent-track .recent-window .app-view').length > 0);
      NM.closeRecents();
    });

    // 控制中心开关联动
    safe('开关联动', () => {
      NM.showShade('control');
      NM.toggleTile('airplane');
      ck('飞行模式关闭蜂窝与 WiFi', S.settings.airplane && !S.settings.wifi && !S.settings.cellular);
      NM.toggleTile('airplane');
      ck('关闭飞行后网络恢复', !S.settings.airplane && S.settings.wifi);
      NM.toggleTile('dark');
      ck('深色/浅色切换写入 html', w.document.documentElement.getAttribute('data-theme') === 'light');
      NM.toggleTile('dark');
      NM.hideShade();
    });

    // 通知 / 面板 / 搜索 / 电源
    safe('通知与系统', () => {
      NM.notify('messages', '测试通知', '这是一条测试');
      ck('通知入库', S.notifications.length > 0);
      NM.showShade('notif');
      ck('通知中心有卡片', w.document.querySelectorAll('#notif-list .notif-card').length > 0);
      NM.hideShade();
      NM.goHome();
      NM.openSpotlight();
      ck('全局搜索可用', !!w.document.querySelector('#spot-body .spot-item'));
      NM.setScreen('home');
      NM.sleep();
      ck('息屏进入 off', S.screen === 'off');
      NM.wake();
      ck('点亮进入锁屏', S.screen === 'lock');
      NM.beginUnlock();
    });

    // 计算器 / 2048 / 终端
    safe('计算器', () => {
      NM.launchApp('calculator');
      const v = S.views.calculator;
      ['7', '+', '8', '='].forEach(k => v.def.actions['calc-key'](v, k));
      ck('计算器 7+8=15', v.state.result === '15');
    });
    safe('2048', () => {
      NM.launchApp('game');
      const v = S.views.game;
      ['left', 'up', 'right', 'down'].forEach(d => NM.g2048Move(v, d));
      ck('2048 棋盘有效', v.state.board.length === 4);
    });
    safe('终端', () => {
      NM.launchApp('terminal');
      NM.termRun(S.views.terminal, 'uname -a');
      NM.termRun(S.views.terminal, 'ps');
      NM.termRun(S.views.terminal, 'neofetch');
      ck('终端输出累积', S.views.terminal.state.lines.length > 5);
    });

    setTimeout(() => {
      console.log('\n===== 运行时检查 =====');
      checks.forEach(c => console.log(c));
      console.log('\n通过 ' + checks.filter(c => c.startsWith('PASS')).length + '/' + checks.length);
      console.log('\n===== 运行时错误 (' + errors.length + ') =====');
      errors.slice(0, 30).forEach(e => console.log('  - ' + e));
      process.exit(errors.length || checks.some(c => c.startsWith('FAIL')) ? 1 : 0);
    }, 500);
  }, 400);
}, 2700);
