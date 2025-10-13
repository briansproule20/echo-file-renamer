// Helper for handling file uploads with automatic routing based on size
// Transparent: tries direct upload first, falls back to blob if needed

import { upload } from '@vercel/blob/client';

const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB total payload limit

/**
 * Smart file upload that automatically handles large files via blob storage
 * This is a drop-in replacement for direct FormData uploads
 *
 * Usage: Just pass files to this and append the result to your FormData
 */
export async function prepareFilesForUpload(
  files: FileList | File[],
  onProgress?: (fileName: string, percentage: number) => void,
): Promise<FormData> {
  const formData = new FormData();
  const fileArray = Array.from(files);

  // Calculate total size to decide upload strategy
  const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
  const useBlob = totalSize > DIRECT_UPLOAD_LIMIT;

  console.log(`[Upload] Total size: ${formatFileSize(totalSize)}, using ${useBlob ? 'blob storage' : 'direct upload'}`);

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];

    // If total payload is too large, upload ALL files to blob
    if (useBlob && typeof window !== 'undefined') {
      try {
        console.log(`[Upload] Starting blob upload: ${file.name} (${formatFileSize(file.size)})`);

        // Client-side upload directly to Vercel Blob
        // This avoids the 413 error by never sending the file through our API
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
          onUploadProgress: (event) => {
            if (onProgress && event.total) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              onProgress(file.name, percentage);
            }
          },
        });

        console.log(`[Upload] Blob upload successful: ${blob.url}`);

        // Add blob URL instead of file
        formData.append(`blob-${i}`, blob.url);
        formData.append(`blob-${i}-filename`, file.name);
        formData.append(`blob-${i}-type`, file.type);
      } catch (error) {
        console.error('[Upload] Blob upload failed:', error);

        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error);
        }

        throw new Error(
          `Failed to upload "${file.name}" (${formatFileSize(file.size)}) to blob storage.\n` +
            `Error: ${errorMessage}\n\n` +
            `This usually means:\n` +
            `1. The BLOB_READ_WRITE_TOKEN environment variable is not set in Vercel\n` +
            `2. You need to redeploy after code changes\n` +
            `3. There's a network issue`,
        );
      }
    } else {
      // Direct upload for small files
      formData.append(`file-${i}`, file);
    }
  }

  return formData;
}

/**
 * Helper to extract files from FormData (handles both blob URLs and direct files)
 * Use this in API routes to get consistent file handling
 */
export async function extractFilesFromFormData(formData: FormData): Promise<File[]> {
  const files: File[] = [];
  let index = 0;

  while (true) {
    const file = formData.get(`file-${index}`) as File | null;
    const blobUrl = formData.get(`blob-${index}`) as string | null;

    if (!file && !blobUrl) break;

    if (blobUrl) {
      // Fetch from blob storage
      const filename = formData.get(`blob-${index}-filename`) as string;
      const type = formData.get(`blob-${index}-type`) as string;

      const response = await fetch(blobUrl);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type });
      const fileObj = new File([blob], filename, { type });
      files.push(fileObj);
    } else if (file) {
      files.push(file);
    }

    index++;
  }

  return files;
}

/**
 * Gets file size display string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

