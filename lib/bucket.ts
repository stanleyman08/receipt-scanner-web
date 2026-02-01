import { Receipt } from '@/types/receipt';
import { Bucket, compareBuckets } from '@/types/bucket';

// Filter receipts by bucket_id
export function filterByBucket(receipts: Receipt[], bucketId: string): Receipt[] {
  return receipts.filter((r) => r.bucket_id === bucketId);
}

// Get receipt counts per bucket
export function getReceiptCountsByBucket(receipts: Receipt[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const receipt of receipts) {
    if (receipt.bucket_id) {
      const count = counts.get(receipt.bucket_id) || 0;
      counts.set(receipt.bucket_id, count + 1);
    }
  }
  return counts;
}

// Sort buckets by year desc, month desc, category asc
export function sortBuckets(buckets: Bucket[]): Bucket[] {
  return [...buckets].sort(compareBuckets);
}

// Get the default bucket (most recent by year/month)
export function getDefaultBucket(buckets: Bucket[]): Bucket | null {
  if (buckets.length === 0) return null;
  const sorted = sortBuckets(buckets);
  return sorted[0];
}

// Check if a bucket already exists
export function bucketExists(
  buckets: Bucket[],
  year: number,
  month: number,
  category: string
): boolean {
  return buckets.some(
    (b) => b.year === year && b.month === month && b.category === category
  );
}
