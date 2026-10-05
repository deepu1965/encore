import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <h3 className="text-h3 font-semibold text-foreground">{title}</h3>
      <p className="text-body text-muted mt-2 max-w-md">{message}</p>
      {retry && (
        <Button onClick={retry} className="mt-6">
          Try again
        </Button>
      )}
    </div>
  );
}
