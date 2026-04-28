# Contributing to sklock

Thanks for your interest in sklock. This document covers how to set up the project locally, the conventions we follow, and how to get a change merged.

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating you agree to uphold it.

## Project scope

sklock is a lockfile and graph manager for AI agent skill workspaces, following the [agentskills.io](https://agentskills.io/specification) spec. Changes that fit:

- Bug fixes for `scan`, `lock`, `validate`, `tree`, `graph`, `why`, `explain`, `export`, `init`, `check`, `lint`, `add`
- New commands that operate on `SKILL.md` workspaces
- Better error messages, performance, or test coverage
- Docs and examples

Out of scope (for now):

- Skill *runtime* / execution — sklock only manages metadata
- Network features (registry, publishing) — local FS only

If unsure whether a change fits, open an issue first.

## Development setup

Requirements: Node ≥ 20 or Bun ≥ 1.0.

```bash
git clone https://github.com/artieax/sklock.git
cd sklock
npm install
npm run build
npm run check    # typecheck
npm test         # vitest (single run)
npm run test:watch   # vitest watch mode during development
```

Run the CLI from source during development:

```bash
npm run dev -- validate
npm run dev -- tree
```

## Making a change

1. **Open an issue first** for non-trivial work — this avoids duplicated effort and lets us agree on the approach.
2. **Branch from `main`.** Use a short, descriptive branch name (`fix/lockfile-stale-detection`, `feat/json-export`).
3. **Keep PRs focused.** One concern per PR. Refactors and behavior changes belong in separate PRs.
4. **Add or update tests.** Every behavior change needs a test. We use [vitest](https://vitest.dev/).
5. **Run the full check before pushing:**

   ```bash
   npm run build
   npm run check
   npm test
   ```

6. **Update docs** (`README.md`, `CHANGELOG.md`) when behavior, flags, or commands change.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(lock): add --frozen flag to check command
fix(scan): resolve symlinks before hashing
docs: clarify nested skill scoping rules
```

Prefixes we use: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.

Scope (in parens) is optional and matches one of: `cli`, `scan`, `lock`, `validate`, `tree`, `graph`, `init`, `schema`, `core`.

## Pull requests

When opening a PR:

- Fill in the PR template — what changed, why, how to verify.
- Link the issue if there is one (`Fixes #123`).
- Make sure CI is green.
- Be ready for review feedback. We try to respond within a week.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Please include:

- sklock version (`sklock --version`)
- Node/Bun version
- A minimal `SKILL.md` workspace that reproduces the issue
- The exact command and the actual vs. expected output

## Security issues

Do not file security issues publicly. See [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree your contribution is licensed under the [Apache License 2.0](./LICENSE).
