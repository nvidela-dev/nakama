"use client";
import { Icon } from "@/shared/ui/icon";
import { Input, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/shared/contracts/action-state";
import { flowCatalog, isFlowId } from "@/features/guidance/model/flow-catalog.generated";
import { Modal } from "antd";
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
    <Modal
      open={open}
      centered
      width={760}
      footer={null}
      onCancel={close}
      mask={{ closable: !pending }}
      keyboard={!pending}
      closable={false}
      title={
        <h2 ref={heading} tabIndex={-1} id="project-setup-title">
          {t("New project")}
        </h2>
      }
      styles={{ body: { maxHeight: "min(70dvh,680px)", overflowY: "auto" } }}
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
            </div>
            <Button
              type="button"
              variant="ghost"
              className={"min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] m-0"}
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
                  variant="ghost"
                  className={"min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-0"}
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
              className={"form-stack flex flex-col gap-3 [&_select]:max-w-full lg:compact:gap-1.75"}
            >
              <Input
                type="hidden"
                name="flow"
                value={flow === "later" ? "" : flow}
                className={"w-full [resize:vertical]"}
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
                className={"w-full [resize:vertical]"}
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
                className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
              />
              {initialSourceIds.map((id) => (
                <Input
                  key={id}
                  type="hidden"
                  name="sourceIds"
                  value={id}
                  className={"w-full [resize:vertical]"}
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
    </Modal>
  );
}
