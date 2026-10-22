import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
import { Header } from "@/components/header";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nakama — a place for your what-ifs",
  description:
    "Capture an idea. Find your people. Make a little something together.",
  referrer: "no-referrer",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      {children}
      <footer>
        Made for the things we haven't made yet.
        <span>Small steps. Good company.</span>
      </footer>
    </>
  );
  return (
    <html lang="en">
      <body>
        {authConfigured() ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
