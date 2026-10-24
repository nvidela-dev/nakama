"use client";
import { Button } from "@/shared/ui/button";
import { errorReference } from "@/shared/lib/error-reference";

// Replaces the root layout when it fails, so providers, translations and stylesheets are
// unavailable. Keep this self-contained and bilingual.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const reference = errorReference(error);
  return (
    <html lang="en">
      <body>
        <main id="main">
          <h1>Unable to load · No se pudo cargar</h1>
          <p>
            We couldn&apos;t load Nakama. Please try again in a moment. · No pudimos cargar Nakama.
            Probá de nuevo en un momento.
          </p>
          {reference && <p>Reference · Referencia: {reference}</p>}
          <Button type="button" onClick={() => retry()}>
            Try again · Reintentar
          </Button>
        </main>
      </body>
    </html>
  );
}
