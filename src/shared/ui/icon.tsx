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
  Lightbulb,
  Pencil,
  Plus,
  Search,
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
  idea: Lightbulb,
  edit: Pencil,
  plus: Plus,
  search: Search,
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
      className={`ui-icon${className ? ` ${className}` : ""}`}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    />
  );
}
