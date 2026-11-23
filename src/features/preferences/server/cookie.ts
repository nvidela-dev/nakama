import { cookies } from "next/headers";
export async function setPreferenceCookie(name: string, value: string) {
  (await cookies()).set(name, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
