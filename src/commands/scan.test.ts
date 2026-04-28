import { mkdir, mkdtemp } from "fs/promises";
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
    expect(Array.isArray(payload.skills)).toBe(true);
    expect(Array.isArray(payload.warnings)).toBe(true);
  });
});
