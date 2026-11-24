"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import type { HomeMetrics } from "../model";
import { useLocale, useT } from "@/shared/i18n/provider";

const destinations = [
  { href: "/", name: "Home", icon: "home" },
  { href: "/projects", name: "Explorations", icon: "compass" },
  { href: "/prospects", name: "Consultancy", icon: "consultancy" },
  { href: "/jobs", name: "Job Search", icon: "jobSearch" },
] as const;
type Props = { owner: boolean; metrics?: HomeMetrics | null };

function SidebarLinks({
  owner,
  metrics,
  close,
  rail,
}: Props & { close?: () => void; rail?: boolean }) {
  const t = useT(),
    locale = useLocale(),
    path = usePathname();
  const number = new Intl.NumberFormat(locale === "es" ? "es-UY" : "en-US");
  const base =
    "flex min-h-11 min-w-0 items-center gap-2.5 px-3 py-2 font-medium text-muted hover:bg-[var(--theme-selected)] hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime";
  const linkClass = rail
    ? base +
      " rounded-l-lg aria-[current=page]:bg-bg aria-[current=page]:font-semibold aria-[current=page]:text-ink"
    : base +
      " rounded-lg aria-[current=page]:bg-[var(--theme-selected)] aria-[current=page]:text-ink";
  return (
    <>
      <nav aria-label={t("Main navigation")}>
        <ul className="m-0 grid list-none gap-1 p-0">
          {destinations
            .filter(({ href }) => owner || href !== "/jobs")
            .map(({ href, name, icon }) => {
              const count =
                href === "/jobs"
                  ? metrics?.jobs?.active
                  : href === "/prospects"
                    ? metrics?.consultancy?.active
                    : undefined;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    className={linkClass}
                    aria-current={
                      path === href || (href !== "/" && path.startsWith(href + "/"))
                        ? "page"
                        : undefined
                    }
                    {...(close ? { onNavigate: close } : {})}
                  >
                    <Icon name={icon} className="shrink-0" />
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="min-w-0 wrap-anywhere">{t(name)}</span>
                      {count !== undefined && (
                        <span
                          className="rounded-md border border-line bg-panel px-1.5 text-xs text-ink tabular-nums"
                          aria-label={t("{count} active", { count: number.format(count) })}
                        >
                          {number.format(count)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
      <nav className="mt-4 border-t border-line pt-3" aria-label={t("Workspace tools")}>
        <Link
          href="/artifacts"
          prefetch={false}
          {...(close ? { onNavigate: close } : {})}
          aria-current={
            path === "/artifacts" || path.startsWith("/artifacts/") ? "page" : undefined
          }
          className={linkClass}
        >
          <Icon name="box" className="shrink-0" /> {t("Artifacts")}
        </Link>
      </nav>
    </>
  );
}

export function DesktopSidebar(props: Props) {
  return (
    <aside className="hidden min-h-0 overflow-y-auto overscroll-contain bg-panel py-3 pl-2 shadow-[inset_-1px_0_var(--color-line)] lg:block">
      <SidebarLinks {...props} rail />
    </aside>
  );
}

export function MobileSidebar(props: Props) {
  const t = useT(),
    path = usePathname();
  return <MobileMenu key={path} {...props} title={t("Main navigation")} />;
}

function MobileMenu({ title, ...props }: Props & { title: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 64rem)");
    function onBreakpoint() {
      if (desktop.matches) setOpen(false);
    }
    desktop.addEventListener("change", onBreakpoint);
    return () => desktop.removeEventListener("change", onBreakpoint);
  }, [open]);
  const button =
    "size-11! shrink-0 rounded-lg text-ink hover:bg-[var(--theme-selected)] focus-visible:outline-2 focus-visible:outline-lime";
  return (
    <div className="lg:hidden">
      <Button
        type="button"
        variant="ghost"
        className={button}
        aria-label={t("Open navigation")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="workspace-drawer"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </Button>
      <Dialog
        className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(20rem,100vw)] max-w-none overflow-hidden border-r border-line bg-panel p-0 text-ink backdrop:bg-black/60"
        id="workspace-drawer"
        open={open}
        onClose={() => setOpen(false)}
        label={title}
      >
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <span className="min-w-0 wrap-anywhere text-base font-semibold">{title}</span>
            <Button
              type="button"
              variant="ghost"
              className={button}
              aria-label={t("Close navigation")}
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </Button>
          </div>
          <div className="overflow-y-auto overscroll-contain p-3">
            <SidebarLinks {...props} close={() => setOpen(false)} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
