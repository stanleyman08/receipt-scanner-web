"use client";

import { useState } from "react";
import { bucketAtCompany, bucketForDate, handPickFor, suggestBucket } from "@/lib/bucket";
import type { BucketKey } from "@/types/bucket";
import type { ReceiptReview } from "@/types/capture-flow";
import type { Company } from "@/types/company";

// Where a receipt on the review screen or in the edit dialog will be filed: the bucket follows the receipt date, at
// the chosen company, until one is picked by hand.
export function useBucketChoice(initial: ReceiptReview, receiptDate: string | null) {
  const [company, setCompany] = useState<Company>(initial.bucket.company);
  const [handPicked, setHandPicked] = useState<BucketKey | null>(initial.pickedByHand ? initial.bucket : null);
  // Choosing the other company keeps the month and category and files there instead.
  const selected = bucketAtCompany(initial.selected, company);
  const handPickedAtCompany = handPicked && bucketAtCompany(handPicked, company);
  // Offered in the picker even after another bucket was picked by hand.
  const suggested = bucketForDate(receiptDate, selected);

  return {
    company,
    selected,
    suggested,
    bucket: suggestBucket({ receiptDate, selected, handPicked: handPickedAtCompany }),
    pickedByHand: handPicked !== null,
    pickCompany: setCompany,
    pickBucket: (picked: BucketKey) => setHandPicked(handPickFor(picked, suggested)),
  };
}
