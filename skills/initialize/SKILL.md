---
name: initialize
version: "1.0.0"
description: Initialize a sklock workspace in a project — install sklock, scaffold the skills directory, infer requires[] dependencies from skill descriptions, generate skill.lock, and verify the workspace is healthy. Use when setting up sklock for the first time or onboarding a project that already has skills.
---

# Initialize a sklock workspace

## Step 1 — Install sklock

Check whether sklock is already installed:

```bash
sklock --version 2>/dev/null && echo "already installed"
```

If missing, install with whichever package manager the project uses:

```bash
npm install -g github:artieax/sklock   # or pnpm / bun
```

## Step 2 — Scaffold the skills directory

```bash
sklock init --root skills --no-infer
```

`--no-infer` skips the automated static analysis so you can handle dependency
inference yourself with full semantic understanding in Step 4.

## Step 3 — Scan and validate structure

```bash
sklock validate
sklock tree
```

Fix any structural errors (duplicate IDs, orphan sub-skills) before continuing.

## Step 4 — Infer requires[] dependencies

This is the most important step and where your semantic understanding adds value
over automated tools.

### 4a. Run static analysis first

```bash
sklock infer
```

This detects dependencies that are *explicitly referenced* in file contents
(import statements, path patterns, `<!-- READ: -->` directives). Apply if the
suggestions look correct:

```bash
sklock infer --apply
```

Static analysis only finds dependencies that are **textually expressed** in
files. Fresh workspaces with no file-level cross-references will return
"No new dependencies inferred" — that is expected. Proceed to Step 4b.

### 4b. Semantic pass — LLM-driven scan

Because skills initially have no `requires[]` and may not reference each other
in file contents, static analysis cannot detect semantic dependencies. You must
reason about them yourself.

First, get structured context for all skills:

```bash
sklock infer --llm-context
```

Read the output. For every ordered pair (A, B) of distinct skills, ask:

1. Does A's workflow **produce or consume** what B provides?
2. Does A's description mention B's domain, outputs, or capabilities?
3. Would A **fail or produce meaningfully worse results** without B?
4. Does A explicitly orchestrate or delegate a subtask to B?

If any answer is yes → add the dependency:

```bash
sklock add <A> --dep <B>
```

**Do not** add dependencies based on loose thematic similarity alone. Only add
them when skill A genuinely cannot do its job without skill B.

## Step 5 — Lock and verify

```bash
sklock validate
sklock lock
sklock check
```

## Step 6 — Visualize

Show the dependency graph to the user so they can confirm it looks correct:

```bash
sklock tree
sklock graph --mermaid
```

## Step 7 — Lint (optional)

```bash
sklock lint
```

Address any warnings that matter (missing descriptions, oversized files).

## When to re-run

Re-run `sklock validate && sklock lock` after any change to a `SKILL.md` file.
Re-run this skill when adding new skills to an established workspace.
