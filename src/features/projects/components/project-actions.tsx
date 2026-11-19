"use client";
import { useActionState } from "react";
import { setProjectArchived } from "../actions";
import { useT } from "@/shared/i18n/provider";
import { ActionMenu } from "@/shared/ui/action-menu";
import { Button } from "@/shared/ui/button";
import { Feedback } from "@/shared/ui/feedback";
import { Icon } from "@/shared/ui/icon";

export function ProjectActions({
  projectId,
  archived,
  editing,
  confirming,
  onEdit,
  onDelete,
}: {
  projectId: string;
  archived: boolean;
  editing?: boolean;
  confirming?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [state, changeArchive, pending] = useActionState(
    setProjectArchived.bind(null, projectId, !archived),
    {},
  );
  return (
    <>
      <ActionMenu id={`project-actions-${projectId}`} label={t("Project actions")}>
        <Button
          variant="ghost"
          onClick={onEdit}
          aria-expanded={editing}
          aria-controls={
            editing === undefined ? undefined : `settings-${projectId}-edit-project-form`
          }
        >
          <Icon name="edit" /> {t("Edit project")}
        </Button>
        <form action={changeArchive}>
          <Button type="submit" variant="ghost" className="w-full" pending={pending}>
            <Icon name={archived ? "rotateLeft" : "box"} />
            {t(archived ? "Restore project" : "Archive project")}
          </Button>
        </form>
        <Button
          variant="ghost"
          onClick={onDelete}
          aria-expanded={confirming}
          aria-controls={
            confirming === undefined ? undefined : `settings-${projectId}-delete-project-form`
          }
        >
          <Icon name="delete" /> {t("Delete project")}
        </Button>
      </ActionMenu>
      <Feedback state={state} />
    </>
  );
}
