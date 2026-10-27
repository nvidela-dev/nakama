import { cn } from "./cn";
import {
  ArrowDown,
  Circle,
  CircleDashed,
  Check,
  SkipForward,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Box,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CodeXml,
  FileText,
  Image,
  LayoutGrid,
  Columns3,
  ListTree,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Server,
  ShoppingBag,
  Sparkles,
  SquareTerminal,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

/** Explicit catalog: never import the whole library or construct icon names at runtime. */
export const iconCatalog = {
  unanswered: Circle,
  draft: CircleDashed,
  answered: Check,
  skipped: SkipForward,
  rotateLeft: RotateCcw,
  rotateRight: RotateCw,
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  arrowUpRight: ArrowUpRight,
  bell: Bell,
  box: Box,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  warning: CircleAlert,
  code: CodeXml,
  markdown: FileText,
  image: Image,
  overview: LayoutGrid,
  board: Columns3,
  listTree: ListTree,
  idea: Lightbulb,
  edit: Pencil,
  plus: Plus,
  search: Search,
  server: Server,
  shop: ShoppingBag,
  creative: Sparkles,
  software: SquareTerminal,
  import: Truck,
  consultancy: Users,
  delete: Trash2,
  close: X,
} as const;
export type IconName = keyof typeof iconCatalog;
type IconProps = Omit<LucideProps, "name" | "aria-hidden" | "role"> & { name: IconName };
/** Decorative by default: name the containing button/link, not the SVG. */
export function Icon({ name, size = 16, strokeWidth = 1.75, className, ...props }: IconProps) {
  const Glyph = iconCatalog[name];
  return (
    <Glyph
      {...props}
      className={cn(
        "ui-icon [:where(&)]:inline-block [:where(&)]:align-middle [:where(&)]:shrink-0",
        className,
      )}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    />
  );
}
