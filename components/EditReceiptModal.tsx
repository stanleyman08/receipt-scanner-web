'use client';

import { useState, useEffect } from 'react';
import { Receipt } from '@/types/receipt';

interface EditReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Receipt>) => void;
}

export default function EditReceiptModal({
  receipt,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: EditReceiptModalProps) {
  const [formData, setFormData] = useState({
    vendor: '',
    receipt_date: '',
    subtotal: '',
    gst: '',
    total: '',
    invoice_number: '',
  });

  useEffect(() => {
    if (receipt) {
      // Use timeout to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setFormData({
          vendor: receipt.vendor || '',
          receipt_date: receipt.receipt_date || '',
          subtotal: receipt.subtotal || '',
          gst: receipt.gst || '',
          total: receipt.total || '',
          invoice_number: receipt.invoice_number || '',
        });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [receipt]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) return;

    onSave(receipt.id, {
      vendor: formData.vendor || null,
      receipt_date: formData.receipt_date || null,
      subtotal: formatCurrency(formData.subtotal) || null,
      gst: formatCurrency(formData.gst) || null,
      total: formatCurrency(formData.total) || null,
      invoice_number: formData.invoice_number || null,
    });
  };

  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Receipt</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="text"
              value={formData.receipt_date}
              onChange={(e) => handleInputChange('receipt_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="YYYY/MM/DD"
            />
          </div>

          {/* Amount fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal
              </label>
              <input
                type="text"
                value={formData.subtotal}
                onChange={(e) => handleInputChange('subtotal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="$0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST
              </label>
              <input
                type="text"
                value={formData.gst}
                onChange={(e) => handleInputChange('gst', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="$0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice #
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => handleInputChange('invoice_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter invoice number"
            />
          </div>

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
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
