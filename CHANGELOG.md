# Changelog

All notable changes to this action are documented here.
This project follows [Semantic Versioning](https://semver.org/).

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
