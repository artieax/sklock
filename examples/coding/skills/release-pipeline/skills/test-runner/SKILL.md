---
name: test-runner
version: "1.1.0"
tags: [ci, testing]
description: Coordinate unit, e2e, and snapshot test execution
---

# Test Runner

Coordinate three test strategies — unit, e2e, and snapshot — and aggregate results.

Has three internal sub-skills, one per test type, each independently configurable.

## Inputs

- `scope` — `all` | `unit` | `e2e` | `snapshot` (default: `all`)

## Outputs

- Aggregated test report with pass/fail counts and failure details
