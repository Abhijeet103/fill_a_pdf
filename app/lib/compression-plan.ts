export type CompressionPlan = { scale: number; quality: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function initialCompressionPlan(sourceBytes: number, targetBytes: number): CompressionPlan {
  const reductionRatio = clamp(targetBytes / Math.max(1, sourceBytes), 0.01, 1);
  const ratioRoot = Math.sqrt(reductionRatio);
  return {
    scale: clamp(0.58 + ratioRoot * 0.62, 0.5, 1.05),
    quality: clamp(0.36 + ratioRoot * 0.42, 0.34, 0.72),
  };
}

export function refineCompressionPlan(current: CompressionPlan, outputBytes: number, targetBytes: number): CompressionPlan {
  const ratio = clamp(targetBytes / Math.max(1, outputBytes), 0.05, 1);
  return {
    scale: clamp(current.scale * Math.max(0.55, Math.sqrt(ratio) * 0.94), 0.36, current.scale),
    quality: clamp(current.quality * Math.max(0.62, Math.pow(ratio, 0.34)), 0.18, current.quality),
  };
}
