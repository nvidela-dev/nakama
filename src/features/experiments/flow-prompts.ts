import type { FlowId } from "@/shared/contracts/database.generated";

export type ExperimentPrompts = {
  claim: string;
  method: string;
  criteria: string;
  evidence: string;
};
/** Every project flow must define how to test its ideas; these are prompts, never saved results. */
export const experimentPrompts = {
  "self-improvement": {
    claim: "Which small behavior change do you want to test in your own context?",
    method:
      "Try one alternative at a specific cue over a bounded set of opportunities; record observations and exceptions.",
    criteria:
      "Choose a personally useful signal, a review date and reasons to adjust or stop. Missing observations stay unknown.",
    evidence:
      "Keep dated observations, context and effort separate from interpretation. A completed task or a streak does not establish lasting change.",
  },
  venture: {
    claim: "Which need or offer are we testing?",
    method: "Observe a bounded customer behavior, such as requesting a demo or trying the offer.",
    criteria:
      "Declare the qualified behavior, sample, time window and maximum cost before starting.",
    evidence:
      "Keep source observations and actual costs. Interest is not payment or repeat demand.",
  },
  creative: {
    claim: "Which creative choice or experience do we want to explore?",
    method: "Make a small prototype and try it with the intended audience or collaborators.",
    criteria:
      "Choose your own observable signal: clarity, enjoyment, expression, or completion. Profit is not required.",
    evidence:
      "Retain the prototype version, attributed reactions and your interpretation separately.",
  },
  investigation: {
    claim: "Which explanation or research claim are we testing?",
    method: "Compare independent sources or observations and actively look for counterevidence.",
    criteria:
      "Declare the evidence needed, exclusion rules and what would leave the claim unresolved.",
    evidence:
      "Keep source links, provenance, contradictions and limitations. Repeated summaries are not independent sources.",
  },
  platform: {
    claim: "Which capability or operational improvement should this system deliver?",
    method:
      "Compare a baseline and candidate on the same fixed workload in an isolated environment.",
    criteria:
      "Declare performance, reliability or effort thresholds, plus cost and rollback limits.",
    evidence:
      "Keep versioned configurations, measured results and failures. A successful build is not operational proof.",
  },
  eshop: {
    claim: "Which product, offer or fulfillment assumption needs evidence?",
    method:
      "Run a bounded offer or fulfillment trial with a consistent audience and qualification rule.",
    criteria:
      "Declare the conversion or delivery target, observation window, returns and spending limits.",
    evidence:
      "Track actual orders, delivery, returns and costs. Visits and enquiries are not profitable sales.",
  },
  "shirt-eshop": {
    claim: "Which design, fit, quality or demand assumption are we testing?",
    method:
      "Test a sample garment or bounded offer and record the version, sizes and production conditions.",
    criteria:
      "Declare fit, durability, purchase or margin criteria and a sample-production budget.",
    evidence:
      "Keep sample checks and purchase behavior distinct. Liking a design is not willingness to pay.",
  },
  saas: {
    claim: "Which user outcome or recurring-value assumption needs a test?",
    method:
      "Observe a fixed user task or bounded pilot using the same product version and recruitment rule.",
    criteria:
      "Declare task completion, activation or repeat-use criteria, a time window and acceptable cost.",
    evidence:
      "Retain task-level outcomes, failures and observed usage. A signup is not retained value.",
  },
  importation: {
    claim: "Which sourcing, landed-cost or delivery assumption must be checked?",
    method: "Verify current source documents and run a bounded sample or quotation comparison.",
    criteria:
      "Declare acceptable quality, landed cost and lead time; record currency, date and spending limits.",
    evidence:
      "Retain dated supplier evidence, verified requirements and actual charges. A quote is not a completed shipment.",
  },
  consultancy: {
    claim: "Which client problem or proposed intervention are we testing?",
    method:
      "Agree a small pilot with the client and compare the same observable process before and after.",
    criteria: "Declare the client outcome, measurement method, review date and scope boundaries.",
    evidence:
      "Retain client-authorized observations, baseline and delivery evidence. Agreement alone is not measured improvement.",
  },
} as const satisfies Record<FlowId, ExperimentPrompts>;
