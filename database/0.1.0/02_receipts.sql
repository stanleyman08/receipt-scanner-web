-- Receipts table - stores receipt data with bucket associations

CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subtotal TEXT,
  gst TEXT,
  total TEXT,
  invoice_number TEXT,
  vendor TEXT,
  receipt_date TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  bucket_id UUID REFERENCES buckets(id)
);

CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX idx_receipts_bucket_id ON receipts(bucket_id);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON receipts
  FOR ALL
  USING (true)
  WITH CHECK (true);
