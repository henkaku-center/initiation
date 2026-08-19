# 2026-08-18 TypeScriptのmajor更新を保留する(PR #66)

- 課題: Dependabotが `typescript` を 6.0.3 から 7.0.2 へ上げるPR #66 を作った。lockfileの不整合(`docs/decisions/2026-08-11-dependabot-lockfile-recovery.md`)を復旧して検証したところ、`npm run lint` だけが落ちた。

## 実測

PR #66 のブランチでlockfileを復旧し、CIと同じ検証を通した結果は次のとおり。

| コマンド | 結果 |
| --- | --- |
| `npm ci` (npm 10.9.8) | 成功 |
| `npm run build` | 成功 |
| `npx tsc --noEmit` (Version 7.0.2) | 成功 |
| `npm run lint` | **失敗** |
| `npm test` (152 tests) | 成功 |
| `npm run docs:build` | 成功 |

`npm run lint` は次のエラーで、ファイルを1つも検査せずに終了する。

```text
typescript-eslint does not support TS 7.0.
See also https://github.com/typescript-eslint/typescript-eslint/issues/10940 for tracking
typescript-eslint's support for TS >=7.1
```

`eslint-config-next` が依存する typescript-eslint が、TS 7.0 を実行時に明示的に拒否している。回避するには TS 6 の API を側で動かす構成へ変える必要がある。設定の調整で消せる警告ではない。

なお `npx tsc --noEmit` が通るのは、TypeScript 7 のネイティブコンパイラ自体はこのコードベースを型検査できるためで、移行の障害は lint 側にしかない。

## 決定

`typescript` の semver-major を `.github/dependabot.yml` の `ignore` へ追加し、PR #66 は閉じる。

`next` / `eslint-config-next` / `react` / `react-dom` と同じ扱いにする(`docs/decisions/2026-08-10-dependency-updates.md` の決定3)。理由は違う。フレームワークは「手で移行するのでPRが来ないほうがよい」だが、TypeScriptは**上げると必ずCIが赤くなり、しかもリポジトリ側では直せない**ためである。週次で同じ赤いPRが再作成される状態を避ける。

minorとpatchはこれまでどおり `development-minor-patch` グループで更新される。保留するのはmajorだけである。

## 保留を解除する条件

typescript-eslint が TS 7 に対応し(upstream の [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940))、`eslint-config-next` がその版を取り込んだ時点で `ignore` を外す。解除は次の順で確認する。

1. `typescript` を 7 系へ上げたブランチで `npm run lint` が成功する
2. `npx tsc --noEmit` と `npm run build` が成功する
3. `npm test` が全PASSする

## 代償

**TypeScriptのmajorが出たことに自動では気づけない。** 解除条件の確認は人が意図して行う作業になる。
