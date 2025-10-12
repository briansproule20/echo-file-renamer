'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileIcon, Loader2 } from 'lucide-react';
import type { FileItem } from '@/types/renamer';
import { getExtension } from '@/lib/filename-utils';
import { uploadFileToBlob } from '@/lib/blob-upload';

interface FileDropzoneProps {
  onFilesAdded: (files: FileItem[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFilesAdded, disabled = false }: FileDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      setUploadProgress({});

      try {
        // Upload all files to Vercel Blob
        const fileItems: FileItem[] = await Promise.all(
          acceptedFiles.map(async (file) => {
            try {
              const blobUrl = await uploadFileToBlob(file, (progress) => {
                setUploadProgress((prev) => ({
                  ...prev,
                  [file.name]: progress.percentage,
                }));
              });

              return {
                id: crypto.randomUUID(),
                originalName: file.name,
                extension: getExtension(file.name),
                mimeType: file.type,
                size: file.size,
                file,
                blobUrl,
              };
            } catch (error) {
              console.error(`Failed to upload ${file.name}:`, error);
              throw error;
            }
          }),
        );

        onFilesAdded(fileItems);
        setUploadProgress({});
      } catch (error) {
        console.error('File upload error:', error);
        alert(
          `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } finally {
        setIsUploading(false);
      }
    },
    [onFilesAdded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
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
        transition-colors duration-200 bg-card/80 backdrop-blur-sm
        ${
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="w-full max-w-md space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Uploading to cloud storage...
              </p>
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
          </>
        ) : isDragActive ? (
          <Upload className="w-12 h-12 text-primary animate-bounce" />
        ) : (
          <FileIcon className="w-12 h-12 text-muted-foreground" />
        )}
        {!isUploading && (
          <>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports: PDF, DOCX, TXT, Images (PNG/JPG), Audio (MP3/WAV), ZIP (up to 500MB per
              file)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

