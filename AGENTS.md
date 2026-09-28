# AGENTS.md

## Agent skills

### Issue tracker

GitHub Issues on `stanleyman08/receipt-scanner-web`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Implementation workflow

Every implementation or fix, whether it arrives as `mattpocock-skills:implement`, an issue number or a plain request, follows the same shape. Nobody has to ask for it.

1. **Before writing code, load the skills the change touches:**
   - `frontend-design` for new UI or any visual change, `vercel-react-best-practices` for React code, and `vercel:nextjs` for anything in `app/` or `proxy.ts`.
   - `neon-postgres` for anything in `lib/db/`, `lib/receipt-store.ts` or `scripts/`, or the tables. The Neon skills are pinned in `skills-lock.json` but not committed (`.agents/` is gitignored), so install them from `neondatabase/agent-skills` if `.agents/skills/` is missing. To change a table that already exists, or after upgrading Better Auth, follow the comment at the top of `lib/db/schema.ts`: the CREATE statements only reach new databases, so existing ones need a statement in `SCHEMA_CHANGES`. Run `pnpm setup-db` on the `dev` branch first, then on the main branch when the change ships.
   - `vercel:vercel-functions` for the route handlers in `app/api/`, which run as Vercel Functions.
   - `vercel:env-vars` for environment variable changes, and `vercel:deployments-cicd` for deploy or Git integration changes.
   - `mattpocock-skills:tdd` for any behaviour change: write or extend the test first (`tests/` for code in `lib/`, a `*.test.tsx` file next to the component for UI).
   - `mattpocock-skills:diagnosing-bugs` for any fix: find the root cause before patching.
   - Any other installed skill that directly applies. Loading one costs little; missing one costs a review round.
2. **Verify** (Node 24 from `.nvmrc`, pnpm only): `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` must pass. Lefthook runs Biome on every commit and the tests plus the type check on every push. For UI changes, also check the page in a browser with `pnpm dev`, at phone and desktop widths. `pnpm dev` must use the Neon `dev` branch from `.env.development.local`; if that file is missing, stop and ask rather than run against the main (production) branch. There's one shared account and no test account, so ask the user to sign in, and ask before running a scan (each scan is a billed Textract call).
3. **After the change passes, review the diff with:**
   - `mattpocock-skills:code-review` for standards and spec, and `code-review` for bugs.
   - `web-design-guidelines` when it touched UI.
   - `security-review` when it touched sign-in or the session checks (`proxy.ts`, `lib/auth.ts`, `lib/auth-session.ts`, `app/login/`, `components/LoginForm.tsx`, `scripts/create-account.mts`), the server actions in `app/actions.ts`, the route handlers in `app/api/`, the SQL in `lib/receipt-store.ts` or `lib/db/`, environment variables, or the AWS credentials in `lib/textract.ts`.
   - A check of the diff against the skills loaded in step 1.
   Fix the important violations before reporting done. Mention the minor ones and leave them.

`mattpocock-skills:implement` does not name these skills. It only says to use `mattpocock-skills:tdd` and `mattpocock-skills:code-review`, so the entry point never substitutes for this rule.

## Deploying

The GitHub repo is connected to Vercel, so **every push to `main` deploys to production**. Only push when the checks pass and the reviews above are done. After changing an environment variable, redeploy for it to take effect.

Preview deployments get their own Neon database branches, copied from `main`. After a PR merges, delete its database branch in the Neon console (`vercel integration open neon receipt-scanner-db`): the free plan allows 10 branches.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
