# sklock

> A lockfile and graph manager for recursive AI agent skills.

## What is sklock?

sklock brings `package.json`-style dependency management to AI agent skill workspaces. It scans `skill.yml` files, resolves their dependency graph, generates a reproducible `skill.lock`, and gives you rich visualization tools — all from a single CLI.

## Why skill.lock?

AI agent skill trees can grow complex fast. Without a lockfile:

- You can't tell if a skill's dependencies changed between runs
- CI has no way to detect drift or missing skills
- Visualizing "what depends on what" requires manual inspection

`skill.lock` is the source of truth: a snapshot of every skill, its hash, and its resolved requires — so you always know the exact state of your workspace.

## Install

```bash
# Install from GitHub (early development, private repo)
npm install github:Lyuji282/sklock
```

Or use npx:

```bash
npx github:Lyuji282/sklock --help
```

## Quickstart

```bash
# Initialize a skills workspace
sklock init --example

# Scan discovered skills
sklock scan

# Validate all skill dependencies
sklock validate

# Generate skill.lock
sklock lock

# Check lockfile is up to date
sklock check

# Visualize the dependency graph
sklock graph --mermaid
```

## Example output

### `sklock graph --mermaid`

```
graph TD
  video-editor --> scene-cutter
  video-editor --> caption-generator
  scene-cutter --> ffmpeg-wrapper
```

### `sklock tree`

```
- video-editor@1.0.0
  requires: scene-cutter
  requires: caption-generator
- scene-cutter@0.2.0
  requires: ffmpeg-wrapper
- ffmpeg-wrapper@0.1.0
- caption-generator@0.3.0
```

### `sklock validate`

```
✓ All 4 skill(s) are valid.
```

## Commands

| Command | Description |
|---|---|
| `init` | Initialize a skills workspace |
| `scan` | Scan and list all discovered skills |
| `validate` | Validate the skills workspace |
| `lock` | Generate `skill.lock` |
| `check` | Check lockfile is up to date |
| `tree` | Display skills as a tree |
| `graph` | Render the skill dependency graph |
| `why <skill-id>` | Explain why a skill is included |
| `explain <skill-id>` | Show details about a skill |
| `export` | Export skill graph data |

## Status

Early development. Private repository. Breaking changes may occur between versions.

---

Made by [Lyuji282](https://github.com/Lyuji282) — part of the artie project.
