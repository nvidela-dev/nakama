import { SidebarSection } from "@/shared/ui/workspace-layout";
import type { loadWorkspace } from "./workspace";

import { Suspense } from "react";
import type { InviteAudience } from "@/features/collaboration/server/invite-audience";
import { approvedInvitees } from "@/features/collaboration/server/invitation-candidates";
import type { translator } from "@/shared/i18n/index";
import { AccessButton } from "@/features/collaboration/components/access-button";
import { InviteForm } from "@/features/collaboration/components/invite-form";
async function OwnerInviteForm({
  projectId,
  audience,
}: {
  projectId: string;
  audience: InviteAudience;
}) {
  return <InviteForm projectId={projectId} candidates={await approvedInvitees(audience)} />;
}
type WorkspaceData = Awaited<ReturnType<typeof loadWorkspace>>;
export function ProjectMembersPanel({
  projectId,
  people,
  invitees,
  owner,
  userId,
  t,
}: {
  projectId: string;
  people: WorkspaceData["people"];
  invitees: WorkspaceData["invitees"];
  owner: boolean;
  userId: string;
  t: ReturnType<typeof translator>;
}) {
  return (
    <SidebarSection
      open
      heading={t("Members")}
      count={people.members.length}
      className="project-people-panel [&_.form-stack]:gap-1.5 [&_.form-stack_label]:text-[11px] [&_.form-stack_label]:leading-[1.4] [&_.form-stack_small]:text-[11px] [&_.form-stack_small]:leading-[1.45] [&_select]:w-full pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_select]:min-h-11"
    >
      <div className="project-members grid gap-2.5 min-w-0 max-w-full">
        <ul className={"people-list list-none p-0 m-0 min-w-0"}>
          {people.members.map((m) => (
            <li
              key={m.user_id}
              className={
                "border-b border-b-line last:border-b-0 flex items-center justify-between min-w-0 break-words wrap-anywhere flex-wrap py-1 px-0 gap-1.5"
              }
            >
              <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap break-words wrap-anywhere">
                <strong className={"text-[11px] leading-[1.4] break-words"}>
                  {m.user_id === userId ? t("You") : m.display_name}
                </strong>
                <small className={"text-muted text-[11px] leading-[1.4]"}>{t(m.role)}</small>
              </div>
              {owner && m.role === "member" && (
                <AccessButton projectId={projectId} id={m.user_id} operation="remove" />
              )}
            </li>
          ))}
        </ul>
        {owner && (
          <>
            {invitees && (
              <Suspense fallback={<p role="status">{t("Loading…")}</p>}>
                <OwnerInviteForm projectId={projectId} audience={invitees} />
              </Suspense>
            )}
            {people.invitations.length > 0 && (
              <div className="min-w-0 max-w-full pt-1 border-t border-t-line">
                <h3
                  className={
                    "font-sans tracking-[-0.045em] font-medium text-muted m-0 mb-1 text-[11px] uppercase leading-[1.4]"
                  }
                >
                  {t("Invitations")}
                </h3>
                <ul className={"people-list list-none p-0 m-0 min-w-0"}>
                  {people.invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className={
                        "border-b border-b-line last:border-b-0 flex items-center justify-between min-w-0 break-words wrap-anywhere flex-wrap py-1 px-0 gap-1.5"
                      }
                    >
                      <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap break-words wrap-anywhere">
                        <strong className={"text-[11px] leading-[1.4] break-words"}>
                          {inv.email}
                        </strong>
                        <small className={"text-muted text-[11px] leading-[1.4]"}>
                          {inv.revoked_at
                            ? t("Revoked")
                            : inv.accepted_at
                              ? t("Accepted")
                              : new Date(inv.expires_at) <= new Date()
                                ? t("Expired")
                                : t("Pending")}
                        </small>
                      </div>
                      {!inv.revoked_at &&
                        !inv.accepted_at &&
                        new Date(inv.expires_at) > new Date() && (
                          <AccessButton projectId={projectId} id={inv.id} operation="revoke" />
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </SidebarSection>
  );
}
