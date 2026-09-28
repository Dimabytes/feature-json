# Feature JSON

Complete stack to do work with complex, multistep tasks that don't fit in one context window.

When AI agent work on complex task that produce thousands lines of code it will have fewer bugs and produce much better code
if you split the task into steps and plan, implement and review each step individually.

Turn a task into `feature.json`, then plan → implement → step-review until every user story passes.

## How to use this

1. Ask the agent to run **/feature-json-init** on your task / PRD / plan. 
2. Review `tasks/<slug>/feature.json` and correct it. It's super important to invest your time at this stage. 

Then it depends. If you want more control you can run each step of the loop by yourself and check things manually.  

To do it you just run for each step

1. /feature-json-manual-create-step-plan (it will interview you and create plan)
2. /feature-json-implement-step and pass the file you generated on previous step
3. /feature-json-step-review (and tell it what to review)

If you want to automate this loop you can just run /feature-json-orchestrate. It will do same steps.

## What is `feature.json`

It's a file where you have all your steps described.

## Project config

Optional `.feature-json.config.json` in the repo root, committed with the project. It sets the model for plan / implement / review and extra rules for each phase. No file → the default loop on the current model.

Run **/feature-json-config** once per project. It asks you questions and writes the file. Run it again to change a model or add a rule. The format and an example are in [`skills/feature-json-config/SKILL.md`](skills/feature-json-config/SKILL.md).

A model that the current harness cannot run (e.g. Devin from Claude Code) needs [herdr-fleet](https://github.com/Dimabytes/herdr-fleet).

## Skills

| Skill                           | Role                                                      |
| ------------------------------- |-----------------------------------------------------------|
| `feature-json-config`           | Create or change `.feature-json.config.json` (once per project) |
| `feature-json-init`             | Create `tasks/<slug>/feature.json`                        |
| `feature-json-create-step-plan` | Plan the next step                                        |
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
npx skills update
```

## Folder convention

| Path                           | Meaning                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `tasks/<slug>/`                | One task: `feature.json`, `progress.txt`, `plans/`, … Done tasks stay here |
| `.feature-json.config.json`     | Optional project config, see [Project config](#project-config) |

## Attribution

The `feature.json` shape and the create / plan / implement skill loop are adapted from [snarktank/ralph](https://github.com/snarktank/ralph) and its `prd.json` workflow (user stories with `passes`, priority order, implement-until-done). This package renames and extends that idea and adds orchestrate + step-review.

`feature-json-step-review` adapts Cursor’s Thermos maintainability rubric (MIT). See [NOTICE](./NOTICE).

## License

MIT — see [LICENSE](./LICENSE).
