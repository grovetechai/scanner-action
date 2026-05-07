export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Threshold = Severity | "none";

export const SEV_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const VALID_THRESHOLDS = new Set<Threshold>([
  "critical",
  "high",
  "medium",
  "low",
  "none",
]);

export function isValidThreshold(value: string): value is Threshold {
  return (VALID_THRESHOLDS as Set<string>).has(value);
}

export function findingsExceedThreshold(
  findings: ReadonlyArray<{ severity: Severity }>,
  threshold: Threshold,
): boolean {
  if (threshold === "none") return false;
  const wanted = SEV_RANK[threshold];
  return findings.some((f) => SEV_RANK[f.severity] >= wanted);
}
