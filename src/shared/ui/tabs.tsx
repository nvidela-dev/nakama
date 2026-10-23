"use client";
import { useId, type ReactNode } from "react";
import { Button } from "./button";
export function Tabs<Value extends string>({
  items,
  value,
  onChange,
  label,
  listClassName,
  panelClassName,
}: {
  items: readonly { value: Value; label: ReactNode; content: ReactNode }[];
  value: Value;
  onChange: (value: Value) => void;
  label: string;
  listClassName?: string;
  panelClassName?: string;
}) {
  const id = useId();
  return (
    <>
      <div className={listClassName} role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <Button
            key={item.value}
            role="tab"
            id={`${id}-${item.value}-tab`}
            aria-selected={value === item.value}
            aria-controls={`${id}-${item.value}`}
            tabIndex={value === item.value ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index + (event.key === "ArrowRight" ? 1 : items.length - 1)) % items.length;
              const next = items[nextIndex];
              if (!next) return;
              onChange(next.value);
              document.getElementById(`${id}-${next.value}-tab`)?.focus();
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          className={panelClassName}
          role="tabpanel"
          id={`${id}-${item.value}`}
          aria-labelledby={`${id}-${item.value}-tab`}
          hidden={value !== item.value}
        >
          {item.content}
        </div>
      ))}
    </>
  );
}
