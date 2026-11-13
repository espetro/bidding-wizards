export type PdfText = { text: string; pages: number };

/** Reads the text layer of a PDF in the browser. The file never leaves the device. */
export async function extractPdfText(file: File, maxPages = 40): Promise<PdfText> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const parts: string[] = [];
  const last = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= last; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Break on end-of-line markers so counts stay attached to their labels.
    parts.push(
      content.items
        .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
        .join(""),
    );
  }
  return { text: parts.join("\n"), pages: doc.numPages };
}
