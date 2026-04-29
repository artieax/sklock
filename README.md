# sklock

> Lockfile and dependency graph manager for recursive AI agent skills.

## What is sklock?

sklock brings `Cargo.toml`-style dependency management to AI agent skill workspaces.

Each skill lives in its own directory with a `SKILL.md` file — YAML frontmatter for metadata, Markdown body for documentation. Skills can nest infinitely deep (`skills/*/skills/*`), with sub-skills displayed under their parent in the tree. sklock scans these files, resolves the dependency graph, generates a reproducible `skill.lock`, and gives you visualization tools — all from a single CLI.

Follows the [agentskills.io](https://agentskills.io/specification) open standard. Compatible with Claude Code, OpenAI Codex, and OpenCode.

## Why skill.lock?

AI agent skill trees grow complex fast. Without a lockfile:

- You can't tell if a skill's dependencies changed between runs
- CI has no way to detect drift or missing skills
- Refactoring is guesswork — "what depends on this skill?"

`skill.lock` is the reproducibility snapshot: every discovered skill with two hashes — `contentHash` (the skill’s own files only, excluding sub-skills) and `closureHash` (the full subtree including all descendant sub-skills) — plus parent and resolved `requires`. A top-level `workspaceHash` lets CI verify the entire workspace with a single value.

## Install

Installing from `github:…` clones the repository and runs the `prepare` script (`npm run build`), which compiles the CLI into `dist/`. You do not need `dist/` committed. If your package manager skips `prepare` in some edge cases, run `npm run build` in the package directory once.

```bash
# npm
npm install -g github:artieax/sklock

# pnpm
pnpm add -g github:artieax/sklock

# bun
bun add -g github:artieax/sklock
```

Or run without installing:

```bash
npx github:artieax/sklock --help
bunx github:artieax/sklock --help
```

## Quickstart

```bash
# Scaffold a skills workspace with example skills
sklock init --example

# Validate all skill dependencies
sklock validate

# Generate skill.lock
sklock lock

# Check lockfile (warns if stale; use --frozen in CI to fail the job)
sklock check
sklock check --frozen

# Infer requires[] from file-level cross-references (static analysis only)
# Note: on a fresh workspace with no requires[] yet, this will find nothing.
# Use the sklock/initialize skill for semantic inference on first setup.
sklock infer
sklock infer --apply

# Visualize the dependency graph
sklock graph --mermaid

# Show nested skill tree
sklock tree
```

## SKILL.md format

Each skill is defined by a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: research-report
description: Gather sources and produce a structured report
version: "1.0.0"
requires:
  - citation-formatter
tags: [research, output]
---

# Research Report

Full documentation goes here...
```

- `name` — required Agent Skills identifier; must match the directory name and use lowercase kebab-case
- `description` — optional in sklock (recommended); `sklock lint` warns when it is missing
- `requires` — list of other skill IDs this skill depends on
- `license`, `compatibility`, `metadata`, `allowed-tools` — optional Agent Skills metadata
- `version`, `tags`, `author`, `requires` — sklock extensions
- Other frontmatter keys (for example Claude Code extensions) are accepted and ignored by sklock unless added to the schema later
- A JSON Schema for the frontmatter model is in [`schemas/skill-frontmatter.json`](schemas/skill-frontmatter.json) (regenerate with `npm run json-schema` when `SkillSchema` changes)

## Nesting

Skills can contain sub-skills by placing them in a `skills/` subdirectory:

```
skills/
  research-report/
    SKILL.md              ← requires: [citation-formatter]
    skills/
      summarize/
        SKILL.md          ← internal to research-report (level 1)
        skills/
          fetch-content/
            SKILL.md      ← internal to summarize (level 2)
          format-output/
            SKILL.md
  citation-formatter/
    SKILL.md              ← external skill
```

Nested sub-skills are rendered under their parent, but skill IDs are workspace-wide and must be unique. `requires` declares explicit cross-skill dependencies by ID.

## Example output

Using `examples/basic` (6 skills; nesting depth 2 from root to the deepest sub-skill):

### `sklock graph --mermaid`

```
graph TD
  "research-report" --> "citation-formatter"
  "hello"
  "summarize"
  "fetch-content"
  "format-output"
```

### `sklock tree`

```
├── citation-formatter@0.3.0
├── hello@0.1.0
└── research-report@1.0.0
    ├── [internal] summarize@0.2.0
    │   ├── [internal] fetch-content@0.1.0
    │   └── [internal] format-output@0.1.0
    └── requires: citation-formatter
```

### `sklock explain research-report`

```
Skill: research-report
Version: 1.0.0
Description: Gather sources, summarize findings, and produce a structured report
Requires: citation-formatter
Tags: research, output
```

### `sklock validate`

```
✓ All 6 skill(s) are valid.
```

## Commands

| Command | Description |
|---|---|
| `init` | Scaffold a skills workspace |
| `scan` | Discover and list all skills |
| `validate` | Validate dependency graph (`--strict` enforces Agent Skills spec compliance) |
| `lock` | Generate `skill.lock` |
| `check` | Verify lockfile is current (default: warn if stale; `--frozen` fails for CI) |
| `tree` | Display skills as a nested tree |
| `graph` | Render dependency graph (`--mermaid`; `--mode deps\|containment\|both`) |
| `why <id>` | Show what depends on a skill |
| `explain <id>` | Show full skill details |
| `export` | Export graph as JSON / YAML / Mermaid |
| `lint` | Report quality issues in `SKILL.md` files |
| `add <id> --dep <dep>` | Add a dependency to a skill and refresh `skill.lock` |
| `infer` | Infer `requires[]` from skill descriptions (`--apply` writes to `SKILL.md`) |
| `doctor` | Run full workspace health check: validation, lockfile drift, and lint summary |

`sklock add` updates YAML frontmatter using a document-aware parser so comments and layout are preserved when possible; if parsing fails, it falls back to rewriting the frontmatter block.

## Agent installation guide

Install sklock with whichever package manager the project uses:

```bash
npm install -g github:artieax/sklock   # or pnpm / bun
sklock --version
```

Then use the **`sklock/initialize` skill** — it walks through the full setup: scaffolding the workspace, running static inference (`sklock infer`), doing a semantic pass to wire up `requires[]`, and verifying the result. The skill works with any AI provider.

> **Why the initialize skill matters for first-time setup:** `sklock infer` uses static analysis (file-level cross-references). On a fresh workspace, skills have no `requires[]` yet and typically no cross-file references between them, so `sklock infer` will always return nothing. The `sklock/initialize` skill prompts you — the agent — to read each skill's description and reason about dependencies semantically, which is the only reliable approach at initialization time.

For ongoing work after the workspace is established:

```bash
sklock validate && sklock lock   # after any SKILL.md change
sklock infer --apply             # pick up new file-level cross-references
```

### Troubleshooting

| Error | Fix |
|---|---|
| `Missing required skill: X` | Create `skills/X/SKILL.md` or add `X` to the correct parent's `skills/` directory |
| `Circular dependency: A → B → A` | Remove one of the `requires` entries to break the cycle |
| `skill.lock is stale` | Run `sklock lock` and commit the updated lockfile |
| `Warning: invalid SKILL.md at ...` | Check the frontmatter is valid YAML and the file starts with `---` |

## Validation modes

sklock is permissive by default so it works with any existing workspace. Use `--strict` to enforce the Agent Skills specification:

| | Default | `--strict` |
|---|---|---|
| `description` | optional | **required** |
| `metadata` values | any type | strings only |

```yaml
# validate workspace against the Agent Skills spec
sklock validate --strict
```

In CI, combine both checks:

```yaml
- run: sklock validate --strict
- run: sklock check --frozen
```

## CI integration

Without `--frozen`, `sklock check` prints a warning when `skill.lock` is stale but exits successfully. In CI, pass `--frozen` so a drifted lockfile fails the job.

```yaml
# .github/workflows/ci.yml
- name: Check skill.lock is up to date
  run: sklock check --frozen
```

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | General CLI error (missing arguments, invalid flags, I/O errors, etc.) |
| 2 | Invalid workspace or `SKILL.md` parse/schema failure (`SkillScanError`), or validation errors from `validate` / `lock` / `add` / `graph` / `export` / `lint` |
| 3 | `skill.lock` is stale (`check --frozen` only; without `--frozen`, stale lockfiles warn and exit 0) |
| 4 | `skill.lock` is missing (`check --frozen` only; without `--frozen`, missing lockfiles warn and exit 0) |

Use `sklock check --json` to distinguish missing vs stale lockfiles without relying on exit codes: a missing lockfile includes `"missingLockfile": true` in the JSON object; a stale lockfile includes `"stale": true` with `added` / `removed` / `changed` arrays (and no `missingLockfile` field on the normal stale path).

## Status

Early development. Breaking changes may occur between versions.

## License

Apache License 2.0. See `LICENSE`.

---

Made by [artieax](https://github.com/artieax) — part of the artie project.
