export async function mergePdfBytes(sources: Uint8Array[], onSource?: (index: number) => void) {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (let index = 0; index < sources.length; index += 1) {
    onSource?.(index);
    const source = await PDFDocument.load(sources[index].slice(), { ignoreEncryption: false });
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save({ useObjectStreams: true, addDefaultPage: false });
}

export async function createPdfFromPageIndices(sourceBytes: Uint8Array, pageIndices: number[]) {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(sourceBytes.slice(), { ignoreEncryption: false });
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, pageIndices);
  pages.forEach((page) => output.addPage(page));
  return output.save({ useObjectStreams: true, addDefaultPage: false });
}
