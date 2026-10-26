import { Panel } from "@/shared/ui/panel";
import { Button } from "@/shared/ui/button";
import { getT } from "@/shared/i18n/server";
import { Show, SignInButton } from "@clerk/nextjs";
import { AcceptForm } from "@/features/collaboration/components/forms";
export default async function Page() {
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "workspace narrow pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:max-w-190 min-[2000px]:compact:px-10 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0 max-w-162.5"
      }
    >
      <Panel className="">
        <span
          className={
            "eyebrow text-[11px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px] lg:compact:mb-1.5"
          }
        >
          {t("PROJECT INVITATION")}
        </span>
        <h1
          className={
            "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium"
          }
        >
          {t("Project invitation")}
        </h1>
        <p className={"mb-[1em] mt-0"}>
          {t(
            "Join using the verified email your friend invited. No project details are shared until you accept.",
          )}{" "}
        </p>
        <Show when="signed-in">
          <AcceptForm />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button type="submit" className={""}>
              {t("Sign in to accept")}
            </Button>
          </SignInButton>
        </Show>
      </Panel>
    </main>
  );
}
