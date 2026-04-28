---
name: copy-review
version: "0.4.0"
tags: [writing, review]
description: Review copy for tone, clarity, and brand alignment
---

# Copy Review

Review marketing copy against brand guidelines and return an annotated
draft with a pass/fail verdict.

Used by both `email-campaign` and `social-campaign` — a shared utility skill.

## Inputs

- `copy` — raw copy text
- `brand_guide` — optional brand guidelines URL or text

## Outputs

- Annotated copy + scorecard (tone, clarity, brand fit)
