/**
 * @grovetech/vibe-scan-action — GitHub Action runner.
 *
 * Posbírá soubory podle glob vzoru, pošle je do POST /api/github/scan-from-action
 * s API klíčem v Authorization: Bearer headeru, a nahlásí výsledek jako step
 * outputs / annotations / volitelný PR komentář. Fail-on-severity řídí návratový kód.
 *
 * Build: `npx ncc build src/index.ts -o dist --source-map --minify`
 * Distribuováno samostatným repem `grovetechai/scanner-action`; tento adresář
 * je upstream zdroj v hlavní aplikaci, aby kontrakt s endpointem zůstal
 * v jednom místě (server/github-action-routes.ts).
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import { promises as fs } from "node:fs";
import { relative } from "node:path";
import {
  SEV_RANK,
  isValidThreshold,
  findingsExceedThreshold,
  type Severity,
} from "./threshold.js";

const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const MAX_FILES = 200;

interface ScanResponse {
  scanId: string;
  repoFullName: string;
  commitSha: string;
  ref: string | null;
  scannedAt: string;
  durationMs: number;
  filesScanned: number;
  findings: Array<{
    id: string;
    severity: Severity;
    titleCs: string;
    titleEn: string;
    descriptionEn: string;
    evidence?: string[];
  }>;
  severityCounts: Record<Severity, number>;
  riskLevel: "high" | "medium" | "low";
  score: number;
  reportUrl: string;
}

async function collectFiles(patterns: string): Promise<Array<{ path: string; content: string }>> {
  const globber = await glob.create(patterns, { followSymbolicLinks: false });
  const out: Array<{ path: string; content: string }> = [];
  let total = 0;
  const cwd = process.cwd();
  for await (const file of globber.globGenerator()) {
    if (out.length >= MAX_FILES) {
      core.warning(`Reached MAX_FILES=${MAX_FILES}, skipping the rest.`);
      break;
    }
    let stat;
    try { stat = await fs.stat(file); } catch { continue; }
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
    if (total + stat.size > MAX_TOTAL_BYTES) {
      core.warning(`Reached MAX_TOTAL_BYTES=${MAX_TOTAL_BYTES}, skipping the rest.`);
      break;
    }
    let buf;
    try { buf = await fs.readFile(file, "utf8"); } catch { continue; }
    out.push({ path: relative(cwd, file) || file, content: buf });
    total += stat.size;
  }
  return out;
}

async function postPrComment(token: string, body: string) {
  try {
    const ctx = github.context;
    const pr = ctx.payload.pull_request;
    if (!pr) return;
    const octokit = github.getOctokit(token);
    await octokit.rest.issues.createComment({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      issue_number: pr.number,
      body,
    });
  } catch (e) {
    core.warning(`Could not post PR comment: ${(e as Error).message}`);
  }
}

function buildPrComment(r: ScanResponse): string {
  const sev = r.severityCounts;
  const top = r.findings
    .slice()
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])
    .slice(0, 10);
  const lines: string[] = [];
  lines.push(`## Vibe Code Health Scan`);
  lines.push("");
  lines.push(`**Score:** ${r.score} / 100 · **Risk:** ${r.riskLevel.toUpperCase()} · **Files scanned:** ${r.filesScanned}`);
  lines.push("");
  lines.push(`| Critical | High | Medium | Low |`);
  lines.push(`| --- | --- | --- | --- |`);
  lines.push(`| ${sev.critical} | ${sev.high} | ${sev.medium} | ${sev.low} |`);
  lines.push("");
  if (top.length > 0) {
    lines.push(`### Top findings`);
    for (const f of top) {
      lines.push(`- **[${f.severity.toUpperCase()}]** ${f.titleEn} — ${f.descriptionEn}`);
    }
    lines.push("");
  }
  lines.push(`[View full report](${r.reportUrl})`);
  return lines.join("\n");
}

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput("api-key", { required: true });
    const rawThreshold = (core.getInput("severity-threshold") || "high").toLowerCase();
    if (!isValidThreshold(rawThreshold)) {
      core.setFailed(`Invalid severity-threshold '${rawThreshold}'. Allowed: critical | high | medium | low | none.`);
      return;
    }
    const threshold = rawThreshold;
    const patterns = core.getInput("paths") || "**/*";
    const baseUrl = (core.getInput("api-base-url") || "https://vibe.grovetechai.com").replace(/\/$/, "");
    const commentOnPr = (core.getInput("comment-on-pr") || "true") === "true";

    const ctx = github.context;
    const repoFullName = `${ctx.repo.owner}/${ctx.repo.repo}`;
    const commitSha = ctx.sha;
    const ref = ctx.ref;

    core.info(`Collecting files for ${repoFullName} @ ${commitSha.slice(0, 7)}…`);
    const files = await collectFiles(patterns);
    if (files.length === 0) {
      core.warning("No files matched the provided patterns. Skipping scan.");
      return;
    }
    core.info(`Sending ${files.length} files (${files.reduce((s, f) => s + f.content.length, 0)} B) to Vibe Scan…`);

    const response = await fetch(`${baseUrl}/api/github/scan-from-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "scanner-action/1.0",
      },
      body: JSON.stringify({ repoFullName, commitSha, ref, files }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      core.setFailed(`Vibe Scan API returned ${response.status}: ${text.slice(0, 500)}`);
      return;
    }
    const result = (await response.json()) as ScanResponse;

    core.setOutput("score", String(result.score));
    core.setOutput("risk-level", result.riskLevel);
    core.setOutput("critical-count", String(result.severityCounts.critical));
    core.setOutput("high-count", String(result.severityCounts.high));
    core.setOutput("scan-id", result.scanId);
    core.setOutput("report-url", result.reportUrl);

    // Annotations — surface every finding as a GitHub annotation in PR diff view.
    for (const f of result.findings) {
      const file = f.evidence?.[0] || undefined;
      const msg = `[${f.severity.toUpperCase()}] ${f.titleEn} — ${f.descriptionEn}`;
      if (f.severity === "critical" || f.severity === "high") core.error(msg, { file });
      else if (f.severity === "medium") core.warning(msg, { file });
      else core.notice(msg, { file });
    }

    if (commentOnPr) {
      const ghToken = core.getInput("github-token") || process.env.GITHUB_TOKEN || "";
      if (ghToken) await postPrComment(ghToken, buildPrComment(result));
      else core.info("github-token not provided, skipping PR comment.");
    }

    // Job summary (always-visible markdown panel on the run page).
    await core.summary
      .addRaw(buildPrComment(result))
      .write();

    if (findingsExceedThreshold(result.findings, threshold)) {
      core.setFailed(`Vibe Scan: findings at or above severity '${threshold}' are present.`);
      return;
    }
    core.info(`Vibe Scan completed: score=${result.score}, risk=${result.riskLevel}.`);
  } catch (e) {
    core.setFailed(`Vibe Scan action failed: ${(e as Error).message}`);
  }
}

run();
