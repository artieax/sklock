import { mkdir, writeFile, stat } from "fs/promises";
import path from "path";
import { resolveWorkspaceRoot } from "./shared.js";
import { scanSkills } from "../core/scanner.js";
import { inferCommand } from "./infer.js";

interface InitOptions {
  root?: string;
  example?: boolean;
  noInfer?: boolean;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/** Example skill files match the committed `examples/basic/skills` tree (see init example test). */
const EXAMPLE_SKILLS: Array<{ file: string[]; content: string }> = [
  {
    file: ["hello", "SKILL.md"],
    content: `---
name: hello
version: "0.1.0"
tags: [example]
description: A standalone skill with no dependencies
---

# Hello

A standalone skill with no dependencies. Good starting point for new workspaces.
`,
  },
  {
    file: ["citation-formatter", "SKILL.md"],
    content: `---
name: citation-formatter
version: "0.3.0"
tags: [formatting]
description: Format citations in APA, MLA, or Chicago style
---

# Citation Formatter

Format citations in APA, MLA, or Chicago style given a source URL or metadata object.

## Inputs

- \`source\` — URL or \`{ title, author, year, publisher }\` object
- \`style\` — one of \`apa\` | \`mla\` | \`chicago\` (default: \`apa\`)

## Outputs

- Formatted citation string
`,
  },
  {
    file: ["research-report", "skills", "summarize", "skills", "fetch-content", "SKILL.md"],
    content: `---
name: fetch-content
version: "0.1.0"
tags: [io, utility]
description: Retrieve raw content from a URL or local file path
---

# Fetch Content

Retrieve raw content from a URL or local file path and return it as a string.

## Inputs

- \`source\` — URL (\`https://...\`) or absolute/relative file path

## Outputs

- Raw text content of the resource
`,
  },
  {
    file: ["research-report", "skills", "summarize", "skills", "format-output", "SKILL.md"],
    content: `---
name: format-output
version: "0.1.0"
tags: [formatting, utility]
description: Render text as markdown, JSON, or plain prose
---

# Format Output

Render text in a chosen output format — markdown, JSON, or plain prose.

## Inputs

- \`content\` — raw text to format
- \`format\` — one of \`markdown\` | \`json\` | \`plain\` (default: \`markdown\`)

## Outputs

- Formatted string ready for display or downstream processing
`,
  },
  {
    file: ["research-report", "skills", "summarize", "SKILL.md"],
    content: `---
name: summarize
version: 0.2.0
tags:
  - nlp
description: Condense long content into a concise summary
---

# Summarize

Condense long content into a concise summary using the configured LLM.

Internal sub-skills (\`fetch-content\`, \`format-output\`) handle IO and rendering.

## Inputs

- \`source\` — URL or file path
- \`max_sentences\` — target length (default: 5)

## Outputs

- Formatted summary string
`,
  },
  {
    file: ["research-report", "SKILL.md"],
    content: `---
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

Internal sub-skills (\`summarize\`, \`fetch-content\`, \`format-output\`) are private
to this skill. The only external dependency is **citation-formatter**.

## Inputs

- \`topic\` — research question or topic string
- \`sources\` — list of URLs or file paths

## Outputs

- Markdown report with an executive summary and per-source sections
`,
  },
];

export async function initCommand(options: InitOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);

  try {
    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      console.error(`Refusing to initialize: root exists and is not a directory: ${root}`);
      process.exit(1);
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
    await mkdir(root, { recursive: true });
    console.log(`Created ${root}`);
  }

  // Infer deps for existing skills (skip for --example, skip if --no-infer)
  if (!options.example && !options.noInfer) {
    const { skills } = await scanSkills(root).catch(() => ({ skills: [] }));
    const unlinked = skills.filter((s) => s.requires.length === 0);
    if (skills.length > 0 && unlinked.length > 0) {
      console.log(`\nFound ${skills.length} skill(s). Inferring dependencies…`);
      await inferCommand({ root, apply: true }).catch((err: unknown) => {
        console.warn(`  Dependency inference failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  if (options.example) {
    const writes = EXAMPLE_SKILLS.map(({ file, content }) => ({
      file: path.join(root, ...file),
      content,
    }));

    for (const { file } of writes) {
      try {
        await stat(file);
        console.error(`Refusing --example: file already exists: ${file}`);
        process.exit(1);
      } catch (error) {
        if (!isNodeError(error) || error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    for (const { file, content } of writes) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content, "utf-8");
    }

    console.log(
      "Created example skills: hello, citation-formatter, fetch-content, format-output, summarize, research-report"
    );

    console.log("\nNext steps:");
    console.log("  sklock validate");
    console.log("  sklock lock");
    console.log("  sklock graph --mermaid");
  } else {
    console.log(`\nAdd your first skill under ${root}/<name>/SKILL.md (see README for the minimum frontmatter).`);
    console.log("Then run: sklock validate && sklock lock");
  }
}
