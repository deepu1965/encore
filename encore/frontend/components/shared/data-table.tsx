'use client';

import { useState } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  className?: string;
  caption?: string;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  className,
  caption,
  onPageChange,
  currentPage: controlledPage,
  totalPages: controlledTotal,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const page = controlledPage ?? internalPage;
  const totalPages = controlledTotal ?? Math.ceil(data.length / pageSize);

  const handlePageChange = (p: number) => {
    if (onPageChange) {
      onPageChange(p);
    } else {
      setInternalPage(p);
    }
  };

  const paginatedData = controlledPage !== undefined ? data : data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={cn('space-y-4', className)}>
      <Table aria-label={caption ?? 'Data table'}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)} scope="col">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={String(col.key)}>
                  {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  );
}
