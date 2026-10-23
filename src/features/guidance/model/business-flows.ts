import type { FlowId } from "@/shared/contracts/database.generated";
import type { Flow } from "@/features/guidance/model/flows";

export type BusinessFlowId = Exclude<FlowId, "venture" | "creative" | "investigation">;
export const businessFlows: { readonly [Id in BusinessFlowId]: Flow & { readonly id: Id } } = {
  eshop: {
    id: "eshop",
    version: 1,
    name: "E-shop",
    description: "Build a general online shop, from product selection to fulfilled orders.",
    stages: [
      {
        id: "eshop-1",
        name: "Offer",
        question: "What will the shop sell, and to whom?",
        nodes: [
          {
            id: "eshop-name",
            label: "Name",
            question: "What is the project name?",
            example: "E-shop",
            after: [],
            kind: "question",
          },
          {
            id: "eshop-description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example: "Build a general online shop, from product selection to fulfilled orders.",
            after: ["eshop-name"],
            kind: "question",
          },
          {
            id: "eshop-1-1",
            label: "Customers and products",
            question: "Who are the customers, and which products meet their needs?",
            example: "A small range of reusable kitchen supplies for home cooks.",
            after: ["eshop-description"],
            kind: "question",
          },
        ],
      },
      {
        id: "eshop-2",
        name: "Validate",
        question: "Why would customers buy from this shop?",
        nodes: [
          {
            id: "eshop-2-1",
            label: "Demand and alternatives",
            question: "What evidence of demand exists, and where do customers buy today?",
            example: "Compare customer conversations with existing shops and real purchase intent.",
            after: [],
            kind: "question",
          },
          {
            id: "eshop-2-2",
            label: "Test the offer",
            question: "What small test could confirm the offer before buying stock?",
            example:
              "Show a sample catalog and record inquiries without claiming products are in stock.",
            after: ["eshop-2-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "eshop-3",
        name: "Operations",
        question: "How will orders be supplied and delivered?",
        nodes: [
          {
            id: "eshop-3-1",
            label: "Supply and stock",
            question: "Where will products come from, and how will stock be tracked?",
            example: "Start with a small confirmed supplier order and a simple stock log.",
            after: [],
            kind: "question",
          },
          {
            id: "eshop-3-2",
            label: "Pricing and fulfillment",
            question: "What verified costs, payment, delivery, and return arrangements are needed?",
            example:
              "Record product, packaging, payment, and delivery costs before setting prices.",
            after: ["eshop-3-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "eshop-4",
        name: "Launch",
        question: "What is the smallest shop we can launch?",
        nodes: [
          {
            id: "eshop-4-1",
            label: "Storefront and checkout",
            question: "Which catalog pages and checkout steps must work?",
            example: "Five clear product pages and one tested purchase-to-delivery journey.",
            after: [],
            kind: "question",
          },
          {
            id: "eshop-4-2",
            label: "First customers",
            question: "How will we reach the first customers and handle support?",
            example:
              "Choose one channel, publish accurate availability, and name a support contact.",
            after: ["eshop-4-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "eshop-5",
        name: "Improve",
        question: "What should we keep, change, or stop?",
        nodes: [
          {
            id: "eshop-5-1",
            label: "Orders and learning",
            question: "What do real orders, costs, and customer feedback show?",
            example: "Compare fulfilled orders, actual margins, delays, and return reasons.",
            after: [],
            kind: "question",
          },
          {
            id: "eshop-5-2",
            label: "Shop outcomes",
            question: "What did this project deliver, and what should happen next?",
            example: "A working shop, an operations checklist, and a follow-up sourcing project.",
            after: ["eshop-5-1"],
            kind: "question",
          },
        ],
      },
    ],
  },
  "shirt-eshop": {
    id: "shirt-eshop",
    version: 1,
    name: "Shirt E-shop",
    description: "Develop a shirt shop with designs, sizing, production, and fulfillment.",
    stages: [
      {
        id: "shirt-eshop-1",
        name: "Concept",
        question: "Who are the shirts for?",
        nodes: [
          {
            id: "shirt-eshop-name",
            label: "Name",
            question: "What is the project name?",
            example: "Shirt E-shop",
            after: [],
            kind: "question",
          },
          {
            id: "shirt-eshop-description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example: "Develop a shirt shop with designs, sizing, production, and fulfillment.",
            after: ["shirt-eshop-name"],
            kind: "question",
          },
          {
            id: "shirt-eshop-1-1",
            label: "Audience and collection",
            question: "Who would wear these shirts, and what is the first collection?",
            example: "Three original designs for a local music community.",
            after: ["shirt-eshop-description"],
            kind: "question",
          },
        ],
      },
      {
        id: "shirt-eshop-2",
        name: "Design",
        question: "What designs and garments are ready to test?",
        nodes: [
          {
            id: "shirt-eshop-2-1",
            label: "Designs and rights",
            question: "What designs will we use, and do we have permission to use every element?",
            example: "Use original artwork and retain any licenses or collaborator permissions.",
            after: [],
            kind: "question",
          },
          {
            id: "shirt-eshop-2-2",
            label: "Fit and samples",
            question: "Which garments, sizes, and sample checks are needed?",
            example:
              "Check a printed sample for fit, size measurements, color, and wash durability.",
            after: ["shirt-eshop-2-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "shirt-eshop-3",
        name: "Production",
        question: "How will we make and price the shirts?",
        nodes: [
          {
            id: "shirt-eshop-3-1",
            label: "Production model",
            question: "Will we hold stock, make to order, or use print on demand?",
            example:
              "Compare sample quality, lead times, minimum quantities, and supplier reliability.",
            after: [],
            kind: "question",
          },
          {
            id: "shirt-eshop-3-2",
            label: "Costs and size stock",
            question: "What are the verified costs and risks for each size or variant?",
            example: "Include blank shirt, print, packaging, fees, defects, and size exchanges.",
            after: ["shirt-eshop-3-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "shirt-eshop-4",
        name: "Launch",
        question: "How will customers choose and receive a shirt?",
        nodes: [
          {
            id: "shirt-eshop-4-1",
            label: "Catalog and size guide",
            question: "What photos, size information, and production promises must the store show?",
            example:
              "Use real sample photos, garment measurements, and confirmed delivery estimates.",
            after: [],
            kind: "question",
          },
          {
            id: "shirt-eshop-4-2",
            label: "First collection test",
            question: "How will we test the first collection and handle exchanges?",
            example:
              "Launch a limited collection and record size questions, orders, and exchange requests.",
            after: ["shirt-eshop-4-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "shirt-eshop-5",
        name: "Improve",
        question: "What did the first collection teach us?",
        nodes: [
          {
            id: "shirt-eshop-5-1",
            label: "Quality and sales",
            question: "Which designs, sizes, and production issues need attention?",
            example: "Compare actual demand by size, print defects, and customer feedback.",
            after: [],
            kind: "question",
          },
          {
            id: "shirt-eshop-5-2",
            label: "Collection outcomes",
            question: "What did we deliver, and which follow-up projects make sense?",
            example:
              "A tested collection, a supplier specification, and a possible next collection.",
            after: ["shirt-eshop-5-1"],
            kind: "question",
          },
        ],
      },
    ],
  },
  saas: {
    id: "saas",
    version: 1,
    name: "SaaS",
    description: "Validate, build, and operate a software service for recurring customer value.",
    stages: [
      {
        id: "saas-1",
        name: "Problem",
        question: "Whose recurring problem will the service solve?",
        nodes: [
          {
            id: "saas-name",
            label: "Name",
            question: "What is the project name?",
            example: "SaaS",
            after: [],
            kind: "question",
          },
          {
            id: "saas-description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example:
              "Validate, build, and operate a software service for recurring customer value.",
            after: ["saas-name"],
            kind: "question",
          },
          {
            id: "saas-1-1",
            label: "Users and problem",
            question: "Who has this problem, how often, and what do they do today?",
            example: "Small teams manually reconcile recurring reports every week.",
            after: ["saas-description"],
            kind: "question",
          },
        ],
      },
      {
        id: "saas-2",
        name: "Validate",
        question: "What evidence supports building this service?",
        nodes: [
          {
            id: "saas-2-1",
            label: "Customer evidence",
            question: "What interviews or observations show the problem matters?",
            example: "Record specific workflows, time spent, and existing alternatives.",
            after: [],
            kind: "question",
          },
          {
            id: "saas-2-2",
            label: "Value and willingness to pay",
            question: "What small test checks usefulness and willingness to pay?",
            example: "Run a manual pilot and ask for a concrete paid commitment.",
            after: ["saas-2-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "saas-3",
        name: "Build",
        question: "What is the smallest trustworthy product?",
        nodes: [
          {
            id: "saas-3-1",
            label: "Core workflow",
            question: "Which end-to-end workflow must the first version support?",
            example: "Import a report, review discrepancies, and save a checked result.",
            after: [],
            kind: "question",
          },
          {
            id: "saas-3-2",
            label: "Data and reliability",
            question: "What access, privacy, backup, and failure behavior must be designed?",
            example: "Define tenant boundaries, recovery steps, and clear failed-save feedback.",
            after: ["saas-3-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "saas-4",
        name: "Launch",
        question: "How will customers start and keep receiving value?",
        nodes: [
          {
            id: "saas-4-1",
            label: "Onboarding and billing",
            question: "How will customers reach first value, choose a plan, and cancel?",
            example:
              "Guide one pilot customer through setup, a useful result, and plan management.",
            after: [],
            kind: "question",
          },
          {
            id: "saas-4-2",
            label: "Support and operations",
            question: "Who handles support, incidents, and ongoing service costs?",
            example:
              "Define a support contact, incident checklist, and actual infrastructure costs.",
            after: ["saas-4-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "saas-5",
        name: "Learn",
        question: "Is the service delivering ongoing value?",
        nodes: [
          {
            id: "saas-5-1",
            label: "Usage and retention",
            question: "What do real use, repeat value, and cancellations tell us?",
            example: "Compare repeated successful workflows with customer reasons for leaving.",
            after: [],
            kind: "question",
          },
          {
            id: "saas-5-2",
            label: "Service outcomes",
            question: "What did we deliver, and what should we improve or investigate next?",
            example: "A validated workflow, a working service, and a prioritized next release.",
            after: ["saas-5-1"],
            kind: "question",
          },
        ],
      },
    ],
  },
  importation: {
    id: "importation",
    version: 1,
    name: "Importation",
    description: "Investigate sourcing, verified import requirements, landed costs, and delivery.",
    stages: [
      {
        id: "importation-1",
        name: "Scope",
        question: "What do we want to import, and why?",
        nodes: [
          {
            id: "importation-name",
            label: "Name",
            question: "What is the project name?",
            example: "Importation",
            after: [],
            kind: "question",
          },
          {
            id: "importation-description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example:
              "Investigate sourcing, verified import requirements, landed costs, and delivery.",
            after: ["importation-name"],
            kind: "question",
          },
          {
            id: "importation-1-1",
            label: "Goods and destination",
            question: "Which goods, origin, destination, and intended use are in scope?",
            example: "A small batch of components from a named origin to our destination country.",
            after: ["importation-description"],
            kind: "question",
          },
        ],
      },
      {
        id: "importation-2",
        name: "Source",
        question: "Which suppliers and samples can we trust?",
        nodes: [
          {
            id: "importation-2-1",
            label: "Supplier checks",
            question: "What evidence verifies the supplier, specifications, and commercial terms?",
            example:
              "Record independently checked supplier details, written specifications, and quotes.",
            after: [],
            kind: "question",
          },
          {
            id: "importation-2-2",
            label: "Sample and quality",
            question: "What sample or inspection will check quality before committing?",
            example: "Inspect a sample against agreed dimensions, material, and defect criteria.",
            after: ["importation-2-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "importation-3",
        name: "Feasibility",
        question: "Can we verify requirements and total costs?",
        nodes: [
          {
            id: "importation-3-1",
            label: "Requirements and evidence",
            question:
              "Which current requirements apply, and which official sources or qualified advisers confirm them?",
            example:
              "Record classification, permits, documentation, dates, and unresolved questions without guessing.",
            after: [],
            kind: "question",
          },
          {
            id: "importation-3-2",
            label: "Landed cost and risk",
            question: "What verified costs, terms, and uncertainties affect the decision?",
            example:
              "Compare supplier price, freight, insurance, confirmed charges, handling, and delay risks.",
            after: ["importation-3-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "importation-4",
        name: "Pilot",
        question: "How will we carry out a controlled first shipment?",
        nodes: [
          {
            id: "importation-4-1",
            label: "Shipment plan",
            question: "Who is responsible for payment, documents, transport, and clearance?",
            example: "Assign each handoff and confirm requirements before placing the pilot order.",
            after: [],
            kind: "question",
          },
          {
            id: "importation-4-2",
            label: "Receipt and inspection",
            question: "How will we inspect delivery and handle shortages or defects?",
            example: "Record received quantities, condition, discrepancies, and claims evidence.",
            after: ["importation-4-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "importation-5",
        name: "Review",
        question: "What did the import actually deliver?",
        nodes: [
          {
            id: "importation-5-1",
            label: "Actual cost and timing",
            question: "How did actual costs, quality, and delivery compare with the plan?",
            example: "Reconcile invoices and dates; explain variances before repeating the order.",
            after: [],
            kind: "question",
          },
          {
            id: "importation-5-2",
            label: "Import outcomes",
            question: "What decision, documents, or follow-up projects result?",
            example: "A verified sourcing dossier and a decision to repeat, revise, or stop.",
            after: ["importation-5-1"],
            kind: "question",
          },
        ],
      },
    ],
  },
  consultancy: {
    id: "consultancy",
    version: 1,
    name: "Consultancy",
    description:
      "Define a client engagement, diagnose needs, deliver recommendations, and hand over.",
    stages: [
      {
        id: "consultancy-1",
        name: "Engagement",
        question: "Who is the client, and what outcome do they need?",
        nodes: [
          {
            id: "consultancy-name",
            label: "Name",
            question: "What is the project name?",
            example: "Consultancy",
            after: [],
            kind: "question",
          },
          {
            id: "consultancy-description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example:
              "Define a client engagement, diagnose needs, deliver recommendations, and hand over.",
            after: ["consultancy-name"],
            kind: "question",
          },
          {
            id: "consultancy-1-1",
            label: "Client and desired result",
            question: "Who decides, who is affected, and what result matters?",
            example: "A small business wants a clearer stock-control process.",
            after: ["consultancy-description"],
            kind: "question",
          },
        ],
      },
      {
        id: "consultancy-2",
        name: "Diagnose",
        question: "What is happening, and what supports the diagnosis?",
        nodes: [
          {
            id: "consultancy-2-1",
            label: "Discovery and evidence",
            question: "What interviews, observations, or records explain the current situation?",
            example: "Map the process with staff and check a sample of actual records.",
            after: [],
            kind: "question",
          },
          {
            id: "consultancy-2-2",
            label: "Scope and success",
            question: "What is included, excluded, and how will success be judged?",
            example:
              "Agree a diagnostic report and recommendations, excluding software implementation.",
            after: ["consultancy-2-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "consultancy-3",
        name: "Propose",
        question: "What work and recommendations should we agree?",
        nodes: [
          {
            id: "consultancy-3-1",
            label: "Approach and deliverables",
            question: "What activities and concrete deliverables address the need?",
            example: "A process map, prioritized recommendations, and a handover workshop.",
            after: [],
            kind: "question",
          },
          {
            id: "consultancy-3-2",
            label: "Terms and responsibilities",
            question:
              "What timing, fees, access, confidentiality, and responsibilities need agreement?",
            example: "Record agreed terms and who supplies information or approves deliverables.",
            after: ["consultancy-3-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "consultancy-4",
        name: "Deliver",
        question: "How will we develop and validate the work?",
        nodes: [
          {
            id: "consultancy-4-1",
            label: "Develop the work",
            question: "What evidence and analysis support the recommendations?",
            example: "Tie each recommendation to observations and state assumptions.",
            after: [],
            kind: "question",
          },
          {
            id: "consultancy-4-2",
            label: "Client review",
            question: "What feedback, disagreements, or corrections must be resolved?",
            example: "Review a draft with stakeholders and record accepted changes.",
            after: ["consultancy-4-1"],
            kind: "question",
          },
        ],
      },
      {
        id: "consultancy-5",
        name: "Handover",
        question: "What can the client act on after delivery?",
        nodes: [
          {
            id: "consultancy-5-1",
            label: "Action plan and ownership",
            question: "Which actions, owners, and priorities will the client take forward?",
            example: "Assign a responsible person and next checkpoint for each accepted action.",
            after: [],
            kind: "question",
          },
          {
            id: "consultancy-5-2",
            label: "Engagement outcomes",
            question: "What was delivered, accepted, and left for follow-up?",
            example:
              "An accepted report, a practical action plan, and separately scoped follow-up work.",
            after: ["consultancy-5-1"],
            kind: "question",
          },
        ],
      },
    ],
  },
};
