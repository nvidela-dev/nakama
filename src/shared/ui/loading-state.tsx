export function LoadingState({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <div className="loading-state" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="loading-placeholder" aria-hidden="true" />
      ))}
    </div>
  );
}
