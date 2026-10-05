"use client";

import { useState } from "react";
import { useBucketChoice } from "@/components/useBucketChoice";
import { firstDayOfBucket } from "@/lib/bucket";
import { centsToInput, parseAmountCents } from "@/lib/money";
import type { ReceiptReview } from "@/types/capture-flow";

export type ReceiptFormField = "vendor" | "receiptDate" | "invoiceNumber" | "subtotal" | "gst" | "total";

// Shared by the review screen and the edit dialog: text fields for the details, and where the receipt is filed.
export function useReceiptForm(initial: ReceiptReview) {
  const [fields, setFields] = useState({
    vendor: initial.details.vendor ?? "",
    receiptDate: initial.details.receipt_date ?? "",
    invoiceNumber: initial.details.invoice_number ?? "",
    subtotal: centsToInput(initial.details.subtotal_cents),
    // A receipt with no GST read or filled in has none, so it's 0.00 rather than blank.
    gst: centsToInput(initial.details.gst_cents ?? 0),
    total: centsToInput(initial.details.total_cents),
  });
  const receiptDate = fields.receiptDate || null;
  const { company, selected, suggested, bucket, pickedByHand, pickCompany, pickBucket } = useBucketChoice(
    initial,
    receiptDate,
  );

  const setField = (field: ReceiptFormField, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  // A date picker opens on today unless the field has a date, so an empty date gets the 1st of the bucket's month as
  // the field takes focus, before the picker opens. A scroll that starts on the field doesn't focus it.
  const fillEmptyDate = () => {
    if (receiptDate) return;
    setField("receiptDate", firstDayOfBucket(bucket));
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
        receipt_date: receiptDate,
        invoice_number: fields.invoiceNumber.trim() || null,
        subtotal_cents: subtotalCents,
        gst_cents: gstCents ?? 0,
        total_cents: totalCents,
      },
      bucket,
      pickedByHand,
      selected,
      checkAmounts: initial.checkAmounts,
    };
  };

  return { fields, setField, fillEmptyDate, company, pickCompany, bucket, suggested, pickBucket, toReview };
}
