"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
import { createProject } from "@/features/projects/actions";

const ProjectSetup = dynamic(
  () => import("./project-setup").then((module) => module.ProjectSetup),
  { loading: () => null },
);

export function NewProjectButton({
  initialSourceIds = [],
  label = "New project",
}: {
  initialSourceIds?: string[];
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <>
      <Button
        type="button"
        className="new-project-trigger w-full justify-between [&_>_span]:text-[20px] [&_>_span]:leading-[1]"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setStarted(true);
          setOpen(true);
        }}
      >
        {t(label)} <Icon name="plus" />
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
