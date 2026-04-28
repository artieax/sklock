---
name: build-validator
version: "0.4.0"
tags: [ci, build]
description: Compile the project and verify the build artifact is clean
---

# Build Validator

Run the build, verify the output artifact, and report size delta vs the previous release.

## Inputs

- `branch` — branch to build

## Outputs

- Build status, artifact size, and size delta
