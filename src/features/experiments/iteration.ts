export const reflectionPrompts = {
  aim: "What are you trying to find out?",
  observed: "What happened?",
  learned: "What did you learn?",
  next: "What will you do next?",
} as const;
export const iterationStages = {
  plan: "Planning",
  run: "Trying it",
  review: "Reviewing evidence",
  follow_up: "Next decision",
} as const;
