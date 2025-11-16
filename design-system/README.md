# Ikhaya Design System

Production-ready tokens, Tailwind extensions, and CSS utilities for the Ikhaya real-estate platform.

## What’s inside

- `tokens.ts` — TypeScript tokens for colors, typography, spacing, radius, shadows, borders
- `tailwind.extend.ts` — Tailwind `theme.extend` mapping for tokens (optional)
- `components.css` — Tailwind layers with utilities and component classes (cards, widgets, buttons, inputs, tables, typography)
- `icons.ts` — Lucide icon size and stroke helpers
- `example-next/` — Minimal Next.js App Router demo using the system

## Use in existing app (Vite + Tailwind v4)

1. Import the CSS once in your app’s global stylesheet (already done):

```css
/* client/src/index.css */
@import '../../design-system/components.css';
```

2. Use the classes and utilities in your components:

```tsx
<div className="card">
  <div className="typ-h2 mb-2">Recent Listings</div>
  <button className="btn btn-primary">Add Listing</button>
</div>
```

3. Optional: If you maintain a Tailwind config (e.g., Next.js), spread `themeExtend`:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import { themeExtend } from './design-system/tailwind.extend';

const config: Config = {
  theme: themeExtend as any,
  content: ['src/**/*.{ts,tsx}'],
};
export default config;
```

## Tokens

All exact tokens required by the spec are available in `tokens.ts`. Colors match:

- Primary: `#2563EB`, `#3B82F6`, `#60A5FA`, `#EFF6FF`
- Success/Warning/Error and Grays as specified

## Components

- `.card` — white, rounded-16, shadow-soft, padding-24
- `.widget` — card with scroll/fixed variants
- `.metric-card` — icon circle, numeric value, small label
- `.table-soft` — soft borders, comfortable row heights, zebra, hover
- `.input` — rounded-12, gray-100 background, subtle border
- `.btn`, `.btn-primary`, `.btn-secondary`

## Icons

Use Lucide icons with consistent sizes:

```tsx
import { Building2 } from 'lucide-react';
import { iconProps } from '../design-system/icons';

<Building2 {...iconProps('md')} />;
```

## Example app (optional)

```bash
cd design-system/example-next
pnpm install
pnpm dev
```

Open http://localhost:3000 to see the demo.
