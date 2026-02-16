/**
 * ImageKit Service
 * Handles file uploads to ImageKit cloud storage
 */
    
import ImageKit from 'imagekit';

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
});

export interface UploadOptions {
  file: Buffer | string;
  fileName: string;
  folder?: string;
  tags?: string[];
  useUniqueFileName?: boolean;
}

export interface UploadResult {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  fileType: string;
  filePath: string;
  size: number;
}

/**
 * Upload file to ImageKit
 */
export async function uploadToImageKit(
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const result = await imagekit.upload({
      file: options.file,
      fileName: options.fileName,
      folder: options.folder || '/evidence',
      tags: options.tags || [],
      useUniqueFileName: options.useUniqueFileName !== false,
    });

    return {
      fileId: result.fileId,
      name: result.name,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl || result.url,
      fileType: result.fileType,
      filePath: result.filePath,
      size: result.size,
    };
  } catch (error) {
    console.error('[ImageKit] Upload error:', error);
    throw new Error('Failed to upload file to ImageKit');
  }
}

/**
 * Delete file from ImageKit
 */
export async function deleteFromImageKit(fileId: string): Promise<void> {
  try {
    await imagekit.deleteFile(fileId);
  } catch (error) {
    console.error('[ImageKit] Delete error:', error);
    throw new Error('Failed to delete file from ImageKit');
  }
}

/**
 * Get file details from ImageKit
 */
export async function getFileDetails(fileId: string) {
  try {
    return await imagekit.getFileDetails(fileId);
  } catch (error) {
    console.error('[ImageKit] Get file details error:', error);
    throw new Error('Failed to get file details from ImageKit');
  }
}

/**
 * Generate authentication parameters for client-side upload
 */
export function getAuthenticationParameters() {
  return imagekit.getAuthenticationParameters();
}

export default imagekit;
