"use client";
import { Icon } from "@/shared/ui/icon";
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
            <Icon
              name={
                flow.id === "platform"
                  ? "server"
                  : flow.id === "investigation"
                    ? "search"
                    : flow.id === "creative"
                      ? "creative"
                      : flow.id.includes("eshop")
                        ? "shop"
                        : flow.id === "saas"
                          ? "software"
                          : flow.id === "importation"
                            ? "import"
                            : flow.id === "consultancy"
                              ? "consultancy"
                              : "idea"
              }
            />
          </span>
          <strong>{t(flow.name)}</strong>
          <span>{t(flow.description)}</span>
        </Button>
      ))}
    </div>
  );
}
