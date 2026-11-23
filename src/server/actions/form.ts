export const field = (data: FormData, name: string) => String(data.get(name) ?? "");
