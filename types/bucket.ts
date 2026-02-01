export interface Bucket {
  id: string;
  year: number;
  month: number;
  category: BucketCategory;
  created_at: string;
}

export interface BucketInsert {
  year: number;
  month: number;
  category: BucketCategory;
}

export const BUCKET_CATEGORIES = ['Food', 'Supply', 'Other A'] as const;
export type BucketCategory = (typeof BUCKET_CATEGORIES)[number];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function formatBucketLabel(bucket: Bucket): string {
  const monthName = MONTH_NAMES[bucket.month - 1];
  return `${bucket.year} / ${monthName} / ${bucket.category}`;
}

export function compareBuckets(a: Bucket, b: Bucket): number {
  // Sort by year desc, month desc, category asc
  if (a.year !== b.year) return b.year - a.year;
  if (a.month !== b.month) return b.month - a.month;
  return a.category.localeCompare(b.category);
}
