# Receipt Scanner

A web application for scanning receipts using your phone's camera. It reads each receipt with AWS Textract, files it into a bucket (one category for one month of one company), and exports a bucket or a whole year to Excel. Built with Next.js 16, React 19, Neon Postgres and Better Auth.

## Features

- Two companies, Carino and Peko Peko, each with its own buckets, receipts and exports, and a switcher at the top
- Scan receipts using your device's camera, or upload a photo
- Automatic data extraction (vendor, date, subtotal, GST, total, invoice number)
- Each scan's photo and what Textract returned for it are kept for 3 days (the newest 300 at most), so a misread field can be traced
- Receipts filed into the bucket for their date, with pickers to choose another bucket or the other company
- One shared account for everyone at both companies, with sign-in attempts rate-limited
- Export a bucket, or a company's whole year, to Excel
- Responsive design for mobile and desktop

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm (the version is pinned in `package.json`)
- The Vercel CLI, logged in to the team that owns the project
- An AWS account with Textract access

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd receipt-scanner-web
pnpm install   # also installs the git hooks
```

### 2. Environment variables

The Neon database comes from the Vercel Marketplace, which sets its variables on the Vercel project. Pull them, along with the Better Auth secret and the AWS keys, into `.env.local`:

```bash
vercel link
vercel env pull .env.local --yes
```

`.env.example` lists every variable. The database is in AWS us-west-2, so `vercel.json` runs the functions in `pdx1` and `AWS_REGION` is `us-west-2`.

### 3. Database tables

Create the tables, or bring existing ones up to date after a schema change. It's safe to re-run.

```bash
pnpm setup-db
```

It uses `.env.local`, so it sets up the main database. To set up the `dev` branch from step 5, run it with that branch's settings: `node --env-file=.env.local --env-file=.env.development.local scripts/setup-db.mts`.

### 4. The shared account

Everyone signs in with one shared account; there is no sign-up page. Create it, or reset its password, with a password of 8 to 128 characters. A reset must use the account's email (the script refuses to create a second account), and it signs out every device. The parentheses run it in a subshell, so the password never stays in your terminal session:

```bash
( read -r ACCOUNT_EMAIL; read -rs ACCOUNT_PASSWORD; export ACCOUNT_EMAIL ACCOUNT_PASSWORD; pnpm create-account )
```

### 5. A database branch for local development

`pnpm dev` should use a `dev` branch of the database rather than the main one. After steps 3 and 4, create the branch from `main` in the Neon console (`vercel integration open neon receipt-scanner-db`), so it starts with the tables and the account. Then put its connection strings in `.env.development.local`, which overrides `.env.local` under `pnpm dev` and which `vercel env pull` never overwrites:

```env
DATABASE_URL=<dev branch, pooled>
DATABASE_URL_UNPOOLED=<dev branch, direct>
```

Preview deployments get their own copy of the main database automatically. Delete a pull request's database branch once it merges, since the free plan allows 10 branches.

### 6. AWS Textract

1. Create an IAM user in AWS with the `AmazonTextractFullAccess` permission
2. Create an access key for that user
3. Add the access key ID and secret to the Vercel project's environment variables, then pull them again

## Running the App

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start

# Checks
pnpm lint        # Biome: formatting and lint
pnpm typecheck
pnpm test        # Vitest
```

Lefthook runs Biome on staged files before each commit, and the tests and type check before each push.

## Tracing a misread

When a scan reads a field wrong, its photo (`image`, the JPEG the app sent) and what Textract returned for it (`textract`) are in the `scans` table for 3 days, as long as it stays among the newest 300. Find the scan by the time the receipt was saved. Look at the photo to see what's printed, and replay the response through `readReceipt` in `lib/receipt-reading.ts` to see why: pass it `textract.ExpenseDocuments[0]`, and the scan's `created_at` as the scan date, since dates are read relative to it. To try a fix that changes the photo or the Textract call, send the photo again. Older scans are deleted each time a new one is kept. Both columns hold everything printed on the receipt, so keep them out of the repo, which is public.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Database**: Neon Postgres, plain SQL over the serverless driver
- **Sign-in**: Better Auth
- **OCR**: AWS Textract (AnalyzeExpense API)
- **Camera**: react-webcam
- **Tooling**: pnpm, Biome, Lefthook, Vitest with Testing Library

## Project Structure

```
├── app/
│   ├── actions.ts            # Server actions for buckets and receipts
│   ├── api/
│   │   ├── auth/             # Better Auth endpoints
│   │   └── scan-receipt/     # Reads a receipt photo with Textract
│   ├── login/                # Sign-in page
│   └── page.tsx              # Loads buckets and receipts for the main screen
├── components/
│   ├── ReceiptsApp.tsx       # The main screen
│   ├── capture-flow/         # Camera, review, saving and result screens
│   ├── BucketPicker.tsx      # Chooses the bucket a receipt is filed in
│   └── ...
├── lib/
│   ├── auth.ts               # Better Auth setup
│   ├── db/                   # Neon connection and table definitions
│   ├── receipt-store.ts      # Reads and writes buckets, receipts and scans
│   ├── receipt-reading.ts    # Turns a Textract result into receipt details
│   ├── textract.ts           # AWS Textract call
│   └── excel.ts              # Excel export
├── proxy.ts                  # Sends signed-out visitors to the sign-in page
├── scripts/                  # setup-db and create-account
├── tests/                    # Vitest tests
├── CONTEXT.md                # Glossary: bucket, receipt, account, ...
└── docs/adr/                 # Decisions, such as why Neon and Better Auth
```

## License

MIT
