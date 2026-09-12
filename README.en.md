# HENKAKU Initiation

[Japanese](README.md)

> Source: [Japanese original](README.md). Translated from [revision 3d4f3a4](https://github.com/henkaku-center/initiation/blob/3d4f3a4755902601bd566af7821860df124f846b/README.md). Later changes to the original may not yet be reflected here.

A Next.js application that guides people through joining the HENKAKU community, from setting up a wallet to completing Initiation, using Check-in, and submitting an application.

The project is currently at the local implementation stage of Phase 1, MVP-1. Approval, Allowlist addition, and HENKAKU distribution are performed manually. AI features and production deployment remain on hold.

> **For first-time contributors**: The [developer documentation](https://henkaku-center.github.io/initiation/en/) walks through environment setup to your first Pull Request. It covers terminology, expected output, and troubleshooting by symptom. This README is an entry point with an overview and key facts.

## Participant flow

Use the menu at the top of the screen to proceed in this order.

1. **Setup** (`/setup`): Connect a wallet, sign in with SIWE, switch to Polygon, and add HENKAKU
2. **Initiation** (`/initiation`): Answer questions and complete quests. Progress is saved
3. **Check-in** (`/checkin`): Record activity once a day
4. **Apply** (`/apply`): Apply for Allowlist addition and HENKAKU distribution
5. **Admin** (`/admin`): Administrators review applications and update Allowlist and distribution status

## Development environment

- Node.js 22.0.0 or later / npm (development checks use Node.js 24). Use whichever version manager you prefer
  - Dependencies such as `@supabase/supabase-js` require `engines.node >=22.0.0`. With Node.js 20, `npm install` produces `EBADENGINE`, and builds and tests also produce warnings
- Next.js App Router / TypeScript
- wagmi + viem: wallet connection, Polygon switching, and `wallet_watchAsset`
- SIWE + iron-session: wallet signature authentication and sessions
- Supabase PostgreSQL: migrations and persistence through Repositories
- Vitest: unit tests and local Supabase integration tests
- An Injected Wallet such as MetaMask
- Docker Desktop and Supabase CLI when using local Supabase

## Setup

```bash
git clone <repository-url>
cd initiation
npm install
cp .env.example .env.local
```

Set the values in `.env.local`. Keep secrets in this file only; do not include them in commits, issues, or logs.

| Variable | Purpose | Disclosure |
| --- | --- | --- |
| `SESSION_PASSWORD` | Session encryption (at least 32 characters) | Private |
| `SIWE_ALLOWED_DOMAINS` | Domains accepted for SIWE signatures (comma-separated) | Public; defaults provided |
| `SUPABASE_URL` | Supabase connection URL | Depends on the environment |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Repository connection | Private |
| `ADMIN_ADDRESSES` | Wallets allowed to access the admin screen (comma-separated) | Addresses are public information, but managed through an environment variable |
| `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS` | HENKAKU contract on Polygon | Public; default provided |
| `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` | Token display name | Public; default provided |
| `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` | Token decimal places | Public; default provided |
| `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` | Logo displayed in the wallet | Public; default provided |
| `SAKURA_AI_API_KEY` | AI Engine spike key | Private; not currently used in production |
| `SAKURA_AI_BASE_URL` | AI Engine base URL | Managed through an environment variable |

The four `NEXT_PUBLIC_HENKAKU_TOKEN_*` variables are public information, so `.env.example` includes development defaults. No changes to these four values are needed to run `/setup`.

| Variable | Development default |
| --- | --- |
| `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS` | `0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` | `HENKAKU` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` | `18` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` | `https://raw.githubusercontent.com/henkaku-center/omise-interface/main/public/henkakuToken.png` |

`/setup` passes this address to the wallet through `wallet_watchAsset`. **An incorrect address would cause users to add a different token**, so update the [decision record (Japanese)](docs/decisions/2026-08-09-henkaku-token-defaults.md) when changing these values.

### Local Supabase

```bash
npx supabase start
npx supabase status
npx supabase db reset
```

Use `Project URL` and `Secret` from `supabase status` to set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, keeping the values out of logs. `Publishable` is not used for this connection. Run integration tests with local Supabase running.

### Development server

```bash
npm run dev -- --port 3000
```

If a development server is already running, do not start another process on the same port.

## Verification commands

```bash
npm test
npm run lint
npm run build
npx tsc --noEmit
```

Immediately after cloning, run `npm run build` (or `npm run dev`) first. `npx tsc --noEmit` fails until Next.js generates types such as `LayoutProps`.

See [Verification Commands (Japanese)](https://henkaku-center.github.io/initiation/reference/commands) for details and ways to narrow the checks.

Tests are split between `tests/unit/` and `tests/integration/`. Helpers for Supabase integration tests live in `tests/support/`. Test files match `tests/**/*.test.ts`. Integration tests automatically load Supabase settings from `.env.local`, so configure that file and start local Supabase before running `npm test`.

## Architecture boundaries

- `app/`: pages, Server Actions, and API Routes
- `components/`: UI components, including Client Components
- `lib/domain/`: database- and Next.js-independent types, state transitions, and pure logic
- `lib/repositories/`: Repository contracts and implementations isolating Supabase dependencies
- `lib/auth/`: authorization guards resolving member / admin from SIWE sessions
- `supabase/migrations/`: schema change history
- `docs/`: development plan, decisions, and operations runbooks

The application does not automatically execute on-chain Allowlist changes or HENKAKU distribution from Safe Wallet. See the [Manual Operations Runbook (Japanese)](docs/runbook-manual-operations.md).

## Contributing

1. Share the purpose and scope in an issue
2. Create a working branch from `main` (for example, `agent/navigation-readme`)
3. Add tests first, then run `npm test`, type checking, and lint after implementation (CI also runs automatically after opening a PR)
4. Do not commit secrets or personal information
5. Include the reason for the change, verification, and unresolved decisions in the Pull Request
6. Attach screenshots or manual verification steps for UI changes

See [CONTRIBUTING.md (Japanese)](CONTRIBUTING.md) for contribution licensing and the maintainers' approach.

Do not turn unresolved decisions into specifications on your own. Record each decision in a separate file under `docs/decisions/` before implementation. See [Reading the Decision Log (Japanese)](docs/decisions.md) for naming conventions. Before making Next.js changes, read the repository's `AGENTS.md` and the relevant guide under `node_modules/next/dist/docs/`.

## Current limitations and next steps

- Initiation questions and quest content are provisional, pending community agreement
- The question box is not implemented. First, the question-and-answer loop will be validated with people only; AI will be considered afterward
- AI will be introduced in Phase 3 to assist with draft answers and reference information. People will review the final answers
- Vercel / Supabase production deployment is postponed
- The [Privacy Policy (Japanese)](https://henkaku-center.github.io/initiation/privacy-policy) describes the information handled in MVP-1 and how widely it is shared. It will be updated before the question box, externally visible views, or AI features are introduced

See [docs/development-plan.md (Japanese)](docs/development-plan.md) for the overall plan, [docs/superpowers/plans/2026-08-06-phase1-initiation-mvp1.md (Japanese)](docs/superpowers/plans/2026-08-06-phase1-initiation-mvp1.md) for the implementation plan, and [docs/decisions.md (Japanese)](docs/decisions.md) for decisions.

## License

**Software and creative works use separate licenses.** Both identify the copyright holder as `henkaku Community`.

| Material | License |
| --- | --- |
| Code (`app/`, `components/`, `lib/`, `supabase/`, `scripts/`, `tests/`, and configuration files) | [MIT License](LICENSE) |
| Documentation (`docs/` and Markdown files such as `README.md` and `CONTRIBUTING.md`) | [MIT License](LICENSE) |
| Creative works (illustrations, audio, and other materials outside code and documentation) | [CC BY 4.0](LICENSE-CC-BY-4.0.txt) |

The MIT license is written for software. Applied to illustrations or audio, **it does not make clear what reusers need to do to comply**. This is why creative works use CC BY 4.0, which requires attribution.

Creative works in this repository are recorded in `CREDITS.md` in the directory containing the assets (see [assets/music/CREDITS.md (Japanese)](assets/music/CREDITS.md)). See [CONTRIBUTING.md (Japanese)](CONTRIBUTING.md) for permission and attribution procedures when adding assets.

For third-party materials, **record their original license in `CREDITS.md` in the asset directory**, just as for original works. The table above applies to materials without a separate license stated there.

Pull Requests are treated as contributions under the corresponding license above (inbound = outbound).

See the [license decision (Japanese)](docs/decisions/2026-08-11-license.md) for the reasoning.
