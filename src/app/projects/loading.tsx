import { LoadingState } from "@/shared/ui/loading-state";
import { getT } from "@/shared/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <main id="main" className="workspace">
      <LoadingState label={t("Loading…")} />
    </main>
  );
}
