import { AccessEntry } from "@/components/access-entry";
import { redirect } from "next/navigation";
import { authConfigured } from "@/lib/auth";
export default function Page() {
  if (!authConfigured()) redirect("/");
  return (
    <main id="main" className="auth-page">
      <AccessEntry signup />
    </main>
  );
}
