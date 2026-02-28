# atprotocdn

A Vite + React + TypeScript app for browsing and organizing uploads.

## Vercel-first deployment

This repo is configured to deploy cleanly on Vercel:

- `vercel.json` defines Vite as the framework and `dist` as the output directory.
- SPA rewrites send all routes to `index.html`, so React Router paths like `/uploads` and `/i/:id` work on refresh.

### One-click flow in Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, choose **Add New... → Project** and import this repo.
3. Keep the detected settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add required environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy.

## Local development

```bash
npm install
npm run dev
```

## Build and preview locally

```bash
npm run build
npm run preview
```

## Tech stack

- Vite
- React
- TypeScript
- shadcn/ui
- Tailwind CSS
