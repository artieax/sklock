import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { suggestRequiresCommand } from "./suggest-requires.js";

async function makeSkill(
  root: string,
  id: string,
  opts: { requires?: string[]; description?: string } = {}
): Promise<void> {
  await mkdir(path.join(root, id), { recursive: true });
  const requiresYaml =
    opts.requires && opts.requires.length > 0
      ? `requires:\n${opts.requires.map((r) => `  - ${r}`).join("\n")}\n`
      : "";
  const description = opts.description ?? `Description for ${id}`;
  await writeFile(
    path.join(root, id, "SKILL.md"),
    `---\nname: ${id}\ndescription: ${description}\nversion: "1.0.0"\n${requiresYaml}---\n\n# ${id}\n\nBody.\n`,
    "utf-8"
  );
}

describe("suggestRequiresCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("suggests a dependency when skill A references skill B's name in a script", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-suggest-"));
    await makeSkill(root, "skill-a");
    await makeSkill(root, "skill-b");

    // skill-a has a script that imports skill-b
    await mkdir(path.join(root, "skill-a", "scripts"), { recursive: true });
    await writeFile(
      path.join(root, "skill-a", "scripts", "run.py"),
      `#!/usr/bin/env python3\n# This script uses skill-b\nimport subprocess\nresult = subprocess.run(["skills/skill-b/run.sh"])\n`,
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await suggestRequiresCommand({ root, json: true });

    const output = JSON.parse(log.mock.calls[0]![0] as string) as Array<{
      skillId: string;
      suggestions: Array<{ depId: string; foundIn: string }>;
    }>;

    const skillA = output.find((r) => r.skillId === "skill-a");
    expect(skillA).toBeDefined();
    expect(skillA!.suggestions).toContainEqual(
      expect.objectContaining({ depId: "skill-b" })
    );
  });

  it("produces no suggestions for a skill with no cross-references", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-suggest-"));
    await makeSkill(root, "standalone-a");
    await makeSkill(root, "standalone-b");

    // standalone-a has a script that does NOT reference standalone-b
    await mkdir(path.join(root, "standalone-a", "scripts"), { recursive: true });
    await writeFile(
      path.join(root, "standalone-a", "scripts", "run.sh"),
      `#!/bin/sh\necho "hello world"\n`,
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await suggestRequiresCommand({ root, json: true });

    const output = JSON.parse(log.mock.calls[0]![0] as string) as Array<{
      skillId: string;
      suggestions: Array<{ depId: string; foundIn: string }>;
    }>;

    const skillA = output.find((r) => r.skillId === "standalone-a");
    expect(skillA).toBeDefined();
    expect(skillA!.suggestions).toHaveLength(0);
  });

  it("does not suggest already-declared requires", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-suggest-"));
    await makeSkill(root, "consumer", { requires: ["provider"] });
    await makeSkill(root, "provider");

    // consumer references provider in a script
    await mkdir(path.join(root, "consumer", "scripts"), { recursive: true });
    await writeFile(
      path.join(root, "consumer", "scripts", "run.sh"),
      `#!/bin/sh\nbash skills/provider/run.sh\n`,
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await suggestRequiresCommand({ root, json: true });

    const output = JSON.parse(log.mock.calls[0]![0] as string) as Array<{
      skillId: string;
      suggestions: Array<{ depId: string; foundIn: string }>;
    }>;

    const consumer = output.find((r) => r.skillId === "consumer");
    expect(consumer).toBeDefined();
    // provider is already in requires[], so no suggestion
    expect(consumer!.suggestions).toHaveLength(0);
  });

  it("detects HTML comment READ directives in SKILL.md", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-suggest-"));
    await makeSkill(root, "reader");
    await makeSkill(root, "lib-skill");

    // Overwrite reader's SKILL.md to include an HTML comment referencing lib-skill
    await writeFile(
      path.join(root, "reader", "SKILL.md"),
      `---\nname: reader\ndescription: A reader skill\nversion: "1.0.0"\n---\n\n# reader\n\n<!-- READ: skills/lib-skill/ -->\n\nBody.\n`,
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await suggestRequiresCommand({ root, json: true });

    const output = JSON.parse(log.mock.calls[0]![0] as string) as Array<{
      skillId: string;
      suggestions: Array<{ depId: string; foundIn: string }>;
    }>;

    const reader = output.find((r) => r.skillId === "reader");
    expect(reader).toBeDefined();
    expect(reader!.suggestions).toContainEqual(
      expect.objectContaining({ depId: "lib-skill", foundIn: "SKILL.md" })
    );
  });

  it("prints 'No missing requires suggestions found.' when nothing detected (text mode)", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-suggest-"));
    await makeSkill(root, "alpha");
    await makeSkill(root, "beta");

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await suggestRequiresCommand({ root });

    const allOutput = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(allOutput).toContain("No missing requires suggestions found.");
  });
});
