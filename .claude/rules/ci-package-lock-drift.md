---
paths:
  - "package.json"
  - "package-lock.json"
  - ".github/workflows/**"
---

# CI 失敗 — package-lock.json ズレ

CI が `@types/node` や他の型定義パッケージのバージョン不一致で落ちるとき、
まず `package.json` と `package-lock.json` の乖離を疑う。

## 症状

- CI ログに `@types/node` のバージョン不一致（例: `package.json` が `^20.19.0` なのに lock が `25.6.x`）
- ローカルでは通るが CI だけ落ちる

## 診断・修正

```bash
npm install
git add package-lock.json
git commit -m "fix(ci): sync package-lock.json"
git push
```

## 根拠

npm install は lock ファイルを package.json の semver 範囲に従って再解決する。
lock の手動編集は禁止。必ず npm install で生成させる。
