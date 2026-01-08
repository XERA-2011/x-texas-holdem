# X-TEXAS-HOLDEM

- **GitHub Pages**: [https://xera-2011.github.io/x-texas-holdem/](https://xera-2011.github.io/x-texas-holdem/)
- **Vercel**: [https://x-texas-holdem.vercel.app/](https://x-texas-holdem.vercel.app/)
- **Cloudflare Pages**: [https://x-texas-holdem.pages.dev/](https://x-texas-holdem.pages.dev/)

### 特性 (Features)
- **超级电脑模式 (Super AI)**: 集成蒙特卡洛模拟 (Monte Carlo Simulation) 与对手建模，提供 GTO 风格的高难度对战体验。
- **模式切换**: 游戏内支持一键切换 `Normal AI` / `Super AI`。

### 开发与测试 (Command Guide)

**启动开发**
```bash
# 本地开发 (端口 2011)
pnpm dev
```

**模拟测试**
```bash
# 运行 AI 对局模拟 (测试普通 & 超级模式)
npx tsx src/lib/run-simulation.ts

# 仅测试超级AI模式 (Heads-up 胜率验证)
npx tsx src/lib/run-simulation.ts --mode=super
```

**打包部署**
```bash
# 标准构建 (Vercel / Netlify)
pnpm build

# 阿里云特定路径构建 (Base Path: /texas-holdem)
pnpm build:aliyun
```
