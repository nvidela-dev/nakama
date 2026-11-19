import { Workspace } from "@/shared/ui/workspace-layout";
import { LoadingState } from "@/shared/ui/loading-state";
import { getT } from "@/shared/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <Workspace variant="artifacts" id="main">
      <LoadingState label={t("Loading…")} variant="cards" lines={4} />
    </Workspace>
  );
}
