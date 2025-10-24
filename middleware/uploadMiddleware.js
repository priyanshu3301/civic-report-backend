import multer from 'multer';
import path from 'path';

// File size limits (in bytes)
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = parseInt(process.env.MAX_VIDEO_SIZE) || 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_SIZE = parseInt(process.env.MAX_AUDIO_SIZE) || 10 * 1024 * 1024; // 10MB

// File count limits
const MAX_IMAGES_COUNT = parseInt(process.env.MAX_IMAGES_COUNT) || 5;
const MAX_VIDEOS_COUNT = parseInt(process.env.MAX_VIDEOS_COUNT) || 1;
const MAX_AUDIO_COUNT = parseInt(process.env.MAX_AUDIO_COUNT) || 1;

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']; // mp4, mov, avi
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a']; // mp3, wav, m4a

/**
 * File filter for multer
 */
const fileFilter = (req, file, cb) => {
  const fieldName = file.fieldname;
  
  // Check file type based on field name
  if (fieldName === 'images') {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`), false);
    }
  } else if (fieldName === 'videos') {
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`), false);
    }
  } else if (fieldName === 'audio') {
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid audio type. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`), false);
    }
  } else {
    return cb(new Error('Unknown field name'), false);
  }
  
  cb(null, true);
};

/**
 * Configure multer storage (memory storage for streaming to Cloudinary)
 */
const storage = multer.memoryStorage();

/**
 * Multer instance with configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Max file size (will validate per-field later)
    files: MAX_IMAGES_COUNT + MAX_VIDEOS_COUNT + MAX_AUDIO_COUNT, // Total files
  },
});

/**
 * Middleware to handle multiple file fields
 */
export const uploadReportMedia = upload.fields([
  { name: 'images', maxCount: MAX_IMAGES_COUNT },
  { name: 'videos', maxCount: MAX_VIDEOS_COUNT },
  { name: 'audio', maxCount: MAX_AUDIO_COUNT },
]);

/**
 * Middleware to validate file sizes per type
 */
export const validateFileSizes = (req, res, next) => {
  try {
    const errors = [];

    // Validate images
    if (req.files?.images) {
      req.files.images.forEach((file, index) => {
        if (file.size > MAX_IMAGE_SIZE) {
          errors.push(`Image ${index + 1} exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
        }
      });
    }

    // Validate videos
    if (req.files?.videos) {
      req.files.videos.forEach((file, index) => {
        if (file.size > MAX_VIDEO_SIZE) {
          errors.push(`Video ${index + 1} exceeds ${MAX_VIDEO_SIZE / 1024 / 1024}MB limit`);
        }
      });
    }

    // Validate audio
    if (req.files?.audio) {
      req.files.audio.forEach((file, index) => {
        if (file.size > MAX_AUDIO_SIZE) {
          errors.push(`Audio ${index + 1} exceeds ${MAX_AUDIO_SIZE / 1024 / 1024}MB limit`);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File size validation failed',
        errors,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating file sizes',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if at least one file is uploaded
 */
export const requireAtLeastOneFile = (req, res, next) => {
  const hasFiles = req.files && (
    (req.files.images && req.files.images.length > 0) ||
    (req.files.videos && req.files.videos.length > 0) ||
    (req.files.audio && req.files.audio.length > 0)
  );

  if (!hasFiles) {
    return res.status(400).json({
      success: false,
      message: 'At least one media file (image, video, or audio) is required',
    });
  }

  next();
};

/**
 * Error handler for multer errors
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        error: err.message,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded',
        error: err.message,
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        error: err.message,
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message,
    });
  }
  
  // Custom file filter errors
  if (err.message.includes('Invalid')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  next(err);
};