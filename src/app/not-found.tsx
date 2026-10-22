import { getT } from "@/lib/i18n/server";
import Link from "next/link";
export default async function NotFound() {
  const t = await getT();
  return (
    <main id="main" className="workspace narrow">
      <h1>{t("This project isn't available.")}</h1>
      <p>{t("It may not exist, or you may no longer have access.")}</p>
      <Link href="/projects" className="button">
        {t("Back to your projects")}{" "}
      </Link>
    </main>
  );
}
