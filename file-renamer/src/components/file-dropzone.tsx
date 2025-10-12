'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileIcon } from 'lucide-react';
import type { FileItem } from '@/types/renamer';
import { getExtension } from '@/lib/filename-utils';

interface FileDropzoneProps {
  onFilesAdded: (files: FileItem[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFilesAdded, disabled = false }: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const fileItems: FileItem[] = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        originalName: file.name,
        extension: getExtension(file.name),
        mimeType: file.type,
        size: file.size,
        file,
      }));
      onFilesAdded(fileItems);
    },
    [onFilesAdded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/rtf': ['.rtf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200
        ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {isDragActive ? (
          <Upload className="w-12 h-12 text-blue-500 animate-bounce" />
        ) : (
          <FileIcon className="w-12 h-12 text-gray-400" />
        )}
        <div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            or click to browse
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Supports: PDF, DOCX, TXT, Images (PNG/JPG), Audio (MP3/WAV), ZIP
        </p>
      </div>
    </div>
  );
}

