import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageNumbers = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  // Generate page numbers to show
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const left = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const right = Math.min(totalPages, left + maxVisiblePages - 1);
    if (left > 1) pages.push(1);
    if (left > 2) pages.push('ellipsis');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('ellipsis');
    if (right < totalPages) pages.push(totalPages);
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center gap-1', className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
      >
        ← Prev
      </Button>
      {showPageNumbers &&
        pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </Button>
          ),
        )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canNext}
        aria-label="Next page"
      >
        Next →
      </Button>
    </nav>
  );
}
