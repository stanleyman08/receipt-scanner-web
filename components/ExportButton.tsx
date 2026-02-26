'use client';

import { Receipt } from '@/types/receipt';
import { Bucket } from '@/types/bucket';
import { downloadBucketExcel } from '@/lib/excel';

interface ExportButtonProps {
  receipts: Receipt[];
  disabled?: boolean;
  bucket?: Bucket | null;
}

export default function ExportButton({ receipts, disabled, bucket }: ExportButtonProps) {
  const handleExport = async () => {
    if (!bucket) return;
    await downloadBucketExcel(receipts, bucket);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || receipts.length === 0}
      className="bg-green-600 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 md:h-5 md:w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      <span className="md:hidden">Excel</span>
      <span className="hidden md:inline">Export to Excel</span>
    </button>
  );
}
