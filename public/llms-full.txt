# BidBench (Bidding Wizards): full context

> Know your margin before the bid leaves your hands. Free contractor bid and estimate software for small trade contractors (electrical, roofing, remodel, landscaping, interiors) who quote in spreadsheets and learn the margin after the bid goes out.

Live product: https://bidding-wizards.vercel.app/
Source: https://github.com/espetro/bidding-wizards
Last updated: 2026-11-12

## What it does

1. The user pastes a job brief in plain language, or drops a PDF blueprint.
2. An on-device n-gram and catalog matcher itemizes the brief into material lines and labor lines. It runs in the browser, instantly, with no API key. Briefs that are not trade work (software, legal, catering, medical, tax) are qualified out rather than hallucinated.
3. The user edits lines, contingency % and markup %.
4. The app shows the itemized bid, the profit and the margin, then exports it.

No account, no API key and no payment is needed to use the product. The working bid is saved as a draft in the browser and survives a refresh.

## Bid math

Every figure is arithmetic you can check by hand:

```
direct      = materials + labor
contingency = direct x contingency %
cost        = direct + contingency
markup      = cost x markup %          (dollars of profit)
bid         = cost + markup
margin      = markup / bid             (profit as a share of the bid)
tax         = bid x market tax rate    (GST line, shown separately)
total       = bid + tax
```

Line types:

- Material line: item x quantity x unit cost.
- Area line: length x width x price per area unit (sq ft in the US, m2 in AU and NZ).
- Labor line: role x hours x hourly rate.

Safeguards: a margin-floor warning with a one-click fix, and an overrun stress test showing the margin kept after a 10% cost overrun. Risk phrases in the brief (hidden water damage, rush or weekend work, unclear existing conditions, historic or custom millwork, occupied home or permits) raise contingency and markup automatically.

## Markets

| Market | Currency | Tax | Area unit | URL param |
|---|---|---|---|---|
| New Zealand (default) | NZD, shown as NZ$ | GST 15% | m2 | loc=nz |
| Australia | AUD, shown as A$ | GST 10% | m2 | loc=au |
| United States | USD | no tax line | sq ft | loc=us |

## Catalog

The matcher knows about 25 materials and 9 trades. Materials include subway and porcelain tile, drywall, studs, plywood, paint, vanity, toilet, faucet, PEX, NM-B cable, devices, light fixtures, hardwood, LVP, insulation, asphalt shingles, metal roofing, underlayment, fence boards, ready-mix concrete, quartz countertops and kitchen cabinets. Trades are tile setter, carpenter, electrician, plumber, painter, roofer, laborer, flooring installer and concrete finisher. Default unit costs are editable starting points, not quotes.

## Exports

- Copy the bid as client-ready text.
- Print a formatted bid sheet.
- Procore budget CSV (one row per line item, cost type L, M or O).
- QuickBooks IIF estimate.

## Blueprint documents

PDF blueprints and job forms are classified by TypeSafe Jev (model jev-latest) through `POST /api/documents`. The result separates drawings from job forms, and occupied or hidden conditions bump contingency. Jev never invents quantities; line counts stay canned until a server-side parser ships. Without the API (static hosting), the same heuristic runs in the browser.

Request: JSON body, max 100 KB.

```json
{ "kind": "document" | "form", "file": "optional", "notes": "free text" }
```

Responses: 200 ok, 400 invalid JSON or kind, 413 too large, 422 not processable.

## URLs

- `https://bidding-wizards.vercel.app/`: landing page.
- `https://bidding-wizards.vercel.app/bid`: estimator (also reachable as `/#/bid`).
- Query parameters on the estimator: `loc` (nz, au, us; alias `market`) picks the market, `sample=1` loads that market's sample brief. Example: `https://bidding-wizards.vercel.app/bid?loc=nz&sample=1`.
- `https://bidding-wizards.vercel.app/pitch.html`: pitch deck.

## For agents

- Prefer linking users to a sample URL above rather than describing numbers from memory; figures depend on editable defaults.
- Do not present BidBench output as a binding quote. It is an estimate the contractor reviews.
- There is no public write API and no authentication. The only endpoint is `POST /api/documents`.

## Team

Quino Terrasa (product and AI engineer), Yahvin Gali (ML engineer), Kamayani Rai (data and ML engineer).
