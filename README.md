# Nakama

A workspace for defining, developing, and managing projects with collaborators.

Nakama will help a small group capture an idea, explore it through approachable questions, try something small, and decide what to do next. Different projects can include different friends. A venture can investigate demand and feasibility; a creative project can exist simply because making it together sounds fun. An investigation explores evidence to reach a conclusion, actionables, or an artifact.

**Status: private projects and guided flows are live at [Nakama](https://nakama-brown-eight.vercel.app), using development services.** The Next.js app includes a public harbor, Clerk sign-in integration, private project capture, owner/member access, and recipient-specific invitation links. SQL/access tests pass locally, and the main authenticated browser journey has passed against dedicated Clerk and Neon development resources. The guided flows support stage/question navigation, saved answers, explicit progress, revision history, and conflict handling. Contextual comments and a project activity feed are implemented, with author attribution, conflict checks, and project-scoped access. The deployed artifact library supports private image/Markdown uploads, software links, viewers, and independent to-dos; its authenticated browser journey has passed live. Guided-context export and AI remain unimplemented. Project To-do lists and Lock-In task-file import/export are deployed and verified through the live browser journey. See [development setup and verification](docs/development.md).

Project types include Venture, Creative/fun, Investigation, E-shop (generic or Shirt E-shop), SaaS, Importation, and Consultancy. The newest business flows are implemented locally; live deployment verification remains pending. Project relationships and spawning linked follow-ups are deployed and verified, with multiple source and resulting projects and independent access boundaries.

## The experience

Capture a name and a brief description. See a downward path of named stages. Expand a stage into its question tree, open a node, and answer with plain-language examples. Discuss the project, a stage, or an answer with invited friends. Return to earlier questions as you learn.

Progress should feel satisfying without pretending uncertainty has disappeared. “We tried it and it did not work” is progress. So is choosing to save an idea for later.

The visual ambition is spatial, 3D, chill, piratey/hackery, and warm. Readable forms, mobile use, keyboard access, reduced motion, and a lightweight alternative remain essential. Specific scenery and visual metaphors are proposals.

## Read the foundation

| Document | Owns |
| --- | --- |
| [Requirements](docs/requirements.md) | Scope and observable acceptance criteria |
| [Flows](docs/flows.md) | Accepted stage sequences and expanded diagrams |
| [Domain](docs/domain.md) | Vocabulary, relationships, and progress semantics |
| [Collaboration](docs/collaboration.md) | Membership, invitations, access, and comments |
| [Architecture](docs/architecture.md) | Platform responsibilities and tradeoffs |
| [Interaction](docs/interaction.md) | Stage/tree/form navigation and visual direction |
| [Context and future AI](docs/context-and-ai.md) | Markdown export and later assistant/agent boundaries |
| [Roadmap and decisions](docs/roadmap.md) | Delivery order, decisions, proposals, and questions |
| [Contributing](CONTRIBUTING.md) | How to change and validate this foundation |

Start with requirements and flows. Read the domain and collaboration rules before implementing persistence or access. Use the [development guide](docs/development.md) to run the public shell, connect isolated services, and verify private workflows.

The in-app wiki (`/wiki`) teaches the system through a visual project walkthrough, workspace map, practical scenarios, collaboration guidance, and later reference sections. Its dense bilingual glossary lives at `/wiki/glossary` (also available at `/glossary`) for system terms, state contracts, and code vocabulary; [Domain](docs/domain.md#product-glossary-and-naming-contract--2026-10-24) owns its semantics. This addition is local until released.

## Schema and type maintenance

SQL migrations generate the storage types and domain vocabularies. Run `npm run db:types` after changing the schema; `npm run typecheck` verifies the generated contract before compiling. All consumed database results pass through query decoders; the raw database interface returns unknown rows and cannot accept a caller-declared result type. The [development guide](docs/development.md#database-normalization-and-strict-typescript--2026-10-23) documents isolated database testing and the verified release of migrations 010–012.

## First useful outcome

A friend can capture an idea, invite the right people, work through a selected guided flow, discuss what they learn, and export authorized project context as readable Markdown for use in ChatGPT. Embedded chat and agent execution come later.

## Backend diagnostics

Structured backend logs link operations, query timings, rollbacks, and safe errors without recording private project content. Local files rotate under the ignored `.nakama/logs/` directory. Type/build, contract, backend/database, service and compute diagnostics share a typed catalog and troubleshooting guidance. Start with `npm run logs -- doctor` or `npm run logs -- summary`; use `npm run logs:pull` to import validated production events through your existing Vercel CLI access. See the [logging workflow](docs/development.md#backend-logging--2026-10-23) and [typed diagnostic catalog](docs/development.md#typed-diagnostic-catalog--2026-10-23).

## Frontend engineering

Product code follows [feature ownership and composition](docs/architecture.md#feature-ownership-and-frontend-composition--2026-10-23). The internal [component library and Storybook](docs/component-library.md) share source and styles with the application. Read [engineering preferences](docs/engineering-preferences.md), [contribution patterns](CONTRIBUTING.md), [frontend measurements](docs/frontend-performance.md), and [the agent harness](docs/agent-harness.md) before extending it.

```sh
make check
make verify
npm run storybook
npm run test:components
# After a production build:
npm run frontend:report
npm run frontend:measure
npm run test:frontend
```

Storybook and the refactor are local development work until explicitly released. No component hosting service or additional database has been provisioned.
