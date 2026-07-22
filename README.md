# F1 Dashboard

A Formula 1 data visualization dashboard built with React, TypeScript, and D3/Recharts. Explore live championship standings, race results, driver and circuit profiles, and race strategy — all pulled from public F1 APIs.

## Features

- **Customizable dashboard** — drag-and-drop cards (standings, calendar, title fight tracker) with an edit mode powered by dnd-kit
- **Championships** — full-season drivers' and constructors' standings
- **Race Center** — race calendar and per-race results, lap positions, and tire strategy
- **Driver profiles** — individual driver stats and season history
- **Circuit guide** — track maps and circuit details
- **Head-to-head** — compare two drivers or constructors directly
- **Performance analysis** — charts for lap position trends, tire strategy, and driver heatmaps
- **Light/dark theme**

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [React Router](https://reactrouter.com/) for routing
- [TanStack Query](https://tanstack.com/query) for data fetching/caching
- [D3](https://d3js.org/) and [Recharts](https://recharts.org/) for charts
- [dnd-kit](https://dndkit.com/) for drag-and-drop dashboard editing
- [Lucide](https://lucide.dev/) for icons

## Data Sources

- [Jolpica F1](https://api.jolpi.ca/ergast/f1) — championship standings, race schedules, and results (Ergast-compatible)
- [OpenF1](https://openf1.org/) — session, stint, and pit stop data for strategy charts

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Other scripts

```bash
npm run build    # type-check and build for production
npm run preview  # preview the production build locally
npm run lint      # run ESLint
```

## Project Structure

```
src/
├── api/          # API clients (Jolpica, OpenF1)
├── components/
│   ├── charts/     # D3/Recharts visualizations
│   ├── dashboard/  # Dashboard cards and edit-mode UI
│   ├── layout/     # App shell, sidebar, topbar
│   └── ui/         # Shared UI primitives
├── context/      # Theme, season, and dashboard layout providers
├── hooks/        # Data-fetching hooks
├── pages/        # Route-level views
└── types/        # Shared TypeScript types
```

## Deployment

Configured for [Vercel](https://vercel.com/) (see `vercel.json`) as a single-page app with client-side routing.
