# Layro Free UI

Production-ready React and Tailwind UI components for AI applications, dashboards, SaaS products, and modern web applications.

[![Layro](https://img.shields.io/badge/Layro-UI%20Components-11BF58)](https://layropro.com)

## What is Layro?

Layro is a React and Tailwind UI library built for developers creating modern products with AI coding tools.

Instead of starting every product screen from scratch, Layro provides production-ready components designed around real product workflows, states, accessibility, and responsive behavior.

Explore the full library:

https://layropro.com/components

## Free components

This repository contains a curated selection of free Layro components.

### AI UI

- [AI Chat](https://layropro.com/components/ai-chat)
- [Chat Message](https://layropro.com/components/chat-message)
- [Streaming Response](https://layropro.com/components/streaming-response)
- [Thinking State](https://layropro.com/components/thinking-state)
- [Message Actions](https://layropro.com/components/message-actions)
- [Prompt Input](https://layropro.com/components/prompt-input)

### Dashboard & SaaS UI

- [Data Table](https://layropro.com/components/data-table)
- [Charts](https://layropro.com/components/chart)
- [Members Table](https://layropro.com/components/members-table)
- [Plan Picker](https://layropro.com/components/plan-picker)

### Essential UI

- [File Upload](https://layropro.com/components/file-upload)
- [Button](https://layropro.com/components/button)
- [Command Menu](https://layropro.com/components/command)
- [Dialog](https://layropro.com/components/dialog)
- [Auth Forms](https://layropro.com/components/auth)

## Getting started

Each component is a single self-contained `.tsx` file. Copy the ones you want into your project (for example `components/ui/`). Chat Message, Prompt Input, Streaming Response, Message Actions, Data Table, Dialog and Auth Forms import `./button`, so copy `button.tsx` next to them.

### 1. Install the dependencies

Every component needs React 18 or 19 and Tailwind CSS v4. Most also use:

```bash
npm i clsx tailwind-merge lucide-react framer-motion
```

A few need one more package:

| Component | Extra packages |
|---|---|
| Button | `@radix-ui/react-slot` |
| Charts | `recharts` |
| Data Table | `@tanstack/react-table` |
| Command Menu | `cmdk @radix-ui/react-dialog` |
| Dialog | `@radix-ui/react-dialog` |
| Auth Forms | `@radix-ui/react-checkbox @radix-ui/react-label input-otp` |

### 2. Add the theme

The components use the standard shadcn/ui colour variables (`background`, `card`, `foreground`, `muted`, `primary`, `border`, `ring`, `destructive`, `chart-1` to `chart-5`), so an existing shadcn/ui theme already covers most of them.

Copy [`styles/layro-free.css`](styles/layro-free.css) into your project and import it after Tailwind. It adds the success, warning and info colours, two shadows, and the animations for dialogs, menus and the AI components:

```css
@import "tailwindcss";
@import "./styles/layro-free.css";
```

Light and dark mode follow the `.dark` class, the same as shadcn/ui.

## Why Layro?

Layro components are designed around real product requirements rather than isolated visual examples.

Components include practical states and interactions such as:

- Loading and empty states
- Error and validation states
- Responsive behavior
- Keyboard interactions
- Accessible patterns
- Light and dark interfaces
- Real product workflows

The goal is simple: help developers move from an idea to a working product faster.

## React + Tailwind

Layro is built for modern React applications and uses Tailwind CSS for styling.

The components are designed to work well in:

- AI applications
- SaaS products
- Admin dashboards
- Analytics products
- Developer tools
- Internal tools
- Modern web applications

## Explore more

**Layro UI Components**  
https://layropro.com/components

**AI UI Components**  
https://layropro.com/ai-ui-components

**React Dashboard Components**  
https://layropro.com/react-dashboard-ui

**React & Next.js Templates**  
https://layropro.com/templates

**Documentation**  
https://layropro.com/docs

**Layro**  
https://layropro.com

## About this repository

This repository contains the free portion of the Layro UI library.

The full Layro library includes additional production-ready components, collections, and complete React & Next.js templates.

Visit https://layropro.com to explore the complete library.

---

Built by [Layro](https://layropro.com).
