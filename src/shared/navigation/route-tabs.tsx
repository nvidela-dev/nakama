import Link from "next/link";
import { Icon, type IconName } from "../ui/icon";

export type RouteTab = {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
};

export function RouteTabs({ label, items }: { label: string; items: readonly RouteTab[] }) {
  return (
    <nav aria-label={label} className="flex min-w-0 max-w-full flex-wrap items-end gap-x-2">
      {items.map(({ href, label: text, icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className="inline-flex min-h-9 min-w-0 max-w-full items-center gap-1.5 border-b-2 border-transparent px-2 py-1 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime aria-[current=page]:border-lime aria-[current=page]:font-semibold aria-[current=page]:text-ink pointer-coarse:min-h-11"
        >
          <Icon name={icon} className="shrink-0" />
          <span className="min-w-0 wrap-anywhere">{text}</span>
        </Link>
      ))}
    </nav>
  );
}
