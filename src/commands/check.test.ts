import { mkdir, mkdtemp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkCommand } from "./check.js";
import { lockCommand } from "./lock.js";

async function makeWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "sklock-check-"));
  const skillDir = path.join(root, "hello");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    "---\nname: hello\nversion: \"1.0.0\"\ndescription: Hello\n---\n\n# Hello\n",
    "utf-8"
  );
  return root;
}

async function makeWorkspaceWithoutVersion(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "sklock-check-"));
  const skillDir = path.join(root, "hello");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    "---\nname: hello\ndescription: Hello\n---\n\n# Hello\n",
    "utf-8"
  );
  return root;
}

describe("checkCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects structural lockfile changes, not just hash changes", async () => {
    const root = await makeWorkspace();
    vi.spyOn(console, "log").mockImplementation(() => {});
    await lockCommand({ root, json: true });
    const lockPath = path.join(root, "skill.lock");
    const lockfile = JSON.parse(await readFile(lockPath, "utf-8"));
    lockfile.skills.hello.parent = "not-a-parent";
    await writeFile(lockPath, JSON.stringify(lockfile, null, 2), "utf-8");

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(checkCommand({ root, frozen: true })).rejects.toThrow("exit:3");
  });

  it("warns and exits zero when the lockfile is missing without --frozen", async () => {
    const root = await makeWorkspace();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await checkCommand({ root });

    expect(warn).toHaveBeenCalledWith("No skill.lock found. Run `sklock lock` first.");
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits zero when the lockfile is missing with --json without --frozen", async () => {
    const root = await makeWorkspace();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await checkCommand({ root, json: true });

    expect(exit).not.toHaveBeenCalled();
  });

  it("exits with code 4 when the lockfile is missing with --frozen", async () => {
    const root = await makeWorkspace();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(checkCommand({ root, frozen: true })).rejects.toThrow("exit:4");
  });

  it("warns and exits zero when the lockfile is stale without --frozen", async () => {
    const root = await makeWorkspace();
    vi.spyOn(console, "log").mockImplementation(() => {});
    await lockCommand({ root, json: true });
    await mkdir(path.join(root, "extra"), { recursive: true });
    await writeFile(
      path.join(root, "extra", "SKILL.md"),
      "---\nname: extra\ndescription: Extra\n---\n\n# Extra\n",
      "utf-8"
    );

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await checkCommand({ root });

    expect(warn).toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits zero for stale json output without --frozen", async () => {
    const root = await makeWorkspace();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await lockCommand({ root, json: true });
    log.mockClear();
    const lockPath = path.join(root, "skill.lock");
    const lockfile = JSON.parse(await readFile(lockPath, "utf-8"));
    lockfile.skills.hello.hash = "sha256:" + "0".repeat(64);
    await writeFile(lockPath, JSON.stringify(lockfile, null, 2), "utf-8");

    const exit = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await checkCommand({ root, json: true });

    expect(JSON.parse(log.mock.calls[0]![0] as string).stale).toBe(true);
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits non-zero for stale json output with --frozen", async () => {
    const root = await makeWorkspace();
    vi.spyOn(console, "log").mockImplementation(() => {});
    await lockCommand({ root, json: true });
    const lockPath = path.join(root, "skill.lock");
    const lockfile = JSON.parse(await readFile(lockPath, "utf-8"));
    lockfile.skills.hello.hash = "sha256:" + "0".repeat(64);
    await writeFile(lockPath, JSON.stringify(lockfile, null, 2), "utf-8");

    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(checkCommand({ root, json: true, frozen: true })).rejects.toThrow("exit:3");
  });

  it("does not mark an up-to-date lockfile stale when version is omitted", async () => {
    const root = await makeWorkspaceWithoutVersion();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await lockCommand({ root, json: false });
    await checkCommand({ root, frozen: true });

    expect(log).toHaveBeenLastCalledWith("✓ skill.lock is up to date.");
  });

  it("does not mark a root skill workspace stale because of the generated lockfile", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "sklock-check-"));
    const root = path.join(parent, "root-skill");
    await mkdir(root, { recursive: true });
    await writeFile(
      path.join(root, "SKILL.md"),
      "---\nname: root-skill\ndescription: Root skill\n---\n\n# Root\n",
      "utf-8"
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await lockCommand({ root, json: false });
    await checkCommand({ root, frozen: true });

    expect(log).toHaveBeenLastCalledWith("✓ skill.lock is up to date.");
  });

  it("fails validation before comparing lockfiles", async () => {
    const root = await makeWorkspace();
    await mkdir(path.join(root, "group", "skills", "hello"), { recursive: true });
    await writeFile(
      path.join(root, "group", "skills", "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Duplicate\n---\n\n# Hello\n",
      "utf-8"
    );

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(checkCommand({ root, json: true, frozen: true })).rejects.toThrow("exit:2");
  });
});
