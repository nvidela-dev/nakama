import { auth } from "@clerk/nextjs/server";
import { HomeDigest } from "@/features/shell/components/home-digest";
import { loadHomeActivity } from "@/features/shell/server/home-activity";
import { getLocale, getT } from "@/shared/i18n/server";
import Link from "next/link";
import { authConfigured } from "@/features/access/server/auth";
export default async function Home() {
  if (authConfigured() && (await auth()).isAuthenticated) {
    const [activity, locale] = await Promise.all([loadHomeActivity(), getLocale()]);
    return <HomeDigest activity={activity} locale={locale} />;
  }
  const t = await getT();
  return (
    <main id="main" className="landing w-full max-w-360 m-auto p-4 lg:p-6 grid gap-4">
      <section className="grid gap-6 lg:grid-cols-2 bg-panel border border-line rounded-[18px] p-6 lg:p-8">
        <div className="grid gap-4 content-start">
          <h1 className="text-[clamp(32px,_4vw,_44px)] leading-[1.15] font-semibold tracking-[-1px] max-w-175">
            {t("A question. A bounded test. A useful decision.")}
          </h1>
          <p className="text-muted text-[16px] max-w-175">
            {t(
              "A practical research station for your projects. Define what matters, keep the evidence, and decide what to try next.",
            )}
          </p>
          {authConfigured() && (
            <Link
              className="inline-flex w-fit items-center min-h-11 px-4 py-2 rounded-[9px] bg-lime text-dark font-semibold"
              href="/projects"
            >
              {t("Open explorations")}
            </Link>
          )}
        </div>
        <div className="grid gap-0 border border-line rounded-[12px] overflow-hidden content-start">
          <div className="bg-[var(--theme-surface)] p-4 font-mono text-[11px] text-muted">
            {t("THE RESEARCH LOOP")}
          </div>
          {[
            ["01", t("Ask a testable question"), t("Make the uncertainty specific.")],
            [
              "02",
              t("Declare the method and criterion"),
              t("Decide what counts before seeing the result."),
            ],
            [
              "03",
              t("Run and retain evidence"),
              t("Keep observations separate from interpretation."),
            ],
            ["04", t("Review, then choose"), t("Continue, revise, or stop with a reason.")],
          ].map(([id, title, detail]) => (
            <div key={id} className="grid grid-cols-[40px_1fr] gap-3 p-4 border-t border-line">
              <span className="font-mono text-muted text-[12px]">{id}</span>
              <div>
                <h2 className="font-semibold text-[14px]">{title}</h2>
                <p className="text-muted text-[12px] mt-1">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
