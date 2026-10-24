import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MarkdownReader } from "./markdown-reader";
const meta = {
  title: "UI/Markdown",
  component: MarkdownReader,
  args: {
    content:
      "# Research plan\n\nA small **reviewable** output.\n\n- [x] Capture the question\n- [ ] Collect evidence\n\n| Step | Status |\n| --- | --- |\n| Interview | In progress |\n\n```ts\nconst nextStep = 'Review';\n```",
  },
} satisfies Meta<typeof MarkdownReader>;
export default meta;
export const Document: StoryObj<typeof meta> = {};
export const UntrustedContent: StoryObj<typeof meta> = {
  args: {
    content:
      "<script>alert(1)</script> [Unsafe](javascript:alert(1)) ![External evidence](https://example.invalid/image.png)",
  },
};
