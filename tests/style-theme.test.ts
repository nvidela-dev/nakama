import { test } from "node:test";
import assert from "node:assert/strict";
import { palettes, parseStyleTheme, styleThemeProperties } from "../src/shared/ui/style-theme";

function luminance(hex: string) {
  const values = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("Daylight is the default and malformed preferences cannot inject styles", () => {
  for (const value of [undefined, null, "", "dark", "ZEN", {}, "zen; color:red"])
    assert.equal(parseStyleTheme(value), "day");
  assert.equal(parseStyleTheme("zen"), "day");
  assert.equal(parseStyleTheme("hacker"), "night");
  assert.equal(styleThemeProperties("night")["--bg"], "#14241f");
  for (const theme of ["day", "night"] as const)
    for (const [name, value] of Object.entries(palettes[theme]))
      assert.equal(styleThemeProperties(theme)[`--color-${name}`], value);
  assert.equal(styleThemeProperties("night")["--theme-surface"], "#263b31");
});
test("both palettes retain readable text and primary buttons", () => {
  for (const [name, palette] of Object.entries(palettes)) {
    for (const surface of [palette.bg, palette.panel]) {
      assert.ok(contrast(palette.ink, surface) >= 4.5, `${name}: text`);
      assert.ok(contrast(palette.muted, surface) >= 4.5, `${name}: muted text`);
      assert.ok(contrast(palette.lime, surface) >= 4.5, `${name}: links`);
    }
    assert.ok(contrast(palette.dark, palette.lime) >= 4.5, `${name}: primary button`);
  }
});
