'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import ReceiptTable from '@/components/ReceiptTable';
import BucketSidebar from '@/components/BucketSidebar';
import AddBucketModal from '@/components/AddBucketModal';
import EditReceiptModal from '@/components/EditReceiptModal';
import ExportButton from '@/components/ExportButton';
import { EditScreen, ProcessingScreen, ResultsScreen, ErrorScreen } from '@/components/capture-flow';
import { Receipt, ParseReceiptResponse, SaveReceiptResponse, ReceiptInsert, EditedReceiptData } from '@/types/receipt';
import { Bucket, BucketCategory, formatBucketLabel } from '@/types/bucket';
import { CaptureFlowState, ProcessingStage } from '@/types/capture-flow';
import { getReceipts, deleteReceipt, updateReceipt, getBuckets, createBucket } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/client';
import {
  filterByBucket,
  getReceiptCountsByBucket,
  sortBuckets,
  getDefaultBucket,
  getUniqueYears,
  groupBucketsByYear,
  getReceiptCountsByYear,
  getUniqueMonthsForYear,
  filterBucketsByYearMonth,
  filterReceiptsByYear,
} from '@/lib/bucket';
import { downloadYearExcel } from '@/lib/excel';
import { optimizeImageForOCR } from '@/lib/image-utils';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bucket state
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isAddBucketModalOpen, setIsAddBucketModalOpen] = useState(false);

  // Edit receipt state
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Capture flow state
  const [captureState, setCaptureState] = useState<CaptureFlowState>({ status: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived state
  const sortedBuckets = sortBuckets(buckets);
  const receiptCounts = getReceiptCountsByBucket(receipts);
  const uniqueYears = getUniqueYears(buckets);
  const bucketsByYear = groupBucketsByYear(buckets);
  const yearReceiptCounts = getReceiptCountsByYear(receipts, buckets);
  const uniqueMonths = useMemo(
    () => selectedYear !== null ? getUniqueMonthsForYear(buckets, selectedYear) : [],
    [buckets, selectedYear]
  );
  const bucketsForYearMonth = useMemo(
    () => selectedYear !== null && selectedMonth !== null
      ? filterBucketsByYearMonth(buckets, selectedYear, selectedMonth)
      : [],
    [buckets, selectedYear, selectedMonth]
  );
  const yearReceiptTotal = selectedYear !== null
    ? (yearReceiptCounts.get(selectedYear) || 0)
    : 0;
  const filteredReceipts = selectedBucket
    ? filterByBucket(receipts, selectedBucket.id)
    : [];

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([getReceipts(), getBuckets()]).then(([receiptsData, bucketsData]) => {
      setReceipts(receiptsData);
      setBuckets(bucketsData);
      setIsLoading(false);
      // Set default bucket and year after data loads
      if (selectedBucket === null && bucketsData.length > 0) {
        const defaultBucket = getDefaultBucket(bucketsData);
        if (defaultBucket) {
          setSelectedBucket(defaultBucket);
          setSelectedYear(defaultBucket.year);
          setSelectedMonth(defaultBucket.month);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleExportYear = () => {
    if (selectedYear === null) return;
    const yearReceipts = filterReceiptsByYear(receipts, buckets, selectedYear);
    const bucketMap = new Map(buckets.map((b) => [b.id, b]));
    downloadYearExcel(yearReceipts, bucketMap, selectedYear);
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
    const newBucket = await createBucket({ year, month, category });
    if (newBucket) {
      setBuckets((prev) => [...prev, newBucket]);
      setSelectedBucket(newBucket);
      setSelectedYear(newBucket.year);
      setSelectedMonth(newBucket.month);
      setIsAddBucketModalOpen(false);
    } else {
      setError('Failed to create bucket. It may already exist.');
    }
  };

  // Process the receipt scan through stages (parse only, no saving)
  const processReceipt = async (imageData: string) => {
    abortControllerRef.current = new AbortController();

    const updateStage = (stage: ProcessingStage) => {
      setCaptureState({ status: 'processing', imageData, stage });
    };

    try {
      // Stage 1 & 2: Deskew and optimize image (with progress callback)
      updateStage('deskewing');
      const optimizedImage = await optimizeImageForOCR(imageData, (preprocessStage) => {
        updateStage(preprocessStage);
      });

      if (abortControllerRef.current?.signal.aborted) return;

      // Stage 2: Analyzing with Textract
      updateStage('analyzing');

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: optimizedImage }),
        signal: abortControllerRef.current?.signal,
      });

      if (abortControllerRef.current?.signal.aborted) return;

      // Stage 3: Extracting
      updateStage('extracting');
      const result: ParseReceiptResponse = await response.json();

      if (abortControllerRef.current?.signal.aborted) return;

      if (result.success && result.data) {
        // Transition to editing state with parsed data
        setCaptureState({
          status: 'editing',
          imageData,
          parsedData: result.data,
        });
      } else {
        setCaptureState({
          status: 'error',
          imageData,
          error: result.error || 'Failed to extract receipt data',
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setCaptureState({
        status: 'error',
        imageData,
        error: 'Failed to scan receipt. Please try again.',
      });
    }
  };

  // Save the edited receipt with optimistic UI
  const saveEditedReceipt = async (imageData: string, receiptData: ReceiptInsert) => {
    // Create optimistic receipt with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticReceipt: Receipt = {
      id: tempId,
      subtotal: receiptData.subtotal ?? null,
      gst: receiptData.gst ?? null,
      total: receiptData.total ?? null,
      invoice_number: receiptData.invoice_number ?? null,
      vendor: receiptData.vendor ?? null,
      receipt_date: receiptData.receipt_date ?? null,
      image_url: receiptData.image_url ?? null,
      bucket_id: receiptData.bucket_id,
      created_at: new Date().toISOString(),
    };

    // Immediately add to receipts list (optimistic update)
    setReceipts((prev) => [optimisticReceipt, ...prev]);

    // Show success state immediately for better UX
    setCaptureState({
      status: 'success',
      imageData,
      receipt: optimisticReceipt,
    });

    try {
      const response = await fetch('/api/save-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      const result: SaveReceiptResponse = await response.json();

      if (result.success && result.receipt) {
        // Replace optimistic receipt with real one from server
        setReceipts((prev) =>
          prev.map((r) => (r.id === tempId ? result.receipt! : r))
        );
      } else {
        // Rollback: remove optimistic receipt on failure
        setReceipts((prev) => prev.filter((r) => r.id !== tempId));
        setError(result.error || 'Failed to save receipt. Please try again.');
      }
    } catch {
      // Rollback: remove optimistic receipt on error
      setReceipts((prev) => prev.filter((r) => r.id !== tempId));
      setError('Failed to save receipt. Please try again.');
    }
  };

  // Camera handlers
  const handleOpenCamera = () => {
    if (selectedBucket === null) {
      setError('Please select or create a bucket first');
      return;
    }
    setCaptureState({ status: 'camera_active' });
  };

  const handleCloseCamera = () => {
    setCaptureState({ status: 'idle' });
  };

  const handleCapture = (imageData: string) => {
    // Skip preview, go straight to processing
    processReceipt(imageData);
  };

  // Processing handlers
  const handleCancelProcessing = () => {
    abortControllerRef.current?.abort();
    setCaptureState({ status: 'idle' });
  };

  // Edit handlers
  const handleConfirmEdit = (editedData: EditedReceiptData) => {
    if (captureState.status === 'editing' && selectedBucket !== null) {
      // Add bucket_id to the receipt data
      const receiptWithBucket: ReceiptInsert = {
        ...editedData,
        bucket_id: selectedBucket.id,
      };
      saveEditedReceipt(captureState.imageData, receiptWithBucket);
    }
  };

  const handleRetake = () => {
    setCaptureState({ status: 'camera_active' });
  };

  // Success handlers (receipt already added optimistically in saveEditedReceipt)
  const handleSaveReceipt = () => {
    setSuccess('Receipt saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
    setCaptureState({ status: 'idle' });
  };

  const handleScanAnother = () => {
    setCaptureState({ status: 'camera_active' });
  };

  // Error handlers
  const handleRetakeFromError = () => {
    setCaptureState({ status: 'camera_active' });
  };

  const handleRetryFromError = () => {
    if (captureState.status === 'error') {
      processReceipt(captureState.imageData);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);

    const success = await deleteReceipt(id);
    if (success) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    } else {
      setError('Failed to delete receipt');
    }

    setDeletingId(null);
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
  };

  const handleUpdateReceipt = async (id: string, updates: Partial<Receipt>) => {
    setIsSavingEdit(true);
    setError(null);

    const updated = await updateReceipt(id, updates);
    if (updated) {
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
      setEditingReceipt(null);
      setSuccess('Receipt updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Failed to update receipt');
    }

    setIsSavingEdit(false);
  };

  const isProcessing = captureState.status === 'processing';
  const isCameraOpen = captureState.status === 'camera_active';
  const hasFullscreenOverlay = captureState.status !== 'idle';
  const canScan = selectedBucket !== null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
                onClick={handleLogout}
                className="self-start px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </header>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                {success}
              </div>
            )}

            {/* No buckets prompt */}
            {!isLoading && sortedBuckets.length === 0 && (
              <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-blue-800 font-medium mb-2">
                  Create your first bucket to get started
                </p>
                <p className="text-blue-600 text-sm mb-4">
                  Buckets help you organize receipts by Year, Month, and Category.
                </p>
                <button
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
                      <ExportButton
                        receipts={filteredReceipts}
                        disabled={isLoading}
                        bucket={selectedBucket}
                      />
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
                  isLoading={isLoading}
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
      <EditReceiptModal
        receipt={editingReceipt}
        isOpen={editingReceipt !== null}
        isSaving={isSavingEdit}
        onClose={() => setEditingReceipt(null)}
        onSave={handleUpdateReceipt}
      />

      {/* Capture flow screens */}
      {captureState.status === 'camera_active' && (
        <CameraCapture
          onCapture={handleCapture}
          onOpenCamera={handleOpenCamera}
          onCloseCamera={handleCloseCamera}
          isCameraOpen={true}
          isLoading={isProcessing}
        />
      )}

      {captureState.status === 'processing' && (
        <ProcessingScreen
          imageData={captureState.imageData}
          stage={captureState.stage}
          onCancel={handleCancelProcessing}
        />
      )}

      {captureState.status === 'editing' && (
        <EditScreen
          imageData={captureState.imageData}
          parsedData={captureState.parsedData}
          onConfirm={handleConfirmEdit}
          onRetake={handleRetake}
        />
      )}

      {captureState.status === 'saving' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-lg">Saving receipt...</p>
          </div>
        </div>
      )}

      {captureState.status === 'success' && (
        <ResultsScreen
          imageData={captureState.imageData}
          receipt={captureState.receipt}
          onSave={handleSaveReceipt}
          onScanAnother={handleScanAnother}
        />
      )}

      {captureState.status === 'error' && (
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
