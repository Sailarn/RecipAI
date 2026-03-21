# 🍳 Recipe App

A mobile-first, offline-capable Progressive Web App for saving and managing your favorite recipes with AI-powered URL parsing.

> **Status:** ✅ Iteration 1 Complete - Full CRUD MVP | 35 tests passing | 89% coverage

## ✨ Features

### Current (Iteration 1 - MVP)
- ✅ Full recipe CRUD (Create, Read, Update, Delete)
- ✅ Offline-first with IndexedDB storage
- ✅ PWA installable on mobile devices
- ✅ Dark/Light theme
- ✅ Bilingual: Ukrainian 🇺🇦 / English 🇬🇧
- ✅ Mobile-optimized UI (iPhone-first)
- ✅ Image preview support (URL/gallery upload)

### Planned (Iteration 2)
- 🔮 AI-powered recipe extraction from URLs
- 🔮 Smart servings calculator
- 🔮 Camera photo capture
- 🔮 Recipe sorting & search
- 🔮 Multi-provider AI support (Claude, OpenAI, Gemini)

## 🛠 Tech Stack

**Frontend:**
- [Next.js 15](https://nextjs.org/) with App Router (stable)
- [TypeScript 5.9](https://www.typescriptlang.org/)
- [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (iteration 2)
- [Dexie.js 4.x](https://dexie.org/) (IndexedDB wrapper)
- [React Hook Form 7.x](https://react-hook-form.com/) + [Zod 3.x](https://zod.dev/)
- [Bun 1.3+](https://bun.sh/) (package manager)
- [Biome 2.4](https://biomejs.dev/) (linting + formatting)

**Infrastructure:**
- [Vercel](https://vercel.com/) (deployment)
- [Sentry](https://sentry.io/) (error tracking)
- [ImageKit.io](https://imagekit.io/) (future: image hosting)

**Testing:**
- [Vitest](https://vitest.dev/) (unit tests)
- [React Testing Library](https://testing-library.com/react) (component tests)
- [Playwright](https://playwright.dev/) (future: E2E tests)

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Run tests
bun test

# Run tests with UI
bun run test:ui

# Generate coverage report
bun run test:coverage

# Lint and format code
bun run check

# Build for production
bun run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Installation (PWA)

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"
4. Tap "Add"

## 📚 Documentation

- **[Full Specification](./docs/SPECIFICATION.md)** - Complete project requirements and roadmap
- **Architecture** (coming soon)
- **API Documentation** (coming soon)

## 🗺️ Roadmap

- [x] Project setup and architecture
- [x] **Iteration 1:** CRUD MVP with offline support ← *✅ COMPLETE (35 tests, 89% coverage)*
- [ ] **Iteration 2:** AI parsing & servings calculator ← *next*
- [ ] **Iteration 3:** Accessibility improvements
- [ ] **Future:** Cloud sync, user accounts, recipe sharing

## 🧪 Testing

**Current Status:** ✅ 35 tests passing | 89% coverage

```bash
# Run all tests
bun test

# Run specific test file
bun test recipe-form

# Open test UI
bun run test:ui

# Coverage report
bun run test:coverage
```

**Coverage Breakdown:**
- Database layer: 100%
- Recipe detail: 100%
- Recipe list: 100%
- Delete modal: 100%
- Recipe form: 75%

**Test Strategy:**
- Unit tests for business logic (Vitest)
- Component tests for UI (React Testing Library)
- E2E tests for critical flows (Playwright - iteration 2)
- Target: 80%+ code coverage

## 🌍 Internationalization

Currently supports:
- 🇺🇦 Ukrainian (default)
- 🇬🇧 English

Translation contributions welcome!

## 📝 License

This is a personal learning project. License TBD.

## 🤝 Contributing

This is primarily a personal learning project, but feedback and suggestions are welcome!

---

**Built with ❤️ for personal use and skill development**