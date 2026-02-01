// Server-side validation utilities

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const MAX_TEXT_LENGTH = 50000; // ~50KB of text
const MAX_JOB_TITLE_LENGTH = 200;
const MAX_JOB_DESCRIPTION_LENGTH = 10000;

export const validateResumeText = (text: string): string | null => {
  if (!text || text.trim().length === 0) {
    return "Resume text cannot be empty";
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return `Resume text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`;
  }

  return null;
};

export const validateJobTitle = (title: string): string | null => {
  if (title && title.length > MAX_JOB_TITLE_LENGTH) {
    return `Job title exceeds maximum length of ${MAX_JOB_TITLE_LENGTH} characters`;
  }

  return null;
};

export const validateJobDescription = (description: string): string | null => {
  if (description && description.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return `Job description exceeds maximum length of ${MAX_JOB_DESCRIPTION_LENGTH} characters`;
  }

  return null;
};

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

export const getMaxFileSizeBytes = (): number => MAX_FILE_SIZE_BYTES;
export const getMaxFileSizeMB = (): number => MAX_FILE_SIZE_MB;
