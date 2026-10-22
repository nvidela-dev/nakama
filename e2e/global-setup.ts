import { clerkSetup } from "@clerk/testing/playwright";
export default async function setup() {
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
    throw new Error("E2E requires dedicated Clerk development keys.");
  process.env.CLERK_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  await clerkSetup();
}
