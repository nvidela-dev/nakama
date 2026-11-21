import Link from "next/link";
import Image from "next/image";
import { Input } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
import { ProspectMigrationPending } from "@/features/prospects/server/access";
import { prospectService } from "@/features/prospects/server/catalogue";
import { getLocale, getT } from "@/shared/i18n/server";
import { translator, formatDate } from "@/shared/i18n";
import { kindLabel, statusLabel } from "@/features/prospects/model";
import {
  EditProspect,
  AddProspect,
  ImportProspects,
  AssignProspect,
  ShareProspect,
  CatalogueAccess,
  InviteCollaborator,
  LogOutreach,
} from "@/features/prospects/components/prospect-forms";
import { Panel } from "@/shared/ui/panel";

export async function generateMetadata() {
  return { title: (await getT())("Business catalogue") };
}
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; page?: string; q?: string }>;
}) {
  const [query, person, locale] = await Promise.all([searchParams, actor(true), getLocale()]);
  const t = translator(locale),
    base = "/prospects";
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 300) : "";
  const filter = search ? "&q=" + encodeURIComponent(search) : "";
  let data;
  try {
    data = await prospectService(database()).read(
      person,
      query.business,
      Number(query.page),
      search,
    );
  } catch (error) {
    if (error instanceof ProspectMigrationPending)
      return (
        <main id="main" className="mx-auto max-w-5xl p-6">
          <h1 className="my-3 text-2xl">{t("Business catalogue")}</h1>
          <p>{t("The prospect database is awaiting its migration.")}</p>
        </main>
      );
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  const { prospect, prospects, members, owner, all, page, hasNext, timeline } = data;
  const title = all ? t("Business catalogue") : t("My prospects");
  const others = members.filter((m) => m.user_id !== person.userId);
  const back = `${base}?page=${page}${filter}`;
  return (
    <main id="main" className="mx-auto grid max-w-5xl gap-5 px-4 py-6 md:px-8">
      <nav className="flex gap-4 text-sm">{prospect && <Link href={back}>{title}</Link>}</nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight wrap-anywhere">
          {prospect?.name ?? title}
        </h1>
        {prospect && (
          <p className="mt-2 text-muted">
            {t(statusLabel[prospect.status])} · {prospect.assignee_name ?? t("Unassigned")} ·{" "}
            {t(prospect.called ? "Called" : "Not called")}
          </p>
        )}
      </header>
      {prospect ? (
        <>
          {prospect.details && (
            <Panel>
              <h2 className="font-semibold">{t("Contact details")}</h2>
              <p className="whitespace-pre-wrap wrap-anywhere">{prospect.details}</p>
            </Panel>
          )}
          {owner && (
            <Panel>
              <details>
                <summary className="cursor-pointer font-medium">
                  {t("Edit business profile")}
                </summary>
                <EditProspect
                  key={prospect.id + ":" + prospect.revision}

                  record={prospect}
                />
              </details>
            </Panel>
          )}
          {Object.keys(data.research).length > 0 && (
            <Panel>
              <h2 className="mb-2 font-semibold">{t("Research updates")}</h2>
              <dl>
                {Object.entries(data.research).map(([key, value]) => (
                  <div className="py-1" key={key}>
                    <dt className="font-medium wrap-anywhere">{key}</dt>
                    <dd className="whitespace-pre-wrap wrap-anywhere">
                      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
          <div className="grid items-start gap-4 md:grid-cols-2">
            <Panel>
              <h2 className="mb-3 text-lg font-semibold">{t("Log outreach")}</h2>
              <LogOutreach key={prospect.id} record={prospect} />
            </Panel>
            {owner && (
              <Panel>
                <h2 className="mb-3 text-lg font-semibold">{t("Assignment")}</h2>
                <AssignProspect record={prospect} members={members} />
                {others.length > 0 && (
                  <details className="mt-4">
                    <summary>{t("Share this business")}</summary>
                    <ShareProspect id={prospect.id} members={others} />
                  </details>
                )}
              </Panel>
            )}
          </div>
          {data.sources.length > 0 && (
            <Panel>
              <h2 className="mb-2 font-semibold">{t("Imported records")}</h2>
              {data.sources.map((s) => (
                <details key={s.source_rank} className="py-1">
                  <summary className="cursor-pointer">
                    {t(
                      s.source_rank === 3
                        ? "Source database"
                        : s.source_rank === 2
                          ? "Catalogue dossier"
                          : "Catalogue index",
                    )}
                  </summary>
                  {Object.entries(s.payload)
                    .flatMap(([section, value]) =>
                      section === "tables" &&
                      value &&
                      typeof value === "object" &&
                      !Array.isArray(value)
                        ? Object.entries(value)
                        : [[section, value] as const],
                    )
                    .map(([label, entries]) => (
                      <details key={label} className="ml-3 py-1">
                        <summary className="cursor-pointer wrap-anywhere">
                          {label.replaceAll("_", " ")}
                          {Array.isArray(entries) ? ` (${entries.length})` : ""}
                        </summary>
                        <pre className="whitespace-pre-wrap wrap-anywhere text-sm">
                          {JSON.stringify(entries, null, 2)}
                        </pre>
                      </details>
                    ))}
                </details>
              ))}
              {data.images.length > 0 && (
                <details className="py-1">
                  <summary>{t("Evidence images")}</summary>
                  <ul>
                    {data.images.map((img, i) => (
                      <li key={img.sha256}>
                        {img.available ? (
                          <a
                            href={`${base}/${prospect.id}/images/${img.sha256}`}
                            className="underline"
                          >
                            <Image
                              unoptimized
                              src={`${base}/${prospect.id}/images/${img.sha256}`}
                              alt={t("Open image {number}", { number: i + 1 })}
                              width={280}
                              height={180}
                              className="my-2 h-28 w-48 object-contain bg-panel"
                            />
                          </a>
                        ) : (
                          t("Image {number} missing from archive", { number: i + 1 })
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Panel>
          )}
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">{t("Prospect timeline")}</h2>
            {timeline.length === 0 ? (
              <p>{t("No activity yet.")}</p>
            ) : (
              <ol className="divide-y divide-line">
                {timeline.map((e) => (
                  <li key={e.id} className="grid gap-1 py-3">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <strong>
                        {t(kindLabel[e.kind])}
                        {e.outcome && ` · ${t(statusLabel[e.outcome])}`}
                      </strong>
                      <time className="text-xs text-muted" dateTime={e.created_at.toISOString()}>
                        {formatDate(e.created_at, locale)}
                      </time>
                    </div>
                    {e.kind === "assignment" ? (
                      <span>
                        {t("{actor} changed the assignee from {from} to {to}.", {
                          actor: e.actor_name,
                          from: e.previous_assignee ?? t("Unassigned"),
                          to: e.next_assignee ?? t("Unassigned"),
                        })}
                      </span>
                    ) : e.kind === "membership_ended" ? (
                      <span>
                        {t("{person} left the catalogue. The prospect is now unassigned.", {
                          person: e.actor_name,
                        })}
                      </span>
                    ) : (
                      <>
                        <span className="text-sm text-muted">{e.actor_name}</span>
                        {e.note && <p className="whitespace-pre-wrap wrap-anywhere">{e.note}</p>}
                        {e.profile_changes && (
                          <details>
                            <summary>{t("Saved changes")}</summary>
                            <pre className="whitespace-pre-wrap wrap-anywhere text-sm">
                              {JSON.stringify(e.profile_changes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </>
      ) : (
        <>
          {owner && (
            <Panel>
              <div className="grid gap-3">
                <details>
                  <summary className="cursor-pointer font-medium">{t("Add business")}</summary>
                  <div className="mt-3">
                    <AddProspect />
                  </div>
                </details>
                <details>
                  <summary className="cursor-pointer font-medium">{t("Import catalogue")}</summary>
                  <div className="mt-3">
                    <ImportProspects />
                    {data.receipts.length > 0 && (
                      <ul className="mt-3 grid gap-2">
                        {data.receipts.map((r) => (
                          <li key={r.digest}>
                            <time>{formatDate(r.completed_at, locale)}</time> ·{" "}
                            {t(
                              r.format === "database"
                                ? "Source database"
                                : r.format === "presentation"
                                  ? "Catalogue dossier"
                                  : "Catalogue index",
                            )}{" "}
                            ·{" "}
                            {t("{count} businesses, {missing} missing image files", {
                              count: r.businesses,
                              missing: r.missing,
                            })}{" "}
                            ·{" "}
                            <a className="underline" href={`${base}/imports/${r.digest}`}>
                              {t("Download original")}
                            </a>
                            {Object.keys(r.tables).length > 0 && (
                              <details>
                                <summary className="cursor-pointer">
                                  {t("Source table counts")}
                                </summary>
                                <dl className="text-sm">
                                  {Object.entries(r.tables)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([table, count]) => (
                                      <div key={table} className="flex gap-2">
                                        <dt>{table.replaceAll("_", " ")}</dt>
                                        <dd>{count}</dd>
                                      </div>
                                    ))}
                                </dl>
                              </details>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
                <details>
                  <summary className="cursor-pointer font-medium">{t("Catalogue access")}</summary>
                  <div className="mt-3">
                    <InviteCollaborator pending={data.invitations} />
                    {others.length ? <CatalogueAccess members={others} /> : null}
                  </div>
                </details>
              </div>
            </Panel>
          )}
          <Panel>
            <form action={base} method="get" className="mb-3 flex gap-2 items-center">
              <Input
                name="q"
                defaultValue={search}
                maxLength={300}
                aria-label={t("Find a business")}
                placeholder={t("Find a business")}
              />
              <Button type="submit" variant="secondary">
                {t("Search")}
              </Button>
              {search && <Link href={base}>{t("Clear")}</Link>}
            </form>
            {prospects.length === 0 ? (
              <p>
                {t(
                  all
                    ? "No businesses on this page."
                    : "No businesses shared with you on this page.",
                )}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {prospects.map((p) => (
                  <li key={p.id} className="py-3 grid gap-1">
                    <Link
                      prefetch={false}
                      href={`${base}?business=${p.id}&page=${page}${filter}`}
                      className="text-base font-semibold underline wrap-anywhere"
                    >
                      {p.name}
                    </Link>
                    <span className="text-sm">
                      {t(statusLabel[p.status])} · {p.assignee_name ?? t("Unassigned")} ·{" "}
                      {t(p.called ? "Called" : "Not called")}
                    </span>
                    {p.latest_outcome && (
                      <span className="line-clamp-2 text-sm text-muted wrap-anywhere">
                        {p.latest_outcome}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {(page > 1 || hasNext) && (
            <nav aria-label={t("Catalogue pages")} className="flex gap-4">
              {page > 1 && <Link href={`${base}?page=${page - 1}${filter}`}>{t("Previous")}</Link>}
              {hasNext && <Link href={`${base}?page=${page + 1}${filter}`}>{t("Next")}</Link>}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
