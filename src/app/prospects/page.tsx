import Link from "next/link";
import Image from "next/image";
import { CatalogueAction } from "@/features/prospects/components/catalogue-action";
import { CatalogueBrowser } from "@/features/prospects/components/catalogue-browser";
import { catalogueHref, catalogueParams, type CatalogueQuery } from "@/features/prospects/filters";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
import { ProspectMigrationPending } from "@/features/prospects/server/access";
import { prospectService } from "@/features/prospects/server/catalogue";
import { getLocale, getT } from "@/shared/i18n/server";
import { translator, formatDate } from "@/shared/i18n";
import { isProspectStatus, kindLabel, statusLabel } from "@/features/prospects/model";
import {
  BoardEntry,
  EditProspect,
  ProspectWork,
  AddProspect,
  ImportProspects,
  AssignProspect,
  ShareProspect,
  CatalogueAccess,
  InviteCollaborator,
  LogOutreach,
} from "@/features/prospects/components/prospect-forms";
import { SalesSummary } from "@/features/prospects/components/sales-summary";
import { ProspectPrivateReview } from "@/features/prospects/components/private-review";
import { saveProspectReview } from "@/features/prospects/review-actions";
import { prospectReview } from "@/features/prospects/server/review";
import { Dossier } from "@/features/prospects/components/dossier";
import { Panel } from "@/shared/ui/panel";

export async function generateMetadata() {
  return { title: (await getT())("Business catalogue") };
}
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueQuery>;
}) {
  const [query, person, locale] = await Promise.all([searchParams, actor(true), getLocale()]);
  const t = translator(locale),
    base = "/prospects";
  const filters = catalogueParams(query);
  let data;
  try {
    data = await prospectService(database()).read(
      person,
      typeof query.business === "string" ? query.business : undefined,
      Number(query.page),
      filters.get("q") ?? "",
      filters,
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
  const { prospect, members, owner, all, page, timeline } = data;
  const title = all ? t("Business catalogue") : t("My prospects");
  const others = members.filter((m) => m.user_id !== person.userId);
  const back = catalogueHref(filters, { page });
  const review =
    prospect && owner && data.availableStages.includes("assess_fit")
      ? await prospectReview(database()).read(
          person,
          prospect.id,
          typeof query.reviewBefore === "string" ? query.reviewBefore : undefined,
        )
      : null;
  return (
    <main id="main" className="mx-auto w-full grid max-w-[1480px] gap-5 px-4 py-6 md:px-8">
      {prospect && (
        <nav className="flex gap-4 text-sm">
          <Link href={back}>{title}</Link>
        </nav>
      )}
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight wrap-anywhere">
            {prospect?.name ?? title}
          </h1>
          {!prospect && owner && (
            <div className="flex items-center gap-1">
              <CatalogueAction label="Add business" icon="plus">
                <div className="mt-3">
                  <AddProspect />
                </div>
              </CatalogueAction>
              <CatalogueAction label="Import catalogue" icon="upload">
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
              </CatalogueAction>
              <CatalogueAction label="Catalogue access" icon="consultancy">
                <div className="mt-3">
                  <InviteCollaborator pending={data.invitations} />
                  {others.length ? <CatalogueAccess members={others} /> : null}
                </div>
              </CatalogueAction>
            </div>
          )}
        </div>
        {prospect && (
          <p className="mt-2 text-muted">
            {t(statusLabel[prospect.status])} · {prospect.assignee_name ?? t("Unassigned")} ·{" "}
            {t(prospect.called ? "Called" : "Not called")}
          </p>
        )}
      </header>
      {prospect ? (
        <>
          <Panel>
            <SalesSummary summary={prospect} t={t} />
          </Panel>
          <section aria-label={t("Business images")} className="grid gap-3">
            {data.images.length ? (
              <ul className="flex flex-wrap items-start gap-3">
                {data.images.map((img, i) => (
                  <li key={img.sha256} className={i === 0 ? "w-full" : ""}>
                    {img.available ? (
                      <a
                        href={`${base}/${prospect.id}/images/${img.sha256}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-fit max-w-full cursor-zoom-in"
                      >
                        <Image
                          unoptimized
                          loading={i === 0 ? "eager" : "lazy"}
                          src={`${base}/${prospect.id}/images/${img.sha256}`}
                          alt={t("{business} · image {number}", {
                            business: prospect.name,
                            number: i + 1,
                          })}
                          width={i === 0 ? 960 : 240}
                          height={i === 0 ? 540 : 144}
                          className={
                            i === 0
                              ? "block max-h-[48vh] w-auto max-w-full rounded-lg border border-line object-contain"
                              : "h-20 w-32 rounded border border-line object-cover"
                          }
                        />
                      </a>
                    ) : (
                      t("Image {number} missing from archive", { number: i + 1 })
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("No image in the source catalogue.")}</p>
            )}
          </section>
          {(prospect.assignee_id === person.userId || (owner && !prospect.assignee_id)) && (
            <BoardEntry id={prospect.id} revision={prospect.revision} onBoard={prospect.on_board} />
          )}
          {prospect.details && (
            <Panel>
              <h2 className="font-semibold">{t("Contact details")}</h2>
              <p className="whitespace-pre-wrap wrap-anywhere">{prospect.details}</p>
            </Panel>
          )}
          <Dossier
            data={data.sources.find((source) => source.source_rank === 2)?.payload.dossier}
          />
          {review && (
            <ProspectPrivateReview
              key={prospect.id}
              prospectId={prospect.id}
              review={review}
              saveReviewAction={saveProspectReview}
              canAdvance={prospect.status === "assess_fit"}
              olderHref={
                review.previous
                  ? catalogueHref(filters, {
                      business: prospect.id,
                      page,
                      reviewBefore: review.previous,
                    }) + "#private-prospect-review"
                  : null
              }
            />
          )}
          <ProspectWork
            availableStages={data.availableStages}
            record={prospect}
            todos={data.todos}
            linear={data.linear}
          />
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
                        {e.kind === "stage" && typeof e.profile_changes?.board === "string" ? (
                          <p>
                            {t(
                              e.profile_changes.board === "added"
                                ? "Added to my board"
                                : "Removed from my board",
                            )}
                          </p>
                        ) : e.kind === "stage" &&
                          isProspectStatus(e.profile_changes?.from) &&
                          isProspectStatus(e.profile_changes?.to) ? (
                          <p>
                            {t(statusLabel[e.profile_changes.from])} →{" "}
                            {t(statusLabel[e.profile_changes.to])}
                          </p>
                        ) : typeof e.profile_changes?.todo === "string" ? (
                          <p>
                            {t(e.profile_changes.done ? "Completed to-do" : "Open to-do")} ·{" "}
                            {e.profile_changes.todo}
                          </p>
                        ) : typeof e.profile_changes?.linear === "string" ? (
                          <p>
                            {t(
                              e.profile_changes.linear === "linked"
                                ? "Linear link saved"
                                : "Linear link cleared",
                            )}
                          </p>
                        ) : (
                          e.profile_changes && (
                            <details>
                              <summary>{t("Saved changes")}</summary>
                              <pre className="whitespace-pre-wrap wrap-anywhere text-sm">
                                {JSON.stringify(e.profile_changes, null, 2)}
                              </pre>
                            </details>
                          )
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
          {data.listing && (
            <CatalogueBrowser
              availableStages={data.availableStages}
              owner={owner}
              query={filters.toString()}
              listing={data.listing}
              page={page}
            />
          )}
        </>
      )}
    </main>
  );
}
