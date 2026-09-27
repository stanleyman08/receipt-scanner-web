// The app's tables, one statement each. scripts/setup-db.ts applies them to Neon; tests apply them to PGlite.
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
