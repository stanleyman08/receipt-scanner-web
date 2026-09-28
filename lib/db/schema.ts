// How the database is set up. `pnpm setup-db` runs SETUP_STATEMENTS in order, in one transaction; the tests run them
// on PGlite.
//
// The CREATE statements only make tables that don't exist yet: editing one changes new databases, not existing ones.
// To change a table that already exists, update its CREATE statement for new databases and append a statement to
// SCHEMA_CHANGES that brings existing ones to the same shape. Every statement must be safe to run again.

// Better Auth's tables, generated with `pnpm dlx auth@1.7.6 generate --adapter kysely --dialect postgresql`,
// with "if not exists" added so setup can re-run. Regenerate them when upgrading Better Auth; if the upgrade adds
// columns, existing databases need them added in SCHEMA_CHANGES too.
export const AUTH_SCHEMA = [
  `create table if not exists "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null)`,
  `create table if not exists "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade)`,
  `create table if not exists "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null)`,
  `create table if not exists "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null)`,
  `create table if not exists "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null)`,
  `create index if not exists "session_userId_idx" on "session" ("userId")`,
  `create index if not exists "account_userId_idx" on "account" ("userId")`,
  `create index if not exists "verification_identifier_idx" on "verification" ("identifier")`,
];

// The app's tables, one statement each.
export const APP_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS buckets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company text NOT NULL CHECK (company IN ('Carino', 'Peko Peko')),
    year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
    category text NOT NULL CHECK (category IN ('Food', 'Supply', 'Other A')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT buckets_company_year_month_category_key UNIQUE (company, year, month, category)
  )`,
  `CREATE TABLE IF NOT EXISTS receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id uuid NOT NULL REFERENCES buckets (id),
    vendor text,
    receipt_date date,
    invoice_number text,
    subtotal_cents integer,
    gst_cents integer,
    total_cents integer,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE INDEX IF NOT EXISTS receipts_bucket_id_idx ON receipts (bucket_id)",
  "CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts (created_at DESC)",
  // Each scan's photo and what Textract returned for it, kept for a while so a misread can be traced (see saveScan).
  `CREATE TABLE IF NOT EXISTS scans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    image bytea NOT NULL,
    textract jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE INDEX IF NOT EXISTS scans_created_at_idx ON scans (created_at)",
];

// Changes that bring tables created before them to the shape above; each leaves a new table as it is. Append only:
// never edit or reorder a change that has run somewhere.
export const SCHEMA_CHANGES = [
  // Companies: buckets from before them were Carino's, and a bucket is now unique within its company.
  `ALTER TABLE buckets ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT 'Carino'
    CHECK (company IN ('Carino', 'Peko Peko'))`,
  "ALTER TABLE buckets ALTER COLUMN company DROP DEFAULT",
  "ALTER TABLE buckets DROP CONSTRAINT IF EXISTS buckets_year_month_category_key",
  // The same named constraint a new table gets. Postgres has no ADD CONSTRAINT IF NOT EXISTS, hence the check.
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'buckets_company_year_month_category_key') THEN
      CREATE UNIQUE INDEX IF NOT EXISTS buckets_company_year_month_category_key
        ON buckets (company, year, month, category);
      ALTER TABLE buckets ADD CONSTRAINT buckets_company_year_month_category_key
        UNIQUE USING INDEX buckets_company_year_month_category_key;
    END IF;
  END $$`,
];

export const SETUP_STATEMENTS = [...AUTH_SCHEMA, ...APP_SCHEMA, ...SCHEMA_CHANGES];
