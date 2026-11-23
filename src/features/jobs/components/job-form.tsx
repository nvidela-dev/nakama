"use client";
import { useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { useT } from "@/shared/i18n/provider";
import { Button } from "@/shared/ui/button";
import { Feedback } from "@/shared/ui/feedback";
import type { ActionState } from "@/shared/contracts/action-state";
import { saveJob } from "../actions";
export function JobForm({
  operation,
  id,
  submit,
  children,
  canPursue = false,
  revision,
}: {
  operation: "add" | "plan" | "event" | "legacy_event" | "linear";
  id?: string;
  submit: string;
  children: ReactNode;
  canPursue?: boolean;
  revision?: number;
}) {
  const t = useT(),
    router = useRouter(),
    hydrated = useHydrated();
  const token = useRef("");
  const [feedback, setFeedback] = useState<ActionState>({});
  const [pending, start] = useTransition();
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form, (e.nativeEvent as SubmitEvent).submitter);
    if (data.get("promote") === "pursuing") data.set("stage", "pursuing");
    token.current ||= crypto.randomUUID();
    data.set("token", token.current);
    data.set("operation", operation);
    if (id) data.set("id", id);
    start(async () => {
      try {
        const reply = await saveJob(data);
        setFeedback(reply);
        if (reply.error) return;
        token.current = "";
        if (operation === "add" && reply.id) {
          router.push("/jobs?role=" + encodeURIComponent(reply.id));
        } else {
          if (operation === "event" || operation === "legacy_event") form.reset();
          router.refresh();
        }
      } catch {
        setFeedback({ error: "Unable to save. Please try again." });
      }
    });
  }
  return (
    <form method="post" onSubmit={save}>
      <fieldset className="grid min-w-0 gap-3" disabled={!hydrated || pending}>
        <div className="grid min-w-0 gap-3" key={revision}>
          {children}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" pending={pending} className="justify-self-start">
            {t(submit)}
          </Button>
          {canPursue && (
            <Button
              type="submit"
              name="promote"
              value="pursuing"
              variant="secondary"
              pending={pending}
            >
              {t("Move to Pursuing")}
            </Button>
          )}
        </div>
      </fieldset>
      <Feedback state={feedback} />
    </form>
  );
}
