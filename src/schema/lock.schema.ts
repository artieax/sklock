import { z } from "zod";

export const LockEntrySchema = z.object({
  id: z.string(),
  path: z.string(),
  version: z.string().optional(),
  hash: z.string(),
  requires: z.array(z.string()).default([]),
  parent: z.string().optional(),
});

export const LockfileSchema = z.object({
  version: z.string().default("1"),
  generatedBy: z.object({
    name: z.string(),
    version: z.string(),
  }).optional(),
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
