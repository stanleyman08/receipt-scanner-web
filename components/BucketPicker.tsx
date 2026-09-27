"use client";

import { sortBuckets } from "@/lib/bucket";
import { type Bucket, type BucketKey, formatBucketLabel } from "@/types/bucket";

interface BucketPickerProps {
  id: string;
  value: BucketKey;
  buckets: Bucket[];
  onChange: (bucket: BucketKey) => void;
  className?: string;
}

function keyOf(bucket: BucketKey): string {
  return `${bucket.year}-${bucket.month}-${bucket.category}`;
}

// The existing buckets, plus the chosen one when it doesn't exist yet: it's created when the receipt is saved.
export default function BucketPicker({ id, value, buckets, onChange, className }: BucketPickerProps) {
  const existing = sortBuckets(buckets);
  const valueKey = keyOf(value);
  const isNew = !existing.some((bucket) => keyOf(bucket) === valueKey);
  const options: BucketKey[] = isNew ? [value, ...existing] : existing;

  return (
    <select
      id={id}
      value={valueKey}
      onChange={(e) => {
        const picked = options.find((option) => keyOf(option) === e.target.value);
        if (picked) onChange({ year: picked.year, month: picked.month, category: picked.category });
      }}
      className={className}
    >
      {options.map((option) => (
        <option key={keyOf(option)} value={keyOf(option)}>
          {formatBucketLabel(option)}
          {isNew && keyOf(option) === valueKey ? " (new)" : ""}
        </option>
      ))}
    </select>
  );
}
