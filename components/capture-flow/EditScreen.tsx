"use client";

import { useId, useState } from "react";
import BucketPicker from "@/components/BucketPicker";
import { useReceiptForm } from "@/components/useReceiptForm";
import { parseAmountCents } from "@/lib/money";
import { checkReceiptAmounts } from "@/lib/receipt-checks";
import { type Bucket, MONTH_NAMES } from "@/types/bucket";
import type { ReceiptReview } from "@/types/capture-flow";
import { COMPANIES } from "@/types/company";
import { NOTHING_TO_CHECK } from "@/types/receipt";

const AMOUNT_ERROR = "Enter amounts as plain numbers, like 12.50.";
const LABEL_CLASS = "block text-xs text-gray-500 uppercase tracking-wide mb-1";
const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

interface EditScreenProps {
  imageData: string;
  review: ReceiptReview;
  buckets: Bucket[];
  /** Why the last save failed, if it did. */
  error?: string;
  onConfirm: (review: ReceiptReview) => void;
  onRetake: () => void;
}

export default function EditScreen({ imageData, review, buckets, error, onConfirm, onRetake }: EditScreenProps) {
  const idPrefix = useId();
  const { fields, setField, company, pickCompany, bucket, suggested, pickBucket, toReview } = useReceiptForm(review);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  const handleSubmit = () => {
    const reviewed = toReview();
    if (!reviewed) {
      setAmountError(AMOUNT_ERROR);
      return;
    }
    setAmountError(null);
    onConfirm(reviewed);
  };

  const message = amountError ?? error;
  // Checked as the amounts are edited, so a warning goes once the misread amount is corrected.
  const checks = checkReceiptAmounts(
    {
      subtotal_cents: parseAmountCents(fields.subtotal),
      gst_cents: parseAmountCents(fields.gst),
      total_cents: parseAmountCents(fields.total),
    },
    review.checkAmounts ?? NOTHING_TO_CHECK,
  );
  const warnings = checks.filter((check) => check.tone === "warning");
  const notes = checks.filter((check) => check.tone === "note");
  // A scan stays in the bucket scanned into, so point out when its receipt date falls in another month.
  const isOtherMonth =
    fields.receiptDate !== "" && (suggested.year !== bucket.year || suggested.month !== bucket.month);

  return (
    <>
      {/* The fixed box is the visible screen, so the actions stay on it while the fields scroll */}
      <div className="fixed inset-0 z-50 bg-black/95 animate-fade-in">
        <div className="mx-auto flex h-full w-full max-w-md flex-col sm:justify-center">
          {/* Header - the thumbnail opens the full image */}
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-1">
            <h2 className="text-lg font-semibold text-white">Review Receipt</h2>
            <button
              type="button"
              aria-label="View full image"
              onClick={() => setShowFullImage(true)}
              className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {/* biome-ignore lint/performance/noImgElement: a camera data URL, which next/image can't optimize */}
              <img src={imageData} alt="" className="h-12 w-10 rounded-md object-cover" />
            </button>
          </div>

          {/* Editable fields */}
          <div className="min-h-0 overflow-y-auto overscroll-contain rounded-2xl bg-white p-4">
            <div className="space-y-3">
              <div>
                <label htmlFor={`${idPrefix}-vendor`} className={LABEL_CLASS}>
                  Vendor
                </label>
                <input
                  id={`${idPrefix}-vendor`}
                  type="text"
                  value={fields.vendor}
                  onChange={(e) => setField("vendor", e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${idPrefix}-date`} className={LABEL_CLASS}>
                    Date
                  </label>
                  <input
                    id={`${idPrefix}-date`}
                    type="date"
                    value={fields.receiptDate}
                    onChange={(e) => setField("receiptDate", e.target.value)}
                    // iOS Safari draws its own date control, wider than the half-width column, unless its native look
                    // is off. Without that look it would centre the date and collapse when empty.
                    className={`${INPUT_CLASS} block min-w-0 min-h-[2.625rem] appearance-none [&::-webkit-date-and-time-value]:text-left`}
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-invoice`} className={LABEL_CLASS}>
                    Invoice #
                  </label>
                  <input
                    id={`${idPrefix}-invoice`}
                    type="text"
                    value={fields.invoiceNumber}
                    onChange={(e) => setField("invoiceNumber", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor={`${idPrefix}-subtotal`} className={LABEL_CLASS}>
                    Subtotal
                  </label>
                  <input
                    id={`${idPrefix}-subtotal`}
                    type="text"
                    inputMode="decimal"
                    value={fields.subtotal}
                    onChange={(e) => setField("subtotal", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-gst`} className={LABEL_CLASS}>
                    GST
                  </label>
                  <input
                    id={`${idPrefix}-gst`}
                    type="text"
                    inputMode="decimal"
                    value={fields.gst}
                    onChange={(e) => setField("gst", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-total`} className={LABEL_CLASS}>
                    Total
                  </label>
                  <input
                    id={`${idPrefix}-total`}
                    type="text"
                    inputMode="decimal"
                    value={fields.total}
                    onChange={(e) => setField("total", e.target.value)}
                    className={`${INPUT_CLASS} font-semibold`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <fieldset>
                <legend className={LABEL_CLASS}>Company</legend>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANIES.map((option) => (
                    <label
                      key={option}
                      className="rounded-lg border border-gray-300 py-2 text-center font-medium text-gray-700 transition-colors has-checked:border-blue-500 has-checked:bg-blue-500 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-blue-500 has-focus-visible:ring-offset-2"
                    >
                      <input
                        type="radio"
                        name={`${idPrefix}-company`}
                        value={option}
                        checked={company === option}
                        onChange={() => pickCompany(option)}
                        className="sr-only"
                      />
                      <span translate="no">{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor={`${idPrefix}-bucket`} className={LABEL_CLASS}>
                  Bucket
                </label>
                <BucketPicker
                  id={`${idPrefix}-bucket`}
                  value={bucket}
                  suggested={suggested}
                  buckets={buckets}
                  onChange={pickBucket}
                  className={INPUT_CLASS}
                  describedBy={isOtherMonth ? `${idPrefix}-bucket-month` : undefined}
                />
                {isOtherMonth && (
                  <p id={`${idPrefix}-bucket-month`} className="mt-1 text-sm text-amber-700">
                    The receipt date is in {MONTH_NAMES[suggested.month - 1]} {suggested.year}, not this bucket's month.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto shrink-0 space-y-3 px-4 py-3 sm:mt-0">
            {/* Beside the Save button, so they're seen even when the field they're about has scrolled away */}
            {warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {warnings.map((warning) => (
                  <li key={warning.message}>{warning.message}</li>
                ))}
              </ul>
            )}
            {notes.map((note) => (
              <p key={note.message} className="text-sm text-gray-400">
                {note.message}
              </p>
            ))}
            {message && (
              <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {message}
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={onRetake}
                className="px-4 py-3.5 rounded-full font-medium text-gray-300 border-2 border-gray-600 hover:bg-gray-800 transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="col-span-2 px-6 py-3.5 rounded-full font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Save Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full image overlay */}
      {showFullImage && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0"
            onClick={() => setShowFullImage(false)}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* biome-ignore lint/performance/noImgElement: a camera data URL, which next/image can't optimize */}
          <img src={imageData} alt="Receipt full view" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
