# 📜 AGENT GOVERNANCE & ORCHESTRATION STANDARD

**Property Listify × Antigravity Kit**

**Version 1.0** — Canonical Operating Rules  
This document defines how agents, skills, and workflows cooperate.  
**This file is authoritative.**

---

## 1. Core Philosophy (Non-Negotiable)

- **Domain agents** define BUSINESS TRUTH.
- **Antigravity agents** provide ENGINEERING EXCELLENCE.
- **The Orchestrator** enforces boundaries.

**No agent operates in isolation.**  
**No agent silently changes domain meaning.**

---

## 2. Priority Order (Conflict Resolution)

When instructions conflict, resolve strictly in this order:

1. **This Document**
2. **GEMINI.md**
3. **Domain Agent Rules**
4. **Antigravity Agent Rules**
5. **Skill Instructions**

**If two agents disagree:**
- Preserve data integrity
- Preserve business meaning
- Choose lowest-risk change
- Choose smallest surface area

---

## 3. Domain-Touching Detector (Hard Rule)

A task is **DOMAIN-TOUCHING** if it affects any of the following:

- Database schema, migrations, enums, constraints
- Canonical meaning of fields (pricing, ownership, parking, media categories)
- Entity relationships (development ↔ unit_types ↔ media ↔ partners)
- Publish flows, wizard logic, seeding or publisher emulator flows
- Data persistence, sanitization, serialization formats
- Lead routing, partnerships, monetization logic

🔴 **If YES → Domain agent approval is mandatory.**

---

## 4. Golden Rule (Hard Stop)

🔴 **No Antigravity agent may change domain models, persistence logic, or data contracts unless the relevant Domain Agent explicitly approves.**

This includes:
- "Small refactors"
- "UI simplifications"
- "Performance optimizations"
- "Helpful defaults"

---

## 5. Agent Responsibility Split (Clear Ownership)

### 5.1 Domain Agents (AUTHORITY)

Domain agents own truth and must approve changes.

| Domain Area | Agent Role |
|-------------|------------|
| Schema, migrations, relationships | Data & Schema Agent |
| Wizard flow, step logic, persistence | Wizard Agent |
| Publisher emulator, seeding | Publisher Emulator Agent |
| Media rules (dev vs unit type) | Media / Gallery Domain Agent |
| Partnerships, lead routing, pricing | Business / Partnership Agent |

**Domain agents define:**
- What data exists
- What values are valid
- What null/empty means
- Backward compatibility rules

### 5.2 Antigravity Agents (ADVISORY)

Antigravity agents advise and implement, but do not redefine meaning.

| Concern | Agent |
|---------|-------|
| UI / React / Layout | frontend-specialist |
| APIs / Services | backend-specialist |
| Debugging | debugger |
| Performance | performance-optimizer |
| Security | security-auditor |
| Testing | test-engineer |
| SEO | seo-specialist |
| Planning | project-planner |

---

## 6. Orchestrator Routing Rules

The orchestrator must:

1. Detect if a task is **DOMAIN-TOUCHING**
2. Route to the correct **Domain Agent first**
3. Add Antigravity agents as **secondary advisors**
4. Reject changes that violate domain contracts
5. Require **explicit approval** before execution

---

## 7. Required Output Contract (MANDATORY)

For any domain-touching task, every response must include:

- **Decision** — what is being done
- **Invariants** — what must NOT change
- **Plan** — step-by-step actions
- **Risks** — top 2 failure modes + prevention
- **Files Touched** — explicit list

**If this is missing → the task is incomplete.**

---

## 8. Workflow Defaults

| Workflow | Agent Routing |
|----------|---------------|
| `/debug` | debugger (lead) + Relevant Domain Agent + Optional backend/frontend |
| `/create` / `/enhance` | project-planner → plan → Antigravity specialists → proposal → Domain agent → approval |
| `/deploy` | devops-engineer + Domain agent if migrations or data touched + security-auditor when auth/permissions involved |

---

## 9. Socratic Gate (Balanced)

- For **domain-touching tasks** → ask 2 high-risk edge-case questions
- For **non-domain tasks** → proceed after confirming intent
- If user says "Proceed", execution continues unless domain safety is unclear

---

## 10. Absolute Prohibitions

❌ Silent schema changes  
❌ Implicit enum changes  
❌ Changing media ownership rules  
❌ Refactoring that alters persistence semantics  
❌ UI changes that rewrite data contracts  
❌ "Helpful" changes without approval  

---

## 11. Operating Principle (Summary)

**Stability beats cleverness.**  
**Explicit beats implicit.**  
**Domain truth beats optimization.**
