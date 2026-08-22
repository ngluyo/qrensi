export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />)}
    </div>
  );
}
