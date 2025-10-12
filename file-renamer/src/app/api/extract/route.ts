import { NextRequest, NextResponse } from 'next/server';
// import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { ExtractedData } from '@/types/renamer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function extractPdfText(buffer: Buffer): Promise<string> {
  // PDFParse causes DOMMatrix error on Vercel - disabled
  return '';
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
    const formData = await req.formData();
    const results: ExtractedData[] = [];
    let index = 0;

    // Manually extract files from FormData (handles both file-${i} and blob-${i})
    while (true) {
      const file = formData.get(`file-${index}`) as File | null;
      const blobUrl = formData.get(`blob-${index}`) as string | null;
      const id = formData.get(`id-${index}`)?.toString() || crypto.randomUUID();

      // Break if no more files
      if (!file && !blobUrl) break;

      let buffer: Buffer;
      let fileName: string;
      let mimeType: string;

      if (blobUrl) {
        // Large file: fetch from Vercel Blob
        const blobFilename = formData.get(`blob-${index}-filename`) as string;
        const blobType = formData.get(`blob-${index}-type`) as string;

        console.log(`[Extract] Fetching blob: ${blobUrl}`);
        const response = await fetch(blobUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.statusText}`);
        }

        buffer = Buffer.from(await response.arrayBuffer());
        fileName = blobFilename;
        mimeType = blobType;
      } else if (file) {
        // Small file: directly from FormData
        buffer = Buffer.from(await file.arrayBuffer());
        fileName = file.name;
        mimeType = file.type;
      } else {
        break;
      }

      let snippet = '';

      // Route by MIME type
      if (mimeType === 'application/pdf') {
        snippet = await extractPdfText(buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        snippet = await extractDocxText(buffer);
      } else if (mimeType.startsWith('text/')) {
        snippet = await extractTextContent(buffer);
      } else if (mimeType.startsWith('image/')) {
        snippet = `[Image file: ${fileName}, type: ${mimeType}]`;
      } else if (mimeType.startsWith('audio/')) {
        snippet = `[Audio file: ${fileName}, type: ${mimeType}]`;
      } else {
        snippet = `[File: ${fileName}, type: ${mimeType}, size: ${buffer.length} bytes]`;
      }

      // Truncate snippet
      if (snippet.length > 3000) {
        snippet = snippet.slice(0, 3000) + '...';
      }

      results.push({
        id,
        snippet,
        blobUrl: blobUrl || '',
        metadata: {},
      });

      index++;
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract file content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

