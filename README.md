# Feature JSON

Turn a task into `feature.json`, then plan → implement → step-review until every user story passes.

Active work lives in `current-task/`. When orchestrate finishes the feature, that folder is moved to `docs/completed-tasks/<short-slug>/` and committed.

## Install

Install via the [Skills CLI](https://github.com/vercel-labs/skills) (`npx skills`). Requires **Node.js 18+**.

```bash
# Global (user-level)
npx skills add Dimabytes/feature-json -g --skill '*'

# Project level
npx skills add Dimabytes/feature-json --skill '*'
```

## Workflow

```text
task / PRD
   │
   ▼
feature-json-init          →  current-task/feature.json
   │
   ▼
feature-json-orchestrate
   ├─ create-step-plan
   ├─ implement-step
   └─ step-review (+ fix)
        …repeat per US…
   │
   ▼
docs/completed-tasks/<slug>/
```

## Skills

| Skill                           | Role                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| `feature-json-init`             | Interview, then write `current-task/feature.json`          |
| `feature-json-create-step-plan` | Plan the next `passes: false` story                        |
| `feature-json-implement-step`   | Implement one story, checks, commits, mark `passes: true`  |
| `feature-json-step-review`      | Strict maintainability review; fixes when orchestrate asks |
| `feature-json-orchestrate`      | Run the loop for all stories, then archive `current-task`  |

Update later:

```bash
npx skills update
```

## Usage

1. Ask the agent to run **feature-json-init** on your task / PRD.
2. Run **feature-json-orchestrate** to finish every pending user story.
3. When done, find the archived task under `docs/completed-tasks/<slug>/`.

You can also run plan / implement / step-review one story at a time.

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
