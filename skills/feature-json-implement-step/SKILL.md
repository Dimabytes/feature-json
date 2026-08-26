---
name: feature-json-implement-step
description: Payflow Implements a specific user story from feature.json. Requires the exact story number and an execution plan as input. Reads the PRD, feature spec, and progress log, then implements, tests, commits, and logs progress. This skill must only be invoked manually by the user — never auto-triggered by other skills or agents.
disable-model-invocation: true
---

## Your Task

1. Read `current-task/feature.json` (including relatedSources) and `current-task/progress.txt`
2. Pick story(s) specified by user. Work only on those stories.
3. Implement those user stories.
4. Run the project's appropriate type check and linter check commands.
5. Update the PRD to set `passes: true` for the completed story
6. Append your progress to `current-task/progress.txt`
7. Commit the changes. When the project has no such convention, use message: `feat: [Story ID] - [Story Title]`.

Progress Report Format
APPEND to progress.txt (never replace, always append, create file if missing):
This progress will be used by future agents to understand where things stand

## [Date/Time] - [Story ID]

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
Sometimes reviewer can mark things as NIT when it's actually not NIT. Sometimes vise verca.
