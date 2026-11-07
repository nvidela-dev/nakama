import postcss from "postcss";

/** Application CSS is restricted to the utility compiler configuration. Ant owns component skins. */
export function styleViolations(file: string, source: string): string[] {
  if (!/\.(?:css|scss|sass|less)$/.test(file)) return [];
  if (file !== "src/app/globals.css") return [`${file}: globals.css is the only stylesheet`];
  try {
    const invalid = postcss.parse(source).nodes.some((node) => {
      if (node.type === "comment") return false;
      if (node.type !== "atrule") return true;
      if (node.name === "import")
        return !!node.nodes || !/^["']tailwindcss["'](?: source\("\.\.\/"\))?$/.test(node.params);
      if (node.name === "custom-variant")
        return !!node.nodes || node.params !== 'compact (&:where(html[data-density="compact"] *))';
      return (
        node.name !== "theme" ||
        !!node.params ||
        !node.nodes ||
        node.nodes.some((child) => child.type !== "decl" || !child.prop.startsWith("--color-"))
      );
    });
    return invalid
      ? [`${file}: only layout compiler configuration and color aliases are allowed`]
      : [];
  } catch {
    return [`${file}: invalid stylesheet`];
  }
}
