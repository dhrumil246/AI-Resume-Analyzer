// Client-side validation utilities

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_PDF_TYPE = "application/pdf";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const validateResumeFile = (file: File): string | null => {
  if (!file) {
    return "Please select a file";
  }

  const isValidType = 
    file.type === ALLOWED_PDF_TYPE || 
    ALLOWED_IMAGE_TYPES.includes(file.type);

  if (!isValidType) {
    return "Only PDF and image files (JPG, PNG, WEBP) are allowed";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size must be less than ${MAX_FILE_SIZE_MB}MB`;
  }

  if (file.size === 0) {
    return "File is empty";
  }

  return null;
};

export const validatePdfFile = (file: File): string | null => {
  if (!file) {
    return "Please select a file";
  }

  if (file.type !== ALLOWED_PDF_TYPE) {
    return "Only PDF files are allowed";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size must be less than ${MAX_FILE_SIZE_MB}MB`;
  }

  if (file.size === 0) {
    return "File is empty";
  }

  return null;
};

export const isImageFile = (file: File): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
};

export const isPdfFile = (file: File): boolean => {
  return file.type === ALLOWED_PDF_TYPE;
};

export const validateJobTitle = (title: string): string | null => {
  if (title && title.length > 200) {
    return "Job title is too long (max 200 characters)";
  }

  return null;
};

export const validateJobDescription = (description: string): string | null => {
  if (description && description.length > 10000) {
    return "Job description is too long (max 10,000 characters)";
  }

  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Sanitize filename for display
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, "_");
};
