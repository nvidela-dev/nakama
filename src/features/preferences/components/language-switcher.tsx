"use client";
import { Button, IconButton } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Icon } from "@/shared/ui/icon";
import { useState, useTransition } from "react";
import { changeLanguage } from "../language-actions";
import { useLocale, useT } from "@/shared/i18n/provider";

const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const label = t("Language");
  return (
    <div className="language-control relative shrink-0">
      <IconButton
        label={label}
        variant="ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        onClick={() => {
          if (!pending) setOpen(true);
        }}
      >
        <Icon name="language" />
      </IconButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        className="m-auto w-72 max-w-[90vw] rounded-xl border border-line bg-panel p-4 text-ink shadow-lg backdrop:bg-black/50"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{label}</h2>
          <IconButton variant="ghost" label={t("Close")} onClick={() => setOpen(false)}>
            <Icon name="close" />
          </IconButton>
        </div>
        <div role="group" aria-label={label} className="grid gap-2">
          {languages.map(({ code, label: language }) => (
            <Button
              key={code}
              lang={code}
              aria-pressed={code === locale}
              variant={code === locale ? "secondary" : "ghost"}
              className="min-h-11 justify-start"
              onClick={() => {
                setOpen(false);
                if (code === locale) return;
                setError(false);
                startTransition(async () => {
                  try {
                    await changeLanguage(code);
                  } catch {
                    setError(true);
                  }
                });
              }}
            >
              {language}
            </Button>
          ))}
        </div>
      </Dialog>
      <span className="sr-only" role="status">
        {pending ? t("Changing language…") : ""}
      </span>
      {error && (
        <small
          role="alert"
          className="absolute right-0 top-full z-50 mt-1 w-52 rounded border border-line bg-panel p-2"
        >
          {t("Could not change language. Please try again.")}
        </small>
      )}
    </div>
  );
}
