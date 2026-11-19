# Feature JSON

Complete stack to do work with complex, multistep tasks that don't fit in one context window.

When AI agent work on complex task that produce thousands lines of code it will have fewer bugs and produce much better code
if you split the task into steps and plan, implement and review each step individually.

Turn a task into `feature.json`, then implement → step-review each step until every step passes.

## How to use this

1. Ask the agent to run **/feature-json-init** on your task / PRD / plan. 
2. Review `tasks/<slug>/feature.json` and correct it. It's super important to invest your time at this stage. 

Then it depends. If you want more control you can run each step of the loop by yourself and check things manually.  

To do it you just run for each step

1. /feature-json-manual-create-step-plan (it will interview you and create plan)
2. /feature-json-implement-step and pass the file you generated on previous step
3. /feature-json-step-review (and tell it what to review)

If you want to automate this loop you can just run /feature-json-orchestrate. It runs implement → review → fix → long checks for each step. The implementer plans the step itself, without a plan file. Checks that take more than about 15 minutes run once, after the review and the fix.

## What is `feature.json`

It's a file where you have all your steps described.

Optional step fields:

- `"manual": true` — a person does the step: a sign-off, a deploy. `/feature-json-orchestrate` shows the step and waits for you.
- `"dependsOn": ["STEP-003"]` — **when** the step can start: after these steps pass. `[]` means it can start at once. If one step has `dependsOn`, every step has it.
- `"track": "api"` — **where** the step works. A track is one working copy with its own branch, for example a git worktree. Steps of one track never run at the same time. The top-level `"tracks"` says where each track works.
- `"skipReview": true` — a small simple step: `/feature-json-orchestrate` runs no code review for it. Its checks still run.
- `"reviewOf": ["STEP-004", "STEP-005"]` — the entry is a group review with the id `REVIEW-001`, not `STEP-…`: one review of several connected steps together, after all of them pass. It looks at how the steps fit together, which a one-step review cannot see. Later steps wait for it.
- `"cancelled": true` — the step was dropped after the task started. `/feature-json-orchestrate` skips it, and steps that depend on it can start.

By default orchestrate runs one step at a time in `priority` order. Ask it to run steps in parallel, and it starts every step whose dependencies passed and whose track is free. The full rules are in [`skills/feature-json-init/SKILL.md`](skills/feature-json-init/SKILL.md) → "Parallel steps".

## Viewer

**https://dimabytes.github.io/feature-json/** — read a `feature.json` in the browser instead of the raw JSON.

- Drop the file on the page or click **Open…**. The file stays in your browser and is never uploaded.
- **Steps**: every step with its status (passed, ready to start, blocked, cancelled), filters by status and track, search, and a card with `changes`, `dependsOn`, the steps it blocks and its reviews. Keys `j` / `k` move between steps.
- **Graph**: one lane per track, columns by dependency depth. Hover a step to trace its chain, click to open it.
- Requirements, resolved questions, non-goals, sources and tracks get their own tabs, and so does any other top-level key.
- **Warnings** lists what breaks the rules of `feature-json-init`: unknown or cyclic dependencies, duplicate ids, unknown tracks.
- In Chrome, Edge, Arc or Brave the page redraws by itself when the file changes on disk, so you can keep it open while `/feature-json-orchestrate` runs. **Recent** reopens a file after a page reload.

The source is plain HTML and JS in [`docs/`](docs/), with no build step. To run it locally: `python3 -m http.server -d docs` and open http://localhost:8000.

## Project config

Optional `.feature-json.config.json` in the repo root, committed with the project. It sets the model for plan / implement / review and extra rules for each phase. No file → the default loop on the current model.

Run **/feature-json-config** once per project. It asks you questions and writes the file. Run it again to change a model or add a rule. The format and an example are in [`skills/feature-json-config/SKILL.md`](skills/feature-json-config/SKILL.md).

A model that the current harness cannot run (e.g. Devin from Claude Code) needs [herdr-fleet](https://github.com/Dimabytes/herdr-fleet).

## Skills

| Skill                           | Role                                                      |
| ------------------------------- |-----------------------------------------------------------|
| `feature-json-config`           | Create or change `.feature-json.config.json` (once per project) |
| `feature-json-init`             | Create `tasks/<slug>/feature.json`                        |
| `feature-json-manual-create-step-plan` | Plan the next step with an interview                |
| `feature-json-implement-step`   | Implement step                                            |
| `feature-json-step-review`      | Strict maintainability review                             |
| `feature-json-orchestrate`      | Run the loop until every step passes                      |

Every task lives in `tasks/<slug>/`.

## Install

Install via the [Skills CLI](https://github.com/vercel-labs/skills) (`npx skills`). Requires **Node.js 18+**.

```bash
# Global (user-level)
npx skills add Dimabytes/feature-json -g --skill '*'

# Project level
npx skills add Dimabytes/feature-json --skill '*'
```

Update later:

```bash
npx skills update -g
```

## Folder convention

| Path                           | Meaning                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `tasks/<slug>/`                | One task: `feature.json`, `progress.txt`, `plans/`, … Done tasks stay here |
| `.feature-json.config.json`     | Optional project config, see [Project config](#project-config) |
| `tasks/<slug>/orchestrate/`    | Herdr run dir of `feature-json-orchestrate`: prompts, reports, screenshots, secrets. The whole `tasks/` folder is in `.gitignore` |

## Attribution

The `feature.json` shape and the create / plan / implement skill loop are adapted from [snarktank/ralph](https://github.com/snarktank/ralph) and its `prd.json` workflow (user stories with `passes`, priority order, implement-until-done). This package renames and extends that idea and adds orchestrate + step-review.

`feature-json-step-review` adapts Cursor’s Thermos maintainability rubric (MIT). See [NOTICE](./NOTICE).

## License

MIT — see [LICENSE](./LICENSE).
