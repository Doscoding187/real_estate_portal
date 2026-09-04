# Founder Command Centre — Full Context

This document preserves the complete design vision for the Founder Command Centre.
It was created from the brainstorming session on 4 September 2026.

---

## The Core Principle

Everything can happen in the company. Only selected things are allowed to interrupt the founder.

The screen should answer one question: **What deserves my attention now, and why?**

---

## Architecture Overview

```
PROPERTY LISTIFY
│
├── PUBLIC PLATFORM (customer-facing)
│   ├── Property search
│   ├── Listings
│   ├── Developments
│   ├── Agents
│   ├── Agencies
│   ├── Shared Living
│   └── Services
│
├── OPERATIONAL WORKSPACES (people doing specific work)
│   ├── Agent Dashboard
│   ├── Agency Dashboard
│   ├── Developer Dashboard
│   └── Admin Dashboard (platform operations)
│
└── COMPANY INTELLIGENCE (founder operating environment)
    └── FOUNDER COMMAND CENTRE (/founder)
        ├── Cockpit Home
        ├── Founder Attention
        ├── Company Map
        ├── Today
        ├── Growth Command Centre
        ├── Product & Journey Map
        ├── AI & Automation Centre
        └── Company Memory
```

The Founder Command Centre is NOT the new admin dashboard.
It sits ABOVE operational systems. It tells you where to look.
Admin is one of the operational systems it can surface and link into.

---

## Screen 1 — Cockpit Home

Question answered: "How is the company doing right now?"

### Layout (from mockup)

- Left nav: Cockpit, Overview, Attention (badge 7), Today
- Workstreams: Product, Growth, Commercial, Operations, Finance
- Product Map: Agent Journey, Developer Journey, Buyer Journey, Services Journey
- Company: People, Partners, Documents
- Systems: Integrations, Automations, Logs

### Main content

- Greeting + date + personal note
- Company Focus (This Quarter): "Establish repeatable demand acquisition and activate supply"
- KPI row: Traffic, Leads, Active Agents, Active Agencies, Active Developers, Revenue
- Traffic Overview (line chart, 30 days, by source)
- Top Traffic Sources (donut chart)
- Live Activity feed (real-time events)
- Conversions funnel (Visitors → Signups → Leads → Conversations → Deals)
- Geographic Demand (map + breakdown)
- Product & Journey Map (progress bars per journey)
- System Health footer (Vercel, Railway, TiDB, Resend, WhatsApp, PostHog, GitHub, Automations)

### Right panel

- Founder Attention (top 5 items)
- Today's Focus (top 3 priorities)

---

## Screen 2 — Founder Attention

Question answered: "What needs my judgment or action?"

### The Attention Queue

Centre of the screen. Each item contains:
- What happened
- Why it matters
- Urgency
- Workstream
- How long it has been waiting
- Who/what owns the underlying work

### Four classification types

1. **Decision** — System cannot continue without founder choice
   - Approve a growth experiment
   - Choose between two technical approaches
   - Approve commercial terms

2. **Opportunity** — Something valuable requires founder involvement
   - High-value developer lead
   - Partnership proposal
   - Media opportunity

3. **Escalation** — A system or person has encountered a situation it cannot resolve
   - Important automation failure
   - Customer complaint
   - Production incident

4. **Awareness** — You don't need to act, but you should know
   - Traffic increased 30%
   - Major PR merged
   - Competitor changed strategy
   - Used sparingly — otherwise this screen becomes noise

### Attention Item Lifecycle

```
Signal occurs
      ↓
AI / automation evaluates it
      ↓
Does it meet attention rules?
      ↓
NO → Handle automatically / record
YES ↓
Create Attention Item
      ↓
Classify
      ↓
Priority score calculated
      ↓
Founder Queue
      ↓
Founder acts
      ↓
Outcome recorded
      ↓
AI learns from outcome
```

### Priority Score (eventual)

Urgency + Business Value + Risk + Reversibility + Founder Necessity

Example: High-value developer lead
- Business value: 95
- Urgency: 85
- Risk of delay: 80
- Founder necessity: 90
→ Critical

Example: CSS warning
- Business value: 10
- Urgency: 15
- Automation possible: yes
→ Never reaches you

### Right-hand detail panel

When you select an item:
- **Why am I seeing this?** — Not just what happened
- **What is the context?** — AI/system gathers relevant info
- **What is recommended?** — System should make a recommendation
- **What can I do?** — One-click actions (Respond now, Open CRM, Assign, Snooze, Dismiss, Escalate)

### Three lower sections

- Decisions Required — Things where only you can decide
- Opportunities — Things that could create value
- Escalations — Things that are not working as intended

### Backend model: founder_attention_items

```
id
type
priority
status
title
summary
source_system
source_reference
workstream
requires_founder
recommended_action
due_at
snoozed_until
assigned_to
resolved_at
resolution
metadata
created_at
```

Any system can generate one:
- Growth experiment → founder_attention_items
- CRM high-value developer → founder_attention_items
- GitHub critical issue → founder_attention_items
- Finance unusual payment → founder_attention_items
- AI strategic pattern → founder_attention_items

### Default rule

**When uncertain, do not interrupt the founder. Escalate only when the expected value of founder attention exceeds the cost of interruption.**

---

## Screen 3 — Company Map

Question answered: "Where in the business is the health, growth or bottleneck located?"

### Central concept

A living visual model of Property Listify as a business.
See the entire company in one view without opening a spreadsheet, GitHub, analytics, CRM, or document.

### Layout

- Centre: Property Listify Marketplace Core
- Supply side: Agents, Agencies, Developers, Service Providers
- Demand side: Buyers, Shared Living, Investors
- Arrows represent: supply creation, demand generation, listings, leads, revenue, referrals, service adoption

### Each node is a business health card showing 4 dimensions

1. Scale — How much activity or participation exists
2. Movement — Is it growing or shrinking
3. Value — Is this producing leads, listings, revenue
4. Objective progress — What are we currently trying to achieve

### Right panel (when node selected)

- Snapshot (key metrics)
- Health Score
- Top Strengths
- Top Challenges
- Current Objective
- Key Initiatives

### Ecosystem Foundations (bottom)

- Technology Platform
- Data & Intelligence
- Marketing & Traffic
- Payments & Revenue
- Operations

### Hierarchy

```
PROPERTY LISTIFY
│
├── ECOSYSTEM
│   ├── Agents
│   ├── Agencies
│   ├── Developers
│   ├── Buyers
│   ├── Shared Living
│   ├── Investors
│   └── Services
│
├── FOUNDATIONS
│   ├── Product & Technology
│   ├── Growth & Traffic
│   ├── Commercial
│   ├── Operations
│   ├── Finance
│   └── Data & Intelligence
│
└── COMPANY INTELLIGENCE
    ├── Objectives
    ├── Initiatives
    ├── Bottlenecks
    ├── Risks
    └── Opportunities
```

### Status language (not just colour)

- 🟢 Healthy — Growth ahead of target
- 🟡 Attention — Activation below target
- 🔴 At Risk — No meaningful activity in 14 days

### Drill-down hierarchy

Company Map → Developer Health → Development Catalogue → Development detail → Founder Attention item

---

## Screen 4 — Today

Question answered: "Given everything happening across Property Listify, what is the best use of my time today?"

### Top section — strategic context

- Company Objective
- Daily Focus Score (0-100)
- Top Priority Work (count)
- Time Available
- Strategic Alignment %

### Today's Priorities — max 3

Each has:
- Priority level
- What it is
- Why it matters
- Workstream
- Due date
- Estimated time
- Impact score
- Recommended action

### Key Meetings & Commitments

Calendar integration (eventual).
Also recognises: commercial meetings, strategic commitments, deadlines, promised follow-ups.

### Daily Schedule (time blocking)

- Deep Work
- Commercial
- Communication
- Operations
- Personal

### Active Projects & Initiatives

Progress, objective, deadline, current state.
Rule: A project cannot be active merely because it exists.

### AI Today Brief

Every morning:
- Opportunity signals
- Risk signals
- Win signals

No generic pleasantries. Only changes, anomalies, opportunities, risks.

### Personal Note

Private founder journal / reflection layer.

### Build vs Growth Balance

If 90% on code and 0% on customers/traffic — surface the imbalance.
If 0% on platform maintenance — surface that too.

### Candidate ranking

```
Founder Attention + Company Objectives + Active Initiatives +
Calendar Commitments + Commercial Opportunities + Critical Deadlines +
AI Intelligence
        ↓
TODAY'S CANDIDATE ACTIONS
        ↓
Rank by: strategic alignment, expected impact, urgency, leverage,
dependency, founder necessity
        ↓
TOP 3
```

---

## Planned Screens (5-8)

5. **Growth Command Centre** — Traffic, SEO, content, experiments, channels, funnel
6. **Product & Journey Map** — Journey health, conversion, features
7. **AI & Automation Centre** — Automations, AI briefings, system health
8. **Company Memory** — Decisions log, learning, institutional knowledge

---

## Three levels of vision

1. **Cockpit** — How is the company doing?
2. **Founder Attention** — What needs me?
3. **Company Map** — Where is the company structurally strong or weak?

---

## Safety principles for building

- Preserve first. Extend second. Replace never (unless explicitly approved).
- Never touch main directly. Work in isolated worktree.
- Small, explicit, verifiable missions.
- Each change independently reviewed, tested, committed, reverted.
- No broad refactors. Find existing seams. Build alongside them.
