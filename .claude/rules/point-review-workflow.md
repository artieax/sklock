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

## スキーマ検証 regex 変更時のフィクスチャ更新

ハッシュ形式を変更するとき（例: 短縮 hex → `sha256:<64hex>`）、スキーマ regex が厳密になると
テストフィクスチャ内のプレースホルダー値（`"changed"` 等）が新 regex に引っかかり複数テストが落ちる。

```bash
# テストファイル内のハッシュプレースホルダーを一括検索
grep -r '"changed"' tests/
grep -r 'sha256:' tests/
```

- テストで使うフィクスチャハッシュは形式合法な偽ハッシュ（64文字 hex）に揃える
- `check.test.ts` はとくに旧形式プレースホルダーが残りやすい（session 9362ffc3 で実例）

## lockfile 再生成時の generatedBy 不一致

`npm run generate-examples` など CLI 経由で lockfile を生成すると、
プログラマティック API が含めない `generatedBy` メタデータフィールドが追加される場合がある。
テストがプログラマティック API の出力と disk ファイルを比較していると不一致で失敗する。

対応: `generatedBy` 無しで再生成するか、テストの比較対象から `generatedBy` を除外する。
