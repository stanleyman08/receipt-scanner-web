'use client';

import { useState, useEffect, useRef } from 'react';
import { Bucket, BUCKET_CATEGORIES, MONTH_NAMES, BucketCategory } from '@/types/bucket';
import { bucketExists } from '@/lib/bucket';

interface AddBucketModalProps {
  isOpen: boolean;
  existingBuckets: Bucket[];
  onClose: () => void;
  onAdd: (year: number, month: number, category: BucketCategory) => void;
}

export default function AddBucketModal({
  isOpen,
  existingBuckets,
  onClose,
  onAdd,
}: AddBucketModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState((currentYear - 1).toString());
  const [month, setMonth] = useState(currentMonth.toString());
  const [category, setCategory] = useState<BucketCategory>('Food');
  const [error, setError] = useState<string | null>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      const timeoutId = setTimeout(() => {
        setYear((currentYear - 1).toString());
        setMonth(currentMonth.toString());
        setCategory('Food');
        setError(null);
        yearInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, currentYear, currentMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum)) {
      setError('Please enter a valid year');
      return;
    }

    if (yearNum < 1900 || yearNum > currentYear + 1) {
      setError(`Year must be between 1900 and ${currentYear + 1}`);
      return;
    }

    if (bucketExists(existingBuckets, yearNum, monthNum, category)) {
      setError('This bucket already exists');
      return;
    }

    onAdd(yearNum, monthNum, category);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add Bucket
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Year input */}
          <div className="mb-4">
            <label
              htmlFor="bucket-year"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Year
            </label>
            <input
              ref={yearInputRef}
              id="bucket-year"
              type="number"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setError(null);
              }}
              min={1900}
              max={currentYear + 1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 2024"
            />
          </div>

          {/* Month dropdown */}
          <div className="mb-4">
            <label
              htmlFor="bucket-month"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Month
            </label>
            <select
              id="bucket-month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Category dropdown */}
          <div className="mb-4">
            <label
              htmlFor="bucket-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category
            </label>
            <select
              id="bucket-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as BucketCategory);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BUCKET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
