# 暗号化イントロの参照アーカイブ

複数バブルへ切り替える直前（commit `023859567abeb011e501a8cecdb67ee684734e83`）のソースとレイアウトです。ユーザーの追加指定によりGitHubにも残し、イントロの比較ボタンから再生できます。標準表示はBubble Multiです。

- `liquid.html`: 公開されたLiquidソースを基に、連打時のrenderer競合や文字の重なりを修正した版。
- `intro-shell.css`: 全画面化、重複リンクの整理、スマートフォン・横向き対応。
- `scripts/demo/build-encrypted-intro.mjs`: この原本から`public/demo-assets/gateway/intro.html`を生成するアダプター。
- `public/demo-assets/gateway/{bubble,decrypt-reveal}.js`: 暗号化版が使う描画モジュール。元の著作権表示とMIT + Commons Clauseは保持されています。

復元は比較UIの標準モードを変更するか、原本とアダプターを使って新たなイントロを構成します。旧版の書き換えを最小限にして比較基準を保ちます。出典は https://henkaku-ui.vercel.app/liquid と`public/demo-assets/gateway/CREDITS.md`。
