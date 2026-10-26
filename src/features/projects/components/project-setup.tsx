"use client";
import { Icon } from "@/shared/ui/icon";
import { Input, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/shared/contracts/action-state";
import { flowCatalog, isFlowId } from "@/features/guidance/model/flow-catalog.generated";
import { Dialog } from "@/shared/ui/dialog";
import { FlowOptions } from "@/features/guidance/components/flow-options";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";

export function ProjectSetup({
  open,
  onClose,
  initialSourceIds,
  createAction,
}: {
  open: boolean;
  onClose: () => void;
  initialSourceIds: string[];
  createAction: (state: ActionState, data: FormData) => Promise<ActionState>;
}) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<"type" | "details">("type");
  const [flow, setFlow] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [state, action, pending] = useActionState(createAction, {});
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [step, open]);
  function close() {
    if (!pending) onClose();
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!pending}
      className={
        'project-setup-dialog w-[min(760px,_calc(100vw_-_32px))] max-h-[90dvh] overflow-y-auto bg-panel text-ink border border-line rounded-[12px] p-6 backdrop:[background:var(--theme-map,#06100dd9)] [&_>_.muted]:text-[13px] [&_>_.muted]:my-3.5 [&_>_.muted]:mx-0 [&_.text-button[aria-pressed="true"]]:text-lime [&_.text-button[aria-pressed="true"]]:underline max-[700px]:p-4.5'
      }
      labelledBy="project-setup-title"
    >
      {open && (
        <>
          <div className={"project-setup-heading flex items-start justify-between gap-4"}>
            <div>
              <p
                className={
                  "eyebrow tracking-[2px] text-lime font-bold block [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px] mt-0 mx-0 mb-1.75 text-[11px]"
                }
              >
                {t(
                  step === "type" ? "Step 1 of 2 · Project type" : "Step 2 of 2 · Project details",
                )}
              </p>
              <h2
                ref={heading}
                tabIndex={-1}
                id="project-setup-title"
                className={
                  "font-sans tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0 text-[24px]"
                }
              >
                {t("New project")}
              </h2>
            </div>
            <Button
              type="button"
              className={
                "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] m-0"
              }
              aria-label={t("Close setup")}
              disabled={pending}
              onClick={close}
            >
              <Icon name="close" />
            </Button>
          </div>
          {step === "type" ? (
            <>
              <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
                {t("Choose a workflow for this project.")}
              </p>
              <FlowOptions value={flow} onChange={setFlow} />
              <div className={"project-setup-actions flex items-center justify-between gap-3 mt-4"}>
                <Button
                  type="button"
                  className={
                    "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-0"
                  }
                  aria-pressed={flow === "later"}
                  onClick={() => setFlow("later")}
                >
                  {t("Choose later")}
                </Button>
                <Button
                  type="button"
                  disabled={!flow}
                  onClick={() => setStep("details")}
                  className={"mt-0"}
                >
                  {t("Continue")} <Icon name="arrowRight" />
                </Button>
              </div>
            </>
          ) : (
            <form
              action={action}
              className={
                "form-stack flex flex-col gap-3 [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-[var(--theme-border,#4b6056)] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-lime [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
              }
            >
              <Input
                type="hidden"
                name="flow"
                value={flow === "later" ? "" : flow}
                className={
                  "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                }
              />
              <p className={"project-setup-selection mt-3 mx-0 mb-0 text-[12px]"}>
                {t("Project type")}:{" "}
                <strong className={"text-lime"}>
                  {isFlowId(flow)
                    ? t(flowCatalog.find((option) => option.id === flow)?.name ?? flow)
                    : t("Choose later")}
                </strong>
              </p>
              {isFlowId(flow) && (
                <small className={"muted text-[11px] text-muted"}>
                  {t(
                    "You can revisit any stage. Switching paths after choosing isn't available yet.",
                  )}
                </small>
              )}
              <label htmlFor="setup-project-name" className={"text-[13px] text-ink"}>
                {t("Project name")}
              </label>
              <Input
                id="setup-project-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder={t("Audio production project")}
                className={
                  "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                }
              />
              <label htmlFor="setup-project-description" className={"text-[13px] text-ink"}>
                {t("Description")}
              </label>
              <Textarea
                id="setup-project-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={2000}
                rows={3}
                placeholder={t("Describe the project's purpose and scope.")}
                className={
                  "min-h-30 w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                }
              />
              {initialSourceIds.map((id) => (
                <Input
                  key={id}
                  type="hidden"
                  name="sourceIds"
                  value={id}
                  className={
                    "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
                />
              ))}
              <Feedback state={state} />
              <small className={"text-[11px] text-muted"}>
                {t("Only invited members can access this project.")}
              </small>
              <div className={"project-setup-actions flex items-center justify-between gap-3 mt-4"}>
                <Button
                  type="button"
                  className={"button secondary lg:compact:mt-1 mt-0"}
                  disabled={pending}
                  onClick={() => setStep("type")}
                  variant="secondary"
                >
                  <Icon name="arrowLeft" /> {t("Back")}
                </Button>
                <Button type="submit" disabled={pending} className={"lg:compact:mt-1 mt-0"}>
                  {pending ? t("Creating project…") : t("Create project")}
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </Dialog>
  );
}
