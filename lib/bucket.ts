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

// Extract distinct years from buckets, sorted descending
export function getUniqueYears(buckets: Bucket[]): number[] {
  const years = new Set(buckets.map((b) => b.year));
  return [...years].sort((a, b) => b - a);
}

// Group buckets by year, each group sorted by month desc / category asc
export function groupBucketsByYear(buckets: Bucket[]): Map<number, Bucket[]> {
  const map = new Map<number, Bucket[]>();
  for (const bucket of buckets) {
    const group = map.get(bucket.year);
    if (group) {
      group.push(bucket);
    } else {
      map.set(bucket.year, [bucket]);
    }
  }
  for (const [year, group] of map) {
    map.set(year, group.sort(compareBuckets));
  }
  return map;
}

// Total receipt count per year for display on year tabs
export function getReceiptCountsByYear(
  receipts: Receipt[],
  buckets: Bucket[]
): Map<number, number> {
  const bucketYearMap = new Map<string, number>();
  for (const bucket of buckets) {
    bucketYearMap.set(bucket.id, bucket.year);
  }
  const counts = new Map<number, number>();
  for (const receipt of receipts) {
    if (receipt.bucket_id) {
      const year = bucketYearMap.get(receipt.bucket_id);
      if (year !== undefined) {
        counts.set(year, (counts.get(year) || 0) + 1);
      }
    }
  }
  return counts;
}

// Get unique months for a given year, sorted descending
export function getUniqueMonthsForYear(buckets: Bucket[], year: number): number[] {
  const months = new Set(
    buckets.filter((b) => b.year === year).map((b) => b.month)
  );
  return [...months].sort((a, b) => b - a);
}

// Filter buckets by year and month, sorted by category asc
export function filterBucketsByYearMonth(
  buckets: Bucket[],
  year: number,
  month: number
): Bucket[] {
  return buckets
    .filter((b) => b.year === year && b.month === month)
    .sort((a, b) => a.category.localeCompare(b.category));
}

// Filter receipts that belong to buckets of a given year
export function filterReceiptsByYear(
  receipts: Receipt[],
  buckets: Bucket[],
  year: number
): Receipt[] {
  const yearBucketIds = new Set(
    buckets.filter((b) => b.year === year).map((b) => b.id)
  );
  return receipts.filter((r) => r.bucket_id && yearBucketIds.has(r.bucket_id));
}
