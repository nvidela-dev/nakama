import { getT } from "@/shared/i18n/server";
import Link from "next/link";
export default async function NotFound() {
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "workspace narrow pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0 max-w-162.5"
      }
    >
      <h1
        className={
          "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium"
        }
      >
        {t("This project isn't available.")}
      </h1>
      <p className={"mb-[1em] mt-0"}>{t("It may not exist, or you may no longer have access.")}</p>
      <Link
        href="/projects"
        className={
          "button border-0 rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 bg-lime text-dark font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[background:var(--theme-accent-hover,#e9ffc1)] hover:[transform:translateY(-1px)] lg:compact:min-h-8.5 lg:compact:py-2 lg:compact:px-3 lg:compact:text-[12px] lg:compact:rounded-[7px]"
        }
      >
        {t("Back to your projects")}{" "}
      </Link>
    </main>
  );
}
