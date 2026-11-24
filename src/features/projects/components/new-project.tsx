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
function ProjectTrigger({ initialSourceIds = [], label = "New Exploration" }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  function showSetup() {
    setStarted(true);
    setOpen(true);
  }
  return (
    <>
      <Button
        variant={initialSourceIds.length ? "secondary" : "primary"}
        size={initialSourceIds.length ? "small" : "middle"}
        className={initialSourceIds.length ? "" : "new-project-trigger min-h-11"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={showSetup}
        icon={<Icon name="newProject" />}
      >
        {t(label)}
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
