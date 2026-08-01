export function parsePageRanges(input: string, pageCount: number): number[] {
  if (!input.trim() || !Number.isInteger(pageCount) || pageCount < 1) return [];
  const pages: number[] = [];
  const seen = new Set<number>();
  for (const rawPart of input.split(",")) {
    const part = rawPart.trim();
    if (!part) throw new Error("EMPTY_RANGE");
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("INVALID_RANGE");
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < start || end > pageCount) throw new Error("OUT_OF_RANGE");
    for (let page = start; page <= end; page += 1) {
      if (!seen.has(page)) { seen.add(page); pages.push(page - 1); }
    }
  }
  return pages;
}
