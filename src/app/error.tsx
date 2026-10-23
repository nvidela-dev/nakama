"use client";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { useT } from "@/shared/i18n/provider";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useT();
  return (
    <main id="main" className="workspace narrow">
      <Panel className="">
        <h1>{t("Unable to load")}</h1>
        <p>{t("We couldn't load this part of your workspace. Please try again in a moment.")} </p>
        <Button type="submit" onClick={reset}>
          {t("Try again")}
        </Button>
      </Panel>
    </main>
  );
}
