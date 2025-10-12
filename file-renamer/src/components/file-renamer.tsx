'use client';

import { useState } from 'react';
import { FileDropzone } from './file-dropzone';
import { FilePreviewTable } from './file-preview-table';
import type { FileItem, ProposedFile, ExtractedData } from '@/types/renamer';
import { Button } from './ui/button';
import { Loader2, Sparkles, X, FileIcon } from 'lucide-react';
import { estimateTokens } from '@/lib/filename-utils';

export function FileRenamer() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [proposedFiles, setProposedFiles] = useState<ProposedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const handleFilesAdded = (newFiles: FileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleExtract = async () => {
    if (files.length === 0) return;

    setIsExtracting(true);
    setError(null);

    try {
      // Check if any file uses blob (large files)
      const hasLargeFiles = files.some((f) => f.blobUrl);

      let response;

      if (hasLargeFiles) {
        // Use JSON for files with blob URLs (>=4.5MB)
        const fileData = files.map((file) => ({
          id: file.id,
          blobUrl: file.blobUrl,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        }));

        response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: fileData }),
        });
      } else {
        // Use FormData for small files (<4.5MB) - original approach
        const formData = new FormData();
        for (const file of files) {
          formData.append('files', file.file);
          formData.append(`id_${file.file.name}`, file.id);
        }

        response = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error('Failed to extract file content');
      }

      const { results } = (await response.json()) as { results: ExtractedData[] };

      // Estimate tokens
      const totalTokens = results.reduce((sum, r) => sum + estimateTokens(r.snippet), 0);
      setEstimatedTokens(totalTokens);

      // Now propose names
      await handlePropose(results);
    } catch (err) {
      console.error('Extract error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract content');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePropose = async (extractedData: ExtractedData[]) => {
    setIsProposing(true);
    setError(null);

    try {
      // Prepare items for proposal with blob URLs
      const items = files.map((file) => {
        const extracted = extractedData.find((e) => e.id === file.id);
        return {
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          snippet: extracted?.snippet || '',
          dateCandidate: extracted?.metadata.dateCandidate,
          blobUrl: file.blobUrl, // Pass blob URL instead of base64
        };
      });

      const response = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate proposals');
      }

      const { results } = await response.json();

      // Merge proposals with files
      const proposed: ProposedFile[] = files.map((file) => {
        const result = results.find((r: { id: string }) => r.id === file.id);
        return {
          ...file,
          proposal: result.proposal,
          finalName: result.finalName,
          included: true,
          edited: false,
        };
      });

      setProposedFiles(proposed);
    } catch (err) {
      console.error('Propose error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate proposals');
    } finally {
      setIsProposing(false);
    }
  };

  const handleFileUpdate = (id: string, updates: Partial<ProposedFile>) => {
    setProposedFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...updates } : file)),
    );
  };

  const handleSelectAll = () => {
    const allSelected = proposedFiles.every((f) => f.included);
    setProposedFiles((prev) => prev.map((file) => ({ ...file, included: !allSelected })));
  };

  const handleDownloadZip = async () => {
    const selectedFiles = proposedFiles.filter((f) => f.included);
    if (selectedFiles.length === 0) return;

    setIsDownloading(true);
    setError(null);

    try {
      // Check if any file uses blob (large files)
      const hasLargeFiles = selectedFiles.some((f) => f.blobUrl);

      if (hasLargeFiles) {
        // Use blob URLs for large files
        const filesData = selectedFiles.map((file) => ({
          originalName: file.originalName,
          finalName: file.finalName,
          blobUrl: file.blobUrl,
        }));

        const response = await fetch('/api/zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesData }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate ZIP');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renamed-files-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Use base64 for small files (original approach)
        const filesData = await Promise.all(
          selectedFiles.map(async (file) => {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file.file);
            });

            return {
              originalName: file.originalName,
              finalName: file.finalName,
              data: base64,
            };
          }),
        );

        const response = await fetch('/api/zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesData }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate ZIP');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renamed-files-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download ZIP');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportCsv = async () => {
    const selectedFiles = proposedFiles.filter((f) => f.included);
    if (selectedFiles.length === 0) return;

    try {
      const items = selectedFiles.map((file) => ({
        originalName: file.originalName,
        finalName: file.finalName,
        confidence: file.proposal.confidence,
        rationale: file.proposal.rationale,
      }));

      const response = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `renaming-map-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
    }
  };

  const handleRerun = async () => {
    const selectedIds = new Set(proposedFiles.filter((f) => f.included).map((f) => f.id));
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));

    if (selectedFiles.length === 0) return;

    // Create a temporary files array with only selected
    const originalFiles = files;
    setFiles(selectedFiles);

    await handleExtract();

    // Restore all files
    setFiles(originalFiles);
  };

  const handleClear = () => {
    setFiles([]);
    setProposedFiles([]);
    setEstimatedTokens(0);
    setError(null);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setError(null);
  };

  const isProcessing = isExtracting || isProposing || isDownloading;

  return (
    <div className="relative w-full max-w-7xl mx-auto space-y-4 md:space-y-6">

      <div className="space-y-2 relative z-10">
        <h1 className="font-bold text-3xl text-foreground">Echo File Renamer</h1>
        <p className="text-muted-foreground">
          AI-powered bulk file renaming. Upload files, get smart suggestions, and download
          renamed files.
        </p>
      </div>

      {error && (
        <div className="relative z-10 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      )}

      {files.length === 0 ? (
        <div className="relative z-10">
          <FileDropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} />
        </div>
      ) : (
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground font-medium">
                {files.length} file{files.length !== 1 ? 's' : ''} uploaded
              </p>
              {estimatedTokens > 0 && (
                <p className="text-xs text-muted-foreground">
                  (~{estimatedTokens.toLocaleString()} tokens estimated)
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={isProcessing}>
              Clear All
            </Button>
          </div>

          {/* File List with Delete Buttons */}
          <div className="relative z-10 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/80 backdrop-blur-sm"
              >
                <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                    {file.blobUrl && ' • Stored in cloud'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={isProcessing}
                  className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {proposedFiles.length === 0 ? (
            <div className="border border-border rounded-lg p-8 text-center bg-card/80 backdrop-blur-sm">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-foreground mb-2">
                Ready to rename
              </h3>
              <p className="text-muted-foreground mb-4">
                Click the button below to analyze your files and generate smart filename
                suggestions.
              </p>
              <Button
                onClick={handleExtract}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isExtracting ? 'Extracting content...' : 'Generating names...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Propose Names
                  </>
                )}
              </Button>
              {isProcessing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-center">
                    Many files and larger files will take longer to process
                  </p>
                </div>
              )}
            </div>
          ) : (
            <FilePreviewTable
              files={proposedFiles}
              onFileUpdate={handleFileUpdate}
              onSelectAll={handleSelectAll}
              onDownloadZip={handleDownloadZip}
              onExportCsv={handleExportCsv}
              onRerun={handleRerun}
              isProcessing={isProcessing}
            />
          )}
        </div>
      )}
    </div>
  );
}

