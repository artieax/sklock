---
# Applies to all work in this project
---

# point レビュー実装フロー + フィールドリネーム注意

`temp/point-*.md` は sklock の機能レビュー・改善計画書。
ユーザーが「point-N.md を直して」と言ったら以下のフローで進める。

## 手順

1. `temp/point-N.md` を Read する
2. codebase 構造を探索（`src/`, `tests/`）
3. 実装（並列 Edit 可）
4. `npm run build && npm test` で全テスト通す（86+ tests, TypeScript type check 必須）
5. `/bommit` で commit + push

## フィールドリネーム時の必須作業

TypeScript の型/インターフェースでフィールド名を変更するとき（例: `hash` → `contentHash`）:

```bash
# 旧フィールド名の全参照を検索（テストファイル含む）
grep -r "\.oldFieldName" src/ tests/
```

- テストファイルの `.oldFieldName` を `.newFieldName` に一括置換
- JSON スキーマを使用している場合はスキーマ再生成コマンドを実行
- `examples-workspaces.test.ts` は on-disk ファイルと比較するためスキーマ変更後に lockfile 再生成が必要

見落とすと `npm test` で複数テストが落ちる（session 18dc6637: `.hash` → `.contentHash` リネームで 3 tests 失敗、2 ラウンド修正が必要だった）。

## テストスイートの構成

- lockfile 系: `tests/lockfile.test.ts`
- check/doctor: `tests/check.test.ts`
- examples workspace: `tests/examples-workspaces.test.ts`（on-disk との比較あり）

examples-workspaces テストが失敗した場合は `npm run generate-examples` または類似コマンドで lockfile を再生成する。
