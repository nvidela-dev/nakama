import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { authConfigured } from "@/lib/auth";
export default function Page() {
  if (!authConfigured()) redirect("/");
  return (
    <main id="main" className="auth-page">
      <SignIn />
    </main>
  );
}
