---
paths:
  - "src/schema/**"
  - "src/core/validator.ts"
---

# Zod スキーマ拡張パターン（superRefine / ZodEffects）

Zod で `.refine()` / `.superRefine()` を呼ぶと **`ZodEffects`** が返る。
`ZodEffects` には `.extend()` / `.merge()` が存在しないため、
既存スキーマに refine を追加した後でフィールドを追加しようとするとコンパイルエラーになる。

## 問題のパターン（NG）

```typescript
// NG: SkillSchema.superRefine() → ZodEffects → .extend() でエラー
const SkillSchema = z.object({...}).superRefine(() => { ... });
const StrictSchema = SkillSchema.extend({ extra: z.string() }); // TypeError
```

## 正しいパターン

```typescript
// OK: base shape を先に定義し、両スキーマをそこから派生
const SkillShape = {
  name: z.string(),
  description: z.string().optional(),
  // ...
};

const SkillSchema = z.object(SkillShape).superRefine((val, ctx) => {
  // 通常の検証
});

const SkillStrictSchema = z.object({
  ...SkillShape,
  description: z.string(), // optional → required に絞り込む
}).superRefine((val, ctx) => {
  // strict 用追加検証
});
```

## バリデーター関数の対応

スキーマを 2 系統にするときは、バリデーター関数も対に作る:

- `validateSkills()` — 通常
- `validateSkillsStrict()` — strict モード (`--strict` flag)

## 根拠 (session c2c373e9)

`--strict` フラグ実装で `SkillSchema.extend()` を試みたが、
`superRefine` 適用後の ZodEffects に `.extend()` が存在せずコンパイルエラー。
base shape を共有してスキーマを並列構成することで解決。
