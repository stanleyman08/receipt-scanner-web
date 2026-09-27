// Better Auth's tables, generated with `pnpm dlx auth@1.7.6 generate --adapter kysely --dialect postgresql`,
// with "if not exists" added so setup can re-run. Regenerate them when upgrading Better Auth.
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

// The app's tables, one statement each. scripts/setup-db.mts applies them to Neon; tests apply them to PGlite.
export const APP_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS buckets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
    category text NOT NULL CHECK (category IN ('Food', 'Supply', 'Other A')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (year, month, category)
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
];
