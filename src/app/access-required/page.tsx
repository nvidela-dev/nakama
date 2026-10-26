import { Panel } from "@/shared/ui/panel";
import { AccessEntry } from "@/features/access/components/access-entry";
import { getT } from "@/shared/i18n/server";
export default async function AccessRequired() {
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
      }
    >
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
    </main>
  );
}
