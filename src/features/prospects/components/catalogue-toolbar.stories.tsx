import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToolbarDialog } from "@/shared/ui/toolbar-dialog";
import { CatalogueToolbar } from "./catalogue-toolbar";

const meta = {
  title: "Features/Prospects/Catalogue toolbar",
  component: CatalogueToolbar,
  args: {
    availableStages: ["assess_fit", "ready", "attempted_contact", "negotiating"],
    count: 2483,
    facets: {
      regions: ["Montevideo", "Canelones"],
      cities: ["Montevideo", "Las Piedras"],
      industries: ["Furniture", "Professional services"],
      services: ["Web development", "Social media"],
      owners: [{ id: "owner", name: "Example owner" }],
    },
    page: 2,
    query: "q=desk&region=Montevideo&images=no&service=Web+development&match=all&focus=1",
    actions: (
      <div className="flex items-center gap-1">
        <ToolbarDialog label="Add business" icon="plus">
          <p>Example business form</p>
        </ToolbarDialog>
        <ToolbarDialog label="Import catalogue" icon="upload">
          <p>Example import form</p>
        </ToolbarDialog>
        <ToolbarDialog label="Catalogue access" icon="consultancy">
          <p>Example access form</p>
        </ToolbarDialog>
      </div>
    ),
  },
} satisfies Meta<typeof CatalogueToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Owner: Story = {};
export const BoardMember: Story = {
  args: { actions: null, page: 1, count: 1, query: "view=board&service=Social+media" },
};
