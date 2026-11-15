---
name: feature-json-orchestrate
description: >
  Run the full feature.json loop until every step passes: implement each
  pending step, review it with feature-json-step-review and send the
  findings back to the implementer. Use when the user says
  orchestrate feature.json, run all steps, run steps in parallel, or
  finish the current feature.
---

# Feature JSON Orchestrate

Drive `tasks/<slug>/feature.json` from start to finish. Run one step at a time, unless the user asks for [Parallel mode](#parallel-mode). Don't stop until it's done.

Task folder `tasks/<slug>/`: the slug you were given. 

Don't overload your main context. Orchestrate only — spawn subagents, don't fix code yourself

## Config

If `.feature-json.config.json` exists in the repo root, read it first. Follow every line in `orchestrate.instructions`. The file format is in skill `feature-json-config`.

### Models

`implement.model` and `review.model` (step review) set the model for each role. A `model` is a herdr-fleet agent name or a model id. Before the first step, decide how each role runs:

1. Find the agent with this name, else the agent with this `model`, in `.herdr-fleet.config.json` in the repo root (skill `herdr-fleet`, use it, it's important). IT'S IMPORTANT TO USE HERDR IF `.herdr-fleet.config.json` exist and model is from different harness
2. Otherwise stop before the first step. Tell the user which role cannot run and why: the model is not available here, no herdr-fleet agent has it, or you are not inside Herdr.

If you can't find .herdr-fleet.config.json or herdr is not installed, ask user what models to use

Use the same rules for `orchestrate.agents[].model` and for a model named in `orchestrate.instructions`.

"Agent" below means a subagent or a Herdr agent, whichever the role got.

Herdr run dir (`R` in `herdr-fleet`) is always `tasks/<slug>/orchestrate/`, one for the whole task. It holds prompts, reports, screenshots and secrets. The whole `tasks/` folder is in `.gitignore`. Before the first launch, check it with `git check-ignore -q tasks/<slug>/orchestrate/`; if it is not ignored, add `tasks/` to `.gitignore`. Never commit it.

### Extra agents

`orchestrate.agents` lists project agents on top of the loop. For each entry, start a new agent on its `model` when its `when` says, and give it its `instructions`

### Fresh context

Each phase of each step gets a new agent. Keep the implementer only until its Fix ends. No `/new`: start a new agent.

## Loop

1. Read `tasks/<slug>/feature.json` (including relatedSources) and `tasks/<slug>/progress.txt`
2. While any step has `passes: false`, run **Implement → Review → Fix** for the highest-priority pending step (`passes: false`, lowest `priority` number). A step with `manual: true` runs [Manual](#manual) instead.
Same phases for every step in feature.json (if user didn't specify smth different)
The next step starts only after that gate passes: steps run strictly one after another, so never start the next step in parallel with the current one.

### Implement (agent)

Agent should use skill `feature-json-implement-step`. Pass the step id. Save the subagent id (`resume` id).

### Review (agents in parallel)

Spawn `feature-json-step-review` on `review.model` and the extra agents whose `when` is Review, all at once.

### Fix

- If reviews have no comments at all set `passes: true`, append a one-line review note to `progress.txt`, continue to the next step.
- If there are findings: **resume the same implementer** once, paste all review outputs. Then set `passes: true` (even if it skipped some nits) and continue
- You are not deciding what should be fixed. Implementer will take this decision.

### Manual

A step with `manual: true` is done by the user. It skips Plan, Implement, Review and Fix.

1. Show the user the step: title, description and `changes`.
2. Wait until the user says it is done.
3. Set `passes: true` and append a one-line note to `progress.txt`.

## Parallel mode

Run it only when the user asks for it. Otherwise run the [Loop](#loop).

A pending step is **ready** when every step in its `dependsOn` has `passes: true`. A step without `dependsOn` is ready when every step with a lower `priority` has `passes: true`. A step counts as passed only after its Fix ends: the `passes: true` that the implementer sets before review does not count.

1. Start every ready step. Each one runs Implement → Review → Fix, or Manual, as in the Loop.
2. When a step passes, find the steps that became ready and start them. A manual step that waits for the user holds back only the steps that depend on it.
3. Stop when every step passes.

Each step writes its code where the project rules and the task's `relatedSources` say.

Tell every implementer:

- other agents work on other steps at the same time;
- `feature.json`, `progress.txt` and the repo can change under them;
- re-read a file right before editing it, change only the lines of their own step, and keep the changes of other agents;
- append to `progress.txt`;
- commit only their own files; if a commit fails on `index.lock`, wait and retry.

Edit `feature.json` and `progress.txt` the same way yourself.
