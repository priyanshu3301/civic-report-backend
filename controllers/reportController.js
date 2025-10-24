import Report from '../models/Report.js';
import { uploadReportMedia, deleteMultipleMedia } from '../utils/mediaService.js';
import { validateNearbyQuery } from '../utils/reportValidation.js';

/**
 * @desc    Create new report with media uploads
 * @route   POST /api/reports/create
 * @access  Private
 */
export const createReport = async (req, res) => {
  try {
    const { title, description, category, severity, location } = req.body;
    const userId = req.user._id;

    // Create report first to get ID
    const report = new Report({
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      location,
      user: userId,
      status: 'reported',
    });

    // Upload media files to Cloudinary
    let mediaResult;
    try {
      mediaResult = await uploadReportMedia(req.files, report._id.toString());
    } catch (uploadError) {
      console.error('Media upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload media files',
        error: uploadError.message,
      });
    }

    // Add media URLs to report
    report.media = mediaResult.mediaArray.map(media => ({
      type: media.type,
      url: media.url,
      thumbnail: media.thumbnail,
    }));

    // Set updating user for history tracking
    report.setUpdatingUser(userId);

    // Save report
    await report.save();

    // Populate user info
    await report.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: {
        report: {
          _id: report._id,
          title: report.title,
          description: report.description,
          category: report.category,
          severity: report.severity,
          status: report.status,
          location: report.location,
          media: report.media,
          upvotes: report.upvotes,
          user: report.user,
          createdAt: report.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get user's own reports
 * @route   GET /api/reports/my-reports
 * @access  Private
 */
export const getMyReports = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, status, category, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query
    const query = { user: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const reports = await Report.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-history') // Exclude history for list view
      .lean();

    // Get total count
    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get specific report by ID
 * @route   GET /api/reports/:reportId
 * @access  Private
 */
export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate('user', 'name email')
      .populate('history.updatedBy', 'name email role');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        report,
      },
    });
  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get nearby reports based on location
 * @route   GET /api/reports/nearby
 * @access  Private
 */
export const getNearbyReports = async (req, res) => {
  try {
    // Validate query parameters
    const validation = validateNearbyQuery(req.query);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validation.errors,
      });
    }

    const { lat, lng, radius, limit } = validation.data;
    const { status, category } = req.query;

    // Build query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radius,
        },
      },
    };

    // Add filters
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }

    // Execute geospatial query
    const reports = await Report.find(query)
      .limit(limit)
      .select('title category severity status location upvotes createdAt user')
      .populate('user', 'name')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        reports,
        query: {
          center: { lat, lng },
          radius,
          count: reports.length,
        },
      },
    });
  } catch (error) {
    console.error('Get nearby reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching nearby reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Calculate severity based on upvote count
 * @param {string} originalSeverity - Original severity level
 * @param {number} upvoteCount - Current upvote count
 * @returns {string} - Calculated severity
 */
const calculateSeverity = (originalSeverity, upvoteCount) => {
  if (upvoteCount >= 20) return 'critical';
  if (upvoteCount >= 10) return 'high';
  if (upvoteCount >= 5 && originalSeverity === 'low') return 'medium';
  return originalSeverity;
};

/**
 * @desc    Upvote/Un-upvote a report (toggle)
 * @route   PATCH /api/reports/:reportId/upvote
 * @access  Private
 */
export const upvoteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;

    // Find report
    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if user already upvoted
    const hasUpvoted = report.upvotedBy.some(id => id.toString() === userId.toString());

    if (hasUpvoted) {
      // Un-upvote: Remove user from upvotedBy array
      report.upvotedBy = report.upvotedBy.filter(id => id.toString() !== userId.toString());
      report.upvotes = Math.max(0, report.upvotes - 1);
    } else {
      // Upvote: Add user to upvotedBy array
      report.upvotedBy.push(userId);
      report.upvotes += 1;
    }

    // Store original severity to check if it changed
    const originalSeverity = report.severity;

    // Recalculate severity based on upvote count
    const newSeverity = calculateSeverity(originalSeverity, report.upvotes);
    
    if (newSeverity !== report.severity) {
      report.severity = newSeverity;
      
      // Add history entry for severity upgrade (DO NOT use setUpdatingUser here)
      report.history.push({
        status: report.status,
        notes: `Severity upgraded to ${newSeverity} due to ${report.upvotes} upvotes`,
        updatedBy: null, // System update, not a specific user
        timestamp: new Date(),
      });
    }

    // Save without triggering setUpdatingUser
    await report.save();

    res.status(200).json({
      success: true,
      message: hasUpvoted ? 'Upvote removed successfully' : 'Report upvoted successfully',
      data: {
        reportId: report._id,
        upvotes: report.upvotes,
        severity: report.severity,
        hasUpvoted: !hasUpvoted,
        severityUpgraded: newSeverity !== originalSeverity,
      },
    });
  } catch (error) {
    console.error('Upvote report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while upvoting report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}