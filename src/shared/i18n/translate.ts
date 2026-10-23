export type Dictionary = Readonly<Record<string, string>>;
/** Shared pure translator; it never imports every locale into the browser. */
export function createTranslator(dictionary: Dictionary) {
  return (source: string, values: Record<string, string | number> = {}) => {
    const message = dictionary[source] ?? source;
    return message.replace(/\{(\w+)\}/g, (match, key: string) =>
      Object.hasOwn(values, key) ? String(values[key]) : match,
    );
  };
}
