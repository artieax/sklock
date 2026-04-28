---
name: release-pipeline
version: "2.0.0"
requires:
  - deploy-notify
tags: [ci, release]
description: Run the full build-test-deploy pipeline for a release
---

# Release Pipeline

Orchestrate build validation and test execution before handing off to
**deploy-notify** to alert the team.

Internal sub-skills handle build checks and testing; `test-runner` itself
has three sibling test strategies at level 2.

## Inputs

- `branch` — branch or tag to release
- `env` — target environment (`staging` | `production`)

## Outputs

- Pipeline result: pass/fail with per-stage logs
