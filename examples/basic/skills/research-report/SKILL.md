---
name: research-report
version: "1.0.0"
requires:
  - citation-formatter
tags: [research, output]
description: Gather sources, summarize findings, and produce a structured report
---

# Research Report

Gather multiple sources, summarize each one, and assemble a structured research
report with citations.

Internal sub-skills (`summarize`, `fetch-content`, `format-output`) are private
to this skill. The only external dependency is **citation-formatter**.

## Inputs

- `topic` — research question or topic string
- `sources` — list of URLs or file paths

## Outputs

- Markdown report with an executive summary and per-source sections
