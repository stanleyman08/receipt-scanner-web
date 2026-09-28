import type { Company } from "./company";

export interface Bucket {
  id: string;
  company: Company;
  year: number;
  month: number;
  category: BucketCategory;
  created_at: string;
}

/** What identifies a bucket: one category in one month, at one company. */
export interface BucketKey {
  company: Company;
  year: number;
  month: number;
  category: BucketCategory;
}

export const BUCKET_CATEGORIES = ["Food", "Supply", "Other A"] as const;
export type BucketCategory = (typeof BUCKET_CATEGORIES)[number];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2026 / April / Food", for places that already show which company it is. */
export function formatBucketLabel(bucket: BucketKey): string {
  const monthName = MONTH_NAMES[bucket.month - 1];
  return `${bucket.year} / ${monthName} / ${bucket.category}`;
}

/** "Peko Peko · 2026 / April / Food", for places that must say which company. */
export function formatBucketWithCompany(bucket: BucketKey): string {
  return `${bucket.company} · ${formatBucketLabel(bucket)}`;
}

export function compareBuckets(a: Bucket, b: Bucket): number {
  // Sort by year desc, month desc, category asc
  if (a.year !== b.year) return b.year - a.year;
  if (a.month !== b.month) return b.month - a.month;
  return a.category.localeCompare(b.category);
}
