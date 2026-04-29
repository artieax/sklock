## Principles

- Follow `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` prefixes on every commit message.
- **Bump `package.json` `version` on every code change** — use semver: patch for fixes, minor for new features, major for breaking changes.
- Keep `skill.lock` in sync: run `sklock validate && sklock lock` after any `SKILL.md` edit.
- Always create a worktree under `.worktrees/<branch-name>` for feature work; never develop directly on `main`.
- Prefer editing existing files over creating new ones; avoid speculative abstractions.