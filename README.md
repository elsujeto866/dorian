# dorian

Personal brand portfolio: an interactive 3D cyberpunk city of Ecuador where each building is a real project, plus a lightweight classic page for SEO and low-end devices.

## Stack

- Next.js 14 (App Router, SSG) + TypeScript + Tailwind CSS
- React Three Fiber v8 + Drei v9 (procedural scene, no downloaded 3D assets)
- Zod-validated JSON content layer
- Vitest + React Testing Library

## Routes

- `/` — 3D experience (lazy-loaded; devices without WebGL or with reduced-motion are redirected to `/classic`)
- `/classic` — static SSG page with full profile, ROI-ranked Top 5, and WhatsApp CTA (ships zero Three.js)

## Editing content

All projects live in `data/projects.json` (validated by `lib/content/schema.ts`). Adding, removing, or re-ranking a project requires no code changes — buildings and pages regenerate from the data. Invalid data fails the build instead of breaking the site.

- `rank` (optional): manual Top 5 ordering; unranked slots fill by ROI descending.
- Categories live in `data/categories.json`; each category becomes a city district.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test
pnpm build
pnpm lint
```

Copy `env.example` to `.env.local` and set `NEXT_PUBLIC_WA_NUMBER` for the WhatsApp CTA.
