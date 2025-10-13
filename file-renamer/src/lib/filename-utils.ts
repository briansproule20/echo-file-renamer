import type { DocType, FilenameProposal } from '@/types/renamer';

/**
 * Sanitizes a filename to be safe and readable
 * - Lowercase kebab-case
 * - Strip unsafe characters
 * - Collapse whitespace
 * - Max 120 chars
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_.]/g, '-') // Replace unsafe chars with dash
    .replace(/\s+/g, '-') // Collapse whitespace
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-+|-+$/g, '') // Trim leading/trailing dashes
    .slice(0, 120); // Max 120 chars
}

/**
 * Builds a filename from proposal slots following the policy
 */
export function buildFilename(proposal: FilenameProposal): string {
  // If proposed_filename exists and looks complete, use it directly
  // (this allows custom formatting from user instructions)
  if (proposal.proposed_filename && proposal.proposed_filename.length > 5) {
    return sanitizeFilename(proposal.proposed_filename);
  }

  // Otherwise, build from parts
  const parts: string[] = [];

  // Priority order: doctype, primary entity, secondary entity, topic, date
  if (proposal.doctype && proposal.doctype !== 'other') {
    parts.push(proposal.doctype);
  }

  if (proposal.primary_entity) {
    parts.push(sanitizeFilename(proposal.primary_entity));
  }

  if (proposal.secondary_entity) {
    parts.push(sanitizeFilename(proposal.secondary_entity));
  }

  if (proposal.topic) {
    parts.push(sanitizeFilename(proposal.topic));
  }

  if (proposal.date_iso) {
    parts.push(proposal.date_iso);
  }

  const combined = parts.join('-');
  return sanitizeFilename(combined) || sanitizeFilename(proposal.proposed_filename);
}

/**
 * Resolves duplicate filenames by appending version numbers
 */
export function resolveDuplicates(
  filenames: Array<{ id: string; name: string; ext: string }>,
): Map<string, string> {
  const result = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const { id, name, ext } of filenames) {
    const fullName = `${name}${ext}`;
    const count = counts.get(fullName) || 0;

    if (count === 0) {
      result.set(id, fullName);
      counts.set(fullName, 1);
    } else {
      const versionedName = `${name}-v${count + 1}${ext}`;
      result.set(id, versionedName);
      counts.set(fullName, count + 1);
    }
  }

  return result;
}

/**
 * Extracts file extension including the dot
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot) : '';
}

/**
 * Validates date string and normalizes to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Estimates token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncates text to approximate token limit
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

