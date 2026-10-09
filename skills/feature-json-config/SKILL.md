---
name: feature-json-config
description: Create or change .feature-json.config.json in the project root — models for plan / implement / review and extra rules per phase. Asks the user, then writes the file. Use when the user says set up feature-json config, init the feature-json config, change the implement model, add a reviewer or a project rule for feature-json.
---

# Feature JSON Config

`.feature-json.config.json` lives in the repo root and is committed with the project. Create it once per project with this skill. Change it with this skill later. `feature-json-init` does not touch it: init is per task, this file is per project.

## Format

```json
{
  "init": {
    "instructions": []
  },
  "orchestrate": {
    "instructions": [
      "Before creating a branch, read skill `my-branch-rules` and follow it."
    ],
    "agents": [
      {
        "name": "conventions-review",
        "when": "Review, together with the default reviewers",
        "model": "grok-4.7-high",
        "instructions": ["Read skill `my-conventions-review` and follow it. Report findings only, do not edit code."]
      }
    ]
  },
  "plan": {
    "model": "grok-4.7-high",
    "instructions": []
  },
  "implement": {
    "model": "swe-2-max",
    "instructions": [
      "Read skill `my-branch-rules` and follow it.",
      "Put QA scripts in `tasks/<slug>/qa/` and commit them."
    ]
  },
  "review": {
    "model": "grok-4.7-high",
    "instructions": []
  },
  "noCommentsReview": {
    "model": "composer-2.5",
    "instructions": []
  }
}
```

Every field is optional. No file → the default loop on the current model.

| Field          | In                      | Meaning                                                                                         | Read by                    |
| -------------- | ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- |
| `instructions` | every section           | extra rules for that phase, one line each. To use a skill, write "Read skill `x` and follow it." | the skill of that phase    |
| `model`        | plan, implement, review, noCommentsReview | model id or herdr-fleet agent name for that role. No field → current model      | `feature-json-orchestrate` |
| `agents`       | orchestrate             | extra project agents. Each: `name`, `when` (phase or condition to run), `model`, `instructions` | `feature-json-orchestrate` |

Section → skill that reads its `instructions`:

| Section       | Skill                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `init`        | `feature-json-init`                                                    |
| `orchestrate` | `feature-json-orchestrate`                                             |
| `plan`        | `feature-json-create-step-plan`, `feature-json-manual-create-step-plan` |
| `implement`   | `feature-json-implement-step`                                          |
| `review`      | `feature-json-step-review`                                             |
| `noCommentsReview` | `feature-json-no-comments-review`                                 |

An extra review pass (or any extra agent) is an entry in `orchestrate.agents`, because orchestrate starts the agents.

How orchestrate runs a `model` (own subagent, Herdr agent, or stop) is in `feature-json-orchestrate` → "Models".

## Steps

1. If `.feature-json.config.json` exists, read it. You change it, you do not replace it.
2. Collect options:
   - Models: the current model. If `.herdr-fleet.config.json` exists in the repo root, every `model` in it, with its agent name and `notes`.
   - Project skills: skill folders in `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, `.shared-skills/`. Offer review skills as extra review passes in `orchestrate.agents`, other skills as instructions for their phase.
3. Ask the user with the platform question tool (Cursor: `AskQuestion`, Claude Code: `AskUserQuestion`):
   - model for plan, implement, review, noCommentsReview;
   - extra agents (review passes and others): when they run, model, instructions;
   - extra rules per phase (free text).

   If the user asked for one change ("add reviewer X"), ask only about that.
4. Write the file as 2-space JSON. Leave out empty fields and empty sections.
5. Show the final file to the user.
