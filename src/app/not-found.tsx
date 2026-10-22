import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="workspace narrow">
      <h1>This project isn't available.</h1>
      <p>It may not exist, or you may no longer have access.</p>
      <Link href="/projects" className="button">
        Back to your projects
      </Link>
    </main>
  );
}
