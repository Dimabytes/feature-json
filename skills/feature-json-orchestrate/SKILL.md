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

Drive `tasks/<slug>/feature.json` from start to finish. Run one step at a time, unless the user asks for [Parallel mode](#parallel-mode). Don't stop until it's done: every step passes or is cancelled.

Task folder `tasks/<slug>/`: the slug you were given. 

Don't overload your main context. Orchestrate only — spawn subagents, don't fix code yourself

## Config

If `.feature-json.config.json` exists in the repo root, read it first. Follow every line in `orchestrate.instructions`. The file format is in skill `feature-json-config`.

### Models

`implement.model`, `review.model` (step review) and `groupReview.model` (group review; no field → `review.model`) set the model for each role. A `model` is a herdr-fleet agent name or a model id. Before the first step, decide how each role runs:

1. Find the agent with this name, else the agent with this `model`, in `.herdr-fleet.config.json` in the repo root (skill `herdr-fleet`, use it, it's important). IT'S IMPORTANT TO USE HERDR IF `.herdr-fleet.config.json` exist and model is from different harness
2. Otherwise stop before the first step. Tell the user which role cannot run and why: the model is not available here, no herdr-fleet agent has it, or you are not inside Herdr.

If you can't find .herdr-fleet.config.json or herdr is not installed, ask user what models to use

Use the same rules for `orchestrate.agents[].model` and for a model named in `orchestrate.instructions`.

"Agent" below means a subagent or a Herdr agent, whichever the role got.

Herdr run dir (`R` in `herdr-fleet`) is always `tasks/<slug>/orchestrate/`, one for the whole task. It holds prompts, reports, screenshots and secrets. The whole `tasks/` folder is in `.gitignore`. Before the first launch, check it with `git check-ignore -q tasks/<slug>/orchestrate/`; if it is not ignored, add `tasks/` to `.gitignore`. Never commit it.

### Extra agents

`orchestrate.agents` lists project agents on top of the loop. For each entry, start a new agent on its `model` when its `when` says, and give it its `instructions`

### Fresh context

Each phase of each step gets a new agent. Keep the implementer only until its step passes. No `/new`: start a new agent.

### Your notes

Keep your own state in `tasks/<slug>/orchestrate/notes.md`. `progress.txt` is for implementers: what was built and what the next step must know. `notes.md` is for you: what you need to continue after a context compaction.

- which agent runs which step: agent name, working copy, base commit, phase;
- long checks that run now, and where their output goes;
- what the user decided about the process in chat: models, review rules, order of steps;
- what waits for the user.

Update it after every state change. After a context compaction, read it before you do anything else.

## Loop

1. Read `tasks/<slug>/feature.json` (including relatedSources) and `tasks/<slug>/progress.txt`
2. While any step has `passes: false`, run **Implement → Review → Fix → Long checks** for the highest-priority pending step (`passes: false`, lowest `priority` number). A step with `manual: true` runs [Manual](#manual) instead. A step with `reviewOf` runs [Group review](#group-review) instead. A step with `"skipReview": true` skips Review and Fix: after Implement it goes straight to [Long checks](#long-checks).
Same phases for every step in feature.json (if user didn't specify smth different)
The next step starts only after that gate passes: steps run strictly one after another, so never start the next step in parallel with the current one.

Skip every step with `"cancelled": true`. Never run it. It does not have to pass, and in a `dependsOn` it counts as passed.

Only you set `passes: true`. The implementer does not.

### Implement (agent)

Agent should use skill `feature-json-implement-step`. Pass the step id. Save the subagent id (`resume` id).

Tell the implementer:

- an orchestrator runs it, so it does not set `passes`;
- before it reports, it runs only the quick checks of the step: lint, typecheck, unit tests;
- it does not start the [long checks](#long-checks) of the step. They run after the review.

### Review (agents in parallel)

Start the review as soon as the implementer reports. The review reads code, so it does not wait for any long check.

A step with `"skipReview": true` gets no review: start no reviewer and no extra Review agent for it. Never skip the review of a step without this field.

Spawn `feature-json-step-review` on `review.model` and the extra agents whose `when` is Review, all at once.

### Fix

- If reviews have no comments at all, append a one-line review note to `progress.txt` and go to [Long checks](#long-checks).
- If there are findings: **resume the same implementer** once, paste all review outputs. Then go to [Long checks](#long-checks), even if it skipped some nits.
- You are not deciding what should be fixed. Implementer will take this decision.

The review runs once per step. A second round is allowed only when the Fix was about as large as the step itself, or added a large new module. Then review only the diff of the Fix and resume the same implementer with the findings. There is no third round.

### Long checks

A long check is a check in the step's `changes` that takes more than about 15 minutes: a full replay, a backtest, a full parity gate, long qa.

- Long checks run after Review and Fix, never before the review. This holds even when the step lists them.
- Run each long check once, on the code after Fix. Ask the implementer to run it, unless the project rules give long runs to you.
- If a long check is red, resume the same implementer with the output. Then run that check again.
- A step with no long checks skips this phase.

When every check of the step is green, set `passes: true` and continue to the next step.

### Group review

A step with `reviewOf` is a review of several steps together. The format is in skill `feature-json-init` → "Group review steps". It skips Implement.

1. **Review.** Start a new agent on `groupReview.model`; with no such field, on `review.model`. Start the extra agents whose `when` names the group review. Give each reviewer:
   - the step: its `reviewOf`, `description` and `changes`;
   - the range to read: from the commit before the first step of `reviewOf` to the current head of the branch;
   - every line of `groupReview.instructions`;
   - the task. Report findings only, do not edit code. Do not repeat the step reviews line by line. Check every entry of `changes`. Look at how the steps fit together: two steps that contradict each other, a contract between steps that nobody owns, a check that passes for the wrong reason, code that a later step made dead or duplicate, and whether the steps work together.
2. **Fix.** With no findings, go to [Long checks](#long-checks). With findings, start a new agent with skill `feature-json-implement-step`, pass the id of the review step and all review outputs. The implementers of the reviewed steps are gone, so this agent fixes the findings, and it decides what to fix. The second-round rule of [Fix](#fix) applies.
3. **Long checks**, as for any step. Then set `passes: true` and append a one-line review note to `progress.txt`.

The next step starts only after the review step passes. Do not run a group review in the background of later steps.

### Manual

A step with `manual: true` is done by the user. It skips Implement, Review, Fix and Long checks.

1. Show the user the step: title, description and `changes`.
2. Wait until the user says it is done.
3. Set `passes: true` and append a one-line note to `progress.txt`.

## Parallel mode

Run it only when the user asks for it. Otherwise run the [Loop](#loop). The Loop ignores `dependsOn` and `track`: every step works in the main checkout.

The format of `dependsOn`, `track` and `tracks` is in skill `feature-json-init` → "Parallel steps".

Before the first step, check the file:

- every step has `dependsOn`;
- every id in a `dependsOn` exists and has a lower `priority`;
- every `track` is a key of `tracks`;
- every id in a `reviewOf` exists and is in the `dependsOn` of that step.

If a check fails, stop and tell the user what to fix. If no step has `dependsOn`, the file is sequential: tell the user and run the Loop.

A pending step is **ready** when both are true:

- every step in its `dependsOn` has `passes: true`. A step with `"dependsOn": []` depends on nothing;
- no other step of its `track` is running.

A step counts as passed only when you set `passes: true`: after its Fix and its long checks. A step with `"cancelled": true` is never ready, and in a `dependsOn` it counts as passed.

1. Start every ready step. If several ready steps share a track, start the one with the lowest `priority`. Each step runs Implement → Review → Fix → Long checks (without Review and Fix when it has `"skipReview": true`), or Group review, or Manual, as in the Loop.
2. When a step passes, find the steps that became ready and start them. A manual step that waits for the user holds back only the steps that depend on it.
3. Stop when every step passes or is cancelled.

### Where a step works

- A step with a `track` works in the working copy that `tracks` names. Before the first step of a track, create this working copy by the project rules. Give its path to the implementer and to the reviewers of every step of the track.
- A step without a `track` works in the main checkout. Ready steps without a track run there at the same time.

When a track has its own branch:

- Before a step of the track starts, merge the base branch into the track branch.
- After a step of the track passes, merge the track branch into the base branch. Then run the project's tests on the base branch. If the merge has conflicts or the tests fail, resume the implementer of that step to fix it.
- Do this merge before you start the steps that became ready.

Tell every implementer:

- the path of its working copy, and to work only there;
- other agents work on other steps at the same time;
- `feature.json`, `progress.txt` and the repo can change under them;
- re-read a file right before editing it, change only the lines of their own step, and keep the changes of other agents;
- append to `progress.txt`;
- commit only their own files; if a commit fails on `index.lock`, wait and retry.

Edit `feature.json` and `progress.txt` the same way yourself.
