"use client";
import { useT } from "@/shared/i18n/provider";
import { StatusMessage } from "./panel";
import type { ActionState } from "@/shared/contracts/action-state";
export function Feedback({ state }: { state: ActionState }) {
  const t = useT();
  return (
    <>
      {state.error && (
        <StatusMessage tone="error">
          {t(state.error)}
          {state.reference && (
            <>
              {" "}
              <small>
                {t("Reference")}: {state.reference}
              </small>
            </>
          )}
        </StatusMessage>
      )}
      {state.success && <StatusMessage>{t(state.success)}</StatusMessage>}
    </>
  );
}
