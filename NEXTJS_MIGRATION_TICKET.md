# Next.js Migration & UI Polishing: Development Board

Welcome to your Next.js migration track! This document serves as your learning and implementation checklist. We will break down the frontend rewrite into bite-sized daily tickets.

---

## 🎫 Ticket #1 (Today): Project Scaffolding & Global Theme System

### 🎯 Goal
Create a clean Next.js (App Router) project structure, migrate your existing dark-mode design system tokens, and implement the persistent shell layout (Sidebar + Main Content Area).

### 🛠️ Daily Micro-Tasks

- [ ] **Task 1: Scaffold Next.js App**
  Create a fresh Next.js project in a temporary workspace directory (or within a `/next-frontend` subfolder) using the latest App Router structure:
  ```bash
  npx create-next-app@latest next-frontend --js --app --src-dir --no-tailwind --no-eslint --no-import-alias
  ```
  *(Hint: Since you are learning Next.js, utilizing `--src-dir` keeps your source files organized under `/src/app`).*

- [ ] **Task 2: Port Global Styles & Design System**
  Open `/src/app/globals.css` in your new Next.js app, clean out the default Next.js starter styles, and copy over the CSS variable tokens from your existing `index.css`:
  * Root colors (`--bg-primary`, `--bg-secondary`, `--accent-primary`, etc.)
  * Dark theme aesthetic overrides
  * Global font config (Inter font family setup)
  * Shimmer animation keyframes for skeletons

- [ ] **Task 3: Implement the App Shell Layout**
  In Next.js App Router, the global wrapper is managed inside `src/app/layout.js`.
  * Recreate the HTML boilerplate structure.
  * Define the overall layout container class (e.g. `<div className="app">`) wrapping the children.
  * Create a placeholder `Sidebar` component in a new directory (`src/components/Sidebar.jsx`) and import it directly into `layout.js` so it renders persistently across all page route views.

---

### 💡 Staff Engineer Tips for Next.js:
1. **Server vs. Client Components**: In the App Router, files are **React Server Components (RSC)** by default. Since your `Sidebar` and hooks will utilize state (`useState`, `useEffect`) and WebSocket connections, add the `"use client"` directive at the very top of those files to make them Client Components.
2. **Global CSS**: In Next.js, global styles (`globals.css`) must be imported only inside the root layout file: `import './globals.css';` at the top of `src/app/layout.js`.
3. **Fonts**: Next.js has a built-in font loader (`next/font/google`). Once you scaffold the project, check how `next/font/google` loads the `Inter` font in `layout.js` to avoid external Google Fonts network calls!
