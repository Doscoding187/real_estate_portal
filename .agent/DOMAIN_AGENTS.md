# Domain Agents Routing Table

This file maps business domains to their authoritative agents.

---

## Active Domain Agents

| Domain Agent | Owns | Does NOT Own |
|--------------|------|--------------|
| **Data & Schema Agent** | `schema.ts`, migrations, relationships, constraints, enums | UI polish, performance refactors, generic abstractions unless they affect schema |
| **Wizard Agent** | Wizard flow logic, step persistence, validation rules, wizard state management | UI components (unless they change persistence), styling |
| **Publisher Emulator Agent** | Seeding flows, emulator logic, test data generation | Production data handling, actual partner integrations |
| **Media/Gallery Domain Agent** | Development vs unit type media rules, media categories, hero image logic, media ownership | Image optimization, CDN configuration, UI gallery components |
| **Business/Partnership Agent** | Partner relationships, lead routing, monetization logic, pricing rules | UI for partner dashboards, performance of lead delivery |

---

## Approval Required

Any change to **data contracts**, **persistence logic**, **schema**, **enums**, or **serialization** within owned scope requires explicit approval from the relevant domain agent.

---

## Routing Protocol

1. **Detect domain** from task description
2. **Route to domain agent first** if domain-touching
3. **Add Antigravity specialists** as advisors
4. **Require output contract** (Decision + Invariants + Plan + Risks + Files Touched)
5. **Execute only after approval**
