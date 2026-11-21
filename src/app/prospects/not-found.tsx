import { getT } from "@/shared/i18n/server";
import { Workspace } from "@/shared/ui/workspace-layout";

export default async function CatalogueUnavailable() {
  const t = await getT();
  return (
    <Workspace id="main" variant="narrow">
      <h1 className="my-4 text-2xl font-semibold">{t("Business catalogue")}</h1>
      <p>{t("This catalogue or business is unavailable to your account.")}</p>
    </Workspace>
  );
}
