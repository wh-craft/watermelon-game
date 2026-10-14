# 合成大西瓜

在线试玩：https://wh-craft.github.io/watermelon-game/

HTML、CSS、JavaScript 实现，使用 Matter.js 处理碰撞与下落。支持鼠标、触屏和键盘操作，同一浏览器自动保存进度与最高分。

## 文件

- `index.html`：网页入口。
- `game.js`：画面、操作、音效和进度保存。
- `physics.js`：碰撞合成、分数、重力、休眠与存档恢复。
- `style.css`：页面样式。
- `tests/`：物理规则和悬空问题回归测试。

运行测试：`node --test tests/*.cjs`。

## 悬空修复

每 100 毫秒检查水果是否通过接触链连接到底部；失去支撑的水果组会被唤醒并继续下落。恢复旧存档时重新计算物理状态。合成回调在整批合成和唤醒完成后触发，避免保存中间状态。正常受支撑的水果仍可休眠。

水果素材来源见 `assets/classic/SOURCE.md`；Matter.js 的 MIT 许可保留于 `vendor/matter.min.js`。
