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
    const contentType = req.headers.get('content-type') || '';

    // Hybrid approach: Handle both FormData (small files) and JSON (large files with blob URLs)
    if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
      // Original approach for small files (<4.5MB)
      const formData = await req.formData();
      const files = formData.getAll('files') as File[];

      if (!files || files.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
      }

      const results: ExtractedData[] = [];

      for (const file of files) {
        const id = formData.get(`id_${file.name}`)?.toString() || crypto.randomUUID();
        const buffer = Buffer.from(await file.arrayBuffer());
        let snippet = '';

        // Route by MIME type
        if (file.type === 'application/pdf') {
          snippet = await extractPdfText(buffer);
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword'
        ) {
          snippet = await extractDocxText(buffer);
        } else if (file.type.startsWith('text/')) {
          snippet = await extractTextContent(buffer);
        } else if (file.type.startsWith('image/')) {
          snippet = `[Image file: ${file.name}, type: ${file.type}]`;
        } else if (file.type.startsWith('audio/')) {
          snippet = `[Audio file: ${file.name}, type: ${file.type}]`;
        } else {
          snippet = `[File: ${file.name}, type: ${file.type}, size: ${file.size} bytes]`;
        }

        // Truncate snippet
        if (snippet.length > 3000) {
          snippet = snippet.slice(0, 3000) + '...';
        }

        results.push({
          id,
          snippet,
          blobUrl: '', // No blob URL for small files
          metadata: {},
        });
      }

      return NextResponse.json({ results });
    } else {
      // JSON approach for large files with blob URLs (>=4.5MB)
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
            snippet = `[Image file: ${file.originalName}, type: ${file.mimeType}]`;
          } else if (file.mimeType.startsWith('audio/')) {
            snippet = `[Audio file: ${file.originalName}, type: ${file.mimeType}]`;
          } else {
            snippet = `[File: ${file.originalName}, type: ${file.mimeType}, size: ${file.size} bytes]`;
          }

          // Truncate snippet
          if (snippet.length > 3000) {
            snippet = snippet.slice(0, 3000) + '...';
          }

          results.push({
            id: file.id,
            snippet,
            blobUrl: file.blobUrl,
            metadata: {},
          });
        } catch (error) {
          console.error(`Failed to process file ${file.originalName}:`, error);
          results.push({
            id: file.id,
            snippet: `[Error processing file: ${file.originalName}]`,
            blobUrl: file.blobUrl,
            metadata: {},
          });
        }
      }

      return NextResponse.json({ results });
    }
  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract file content' },
      { status: 500 },
    );
  }
}

