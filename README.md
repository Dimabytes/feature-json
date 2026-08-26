# Feature JSON

Complete stack to do work with complex, multistep tasks that don't fit in one context window.

When AI agent work on complex task that produce thousands lines of code it will have fewer bugs and produce much better code
if you split the task into steps and plan, implement and review each step individually.

Turn a task into `feature.json`, then plan → implement → step-review until every user story passes.

## How to use this

1. Ask the agent to run **/feature-json-init** on your task / PRD / plan. 
2. Review `current-task/feature.json and correct`. It's super important to invest your time at this stage. 

Then it depends. If you want more control you can run each step of the loop by yourself and check things manually.  

To do it you just run for each step

1. /feature-json-manual-create-step-plan (it will interview you and create plan)
2. /feature-json-implement-step and pass the file you generated on previous step
3. /feature-json-step-review (and tell it what to review)

If you want to automate this loop you can just run /feature-json-orchestrate. It will do same steps.

## What is `feature.json`

It's a file where you have all your steps described.

## Skills

| Skill                           | Role                                                      |
| ------------------------------- |-----------------------------------------------------------|
| `feature-json-init`             | Create `current-task/feature.json`                        |
| `feature-json-create-step-plan` | Plan the next step                                        |
| `feature-json-implement-step`   | Implement step                                            |
| `feature-json-step-review`      | Strict maintainability review                             |
| `feature-json-orchestrate`      | Run the loop for all stories, then archive `current-task` |

Active work lives in `current-task/`.

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
| `current-task/`                | Active feature (`feature.json`, optional `learnings.txt`, …) |
| `docs/completed-tasks/<slug>/` | Archived completed feature (same tree, renamed)              |

## Attribution

The `feature.json` shape and the create / plan / implement skill loop are adapted from [snarktank/ralph](https://github.com/snarktank/ralph) and its `prd.json` workflow (user stories with `passes`, priority order, implement-until-done). This package renames and extends that idea and adds orchestrate + step-review.

`feature-json-step-review` adapts Cursor’s Thermos maintainability rubric (MIT). See [NOTICE](./NOTICE).

## License

MIT — see [LICENSE](./LICENSE).
