export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-surface-2" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />)}
      </div>
    </div>
  );
}
