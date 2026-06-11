# X-TEXAS-HOLDEM ♥️♠️♦️♣️

[![CI](https://github.com/XERA-2011/x-texas-holdem/actions/workflows/ci.yml/badge.svg)](https://github.com/XERA-2011/x-texas-holdem/actions/workflows/ci.yml)
[![Deploy](https://github.com/XERA-2011/x-texas-holdem/actions/workflows/deploy.yml/badge.svg)](https://github.com/XERA-2011/x-texas-holdem/actions/workflows/deploy.yml)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤️-ff69b4.svg)](https://github.com/XERA-2011/sponsor)

A lightweight, single-player Texas Hold'em game powered by advanced AI. No download required.

> 📱 **Mobile First**: Optimized for mobile browsers for the best immersive experience.

## 🌐 Live Demo

| Platform | URL |
|----------|-----|
| Cloudflare Pages | [x-texas-holdem.pages.dev](https://x-texas-holdem.pages.dev/) |
| Vercel | [x-texas-holdem.vercel.app](https://x-texas-holdem.vercel.app/) |
| Netlify | [x-texas-holdem.netlify.app](https://x-texas-holdem.netlify.app/) |
| GitHub Pages | [xera-2011.github.io/x-texas-holdem](https://xera-2011.github.io/x-texas-holdem/) |

## 🛠️ Commands

### Development
```bash
pnpm dev    # Start local server (Port 2011)
pnpm lint   # Lint code
```

### Testing & Simulation
```bash
pnpm test:unit      # Run unit tests
pnpm test:equity    # Verify Monte Carlo accuracy
pnpm test:scenarios # Run deterministic scenario tests
pnpm test:random    # Run random simulation (Default 10 rounds)
                    # Options:
                    #   pnpm test:random -- --rounds=50
                    #   pnpm test:random -- --extended  (Edge cases & Session resets)
                    #   pnpm test:random -- --super-ai  (Test Super AI logic)
                    #   pnpm test:random -- --stress    (Stress test 500+ rounds)
pnpm test:battle    # AI Battle (Normal vs Super)
pnpm test:training  # Generate training data (Self-play logs)
pnpm test:tune      # Benchmark Super AI tuning candidates
```

### Build
```bash
pnpm build          # Standard build
pnpm build:aliyun   # Build for custom base path
```
