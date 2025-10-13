'use client';

import { useState } from 'react';
import { FileDropzone } from './file-dropzone';
import { FilePreviewTable } from './file-preview-table';
import type { FileItem, ProposedFile, ExtractedData } from '@/types/renamer';
import { Button } from './ui/button';
import { Loader2, Sparkles, X, FileIcon, FileText, FileImage, FileAudio, FileArchive } from 'lucide-react';
import { estimateTokens } from '@/lib/filename-utils';
import { prepareFilesForUpload } from '@/lib/upload-helper';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Textarea } from './ui/textarea';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text')) return FileText;
  if (mimeType.includes('zip')) return FileArchive;
  return FileIcon;
};

const getFileColor = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  if (mimeType.startsWith('audio/')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
  if (mimeType.includes('pdf')) return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (mimeType.includes('word')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  if (mimeType.includes('text')) return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  if (mimeType.includes('zip')) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
};

export function FileRenamer() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [proposedFiles, setProposedFiles] = useState<ProposedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [instructions, setInstructions] = useState('');

  const handleFilesAdded = (newFiles: FileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleExtract = async (shouldMerge = false, filesToProcess?: FileItem[]) => {
    const targetFiles = filesToProcess || files;
    if (targetFiles.length === 0) return;

    setIsExtracting(true);
    setError(null);
    setUploadProgress({});

    try {
      console.log('[FileRenamer] Starting extract with files:', targetFiles.length);
      
      // Prepare FormData using case-study pattern (handles small/large files transparently)
      const formData = await prepareFilesForUpload(
        targetFiles.map((f) => f.file),
        (fileName, percentage) => {
          setUploadProgress((prev) => ({
            ...prev,
            [fileName]: percentage,
          }));
        },
      );

      // Clear progress after upload completes
      setUploadProgress({});

      // Add file IDs
      targetFiles.forEach((file, i) => {
        formData.append(`id-${i}`, file.id);
      });

      // Debug: Log FormData contents
      console.log('[FileRenamer] FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract file content');
      }

      const { results } = (await response.json()) as { results: ExtractedData[] };

      // Estimate tokens
      const totalTokens = results.reduce((sum, r) => sum + estimateTokens(r.snippet), 0);
      setEstimatedTokens(totalTokens);

      // Now propose names
      await handlePropose(results, shouldMerge, targetFiles);
    } catch (err) {
      console.error('Extract error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract content');
      setUploadProgress({});
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePropose = async (extractedData: ExtractedData[], shouldMerge = false, filesToProcess?: FileItem[]) => {
    const targetFiles = filesToProcess || files;
    setIsProposing(true);
    setError(null);

    try {
      // Prepare items for proposal - convert small images to base64
      const items = await Promise.all(
        targetFiles.map(async (file) => {
          const extracted = extractedData.find((e) => e.id === file.id);
          let imageData = file.blobUrl;

          // For small images without blob URL, convert to base64
          if (file.mimeType.startsWith('image/') && !file.blobUrl) {
            try {
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file.file);
              });
              imageData = base64;
            } catch (error) {
              console.error('Failed to convert image to base64:', error);
            }
          }

          return {
            id: file.id,
            originalName: file.originalName,
            mimeType: file.mimeType,
            snippet: extracted?.snippet || '',
            dateCandidate: extracted?.metadata.dateCandidate,
            blobUrl: imageData, // Pass blob URL or base64 data URL
          };
        }),
      );

      console.log('[FileRenamer] Sending instructions:', instructions);
      const requestBody = { 
        items,
        instructions: instructions.trim() || undefined,
      };
      console.log('[FileRenamer] Request body:', JSON.stringify({ ...requestBody, items: `[${requestBody.items.length} items]` }));
      
      const response = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate proposals');
      }

      const { results } = await response.json();

      // Merge proposals with files
      const proposed: ProposedFile[] = targetFiles.map((file) => {
        const result = results.find((r: { id: string }) => r.id === file.id);
        return {
          ...file,
          proposal: result.proposal,
          finalName: result.finalName,
          included: true,
          edited: false,
        };
      });

      if (shouldMerge) {
        // Merge new proposals into existing proposedFiles, keeping unselected files
        const updatedIds = new Set(proposed.map((f) => f.id));
        setProposedFiles((prev) => [
          ...prev.filter((f) => !updatedIds.has(f.id)), // Keep files that weren't rerun
          ...proposed, // Add newly processed files
        ]);
      } else {
        setProposedFiles(proposed);
      }
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

    console.log('[FileRenamer] Rerunning selected files:', selectedFiles.length, 'out of', files.length);
    
    // Extract and propose with merge mode, passing selected files explicitly
    await handleExtract(true, selectedFiles);
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
        <div className="relative z-10 space-y-4">
          <FileDropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} />
          
          {/* Optional Instructions */}
          <div className="w-full overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="p-3">
              <label htmlFor="instructions" className="text-sm font-medium text-foreground mb-2 block">
                Instructions (Optional)
              </label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add any special instructions for naming... e.g., 'Use YYYY-MM-DD format for dates' or 'Include project name in all files'"
                className="min-h-[80px] resize-none border-none shadow-none focus-visible:ring-0 p-0"
                disabled={isProcessing}
              />
            </div>
          </div>
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

          {/* File List with Avatars */}
          <TooltipProvider delayDuration={300}>
            <div className="relative z-10 flex flex-wrap gap-3">
              {files.map((file) => {
                const IconComponent = getFileIcon(file.mimeType);
                const colorClass = getFileColor(file.mimeType);
                const isImage = file.mimeType.startsWith('image/');
                
                return (
                  <div
                    key={file.id}
                    className="group relative"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Avatar className="size-12 ring-2 ring-border hover:ring-primary transition-all cursor-pointer">
                            {isImage ? (
                              <>
                                <AvatarImage 
                                  src={URL.createObjectURL(file.file)} 
                                  alt={file.originalName}
                                  className="object-cover"
                                />
                                <AvatarFallback className={colorClass}>
                                  <IconComponent className="w-5 h-5" />
                                </AvatarFallback>
                              </>
                            ) : (
                              <AvatarFallback className={colorClass}>
                                <IconComponent className="w-5 h-5" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                            {file.blobUrl && ' • Cloud storage'}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveFile(file.id)}
                      disabled={isProcessing}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>

          {proposedFiles.length === 0 ? (
            <>
              {/* Optional Instructions - visible before generation */}
              <div className="w-full overflow-hidden rounded-xl border bg-background shadow-sm">
                <div className="p-3">
                  <label htmlFor="instructions-upload" className="text-sm font-medium text-foreground mb-2 block">
                    Instructions (Optional)
                  </label>
                  <Textarea
                    id="instructions-upload"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Add any special instructions for naming... e.g., 'Use YYYY-MM-DD format for dates' or 'Include project name in all files'"
                    className="min-h-[80px] resize-none border-none shadow-none focus-visible:ring-0 p-0"
                    disabled={isProcessing}
                  />
                </div>
              </div>

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
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-center">
                        {Object.keys(uploadProgress).length > 0
                          ? 'Uploading large files to cloud storage...'
                          : 'Many files and larger files will take longer to process'}
                      </p>
                    </div>
                    {Object.keys(uploadProgress).length > 0 && (
                      <div className="space-y-2 max-w-md mx-auto">
                        {Object.entries(uploadProgress).map(([name, progress]) => (
                          <div key={name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="truncate max-w-[200px]">{name}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
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

