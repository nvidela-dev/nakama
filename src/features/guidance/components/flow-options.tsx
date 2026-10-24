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
    <div
      className={
        "flow-options grid gap-2 my-3.5 mx-0 grid-cols-[repeat(auto-fit,_minmax(min(100%,_140px),_1fr))] lg:compact:gap-2.5"
      }
      role="group"
      aria-label={t("Project type")}
    >
      {flowCatalog.map((flow) => (
        <Button
          className={
            'flow-option grid grid-cols-[18px_minmax(0,_1fr)] text-left bg-[#22382d] border border-[#58714b] text-ink p-2.5 gap-[5px_8px] min-h-22 [align-content:start] rounded-[7px] hover:[background:#2b4436] lg:compact:p-3.5 [&[aria-pressed="true"]]:border-lime [&[aria-pressed="true"]]:bg-[#304630] [&[aria-pressed="true"]]:[box-shadow:inset_0_0_0_1px_var(--color-lime)] focus-visible:[outline:2px_solid_var(--color-lime)] focus-visible:[outline-offset:3px] max-[700px]:grid-cols-[16px_minmax(0,_1fr)] max-[700px]:gap-[4px_6px] max-[700px]:p-2 max-[700px]:compact:grid-cols-[16px_minmax(0,_1fr)] max-[700px]:compact:gap-[4px_6px] max-[700px]:compact:p-2'
          }
          key={flow.id}
          name="flow"
          value={flow.id}
          type={onChange ? "button" : "submit"}
          disabled={pending}
          aria-pressed={onChange ? value === flow.id : undefined}
          onClick={onChange ? () => onChange(flow.id) : undefined}
          title={t(flow.description)}
        >
          <span
            aria-hidden="true"
            className={
              "[&:first-child]:[grid-row:1] [&:first-child]:text-[17px] [&:first-child]:text-lime [&:first-child]:[grid-column:1] [&:first-child]:leading-[1.2] [&:last-child]:text-[11px] [&:last-child]:text-muted [&:last-child]:font-normal [&:last-child]:leading-[1.4] [&:last-child]:[grid-column:1/-1] [&:last-child]:[display:-webkit-box] [&:last-child]:[-webkit-line-clamp:2] [&:last-child]:[-webkit-box-orient:vertical] [&:last-child]:overflow-hidden max-[700px]:[&:first-child]:text-[14px]"
            }
          >
            <Icon
              name={
                flow.id === "investigation"
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
          <strong
            className={
              "text-[14px] [grid-column:2] leading-[1.3] wrap-anywhere max-[700px]:text-[12px]"
            }
          >
            {t(flow.name)}
          </strong>
          <span
            className={
              "[&:first-child]:[grid-row:1] [&:first-child]:text-[17px] [&:first-child]:text-lime [&:first-child]:[grid-column:1] [&:first-child]:leading-[1.2] [&:last-child]:text-[11px] [&:last-child]:text-muted [&:last-child]:font-normal [&:last-child]:leading-[1.4] [&:last-child]:[grid-column:1/-1] [&:last-child]:[display:-webkit-box] [&:last-child]:[-webkit-line-clamp:2] [&:last-child]:[-webkit-box-orient:vertical] [&:last-child]:overflow-hidden max-[700px]:[&:first-child]:text-[14px]"
            }
          >
            {t(flow.description)}
          </span>
        </Button>
      ))}
    </div>
  );
}
