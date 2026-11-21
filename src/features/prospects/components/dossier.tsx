import { getT } from "@/shared/i18n/server";
import { Panel } from "@/shared/ui/panel";

function object(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}
function plain(input: unknown) {
  return typeof input === "string" ? input : "";
}
function link(input: unknown) {
  const s = plain(input);
  if (!URL.canParse(s)) return null;
  const url = new URL(s);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null;
}
function SourceLink({ value }: { value: unknown }) {
  const url = link(value);
  return url ? (
    <a
      className="underline wrap-anywhere"
      href={url.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {url.hostname}
    </a>
  ) : null;
}
export async function Dossier({ data }: { data: unknown }) {
  const d = object(data);
  if (!Object.keys(d).length) return null;
  const t = await getT(),
    assessment = object(d.assessment);
  const contacts = Array.isArray(d.contacts) ? d.contacts.map(object) : [];
  const sources = Array.isArray(d.sources) ? d.sources.map(object) : [];
  const questions = [
    ["offer", "Service idea"],
    ["fit", "Opportunity hypothesis"],
    ["nextAction", "Next action"],
    ["discoveryQuestion", "Discovery question"],
    ["caveat", "Limits and counterevidence"],
  ] as const;
  return (
    <Panel>
      <h2 className="mb-3 text-lg font-semibold">{t("Business research")}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <p>{[plain(d.category), plain(d.city), plain(d.region)].filter(Boolean).join(" · ")}</p>
          <SourceLink value={d.website} />
          {contacts.length > 0 && (
            <details>
              <summary className="cursor-pointer">
                {t("Contacts")} ({contacts.length})
              </summary>
              <ul className="divide-y divide-line">
                {contacts.map((c, i) => (
                  <li key={i} className="py-2 text-sm wrap-anywhere">
                    <strong>{plain(c.kind)} </strong>
                    {plain(c.display_value)} · <SourceLink value={c.source_url} />
                  </li>
                ))}
              </ul>
            </details>
          )}
          {sources.length > 0 && (
            <details>
              <summary className="cursor-pointer">
                {t("Source evidence")} ({sources.length})
              </summary>
              <ul className="divide-y divide-line">
                {sources.map((s, i) => (
                  <li key={i} className="grid py-2 text-sm">
                    <SourceLink value={s.source_url} />
                    <time>{plain(s.observed_at)}</time>
                    {plain(s.facts) && <p>{plain(s.facts)}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <dl className="grid content-start gap-2">
          {questions.map(([key, label]) =>
            plain(assessment[key]) ? (
              <div key={key}>
                <dt className="font-semibold">{t(label)}</dt>
                <dd className="text-sm whitespace-pre-wrap wrap-anywhere">
                  {plain(assessment[key])}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>
    </Panel>
  );
}
