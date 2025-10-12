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
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8)
      return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
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
          <span className="text-sm text-gray-600 dark:text-gray-400">
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

      <div className="border rounded-lg overflow-hidden dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Include
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Original Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  New Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Rationale
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
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
                        <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {file.originalName}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
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
                        className="text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded w-full"
                      >
                        <span className={file.edited ? 'text-blue-600 dark:text-blue-400' : ''}>
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
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {file.proposal.doctype}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
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

