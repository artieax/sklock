import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SkillSchema } from "./skill.schema.js";

describe("schemas/skill-frontmatter.json", () => {
  it("matches zodToJsonSchema(SkillSchema) output", async () => {
    const generated = zodToJsonSchema(SkillSchema, { name: "SkillFrontmatter" });
    const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../schemas/skill-frontmatter.json");
    const onDisk = JSON.parse(await readFile(schemaPath, "utf-8"));
    expect(onDisk).toEqual(generated);
  });
});
