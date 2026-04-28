import { mkdir, mkdtemp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addCommand, addRequires } from "./add.js";
import { lockCommand } from "./lock.js";

vi.mock("yaml", async (importOriginal) => {
  const actual = await importOriginal<typeof import("yaml")>();
  return {
    ...actual,
    parseDocument: (src: string, options?: Parameters<typeof actual.parseDocument>[1]) => {
      const doc = actual.parseDocument(src, options);
      if (src.includes("__SKLOCK_FORCE_FALLBACK__")) {
        // Minimal synthetic parse error so addRequires exercises the stringify fallback.
        doc.errors.push(new actual.YAMLError("YAMLParseError", [0, 0], "BAD_INDENT", "forced parseDocument error"));
      }
      return doc;
    },
  };
});

async function writeSkill(root: string, name: string, requires: string[] = []): Promise<void> {
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  const requiresYaml = requires.length
    ? `requires:\n${requires.map((req) => `  - ${req}`).join("\n")}\n`
    : "";
  await writeFile(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} test skill\n${requiresYaml}---\n\n# ${name}\n`,
    "utf-8"
  );
}

describe("addCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses to update skill.lock when the new dependency creates a cycle", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-add-"));
    await writeSkill(root, "alpha");
    await writeSkill(root, "beta", ["alpha"]);

    vi.spyOn(console, "log").mockImplementation(() => {});
    await lockCommand({ root, json: false });
    const lockPath = path.join(root, "skill.lock");
    const alphaPath = path.join(root, "alpha", "SKILL.md");
    const originalLock = await readFile(lockPath, "utf-8");
    const originalAlpha = await readFile(alphaPath, "utf-8");

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(addCommand("alpha", { root, dep: "beta" })).rejects.toThrow("exit:2");
    await expect(readFile(lockPath, "utf-8")).resolves.toBe(originalLock);
    await expect(readFile(alphaPath, "utf-8")).resolves.toBe(originalAlpha);
  });

  it("preserves YAML comments in frontmatter when adding a dependency", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-add-"));
    await writeSkill(root, "alpha");
    await writeSkill(root, "beta");
    await writeSkill(root, "gamma");
    const alphaPath = path.join(root, "alpha", "SKILL.md");
    await writeFile(
      alphaPath,
      `---\nname: alpha\ndescription: alpha test skill\n# pinned for demo\nrequires:\n  - beta\n---\n\n# Alpha\n`,
      "utf-8"
    );

    vi.spyOn(console, "log").mockImplementation(() => {});
    await lockCommand({ root, json: false });
    await addCommand("alpha", { root, dep: "gamma" });

    const body = await readFile(alphaPath, "utf-8");
    expect(body).toContain("# pinned for demo");
    expect(body).toContain("- gamma");
  });

  it("falls back to plain YAML stringify when parseDocument reports errors", () => {
    const content = `---\nname: alpha\ndescription: alpha test skill\n__SKLOCK_FORCE_FALLBACK__: true\nrequires:\n  - beta\n---\n\n# Alpha\n`;
    const out = addRequires(content, "gamma");
    expect(out).toContain("- gamma");
    expect(out).toContain("name: alpha");
  });

  it("preserves CRLF line endings in frontmatter when appending a dependency", () => {
    const content = `---\r\nname: alpha\ndescription: alpha\r\nrequires:\r\n  - beta\r\n---\r\n\r\n# Alpha\r\n`;
    const out = addRequires(content, "gamma");
    expect(out).toContain(`---\r\n`);
    expect(out).toMatch(/\r\n---\r\n\r\n# Alpha/);
  });

  it("restores SKILL.md when lockfile writing fails after the edit", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-add-"));
    await writeSkill(root, "alpha");
    await writeSkill(root, "beta");
    const alphaPath = path.join(root, "alpha", "SKILL.md");
    const originalAlpha = await readFile(alphaPath, "utf-8");

    await mkdir(path.join(root, "skill.lock"));

    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(addCommand("alpha", { root, dep: "beta" })).rejects.toThrow();
    await expect(readFile(alphaPath, "utf-8")).resolves.toBe(originalAlpha);
  });
});
