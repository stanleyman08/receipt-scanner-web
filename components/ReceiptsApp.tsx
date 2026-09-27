"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBucketAction, deleteReceiptAction, saveReceiptAction, updateReceiptAction } from "@/app/actions";
import AddBucketModal from "@/components/AddBucketModal";
import BucketSidebar from "@/components/BucketSidebar";
import CameraCapture from "@/components/CameraCapture";
import { EditScreen, ErrorScreen, ProcessingScreen, ResultsScreen } from "@/components/capture-flow";
import EditReceiptModal from "@/components/EditReceiptModal";
import ExportButton from "@/components/ExportButton";
import ReceiptTable from "@/components/ReceiptTable";
import { authClient } from "@/lib/auth-client";
import {
  filterBucketsByYearMonth,
  filterByBucket,
  filterReceiptsByYear,
  getDefaultBucket,
  getReceiptCountsByBucket,
  getReceiptCountsByYear,
  getUniqueMonthsForYear,
  getUniqueYears,
  sortBuckets,
  suggestBucket,
} from "@/lib/bucket";
import { downloadYearExcel } from "@/lib/excel";
import { optimizeImageForOCR } from "@/lib/image-utils";
import { type Bucket, type BucketCategory, type BucketKey, formatBucketLabel } from "@/types/bucket";
import type { CaptureFlowState, ProcessingStage, ReceiptReview } from "@/types/capture-flow";
import type { Receipt, ScanResponse } from "@/types/receipt";

const SUCCESS_MESSAGE_MS = 3000;
const SCAN_FAILED = "The receipt couldn't be scanned. Check your connection and try again.";
const SAVE_FAILED = "The receipt couldn't be saved. Check your connection and try again.";
const UPDATE_FAILED = "The changes couldn't be saved. Check your connection and try again.";
const DELETE_FAILED = "The receipt couldn't be deleted. Check your connection and try again.";

interface ReceiptsAppProps {
  initialBuckets: Bucket[];
  initialReceipts: Receipt[];
}

// Adds the bucket a receipt was just filed into, if saving it created that bucket.
function withBucket(buckets: Bucket[], id: string, key: BucketKey, createdAt: string): Bucket[] {
  return buckets.some((bucket) => bucket.id === id) ? buckets : [...buckets, { id, ...key, created_at: createdAt }];
}

export default function ReceiptsApp({ initialBuckets, initialReceipts }: ReceiptsAppProps) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [buckets, setBuckets] = useState<Bucket[]>(initialBuckets);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bucket state, starting on the newest bucket
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(() => getDefaultBucket(initialBuckets));
  const [selectedYear, setSelectedYear] = useState<number | null>(() => getDefaultBucket(initialBuckets)?.year ?? null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    () => getDefaultBucket(initialBuckets)?.month ?? null,
  );
  const [isAddBucketModalOpen, setIsAddBucketModalOpen] = useState(false);

  // Edit receipt state
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Capture flow state
  const [captureState, setCaptureState] = useState<CaptureFlowState>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived state
  const sortedBuckets = sortBuckets(buckets);
  const receiptCounts = getReceiptCountsByBucket(receipts);
  const uniqueYears = getUniqueYears(buckets);
  const yearReceiptCounts = getReceiptCountsByYear(receipts, buckets);
  const uniqueMonths = useMemo(
    () => (selectedYear !== null ? getUniqueMonthsForYear(buckets, selectedYear) : []),
    [buckets, selectedYear],
  );
  const bucketsForYearMonth = useMemo(
    () =>
      selectedYear !== null && selectedMonth !== null
        ? filterBucketsByYearMonth(buckets, selectedYear, selectedMonth)
        : [],
    [buckets, selectedYear, selectedMonth],
  );
  const yearReceiptTotal = selectedYear !== null ? yearReceiptCounts.get(selectedYear) || 0 : 0;
  const filteredReceipts = selectedBucket ? filterByBucket(receipts, selectedBucket.id) : [];
  const editingBucket = editingReceipt ? buckets.find((bucket) => bucket.id === editingReceipt.bucket_id) : undefined;

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), SUCCESS_MESSAGE_MS);
  };

  const handleSelectBucket = (bucket: Bucket) => {
    setSelectedBucket(bucket);
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    const monthsForYear = getUniqueMonthsForYear(buckets, year);
    if (monthsForYear.length > 0) {
      const month = monthsForYear[0];
      setSelectedMonth(month);
      const yearMonthBuckets = filterBucketsByYearMonth(buckets, year, month);
      if (yearMonthBuckets.length > 0) {
        setSelectedBucket(yearMonthBuckets[0]);
      }
    }
  };

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    if (selectedYear !== null) {
      const yearMonthBuckets = filterBucketsByYearMonth(buckets, selectedYear, month);
      if (yearMonthBuckets.length > 0 && selectedBucket?.month !== month) {
        setSelectedBucket(yearMonthBuckets[0]);
      }
    }
  };

  const handleExportYear = async () => {
    if (selectedYear === null) return;
    const yearReceipts = filterReceiptsByYear(receipts, buckets, selectedYear);
    const bucketMap = new Map(buckets.map((b) => [b.id, b]));
    await downloadYearExcel(yearReceipts, bucketMap, selectedYear);
  };

  // Guard: if selectedYear disappears from available years, reset
  useEffect(() => {
    if (uniqueYears.length === 0) return;
    if (selectedYear === null || !uniqueYears.includes(selectedYear)) {
      setSelectedYear(uniqueYears[0]);
    }
  }, [uniqueYears, selectedYear]);

  // Guard: if selectedMonth disappears from available months, reset
  useEffect(() => {
    if (uniqueMonths.length === 0) return;
    if (selectedMonth === null || !uniqueMonths.includes(selectedMonth)) {
      setSelectedMonth(uniqueMonths[0]);
    }
  }, [uniqueMonths, selectedMonth]);

  const handleAddBucket = async (year: number, month: number, category: BucketCategory) => {
    const result = await createBucketAction({ year, month, category });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const bucket = result.value;
    setBuckets((prev) => withBucket(prev, bucket.id, bucket, bucket.created_at));
    setSelectedBucket(bucket);
    setSelectedYear(bucket.year);
    setSelectedMonth(bucket.month);
    setIsAddBucketModalOpen(false);
  };

  // Process the receipt scan through stages (read only, no saving)
  const processReceipt = async (imageData: string) => {
    if (selectedBucket === null) return;
    const { year, month, category } = selectedBucket;
    const scanningInto: BucketKey = { year, month, category };
    abortControllerRef.current = new AbortController();

    const updateStage = (stage: ProcessingStage) => {
      setCaptureState({ status: "processing", imageData, stage });
    };

    try {
      // Stage 1 & 2: Deskew and optimize image (with progress callback)
      updateStage("deskewing");
      const optimizedImage = await optimizeImageForOCR(imageData, (preprocessStage) => {
        updateStage(preprocessStage);
      });

      if (abortControllerRef.current?.signal.aborted) return;

      // Stage 3: Analyzing with Textract
      updateStage("analyzing");

      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: optimizedImage }),
        signal: abortControllerRef.current?.signal,
      });

      if (abortControllerRef.current?.signal.aborted) return;

      // Stage 4: Extracting
      updateStage("extracting");
      const result: ScanResponse = await response.json();

      if (abortControllerRef.current?.signal.aborted) return;

      if (result.success) {
        // File the receipt under its receipt date's month, in the category being scanned into
        const bucket = suggestBucket({
          receiptDate: result.details.receipt_date,
          current: scanningInto,
          pickedByHand: false,
        });
        setCaptureState({
          status: "editing",
          imageData,
          review: { details: result.details, bucket, pickedByHand: false },
        });
      } else {
        setCaptureState({ status: "error", imageData, error: result.error });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setCaptureState({ status: "error", imageData, error: SCAN_FAILED });
    }
  };

  // Save the reviewed receipt, waiting for the database before showing success
  const saveReviewedReceipt = async (imageData: string, review: ReceiptReview) => {
    setCaptureState({ status: "saving", imageData, review });
    try {
      const result = await saveReceiptAction(review.details, review.bucket);
      if (!result.ok) {
        setCaptureState({ status: "editing", imageData, review, error: result.error });
        return;
      }
      const receipt = result.value;
      setReceipts((prev) => [receipt, ...prev]);
      setBuckets((prev) => withBucket(prev, receipt.bucket_id, review.bucket, receipt.created_at));
      setCaptureState({ status: "success", imageData, receipt });
    } catch {
      setCaptureState({ status: "editing", imageData, review, error: SAVE_FAILED });
    }
  };

  // Camera handlers
  const handleOpenCamera = () => {
    if (selectedBucket === null) {
      setError("Please select or create a bucket first");
      return;
    }
    setCaptureState({ status: "camera_active" });
  };

  const handleCloseCamera = () => {
    setCaptureState({ status: "idle" });
  };

  const handleCapture = (imageData: string) => {
    // Skip preview, go straight to processing
    processReceipt(imageData);
  };

  // Processing handlers
  const handleCancelProcessing = () => {
    abortControllerRef.current?.abort();
    setCaptureState({ status: "idle" });
  };

  // Review handlers
  const handleConfirmReview = (review: ReceiptReview) => {
    if (captureState.status === "editing") {
      saveReviewedReceipt(captureState.imageData, review);
    }
  };

  const handleRetake = () => {
    setCaptureState({ status: "camera_active" });
  };

  // Success handlers (the receipt is already in the list)
  const handleDone = () => {
    showSuccess("Receipt saved.");
    setCaptureState({ status: "idle" });
  };

  const handleScanAnother = () => {
    setCaptureState({ status: "camera_active" });
  };

  // Error handlers
  const handleRetakeFromError = () => {
    setCaptureState({ status: "camera_active" });
  };

  const handleRetryFromError = () => {
    if (captureState.status === "error") {
      processReceipt(captureState.imageData);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const result = await deleteReceiptAction(id);
      if (result.ok) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
      } else {
        setError(result.error);
      }
    } catch {
      setError(DELETE_FAILED);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
  };

  const handleUpdateReceipt = async (id: string, review: ReceiptReview) => {
    setIsSavingEdit(true);
    setError(null);
    try {
      const result = await updateReceiptAction(id, review.details, review.bucket);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const updated = result.value;
      setReceipts((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setBuckets((prev) => withBucket(prev, updated.bucket_id, review.bucket, updated.created_at));
      setEditingReceipt(null);
      showSuccess("Receipt updated.");
    } catch {
      setError(UPDATE_FAILED);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isProcessing = captureState.status === "processing";
  const isCameraOpen = captureState.status === "camera_active";
  const hasFullscreenOverlay = captureState.status !== "idle";
  const canScan = selectedBucket !== null;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Main content - hidden when fullscreen overlay is active */}
      {!hasFullscreenOverlay && (
        <main className="min-h-screen p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Receipt Scanner</h1>
                <p className="text-sm md:text-base text-gray-600">
                  Scan receipts on your phone, view and export from any device.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="self-start px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </header>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
                <button type="button" onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
            )}

            {/* No buckets prompt */}
            {sortedBuckets.length === 0 && (
              <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-blue-800 font-medium mb-2">Create your first bucket to get started</p>
                <p className="text-blue-600 text-sm mb-4">
                  Buckets help you organize receipts by Year, Month, and Category.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddBucketModalOpen(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Add Bucket
                </button>
              </div>
            )}

            {/* Mobile bucket selector - rendered above flex container */}
            {sortedBuckets.length > 0 && (
              <BucketSidebar
                buckets={bucketsForYearMonth}
                selectedBucket={selectedBucket}
                receiptCounts={receiptCounts}
                onSelectBucket={handleSelectBucket}
                onAddBucket={() => setIsAddBucketModalOpen(true)}
                variant="mobile"
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                years={uniqueYears}
                months={uniqueMonths}
                yearReceiptCounts={yearReceiptCounts}
                onSelectYear={handleSelectYear}
                onSelectMonth={handleSelectMonth}
                onExportYear={handleExportYear}
                yearReceiptTotal={yearReceiptTotal}
              />
            )}

            <div className="flex flex-col md:flex-row md:gap-8">
              {/* Desktop Sidebar - only shown when there are buckets */}
              {sortedBuckets.length > 0 && (
                <BucketSidebar
                  buckets={bucketsForYearMonth}
                  selectedBucket={selectedBucket}
                  receiptCounts={receiptCounts}
                  onSelectBucket={handleSelectBucket}
                  onAddBucket={() => setIsAddBucketModalOpen(true)}
                  variant="desktop"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  years={uniqueYears}
                  months={uniqueMonths}
                  yearReceiptCounts={yearReceiptCounts}
                  onSelectYear={handleSelectYear}
                  onSelectMonth={handleSelectMonth}
                  onExportYear={handleExportYear}
                  yearReceiptTotal={yearReceiptTotal}
                />
              )}

              {/* Main content area */}
              <div className="flex-1 min-w-0">
                {/* Header with bucket info and controls */}
                {selectedBucket !== null && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {formatBucketLabel(selectedBucket)} ({filteredReceipts.length})
                    </h2>
                    <div className="flex items-center gap-3">
                      <ExportButton receipts={filteredReceipts} bucket={selectedBucket} />
                    </div>
                  </div>
                )}

                {/* Scanning indicator banner */}
                {selectedBucket && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm font-medium">
                      Scanning into: {formatBucketLabel(selectedBucket)}
                    </p>
                  </div>
                )}

                {/* Receipt table */}
                <ReceiptTable
                  receipts={filteredReceipts}
                  selectedBucket={selectedBucket}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  deletingId={deletingId}
                />

                {/* Spacer for fixed bottom bar on mobile */}
                <div className="h-24 md:h-0" />
              </div>
            </div>

            {/* Scan buttons - fixed on mobile, relative on desktop */}
            <div className="fixed bottom-0 left-0 right-0 md:relative md:mt-6 bg-white md:bg-transparent border-t md:border-0 p-4 md:p-0 z-40">
              <CameraCapture
                onCapture={handleCapture}
                onOpenCamera={handleOpenCamera}
                onCloseCamera={handleCloseCamera}
                isCameraOpen={isCameraOpen}
                isLoading={isProcessing}
                disabled={!canScan}
                selectedBucket={selectedBucket}
              />
            </div>
          </div>
        </main>
      )}

      {/* Add Bucket Modal */}
      <AddBucketModal
        isOpen={isAddBucketModalOpen}
        existingBuckets={buckets}
        onClose={() => setIsAddBucketModalOpen(false)}
        onAdd={handleAddBucket}
      />

      {/* Edit Receipt Modal */}
      {editingReceipt && editingBucket && (
        <EditReceiptModal
          key={editingReceipt.id}
          receipt={editingReceipt}
          receiptBucket={editingBucket}
          buckets={buckets}
          isSaving={isSavingEdit}
          onClose={() => setEditingReceipt(null)}
          onSave={handleUpdateReceipt}
        />
      )}

      {/* Capture flow screens */}
      {captureState.status === "camera_active" && (
        <CameraCapture
          onCapture={handleCapture}
          onOpenCamera={handleOpenCamera}
          onCloseCamera={handleCloseCamera}
          isCameraOpen={true}
          isLoading={isProcessing}
        />
      )}

      {captureState.status === "processing" && (
        <ProcessingScreen
          imageData={captureState.imageData}
          stage={captureState.stage}
          onCancel={handleCancelProcessing}
        />
      )}

      {captureState.status === "editing" && (
        <EditScreen
          imageData={captureState.imageData}
          review={captureState.review}
          buckets={buckets}
          error={captureState.error}
          onConfirm={handleConfirmReview}
          onRetake={handleRetake}
        />
      )}

      {captureState.status === "saving" && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-lg">Saving receipt…</p>
          </div>
        </div>
      )}

      {captureState.status === "success" && (
        <ResultsScreen
          imageData={captureState.imageData}
          receipt={captureState.receipt}
          onSave={handleDone}
          onScanAnother={handleScanAnother}
        />
      )}

      {captureState.status === "error" && (
        <ErrorScreen
          imageData={captureState.imageData}
          error={captureState.error}
          onRetake={handleRetakeFromError}
          onRetry={handleRetryFromError}
        />
      )}
    </>
  );
}
