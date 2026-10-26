"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/shared/ui/button";
import type { GuideCopy } from "./lab-guide";
const Guide = dynamic(() => import("./lab-guide"), { ssr: false });
export function LabGuideLoader({ copy }: { copy: GuideCopy }) {
  const [started, setStarted] = useState(false);
  return started ? (
    <Guide copy={copy} />
  ) : (
    <Button onClick={() => setStarted(true)}>{copy.start}</Button>
  );
}
