---
name: feature-json-create-step-plan
description: Creates a detailed implementation plan for the next pending user step in feature.json
disable-model-invocation: true
---

## Your Task

If `.feature-json.config.json` exists in the repo root, follow every line in `plan.instructions`.

Task folder `tasks/<slug>/`: the slug you were given

1. Read `tasks/<slug>/feature.json` (including relatedSources) and `tasks/<slug>/progress.txt`
2. Pick next step with `passes: false` and highest priority. Work only on that step.
3. Create implementation plan. In the plan add figma links if they are presented. Think about technical implementation, UI/UX, edge cases, concerns, and tradeoffs. Dig into the hard parts I might not have considered.
4. In verification part of the plan add quality checks (e.g., typecheck, lint, test, test in the browser/curl)
