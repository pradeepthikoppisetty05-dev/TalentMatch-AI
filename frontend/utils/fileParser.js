/**
 * Extract text from a PDF ArrayBuffer 
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(arrayBuffer) {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
  }

  return fullText;
}

/**
 * Extract text from a DOCX ArrayBuffer 
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
async function extractTextFromDocx(arrayBuffer) {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Main 
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === "application/pdf") {
    return extractTextFromPdf(arrayBuffer);
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    return extractTextFromDocx(arrayBuffer);
  }

  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return new TextDecoder().decode(arrayBuffer);
  }

  throw new Error("Unsupported file format. Please upload PDF, DOCX, or TXT.");
}