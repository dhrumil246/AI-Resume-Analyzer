# AI Resume Analyzer

An intelligent resume analysis application powered by NVIDIA NIM APIs and React Router. Upload your resume, get AI-powered feedback, and improve your chances of landing your dream job.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## 🌟 Features

- 🤖 **AI-Powered Analysis**: Get comprehensive feedback on your resume using NVIDIA NIM
- 📊 **Multi-dimensional Scoring**: ATS compatibility, tone, content, structure, and skills analysis
- 📄 **PDF Processing**: Upload and analyze PDF resumes with preview generation
- 💾 **Client-side Storage**: Secure local storage using IndexedDB
- 🔒 **Security First**: Input validation, rate limiting, and security headers
- 🎨 **Modern UI**: Beautiful TailwindCSS design with smooth animations
- ⚡️ **Fast & Responsive**: Server-side rendering with React Router

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- NVIDIA NIM API key ([Get one here](https://build.nvidia.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-resume-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your NVIDIA NIM API key:
```env
NIM_API_KEY=your_actual_api_key_here
NIM_MODEL=gpt-oss-120b
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
```

### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## 🔐 Security

This application implements multiple security layers:

- ✅ Input validation (client & server-side)
- ✅ Rate limiting (10 requests/minute per IP)
- ✅ Security headers (CSP, XSS protection, etc.)
- ✅ File size limits (max 10MB)
- ✅ PDF-only uploads
- ✅ API key protection
- ✅ Error handling without information disclosure

**⚠️ Important**: Never commit your `.env` file. See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

## 📡 API Documentation

### POST /api/analyze

Analyze a resume and get AI-powered feedback.

**Request Body:**
```json
{
  "resumeText": "string (required, max 50,000 chars)",
  "jobTitle": "string (optional, max 200 chars)",
  "jobDescription": "string (optional, max 10,000 chars)"
}
```

**Response:**
```json
{
  "overallScore": 85,
  "ATS": {
    "score": 90,
    "tips": [...]
  },
  "toneAndStyle": {
    "score": 85,
    "tips": [...]
  },
  "content": { ... },
  "structure": { ... },
  "skills": { ... }
}
```

**Rate Limits:**
- 10 requests per minute per IP
- Returns `429 Too Many Requests` when exceeded

## 🧪 QA Checklist

Before deploying, verify:

- [ ] Upload a PDF resume and verify AI analysis succeeds
- [ ] Check toast notifications for success and error states
- [ ] Confirm resume cards display score and preview correctly
- [ ] Open resume detail page and view embedded PDF
- [ ] Delete a resume from both card and detail views
- [ ] Reload the app and confirm saved resumes persist
- [ ] Test file size limits (try uploading >10MB file)
- [ ] Test rate limiting (make >10 requests quickly)
- [ ] Verify invalid file types are rejected
- [ ] Check error handling for network failures

## 🏗️ Building for Production

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 🐳 Docker Deployment

Build and run using Docker:

```bash
# Build the image
docker build -t ai-resume-analyzer .

# Run the container
docker run -p 3000:3000 \
  -e NIM_API_KEY=your_key_here \
  -e NIM_MODEL=gpt-oss-120b \
  ai-resume-analyzer
```

**⚠️ Note**: Never include API keys in the Docker image. Pass them as environment variables.

## ☁️ Deployment Platforms

The application can be deployed to:

- **Docker-based**: AWS ECS, Google Cloud Run, Azure Container Apps
- **Node.js**: Vercel, Netlify, Railway, Render
- **Self-hosted**: Any VPS with Node.js support

### Environment Variables for Production

Ensure these are set in your deployment platform:

```env
NIM_API_KEY=your_key
NIM_MODEL=gpt-oss-120b
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
MAX_FILE_SIZE_MB=10
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

## 🛠️ Tech Stack

- **Framework**: React Router 7 with SSR
- **Styling**: TailwindCSS 4
- **State Management**: Zustand with persistence
- **PDF Processing**: pdf.js
- **Storage**: IndexedDB
- **AI**: NVIDIA NIM API
- **Type Safety**: TypeScript
- **Build Tool**: Vite

## 📁 Project Structure

```
ai-resume-analyzer/
├── app/
│   ├── components/     # Reusable UI components
│   ├── lib/           # Utilities and helpers
│   │   ├── nim.server.ts           # NVIDIA NIM API client
│   │   ├── validation.server.ts    # Server-side validation
│   │   ├── validation.client.ts    # Client-side validation
│   │   ├── rateLimit.server.ts     # Rate limiting
│   │   ├── security.server.ts      # Security headers
│   │   └── pdf.client.ts           # PDF processing
│   ├── routes/        # Page routes
│   │   ├── api.analyze.ts  # API endpoint
│   │   ├── home.tsx        # Home page
│   │   ├── upload.tsx      # Upload page
│   │   └── resume.$id.tsx  # Resume detail page
│   └── store/         # Zustand state management
├── constants/         # App constants
├── public/           # Static assets
└── types/            # TypeScript definitions
```

## 🛠️ V1 Architecture & Optimization Plan

As we move from V1 to a more robust V1.1, we have identified key areas for optimization, specifically regarding client-side storage limits and AI reliability.

### 1. Storage Strategy Refinement (Critical)
**Current Architecture:**
- **IndexedDB**: Stores original PDF files.
- **LocalStorage (via Zustand)**: Stores metadata AND Base64 preview images.

**The Problem**: LocalStorage has a strict 5MB limit. Storing Base64 images (which are ~30% larger than binary) quickly leads to `QuotaExceededError`.

**The Solution**:
- **Move Previews to IndexedDB**: Generated thumbnail images will be stored as `Blob`s in IndexedDB alongside the original files.
- **Lightweight State**: Zustand will only hold metadata (IDs, analysis scores, timestamps) and reference keys to specific IndexedDB entries.

### 2. Client-Side Experience
- **OCR Optimization**: Tesseract.js model downloading will be separated from the processing phase to show granular progress bars ("Downloading Model..." vs "Scanning Text..."), preventing the app from appearing "frozen" on slow networks.
- **PDF Worker alignment**: Strict version matching between `pdfjs-dist` and the worker file to prevent runtime mismatch errors.

### 3. Server-Side Robustness
- **AI Response Handling**: Enhanced parsing logic in `api.analyze.ts` to gracefully handle cases where the AI model returns valid JSON that is slightly off-schema (e.g., missing a field), preventing UI crashes.
- **Rate Limiting**: Current in-memory limiting is sufficient for single-instance, but we will document the path to Redis-based limiting for scaling.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Resources

- [React Router Documentation](https://reactrouter.com/)
- [NVIDIA NIM API](https://build.nvidia.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Security Best Practices](./SECURITY.md)
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
