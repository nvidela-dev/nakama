import type { AccessRequest } from "@/lib/access-requests";
import { getLocale, getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n";
import { RequestActions } from "./request-actions";
export async function AccessRequestList({ requests }: { requests: AccessRequest[] }) {
  const t = await getT();
  const locale = await getLocale();
  return <section className="access-requests">
    <h2>{t("Access requests")} <span className="count">{requests.length}</span></h2>
    <p className="muted">{t("Submitted emails are not verified identities. This list starts with requests made in Nakama; it does not include historical Clerk rejections.")}</p>
    {requests.length ? <ul className="people-list">{requests.map((request) => <li key={request.id}>
      <div><strong className="allowed-email">{request.email}</strong><small>{formatDate(new Date(request.createdAt), locale)}</small></div>
      <RequestActions id={request.id} />
    </li>)}</ul> : <p>{t("No pending access requests.")}</p>}
  </section>;
}
