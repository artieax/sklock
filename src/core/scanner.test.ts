import { mkdtemp, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { scanSkills } from "./scanner.js";
import { validateSkills } from "./validator.js";
import { generateLockfile } from "./lockfile.js";

async function makeRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "sklock-scanner-"));
}

async function writeSkill(root: string, relativeDir: string, frontmatter?: string): Promise<void> {
  const dir = path.join(root, relativeDir);
  const name = path.basename(relativeDir);
  const metadata = frontmatter ?? `name: ${name}\ndescription: ${name} test skill\nversion: "1.0.0"`;
  await mkdir(dir, { recursive: true });
  await writeFile(dir + "/SKILL.md", `---\n${metadata}\n---\n\n# ${name}\n`, "utf-8");
}

describe("scanSkills", () => {
  it("treats skills directly under the workspace root as root skills", async () => {
    const root = await makeRoot();
    await writeSkill(root, "research-report");
    await writeSkill(root, "research-report/skills/summarize");

    const { skills } = await scanSkills(root);

    expect(skills.find((skill) => skill.id === "research-report")?.parentId).toBeUndefined();
    expect(skills.find((skill) => skill.id === "summarize")?.parentId).toBe("research-report");
    expect(validateSkills(skills)).toEqual({ valid: true, errors: [] });
  });

  it("accepts Agent Skills optional frontmatter fields", async () => {
    const root = await makeRoot();
    await writeSkill(
      root,
      "pdf-processing",
      [
        "name: pdf-processing",
        "description: Extract PDF text and tables when working with PDF documents",
        "license: Apache-2.0",
        "compatibility: Requires Python 3.14+ and uv",
        "allowed-tools: Bash(python:*) Read",
        "metadata:",
        "  author: example-org",
        "  version: '1.0'",
      ].join("\n")
    );

    const { skills } = await scanSkills(root);

    expect(skills[0]).toMatchObject({
      id: "pdf-processing",
      name: "pdf-processing",
      license: "Apache-2.0",
      compatibility: "Requires Python 3.14+ and uv",
      allowedTools: "Bash(python:*) Read",
      metadata: { author: "example-org", version: "1.0" },
    });
  });

  it("allows omitting description (lint may warn)", async () => {
    const root = await makeRoot();
    const dir = path.join(root, "no-desc");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "SKILL.md"),
      `---\nname: no-desc\nversion: "1.0.0"\n---\n\n# No Desc\n`,
      "utf-8"
    );

    const { skills } = await scanSkills(root);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.id).toBe("no-desc");
    expect(skills[0]?.description).toBeUndefined();
  });

  it("collects errors when a SKILL.md has invalid frontmatter fields", async () => {
    const root = await makeRoot();
    await writeSkill(root, "bad", "name: bad\ndescription: Bad test skill\nrequires: not-an-array");

    const { skills, errors } = await scanSkills(root);
    expect(skills).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("parse_error");
    expect(errors[0]?.file).toContain("bad");
  });

  it("allows Claude Code / ecosystem extension frontmatter keys", async () => {
    const root = await makeRoot();
    await writeSkill(
      root,
      "ext-skill",
      [
        "name: ext-skill",
        "description: Skill with extension-only frontmatter keys for compatibility",
        "disable-model-invocation: true",
        "argument-hint: \"[file]\"",
        "allowed-tools: Read, Grep",
      ].join("\n")
    );

    const { skills } = await scanSkills(root);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.id).toBe("ext-skill");
  });

  it("collects an error when the Agent Skills name does not match the directory", async () => {
    const root = await makeRoot();
    await writeSkill(root, "actual-name", "name: other-name\ndescription: Bad test skill");

    const { skills, errors } = await scanSkills(root);
    expect(skills).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toMatch("name must match parent directory");
  });

  it("returns an empty warnings list for a consistent workspace", async () => {
    const root = await makeRoot();
    await writeSkill(root, "solo");
    const { warnings } = await scanSkills(root);
    expect(warnings).toEqual([]);
  });

  it("warns when an internal skill's parent directory has no SKILL.md", async () => {
    const root = await makeRoot();
    await writeSkill(root, "parent/skills/orphan", "name: orphan\ndescription: orphan test skill");

    const { skills, warnings } = await scanSkills(root);

    expect(skills[0]?.parentId).toBeUndefined();
    expect(warnings).toEqual([
      expect.objectContaining({
        code: "orphan_parent",
        skillId: "orphan",
        parentId: "parent",
      }),
    ]);

    const lockfile = await generateLockfile(skills, root);
    expect(lockfile.skills.orphan?.parent).toBeUndefined();
  });
});
