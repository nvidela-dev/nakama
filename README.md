# Nakama

A lovely place to turn “what if?” into something with friends.

Nakama will help a small group capture an idea, explore it through approachable questions, try something small, and decide what to do next. Different projects can include different friends. A venture can investigate demand and feasibility; a creative project can exist simply because making it together sounds fun.

**Status: private projects and guided flows are live at [Nakama](https://nakama-brown-eight.vercel.app), using development services.** The Next.js app includes a public harbor, Clerk sign-in integration, private project capture, owner/member access, and recipient-specific invitation links. SQL/access tests pass locally, and the main authenticated browser journey has passed against dedicated Clerk and Neon development resources. Both guided flows now support stage/question navigation, saved answers, explicit progress, revision history, and conflict handling. Comments, export, and AI remain unimplemented. See [development setup and verification](docs/development.md).

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

## First useful outcome

A friend can capture an idea, invite the right people, work through either guided flow, discuss what they learn, and export authorized project context as readable Markdown for use in ChatGPT. Embedded chat and agent execution come later.
