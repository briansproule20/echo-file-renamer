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

const SYSTEM_PROMPT = `You are a filename generator. Analyze the provided content and metadata to create an accurate, descriptive filename.

Output STRICT JSON only matching this schema:
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

If user provides specific instructions, follow them exactly - they override default policies.`;

const RENAMING_POLICY = `Naming convention:
- Use lowercase kebab-case
- Include relevant components: doctype, entities, topic, date (if found)
- Keep under 120 characters
- Use YYYY-MM-DD format for dates unless user specifies otherwise`;

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
    userPrompt += `User Instructions:
${input.userInstructions}

Note: Put the complete filename in "proposed_filename" field, following the user instructions above.

`;
    console.log('[LLM] Using user instructions:', input.userInstructions);
  }

  userPrompt += `Original filename: "${input.originalName}"
MIME: ${input.mimeType}

Content/Description:
"""
${truncatedSnippet}
"""

Metadata date candidates: ${input.dateCandidates?.join(', ') || 'none'}

${RENAMING_POLICY}

Return JSON only.`;

  console.log('[LLM] Content snippet:', truncatedSnippet.substring(0, 200));

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
              text: 'Describe this image in detail. Include: type of document/image, any visible text, dates, names, entities, and main subject/topic.',
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

