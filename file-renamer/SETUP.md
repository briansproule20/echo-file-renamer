# Echo Renamer - Setup Complete

## What Was Built

A fully functional AI-powered bulk file renaming web application with the following features:

### Core Features Implemented

1. **File Upload & Processing**
   - Drag-and-drop interface for multiple file uploads
   - Support for PDF, DOCX, TXT, images (PNG/JPG/WEBP), audio (MP3/WAV), and ZIP files
   - Automatic content extraction based on file type

2. **AI-Powered Filename Generation**
   - GPT-4o-mini integration via Echo platform
   - Smart document type detection (invoice, receipt, contract, meeting-notes, etc.)
   - Entity extraction (primary/secondary entities)
   - Topic and date extraction
   - Confidence scoring for each suggestion

3. **Interactive Preview & Editing**
   - Table view with all proposed filenames
   - Inline editing of any suggested name
   - Confidence indicators with color coding
   - AI rationale display for each suggestion
   - Bulk selection controls

4. **Export Capabilities**
   - Download renamed files as ZIP archive
   - Export CSV mapping (original → new names with confidence scores)
   - Re-run proposals on selected files

5. **Echo Platform Integration**
   - Authentication with sign-in/sign-out
   - Real-time balance tracking
   - Usage-based billing (metered per AI request)
   - Secure API routing through Echo

### Tech Stack

- **Frontend**: React 19 + Next.js 15 (App Router + Turbopack)
- **Styling**: Tailwind CSS 4 + Radix UI components
- **AI**: Vercel AI SDK + Echo platform
- **File Processing**:
  - `pdf-parse` - PDF text extraction
  - `mammoth` - DOCX parsing
  - `jszip` - ZIP file generation
  - `react-dropzone` - File upload UI
- **Type Safety**: TypeScript + Zod validation

### File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts       # File content extraction
│   │   ├── propose/route.ts       # LLM-based filename generation
│   │   ├── zip/route.ts           # ZIP file creation
│   │   └── export-csv/route.ts    # CSV export
│   ├── page.tsx                    # Main UI page
│   └── layout.tsx                  # Root layout with Echo
├── components/
│   ├── file-dropzone.tsx          # Drag & drop component
│   ├── file-preview-table.tsx     # Results table with editing
│   └── file-renamer.tsx           # Main orchestrator component
├── lib/
│   ├── filename-utils.ts          # Sanitization & utilities
│   └── llm-utils.ts               # AI integration helpers
├── types/
│   └── renamer.ts                 # TypeScript type definitions
└── echo/
    └── index.ts                    # Echo SDK configuration
```

## How It Works

### 1. Upload Flow
User drags/drops files → Files are stored in component state → Ready for processing

### 2. Extraction Flow
Click "Propose Names" → Files sent to `/api/extract` → Text extracted based on type:
- PDFs: Full text extraction via pdf-parse
- DOCX: Text extraction via mammoth
- Images: Prepared for vision analysis
- Text files: Direct UTF-8 reading
- Audio: Prepared for transcription (fallback to metadata)

### 3. Proposal Flow
Extracted content → Sent to `/api/propose` → For each file:
- Images: Vision model analyzes content (if available)
- LLM generates filename following strict schema
- Builds filename using policy (doctype-entity-topic-date)
- Sanitizes to kebab-case, max 120 chars
- Resolves duplicates with -v2, -v3 suffixes

### 4. Review & Export
User reviews/edits → Selects files to include → Downloads:
- ZIP: All renamed files in archive
- CSV: Mapping table with confidence scores

## Filename Generation Policy

Generated filenames follow this structure:
```
{doctype}-{primary-entity}-{secondary-entity}-{topic}-{date}
```

**Rules:**
- Lowercase kebab-case only
- Safe characters (alphanumeric + dash)
- Max 120 characters
- Dates normalized to YYYY-MM-DD
- Automatic conflict resolution

**Example outputs:**
```
invoice-acme-corp-2024-03-15.pdf
meeting-notes-product-roadmap-2025-01-10.docx
photo-team-event-2024-12-25.jpg
```

## API Endpoints

### POST /api/extract
Extracts text content from uploaded files.

**Input:** FormData with files
**Output:** Array of extracted data with snippets

### POST /api/propose
Generates filename proposals using LLM.

**Input:** Array of file data with snippets
**Output:** Array of proposals with confidence scores

### POST /api/zip
Creates ZIP archive with renamed files.

**Input:** Array of files with base64 data and final names
**Output:** Binary ZIP file download

### POST /api/export-csv
Exports renaming mapping as CSV.

**Input:** Array of filename mappings
**Output:** CSV file download

## Cost Estimation

The app uses GPT-4o-mini for cost-effectiveness:
- ~$0.00015 per file (text-based)
- ~$0.0003 per file (image-based with vision)

Token usage is estimated and displayed before processing.

## Testing Checklist

Before deployment, test:

- [ ] Sign in with Echo works
- [ ] Balance displays correctly
- [ ] Upload files via drag & drop
- [ ] Upload files via click
- [ ] Extract content from PDF
- [ ] Extract content from DOCX
- [ ] Extract content from images
- [ ] Generate filename proposals
- [ ] Edit proposed names
- [ ] Toggle file inclusion
- [ ] Select/deselect all
- [ ] Download ZIP with renamed files
- [ ] Export CSV mapping
- [ ] Re-run on selected files
- [ ] Duplicate name resolution
- [ ] Error handling for invalid files
- [ ] Token usage estimation displays

## Known Limitations

1. **Image OCR**: Relies on Echo's vision models (GPT-4o-mini) - may have limited OCR accuracy
2. **Audio Transcription**: Not fully implemented - fallback to metadata only
3. **Large Files**: 60-second timeout on API routes - very large files may fail
4. **Batch Size**: Best performance with 20-50 files at a time
5. **File Size**: No explicit size limits - browser memory constraints apply

## Environment Variables Required

```env
ECHO_APP_ID=your_echo_app_id_here
```

Get your Echo App ID from: https://echo.meritservices.ai

## Next Steps (Optional Enhancements)

1. **Smart Grouping**: Group files by detected doctype/entity
2. **Rules Mode**: Regex/find-replace alongside AI suggestions
3. **Templates**: Save/load custom naming patterns
4. **Batch History**: Track previous renaming sessions
5. **Preview Improvements**: Show file previews/thumbnails
6. **Advanced OCR**: Integration with dedicated OCR services
7. **Audio Transcription**: Full implementation via Whisper API
8. **Progress Indicators**: Real-time processing status per file

## Support & Documentation

- Echo Platform: https://echo.meritservices.ai
- Vercel AI SDK: https://sdk.vercel.ai
- Next.js: https://nextjs.org

---

**Status:** ✅ MVP Complete - Ready for testing
**Version:** 1.0.0
**Build Status:** All TypeScript checks passing, no linter errors
**Server:** Running at http://localhost:3000

