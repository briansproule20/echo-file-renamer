import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export const maxDuration = 60;

interface ZipFileRequest {
  originalName: string;
  finalName: string;
  blobUrl: string; // Vercel Blob storage URL
}

export async function POST(req: NextRequest) {
  try {
    const { files, zipName } = (await req.json()) as {
      files: ZipFileRequest[];
      zipName?: string;
    };

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const zip = new JSZip();

    // Add each file to the ZIP with the renamed filename
    for (const file of files) {
      try {
        // Fetch file from Vercel Blob
        const response = await fetch(file.blobUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        zip.file(file.finalName, buffer);
      } catch (error) {
        console.error(`Failed to add file ${file.finalName}:`, error);
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const fileName = zipName || `renamed-files-${Date.now()}.zip`;

    // Return ZIP as response
    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('ZIP API error:', error);
    return NextResponse.json({ error: 'Failed to generate ZIP file' }, { status: 500 });
  }
}

