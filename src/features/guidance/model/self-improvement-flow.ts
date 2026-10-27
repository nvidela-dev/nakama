import type { Flow } from "./flows";

export const selfImprovementFlow: Flow & { readonly id: "self-improvement" } = {
  id: "self-improvement",
  version: 1,
  name: "Self-improvement",
  description:
    "Understand a behavior pattern, try a small change, and learn from your observations.",
  stages: [
    {
      id: "pattern",
      name: "Pattern",
      question: "Which behavior do you want to change, and why?",
      nodes: [
        {
          id: "self-name",
          label: "Name",
          question: "What would you call this personal improvement project?",
          example: "Start focused work with less friction.",
          after: [],
          kind: "question",
        },
        {
          id: "self-description",
          label: "Brief description",
          question: "What pattern do you want to work on, in your own words?",
          example: "I check messages before starting the task I chose.",
          after: ["self-name"],
          kind: "question",
        },
        {
          id: "self-reason",
          label: "Personal reason",
          question: "What would changing this pattern make possible for you?",
          example: "Protect the first part of my morning for work that matters to me.",
          after: ["self-description"],
          kind: "question",
        },
        {
          id: "self-scope",
          label: "One specific behavior",
          question: "Which observable behavior is in scope, and what will you leave out?",
          example: "Starting my first work task on weekdays; not changing every phone habit.",
          after: ["self-reason"],
          kind: "question",
        },
      ],
    },
    {
      id: "observe",
      name: "Observe",
      question: "When does the pattern happen, and what keeps it going?",
      nodes: [
        {
          id: "self-triggers",
          label: "Triggers and context",
          question: "What tends to happen just before the behavior?",
          example: "I sit at my desk with notifications on and no clear first step.",
          after: [],
          kind: "question",
        },
        {
          id: "self-payoff",
          label: "Immediate payoff",
          question: "What does the behavior give you or help you avoid in the moment?",
          example: "Messages give me a quick sense of progress when the task feels vague.",
          after: ["self-triggers"],
          kind: "question",
        },
        {
          id: "self-baseline",
          label: "Starting observations",
          question: "What have you actually observed, over which opportunities or days?",
          example:
            "On three of four observed mornings I opened messages first; one morning was not recorded.",
          after: ["self-payoff"],
          kind: "question",
        },
      ],
    },
    {
      id: "plan-change",
      name: "Plan a change",
      question: "What small alternative will you try, and how will you judge it?",
      nodes: [
        {
          id: "self-alternative",
          label: "Small alternative",
          question: "What is the smallest action you could take instead at the same cue?",
          example: "Open the task note and work on its first step for five minutes.",
          after: [],
          kind: "question",
        },
        {
          id: "self-environment",
          label: "Environment and support",
          question: "What reminder, preparation or support would make that action easier?",
          example:
            "Write the first step the night before and silence notifications during the trial.",
          after: ["self-alternative"],
          kind: "question",
        },
        {
          id: "self-trial",
          label: "Bounded trial",
          question: "When and for how long will you try the change, and what will you record?",
          example:
            "Try it on the next five work mornings; note the first action and how difficult it felt.",
          after: ["self-environment"],
          kind: "question",
        },
        {
          id: "self-criterion",
          label: "Your success criterion",
          question:
            "What observation would make the change useful to you, and when would you adjust or stop?",
          example:
            "Starting with the chosen task on four mornings would be useful; adjust if the setup adds too much friction.",
          after: ["self-trial"],
          kind: "question",
        },
      ],
    },
    {
      id: "practice",
      name: "Practice",
      question: "What happened when you tried the change in everyday life?",
      nodes: [
        {
          id: "self-observations",
          label: "What happened",
          question: "What did you do on each observed opportunity, including exceptions?",
          example:
            "I started the task on three mornings, checked messages on one, and missed one record.",
          after: [],
          kind: "question",
        },
        {
          id: "self-friction",
          label: "Friction and surprises",
          question: "What helped, what got in the way, and what differed from the plan?",
          example: "A written first step helped; an urgent message changed one morning.",
          after: ["self-observations"],
          kind: "question",
        },
        {
          id: "self-restart",
          label: "Restart after a miss",
          question: "What small next action lets you resume without discarding what you learned?",
          example:
            "Prepare the next morning’s note and record the next opportunity without resetting earlier observations.",
          after: ["self-friction"],
          kind: "question",
        },
      ],
    },
    {
      id: "reflect",
      name: "Reflect and adapt",
      question: "What did you learn, and what will you keep, change or stop?",
      nodes: [
        {
          id: "self-comparison",
          label: "Compare with the start",
          question:
            "What changed relative to your starting observations, and what remains uncertain?",
          example:
            "More mornings began with the task, but the sample is small and one record is missing.",
          after: [],
          kind: "question",
        },
        {
          id: "self-decision",
          label: "Next personal decision",
          question: "Will you keep, adjust, repeat or stop this change, and why?",
          example:
            "Repeat with a clearer first step; the result is promising but not yet consistent.",
          after: ["self-comparison"],
          kind: "question",
        },
        {
          id: "self-maintenance",
          label: "Make it sustainable",
          question: "What light routine and review date would help you keep learning?",
          example:
            "Keep a short weekly note and review after two weeks, without requiring a perfect streak.",
          after: ["self-decision"],
          kind: "question",
        },
      ],
    },
  ],
};
