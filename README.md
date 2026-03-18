# NeoPages

NeoPages now deploys as a single static HTML page.

## What this repository serves

- One page: `index.html`
- No JavaScript runtime in the served site
- No Next.js build step
- No API routes or dashboard in the deployed surface

The repository has been pruned down to the static deployment surface and minimal project metadata.

## Local preview

Serve the repository root with any static file server.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Vercel deployment

The root `vercel.json` now configures Vercel for a static deployment:

- Framework Preset: `Other`
- Build Command: empty
- Root output served directly from the repository
- All routes rewrite to `/index.html`

If this repository was previously connected to Vercel as a Next.js project, clear any old Build Command value in the Vercel dashboard so it does not override the static setup.

## Editing

To change the live site, edit `index.html`.

All styles are inline in that file so the served site stays a true single-page static document.
