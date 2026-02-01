'use client';

import { useState } from 'react';
import { ParsedReceiptData, EditedReceiptData } from '@/types/receipt';

interface EditScreenProps {
  imageData: string;
  parsedData: ParsedReceiptData;
  onConfirm: (data: EditedReceiptData) => void;
  onRetake: () => void;
}

export default function EditScreen({ imageData, parsedData, onConfirm, onRetake }: EditScreenProps) {
  const [formData, setFormData] = useState({
    vendor: parsedData.vendor || '',
    receipt_date: parsedData.receiptDate || '',
    subtotal: parsedData.subtotal || '',
    gst: parsedData.gst || '',
    total: parsedData.total || '',
    invoice_number: parsedData.invoiceNumber || '',
  });

  const [showFullImage, setShowFullImage] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;

    // Remove existing $ sign and parse the number
    const numStr = trimmed.replace(/^\$/, '');
    const num = parseFloat(numStr);

    // If it's a valid number, format with 2 decimal places
    if (!isNaN(num)) {
      return '$' + num.toFixed(2);
    }

    // If not a valid number, just add $ prefix if it starts with a digit
    if (!trimmed.startsWith('$') && /^\d/.test(trimmed)) {
      return '$' + trimmed;
    }
    return trimmed;
  };

  const handleSubmit = () => {
    const receiptData: EditedReceiptData = {
      vendor: formData.vendor || null,
      receipt_date: formData.receipt_date || null,
      subtotal: formatCurrency(formData.subtotal) || null,
      gst: formatCurrency(formData.gst) || null,
      total: formatCurrency(formData.total) || null,
      invoice_number: formData.invoice_number || null,
    };
    onConfirm(receiptData);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Review Receipt</h2>
            <p className="text-sm text-gray-400 mt-1">Edit any fields before saving</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Thumbnail - clickable to view full image */}
            <button
              onClick={() => setShowFullImage(true)}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData}
                alt="Receipt thumbnail"
                className="w-16 h-20 object-cover rounded-lg shadow"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{formData.vendor || 'Unknown Vendor'}</p>
                <p className="text-sm text-blue-500">Tap to view full image</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>

            {/* Editable fields */}
            <div className="p-4 space-y-4">
              {/* Vendor */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Vendor</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter vendor name"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Date</label>
                <input
                  type="text"
                  value={formData.receipt_date}
                  onChange={(e) => handleInputChange('receipt_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="YYYY/MM/DD"
                />
              </div>

              {/* Amount fields in grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Subtotal</label>
                  <input
                    type="text"
                    value={formData.subtotal}
                    onChange={(e) => handleInputChange('subtotal', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">GST</label>
                  <input
                    type="text"
                    value={formData.gst}
                    onChange={(e) => handleInputChange('gst', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Total</label>
                  <input
                    type="text"
                    value={formData.total}
                    onChange={(e) => handleInputChange('total', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                    placeholder="$0.00"
                  />
                </div>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Invoice #</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter invoice number"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={onRetake}
              className="flex-1 px-6 py-4 rounded-full font-medium text-gray-300 border-2 border-gray-600 hover:bg-gray-800 transition-colors"
            >
              Retake
            </button>
            <button
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
        <div
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData}
            alt="Receipt full view"
            className="max-h-[90vh] max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}
