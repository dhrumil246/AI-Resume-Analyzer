import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router";
import Navbar from "~/components/Navbar";
import { extractPdfText, generatePdfPreview, convertPdfPagesToImages } from "~/lib/pdf.client";
import { extractImageText, generateImagePreview, extractTextFromBlob } from "~/lib/ocr.client";
import { saveResumeFile, saveResumePreview } from "~/lib/resumeStorage.client";
import { useResumeStore } from "~/store/resumeStore";
import { useToastStore } from "~/store/toastStore";
import {
  validateResumeFile,
  isImageFile,
  isPdfFile,
  validateJobTitle,
  validateJobDescription,
  formatFileSize,
  sanitizeFilename,
} from "~/lib/validation.client";
import type { Route } from "./+types/upload";

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload Resume - Resumind" },
    { name: "description", content: "Upload your resume for AI-powered analysis" },
  ];
}

const Upload = () => {
  const navigate = useNavigate();
  const addResume = useResumeStore((state) => state.addResume);
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatus, setOcrStatus] = useState<string>("");

  const fileName = useMemo(
    () => (file ? sanitizeFilename(file.name) : ""),
    [file]
  );

  const fileSize = useMemo(
    () => (file ? formatFileSize(file.size) : ""),
    [file]
  );

  const fileType = useMemo(() => {
    if (!file) return "";
    if (isPdfFile(file)) return "PDF";
    if (isImageFile(file)) return "Image";
    return "Unknown";
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setError(null);
    setOcrProgress(0);
    setOcrStatus("");

    if (selectedFile) {
      const validationError = validateResumeFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let resumeText: string = "";
      let imagePath: string | undefined;

      if (isPdfFile(file)) {
        // Try normal PDF text extraction first
        let textExtracted = false;
        try {
          const [text, preview] = await Promise.all([
            extractPdfText(file),
            generatePdfPreview(file),
          ]);
          resumeText = text;
          imagePath = preview;
          
          // Check if we got enough text
          if (resumeText && resumeText.trim().length >= 50) {
            textExtracted = true;
          }
        } catch (error) {
          console.log("PDF text extraction failed, will try OCR fallback");
        }

        // If text extraction failed or insufficient, use OCR
        if (!textExtracted) {
          setOcrStatus("PDF not readable, using OCR...");
          setOcrProgress(0);
          
          // Convert PDF pages to images
          const pageImages = await convertPdfPagesToImages(file);
          
          // Extract text from each page using OCR
          const pageTexts: string[] = [];
          for (let i = 0; i < pageImages.length; i++) {
            const pageNum = i + 1;
            const text = await extractTextFromBlob(
              pageImages[i],
              (progress, status) => {
                setOcrProgress(progress);
                setOcrStatus(`Page ${pageNum}/${pageImages.length}: ${status}`);
              }
            );
            pageTexts.push(text);
          }
          
          resumeText = pageTexts.join("\n\n").trim();
          
          // Always generate preview for OCR fallback
          imagePath = await generatePdfPreview(file);
        }
      } else if (isImageFile(file)) {
        [resumeText, imagePath] = await Promise.all([
          extractImageText(file, (progress, status) => {
             setOcrProgress(progress);
             setOcrStatus(status);
          }),
          generateImagePreview(file),
        ]);
      } else {
        throw new Error("Unsupported file type");
      }

      const fileId = await saveResumeFile(file);

      // Additional validation on extracted text
      if (!resumeText || resumeText.trim().length < 10) {
        throw new Error(
          "Unable to extract sufficient text. Please ensure your resume contains readable text."
        );
      }

      console.log("Resume text extracted, length:", resumeText.length);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobTitle, jobDescription }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          response.status === 429
            ? "Too many requests. Please try again later."
            : `Analysis failed: ${errorText || response.statusText}`
        );
      }

      const feedback = await response.json();

      const resumeId = generateId();
      
      // Save preview to IndexedDB separately to avoid huge LocalStorage usage
      if (imagePath) {
        await saveResumePreview(resumeId, imagePath);
      }

      const newResume = {
        id: resumeId,
        companyName: "", // Will be filled by user later
        jobTitle,
        imagePath: resumeId, // Store reference ID instead of full base64 string
        resumePath: fileId,
        feedback,
        createdAt: new Date().toISOString(),
      };

      addResume(newResume);
      addToast({
        title: "Analysis complete",
        description: "Your resume has been analyzed successfully.",
        type: "success",
      });

      navigate(`/resume/${resumeId}`);
    } catch (submitError) {
      console.error("Upload error:", submitError);
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.";
      setError(message);
      addToast({
        title: "Analysis failed",
        description: message,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <Navbar />
      <section className="main-section">
        <div className="page-heading">
          <h1>Upload Resume</h1>
          <h2>Get AI-powered feedback on your resume</h2>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 w-full pb-20">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="form-div w-full">
            <label htmlFor="resume" className="mb-2 block">
              Resume (PDF or Image) <span className="text-red-500">*</span>
            </label>
            
            <div className="uploader-drag-area w-full">
               <input
                  id="resume"
                  name="resume"
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  required
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {!fileName ? (
                    <div className="flex flex-col items-center gap-4 pointer-events-none">
                        <span className="text-4xl">📄</span>
                        <div className="flex flex-col gap-1 text-center">
                          <p className="font-bold text-lg text-black">Click or drag file to upload</p>
                          <p className="text-sm text-gray-500">PDF, JPG, PNG up to 10MB</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 pointer-events-none">
                        <span className="text-4xl text-[var(--color-accent)]">✓</span>
                        <div className="flex flex-col gap-1 text-center">
                          <p className="font-bold text-lg text-black">{fileName}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(file?.size || 0)}</p>
                        </div>
                    </div>
                )}
            </div>

            {((ocrProgress > 0 && ocrProgress < 100) || ocrStatus) && (
              <div className="mt-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-black">
                    {ocrStatus || "Extracting text from image..."}
                  </span>
                  {ocrProgress > 0 && (
                    <span className="text-xs font-mono text-black">{ocrProgress}%</span>
                  )}
                </div>
                {ocrProgress > 0 && (
                  <div className="w-full bg-gray-100 h-1">
                    <div
                      className="bg-[var(--color-accent)] h-1 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}
            
            {/* Fallback info text if drag area isn't obvious enough or for accessibility */}
            <p className="sr-only">
              Accepts: PDF, JPG, PNG, WEBP • Maximum file size: 10MB
            </p>
          </div>

          <div className="form-div mt-8">
            <label htmlFor="jobTitle">Job title (optional)</label>
            <input
              id="jobTitle"
              name="jobTitle"
              placeholder="e.g. Frontend Engineer"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-400 mt-2 text-right w-full">
              {jobTitle.length}/200 characters
            </p>
          </div>

          <div className="form-div mt-8">
            <label htmlFor="jobDescription">Job description (optional)</label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows={6}
              placeholder="Paste the job description for more accurate feedback"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              maxLength={10000}
            />
            <p className="text-xs text-gray-400 mt-2 text-right w-full">
              {jobDescription.length}/10,000 characters
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mt-8 w-full" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="mt-12 w-full">
            <button
              type="submit"
              className="primary-button w-full h-14 text-base"
              disabled={isSubmitting || !file}
            >
              {isSubmitting
                ? ocrStatus 
                  ? ocrStatus 
                  : "Analyzing..."
                : "Analyze Resume"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Upload;