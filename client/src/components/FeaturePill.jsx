export function FeaturePill({ label, value }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
