---
name: feature-json-orchestrate
description: >
  Run the full feature.json loop until every user story passes: plan each
  pending story, implement it, then run feature-json-step-review (fix
  findings). When the feature is complete, archive current-task into
  docs/completed-tasks and commit. Use when the user says orchestrate
  feature.json, run all user stories, or finish the current feature.
---

# Feature JSON Orchestrate

Drive `current-task/feature.json` from start to finish with one story at a time. Don't stop until it's done.

## Loop

1. Read `current-task/feature.json` and its `relatedSources`.
2. While any user story has `passes: false`:
   1. Pick the highest-priority pending story (lowest `priority` number among `passes: false`).
   2. **Plan** — run `feature-json-create-step-plan` for that story (subagent).
   3. **Implement** — run `feature-json-implement-step` with the exact story id and the plan (subagent).
   4. **Review + fix** — run `feature-json-step-review` on the story's changes. Require review and apply fixes for actionable findings; re-check typecheck/lint; commit fixes when needed. (subagent)

For steps 2.2, 2.3, 2.4 use subagents. It's a hard rule. 

## Archive when the feature is done

When every user story has `passes: true`:

1. Derive a short filesystem-safe kebab-case slug from `description`.
   - Keep it short (roughly 3–6 words). Example: `Task Status` → `task-status-feature`.
2. Ensure `docs/completed-tasks/` exists in the **project** repo (create if missing).
3. If `docs/completed-tasks/<slug>/` already exists, append `-2`, `-3`, … until unique.
4. Move the entire `current-task/` directory to `docs/completed-tasks/<slug>/` (preserve the tree: `feature.json`, `learnings.txt`, and any other files).
5. Commit in the project repo, e.g. `docs: archive completed task <slug>`.
6. Tell the user the archive path.
