/** Public teaching examples only; no private project data. */
export const wikiChapters = [
  {
    id: "start",
    title: "Start with one small project",
    intro:
      "Nakama keeps the idea, the conversation, the work, and the result together. You do not need to fill everything in before you begin.",
    kind: "sequence",
    cards: [
      {
        title: "1. Describe the idea",
        body: "Create a project with a name and a short purpose. Example: “Record a three-song demo with friends.”",
      },
      {
        title: "2. Choose a flow",
        body: "Choose guidance that fits the project. A flow divides the thinking into stages and questions.",
      },
      {
        title: "3. Take one step together",
        body: "Open a stage, answer a question, and save. Add a task for something you need to do and discuss it with the project’s members.",
      },
      {
        title: "4. Keep the result",
        body: "Create an artifact for the demo, notes, or software. Review what you learned and choose what to do next.",
      },
    ],
  },
  {
    id: "map",
    title: "Find your way around",
    intro:
      "Inside a project, each area has a different job. This diagram describes the desktop workspace; on a phone, the same areas stack or appear through tabs.",
    kind: "workspace",
    cards: [
      {
        title: "Discussion",
        body: "Talk with the team. Select the stage, question, To-do, or Artifacts context before posting so the conversation stays attached to the right work.",
      },
      {
        title: "Project flow · To-do · Artifacts",
        body: "Use the center tabs to switch between answering questions, organizing actions, and keeping outputs. Returning to earlier questions is normal.",
      },
      {
        title: "Progress · Linked projects · Members",
        body: "Check progress, follow related projects, and see who belongs here. Sidebar panels can be collapsed when you need more space.",
      },
    ],
  },
  {
    id: "guidance",
    title: "Follow the questions",
    intro:
      "A flow is a guide for thinking, not a form you must finish in one sitting. Open a stage to see its questions, then open a question to write and save an answer.",
    kind: "hierarchy",
    cards: [
      {
        title: "Project → Flow",
        body: "Our demo project uses a Creative/fun flow. Business ideas can use Venture or a more specific business flow; Investigation explores a question; Platform guides internal systems and automation.",
      },
      {
        title: "Flow → Stage",
        body: "A stage groups related thinking. Stage names and questions depend on the selected flow. Choose carefully: changing an existing project’s flow is not currently supported.",
      },
      {
        title: "Stage → Node → Answer",
        body: "A node can be a question, activity, or outcome. For example: “What can we make first?” → “A rough recording of one song.” Save the answer explicitly.",
      },
      {
        title: "Answer → Review → Revisit",
        body: "You can record uncertainty, skip with a reason, or mark a blocker. Reviewing a stage is a separate human choice. Earlier work remains available to revisit.",
      },
    ],
  },
  {
    id: "placing-work",
    title: "Put each thing in the right place",
    intro: "Use the same example to tell the difference. Open a situation to see where it belongs.",
    kind: "situations",
    cards: [
      {
        title: "“Who is this demo for?”",
        body: "Answer: “Friends who want to hear our songs.” Put this in the relevant flow question. An answer records what you think or learned.",
      },
      {
        title: "“Book the rehearsal room.”",
        body: "Task: add it to the project To-do list. Tasks are actions, with Ready, In progress, or Done status. Subtasks let you break work into smaller actions.",
      },
      {
        title: "“Here are the cover images.”",
        body: "Artifact: create an image artifact and upload the images. Markdown artifacts hold a document; software artifacts hold a GitHub link. Audio files are not currently a supported artifact upload.",
      },
      {
        title: "“Can we rehearse on Thursday?”",
        body: "Discussion: post a comment in the relevant project context. Talking about an action does not create a task or save an answer automatically.",
      },
    ],
  },
  {
    id: "people",
    title: "Work with your people",
    intro:
      "Each project has its own members. Being able to sign in does not mean someone can see every project.",
    kind: "sequence",
    cards: [
      {
        title: "Owner creates an invitation",
        body: "The owner selects an eligible person and creates a recipient-specific invitation link. Share the link yourself; creating it does not send an email.",
      },
      {
        title: "Recipient accepts",
        body: "The intended person signs in with the matching verified identity and accepts. App admission and project membership are separate requirements.",
      },
      {
        title: "Members collaborate",
        body: "Members can work on answers, comments, tasks, and artifacts. Owners manage membership and project deletion. An artifact link never grants access by itself.",
      },
    ],
  },
  {
    id: "daily",
    title: "A useful rhythm for working",
    intro:
      "Come back to the same project as you learn. You can make progress without knowing every answer.",
    kind: "sequence",
    cards: [
      {
        title: "Look",
        body: "Read the relevant discussion and open the stage or task you are working on. The bell collects unread comments from your projects; opening the bell alone does not mark them read.",
      },
      {
        title: "Do",
        body: "Answer one question or move a task forward. Save explicitly. If a save reports a conflict, compare the latest version with your draft before retrying.",
      },
      {
        title: "Leave a trail",
        body: "Record what happened, update the task, and keep the output in an artifact when supported. A failed experiment is useful information, not lost progress.",
      },
      {
        title: "Choose what follows",
        body: "Review the stage when appropriate. Keep working in this project, or spawn a follow-up for a distinct purpose. A spawned project starts with its creator, not the source project’s entire team or content.",
      },
    ],
  },
  {
    id: "rules",
    title: "Understand the rules behind the screen",
    intro: "These distinctions matter when progress or permissions look surprising.",
    kind: "cards",
    cards: [
      {
        title: "Progress is coverage",
        body: "Answer progress counts answered question nodes. Skipped and blocked counts stay separate. A full ring does not prove an idea is viable or mean a stage was reviewed.",
      },
      {
        title: "Work and output have separate states",
        body: "Completing a task does not answer a question or mark an artifact ready. A ready artifact needs a valid output. Artifact tasks are flat and separate from the project’s nested task tree.",
      },
      {
        title: "Links record origin, not access",
        body: "Related projects keep separate membership. Linking existing projects requires membership in both. Creating a follow-up does not copy answers, files, artifacts, or tasks.",
      },
      {
        title: "Deletion and import deserve a check",
        body: "Deleting a task removes its children. Completing only its parent leaves children unchanged. Lock-In imports append a selected task tree; exports contain tasks, not the full project context.",
      },
    ],
  },
  {
    id: "questions",
    title: "When something is unclear",
    intro: "Check the relevant rule before repeating an action.",
    kind: "situations",
    cards: [
      {
        title: "Why can’t my friend open this link?",
        body: "Check app admission, the invitation’s intended recipient, and membership in that exact project. A link, another project’s membership, or an administrator role does not replace membership.",
      },
      {
        title: "Why is the artifact still In progress?",
        body: "Readiness is set explicitly and requires an image, Markdown file, or GitHub link matching its type. Finishing the artifact’s tasks alone does not change readiness.",
      },
      {
        title: "What should I do after a save conflict?",
        body: "Keep your draft, read the latest saved content, and reconcile the differences before saving again. A revision check prevents silently overwriting someone else’s changes.",
      },
      {
        title: "Can I ask AI to work on the project or export all its context?",
        body: "Embedded AI and guided-context export are not implemented. The existing Lock-In export is only for project tasks. Do not treat it as a complete project backup.",
      },
    ],
  },
] as const;
