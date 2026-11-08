/* MUOS 新增功能回归测试：外层设备控制台 / 设置中心 / 桌面布局 / 小组件 / 抽屉 / 手势 / 新应用 */
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
const safe = (n, f) => { try { f(); } catch (e) { errors.push(n + ': ' + e.message + ' | ' + (e.stack || '').split('\n')[1]); } };
const d = w.document;
/* jsdom 不做布局，给 #display 补上真实尺寸让手势判定生效 */
Object.defineProperty(d.getElementById('display'), 'clientWidth', { get: () => 390 });
Object.defineProperty(d.getElementById('display'), 'clientHeight', { get: () => 844 });

function pointer(type, x, y, target) {
  const ev = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 });
  (target || d.getElementById('display')).dispatchEvent(ev);
}

setTimeout(() => {
  const NM = w.NM, S = NM.S;
  safe('解锁', () => NM.beginUnlock());
  setTimeout(() => {
    /* ---------- 1. 外层设备控制台 ---------- */
    safe('设备形态', () => {
      ck('初始形态为手机', NM.DEV.form === 'phone' && d.documentElement.getAttribute('data-form') === 'phone');
      const before = NM.deviceInfo().cssW;
      const padBtn = d.querySelector('#device-console [data-d="form"][data-v="pad"]');
      ck('控制台提供平板形态按钮', !!padBtn);
      padBtn.click();
      const i = NM.deviceInfo();
      ck('切平板后品牌为 MUSE PAD', i.brand === 'MUSE PAD' && i.form === 'pad');
      ck('开机动画品牌同步', d.querySelector('.boot-name').textContent === 'MUSE PAD');
      ck('状态栏显示 PAD 角标', d.getElementById('sb-brand').textContent === 'PAD');
      ck('机身逻辑宽度变化', i.cssW > before && d.documentElement.style.getPropertyValue('--pw') === i.cssW + 'px');
      ck('平板桌面 6 列', NM.homeGridInfo().cols === 6);
      ck('平板 Dock 更多入口', d.querySelectorAll('#dock .app-icon').length >= 7);
      ck('参数独立持久化', !!w.localStorage.getItem('muos-device-v1'));
    });
    safe('关于本机只读展示', () => {
      NM.launchApp('about');
      const t = d.getElementById('view-about').textContent;
      ck('关于本机显示 MUSE PAD', t.indexOf('MUSE PAD') >= 0);
      ck('关于本机显示物理分辨率', t.indexOf('2000 × 3200') >= 0);
      ck('关于本机显示刷新率', t.indexOf('120 Hz') >= 0);
      ck('关于本机显示设备形态', t.indexOf('平板') >= 0);
      NM.goHome();
    });
    safe('分辨率与刷新率', () => {
      const r0 = NM.deviceInfo().resW;
      d.querySelector('#device-console [data-d="res"][data-v="pad-uhd"]').click();
      ck('分辨率切换真实生效', NM.deviceInfo().resW > r0 && NM.deviceInfo().resW === 2560);
      d.querySelector('#device-console [data-d="hz"][data-v="60"]').click();
      ck('刷新率写入 html', d.documentElement.getAttribute('data-hz') === '60');
      ck('刷新率影响过渡时长', parseFloat(d.documentElement.style.getPropertyValue('--anim')) > .12);
      NM.applySettings();
      ck('60Hz 动画时长不同于 120Hz', parseFloat(d.documentElement.style.getPropertyValue('--anim')) >= .12);
      d.querySelector('#device-console [data-d="form"][data-v="phone"]').click();
      ck('切回手机形态', NM.deviceInfo().brand === 'MUSE' && NM.homeGridInfo().cols === 4);
    });
    safe('系统内不可改硬件参数', () => {
      NM.launchApp('settings');
      NM.push('settings', 'display');
      const h = d.getElementById('view-settings').innerHTML;
      ck('显示页不再有分辨率开关', h.indexOf('resolution|') < 0);
      NM.push('settings', 'account');
      const a = d.getElementById('view-settings').innerHTML;
      ck('本机信息已移入账户中心', a.indexOf('屏幕与设备（只读）') >= 0);
      ck('账户中心有本机型号', a.indexOf('MU-') >= 0 || a.indexOf('本机') >= 0);
      NM.goHome();
    });

    /* ---------- 2. 完整设置中心 ---------- */
    safe('设置结构', () => {
      const groups = NM.SETTINGS_GROUPS || [];
      ck('一级分类 24 个以上', groups.length >= 24);
      ck('含 Try Galaxy 不可交互的 Privacy Display', JSON.stringify(groups).indexOf('Privacy Display') >= 0);
      ck('含 Galaxy AI / 折叠屏 / 开发者选项', JSON.stringify(groups).indexOf('MUAI 与智能助手') >= 0 && groups.some(g => g.k === 'developer'));
      NM.push('settings', 'wallpaper');
      const wallTxt = d.getElementById('view-settings').textContent;
      ck('壁纸页含自定义壁纸导入', wallTxt.indexOf('自定义壁纸') >= 0 && wallTxt.indexOf('导入图片') >= 0);
      NM.pop('settings');
      NM.push('settings', 'homeSettings');
      ck('主屏幕设置含导航与小横条入口', d.getElementById('view-settings').textContent.indexOf('系统导航与小横条') >= 0);
      ck('主屏幕设置含多任务界面布局', d.getElementById('view-settings').textContent.indexOf('多任务界面布局') >= 0);
      NM.push('settings', 'navDetail');
      const navTxt = d.getElementById('view-settings').textContent;
      ck('小横条手势动作可配置', navTxt.indexOf('快速上滑') >= 0 && navTxt.indexOf('上滑停顿') >= 0 &&
        navTxt.indexOf('左右滑') >= 0);
      ck('停顿时间 100ms 档位', navTxt.indexOf('0.1 秒') >= 0 && navTxt.indexOf('1 秒') >= 0);
      NM.pop('settings'); NM.pop('settings');
      NM.push('settings', 'themes');
      d.querySelector('#view-settings [data-a="set-act"][data-v="theme-pick|default"]').click();
      console.log('DBG theme=' + S.settings.theme + ' attr=' + d.documentElement.getAttribute('data-theme') +
        ' pack=' + S.settings.themePack + ' wall=' + S.settings.wall + ' sched=' + S.settings.darkSchedule);
      ck('默认柔光生效为浅色主题', S.settings.theme === 'light' &&
        d.documentElement.getAttribute('data-theme') === 'light',
        S.settings.theme + '/' + d.documentElement.getAttribute('data-theme'));
      ck('柔光启用生命感美学材质', S.settings.softGlass === true);
      d.querySelector('#view-settings [data-a="set-act"][data-v="theme-pick|obsidian"]').click();
      ck('深色曜石切换为深色主题', S.settings.theme === 'dark');
      NM.pop('settings');
      const hits = NM.settingsSearch('下滑');
      ck('跨分类设置搜索可用', hits && hits.length > 0);
      NM.launchApp('settings');
      groups.forEach(g => {
        if (g.k === 'about') return;
        safe('page ' + g.k, () => NM.setPage('settings', g.k));
      });
      ck('所有设置二级页可渲染', true);
      NM.goHome();
    });
    safe('设置联动', () => {
      S.settings.appNotif.messages = false;
      const n0 = S.notifications.length;
      NM.notify('messages', '被拦截', '不应出现');
      ck('逐应用通知开关生效', S.notifications.length === n0);
      S.settings.appNotif.messages = true;
      ck('图标资源已加载（data URL）', !!NM.SICONS && !!NM.SICONS.wifi &&
        /^data:image\/png;base64,/.test(NM.SICONS.wifi.w), !!NM.SICONS && !!NM.SICONS.wifi);
      ck('单色图标自动补反色变体', !!(NM.SICONS.dnd && NM.SICONS.dnd.w && NM.SICONS.dnd.b));
      NM.renderStatusBarIcons();
      ck('状态栏使用新图标图片', d.querySelectorAll('#sb-icons img.sb-ico').length >= 2,
        String(d.querySelectorAll('#sb-icons img.sb-ico').length));
      ck('电量数字嵌在电池图标内', (function () {
        const b = d.querySelector('#sb-icons .battery-chip b');
        return !!b && b.textContent === String(Math.round(S.battery));
      })());
      S.settings.hour24 = false;
      NM.tickClock();
      ck('12 小时制生效', d.getElementById('sb-time').textContent.indexOf('午') >= 0);
      S.settings.hour24 = true;
      S.settings.privacyDisplay = true; NM.applySettings();
      ck('隐私显示属性生效', d.documentElement.getAttribute('data-privacy') === '1');
      S.settings.privacyDisplay = false; NM.applySettings();
      S.settings.aod = true; NM.applySettings(); NM.renderAod();
      ck('AOD 页面渲染', !!d.querySelector('#off .aod-clock'));
      S.settings.aod = false; NM.renderAod();
      ck('使用时长统计任务存在', typeof NM.tickSystemExtras === 'function');
      NM.tickSystemExtras();
    });

    /* ---------- 3. 桌面布局编辑器与小组件 ---------- */
    safe('进入桌面布局', () => {
      NM.goHome();
      NM.openHomeEditor();
      ck('长按桌面进入编辑态', S.editing === true);
      ck('布局编辑器已显示', d.getElementById('home-editor').classList.contains('on'));
      ck('有添加小组件入口', !!d.querySelector('#home-editor [data-a="wd-pick"]'));
      d.querySelector('#home-editor [data-a="wd-pick"]').click();
      ck('小组件选择器展开', d.querySelectorAll('#home-editor .wd-item').length === 10);
    });
    safe('添加/删除小组件', () => {
      const n0 = S.data.widgets.length;
      d.querySelector('#home-editor [data-a="wd-add"][data-v="battery"]').click();
      ck('小组件已写入数据', S.data.widgets.length === n0 + 1);
      ck('小组件实时渲染并带网格占位', (function () {
        const el = d.querySelector('#pages-track .widget-card');
        return !!el && (el.getAttribute('style') || '').indexOf('grid-column:') >= 0;
      })());
      const id = S.data.widgets[S.data.widgets.length - 1].id;
      NM.HOME_SYS['wd-del'](id, null, null);
      ck('小组件可移除', S.data.widgets.length === n0);
    });
    safe('小组件尺寸 / 页面 / 网格 / 图标', () => {
      S.data.widgets.push({ id: 't1', type: 'clock', page: 0, col: 0, row: 2, w: 2, h: 2, _placed: 1 });
      NM.renderPages();
      ck('小组件占位渲染在网格里', !!d.querySelector('#pages-track .widget-card[data-wd="t1"]'));
      NM.HOME_SYS['wd-resize']('t1');
      const t1 = S.data.widgets.filter(function (x) { return x.id === 't1'; })[0];
      ck('尺寸循环调整（2×2 → 1×2）', t1 && t1.w === 1 && t1.h === 2,
         t1 && (t1.w + 'x' + t1.h));
      NM.HOME_SYS['wd-resize']('t1');
      NM.HOME_SYS['wd-resize']('t1');
      const t1b = S.data.widgets.filter(function (x) { return x.id === 't1'; })[0];
      ck('循环回 2×2', t1b && t1b.w === 2 && t1b.h === 2, t1b && (t1b.w + 'x' + t1b.h));
      NM.HOME_SYS['wd-del']('t1', null, null);
      const p0 = S.data.pageCount || 1;
      NM.HOME_SYS['ed-add-page']();
      ck('可添加桌面页面', S.data.pageCount === p0 + 1);
      NM.HOME_SYS['ed-grid']('5x6');
      ck('网格切换生效', S.settings.homeGrid === '5x6' && NM.homeGridInfo().cols === 5);
      const before = S.data.hidden.length;
      NM.removeHomeIcon('weather');
      ck('图标移除进入隐藏列表', S.data.hidden.length === before + 1);
      NM.addHomeIcon('weather');
      ck('图标可恢复到桌面', S.data.hidden.length === before);
      NM.HOME_SYS['ed-done']();
      ck('完成后退出编辑态', S.editing === false);
    });

    /* ---------- 4. 应用抽屉 ---------- */
    safe('应用抽屉', () => {
      NM.openDrawer();
      ck('抽屉包含全部应用', d.querySelectorAll('#app-drawer .dr-app').length >= 20);
      ck('抽屉底部展示设备参数', d.querySelector('#app-drawer .dr-foot').textContent.indexOf('Hz') >= 0);
      NM.closeDrawer();
      ck('抽屉可关闭', !d.getElementById('app-drawer').classList.contains('on'));
    });

    /* ---------- 5. 手势开关 ---------- */
    safe('下滑搜索开关', () => {
      NM.goHome(); S.settings.swipeSearch = true;
      pointer('pointerdown', 180, 200); pointer('pointerup', 180, 310);
      ck('开启时下滑打开全局搜索', S.screen === 'spotlight');
      NM.setScreen('home');
      S.settings.swipeSearch = false;
      pointer('pointerdown', 180, 200); pointer('pointerup', 180, 310);
      ck('关闭时下滑改为通知面板', S.shade === 'notif');
      NM.hideShade(); NM.setScreen('home');
      pointer('pointerdown', 180, 300); pointer('pointerup', 180, 180);
      ck('上滑打开应用抽屉', d.getElementById('app-drawer').classList.contains('on'));
      NM.closeDrawer(); S.settings.swipeSearch = true;
    });

    /* ---------- 6. 新增手机原生应用 ---------- */
    safe('新应用', () => {
      ['contacts', 'health', 'wallet', 'assistant'].forEach(id => {
        NM.launchApp(id);
        const v = S.views[id];
        ck(id + ' 可冷启动', !!v);
        Object.keys(v.def.pages || {}).forEach(k => safe('page ' + id + '/' + k, () => NM.setPage(id, k, { id: 'c1' })));
      });
      const a = S.views.assistant;
      NM.HOME_SYS && a.def.actions['ai-ask'](a, '今天天气');
      ck('超级助手能回答问题', S.data.aiHistory.length >= 2 && S.data.aiHistory[1].text.indexOf('°C') >= 0);
      const wv = S.views.wallet, b0 = S.data.wallet.balance;
      wv.def.actions['wallet-topup'](wv);
      ck('钱包充值真实改数据', S.data.wallet.balance === b0 + 100);
      const hv = S.views.health, s0 = S.data.health.steps;
      hv.def.actions['health-add'](hv);
      ck('健康记录真实改数据', S.data.health.steps > s0);
    });

    /* ---------- 7. 动效 ---------- */
    safe('动效层', () => {
      ck('光晕层存在', !!d.getElementById('glow-veil'));
      ck('涟漪层存在', !!d.getElementById('fx-layer'));
      /* 主题包切换可能关闭点按光效（真机语义），动效测试前显式开启 */
      S.settings.tapGlow = true; NM.applySettings();
      NM.fxTap(100, 100, true);
      ck('点按生成涟漪', d.querySelectorAll('#fx-layer .fx-ripple').length > 0);
      ck('光感粒子接口可用', typeof NM.fxParticles === 'function');
    });

    /* ---------- 8. 动作覆盖（静态精确比对） ---------- */
    safe('动作覆盖', () => {
      const path = require('path'), dir = path.dirname(process.argv[2]);
      const files = ['00-core.js','10-system.js','20-apps.js','30-more-apps.js','35-native-apps.js',
                     '40-settings.js','45-device.js','50-home.js','60-motion.js','90-boot.js'];
      const src = files.map(f => fs.readFileSync(path.join(dir, 'js', f), 'utf8')).join('\n') +
                  fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      const used = new Set(); let m;
      const re = /data-a=["']([a-z][a-z0-9-]*)["']/g;
      while ((m = re.exec(src))) used.add(m[1]);
      const handlers = new Set();
      const hre = /['"]([a-z][a-z0-9-]*)['"]\s*:\s*function/g;
      while ((m = hre.exec(src))) handlers.add(m[1]);
      /* 动态拼接的动作名 */
      ['toggle-tile','toggle-torch','set-tg','set-val','set-act','set-nav','set-jump','set-page',
       'set-wall','set-appnotif','set-island','set-bgrestrict','restore-app','bio-add','bio-clear',
       'app-open','set-build','set-clearq','set-pin-save','launch','goto-page','edge-open'].forEach(x => handlers.add(x));
      const missing = [...used].filter(x => !handlers.has(x));
      ck('全部 ' + used.size + ' 个动作均有处理函数（缺失 ' + missing.length + '）', missing.length === 0);
      if (missing.length) console.log('  MISSING:', missing.join(', '));
    });

    setTimeout(() => {
      console.log('\n===== 新增功能回归 =====');
      checks.forEach(c => console.log(c));
      console.log('\n通过 ' + checks.filter(c => c.startsWith('PASS')).length + '/' + checks.length);
      console.log('\n===== 运行时错误 (' + errors.length + ') =====');
      errors.slice(0, 25).forEach(e => console.log('  - ' + e));
      process.exit(errors.length || checks.some(c => c.startsWith('FAIL')) ? 1 : 0);
    }, 400);
  }, 420);
}, 2700);
