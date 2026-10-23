"use client";
import { Button } from "@/shared/ui/button";

import { flowCatalog } from "@/features/guidance/model/flow-catalog.generated";
import { useT } from "@/shared/i18n/provider";
export function FlowOptions({
  value,
  onChange,
  pending = false,
}: {
  value?: string;
  onChange?: (value: string) => void;
  pending?: boolean;
}) {
  const t = useT();
  return (
    <div className="flow-options" role="group" aria-label={t("Project type")}>
      {flowCatalog.map((flow) => (
        <Button
          className="flow-option"
          key={flow.id}
          name="flow"
          value={flow.id}
          type={onChange ? "button" : "submit"}
          disabled={pending}
          aria-pressed={onChange ? value === flow.id : undefined}
          onClick={onChange ? () => onChange(flow.id) : undefined}
          title={t(flow.description)}
        >
          <span aria-hidden="true">
            {flow.id === "investigation"
              ? "⌕"
              : flow.id === "creative"
                ? "✳"
                : flow.id.includes("eshop")
                  ? "▣"
                  : flow.id === "saas"
                    ? "⌘"
                    : flow.id === "importation"
                      ? "⇄"
                      : flow.id === "consultancy"
                        ? "◇"
                        : "↗"}
          </span>
          <strong>{t(flow.name)}</strong>
          <span>{t(flow.description)}</span>
        </Button>
      ))}
    </div>
  );
}
