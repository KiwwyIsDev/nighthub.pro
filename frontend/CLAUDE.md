# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NightX Hub is a Next.js 15 web application for providing Roblox script access. It's a freemium service where users can generate time-limited keys through checkpoint systems and access Lua scripts.

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom gradients and animations
- **UI Components**: Radix UI primitives with shadcn/ui
- **Animations**: Framer Motion
- **Package Manager**: pnpm
- **Deployment**: PM2 (ecosystem.config.js)

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Architecture

### File Structure
- `/app/` - Next.js App Router pages and layouts
  - `page.tsx` - Homepage with hero section and script display
  - `key/page.tsx` - Key management dashboard
  - `layout.tsx` - Root layout with theme provider
- `/components/` - Reusable React components
  - `ui/` - shadcn/ui components (buttons, cards, etc.)
  - `navbar.tsx` - Navigation with logo and Discord link
  - `particle-background.tsx` - Animated background effects
  - `theme-provider.tsx` - Dark theme management
- `/utils/` - Utility functions
  - `token.ts` - Cookie-based token management
- `/lib/utils.ts` - Tailwind class merging utility

### Key Features
1. **Token System**: UUID-based tokens stored in cookies for user identification
2. **Key Management**: Time-limited keys with creation, extension, and HWID reset
3. **Progress System**: Checkpoint-based freemium access (1 checkpoint per 8 hours)
4. **External Integrations**: Linkvertise and LootLab for earning checkpoints

### API Integration
All backend API calls go to `https://api.nighthub.pro/` endpoints:
- `/user/info` - Get user progress and keys
- `/key/create` - Generate new keys
- `/key/extend` - Add time to existing keys
- `/key/reset-hwid` - Reset hardware ID for keys
- `/lootlab/encrypt` - Generate LootLab tracking links

### Component Patterns
- All components use client-side rendering (`"use client"`)
- Framer Motion animations with staggered delays
- Gradient styling with purple/fuchsia theme
- Toast notifications using Sonner
- Form handling with controlled state

### Configuration Notes
- ESLint and TypeScript errors are ignored during builds
- Images are unoptimized in Next.js config
- Tailwind uses HSL CSS variables for theming
- PM2 runs on port 4950 in production

## Development Notes

- The project uses absolute imports with `@/` prefix
- All external scripts in `/public/` are loaded for analytics/ads
- No test framework is currently configured
- The navbar includes a Discord invite link and branding