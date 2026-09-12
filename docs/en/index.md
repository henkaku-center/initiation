---
layout: home

hero:
  name: HENKAKU Initiation
  text: Developer Documentation
  tagline: Set up your development environment and make your first pull request.
  actions:
    - theme: brand
      text: About this project
      link: /en/guide/introduction
    - theme: alt
      text: 30-Minute Setup
      link: /en/guide/setup
    - theme: alt
      text: View on GitHub
      link: https://github.com/henkaku-center/initiation

features:
  - title: Written for first-timers
    details: Every step states its purpose, the command to run, and what you should see when it succeeds. If you get stuck, head to troubleshooting.
    link: /en/guide/setup
  - title: Project concepts (Japanese)
    details: Explains what wallets, SIWE, Supabase, and repositories are for, tied to how the code is organized.
    link: /guide/architecture
  - title: Troubleshooting (Japanese)
    details: Find possible causes and next steps by error message or symptom.
    link: /guide/troubleshooting
---

## Translation in progress

Start with these English guides:

1. [About HENKAKU Initiation](/en/guide/introduction)
2. [30-Minute Setup](/en/guide/setup)
3. [Your First Contribution](/en/guide/contributing)

The Windows preparation guide, troubleshooting, and other reference pages are currently available in Japanese. Links to untranslated pages are marked `(Japanese)`.

These guides are translated from the [original documentation (Japanese)](/guide/introduction).

The repository [English README](https://github.com/henkaku-center/initiation/blob/main/README.en.md) is the entry point for an overview and the key facts. For detailed instructions, refer to this site.

::: warning Handling secrets
Keep `SESSION_PASSWORD`, Supabase keys, and Safe Wallet credentials in `.env.local` only. Never include them in commits, issues, Pull Requests, or pasted command output.
:::
