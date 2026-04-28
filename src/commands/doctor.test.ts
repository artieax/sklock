import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { doctorCommand } from "./doctor.js";

describe("doctorCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports healthy when workspace is valid and lockfile is up to date", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-doctor-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\nversion: \"1.0.0\"\n---\n\n# Hello\n",
      "utf-8"
    );
    // Generate a lockfile first
    const { generateLockfile, writeLockfile } = await import("../core/lockfile.js");
    const { scanSkills } = await import("../core/scanner.js");
    const { skills } = await scanSkills(root);
    const lockfile = await generateLockfile(skills, root);
    await writeLockfile(lockfile, root);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await doctorCommand({ root, json: true });
    const payload = JSON.parse(log.mock.calls[0]![0] as string) as { healthy: boolean };
    expect(payload.healthy).toBe(true);
  });

  it("reports unhealthy when lockfile is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-doctor-nolock-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\nversion: \"1.0.0\"\n---\n\n# Hello\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(doctorCommand({ root, json: true })).rejects.toThrow("exit:1");
    const payload = JSON.parse(log.mock.calls[0]![0] as string) as { healthy: boolean; lockfile: { exists: boolean } };
    expect(payload.healthy).toBe(false);
    expect(payload.lockfile.exists).toBe(false);
  });

  it("reports validation errors in --json output", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-doctor-valerr-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\nrequires:\n  - ghost\n---\n\n# Hello\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(doctorCommand({ root, json: true })).rejects.toThrow("exit:1");
    const payload = JSON.parse(log.mock.calls[0]![0] as string) as {
      validationErrors: Array<{ message: string }>;
    };
    expect(payload.validationErrors.length).toBeGreaterThan(0);
  });

  it("reports lint warnings in --json output", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-doctor-lint-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\n---\n\n# Hello\n",
      "utf-8"
    );
    const { generateLockfile, writeLockfile } = await import("../core/lockfile.js");
    const { scanSkills } = await import("../core/scanner.js");
    const { skills } = await scanSkills(root);
    const lockfile = await generateLockfile(skills, root);
    await writeLockfile(lockfile, root);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    // Lint warnings don't make doctor unhealthy — only errors do
    await doctorCommand({ root, json: true });
    const payload = JSON.parse(log.mock.calls[0]![0] as string) as {
      healthy: boolean;
      lintIssues: Array<{ message: string; level: string }>;
    };
    expect(payload.lintIssues.some((i) => i.message.includes("description"))).toBe(true);
    expect(payload.healthy).toBe(true);
  });
});
