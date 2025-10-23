//(verify JWT, protect routes)
import { verifyToken } from '../utils/tokenService.js';
import User from '../models/User.js';

/**
 * Protect routes - Verify JWT access token
 * Attaches user to req.user if valid
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.',
      });
    }

    // Verify token
    const decoded = verifyToken(token, 'access');

    // Get user from database (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token invalid.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route.',
    });
  }
};

/**
 * Optional authentication - Attach user if token valid, but don't fail
 * Used for routes that work for both guests and authenticated users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token, 'access');
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && user.isVerified) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silently fail - continue as guest
    next();
  }
};

/**
 * Restrict to specific roles
 * Must be used AFTER protect middleware
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'user')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Verify refresh token
 * Used for token refresh endpoint
 */
export const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    // Verify token signature and type
    const decoded = verifyToken(refreshToken, 'refresh');

    // Get user and check if refresh token exists in database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }

    // Check if refresh token exists in user's token list
    const tokenExists = user.refreshTokens.some(
      (t) => t.token === refreshToken && new Date() < new Date(t.expiresAt)
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is invalid or has been revoked.',
      });
    }

    // Attach user to request
    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token.',
    });
  }
};