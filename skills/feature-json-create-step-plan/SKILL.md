---
name: feature-json-create-step-plan
description: Creates a detailed implementation plan for the next pending user story in feature.json. Identifies the highest-priority story with passes:false, analyzes the codebase, and produces a step-by-step execution plan including verification steps. Invoke manually or via feature-json-orchestrate.
---

## Your Task

1. Read `current-task/feature.json`
2. Read `current-task/progress.txt`
3. Read relatedSources in `current-task/feature.json`
4. Pick next story with `passes: false` and highest priority. Work only on that story.
5. Create implementation plan. In the plan add figma links if they are presented.
6. In verification part of the plan add quality checks (e.g., typecheck, lint, test, test in the browser/curl)
