import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RouteTabs } from "@/shared/navigation/route-tabs";

const meta = {
  title: "UI/Route tabs",
  component: RouteTabs,
  args: {
    label: "Views",
    items: [
      { href: "/jobs?q=desk", label: "Lista de oportunidades", icon: "listTree", active: false },
      { href: "/jobs?view=board&q=desk", label: "Puestos activos", icon: "board", active: false },
      {
        href: "/jobs?view=finished&q=desk",
        label: "Procesos finalizados",
        icon: "answered",
        active: true,
      },
    ],
  },
} satisfies Meta<typeof RouteTabs>;

export default meta;
export const ThreeViews: StoryObj<typeof meta> = {};
