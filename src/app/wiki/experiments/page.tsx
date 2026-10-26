import Link from "next/link";
import { getWikiT } from "@/features/shell/wiki-i18n";
import { LabGuideLoader } from "@/features/shell/components/lab-guide-loader";
export default async function ExperimentGuide() {
  const t = await getWikiT();
  const copy = {
    start: t("Start the walkthrough"),
    back: t("Back"),
    next: t("Next step"),
    replay: t("Replay motion"),
    motion: t("Enable motion"),
    still: t("Pause motion"),
    sample: t("FICTIONAL EXAMPLE · NO PROJECT DATA IS SAVED"),
    result: t("Compare sample outcomes"),
    pass: t("4 of 5 complete"),
    fail: t("2 of 5 complete"),
    source: t("EXPERIMENT RECORD"),
    run: t(
      "Each tile is one fictional participant. Change the sample to see why finishing a run does not settle the claim.",
    ),
    steps: [
      {
        title: t("Question"),
        heading: t("Can someone use this without help?"),
        body: t(
          "Start with one uncertainty, not the whole business. Here we test whether a first-time user can create a project without instructions.",
        ),
        action: t("In Nakama: open your project → Open experiment lab → New experiment."),
        note: t(
          "A useful question describes an observable behavior. “People will love it” is too vague to test.",
        ),
        record: t("Claim: first-time users can create a project without help."),
      },
      {
        title: t("Criterion"),
        heading: t("Decide what would count."),
        body: t(
          "Choose the success criterion before collecting results. Set a small sample, a time limit, and an observable completion condition. Leave an unknown baseline blank.",
        ),
        action: t(
          "Fill Claim, Method, and Success criteria. Expand Scope, question, metrics and limits if useful.",
        ),
        note: t(
          "If you change the criterion later, save a new plan version. Earlier runs keep their original plan.",
        ),
        record: t(
          "Criterion: at least 4 of 5 first-time users create a project within 2 minutes, without prompting.",
        ),
      },
      {
        title: t("Protocol"),
        heading: t("Make the test repeatable."),
        body: t(
          "Use the same starting screen and task for everyone. Record the outcome and time. Ask permission before recording people; do not put private participant details in the example.",
        ),
        action: t(
          "Save the experiment. Start a run to freeze the current plan and selected project context.",
        ),
        note: t(
          "Nakama records the test. You conduct it outside the app; it does not automatically recruit people or execute agents.",
        ),
        record: t(
          "1. Open the same starting screen.\n2. Ask: “Create a project.”\n3. Observe without prompting.\n4. Record completion and elapsed time.",
        ),
      },
      {
        title: t("Run"),
        heading: t("Observe what actually happens."),
        body: t(
          "Keep each attempt, including failures. Use the two sample outcomes below to compare a run that meets the criterion with one that does not. Both runs can be completed.",
        ),
        action: t(
          "Add observations or measurements to the run, with a source and observed time. Then mark the run completed.",
        ),
        note: t(
          "Completed describes execution. It does not mean the idea worked. These tiles are an illustrative sample, not a live run.",
        ),
        record: t("Run 01 · same task · same time limit · five fictional participants"),
      },
      {
        title: t("Evidence"),
        heading: t("Keep sources beside the result."),
        body: t(
          "A count is useful when you can inspect what was counted. Keep the observation log, times, and deviations. AI analysis can suggest an explanation, but it is not an independent observation.",
        ),
        action: t(
          "Choose the evidence kind honestly. Link the source. Review any agent proposal before accepting it.",
        ),
        note: t(
          "An accepted agent proposal remains AI analysis. If project context changed, reconcile it before relying on the output.",
        ),
        record: t(
          "Source: fictional observation log / Run 01\nObservation: completion within the declared time limit\nInterpretation: possible friction in the creation form",
        ),
      },
      {
        title: t("Decision"),
        heading: t("Review the claim. Choose the next action."),
        body: t(
          "Compare the evidence with the original criterion. Four of five meets this pilot criterion; two of five does not. A small convenience sample cannot establish broad demand or commercial success.",
        ),
        action: t(
          "Record Supported, Contradicted, or Inconclusive separately from Continue, Revise, or Stop. Include limitations and rationale.",
        ),
        note: t(
          "If the source is missing, the sample is incomplete, or the method changed, an inconclusive result can be the honest answer. Keep the run and plan the next test.",
        ),
        record: t(
          "Conclusion: bounded to this task and sample.\nNext action: repeat with new users, or revise the confusing step.\nLimitations: five participants; no evidence of willingness to pay.",
        ),
      },
    ],
  };
  return (
    <main id="main" className="w-full max-w-360 m-auto p-4 lg:p-6 grid gap-4">
      <div className="flex justify-between gap-4 flex-wrap text-[12px] text-lime">
        <Link href="/wiki">{t("Back to the field manual")}</Link>
        <Link href="/projects">{t("Open your projects")}</Link>
      </div>
      <header className="grid gap-3 border-b border-line py-4">
        <p className="font-mono text-[11px] text-muted">FIELD MANUAL / 01</p>
        <h1 className="text-[32px] leading-[1.2] font-semibold">
          {t("Run a small test. Make a better decision.")}
        </h1>
        <p className="text-muted max-w-175">
          {t(
            "A visual field guide to validating ideas through Nakama. Follow one fictional test from question to evidence and a human decision.",
          )}
        </p>
      </header>
      <LabGuideLoader copy={copy} />
    </main>
  );
}
