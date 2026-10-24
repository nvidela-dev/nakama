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
      <h2
        className={
          "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
        }
      >
        {t("Project type")}
      </h2>
      <p className={"mb-[1em] mt-0"}>{t("Choose a flow for this project.")}</p>
      <form action={action}>
        <FlowOptions pending={pending} />
        <Feedback state={state} />
        <small className={"muted text-muted text-[12px]"}>
          {t("You can revisit any stage. Switching paths after choosing isn't available yet.")}{" "}
        </small>
      </form>
    </Panel>
  );
}
