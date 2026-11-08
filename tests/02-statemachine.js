const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = [], checks = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const w = dom.window;
w.addEventListener('error', e => errors.push('window.error: ' + e.message));
const ck = (n, c) => checks.push((c ? 'PASS ' : 'FAIL ') + n);
const safe = (n, f) => { try { f(); } catch (e) { errors.push(n + ': ' + e.message); } };

setTimeout(() => {
  const NM = w.NM, S = NM.S, d = w.document;
  safe('开机解锁', () => { NM.beginUnlock(); });
  setTimeout(() => {
    // 1. 应用内返回栈
    safe('返回栈', () => {
      NM.launchApp('settings');
      NM.push('settings', 'display');
      ck('应用内可进入二级页', S.views.settings.stack.length === 2);
      NM.pop('settings');
      ck('返回后回到一级页而非直接退出', S.views.settings.stack.length === 1 && S.screen === 'app');
      NM.pop('settings');
      ck('栈空后才回主屏', S.screen === 'home');
    });

    // 2. 通知点击跳转到对应应用
    safe('通知跳转', () => {
      const n = NM.notify('weather', '天气预警', '明天有雨', { silent: true });
      NM.openNotif(n.id);
      ck('点击通知打开对应应用', S.screen === 'app' && S.fg === 'weather');
      ck('打开后该条通知被消费', !S.notifications.some(x => x.id === n.id));
    });

    // 3. 飞行模式真实影响浏览器联网
    safe('网络联动', () => {
      NM.toggleTile('airplane');
      NM.launchApp('browser');
      ck('断网时浏览器显示离线页', d.querySelector('#view-browser').innerHTML.indexOf('无法连接到网络') >= 0);
      NM.toggleTile('airplane');
      NM.renderView(S.views.browser);
      ck('恢复网络后页面可访问', d.querySelector('#view-browser').innerHTML.indexOf('无法连接到网络') < 0);
    });

    // 4. 三键导航
    safe('导航方式', () => {
      S.settings.nav = 'buttons'; NM.applySettings();
      ck('切换三键后底部出现三个按钮', d.querySelectorAll('#navbar .nav-btn').length === 3);
      S.settings.nav = 'gesture'; NM.applySettings();
      ck('切回手势后三键栏清空', d.querySelectorAll('#navbar .nav-btn').length === 0);
    });

    // 5. 锁屏快捷相机返回锁屏
    safe('锁屏相机', () => {
      NM.sleep(); NM.wake();
      ck('点亮后处于锁屏', S.screen === 'lock');
      d.querySelector('[data-a="lock-camera"]').click();
      ck('锁屏可直接进相机', S.screen === 'app' && S.fg === 'camera' && S.cameraFromLock === true);
      d.querySelector('#view-camera [data-a="back"]').click();
      ck('退出相机回到锁屏（仍处于锁定）', S.screen === 'lock' && S.cameraFromLock === false);
    });

    // 6. 息屏前在应用内，解锁后回到该应用
    safe('解锁回到离开前界面', () => {
      NM.beginUnlock();
      setTimeout(() => {
        NM.launchApp('notes');
        NM.sleep();
        ck('息屏记住离开前位置', S.lockedFrom === 'app');
        NM.wake(); NM.beginUnlock();
        setTimeout(() => {
          ck('解锁后恢复到原应用', S.screen === 'app' && S.fg === 'notes');
        }, 420);
      }, 420);
    });

    // 7. PIN 解锁
    setTimeout(() => {
      safe('PIN', () => {
        S.settings.pinOn = true; S.settings.pin = '1314';
        NM.sleep(); NM.wake(); NM.beginUnlock();
        ck('开启密码后上滑进入 PIN 页', S.screen === 'pin');
        ['1', '2', '3', '4'].forEach(k => NM.pinKey(k));
        setTimeout(() => {
          ck('错误密码不解锁', S.screen === 'pin');
          ['1', '3', '1', '4'].forEach(k => NM.pinKey(k));
          setTimeout(() => {
            ck('正确密码完成解锁', S.screen !== 'pin');
            // 8. 关机清空后台
            safe('关机', () => {
              NM.powerOff();
              ck('关机清空所有后台视图', Object.keys(S.views).length === 0 && S.tasks.length === 0);
              ck('关机进入黑屏', S.screen === 'off');
            });
            console.log('\n===== 状态机 / 真机逻辑检查 =====');
            checks.forEach(c => console.log(c));
            console.log('\n通过 ' + checks.filter(c => c.startsWith('PASS')).length + '/' + checks.length);
            console.log('\n===== 运行时错误 (' + errors.length + ') =====');
            errors.slice(0, 20).forEach(e => console.log('  - ' + e));
            process.exit(errors.length || checks.some(c => c.startsWith('FAIL')) ? 1 : 0);
          }, 700);
        }, 300);
      });
    }, 1400);
  }, 420);
}, 2700);
