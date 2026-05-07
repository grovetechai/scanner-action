# Changelog

All notable changes to this action are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.0.2] — 2026-05-07

### Fixed
- Added missing `@types/node` devDependency so the ncc build on a
  fresh CI runner can resolve `node:fs`, `node:path`, `process`,
  `fetch`, and `node:test` types. Without it the v1.0.1 release
  workflow failed at `npm run build` with TS2307 errors.

## [1.0.1] — 2026-05-07

### Fixed
- CI / release workflows now use Node 22 (Node 20 is deprecated on
  GitHub-hosted runners from 2026-09-16).
- `release.yml` no longer rejects releases when the ncc source-map
  drifts due to absolute path differences between local and runner
  builds; it rebuilds and ships the runner's bundle.
- `ci.yml` downgrades dist-drift to a warning instead of failing the
  build (same source-map drift root cause).
- `self-test.yml` correctly skips when `VIBE_API_KEY` secret is
  unset (was failing because GitHub Actions disallows `secrets.*` in
  job-level `if` conditions).

## [1.0.0] — 2026-05-07

Initial public release on the GitHub Marketplace.

### Added
- File collector with configurable glob patterns and 200-file / 256 KB caps.
- `POST /api/github/scan-from-action` integration with bearer-token auth.
- Severity-based fail gating (`critical` / `high` / `medium` / `low` / `none`).
- GitHub annotations for every finding (mapped to `error` / `warning` / `notice`).
- PR summary comment with score, severity counts and top 10 findings.
- Job summary panel on the run page.
- Outputs: `score`, `risk-level`, `critical-count`, `high-count`,
  `scan-id`, `report-url`.
- Self-hosted support via `api-base-url` override.
- MIT license.

### Notes
- Requires Solo plan or higher on Grovetech AI Vibe Scan.
- File contents are sent for analysis only and are not persisted.
