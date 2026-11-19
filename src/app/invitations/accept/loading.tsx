import { Workspace } from "@/shared/ui/workspace-layout";
import { LoadingState } from "@/shared/ui/loading-state";
import { getT } from "@/shared/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <Workspace id="main" variant="narrow">
      <LoadingState label={t("Loading…")} variant="stack" lines={2} />
    </Workspace>
  );
}
