import { z } from "zod";

const SkillIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase kebab-case");

const PosixRelPathSchema = z
  .string()
  .min(1)
  .regex(/^[^/\\][^\\]*$/, "Path must be a POSIX relative path without backslashes");

const HashSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/, "Hash must be in sha256:<64 hex> format");

export const LockEntrySchema = z.object({
  id: SkillIdSchema,
  path: PosixRelPathSchema,
  version: z.string().optional(),
  /** Hash of this skill's own files only (excludes nested skills/ subdirectory). */
  contentHash: HashSchema,
  /** Hash of this skill and all descendant sub-skills (full closure). */
  closureHash: HashSchema,
  requires: z.array(SkillIdSchema).default([]),
  parent: SkillIdSchema.optional(),
});

export const LockfileSchema = z.object({
  version: z.literal("1").default("1"),
  generatedBy: z.object({
    name: z.string(),
    version: z.string(),
  }).optional(),
  /** SHA-256 over all skill contentHashes and closureHashes; one-shot workspace identity check. */
  workspaceHash: HashSchema.optional(),
  skills: z.record(z.string(), LockEntrySchema),
}).superRefine((lockfile, ctx) => {
  for (const [key, entry] of Object.entries(lockfile.skills)) {
    if (entry.id !== key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skills", key, "id"],
        message: `Lock entry id must match its key (${key})`,
      });
    }
  }
});

export type LockEntry = z.infer<typeof LockEntrySchema>;
export type Lockfile = z.infer<typeof LockfileSchema>;
