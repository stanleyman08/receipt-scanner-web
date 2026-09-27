import { describe, expect, it } from "vitest";
import {
  bucketExists,
  filterBucketsByYearMonth,
  getDefaultBucket,
  getUniqueMonthsForYear,
  getUniqueYears,
  sortBuckets,
} from "@/lib/bucket";
import type { Bucket, BucketCategory } from "@/types/bucket";

function bucket(id: string, year: number, month: number, category: BucketCategory): Bucket {
  return { id, year, month, category, created_at: "2026-01-01T00:00:00Z" };
}

const march2025Supply = bucket("2025-03-supply", 2025, 3, "Supply");
const january2026Food = bucket("2026-01-food", 2026, 1, "Food");
const march2025Food = bucket("2025-03-food", 2025, 3, "Food");
const november2025OtherA = bucket("2025-11-other-a", 2025, 11, "Other A");

const buckets = [march2025Supply, january2026Food, march2025Food, november2025OtherA];

describe("sortBuckets", () => {
  it("puts the newest month first, then orders a month's categories alphabetically", () => {
    expect(sortBuckets(buckets).map((b) => b.id)).toEqual([
      "2026-01-food",
      "2025-11-other-a",
      "2025-03-food",
      "2025-03-supply",
    ]);
  });
});

describe("getDefaultBucket", () => {
  it("opens on the newest bucket", () => {
    expect(getDefaultBucket(buckets)).toBe(january2026Food);
  });

  it("has nothing to open when there are no buckets", () => {
    expect(getDefaultBucket([])).toBeNull();
  });
});

describe("bucketExists", () => {
  it("matches a bucket with the same year, month and category", () => {
    expect(bucketExists(buckets, 2025, 3, "Food")).toBe(true);
  });

  it("treats a different category or year as a new bucket", () => {
    expect(bucketExists(buckets, 2025, 3, "Other A")).toBe(false);
    expect(bucketExists(buckets, 2024, 3, "Food")).toBe(false);
  });
});

describe("sidebar lists", () => {
  it("lists the years that have buckets, newest first", () => {
    expect(getUniqueYears(buckets)).toEqual([2026, 2025]);
  });

  it("lists each of a year's months once, newest first", () => {
    expect(getUniqueMonthsForYear(buckets, 2025)).toEqual([11, 3]);
  });

  it("lists a month's buckets by category", () => {
    expect(filterBucketsByYearMonth(buckets, 2025, 3).map((b) => b.category)).toEqual(["Food", "Supply"]);
  });
});
