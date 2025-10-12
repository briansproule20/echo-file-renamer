import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

// This route provides upload tokens for client-side uploads to Vercel Blob
// This avoids the 413 error by uploading directly from the client to blob storage
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log(`Generating upload token for: ${pathname}`);

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'audio/mpeg',
            'audio/wav',
            'application/zip',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB per file
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Blob upload token error:', error);
    return NextResponse.json({ error: 'Failed to generate upload token' }, { status: 500 });
  }
}

