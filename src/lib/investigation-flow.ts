import type { Flow } from "./flows";

export const investigationFlow: Flow = {
  "id": "investigation",
  "version": 1,
  "name": "Investigation",
  "description": "Investigate a topic, weigh evidence, and develop a conclusion, actionables, or an artifact.",
  "stages": [
    {
      "id": "inquiry",
      "name": "Frame",
      "question": "What are we trying to find out?",
      "nodes": [
        {
          "id": "inquiry-name",
          "label": "Name",
          "question": "What is the investigation called?",
          "example": "Which home energy upgrades are worthwhile?",
          "after": [],
          "kind": "question"
        },
        {
          "id": "inquiry-description",
          "label": "Brief description",
          "question": "What topic are we investigating?",
          "example": "Compare insulation and heating options for our home.",
          "after": [
            "inquiry-name"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-question",
          "label": "Main question",
          "question": "What question should this investigation answer?",
          "example": "Which upgrade would reduce energy use most within our budget?",
          "after": [
            "inquiry-description"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-purpose",
          "label": "Why it matters",
          "question": "Why does finding out matter, and to whom?",
          "example": "We want a warmer home and lower bills.",
          "after": [
            "inquiry-question"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-scope",
          "label": "Scope",
          "question": "What is in scope, and what will we leave out?",
          "example": "Compare three options for this winter; leave major renovations out.",
          "after": [
            "inquiry-question"
          ],
          "kind": "question"
        }
      ]
    },
    {
      "id": "explore",
      "name": "Explore",
      "question": "What do we know, and what is missing?",
      "nodes": [
        {
          "id": "inquiry-known",
          "label": "Existing knowledge",
          "question": "What do we already know, and what are we assuming?",
          "example": "Bills show high winter usage; drafts may be part of the cause.",
          "after": [],
          "kind": "question"
        },
        {
          "id": "inquiry-gaps",
          "label": "Open questions",
          "question": "What do we still need to find out?",
          "example": "Where is heat escaping, and what does each fix cost?",
          "after": [
            "inquiry-known"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-sources",
          "label": "Sources to consult",
          "question": "Which sources or people could help answer the question?",
          "example": "Energy audits, technical guides, supplier quotes, and independent studies.",
          "after": [
            "inquiry-gaps"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-plan",
          "label": "Investigation plan",
          "question": "How will we gather and compare evidence?",
          "example": "Record source links, dates, costs, assumptions, and limitations in a comparison.",
          "after": [
            "inquiry-sources"
          ],
          "kind": "question"
        }
      ]
    },
    {
      "id": "gather",
      "name": "Gather",
      "question": "What evidence can we find?",
      "nodes": [
        {
          "id": "inquiry-evidence",
          "label": "Sources and evidence",
          "question": "Record sources with links or references, dates, and relevant evidence.",
          "example": "Source 1: energy guide, date, link, finding, and limits. Add further entries as evidence arrives.",
          "after": [],
          "kind": "question"
        },
        {
          "id": "inquiry-findings",
          "label": "Findings",
          "question": "What did we learn, and which source supports each finding?",
          "example": "Finding A: sealing drafts may help; supported by source 1, with uncertain savings.",
          "after": [
            "inquiry-evidence"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-credibility",
          "label": "Credibility and limits",
          "question": "How reliable is the evidence, and what could bias it?",
          "example": "The supplier estimate may be optimistic; seek an independent comparison.",
          "after": [
            "inquiry-evidence"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-contradictions",
          "label": "Contradictions",
          "question": "Where do sources disagree, or evidence remain absent?",
          "example": "Two estimates disagree because they assume different room temperatures.",
          "after": [
            "inquiry-findings",
            "inquiry-credibility"
          ],
          "kind": "question"
        }
      ]
    },
    {
      "id": "synthesize",
      "name": "Synthesize",
      "question": "What does the evidence tell us?",
      "nodes": [
        {
          "id": "inquiry-patterns",
          "label": "Patterns",
          "question": "What patterns emerge across the findings?",
          "example": "Low-cost draft sealing appears consistently useful.",
          "after": [],
          "kind": "question"
        },
        {
          "id": "inquiry-explanations",
          "label": "Compare explanations",
          "question": "Which explanations fit, and what alternatives remain?",
          "example": "Drafts explain some losses, but roof insulation may also matter.",
          "after": [
            "inquiry-patterns"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-conclusion",
          "label": "Conclusion",
          "question": "What can we conclude, with evidence references?",
          "example": "Start with draft sealing, supported by sources 1 and 3; larger upgrades need more evidence.",
          "after": [
            "inquiry-explanations"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-uncertainty",
          "label": "Remaining uncertainty",
          "question": "How confident are we, and what would change the conclusion?",
          "example": "Exact savings remain unknown; an audit could change our priority.",
          "after": [
            "inquiry-conclusion"
          ],
          "kind": "question"
        }
      ]
    },
    {
      "id": "deliver",
      "name": "Deliver",
      "question": "What should come out of this investigation?",
      "nodes": [
        {
          "id": "inquiry-output",
          "label": "Choose the outcome",
          "question": "What outcome will this investigation produce?",
          "example": "A supported conclusion, a prioritized action list, and a short comparison report.",
          "after": [],
          "kind": "question",
          "choices": [
            "Conclusion",
            "Actionables",
            "Artifact",
            "Combination"
          ]
        },
        {
          "id": "inquiry-deliverable",
          "label": "Develop the outcome",
          "question": "Write the conclusion, actionables, or artifact content, or reference where it lives.",
          "example": "Action: seal drafts first. Report: comparison table with source references and uncertainties.",
          "after": [
            "inquiry-output"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-check",
          "label": "Review against evidence",
          "question": "Does the outcome follow from the evidence without overstating certainty?",
          "example": "Check every recommendation against a source and retain unresolved questions.",
          "after": [
            "inquiry-deliverable"
          ],
          "kind": "question"
        },
        {
          "id": "inquiry-next",
          "label": "Next steps and follow-ups",
          "question": "What should happen next, and which follow-up projects might this create?",
          "example": "A home draft-sealing project and a separate investigation into roof insulation.",
          "after": [
            "inquiry-check"
          ],
          "kind": "question"
        }
      ]
    }
  ]
};
