import postcss, { type AtRule, type ChildNode } from "postcss";

/** Parse CSS rather than matching text: comments, escapes and nesting cannot hide a rule. */
export function styleViolations(file: string, source: string): string[] {
  if (!/\.(?:css|scss|sass|less)$/.test(file)) return [];
  if (file !== "src/app/globals.css")
    return [`${file}: use colocated Tailwind utilities; globals.css is the only stylesheet`];
  const errors: string[] = [];
  const reject = (reason: string) => errors.push(`${file}: ${reason}`);
  try {
    const root = postcss.parse(source, { from: file });
    function check(node: ChildNode, context: "root" | "theme" | "base" | "motion" | "frames") {
      if (node.type === "comment") return;
      if (node.type === "decl") {
        if (context !== "theme" || !/^--(?:color-|font-|animate-)/.test(node.prop))
          reject("only design tokens are allowed outside keyframes and base resets");
        return;
      }
      if (node.type === "rule") {
        const selectors = node.selectors.map((selector) => selector.trim());
        const allowed =
          context === "frames"
            ? selectors.every((selector) => /^(?:from|to|\d+(?:\.\d+)?%)$/.test(selector))
            : context === "base"
              ? selectors.every((selector) => selector === "html")
              : context === "motion" &&
                selectors.every((selector) =>
                  ["html", "*", "*::before", "*::after"].includes(selector),
                );
        if (!allowed)
          reject("custom selector rules are forbidden; style components with Tailwind utilities");
        for (const child of node.nodes) {
          if (child.type === "comment") continue;
          if (child.type !== "decl") {
            reject("nested custom rules are forbidden");
            continue;
          }
          if (context === "base" && child.prop !== "scroll-behavior")
            reject("base rules are restricted to browser resets");
          if (
            context === "motion" &&
            !["animation", "transition", "scroll-behavior"].includes(child.prop)
          )
            reject("reduced-motion rules are restricted to motion resets");
        }
        return;
      }
      if (node.type !== "atrule") return;
      const rule = node as AtRule;
      let next: typeof context | undefined;
      if (
        context === "root" &&
        rule.name === "import" &&
        /^['"]tailwindcss['"](?: source\("\.\.\/"\))?$/.test(rule.params) &&
        !rule.nodes
      )
        return;
      if (
        context === "root" &&
        rule.name === "custom-variant" &&
        rule.params === 'compact (&:where(html[data-density="compact"] *))' &&
        !rule.nodes
      )
        return;
      if (context === "root" && rule.name === "theme" && !rule.params) next = "theme";
      if (context === "root" && rule.name === "layer" && rule.params === "base") next = "base";
      if (context === "theme" && rule.name === "keyframes" && /^[a-z][\w-]*$/.test(rule.params))
        next = "frames";
      if (
        context === "base" &&
        rule.name === "media" &&
        rule.params === "(prefers-reduced-motion: reduce)"
      )
        next = "motion";
      if (!next) {
        reject(`@${rule.name} is outside the permitted Tailwind token/base configuration`);
        return;
      }
      for (const child of rule.nodes ?? []) check(child, next);
    }
    for (const node of root.nodes) check(node, "root");
  } catch {
    reject("stylesheet must be valid CSS");
  }
  return [...new Set(errors)];
}
