"use client";
import { Icon } from "@/shared/ui/icon";
import { Input, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useEffect, useRef, useState } from "react";
import { createProject } from "@/features/projects/actions";
import { flowCatalog, isFlowId } from "@/features/guidance/model/flow-catalog.generated";
import { Dialog } from "@/shared/ui/dialog";
import { FlowOptions } from "@/features/guidance/components/flow-options";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";

export function NewProjectButton({
  initialSourceIds = [],
  label = "New project",
}: {
  initialSourceIds?: string[];
  label?: string;
}) {
  const t = useT(),
    trigger = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false),
    [step, setStep] = useState<"type" | "details">("type");
  const [flow, setFlow] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [state, action, pending] = useActionState(createProject, {});
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [step, open]);
  function close() {
    if (pending) return;
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <>
      <Button
        type="submit"
        ref={trigger}
        className="new-project-trigger"
        onClick={() => setOpen(true)}
      >
        {t(label)} <Icon name="plus" />
      </Button>
      <Dialog
        open={open}
        onClose={close}
        dismissible={!pending}
        className="project-setup-dialog"
        labelledBy="project-setup-title"
      >
        {open && (
          <>
            <div className="project-setup-heading">
              <div>
                <p className="eyebrow">
                  {t(
                    step === "type"
                      ? "Step 1 of 2 · Project type"
                      : "Step 2 of 2 · Project details",
                  )}
                </p>
                <h2 ref={heading} tabIndex={-1} id="project-setup-title">
                  {t("New project")}
                </h2>
              </div>
              <Button
                type="button"
                className="text-button"
                aria-label={t("Close setup")}
                disabled={pending}
                onClick={close}
              >
                <Icon name="close" />
              </Button>
            </div>
            {step === "type" ? (
              <>
                <p className="muted">{t("Choose a workflow for this project.")}</p>
                <FlowOptions value={flow} onChange={setFlow} />
                <div className="project-setup-actions">
                  <Button
                    type="button"
                    className="text-button"
                    aria-pressed={flow === "later"}
                    onClick={() => setFlow("later")}
                  >
                    {t("Choose later")}
                  </Button>
                  <Button type="button" disabled={!flow} onClick={() => setStep("details")}>
                    {t("Continue")} <Icon name="arrowRight" />
                  </Button>
                </div>
              </>
            ) : (
              <form action={action} className="form-stack">
                <Input type="hidden" name="flow" value={flow === "later" ? "" : flow} />
                <p className="project-setup-selection">
                  {t("Project type")}:{" "}
                  <strong>
                    {isFlowId(flow)
                      ? t(flowCatalog.find((option) => option.id === flow)?.name ?? flow)
                      : t("Choose later")}
                  </strong>
                </p>
                {isFlowId(flow) && (
                  <small className="muted">
                    {t(
                      "You can revisit any stage. Switching paths after choosing isn't available yet.",
                    )}
                  </small>
                )}
                <label htmlFor="setup-project-name">{t("Project name")}</label>
                <Input
                  id="setup-project-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder={t("Audio production project")}
                />
                <label htmlFor="setup-project-description">{t("Description")}</label>
                <Textarea
                  id="setup-project-description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={2000}
                  rows={3}
                  placeholder={t("Describe the project's purpose and scope.")}
                />
                {initialSourceIds.map((id) => (
                  <Input key={id} type="hidden" name="sourceIds" value={id} />
                ))}
                <Feedback state={state} />
                <small>{t("Only invited members can access this project.")}</small>
                <div className="project-setup-actions">
                  <Button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() => setStep("type")}
                  >
                    <Icon name="arrowLeft" /> {t("Back")}
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? t("Creating project…") : t("Create project")}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
