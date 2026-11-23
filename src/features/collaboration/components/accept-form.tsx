"use client";
import { FormStack } from "@/shared/ui/workspace-layout";

import { Button } from "@/shared/ui/button";

import type { ActionState } from "@/shared/contracts/action-state";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";

import { useActionState, useEffect, useRef, useState } from "react";
import { acceptInvitation } from "@/features/collaboration/invitation-actions";
const initial: ActionState = {};
export function AcceptForm() {
  const t = useT();
  const [state, action, pending] = useActionState(acceptInvitation, initial);
  const [token, setToken] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    // React development Strict Mode repeats effects. Read once before clearing the fragment.
    if (initialized.current) return;
    initialized.current = true;
    // The fragment is never sent in an HTTP URL or referrer. Remove it from browser history after reading.
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return (
    <FormStack action={action} className="[&_label]:text-[13px] [&_label]:text-ink">
      <input type="hidden" name="token" value={token} className={"w-full [resize:vertical]"} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending || !token} className={"mt-2 lg:compact:mt-1"}>
        {pending ? t("Joining…") : t("Join this project")}
      </Button>
      {!token && (
        <p className={"mb-[1em] mt-0"}>{t("Open the original invitation link to join.")}</p>
      )}
    </FormStack>
  );
}
