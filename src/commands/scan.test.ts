import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scanCommand } from "./scan.js";

describe("scanCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports no skills for an empty workspace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-scan-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await scanCommand({ root });
    expect(log).toHaveBeenCalledWith("No skills found.");
  });

  it("outputs skills and warnings keys for --json", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-scan-json-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await scanCommand({ root, json: true });
    const payload = JSON.parse(log.mock.calls[0]![0] as string);
    expect(payload).toHaveProperty("skills");
    expect(payload).toHaveProperty("warnings");
    expect(payload).toHaveProperty("errors");
    expect(Array.isArray(payload.skills)).toBe(true);
    expect(Array.isArray(payload.warnings)).toBe(true);
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it("collects ALL errors from multiple broken SKILL.md files instead of stopping at the first", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-scan-errors-"));

    // First broken skill: requires field is not an array
    const dir1 = path.join(root, "bad-skill-one");
    await mkdir(dir1, { recursive: true });
    await writeFile(
      path.join(dir1, "SKILL.md"),
      `---\nname: bad-skill-one\ndescription: Bad skill\nrequires: not-an-array\n---\n\n# Bad\n`,
      "utf-8"
    );

    // Second broken skill: name does not match directory name
    const dir2 = path.join(root, "bad-skill-two");
    await mkdir(dir2, { recursive: true });
    await writeFile(
      path.join(dir2, "SKILL.md"),
      `---\nname: wrong-name\ndescription: Another bad skill\n---\n\n# Bad\n`,
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await scanCommand({ root, json: true });

    const payload = JSON.parse(log.mock.calls[0]![0] as string);
    expect(Array.isArray(payload.errors)).toBe(true);
    expect(payload.errors).toHaveLength(2);
    expect(payload.errors.map((e: { file: string }) => e.file).some((f: string) => f.includes("bad-skill-one"))).toBe(true);
    expect(payload.errors.map((e: { file: string }) => e.file).some((f: string) => f.includes("bad-skill-two"))).toBe(true);
  });

  it("prints each error message and sets exit code 1 in text mode when there are parse errors", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-scan-text-errors-"));

    // First broken skill
    const dir1 = path.join(root, "broken-one");
    await mkdir(dir1, { recursive: true });
    await writeFile(
      path.join(dir1, "SKILL.md"),
      `---\nname: broken-one\ndescription: Bad skill\nrequires: not-an-array\n---\n\n# Bad\n`,
      "utf-8"
    );

    // Second broken skill
    const dir2 = path.join(root, "broken-two");
    await mkdir(dir2, { recursive: true });
    await writeFile(
      path.join(dir2, "SKILL.md"),
      `---\nname: wrong-name\ndescription: Another bad skill\n---\n\n# Bad\n`,
      "utf-8"
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const originalExitCode = process.exitCode;

    await scanCommand({ root });

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(process.exitCode).toBe(1);

    // Restore exitCode
    process.exitCode = originalExitCode;
  });
});
