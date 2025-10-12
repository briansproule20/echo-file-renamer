'use client';

import { useState } from 'react';
import {
  CheckSquare,
  Square,
  Download,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { ProposedFile } from '@/types/renamer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FilePreviewTableProps {
  files: ProposedFile[];
  onFileUpdate: (id: string, updates: Partial<ProposedFile>) => void;
  onSelectAll: () => void;
  onDownloadZip: () => void;
  onExportCsv: () => void;
  onRerun: () => void;
  isProcessing: boolean;
}

export function FilePreviewTable({
  files,
  onFileUpdate,
  onSelectAll,
  onDownloadZip,
  onExportCsv,
  onRerun,
  isProcessing,
}: FilePreviewTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedCount = files.filter((f) => f.included).length;
  const allSelected = files.length > 0 && selectedCount === files.length;

  const handleNameChange = (id: string, newName: string) => {
    onFileUpdate(id, { finalName: newName, edited: true });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-emerald-600 dark:text-emerald-400 font-medium';
    if (confidence >= 0.5) return 'text-amber-600 dark:text-amber-400 font-medium';
    return 'text-rose-600 dark:text-rose-400 font-medium';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8)
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    return <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="flex items-center gap-2"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            {selectedCount} of {files.length} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRerun}
            disabled={isProcessing || selectedCount === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            Re-run Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={selectedCount === 0}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={onDownloadZip}
            disabled={isProcessing || selectedCount === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download ZIP
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Include
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Original Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  New Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rationale
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {files.map((file) => (
                <tr
                  key={file.id}
                  className={file.included ? '' : 'opacity-50'}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onFileUpdate(file.id, { included: !file.included })}
                      className="hover:scale-110 transition-transform"
                    >
                      {file.included ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">
                        {file.originalName}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === file.id ? (
                      <Input
                        value={file.finalName}
                        onChange={(e) => handleNameChange(file.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingId(file.id)}
                        className="text-sm text-left hover:bg-muted p-1 rounded w-full text-foreground"
                      >
                        <span className={file.edited ? 'text-primary font-medium' : ''}>
                          {file.finalName}
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getConfidenceIcon(file.proposal.confidence)}
                      <span className={`text-sm ${getConfidenceColor(file.proposal.confidence)}`}>
                        {(file.proposal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {file.proposal.doctype}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-muted-foreground max-w-md">
                      {file.proposal.rationale}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

