'use client';

import { Receipt } from '@/types/receipt';

interface ResultsScreenProps {
  imageData: string;
  receipt: Receipt;
  onSave: () => void;
  onScanAnother: () => void;
}

export default function ResultsScreen({ imageData, receipt, onSave, onScanAnother }: ResultsScreenProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return dateStr; // Already normalized to YYYY/MM/DD format
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Success header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 animate-scale-in">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Receipt Scanned!</h2>
        </div>

        {/* Receipt card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Thumbnail */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData}
              alt="Receipt thumbnail"
              className="w-16 h-20 object-cover rounded-lg shadow"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{receipt.vendor || 'Unknown Vendor'}</p>
              <p className="text-sm text-gray-500">{formatDate(receipt.receipt_date)}</p>
            </div>
          </div>

          {/* Extracted data */}
          <div className="p-4 space-y-3">
            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Vendor</p>
              <p className="text-gray-900">{receipt.vendor || '—'}</p>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900">{receipt.total || '—'}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Subtotal</p>
                <p className="text-gray-900">{receipt.subtotal || '—'}</p>
              </div>

              <div className="animate-slide-up" style={{ animationDelay: '125ms' }}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">GST</p>
                <p className="text-gray-900">{receipt.gst || '—'}</p>
              </div>

              <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                <p className="text-gray-900">{formatDate(receipt.receipt_date)}</p>
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice #</p>
              <p className="text-gray-900">{receipt.invoice_number || '—'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onScanAnother}
            className="flex-1 px-6 py-4 rounded-full font-medium text-gray-300 border-2 border-gray-600 hover:bg-gray-800 transition-colors"
          >
            Scan Another
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-6 py-4 rounded-full font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
