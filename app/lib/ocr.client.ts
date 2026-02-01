// OCR text extraction from images using Tesseract.js
import Tesseract from "tesseract.js";

export const extractImageText = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string> => {
  try {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (onProgress) {
          if (m.status === "recognizing text") {
            onProgress(Math.round(m.progress * 100), "Scanning text...");
          } else if (m.status === "loading tesseract core") {
             onProgress(0, "Loading OCR engine...");
          } else if (m.status.includes("downloading")) {
             onProgress(Math.round(m.progress * 100), "Downloading language model...");
          } else {
             onProgress(0, "Initializing...");
          }
        }
      },
    });

    const text = result.data.text.trim();

    if (!text || text.length < 10) {
      throw new Error(
        "Unable to extract sufficient text from image. Please ensure the image is clear and contains readable text."
      );
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to extract text from image. Please try a different file.");
  }
};

export const generateImagePreview = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read image file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file"));
    };

    reader.readAsDataURL(file);
  });
};

export const extractTextFromBlob = async (
  blob: Blob,
  onProgress?: (progress: number, status: string) => void
): Promise<string> => {
  try {
    const result = await Tesseract.recognize(blob, "eng", {
      logger: (m) => {
        if (onProgress) {
          if (m.status === "recognizing text") {
            onProgress(Math.round(m.progress * 100), "Scanning text...");
          } else if (m.status === "loading tesseract core") {
            onProgress(0, "Loading OCR engine...");
          } else if (m.status.includes("downloading")) {
            onProgress(Math.round(m.progress * 100), "Downloading language model...");
          } else {
            onProgress(0, "Initializing...");
          }
        }
      },
    });

    return result.data.text.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to extract text from image blob.");
  }
};
