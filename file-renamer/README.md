# Echo Renamer

AI-powered bulk file renaming application built with Next.js 15, Echo platform integration, and the Vercel AI SDK.

## Features

- **Drag & Drop File Upload**: Upload multiple files at once (PDFs, DOCX, images, audio, text files)
- **AI-Powered Naming**: Automatically generates descriptive, human-readable filenames
- **Content Analysis**:
  - PDF text extraction
  - DOCX document parsing
  - Image OCR/vision analysis
  - Audio transcription (when available)
- **Smart Filename Generation**:
  - Lowercase kebab-case
  - Date normalization (YYYY-MM-DD)
  - Document type detection
  - Entity and topic extraction
  - Conflict resolution with version numbering
- **Interactive Preview**: 
  - Editable filename suggestions
  - Confidence scores
  - AI rationale for each suggestion
  - Bulk selection controls
- **Export Options**:
  - Download renamed files as ZIP
  - Export CSV mapping (original → new names)
- **Echo Platform Integration**:
  - Built-in authentication
  - Usage-based billing
  - Balance tracking
  - Model routing through Echo

## Tech Stack

- **Framework**: Next.js 15 with App Router & Turbopack
- **AI**: Vercel AI SDK + Echo platform
- **Authentication**: Echo Next SDK
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **File Processing**:
  - pdf-parse (PDF extraction)
  - mammoth (DOCX parsing)
  - jszip (ZIP generation)
  - react-dropzone (File uploads)
- **Type Safety**: TypeScript with Zod validation

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Echo App ID (from [echo.meritservices.ai](https://echo.meritservices.ai))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/briansproule20/echo-file-renamer.git
cd echo-file-renamer/file-renamer
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
ECHO_APP_ID=your_echo_app_id_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Sign In**: Click the sign-in button to authenticate with Echo
2. **Upload Files**: Drag and drop files or click to browse
3. **Generate Names**: Click "Propose Names" to analyze files and generate suggestions
4. **Review & Edit**: 
   - Review AI-generated filenames
   - Edit any names by clicking on them
   - Toggle individual files on/off
   - Check confidence scores and rationale
5. **Export**:
   - Download ZIP with renamed files
   - Export CSV mapping for record-keeping
   - Re-run on selected files if needed

## API Routes

- `POST /api/extract` - Extracts text content from uploaded files
- `POST /api/propose` - Generates filename proposals using LLM
- `POST /api/zip` - Creates ZIP archive with renamed files
- `POST /api/export-csv` - Exports renaming map as CSV

## Filename Policy

Generated filenames follow this structure:

```
{doctype}-{primary-entity}-{secondary-entity}-{topic}-{date}
```

Example outputs:
- `invoice-acme-corp-2024-03-15.pdf`
- `meeting-notes-ml-roadmap-2025-09-01.docx`
- `photo-garden-party-2024-07-04.jpg`

Rules:
- Lowercase kebab-case
- Safe characters only
- Max 120 characters
- Date normalized to YYYY-MM-DD
- Duplicates get `-v2`, `-v3` suffixes

## Supported File Types

- **Documents**: PDF, DOCX, DOC, TXT, RTF
- **Images**: PNG, JPG, JPEG, WEBP
- **Audio**: MP3, WAV
- **Archives**: ZIP (basic metadata only)

## Development

   ```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── extract/      # File content extraction
│   │   ├── propose/      # LLM filename generation
│   │   ├── zip/          # ZIP file creation
│   │   └── export-csv/   # CSV export
│   ├── page.tsx          # Main renamer interface
│   └── layout.tsx        # App layout with Echo
├── components/
│   ├── file-dropzone.tsx        # Drag & drop upload
│   ├── file-preview-table.tsx   # Results table
│   └── file-renamer.tsx         # Main orchestrator
├── lib/
│   ├── filename-utils.ts  # Sanitization & utilities
│   └── llm-utils.ts       # AI integration
└── types/
    └── renamer.ts         # TypeScript types
```

## Echo Integration

This app uses Echo for:
- Authentication (sign-in/sign-out)
- LLM access (GPT-4o-mini for cost-effective naming)
- Usage metering (pay-per-use model)
- Balance tracking

All AI costs are automatically handled through Echo's billing system.

## License

MIT

## Credits

- Inspired by [Renamer.ai](https://renamer.ai)
- Built with [Echo Platform](https://echo.meritservices.ai)
- Powered by [Vercel AI SDK](https://sdk.vercel.ai)
