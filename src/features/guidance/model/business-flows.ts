import { node } from "./flow-node";
import type { FlowId } from "@/shared/contracts/database.generated";
import type { Flow } from "@/features/guidance/model/flows";

export type BusinessFlowId = Extract<
  FlowId,
  "eshop" | "shirt-eshop" | "saas" | "importation" | "consultancy"
>;
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
            captureField: "name",
            label: "Name",
            question: "What is the project name?",
            example: "E-shop",
            after: [],
            kind: "question",
          },
          {
            id: "eshop-description",
            captureField: "description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example: "Build a general online shop, from product selection to fulfilled orders.",
            after: ["eshop-name"],
            kind: "question",
          },
          node(
            "eshop-1-1",
            "Customers and products",
            "Who are the customers, and which products meet their needs?",
            "A small range of reusable kitchen supplies for home cooks.",
            ["eshop-description"],
          ),
        ],
      },
      {
        id: "eshop-2",
        name: "Validate",
        question: "Why would customers buy from this shop?",
        nodes: [
          node(
            "eshop-2-1",
            "Demand and alternatives",
            "What evidence of demand exists, and where do customers buy today?",
            "Compare customer conversations with existing shops and real purchase intent.",
            [],
          ),
          node(
            "eshop-2-2",
            "Test the offer",
            "What small test could confirm the offer before buying stock?",
            "Show a sample catalog and record inquiries without claiming products are in stock.",
            ["eshop-2-1"],
          ),
        ],
      },
      {
        id: "eshop-3",
        name: "Operations",
        question: "How will orders be supplied and delivered?",
        nodes: [
          node(
            "eshop-3-1",
            "Supply and stock",
            "Where will products come from, and how will stock be tracked?",
            "Start with a small confirmed supplier order and a simple stock log.",
            [],
          ),
          node(
            "eshop-3-2",
            "Pricing and fulfillment",
            "What verified costs, payment, delivery, and return arrangements are needed?",
            "Record product, packaging, payment, and delivery costs before setting prices.",
            ["eshop-3-1"],
          ),
        ],
      },
      {
        id: "eshop-4",
        name: "Launch",
        question: "What is the smallest shop we can launch?",
        nodes: [
          node(
            "eshop-4-1",
            "Storefront and checkout",
            "Which catalog pages and checkout steps must work?",
            "Five clear product pages and one tested purchase-to-delivery journey.",
            [],
          ),
          node(
            "eshop-4-2",
            "First customers",
            "How will we reach the first customers and handle support?",
            "Choose one channel, publish accurate availability, and name a support contact.",
            ["eshop-4-1"],
          ),
        ],
      },
      {
        id: "eshop-5",
        name: "Improve",
        question: "What should we keep, change, or stop?",
        nodes: [
          node(
            "eshop-5-1",
            "Orders and learning",
            "What do real orders, costs, and customer feedback show?",
            "Compare fulfilled orders, actual margins, delays, and return reasons.",
            [],
          ),
          node(
            "eshop-5-2",
            "Shop outcomes",
            "What did this project deliver, and what should happen next?",
            "A working shop, an operations checklist, and a follow-up sourcing project.",
            ["eshop-5-1"],
          ),
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
            captureField: "name",
            label: "Name",
            question: "What is the project name?",
            example: "Shirt E-shop",
            after: [],
            kind: "question",
          },
          {
            id: "shirt-eshop-description",
            captureField: "description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example: "Develop a shirt shop with designs, sizing, production, and fulfillment.",
            after: ["shirt-eshop-name"],
            kind: "question",
          },
          node(
            "shirt-eshop-1-1",
            "Audience and collection",
            "Who would wear these shirts, and what is the first collection?",
            "Three original designs for a local music community.",
            ["shirt-eshop-description"],
          ),
        ],
      },
      {
        id: "shirt-eshop-2",
        name: "Design",
        question: "What designs and garments are ready to test?",
        nodes: [
          node(
            "shirt-eshop-2-1",
            "Designs and rights",
            "What designs will we use, and do we have permission to use every element?",
            "Use original artwork and retain any licenses or collaborator permissions.",
            [],
          ),
          node(
            "shirt-eshop-2-2",
            "Fit and samples",
            "Which garments, sizes, and sample checks are needed?",
            "Check a printed sample for fit, size measurements, color, and wash durability.",
            ["shirt-eshop-2-1"],
          ),
        ],
      },
      {
        id: "shirt-eshop-3",
        name: "Production",
        question: "How will we make and price the shirts?",
        nodes: [
          node(
            "shirt-eshop-3-1",
            "Production model",
            "Will we hold stock, make to order, or use print on demand?",
            "Compare sample quality, lead times, minimum quantities, and supplier reliability.",
            [],
          ),
          node(
            "shirt-eshop-3-2",
            "Costs and size stock",
            "What are the verified costs and risks for each size or variant?",
            "Include blank shirt, print, packaging, fees, defects, and size exchanges.",
            ["shirt-eshop-3-1"],
          ),
        ],
      },
      {
        id: "shirt-eshop-4",
        name: "Launch",
        question: "How will customers choose and receive a shirt?",
        nodes: [
          node(
            "shirt-eshop-4-1",
            "Catalog and size guide",
            "What photos, size information, and production promises must the store show?",
            "Use real sample photos, garment measurements, and confirmed delivery estimates.",
            [],
          ),
          node(
            "shirt-eshop-4-2",
            "First collection test",
            "How will we test the first collection and handle exchanges?",
            "Launch a limited collection and record size questions, orders, and exchange requests.",
            ["shirt-eshop-4-1"],
          ),
        ],
      },
      {
        id: "shirt-eshop-5",
        name: "Improve",
        question: "What did the first collection teach us?",
        nodes: [
          node(
            "shirt-eshop-5-1",
            "Quality and sales",
            "Which designs, sizes, and production issues need attention?",
            "Compare actual demand by size, print defects, and customer feedback.",
            [],
          ),
          node(
            "shirt-eshop-5-2",
            "Collection outcomes",
            "What did we deliver, and which follow-up projects make sense?",
            "A tested collection, a supplier specification, and a possible next collection.",
            ["shirt-eshop-5-1"],
          ),
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
            captureField: "name",
            label: "Name",
            question: "What is the project name?",
            example: "SaaS",
            after: [],
            kind: "question",
          },
          {
            id: "saas-description",
            captureField: "description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example:
              "Validate, build, and operate a software service for recurring customer value.",
            after: ["saas-name"],
            kind: "question",
          },
          node(
            "saas-1-1",
            "Users and problem",
            "Who has this problem, how often, and what do they do today?",
            "Small teams manually reconcile recurring reports every week.",
            ["saas-description"],
          ),
        ],
      },
      {
        id: "saas-2",
        name: "Validate",
        question: "What evidence supports building this service?",
        nodes: [
          node(
            "saas-2-1",
            "Customer evidence",
            "What interviews or observations show the problem matters?",
            "Record specific workflows, time spent, and existing alternatives.",
            [],
          ),
          node(
            "saas-2-2",
            "Value and willingness to pay",
            "What small test checks usefulness and willingness to pay?",
            "Run a manual pilot and ask for a concrete paid commitment.",
            ["saas-2-1"],
          ),
        ],
      },
      {
        id: "saas-3",
        name: "Build",
        question: "What is the smallest trustworthy product?",
        nodes: [
          node(
            "saas-3-1",
            "Core workflow",
            "Which end-to-end workflow must the first version support?",
            "Import a report, review discrepancies, and save a checked result.",
            [],
          ),
          node(
            "saas-3-2",
            "Data and reliability",
            "What access, privacy, backup, and failure behavior must be designed?",
            "Define tenant boundaries, recovery steps, and clear failed-save feedback.",
            ["saas-3-1"],
          ),
        ],
      },
      {
        id: "saas-4",
        name: "Launch",
        question: "How will customers start and keep receiving value?",
        nodes: [
          node(
            "saas-4-1",
            "Onboarding and billing",
            "How will customers reach first value, choose a plan, and cancel?",
            "Guide one pilot customer through setup, a useful result, and plan management.",
            [],
          ),
          node(
            "saas-4-2",
            "Support and operations",
            "Who handles support, incidents, and ongoing service costs?",
            "Define a support contact, incident checklist, and actual infrastructure costs.",
            ["saas-4-1"],
          ),
        ],
      },
      {
        id: "saas-5",
        name: "Learn",
        question: "Is the service delivering ongoing value?",
        nodes: [
          node(
            "saas-5-1",
            "Usage and retention",
            "What do real use, repeat value, and cancellations tell us?",
            "Compare repeated successful workflows with customer reasons for leaving.",
            [],
          ),
          node(
            "saas-5-2",
            "Service outcomes",
            "What did we deliver, and what should we improve or investigate next?",
            "A validated workflow, a working service, and a prioritized next release.",
            ["saas-5-1"],
          ),
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
            captureField: "name",
            label: "Name",
            question: "What is the project name?",
            example: "Importation",
            after: [],
            kind: "question",
          },
          {
            id: "importation-description",
            captureField: "description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example:
              "Investigate sourcing, verified import requirements, landed costs, and delivery.",
            after: ["importation-name"],
            kind: "question",
          },
          node(
            "importation-1-1",
            "Goods and destination",
            "Which goods, origin, destination, and intended use are in scope?",
            "A small batch of components from a named origin to our destination country.",
            ["importation-description"],
          ),
        ],
      },
      {
        id: "importation-2",
        name: "Source",
        question: "Which suppliers and samples can we trust?",
        nodes: [
          node(
            "importation-2-1",
            "Supplier checks",
            "What evidence verifies the supplier, specifications, and commercial terms?",
            "Record independently checked supplier details, written specifications, and quotes.",
            [],
          ),
          node(
            "importation-2-2",
            "Sample and quality",
            "What sample or inspection will check quality before committing?",
            "Inspect a sample against agreed dimensions, material, and defect criteria.",
            ["importation-2-1"],
          ),
        ],
      },
      {
        id: "importation-3",
        name: "Feasibility",
        question: "Can we verify requirements and total costs?",
        nodes: [
          node(
            "importation-3-1",
            "Requirements and evidence",
            "Which current requirements apply, and which official sources or qualified advisers confirm them?",
            "Record classification, permits, documentation, dates, and unresolved questions without guessing.",
            [],
          ),
          node(
            "importation-3-2",
            "Landed cost and risk",
            "What verified costs, terms, and uncertainties affect the decision?",
            "Compare supplier price, freight, insurance, confirmed charges, handling, and delay risks.",
            ["importation-3-1"],
          ),
        ],
      },
      {
        id: "importation-4",
        name: "Pilot",
        question: "How will we carry out a controlled first shipment?",
        nodes: [
          node(
            "importation-4-1",
            "Shipment plan",
            "Who is responsible for payment, documents, transport, and clearance?",
            "Assign each handoff and confirm requirements before placing the pilot order.",
            [],
          ),
          node(
            "importation-4-2",
            "Receipt and inspection",
            "How will we inspect delivery and handle shortages or defects?",
            "Record received quantities, condition, discrepancies, and claims evidence.",
            ["importation-4-1"],
          ),
        ],
      },
      {
        id: "importation-5",
        name: "Review",
        question: "What did the import actually deliver?",
        nodes: [
          node(
            "importation-5-1",
            "Actual cost and timing",
            "How did actual costs, quality, and delivery compare with the plan?",
            "Reconcile invoices and dates; explain variances before repeating the order.",
            [],
          ),
          node(
            "importation-5-2",
            "Import outcomes",
            "What decision, documents, or follow-up projects result?",
            "A verified sourcing dossier and a decision to repeat, revise, or stop.",
            ["importation-5-1"],
          ),
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
            captureField: "name",
            label: "Name",
            question: "What is the project name?",
            example: "Consultancy",
            after: [],
            kind: "question",
          },
          {
            id: "consultancy-description",
            captureField: "description",
            label: "Brief description",
            question: "What are we building, and for whom?",
            example:
              "Define a client engagement, diagnose needs, deliver recommendations, and hand over.",
            after: ["consultancy-name"],
            kind: "question",
          },
          node(
            "consultancy-1-1",
            "Client and desired result",
            "Who decides, who is affected, and what result matters?",
            "A small business wants a clearer stock-control process.",
            ["consultancy-description"],
          ),
        ],
      },
      {
        id: "consultancy-2",
        name: "Diagnose",
        question: "What is happening, and what supports the diagnosis?",
        nodes: [
          node(
            "consultancy-2-1",
            "Discovery and evidence",
            "What interviews, observations, or records explain the current situation?",
            "Map the process with staff and check a sample of actual records.",
            [],
          ),
          node(
            "consultancy-2-2",
            "Scope and success",
            "What is included, excluded, and how will success be judged?",
            "Agree a diagnostic report and recommendations, excluding software implementation.",
            ["consultancy-2-1"],
          ),
        ],
      },
      {
        id: "consultancy-3",
        name: "Propose",
        question: "What work and recommendations should we agree?",
        nodes: [
          node(
            "consultancy-3-1",
            "Approach and deliverables",
            "What activities and concrete deliverables address the need?",
            "A process map, prioritized recommendations, and a handover workshop.",
            [],
          ),
          node(
            "consultancy-3-2",
            "Terms and responsibilities",
            "What timing, fees, access, confidentiality, and responsibilities need agreement?",
            "Record agreed terms and who supplies information or approves deliverables.",
            ["consultancy-3-1"],
          ),
        ],
      },
      {
        id: "consultancy-4",
        name: "Deliver",
        question: "How will we develop and validate the work?",
        nodes: [
          node(
            "consultancy-4-1",
            "Develop the work",
            "What evidence and analysis support the recommendations?",
            "Tie each recommendation to observations and state assumptions.",
            [],
          ),
          node(
            "consultancy-4-2",
            "Client review",
            "What feedback, disagreements, or corrections must be resolved?",
            "Review a draft with stakeholders and record accepted changes.",
            ["consultancy-4-1"],
          ),
        ],
      },
      {
        id: "consultancy-5",
        name: "Handover",
        question: "What can the client act on after delivery?",
        nodes: [
          node(
            "consultancy-5-1",
            "Action plan and ownership",
            "Which actions, owners, and priorities will the client take forward?",
            "Assign a responsible person and next checkpoint for each accepted action.",
            [],
          ),
          node(
            "consultancy-5-2",
            "Engagement outcomes",
            "What was delivered, accepted, and left for follow-up?",
            "An accepted report, a practical action plan, and separately scoped follow-up work.",
            ["consultancy-5-1"],
          ),
        ],
      },
    ],
  },
};
