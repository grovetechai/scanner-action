# Scanner Action — Vibe Code Health Scan

Scan every commit and pull request for **leaked API keys** (OpenAI, Anthropic,
AWS, Stripe, GitHub, Supabase service-role JWT, …), **exposed source maps** and
**common vibe-coding security mistakes**. Powered by
[Grovetech AI Vibe Scan](https://vibe.grovetechai.com).

[![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Scanner%20Action-orange?logo=github)](https://github.com/marketplace/actions/vibe-code-health-scan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Quick start

1. Get an API key on <https://vibe.grovetechai.com/github> (section "GitHub Action").
2. Store it as a repo secret: **Settings → Secrets and variables → Actions →
   New repository secret**, name `VIBE_API_KEY`.
3. Add `.github/workflows/vibe-scan.yml`:

```yaml
name: Vibe Scan
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write   # required for PR comments

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grovetechai/scanner-action@v1
        with:
          api-key: ${{ secrets.VIBE_API_KEY }}
          severity-threshold: high   # critical | high | medium | low | none
          github-token: ${{ github.token }}   # default; needed for PR comments
```

If the scan finds anything at the chosen severity or higher, the job fails.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `api-key` | _(required)_ | Key from `/github`. Store it in GitHub Secrets, never inline. |
| `severity-threshold` | `high` | Fail when any finding reaches this severity or higher. `none` never fails. |
| `paths` | _(config + src/app globs)_ | Multi-line glob patterns to scan. |
| `api-base-url` | `https://vibe.grovetechai.com` | Override for self-hosted / on-prem instances. |
| `comment-on-pr` | `true` | Post a summary comment on the PR (requires `pull-requests: write`). |
| `github-token` | `${{ github.token }}` | Token used for the PR comment; the default works for same-repo PRs. |

## Outputs

| Output | Description |
| --- | --- |
| `score` | Repo health score 0–100 (higher is better). |
| `risk-level` | `high` / `medium` / `low`. |
| `critical-count`, `high-count` | Number of findings at the given severity. |
| `scan-id`, `report-url` | Scan ID and direct link to the report on `/github`. |

Use the outputs in later steps:

```yaml
      - id: scan
        uses: grovetechai/scanner-action@v1
        with:
          api-key: ${{ secrets.VIBE_API_KEY }}
      - if: steps.scan.outputs.risk-level == 'high'
        run: echo "Risk: ${{ steps.scan.outputs.risk-level }} — see ${{ steps.scan.outputs.report-url }}"
```

## Limits

- Up to 200 files, 256 KB per file, 256 KB per request (server-side cap).
- 20 scans / day / account (shared with manual scans). Contact support for
  higher limits.
- Requires **Solo plan** or higher.

## Privacy

Files are sent to the Vibe Scan API for analysis only. **File contents are not
stored** — the database keeps only finding metadata (path, severity, key type),
never the source code. See the full
[Privacy Policy](https://vibe.grovetechai.com/privacy).

## Annotations & summaries

The action publishes:

- **GitHub annotations** in the PR diff for every finding (severity-mapped to
  `error` / `warning` / `notice`).
- A **PR summary comment** with score, severity counts and top 10 findings.
- A **job summary** (always-visible markdown panel on the run page).

## Contributing / building

```bash
npm ci
npm run build      # → dist/index.js (committed; required by GitHub Actions runtime)
npm test           # threshold + comment unit tests
```

GitHub Actions runs the bundle directly, so `dist/` must be committed after
any change to `src/`.

## Česky

Skenuje každý commit nebo pull request na uniklé API klíče, exposed source
mapy a typické vibe-coding bezpečnostní chyby. Vyžaduje API klíč z
<https://vibe.grovetechai.com/github>, plán Solo a vyšší. Pro detail a
příklady viz anglickou sekci výše — všechny inputs a outputs fungují stejně
v jakémkoliv jazyce.

## License

MIT — see [LICENSE](LICENSE).
