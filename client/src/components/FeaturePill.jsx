export function FeaturePill({ label, value }) {
  return (
    <div className="surface-card rounded-lg px-5 py-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-ink/50">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold gradient-text">{value}</p>
    </div>
  );
}
