export const extractPdfText = async (file: File): Promise<string> => {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const maxPages = pdf.numPages;

    if (maxPages === 0) {
      throw new Error("PDF has no pages");
    }

    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .filter(Boolean);
      pageTexts.push(strings.join(" "));
    }

    const fullText = pageTexts.join("\n\n").trim();

    if (!fullText) {
      throw new Error("No text could be extracted from the PDF. Please ensure your resume contains readable text.");
    }

    return fullText;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to extract text from PDF. The file may be corrupted or password-protected.");
  }
};

export const generatePdfPreview = async (
  file: File,
  { scale = 1.4 }: { scale?: number } = {}
): Promise<string> => {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    
    if (pdf.numPages === 0) {
      throw new Error("PDF has no pages");
    }

    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create canvas context.");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    return canvas.toDataURL("image/png");
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate PDF preview");
  }
};

export const convertPdfPagesToImages = async (
  file: File,
  { scale = 2.0 }: { scale?: number } = {}
): Promise<Blob[]> => {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    
    if (pdf.numPages === 0) {
      throw new Error("PDF has no pages");
    }

    const images: Blob[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to create canvas context.");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        }, "image/png");
      });

      images.push(blob);
    }

    return images;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to convert PDF pages to images");
  }
};
