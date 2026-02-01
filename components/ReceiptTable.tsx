'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { Receipt } from '@/types/receipt';
import { Bucket, formatBucketLabel } from '@/types/bucket';

interface ReceiptTableProps {
  receipts: Receipt[];
  selectedBucket: Bucket | null;
  onDelete: (id: string) => void;
  onEdit: (receipt: Receipt) => void;
  deletingId: string | null;
  isLoading: boolean;
}

const columnHelper = createColumnHelper<Receipt>();

export default function ReceiptTable({
  receipts,
  selectedBucket,
  onDelete,
  onEdit,
  deletingId,
  isLoading,
}: ReceiptTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'receipt_date', desc: true },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('receipt_date', {
        header: 'Date',
        cell: (info) => info.getValue() || '-',
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('vendor', {
        header: 'Vendor',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('invoice_number', {
        header: 'Invoice #',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('subtotal', {
        header: () => <span className="w-full text-right block">Subtotal</span>,
        cell: (info) => <span className="block text-right">{info.getValue() || '-'}</span>,
      }),
      columnHelper.accessor('gst', {
        header: () => <span className="w-full text-right block">GST</span>,
        cell: (info) => <span className="block text-right">{info.getValue() || '-'}</span>,
      }),
      columnHelper.accessor('total', {
        header: () => <span className="w-full text-right block">Total</span>,
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="block text-right font-medium">{value}</span>
          ) : (
            <span className="block text-right">-</span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(info.row.original)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(info.row.original.id)}
              disabled={deletingId === info.row.original.id}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              {deletingId === info.row.original.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        ),
      }),
    ],
    [onDelete, onEdit, deletingId]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: receipts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedBucket === null) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a bucket to view receipts.</p>
        <p className="text-gray-400 text-sm mt-1">
          Or create your first bucket to get started.
        </p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No receipts in {formatBucketLabel(selectedBucket)}.</p>
        <p className="text-gray-400 text-sm mt-1">
          Start scanning to add receipts!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanSort() && (
                      <span className="text-gray-400">
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? ''}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
