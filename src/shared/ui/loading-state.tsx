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
    <div
      className={[
        `loading-state loading-${variant}`,
        "grid gap-2.5 [&.loading-cards]:grid-cols-[repeat(auto-fill,_minmax(280px,_1fr))] [&.loading-cards]:gap-2.5 [&.loading-workspace]:grid-cols-[repeat(auto-fit,_minmax(240px,_1fr))] [&.loading-workspace]:gap-4 [&.loading-compact]:gap-1.5 [&.loading-compact_.loading-placeholder]:min-h-9 [&.loading-compact_.loading-placeholder]:py-1.75 [&.loading-compact_.loading-placeholder]:px-2.5 [&.loading-compact_.loading-placeholder]:rounded-[6px] [&.loading-compact_.loading-placeholder]:gap-1 [&.loading-map_.loading-placeholder]:min-h-27.5 [&.loading-map_.loading-placeholder]:p-4",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-busy="true"
    >
      <span
        className={
          "sr-only absolute w-0.25 h-0.25 p-0 -m-0.25 overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
        }
      >
        {label}
      </span>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={
            "loading-placeholder grid gap-2 [align-content:center] min-h-16 py-3 px-3.5 rounded-[9px] bg-panel border border-line animate-loading-pulse motion-reduce:[animation:none]"
          }
          aria-hidden="true"
        >
          {variant === "cards" ? (
            <>
              <span
                className={
                  "loading-bone loading-bone-title block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[48%] h-3"
                }
              />
              <span
                className={"loading-bone-timeline flex items-center justify-between gap-1.5 mt-0.5"}
              >
                {Array.from({ length: 5 }, (__, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={"loading-bone-stage flex-1 grid gap-1 [justify-items:center]"}
                  >
                    <span
                      className={
                        "loading-bone loading-bone-dot block [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-2.75 h-2.75 rounded-full shrink-0 my-0 mx-auto"
                      }
                    />
                    <span
                      className={
                        "loading-bone loading-bone-tiny block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[62%] h-1.25 my-0 mx-auto"
                      }
                    />
                  </span>
                ))}
              </span>
            </>
          ) : variant === "compact" ? (
            <span className={"loading-bone-row flex items-center gap-2"}>
              <span
                className={
                  "loading-bone loading-bone-dot block [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-2.75 h-2.75 rounded-full shrink-0 my-0 mx-auto"
                }
              />
              <span className={"loading-bone-col flex-1 grid gap-1 min-w-0"}>
                <span
                  className={
                    "loading-bone loading-bone-line block h-2.25 rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[86%]"
                  }
                />
                <span
                  className={
                    "loading-bone loading-bone-short block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[56%] h-1.75"
                  }
                />
              </span>
            </span>
          ) : variant === "map" ? (
            <>
              <span
                className={
                  "loading-bone loading-bone-short block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[56%] h-1.75"
                }
              />
              <span
                className={"loading-bone-timeline flex items-center justify-between gap-1.5 mt-0.5"}
              >
                {Array.from({ length: 5 }, (__, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={"loading-bone-stage flex-1 grid gap-1 [justify-items:center]"}
                  >
                    <span
                      className={
                        "loading-bone loading-bone-dot block [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-2.75 h-2.75 rounded-full shrink-0 my-0 mx-auto"
                      }
                    />
                    <span
                      className={
                        "loading-bone loading-bone-tiny block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[62%] h-1.25 my-0 mx-auto"
                      }
                    />
                  </span>
                ))}
              </span>
            </>
          ) : (
            <>
              <span
                className={
                  "loading-bone loading-bone-title block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[48%] h-3"
                }
              />
              <span
                className={
                  "loading-bone loading-bone-line block h-2.25 rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[86%]"
                }
              />
              <span
                className={
                  "loading-bone loading-bone-short block rounded-[4px] [background:linear-gradient(90deg,_#243b31_20%,_#345244_50%,_#243b31_80%)] [background-size:200%_100%] animate-loading-shimmer motion-reduce:[animation:none] w-[56%] h-1.75"
                }
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
