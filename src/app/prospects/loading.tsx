import { getT } from "@/shared/i18n/server";
import { WorkspaceLoading } from "@/shared/ui/workspace-loading";

export default async function Loading() {
  const t = await getT();
  return <WorkspaceLoading title={t("Business catalogue")} label={t("Loading…")} />;
}
