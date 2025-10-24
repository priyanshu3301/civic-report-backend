import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'civic-reports';

/**
 * Convert buffer to stream (for Cloudinary upload)
 */
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
};

/**
 * Upload image to Cloudinary with thumbnail generation
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Original filename
 * @param {string} reportId - Report ID for folder organization
 * @returns {Promise<Object>} - { url, thumbnailUrl, publicId }
 */
export const uploadImage = async (fileBuffer, fileName, reportId = 'temp') => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const uploadOptions = {
      folder: `${CLOUDINARY_FOLDER}/images`,
      public_id: `report-${reportId}-${timestamp}`,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ],
      eager: [
        { width: 200, height: 200, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
      ],
      eager_async: false, // Generate thumbnail synchronously
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary image upload error:', error);
          return reject(new Error('Failed to upload image'));
        }

        resolve({
          url: result.secure_url,
          thumbnailUrl: result.eager[0]?.secure_url || result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Upload video to Cloudinary with transcoding to MP4
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Original filename
 * @param {string} reportId - Report ID for folder organization
 * @returns {Promise<Object>} - { url, thumbnailUrl, publicId, duration }
 */
export const uploadVideo = async (fileBuffer, fileName, reportId = 'temp') => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const uploadOptions = {
      folder: `${CLOUDINARY_FOLDER}/videos`,
      public_id: `report-${reportId}-${timestamp}`,
      resource_type: 'video',
      format: 'mp4', // Force MP4 format
      transformation: [
        { quality: 'auto' }
      ],
      eager: [
        { 
          format: 'jpg',
          transformation: [
            { width: 400, crop: 'scale' }
          ]
        }
      ],
      eager_async: false, // Generate thumbnail synchronously
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary video upload error:', error);
          return reject(new Error('Failed to upload video'));
        }

        resolve({
          url: result.secure_url,
          thumbnailUrl: result.eager[0]?.secure_url || result.secure_url.replace(/\.[^.]+$/, '.jpg'),
          publicId: result.public_id,
          duration: result.duration,
          format: result.format,
        });
      }
    );

    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Upload audio to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Original filename
 * @param {string} reportId - Report ID for folder organization
 * @returns {Promise<Object>} - { url, publicId, duration }
 */
export const uploadAudio = async (fileBuffer, fileName, reportId = 'temp') => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const uploadOptions = {
      folder: `${CLOUDINARY_FOLDER}/audio`,
      public_id: `report-${reportId}-${timestamp}`,
      resource_type: 'video', // Cloudinary treats audio as video resource type
      format: 'mp3', // Convert to MP3
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary audio upload error:', error);
          return reject(new Error('Failed to upload audio'));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration,
          format: result.format,
        });
      }
    );

    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete media from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image/video)
 * @returns {Promise<boolean>} - Success status
 */
export const deleteMedia = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Delete multiple media files
 * @param {Array} mediaArray - Array of { publicId, type }
 * @returns {Promise<Object>} - { success, failed }
 */
export const deleteMultipleMedia = async (mediaArray) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const media of mediaArray) {
    const resourceType = media.type === 'audio' ? 'video' : media.type;
    const deleted = await deleteMedia(media.publicId, resourceType);
    
    if (deleted) {
      results.success.push(media.publicId);
    } else {
      results.failed.push(media.publicId);
    }
  }

  return results;
};

/**
 * Upload all report media files
 * @param {Object} files - Files from multer (req.files)
 * @param {string} reportId - Report ID for folder organization
 * @returns {Promise<Object>} - { mediaArray, uploadedPublicIds }
 */
export const uploadReportMedia = async (files, reportId = 'temp') => {
  const mediaArray = [];
  const uploadedPublicIds = [];
  
  try {
    // Upload images
    if (files.images && files.images.length > 0) {
      for (const file of files.images) {
        const result = await uploadImage(file.buffer, file.originalname, reportId);
        mediaArray.push({
          type: 'image',
          url: result.url,
          thumbnail: result.thumbnailUrl,
          publicId: result.publicId,
        });
        uploadedPublicIds.push({ publicId: result.publicId, type: 'image' });
      }
    }

    // Upload videos
    if (files.videos && files.videos.length > 0) {
      for (const file of files.videos) {
        const result = await uploadVideo(file.buffer, file.originalname, reportId);
        mediaArray.push({
          type: 'video',
          url: result.url,
          thumbnail: result.thumbnailUrl,
          publicId: result.publicId,
          duration: result.duration,
        });
        uploadedPublicIds.push({ publicId: result.publicId, type: 'video' });
      }
    }

    // Upload audio
    if (files.audio && files.audio.length > 0) {
      for (const file of files.audio) {
        const result = await uploadAudio(file.buffer, file.originalname, reportId);
        mediaArray.push({
          type: 'audio',
          url: result.url,
          publicId: result.publicId,
          duration: result.duration,
        });
        uploadedPublicIds.push({ publicId: result.publicId, type: 'audio' });
      }
    }

    return { mediaArray, uploadedPublicIds };
  } catch (error) {
    // Rollback: Delete all uploaded files
    if (uploadedPublicIds.length > 0) {
      console.log('Upload failed, rolling back...');
      await deleteMultipleMedia(uploadedPublicIds);
    }
    throw error;
  }
};