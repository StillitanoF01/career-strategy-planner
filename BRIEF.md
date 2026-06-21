# BRIEF.md — Career Strategy Planner ("Workbench")

> Hand this file to Claude Code together with `DESIGN.md`. Build the app exactly to the design system in `DESIGN.md` (the "Workshop Bench" theme). Where this brief and `DESIGN.md` overlap on visuals, `DESIGN.md` wins.

---

## 1. What we're building

A single-page web application that helps an architecture student (and graduates) decide **what to do next in their career** by pulling everything into one tactile "workbench": live jobs, the skills they're missing, local talks/events on a map, relevant competitions, and relevant scholarships — all matched against the projects they've already completed.

The metaphor (from `DESIGN.md`): **skills are tools on a pegboard, finished projects are labelled drawers, and choosing the next move is "opening the bench."** Every feature should reinforce that the user is a competent maker taking stock of their shop, not a passive job-seeker scrolling a feed.

### Five features (modules)
1. **Job Searcher** — live hiring firms + top architecture companies (Adzuna API).
2. **Skill Gap Checker** — reads the user's completed-project markdown files and tells them which skills the live jobs want that their projects don't show.
3. **Local Talks Checker** — architecture talks/events near the user, shown on a map.
4. **Competition Checker** — architecture competitions matched to the user's completed projects.
5. **Scholarship Checker** — scholarships matched to the user's completed projects.

---

## 2. Hard constraints (do not violate)

These shape every technical decision in this brief.

- **No AI / no LLM calls in the running app.** All "matching," "gap detection," and "relevance" is done with deterministic logic: keyword/taxonomy matching, string normalisation, and scoring. There must be **no** call to OpenAI, Anthropic, or any paid inference service from the app or its serverless functions. The app must cost **$0 per use** to run beyond hosting.
- **No paid/keyed map service.** Use **Leaflet + OpenStreetMap tiles** (free, no API key, no billing). Do **not** use Google Maps.
- **API keys are never exposed to the browser.** Adzuna keys (and any others) live only in serverless functions / environment variables, never in client code or the bundle.
- **Free libraries only.** No service that requires a credit card to function.
- **Graceful when offline/blocked.** Every feature must show a useful empty/error state (in the shop-foreman voice from `DESIGN.md`) if an external source is down. The app must never crash to a white screen.

---

## 3. Tech stack

- **Vite + React** (already scaffolded), JavaScript or TypeScript — prefer **TypeScript** for the data shapes below.
- **Routing:** `react-router-dom`.
- **Styling:** plain CSS or CSS Modules driven by **CSS custom properties (design tokens)** mirroring `DESIGN.md`. Tailwind is acceptable only if every token from `DESIGN.md` is mapped into the theme config — but plain CSS variables are preferred to keep the build simple.
- **Map:** `leaflet` + `react-leaflet`, OpenStreetMap tiles.
- **Markdown parsing (client):** `marked` or `react-markdown` for display; a small custom parser for skill extraction (see §7.2).
- **Icons:** Tabler outline icons (`@tabler/icons-react`) — `DESIGN.md` specifies Tabler.
- **Fonts:** Oswald (display) + Archivo (body), loaded via `@fontsource` or Google Fonts `<link>`.
- **Serverless functions:** a top-level `/api` folder of Vercel-style functions (each file = one endpoint). These hold secrets and do all outbound calls (Adzuna, events, scraping). In dev, run them via `vercel dev` **or** a small Vite middleware/proxy so the React app calls `/api/...` the same way in dev and prod.
- **Scraping (server side only):** `cheerio` (HTML parsing) + native `fetch`. Scraping happens **only** inside serverless functions, never in the browser (CORS + key safety + reliability).
- **State/persistence:** React state + `localStorage` for the user's profile and saved/pinned items. No database required.

---

## 4. Architecture & data flow

```
Browser (React app)              Serverless /api (holds secrets)        External
─────────────────────            ────────────────────────────          ────────────
Job Searcher        ──fetch──►   /api/jobs/search    ───────────►       Adzuna API
                    ──fetch──►   /api/jobs/top-companies ───────►       Adzuna API
Local Talks         ──fetch──►   /api/events         ───────────►       Eventbrite* / Ticketmaster
Competition Checker ──fetch──►   /api/competitions   ───scrape──►       competition sites
Scholarship Checker ──fetch──►   /api/scholarships   ───scrape──►       scholarship sites
Skill Gap Checker   ── reads local .md files in-browser ─┐
                                                          └─ matches against jobs (client logic, no AI)
```

Rule: **the browser only ever calls `/api/*` (same origin) and reads local files the user provides.** It never calls Adzuna/Eventbrite/etc. directly.

\* See §7.3 — Eventbrite's public event-search API was retired; the brief defines a fallback so the map feature still works.

---

## 5. Suggested file structure

```
career-strategy-planner/
├─ api/                          # serverless functions (secrets live here)
│  ├─ jobs/
│  │  ├─ search.js               # GET /api/jobs/search?country=&page=&what=
│  │  └─ top-companies.js        # GET /api/jobs/top-companies?country=
│  ├─ events.js                  # GET /api/events?lat=&lng=&radius=&q=
│  ├─ competitions.js            # GET /api/competitions  (scrapes + returns JSON)
│  └─ scholarships.js            # GET /api/scholarships   (scrapes + returns JSON)
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                    # router + app shell (header/nav)
│  ├─ theme/
│  │  ├─ tokens.css              # all DESIGN.md color/space/type tokens as CSS vars
│  │  └─ base.css                # global element styles, fonts, rules/hairlines
│  ├─ components/                # Button, EyebrowTag, StatusBadge, DrawerCard, PegboardStrip, etc.
│  ├─ pages/
│  │  ├─ Bench.tsx               # landing / dashboard ("the bench")
│  │  ├─ Jobs.tsx
│  │  ├─ SkillGap.tsx
│  │  ├─ Talks.tsx
│  │  ├─ Competitions.tsx
│  │  └─ Scholarships.tsx
│  ├─ lib/
│  │  ├─ api.ts                  # typed client wrappers around /api/*
│  │  ├─ projects.ts            # load + parse user's .md project files
│  │  ├─ skills.ts              # skill taxonomy + extraction + matching (NO AI)
│  │  └─ storage.ts             # localStorage profile + pinned items
│  └─ data/
│     ├─ skills-taxonomy.json   # controlled vocabulary of architecture skills
│     └─ profile.example.json
├─ .env.example                  # documents required keys (never commit real .env)
└─ README.md                     # setup + how to run
```

---

## 6. Design system hook

Implement `DESIGN.md` literally. Concretely:

- Put every token from the `DESIGN.md` colour table into `src/theme/tokens.css` as CSS custom properties: `--bg-base`, `--bg-panel`, `--bg-card`, `--ink`, `--ink-muted`, `--line`, `--accent-rust`, `--accent-rust-bg`. **One accent only (rust).**
- Typography: Oswald 500–600 uppercase for headlines/nav/buttons; Archivo 400–500 for body. Use the scale in `DESIGN.md` (h1 32/600, h2 22/500, body 15–16/400, eyebrow 11/500 uppercase, 0.06–0.08em tracking).
- Layout: flat surfaces, **no shadows**, border-radius ≤ 3px, structure via hairline rules (`--line`) not elevation. 2px `--ink` rule under the header and above the footer.
- The **pegboard icon strip** on the landing page is the signature moment — 5 flush cells (one per feature) with a single Tabler outline icon each, `--ink-muted`, hovering to `--ink` (no scale).
- Reusable components to build (match `DESIGN.md` exactly): primary Button (rust), secondary Button (ink outline), Status badge, Eyebrow tag (ink fill), Pegboard strip, Drawer/record card.
- Voice everywhere: plain, terse, "stenciled on a crate." "Open the bench," not "Get started." Empty states read like a foreman's note: what's missing + what to do about it.

---

## 7. Feature specifications

For each feature: purpose → data source → endpoint(s) → UI → data shape → logic → states.

### 7.1 Job Searcher

**Purpose:** Show firms hiring now and the top architecture companies, filterable by country and search term.

**Data source:** Adzuna API (requires `app_id` + `app_key`, kept server-side).

**Serverless endpoints:**
- `GET /api/jobs/search?country={country}&page={page}&what={term}`
  - Calls Adzuna `https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id=…&app_key=…&what={term}&results_per_page=20`.
  - `country` is an Adzuna country code (`au`, `gb`, `us`, …). **Default `au`** (user is in Australia). `what` defaults to `architecture`.
- `GET /api/jobs/top-companies?country={country}`
  - Calls Adzuna `https://api.adzuna.com/v1/api/jobs/{country}/top_companies?app_id=…&app_key=…&what=architecture`.

Both endpoints: read keys from `process.env.ADZUNA_APP_ID` / `ADZUNA_APP_KEY`, pass through pagination, normalise the response to the shapes below, and return `502` with a friendly message if Adzuna fails.

**Client data shapes:**
```ts
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;        // human-readable, e.g. "Sydney, NSW"
  salaryMin?: number;
  salaryMax?: number;
  created: string;         // ISO date
  url: string;             // apply/details link
  description: string;     // plain text snippet
};

type TopCompany = { name: string; vacancies: number; averageSalary?: number };
```

**UI:** A drawer-card grid of jobs (each card = one "drawer": Oswald uppercase company label top-left, title, location, salary range, posted date, a rust "VIEW →" secondary button). A side or top panel "TOP COMPANIES" list (rank, name, vacancy count) styled as a stamped list. Controls: country selector, search input (defaults to "architecture"), pagination (`← / →`). A live `[OPEN]` status badge when results are fresh.

**States:** loading (skeleton drawer cards), empty ("No openings matched. Widen the country or term."), error ("Adzuna didn't answer. Try again shortly.").

---

### 7.2 Skill Gap Checker

**Purpose:** Compare the skills the live jobs are asking for against the skills evidenced in the user's completed-project markdown files, and report the gaps.

**Data source:** the user's **completed-project `.md` files**. Two ingestion methods (build **both**):
1. **Drag-and-drop** one or more `.md` files onto a drop zone.
2. **Folder picker** — use the File System Access API (`showDirectoryPicker`) where supported, falling back to `<input type="file" webkitdirectory>` to select the whole folder. Read all `.md` files inside.

No Google Drive OAuth. The user points the app at the files/folder (e.g. their synced Drive/OneDrive folder). Parsed projects are kept in memory for the session and a lightweight summary cached in `localStorage`.

**Project file format (document this in README so the user writes compatible files):** standard markdown. The parser should extract:
- Title (first `# H1`).
- Any `**Skills:**` / `Tools:` / `Software:` lines, and any `## Skills` section (comma- or bullet-separated).
- The full body text (used as a secondary keyword source).

```ts
type Project = {
  fileName: string;
  title: string;
  declaredSkills: string[];   // from explicit Skills/Tools lines
  bodyText: string;           // remainder, lower-cased, for keyword scan
};
```

**Skill taxonomy (`src/data/skills-taxonomy.json`):** a controlled vocabulary of architecture skills/tools with synonyms, e.g.
```json
[
  { "skill": "Revit", "aliases": ["revit", "bim", "autodesk revit"] },
  { "skill": "Rhino", "aliases": ["rhino", "rhinoceros", "grasshopper"] },
  { "skill": "AutoCAD", "aliases": ["autocad", "auto cad", "cad drafting"] },
  { "skill": "Adobe Suite", "aliases": ["photoshop", "indesign", "illustrator"] },
  { "skill": "Sustainability / ESD", "aliases": ["passive design", "esd", "sustainable design", "section j"] },
  { "skill": "Documentation", "aliases": ["construction documentation", "da", "cd set", "detailing"] }
]
```
(Seed it with ~25–40 common architecture skills; make it easy to extend.)

**Matching logic (deterministic, NO AI):**
1. From the current job results, extract a frequency map of taxonomy skills found in job `title` + `description` (match against `aliases`, case-insensitive, word-boundary aware).
2. From the parsed projects, build the set of skills the user demonstrably has (`declaredSkills` + taxonomy hits in `bodyText`).
3. **Gap = skills demanded by jobs (ranked by demand frequency) that are NOT in the user's skill set.** Also surface **strengths** = demanded skills the user already has.
4. Score/sort gaps by job-demand frequency so the most valuable missing skill is first.

**UI:** Two columns of drawer cards — "TOOLS YOU HAVE" (strengths) and "TOOLS TO ACQUIRE" (gaps, each with a count: "Wanted by 7 of 20 jobs"). A small bar/tally per skill. An import panel at top showing which project files are loaded (drawer labels). Voice: "You're missing Revit. 7 of 20 local jobs ask for it."

**States:** no files loaded ("Drop your finished-project files here, or pick the folder."), files loaded but no jobs fetched ("Load jobs first so we know what the shop wants."), no gaps ("Nothing missing for these openings. Widen the search.").

---

### 7.3 Local Talks Checker (map)

**Purpose:** Show architecture-related talks/events near the user on a map.

**⚠️ Source reality check:** Eventbrite **retired its public event-search endpoint** — its API now only lists events for organisations the token owns, so it **cannot** reliably surface "architecture talks near me." Build the events function with a **swappable adapter** so the source can change without touching the UI:
- **Primary (as requested):** Eventbrite, via `EVENTBRITE_TOKEN`, for any organisation/IDs the user supplies. If it returns nothing usable, fall through to:
- **Fallback (recommended, free, has search + geo):** Ticketmaster Discovery API (`TICKETMASTER_KEY`) keyword + lat/long radius search, which returns venue coordinates ideal for the map. (Meetup is an alternative if preferred.)

`GET /api/events?lat={lat}&lng={lng}&radius={km}&q={query}` returns a normalised list regardless of which source answered.

```ts
type EventItem = {
  id: string;
  name: string;
  start: string;            // ISO datetime
  venue: string;
  lat: number; lng: number;
  url: string;
  source: "eventbrite" | "ticketmaster";
};
```

**UI:** Full-width **Leaflet + OpenStreetMap** map with rust pin markers; clicking a pin opens a drawer-card popup (name, date, venue, "DETAILS →"). A list panel beside/under the map mirrors the pins and is clickable (selecting a list row pans the map). Default centre = the user's profile location (Sydney if unset). Query defaults to "architecture / design / urbanism." Search term + radius controls.

**States:** locating ("Set your city in your profile to centre the map."), empty ("No talks found nearby. Widen the radius."), error (foreman note).

---

### 7.4 Competition Checker

**Purpose:** Surface architecture competitions and rank them by relevance to the user's completed projects.

**Data source:** live scraping (server-side only), per your decision. Implement a **pluggable scraper**: `api/competitions.js` iterates a list of source adapters, each adapter `fetch`es a competitions listing page and uses `cheerio` to extract entries. If one source breaks, the others still return. Cache results in-memory per cold start (and optionally a short TTL) to avoid hammering sources.

```ts
type Competition = {
  id: string;
  title: string;
  organiser?: string;
  deadline?: string;       // ISO if parseable
  location?: string;
  tags: string[];          // derived from title/description keywords
  url: string;
  source: string;          // which site it came from
};
```

**Relevance ranking (NO AI):** build a keyword profile from the user's projects (taxonomy skills + notable nouns from titles). Score each competition by keyword overlap with that profile (and recency of deadline). Sort highest-overlap first; show *why* it matched ("Matched: housing, timber, adaptive reuse").

**UI:** Ranked drawer-card list — title, organiser, deadline (with a rust badge if closing within 14 days), matched-tags row, "OPEN →". Filter by tag; toggle "Only show matches to my projects."

**States:** no projects loaded ("Load your projects to rank these by fit."), scrape failed ("Couldn't reach the competition boards. Showing nothing rather than guessing."), empty.

**Note for the builder:** scraping third-party sites is inherently fragile and subject to each site's terms — keep adapters small, isolated, and easy to update, and respect `robots.txt`/rate limits.

---

### 7.5 Scholarship Checker

**Purpose:** Same pattern as Competitions, for scholarships/grants relevant to the user's projects and profile.

**Data source:** live scraping via `api/scholarships.js` with the same pluggable-adapter design.

```ts
type Scholarship = {
  id: string;
  title: string;
  provider?: string;
  amount?: string;
  deadline?: string;
  eligibility?: string;
  tags: string[];
  url: string;
  source: string;
};
```

**Relevance ranking (NO AI):** same keyword-overlap scoring against the project profile, plus simple eligibility hints from the profile (study level, country). Sort by fit + deadline.

**UI:** Ranked drawer cards (title, provider, amount, deadline badge, eligibility line, matched tags, "OPEN →"). Filters: tag, "closing soon," "matches my profile."

**States:** mirror the Competition checker.

---

## 8. Personalisation & onboarding

The app should feel like *the user's own bench*. Keep it lightweight and local (no accounts).

- **First-run onboarding (one short panel, foreman voice):** capture a **Profile** stored in `localStorage`:
  ```ts
  type Profile = {
    name?: string;
    city: string;            // map centre + default job/event location
    country: string;         // Adzuna code, default "au"
    studyLevel: string;      // e.g. "Master of Architecture, Year 1"
    interests: string[];     // free tags: "housing", "adaptive reuse", "timber"…
    units: "metric" | "imperial";
  };
  ```
- **Projects as identity:** once the user loads their completed-project files, their drawer labels appear on the Bench ("YOUR DRAWERS: 6 projects, 14 skills"). This single import personalises Skill Gap, Competitions, and Scholarships at once.
- **Pinning / saved bench:** any card (job, talk, competition, scholarship) can be **pinned** to a "MY BENCH" tray, persisted in `localStorage`. This becomes the user's working shortlist.
- **Editable taxonomy & interests:** the user can add skills/interests, which immediately changes matching — making results feel personal and improvable.
- **Greeting:** the Bench header greets by name and shows a one-line "next move" derived deterministically (e.g. "Top gap: Revit · 3 competitions closing soon · 5 talks this month").

---

## 9. Interactivity & "customisable" requirements

- **The Bench (landing) is a live dashboard**, not static: the pegboard strip's 5 icons route to the modules and each shows a tiny live count badge (jobs found, gaps, talks, competitions, scholarships).
- **Cross-module wiring:** clicking a skill gap can pre-filter Jobs ("show jobs wanting Revit") and Competitions/Scholarships (filter by that tag). This interconnection is the product's "intuitive" payoff.
- **Filters and sorts** on every list (by date/deadline, by fit, by location).
- **Pin/unpin** everywhere with instant persistence.
- **Theme is token-driven**, so the look is centrally customisable; optionally expose a "shop light/dark" toggle later (keep rust as the sole accent).
- **Keyboard-friendly & accessible:** focus states on the ink-outline pattern, WCAG-AA contrast (the canvas/ink palette already passes), alt text on icons.
- **Responsive:** the flush grid collapses to a single column on mobile; the map stacks above its list.

---

## 10. How to use the site (end-user flow — put a short version in README and an in-app "?" panel)

1. **Open the bench.** First visit asks for your city, country, study level, and a few interest tags. (You can skip and set later.)
2. **Load your drawers (projects).** Go to Skill Gap → drop your finished-project `.md` files in, or pick your project folder. The app reads them and learns your skills.
3. **See who's hiring.** Open Jobs. Pick your country/term. Browse hiring firms and the top architecture companies. Pin any you like.
4. **Find your gaps.** Back on Skill Gap, the app shows the tools the live jobs want that your projects don't yet show — ranked by how many jobs ask for each. Strengths show on the left.
5. **Plan to close a gap.** Click a gap to see matching jobs, competitions, and scholarships that build that skill.
6. **Find local talks.** Open Talks for a map of architecture events near you. Pin the ones worth attending.
7. **Chase competitions & scholarships.** Open those modules for opportunities ranked by fit to *your* projects, with "closing soon" flags.
8. **Work from your bench.** Everything you pinned lives in MY BENCH as your shortlist.

---

## 11. Setup & environment

`.env.example` (document, never commit real values):
```
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
EVENTBRITE_TOKEN=            # optional / primary events source
TICKETMASTER_KEY=           # optional / fallback events source
```
README must cover: install (`npm install`), run app + functions in dev, where to get each free API key, the expected project-`.md` format, and how to deploy (e.g. Vercel) with env vars set in the dashboard. **No secret ever appears in `src/` or the client bundle.**

---

## 12. Build order (do it in phases — verify each before moving on)

1. **Shell & theme:** tokens.css from `DESIGN.md`, app shell (panel header + 2px ink rule), router, reusable components (Button, EyebrowTag, StatusBadge, DrawerCard, PegboardStrip), the Bench landing with the pegboard strip. *Verify: matches `DESIGN.md` visually.*
2. **Jobs + serverless:** `/api/jobs/*`, Jobs page, dev proxy so `/api` works locally. *Verify: real Adzuna data renders, no key in bundle.*
3. **Projects + Skill Gap:** file/folder ingestion, parser, taxonomy, matching, Skill Gap page. *Verify: gaps computed correctly from sample files, fully offline/no-AI.*
4. **Talks map:** `/api/events` with adapter + fallback, Leaflet map + list. *Verify: pins render from normalised data.*
5. **Competitions + Scholarships:** scraper functions with pluggable adapters, ranking, pages. *Verify: graceful when a source fails.*
6. **Personalisation polish:** profile onboarding, pinning/MY BENCH, cross-module filters, live count badges, responsive + a11y pass.

---

## 13. Definition of done (acceptance criteria)

- All five modules work end-to-end against live sources, with loading/empty/error states in the `DESIGN.md` voice.
- **Zero** API keys in client code or the built bundle; all external calls go through `/api`.
- **Zero** AI/LLM/paid-inference calls anywhere; all matching is deterministic and free.
- Map uses Leaflet + OpenStreetMap (no billing).
- Skill Gap, Competitions, and Scholarships all react to the user's loaded projects.
- Profile + pins persist across reloads (`localStorage`).
- Visually faithful to `DESIGN.md`: one rust accent, flat surfaces, hairline rules, Oswald/Archivo, pegboard strip, ≤3px radius, no shadows.
- App never white-screens; every external failure degrades to a useful message.
- Responsive and keyboard-accessible; AA contrast.

---

## 14. Open items for you (Frank) to confirm with the builder

- **Adzuna keys:** sign up at developer.adzuna.com (free) and have `app_id`/`app_key` ready.
- **Events source:** decide Eventbrite vs Ticketmaster as the working source given Eventbrite's search limitation (Ticketmaster is the reliable free path for "talks near me on a map").
- **Scrape targets:** give the builder 2–3 specific competition sites and 2–3 scholarship sites you want as the initial adapters (and check each site's terms/`robots.txt`).
- **Project `.md` format:** confirm your finished-project files include an explicit `Skills:`/`Tools:` line so the matcher is accurate (the parser also scans body text as backup).
