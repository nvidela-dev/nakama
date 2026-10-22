import "server-only";
import { cookies } from "next/headers";
import { localeCookie, resolveLocale, translator } from "./index";
export async function getLocale() {
  return resolveLocale((await cookies()).get(localeCookie)?.value);
}
export async function getT() {
  return translator(await getLocale());
}
