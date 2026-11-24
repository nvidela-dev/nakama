"use client";

import { Tooltip } from "antd";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { useT } from "@/shared/i18n/provider";

const destinations = [
  { href: "/", name: "Home", icon: "home" },
  { href: "/projects", name: "Explorations", icon: "compass" },
  { href: "/prospects", name: "Consultancy", icon: "consultancy" },
  { href: "/jobs", name: "Job Search", icon: "jobSearch" },
] as const;
type Props = { owner: boolean };

function SidebarLinks({
  owner,
  close,
  compact,
}: Props & { close?: () => void; compact?: boolean }) {
  const t = useT(),
    path = usePathname();
  const linkClass =
    "flex min-h-11 min-w-11 items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted hover:bg-[var(--theme-selected)] hover:text-ink aria-[current=page]:bg-[var(--theme-selected)] aria-[current=page]:text-ink aria-[current=page]:ring-1 aria-[current=page]:ring-inset aria-[current=page]:ring-line focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-lime";
  const appearance = compact ? linkClass + " justify-center px-0" : linkClass;
  const label = (text: string) =>
    compact ? null : <span className="min-w-0 wrap-anywhere">{text}</span>;
  const tooltip = (text: string, link: React.ReactElement) =>
    compact ? (
      <Tooltip title={text} placement="right" trigger={["hover", "focus"]}>
        {link}
      </Tooltip>
    ) : (
      link
    );
  return (
    <>
      <nav aria-label={t("Main navigation")}>
        <ul className="m-0 grid list-none gap-1 p-0">
          {destinations
            .filter(({ href }) => owner || href !== "/jobs")
            .map(({ href, name, icon }) => (
              <li key={href}>
                {tooltip(
                  t(name),
                  <Link
                    href={href}
                    prefetch={false}
                    aria-label={t(name)}
                    className={appearance}
                    aria-current={
                      path === href || (href !== "/" && path.startsWith(href + "/"))
                        ? "page"
                        : undefined
                    }
                    {...(close ? { onNavigate: close } : {})}
                  >
                    <Icon name={icon} className="shrink-0" />
                    {label(t(name))}
                  </Link>,
                )}
              </li>
            ))}
        </ul>
      </nav>
      <nav className="mt-4 border-t border-line pt-3" aria-label={t("Workspace tools")}>
        {tooltip(
          t("Artifacts"),
          <Link
            href="/artifacts"
            prefetch={false}
            {...(close ? { onNavigate: close } : {})}
            aria-current={
              path === "/artifacts" || path.startsWith("/artifacts/") ? "page" : undefined
            }
            aria-label={t("Artifacts")}
            className={appearance}
          >
            <Icon name="box" className="shrink-0" /> {label(t("Artifacts"))}
          </Link>,
        )}
      </nav>
    </>
  );
}

export function DesktopSidebar(props: Props) {
  return (
    <aside className="hidden min-h-0 overflow-y-auto overscroll-contain border-r border-line bg-panel px-2 py-3 lg:block">
      <SidebarLinks {...props} compact />
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
