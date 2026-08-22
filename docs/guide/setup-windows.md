<!-- ABOUTME: Windows初心者がWSL2 Ubuntuを使う開発環境をゼロから準備する。 -->
<!-- ABOUTME: 30分セットアップを始められる状態まで、実行場所と成功条件を分けて案内する。 -->

# Windowsでゼロから始める

Gitやターミナルを初めて使うWindows利用者が、[30分セットアップ](/guide/setup)を始められる状態まで準備するコースです。

このコースでは、開発用のコマンドを **WSL2のUbuntu** に統一します。PowerShellとGit Bashを行き来しません。Windows Update、ダウンロード、PCの再起動を含むため所要時間は環境によって大きく変わります。最後の[準備完了チェック](#ready-check)を通ったところから、30分セットアップの時間を数えてください。

::: info このページは環境別の補助コースです
前提ツールがすでに動く場合は、このページを読まずに[30分セットアップ](/guide/setup)へ進んでください。
:::

## このコースで使う場所

同じPCの中にありますが、役割が異なります。手順中では実行場所を **Windows** と **Ubuntu** で明記します。

| 場所 | 見分け方 | このコースで行うこと |
| --- | --- | --- |
| Windows | PowerShellは `PS C:\...>` と表示される | WSL2の導入、Docker Desktopの画面操作、ブラウザ |
| Ubuntu（WSL2） | `名前@PC名:~$` のように表示される | Git、GitHub CLI、Node.js、npm、Supabase CLI、開発コマンド |
| インターネット | `github.com` など | fork、ソースコードの取得、公式ドキュメント |
| 自分のPCだけ | `localhost`、`127.0.0.1` | 開発中のアプリとローカルSupabase |

::: warning Git Bashは使いません
GitはUbuntuの中へインストールします。Git for WindowsやGit Bashを別にインストールすると、どの環境でコマンドを実行しているか分かりにくくなるため、このコースでは使いません。
:::

## 1. WSL2とUbuntuを入れる

WSL（Windows Subsystem for Linux）は、Windowsの中でLinux環境を動かす仕組みです。このプロジェクトではUbuntuを開発用の環境として使います。

### Windows: 管理者PowerShellを開く

スタートメニューで「PowerShell」を検索し、右クリックして「管理者として実行」を選びます。開いたPowerShellで次を実行します。

```powershell
wsl --install
```

このコマンドは、WSLに必要なWindows機能を有効化し、WSL2とUbuntuをインストールします。再起動を求められたらPCを再起動してください。詳しい動作条件は[MicrosoftのWSLインストール手順](https://learn.microsoft.com/windows/wsl/install)にあります。

### Ubuntu: ユーザー名とパスワードを決める

再起動後、スタートメニューから「Ubuntu」を開きます。初回だけ、Ubuntu用のユーザー名とパスワードを尋ねられます。

- ユーザー名は英小文字から始め、英小文字と数字だけにすると安全です（例: `henkaku`）
- メールアドレスは使いません。`@` や `.` を含めないでください
- パスワードの入力中は、文字も `*` も画面に表示されません。入力は受け付けられているので、そのまま入力してEnterを押します
- Windowsのユーザー名・パスワードとは別のものです

`名前@PC名:~$` のような表示が出ればUbuntuの準備は完了です。

### Windows: WSL2になっていることを確認する

PowerShellを通常権限で開き、WSLを更新します。

```powershell
wsl --update
```

続けて、Ubuntuのバージョンを確認します。

```powershell
wsl -l -v
```

成功時の例:

```text
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

Ubuntuの `VERSION` が `2` なら成功です。`1` の場合は、表示された名前を使ってWSL2へ変換します。

```powershell
wsl --set-version Ubuntu 2
```

## 2. ターミナルの基本操作を覚える

以降の開発コマンドは、スタートメニューからUbuntuを開いて実行します。Windows Terminalを使う場合、`+` ボタンは既定のPowerShellを開くことがあります。`+` の横の `˅` から **Ubuntu** を選んでください。

### コピーと貼り付け

Windows Terminalでは、通常のアプリとキーが異なります。

| 操作 | キー |
| --- | --- |
| コピー | `Ctrl+Shift+C` |
| 貼り付け | `Ctrl+Shift+V` |
| 実行中のコマンドを止める | `Ctrl+C` |

このページのコマンドは、コード欄の右上にあるコピーボタンを使い、**1つずつ貼り付けてEnter**を押してください。複数行を一度に貼り付けて `^[[200~` などが表示された場合は、`Ctrl+C` で入力を取り消し、1行ずつやり直します。

### 開発サーバーを起動したターミナル

`npm run dev` のように起動し続けるコマンドを実行すると、そのターミナルはログ表示に使われます。別のコマンドは、もう1つUbuntuのタブを開いて実行します。終了するときは、サーバーを動かしているタブで `Ctrl+C` を押します。

## 3. UbuntuへGitを入れる

Gitは、ファイルの変更履歴を記録するツールです。GitHubは、Gitで記録した履歴をインターネット上で共有するサービスです。

### Ubuntu: パッケージ一覧を更新する

```bash
sudo apt update
```

`[sudo] password for ...:` と表示されたら、Ubuntu作成時のパスワードを入力します。画面には何も表示されません。

### Ubuntu: Gitを確認・インストールする

```bash
git --version
```

バージョンが表示されない場合だけ、次を実行します。

```bash
sudo apt install git
```

途中で `Do you want to continue? [Y/n]` と聞かれたら、`Y` を入力してEnterを押します。

### GitHubの名前と非公開メールアドレスを設定する

[GitHubアカウント](https://github.com/signup)を作成してサインインします。コミットへ普段のメールアドレスを載せたくない場合は、[GitHubのEmails設定](https://github.com/settings/emails)で `Keep my email addresses private` をオンにし、表示される `noreply` アドレスを使います。

Ubuntuで、`YOUR_GITHUB_NAME` を自分のGitHubユーザー名へ置き換えて実行します。

```bash
git config --global user.name "YOUR_GITHUB_NAME"
```

`YOUR_NOREPLY_EMAIL` をGitHubのEmails設定に表示されたアドレスへ置き換えます。

```bash
git config --global user.email "YOUR_NOREPLY_EMAIL"
```

設定を確認します。

```bash
git config --global --get user.name
```

```bash
git config --global --get user.email
```

詳しい手順は[GitHub公式のコミットメール設定](https://docs.github.com/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)にあります。

### Ubuntu: GitHubへサインインする

GitHubから公開リポジトリをcloneするだけならサインインは不要ですが、自分のforkへ `git push` するには認証が必要です。GitHubのパスワードはGit操作に使えないため、このコースではGitHub CLIのブラウザ認証を使います。

[GitHub CLI公式のDebian・Ubuntu向け手順](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)に従い、公式パッケージをインストールします。次のコード欄は、改行を含めて1つのコマンドです。

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && gh_keyring_file=$(mktemp) \
  && wget -nv -O"$gh_keyring_file" https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg < "$gh_keyring_file" > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && sudo mkdir -p -m 755 /etc/apt/sources.list.d \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update \
  && sudo apt install gh -y
```

インストールできたことを確認します。

```bash
gh --version
```

続けて、GitHubのブラウザ認証を開始します。

```bash
gh auth login --hostname github.com --git-protocol https --web
```

画面に表示される一時コードを使ってブラウザで認証します。ブラウザが自動で開かない場合は、ターミナルに表示されたURLを自分で開いてください。パスワードやPersonal Access Tokenをターミナルへ貼る必要はありません。

認証後、UbuntuのGitがGitHub CLI経由で認証できるように設定します。

```bash
gh auth setup-git
```

```bash
gh auth status
```

`Logged in to github.com` と自分のGitHubユーザー名が表示されれば成功です。認証情報の保存先が表示されても、そのファイルの内容をIssue、チャット、AIへ貼り付けないでください。詳しい動作は[GitHub CLI公式のログイン手順](https://cli.github.com/manual/gh_auth_login)と[`gh auth setup-git`の説明](https://cli.github.com/manual/gh_auth_setup-git)にあります。

## 4. UbuntuへNode.jsとnpmを入れる

Node.jsは、このプロジェクトと開発ツールを動かす実行環境です。npmは必要なライブラリをインストールします。このコースでは、Node.jsのバージョンを切り替えられる `nvm` を使います。

### Ubuntu: curlを入れる

```bash
sudo apt install curl
```

### Ubuntu: nvmを入れる

次は[nvm公式のインストーラー](https://github.com/nvm-sh/nvm#installing-and-updating)をダウンロードして実行するコマンドです。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

実行後はUbuntuのウィンドウを閉じ、もう一度Ubuntuを開きます。次のコマンドで `nvm` と表示されれば成功です。

```bash
command -v nvm
```

### Ubuntu: Node.js 24を入れる

```bash
nvm install 24
```

Node.jsとnpmを確認します。

```bash
node -v
```

```bash
npm -v
```

Node.jsが `v24` から始まるバージョンなら、このプロジェクトの要件（Node.js 22以上）を満たしています。

### Ubuntu: 開発ファイルを置く場所を作る

Linuxのツールで開発するため、リポジトリはUbuntu側のホームディレクトリへ置きます。`/mnt/c/` 以下へ置くと、ファイルアクセスが遅くなったり権限の違いで問題が起きたりするため、このコースでは使いません。

```bash
mkdir -p ~/projects
```

```bash
cd ~/projects
```

```bash
pwd
```

`/home/<Ubuntuのユーザー名>/projects` と表示されれば正しい場所です。[30分セットアップ](/guide/setup)のcloneはこの場所で実行します。

::: tip エディタを使う場合
Windows版の[Visual Studio Code](https://code.visualstudio.com/)と[WSL拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl)を入れると、Ubuntuのプロジェクト内で `code .` を実行して編集できます。Windows側とUbuntu側のNode.jsを混ぜずに済むため、この構成を推奨します。
:::

## 5. ローカルSupabaseのためにDocker Desktopを入れる {#windows-docker-setup}

Dockerは、アプリ本体ではなく**ローカルSupabase**を動かすために使います。`npx supabase start` をUbuntuで実行すると、Docker DesktopがPostgreSQLなどのSupabaseコンテナを起動します。

| 作業 | Docker |
| --- | --- |
| Git操作、`npm install`、ドキュメント作業 | 不要 |
| build、lint、型チェック、単体テスト | 不要 |
| SIWEサインイン、進捗保存、チェックイン、申請 | 必要 |
| 統合テストを含む `npm test` | 必要 |

### Windows: Docker Desktopをインストールする

[Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)をWindowsへインストールし、スタートメニューから起動します。**Ubuntu内で `sudo apt install docker` や `sudo apt install docker.io` は実行しません。** Docker DesktopとUbuntu内のDocker Engineが競合するのを避けるためです。

Docker Desktopで次を確認します。

1. `Settings` → `General` に `Use WSL 2 based engine` が表示される場合は有効にする。WSL2対応環境では既定で有効になり、この項目自体が表示されない場合があります。その場合は正常なので次へ進む
2. `Settings` → `Resources` → `WSL Integration` で `Ubuntu` が有効
3. 設定を変更した場合は `Apply` または `Apply & restart` を押す

`WSL Integration` が表示されない場合は、Docker DesktopがWindowsコンテナモードになっていないか確認し、Linuxコンテナへ切り替えます。公式手順は[Docker Desktop WSL2 backend](https://docs.docker.com/desktop/features/wsl/)にあります。

### Ubuntu: Dockerへの接続を確認する

Docker Desktopを起動したまま、Ubuntuをいったん閉じて開き直します。それから次を実行します。

```bash
docker version
```

出力に `Client` と `Server` の両方があれば成功です。`Server` がなく接続エラーになる場合は、次のトラブルシューティングへ進みます。

## Windows・Dockerのトラブルシューティング {#windows-docker-troubleshooting}

### `wsl --install` でヘルプが表示される

WSL本体だけが入っていて、Ubuntuがまだない可能性があります。管理者PowerShellで利用可能なディストリビューションを確認します。

```powershell
wsl --list --online
```

一覧にUbuntuがあればインストールします。

```powershell
wsl --install -d Ubuntu
```

### `Virtualization support not detected` または `WSL not installed`

タスクマネージャーの「パフォーマンス」→「CPU」で「仮想化: 有効」か確認します。有効なのに失敗する場合は、管理者PowerShellで次を実行してからPCを再起動します。

```powershell
wsl --update
```

```powershell
wsl -l -v
```

Ubuntuが一覧にあり `VERSION` が `2` であることを確認します。仮想化が無効の場合、機種ごとに設定方法が異なるため、PCメーカーまたは管理者へ確認してください。

### Docker Desktopが `Starting the Docker Engine...` から進まない

次の順番で、成功したところで止めます。

1. PowerShellの `wsl -l -v` でUbuntuがWSL2になっているか確認する
2. PowerShellの `wsl --update` を実行し、PCを再起動する
3. Docker Desktopの `Troubleshoot` → `Restart Docker Desktop` を実行する
4. Docker Desktopの `Troubleshoot` から診断情報を取得し、表示されたエラーを確認する
5. 解決しない場合は[Docker公式トラブルシューティング](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/)を確認する

`Reset to factory defaults` はDockerの設定とローカルデータへ影響する最終手段です。実行前に、他の開発で必要なコンテナ・イメージ・ボリュームがないか確認してください。

ウイルス対策ソフトが原因の場合は、Dockerの診断ログなどに具体的な `Access is denied` が残ります。一般的な手順としてウイルス対策を停止せず、利用中の製品の除外設定または管理者への相談を優先してください。

### UbuntuでDockerソケットの `permission denied` が出る

このコースの構成では、最初にユーザーを `docker` グループへ追加しません。次を確認します。

1. WindowsでDocker Desktopが起動している
2. Docker Desktopの `Resources` → `WSL Integration` でUbuntuが有効
3. `Apply & restart` 後にUbuntuを閉じて開き直した
4. UbuntuへDocker Engineを別途インストールしていない

それでも解決しない場合は、`sudo usermod` を試す前に、エラー全文から秘密情報を除いてIssueで相談してください。`docker` グループはroot相当の権限を与えるため、原因を確認せずに追加しません。

### Ubuntuを開くと `Wsl/Service/0x8007274c` になる

原因をPC負荷と断定せず、実行中の作業を保存してからWSLを再起動します。PowerShellで次を実行すると、Ubuntu、開発サーバー、DockerのWSL環境を含む実行中のWSLがすべて停止します。

```powershell
wsl --shutdown
```

その後、UbuntuとDocker Desktopを起動し直します。

## AIに相談するとき

AIはエラーの説明や切り分けの補助に使えますが、ガイドや公式ドキュメントの代わりにはしません。次の形で相談すると、現在地を見失いにくくなります。

```text
HENKAKU Initiationの「Windowsでゼロから始める」の手順Nを進めています。
実行場所: Windows PowerShell / WSL2 Ubuntu のどちらか
実行したコマンド: （秘密情報を除いて書く）
エラー: （秘密情報を除いて書く）

1. 今何が失敗しているかを説明してください。
2. まず読み取りだけの確認方法を提示してください。
3. リセット、削除、アンインストール、権限変更、ウイルス対策設定の変更が必要なら、影響を説明して私の確認を待ってください。
4. キーやパスワードを貼るよう求めないでください。
```

::: danger Supabaseの出力をそのまま貼らない
`npx supabase start` と `npx supabase status` の出力には `Secret` が含まれます。Issue、チャット、AIへ全文を貼り付けないでください。
:::

## 準備完了チェック {#ready-check}

Ubuntuで、次がすべて成功することを確認します。

```bash
git --version
```

```bash
gh auth status
```

```bash
node -v
```

```bash
npm -v
```

```bash
docker version
```

`gh auth status` に自分のGitHubユーザー名、`docker version` に `Client` と `Server` の両方が表示されたら準備完了です。Ubuntuで `~/projects` に移動した状態から、メインの手順へ進みます。

→ [30分セットアップを始める](/guide/setup)
