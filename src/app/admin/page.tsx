import { Panel } from "@/shared/ui/panel";
import { requestPolicy } from "@/features/access/server/request-store";
import { AccessRequestList } from "@/features/access/components/access-request-list";
import { adminActor } from "@/features/access/server/auth";
import { accessPolicy } from "@/features/access/server/whitelist";
import { getT } from "@/shared/i18n/server";
import { WhitelistList } from "@/features/access/components/whitelist-list";
import { AddAllowedEmail } from "@/features/access/components/whitelist";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const person = await adminActor();
  const [entries, requests] = await Promise.all([
    accessPolicy().list(person),
    requestPolicy().list(person),
  ]);
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
      }
    >
      <div
        className={
          "page-heading mt-7.5 mx-0 mb-10.5 max-[700px]:mt-6 lg:compact:mt-3.5 lg:compact:mb-5"
        }
      >
        <h1
          className={
            "mb-[0.67em] mt-0 font-mono tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
          }
        >
          {t("Administration")}
        </h1>
        <p
          className={
            "mb-[1em] mt-0 text-muted max-w-175 lg:compact:max-w-none lg:compact:mt-2 lg:compact:mx-0 lg:compact:mb-0 lg:compact:text-[13px] lg:compact:leading-[1.5]"
          }
        >
          {t("Only whitelisted emails can sign up and access private workspaces.")}
        </p>
      </div>
      <div
        className={
          "workspace-columns grid grid-cols-[1.3fr_1fr] gap-8 items-start max-[1000px]:grid-cols-[1fr_1fr] max-[700px]:grid-cols-[1fr] lg:compact:grid-cols-[minmax(0,_1fr)_300px] lg:compact:gap-5 lg:compact:[&_>_*]:min-w-0 min-[2000px]:compact:grid-cols-[minmax(0,_1fr)_340px] min-[2000px]:compact:gap-7"
        }
      >
        <Panel className="">
          <h2
            className={
              "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
            }
          >
            {t("Allowed emails")}
          </h2>
          <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
            {t(
              "Removing access blocks future private requests. It does not delete the account or project history.",
            )}
          </p>
          <WhitelistList entries={entries} />
          <AccessRequestList requests={requests} />
        </Panel>
        <aside
          className={
            "panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5"
          }
        >
          <h2
            className={
              "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
            }
          >
            {t("Allow a person")}
          </h2>
          <p className={"mb-[1em] mt-0 text-muted"}>
            {t(
              "Add one exact email address. This grants app access; projects still require membership. No email notification is sent.",
            )}
          </p>
          <AddAllowedEmail />
        </aside>
      </div>
    </main>
  );
}
