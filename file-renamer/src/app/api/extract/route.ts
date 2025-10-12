import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { ExtractedData } from '@/types/renamer';

export const maxDuration = 60;

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return '';
  }
}

async function extractTextContent(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { files } = body as {
      files: Array<{
        id: string;
        blobUrl: string;
        originalName: string;
        mimeType: string;
        size: number;
      }>;
    };

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: ExtractedData[] = [];

    for (const file of files) {
      try {
        // Fetch file from Vercel Blob
        const response = await fetch(file.blobUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        let snippet = '';

        // Route by MIME type
        if (file.mimeType === 'application/pdf') {
          snippet = await extractPdfText(buffer);
        } else if (
          file.mimeType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.mimeType === 'application/msword'
        ) {
          snippet = await extractDocxText(buffer);
        } else if (file.mimeType.startsWith('text/')) {
          snippet = await extractTextContent(buffer);
        } else if (file.mimeType.startsWith('image/')) {
          // For images, we'll handle OCR/vision in the propose route
          snippet = `[Image file: ${file.originalName}, type: ${file.mimeType}]`;
        } else if (file.mimeType.startsWith('audio/')) {
          // For audio, we'll handle transcription in the propose route
          snippet = `[Audio file: ${file.originalName}, type: ${file.mimeType}]`;
        } else {
          // Unknown type - use filename and basic metadata
          snippet = `[File: ${file.originalName}, type: ${file.mimeType}, size: ${file.size} bytes]`;
        }

        // Truncate snippet to first 3000 chars
        if (snippet.length > 3000) {
          snippet = snippet.slice(0, 3000) + '...';
        }

        results.push({
          id: file.id,
          snippet,
          blobUrl: file.blobUrl,
          metadata: {
            // No lastModified from blob, but we can add other metadata if needed
          },
        });
      } catch (error) {
        console.error(`Failed to process file ${file.originalName}:`, error);
        // Add a minimal result so we don't fail the entire batch
        results.push({
          id: file.id,
          snippet: `[Error processing file: ${file.originalName}]`,
          blobUrl: file.blobUrl,
          metadata: {},
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract file content' },
      { status: 500 },
    );
  }
}

