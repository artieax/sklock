import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SkillSchema } from "../src/schema/skill.schema.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outDir = join(scriptDir, "../schemas");
const outPath = join(outDir, "skill-frontmatter.json");

const jsonSchema = zodToJsonSchema(SkillSchema, { name: "SkillFrontmatter" });
await mkdir(outDir, { recursive: true });
await writeFile(outPath, `${JSON.stringify(jsonSchema, null, 2)}\n`, "utf-8");

console.log(`Wrote ${outPath}`);
