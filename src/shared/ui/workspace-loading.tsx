import { LoadingState } from "./loading-state";

export function WorkspaceLoading({ title, label }: { title: string; label: string }) {
  return (
    <main
      id="main"
      className="mx-auto grid w-full max-w-[1480px] min-w-0 content-start gap-4 px-4 py-6 md:px-8"
    >
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p role="status" className="text-sm text-muted">
        {label}
      </p>
      <div aria-hidden="true">
        <LoadingState label={label} lines={5} variant="compact" />
      </div>
    </main>
  );
}
