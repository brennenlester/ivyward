# Agent Instructions

This repository follows the shared agent baseline supplied by the active harness (concise communication, simplicity first, surgical changes, goal-driven execution). Repo-specific additions below.

## Project links

- **GitHub repo / issues:** [brennenlester/ivyward](https://github.com/brennenlester/ivyward)
- **Linear project (historical):** [Ivyward](https://linear.app/brennen-lester/project/ivyward-f73601c7fa30) — prefer GitHub Issues for new work

## GitHub-Issues-first workflow

All implementation changes must be tied to a GitHub issue in this repo.

| Mode | When to use | Cursor skill |
|------|-------------|--------------|
| Planning | Work has no issue yet, or needs to be broken into PR-sized issues | `gh-issue-planning` |
| Implementation | Executing a specific issue or logical bundle | `gh-issue` |
| Tooling | Discover `gh` auth / issue commands | `gh-tools` |

Rules:

- Do not make repo changes unless the work is tied to a GitHub issue.
- If the user asks for a change without an issue, use `gh-issue-planning` first, then stop before implementation unless the user explicitly asks to continue.
- Use `gh-issue` when implementing a specific issue (e.g. `gh-issue #79`).
- Keep implementation briefs, review cycles, and shipped notes in **GitHub issue comments**, not committed repo markdown.
- Deprecated aliases: `/linear-issue` → `gh-issue`, `/linear-issue-planning` → `gh-issue-planning`, `/linear-tools` → `gh-tools`.

## Git conventions

- **Default branch:** `main`
- **Feature branches:** `codex/<issue-slug>` (e.g. `codex/79-gh-issues-first`)
- Prefer a dedicated worktree when the main checkout is dirty or the issue is non-trivial.
- Commit messages should reference the GitHub issue number (e.g. `#79`).

## Documentation

- **Repo docs:** durable product, setup, architecture, and user-facing documentation (README, etc.).
- **GitHub issue docs:** per-issue narrative — scope in the issue body; implementation/review/shipped notes in comments.
- Do not commit per-issue scratch markdown, implementation diaries, or review notes to the repo.

## Repo-specific conventions

<!-- Add project-specific rules here as the codebase grows -->
