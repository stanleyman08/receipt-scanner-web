"use client";

import { useId, useState } from "react";
import BucketPicker from "@/components/BucketPicker";
import { useReceiptForm } from "@/components/useReceiptForm";
import { isFiledByHand } from "@/lib/bucket";
import type { Bucket, BucketKey } from "@/types/bucket";
import type { ReceiptReview } from "@/types/capture-flow";
import type { Receipt } from "@/types/receipt";

const AMOUNT_ERROR = "Enter amounts as plain numbers, like 12.50.";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";
const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

interface EditReceiptModalProps {
  receipt: Receipt;
  /** The bucket the receipt is filed in now. */
  receiptBucket: BucketKey;
  buckets: Bucket[];
  isSaving: boolean;
  onClose: () => void;
  /** Resolves to why saving failed, or null once the receipt is updated. */
  onSave: (id: string, review: ReceiptReview) => Promise<string | null>;
}

// Rendered with key={receipt.id}, so the form starts from the receipt it was opened for.
export default function EditReceiptModal({
  receipt,
  receiptBucket,
  buckets,
  isSaving,
  onClose,
  onSave,
}: EditReceiptModalProps) {
  const idPrefix = useId();
  const { fields, setField, bucket, suggested, pickBucket, toReview } = useReceiptForm({
    details: receipt,
    bucket: receiptBucket,
    // A receipt filed away from its date's month keeps its bucket when the date is edited.
    pickedByHand: isFiledByHand(receiptBucket, receipt.receipt_date),
    selected: receiptBucket,
  });
  const [amountError, setAmountError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const reviewed = toReview();
    if (!reviewed) {
      setAmountError(AMOUNT_ERROR);
      return;
    }
    setAmountError(null);
    setSaveError(null);
    const failure = await onSave(receipt.id, reviewed);
    if (failure) setSaveError(failure);
  };

  const message = amountError ?? saveError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Receipt</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              placeholder="Enter vendor name"
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-date`} className={LABEL_CLASS}>
              Date
            </label>
            <input
              id={`${idPrefix}-date`}
              type="date"
              value={fields.receiptDate}
              onChange={(e) => setField("receiptDate", e.target.value)}
              className={INPUT_CLASS}
            />
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
              placeholder="Enter invoice number"
            />
          </div>

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
            />
          </div>

          {message && (
            <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
