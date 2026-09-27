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
   - `frontend-design` for new UI or any visual change, `vercel-react-best-practices` for React code, and `vercel:nextjs` for anything in `app/` or `middleware.ts`.
   - `vercel:vercel-functions` for the route handlers in `app/api/`, which run as Vercel Functions.
   - `vercel:env-vars` for environment variable changes, and `vercel:deployments-cicd` for deploy or Git integration changes.
   - `mattpocock-skills:tdd` for any behaviour change. There's no test runner yet, so ask before adding one, and say so when a change ships untested.
   - `mattpocock-skills:diagnosing-bugs` for any fix: find the root cause before patching.
   - Any other installed skill that directly applies. Loading one costs little; missing one costs a review round.
2. **Verify:** `npm run lint` and `npm run build` must pass (`next build` also type-checks). For UI changes, also check the page in a browser with `npm run dev`, at phone and desktop widths. Dev has no local stand-in or test account: it uses the Supabase project and AWS credentials in `.env.local`. Ask the user to sign in, and ask before saving, editing or deleting receipts or running a scan (each scan is a billed Textract call).
3. **After the change passes, review the diff with:**
   - `mattpocock-skills:code-review` for standards and spec, and `code-review` for bugs.
   - `web-design-guidelines` when it touched UI.
   - `security-review` when it touched sign-in or the session check (`middleware.ts`, `lib/supabase/`, `app/login/`), the route handlers in `app/api/`, Supabase queries or the RLS policies in `database/`, environment variables, or the AWS credentials in `lib/textract.ts`.
   - A check of the diff against the skills loaded in step 1.
   Fix the important violations before reporting done. Mention the minor ones and leave them.

`mattpocock-skills:implement` does not name these skills. It only says to use `mattpocock-skills:tdd` and `mattpocock-skills:code-review`, so the entry point never substitutes for this rule.

## Deploying

The GitHub repo is connected to Vercel, so **every push to `main` deploys to production**. Only push when the checks pass and the reviews above are done. After changing an environment variable, redeploy for it to take effect.
