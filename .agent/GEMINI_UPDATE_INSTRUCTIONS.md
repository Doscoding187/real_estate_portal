# GEMINI.md Update Instructions

## Status

GEMINI.md was not found in the filesystem during this session. It appears to be loaded from memory/config or may need to be created.

## Required Update

Add the following section to GEMINI.md **immediately after the "CRITICAL: AGENT & SKILL PROTOCOL" heading**:

```markdown
---

## 🔴 P0 GOVERNANCE (AUTHORITATIVE)

This workspace follows:
- `./.agent/AGENT_GOVERNANCE.md`

If any agent, skill, or workflow conflicts with this document,
AGENT_GOVERNANCE.md wins.

---
```

## Location Options

1. **If GEMINI.md exists globally**: Add the section to the existing file
2. **If GEMINI.md doesn't exist**: The user rules already contain GEMINI.md content, so this may be managed differently in the Antigravity system

## Important

- **Do NOT duplicate rules** from AGENT_GOVERNANCE.md into GEMINI.md
- **Keep this reference minimal** — just the P0 priority declaration
- This is the **only change** GEMINI.md needs for governance integration
