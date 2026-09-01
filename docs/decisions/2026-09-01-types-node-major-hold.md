# 2026-09-01 @types/nodeのmajorを最低対応Nodeに合わせて保留する(PR #94)

- 課題: `package.json` は Node.js 22以上をサポートし、静的CIは最低対応のNode 22で実行している。一方、Dependabotは `@types/node` を22.20.1から26.4.0へ上げるPR #94を作った。

## 判断

Node.js 22を最低対応として維持し、`@types/node` も22系に留める。`.github/dependabot.yml` で `@types/node` のsemver-majorを無視し、PR #94はマージせず閉じる。

`@types/node` は開発ツールの実行バージョンではなく、アプリケーションコードが利用可能だと型検査で判断するNode.js APIを定義する。26系の型を先に入れると、Node.js 26で追加されたAPIをコードが使用しても型検査が通り、サポート対象のNode.js 22では実行時に失敗しうる。

このリポジトリでは以前、最低対応をNode.js 22へ上げた後も `@types/node` が20系に残っていた不一致をIssue #28で修正した。PR #94を採用すると、今度は型定義が最低対応ランタイムより先行する逆向きの不一致になる。

22系のminor/patchは、これまでどおりDependabotの `development-minor-patch` グループで更新する。無視するのはmajorだけである。

## 保留を解除する条件

Node.jsの最低対応majorを意図して引き上げるときに、`@types/node` も同じmajorへ更新してignoreを外す。少なくとも次を同じ変更として確認する。

1. `package.json` の `engines.node` を新しい最低対応majorへ更新する
2. 静的・統合・ドキュメントCIとデプロイ先のNode.js runtimeを、そのmajor以上へ揃える
3. build、typecheck、lint、単体・統合テスト、ドキュメントbuildを新しい最低対応runtimeで成功させる
4. runtime変更と型定義変更を同じPRでレビューする

## 代償

`@types/node` の新しいmajorが公開されてもDependabot PRでは通知されない。Node.js runtimeのmajor更新は、型定義だけを先行させず、対応環境全体を確認する計画的な変更として扱う。
