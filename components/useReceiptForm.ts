"use client";

import { useState } from "react";
import { suggestBucket } from "@/lib/bucket";
import { centsToInput, parseAmountCents } from "@/lib/money";
import type { BucketKey } from "@/types/bucket";
import type { ReceiptReview } from "@/types/capture-flow";

export type ReceiptFormField = "vendor" | "receiptDate" | "invoiceNumber" | "subtotal" | "gst" | "total";

// Shared by the review screen and the edit dialog: text fields for the details, and a bucket that follows the
// receipt date until one is picked by hand.
export function useReceiptForm(initial: ReceiptReview) {
  const [fields, setFields] = useState({
    vendor: initial.details.vendor ?? "",
    receiptDate: initial.details.receipt_date ?? "",
    invoiceNumber: initial.details.invoice_number ?? "",
    subtotal: centsToInput(initial.details.subtotal_cents),
    gst: centsToInput(initial.details.gst_cents),
    total: centsToInput(initial.details.total_cents),
  });
  const [bucket, setBucket] = useState(initial.bucket);
  const [pickedByHand, setPickedByHand] = useState(initial.pickedByHand);
  const { selected } = initial;

  // Where the receipt date points, offered in the picker even after another bucket was picked by hand.
  const suggested = suggestBucket({
    receiptDate: fields.receiptDate || null,
    selected,
    current: bucket,
    pickedByHand: false,
  });

  const setField = (field: ReceiptFormField, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    if (field === "receiptDate") {
      setBucket((current) => suggestBucket({ receiptDate: value || null, selected, current, pickedByHand }));
    }
  };

  const pickBucket = (picked: BucketKey) => {
    setBucket(picked);
    setPickedByHand(true);
  };

  /** The reviewed receipt, or null when an amount that was filled in isn't a plain number. */
  const toReview = (): ReceiptReview | null => {
    const texts = [fields.subtotal, fields.gst, fields.total];
    const amounts = texts.map((text) => (text.trim() === "" ? null : parseAmountCents(text)));
    if (texts.some((text, i) => text.trim() !== "" && amounts[i] === null)) return null;

    const [subtotalCents, gstCents, totalCents] = amounts;
    return {
      details: {
        vendor: fields.vendor.trim() || null,
        receipt_date: fields.receiptDate || null,
        invoice_number: fields.invoiceNumber.trim() || null,
        subtotal_cents: subtotalCents,
        gst_cents: gstCents,
        total_cents: totalCents,
      },
      bucket,
      pickedByHand,
      selected,
    };
  };

  return { fields, setField, bucket, suggested, pickBucket, toReview };
}
