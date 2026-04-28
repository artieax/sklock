---
name: deploy-notify
version: "1.0.0"
tags: [ci, notification]
description: Notify the team when a deployment completes or fails
---

# Deploy Notify

Send a deployment status notification to Slack, email, or webhook on pipeline completion.

## Inputs

- `status` — `success` | `failure`
- `env` — deployment environment
- `channels` — list of notification channels

## Outputs

- Notification delivery confirmation
