import type { AccessRequest } from "@/features/access/model";
import { getLocale, getT } from "@/shared/i18n/server";
import { formatDate } from "@/shared/i18n/date";
import { RequestActions } from "@/features/access/components/request-actions";
export async function AccessRequestList({ requests }: { requests: AccessRequest[] }) {
  const t = await getT();
  const locale = await getLocale();
  return (
    <section className={"access-requests mt-6 pt-4.5 border-t border-t-line"}>
      <h2
        className={
          "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
        }
      >
        {t("Access requests")}{" "}
        <span
          className={
            "count text-[13px] align-middle text-muted border border-line py-0.75 px-2.25 rounded-[100px] ml-2"
          }
        >
          {requests.length}
        </span>
      </h2>
      <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
        {t(
          "Submitted emails are not verified identities. This list starts with requests made in Nakama; it does not include historical Clerk rejections.",
        )}
      </p>
      {requests.length ? (
        <ul className={"people-list my-[1em] list-none mt-0 mx-0 mb-6 p-0 lg:compact:mb-3.5"}>
          {requests.map((request) => (
            <li
              key={request.id}
              className={
                "py-3.75 px-0 border-b border-b-line flex items-center justify-between wrap-anywhere lg:compact:py-2 lg:compact:gap-2 flex-wrap gap-3"
              }
            >
              <div>
                <strong className={"allowed-email wrap-anywhere min-w-0 text-[13px]"}>
                  {request.email}
                </strong>
                <small className={"block text-[11px] text-muted"}>
                  {formatDate(new Date(request.createdAt), locale)}
                </small>
              </div>
              <RequestActions id={request.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={"mb-[1em] mt-0"}>{t("No pending access requests.")}</p>
      )}
    </section>
  );
}
