# ID-A — Kentucky Market Intelligence Dashboard

A lightweight, single-page web app for tracking commercial interiors project opportunities across Kentucky's Tier 1 and Tier 2 markets.

## Features

- **Heat map** of Kentucky showing project activity by market (Louisville, Lexington, N. Kentucky, Frankfort, Georgetown, Elizabethtown, Bowling Green)
- **Bar + donut charts** — projects by market and by vertical
- **Pipeline tracker** — filterable by vertical (Healthcare, Gov't, Higher Ed, K-12, Corporate)
- **Manual project intake form** — log leads from any source
- **BuildingConnected CSV importer** — smart column mapping, auto-detects city/vertical/stage from BC export
- **Export to CSV** — take your pipeline anywhere
- **Persists to localStorage** — data survives page refreshes

## Markets tracked

**Tier 1** — Louisville · Lexington · Northern Kentucky (Florence/Union)

**Tier 2** — Elizabethtown (Ford Battery Plant) · Bowling Green (WKU) · Georgetown (Toyota)

**State capital** — Frankfort (state funding source)

## Products & services

Furniture · Glass fronts · Prefab walls · Casework · Headwalls · Interior Design

---

## Setup

No build tools required. This is a plain HTML/CSS/JS app.

### Run locally

```bash
# Option 1 — just open the file
open index.html

# Option 2 — local server (recommended to avoid CORS issues)
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

### Deploy to GitHub Pages

1. Push to your repository:

```bash
git clone git@github.com:jtheisen23/ID-A.git
cd ID-A
# copy these files into the cloned folder, then:
git add .
git commit -m "Initial commit — KY market intelligence dashboard"
git push origin main
```

2. In your GitHub repo: **Settings → Pages → Source → Deploy from branch → main → / (root)**

3. Your app will be live at: `https://jtheisen23.github.io/ID-A/`

---

## Daily bid fetching — setup

### 1. Get a SAM.gov API key (free)
1. Go to [sam.gov](https://sam.gov) → sign in → click your name → **API Keys**
2. Generate a System Account key
3. In your GitHub repo: **Settings → Secrets → Actions → New secret**
   - Name: `SAM_API_KEY`
   - Value: your key

The GitHub Actions workflow (`fetch-bids.yml`) runs every day at 4 AM Eastern and commits new bids to `data/auto-projects.json`.

### 2. Deploy the Cloudflare Worker (for the Fetch button)

The "Fetch daily bids" button in the dashboard uses a Cloudflare Worker proxy so your GitHub token is never exposed in the browser. All users can click the button without needing credentials.

**Deploy the Worker:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create**
2. Name it `ida-trigger` (or anything you like)
3. Paste the contents of `worker/trigger-proxy.js` into the editor
4. Click **Deploy**

**Add secrets to the Worker:**
Go to your Worker → **Settings → Variables → Add variable** (mark as encrypted):
- `GH_TOKEN` — a GitHub Personal Access Token with `repo` scope ([create one here](https://github.com/settings/tokens))
- `ALLOWED_ORIGIN` — your GitHub Pages URL: `https://jtheisen23.github.io`
- `TRIGGER_SECRET` — any password you choose (optional but recommended)

**Connect the dashboard:**
The first time anyone clicks "Fetch daily bids," they'll be prompted for the Worker URL:
```
https://ida-trigger.yourname.workers.dev/trigger
```
This URL is saved in their browser. If you set a `TRIGGER_SECRET`, also save it under `ida_trigger_secret` in the browser's localStorage via the console:
```js
localStorage.setItem('ida_trigger_secret', 'your-secret-here')
```

Or share the Worker URL + secret with your team once.

**Cloudflare Workers free tier** allows 100,000 requests/day — more than enough.



1. In BuildingConnected Bid Board Pro: **Reports → select your report → export arrow → Export to Excel/CSV**
2. In the app: go to **Import CSV**
3. Drop your file, map columns (auto-detected), preview, import

The importer auto-maps:
- City/location → Tier 1/2 market
- Project type → vertical (Healthcare, Gov't, Higher Ed, K-12, Corporate)
- Bid status → stage (Act now, Warm lead, Watch, Out to bid)

---

## File structure

```
ID-A/
├── index.html        # Single-page app shell
├── css/
│   └── style.css     # All styles
├── js/
│   ├── data.js       # Constants, seed projects, market/source data
│   └── app.js        # All app logic (nav, charts, form, import, export)
└── README.md
```

---

## Customization

**Add a new market:** Edit the `MARKETS` array in `js/data.js`

**Add a new vertical:** Edit `VERT_LABELS`, `VERT_COLORS`, `VERT_CLASS` in `js/data.js` and the `<select>` options in `index.html`

**Change seed projects:** Edit `SEED_PROJECTS` in `js/data.js` — these only load if no localStorage data exists

**Add quick links:** Edit `QUICK_LINKS` in `js/data.js`
