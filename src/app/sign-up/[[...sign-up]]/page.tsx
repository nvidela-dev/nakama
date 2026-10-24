import { AccessEntry } from "@/features/access/components/access-entry";
import { redirect } from "next/navigation";
import { authConfigured } from "@/features/access/server/auth";
export default function Page() {
  if (!authConfigured()) redirect("/");
  return (
    <main id="main" className={"auth-page flex justify-center py-15 px-5 min-h-[70vh]"}>
      <AccessEntry signup />
    </main>
  );
}
