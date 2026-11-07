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
          variant="secondary"
          className={
            'flow-option h-auto! whitespace-normal! grid! grid-cols-[18px_minmax(0,_1fr)] text-left gap-[5px_8px] min-h-22 content-start hover:[background:var(--theme-selected,#2b4436)] [&[aria-pressed="true"]]:[box-shadow:inset_0_0_0_1px_var(--color-lime)] focus-visible:[outline:2px_solid_var(--color-lime)] focus-visible:[outline-offset:3px] max-[700px]:grid-cols-[16px_minmax(0,_1fr)] max-[700px]:gap-[4px_6px]'
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
              "first:row-start-1 first:text-[17px] first:text-lime first:col-start-1 first:leading-[1.2] last:text-[11px] last:text-muted last:font-normal last:leading-[1.4] last:[grid-column:1/-1] last:[display:-webkit-box] last:[-webkit-line-clamp:2] last:[-webkit-box-orient:vertical] last:overflow-hidden max-[700px]:first:text-[14px]"
            }
          >
            <Icon
              name={
                flow.id === "self-improvement"
                  ? "rotateRight"
                  : flow.id === "platform"
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
          <strong
            className={
              "text-[14px] col-start-2 leading-[1.3] wrap-anywhere max-[700px]:text-[12px]"
            }
          >
            {t(flow.name)}
          </strong>
          <span
            className={
              "first:row-start-1 first:text-[17px] first:text-lime first:col-start-1 first:leading-[1.2] last:text-[11px] last:text-muted last:font-normal last:leading-[1.4] last:[grid-column:1/-1] last:[display:-webkit-box] last:[-webkit-line-clamp:2] last:[-webkit-box-orient:vertical] last:overflow-hidden max-[700px]:first:text-[14px]"
            }
          >
            {t(flow.description)}
          </span>
        </Button>
      ))}
    </div>
  );
}
