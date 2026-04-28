---
name: summarize
version: 0.2.0
tags:
  - nlp
description: Condense long content into a concise summary
---

# Summarize

Condense long content into a concise summary using the configured LLM.

Internal sub-skills (`fetch-content`, `format-output`) handle IO and rendering.

## Inputs

- `source` — URL or file path
- `max_sentences` — target length (default: 5)

## Outputs

- Formatted summary string
