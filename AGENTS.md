# Agent Instructions

This repository follows the shared agent baseline supplied by the active harness (concise communication, simplicity first, surgical changes, goal-driven execution). Repo-specific additions below.

## Project links

- **Linear project:** [Ivyward](https://linear.app/brennen-lester/project/ivyward-f73601c7fa30)
- **GitHub repo:** [brennenlester/ivyward](https://github.com/brennenlester/ivyward)

## Linear-first workflow

All implementation changes must be tied to a Linear issue in the **Ivyward** project.

| Mode | When to use | Cursor skill |
|------|-------------|--------------|
| Planning | Work has no issue yet, or needs to be broken into PR-sized issues | `linear-issue-planning` |
| Implementation | Executing a specific issue or logical bundle | `linear-issue` |

Rules:

- Do not make repo changes unless the work is tied to a Linear issue.
- If the user asks for a change without an issue, use `linear-issue-planning` first, then stop before implementation unless the user explicitly asks to continue.
- Use `linear-issue` when implementing a specific issue (e.g. `linear-issue BRE-6`).
- Keep implementation briefs, review cycles, and shipped notes in **Linear issue comments**, not committed repo markdown.

## Git conventions

- **Default branch:** `main`
- **Feature branches:** `codex/<issue-slug>` (e.g. `codex/bre-6-add-agentsmd-with-linear-first-workflow`)
- Prefer a dedicated worktree when the main checkout is dirty or the issue is non-trivial.
- Commit messages should reference the Linear issue ID.

## Documentation

- **Repo docs:** durable product, setup, architecture, and user-facing documentation (README, etc.).
- **Linear docs:** per-issue narrative — scope in the issue description; implementation/review/shipped notes in comments.
- Do not commit per-issue scratch markdown, implementation diaries, or review notes to the repo.

## Repo-specific conventions

<!-- Add project-specific rules here as the codebase grows -->
