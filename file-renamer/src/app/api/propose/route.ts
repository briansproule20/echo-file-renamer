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
  imageData?: string; // base64 encoded image for vision
}

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: FileProposalRequest[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const model = openai('gpt-4o-mini'); // Fast and cost-effective model

    const proposals: Array<{
      id: string;
      proposal: FilenameProposal;
      filename: string;
      extension: string;
    }> = [];

    for (const item of items) {
      let snippet = item.snippet;

      // Handle images with vision model if imageData provided
      if (item.mimeType.startsWith('image/') && item.imageData) {
        try {
          const caption = await extractImageCaption(item.imageData, item.mimeType, model);
          snippet = caption;
        } catch (error) {
          console.error('Vision extraction failed:', error);
          // Fall back to basic snippet
        }
      }

      const proposal = await proposeFilename(
        {
          originalName: item.originalName,
          mimeType: item.mimeType,
          snippet,
          dateCandidates: item.dateCandidate ? [item.dateCandidate] : undefined,
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

