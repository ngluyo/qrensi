export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-44 animate-pulse rounded-[var(--radius-lg)] bg-surface-2" />
      <div className="h-14 animate-pulse rounded-2xl bg-surface-2" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />)}
      </div>
    </div>
  );
}
