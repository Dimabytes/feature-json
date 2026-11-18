---
name: feature-json-init
description: "Convert task into feature.json format."
---

## The Job

If `.feature-json.config.json` exists in the repo root, follow every line in `init.instructions`.

1. Take user input (PRD, RFC, task description, etc.)
2. Read it carefully to understand the requirements.
3. Ask for clarifications (you will use answers to fill Resolved Questions section). Interview in detail using the tool you have.
   Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs. Don't ask obvious questions, dig into the hard parts I might not have considered.
4. Create `tasks/<slug>/feature.json`. `<slug>` is a short kebab-case name of the task, e.g. `task-status`. If the folder exists, ask for another name.
---

## Output Format

```json
{
   "project": "TaskApp",
   "relatedSources": [],
   "Functional Requirements Summary": [
      "FR-1: Persist task status (pending/in-progress/done) in database",
      "FR-2: Display status badge on each task card",
      "FR-3: Toggle task status directly from the task list",
      "FR-4: Filter task list by status"
   ],
   "Resolved Questions": [],
   "Non-Goals (Out of Scope for V1)": [
      "Status change history or audit log",
      "Custom user-defined statuses"
   ],
   "description": "Task Status Feature - Track task progress with status indicators",
   "steps": [
      {
         "id": "STEP-001",
         "title": "Add status field to tasks table",
         "description": "Add a status column to the tasks table. Later steps read and write it.",
         "changes": [
            "Add status column: 'pending' | 'in_progress' | 'done' (default 'pending')",
            "Generate and run migration successfully",
            "Add or update automated tests covering the new backend behavior",
            "Tests pass",
            "Typecheck passes"
         ],
         "priority": 1,
         "passes": false,
         "ticket": "",
         "designReference": []
      },
      {
         "id": "STEP-002",
         "title": "Display status badge on task cards",
         "description": "Show the status of each task as a colored badge on its card.",
         "changes": [
            "Each task card shows a colored status badge",
            "Badge colors: gray=pending, blue=in_progress, green=done",
            "Typecheck passes",
            "Verify in browser using agent-browser skill"
         ],
         "priority": 2,
         "passes": false,
         "ticket": "",
         "designReference": []
      },
      {
         "id": "STEP-003",
         "title": "Add status toggle to task list rows",
         "description": "Let the user change the status of a task from its row in the list.",
         "changes": [
            "Each row has a status dropdown or toggle",
            "Changing status saves immediately via server action",
            "UI updates without page refresh",
            "Typecheck passes",
            "Verify in browser using agent-browser skill"
         ],
         "priority": 3,
         "passes": false,
         "ticket": "",
         "designReference": []
      },
      {
         "id": "STEP-004",
         "title": "Filter tasks by status",
         "description": "Add a status filter to the task list.",
         "changes": [
            "Filter dropdown has options: All, Pending, In Progress, Done",
            "Filter persists in URL params",
            "Typecheck passes",
            "Verify in browser using agent-browser skill"
         ],
         "priority": 4,
         "passes": false,
         "ticket": "",
         "designReference": []
      }
   ]
}
```

In `designReference`, add Figma link or path to images.

`ticket` is the tracker key (Jira, Linear, etc.). Leave it `""` — the user fills it in later. Do not invent a key.

`description` is plain prose, 1–3 sentences: what the step does and why. A reader learns from it what the step is about.

### Optional step fields

Add them only when the task needs them.

- `"manual": true` — a person does the step: a sign-off, a deploy, a check only the user can run. `changes` lists what the person does and how to tell it is done, with no verification entries. The orchestrator shows the step and waits for the user.
- `"dependsOn"`, `"track"` and the top-level `"tracks"` — only when some steps can run at the same time. See [Parallel steps](#parallel-steps).
- `"skipReview": true` — the orchestrator runs no code review for the step. Use it for a small simple step with little or no logic to review: a rename, a config value, a file move, a command to run. The checks in `changes` still run. Set it only when the user asks for it or agrees to it. A `manual` step needs no flag: it has no review.
- `"reviewOf": ["STEP-004", "STEP-005"]` — the entry is a review of several steps together, not a step of work. Its `id` is `REVIEW-001`, not `STEP-…`. See [Group review steps](#group-review-steps).
- `"cancelled": true` — the step was dropped after the task started. Do not delete it: keep the step and add one line to its `description` that says who cancelled it, when and why. The orchestrator never runs it, and in a `dependsOn` it counts as passed. A new feature.json has no cancelled steps.

### Parallel steps

By default a feature.json is sequential: no step has `dependsOn` or `track`, and the steps run in `priority` order.

When some steps can run at the same time, describe it with two fields. `dependsOn` says **when** a step can start. `track` says **where** it works.

```json
{
   "tracks": {
      "api": "worktree ../app-api, branch feature-api",
      "ui": "worktree ../app-ui, branch feature-ui"
   },
   "steps": [
      { "id": "STEP-001", "priority": 1, "dependsOn": [] },
      { "id": "STEP-002", "priority": 2, "track": "api", "dependsOn": ["STEP-001"] },
      { "id": "STEP-003", "priority": 3, "track": "api", "dependsOn": ["STEP-002"] },
      { "id": "STEP-004", "priority": 4, "track": "ui", "dependsOn": ["STEP-001"] },
      { "id": "STEP-005", "priority": 5, "dependsOn": ["STEP-003", "STEP-004"] }
   ]
}
```

The example shows only the fields of this section. STEP-002 and STEP-004 start together after STEP-001. STEP-005 waits for both tracks.

`dependsOn`:

- If one step has `dependsOn`, every step has it. Never mix steps with and without it.
- It lists the steps that must pass before this step starts.
- `[]` means the step depends on nothing. It can start at once.
- Every step in `dependsOn` has a lower `priority` than this step.
- The order comes only from `dependsOn`. A track never sets the order.

`track`:

- A track is one working copy with its own branch, for example a git worktree. Steps of the same track never run at the same time. Steps of different tracks can.
- `tracks` at the top level has one entry per track: its name and one line that says where it works.
- Every `track` of a step is a key of `tracks`.
- A step without `track` works in the main checkout. Steps without a track can run there at the same time.
- A `manual` step has no `track`.
- Give two steps different tracks when they can run at the same time and edit the same files.

### Group review steps

A step review reads one step. A group review reads several connected steps together, after all of them pass: a phase of the task, a track before other work builds on it, the steps before a gate or a switch.

It looks for what a one-step review cannot see:

- two steps that contradict each other;
- a contract between steps that nobody owns: a type, a file format, a command;
- a check that passes for the wrong reason;
- code that a later step made dead or duplicate;
- whether the steps work together.

A group review is an entry of `steps` with `reviewOf` and a `REVIEW-` id:

```json
{
   "id": "REVIEW-001",
   "title": "Review of the import pipeline (STEP-004–006)",
   "description": "STEP-004–006 build the import pipeline. The export steps build on it next, so the three steps are checked together first.",
   "reviewOf": ["STEP-004", "STEP-005", "STEP-006"],
   "changes": [
      "The parser of STEP-004 and the writer of STEP-006 use one definition of the row format",
      "Every error that STEP-005 can raise reaches the report of STEP-006",
      "Tests pass"
   ],
   "priority": 7,
   "passes": false,
   "ticket": "",
   "designReference": []
}
```

- Its `id` is `REVIEW-001`, `REVIEW-002` and so on. Reviews are numbered apart from steps, in `priority` order, and `STEP-` numbers skip no number for a review: in the example the next step is `STEP-007` with `priority` 8. An entry has a `REVIEW-` id exactly when it has `reviewOf`.
- `reviewOf` lists the steps of the group. Each has a lower `priority` than the review step.
- `changes` lists what the review must check: one entry per joint or risk of the group. It plans no code. Code changes come from the findings.
- Put the review step right after the last step of its group.
- In a parallel file, its `dependsOn` holds every step of `reviewOf`. A step that builds on the group depends on the review step (`"dependsOn": ["REVIEW-001"]`), not on the steps of the group. This is what makes later work wait for the review.
- A review step has `track` when its fixes belong to one track.
- Do not add a group review for one step: the step review covers it.

Add group reviews where the user's plan names review phases. If the plan names none and the task has more than about 8 steps, ask the user whether to add one at the end of each phase.

---

## Step Size: The Number One Rule

**Each step must be completable in one context window, around 128k tokens.**

### Right-sized steps:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" - Split into: schema, queries, UI components, filters
- "Add authentication" - Split into: schema, middleware, login UI, session handling
- "Refactor the API" - Split into one step per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

**Size limit:** a step writes about 1000 meaningful lines of code at most. Tests, generated files and moved code count less than new logic, so this is an estimate, not an exact count. If a step needs clearly more, split it.

---

## step Ordering: Dependencies First

Steps execute in priority order. Earlier steps must not depend on later ones.

**Correct order:**
1. Schema/database changes (migrations)
2. Server actions / backend logic
3. UI components that use the backend
4. Dashboard/summary views that aggregate data

**Wrong order:**
1. UI component (depends on schema that does not exist yet)
2. Schema change

---

## Changes: Only What Actually Changes, And Must Be Verifiable

Each step has a `changes` array. Each entry is one concrete thing the step does to the codebase, or a verification step required to call the step done.

### Rule 1: List only what actually changes

Do NOT include status-quo statements, edge-case bullets that are not a change, or "existing behavior preserved" notes.

Bad (status-quo / unchanged-behavior bullets):
- "Existing validation logic is not modified"
- "Other valid rows in the same file continue processing"

Good (actual changes):
- "Add `status` column to tasks table with default 'pending'"
- "Move the edit page from `/settings/:orgId/item/:itemId` to a new admin route"
- "Add i18n translations for `itemNotFound` and `duplicateItemName`"

If a bullet describes how something keeps working the same, delete it.

### Rule 2: Each entry must be verifiable

The entry must be something AI/human can CHECK after the work is done.

Good (verifiable):
- "Filter dropdown has options: All, Active, Completed"
- "Clicking delete shows confirmation dialog"
- "Screen has: close (X) button top-left, Contacts title, add (+) button top-right"

Bad (vague):
- "Works correctly"
- "User can do X easily"
- "Good UX"
- "Handles edge cases"

### Required verification entries

Verification steps live in the `changes` array as the final entries of the step. They represent the proofs that the step is done.

Always include as the final entry:
```
"Typecheck passes"
```

For steps with unit-testable logic include:
```
"Add or update automated tests"
"Tests pass"
```

For backend / API steps that add or change endpoints include:
```
"Run the backend locally and manually verify the changed endpoint or flow"
```

For steps that change browser UI include:
```
"Verify in browser using agent-browser mcp"
```

Mobile/hybrid app UI is verified in the browser via the project's dev server, not on a real device or simulator.

Frontend steps are NOT complete until visually verified.

---

## Conversion Rules

1. **Each step becomes one JSON entry**
2. **IDs**: Sequential (STEP-001, STEP-002, etc.). Group reviews have their own sequence: REVIEW-001, REVIEW-002, etc.
3. **Priority**: Based on dependency order, then document order
4. **All steps**: `passes: false`
---
