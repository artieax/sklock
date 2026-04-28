import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lintCommand } from "./lint.js";

describe("lintCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns when description is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-lint-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\nversion: \"1.0.0\"\n---\n\n# Hello\n\nBody.\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await lintCommand({ root, json: true });

    const payload = JSON.parse(log.mock.calls[0]![0] as string) as {
      issues: Array<{ message: string }>;
    };
    expect(payload.issues.some((i) => i.message.includes("description"))).toBe(true);
  });

  it("exits 2 when an unresolved dependency is present", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-lint-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\nrequires:\n  - ghost\n---\n\n# Hello\n",
      "utf-8"
    );

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(lintCommand({ root, json: true })).rejects.toThrow("exit:2");
  });

  it("exits 2 when dependencies contain a cycle", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-lint-"));
    await mkdir(path.join(root, "alpha"), { recursive: true });
    await mkdir(path.join(root, "beta"), { recursive: true });
    await writeFile(
      path.join(root, "alpha", "SKILL.md"),
      "---\nname: alpha\ndescription: Alpha\nrequires:\n  - beta\n---\n\n# Alpha\n",
      "utf-8"
    );
    await writeFile(
      path.join(root, "beta", "SKILL.md"),
      "---\nname: beta\ndescription: Beta\nrequires:\n  - alpha\n---\n\n# Beta\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(lintCommand({ root, json: true })).rejects.toThrow("exit:2");
    const payload = JSON.parse(log.mock.calls[0]![0] as string) as {
      issues: Array<{ message: string; level: string }>;
    };
    expect(payload.issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        message: expect.stringContaining("Circular dependency"),
      })
    );
  });
});
