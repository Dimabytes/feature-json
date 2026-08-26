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

Don't overload your main context. Orchestrate only — spawn subagents, don't fix code yourself

## Loop

1. Read `current-task/feature.json` (including relatedSources) and `current-task/progress.txt`
2. While any user story has `passes: false`, run **Plan → Implement → Review → Fix** for the highest-priority pending story (`passes: false`, lowest `priority` number).

### Plan (subagent)

Subagent should use skill `feature-json-implement-step`. Plan should be written to `current-task/plans/<story-id>.md`.

### Implement (subagent)

Subagent should use skill `feature-json-implement-step`. Pass the story id and the plan path `current-task/plans/<story-id>.md`. Save the subagent id (`resume` id).

### Review (subagent)

- `feature-json-step-review`

### Fix

- If review have no comments at all set `passes: true`, append a one-line review note to `progress.txt`, continue to the next story.
- If there are findings: **resume the same implementer** once, paste both review outputs. Then set `passes: true` (even if it skipped some nits) and continue
- You are not deciding what should be fixed. Implementer will take this decision.

