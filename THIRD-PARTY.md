# 第三方素材与授权

本项目为模拟系统，界面与图标优先自行绘制（`js/06-iconpacks.js` 的三套线条图标）。
下列第三方素材以 **构建期生成、运行时内置** 的方式使用，均允许再分发，但需保留署名与许可声明。

## 1. Material Symbols

- 来源：https://github.com/google/material-design-icons
- 许可：Apache License 2.0
- 使用方式：`@material-design-icons/svg`（outlined 24px）中的 13 个图标，重着色后以 SVG dataURL 内置于 `js/07-openpacks.js`
- 图标：wifi、signal_cellular_4_bar、bluetooth、battery_full、battery_charging_full、alarm、do_not_disturb_on、flashlight_on、airplanemode_active、location_on、nfc、hd、5g

## 2. Tabler Icons

- 来源：https://github.com/tabler/tabler-icons
- 许可：MIT License（Copyright (c) 2020-2026 Tabler)
- 使用方式：`@tabler/icons`（icons/outline）中的 11 个图标，重着色后以 SVG dataURL 内置于 `js/07-openpacks.js`
- 图标：wifi、cell-signal-5、bluetooth、battery-4、battery-charging、alarm、moon、bulb（代手电筒）、plane、map-pin、nfc

## 3. MiSans 字体

- 来源：https://hyperos.mi.com/font/ （小米）
- 许可：MiSans 字体许可协议（免费商用，禁止单独售卖字体文件）
- 使用方式：`fonts/MiSansVF.woff2`（可变字体，wght 150–700），`app.css` 中以 `@font-face` 声明，设置 → 显示和亮度 → 字体样式和大小 → MiSans 时启用
- 来源版本：MiSans VF **4.009**，从小米 14 Pro HyperOS OS4.0.7.0 固件 `product/fonts/MiSansVF.ttf` 提取（另存 `MiSansL3.otf` 未打包），详见 `fonts/README.md`

## 4. 生成脚本

`tools/build-open-iconpacks.js` 负责从 npm 包读取 SVG、按 `#ffffff` / `#111111` 重着色、编码为 dataURL 并输出 `js/07-openpacks.js`。

```bash
npm install --no-save @material-design-icons/svg @tabler/icons
node tools/build-open-iconpacks.js
```

## 5. 未收录的来源（授权不适合再分发）

| 来源 | 原因 |
| --- | --- |
| OneUIProject/oneui-icons（MIT 打包，880+ One UI SVG） | 已按用户要求把 **22 个应用字形**内置到 `js/09-apppack-oneui.js`（设置 → 应用图标包 → 「内置 · One UI」）。素材源自三星应用内资源，MIT 仅覆盖该仓库打包文件，**公开部署存在版权风险**；如需完全合规，删除该模块、移除设置里的内置项即可 |
| LawnchairLauncher/lawnicons（Apache-2.0） | 可内置，但体积大（7000+）且为应用图标而非状态栏图形，本项目未内置 |
| 官方 ROM 提取（.mtz / 主题 APK） | 美术资源受著作权保护，仅限个人自用，禁止随项目分发 |
| Perfect-Icons-Completion-Project | 图标由多位作者绘制、主题方单独授权，无统一再分发许可 |

## 6. 商标声明

HyperOS / MIUI（小米）、One UI（三星）、OriginOS / Funtouch OS（vivo）、ColorOS（OPPO）均为各自权利人的商标。
本项目与上述厂商无关联，内置图标为**按公开设计语言自行绘制**，不包含其原始素材。
