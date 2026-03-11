import { Search, X } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  onClear?: () => void;
}

export function EmptyState({ message = 'No data found for the selected filters.', onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Search className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <X className="h-3.5 w-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}
