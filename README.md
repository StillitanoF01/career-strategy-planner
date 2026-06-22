# Workbench — Career Strategy Planner

A single-page app that helps an architecture student decide their next career move from one
tactile "workbench": live jobs, the skills they're missing, local talks on a map, competitions,
and scholarships — all matched against the projects they've already finished.

Built to the **Workshop Bench** design system (`DESIGN.md`). Vite + React + TypeScript.

## Principles (hard constraints)

- **$0 per use.** No AI/LLM/paid-inference calls anywhere. All matching, gap detection and
  relevance is deterministic keyword/taxonomy logic.
- **No keys in the browser.** Every external call goes through same-origin `/api/*` serverless
  functions that hold the secrets. The bundle never contains an API key.
- **Free map.** Leaflet + OpenStreetMap tiles (no key, no billing). No Google Maps.
- **Never white-screens.** Every feature degrades to a useful foreman-voice message if a source
  is down.

## Stack

- Vite + React + TypeScript, `react-router-dom`
- Plain CSS driven by design tokens (`src/theme/tokens.css`)
- `leaflet` + `react-leaflet` (OpenStreetMap)
- `marked` (project markdown display), `@tabler/icons-react`, Oswald + Archivo via `@fontsource`
- Serverless `/api` functions (Vercel-style), `cheerio` for server-side scraping
- State in React + `localStorage` (no database, no accounts)

## Setup

```bash
npm install
cp .env.example .env   # then fill in your free keys
npm run dev            # app + /api on http://localhost:5173
```

### How `/api` works in dev vs prod

The functions in `/api` are Vercel-style handlers. In production they deploy to Vercel as real
serverless functions. In **dev**, a small Vite middleware (`dev/vite-api-plugin.ts`) runs the
same files at `/api/*`, so the browser calls `/api/...` identically in both — no `vercel dev`
login required. You can still use `vercel dev` if you prefer.

### Keys (all free)

| Variable | Where to get it | Used by |
|---|---|---|
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | https://developer.adzuna.com/ | Jobs |

The **Talks map uses a static, curated events file** (`src/data/events.json`) — no key, no
live API. (Eventbrite retired its public event-search API, so events are gathered offline and
baked into the file.) `TICKETMASTER_KEY` is therefore optional; the legacy `/api/events`
function is left in place but unused.

**Secrets live only in `.env` / your host's env vars. They are never imported into `src/`.**

## Refreshing the Talks events

The Talks page reads `src/data/events.json` (shape: `EventItem[]` — name, organizer, start ISO,
venue, **lat/lng**, category `walk|academic|cpd|tour`, free, optional badge, url). Events go
stale, so refresh every few months:

1. Gather upcoming architecture events (e.g. from Eventbrite) — title, date, venue, link, category.
2. Geocode each venue to `lat`/`lng` (the map needs coordinates). The build script
   `/_geo-events.mjs`-style approach uses free OpenStreetMap Nominatim; or geocode manually.
3. Replace `src/data/events.json` and push — Vercel redeploys. No code change, no AI at runtime.

## Project markdown format (for Skill Gap)

Point the Skill Gap page at your finished-project `.md` files (drag-drop or folder picker).
For best matching, include an explicit skills line. The parser reads:

- The first `# H1` as the title
- Any `**Skills:**` / `Tools:` / `Software:` line, and any `## Skills` section (comma- or
  bullet-separated)
- The full body text as a secondary keyword source

Example:

```markdown
# Riverside Housing Renewal

**Skills:** Revit, Rhino, Photoshop, timber

## Skills
- Grasshopper
- Construction Documentation

A multi-residential adaptive-reuse project in mass timber, documented in Revit.
```

The skill vocabulary lives in `src/data/skills-taxonomy.json` — extend it freely.

## Adding competition / scholarship sources

`api/competitions.ts` and `api/scholarships.ts` ship with an empty, pluggable `ADAPTERS` list and
a documented `cheerio` template. Add 2–3 listing pages each (check their terms and `robots.txt`
first). A broken source is isolated — the others still return. Results are ranked by keyword
overlap with your loaded projects.

## Deploy (Vercel)

1. Push the repo and import it at vercel.com.
2. Add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in Project → Settings → Environment Variables
   (the only keys needed — Talks runs off the static events file).
3. Deploy. The `/api` files become serverless functions automatically. **Redeploy after adding
   or changing env vars** — they only take effect on a new build.

## How to use

1. **Open the bench.** First visit asks for your city, country, study level and interests.
2. **Load your drawers.** Skill Gap → drop your finished-project `.md` files or pick the folder.
3. **See who's hiring.** Jobs → pick country/term, browse openings and top firms, pin favourites.
4. **Find your gaps.** Skill Gap shows the tools live jobs want that your projects don't, ranked
   by demand. Click a gap to jump to matching jobs.
5. **Find local talks.** Talks → a map of architecture events near you.
6. **Chase competitions & scholarships.** Ranked by fit to your projects, with "closing soon"
   flags.
7. **Work from MY BENCH.** Everything you pin lives on the Bench as your shortlist.

## Scripts

- `npm run dev` — app + dev `/api`
- `npm run build` — typecheck + production build
- `npm run preview` — preview the built bundle
