import { LoadingState } from "@/shared/ui/loading-state";
import { getT } from "@/shared/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <main id="main" className="workspace narrow">
      <LoadingState label={t("Loading…")} variant="stack" lines={2} />
    </main>
  );
}
