// Security headers middleware

export const securityHeaders = {
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Enable XSS protection
  "X-XSS-Protection": "1; mode=block",
  
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions policy
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React Router requires unsafe-inline/eval
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://integrate.api.nvidia.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export const applySecurityHeaders = (headers: Headers): Headers => {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
};
