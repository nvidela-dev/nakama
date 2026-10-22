import { getT } from "@/lib/i18n/server";
import { Show, SignInButton } from "@clerk/nextjs";
import { AcceptForm } from "@/components/forms";
export default async function Page() {
  const t = await getT();
  return (
    <main id="main" className="workspace narrow">
      <section className="panel">
        <span className="eyebrow">{t("GOOD THINGS START WITH COMPANY")}</span>
        <h1>{t("You're invited aboard.")}</h1>
        <p>
          {t(
            "Join using the verified email your friend invited. No project details are shared until you accept.",
          )}{" "}
        </p>
        <Show when="signed-in">
          <AcceptForm />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button>{t("Sign in to accept")}</button>
          </SignInButton>
        </Show>
      </section>
    </main>
  );
}
