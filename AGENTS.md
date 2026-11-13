# Agent rules

The default branch is `main` (there is no `master`). The owner cannot approve PRs and shipping fast matters more than reviews, so agents have free room to merge to `main` on their own once the gates below pass.

## Merge to `main` yourself when

- Checks are green: `mise run check` (typecheck + oxlint + vitest, about 7s) and `pnpm run build` pass locally, and any CI or Vercel checks on the PR pass. CI runs the same `check` before deploying.
- There are no conflicts with `origin/main`. Fetch first, and if `main` moved, merge it into your branch and resolve conflicts before merging.
- The change is yours and finished. Do not merge half-done work.

## Where code goes

Feature folders under `src/features/<slice>/` with a public `index.ts`, pure shared code in `src/domain/` and `src/shared/`, tests colocated. Read `docs/architecture.md` for the layout, the import rules oxlint enforces and the "how to add a feature or fix" recipe.

## How

- Routine work: commit and push straight to `main`, no PR needed.
- Larger or risky changes: open a PR from a branch, wait for checks, then merge it yourself with `gh pr merge --merge`. Do not wait for a human review.
- Keep commits conventional and atomic. No co-author lines.

## Do not

- Do not force-push `main`, rewrite its history or skip hooks.
- Do not discard, stash or overwrite uncommitted changes you did not make. Other agents share this checkout, so do risky git operations in a worktree under `$HOME/.worktrees/bidding-wizards/<keywords>`.
- Do not merge with failing checks or unresolved conflicts, even to ship faster. Fix the cause or report the blocker.
- Do not publish anywhere outside this repo (Substack, X, deploy approvals) without explicit approval.

## After merging

- Say what shipped and which checks passed.
- If you could not verify something (for example a Vercel preview behind login), say so.
