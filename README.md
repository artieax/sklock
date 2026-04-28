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

`skill.lock` is the reproducibility snapshot: every discovered skill, a hash of **all files under that skill’s directory** (not only `SKILL.md`), its parent skill, and its resolved `requires` — so CI can verify the exact state of your workspace.

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
| `validate` | Validate dependency graph |
| `lock` | Generate `skill.lock` |
| `check` | Verify lockfile is current (default: warn if stale; `--frozen` fails for CI) |
| `tree` | Display skills as a nested tree |
| `graph` | Render dependency graph (`--mermaid` or `--format json|mermaid|text`) |
| `why <id>` | Show what depends on a skill |
| `explain <id>` | Show full skill details |
| `export` | Export graph as JSON / YAML / Mermaid |
| `lint` | Report quality issues in `SKILL.md` files |
| `add <id> --dep <dep>` | Add a dependency to a skill and refresh `skill.lock` |

`sklock add` updates YAML frontmatter using a document-aware parser so comments and layout are preserved when possible; if parsing fails, it falls back to rewriting the frontmatter block.

## Agent installation guide

> This section is written for AI agents. Follow these steps exactly when setting up sklock in a project.

### Step 1 — Install sklock

Pick whichever package manager is already in use in the project (`npm`, `pnpm`, or `bun`):

```bash
npm install -g github:artieax/sklock
# or
pnpm add -g github:artieax/sklock
# or
bun add -g github:artieax/sklock
```

Verify installation:

```bash
sklock --version
```

### Step 2 — Initialise the skills directory

Run from the project root. This creates `skills/` if it does not exist:

```bash
sklock init --root skills
```

### Step 3 — Create a skill

Each skill is a directory containing a `SKILL.md` file. Create it manually:

```
skills/
  your-skill-name/
    SKILL.md
```

Minimum valid `SKILL.md` (add `description` when you can — `sklock lint` warns if it is missing):

```markdown
---
name: your-skill-name
version: "0.1.0"
requires: []
tags: []
---

# Your Skill Name

What this skill does and how to use it.
```

Rules:
- Prefer omitting `id` — the skill ID is the directory name. If you set `id`, it must equal `name` (sklock rejects a mismatch)
- `requires` must list existing skill IDs in the workspace
- Sub-skills go in `skills/<skill-name>/skills/<sub-skill-name>/SKILL.md`
- If the skill already exists, **do not recreate it** — update its `SKILL.md` frontmatter in place (for example `version`, `requires`, `tags`, `description`)
- If a `skill-creator` skill exists, embed a short "Uses sklock" section in its documentation describing that changes must be followed by `sklock validate` and `sklock lock`

### Step 4 — Lock and validate

After creating or modifying any skill, always run:

```bash
sklock validate   # check for missing deps and cycles
sklock lock       # regenerate skill.lock
```

Commit both the `SKILL.md` files and the updated `skill.lock`.

### Step 5 — Inspect the graph

```bash
sklock tree                    # nested containment view
sklock graph --mermaid         # mermaid dependency diagram
sklock explain <skill-id>      # full details for one skill
sklock why <skill-id>          # what depends on this skill
```

### When to re-run `sklock lock`

Re-run `sklock lock` whenever you:
- Add or remove a skill directory
- Edit frontmatter in any `SKILL.md` (version, requires, tags, description)
- Add, change, or remove any other file under a skill directory (`scripts/`, `references/`, `assets/`, etc.) — the lockfile hash tracks the whole directory
- Move a skill to a different nesting level

### Troubleshooting

| Error | Fix |
|---|---|
| `Missing required skill: X` | Create `skills/X/SKILL.md` or add `X` to the correct parent's `skills/` directory |
| `Circular dependency: A → B → A` | Remove one of the `requires` entries to break the cycle |
| `skill.lock is stale` | Run `sklock lock` and commit the updated lockfile |
| `Warning: invalid SKILL.md at ...` | Check the frontmatter is valid YAML and the file starts with `---` |

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
