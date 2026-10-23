import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { authConfigured } from "@/features/access/server/auth";
export default function Page() {
  if (!authConfigured()) redirect("/");
  return (
    <main id="main" className="auth-page">
      <SignIn />
    </main>
  );
}
