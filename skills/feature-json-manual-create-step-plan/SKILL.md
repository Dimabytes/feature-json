---
name: feature-json-manual-create-step-plan
description: Creates a detailed implementation plan for the next pending user story in feature.json
disable-model-invocation: true
---

## Your Task

1. Read `current-task/feature.json` (including relatedSources) and `current-task/progress.txt`
2. Pick next story with `passes: false` and highest priority. Work only on that story.
3. Interview me in detail using the platform question tool:
    - **Cursor:** `AskQuestion`
    - **Claude Code:** `AskUserQuestion`
      Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs. Don't ask obvious questions, dig into the hard parts I might not have considered.
4. Create implementation plan. In the plan add figma links if they are presented. 
5. In verification part of the plan add quality checks (e.g., typecheck, lint, test, test in the browser/curl)
