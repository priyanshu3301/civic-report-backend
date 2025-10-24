import express from 'express';
import {
  register,
  VerifyOTP,
  resendOTP,
  login,
  getMe,
  logout,
  VerifyOTPByURL,
} from '../controllers/authController.js';
import {
  validateRegister,
  validateLogin,
  validateOTP,
  validateEmail,
  sanitizeInput,
} from '../middleware/validation.js';
import {
  authLimiter,
  otpLimiter,
  otpVerificationLimiter,
  checkOTPAttempts,
} from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user and send OTP
 * @access  Public
 */
router.post('/register',
  sanitizeInput,
  validateRegister,
  authLimiter,
  checkOTPAttempts,
  register
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and activate account (auto-login)
 * @access  Public
 */
router.post('/verify-otp',
  sanitizeInput,
  validateOTP,
  otpVerificationLimiter,
  VerifyOTP
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and activate account (auto-login)
 * @access  Public
 */
router.get('/verify-otp/:id/:token',
  sanitizeInput,
  VerifyOTPByURL
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to email
 * @access  Public
 */
router.post('/resend-otp',
  sanitizeInput,
  validateEmail,
  otpLimiter,
  checkOTPAttempts,
  resendOTP
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  sanitizeInput,
  validateLogin,
  authLimiter,
  login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user profile
 * @access  Private (requires valid access token)
 */
router.get('/me', protect, getMe);


/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Private
 */
router.get('/logout', logout);

export default router;