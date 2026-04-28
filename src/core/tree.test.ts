import { describe, expect, it } from "vitest";
import { renderTree } from "./tree.js";
import type { DiscoveredSkill } from "./scanner.js";

describe("renderTree", () => {
  it("renders nested internal skills and external requires", () => {
    const skills: DiscoveredSkill[] = [
      {
        id: "research-report",
        name: "Research Report",
        version: "1.0.0",
        description: "Gather sources and produce a structured report",
        author: undefined,
        requires: ["citation-formatter"],
        tags: ["research", "output"],
        path: "/tmp/skills/research-report",
        skillMdPath: "/tmp/skills/research-report/SKILL.md",
        parentId: undefined,
      },
      {
        id: "summarize",
        name: "Summarize",
        version: "0.2.0",
        description: "Condense long content into concise findings",
        author: undefined,
        requires: [],
        tags: ["nlp"],
        path: "/tmp/skills/research-report/skills/summarize",
        skillMdPath: "/tmp/skills/research-report/skills/summarize/SKILL.md",
        parentId: "research-report",
      },
      {
        id: "fetch-content",
        name: "Fetch Content",
        version: "0.1.0",
        description: "Retrieve raw content",
        author: undefined,
        requires: [],
        tags: ["io"],
        path: "/tmp/skills/research-report/skills/summarize/skills/fetch-content",
        skillMdPath: "/tmp/skills/research-report/skills/summarize/skills/fetch-content/SKILL.md",
        parentId: "summarize",
      },
      {
        id: "format-output",
        name: "Format Output",
        version: "0.1.0",
        description: "Format report output",
        author: undefined,
        requires: [],
        tags: ["formatting"],
        path: "/tmp/skills/research-report/skills/summarize/skills/format-output",
        skillMdPath: "/tmp/skills/research-report/skills/summarize/skills/format-output/SKILL.md",
        parentId: "summarize",
      },
      {
        id: "citation-formatter",
        name: "Citation Formatter",
        version: "1.0.0",
        description: "Format citation blocks",
        author: undefined,
        requires: [],
        tags: ["research", "output"],
        path: "/tmp/skills/citation-formatter",
        skillMdPath: "/tmp/skills/citation-formatter/SKILL.md",
        parentId: undefined,
      },
    ];

    expect(renderTree(skills)).toBe(
      [
        "├── citation-formatter@1.0.0",
        "└── research-report@1.0.0",
        "    ├── [internal] summarize@0.2.0",
        "    │   ├── [internal] fetch-content@0.1.0",
        "    │   └── [internal] format-output@0.1.0",
        "    └── requires: citation-formatter",
      ].join("\n")
    );
  });

  it("keeps skills with missing parents visible as roots", () => {
    const skills: DiscoveredSkill[] = [
      {
        id: "orphan",
        name: "Orphan",
        version: undefined,
        description: "Parent is missing",
        author: undefined,
        requires: [],
        tags: [],
        path: "/tmp/skills/parent/skills/orphan",
        skillMdPath: "/tmp/skills/parent/skills/orphan/SKILL.md",
        parentId: "missing-parent",
      },
    ];

    expect(renderTree(skills)).toBe(`└── orphan (orphan: missing parent "missing-parent")`);
  });
});
