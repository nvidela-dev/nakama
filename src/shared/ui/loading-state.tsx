export type LoadingVariant = "stack" | "cards" | "workspace" | "compact" | "map";

export function LoadingState({
  label,
  lines = 3,
  variant = "stack",
}: {
  label: string;
  lines?: number;
  variant?: LoadingVariant;
}) {
  return (
    <div className={`loading-state loading-${variant}`} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="loading-placeholder" aria-hidden="true">
          {variant === "cards" ? (
            <>
              <span className="loading-bone loading-bone-title" />
              <span className="loading-bone-timeline">
                {Array.from({ length: 5 }, (__, dotIndex) => (
                  <span key={dotIndex} className="loading-bone-stage">
                    <span className="loading-bone loading-bone-dot" />
                    <span className="loading-bone loading-bone-tiny" />
                  </span>
                ))}
              </span>
            </>
          ) : variant === "compact" ? (
            <span className="loading-bone-row">
              <span className="loading-bone loading-bone-dot" />
              <span className="loading-bone-col">
                <span className="loading-bone loading-bone-line" />
                <span className="loading-bone loading-bone-short" />
              </span>
            </span>
          ) : variant === "map" ? (
            <>
              <span className="loading-bone loading-bone-short" />
              <span className="loading-bone-timeline">
                {Array.from({ length: 5 }, (__, dotIndex) => (
                  <span key={dotIndex} className="loading-bone-stage">
                    <span className="loading-bone loading-bone-dot" />
                    <span className="loading-bone loading-bone-tiny" />
                  </span>
                ))}
              </span>
            </>
          ) : (
            <>
              <span className="loading-bone loading-bone-title" />
              <span className="loading-bone loading-bone-line" />
              <span className="loading-bone loading-bone-short" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
