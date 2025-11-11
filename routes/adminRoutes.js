import express from 'express';
import {
  getAllReports,
  updateReportStatus,
  rejectReport,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getDashboardStats,
  getReportDetails,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  validateUpdateStatus,
  validateRejectReport,
  validateUpdateUserStatus,
  validateUpdateUserRole,
} from '../middleware/adminValidation.js';

const router = express.Router();

// Apply authentication and admin role restriction to all routes
router.use(protect);
router.use(restrictTo('admin'));

// ==================== DASHBOARD ====================

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard/stats', getDashboardStats);

// ==================== REPORTS MANAGEMENT ====================

/**
 * @route   GET /api/admin/reports
 * @desc    Get all reports with filters and pagination
 * @access  Private/Admin
 * @query   ?page=1&limit=20&status=reported&category=sanitation&severity=high&search=keyword&sortBy=createdAt&order=desc
 */
router.get('/reports', getAllReports);

/**
 * @route   GET /api/admin/reports/:reportId
 * @desc    Get report details with full history
 * @access  Private/Admin
 */
router.get('/reports/:reportId', getReportDetails);

/**
 * @route   PATCH /api/admin/reports/:reportId/status
 * @desc    Update report status
 * @access  Private/Admin
 * @body    { status: 'acknowledged', notes: 'We are looking into this' }
 */
router.patch('/reports/:reportId/status', validateUpdateStatus, updateReportStatus);

/**
 * @route   PATCH /api/admin/reports/:reportId/reject
 * @desc    Reject report with reason
 * @access  Private/Admin
 * @body    { reason: 'This report does not meet our guidelines' }
 */
router.patch('/reports/:reportId/reject', validateRejectReport, rejectReport);

// ==================== USER MANAGEMENT ====================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters and pagination
 * @access  Private/Admin
 * @query   ?page=1&limit=20&role=user&isActive=true&isVerified=true&search=keyword&sortBy=createdAt&order=desc
 */
router.get('/users', getAllUsers);

/**
 * @route   PATCH /api/admin/users/:userId/status
 * @desc    Activate or deactivate user account
 * @access  Private/Admin
 * @body    { isActive: false }
 */
router.patch('/users/:userId/status', validateUpdateUserStatus, updateUserStatus);

/**
 * @route   PATCH /api/admin/users/:userId/role
 * @desc    Update user role (user/admin)
 * @access  Private/Admin
 * @body    { role: 'admin' }
 */
router.patch('/users/:userId/role', validateUpdateUserRole, updateUserRole);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user account
 * @access  Private/Admin
 */
router.delete('/users/:userId', deleteUser);

export default router;