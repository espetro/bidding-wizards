# BidBench — Bidding Wizards

**Know your margin before the bid leaves your hands.**

Paste a job in plain words — or drop a PDF blueprint — and get an itemized contractor bid: materials, labor, contingency, markup, GST, and the profit you'll keep. No sign-in, no API key, no card.

- **Live product:** https://bidding-wizards.vercel.app/ — NZ sample at `/#/bid?loc=nz&sample=1` (also `/bid?loc=nz&sample=1`)
- **Pitch deck:** https://bidding-wizards.vercel.app/pitch.html
- **Booked ARR:** $133.8K across 4 paying customers, incl. a $90K/yr interiors firm

## What buyers get

- **Material lines** — item × quantity × unit cost, plus square-footage lines (L × W × $/sf)
- **Labor** — role × hours × rate
- **Contingency % and markup %** — editable, applied to cost-to-complete
- **Itemized breakdown** — materials, labor, contingency, markup → bid total
- **Profit and margin** — always on the page, with a margin-floor warning and a one-click fix
- **GST on its own line** — AU/NZ/CA/UK rates, or 0 if exempt, plus a GST-inclusive total
- **Overrun stress test** — margin kept after a 10% cost overrun, before you send
- **Exports** — copy bid as client-ready text, print a formatted bid sheet, Procore budget CSV, QuickBooks IIF estimate
- **Saved drafts** — the working bid survives a refresh

## AI where it reads. Code where it counts.

Buyers type jobs in their own words, so an on-device n-gram/catalog matcher itemizes the brief — instant, no API key, non-trade briefs qualified out instead of hallucinated. Blueprint PDFs are classified by TypeSafe **Jev** (`@ai-sdk/typesafe-ai`, model `jev-latest`) on `POST /api/documents` using `TYPESAFE_API_KEY` — drawings vs job forms, with occupied/hidden conditions bumping contingency. GitHub Pages has no API, so the same heuristic runs in the browser. Jev never invents quantities — the upload flow reads quantities from the PDF text layer in the browser (scans without text need pasting).

Every dollar figure is plain arithmetic you can check by hand:

```
direct      = materials + labor
contingency = direct × contingency %
bid         = (direct + contingency) × (1 + markup %)
margin      = profit ÷ bid
```

## Who it's for

Small trade contractors — electrical, roofing, remodel, landscaping, interiors — who quote in spreadsheets and find out the margin after the bid goes out. Built for the shop, not enterprise pre-construction.

## Team

- **Quino Terrasa** — product & AI engineer (MaibornWolff, Volkswagen AG, ex-stealth co-founder)
- **Yahvin Gali** — ML engineer (SAP Research SLM fine-tuning; CV research UCLA/VMG)
- **Kamayani Rai** — data & ML engineer (DXC, ASU — mammography detection mAP 0.54 → 0.68)

## Run locally

Requires [mise](https://mise.jdx.dev) (`mise install` pins Node 22 + pnpm 12) or any Node 22 + pnpm 12 setup.

```bash
pnpm install
pnpm test
pnpm run dev
```

Dev server: [http://127.0.0.1:5173](http://127.0.0.1:5173)

```bash
pnpm run build    # app + pitch deck → dist/
pnpm run preview
```

Preview: [http://127.0.0.1:4173](http://127.0.0.1:4173)

- Landing: `/` (hash: `#/`)
- Estimator + blueprint take-off: `#/bid`
- Pitch deck: `/pitch.html` (source: `pitch/slides.md`, rebuild with `pnpm run deck`)

Vite `base` is `./` and routing is `HashRouter` so GitHub Pages can host the `dist` folder at the repo root or a project URL.

## Pages deploy

Push to `main`. The workflow in `.github/workflows/pages.yml` builds `dist` and deploys with GitHub Pages. Enable Pages in the repo settings (source: GitHub Actions).
