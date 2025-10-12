import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { ExtractedData } from '@/types/renamer';
import { extractFilesFromFormData } from '@/lib/upload-helper';

export const runtime = 'nodejs';
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
    const formData = await req.formData();

    // Use helper to extract files (handles both direct files and blob URLs transparently)
    const files = await extractFilesFromFormData(formData);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: ExtractedData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = formData.get(`id-${i}`)?.toString() || crypto.randomUUID();
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
        blobUrl: formData.get(`blob-${i}`)?.toString() || '', // Get blob URL if it exists
        metadata: {},
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json({ error: 'Failed to extract file content' }, { status: 500 });
  }
}

