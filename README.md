# Receipt Scanner Web

A web application for scanning receipts using your phone's camera, extracting data with AWS Textract, and storing/exporting receipt information. Built with Next.js 16, React 19, and Supabase.

## Features

- Scan receipts using your device's camera
- Automatic data extraction (vendor, date, subtotal, GST, total, invoice number)
- Cloud storage with Supabase
- Email/password authentication
- Export receipts to Excel
- Responsive design for mobile and desktop

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm (the version is pinned in `package.json`)
- AWS account with Textract access
- Supabase account

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd receipt-scanner-web
pnpm install   # also installs the git hooks
```

### 2. Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# AWS Textract Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Supabase Database Setup

Create a new Supabase project, then run the SQL files from `database/0.1.0/` in the Supabase SQL Editor in order:

```bash
database/0.1.0/01_buckets.sql
database/0.1.0/02_receipts.sql
```

This will create:
- `buckets` table - for organizing receipts by year, month, and category
- `receipts` table - for storing receipt data with bucket associations
- Appropriate indexes and Row Level Security policies

### 4. Supabase Authentication Setup

This app uses Supabase Auth for login. Since it's a personal app, you'll create a single user account manually:

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter your email and password
5. Check **Auto Confirm User**
6. Click **Create user**

Only this user will be able to log in to the app.

### 5. AWS Textract Setup

1. Create an IAM user in AWS with `AmazonTextractFullAccess` permission
2. Generate access keys for the IAM user
3. Add the access key ID and secret to your `.env.local`

Note: AWS Textract is available in select regions. The default region is `us-east-1`.

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **OCR**: AWS Textract (AnalyzeExpense API)
- **Camera**: react-webcam
- **Tooling**: pnpm, Biome, Lefthook, Vitest with Testing Library

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── scan-receipt/    # Receipt scanning API endpoint
│   │   └── save-receipt/    # Receipt saving API endpoint
│   ├── login/               # Login page
│   ├── page.tsx             # Main application page
│   └── globals.css          # Global styles
├── components/
│   ├── capture-flow/        # Camera capture flow components
│   ├── CameraCapture.tsx    # Webcam capture component
│   ├── ReceiptCard.tsx      # Receipt display card
│   ├── ReceiptList.tsx      # Receipt list container
│   └── ExportButton.tsx     # Excel export button
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client (auth)
│   │   ├── server.ts        # Server Supabase client (auth)
│   │   └── middleware.ts    # Session management
│   ├── supabase.ts          # Supabase database queries
│   └── textract.ts          # AWS Textract integration
├── middleware.ts            # Next.js auth middleware
├── tests/                   # Vitest tests for lib code
└── types/
    ├── receipt.ts           # Receipt type definitions
    └── capture-flow.ts      # Capture flow state types
```

## License

MIT
