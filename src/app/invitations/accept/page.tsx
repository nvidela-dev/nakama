import { Panel } from "@/shared/ui/panel";
import { Button } from "@/shared/ui/button";
import { getT } from "@/shared/i18n/server";
import { Show, SignInButton } from "@clerk/nextjs";
import { AcceptForm } from "@/features/collaboration/components/forms";
export default async function Page() {
  const t = await getT();
  return (
    <main id="main" className="workspace narrow">
      <Panel className="">
        <span className="eyebrow">{t("PROJECT INVITATION")}</span>
        <h1>{t("Project invitation")}</h1>
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
            <Button type="submit">{t("Sign in to accept")}</Button>
          </SignInButton>
        </Show>
      </Panel>
    </main>
  );
}
