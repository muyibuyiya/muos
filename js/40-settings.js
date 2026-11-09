/* ============================================================
   MUOS — 40-settings.js
   完整设置中心：MUOS 自有设置结构
   · 24 个一级分类，每个分类都有二级内容与真实生效的控件
   · 顶部「搜索设置」可跨所有设置项检索并直达
   · 首页「你想做什么」任务导向入口
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S, esc = NM.util.esc, svg = NM.svg, clamp = NM.util.clamp;
  var D = NM.DEFAULT_SETTINGS;

  /* ---------- schema 小工具：让每个设置项都由数据驱动，行为保持一致 ---------- */
  function H(t) { return { t: 'h', label: t }; }
  function T(label, sub, key, note) { return { t: 'tg', label: label, sub: sub, key: key, note: note }; }
  function SEG(label, sub, key, opts) { return { t: 'seg', label: label, sub: sub, key: key, opts: opts }; }
  function SEL(label, sub, key, opts) { return { t: 'sel', label: label, sub: sub, key: key, opts: opts }; }
  function SL(label, sub, key, min, max, unit) { return { t: 'sl', label: label, sub: sub, key: key, min: min, max: max, unit: unit || '%' }; }
  function NAV(label, sub, page) { return { t: 'nav', label: label, sub: sub, page: page }; }
  function ACT(label, sub, act, val, tone) { return { t: 'act', label: label, sub: sub, act: act, val: val, tone: tone }; }
  function INFO(label, fn) { return { t: 'info', label: label, fn: fn }; }
  function TXT(label, sub) { return { t: 'txt', label: label, sub: sub }; }
  function CUSTOM(fn) { return { t: 'custom', fn: fn }; }

  var O = function (v, label) { return [v, label]; };
  var YESNO = [O(true, '开'), O(false, '关')];

  /* 常用任务：osimulator 的「从想做的事出发」 */
  var TASKS = [
    { t: '连接 Wi-Fi', s: '打开或关闭无线网络', p: 'connections' },
    { t: '开启深色模式', s: '外观与定时切换', p: 'display' },
    { t: '下滑打开搜索', s: '主屏幕手势开关', p: 'homeSettings' },
    { t: '添加桌面小组件', s: '长按桌面进入布局', p: 'homeSettings' },
    { t: '锁定设备', s: 'PIN / 指纹 / 面部', p: 'lockscreen' },
    { t: '释放存储空间', s: '设备维护与清理', p: 'batteryCare' },
    { t: '检查系统更新', s: '下载并安装', p: 'update' },
    { t: '恢复出厂设置', s: '清除全部数据', p: 'general' }
  ];

  /* 首页快捷任务：整块可隐藏、可折叠，单项也可单独关闭 */
  function taskSectionHtml() {
    var st = S.settings;
    if (!st.showTasks) return '';
    var hidden = st.taskHidden || {};
    var list = TASKS.map(function (t, i) { return { t: t, i: i }; })
      .filter(function (x) { return !hidden[x.i]; });
    return '<div class="task-head"><b>你想做什么？</b><span>' + list.length + ' 项</span>' +
      '<button data-a="task-fold">' + (st.taskFolded ? '展开' : '收起') + '</button>' +
      '<button data-a="set-jump" data-v="taskShortcuts">管理</button></div>' +
      (st.taskFolded ? '' : '<div class="task-grid">' + (list.length ? list.map(function (x) {
        return '<button class="task-chip" data-a="set-jump" data-v="' + x.t.p + '"><b>' +
          esc(x.t.t) + '</b><small>' + esc(x.t.s) + '</small></button>';
      }).join('') : '<div class="empty" style="grid-column:1/-1;padding:18px">所有快捷入口都已关闭 · 点「管理」恢复</div>') + '</div>');
  }

  /* ============================================================
     一级分类。顺序与真机设置一致；每项都真实写入 S.settings 并立即生效
     ============================================================ */
  var GROUPS = [
    { k: 'connections', t: '连接', s: 'Wi-Fi · 蓝牙 · 移动网络 · NFC', i: 'wifi', rows: [
      H('无线网络'),
      T('Wi-Fi', '连接可用网络；关闭后状态栏图标消失', 'wifi'),
      T('自动连接已知网络', '进入已保存网络覆盖范围时自动连上', 'wifiAuto'),
      ACT('可用网络', 'MUOS-5G · 信号满格 · 已保存', 'wifi-scan', 'MUOS-5G'),
      T('飞行模式', '一并关闭蜂窝与 Wi-Fi；浏览器会显示离线页', 'airplane'),
      T('移动数据', '关闭后仅 Wi-Fi 可上网', 'cellular'),
      T('数据节省程序', '限制后台数据，天气与浏览器使用缓存', 'dataSaver'),
      H('蓝牙与附近设备'),
      T('蓝牙', '耳机、手表与车载设备的连接总开关', 'bluetooth'),
      ACT(' paired 设备', 'MUOS Buds 4 Pro · 已连接', 'bt-list', 'buds'),
      T('NFC 和非接触支付', '靠近读卡器时启用钱包支付', 'nfc'),
      T('移动热点', '把本机网络共享给其他设备', 'hotspot'),
      INFO('当前连接', function () { return (!S.settings.airplane && (S.settings.wifi || S.settings.cellular)) ? '已连接到 MUOS-5G' : '无网络连接'; })
    ] },

    { k: 'sound', t: '声音和振动', s: '音量 · 铃声 · 振动 · 勿扰', i: 'volume', rows: [
      H('音量'),
      SL('媒体音量', '同时影响测试音与音乐合成的增益', 'volume', 0, 100),
      SL('铃声音量', '来电响铃', 'ringVol', 0, 100),
      SL('通知音量', '通知提示音', 'notifVol', 0, 100),
      SL('系统音量', '键盘与触控音', 'sysVol', 0, 100),
      H('铃声与提示音'),
      SEL('来电铃声', '播放测试音可试听当前选择', 'ringTone', [
        O('muos_origin', 'MUOS 原点'), O('ripple', '柔光涟漪'), O('dawn', '晨曦'), O('silent', '静音')]),
      SEL('通知提示音', '新通知到达时的音色', 'notifTone', [
        O('chime', '清脆风铃'), O('drop', '水滴'), O('pulse', '脉冲')]),
      ACT('播放测试音', '按上方音量与铃声设置合成', 'test-beep', ''),
      H('振动'),
      SEG('振动强度', '触感反馈强度', 'vibration', [O(0, '关闭'), O(1, '弱'), O(2, '中'), O(3, '强')]),
      T('系统提示音', '开关与点击时的声音', 'systemSound'),
      T('触控音', '点击控件时的轻音', 'touchSound'),
      T('Dolby Atmos', '打开后合成音更饱满', 'dolby'),
      H('免打扰'),
      T('勿扰模式', '通知静默入库，不弹横幅、不点亮屏幕', 'dnd'),
      T('专注模式', '暂停非必要应用的通知', 'focusMode'),
      T('就寝模式', '夜间灰度显示并静默通知', 'bedtimeMode'),
      NAV('勿扰例外与安排', '允许哪些应用穿透勿扰', 'dndDetail')
    ] },

    { k: 'notifications', t: '通知', s: '应用通知 · 锁屏通知 · 弹窗样式', i: 'bell', rows: [
      H('应用通知'),
      NAV('应用通知', '逐个应用决定是否允许通知', 'appNotif'),
      T('锁屏显示通知', '关闭后锁屏只显示状态栏图标', 'lockNotif'),
      T('隐藏敏感内容', '锁屏通知只显示应用名，不显示正文', 'hideSensitive'),
      T('锁屏通知堆叠', '同类通知收拢成一叠，上滑展开', 'notifStack'),
      H('通知样式'),
      SEL('弹窗样式', '横幅通知的呈现方式', 'notifPop', [
        O('brief', '简洁悬浮'), O('full', '完整卡片'), O('none', '仅状态栏')]),
      SEG('快捷设置面板', '分离＝左右分别下拉通知与控制；合并＝统一下拉', 'panelMode', [
        O('split', '分离'), O('together', '合并')]),
      ACT('发送一条测试通知', '验证横幅、锁屏与勿扰的实际行为', 'test-notif', ''),
      ACT('清除全部通知', '清空通知中心与锁屏', 'clear-notifs', '', 'danger')
    ] },

    { k: 'display', t: '显示', s: '深色模式 · 亮度 · 色彩 · 隐私显示', i: 'brightness', rows: [
      H('外观'),
      SEG('浅色 / 深色', '全局立即生效，包含锁屏与应用', 'theme', [O('dark', '深色'), O('light', '浅色')]),
      T('按时间自动切换深色', '18:00 — 次日 7:00 自动启用深色', 'darkSchedule'),
      H('亮度'),
      SL('屏幕亮度', '蒙层实时变化；省电模式会限制上限', 'brightness', 15, 100),
      T('自适应亮度', '随 simulated 环境光缓慢微调', 'adaptiveBright'),
      T('额外亮度', '允许高于标准上限（阳光下）', 'extraBright'),
      H('色彩与流畅度'),
      SEG('动作流畅度', '自适应＝更顺滑；标准＝更省电', 'motion', [
        O('adaptive', '自适应'), O('standard', '标准')]),
      T('护眼模式', '减少蓝光，屏幕偏暖', 'eyeShield'),
      T('定时开启护眼', '日落到日出自动开启', 'eyeSchedule'),
      SEG('屏幕模式', '鲜艳＝高饱和；自然＝低饱和', 'screenMode', [
        O('vivid', '鲜艳'), O('natural', '自然')]),
      SL('白平衡', '冷 ←→ 暖', 'whiteBalance', 0, 100, ''),
      H('字体与缩放'),
      SEG('字体大小', '影响全系统文字', 'fontScale', [O(.9, '小'), O(1, '标准'), O(1.12, '大')]),
      T('粗体字', '标题与设置项加粗', 'boldFont'),
      SEG('字体样式', '系统字重风格', 'fontStyle', [
        O('default', '默认'), O('rounded', '圆润'), O('serif', '衬线')]),
      SEG('屏幕缩放', '整体控件尺寸', 'screenZoom', [O(.92, '小'), O(1, '标准'), O(1.1, '大')]),
      T('简易模式', '更大图标与更简洁的主屏布局', 'easyMode'),
      H('屏幕行为'),
      SEG('屏幕超时', '无操作后自动息屏', 'autolock', [
        O(30, '30 秒'), O(60, '1 分钟'), O(300, '5 分钟'), O(0, '永不')]),
      T('全屏应用', '让应用延伸到状态栏区域', 'fullscreenApps'),
      T('隐藏前置摄像头挖孔', '用黑色状态栏遮住挖孔', 'cameraCutout'),
      T('误触保护', '屏幕在暗处时不响应触摸', 'pocketGuard'),
      T('触摸灵敏度', '贴膜后提高灵敏度', 'touchSensitivity'),
      T('显示充电信息', '息屏时显示电量与预计充满时间', 'chargeInfo'),
      T('屏幕保护程序', '充电时显示时钟屏保', 'screenSaver'),
      H('边缘面板与导航'),
      T('边缘面板', '从屏幕右缘滑出快捷工具', 'edgePanel'),
      NAV('导航栏', '全面屏手势 / 经典三键与手势灵敏度', 'navDetail'),
      H('Privacy Display（隐私显示）'),
      TXT('这一项在原生系统里只是说明页；MUOS 把它做成了真实生效的屏幕效果。', ''),
      T('隐私显示', '收窄可视角度：屏幕四周出现暗角，侧面不易看清内容', 'privacyDisplay'),
      T('自动隐私模式', '在 PIN 解锁、通知预览等敏感场景自动开启', 'privacyAuto'),
      T('最大隐私保护', '进一步压暗并提高暗角强度', 'privacyMax'),
      T('输入密码时启用', 'PIN 界面自动进入隐私显示', 'privacyPin'),
      ACT('预览隐私显示效果', '开启后请从侧面观察屏幕', 'preview-privacy', '')
    ] },

    { k: 'wallpaper', t: '壁纸和风格', s: '壁纸 · 调色板 · 锁屏样式', i: 'palette', rows: [
      H('壁纸'),
      CUSTOM(function () { return wallPicker(); }),
      CUSTOM(function () { return wallImportCard(); }),
      T('锁屏与主屏使用同一张', '关闭后锁屏固定使用深色渐变', 'lockWallSame'),
      T('动态锁屏壁纸', '每次点亮轮换一组预设光影', 'dynamicLock'),
      H('调色板'),
      SEL('系统调色板', '影响强调色、开关与按钮', 'palette', [
        O('blue', '柔光蓝'), O('violet', '星云紫'), O('green', '青竹绿'),
        O('orange', '暖阳橙'), O('mono', '石墨灰')]),
      T('将调色板应用到应用图标', '图标底色统一为当前强调色系', 'paletteIcons'),
      SEL('图标形状', '桌面与抽屉图标圆角（始终为圆角方形）', 'iconShape', [
        O('squircle', '标准圆角'), O('round', '大圆角'), O('square', '小圆角')]),
      H('生命感美学'),
      T('柔光玻璃材质', '卡片与面板使用通透的柔光玻璃', 'softGlass'),
      T('点按有光', '点击时出现跟随指尖的灵动光效', 'tapGlow'),
      T('拖拽有光', '拖动图标与小组件时光效跟随轨迹', 'dragGlow'),
      ACT('恢复默认外观', '一键还原柔光玻璃与配色', 'reset-style', '')
    ] },

    { k: 'themes', t: '主题与系统风格', s: '多套主题风格 · 色彩 · 图标形状', i: 'cube', rows: [
      H('系统风格'),
      SEG('界面风格', '切换后立即改变圆角、玻璃质感与超级岛形态', 'themePack', [
        O('hyperos', '生命感美学'), O('oneui', '清爽玻璃'), O('classic', '经典 MUOS')]),
      TXT('MUOS 默认采用「生命感美学」风格：柔光玻璃、点按光效、可自由编排的桌面与超级岛。', ''),
      H('图标'),
      NAV('图标包', '状态栏图标绘制风格 · 导入自定义图标包', 'iconPacks'),
      NAV('应用图标包', '桌面应用图标字形 · 导入自定义包', 'appIconPacks'),
      H('已安装主题'),
      ACT('默认主题 · 柔光', '当前使用', 'theme-pick', 'default'),
      ACT('深色曜石', '切换到高对比深色', 'theme-pick', 'obsidian'),
      ACT('晨曦渐变', '切换到暖色浅色', 'theme-pick', 'dawn'),
      INFO('主题版本', function () { return ({ hyperos: '生命感美学（默认）', oneui: '清爽玻璃', classic: '经典 MUOS' })[S.settings.themePack]; })
    ] },

    { k: 'homeSettings', t: '主屏幕', s: '网格 · 小组件 · 下滑搜索 · 布局锁', i: 'grid', rows: [
      H('布局'),
      SEG('主屏幕布局', '仅主屏＝所有应用都在桌面；主屏和应用屏幕＝有应用抽屉', 'homeLayout', [
        O('both', '主屏和应用屏幕'), O('only', '仅主屏幕')]),
      SEG('主屏幕网格', '每页可容纳的图标数量', 'homeGrid', [
        O('4x5', '4 × 5'), O('4x6', '4 × 6'), O('5x6', '5 × 6')]),
      SEG('应用屏幕网格', '应用抽屉的排列密度', 'appGrid', [
        O('4x5', '4 × 5'), O('4x6', '4 × 6'), O('5x6', '5 × 6')]),
      SEG('文件夹网格', '大文件夹可显示更多应用', 'folderGrid', [
        O('3x3', '3 × 3'), O('4x4', '4 × 4')]),
      T('大小文件夹', '把 2×2 文件夹放大为桌面主入口', 'bigFolder'),
      T('小部件堆叠', '同位置多个小组件左右滑动切换', 'widgetStack'),
      SEG('多任务界面布局', '最近任务页的排列方式', 'recentLayout', [
        O('h', '水平'), O('stack', '堆叠'), O('grid', '瀑布')]),
      H('手势'),
      NAV('系统导航与小横条', '小横条 / 三大键 / 隐藏 · 小横条外观与功能', 'navDetail'),
      T('在主屏幕向下滑动打开搜索', '关闭后下滑改为打开通知面板（真机默认行为）', 'swipeSearch'),
      T('上滑打开应用抽屉', '在主屏中部上滑查看全部应用', 'swipeUpDrawer'),
      T('显示桌面搜索框', '关闭后桌面底部不再显示搜索胶囊，下滑搜索手势仍可用', 'showSearchPill'),
      T('旋转到横向模式', '允许桌面横屏排列', 'rotateLandscape'),
      H('整理'),
      T('添加新应用到主屏幕', '安装应用后自动放到桌面', 'addNewApps'),
      T('锁定主屏幕布局', '开启后长按桌面不再进入编辑，图标不可移除', 'layoutLocked'),
      ACT('打开桌面布局编辑器', '添加小组件、移除图标、管理页面', 'open-home-editor', ''),
      NAV('隐藏的应用', '从桌面移除的应用可在这里恢复', 'hiddenApps'),
      ACT('重置主屏幕布局', '恢复默认图标、小组件与网格', 'reset-home', '', 'danger')
    ] },

    { k: 'lockscreen', t: '锁定屏幕和息屏显示', s: '锁屏类型 · 时钟 · Now Bar · AOD', i: 'lock', rows: [
      H('屏幕锁定'),
      T('锁屏密码', '上滑后需要输入 4 位数字', 'pinOn'),
      NAV('更改密码', '设置新的 4 位 PIN', 'pinChange'),
      T('指纹解锁', '点亮屏幕后按指纹区域即可解锁（模拟）', 'fingerprint'),
      T('面部识别', '点亮屏幕后看向屏幕即可解锁（模拟）', 'face'),
      T('重启后需要密码', '即使开启生物识别，重启首次仍需 PIN', 'lockAfterRestart'),
      SEG('自动锁屏', '无操作后息屏并锁定', 'autolock', [
        O(30, '30 秒'), O(60, '1 分钟'), O(300, '5 分钟'), O(0, '永不')]),
      H('锁屏外观'),
      SEL('锁屏时钟样式', '可自由调节的锁屏时钟', 'lockClock', [
        O('digital', '数字'), O('analog', '指针'), O('minimal', '极简'), O('vertical', '竖排')]),
      SEL('锁屏通知样式', '堆叠收纳或逐条展开', 'lockNotifStyle', [
        O('stack', '堆叠'), O('list', '列表'), O('icons', '仅图标')]),
      SEL('左下角快捷方式', '锁屏无需解锁即可使用', 'lockShortcutLeft', [
        O('torch', '手电筒'), O('camera', '相机'), O('none', '无')]),
      SEL('右下角快捷方式', '锁屏左滑也可直达相机', 'lockShortcutRight', [
        O('camera', '相机'), O('phone', '紧急呼叫'), O('none', '无')]),
      CUSTOM(function () { return ownerField(); }),
      H('Now Bar / 超级岛'),
      T('锁屏实时通知（Now Bar）', '锁屏底部显示音乐、计时器与电量状态', 'nowBar'),
      T('超级岛', '状态栏中间的实时任务岛', 'superIsland'),
      NAV('上岛服务', '管理允许显示到超级岛的应用', 'islandServices'),
      H('息屏显示 AOD'),
      T('息屏显示', '息屏后仍以低功耗显示时间与通知图标', 'aod'),
      SEG('显示方式', '始终 / 点按显示 / 定时', 'aodMode', [
        O('always', '始终显示'), O('tap', '点按显示'), O('scheduled', '按时间表')]),
      SEL('AOD 时钟样式', '息屏时钟的形态', 'aodClock', [
        O('line', '线条'), O('digital', '数字'), O('analog', '指针')]),
      SL('AOD 亮度', '息屏显示的亮度', 'aodBright', 10, 100)
    ] },

    { k: 'biometrics', t: '生物识别和安全性', s: '指纹 · 面部 · 安全文件夹', i: 'shield', rows: [
      NAV('指纹', '登记与删除指纹（模拟）', 'fingerprintDetail'),
      NAV('面部识别', '登记面部数据（模拟）', 'faceDetail'),
      T('安全文件夹', '把相册与笔记中的私密内容隔离', 'secureFolder'),
      T('自动阻止程序', '阻止来自未知来源的安装与 USB 指令', 'autoBlocker'),
      T('查找我的手机', '在关于本机中显示最后在线位置', 'findMyPhone'),
      ACT('查看安全状态', '扫描本机安全配置', 'security-scan', ''),
      INFO('安全补丁级别', function () { return '2026-11-01 · 已是最新'; })
    ] },

    { k: 'privacy', t: '隐私', s: '权限管理器 · 相机麦克风 · 剪贴板', i: 'eye', rows: [
      NAV('权限管理器', '按权限类型查看每个应用的授权状态', 'permissions'),
      T('允许相机访问', '关闭后相机应用显示权限被拒绝', 'camAccess'),
      T('允许麦克风访问', '关闭后录音机无法开始录音', 'micAccess'),
      T('剪贴板访问提醒', '应用读取剪贴板时提示', 'clipboardAlert'),
      T('发送诊断数据', '仅影响本页状态显示，不上传任何数据', 'diagData'),
      ACT('隐私仪表盘', '查看过去 24 小时的模拟权限访问记录', 'privacy-dash', ''),
      ACT('清除权限记录', '清空本地隐私访问日志', 'privacy-clear', '', 'danger')
    ] },

    { k: 'location', t: '位置', s: '位置服务 · 精确定位 · 扫描', i: 'location', rows: [
      T('使用位置信息', '天气、地图与指南针依赖此开关', 'location'),
      T('精确位置', '关闭后地图只显示大致区域', 'precise'),
      T('Wi-Fi 扫描', '即使 Wi-Fi 关闭也允许扫描提升定位', 'wifiScan'),
      T('蓝牙扫描', '通过附近蓝牙设备提升定位', 'btScan'),
      INFO('最近位置请求', function () { return (S.settings.location ? '天气 · 地图 · 2 分钟前' : '位置服务已关闭'); }),
      ACT('打开地图查看效果', '关闭定位后地图会显示受限提示', 'open-map', '')
    ] },

    { k: 'safety', t: '安全和紧急情况', s: '紧急联系人 · 医疗信息 · SOS', i: 'heart', rows: [
      T('紧急 SOS', '连按电源键触发紧急呼叫界面', 'emergencySos'),
      T('无线紧急警报', '接收模拟的公共安全通知', 'wirelessAlert'),
      CUSTOM(function () { return medicalField(); }),
      ACT('发送测试紧急警报', '验证锁屏与通知中心的紧急通知', 'test-alert', ''),
      ACT('查看紧急联系人', '本机预置 1 位紧急联系人', 'emergency-list', '')
    ] },

    { k: 'accounts', t: '账户和备份', s: '本机账户 · 云同步 · 备份', i: 'person', rows: [
      CUSTOM(function () { return accountField(); }),
      T('自动同步数据', '设置、笔记与日程自动保存到本机存储', 'autoSync'),
      T('仅通过 Wi-Fi 备份', '移动数据下不执行备份', 'backupWifi'),
      ACT('立即备份', '把当前状态打包保存到本地存储', 'backup-now', ''),
      ACT('恢复上次备份', '从本地备份还原设置', 'restore-backup', ''),
      INFO('上次备份', function () { return S.settings.lastBackup ? new Date(S.settings.lastBackup).toLocaleString('zh-CN') : '尚未备份'; })
    ] },

    { k: 'ai', t: 'MUAI 与智能助手', s: '通话助手 · 写作助手 · 照片助手 · 灵感球', i: 'assistant', rows: [
      H('智能工具'),
      NAV('通话助手 · 实时翻译', '输入一句话，得到实时翻译与回复建议', 'aiCall'),
      NAV('写作助手', '按语气改写一段文字', 'aiWrite'),
      NAV('照片助手 Photo Assist', '对相册照片做真实滤镜处理并另存', 'aiPhoto'),
      NAV('浏览助手', '对内置网页生成摘要与要点', 'aiBrowse'),
      NAV('录音转写', '把录音条目转成文字稿', 'aiTranscribe'),
      NAV('Now Nudge 场景建议', '根据电量、日程与未接来电生成建议', 'aiNudge'),
      H('开关'),
      T('圈选即搜', '长按屏幕底部小白条唤起超级助手', 'aiCircle'),
      T('通话实时翻译', '', 'aiCallOn'),
      T('写作助手', '', 'aiWrite'),
      T('照片助手', '', 'aiPhoto'),
      T('浏览助手', '', 'aiBrowse'),
      T('录音转写', '', 'aiTranscribe'),
      T('Now Nudge 情境建议', '', 'aiNudge'),
      T('仅在本机处理', '不向任何外部服务发送数据（本系统本来就完全离线）', 'aiOnDevice'),
      SEL('AI 语言', '输出所用语言', 'aiLang', [
        O('zh-CN', '简体中文'), O('en-US', 'English'), O('ja-JP', '日本語')]),
      ACT('打开超级助手', '灵感球、任务上岛与小白条', 'open-assistant', '')
    ] },

    { k: 'advanced', t: '高级功能', s: '动作与手势 · 侧键 · 单手模式 · 折叠屏', i: 'sliders', rows: [
      H('动作与手势'),
      T('抬手亮屏', '抬起设备时自动点亮（模拟为点亮提示）', 'liftToWake'),
      T('双击亮屏', '息屏时双击屏幕点亮', 'doubleTapWake'),
      T('翻转静音', '屏幕朝下自动进入勿扰', 'flipMute'),
      T('多窗口 / 分屏', '多任务卡片支持分屏预览', 'multiWindow'),
      H('侧键'),
      SEL('双击电源键', '快速启动的功能', 'sideKeyDouble', [
        O('camera', '相机'), O('wallet', '钱包'), O('assistant', '超级助手'), O('none', '无')]),
      T('单手模式', '屏幕内容下移缩小，便于单手操作', 'oneHanded'),
      T('应用双开', '信息可同时登录第二个账号（模拟副本）', 'dualMessenger'),
      H('实验室'),
      T('实验功能', '启用尚在测试的系统能力', 'labs'),
      T('手写笔悬浮预览', '模拟手写笔的悬浮光标', 'spen'),
      (function () {
        var foldOnly = function (r) {
          r.cond = function () { return NM.deviceInfo && NM.deviceInfo().form === 'fold'; };
          return r;
        };
        return [
          foldOnly(H('折叠屏体验')),
          foldOnly(T('展开为内屏', '机身变宽，主屏变为双栏布局', 'foldMode')),
          foldOnly(ACT('查看内外屏切换效果', '打开折叠屏演示', 'fold-preview', ''))
        ];
      })()
    ] },

    { k: 'modes', t: '模式和日常程序', s: '专注 · 就寝 · 自动化', i: 'moon', rows: [
      T('专注模式', '暂停非必要应用通知', 'focusMode'),
      T('就寝模式', '灰度显示与静默', 'bedtimeMode'),
      T('勿扰模式', '通知静默入库', 'dnd'),
      ACT('添加日常程序', '例如：电量低于 20% 时自动开启省电', 'add-routine', ''),
      CUSTOM(function () { return routineList(); })
    ] },

    { k: 'wellbeing', t: '数字健康和家长控制', s: '屏幕使用时间 · 应用计时器', i: 'chart', rows: [
      CUSTOM(function () { return usageChart(); }),
      SL('每日使用目标', '超过后主屏显示提醒', 'wellbeingGoal', 30, 480, '分钟'),
      NAV('应用计时器', '为每个应用设置每日上限', 'appTimers'),
      ACT('重置今日使用统计', '清零本次运行的计时', 'reset-usage', '', 'danger')
    ] },

    { k: 'batteryCare', t: '电池和设备维护', s: '电量 · 省电 · 存储 · 内存', i: 'battery', rows: [
      CUSTOM(function () { return batteryCard(); }),
      T('模拟插入充电器', '电量会随时间回升，状态栏出现充电标记', 'chargingMirror'),
      T('省电模式', '限制亮度、减缓耗电、关闭动画', 'lowpower'),
      T('电池保护', '充电上限 80%，延长电池寿命', 'batteryProtect'),
      T('自动优化', '每天自动清理最久未用的后台任务', 'autoOptimize'),
      NAV('存储', '用户数据、缓存与清理', 'storage'),
      NAV('内存', '当前后台任务与占用', 'memory'),
      NAV('后台使用限制', '让指定应用不再保活', 'bgRestrict')
    ] },

    { k: 'appsPage', t: '应用程序', s: '已安装应用 · 默认应用 · 权限', i: 'grid', rows: [
      NAV('应用列表', '查看运行中的任务、强制停止与打开', 'appList'),
      NAV('默认应用', '浏览器、电话、信息的默认处理者', 'defaultApps'),
      NAV('特殊访问权限', '悬浮窗、安装未知应用、电池优化忽略', 'specialAccess'),
      INFO('已安装应用', function () { return NM.APPS.filter(function (a) { return !a.sysOnly; }).length + ' 个系统应用'; }),
      ACT('打开应用抽屉', '查看全部应用', 'open-drawer', '')
    ] },

    { k: 'general', t: '常规管理', s: '语言 · 时间 · 键盘 · 重置', i: 'keyboard', rows: [
      SEG('系统语言', '影响日期、星期与状态栏文案', 'language', [
        O('zh-CN', '简体中文'), O('en-US', 'English')]),
      SEG('时间格式', '12 / 24 小时制，状态栏与锁屏同步', 'hour24', [
        O(true, '24 小时'), O(false, '12 小时')]),
      T('自动设置时间', '使用浏览器本地时钟', 'autoTime'),
      SEL('默认键盘', '输入法的布局风格', 'keyboard', [
        O('default', 'MUOS 拼音'), O('compact', '紧凑'), O('numeric', '数字优先')]),
      H('重置'),
      ACT('重置所有设置', '保留用户数据，仅恢复设置默认值', 'reset-settings', ''),
      ACT('重置主屏幕布局', '恢复默认图标与小组件', 'reset-home', ''),
      ACT('恢复出厂设置', '清除全部数据并重启', 'set-reset', 'danger')
    ] },

    { k: 'a11y', t: '辅助功能', s: '视觉 · 听觉 · 交互增强', i: 'eye', rows: [
      H('视觉增强'),
      T('高对比度文字', '提高文本与背景对比', 'highContrast'),
      T('高对比度键盘', '按键描边更清晰', 'highContrastKbd'),
      T('色彩校正', '降低色偏', 'colorCorrection'),
      T('颜色反转', '全屏幕色彩反转', 'colorInvert'),
      T('减少动画', '所有过渡立即完成', 'reduceAnim'),
      T('放大功能', '双指放大屏幕内容', 'magnification'),
      H('听觉与交互'),
      T('听觉增强', '提示音更明亮', 'hearingBoost'),
      SEG('触摸保持时长', '长按判定时间', 'touchHold', [
        O(0, '短'), O(1, '中'), O(2, '长')]),
      T('辅助功能快捷方式', '音量键长按唤出菜单', 'a11yShortcut'),
      ACT('查看辅助功能菜单', '当前已启用的项目', 'a11y-menu', '')
    ] },

    { k: 'update', t: '软件更新', s: '检查更新 · 自动下载 · 补丁', i: 'download', rows: [
      CUSTOM(function () { return updateCard(); }),
      T('通过 Wi-Fi 自动下载', '检测到更新时自动下载', 'autoUpdate'),
      ACT('检查更新', '连接模拟服务器检查是否有新版本', 'check-update', ''),
      ACT('下载并安装', '模拟一次完整的 OTA 升级', 'install-update', ''),
      INFO('上次检查', function () { return S.settings.lastUpdateCheck ? new Date(S.settings.lastUpdateCheck).toLocaleString('zh-CN') : '从未检查'; })
    ] },

    { k: 'developer', t: '开发者选项', s: '默认隐藏 · 连点构建号 7 次开启', i: 'cpu', hidden: true, rows: [
      T('显示触摸操作', '点击处出现圆形指示', 'showTaps'),
      SEG('窗口动画缩放', '影响全局过渡时长', 'animScale', [
        O(.5, '0.5×'), O(1, '1×'), O(2, '2×'), O(0, '关闭动画')]),
      T('USB 调试', '模拟调试连接状态', 'usbDebug'),
      T('GPU 呈现模式分析', '状态栏显示渲染提示', 'gpuOverlay'),
      T('在应用抽屉显示终端', '开启后「终端」出现在全部应用里', 'terminalEnabled'),
      ACT('查看系统日志', '最近的模拟系统事件', 'dev-log', ''),
      ACT('立即结束全部后台进程', '清空任务栈', 'kill-all', '', 'danger')
    ] },

    { k: 'about', t: '关于本机', s: '设备信息 · 版本 · 构建号', i: 'info', rows: [] }
  ];

  /* ============================================================
     二级页面：带独立交互的复杂设置
     ============================================================ */
  var SUBPAGES = {
    /* 系统导航：三种显示方式 + 桌面搜索框 + 快捷任务入口 */
    navDetail: function (v) {
      var holdOpts = [];
      for (var ms = 100; ms <= 1000; ms += 100) {
        holdOpts.push(O(ms, (ms === 1000 ? '1 秒' : (ms / 1000).toFixed(1) + ' 秒')));
      }
      return rowsHtml([
        H('系统导航方式'),
        SEG('导航栏显示', '小横条＝全面屏手势；三键＝经典导航；不显示＝纯净全屏（手势仍可用）', 'nav', [
          O('gesture', '小横条'), O('buttons', '三键'), O('none', '不显示')]),
        H('小横条手势 · 动作'),
        SEL('快速上滑', '短距离上滑（未达到停顿时间）', 'indUpAction', [
          O('home', '回主屏'), O('recents', '多任务'), O('none', '无')]),
        SEL('上滑停顿', '拖住小横条达到设定时间后松手', 'indUpHoldAction', [
          O('recents', '多任务'), O('home', '回主屏'), O('none', '无')]),
        SEL('停顿判定时间', '拖住多久算「停顿」触发，100ms 档位可调', 'indHoldMs', holdOpts),
        SEL('下滑', '小横条向下滑', 'indDownAction', [
          O('shade', '收起面板 / 回桌面'), O('home', '回桌面'), O('none', '无')]),
        SEL('左右滑', '小横条左右滑动', 'indSideAction', [
          O('switch', '切换最近应用'), O('none', '无')]),
        H('小横条外观'),
        SEL('小横条样式', '底部手势条的长度外观', 'indStyle', [
          O('short', '短款'), O('classic', '标准'), O('long', '加长')]),
        T('随背景取色', '浅色界面自动变深，深色界面保持白色', 'indTint'),
        H('主屏幕手势'),
        T('在主屏幕向下滑动打开搜索', '关闭后下滑改为打开通知面板', 'swipeSearch'),
        T('上滑打开应用抽屉', '在主屏中部上滑查看全部应用', 'swipeUpDrawer'),
        T('显示桌面搜索框', '桌面底部的搜索胶囊', 'showSearchPill'),
        H('设置首页快捷任务'),
        T('显示「你想做什么？」', '整块隐藏后仍可从下面的自定义页恢复', 'showTasks'),
        SEG('默认状态', '收起时只保留一行摘要', 'taskFolded', [O(false, '展开'), O(true, '收起')]),
        NAV('自定义快捷任务', '逐个显示或隐藏 8 个入口', 'taskShortcuts')
      ], v);
    },
    taskShortcuts: function (v) {
      var st = S.settings, hidden = st.taskHidden || {};
      return '<div class="set-note">这里控制设置首页「你想做什么？」区块；每个入口都可以单独关闭，也可以把整块折叠或隐藏。</div>' +
        rowsHtml([
          H('整块设置'),
          T('显示快捷任务区', '关闭后设置首页只保留分类列表', 'showTasks'),
          SEG('默认状态', '收起时只显示一行摘要', 'taskFolded', [O(false, '展开'), O(true, '收起')]),
          H('单个入口')
        ], v) +
        '<div class="card">' + TASKS.map(function (t, i) {
          var on = !hidden[i];
          return '<div class="set-row slim"><span>' + esc(t.t) + '</span>' +
            '<span class="toggle ' + (on ? 'on' : '') + '" data-a="task-toggle-one" data-v="' + i + '"></span></div>';
        }).join('') + '</div>' +
        '<div class="set-note">关闭的入口只是不显示在首页，对应的设置分类依然可以从下方列表进入。</div>';
    },
    /* 图标包：状态栏图标风格（内置三套线条）＋ 导入自定义包 */
    iconPacks: function (v) {
      var cur = S.settings.iconPack || 'auto';
      var list = [
        { id: 'auto', t: '跟随系统风格', s: '生命感美学 → HyperOS / 清爽玻璃 → One UI / 经典 → 系统素材' },
        { id: 'default', t: '默认（系统素材）', s: '随主题自动取色的默认图标' },
        { id: 'builtin:hyperos', t: 'HyperOS 线条', s: '中等线宽 · 全圆角（小米规范）' },
        { id: 'builtin:oneui', t: 'One UI 线条', s: '偏细的几何线条（三星规范）' },
        { id: 'builtin:originos', t: 'OriginOS 线条', s: '饱满笔画 · 圆润转角（vivo 规范）' }
      ];
      (NM.OPEN_PACKS ? Object.keys(NM.OPEN_PACKS) : []).forEach(function (k) {
        var op = NM.OPEN_PACKS[k];
        list.push({ id: 'open:' + k, t: '开源 · ' + op.name,
          s: op.license + ' · ' + (op.style || '') + ' · ' + Object.keys(op.icons).length + ' 个图标' });
      });
      (NM.getIconPacks ? NM.getIconPacks() : []).forEach(function (p) {
        list.push({ id: 'pack:' + p.id, t: '导入包 · ' + p.name,
          s: (p.author ? p.author + ' · ' : '') + Object.keys(p.icons).length + ' 个图标',
          pid: p.id });
      });
      var rows = list.map(function (o) {
        return '<div class="set-row icon-pack-row' + (cur === o.id ? ' sel' : '') + '"' +
          ' data-a="set-act" data-v="ip-use|' + o.id + '">' +
          '<span class="row-main"><b>' + esc(o.t) + '</b><small>' + esc(o.s) + '</small></span>' +
          '<span class="ip-side">' +
          (cur === o.id ? '<span class="ip-cur">使用中</span>' : '') +
          (o.pid ? '<span class="ip-del" data-a="set-act" data-v="ip-del|' + o.pid + '">删除</span>' : '') +
          '</span></div>';
      }).join('');
      var tone = document.documentElement.getAttribute('data-sb') === 'dark' ? 'b' : 'w';
      var prev = ['wifi', 'signal', 'bt', 'battery', 'alarm', 'dnd', 'torch', 'gps'].map(function (n) {
        return '<span class="ip-pv">' + (NM.sicon ? NM.sicon(n, tone, { level: S.battery }) : '') + '</span>';
      }).join('');
      return '<div class="card ip-preview">' + prev + '</div>' +
        '<div class="set-note">线条图标会随状态栏明暗自动变色（currentColor），无需为浅色/深色各准备一套素材。</div>' +
        '<div class="card">' + rows + '</div>' +
        '<div class="card">' +
        '<div class="set-row icon-pack-row" data-a="set-act" data-v="ip-import|">' +
        '<span class="row-main"><b>导入图标包</b><small>选择 .json（name + icons，每个图标给 w / b 两种颜色）</small></span>' +
        '<span class="ip-side"><span class="ip-go">选择文件</span></span></div>' +
        '<div class="set-row icon-pack-row" data-a="set-act" data-v="ip-export|">' +
        '<span class="row-main"><b>下载格式模板</b><small>导出示例 JSON，替换其中 dataURL 即可</small></span>' +
        '<span class="ip-side"><span class="ip-go">下载</span></span></div>' +
        '</div>' +
        '<div class="set-note">图标包只保存在本机浏览器（localStorage），不上传任何服务器。内置开源素材：Material Symbols（Apache-2.0）、Tabler Icons（MIT），来源与许可见 ICON-PACK.md。</div>';
    },
    /* 应用图标包：按应用 id 覆盖桌面字形，选中「默认」立即还原 */
    appIconPacks: function (v) {
      var cur = S.settings.appIconPack || 'default';
      var list = [{ id: 'default', t: '默认（MUOS 字形）', s: '渐变底 + 内置线条字形' }];
      (NM.getAppPacks ? NM.getAppPacks() : []).forEach(function (p) {
        list.push({ id: 'pack:' + p.id, t: '导入包 · ' + p.name,
          s: (p.author ? p.author + ' · ' : '') + Object.keys(p.apps).length + ' 个应用', pid: p.id });
      });
      var rows = list.map(function (o) {
        return '<div class="set-row icon-pack-row' + (cur === o.id ? ' sel' : '') + '"' +
          ' data-a="set-act" data-v="ap-use|' + o.id + '">' +
          '<span class="row-main"><b>' + esc(o.t) + '</b><small>' + esc(o.s) + '</small></span>' +
          '<span class="ip-side">' +
          (cur === o.id ? '<span class="ip-cur">使用中</span>' : '') +
          (o.pid ? '<span class="ip-del" data-a="set-act" data-v="ap-del|' + o.pid + '">删除</span>' : '') +
          '</span></div>';
      }).join('');
      var demo = ['phone', 'messages', 'camera', 'photos', 'music', 'settings', 'store', 'files']
        .map(function (id) { var a = NM.appById ? NM.appById(id) : null; return a ? NM.iconBox(a, 30) : ''; }).join('');
      return '<div class="card ap-preview">' + demo + '</div>' +
        '<div class="set-note">预览为当前生效的应用图标包；未在包内出现的应用自动使用默认图标。</div>' +
        '<div class="card">' + rows + '</div>' +
        '<div class="card">' +
        '<div class="set-row icon-pack-row" data-a="set-act" data-v="ap-import|">' +
        '<span class="row-main"><b>导入应用图标包</b><small>选择 .json（apps: { 应用id: { i: { w, b } } }）</small></span>' +
        '<span class="ip-side"><span class="ip-go">选择文件</span></span></div>' +
        '<div class="set-row icon-pack-row" data-a="set-act" data-v="ap-export|">' +
        '<span class="row-main"><b>下载格式模板</b><small>应用 id 可从桌面图标或开发者页查看</small></span>' +
        '<span class="ip-side"><span class="ip-go">下载</span></span></div>' +
        '</div>' +
        '<div class="set-note">图标包只保存在本机浏览器（localStorage），不上传服务器；第三方应用图标素材请确认授权后自用。</div>';
    },
    /* MUOS 账户中心：点设置首页顶部卡片进入，个人资料与退出登录在资料子页，本机信息收纳在这里 */
    account: function (v) { return accountPage(v); },
    accountLogin: function (v) { return accountLoginPage(v); },
    /* 用户板块点进去的资料页：个人资料 + 退出登录都收在这里 */
    accountProfile: function (v) {
      var st = S.settings, on = !!st.accountLoggedIn;
      return '<div class="acct-profile glass">' +
          '<span class="acct-avatar ' + esc(st.accountAvatar || 'blue') + '" data-a="acct-avatar">' + svg('person', 34) + '</span>' +
          '<b>' + (on ? esc(st.accountName) : '未登录') + '</b>' +
          '<small>' + (on ? 'MUSE ID · ' + esc(st.muosId) : '登录后可同步数据、查找设备与使用云服务') + '</small>' +
          '<span class="acct-state ' + (on ? 'on' : '') + '">' + (on ? '● 已登录本机账户' : '○ 未登录') + '</span>' +
        '</div>' +
        (on
          ? '<div class="set-row nav-row danger" data-a="acct-logout"><span class="row-main"><b>退出登录</b>' +
            '<small>本机数据会保留，云服务暂时停用</small></span>' + svg('chevron', 16) + '</div>'
          : '<button class="pill-btn primary" style="width:100%;padding:12px;margin-bottom:12px" data-a="set-jump" data-v="accountLogin">登录 MUSE 账户</button>') +
        '<div class="section-title">个人资料</div>' +
        '<div class="card"><div class="row-main"><b>昵称</b><small>显示在设置首页、联系人名片与锁屏机主信息</small></div>' +
          '<input data-f="acct-name" class="set-input" style="margin-top:10px" value="' + esc(st.accountName) + '"' + (on ? '' : ' disabled') + '>' +
          '<div class="set-row slim"><span>绑定手机</span><b>' + esc(st.accountPhone) + '</b></div>' +
          '<div class="set-row slim"><span>邮箱</span><b>' + esc(st.accountEmail) + '</b></div>' +
          '<div class="set-row slim"><span>账户等级</span><b>' + (on ? 'MUSE 会员 · Lv.4' : '—') + '</b></div>' +
        '</div>';
    },
    dndDetail: function (v) {
      return rowsHtml([
        H('勿扰例外'),
        T('允许重复来电', '同一号码 15 分钟内二次来电不静音', 'dndRepeat'),
        T('允许闹钟', '闹钟与计时器始终响铃', 'dndAlarm'),
        T('允许来电', '允许指定联系人的来电穿透', 'dndCalls'),
        T('允许信息', '允许指定联系人的信息穿透', 'dndMessages'),
        H('自动开启'),
        T('睡眠时段自动开启', '23:00 — 7:00', 'dndSchedule')
      ], v);
    },
    appNotif: function (v) {
      return '<div class="section-title">应用通知 · 关闭后该应用的通知不再进入通知中心</div>' +
        '<div class="card" style="padding:4px 14px">' + NM.APPS.filter(function (a) { return !a.sysOnly; }).map(function (a) {
          var on = S.settings.appNotif[a.id] !== false;
          return '<div class="set-row" style="border-bottom:1px solid var(--stroke)">' +
            NM.iconBox(a, 18) + '<span class="row-main"><b>' + esc(a.name) + '</b></span>' +
            '<span class="toggle ' + (on ? 'on' : '') + '" data-a="set-appnotif" data-v="' + a.id + '"></span></div>';
        }).join('') + '</div>' ;
    },
    hiddenApps: function (v) {
      var h = S.data.hidden || [];
      return '<div class="section-title">从桌面移除的应用</div>' +
        (h.length ? '<div class="card" style="padding:4px 14px">' + h.map(function (id) {
          var a = NM.appById(id); if (!a) return '';
          return '<div class="set-row" style="border-bottom:1px solid var(--stroke)">' + NM.iconBox(a, 18) +
            '<span class="row-main"><b>' + esc(a.name) + '</b><small>已安装 · 仅从桌面隐藏</small></span>' +
            '<button class="pill-btn" data-a="restore-app" data-v="' + id + '">恢复到桌面</button></div>';
        }).join('') + '</div>' : '<div class="empty" style="padding:28px">没有隐藏的应用<br>长按桌面 → 点图标左上角「−」即可移除</div>') ;
    },
    pinChange: function (v) {
      return rowsHtml([
        H('修改锁屏密码'),
        CUSTOM(function () { return pinField(v); }),
        T('锁屏密码', '上滑后需要输入 4 位数字', 'pinOn'),
        H('生物识别'),
        T('指纹解锁', '点亮屏幕后按指纹区域即可解锁', 'fingerprint'),
        T('面部识别', '点亮屏幕后看向屏幕即可解锁', 'face')
      ], v);
    },
    islandServices: function (v) {
      return '<div class="section-title">允许上岛的服务</div><div class="card" style="padding:4px 14px">' +
        [['music', '音乐播放'], ['recorder', '录音机'], ['clock', '计时器 / 秒表'], ['battery', '充电状态'],
         ['phone', '通话中'], ['assistant', '超级助手任务']].map(function (x) {
          var on = S.settings.islandServices[x[0]] !== false;
          return '<div class="set-row" style="border-bottom:1px solid var(--stroke)">' +
            '<span class="row-main"><b>' + x[1] + '</b></span>' +
            '<span class="toggle ' + (on ? 'on' : '') + '" data-a="set-island" data-v="' + x[0] + '"></span></div>';
        }).join('') + '</div>' ;
    },
    fingerprintDetail: function (v) { return biometricPage(v, '指纹'); },
    faceDetail: function (v) { return biometricPage(v, '面部识别'); },
    permissions: function (v) {
      return '<div class="section-title">权限管理器</div>' +
        [['camAccess', '相机', 'camera'], ['micAccess', '麦克风', 'recorder'], ['location', '位置', 'maps']].map(function (x) {
          return '<div class="set-row" style="border-radius:16px;margin-bottom:8px">' +
            NM.iconBox(NM.appById(x[2]), 18) + '<span class="row-main"><b>' + x[1] + '</b><small>' +
            (S.settings[x[0]] ? '已允许 · 所有应用' : '已拒绝 · 所有应用') + '</small></span>' +
            '<span class="toggle ' + (S.settings[x[0]] ? 'on' : '') + '" data-a="set-tg" data-v="' + x[0] + '"></span></div>';
        }).join('') ;
    },
    appTimers: function (v) {
      return '<div class="section-title">应用计时器 · 达到上限后打开应用会被拦截</div>' +
        '<div class="card" style="padding:4px 14px">' + NM.APPS.filter(function (a) { return !a.sysOnly; }).slice(0, 10).map(function (a) {
          var m = S.settings.appTimers[a.id] || 0;
          return '<div class="set-row" style="border-bottom:1px solid var(--stroke)">' + NM.iconBox(a, 18) +
            '<span class="row-main"><b>' + esc(a.name) + '</b><small>' + (m ? '每日上限 ' + m + ' 分钟' : '无限制') + '</small></span>' +
            '<button class="pill-btn" data-a="cycle-timer" data-v="' + a.id + '">' + (m || '不限') + '</button></div>';
        }).join('') + '</div>' ;
    },
    storage: function (v) {
      var used = JSON.stringify(S.data).length;
      return '<div class="card" style="text-align:center;padding:22px"><div style="font-size:38px;font-weight:200">' +
        (used / 1024).toFixed(1) + ' KB</div><div style="font-size:12px;color:var(--muted)">用户数据 / 128 GB 可用</div>' +
        '<div style="height:8px;border-radius:6px;background:var(--surface-2);margin-top:14px;overflow:hidden">' +
        '<i style="display:block;height:100%;width:6%;background:var(--accent)"></i></div></div>' +
        rowsHtml([
          H('分类占用'),
          INFO('笔记与文件', function () { return (S.data.notes || []).length + ' 条笔记 · ' + (S.data.files || []).length + ' 个文件'; }),
          INFO('照片与录音', function () { return (S.data.photos || []).length + ' 张照片 · ' + (S.data.recordings || []).length + ' 段录音'; }),
          INFO('后台任务', function () { return S.tasks.length + ' 个应用保活中'; }),
          ACT('清理缓存', '结束最久未用的后台任务', 'clean-cache', ''),
          ACT('清理全部用户数据', '删除笔记、照片与录音', 'clear-data', '', 'danger')
        ], v);
    },
    memory: function (v) {
      return '<div class="card" style="text-align:center;padding:22px"><div style="font-size:38px;font-weight:200">' +
        (1.2 + S.tasks.length * .18).toFixed(1) + ' GB</div><div style="font-size:12px;color:var(--muted)">已用内存 / 8 GB</div></div>' +
        '<div class="section-title">当前后台任务 ' + S.tasks.length + ' 个（不设上限）</div>' +
        (S.tasks.length ? S.tasks.map(function (id) {
          var a = NM.appById(id); if (!a) return '';
          return '<div class="set-row" style="border-radius:14px;margin-bottom:8px">' + NM.iconBox(a, 18) +
            '<span class="row-main"><b>' + esc(a.name) + '</b><small>约 ' + (140 + Math.round(Math.random() * 60)) + ' MB</small></span>' +
            '<button class="pill-btn" data-a="kill-one" data-v="' + id + '">结束</button></div>';
        }).join('') : '<div class="empty" style="padding:22px">当前没有后台任务</div>') +
        '<button class="bar-btn" style="width:100%;padding:12px" data-a="clean-cache">立即清理内存</button>' ;
    },
    bgRestrict: function (v) {
      return '<div class="section-title">不允许后台运行的应用</div><div class="card" style="padding:4px 14px">' +
        NM.APPS.filter(function (a) { return !a.sysOnly; }).slice(0, 12).map(function (a) {
          var on = (S.data.bgRestrict || []).indexOf(a.id) >= 0;
          return '<div class="set-row" style="border-bottom:1px solid var(--stroke)">' + NM.iconBox(a, 18) +
            '<span class="row-main"><b>' + esc(a.name) + '</b></span>' +
            '<span class="toggle ' + (on ? 'on' : '') + '" data-a="set-bgrestrict" data-v="' + a.id + '"></span></div>';
        }).join('') + '</div>' ;
    },
    appList: function (v) {
      var q = (v.state.appQ || '').toLowerCase();
      return '<input data-f="set-appq" placeholder="搜索应用" value="' + esc(v.state.appQ || '') + '" class="set-search-input">' +
        '<div class="card" style="padding:4px 14px">' + NM.APPS.filter(function (a) {
          return !a.sysOnly && (!q || a.name.toLowerCase().indexOf(q) >= 0 || a.id.indexOf(q) >= 0);
        }).map(function (a) {
          var running = S.tasks.indexOf(a.id) >= 0;
          return '<div class="set-row" style="border-bottom:1px solid var(--stroke)">' + NM.iconBox(a, 18) +
            '<span class="row-main"><b>' + esc(a.name) + '</b><small>' + (running ? '运行中' : '未运行') + '</small></span>' +
            '<button class="pill-btn" data-a="app-open" data-v="' + a.id + '">打开</button>' +
            (running ? '<button class="pill-btn danger" data-a="kill-one" data-v="' + a.id + '">停止</button>' : '') + '</div>';
        }).join('') + '</div>' ;
    },
    defaultApps: function (v) {
      return rowsHtml([
        H('默认应用'),
        SEL('浏览器', '点击网页链接时使用', 'defBrowser', [O('browser', 'MUOS 浏览器'), O('none', '每次询问')]),
        SEL('电话', '拨号时使用', 'defPhone', [O('phone', '电话'), O('none', '每次询问')]),
        SEL('信息', '发送短信时使用', 'defSms', [O('messages', '信息'), O('none', '每次询问')]),
        SEL('相册', '查看图片时使用', 'defGallery', [O('photos', '相册'), O('none', '每次询问')])
      ], v);
    },
    specialAccess: function (v) {
      return rowsHtml([
        H('特殊访问权限'),
        T('允许安装未知来源应用', '应用商店之外的安装', 'unknownSources'),
        T('悬浮窗', '允许应用显示在其他应用上方', 'overlayPerm'),
        T('忽略电池优化', '允许应用长期保活', 'ignoreBatteryOpt'),
        T('修改系统设置', '允许应用更改系统配置', 'writeSettings')
      ], v);
    },
    appTimersInfo: function (v) { return rowsHtml([], v); }
  };

  /* ---------- 各种自定义卡片 ---------- */
  /* 设备参数由外层「设备控制台」设定，系统内只做只读展示 */
  function deviceInfoCard() {
    var i = NM.deviceInfo ? NM.deviceInfo() : null;
    if (!i) return '<div class="card set-note">设备参数未就绪</div>';
    var rows = [
      ['设备形态', i.formLabel + ' · ' + i.brand],
      ['使用屏幕', i.screenLabel],
      ['显示方向', i.orientLabel],
      ['屏幕分辨率', i.resW + ' × ' + i.resH + '（' + i.resLabel + '）'],
      ['像素密度', i.ppi + ' ppi · ' + i.dpr + 'x'],
      ['刷新率', i.hz + ' Hz'],
      ['逻辑视口', i.cssW + ' × ' + i.cssH + ' dp · ' + i.cols + ' 列栅格']
    ];
    return '<div class="card device-card"><div class="row-main"><b>屏幕与设备（只读）</b>' +
      '<small>以下参数由外层的「设备控制台」设定，系统内不提供修改入口</small></div>' +
      rows.map(function (r) {
        return '<div class="set-row slim"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
      }).join('') + '</div>';
  }
  function wallPicker() {
    var names = { hyper: '柔光', nebula: '星云', aurora: '极光', sunset: '日落', mono: '石墨' };
    return '<div class="wall-picks">' + Object.keys(names).map(function (w) {
      return '<button class="wall-pick ' + w + ' ' + (S.settings.wall === w ? 'on' : '') +
        '" data-a="set-wall" data-v="' + w + '"><i></i><span class="wall-label">' + names[w] + '</span></button>';
    }).join('') + '</div>';
  }
  function pinField(v) {
    return '<div class="card"><input data-f="set-pin" type="tel" maxlength="4" placeholder="输入 4 位新密码" ' +
      'value="' + esc(v.state.pinNew || '') + '" class="set-input">' +
      '<div style="font-size:11px;color:var(--muted);margin-top:10px">当前密码：' + esc(S.settings.pin) + '</div>' +
      '<button class="pill-btn" style="margin-top:12px" data-a="set-pin-save">保存密码</button></div>';
  }
  function ownerField() {
    return '<div class="card"><div class="row-main"><b>锁屏机主信息</b><small>显示在锁屏底部</small></div>' +
      '<input data-f="set-owner" class="set-input" style="margin-top:10px" placeholder="例如：紧急时请联系 138…" value="' +
      esc(S.settings.lockOwner) + '"></div>';
  }
  function medicalField() {
    return '<div class="card"><div class="row-main"><b>医疗信息</b><small>锁屏紧急呼叫界面可见</small></div>' +
      '<input data-f="set-medical" class="set-input" style="margin-top:10px" placeholder="血型、过敏史等" value="' +
      esc(S.settings.medicalInfo) + '"></div>';
  }
  function accountField() {
    return '<div class="card"><div class="row-main"><b>' + esc(S.settings.accountName) + '</b><small>MUOS 本机账户 · 数据仅保存在此浏览器</small></div>' +
      '<input data-f="set-account" class="set-input" style="margin-top:10px" value="' + esc(S.settings.accountName) + '"></div>';
  }

  /* ---------- MUSE 账户中心（HyperOS「我的账号」结构） ---------- */
  var SYNC_NAMES = { contacts: '联系人', notes: '备忘录', photos: '相册', settings: '系统设置' };
  var AVATARS = ['blue', 'violet', 'green', 'orange', 'mono'];
  function accountPage(v) {
    var st = S.settings, on = !!st.accountLoggedIn, sync = st.syncItems || {};
    var info = NM.deviceInfo ? NM.deviceInfo() : { brand: 'MUSE', name: 'APEX 15 Pro', defName: 'APEX 15 Pro', model: 'MU-AP15P', formLabel: '手机' };
    var used = 2.4, total = 5;
    var lastSync = st.lastSync ? new Date(st.lastSync).toLocaleString('zh-CN') : '尚未同步';
    return '<div class="acct-profile glass nav-row" data-a="set-jump" data-v="accountProfile">' +
        '<span class="acct-avatar ' + esc(st.accountAvatar || 'blue') + '" data-a="acct-avatar">' + svg('person', 34) + '</span>' +
        '<b>' + (on ? esc(st.accountName) : '未登录') + '</b>' +
        '<small>' + (on ? 'MUSE ID · ' + esc(st.muosId) : '登录后可同步数据、查找设备与使用云服务') + '</small>' +
        '<span class="acct-state ' + (on ? 'on' : '') + '">' + (on ? '● 已登录本机账户' : '○ 未登录') + '</span>' +
      '</div>' +
      '<div class="section-title">云服务 · 数据同步</div>' +
      '<div class="card"><div class="row-main"><b>MUOS 云空间</b><small>已用 ' + used + ' GB / ' + total + ' GB · 纯前端模拟</small></div>' +
        '<div class="acct-bar"><i style="width:' + Math.round(used / total * 100) + '%"></i></div>' +
        '<div class="set-row slim"><span>自动同步</span><span class="toggle ' + (st.autoSync && on ? 'on' : '') +
          '" data-a="set-tg" data-v="autoSync"></span></div>' +
        Object.keys(SYNC_NAMES).map(function (k) {
          return '<div class="set-row slim"><span>' + SYNC_NAMES[k] + '</span><span class="toggle ' +
            (sync[k] && on ? 'on' : '') + '" data-a="acct-sync" data-v="' + k + '"></span></div>';
        }).join('') +
        '<div class="set-row slim"><span>上次同步</span><b>' + esc(lastSync) + '</b></div>' +
        '<button class="pill-btn primary" style="width:100%;margin-top:10px" data-a="acct-sync-now">立即同步</button>' +
      '</div>' +
      '<div class="section-title">查找设备与账户安全</div>' +
      '<div class="card">' +
        '<div class="set-row slim"><span>查找我的设备</span><span class="toggle ' + (st.findDevice && on ? 'on' : '') +
          '" data-a="set-tg" data-v="findDevice"></span></div>' +
        '<div class="set-row slim"><span>两步验证</span><b>' + (on ? '已开启' : '未开启') + '</b></div>' +
        '<div class="set-row slim"><span>登录设备</span><b>1 台 · 本机</b></div>' +
      '</div>' +
      '<div class="set-row nav-row" data-a="acct-find"><span class="row-main"><b>查看本机位置</b>' +
        '<small>模拟定位，不会读取真实位置</small></span>' + svg('chevron', 16) + '</div>' +
      '<div class="section-title">我的设备 · 本机信息</div>' +
      '<div class="card acct-device-head"><span class="acct-device-ic">' + svg('cube', 26) + '</span>' +
        '<span class="row-main"><b>' + esc(info.name) + '</b>' +
        '<small>MUSE · 认证型号 ' + esc(info.model) + ' · MUOS 4.0.1 · ' + esc(info.formLabel) + '</small></span>' +
        '<span class="acct-device-tag">本机</span></div>' +
      '<div class="card"><div class="row-main"><b>设备名称</b><small>可自定义，认证型号不可更改</small></div>' +
        '<input data-f="dev-name" class="set-input" style="margin-top:10px" placeholder="' + esc(info.defName) + '" value="' + esc(S.settings.deviceName || '') + '">' +
      '</div>' +
      deviceInfoCard() +
      '<div class="set-row nav-row" data-a="set-jump" data-v="update"><span class="row-main"><b>检查更新</b>' +
        '<small>软件更新 · 自动下载 · 模拟 OTA 升级</small></span>' + svg('chevron', 16) + '</div>' +
      '<div class="set-row nav-row" data-a="set-jump" data-v="about"><span class="row-main"><b>关于本机</b>' +
        '<small>完整参数、运行状态与开发者选项</small></span>' + svg('chevron', 16) + '</div>' +
      '<div class="set-note">设备形态、方向、分辨率与刷新率由外层「设备控制台」设定，模拟系统内只做只读展示。账户与云服务均为前端模拟，不会向任何服务器发送数据。</div>';
  }
  function accountLoginPage(v) {
    var st = S.settings;
    return '<div class="acct-login-logo glass"><span>' + svg('cube', 40) + '</span><b>MUSE 账户</b>' +
        '<small>登录后同步设置、备忘录与设备信息</small></div>' +
      '<div class="card"><div class="row-main"><b>账号</b><small>手机号 / 邮箱 / MUSE ID</small></div>' +
        '<input data-f="acct-user" class="set-input" style="margin-top:10px" autocomplete="off" placeholder="例如 ' +
        esc(st.muosId) + '" value="' + esc(v.state.acctUser || '') + '">' +
        '<div class="row-main"><b>密码</b><small>任意 4 位以上字符即可，纯前端模拟</small></div>' +
        '<input data-f="acct-pass" class="set-input" style="margin-top:10px" type="password" autocomplete="off" placeholder="输入密码" value="' +
        esc(v.state.acctPass || '') + '">' +
        '<button class="pill-btn primary" style="width:100%;padding:12px;margin-top:6px" data-a="acct-login-submit">登录</button>' +
        '<div class="acct-login-links"><button data-a="acct-signup">创建账户</button><button data-a="acct-forgot">忘记密码</button></div>' +
      '</div>' +
      '<div class="set-note">这是离线模拟登录：不会联网、不会保存真实手机号或密码，登录状态只写入当前浏览器的本地存储。退出登录后仍可随时重新登录。</div>';
  }
  function biometricPage(v, type) {
    var key = type === '指纹' ? 'fingerprint' : 'face';
    var n = (S.data.biometrics || []).filter(function (b) { return b.type === key; }).length;
    return '<div class="card" style="text-align:center;padding:24px">' + svg(key === '指纹' ? 'shield' : 'eye', 46) +
      '<div style="margin-top:12px;font-size:15px">' + type + '</div><div style="font-size:11px;color:var(--muted);margin-top:6px">已登记 ' + n + ' 组</div></div>' +
      '<button class="bar-btn" style="width:100%;padding:12px;margin:12px 0" data-a="bio-add" data-v="' + key + '">添加' + type + '</button>' +
      (n ? '<button class="bar-btn" style="width:100%;padding:12px" data-a="bio-clear" data-v="' + key + '">清除全部</button>' : '') +
      '<div class="card" style="font-size:11px;line-height:1.8;color:var(--muted);margin-top:14px">这是纯前端模拟，不会调用设备摄像头或指纹传感器。登记后点亮屏幕，点按提示即可直接解锁。</div>' ;
  }
  function routineList() {
    var r = S.data.routines || [];
    return '<div class="section-title">我的日常程序</div>' +
      (r.length ? r.map(function (x) {
        return '<div class="set-row" style="border-radius:14px;margin-bottom:8px">' +
          '<span class="row-main"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></span>' +
          '<button class="pill-btn danger" data-a="routine-del" data-v="' + x.id + '">删除</button></div>';
      }).join('') : '<div class="empty" style="padding:22px">还没有日常程序</div>') ;
  }
  function usageChart() {
    var u = S.data.usage || {}, keys = Object.keys(u).sort(function (a, b) { return u[b] - u[a]; }).slice(0, 6);
    var total = Object.keys(u).reduce(function (a, k) { return a + u[k]; }, 0);
    var mins = Math.floor(total / 60);
    return '<div class="card" style="text-align:center;padding:20px"><div style="font-size:38px;font-weight:200">' +
      mins + ' 分</div><div style="font-size:11px;color:var(--muted)">本次开机以来屏幕使用时间 · 目标 ' +
      S.settings.wellbeingGoal + ' 分钟</div>' +
      '<div style="height:8px;border-radius:6px;background:var(--surface-2);margin-top:14px;overflow:hidden">' +
      '<i style="display:block;height:100%;width:' + clamp(mins / S.settings.wellbeingGoal * 100, 0, 100) + '%;background:var(--accent)"></i></div></div>' +
      '<div class="section-title">各应用使用时长</div>' +
      (keys.length ? keys.map(function (id) {
        var a = NM.appById(id) || { name: id, c1: '#888', c2: '#555', icon: 'info' };
        var pct = clamp(u[id] / Math.max(total, 1) * 100, 0, 100);
        return '<div class="set-row" style="border-radius:14px;margin-bottom:8px">' + NM.iconBox(a, 18) +
          '<span class="row-main"><b>' + esc(a.name) + '</b><small>' + Math.floor(u[id] / 60) + ' 分 ' + (u[id] % 60) + ' 秒</small></span>' +
          '<span style="width:70px;height:6px;border-radius:4px;background:var(--surface-2);overflow:hidden">' +
          '<i style="display:block;height:100%;width:' + pct + '%;background:var(--accent)"></i></span></div>';
      }).join('') : '<div class="empty" style="padding:22px">打开几个应用后这里会出现统计</div>');
  }
  function batteryCard() {
    return '<div class="card" style="text-align:center;padding:22px"><div style="font-size:46px;font-weight:200">' +
      Math.round(S.battery) + '%</div><div style="font-size:12px;color:var(--muted);margin-top:6px">' +
      (S.charging ? '正在充电' + (S.settings.batteryProtect ? ' · 上限 80%' : '') : '未连接充电器') + '</div>' +
      '<div style="height:8px;border-radius:6px;background:var(--surface-2);margin-top:14px;overflow:hidden">' +
      '<i style="display:block;height:100%;width:' + clamp(S.battery, 0, 100) + '%;background:' +
      (S.settings.lowpower ? 'var(--warn)' : 'var(--ok)') + '"></i></div></div>' +
      '<div class="card" style="font-size:11px;line-height:1.8;color:var(--muted);margin-top:10px">电池健康度 98% · 循环计数 42 次。这是模拟数据，电量每 12 秒变化 1%。</div>';
  }
  function updateCard() {
    return '<div class="card" style="text-align:center;padding:22px">' + svg('download', 44) +
      '<div style="margin-top:10px;font-size:15px">MUOS 4.0.1</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:6px">安全补丁 2026-11-01</div>' +
      '<div id="update-status" style="font-size:12px;color:var(--accent);margin-top:12px">' +
      (v_updateMsg || '系统已是最新版本') + '</div></div>';
  }
  var v_updateMsg = '';

  /* ============================================================
     行渲染器
     ============================================================ */
  function rowsHtml(rows, v) {
    return rows.map(function (r) {
      if (Array.isArray(r)) return rowsHtml(r, v);   /* 形态相关的行以子数组插入，递归展平 */
      if (r.cond && !r.cond()) return '';   /* 形态相关的行：条件不满足直接不渲染 */
      switch (r.t) {
        case 'h': return '<div class="section-title">' + esc(r.label) + '</div>';
        case 'txt': return '<div class="card set-note">' + esc(r.label) + '</div>';
        case 'tg': {
          var on = !!S.settings[r.key];
          return '<div class="set-row"><span class="row-main"><b>' + esc(r.label) + '</b>' +
            (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span>' +
            '<span class="toggle ' + (on ? 'on' : '') + '" data-a="set-tg" data-v="' + r.key + '"></span></div>';
        }
        case 'seg':
          return '<div class="set-block"><div class="row-main"><b>' + esc(r.label) + '</b>' +
            (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div><div class="segmented" style="margin-top:10px;flex-wrap:wrap">' +
            r.opts.map(function (o) {
              var val = o[0], on = String(S.settings[r.key]) === String(val);
              return '<button class="' + (on ? 'on' : '') + '" style="flex:1;min-width:64px" data-a="set-val" data-v="' +
                r.key + '|' + val + '">' + esc(o[1]) + '</button>';
            }).join('') + '</div></div>';
        case 'sel':
          return '<div class="set-block"><div class="row-main"><b>' + esc(r.label) + '</b>' +
            (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div><div class="chip-row">' +
            r.opts.map(function (o) {
              var on = String(S.settings[r.key]) === String(o[0]);
              return '<button class="chip ' + (on ? 'on' : '') + '" data-a="set-val" data-v="' +
                r.key + '|' + o[0] + '">' + esc(o[1]) + '</button>';
            }).join('') + '</div></div>';
        case 'sl': {
          var val = S.settings[r.key];
          return '<div class="set-block"><div class="row-main"><b>' + esc(r.label) + '</b>' +
            (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>' +
            '<div class="slider-row" style="margin-top:8px">' +
            '<input type="range" min="' + r.min + '" max="' + r.max + '" value="' + val + '" data-f="set:' + r.key + '">' +
            '<b>' + val + r.unit + '</b></div></div>';
        }
        case 'nav':
          return '<div class="set-row nav-row" data-a="set-nav" data-v="' + r.page + '">' +
            '<span class="row-main"><b>' + esc(r.label) + '</b>' +
            (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span>' + svg('chevron', 16) + '</div>';
        case 'act':
          return '<div class="set-row nav-row ' + (r.tone === 'danger' ? 'danger' : '') + '" data-a="set-act" data-v="' +
            r.act + '|' + (r.val || '') + '"><span class="row-main"><b>' + esc(r.label) + '</b>' +
            (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span>' + svg('chevron', 16) + '</div>';
        case 'info':
          return '<div class="set-row"><span class="row-main"><b>' + esc(r.label) + '</b></span>' +
            '<span style="font-size:12px;color:var(--muted)">' + esc(r.fn()) + '</span></div>';
        case 'custom': return r.fn(v);
      }
      return '';
    }).join('');
  }

  /* ---------- 设置项搜索：跨所有分类检索并直达 ---------- */
  function searchSettings(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return null;
    var hits = [];
    GROUPS.forEach(function (g) {
      if (g.t.toLowerCase().indexOf(q) >= 0 || g.s.toLowerCase().indexOf(q) >= 0) {
        hits.push({ group: g, label: g.t + '（整个分类）', sub: g.s, row: null });
      }
      g.rows.forEach(function (r) {
        if (!r.label) return;
        if ((r.label + ' ' + (r.sub || '')).toLowerCase().indexOf(q) >= 0) {
          hits.push({ group: g, label: r.label, sub: r.sub || '', row: r });
        }
      });
    });
    Object.keys(SUBPAGES).forEach(function (k) { });
    return hits.slice(0, 24);
  }

  /* ============================================================
     设置应用：覆盖 30-more-apps.js 里的旧版 7 分组设置
     ============================================================ */
  var pages = {};
  var pageTitles = { main: '设置', about: '关于本机' };

  pages.main = function (v) {
    var q = v.state.q || '';
    var groups = GROUPS.filter(function (g) {
      /* 「软件更新」与「关于本机」已移到账户中心的设备信息区，不再占用设置首页 */
      if (g.k === 'update' || g.k === 'about') return false;
      return !g.hidden || S.settings.devOn;
    });
    return NM.appBar(v, '设置') +
      '<div class="set-search"><span>' + svg('search', 17) + '</span>' +
      '<input data-f="set-q" type="text" placeholder="搜索设置，例如「深色」「下滑」「电池」" value="' + esc(q) + '" autocomplete="off">' +
      (q ? '<button data-a="set-clearq">' + svg('close', 15) + '</button>' : '') + '</div>' +
      '<div id="set-results" style="display:' + (q ? 'block' : 'none') + '">' + searchHtml(q) + '</div>' +
      '<div id="set-groups" style="display:' + (q ? 'none' : 'block') + '">' +
      '<div class="settings-hero glass nav-row" data-a="set-jump" data-v="account"><span class="avatar">' + svg('cube', 26) + '</span>' +
      '<div><b>' + esc(S.settings.accountName) + ' 的设备</b><small>' + esc(NM.deviceInfo().brand) +
      ' · MUOS 4.0 · HyperOS 风格 · ' + (S.settings.accountLoggedIn ? '已登录本机账户' : '未登录账户') + '</small></div>' +
      svg('chevron', 16) + '</div>' +
      taskSectionHtml() +
      '<div class="section-title">全部设置 · ' + groups.length + ' 项</div>' +
      groups.map(function (g) {
        return '<div class="set-row nav-row" data-a="set-jump" data-v="' + g.k + '">' +
          '<span class="set-ic">' + svg(g.i, 18) + '</span>' +
          '<span class="row-main"><b>' + esc(g.t) + '</b><small>' + esc(g.s) + '</small></span>' +
          svg('chevron', 16) + '</div>';
      }).join('') +
      '<div class="set-note" style="margin-top:16px">所有设置都会立即生效并保存在本机浏览器。纯前端模拟，不访问任何真实硬件或数据。</div>' +
      '</div>' + NM.endBar();
  };

  GROUPS.forEach(function (g) {
    if (g.k === 'about') return;
    pageTitles[g.k] = g.t;
    pages[g.k] = function (v) {
      return NM.appBar(v, g.t) + rowsHtml(g.rows, v) +
        '<div class="set-note" style="margin-top:18px">「' + esc(g.t) + '」中的每一项都会立即写入系统状态并影响对应行为。</div>' + NM.endBar();
    };
  });
  Object.keys(SUBPAGES).forEach(function (k) {
    pageTitles[k] = k;
    pages[k] = function (v) {
      return NM.appBar(v, subTitle(k)) + SUBPAGES[k](v) + NM.endBar();
    };
  });
  pages.about = function (v) { return NM.aboutHTML(v); };

  var SUB_TITLES = {
    navDetail: '系统导航方式', taskShortcuts: '自定义快捷任务',
    account: 'MUSE 账户', accountLogin: '登录 MUSE 账户', accountProfile: '个人资料',
    dndDetail: '勿扰例外与安排', appNotif: '应用通知', hiddenApps: '隐藏的应用',
    pinChange: '更改密码', islandServices: '上岛服务', fingerprintDetail: '指纹',
    faceDetail: '面部识别', permissions: '权限管理器', appTimers: '应用计时器',
    storage: '存储', memory: '内存', bgRestrict: '后台使用限制',
    appList: '应用列表', defaultApps: '默认应用', specialAccess: '特殊访问权限',
    appTimersInfo: '应用计时器'
  };
  function subTitle(k) { return SUB_TITLES[k] || '设置'; }

  function searchHtml(q) {
    var hits = searchSettings(q);
    if (!hits) return '';
    if (!hits.length) return '<div class="empty" style="padding:30px">没有找到「' + esc(q) + '」<br>试试「亮度」「密码」「小组件」「飞行」</div>';
    return '<div class="section-title">搜索结果 · ' + hits.length + ' 项</div>' +
      hits.map(function (h) {
        return '<div class="set-row nav-row" data-a="set-jump" data-v="' + h.group.k + '">' +
          '<span class="set-ic">' + svg(h.group.i, 17) + '</span>' +
          '<span class="row-main"><b>' + esc(h.label) + '</b><small>' + esc(h.group.t) +
          (h.sub ? ' · ' + esc(h.sub) : '') + '</small></span>' + svg('chevron', 16) + '</div>';
      }).join('');
  }

  /* ---------- 统一写入：每个控件都走这里 ---------- */
  function changed(v, msg) {
    NM.applySettings(); NM.save(); NM.emit('settings');
    NM.renderAllDynamic();
    if (v) NM.renderView(v);
    if (msg) NM.island(msg, 1500);
  }
  NM.renderAllDynamic = function () {
    /* 轻量刷新所有依赖设置的系统层，不重建应用 DOM */
    NM.renderStatusBarIcons(); NM.renderControlShade(); NM.renderLockNotifs();
    NM.updateBadges(); NM.renderNotifShade(); NM.tickClock();
    if (NM.renderPages) NM.renderPages();
    if (NM.renderWidget) NM.renderWidget();
    if (NM.renderDock) NM.renderDock();
    if (NM.renderEdge) NM.renderEdge();
    if (NM.renderAod) NM.renderAod();
  };

  NM.setVal = function (key, raw, v) {
    var cur = D[key], val = raw;
    if (typeof cur === 'number') val = +raw;
    else if (typeof cur === 'boolean') val = (raw === 'true' || raw === true);
    S.settings[key] = val;
    /* 联动项 */
    if (key === 'volume' || key === 'ringVol' || key === 'notifVol' || key === 'sysVol') {
      /* 媒体音量与控制中心滑块共用同一字段 */
    }
    if (key === 'themePack') applyThemePack(val);
    if (key === 'autolock') S.settings.autolock = val;
    if (key === 'bgLimit') trimTasks();
    changed(v, '');
  };
  NM.setToggle = function (key, v) {
    var st = S.settings;
    if (key === 'chargingMirror') { S.charging = !S.charging; NM.applySettings(); NM.save(); NM.renderView(v); NM.island(S.charging ? '已连接充电器' : '已断开充电器', 1400); return; }
    if (key === 'airplane') return NM.toggleTile('airplane'), NM.renderView(v);
    if (key === 'lowpower') return NM.toggleTile('lowpower'), NM.renderView(v);
    if (key === 'theme' && false) { /* 保留占位，主题用 segmented */ }
    st[key] = !st[key];
    if (key === 'dnd' || key === 'focusMode' || key === 'bedtimeMode') NM.island(st[key] ? '已开启：通知将静默' : '已关闭', 1500);
    if (key === 'privacyDisplay') NM.island(st[key] ? '隐私显示已开启' : '隐私显示已关闭', 1500);
    if (key === 'aod') NM.island(st[key] ? '息屏显示已开启' : '息屏显示已关闭', 1500);
    if (key === 'foldMode') NM.island(st[key] ? '已展开为内屏' : '已折叠为外屏', 1500);
    if (key === 'terminalEnabled' && NM.renderDrawer) NM.renderDrawer();
    if (key === 'darkSchedule' && st.darkSchedule) applyScheduledDark();
    if (key === 'reduceAnim') st.animations = !st.reduceAnim;
    changed(v, '');
  };
  /* ---------- 自定义壁纸：导入 + 拖动/缩放裁切适配屏幕 ---------- */
  function wallImportCard() {
    var has = !!S.data.customWall;
    return '<div class="card"><div class="row-main"><b>自定义壁纸</b>' +
        '<small>导入图片后拖动与缩放，自动裁切适配屏幕比例</small></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<button class="bar-btn" style="flex:1;padding:11px" data-a="wall-import-open">' + (has ? '更换图片' : '导入图片') + '</button>' +
      (has ? '<button class="bar-btn" style="flex:1;padding:11px" data-a="wall-import-clear">移除</button>' : '') +
      '</div>' +
      (has
        ? '<div style="margin-top:10px;height:110px;border-radius:14px;background-size:cover;background-position:center;background-image:url(\'' + S.data.customWall + '\')"></div>' +
          '<div class="set-row slim" style="margin-top:8px"><span>使用这张自定义壁纸</span>' +
          '<span class="toggle ' + (S.settings.wall === 'custom' ? 'on' : '') + '" data-a="wall-use-custom"></span></div>'
        : '') +
      '</div>';
  }
  function clampCrop() {
    var c = S._wc; if (!c) return;
    var stage = document.querySelector('#wall-crop .wc-stage'), img = document.getElementById('wc-img');
    if (!stage || !img || !img.naturalWidth) return;
    var sw = stage.clientWidth || 300, sh = stage.clientHeight || 500;
    c.x = clamp(c.x, Math.min(0, (sw - img.offsetWidth) / 2), Math.max(0, (sw - img.offsetWidth) / 2));
    c.y = clamp(c.y, Math.min(0, (sh - img.offsetHeight) / 2), Math.max(0, (sh - img.offsetHeight) / 2));
    img.style.transform = 'translate(calc(-50% + ' + Math.round(c.x) + 'px), calc(-50% + ' + Math.round(c.y) + 'px))';
  }
  function layoutCrop() {
    var c = S._wc; if (!c) return;
    var stage = document.querySelector('#wall-crop .wc-stage'), img = document.getElementById('wc-img');
    if (!stage || !img || !img.naturalWidth) return;
    var sw = stage.clientWidth || 300, sh = stage.clientHeight || 500;
    var base = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
    img.style.width = Math.round(img.naturalWidth * base * c.zoom) + 'px';
    clampCrop();
  }
  function closeWallCrop() {
    var el = document.getElementById('wall-crop');
    if (el) el.classList.remove('on');
    S._wc = null;
  }
  function finishWallCrop() {
    var c = S._wc, img = document.getElementById('wc-img'), stage = document.querySelector('#wall-crop .wc-stage');
    if (!c || !img || !img.naturalWidth) { closeWallCrop(); return; }
    var sw = stage.clientWidth || 300, sh = stage.clientHeight || 500;
    var outW = Math.min(1440, Math.round(sw * 2)), k = outW / sw, outH = Math.round(sh * k);
    var base = Math.max(sw / img.naturalWidth, sh / img.naturalHeight) * c.zoom;
    try {
      var canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, outW, outH);
      ctx.translate(outW / 2 + c.x * k, outH / 2 + c.y * k);
      ctx.drawImage(img, -img.naturalWidth * base / 2, -img.naturalHeight * base / 2,
        img.naturalWidth * base, img.naturalHeight * base);
      S.data.customWall = canvas.toDataURL('image/jpeg', .85);
      S.settings.wall = 'custom';
      NM.applySettings(); NM.save();
      NM.island('自定义壁纸已应用', 1500);
      if (S.fg === 'settings') NM.renderView(S.views.settings);
    } catch (err) { NM.island('壁纸导出失败，请换一张较小的图片', 2000); }
    closeWallCrop();
  }
  NM.openWallCrop = function (src) {
    var el = document.getElementById('wall-crop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wall-crop'; el.className = 'layer';
      el.innerHTML =
        '<div class="wc-head"><b>裁切壁纸</b><small>拖动调整位置 · 滑块缩放 · 完成后自动适配屏幕</small></div>' +
        '<div class="wc-stage"><img id="wc-img" alt="" draggable="false"></div>' +
        '<input class="wc-zoom" type="range" min="60" max="300" value="100" data-f="wc-zoom">' +
        '<div class="wc-bar"><button data-a="wc-cancel">取消</button>' +
        '<button class="primary" data-a="wc-done">完成并应用</button></div>';
      document.getElementById('display').appendChild(el);
      var stage = el.querySelector('.wc-stage'), px = 0, py = 0;
      stage.addEventListener('pointerdown', function (e) {
        if (!S._wc) return;
        px = e.clientX; py = e.clientY;
        if (stage.setPointerCapture) try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      });
      stage.addEventListener('pointermove', function (e) {
        if (!S._wc || !px || !e.buttons) return;
        var s = NM.stageScale ? NM.stageScale() : 1;
        S._wc.x += (e.clientX - px) / s; S._wc.y += (e.clientY - py) / s;
        px = e.clientX; py = e.clientY;
        clampCrop();
      });
      stage.addEventListener('pointerup', function () { px = 0; });
      stage.addEventListener('pointercancel', function () { px = 0; });
      el.querySelector('img').addEventListener('load', layoutCrop);
    }
    S._wc = { src: src, x: 0, y: 0, zoom: 1 };
    el.querySelector('img').src = src;
    el.classList.add('on');
    setTimeout(layoutCrop, 60);
  };
  NM.wallZoom = function (z) { if (S._wc) { S._wc.zoom = clamp(z, .6, 3); layoutCrop(); } };

  function applyThemePack(pack) {
    var st = S.settings;
    if (pack === 'hyperos') {
      st.softGlass = true; st.tapGlow = true; st.dragGlow = true;
      st.superIsland = true; st.iconShape = 'squircle'; st.wall = 'hyper';
    } else if (pack === 'oneui') {
      st.softGlass = false; st.tapGlow = false; st.dragGlow = false;
      st.iconShape = 'round'; st.wall = 'aurora';
    } else {
      st.softGlass = false; st.tapGlow = false; st.dragGlow = false;
      st.iconShape = 'square'; st.wall = 'mono';
    }
    /* 图标风格为「跟随系统风格」时，切主题要立刻重绘状态栏图标 */
    if (NM.renderStatusBarIcons) NM.renderStatusBarIcons();
  }
  function trimTasks() {
    /* 后台任务不设上限：仅当用户显式设置了较小上限时才回收 */
    if (!S.settings.bgLimit || S.settings.bgLimit >= 999) return;
    while (S.tasks.length > S.settings.bgLimit) {
      var victim = S.tasks.pop();
      if (victim !== S.fg) NM.killApp(victim, true); else S.tasks.unshift(victim);
    }
  }
  function applyScheduledDark() {
    if (!S.settings.darkSchedule) return;
    var h = new Date().getHours();
    S.settings.theme = (h >= 18 || h < 7) ? 'dark' : 'light';
  }

  /* ---------- 动作表 ---------- */
  var ACTS = {
    'test-beep': function (v) { NM.beep(); NM.island('测试音已播放', 1200); },
    'wall-import-open': function () {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () { NM.openWallCrop(String(fr.result)); };
        fr.readAsDataURL(f);
      });
      inp.click();
    },
    'wall-import-clear': function (v) {
      S.data.customWall = '';
      if (S.settings.wall === 'custom') S.settings.wall = 'hyper';
      NM.applySettings(); NM.save();
      changed(v, '已移除自定义壁纸');
    },
    'wall-use-custom': function (v) {
      if (!S.data.customWall) { NM.island('请先导入壁纸图片', 1500); return; }
      S.settings.wall = S.settings.wall === 'custom' ? 'hyper' : 'custom';
      NM.applySettings(); NM.save();
      changed(v, S.settings.wall === 'custom' ? '已使用自定义壁纸' : '已恢复预设壁纸');
    },
    'wc-cancel': function () { closeWallCrop(); },
    'wc-done': function () { finishWallCrop(); },
    'test-notif': function (v) { NM.notify('messages', '这是一条测试通知', '横幅、锁屏与通知中心都会出现；勿扰开启时只静默入库。'); NM.island('已发送测试通知', 1400); },
    'clear-notifs': function (v) { S.notifications = []; NM.renderNotifShade(); NM.renderLockNotifs(); NM.updateBadges(); NM.island('通知已清空', 1200); },
    'wifi-scan': function (v) { NM.island(S.settings.wifi ? '已连接 MUOS-5G · 信号满格' : 'Wi-Fi 已关闭，无法扫描', 1800); },
    'bt-list': function (v) { NM.dialog('已配对设备', S.settings.bluetooth ? 'MUOS Buds 4 Pro · 已连接（模拟设备）' : '蓝牙已关闭，请先打开蓝牙。', [{ t: '好', a: 'close-dialog', primary: true }]); },
    'preview-privacy': function (v) { S.settings.privacyDisplay = true; changed(v, '隐私显示已开启 · 从侧面观察屏幕'); },
    'reset-style': function (v) {
      applyThemePack('hyperos'); S.settings.themePack = 'hyperos';
      S.settings.palette = 'blue'; S.settings.fontScale = 1; S.settings.screenZoom = 1;
      changed(v, '已恢复默认外观');
    },
    'theme-pick': function (v, val) {
      /* 柔光＝浅色 + 生命感美学材质；曜石＝深色高对比；晨曦＝暖色浅色 */
      var map = {
        default: { wall: 'hyper', palette: 'blue', theme: 'light', pack: 'hyperos' },
        obsidian: { wall: 'mono', palette: 'mono', theme: 'dark', pack: 'classic' },
        dawn: { wall: 'sunset', palette: 'orange', theme: 'light', pack: 'oneui' }
      };
      var m = map[val] || map.default;
      applyThemePack(m.pack);
      S.settings.themePack = m.pack;
      S.settings.wall = m.wall; S.settings.palette = m.palette; S.settings.theme = m.theme;
      changed(v, '主题已切换 · ' + (val === 'obsidian' ? '深色曜石' : val === 'dawn' ? '晨曦渐变' : '默认柔光'));
    },
    /* ---------- 图标包 ---------- */
    'ip-use': function (v, id) {
      S.settings.iconPack = id || 'default';
      NM.save();
      if (NM.renderStatusBarIcons) NM.renderStatusBarIcons();
      changed(v, '图标风格已应用');
    },
    'ip-del': function (v, id) {
      NM.deleteIconPack(id);
      if (NM.renderStatusBarIcons) NM.renderStatusBarIcons();
      NM.save(); NM.island('已删除图标包', 1400); NM.renderView(v);
    },
    'ip-import': function (v) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var id = NM.importIconPack(JSON.parse(String(fr.result)));
            S.settings.iconPack = 'pack:' + id;
            NM.save();
            if (NM.renderStatusBarIcons) NM.renderStatusBarIcons();
            NM.island('图标包已导入并启用', 1600);
            NM.renderView(v);
          } catch (e) {
            NM.dialog('导入失败', String((e && e.message) || e),
              [{ t: '好', a: 'close-dialog', primary: true }]);
          }
        };
        fr.readAsText(f);
      });
      inp.click();
    },
    'ip-export': function () {
      var sample = {
        name: '我的图标包', author: '你的名字',
        icons: {
          wifi: {
            w: 'data:image/png;base64,<白色 40px 透明 PNG>',
            b: 'data:image/png;base64,<黑色 40px 透明 PNG>'
          }
        }
      };
      var blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'muos-iconpack-template.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      NM.island('模板已下载', 1400);
    },
    /* ---------- 应用图标包 ---------- */
    'ap-use': function (v, id) {
      S.settings.appIconPack = id || 'default';
      NM.save();
      if (NM.refreshAppIcons) NM.refreshAppIcons();
      changed(v, '应用图标已更新');
    },
    'ap-del': function (v, id) {
      NM.deleteAppPack(id);
      if (NM.refreshAppIcons) NM.refreshAppIcons();
      NM.save(); NM.island('已删除应用图标包', 1400); NM.renderView(v);
    },
    'ap-import': function (v) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var id = NM.importAppPack(JSON.parse(String(fr.result)));
            S.settings.appIconPack = 'pack:' + id;
            NM.save();
            if (NM.refreshAppIcons) NM.refreshAppIcons();
            NM.island('应用图标包已导入并启用', 1600);
            NM.renderView(v);
          } catch (e) {
            NM.dialog('导入失败', String((e && e.message) || e),
              [{ t: '好', a: 'close-dialog', primary: true }]);
          }
        };
        fr.readAsText(f);
      });
      inp.click();
    },
    'ap-export': function () {
      var sample = {
        name: '我的应用图标包', author: '你的名字',
        apps: {
          camera: {
            i: {
              w: 'data:image/svg+xml;base64,<白色 24x24 字形>',
              b: 'data:image/svg+xml;base64,<黑色 24x24 字形>'
            },
            bg: ['#8f98ad', '#565f75']
          }
        }
      };
      var blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'muos-app-iconpack-template.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      NM.island('模板已下载', 1400);
    },
    'open-home-editor': function (v) { NM.goHome(); setTimeout(function () { NM.openHomeEditor(); }, 60); },
    'reset-home': function (v) {
      S.data.desktop = JSON.parse(JSON.stringify(NM.DEFAULT_DATA.desktop));
      S.data.widgets = JSON.parse(JSON.stringify(NM.DEFAULT_DATA.widgets));
      S.data.hidden = []; S.data.pageCount = 1;
      S.settings.homeGrid = '4x6'; S.settings.appGrid = '4x6'; S.settings.swipeSearch = true;
      NM.save(); NM.renderPages(); NM.renderWidget(); NM.island('主屏幕布局已重置', 1600); NM.renderView(v);
    },
    'open-map': function (v) { NM.launchApp('maps'); },
    'test-alert': function (v) { NM.notify('about', '紧急警报（测试）', '这是一条公共安全警报演练，无需采取任何行动。'); NM.island('已发送测试警报', 1400); },
    'emergency-list': function (v) { NM.dialog('紧急联系人', '林小满 · 138 0013 8000\n医疗信息：' + (S.settings.medicalInfo || '未填写'), [{ t: '好', a: 'close-dialog', primary: true }]); },
    'backup-now': function (v) {
      S.data.backup = { settings: JSON.parse(JSON.stringify(S.settings)), data: JSON.parse(JSON.stringify(S.data)), ts: Date.now() };
      S.settings.lastBackup = S.data.backup.ts; NM.save(); NM.renderView(v); NM.island('备份已保存到本机', 1600);
    },
    'restore-backup': function (v) {
      if (!S.data.backup) { NM.island('没有可用的备份', 1500); return; }
      S.settings = JSON.parse(JSON.stringify(S.data.backup.settings));
      S.data = JSON.parse(JSON.stringify(S.data.backup.data));
      NM.save(); changed(v, '已从备份恢复');
    },
    'privacy-dash': function (v) {
      NM.dialog('隐私仪表盘（最近 24 小时）', '相机：相册 2 次 · 麦克风：录音机 1 次 · 位置：天气 12 次、地图 3 次。\n这些是模拟记录，MUOS 不会访问真实设备。',
        [{ t: '好', a: 'close-dialog', primary: true }]);
    },
    'privacy-clear': function (v) { S.data.privacyLog = []; NM.save(); NM.island('权限记录已清除', 1400); },
    'security-scan': function (v) {
      NM.dialog('安全状态', '设备保护：正常\n锁屏：' + (S.settings.pinOn || S.settings.fingerprint || S.settings.face ? '已启用' : '未设置') +
        '\n自动阻止程序：' + (S.settings.autoBlocker ? '已开启' : '已关闭') + '\n安全补丁：2026-11-01',
        [{ t: '好', a: 'close-dialog', primary: true }]);
    },
    'fold-preview': function (v) { S.settings.foldMode = !S.settings.foldMode; changed(v, S.settings.foldMode ? '已展开为内屏 · 主屏双栏' : '已折叠为外屏'); },
    'add-routine': function (v) {
      (S.data.routines = S.data.routines || []).push({ id: NM.util.uid(), t: '低电量自动省电', d: '当电量低于 20% 时开启省电模式' });
      NM.save(); NM.renderView(v); NM.island('已添加日常程序', 1400);
    },
    'routine-del': function (v, id) { S.data.routines = S.data.routines.filter(function (r) { return r.id !== id; }); NM.save(); NM.renderView(v); },
    'reset-usage': function (v) { S.data.usage = {}; NM.save(); NM.renderView(v); NM.island('使用统计已重置', 1400); },
    'clean-cache': function (v) {
      var n = S.tasks.length;
      while (S.tasks.length > 1) NM.killApp(S.tasks[S.tasks.length - 1], true);
      NM.island('已清理 ' + Math.max(0, n - 1) + ' 个后台任务', 1600); NM.renderView(v);
    },
    'clear-data': function (v) {
      NM.dialog('清理全部用户数据', '将删除笔记、照片、录音、通话记录与文件，设置会保留。',
        [{ t: '确认清理', a: 'do-clear-data', primary: true }, { t: '取消', a: 'close-dialog' }]);
    },
    'kill-all': function (v) { S.tasks.slice().forEach(function (id) { NM.killApp(id, true); }); NM.island('已结束全部后台进程', 1500); NM.renderView(v); },
    'kill-one': function (v, id) { NM.killApp(id, true); NM.renderView(v); },
    'cycle-timer': function (v, id) {
      var cur = S.settings.appTimers[id] || 0, next = cur === 0 ? 30 : cur === 30 ? 60 : cur === 60 ? 120 : 0;
      S.settings.appTimers[id] = next; NM.save(); NM.renderView(v);
    },
    'open-drawer': function (v) { NM.goHome(); setTimeout(function () { NM.openDrawer(); }, 60); },
    'open-assistant': function (v) { NM.launchApp('assistant'); },
    'check-update': function (v) {
      S.settings.lastUpdateCheck = Date.now(); NM.save();
      v_updateMsg = '正在检查更新…'; NM.renderView(v);
      setTimeout(function () { v_updateMsg = '已是最新版本 · MUOS 4.0.1'; NM.renderView(v); NM.island('检查完成：已是最新版本', 1800); }, 1100);
    },
    'install-update': function (v) {
      v_updateMsg = '正在下载 0%'; NM.renderView(v);
      var p = 0, t = setInterval(function () {
        p += 20; v_updateMsg = p >= 100 ? '安装完成 · 重启后生效' : '正在下载 ' + p + '%';
        if (NM.S.fg === 'settings') NM.renderView(v);
        if (p >= 100) { clearInterval(t); NM.island('模拟更新已完成', 2000); }
      }, 420);
    },
    'a11y-menu': function (v) {
      var on = ['highContrast', 'reduceAnim', 'magnification', 'hearingBoost'].filter(function (k) { return S.settings[k]; });
      NM.dialog('辅助功能菜单', on.length ? '已启用：' + on.join('、') : '当前没有启用任何辅助功能。',
        [{ t: '好', a: 'close-dialog', primary: true }]);
    },
    'dev-log': function (v) {
      NM.dialog('系统日志', 'power=on · screen=' + S.screen + ' · tasks=' + S.tasks.length +
        ' · bgLimit=' + S.settings.bgLimit + ' · storage=' + JSON.stringify(S.data).length + 'B',
        [{ t: '好', a: 'close-dialog', primary: true }]);
    },
    'set-reset': function (v) {
      NM.dialog('恢复出厂设置', '将清除本机所有备忘录、照片、通话记录、桌面布局与设置，且无法撤销。',
        [{ t: '确认重置', a: 'do-reset', primary: true }, { t: '取消', a: 'close-dialog' }]);
    },
    'reset-settings': function (v) {
      S.settings = JSON.parse(JSON.stringify(D)); NM.save(); changed(v, '所有设置已恢复默认');
    },
    'set-pin-save': function (v) {
      var p = (v.state.pinNew || '').trim();
      if (!/^\d{4}$/.test(p)) { NM.island('请输入 4 位数字', 1600); return; }
      S.settings.pin = p; v.state.pinNew = ''; NM.save(); NM.renderView(v); NM.island('锁屏密码已更新', 1600);
    },
    'do-clear-data': function () {
      var keep = ['desktop', 'widgets', 'usage', 'pageCount'];
      var d = NM.DEFAULT_DATA;
      Object.keys(d).forEach(function (k) { if (keep.indexOf(k) < 0) S.data[k] = JSON.parse(JSON.stringify(d[k])); });
      NM.closeDialog(); NM.save(); NM.island('用户数据已清理', 1600);
      var v = S.views.settings; if (v) NM.renderView(v);
    }
  };

  NM.register('settings', {
    init: function (v) {
      v.state.q = ''; v.state.pinNew = ''; v.state.appQ = '';
      v.state.acctUser = ''; v.state.acctPass = '';
    },
    pages: pages,
    actions: {
      'set-jump': function (v, k) { NM.push('settings', k); },
      'set-nav': function (v, k) { NM.push('settings', k); },
      'set-page': function (v, k) { NM.push('settings', k); },
      'set-tg': function (v, k) { NM.setToggle(k, v); },
      'set-val': function (v, raw) {
        var i = raw.indexOf('|'), key = raw.slice(0, i), val = raw.slice(i + 1);
        NM.setVal(key, val, v);
      },
      'set-act': function (v, raw) {
        var i = raw.indexOf('|'), act = raw.slice(0, i), arg = raw.slice(i + 1);
        if (ACTS[act]) ACTS[act](v, arg);
      },
      'set-wall': function (v, w) { S.settings.wall = w; changed(v, '壁纸已更换'); },
      'set-clearq': function (v) { v.state.q = ''; NM.renderView(v); },
      'task-fold': function (v) {
        S.settings.taskFolded = !S.settings.taskFolded; NM.save(); NM.renderView(v);
      },
      'task-toggle-one': function (v, i) {
        var m = S.settings.taskHidden = S.settings.taskHidden || {};
        m[i] = !m[i]; NM.save(); NM.renderView(v);
      },
      'acct-avatar': function (v) {
        var cur = AVATARS.indexOf(S.settings.accountAvatar || 'blue');
        S.settings.accountAvatar = AVATARS[(cur + 1) % AVATARS.length];
        NM.save(); NM.renderView(v);
      },
      'acct-sync': function (v, k) {
        var m = S.settings.syncItems = S.settings.syncItems || {};
        m[k] = !m[k]; NM.save(); NM.renderView(v);
      },
      'acct-sync-now': function (v) {
        if (!S.settings.accountLoggedIn) { NM.island('请先登录 MUSE 账户', 1600); return; }
        S.settings.lastSync = Date.now(); NM.save(); NM.renderView(v);
        NM.island('同步完成 · 4 项数据已更新', 1700);
      },
      'acct-find': function (v) {
        var i = NM.deviceInfo ? NM.deviceInfo() : { brand: 'MUOS' };
        NM.dialog('查找设备', esc(i.brand) + '\n状态：本机在线 · 电量 ' + Math.round(S.battery) + '%' +
          '\n模拟位置：北京市海淀区 MUOS 实验室\n最后在线：刚刚',
          [{ t: '好', a: 'close-dialog', primary: true }]);
      },
      'acct-logout': function (v) {
        NM.dialog('退出登录？', '退出后云服务与查找设备将停用，本机数据会保留。',
          [{ t: '退出登录', a: 'acct-logout-yes', primary: true }, { t: '取消', a: 'close-dialog' }]);
      },
      'acct-logout-yes': function (v) {
        S.settings.accountLoggedIn = false; NM.save(); NM.closeDialog();
        changed(v, '已退出 MUSE 账户');
      },
      'acct-login-submit': function (v) {
        var u = (v.state.acctUser || '').trim(), p = v.state.acctPass || '';
        if (!u) { NM.island('请输入账号', 1600); return; }
        if (p.length < 4) { NM.island('密码至少 4 位', 1600); return; }
        S.settings.accountLoggedIn = true;
        S.settings.muosId = u.toUpperCase().slice(0, 24);
        if (!/^[\d\s+\-@.]+$/.test(u)) S.settings.accountName = u.slice(0, 16);
        v.state.acctUser = ''; v.state.acctPass = '';
        NM.save(); NM.pop('settings'); NM.island('登录成功 · 欢迎回来', 1800);
      },
      'acct-signup': function () {
        NM.dialog('创建 MUSE 账户', '这是离线模拟系统，无需注册。直接输入任意账号与 4 位以上密码即可登录。',
          [{ t: '知道了', a: 'close-dialog', primary: true }]);
      },
      'acct-forgot': function () {
        NM.dialog('找回密码', '模拟账户没有真实密码；输入任意 4 位以上字符即可登录。',
          [{ t: '知道了', a: 'close-dialog', primary: true }]);
      },
      'set-appnotif': function (v, id) {
        var m = S.settings.appNotif; m[id] = m[id] === false;
        NM.save(); NM.renderView(v); NM.island((m[id] ? '已允许 ' : '已关闭 ') + NM.appById(id).name + ' 的通知', 1400);
      },
      'set-island': function (v, id) {
        var m = S.settings.islandServices; m[id] = m[id] === false; NM.save(); NM.renderView(v);
      },
      'restore-app': function (v, id) {
        S.data.hidden = (S.data.hidden || []).filter(function (x) { return x !== id; });
        if ((S.data.desktop || []).indexOf(id) < 0) S.data.desktop.push(id);
        NM.save(); NM.renderPages(); NM.renderView(v); NM.island('已恢复到桌面', 1400);
      },
      'set-bgrestrict': function (v, id) {
        var a = S.data.bgRestrict = S.data.bgRestrict || [];
        var i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id);
        NM.save(); NM.renderView(v);
      },
      'bio-add': function (v, key) {
        var a = S.data.biometrics = S.data.biometrics || [];
        a.push({ type: key, id: NM.util.uid() }); S.settings[key] = true;
        NM.save(); NM.renderView(v); NM.island('已登记一组' + (key === 'fingerprint' ? '指纹' : '面部数据'), 1600);
      },
      'bio-clear': function (v, key) {
        S.data.biometrics = (S.data.biometrics || []).filter(function (b) { return b.type !== key; });
        S.settings[key] = false; NM.save(); NM.renderView(v);
      },
      'app-open': function (v, id) { NM.launchApp(id); },
      'set-build': function (v) {
        S.settings.buildTaps = (S.settings.buildTaps || 0) + 1;
        var left = 7 - S.settings.buildTaps;
        if (left <= 0 && !S.settings.devOn) {
          S.settings.devOn = true; NM.save(); NM.island('开发者选项已开启', 2200);
        } else if (!S.settings.devOn) NM.island(left > 2 ? '再点 ' + left + ' 次可开启开发者选项' : '还差 ' + left + ' 步', 1000);
        NM.save();
      }
    },
    onField: function (v, k, val, t) {
      if (k === 'set-q') { v.state.q = val; NM.renderSettingsSearch(v, val); return; }
      if (k === 'set-appq') { v.state.appQ = val; NM.renderView(v); return; }
      if (k.indexOf('set:') === 0) {
        var key = k.slice(4);
        S.settings[key] = +val;
        var b = t.parentNode.querySelector('b');
        if (b) b.textContent = val + (key === 'wellbeingGoal' ? '分钟' : (key === 'whiteBalance' ? '' : '%'));
        NM.applySettings(); NM.save(); NM.emit('settings'); NM.renderAllDynamic();
        return;
      }
      var map = {
        'set-pin': 'pinNew', 'set-owner': 'lockOwner', 'set-medical': 'medicalInfo', 'set-account': 'accountName'
      };
      if (k === 'acct-name') { S.settings.accountName = val.slice(0, 20); NM.save(); NM.tickClock(); return; }
      if (k === 'acct-user' || k === 'acct-pass') { v.state[k] = val; return; }
      if (map[k]) {
        if (map[k] === 'pinNew') v.state.pinNew = val;
        else S.settings[map[k]] = val;
        NM.save(); NM.tickClock();
      } else v.state[k] = val;
    }
  });

  NM.renderSettingsSearch = function (v, q) {
    var res = document.getElementById('set-results'), grp = document.getElementById('set-groups');
    if (!res) return;
    v.state.q = q;
    res.innerHTML = searchHtml(q);
    res.style.display = q ? 'block' : 'none';
    if (grp) grp.style.display = q ? 'none' : 'block';
    var box = document.querySelector('.set-search');
    if (box) {
      var old = box.querySelector('[data-a=set-clearq]');
      if (q && !old) box.insertAdjacentHTML('beforeend', '<button data-a="set-clearq">' + svg('close', 15) + '</button>');
      if (!q && old) old.remove();
    }
  };

  /* ============================================================
     关于本机：完整设备信息 + 连点构建号开启开发者选项
     ============================================================ */
  NM.aboutHTML = function (v) {
    var up = Math.floor((Date.now() - S.bootAt) / 1000);
    var mem = (W.performance && W.performance.memory) ? (W.performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : '不可用';
    var rows = [
      ['设备名称', (NM.deviceInfo ? NM.deviceInfo().brand : 'MUOS') + ' Device'],
      ['设备形态', NM.deviceInfo ? NM.deviceInfo().formLabel : '手机'],
      ['使用屏幕', NM.deviceInfo ? NM.deviceInfo().screenLabel : '内屏'],
      ['显示方向', NM.deviceInfo ? NM.deviceInfo().orientLabel : '竖向'],
      ['设备名称', NM.deviceInfo ? NM.deviceInfo().name : 'APEX 15 Pro'],
      ['认证型号', NM.deviceInfo ? NM.deviceInfo().model : 'MU-AP15P'], ['系统版本', 'MUOS 4.0.1'],
      ['界面风格', ({ hyperos: '生命感美学', oneui: '清爽玻璃', classic: '经典 MUOS' })[S.settings.themePack]],
      ['内核构建', 'Build 20261108 · Web'], ['基带版本', 'MUOS-WEB-4.0.1'],
      ['序列号', 'MU' + (S.bootAt.toString(16).slice(-8).toUpperCase())],
      ['IMEI（模拟）', '86 0013 1419 2026'],
      ['安全补丁', '2026-11-01'],
      ['屏幕分辨率', NM.deviceInfo ? (NM.deviceInfo().resW + ' × ' + NM.deviceInfo().resH + ' · ' + NM.deviceInfo().resLabel) : '—'],
      ['像素密度', NM.deviceInfo ? (NM.deviceInfo().ppi + ' ppi · ' + NM.deviceInfo().dpr + 'x') : '—'],
      ['逻辑视口', NM.deviceInfo ? (NM.deviceInfo().cssW + ' × ' + NM.deviceInfo().cssH + ' dp') : '—'],
      ['刷新率', NM.deviceInfo ? (NM.deviceInfo().hz + ' Hz · ' + (NM.deviceInfo().hz === 120 ? '自适应流畅' : '标准')) : '—'],
      ['桌面栅格', (NM.homeGridInfo ? NM.homeGridInfo().cols + ' × ' + NM.homeGridInfo().rows : '4 × 6')],
      ['宿主窗口', W.innerWidth + ' × ' + W.innerHeight + ' @ ' + (W.devicePixelRatio || 1) + 'x'],
      ['本次运行', Math.floor(up / 3600) + ' 时 ' + Math.floor(up / 60) % 60 + ' 分 ' + up % 60 + ' 秒'],
      ['后台任务', S.tasks.length + ' 个 · 不设上限'],
      ['通知', S.notifications.length + ' 条'], ['JS 堆占用', mem],
      ['电池', Math.round(S.battery) + '%' + (S.charging ? ' · 充电中' : '')],
      ['存储', JSON.stringify(S.data).length + ' 字节用户数据']
    ];
    return NM.appBar(v, '关于本机') +
      '<div class="card glass" style="text-align:center;padding:22px"><div class="boot-logo" style="margin:0 auto 12px;width:58px;height:58px;border-radius:16px"><div class="boot-mark" style="transform:scale(.7)"></div></div>' +
      '<b style="font-size:17px;font-weight:500">MUOS 4.0.1</b><div style="font-size:11px;color:var(--muted);margin-top:4px">浏览器里的移动操作系统模拟</div></div>' +
      '<div class="card" style="padding:4px 14px">' + rows.map(function (r) {
        return '<div class="forecast-row"><span style="color:var(--muted)">' + r[0] + '</span><b style="margin-left:auto;font-weight:400">' + esc(r[1]) + '</b></div>';
      }).join('') + '</div>' +
      '<div class="set-row nav-row" data-a="set-build"><span class="row-main"><b>构建号</b><small>' +
      (S.settings.devOn ? '开发者选项已开启' : '连续点按 7 次可开启开发者选项') + '</small></span>' + svg('chevron', 16) + '</div>' +
      '<div class="set-note" style="margin-top:14px">MUOS 是纯前端的教学演示系统，不会访问你的摄像头、相册、通讯录或任何真实数据。所有内容保存在当前浏览器的本地存储中。</div>' + NM.endBar();
  };

  /* ============================================================
     设置落地：把每一项映射到真实的 DOM 属性 / CSS 变量 / 系统行为
     ============================================================ */
  var BASE_APPLY = NM.applySettings;
  NM.applySettings = function () {
    BASE_APPLY();
    var st = S.settings, h = document.documentElement;
    var flags = {
      'data-style': st.themePack, 'data-glass': st.softGlass ? '1' : '0',
      'data-glow': st.tapGlow ? '1' : '0', 'data-drag': st.dragGlow ? '1' : '0',
      'data-palette': st.palette, 'data-icons': st.paletteIcons ? '1' : '0',
      'data-shape': st.iconShape, 'data-eye': st.eyeShield ? '1' : '0',
      'data-privacy': st.privacyDisplay ? (st.privacyMax ? 'max' : '1') : '0',
      'data-privacy-auto': st.privacyAuto ? '1' : '0',
      'data-colormode': st.screenMode, 'data-res-internal': st.resolution,
      'data-bold': st.boldFont ? '1' : '0', 'data-font': st.fontStyle,
      'data-zoom': String(st.screenZoom), 'data-easy': st.easyMode ? '1' : '0',
      'data-motion': st.motion, 'data-aod': st.aod && st.aodMode !== 'scheduled' ? '1' : '0',
      'data-nowbar': st.nowBar ? '1' : '0', 'data-lockclock': st.lockClock,
      'data-fold': st.foldMode ? '1' : '0', 'data-onehand': st.oneHanded ? '1' : '0',
      'data-edge': st.edgePanel ? '1' : '0', 'data-cutout': st.cameraCutout ? '1' : '0',
      'data-island': st.superIsland ? '1' : '0', 'data-taps': st.showTaps ? '1' : '0',
      'data-contrast': st.highContrast ? '1' : '0', 'data-invert': st.colorInvert ? '1' : '0',
      'data-correct': st.colorCorrection ? '1' : '0',
      'data-bedtime': st.bedtimeMode ? '1' : '0', 'data-focus': st.focusMode ? '1' : '0',
      'data-fullscreen': st.fullscreenApps ? '1' : '0',
      'data-screensaver': st.screenSaver ? '1' : '0',
      'data-gpu': st.gpuOverlay ? '1' : '0',
      'data-searchpill': st.showSearchPill ? '1' : '0',
      'data-taskfold': st.taskFolded ? '1' : '0'
    };
    Object.keys(flags).forEach(function (k) { h.setAttribute(k, flags[k]); });
    var palettes = {
      blue: ['#8ab4ff', '#5b7fd6'], violet: ['#b79bff', '#7b5cd6'],
      green: ['#79d8b6', '#3f9e83'], orange: ['#ffb27a', '#e07a44'], mono: ['#c8ccd8', '#8a90a0']
    };
    var pc = palettes[st.palette] || palettes.blue;
    h.style.setProperty('--accent', pc[0]);
    h.style.setProperty('--accent-2', pc[1]);
    var hz = (NM.DEV && +NM.DEV.hz) || 120;
    h.style.setProperty('--anim', ((st.motion === 'standard' ? .12 : .28) * (st.animScale || 1) * Math.pow(60 / hz, .18)).toFixed(3) + 's');
    h.style.setProperty('--warm', String((st.whiteBalance - 50) / 100));
    h.setAttribute('data-anim', (st.animations && !st.reduceAnim && st.animScale !== 0) ? '1' : '0');
    /* 亮度蒙层：额外亮度允许更亮，省电模式限制上限 */
    var bright = st.brightness;
    if (st.lowpower) bright = Math.min(bright, 60);
    if (st.extraBright) bright = Math.min(115, bright + 15);
    var veil = document.getElementById('dim-veil');
    if (veil) veil.style.opacity = String(clamp((100 - bright) / 100 * .72, 0, .72));
    /* 屏幕缩放与字体 */
    var disp = document.getElementById('display');
    if (disp) disp.style.fontSize = (14 * (st.fontScale || 1) * (st.screenZoom || 1)) + 'px';
    if (NM.renderAod) NM.renderAod();
  };

  /* 合并面板：通知面板顶部补一排快捷开关 */
  var BASE_NOTIF = NM.renderNotifShade;
  NM.renderNotifShade = function () {
    BASE_NOTIF();
    if (S.settings.panelMode !== 'together') return;
    var host = document.getElementById('notif-list'); if (!host) return;
    var tiles = ['wifi', 'bluetooth', 'airplane', 'torch'].map(function (k) {
      return '<button class="mini-tile ' + (S.settings[k] ? 'on' : '') + '" data-a="toggle-tile" data-v="' + k + '">' +
        NM.svg(k === 'airplane' ? 'airplane' : k === 'torch' ? 'torch' : k, 16) + '</button>';
    }).join('');
    host.insertAdjacentHTML('afterbegin', '<div class="mini-tiles">' + tiles + '<span>快捷设置 · 状态栏右拉查看全部</span></div>');
  };

  /* 解锁方式：指纹 / 面部登记后可以直接解锁 */
  var BASE_UNLOCK = NM.beginUnlock;
  NM.beginUnlock = function () {
    NM.hideShade();
    var bio = S.settings.fingerprint || S.settings.face;
    if (bio && !S.settings.lockAfterRestart) { NM.island('生物识别已通过', 1200); NM.finishUnlock(); return; }
    BASE_UNLOCK();
  };

  /* 应用计时器 / 后台限制：在冷启动前拦截 */
  var BASE_LAUNCH = NM.launchApp;
  NM.launchApp = function (id) {
    var st = S.settings;
    var limit = (st.appTimers || {})[id] || 0;
    if (limit && (S.data.usage[id] || 0) >= limit * 60) {
      NM.island('已达到「' + NM.appById(id).name + '」的每日使用上限', 2200);
      return;
    }
    var res = BASE_LAUNCH(id);
    if ((S.data.bgRestrict || []).indexOf(id) >= 0) {
      S.tasks = [id].concat(S.tasks.filter(function (x) { return x !== id; })).slice(0, 1);
    }
    return res;
  };
  var BASE_GOHOME = NM.goHome;
  NM.goHome = function () { BASE_GOHOME(); };

  /* 息屏显示 AOD */
  NM.renderAod = function () {
    var off = document.getElementById('off'); if (!off) return;
    var on = S.settings.aod && S.settings.aodMode !== 'scheduled';
    var d = new Date();
    off.innerHTML = on ? '<div class="aod-ui"><div class="aod-clock">' + NM.util.hhmm(d) + '</div>' +
      '<div class="aod-date">' + NM.util.dateCN(d) + '</div>' +
      '<div class="aod-icons">' + (S.settings.chargeInfo ? Math.round(S.battery) + '%' + (S.charging ? ' · 充电中' : '') : '') +
      (S.notifications.length ? ' · ' + S.notifications.length + ' 条通知' : '') + '</div></div>' : '';
  };

  /* 周期联动：时钟、使用时长、定时深色、自适应亮度、电池保护、AOD */
  var extraTick = 0;
  NM.tickSystemExtras = function () {
    var st = S.settings;
    if (S.fg && S.power === 'on' && S.screen === 'app') {
      S.data.usage[S.fg] = (S.data.usage[S.fg] || 0) + 1;
    }
    extraTick++;
    if (extraTick % 5 === 0) {
      NM.save();
      if (st.darkSchedule) {
        var want = (new Date().getHours() >= 18 || new Date().getHours() < 7) ? 'dark' : 'light';
        if (st.theme !== want) { st.theme = want; NM.applySettings(); }
      }
      if (st.adaptiveBright && !st.lowpower) {
        var hour = new Date().getHours();
        var target = (hour >= 7 && hour < 19) ? 88 : 52;
        if (st.brightness !== target) { st.brightness += (target > st.brightness ? 1 : -1); NM.applySettings(); }
      }
      if (st.charging && st.batteryProtect && S.battery >= 80) {
        S.charging = false; NM.island('电池保护：已停止于 80%', 2000);
      }
      NM.renderAod();
    }
  };

  /* 提供给别的模块复用的工具 */
  NM.SETTINGS_GROUPS = GROUPS;
  NM.SETTINGS_TASKS = TASKS;
  NM.settingsChanged = changed;
  NM.settingsSearch = searchSettings;
})(window);
