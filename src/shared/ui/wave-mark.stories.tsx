import type { Meta } from "@storybook/nextjs-vite";
import { WaveMark } from "./wave-mark";
export default { title: "UI/Wave mark" } satisfies Meta;
export const Brand = {
  render: () => (
    <span className="text-5xl text-lime">
      <WaveMark />
    </span>
  ),
};
