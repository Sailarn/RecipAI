# RecipAI Design System — Implementation Plan

Design vision: **Liquid Glass** — frosted amber surfaces, AI violet accents, organic geometry (iOS 26 style).
Source: `RecipAI Design System/` — `colors_and_type.css` is the master token file; `preview/*.html` are the interactive specs.

---

## Phase 1 — Foundation (tokens, fonts) ✅ Done

- [x] Create `app/styles/tokens.css` — all DS CSS variables (colors, type, glass, radius, shadow, spacing, animation)
- [x] Import `tokens.css` in `globals.css` before `shadcn.css`
- [x] Load **Fraunces** display font via `next/font/google` in `layout.tsx`
- [x] Wire `fraunces.variable` to `<html>` className alongside Inter
- [x] Remap `shadcn.css` `:root`/`.dark` to DS semantic tokens (`--action-primary`, `--bg-base`, `--fg-1`, etc.)
- [x] Fix `@theme inline` radius values to exact DS pixels (8/12/16/20/24/28/32px)
- [x] Simplify `base.css` — remove re-aliasing blocks, add `.glass`, `.glass-card`, `.glass-nav` utilities
- [x] Update `ai-button.css` — use `--ai-bg-light`, `--ai-bg-mid`, `--ai-text`, `--shadow-ai`, `--duration-ai` tokens

---

## Phase 2 — Component visual update

- [ ] **Recipe Card** (`components/recipe-card.tsx`)
  - Dark mode: apply `glass-card` surface (`--glass-card-*` tokens)
  - Radius: `--radius-2xl` (24px, iOS 26 style)
  - Shadow: `--shadow-card` → hover: `--shadow-card-hover`
- [ ] **Bottom Nav** (`components/bottom-nav.tsx` or similar)
  - Apply `glass-nav` surface (`--glass-nav-*` tokens)
  - Active pill: `--glass-pill-*` tokens with `backdrop-filter`
  - Container: `--radius-pill` (32px)
- [ ] **Primary buttons** — `--action-primary` bg, `--radius-xl` (20px), `--shadow-md`
- [ ] **Destructive buttons** — `--action-destructive` bg, same radius
- [ ] **Input fields** — `--radius-md` (12px), `--border-default`, focus: `--border-focus`
- [ ] **Category badges** — `--cat-breakfast/lunch/dinner/dessert/snack/drink`, `--radius-full`
- [ ] **Sheet / Modal** — `--radius-3xl` (28px), `glass-subtle` surface
- [ ] **Recipe detail page** — recipe title uses `--font-display` (Fraunces) + `--type-display` or `--type-h1`

---

## Phase 3 — Glass surfaces & mesh background

- [ ] **Mesh background** — implement amber/red/violet orb gradients in the app shell:
  ```css
  background: var(--mesh-orb-amber), var(--mesh-orb-red), var(--mesh-orb-violet), var(--mesh-bg-base);
  ```
- [ ] **Dark mode glass audit** — verify `.glass-card` and `.glass-nav` degrade gracefully in light mode
  (reference: `RecipAI Design System/preview/glass-surfaces.html`)
- [ ] **Nav pill drag state** — use `--glass-pill-drag-*` tokens on active drag interaction

---

## Phase 4 — Typography pass

- [ ] Apply `--font-display` (Fraunces) to recipe titles in card and detail views
  ```tsx
  className="font-[family-name:var(--font-display)]"
  ```
- [ ] Apply semantic type classes (`--type-h2`, `--type-h3`, `--type-h4`) to section headings
- [ ] Apply `--type-label` and `--type-caption` to metadata (time, servings, author)
- [ ] Apply `--type-badge` to category chips
- [ ] Audit hardcoded `text-*` Tailwind classes and replace with DS type scale where meaningful
- [ ] Reference: `RecipAI Design System/preview/type-scale.html`, `type-weights.html`

---

## Phase 5 — Animation & interaction polish

- [ ] Card hover/press: `--ease-spring` + `scale(1.02)` / `scale(0.97)`
- [ ] Page / route transitions: `--ease-smooth`, `--duration-normal`
- [ ] Button press feedback: `--transition-scale` on `:active`
- [ ] Add `--transition-colors` to all interactive elements (links, buttons, inputs)
- [ ] Reference: `RecipAI Design System/preview/component-buttons.html`, `component-ai-button.html`

---

## Phase 6 — Preview & validation

- [ ] Open `RecipAI Design System/preview/` HTML files to verify visual parity
- [ ] Test light ↔ dark mode switch on all affected surfaces
- [ ] Validate on iPhone 15 Pro viewport (393 × 852)
- [ ] Check WCAG contrast: text on glass surfaces — especially `--fg-2` on `--glass-card-bg`
- [ ] Verify Fraunces loads correctly (check Network tab for font file)

---

## DS token quick-reference

| Token | Value | Use |
|-------|-------|-----|
| `--action-primary` | blue-600 / blue-500 dark | Primary buttons, links |
| `--ai-accent` | violet-500 / violet-400 dark | AI button glow, badges |
| `--food-accent` | amber-500 / amber-400 dark | Food category highlights |
| `--font-display` | Fraunces | Recipe titles, hero text |
| `--radius-2xl` | 24px | Recipe cards |
| `--radius-xl` | 20px | Primary buttons |
| `--glass-card-*` | amber-tinted glass | Dark mode card surfaces |
| `--glass-nav-*` | amber-tinted glass | Floating bottom nav |
| `--shadow-ai` | violet glow | AI import button |
