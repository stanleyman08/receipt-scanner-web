import { describe, expect, it } from "vitest";
import {
  bucketExists,
  bucketsOf,
  filterBucketsByYearMonth,
  getDefaultBucket,
  getUniqueMonthsForYear,
  getUniqueYears,
  handPickFor,
  isFiledByHand,
  sortBuckets,
  suggestBucket,
} from "@/lib/bucket";
import type { Bucket, BucketCategory } from "@/types/bucket";
import type { Company } from "@/types/company";

function bucket(
  id: string,
  year: number,
  month: number,
  category: BucketCategory,
  company: Company = "Carino",
): Bucket {
  return { id, company, year, month, category, created_at: "2026-01-01T00:00:00Z" };
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

describe("bucketsOf", () => {
  it("lists one company's buckets", () => {
    const pekoPekoJanuary = bucket("peko-peko-2026-01-food", 2026, 1, "Food", "Peko Peko");
    expect(bucketsOf([...buckets, pekoPekoJanuary], "Peko Peko")).toEqual([pekoPekoJanuary]);
  });
});

describe("suggestBucket", () => {
  const scanningInto = { company: "Carino" as const, year: 2026, month: 1, category: "Food" as const };
  const pickedSupply = { company: "Carino" as const, year: 2025, month: 7, category: "Supply" as const };

  it("files a receipt under its receipt date's month, in the category it was scanned into", () => {
    expect(suggestBucket({ receiptDate: "2025-12-30", selected: scanningInto, handPicked: null })).toEqual({
      company: "Carino",
      year: 2025,
      month: 12,
      category: "Food",
    });
  });

  it("keeps the company of the bucket scanned into", () => {
    const pekoPeko = { ...scanningInto, company: "Peko Peko" as const };
    expect(suggestBucket({ receiptDate: "2025-12-30", selected: pekoPeko, handPicked: null })).toEqual({
      company: "Peko Peko",
      year: 2025,
      month: 12,
      category: "Food",
    });
  });

  it("uses the selected bucket when there's no receipt date, or it was cleared", () => {
    expect(suggestBucket({ receiptDate: null, selected: scanningInto, handPicked: null })).toEqual(scanningInto);
  });

  it("keeps a bucket picked by hand, whatever the receipt date says", () => {
    expect(suggestBucket({ receiptDate: "2025-12-30", selected: scanningInto, handPicked: pickedSupply })).toEqual(
      pickedSupply,
    );
  });
});

describe("handPickFor", () => {
  const december2025Food = { company: "Carino" as const, year: 2025, month: 12, category: "Food" as const };
  const july2025Supply = { company: "Carino" as const, year: 2025, month: 7, category: "Supply" as const };

  it("counts the same month and category at the other company as a different bucket", () => {
    const pekoPekoDecember = { ...december2025Food, company: "Peko Peko" as const };
    expect(handPickFor(pekoPekoDecember, december2025Food)).toEqual(pekoPekoDecember);
  });

  it("treats picking the bucket the receipt date points to as following the date again", () => {
    expect(handPickFor({ ...december2025Food }, december2025Food)).toBeNull();
  });

  it("keeps a pick of any other bucket", () => {
    expect(handPickFor(july2025Supply, december2025Food)).toEqual(july2025Supply);
  });
});

describe("isFiledByHand", () => {
  const march2026Food = { company: "Carino" as const, year: 2026, month: 3, category: "Food" as const };
  const april2026Food = { company: "Carino" as const, year: 2026, month: 4, category: "Food" as const };

  it("counts a receipt filed away from its receipt date's month as picked by hand", () => {
    expect(isFiledByHand(april2026Food, "2026-03-31")).toBe(true);
  });

  it("counts a receipt filed in the right month of the wrong year as picked by hand", () => {
    expect(isFiledByHand(march2026Food, "2025-03-31")).toBe(true);
  });

  it("doesn't count a receipt filed in its receipt date's month", () => {
    expect(isFiledByHand(march2026Food, "2026-03-31")).toBe(false);
  });

  it("doesn't count a receipt without a receipt date", () => {
    expect(isFiledByHand(april2026Food, null)).toBe(false);
  });
});
