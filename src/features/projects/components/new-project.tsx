"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
import { createProject } from "@/features/projects/actions";

const ProjectSetup = dynamic(
  () => import("./project-setup").then((module) => module.ProjectSetup),
  { loading: () => null },
);

type Props = { initialSourceIds?: string[]; label?: string };
export function NewProjectButton(props: Props) {
  const path = usePathname();
  return <ProjectTrigger key={path} {...props} />;
}
function ProjectTrigger({ initialSourceIds = [], label = "New project" }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <>
      <Button
        type="button"
        className="new-project-trigger"
        title={t(label)}
        aria-label={t(label)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setStarted(true);
          setOpen(true);
        }}
      >
        <Icon name="plus" />
        <span className={initialSourceIds.length ? "" : "hidden sm:inline"}>{t(label)}</span>
      </Button>
      {started && (
        <ProjectSetup
          open={open}
          onClose={() => setOpen(false)}
          initialSourceIds={initialSourceIds}
          createAction={createProject}
        />
      )}
    </>
  );
}
