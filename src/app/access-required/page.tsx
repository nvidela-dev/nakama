import { Workspace } from "@/shared/ui/workspace-layout";
import { Panel } from "@/shared/ui/panel";
import { AccessEntry } from "@/features/access/components/access-entry";
import { getT } from "@/shared/i18n/server";
export default async function AccessRequired() {
  const t = await getT();
  return (
    <Workspace id="main">
      <Panel className="">
        <h1
          className={
            "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium"
          }
        >
          {t("Access requires approval")}
        </h1>
        <p className={"mb-[1em] mt-0"}>
          {t(
            "Ask the administrator to whitelist your verified email address. Signing in or receiving a project invitation does not grant app access.",
          )}
        </p>
      </Panel>
      <AccessEntry />
    </Workspace>
  );
}
