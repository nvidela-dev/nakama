export type WikiTreeNode = { label: string; note?: string; children?: readonly WikiTreeNode[] };

/** Illustrative public examples, never instantiated project data. */
export const wikiTrees = [
  {
    id: "structure",
    chapter: "map",
    title: "One project, several kinds of work",
    caption:
      "Each branch belongs to this project. The branches help with different jobs; they do not complete one another.",
    root: {
      label: "Our demo project",
      children: [
        {
          label: "Members",
          children: [
            {
              label: "Owner + invited members",
            },
          ],
        },
        {
          label: "Project flow",
          children: [
            {
              label: "Stages → nodes → answers",
            },
          ],
        },
        {
          label: "Project tasks",
          children: [
            {
              label: "Book room → confirm time",
            },
          ],
        },
        {
          label: "Artifacts",
          children: [
            {
              label: "Cover images + session notes",
            },
          ],
        },
        {
          label: "Discussion",
          children: [
            {
              label: "Messages attached to the right context",
            },
          ],
        },
      ],
    },
  },
  {
    id: "questions-tree",
    chapter: "guidance",
    title: "A question can lead to several branches",
    caption:
      "Illustrative question tree, not the exact stages of a template. Different branches can be answered, unknown, or blocked at the same time.",
    root: {
      label: "Stage: plan a first recording",
      children: [
        {
          label: "What can we make first?",
          children: [
            {
              label: "Answer: one rough song",
            },
          ],
        },
        {
          label: "What do we need?",
          children: [
            {
              label: "A room",
              children: [
                {
                  label: "Blocked: waiting for availability",
                },
              ],
            },
            {
              label: "A recorder",
              children: [
                {
                  label: "Answer: borrow one from a friend",
                },
              ],
            },
          ],
        },
        {
          label: "How will we judge the result?",
          children: [
            {
              label: "Unknown: agree on what to listen for",
            },
          ],
        },
      ],
    },
  },
  {
    id: "access-tree",
    chapter: "people",
    title: "Access has two separate gates",
    caption:
      "An invitation must be accepted by its intended recipient. Signing in or holding an app administrator role does not replace project membership.",
    root: {
      label: "Person signs in",
      children: [
        {
          label: "App admission",
          children: [
            {
              label: "Not admitted → request access",
            },
            {
              label: "Admitted → check this project’s membership",
              children: [
                {
                  label: "No membership → no project access",
                },
                {
                  label: "Active member → shared project work",
                },
                {
                  label: "Owner → shared work + membership management",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "tasks-tree",
    chapter: "rules",
    title: "A task tree keeps each status explicit",
    caption:
      "Completing only the parent leaves its children unchanged. Completing the entire subtree is a separate explicit choice; deleting the parent removes its subtree.",
    root: {
      label: "Prepare the session · Done",
      children: [
        {
          label: "Book the room · Done",
        },
        {
          label: "Prepare equipment · In progress",
          children: [
            {
              label: "Borrow recorder · Done",
            },
            {
              label: "Test microphones · Ready",
            },
          ],
        },
        {
          label: "Print the song notes · Ready",
        },
      ],
    },
  },
  {
    id: "lineage-tree",
    chapter: "daily",
    title: "One project can open several paths",
    caption:
      "Links record origin. Every project has its own members and content; none of those are copied automatically. A follow-up can also have several source projects.",
    root: {
      label: "Source: record a demo",
      children: [
        {
          label: "Follow-up: release the songs",
          children: [
            {
              label: "Its own members, flow, tasks, and artifacts",
            },
          ],
        },
        {
          label: "Follow-up: plan a live show",
          children: [
            {
              label: "Its own members, flow, tasks, and artifacts",
            },
          ],
        },
      ],
    },
  },
] as const satisfies readonly {
  id: string;
  chapter: string;
  title: string;
  caption: string;
  root: WikiTreeNode;
}[];
