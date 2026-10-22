# Guided flows

The stage names, questions, and paths below are accepted product direction. Prompt examples are illustrative copy proposals. Arrows guide exploration, not mandatory gates. Revisit any stage; preserve answers and learning. Branches converge into a discussion or decision, not an automated score. [Domain](domain.md) defines progress; [interaction](interaction.md) defines navigation.

## Venture overview

```mermaid
flowchart TD
  V1["1. Idea — What's your idea?"] --> V2["2. Exploration — Who is it for, and why does it matter?"]
  V2 --> V3["3. Validation — Is it worth pursuing?"]
  V3 --> V4["4. Planning — What's our first useful version?"]
  V4 --> V5["5. Building — How do we make it happen?"]
```

### 1. Idea — What's your idea?

```mermaid
flowchart TD
  A["Name"] --> B["Brief description"] --> C["Idea captured"]
```

Example: “A neighborhood tool library. Let neighbors borrow rarely used tools.” Save before requesting deeper answers.

### 2. Exploration — Who is it for, and why does it matter?

```mermaid
flowchart TD
  A["Who is it for? Audience"] --> B["What problem do they have?"]
  B --> C["How do they handle it now? Current workaround"]
  C --> D["How could our solution help?"]
  M["Why do we want to do this? Motivation"] --> E["We can explain the idea"]
  D --> E
```

Example: “Apartment dwellers buy a drill for one job. Could borrowing one nearby be easier?” Motivation may be personal, financial, social, or mixed.

### 3. Validation — Is it worth pursuing?

```mermaid
flowchart TD
  S["Explore the important uncertainties"] --> D["Demand"]
  S --> F["Feasibility"]
  S --> A["Affordability"]
  D --> D1["What alternatives exist?"] --> D2["What did potential users say or do?"]
  F --> F1["What is the hardest uncertainty?"] --> F2["What cheap test could teach us?"]
  A --> A1["What time, money, and help can we afford?"]
  D2 --> L["Record learnings and remaining unknowns"]
  F2 --> L
  A1 --> L
  L --> C{"What next?"}
  C --> K["Continue to Planning"]
  C --> R["Revise and revisit Exploration or Validation"]
  C --> P["Park with the learning preserved"]
```

Example: “Ask five neighbors about their last tool purchase before building a booking system.” Record actual feedback separately from assumptions. “Nobody wanted this version” is useful evidence.

### 4. Planning — What's our first useful version?

```mermaid
flowchart TD
  A["What should someone be able to do?"] --> B["What is essential, and what can wait?"]
  B --> C["Break essentials into small tasks"]
  C --> D["Identify first steps, dependencies, and contributors"]
  D --> E["Agree on the first useful version"]
```

Example: “One neighbor can request one tool and receive a reply. Payments can wait.” A contributor is a willing person, not an automatic assignment.

### 5. Building — How do we make it happen?

```mermaid
flowchart TD
  A["Choose the next task"] --> B["Make a working piece"]
  B --> C{"Blocked or need help?"}
  C -->|Yes| H["Explain blocker and ask for help"]
  H --> A
  C -->|Ready| D["Test with someone"]
  D --> E["What did we learn?"]
  E --> F{"Repeat or share?"}
  F -->|Repeat| A
  F -->|Share| G["Share the useful version"]
  G --> I["Record next improvements"]
  I -.-> A
```

Example: “Try the request form with a neighbor and watch where they hesitate.” Testing can reveal a need to revisit earlier stages.

## Creative/fun overview

Keep this version for now. There is no requirement for profit, market demand, or commercial validation.

```mermaid
flowchart TD
  C1["1. Concept — What are we making?"] --> C2["2. Imagine — What could it look or feel like?"]
  C2 --> C3["3. Experiment — Test a prototype"]
  C3 --> C4["4. Shape — What do we want to make together?"]
  C4 --> C5["5. Create"]
```

### 1. Concept — What are we making?

```mermaid
flowchart TD
  A["Name"] --> B["Brief description"] --> C["Concept recorded"]
```

Example: “Audio production project made with friends.”

### 2. Imagine — What could it look or feel like?

```mermaid
flowchart TD
  S["Explore together"] --> A["What inspires us?"]
  S --> B["What excites each friend?"]
  S --> C["What possibilities can we imagine?"]
  A --> D["Choose a direction"]
  B --> D
  C --> D
```

Example: “Warm voices, silly sea monsters, and homemade sound effects.” Different friends can want different things; keep those perspectives visible.

### 3. Experiment — Test a prototype

```mermaid
flowchart TD
  A["Make a sketch, demo, or rough version"] --> B["What do we like?"]
  A --> C["Was making it enjoyable?"]
  B --> D{"What next?"}
  C --> D
  D --> K["Keep the direction and move to Shape"]
  D --> R["Try another direction"]
  R --> A
  D --> P["Save for later with the learning"]
```

Example: “Record a one-minute scene on our phones.” Enjoyment is evidence worth recording, not a productivity score.

### 4. Shape — What do we want to make together?

```mermaid
flowchart TD
  S["Agree on a comfortable scope"] --> A["What would finished enough mean?"]
  S --> B["What time and money feel comfortable?"]
  S --> C["What does each person want to contribute?"]
  A --> D["Choose a small version"]
  B --> D
  C --> D
  D --> E["Pick the first steps"]
```

Example: “A five-minute episode, two evenings, no special purchases; each person chooses a part.”

### 5. Create

```mermaid
flowchart TD
  A["Make the next piece"] --> B["Show each other"]
  B --> C["What should we keep or change?"]
  C --> D{"Finished enough?"}
  D -->|Not yet| A
  D -->|Yes| E["Enjoy what we made"]
  E --> F{"Keep among friends or share?"}
  F --> P["Keep among friends"]
  F --> S["Share by choice"]
```

Example: “Listen together before deciding whether anyone else needs to hear it.” Finishing privately is a full, valid outcome.
