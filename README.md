# X-TEXAS-HOLDEM

## 🌐 Live Deployments

| Platform | URL |
|----------|-----|
| Cloudflare Pages | [x-texas-holdem.pages.dev](https://x-texas-holdem.pages.dev/) |
| Vercel | [x-texas-holdem.vercel.app](https://x-texas-holdem.vercel.app/) |
| GitHub Pages | [xera-2011.github.io/x-texas-holdem](https://xera-2011.github.io/x-texas-holdem/) |

> 📱 **体验提示**：本项目已深度适配移动端，推荐使用 **手机浏览器** 访问以获得最佳沉浸式体验。

### 特性 (Features)
- **超级电脑模式 (Super AI)**: 集成蒙特卡洛模拟 (Monte Carlo Simulation) 与对手建模，提供 GTO 风格的高难度对战体验。
- **模式切换**: 游戏内支持一键切换 `普通电脑` / `超级电脑`。

### 开发与测试 (Command Guide)

**启动开发**
```bash
# 本地开发 (端口 2011)
pnpm dev

# 代码检查 (Lint)
pnpm lint
```

**模拟测试**
```bash
# 纯粹随机测试 (Random Simulation)
pnpm test:random

# 纯粹场景测试 (Preset Scenarios)
pnpm test:scenarios

# AI 对战模拟 (4 普通 vs 4 超级)
# 默认: 50场, 1000次模拟
# 自定义: pnpm test:battle -- --games=100 --sims=2000
pnpm test:battle

# 单元测试 (牌型评估)
pnpm test:unit

# 胜率计算测试 (验证蒙特卡洛算法准确性)
pnpm test:equity

# AI 训练日志生成 (8 Super AI Self-Play, 10 Rounds)
# 生成包含 God View (底牌) 的详细对局日志，用于训练分析
pnpm test:training
```

**打包部署**
```bash
# 标准构建 (Vercel / Netlify)
pnpm build

# 阿里云特定路径构建 (Base Path: /texas-holdem)
pnpm build:aliyun
```
