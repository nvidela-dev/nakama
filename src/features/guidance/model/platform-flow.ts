import type { Flow } from "@/features/guidance/model/flows";

export const platformFlow: Flow & { readonly id: "platform" } = {
  id: "platform",
  version: 1,
  name: "Platform",
  description:
    "Build infrastructure, automation, cloud services, and internal tooling to increase production.",
  stages: [
    {
      id: "system",
      name: "System",
      question: "What system layer, bottleneck, or production capacity are we building?",
      nodes: [
        {
          id: "platform-name",
          label: "Name",
          question: "What is this platform service or tooling project called?",
          example: "Hermes dispatch queue and local worker runner.",
          after: [],
          kind: "question",
        },
        {
          id: "platform-description",
          label: "Brief description",
          question: "What does this platform capability or infrastructure do in a few words?",
          example: "Run background tasks reliably with automatic retries and dead-letter handling.",
          after: ["platform-name"],
          kind: "question",
        },
        {
          id: "platform-target",
          label: "Target environment",
          question: "Where will this software, infra, or automation run?",
          example: "Cloud worker containers, local developer daemon, and CI runner.",
          after: ["platform-description"],
          kind: "question",
          choices: [
            "Cloud infrastructure",
            "Nakama internal flow",
            "Hermes service",
            "Local developer tooling",
            "Hybrid",
          ],
        },
        {
          id: "platform-bottleneck",
          label: "Production bottleneck",
          question:
            "What manual chore, latency, failure mode, or capacity limit does this eliminate?",
          example: "Manual task restarts and unobserved background worker crashes.",
          after: ["platform-target"],
          kind: "question",
        },
        {
          id: "platform-objective",
          label: "Production goal",
          question: "What measurable operational improvement confirms this succeeded?",
          example: "Zero lost background jobs and automated task recovery within five seconds.",
          after: ["platform-bottleneck"],
          kind: "question",
        },
      ],
    },
    {
      id: "blueprint",
      name: "Blueprint",
      question: "How is the infrastructure, service, or automation designed?",
      nodes: [
        {
          id: "platform-architecture",
          label: "System architecture",
          question: "What are the core components, data paths, and runtime boundaries?",
          example: "Producer API, transactional job queue table, worker pool, and telemetry sink.",
          after: [],
          kind: "question",
        },
        {
          id: "platform-interfaces",
          label: "Interface contracts",
          question: "What APIs, CLI commands, events, or configuration schemas does this expose?",
          example: "JSON job payload schema, worker execute hook, and status health endpoint.",
          after: ["platform-architecture"],
          kind: "question",
        },
        {
          id: "platform-dependencies",
          label: "Dependencies and services",
          question: "What databases, cloud services, libraries, or external daemons are required?",
          example: "PostgreSQL for job queue, Docker for runner sandbox, and systemd for daemon.",
          after: ["platform-architecture"],
          kind: "question",
        },
        {
          id: "platform-security",
          label: "Security and isolation",
          question: "How are credentials, secrets, permissions, and network boundaries protected?",
          example:
            "Vault environment injection, non-root runner user, and strict subnet isolation.",
          after: ["platform-dependencies"],
          kind: "question",
        },
      ],
    },
    {
      id: "prototype",
      name: "Prototype",
      question: "How do we build and prove the mechanism before live integration?",
      nodes: [
        {
          id: "platform-core-spike",
          label: "Core mechanism",
          question:
            "What is the minimal proof-of-concept that demonstrates the essential mechanism works?",
          example: "A minimal script dequeuing simulated tasks and handling process exits cleanly.",
          after: [],
          kind: "question",
        },
        {
          id: "platform-sandbox",
          label: "Sandbox verification",
          question: "How was the prototype tested in an isolated or local sandbox?",
          example:
            "Simulated fifty concurrent worker crashes and verified queue state consistency.",
          after: ["platform-core-spike"],
          kind: "question",
        },
        {
          id: "platform-failure-modes",
          label: "Failure handling",
          question:
            "What happens during network partitions, crashes, timeouts, or unexpected inputs?",
          example:
            "Jobs lock with a lease timeout; stalled workers lose lock and job is re-queued.",
          after: ["platform-sandbox"],
          kind: "question",
        },
        {
          id: "platform-prototype-verdict",
          label: "Prototype findings",
          question: "What did the prototype prove, and what design revisions are necessary?",
          example:
            "Lock-in leasing works reliably; increase lease timeout from two to five seconds.",
          after: ["platform-failure-modes"],
          kind: "question",
        },
      ],
    },
    {
      id: "integration",
      name: "Integration",
      question: "How does this platform software or infrastructure connect to production systems?",
      nodes: [
        {
          id: "platform-pipeline",
          label: "Deployment pipeline",
          question:
            "How is this software or infrastructure built, packaged, and automated into production?",
          example:
            "GitHub Actions workflow running typecheck and tests before building container image.",
          after: [],
          kind: "question",
        },
        {
          id: "platform-telemetry",
          label: "Telemetry and health",
          question: "What logs, metrics, alerts, or structured traces indicate health and latency?",
          example:
            "Prometheus queue depth counter, job processing duration histogram, and error rate alert.",
          after: ["platform-pipeline"],
          kind: "question",
        },
        {
          id: "platform-migration",
          label: "Cutover and compatibility",
          question: "How will existing systems transition without downtime or data loss?",
          example: "Dual-write queue during cutover, draining old worker queue before shut down.",
          after: ["platform-telemetry"],
          kind: "question",
        },
        {
          id: "platform-rollback",
          label: "Rollback strategy",
          question: "How can the deployment be reverted if production behavior degrades?",
          example:
            "Toggle feature flag back to legacy synchronous runner; schema is backward compatible.",
          after: ["platform-migration"],
          kind: "question",
        },
      ],
    },
    {
      id: "production",
      name: "Production",
      question:
        "What software artifact, infrastructure output, or runbook is delivered to production?",
      nodes: [
        {
          id: "platform-artifact",
          label: "Production deliverable",
          question: "What production artifact or infrastructure output was delivered?",
          example: "Deployed background worker daemon, migration script, and IaC cloud template.",
          after: [],
          kind: "question",
          choices: [
            "Software package / binary",
            "Cloud infrastructure / IaC",
            "Automated pipeline / workflow",
            "Internal tooling / CLI",
            "Operational runbook",
          ],
        },
        {
          id: "platform-operational-check",
          label: "Operational verification",
          question: "How was production health verified under real workload?",
          example:
            "Observed ten thousand production jobs over forty-eight hours with zero unprocessed tasks.",
          after: ["platform-artifact"],
          kind: "question",
        },
        {
          id: "platform-runbook",
          label: "Maintenance and runbook",
          question:
            "What documentation or runbook guides ongoing maintenance, alerts, and troubleshooting?",
          example:
            "Runbook covers stalled queue recovery, log diagnosis commands, and scaling triggers.",
          after: ["platform-operational-check"],
          kind: "question",
        },
        {
          id: "platform-next-capacity",
          label: "Next production steps",
          question: "What follow-up automations or capacity increases should this unlock next?",
          example:
            "Autoscaling worker pool based on queue backlog and adding distributed job priority.",
          after: ["platform-runbook"],
          kind: "question",
        },
      ],
    },
  ],
};
