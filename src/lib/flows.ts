import { required } from "./query";
import { businessFlows } from "./business-flows";
import { investigationFlow } from "./investigation-flow";
export type { FlowId, NodeStatus } from "./database.generated";
import type { FlowId } from "./database.generated";
export type FlowNode = {
  id: string;
  label: string;
  question: string;
  example: string;
  kind: "question" | "action" | "outcome";
  after: readonly string[];
  choices?: readonly string[];
};
export type FlowStage = {
  id: string;
  name: string;
  question: string;
  nodes: readonly FlowNode[];
};
export type Flow = {
  id: FlowId;
  version: number;
  name: string;
  description: string;
  stages: readonly FlowStage[];
};
const node = (
  id: string,
  label: string,
  question: string,
  example: string,
  after: string[] = [],
  kind: FlowNode["kind"] = "question",
  choices?: string[],
): FlowNode => ({ id, label, question, example, after, kind, ...(choices ? { choices } : {}) });
export type FlowRegistry = { readonly [Id in FlowId]: Flow & { readonly id: Id } };
export const flows: FlowRegistry = {
  investigation: investigationFlow,
  ...businessFlows,
  venture: {
    id: "venture",
    version: 1,
    name: "Venture",
    description:
      "Explore who it helps, test what matters, and make a first useful version.",
    stages: [
      {
        id: "idea",
        name: "Idea",
        question: "What's your idea?",
        nodes: [
          node(
            "idea-name",
            "Name",
            "What is the project name?",
            "A neighborhood tool library.",
          ),
          node(
            "idea-description",
            "Brief description",
            "What is the idea in a few words?",
            "Help neighbors borrow tools they only need once.",
            ["idea-name"],
          ),
        ],
      },
      {
        id: "exploration",
        name: "Exploration",
        question: "Who is it for, and why does it matter?",
        nodes: [
          node(
            "audience",
            "Audience",
            "Who would this help?",
            "Apartment dwellers who need a drill for one job.",
          ),
          node(
            "problem",
            "Problem",
            "What is hard or frustrating for them?",
            "Buying and storing a tool for a ten-minute job.",
            ["audience"],
          ),
          node(
            "workaround",
            "Current workaround",
            "How do they handle it now?",
            "Borrow from family, buy one, or put off the job.",
            ["problem"],
          ),
          node(
            "solution",
            "Proposed solution",
            "How could your idea help?",
            "Find and borrow a tool from a nearby neighbor.",
            ["workaround"],
          ),
          node(
            "motivation",
            "Motivation",
            "Why do you want to work on this?",
            "Less waste and a reason to know our neighbors.",
          ),
          node(
            "explanation",
            "Explain the idea",
            "How would you explain the idea to a friend?",
            "A simple way to borrow tools nearby, instead of buying them for one job.",
            ["solution", "motivation"],
            "outcome",
          ),
        ],
      },
      {
        id: "validation",
        name: "Validation",
        question: "Is it worth pursuing?",
        nodes: [
          node(
            "alternatives",
            "Demand · alternatives",
            "What alternatives do people already have?",
            "A hardware store rents tools, but it is far away.",
          ),
          node(
            "feedback",
            "Demand · feedback",
            "What did potential users actually say or do?",
            "Three neighbors described their last tool purchase. Two already borrow from friends.",
            ["alternatives"],
          ),
          node(
            "uncertainty",
            "Feasibility · uncertainty",
            "What is the hardest thing we do not know yet?",
            "Would people trust strangers with their tools?",
          ),
          node(
            "cheap-test",
            "Feasibility · cheap test",
            "What small, cheap test could teach us?",
            "Arrange one loan manually and see what feels awkward.",
            ["uncertainty"],
          ),
          node(
            "affordability",
            "Time, money, and help",
            "What can we comfortably afford to put into this?",
            "Two evenings, a small budget, and a friend who can help organize.",
          ),
          node(
            "learnings",
            "What we learned",
            "What did we learn, and what is still uncertain?",
            "The first version was not useful to the people we asked. We still do not know whether another group would want it.",
            ["feedback", "cheap-test", "affordability"],
          ),
          node(
            "venture-direction",
            "Continue, revise, or park",
            "What should we do next, and why?",
            "Revise: focus on one building before a whole neighborhood.",
            ["learnings"],
            "outcome",
            ["Continue", "Revise", "Park"],
          ),
        ],
      },
      {
        id: "planning",
        name: "Planning",
        question: "What's our first useful version?",
        nodes: [
          node(
            "capability",
            "Useful capability",
            "What should someone be able to do?",
            "Request one tool and get a reply.",
          ),
          node(
            "essentials",
            "Essentials vs later",
            "What is essential, and what can wait?",
            "Essential: requests and replies. Later: payments and ratings.",
            ["capability"],
          ),
          node(
            "small-tasks",
            "Small tasks",
            "What small tasks would make that possible?",
            "Write a request form, test a reply, then try it with a neighbor.",
            ["essentials"],
          ),
          node(
            "first-steps",
            "Steps, dependencies, contributors",
            "What comes first, what depends on it, and who wants to help?",
            "Agree on the request details first; Sam wants to help test.",
            ["small-tasks"],
          ),
          node(
            "agreed-version",
            "Agreed version",
            "What first version have we agreed to make?",
            "A form and a manual reply for one building.",
            ["first-steps"],
            "outcome",
          ),
        ],
      },
      {
        id: "building",
        name: "Building",
        question: "How do we make it happen?",
        nodes: [
          node(
            "next-task",
            "Next task",
            "What is the next small thing to do?",
            "Make the request form.",
          ),
          node(
            "working-piece",
            "Working piece",
            "What have we made that we can try?",
            "A form that sends a request.",
            ["next-task"],
            "action",
          ),
          node(
            "blocker",
            "Blocker / help loop",
            "Are we blocked, and what help would move us forward?",
            "We need help choosing how to notify the owner. Return to the next task once we have a way forward.",
            ["working-piece"],
          ),
          node(
            "test-someone",
            "Test with someone",
            "What happened when someone tried it?",
            "They could send a request but did not know when to expect a reply.",
            ["blocker"],
            "action",
          ),
          node(
            "build-learning",
            "Learn",
            "What did that teach us?",
            "Show a clear response expectation.",
            ["test-someone"],
          ),
          node(
            "repeat-share",
            "Repeat or share",
            "Should we repeat the loop or share this version?",
            "Repeat: clarify the reply step before sharing.",
            ["build-learning"],
            "outcome",
            ["Repeat", "Share"],
          ),
          node(
            "improvements",
            "Next improvements",
            "What would we improve after sharing?",
            "Ask neighbors what was confusing, then choose the next task.",
            ["repeat-share"],
          ),
        ],
      },
    ],
  },
  creative: {
    id: "creative",
    version: 1,
    name: "Creative",
    description: "Develop a creative project from concept to production.",
    stages: [
      {
        id: "spark",
        name: "Concept",
        question: "What are we making?",
        nodes: [
          node(
            "spark-name",
            "Name",
            "What is the project name?",
            "A short audio documentary.",
          ),
          node(
            "spark-description",
            "Brief description",
            "What sounds fun to make?",
            "An audio documentary with interviews and original recordings.",
            ["spark-name"],
          ),
          node(
            "spark-captured",
            "Concept recorded",
            "What are you curious to imagine next?",
            "The topic, format, and intended audience.",
            ["spark-description"],
            "outcome",
          ),
        ],
      },
      {
        id: "imagine",
        name: "Imagine",
        question: "What could it look or feel like?",
        nodes: [
          node(
            "inspiration",
            "Inspiration",
            "What inspires us?",
            "Documentary interviews, field recordings, and clear narration.",
          ),
          node(
            "excitement",
            "Individual interests",
            "What does each collaborator want to work on?",
            "Alex will research the topic; Jo will record interviews.",
          ),
          node(
            "possibilities",
            "Possibilities",
            "What could we try?",
            "A narrated report, an interview series, or a recorded discussion.",
          ),
          node(
            "creative-direction",
            "Direction",
            "Which direction do we want to explore first?",
            "A ten-minute interview with a local researcher.",
            ["inspiration", "excitement", "possibilities"],
            "outcome",
          ),
        ],
      },
      {
        id: "experiment",
        name: "Experiment",
        question: "Test a prototype",
        nodes: [
          node(
            "rough-version",
            "Sketch, demo, or rough version",
            "What prototype can we test?",
            "Record a one-minute scene on our phones.",
            [],
            "action",
          ),
          node(
            "what-we-like",
            "What we like",
            "What do we like about it?",
            "The interview provided a clear explanation of the topic.",
            ["rough-version"],
          ),
          node(
            "enjoyment",
            "Was it enjoyable?",
            "Was making it enjoyable for each of us?",
            "Recording was fun; editing felt tiring.",
            ["rough-version"],
          ),
          node(
            "experiment-direction",
            "Keep, try another, or save",
            "What should we do next, and why?",
            "Keep the idea, but try a shorter episode so editing stays fun.",
            ["what-we-like", "enjoyment"],
            "outcome",
            ["Keep direction", "Try another", "Save for later"],
          ),
        ],
      },
      {
        id: "shape",
        name: "Shape",
        question: "What do we want to make together?",
        nodes: [
          node(
            "finished-enough",
            "Finished enough",
            "What would finished enough mean to us?",
            "A five-minute episode we can listen to together.",
          ),
          node(
            "comfortable-budget",
            "Comfortable time and money",
            "What amount of time and money feels comfortable?",
            "Two evenings and no special purchases.",
          ),
          node(
            "contributions",
            "Desired contributions",
            "What does each person want to contribute?",
            "Jo wants to make sounds; Alex wants to write and record.",
          ),
          node(
            "small-version",
            "Small version",
            "What small version fits those wishes?",
            "One scene, two voices, and three sound effects.",
            ["finished-enough", "comfortable-budget", "contributions"],
          ),
          node(
            "creative-steps",
            "First steps",
            "What shall we try first?",
            "Write a rough scene together this weekend.",
            ["small-version"],
            "outcome",
          ),
        ],
      },
      {
        id: "create",
        name: "Create",
        question: "What shall we make next?",
        nodes: [
          node(
            "next-piece",
            "Make the next piece",
            "What piece do we want to make next?",
            "Record the opening narration.",
            [],
            "action",
          ),
          node(
            "show-each-other",
            "Show each other",
            "What did we notice when we shared it with each other?",
            "The pause before the joke made it funnier.",
            ["next-piece"],
            "action",
          ),
          node(
            "keep-change",
            "Keep or change",
            "What should we keep or change?",
            "Keep the voice; shorten the introduction.",
            ["show-each-other"],
          ),
          node(
            "create-loop",
            "Repeat until finished enough",
            "Is it finished enough, or do we want another loop?",
            "Another loop: record the ending, then listen together.",
            ["keep-change"],
            "outcome",
            ["Another loop", "Finished enough"],
          ),
          node(
            "enjoy",
            "Enjoy",
            "How do we want to enjoy what we made?",
            "Have a listening night with snacks.",
            ["create-loop"],
            "action",
          ),
          node(
            "sharing",
            "Keep among friends or share",
            "Would we like to keep it among friends or share it?",
            "Keep it among friends. That is a complete and happy outcome.",
            ["enjoy"],
            "outcome",
            ["Keep among friends", "Share"],
          ),
        ],
      },
    ],
  },
};
export function findNode(flow: Flow, nodeId: string) {
  for (const stage of flow.stages) {
    const node = stage.nodes.find((n) => n.id === nodeId);
    if (node) return { stage, node };
  }
  return undefined;
}
export function descendants(stage: FlowStage, nodeId: string) {
  const found = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of stage.nodes)
      if (
        !found.has(node.id) &&
        node.after.some((id) => id === nodeId || found.has(id))
      ) {
        found.add(node.id);
        changed = true;
      }
  }
  return found;
}

export function isFlowId(value: string): value is FlowId {
  return Object.hasOwn(flows, value);
}

// The first two question nodes capture project metadata for every supported flow.
export function captureNodes(flow: Flow) {
  const stage=required(flow.stages[0],"Flow has no capture stage.");
  return {stage,name:required(stage.nodes[0],"Flow has no name question."),description:required(stage.nodes[1],"Flow has no description question.")};
}
