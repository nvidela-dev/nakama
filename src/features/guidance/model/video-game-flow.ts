import type { Flow } from "./flows";
export const videoGameFlow = {
  id: "video-game",
  name: "Video game",
  version: 1,
  description: "Build a playable loop, watch players try it, and decide what to ship.",
  stages: [
    {
      id: "concept",
      name: "Game concept",
      question: "Who is playing, and what will they do?",
      nodes: [
        {
          id: "game-name",
          label: "Name",
          question: "What is the working title?",
          example: "Lantern Courier.",
          kind: "question",
          after: [],
        },
        {
          id: "game-description",
          label: "Brief description",
          question: "Describe the player, their goal and the challenge.",
          example: "Guide a courier through a dark city before the lantern runs out.",
          kind: "question",
          after: ["game-name"],
        },
      ],
    },
    {
      id: "core-loop",
      name: "Core loop",
      question: "What decision will the player make again and again?",
      nodes: [
        {
          id: "game-choice",
          label: "Player choice",
          question: "What tradeoff makes the next move interesting?",
          example: "Take a short dark alley or a longer illuminated street.",
          kind: "question",
          after: [],
        },
        {
          id: "game-feedback",
          label: "Player feedback",
          question: "How will the player recognize the consequence of a choice?",
          example: "The lantern dims and the delivery clock advances after each move.",
          kind: "question",
          after: ["game-choice"],
        },
      ],
    },
    {
      id: "prototype",
      name: "Playable prototype",
      question: "What is the smallest build someone can play?",
      nodes: [
        {
          id: "game-slice",
          label: "Playable slice",
          question: "Which controls, rules and ending must work for one session?",
          example: "One map, two routes, a timer and a delivery point.",
          kind: "question",
          after: [],
        },
        {
          id: "game-cut",
          label: "Out of scope",
          question: "What can you cut until the loop has been tested?",
          example: "Use placeholder art and leave out upgrades.",
          kind: "question",
          after: ["game-slice"],
        },
      ],
    },
    {
      id: "playtest",
      name: "Playtest",
      question: "What do players actually do when you hand them the build?",
      nodes: [
        {
          id: "game-session",
          label: "Playtest method",
          question: "Who will try the build and what will you observe without coaching?",
          example: "Watch three new players choose a route and finish one delivery.",
          kind: "question",
          after: [],
        },
        {
          id: "game-finding",
          label: "Player observations",
          question: "Where did players hesitate, retry or stop? Which change will you test next?",
          example: "Two players missed the lantern warning. Try an earlier visual cue.",
          kind: "question",
          after: ["game-session"],
        },
      ],
    },
    {
      id: "release",
      name: "Release and iterate",
      question: "Which build is ready to share and what will you watch afterward?",
      nodes: [
        {
          id: "game-build",
          label: "Release candidate",
          question: "Which version, platform and known issues will you publish?",
          example: "Publish the browser build with keyboard controls and a short changelog.",
          kind: "question",
          after: [],
        },
        {
          id: "game-next",
          label: "Next iteration",
          question: "What player signal will guide your next update?",
          example: "Compare first-delivery completion after the warning changes.",
          kind: "question",
          after: ["game-build"],
        },
      ],
    },
  ],
} as const satisfies Flow;
