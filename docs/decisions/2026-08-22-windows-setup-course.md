<!-- ABOUTME: Windows初心者向けセットアップをWSL2の補助コースとして提供する決定を記録する。 -->
<!-- ABOUTME: 30分セットアップを主導線として維持し、Windows固有の複雑さを分離する。 -->

# 2026-08-22 Windows初心者向けセットアップコース

- 課題: 既存の30分セットアップはGit、Node.js、ターミナル、Docker Desktopが導入済みであることを事実上の前提としている。Windowsでこれらを初めて使う参加者は、Git Bash、PowerShell、WSL2 Ubuntuを混同し、Docker DesktopとWSL2の導入だけで長時間停止することがある。
- 決定: 30分セットアップを開発者向けの主導線として維持し、Windowsで前提ツールをゼロから用意する補助コースを別ページに置く。グローバルナビゲーションには追加せず、30分セットアップからの案内と、折りたたんだ「環境別ガイド」から到達できるようにする。
- 標準環境: Windows上のWSL2 UbuntuへGit、Node.js、npm、プロジェクトファイルを置く。開発コマンドはUbuntuで実行し、PowerShellはWSLの導入・診断、Windowsの画面操作はDocker Desktopとブラウザに限定する。Git BashとPowerShellでのプロジェクト実行は初心者コースの対象外とする。
- Dockerの境界: Docker DesktopはローカルSupabaseと統合テストのために使う。アプリ本体の実行環境ではない。WindowsへDocker Desktopを入れ、UbuntuではDocker DesktopのWSL Integrationを使う。UbuntuへDocker Engineを別途インストールしない。
- 安全性: Dockerのfactory reset、ウイルス対策ソフトの設定変更、`docker`グループへの追加は標準手順にしない。読み取り確認、再起動、公式診断の後に扱い、データ・権限・保護機能への影響を先に説明する。
- 時間の定義: Windows補助コースはダウンロードと再起動を含むため30分を約束しない。Git、Node.js、npm、Dockerの準備完了チェックを通過した時点を、30分セットアップの開始点とする。
