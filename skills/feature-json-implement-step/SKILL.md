---
name: feature-json-implement-step
description: Implements a specific user story from feature.json. Requires the exact story number and an execution plan as input. Reads the PRD, feature spec, then implements, tests, commits. Invoke manually or via feature-json-orchestrate.
---

## Your Task

1. Read `current-task/feature.json`
2. Read relatedSources in `current-task/feature.json`
3. Pick story specified by user. Work only on that story.
4. Implement that user story
5. Run the project's appropriate type check and linter check commands — both must pass with 0 errors. Use the project's package scripts, docs, or learnings to identify the correct commands instead of assuming fixed script names. 
6. Update the PRD to set `passes: true` for the completed story 
7. Commit the changes. When the project has no such convention, use message: `feat: [Story ID] - [Story Title]`.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

save `current-task/learnings.txt` if something will be needed for next stories

## Important

- Work only on story specified in the task.
- Do git branch operations inside the actual project repo you are changing, not automatically in the outer workspace repo.
- Do not require a story-specific branch name such as `UserStory1` or a branch per story.
- Reuse the current feature branch when appropriate, or create a general feature branch name that can hold multiple story commits for the same feature.
- Never run a destructive git command (force push, hard reset, branch -D, no-verify) without explicit approval - already in AGENTS.md but worth restating.
- Keep CI green
