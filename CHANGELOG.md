# Changelog

All notable changes to sklock will be documented here.

This project follows semantic versioning where practical during early development.

## Unreleased

### Changed

- **`lint`:** Exit with code **2** (not 1) when there are error-level issues, matching `validate` / `graph` / `export`. CI scripts that rely on the previous exit code 1 must be updated.
- **`export`:** `--wrap` now errors out (exit 1) when used with `--format json` or `--format yaml`. Previously silently ignored.
- **`tree`:** Sort children by byte order instead of host-default `localeCompare` for cross-platform-stable display order.

### Fixed

- Remove unreachable validation branches for parent skills and cycle detection; document short hash intent in `hashSkillDirectory`.
- Align `sklock init --example` with `examples/basic/skills` fixtures (single source of truth for content).
- CLI: catch non-`SkillScanError` failures in `runCommand` (print `sklock: …`, optional `SKLOCK_DEBUG` stack); resolve walk-up workspace discovery with a stderr warning.
- `add`: preserve CRLF in edited frontmatter when present; sort `requires` for stable diffs.
- `lint`: add `--max-lines` (default 200); single source of truth via `DEFAULT_MAX_LINES`.
- `lockfile`: parallelize per-skill hashing in `generateLockfile` for faster lockfile generation on larger workspaces.
- `scanner` / `lockfile`: pass `followSymbolicLinks: false` to `fast-glob` to avoid potential symlink loops.
- CI: run the test matrix on macOS; run example-workspace checks under Bun, not only `--version`.

### Added

- JSON Schema for SKILL.md frontmatter (`schemas/skill-frontmatter.json`), generated from `SkillSchema`.

## 0.2.0 - 2026-04-28

- **CLI:** Catch `SkillScanError` at the CLI boundary — print a short message and exit with code 2 instead of an unhandled rejection stack trace.
- **`check`:** Exit code **4** when `skill.lock` is missing; exit code **3** when the lockfile is stale under `--frozen` (stale without `--frozen` still warns and exits 0).
- **`check`:** Without `--frozen`, a stale `skill.lock` warns and exits successfully; `--frozen` fails the process (intended for CI).
- **`lockfile`:** Normalize lock entry `path` to forward slashes for cross-platform reproducibility; drop unreachable empty-directory branch in `hashSkillDirectory`.
- **`add`:** Prefer YAML document parsing when editing frontmatter so comments and layout are preserved when possible; centralize validation failure handling with `exitOnValidationErrors`.
- **`init --example`:** Pre-flight check all example paths before writing anything; tailor “next steps” output when not using `--example`.
- **`shared`:** Resolve workspace root by walking up parent directories for a `skills` directory (in addition to `./skills` under cwd).
- **`scanner`:** Nested skills without a resolvable parent `SKILL.md` are treated as roots (`parentId` undefined) instead of synthesizing a parent id from the directory name.
- **Schema:** `description` is optional at parse time; `lint` warns when absent. `metadata` uses explicit `z.record(z.string(), z.unknown())`.
- **Validation:** Deduplicate identical dependency cycle diagnostics.
- **Breaking (library):** Remove unused `loadWorkspace`, `WorkspaceSchema`, and `Workspace` exports; they were never used by the CLI.
- **Dev:** `npm test` runs Vitest once; use `npm run test:watch` for watch mode. `prepublishOnly` runs check, test, and build before publish.
- Fix parent skill inference for workspaces rooted at a `skills` directory.
- Make lockfile checks compare full lock entries instead of only content hashes.
- Add Renovate configuration for dependency updates.
