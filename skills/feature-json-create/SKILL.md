---
name: feature-json-create
description: "Convert task into feature.json format."
---

## The Job

1. Take user input (PRD, RFC, task description, etc.)
2. Read it carefully to understand the requirements.
3. Ask for clarifications (you will use answers to fill Resolved Questions section). Interview in detail using the tool you have.
   Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs. Don't ask obvious questions, dig into the hard parts I might not have considered.
4. Create `current-task/feature.json` (create the `current-task/` folder if needed).

Active work always lives in `current-task/`. When `feature-json-orchestrate` finishes every story, it moves that folder to `docs/completed-tasks/<short-slug>/`.

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
   "userStories": [
      {
         "id": "US-001",
         "title": "Add status field to tasks table",
         "description": "As a developer, I need to store task status in the database so that other features can read and write status.",
         "changes": [
            "Add status column: 'pending' | 'in_progress' | 'done' (default 'pending')",
            "Generate and run migration successfully",
            "Add or update automated tests covering the new backend behavior",
            "Tests pass",
            "Typecheck passes"
         ],
         "priority": 1,
         "passes": false,
         "designReference": []
      },
      {
         "id": "US-002",
         "title": "Display status badge on task cards",
         "description": "As a user, I want to see task status at a glance so that I know which tasks need attention.",
         "changes": [
            "Each task card shows a colored status badge",
            "Badge colors: gray=pending, blue=in_progress, green=done",
            "Typecheck passes",
            "Verify in browser using agent-browser skill"
         ],
         "priority": 2,
         "passes": false,
         "designReference": []
      },
      {
         "id": "US-003",
         "title": "Add status toggle to task list rows",
         "description": "As a user, I want to change task status directly from the list so that I can update progress quickly.",
         "changes": [
            "Each row has a status dropdown or toggle",
            "Changing status saves immediately via server action",
            "UI updates without page refresh",
            "Typecheck passes",
            "Verify in browser using agent-browser skill"
         ],
         "priority": 3,
         "passes": false,
         "designReference": []
      },
      {
         "id": "US-004",
         "title": "Filter tasks by status",
         "description": "As a user, I want to filter the list to see only certain statuses so that I can focus on relevant tasks.",
         "changes": [
            "Filter dropdown has options: All, Pending, In Progress, Done",
            "Filter persists in URL params",
            "Typecheck passes",
            "Verify in browser using agent-browser skill"
         ],
         "priority": 4,
         "passes": false,
         "designReference": []
      }
   ]
}
```

In designReference field, add Figma link or path to images.

---

## Story Size: The Number One Rule

**Each story must be completable in one context window, around 128k tokens.**

### Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" - Split into: schema, queries, UI components, filters
- "Add authentication" - Split into: schema, middleware, login UI, session handling
- "Refactor the API" - Split into one story per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

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

Each story has a `changes` array. Each entry is one concrete thing the story does to the codebase, or a verification step required to call the story done.

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

Verification steps live in the `changes` array as the final entries of the story. They represent the proofs that the story is done.

Always include as the final entry:
```
"Typecheck passes"
```

For stories with unit-testable logic include:
```
"Add or update automated tests"
"Tests pass"
```

For backend / API stories that add or change endpoints include:
```
"Run the backend locally and manually verify the changed endpoint or flow"
```

For stories that change browser UI include:
```
"Verify in browser using agent-browser mcp"
```

Mobile/hybrid app UI is verified in the browser via the project's dev server, not on a real device or simulator.

Frontend stories are NOT complete until visually verified.

---

## Conversion Rules

1. **Each user story becomes one JSON entry**
2. **IDs**: Sequential (US-001, US-002, etc.)
3. **Priority**: Based on dependency order, then document order
4. **All stories**: `passes: false`
---
