# What is HENKAKU Initiation?

> Source: [Japanese original (Japanese)](/guide/introduction). Translated from [revision 3d4f3a4](https://github.com/henkaku-center/initiation/blob/3d4f3a4755902601bd566af7821860df124f846b/docs/guide/introduction.md). Later changes to the original may not yet be reflected here.

A Next.js application that guides you through joining the HENKAKU community, from setting up a wallet to completing Initiation, using Check-in, and submitting an application.

## The problem it addresses

The process of joining the community has relied on Dework. Here, joining involves two things:

- Being added to the Allowlist
- Receiving your first HENKAKU tokens

HENKAKU tokens act as a key to various places within the community. This project is an attempt to redesign that process — not as a mere registration task, but as a small event for entering the community, called "Initiation."

For the full background, see the [Development Plan (Japanese)](/development-plan).

## The participant journey

The application consists of five screens.

| Screen | Path | What it does |
| --- | --- | --- |
| Setup | `/setup` | Connect a wallet, sign in with SIWE, switch to Polygon, add HENKAKU |
| Initiation | `/initiation` | Answer questions and complete quests. Progress is saved |
| Check-in | `/checkin` | A once-a-day activity record |
| Apply | `/apply` | Apply for Allowlist addition and HENKAKU distribution |
| Admin | `/admin` | Administrators review applications and update Allowlist and distribution status |

## Current development phase

The project is currently in **Phase 1, MVP-1, with a local implementation**.

Already in place:

- The five screens above, and their Server Actions
- Wallet signature authentication and sessions via SIWE
- Persistence to Supabase PostgreSQL, with migrations
- Application status transitions and an audit log

Not yet in place, or intentionally left out:

- **Approval, Allowlist addition, and HENKAKU distribution are handled manually.** The application does not execute on-chain operations automatically ([Manual Operations Runbook (Japanese)](/runbook-manual-operations))
- The question box (Phase 2) and AI-suggested answers (Phase 3) have not been started
- Deployment to production Vercel / Supabase environments is on hold
- The information handled in MVP-1 and how widely it is shared are described in the [Privacy Policy (Japanese)](/privacy-policy). It will be updated before the question box, externally visible views, or AI features are introduced

"Why isn't this automated?" is explained in [Project Structure (Japanese)](/guide/architecture#オンチェーン操作を自動化していない理由).

## What newcomers can contribute

This project is open source so that community members can contribute features. Contributions that do not require experience with Next.js or wallets include:

- Fixing errors or unclear passages in the documentation
- Trying the setup steps and reporting where you got stuck
- Adding symptoms to the troubleshooting guide
- Improving screen wording and accessibility
- Adding tests

### Which issue to start with

From the [issue list](https://github.com/henkaku-center/initiation/issues), look for these labels.

- `good first issue` — for first-time contributors
- `documentation` — documentation improvements
- `help wanted` — where help is needed

Once you find an issue, comment that you are taking it on before you start. This prevents duplicated work.

## What to read next

Start by running the project on your own machine.

→ [30-Minute Setup](/en/guide/setup)
