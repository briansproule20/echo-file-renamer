import { upload } from '@vercel/blob/client';

export interface BlobUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadFileToBlob(
  file: File,
  onProgress?: (progress: BlobUploadProgress) => void,
): Promise<string> {
  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/blob/upload',
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      },
    });

    return blob.url;
  } catch (error) {
    console.error('Blob upload failed:', error);
    throw new Error(
      `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function uploadMultipleFiles(
  files: File[],
  onFileProgress?: (fileName: string, progress: BlobUploadProgress) => void,
): Promise<Map<string, string>> {
  const uploadPromises = files.map(async (file) => {
    const url = await uploadFileToBlob(file, (progress) => {
      onFileProgress?.(file.name, progress);
    });
    return [file.name, url] as [string, string];
  });

  const results = await Promise.all(uploadPromises);
  return new Map(results);
}

