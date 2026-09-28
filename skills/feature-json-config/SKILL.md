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
      "Before creating a branch, read skill `my-branch-rules` and follow it.",
      "In Review, after `feature-json-step-review`, run skill `my-conventions-review` as a separate agent. Give its findings to the implementer too."
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
  }
}
```

Every field is optional. No file → the default loop on the current model.

| Field          | In                      | Meaning                                                                                         | Read by                    |
| -------------- | ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- |
| `instructions` | every section           | extra rules for that phase, one line each. To use a skill, write "Read skill `x` and follow it." | the skill of that phase    |
| `model`        | plan, implement, review | model id for that role. No field → current model                                                | `feature-json-orchestrate` |

Section → skill that reads its `instructions`:

| Section       | Skill                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `init`        | `feature-json-init`                                                    |
| `orchestrate` | `feature-json-orchestrate`                                             |
| `plan`        | `feature-json-create-step-plan`, `feature-json-manual-create-step-plan` |
| `implement`   | `feature-json-implement-step`                                          |
| `review`      | `feature-json-step-review`                                             |

An extra review pass is a line in `orchestrate.instructions`, because orchestrate starts the review agents.

How orchestrate runs a `model` (own subagent, Herdr agent, or stop) is in `feature-json-orchestrate` → "Models".

## Steps

1. If `.feature-json.config.json` exists, read it. You change it, you do not replace it.
2. Collect options:
   - Models: the current model. If `.herdr-fleet.config.json` exists in the repo root, every `model` in it, with its agent name and `notes`.
   - Project skills: skill folders in `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, `.shared-skills/`. Offer review skills as extra review passes in `orchestrate.instructions`, other skills as instructions for their phase.
3. Ask the user with the platform question tool (Cursor: `AskQuestion`, Claude Code: `AskUserQuestion`):
   - model for plan, implement, review;
   - extra review passes;
   - extra rules per phase (free text).

   If the user asked for one change ("add reviewer X"), ask only about that.
4. Write the file as 2-space JSON. Leave out empty fields and empty sections.
5. Show the final file to the user.
