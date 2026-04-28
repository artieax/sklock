---
name: email-campaign
version: "1.2.0"
requires:
  - copy-review
  - send-email
tags: [marketing, email]
description: Plan and dispatch a full email campaign
---

# Email Campaign

Plan subject lines, body copy, and audience segmentation for an email campaign,
then hand off to **send-email** for dispatch.

Shares **copy-review** with `social-campaign` — changes to that skill affect both.

## Inputs

- `product` — product or offer to promote
- `list_segment` — audience segment identifier

## Outputs

- Approved email draft + dispatch confirmation
