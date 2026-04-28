---
name: send-email
version: "1.0.0"
tags: [email, io]
description: Dispatch an approved email to a recipient list
---

# Send Email

Dispatch a finalised email draft to a recipient list via the configured ESP.

## Inputs

- `draft` — approved email content
- `recipients` — list segment ID or explicit address list

## Outputs

- Dispatch receipt with send count and timestamp
