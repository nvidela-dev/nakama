import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Show } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
import { isAppAdmin } from "@/lib/app-access";
import { adminEmail } from "@/lib/whitelist";
import { getT } from "@/lib/i18n/server";
import { DensitySwitcher } from "./density";
import { LanguageSwitcher } from "./language";

export async function Footer({ density }: { density: "compact" | "comfortable" }) {
  const t = await getT();
  const user = authConfigured() ? await currentUser() : null;
  const admin = !!user && isAppAdmin({
    userId: user.id,
    verifiedEmails: user.emailAddresses
      .filter(email => email.verification?.status === "verified")
      .map(email => email.emailAddress),
  }, adminEmail());
  return <footer>
    <span>{t("Nakama")}</span>
    <div className="footer-preferences">
      {admin && <Show when="signed-in"><Link className="footer-admin-link" href="/admin">{t("Administration")}</Link></Show>}
      <LanguageSwitcher />
      <DensitySwitcher density={density} />
    </div>
  </footer>;
}
