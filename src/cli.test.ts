import { mkdir, mkdtemp, symlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";
import { describe, expect, it, vi } from "vitest";
import { createSklockCli, isCliEntryPoint } from "./cli.js";

describe("createSklockCli", () => {
  it("prints version for --version", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const cli = createSklockCli();
    cli.parse(["node", "sklock", "--version"], { run: false });
    expect(log).toHaveBeenCalled();
    expect(String(log.mock.calls[0]![0])).toMatch(/\d+\.\d+\.\d+/);
  });

  it("prints help for --help", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const cli = createSklockCli();
    cli.parse(["node", "sklock", "--help"], { run: false });
    expect(log).toHaveBeenCalled();
    const help = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(help).toMatch(/Commands?:/i);
    expect(help).toMatch(/init/i);
  });

  it("detects symlinked npm bin entrypoints as the CLI entrypoint", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-cli-"));
    const realEntry = path.join(root, "dist", "cli.js");
    const linkedEntry = path.join(root, "bin", "sklock");
    await mkdir(path.dirname(realEntry), { recursive: true });
    await mkdir(path.dirname(linkedEntry), { recursive: true });
    await writeFile(realEntry, "", "utf-8");
    await symlink(realEntry, linkedEntry);

    expect(isCliEntryPoint(pathToFileURL(realEntry).href, linkedEntry)).toBe(true);
  });
});
