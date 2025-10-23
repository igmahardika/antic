// src/components/ui/Loading.tsx
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-40 w-full animate-pulse rounded bg-muted" />
      <div className="h-40 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export function InlineSpinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
  );
}
