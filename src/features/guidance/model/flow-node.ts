import type { FlowNode } from "./flows";
export const node = (
  id: string,
  label: string,
  question: string,
  example: string,
  after: string[] = [],
  kind: FlowNode["kind"] = "question",
  choices?: string[],
): FlowNode => ({ id, label, question, example, after, kind, ...(choices ? { choices } : {}) });
