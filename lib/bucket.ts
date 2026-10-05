import { type Bucket, type BucketKey, compareBuckets } from "@/types/bucket";
import type { ReceiptReview } from "@/types/capture-flow";
import type { Company } from "@/types/company";
import type { Receipt, ReceiptDetails } from "@/types/receipt";

interface SuggestBucketInput {
  /** YYYY-MM-DD, or null when the receipt has no readable date. */
  receiptDate: string | null;
  /** The bucket selected for the scan, or the receipt's own bucket when editing. */
  selected: BucketKey;
  /** The bucket picked by hand, if any. */
  handPicked: BucketKey | null;
}

// Where a receipt date points: that month, at the selected bucket's company and in its category. Without a date, the
// selected bucket.
export function bucketForDate(receiptDate: string | null, selected: BucketKey): BucketKey {
  if (!receiptDate) return selected;
  const [year, month] = receiptDate.split("-").map(Number);
  return { company: selected.company, year, month, category: selected.category };
}

// The 1st of a bucket's month, YYYY-MM-DD: the date a receipt date field starts from when it's empty.
export function firstDayOfBucket({ year, month }: BucketKey): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// A receipt follows its receipt date, unless a bucket was picked by hand: that always wins.
export function suggestBucket({ receiptDate, selected, handPicked }: SuggestBucketInput): BucketKey {
  return handPicked ?? bucketForDate(receiptDate, selected);
}

// A scan stays in the bucket scanned into, whatever its receipt date says, even once the date is corrected: it starts
// as picked by hand. The receipt date's month is still offered in the picker.
export function reviewOfScan(details: ReceiptDetails, scanningInto: BucketKey): ReceiptReview {
  return { details, bucket: scanningInto, pickedByHand: true, selected: scanningInto };
}

// Picking the bucket the receipt date points to means following the date again, so it isn't kept as a hand pick.
export function handPickFor(picked: BucketKey, suggested: BucketKey): BucketKey | null {
  return isSameBucket(picked, suggested) ? null : picked;
}

// A saved receipt filed away from its receipt date's month was put there by hand, so editing the date keeps it there.
export function isFiledByHand(bucket: BucketKey, receiptDate: string | null): boolean {
  return !isSameBucket(bucketForDate(receiptDate, bucket), bucket);
}

export function isSameBucket(a: BucketKey, b: BucketKey): boolean {
  return a.company === b.company && a.year === b.year && a.month === b.month && a.category === b.category;
}

// Moving a receipt to the other company keeps its month and category.
export function bucketAtCompany(bucket: BucketKey, company: Company): BucketKey {
  return { ...toBucketKey(bucket), company };
}

export function toBucketKey({ company, year, month, category }: BucketKey): BucketKey {
  return { company, year, month, category };
}

export function filterBucketsByCompany(buckets: Bucket[], company: Company): Bucket[] {
  return buckets.filter((bucket) => bucket.company === company);
}

// Adds the bucket a receipt was just filed into, if saving it created that bucket. The id is always the server's.
export function withBucket(buckets: Bucket[], id: string, key: BucketKey, createdAt: string): Bucket[] {
  if (buckets.some((bucket) => bucket.id === id)) return buckets;
  return [...buckets, { ...toBucketKey(key), id, created_at: createdAt }];
}

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
export function bucketExists(buckets: Bucket[], year: number, month: number, category: string): boolean {
  return buckets.some((b) => b.year === year && b.month === month && b.category === category);
}

// Extract distinct years from buckets, sorted descending
export function getUniqueYears(buckets: Bucket[]): number[] {
  const years = new Set(buckets.map((b) => b.year));
  return [...years].sort((a, b) => b - a);
}

// Total receipt count per year for display on year tabs
export function getReceiptCountsByYear(receipts: Receipt[], buckets: Bucket[]): Map<number, number> {
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
  const months = new Set(buckets.filter((b) => b.year === year).map((b) => b.month));
  return [...months].sort((a, b) => b - a);
}

// Filter buckets by year and month, sorted by category asc
export function filterBucketsByYearMonth(buckets: Bucket[], year: number, month: number): Bucket[] {
  return buckets
    .filter((b) => b.year === year && b.month === month)
    .sort((a, b) => a.category.localeCompare(b.category));
}

// Filter receipts that belong to buckets of a given year
export function filterReceiptsByYear(receipts: Receipt[], buckets: Bucket[], year: number): Receipt[] {
  const yearBucketIds = new Set(buckets.filter((b) => b.year === year).map((b) => b.id));
  return receipts.filter((r) => r.bucket_id && yearBucketIds.has(r.bucket_id));
}
