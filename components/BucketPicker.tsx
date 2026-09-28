"use client";

import { filterBucketsByCompany, isSameBucket, sortBuckets, toBucketKey } from "@/lib/bucket";
import { type Bucket, type BucketKey, formatBucketLabel } from "@/types/bucket";

interface BucketPickerProps {
  id: string;
  value: BucketKey;
  /** The bucket the receipt date points to, offered even after another bucket was picked by hand. */
  suggested: BucketKey;
  /** Both companies' buckets; only the chosen bucket's company's are offered. */
  buckets: Bucket[];
  onChange: (bucket: BucketKey) => void;
  className?: string;
}

// The <option> value that stands for a bucket.
function optionValue(bucket: BucketKey): string {
  return `${bucket.year}-${bucket.month}-${bucket.category}`;
}

// The company's existing buckets, plus the chosen and suggested ones when they don't exist yet. Whichever new bucket
// is chosen is created when the receipt is saved.
export default function BucketPicker({ id, value, suggested, buckets, onChange, className }: BucketPickerProps) {
  const isNew = (bucket: BucketKey) => !buckets.some((existing) => isSameBucket(existing, bucket));
  const candidates = isSameBucket(value, suggested) ? [value] : [value, suggested];
  const options: BucketKey[] = [
    ...candidates.filter(isNew),
    ...sortBuckets(filterBucketsByCompany(buckets, value.company)),
  ];

  return (
    <select
      id={id}
      value={optionValue(value)}
      onChange={(e) => {
        const picked = options.find((option) => optionValue(option) === e.target.value);
        if (picked) onChange(toBucketKey(picked));
      }}
      className={className}
    >
      {options.map((option) => (
        <option key={optionValue(option)} value={optionValue(option)}>
          {formatBucketLabel(option)}
          {isNew(option) ? " (new)" : ""}
        </option>
      ))}
    </select>
  );
}
