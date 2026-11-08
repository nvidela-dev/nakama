import type { ShirtDesign } from "../server/shirt-schema";
export type { ShirtDesign, ShirtLayer } from "../server/shirt-schema";
export const zones = ["chest", "back", "left_sleeve", "right_sleeve"] as const;
export type Zone = (typeof zones)[number];
export const panels = {
  chest: { label: "Chest", width: 30, height: 40 },
  back: { label: "Back panel", width: 30, height: 40 },
  left_sleeve: { label: "Left sleeve", width: 10, height: 10 },
  right_sleeve: { label: "Right sleeve", width: 10, height: 10 },
} as const;
export const emptyLayout: ShirtDesign["layout"] = {
  color: "#e8e4da",
  blank: "",
  notes: "",
  layers: [],
};
