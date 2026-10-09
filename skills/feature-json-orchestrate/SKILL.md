---
name: feature-json-orchestrate
description: >
  Run the full feature.json loop until every step passes: plan each
  pending step, implement it, then run feature-json-step-review and
  feature-json-no-comments in parallel and send both reports to the main
  agent. Use when the user says orchestrate feature.json, run all
  steps, or finish the current feature.
---

# Feature JSON Orchestrate

Drive `tasks/<slug>/feature.json` from start to finish with one step at a time. Don't stop until it's done.

Task folder `tasks/<slug>/`: the slug you were given. 

Don't overload your main context. Orchestrate only — spawn subagents, don't fix code yourself

## Config

If `.feature-json.config.json` exists in the repo root, read it first. Follow every line in `orchestrate.instructions`. The file format is in skill `feature-json-config`.

### Models

`plan.model`, `implement.model`, `review.model` (step review) and `noCommentsReview.model` set the model for each role. A `model` is a herdr-fleet agent name or a model id. Before the first step, decide how each role runs:

1. Find the agent with this name, else the agent with this `model`, in `.herdr-fleet.config.json` in the repo root (skill `herdr-fleet`, use it, it's important). IT'S IMPORTANT TO USE HERDR IF `.herdr-fleet.config.json` exist and model is from different harness
2. Otherwise stop before the first step. Tell the user which role cannot run and why: the model is not available here, no herdr-fleet agent has it, or you are not inside Herdr.

If you can't find .herdr-fleet.config.json or herdr is not installed, ask user what models to use

Use the same rules for `orchestrate.agents[].model` and for a model named in `orchestrate.instructions`.

"Agent" below means a subagent or a Herdr agent, whichever the role got.

Herdr run dir (`R` in `herdr-fleet`) is always `tasks/<slug>/orchestrate/`, one for the whole task. It holds prompts, reports, screenshots and secrets, so it must be in `.gitignore` (`tasks/*/orchestrate/`). If it is not, add that line before the first launch. Never commit it.

### Extra agents

`orchestrate.agents` lists project agents on top of the loop. For each entry, start a new agent on its `model` when its `when` says, and give it its `instructions`

### Fresh context

Each phase of each step gets a new agent. Keep the implementer only until its Fix ends. No `/new`: start a new agent.

## Loop

1. Read `tasks/<slug>/feature.json` (including relatedSources) and `tasks/<slug>/progress.txt`
2. While any user step has `passes: false`, run **Plan → Implement → Review → Fix** for the highest-priority pending step (`passes: false`, lowest `priority` number).
Same 3 phases for every step in feature.json (if user didn't specify smth different)
The next step starts only after that gate passes, including its Plan phase: steps run strictly one after another, so never plan the next step in parallel with the current one.
### Plan (agent)

Agent should use skill `feature-json-create-step-plan`. Plan should be written to `tasks/<slug>/plans/<step-id>.md`.

### Implement (agent)

Agent should use skill `feature-json-implement-step`. Pass the step id and the plan path `tasks/<slug>/plans/<step-id>.md`. Save the subagent id (`resume` id).

### Review (agents in parallel)

Spawn all at once

- `feature-json-step-review` on `review.model`
- `feature-json-no-comments-review` on `noCommentsReview.model`

### Fix

- If reviews have no comments at all set `passes: true`, append a one-line review note to `progress.txt`, continue to the next step.
- If there are findings: **resume the same implementer** once, paste all review outputs. Then set `passes: true` (even if it skipped some nits) and continue
- You are not deciding what should be fixed. Implementer will take this decision.
