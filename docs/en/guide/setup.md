# 30-Minute Setup

> Source: [Japanese original (Japanese)](/guide/setup). Translated from [revision 3d4f3a4](https://github.com/henkaku-center/initiation/blob/3d4f3a4755902601bd566af7821860df124f846b/docs/guide/setup.md). Later changes to the original may not yet be reflected here.

Follow these steps to run the app locally. Each step includes the command to run and **what you should see when it succeeds**. If your output differs, see [Troubleshooting (Japanese)](/guide/troubleshooting).

::: info Installing the prerequisites on Windows for the first time
The 30-minute estimate assumes that Git, Node.js, npm, and Docker Desktop are already working. If you are new to Git or terminals on Windows, start with [Starting from Scratch on Windows (Japanese)](/guide/setup-windows). Return to this guide after passing its readiness checks.
:::

::: warning Handling secrets
The `.env.local` file you create here contains secrets. Do not include it in commits, issues, Pull Requests, or chats. Although `.gitignore` excludes it, check that command output contains no secret values before sharing it.
:::

## Estimated time

| Step | Estimate |
| --- | --- |
| 1. Check the prerequisites | 5 minutes |
| 2. Get the repository and dependencies | 5 minutes |
| 3. Set environment variables | 5 minutes |
| 4. Start local Supabase | 10 minutes (including Docker image downloads on the first run) |
| 5. Start the development server | 2 minutes |
| 6. Verify that it works | 3 minutes |

Downloading Docker images takes time on the first run. Subsequent runs finish in a few minutes.

## 1. Check the prerequisites

### Required

You need **Node.js 22.0.0 or later** and **npm**. Use whichever version manager you prefer (nvm, mise, Volta, etc.).

```bash
node -v
npm -v
```

Example of successful output:

```
v24.4.1
11.4.2
```

Use `v22.0.0` or later. If no version appears, install [Node.js](https://nodejs.org/).

::: warning Node.js 20 is not supported
Dependencies such as `@supabase/supabase-js` require Node.js 22 or later. With Node.js 20, `npm install` in the next step produces an `EBADENGINE` warning, and warnings continue during builds and tests. Upgrade an older version before proceeding.
:::

You also need **Git**.

```bash
git --version
```

### Required for local Supabase

The project stores data in Supabase (PostgreSQL). **Docker Desktop** is required for full verification with local Supabase and for integration tests. It is not required for documentation work or unit tests alone.

```bash
docker version
```

Successful output includes both `Client` and `Server`. If `Server` is missing and you see a connection error, start Docker Desktop. For initial setup in Windows with WSL2, see the [Docker instructions for Windows (Japanese)](/guide/setup-windows#windows-docker-setup).

The Supabase CLI runs through `npx`, so you do not need to install it beforehand.

### Wallet

To operate the screens from `/setup` onward, install an **Injected Wallet such as MetaMask** in your browser. A wallet is not required for work that does not involve these screens, such as documentation changes.

## 2. Get the repository and install dependencies

For external contributions, fork this repository on GitHub first, then clone your fork.

```bash
git clone https://github.com/<your-account>/initiation.git
cd initiation
npm install
```

Example of successful output:

```
added 461 packages, and audited 462 packages in 5s
```

::: tip Why fork?
A fork lets you submit Pull Requests without write access to `henkaku-center/initiation`. If you have write access, you can clone the repository directly.
:::

## 3. Set environment variables

Copy the template.

```bash
cp .env.example .env.local
```

Open `.env.local` and set its values. See [Environment Variables (Japanese)](/reference/environment) for what each variable means.

### Create a session encryption key

`SESSION_PASSWORD` must be a random string of at least 32 characters.

```bash
openssl rand -base64 32
```

Paste the output after `SESSION_PASSWORD=` in `.env.local`. **The value is displayed in the terminal, so take care when screen sharing or pasting command output.**

### To use the admin screen

To check `/admin`, set your own wallet address.

```
ADMIN_ADDRESSES=0xYourAddress
```

Separate multiple addresses with commas. Restart the development server after changing the configuration.

### HENKAKU token configuration

The four `NEXT_PUBLIC_HENKAKU_TOKEN_*` variables are public information, so `.env.example` includes development defaults. **No changes are required.**

Check that your copied `.env.local` contains the following values. If they are empty, `/setup` displays a message saying that HENKAKU token settings are missing.

```
NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS=0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2
NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL=HENKAKU
NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS=18
NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL=https://raw.githubusercontent.com/henkaku-center/omise-interface/main/public/henkakuToken.png
```

This is the HENKAKU token address on Polygon, passed to the wallet when `/setup` asks whether to add the token. The basis for these values is recorded in the [Decision Log (Japanese)](/decisions).

## 4. Start local Supabase

Check that Docker Desktop is running, then run:

```bash
npx supabase start
```

The first run downloads Docker images and takes a few minutes. On success, connection information appears. Here is part of the output:

```
Applying migration 20260806000001_core_tables.sql...

Authentication Keys
Publishable  sb_publishable_...
Secret       sb_secret_...

APIs
Project URL  http://127.0.0.1:54321
```

::: danger This output contains keys
The output of `supabase start` and `supabase status` includes `Secret`. Do not paste this output directly into an issue or chat.
:::

### Set the connection information in .env.local

```bash
npx supabase status
```

Copy these two values from the output into `.env.local`:

| Field in `supabase status` | Variable in `.env.local` |
| --- | --- |
| `Project URL` under `APIs` | `SUPABASE_URL` |
| `Secret` under `Authentication Keys` | `SUPABASE_SERVICE_ROLE_KEY` |

`Secret` under `Authentication Keys` is the successor to the legacy `service_role` key and is used only on the server. It is not the `Secret Key` under `Storage (S3)`. In this repository, keep using the environment variable name `SUPABASE_SERVICE_ROLE_KEY`. The Repository connection does not use `Publishable`. See the [official Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys) for details.

### Apply the schema

```bash
npx supabase db reset
```

On success:

```
Applying migration 20260806000001_core_tables.sql...
{"target":"local","version":"","message":"Reset local database."}
```

`WARN: no files matched pattern: supabase/seed.sql` appears because there is no initial data file. This is expected.

::: tip Local Supabase administration
Open `http://127.0.0.1:54323` to view tables in Supabase Studio.
:::

## 5. Start the development server

```bash
npm run dev -- --port 3000
```

Example of successful output:

```
▲ Next.js 16.3.0 (Turbopack)
- Local:  http://localhost:3000
- Environments: .env.local
✓ Ready in 1200ms
```

If `- Environments: .env.local` appears, the environment variables have been loaded.

This command keeps the development server running, so the terminal displays its logs. Run the tests below in another terminal opened in the same repository, or press `Ctrl+C` in this terminal to stop the server first.

::: warning Use the Local URL to check wallet behavior
Next.js may also print `Network: http://<LAN-IP>:3000`, but for standard verification, open **`Local: http://localhost:3000`**.

With the Network URL, Next.js development JavaScript may return `403 Forbidden`, leaving the page visible but wallet connection nonfunctional. Configuring access from another device over the LAN is outside the scope of this setup guide.
:::

::: warning Port conflicts
If a development server is already running, do not start another process on the same port. To use a different port, specify it with an option such as `--port 3001`.
:::

## 6. Verify that it works

Open `http://localhost:3000` in your browser. Once the home page appears, also check that the wallet connection button works at `http://localhost:3000/setup`.

If the page appears over a LAN IP but wallet connection does not work, see [Page loads over a LAN IP but wallet connection fails (Japanese)](/guide/troubleshooting#wallet-connection-lan-ip).

Next, check that the tests pass.

```bash
npm test
```

On success:

```
Test Files  15 passed (15)
     Tests  78 passed (78)
```

The counts change as tests are added. **Success means that `failed` is 0 and all tests show `passed`.**

::: tip Integration tests
Tests are split into unit tests and integration tests that use local Supabase. Integration tests automatically load Supabase settings from `.env.local`, so running `npm test` with Supabase running executes both. Integration tests fail if Supabase is not running.
:::

Finally, check that the other verification commands pass.

```bash
npm run build
npx tsc --noEmit
npm run lint
```

::: warning Execution order matters
`npx tsc --noEmit` depends on types generated by Next.js during the build. **Run `npm run build` first immediately after cloning.** Reversing this order produces an error such as `Cannot find name 'LayoutProps'`.
:::

## If something goes wrong

Find possible causes based on the symptoms you see.

→ [Troubleshooting (Japanese)](/guide/troubleshooting)

## What to read next

With your environment ready, make a change and submit a Pull Request.

→ [Your First Contribution](/en/guide/contributing)
