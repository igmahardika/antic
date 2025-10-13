export default function LoadingView({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" aria-label="Loading" />
      <span className="ml-2 text-sm">{label}</span>
    </div>
  );
}
