'use client';

import { useState, useEffect } from 'react';
import { Bucket, formatBucketLabel } from '@/types/bucket';

interface BucketSidebarProps {
  buckets: Bucket[];
  selectedBucket: Bucket | null;
  receiptCounts: Map<string, number>;
  onSelectBucket: (bucket: Bucket) => void;
  onAddBucket: () => void;
  variant?: 'mobile' | 'desktop';
}

export default function BucketSidebar({
  buckets,
  selectedBucket,
  receiptCounts,
  onSelectBucket,
  onAddBucket,
  variant,
}: BucketSidebarProps) {
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-bucket-dropdown]')) {
        setIsMobileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Desktop sidebar
  const DesktopSidebar = (
    <div className="hidden md:block w-64 flex-shrink-0">
      <div className="sticky top-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Buckets
        </h2>
        <nav className="space-y-1">
          {buckets.map((bucket) => {
            const count = receiptCounts.get(bucket.id) || 0;
            const isSelected = selectedBucket?.id === bucket.id;
            return (
              <button
                key={bucket.id}
                onClick={() => onSelectBucket(bucket)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{formatBucketLabel(bucket)}</span>
                <span
                  className={`ml-2 text-xs flex-shrink-0 ${
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
        <button
          onClick={onAddBucket}
          className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add Bucket
        </button>
      </div>
    </div>
  );

  // Mobile dropdown
  const MobileDropdown = (
    <div className="md:hidden w-full flex items-center gap-2 mb-6" data-bucket-dropdown>
      <div className="relative flex-1">
        <button
          onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="truncate">
            {selectedBucket ? (
              <>
                {formatBucketLabel(selectedBucket)}{' '}
                <span className="text-gray-400">
                  ({receiptCounts.get(selectedBucket.id) || 0})
                </span>
              </>
            ) : (
              'Select a bucket'
            )}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 flex-shrink-0 ml-2 transition-transform ${
              isMobileDropdownOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isMobileDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {buckets.map((bucket) => {
              const count = receiptCounts.get(bucket.id) || 0;
              const isSelected = selectedBucket?.id === bucket.id;
              return (
                <button
                  key={bucket.id}
                  onClick={() => {
                    onSelectBucket(bucket);
                    setIsMobileDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{formatBucketLabel(bucket)}</span>
                  <span className="text-gray-400 ml-2 flex-shrink-0">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={onAddBucket}
        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        aria-label="Add bucket"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );

  // Conditional rendering based on variant
  if (variant === 'mobile') {
    return MobileDropdown;
  }
  if (variant === 'desktop') {
    return DesktopSidebar;
  }

  // Default: render both (legacy behavior)
  return (
    <>
      {DesktopSidebar}
      {MobileDropdown}
    </>
  );
}
