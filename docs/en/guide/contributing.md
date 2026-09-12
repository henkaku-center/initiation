# Your First Contribution

> Source: [Japanese original (Japanese)](/guide/contributing). Translated from [revision 3d4f3a4](https://github.com/henkaku-center/initiation/blob/3d4f3a4755902601bd566af7821860df124f846b/docs/guide/contributing.md). Later changes to the original may not yet be reflected here.

This guide walks through choosing an issue, making a change, and submitting a Pull Request. It assumes you have completed [30-Minute Setup](/en/guide/setup).

## Overview

1. Share the purpose and scope in an issue
2. Configure your Git name and email (first time only)
3. Create a working branch from `main`
4. Add tests first
5. Implement the change and run verification commands
6. Submit a Pull Request

## 1. Choose an issue

Start with the [issue list](https://github.com/henkaku-center/initiation/issues). Look for labels such as `good first issue` and `documentation`.

Once you choose an issue, **comment that you are taking it on before starting**. This prevents duplicated work.

To propose a change without an existing issue, first open an issue to share its purpose and scope. Agreeing on the direction first is faster than opening a large Pull Request without prior discussion.

::: warning Record decisions first
Do not decide specifications or library choices on your own. Record matters requiring a decision in the [Decision Log (Japanese)](/decisions) before implementation. Without the reasoning, decisions become difficult to revisit.

Add **one file per decision** under `docs/decisions/`, named `YYYY-MM-DD-short-identifier.md` (do not append to an existing file). This avoids conflicts when multiple Pull Requests add decisions at the same time.
:::

## 2. Configure your Git name and email (first time only)

Commits record the author's name and email address. If you have not configured them yet, replace `YOUR_GITHUB_NAME` with your GitHub username.

```bash
git config --global user.name "YOUR_GITHUB_NAME"
```

If you do not want to include your regular email address in commits, enable `Keep my email addresses private` in [GitHub's Emails settings](https://github.com/settings/emails), then configure the displayed `noreply` address.

```bash
git config --global user.email "YOUR_NOREPLY_EMAIL"
```

See [GitHub's official commit email instructions](https://docs.github.com/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address) for details. Skip this step if already configured.

## 3. Create a working branch

Branch from `main`.

```bash
git checkout main
git pull origin main
git checkout -b agent/navigation-readme
```

Choose a branch name that describes the change (for example, `agent/navigation-readme` or `fix/apply-status-label`).

## 4. Add tests first

This project follows a **tests-first** approach. Add a failing test, then implement the change.

Tests are organized by their purpose.

| Location | Purpose | Local Supabase |
| --- | --- | --- |
| `tests/unit/` | Server Actions, domain logic, authorization guards, etc. | Not required |
| `tests/integration/` | Repositories connecting to Supabase | **Required** |
| `tests/support/` | Database initialization and helpers for integration tests | — |

Vitest targets `tests/**/*.test.ts`.

### Guidelines for writing tests

- Domain logic (`lib/domain/`) consists of pure functions independent of the database and Next.js, making it a suitable place for unit tests
- For Server Action tests, mock the Repository and authorization guards, and also verify that **invalid input does not call the Repository**
- Verify Repository behavior (unique constraints, audit logs) with integration tests

Existing tests provide examples. Look for similar tests first.

```bash
ls tests/unit/app/admin/
ls tests/integration/
```

## 5. Implement and verify

After implementation, run the following commands in order.

```bash
npm test
npm run build
npx tsc --noEmit
npm run lint
```

Check that they all pass before submitting a Pull Request. See [Verification Commands (Japanese)](/reference/commands) for details.

::: tip If a check fails
Run `npm run build` first to resolve `Cannot find name 'LayoutProps'`. If integration tests fail with `SUPABASE_SERVICE_ROLE_KEY`, check that local Supabase is running. → [Troubleshooting (Japanese)](/guide/troubleshooting)
:::

## 6. Submit a Pull Request

Push to your fork, then create a Pull Request.

```bash
git push -u origin <branch-name>
```

### What to include in a Pull Request

Include these three items in the body.

**Reason for the change** — Why the change is needed. If there is an issue, include `Closes #123` to close it automatically when the Pull Request is merged.

**Verification** — What you checked and how. Include the commands and results. Along with whether tests passed, include the number of passing tests and the cases you added.

**Unresolved decisions** — Points requiring judgment or a separate decision. Recording them makes review discussions more focused.

### For UI changes

Attach a screenshot or manual verification steps. For screens such as `/admin` that require signing in with an administrator wallet, screenshots can be difficult to capture, so verification steps are a practical option.

### What to avoid

- **Do not commit secrets or personal information.** Never include `.env.local`, Supabase keys, wallet private keys, or Safe credentials
- Check that pasted command output contains no keys

## Licensing

The repository uses separate licenses for software and creative works. **Code and documentation use the [MIT License](https://github.com/henkaku-center/initiation/blob/main/LICENSE); creative works such as illustrations and audio use [CC BY 4.0](https://github.com/henkaku-center/initiation/blob/main/LICENSE-CC-BY-4.0.txt).**

Pull Requests are treated as contributions under the corresponding license (inbound = outbound).

If you include code, text, or creative works for which you do not hold the rights, **state the source and original license in the Pull Request**. See [CONTRIBUTING.md (Japanese)](https://github.com/henkaku-center/initiation/blob/main/CONTRIBUTING.md) for permission and attribution procedures when adding creative works.

## When making Next.js changes

The Next.js version used by this project may behave differently from information in training data. Before making changes, read the repository's `AGENTS.md` and the relevant guide under `node_modules/next/dist/docs/`.

## What to read next

Understanding the code structure helps you find where to make changes.

→ [Project Structure (Japanese)](/guide/architecture)
