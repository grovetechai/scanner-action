import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEV_RANK,
  isValidThreshold,
  findingsExceedThreshold,
  type Severity,
} from "../src/threshold.js";

test("SEV_RANK orders severities low → critical", () => {
  assert.ok(SEV_RANK.info < SEV_RANK.low);
  assert.ok(SEV_RANK.low < SEV_RANK.medium);
  assert.ok(SEV_RANK.medium < SEV_RANK.high);
  assert.ok(SEV_RANK.high < SEV_RANK.critical);
});

test("isValidThreshold accepts known values", () => {
  for (const v of ["critical", "high", "medium", "low", "none"]) {
    assert.equal(isValidThreshold(v), true, `expected ${v} to be valid`);
  }
});

test("isValidThreshold rejects unknown values", () => {
  for (const v of ["", "info", "CRITICAL", "fatal", "warn"]) {
    assert.equal(isValidThreshold(v), false, `expected ${v} to be invalid`);
  }
});

test("findingsExceedThreshold returns false on 'none' regardless of findings", () => {
  const findings = [{ severity: "critical" as Severity }];
  assert.equal(findingsExceedThreshold(findings, "none"), false);
});

test("findingsExceedThreshold fails when any finding meets threshold", () => {
  const findings = [
    { severity: "low" as Severity },
    { severity: "high" as Severity },
  ];
  assert.equal(findingsExceedThreshold(findings, "high"), true);
  assert.equal(findingsExceedThreshold(findings, "critical"), false);
});

test("findingsExceedThreshold passes when all findings are below threshold", () => {
  const findings = [
    { severity: "low" as Severity },
    { severity: "medium" as Severity },
  ];
  assert.equal(findingsExceedThreshold(findings, "high"), false);
  assert.equal(findingsExceedThreshold(findings, "medium"), true);
});

test("findingsExceedThreshold handles empty findings", () => {
  assert.equal(findingsExceedThreshold([], "critical"), false);
  assert.equal(findingsExceedThreshold([], "low"), false);
});
