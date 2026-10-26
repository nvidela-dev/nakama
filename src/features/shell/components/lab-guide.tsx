"use client";
import { useEffect, useRef, useState } from "react";
import { Steps, Progress, Tag, Segmented } from "antd";
import { ResearchProvider } from "@/shared/ui/research-provider";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/controls";
import { Icon } from "@/shared/ui/icon";
export type GuideCopy = {
  start: string;
  back: string;
  next: string;
  replay: string;
  motion: string;
  still: string;
  sample: string;
  result: string;
  pass: string;
  fail: string;
  source: string;
  run: string;
  steps: {
    title: string;
    heading: string;
    body: string;
    action: string;
    note: string;
    record: string;
  }[];
};
export default function LabGuide({ copy }: { copy: GuideCopy }) {
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState(true);
  const [replay, setReplay] = useState(0);
  const [observed, setObserved] = useState(4);
  const scene = useRef<HTMLDivElement>(null);
  const current = copy.steps[step]!;
  useEffect(() => {
    if (!motion || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations = Array.from(scene.current?.querySelectorAll("[data-instrument]") ?? []).map(
      (el, i) =>
        el.animate(
          [
            { opacity: 0, transform: "translateY(24px) scale(.96)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 600, delay: i * 110, easing: "cubic-bezier(.2,0,0,1)", fill: "backwards" },
        ),
    );
    return () => animations.forEach((a) => a.cancel());
  }, [step, motion, replay, observed]);
  return (
    <ResearchProvider>
      <div className="grid gap-4 min-w-0">
        <div className="flex flex-wrap gap-3 items-center justify-between border-b border-line py-3">
          <span className="font-mono text-[11px] text-muted">{copy.sample}</span>
          <Button variant="secondary" aria-pressed={!motion} onClick={() => setMotion(!motion)}>
            {motion ? copy.still : copy.motion}
          </Button>
        </div>
        <div className="hidden lg:block">
          <Steps
            current={step}
            onChange={setStep}
            items={copy.steps.map((s) => ({ title: s.title }))}
            size="small"
          />
        </div>
        <label className="grid gap-2 lg:hidden text-[12px]">
          {step + 1} / {copy.steps.length} · {current.title}
          <Select
            className="min-h-11 border bg-panel p-2 text-ink"
            value={step}
            onChange={(event) => setStep(Number(event.target.value))}
          >
            {copy.steps.map((s, i) => (
              <option key={s.title} value={i}>
                {i + 1}. {s.title}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid lg:grid-cols-12 gap-4 items-start">
          <section
            className="lg:col-span-7 min-w-0 border border-line bg-panel rounded-[18px] p-6 grid gap-4"
            ref={scene}
            aria-label={current.title}
          >
            <div data-instrument className="flex justify-between items-center gap-3">
              <span className="font-mono text-[11px] text-muted">
                EXP-001 / {String(step + 1).padStart(2, "0")}
              </span>
              <Tag>{current.title}</Tag>
            </div>
            <h2 data-instrument className="text-[28px] font-semibold leading-[1.3]">
              {current.heading}
            </h2>
            <div
              data-instrument
              className="border border-line rounded-[12px] bg-[var(--theme-surface)] p-4 grid gap-3"
            >
              <span className="font-mono text-[11px] text-muted">{copy.source}</span>
              <p className="text-[16px] whitespace-pre-line">{current.record}</p>
            </div>
            {step >= 3 && (
              <div data-instrument className="grid gap-3">
                <div className="grid grid-cols-5 gap-2" aria-label={copy.result}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="border border-line rounded-[9px] p-2 text-center bg-[var(--theme-surface)]"
                    >
                      <Icon name={i < observed ? "answered" : "close"} />
                      <span className="block font-mono text-[11px]">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <Progress
                  aria-label={copy.result}
                  percent={observed * 20}
                  format={() => `${observed}/5`}
                  strokeColor="var(--color-lime)"
                />
                <p className="text-[12px] text-muted">{copy.run}</p>
                <Segmented
                  aria-label={copy.result}
                  value={observed}
                  onChange={setObserved}
                  options={[
                    { label: copy.fail, value: 2 },
                    { label: copy.pass, value: 4 },
                  ]}
                />
              </div>
            )}
            <p data-instrument className="border-t border-line py-3 text-[14px] text-muted">
              {current.note}
            </p>
          </section>
          <aside className="lg:col-span-5 min-w-0 grid gap-4 border border-line bg-panel rounded-[18px] p-6">
            <p className="text-[16px] leading-[1.6]">{current.body}</p>
            <div className="border border-line rounded-[12px] p-4 bg-[var(--color-solar)] text-[#203a32]">
              <p className="font-semibold">{current.action}</p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label={copy.start}>
              <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
                {copy.back}
              </Button>
              <Button onClick={() => setStep((step + 1) % copy.steps.length)}>
                {step === copy.steps.length - 1 ? copy.start : copy.next}
              </Button>
              <Button variant="ghost" onClick={() => setReplay(replay + 1)}>
                {copy.replay}
              </Button>
            </nav>
            <p role="status" className="font-mono text-[11px] text-muted">
              {step + 1} / {copy.steps.length} · {current.title}
            </p>
          </aside>
        </div>
      </div>
    </ResearchProvider>
  );
}
