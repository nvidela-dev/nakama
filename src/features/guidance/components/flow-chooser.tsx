"use client";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";
import { useActionState } from "react";
import { chooseFlow, type GuidanceActionState } from "../actions";
import { FlowOptions } from "./flow-options";
import { Panel } from "@/shared/ui/panel";
const initial: GuidanceActionState = {};
export function FlowChooser({ projectId }: { projectId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(chooseFlow.bind(null, projectId), initial);
  return (
    <Panel className="">
      <h2>{t("Project type")}</h2>
      <p>{t("Choose a workflow for this project.")}</p>
      <form action={action}>
        <FlowOptions pending={pending} />
        <Feedback state={state} />
        <small className="muted">
          {t("You can revisit any stage. Switching paths after choosing isn't available yet.")}{" "}
        </small>
      </form>
    </Panel>
  );
}
