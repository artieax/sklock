---
name: social-campaign
version: "0.8.0"
requires:
  - copy-review
  - scheduler
tags: [marketing, social]
description: Plan and schedule a multi-platform social media campaign
---

# Social Campaign

Plan captions, hashtags, and posting schedule for Instagram, X, and LinkedIn,
then hand off to **scheduler** for publishing.

Shares **copy-review** with `email-campaign` — a single skill used by two roots.

## Inputs

- `topic` — campaign theme
- `platforms` — list of target platforms

## Outputs

- Per-platform post drafts + scheduled publish times
