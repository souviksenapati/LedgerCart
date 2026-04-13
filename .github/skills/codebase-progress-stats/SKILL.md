---
name: codebase-progress-stats
description: 'Analyze repository structure, identify backend/frontend modules, and report progress statistics with completion criteria. Use for codebase audits, sprint status updates, migration readiness, and implementation tracking.'
argument-hint: 'Scope and goal, e.g. "analyze backend routes and give progress stats for orders module"'
user-invocable: true
---

# Codebase Analysis And Progress Statistics

## What This Skill Produces
- A concise architecture map of the workspace.
- Measurable progress statistics by module or feature area.
- A confidence-rated status summary: green, yellow, or red.
- A short action list for next implementation steps.

## When To Use
- You need a quick project-wide status report before coding.
- You need module-level progress tracking for backend and frontend.
- You are preparing a handoff, sprint update, or implementation plan.
- You want a repeatable workflow instead of ad-hoc scanning.

## Required Inputs
- Repository root path.
- Progress intent: overall, per module, or per feature.
- Optional focus area (examples: orders, payments, admin pages, auth).

## Workflow
1. Confirm scope and reporting target.
- If scope is missing, default to whole workspace and note this assumption.
- If focus area is specified, prioritize those folders first.

2. Map high-level structure.
- Identify top-level apps and services.
- Detect major stacks (for example React frontend and Python backend).
- Record key entry points and routing layers.

3. Build module inventory.
- Count files in major areas (examples: backend routes, models, schemas, frontend pages/components).
- Group by functional domains (orders, products, customers, inventory, auth, console).
- Mark modules as "present" when at least one implementation file exists.

4. Measure progress.
- Compute simple completion metrics from discovered artifacts.
- Suggested formulas:
  - Module coverage % = implemented modules / planned modules * 100.
  - Feature page coverage % = existing pages / expected pages * 100.
  - API surface coverage % = existing route groups / expected route groups * 100.
- If expected counts are unknown, use a baseline-only report with current counts and call out missing target definitions.

5. Apply decision rules.
- Green: clear module coverage and no major missing core areas.
- Yellow: partial coverage or missing expected modules.
- Red: critical architectural gaps (for example missing auth, orders, or database model layer).

6. Validate quality signals.
- Confirm source counts exclude generated and dependency folders where possible.
- Cross-check that route, schema, and page layers are aligned for major features.
- Flag unclear ownership or naming inconsistencies.

7. Produce final report.
- Include architecture summary, statistics table, status color, assumptions, and next steps.
- Keep output short and operational.

## Completion Checks
- Scope and assumptions are explicit.
- At least 3 measurable statistics are reported.
- A status decision (green/yellow/red) is included.
- Next actions are concrete and prioritized.

## Output Template
Use this structure:

1. Scope
2. Architecture Snapshot
3. Statistics
4. Status (green/yellow/red) and rationale
5. Risks and assumptions
6. Next 3 actions

## LedgerCart Baseline Example (Observed)
Use these as reference numbers when no newer scan is available:
- app-frontend/src: 66 files
- console-frontend/src: 11 files
- backend/app: 60 files
- backend/app/routes: 39 files
- app-frontend/src/pages/admin: 24 files
- app-frontend/src/pages/store: 20 files
- console-frontend/src/pages: 4 files

## Example Prompts
- Analyze the codebase and give progress statistics for backend order flow.
- Give overall project progress stats with module coverage and risk flags.
- Report frontend admin versus store implementation progress.
- Analyze auth, orders, and payments readiness with a green/yellow/red status.
