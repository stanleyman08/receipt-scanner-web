'use client';

import { Bucket, MONTH_NAMES } from '@/types/bucket';

interface BucketSidebarProps {
  buckets: Bucket[];
  selectedBucket: Bucket | null;
  receiptCounts: Map<string, number>;
  onSelectBucket: (bucket: Bucket) => void;
  onAddBucket: () => void;
  variant?: 'mobile' | 'desktop';
  selectedYear: number | null;
  selectedMonth: number | null;
  years: number[];
  months: number[];
  yearReceiptCounts: Map<number, number>;
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
  onExportYear: () => void;
  yearReceiptTotal: number;
}

// Custom select with chevron overlay — defined outside to avoid remount
function CustomSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`appearance-none w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-colors hover:border-gray-300 ${className || ''}`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

export default function BucketSidebar({
  buckets,
  selectedBucket,
  receiptCounts,
  onSelectBucket,
  onAddBucket,
  variant,
  selectedYear,
  selectedMonth,
  years,
  months,
  yearReceiptCounts,
  onSelectYear,
  onSelectMonth,
  onExportYear,
  yearReceiptTotal,
}: BucketSidebarProps) {
  // Desktop sidebar
  const DesktopSidebar = (
    <div className="hidden md:block w-64 flex-shrink-0">
      <div className="sticky top-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Buckets
        </h2>

        {years.length > 0 && (
          <>
            {/* Year & Month selectors */}
            <div className="flex gap-2 mb-4">
              <div className="w-[5.5rem]">
                <CustomSelect
                  value={selectedYear ?? ''}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="font-mono font-bold text-gray-900"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </CustomSelect>
              </div>
              <div className="flex-1">
                <CustomSelect
                  value={selectedMonth ?? ''}
                  onChange={(e) => onSelectMonth(Number(e.target.value))}
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {MONTH_NAMES[month - 1]}
                    </option>
                  ))}
                </CustomSelect>
              </div>
            </div>

            {/* Category list */}
            <nav>
              <div
                key={`${selectedYear}-${selectedMonth}`}
                className="animate-slide-up space-y-0.5"
              >
                {buckets.map((bucket) => {
                  const count = receiptCounts.get(bucket.id) || 0;
                  const isSelected = selectedBucket?.id === bucket.id;
                  return (
                    <button
                      key={bucket.id}
                      onClick={() => onSelectBucket(bucket)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{bucket.category}</span>
                      <span
                        className={`ml-2 text-xs tabular-nums flex-shrink-0 ${
                          isSelected ? 'text-gray-400' : 'text-gray-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
                {buckets.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-400 italic">
                    No buckets for this month
                  </p>
                )}
              </div>
            </nav>

            <div className="border-t border-dashed border-gray-200 my-4" />
          </>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onAddBucket}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
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

          {selectedYear && (
            <button
              onClick={onExportYear}
              disabled={yearReceiptTotal === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Export {selectedYear}
              <span className="text-xs text-gray-400">
                ({yearReceiptTotal})
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile layout — inline selectors + category pills
  const MobileLayout = (
    <div className="md:hidden w-full mb-6 space-y-3">
      {/* Row 1: Year + Month selectors + Export + Add */}
      <div className="flex items-center gap-2">
        {years.length > 0 && (
          <>
            <div className="w-[5.5rem]">
              <CustomSelect
                value={selectedYear ?? ''}
                onChange={(e) => onSelectYear(Number(e.target.value))}
                className="font-mono font-bold text-gray-900"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div className="flex-1">
              <CustomSelect
                value={selectedMonth ?? ''}
                onChange={(e) => onSelectMonth(Number(e.target.value))}
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {MONTH_NAMES[month - 1]}
                  </option>
                ))}
              </CustomSelect>
            </div>
          </>
        )}
        {selectedYear && (
          <button
            onClick={onExportYear}
            disabled={yearReceiptTotal === 0}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Export ${selectedYear}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4.5 w-4.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onAddBucket}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
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

      {/* Row 2: Category pills */}
      {buckets.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {buckets.map((bucket) => {
            const count = receiptCounts.get(bucket.id) || 0;
            const isSelected = selectedBucket?.id === bucket.id;
            return (
              <button
                key={bucket.id}
                onClick={() => onSelectBucket(bucket)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {bucket.category}
                <span
                  className={`ml-1.5 text-xs tabular-nums ${
                    isSelected ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (variant === 'mobile') {
    return MobileLayout;
  }
  if (variant === 'desktop') {
    return DesktopSidebar;
  }

  return (
    <>
      {DesktopSidebar}
      {MobileLayout}
    </>
  );
}
