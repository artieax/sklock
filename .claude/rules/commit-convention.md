---
# Applies to all work in this project
---

# Commit Convention (sklock)

sklock は **plain conventional commits** を使う。gitmoji・絵文字は使わない。

## フォーマット

```
<type>(sklock): <title>
```

- type: `feat` / `fix` / `chore` / `refactor` / `test` / `docs`
- scope は常に `sklock`（省略可だが一貫して付ける）
- 1コミット = 1概念

## 例

```
feat(sklock): add lint/add commands, test suite, examples, and community docs
fix(sklock): sync package-lock.json for CI
chore(sklock): update CHANGELOG for v0.2.0
```

## 注意

- `bake rules: ...` スタイルは **global-skills 専用**。sklock では使わない
- `🚀 feat(sklock): ...` のように emoji を混ぜない
- コミット前にログを `git log --oneline -5` で確認し、既存のスタイルと一致させる

## 根拠 (session 86a9e870)

bommit を sklock で使ったとき、既存ログに `🚀 feat(sklock):` と `bake rules:` が混在しており、
AI がどちらに揃えるか判断できず確認が必要になった。
その後 force push でリライトする手戻りが発生した。
convention を先に明記することでこの往復を防ぐ。
