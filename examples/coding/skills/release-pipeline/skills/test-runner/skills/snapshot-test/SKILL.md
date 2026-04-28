---
name: snapshot-test
version: "0.2.0"
tags: [testing, snapshot]
description: Compare UI snapshots against the approved baseline
---

# Snapshot Test

Run snapshot tests and flag any visual regressions against the approved baseline.

## Inputs

- `threshold` — acceptable pixel diff % before flagging (default: `0.1`)

## Outputs

- Diff count, flagged component list, visual diff images
