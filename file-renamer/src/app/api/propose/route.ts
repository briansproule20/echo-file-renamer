import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/echo';
import { proposeFilename, extractImageCaption } from '@/lib/llm-utils';
import { buildFilename, resolveDuplicates, getExtension } from '@/lib/filename-utils';
import type { FilenameProposal } from '@/types/renamer';

export const maxDuration = 60;

interface FileProposalRequest {
  id: string;
  originalName: string;
  mimeType: string;
  snippet: string;
  dateCandidate?: string;
  blobUrl: string; // Vercel Blob storage URL
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Propose API] Full request body keys:', Object.keys(body));
    console.log('[Propose API] Instructions value:', body.instructions);
    
    const { items, instructions } = body as { 
      items: FileProposalRequest[];
      instructions?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    console.log('[Propose API] Received instructions:', instructions || '(none)');

    const model = openai('gpt-4o-mini'); // Fast and cost-effective model

    const proposals: Array<{
      id: string;
      proposal: FilenameProposal;
      filename: string;
      extension: string;
    }> = [];

    for (const item of items) {
      let snippet = item.snippet;

      // Handle images with vision model - ALWAYS run vision on images
      if (item.mimeType.startsWith('image/') && item.blobUrl) {
        console.log('[Propose] Image detected, running vision extraction...');
        try {
          let dataUrl = item.blobUrl;

          // If it's a blob URL (not already base64), fetch and convert
          if (item.blobUrl.startsWith('http')) {
            const response = await fetch(item.blobUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch blob: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            dataUrl = `data:${item.mimeType};base64,${base64}`;
          }
          // else it's already a data URL from client

          const caption = await extractImageCaption(dataUrl, item.mimeType, model);
          console.log('[Propose] Vision extracted:', caption.substring(0, 200));
          snippet = caption;
        } catch (error) {
          console.error('[Propose] Vision extraction failed:', error);
          // Fall back to basic snippet
        }
      } else {
        console.log('[Propose] Non-image file, using snippet:', snippet.substring(0, 100));
      }

      const proposal = await proposeFilename(
        {
          originalName: item.originalName,
          mimeType: item.mimeType,
          snippet,
          dateCandidates: item.dateCandidate ? [item.dateCandidate] : undefined,
          userInstructions: instructions,
        },
        model,
      );

      const filename = buildFilename(proposal);
      const extension = getExtension(item.originalName);

      proposals.push({
        id: item.id,
        proposal,
        filename,
        extension,
      });
    }

    // Resolve duplicate filenames
    const duplicateMap = resolveDuplicates(
      proposals.map((p) => ({
        id: p.id,
        name: p.filename,
        ext: p.extension,
      })),
    );

    // Update filenames with resolved versions
    const results = proposals.map((p) => ({
      id: p.id,
      proposal: p.proposal,
      finalName: duplicateMap.get(p.id) || `${p.filename}${p.extension}`,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Propose API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate filename proposals' },
      { status: 500 },
    );
  }
}

