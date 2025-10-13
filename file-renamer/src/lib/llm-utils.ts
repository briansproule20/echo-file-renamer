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
Never include slashes or illegal characters. Use lowercase kebab-case. Trim to 120 chars.

⚠️ CRITICAL RULES:
1. If user provides specific instructions, you MUST follow them exactly. User instructions override all default policies.
2. DO NOT MAKE UP DATES. Only use dates that are explicitly visible in the provided content. If no date is found, set date_iso to null.
3. DO NOT use placeholder dates like "2023" or "2024" - these are WRONG. Use actual dates from the content or set to null.`;

const RENAMING_POLICY = `DEFAULT RENAMING POLICY (can be overridden by user instructions):
- lowercase kebab-case, strip unsafe chars, collapse spaces
- order: doctype, primary entity, secondary (optional), topic, date
- default date format: YYYY-MM-DD (but use user's requested format if specified)
- truncate to 120 chars, preserve meaning
- if unclear, pick "other" and a concise topic`;

interface ProposeNameInput {
  originalName: string;
  mimeType: string;
  snippet: string;
  dateCandidates?: string[];
  userInstructions?: string;
}

export async function proposeFilename(
  input: ProposeNameInput,
  model: LanguageModel,
): Promise<FilenameProposal> {
  const truncatedSnippet = truncateToTokens(input.snippet, 500);

  // Build user prompt with instructions at the top if provided
  let userPrompt = '';
  
  if (input.userInstructions) {
    userPrompt += `=====================================
USER INSTRUCTIONS (MUST FOLLOW):
${input.userInstructions}

IMPORTANT: Put the COMPLETE filename (following these instructions) in the "proposed_filename" field. This will be used as-is.
=====================================

`;
    console.log('[LLM] Using user instructions:', input.userInstructions);
  }

  userPrompt += `Original filename: "${input.originalName}"
MIME: ${input.mimeType}
Detected content/text (analyze carefully for dates):
"""
${truncatedSnippet}
"""
EXIF/metadata date candidate(s): ${input.dateCandidates?.join(', ') || 'none'}

⚠️ CRITICAL: Look for dates in the detected content above. Use the ACTUAL date from the content/image, NOT a made-up date like 2023. If you see a date in the content, use it. If no date is found, set date_iso to null.

${RENAMING_POLICY}${input.userInstructions ? '\n\n⚠️ IMPORTANT: Apply the USER INSTRUCTIONS above when generating the filename. These instructions override default policies.' : ''}

Return JSON only.`;

  console.log('[LLM] Snippet being sent to model:', truncatedSnippet.substring(0, 300));

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
    console.log('[LLM] Proposed filename:', validated.proposed_filename, 'date:', validated.date_iso);
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
              text: 'Analyze this image and provide: 1) Type of document/image, 2) Any visible dates (in exact format shown - look carefully for dates in YYYY, MM/DD/YYYY, or any other format), 3) Key visible text or entities, 4) Main subject/topic. BE SPECIFIC about any dates you see.',
            },
            {
              type: 'image',
              image: imageData,
            },
          ],
        },
      ],
    });

    console.log('[Vision] Extracted from image:', text);
    return text;
  } catch (error) {
    console.error('Failed to extract image caption:', error);
    return 'Image content could not be analyzed';
  }
}

