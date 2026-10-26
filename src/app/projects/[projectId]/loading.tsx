import { LoadingState } from "@/shared/ui/loading-state";
import { getT } from "@/shared/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "workspace w-full max-w-300 lg:max-w-360 lg:compact:max-w-360 min-[1280px]:[&:has(>_.has-discussion)]:max-w-360 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
      }
    >
      <LoadingState label={t("Loading…")} variant="workspace" lines={3} />
    </main>
  );
}
