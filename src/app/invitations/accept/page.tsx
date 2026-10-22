import { Show, SignInButton } from "@clerk/nextjs";
import { AcceptForm } from "@/components/forms";
export default function Page() {
  return (
    <main id="main" className="workspace narrow">
      <section className="panel">
        <span className="eyebrow">GOOD THINGS START WITH COMPANY</span>
        <h1>You're invited aboard.</h1>
        <p>
          Join using the verified email your friend invited. No project details
          are shared until you accept.
        </p>
        <Show when="signed-in">
          <AcceptForm />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button>Sign in to accept</button>
          </SignInButton>
        </Show>
      </section>
    </main>
  );
}
