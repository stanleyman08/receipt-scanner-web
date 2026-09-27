"use client";

import { useId, useState } from "react";
import BucketPicker from "@/components/BucketPicker";
import { useReceiptForm } from "@/components/useReceiptForm";
import type { Bucket } from "@/types/bucket";
import type { ReceiptReview } from "@/types/capture-flow";

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
  const { fields, setField, bucket, pickBucket, toReview } = useReceiptForm(review);
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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-3">
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Review Receipt</h2>
            <p className="text-sm text-gray-400 mt-1">Edit any fields before saving</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Thumbnail - clickable to view full image */}
            <button
              type="button"
              onClick={() => setShowFullImage(true)}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors text-left"
            >
              {/* biome-ignore lint/performance/noImgElement: a camera data URL, which next/image can't optimize */}
              <img src={imageData} alt="Receipt thumbnail" className="w-16 h-20 object-cover rounded-lg shadow" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{fields.vendor || "Unknown Vendor"}</p>
                <p className="text-sm text-blue-500">Tap to view full image</p>
              </div>
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </button>

            {/* Editable fields */}
            <div className="p-4 space-y-4">
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
                  buckets={buckets}
                  onChange={pickBucket}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {message && (
            <p role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onRetake}
              className="flex-1 px-6 py-4 rounded-full font-medium text-gray-300 border-2 border-gray-600 hover:bg-gray-800 transition-colors"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-6 py-4 rounded-full font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Save Receipt
            </button>
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
          <img src={imageData} alt="Receipt full view" className="max-h-[90vh] max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
