"use client";

import { bucketExists, sortBuckets } from "@/lib/bucket";
import { type Bucket, type BucketKey, formatBucketLabel } from "@/types/bucket";

interface BucketPickerProps {
  id: string;
  value: BucketKey;
  buckets: Bucket[];
  onChange: (bucket: BucketKey) => void;
  className?: string;
}

// The <option> value that stands for a bucket.
function optionValue(bucket: BucketKey): string {
  return `${bucket.year}-${bucket.month}-${bucket.category}`;
}

// The existing buckets, plus the chosen one when it doesn't exist yet: it's created when the receipt is saved.
export default function BucketPicker({ id, value, buckets, onChange, className }: BucketPickerProps) {
  const existing = sortBuckets(buckets);
  const selectedValue = optionValue(value);
  const isNew = !bucketExists(buckets, value.year, value.month, value.category);
  const options: BucketKey[] = isNew ? [value, ...existing] : existing;

  return (
    <select
      id={id}
      value={selectedValue}
      onChange={(e) => {
        const picked = options.find((option) => optionValue(option) === e.target.value);
        if (picked) onChange({ year: picked.year, month: picked.month, category: picked.category });
      }}
      className={className}
    >
      {options.map((option) => (
        <option key={optionValue(option)} value={optionValue(option)}>
          {formatBucketLabel(option)}
          {isNew && optionValue(option) === selectedValue ? " (new)" : ""}
        </option>
      ))}
    </select>
  );
}
