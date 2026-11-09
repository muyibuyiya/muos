# 图标包（Icon Pack）制作与使用

MUOS 的状态栏图标支持 **三套内置线条风格** 与 **用户自制图标包**。设置入口：**设置 → 系统风格 → 图标包**。

---

## 1. 内置风格

| 选项 | 说明 | 视觉参数 |
| --- | --- | --- |
| 跟随系统风格（默认） | 生命感美学 → HyperOS；清爽玻璃 → One UI；经典 → 系统素材 | — |
| HyperOS 线条 | 小米规范：中等线宽、全圆角、连续曲率 | 24 网格，`stroke-width` 1.7 |
| One UI 线条 | 三星规范：偏细的几何线条、留白更大 | 24 网格，`stroke-width` 1.35 |
| OriginOS 线条 | vivo 规范：笔画饱满、转角圆润 | 24 网格，`stroke-width` 2.05 |

内置图标全部为 **内联 SVG + `currentColor`**：颜色由状态栏文字色决定，切深浅主题**不需要**准备两套素材。
电池图标会按 `S.battery` 百分比动态改变填充宽度。

---

## 2. 内置开源风格包

除自绘三套外，仓库还内置两套可直接切换的开源图标（`js/07-openpacks.js`，由 `tools/build-open-iconpacks.js` 生成）：

| 选项 | 来源 | 许可 | 图标数 | 说明 |
| --- | --- | --- | --- | --- |
| 开源 · Material Symbols | Google Material Design Icons | Apache-2.0 | 13 | 含 HD、5G 文字徽标；勿扰为「圆圈减号」 |
| 开源 · Tabler Icons | tabler/tabler-icons | MIT | 11 | 2px 圆头线条；手电用 bulb 代替，勿扰为月亮 |

- 缺项（如 Tabler 没有 `volte`/`nr5g`）自动回退系统素材，不会出现空图标。
- 设置项值：`open:material` / `open:tabler`。
- 授权细节见 `THIRD-PARTY.md`；自行重新生成：

```bash
npm install --no-save @material-design-icons/svg @tabler/icons
node tools/build-open-iconpacks.js
```

## 3. 图标包格式

一个 `.json` 文件：

```json
{
  "name": "我的图标包",
  "author": "你的名字",
  "icons": {
    "wifi":   { "w": "data:image/svg+xml;base64,...", "b": "data:image/svg+xml;base64,..." },
    "battery":{ "w": "data:image/png;base64,...",      "b": "data:image/png;base64,..." }
  }
}
```

- `name`：显示在设置页，最长 40 字符。
- `icons.<图标名>`：`{ w, b }` 两种色调 —— `w` 用于深色背景（白图标），`b` 用于浅色背景（黑图标）。
  只给 `w` 也可以，缺失色调会自动回退到 `w`。
- 每个值可以是 **任意浏览器可渲染的图片 dataURL**：SVG / PNG / WebP 都行。优先用 SVG，体积小且缩放清晰。
- 未在包中出现的图标名 → 自动使用内置/默认图标，**无需做全量覆盖**。

### 支持的图标名

| 名称 | 用途 | 对应 One UI 素材名（参考） |
| --- | --- | --- |
| `wifi` | Wi‑Fi 信号 | `wifi` / `wifi_4` |
| `signal` | 移动网络信号格 | `signal_cellular_4_bar` |
| `bt` | 蓝牙 | `bluetooth` |
| `battery` | 电池（位图包不做动态填充） | `battery_full` |
| `charging` | 充电 | `battery_charging_full` |
| `alarm` | 闹钟 | `alarm` |
| `dnd` | 勿扰（月亮） | `do_not_disturb_on` |
| `torch` | 手电筒 | `flashlight_on` |
| `airplane` | 飞行模式 | `airplanemode_active` |
| `gps` | 定位 | `location_on` |
| `nfc` | NFC | `nfc` |
| `hd` / `volte` / `nr5g` | 文字型网络标识 | `hd` / `vo_lte` / `5g` |

> 未列出的名字也会被保存，只是暂时不显示；后续新增状态图标时可直接复用。

### 制作建议

1. 在 Figma / Illustrator 中画 **24×24 网格**图形，四周留 2px 安全区。
2. 线条类：`stroke-width` 1.5–2，`stroke-linecap/linejoin: round`；填充类：solid，勿用渐变（缩小后糊）。
3. 导出 SVG 时把颜色**写死**为 `#FFFFFF`（w）与 `#111111`（b）；或直接导出 40px 透明 PNG。
4. 转 dataURL：
   - 命令行：`base64 -w0 icon.svg` → 拼 `data:image/svg+xml;base64,`
   - 或浏览器控制台：`await fetch('icon.svg').then(r=>r.blob()).then(b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)}))`
5. 设置页「下载格式模板」可拿到骨架 JSON，替换 dataURL 后导入即可（导入会自动启用）。
6. 图标包只写本机 `localStorage`（键 `muos-iconpacks-v1`），**不上传**；浏览器配额不足时会提示「图标包过大」。建议单包 < 2 MB。

---

## 4. 开源图标来源（可合法获取）

| 项目 | 许可 | 规模 | 适配度 | 备注 |
| --- | --- | --- | --- | --- |
| [OneUIProject/oneui-icons](https://github.com/OneUIProject/oneui-icons) | MIT | 880+ | ★★★★★ | 三星应用内图标（含 wifi / battery / signal），SVG 直出，命名 `ic_oui_*` |
| [LawnchairLauncher/lawnicons](https://github.com/LawnchairLauncher/lawnicons) | Apache-2.0 | 7000+ | ★★★★ | 单色线条，风格统一，适合系统级状态栏线稿；需自行挑选 |
| [google/material-design-icons](https://github.com/google/material-design-icons)（Material Symbols） | Apache-2.0 | 3000+ | ★★★★ | `wifi`、`signal_cellular_4_bar`、`battery_full` 等一应俱全，可变字重 |
| [tabler/tabler-icons](https://github.com/tabler/tabler-icons) | MIT | 5900+ | ★★★☆ | 1.5px 线条、24 网格，与 HyperOS 线宽接近 |
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) | ISC | 1600+ | ★★★☆ | 极简线条，转角柔和 |
| [microsoft/fluentui-system-icons](https://github.com/microsoft/fluentui-system-icons) | MIT | 5000+ | ★★★☆ | 圆润填充/线条双版本 |
| [VincentAzz/HyperMonetIconTheme](https://github.com/VincentAzz/HyperMonetIconTheme) | Apache-2.0 | — | ★★★ | 不是图标库，而是「Lawnicons → HyperOS 分层图标」的转换脚本，可用于**校准 HyperOS 规范**（连续曲率圆角、前景/背景层缩放比） |

### 仅可自用、不可再分发的来源

- **官方 ROM 提取**：HyperOS `.mtz`/主题商店图标、One UI 主题 APK、ColorOS/OriginOS 主题包。这些美术资源受著作权保护，个人设备自用通常没问题，**打包进公开项目/仓库即侵权**。
- [pzcn/Perfect-Icons-Completion-Project](https://github.com/pzcn/Perfect-Icons-Completion-Project)：图标由多位作者绘制、主题方单独授权，仓库未给出统一再分发许可，**不要直接搬运**。
- 任何「Icon Pack APK」（Nova/Lawnchair 商店里的商业图标包）：仅购买者个人使用。

### 合规做法

1. 用 MIT / Apache-2.0 素材 → 保留 LICENSE 与版权声明（`ICON-PACK.md` 或 `THIRD-PARTY.md` 中注明来源与许可）。
2. 用官方图标「临摹重绘」→ 只保留风格语言（线宽、网格、圆角），**不复制曲线数据**，本项目内置三套即为此路线。
3. 不把 `icons-sheet/`、导入的图标包 JSON 提交到公开仓库（已在 `.gitignore` 中忽略素材目录）。

---

## 5. 相关 API

```js
NM.importIconPack(obj)        // → id，失败抛 Error（格式错误 / 包为空 / 存储不足）
NM.deleteIconPack(id)         // 删除；若正在使用则回落 auto
NM.getIconPacks()             // → [{ id, name, author, icons }]
NM.findIconPack(id)
NM.sicon(name, tone, opt)     // tone: 'w' | 'b'；opt.level 仅 battery 使用
```

设置项：`S.settings.iconPack` = `auto` | `default` | `builtin:<style>` | `pack:<id>`。