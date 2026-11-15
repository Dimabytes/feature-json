---
name: feature-json-implement-step
description: Implements a specific step from feature.json. Requires the exact step id; an execution plan is optional. Reads the feature spec and progress log, plans the step itself when no plan is given, then implements, tests, commits, and logs progress. This skill must only be invoked manually by the user — never auto-triggered by other skills or agents.
---

## Your Task

If `.feature-json.config.json` exists in the repo root, follow every line in `implement.instructions`.

Task folder `tasks/<slug>/`: the slug you were given.

1. Read `tasks/<slug>/feature.json` (including relatedSources) and `tasks/<slug>/progress.txt`
2. Pick step(s) specified by user. Work only on those steps.
3. If you got a plan, follow it. Otherwise plan the step yourself before writing code: read the code it touches and the `relatedSources` it needs, think through edge cases and tradeoffs, and pick the checks from its `changes`. Keep this plan in your context, not in a file.
4. Implement those steps.
5. Run the project's appropriate type check and linter check commands.
6. Update `feature.json` to set `passes: true` for the completed step
7. Append your progress to `tasks/<slug>/progress.txt`
8. Commit the changes. When the project has no convention, use message: `feat: [step ID] - [step Title]`.

Progress Report Format
APPEND to progress.txt (never replace, always append, create file if missing):
This progress will be used by future agents to understand where things stand

## [Date/Time] - [step ID]

- What was implemented
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")

---

Keep is short. Small sentences. Bullet points.

## Important

- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- By default use the current feature branch.

## If you are running as subagent

If the parent resumes you with review findings: fix it. Don't be lazy, but sometimes reviewer can do mistakes.
Sometimes reviewer can mark things as NIT when it's actually not NIT. Sometimes vise versa.
