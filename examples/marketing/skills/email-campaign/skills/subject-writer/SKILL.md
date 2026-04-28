---
name: subject-writer
version: "0.2.0"
tags: [writing, email]
description: Generate and A/B test subject line variants
---

# Subject Writer

Generate subject line variants optimised for open rate and run a quick
A/B preference ranking before surfacing the top candidate.

## Inputs

- `product` — product or offer
- `tone` — one of `urgent` | `curiosity` | `benefit` (default: `benefit`)

## Outputs

- Top subject line + 2 runners-up with rationale
