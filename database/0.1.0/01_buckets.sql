-- Buckets table - organizes receipts by year, month, and category

CREATE TABLE buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  category TEXT NOT NULL CHECK (category IN ('Food', 'Supply', 'Other A')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month, category)
);

CREATE INDEX idx_buckets_year_month ON buckets(year, month);

ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON buckets
  FOR ALL
  USING (true)
  WITH CHECK (true);
