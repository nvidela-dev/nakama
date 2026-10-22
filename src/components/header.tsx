import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Nakama home">
        <span className="brand-mark" aria-hidden="true">
          ✳
        </span>{" "}
        nakama<span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/">The harbor</Link>
        {authConfigured() && (
          <>
            <Show when="signed-in">
              <Link href="/projects">Your projects</Link>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button className="nav-button">Come aboard ↗</button>
              </SignInButton>
            </Show>
          </>
        )}
      </nav>
    </header>
  );
}
