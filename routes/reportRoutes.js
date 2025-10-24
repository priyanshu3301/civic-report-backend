import express from 'express';
import {
  createReport,
  getMyReports,
  getReportById,
  getNearbyReports,
  upvoteReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import {
  uploadReportMedia,
  validateFileSizes,
  requireAtLeastOneFile,
  handleMulterError,
} from '../middleware/uploadMiddleware.js';
import { validateCreateReport } from '../utils/reportValidation.js';

const router = express.Router();

/**
 * @route   POST /api/reports/create
 * @desc    Create new report with media uploads
 * @access  Private
 */
router.post('/create',
  protect,
  uploadReportMedia,
  handleMulterError,
  validateFileSizes,
  requireAtLeastOneFile,
  validateCreateReport,
  createReport
);

/**
 * @route   GET /api/reports/my-reports
 * @desc    Get user's own reports with pagination and filters
 * @access  Private
 * @query   ?page=1&limit=20&status=reported&category=sanitation&sortBy=createdAt&order=desc
 */
router.get('/my-reports', protect, getMyReports);

/**
 * @route   GET /api/reports/nearby
 * @desc    Get reports near a location (geospatial query)
 * @access  Private
 * @query   ?lat=28.6139&lng=77.2090&radius=5000&limit=100&status=reported&category=sanitation
 */
router.get('/nearby', protect, getNearbyReports);

/**
 * @route   GET /api/reports/:reportId
 * @desc    Get specific report by ID
 * @access  Private
 */
router.get('/:reportId', getReportById);

/**
 * @route   PATCH /api/reports/:reportId/upvote
 * @desc    Upvote or un-upvote a report (toggle)
 * @access  Private
 */
router.patch('/:reportId/upvote', protect, upvoteReport);

export default router;