import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { whyCommand } from "./why.js";

describe("whyCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits 1 when the skill id is unknown", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-why-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\n---\n\n# Hello\n",
      "utf-8"
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });
    await expect(whyCommand("ghost", { root })).rejects.toThrow("exit:1");
  });

  it("does not call an unrequired internal skill a root skill", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-why-"));
    await mkdir(path.join(root, "app", "skills", "worker"), { recursive: true });
    await writeFile(
      path.join(root, "app", "SKILL.md"),
      "---\nname: app\ndescription: App\n---\n\n# App\n",
      "utf-8"
    );
    await writeFile(
      path.join(root, "app", "skills", "worker", "SKILL.md"),
      "---\nname: worker\ndescription: Worker\n---\n\n# Worker\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await whyCommand("worker", { root });

    expect(log).toHaveBeenCalledWith("worker is an internal skill under app and is not required by any skill.");
  });
});
