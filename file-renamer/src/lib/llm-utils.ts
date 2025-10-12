import { generateText, type LanguageModel } from 'ai';
import { z } from 'zod';
import type { FilenameProposal } from '@/types/renamer';
import { DOCTYPES } from '@/types/renamer';
import { truncateToTokens } from './filename-utils';

const FilenameProposalSchema = z.object({
  proposed_filename: z.string().min(3),
  confidence: z.number().min(0).max(1),
  doctype: z.enum(DOCTYPES),
  date_iso: z.string().nullable(),
  primary_entity: z.string().nullable(),
  secondary_entity: z.string().nullable(),
  topic: z.string().nullable(),
  rationale: z.string().max(280),
});

const SYSTEM_PROMPT = `You are a filename generator. Output STRICT JSON only matching this schema:
{
  "proposed_filename": string (no extension),
  "confidence": number 0..1,
  "doctype": one of ["invoice","receipt","contract","meeting-notes","resume","photo","screenshot","slide","report","paper","article","code","audio-notes","other"],
  "date_iso": "YYYY-MM-DD" or null,
  "primary_entity": string or null,
  "secondary_entity": string or null,
  "topic": string or null,
  "rationale": string (<= 2 sentences)
}
Never include slashes or illegal characters. Use lowercase kebab-case. Trim to 120 chars.`;

const RENAMING_POLICY = `RENAMING POLICY:
- lowercase kebab-case, strip unsafe chars, collapse spaces
- order: doctype, primary entity, secondary (optional), topic, date (YYYY-MM-DD)
- truncate to 120 chars, preserve meaning
- if unclear, pick "other" and a concise topic`;

interface ProposeNameInput {
  originalName: string;
  mimeType: string;
  snippet: string;
  dateCandidates?: string[];
}

export async function proposeFilename(
  input: ProposeNameInput,
  model: LanguageModel,
): Promise<FilenameProposal> {
  const truncatedSnippet = truncateToTokens(input.snippet, 500);

  const userPrompt = `Original filename: "${input.originalName}"
MIME: ${input.mimeType}
Detected text snippet (first ~2000 chars): 
"""
${truncatedSnippet}
"""
EXIF/metadata date candidate(s): ${input.dateCandidates?.join(', ') || 'none'}
${RENAMING_POLICY}
Return JSON only.`;

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonText);

    const validated = FilenameProposalSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('Failed to propose filename:', error);
    // Return fallback proposal
    return {
      proposed_filename: input.originalName.replace(/\.[^/.]+$/, ''),
      confidence: 0.1,
      doctype: 'other',
      date_iso: null,
      primary_entity: null,
      secondary_entity: null,
      topic: null,
      rationale: 'Failed to generate proposal, using original name',
    };
  }
}

export async function extractImageCaption(
  imageData: string,
  mimeType: string,
  model: LanguageModel,
): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image briefly in 1-2 sentences. Focus on: what type of document/image is this, key visible text or entities, and main subject/topic.',
            },
            {
              type: 'image',
              image: imageData,
            },
          ],
        },
      ],
    });

    return text;
  } catch (error) {
    console.error('Failed to extract image caption:', error);
    return 'Image content could not be analyzed';
  }
}

