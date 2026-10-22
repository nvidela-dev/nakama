"use server";
import { cookies } from "next/headers";
export async function changeDensity(density: string) {
  if (density !== "compact" && density !== "comfortable")
    throw new Error("Unsupported density");
  (await cookies()).set("nakama-density", density, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
