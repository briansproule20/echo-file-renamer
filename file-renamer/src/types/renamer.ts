export const DOCTYPES = [
  'invoice',
  'receipt',
  'contract',
  'meeting-notes',
  'resume',
  'photo',
  'screenshot',
  'slide',
  'report',
  'paper',
  'article',
  'code',
  'audio-notes',
  'other',
] as const;

export type DocType = (typeof DOCTYPES)[number];

export interface FilenameProposal {
  proposed_filename: string;
  confidence: number;
  doctype: DocType;
  date_iso: string | null;
  primary_entity: string | null;
  secondary_entity: string | null;
  topic: string | null;
  rationale: string;
}

export interface FileItem {
  id: string;
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  file: File;
}

export interface ExtractedData {
  id: string;
  snippet: string;
  metadata: {
    dateCandidate?: string;
    exifData?: Record<string, unknown>;
  };
}

export interface ProposedFile extends FileItem {
  proposal: FilenameProposal;
  finalName: string;
  included: boolean;
  edited: boolean;
}

