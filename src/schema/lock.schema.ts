import { z } from "zod";

export const LockEntrySchema = z.object({
  id: z.string(),
  path: z.string(),
  version: z.string().optional(),
  hash: z.string(),
  requires: z.array(z.string()).default([]),
});

export const LockfileSchema = z.object({
  version: z.string().default("1"),
  generatedAt: z.string(),
  skills: z.record(z.string(), LockEntrySchema),
});

export type LockEntry = z.infer<typeof LockEntrySchema>;
export type Lockfile = z.infer<typeof LockfileSchema>;
