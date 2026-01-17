/**
 * ImageKit Server-Side Integration
 * 
 * Provides secure server-side file upload, URL generation, and management
 * for teacher photos, documents, and school assets.
 * 
 * Features:
 * - Server-side authentication for secure uploads
 * - Client-side upload authentication tokens
 * - File transformation and optimization
 * - Folder organization by school/entity
 * - Secure URL generation with expiry
 */

import ImageKit from 'imagekit'

// Validate required environment variables
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
  console.warn(
    'ImageKit environment variables not configured. File uploads will not work.',
    'Required: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT'
  )
}

// Initialize ImageKit instance
const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY || '',
  privateKey: IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: IMAGEKIT_URL_ENDPOINT || '',
})

/**
 * File upload options
 */
export interface UploadOptions {
  /** File content as Buffer, base64 string, or URL */
  file: Buffer | string
  /** File name */
  fileName: string
  /** Folder path in ImageKit */
  folder?: string
  /** Custom tags for organization */
  tags?: string[]
  /** Whether to use unique filename */
  useUniqueFileName?: boolean
  /** Custom metadata */
  customMetadata?: Record<string, string | number | boolean>
  /** Transformation to apply on upload */
  transformation?: {
    pre?: string
    post?: Array<{ type: string; value: string }>
  }
}

/**
 * Upload result from ImageKit
 */
export interface UploadResult {
  fileId: string
  name: string
  url: string
  thumbnailUrl: string
  size: number
  filePath: string
  fileType: string
  height?: number
  width?: number
}

/**
 * Authentication parameters for client-side uploads
 */
export interface AuthParams {
  token: string
  expire: number
  signature: string
}

/**
 * Folder structure for organizing files
 */
export const IMAGEKIT_FOLDERS = {
  TEACHER_PHOTOS: (schoolId: string) => `/schools/${schoolId}/teachers/photos`,
  TEACHER_DOCUMENTS: (schoolId: string) => `/schools/${schoolId}/teachers/documents`,
  STUDENT_PHOTOS: (schoolId: string) => `/schools/${schoolId}/students/photos`,
  SCHOOL_ASSETS: (schoolId: string) => `/schools/${schoolId}/assets`,
  SCHOOL_LOGO: (schoolId: string) => `/schools/${schoolId}/logo`,
  REPORTS: (schoolId: string) => `/schools/${schoolId}/reports`,
} as const

/**
 * Image transformation presets
 */
export const IMAGE_TRANSFORMATIONS = {
  THUMBNAIL: [{ height: '100', width: '100', focus: 'face' }] as Record<string, string>[],
  PROFILE: [{ height: '200', width: '200', focus: 'face' }] as Record<string, string>[],
  PROFILE_LARGE: [{ height: '400', width: '400', focus: 'face' }] as Record<string, string>[],
  DOCUMENT_PREVIEW: [{ height: '800', width: '600' }] as Record<string, string>[],
  OPTIMIZED: [{ quality: '80', format: 'webp' }] as Record<string, string>[],
}

/**
 * ImageKit Service Class
 */
class ImageKitService {
  /**
   * Check if ImageKit is properly configured
   */
  isConfigured(): boolean {
    return !!(IMAGEKIT_PUBLIC_KEY && IMAGEKIT_PRIVATE_KEY && IMAGEKIT_URL_ENDPOINT)
  }

  /**
   * Generate authentication parameters for client-side uploads
   * These parameters should be passed to the client for secure uploads
   */
  getAuthenticationParameters(): AuthParams {
    if (!this.isConfigured()) {
      throw new Error('ImageKit is not configured')
    }
    return imagekit.getAuthenticationParameters()
  }

  /**
   * Upload a file to ImageKit (server-side)
   * Note: customMetadata is not used as it requires pre-configuration in ImageKit dashboard
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error('ImageKit is not configured. Please check NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT environment variables.')
    }

    try {
      const response = await imagekit.upload({
        file: options.file,
        fileName: options.fileName,
        folder: options.folder,
        tags: options.tags,
        useUniqueFileName: options.useUniqueFileName ?? true,
        // Note: customMetadata removed - requires pre-configuration in ImageKit dashboard
      })

      return {
        fileId: response.fileId,
        name: response.name,
        url: response.url,
        thumbnailUrl: response.thumbnailUrl,
        size: response.size,
        filePath: response.filePath,
        fileType: response.fileType,
        height: response.height,
        width: response.width,
      }
    } catch (error: unknown) {
      // Log the full error object for debugging
      console.error('ImageKit upload error - Full details:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
      })
      
      // Handle different error types from ImageKit SDK
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // ImageKit SDK may return error objects with message property
        const errorObj = error as { message?: string; help?: string; reason?: string }
        errorMessage = errorObj.message || errorObj.reason || errorObj.help || JSON.stringify(error)
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      throw new Error(`Failed to upload file: ${errorMessage}`)
    }
  }

  /**
   * Upload a teacher photo
   */
  async uploadTeacherPhoto(
    schoolId: string,
    teacherId: string,
    file: Buffer | string,
    fileName: string
  ): Promise<UploadResult> {
    return this.upload({
      file,
      fileName: `${teacherId}_${fileName}`,
      folder: IMAGEKIT_FOLDERS.TEACHER_PHOTOS(schoolId),
      tags: ['teacher', 'photo', schoolId, teacherId],
    })
  }

  /**
   * Upload a student photo
   */
  async uploadStudentPhoto(
    schoolId: string,
    studentId: string,
    file: Buffer | string,
    fileName: string
  ): Promise<UploadResult> {
    return this.upload({
      file,
      fileName: `${studentId}_${fileName}`,
      folder: IMAGEKIT_FOLDERS.STUDENT_PHOTOS(schoolId),
      tags: ['student', 'photo', schoolId, studentId],
    })
  }

  /**
   * Upload a teacher document
   */
  async uploadTeacherDocument(
    schoolId: string,
    teacherId: string,
    file: Buffer | string,
    fileName: string,
    documentType: string
  ): Promise<UploadResult> {
    return this.upload({
      file,
      fileName: `${teacherId}_${documentType}_${fileName}`,
      folder: IMAGEKIT_FOLDERS.TEACHER_DOCUMENTS(schoolId),
      tags: ['teacher', 'document', documentType, schoolId, teacherId],
    })
  }

  /**
   * Upload a school logo
   */
  async uploadSchoolLogo(
    schoolId: string,
    file: Buffer | string,
    fileName: string
  ): Promise<UploadResult> {
    return this.upload({
      file,
      fileName: `logo_${fileName}`,
      folder: IMAGEKIT_FOLDERS.SCHOOL_LOGO(schoolId),
      tags: ['school', 'logo', schoolId],
      useUniqueFileName: false, // Keep consistent name for logo
    })
  }

  /**
   * Upload a school asset (general files)
   */
  async uploadSchoolAsset(
    schoolId: string,
    file: Buffer | string,
    fileName: string,
    assetType?: string
  ): Promise<UploadResult> {
    return this.upload({
      file,
      fileName,
      folder: IMAGEKIT_FOLDERS.SCHOOL_ASSETS(schoolId),
      tags: ['school', 'asset', schoolId, assetType || 'general'],
    })
  }

  /**
   * Generate a URL with transformations
   */
  getUrl(
    filePath: string,
    transformations?: Array<Record<string, string>>
  ): string {
    if (!this.isConfigured()) {
      return filePath // Return original path if not configured
    }

    return imagekit.url({
      path: filePath,
      transformation: transformations,
    })
  }

  /**
   * Generate a thumbnail URL for an image
   */
  getThumbnailUrl(filePath: string): string {
    return this.getUrl(filePath, IMAGE_TRANSFORMATIONS.THUMBNAIL)
  }

  /**
   * Generate a profile photo URL
   */
  getProfileUrl(filePath: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const transformations = {
      small: IMAGE_TRANSFORMATIONS.THUMBNAIL,
      medium: IMAGE_TRANSFORMATIONS.PROFILE,
      large: IMAGE_TRANSFORMATIONS.PROFILE_LARGE,
    }
    return this.getUrl(filePath, transformations[size])
  }

  /**
   * Generate an optimized URL for web display
   */
  getOptimizedUrl(filePath: string): string {
    return this.getUrl(filePath, IMAGE_TRANSFORMATIONS.OPTIMIZED)
  }

  /**
   * Generate a signed URL with expiry (for private files)
   */
  getSignedUrl(
    filePath: string,
    expirySeconds: number = 3600,
    transformations?: Array<Record<string, string>>
  ): string {
    if (!this.isConfigured()) {
      return filePath
    }

    return imagekit.url({
      path: filePath,
      transformation: transformations,
      signed: true,
      expireSeconds: expirySeconds,
    })
  }

  /**
   * Delete a file from ImageKit
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('ImageKit is not configured')
    }

    try {
      await imagekit.deleteFile(fileId)
    } catch (error) {
      console.error('ImageKit delete error:', error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file details
   */
  async getFileDetails(fileId: string) {
    if (!this.isConfigured()) {
      throw new Error('ImageKit is not configured')
    }

    try {
      return await imagekit.getFileDetails(fileId)
    } catch (error) {
      console.error('ImageKit get details error:', error)
      throw new Error(`Failed to get file details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(options: {
    path?: string
    skip?: number
    limit?: number
    searchQuery?: string
    tags?: string[]
  }) {
    if (!this.isConfigured()) {
      throw new Error('ImageKit is not configured')
    }

    try {
      return await imagekit.listFiles({
        path: options.path,
        skip: options.skip,
        limit: options.limit,
        searchQuery: options.searchQuery,
        tags: options.tags?.join(','),
      })
    } catch (error) {
      console.error('ImageKit list files error:', error)
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(fileIds: string[]): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('ImageKit is not configured')
    }

    try {
      await imagekit.bulkDeleteFiles(fileIds)
    } catch (error) {
      console.error('ImageKit bulk delete error:', error)
      throw new Error(`Failed to bulk delete files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const imagekitService = new ImageKitService()

// Export for direct access if needed
export { imagekit }

// Export URL endpoint for client-side usage
export const IMAGEKIT_URL_ENDPOINT_PUBLIC = IMAGEKIT_URL_ENDPOINT
export const IMAGEKIT_PUBLIC_KEY_VALUE = IMAGEKIT_PUBLIC_KEY
