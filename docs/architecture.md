# Architecture

How the code is laid out and why, so a small change touches few files. Assessed 2026-11-12 against the first 21 commits.

## Why changes were slow

The cost was not the toolchain. `tsc -b`, `vitest run` and `vite build` each take about 2s, and the whole `check` gate runs in about 7s. It came from where the code lived.

1. One god component. `src/pages/Estimator.tsx` was 664 lines, 15% of all source, and was touched by 12 of the 16 commits that changed `src/`. It held 13 `useState` calls, the header toolbar, the job reader, the materials and labor tables, the pricing inputs, the summary and the margin guard. Every feature, however small, edited the same file, so concurrent agents collided on it and every diff needed the whole file in context. While this assessment ran, one commit on `main` grew it to 779 lines (+263 lines across 18 files) to add markets in the URL.
2. Shotgun state. Adding one persisted bid field meant edits in about six places: the `Draft` type, `loadDraft`, the `useState` initializer, the save effect's dependency list, the `newBid` reset and every hand-built `EstimateInput`. That object was assembled 5 times in the page. The GST, margin floor and overrun defaults were duplicated between the page and `draft.ts`.
3. A flat `lib/` with no boundaries. 11 modules mixed pure bid math, feature logic (job reader, blueprint take-off), browser I/O (fetch, download) and the server contract. `estimate.ts` had a fan-in of 13, and `export` depended on `bid-sheet` for `JobInfo` while the page depended on `export`, which made a hidden cycle.
4. Partial gates. The Pages deploy was red after the pnpm 12 migration until `main` fixed it, `server/` and `api/` were typechecked only once the `typecheck` script was added, and there was no linter, so nothing stopped a slice from reaching into another one.

## Decision

We use feature folders (vertical slices) with a public `index.ts` and a thin shared kernel. We did not adopt Feature-Sliced Design: its 6 layers (app, pages, widgets, features, entities, shared) are too heavy for about 4k lines and two routes. We did not do a rewrite, because the pure modules were already well tested and only the page needed splitting.

## Layout

```
src/
  main.tsx, App.tsx, styles.css   app shell: routing, global CSS, service worker
  domain/                         shared kernel, pure TS, no React
    estimate.ts                   bid lines, breakdown math, margin helpers
    catalog.ts                    price book and pricing defaults
    markets.ts                    NZ, AU, US, MX: tax, currency, area unit, UI language, ?loc= parsing
    job.ts                        JobInfo
  shared/                         tiny generic helpers (money, pct, parseNumber, hashRoute)
  features/<slice>/               one folder per user-facing capability, flat
    index.ts                      the slice's public API, the only thing other slices import
    *.test.ts                     tests sit next to the code
server/, api/                     Jev classification endpoint (Node)
```

Slices today:

- `bid-sheet`: the `/bid` page. `useBidSheet.ts` owns all state and actions, `useMarketFromUrl.ts` reads and writes `?loc=` and `?sample=`, `draft.ts` holds persistence, `freshDraft(market)` and `initialDraft`, and each section is one component (`BidToolbar`, `JobReader`, `MaterialsSection`, `LaborSection`, `PricingInputs`, `BidSummary`). `Estimator.tsx` is layout only. `i18n.ts` holds the Spanish strings; sections read `sheet.t` and row components `useT()`.
- `job-reader`: free-text notes to bid lines (`readJob`).
- `documents`: blueprint upload, PDF text take-off (`pdfText`, `pdfTakeoff`) and form classification. `server/` and `api/` import `documentDecision.ts` directly because the index pulls in React.
- `export`: plain-text bid, Excel (`xlsx`), Procore CSV, QuickBooks IIF.
- `landing`: the `/` page.

## Rules (oxlint enforces the first three)

- A slice imports another slice only through `../<slice>` (its index), never `../<slice>/<file>`.
- `domain/` and `shared/` import nothing from `features/` and nothing from React.
- `App.tsx` and `main.tsx` import slices through their index.
- Keep slice folders flat. If a slice grows past about 12 files, split it into two slices instead of nesting.
- A cross-slice need goes in the providing slice's `index.ts`. If two slices need the same pure type or math, move it to `domain/`.

## How to add a feature or fix

1. Find the slice. UI on `/bid` lives in `features/bid-sheet`, parsing lives in `job-reader`, and file formats live in `export`. Bid math lives in `domain/estimate.ts`. If nothing fits, create `features/<name>/` with an `index.ts`.
2. Add a persisted bid field this way: add it to `Draft` and `freshDraft` in `bid-sheet/draft.ts` (and to `loadDraft` if old drafts need a fallback), then read it from `sheet.draft` and write it with `sheet.set("field", value)`. If the math uses it, add it to `EstimateInput` in `domain/estimate.ts` and to the `input` memo in `useBidSheet.ts`.
3. Add a new section on the bid page as its own `XSection.tsx` that takes `{ sheet }`, and add one line in `Estimator.tsx`.
4. Put new logic in a pure function next to its slice, with a colocated `*.test.ts`. Keep components thin.
5. Run `mise run check` (typecheck, lint, tests, about 7s), then `pnpm run build` before merging.

## Follow-ups (not done yet)

- Shared UI primitives (button, number field, card section). The same Tailwind class strings repeat across the bid-sheet sections and landing.
- `job-reader/readJob.ts` is 702 lines and now the largest file. Split the area-phrase parser (`parseSqFtPhrases`) from catalog matching when it next changes.
- `documents`: the mock take-off and the real Jev contract share a file set. Separate them when a real parser ships server-side.
- Market-aware money formatting is passed down as `sheet.formatMoney`. If the landing page or exports need it too, move it to `domain/markets.ts`.
- `public/bidbench.html` (521 lines) is a separate legacy page, kept as is.
- A formatter (oxfmt) is deferred. Adopting it now would reformat every file under agents with in-flight work. If wanted, land it later as one dedicated commit.
