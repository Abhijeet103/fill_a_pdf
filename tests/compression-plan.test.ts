import assert from "node:assert/strict";
import test from "node:test";
import { initialCompressionPlan, refineCompressionPlan } from "../app/lib/compression-plan.ts";

test("starts aggressive target compression below full render scale", () => {
  const plan = initialCompressionPlan(4.85 * 1024 * 1024, 1024 * 1024);
  assert.ok(plan.scale < 0.9);
  assert.ok(plan.quality < 0.6);
});

test("uses more detail when only a small reduction is requested", () => {
  const plan = initialCompressionPlan(2 * 1024 * 1024, 1.5 * 1024 * 1024);
  assert.ok(plan.scale > 1);
  assert.ok(plan.quality > 0.7);
});

test("fallback plan always reduces scale and quality", () => {
  const current = { scale: 0.9, quality: 0.6 };
  const next = refineCompressionPlan(current, 2 * 1024 * 1024, 1024 * 1024);
  assert.ok(next.scale < current.scale);
  assert.ok(next.quality < current.quality);
});
