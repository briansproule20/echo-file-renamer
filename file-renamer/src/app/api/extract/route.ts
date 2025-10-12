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

async function extractMetadata(file: File): Promise<{ dateCandidate?: string }> {
  // Try to extract date from file modified time
  const dateCandidate = new Date(file.lastModified).toISOString().split('T')[0];
  return { dateCandidate };
}

export async function POST(req: NextRequest) {
  try {
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
      const metadata = await extractMetadata(file);

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
        // For images, we'll handle OCR/vision in the propose route
        snippet = `[Image file: ${file.name}, type: ${file.type}]`;
      } else if (file.type.startsWith('audio/')) {
        // For audio, we'll handle transcription in the propose route
        snippet = `[Audio file: ${file.name}, type: ${file.type}]`;
      } else {
        // Unknown type - use filename and basic metadata
        snippet = `[File: ${file.name}, type: ${file.type}, size: ${file.size} bytes]`;
      }

      // Truncate snippet to first 3000 chars
      if (snippet.length > 3000) {
        snippet = snippet.slice(0, 3000) + '...';
      }

      results.push({
        id,
        snippet,
        metadata,
      });
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

