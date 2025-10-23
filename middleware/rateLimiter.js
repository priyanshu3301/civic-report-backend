//(prevent abuse)
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * General API rate limiter
 * Applied to all routes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Strict rate limiter for auth routes
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * OTP request rate limiter
 * Prevents OTP spam
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use email if present, otherwise use ipKeyGenerator for safe IPv6 handling
    return req.body.email || ipKeyGenerator(req);
  },
});


/**
 * Password reset rate limiter
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Strict limiter for OTP verification attempts
 * Prevents brute force OTP guessing
 */
export const otpVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP verification attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful verifications
});

/**
 * Custom rate limiter that stores attempts in memory
 * For tracking per-user OTP attempts beyond IP-based limiting
 */
const otpAttemptStore = new Map();

export const checkOTPAttempts = async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }

  const now = Date.now();
  const userAttempts = otpAttemptStore.get(email) || { count: 0, resetAt: now + 60 * 60 * 1000 };

  // Reset counter if time window passed
  if (now > userAttempts.resetAt) {
    userAttempts.count = 0;
    userAttempts.resetAt = now + 60 * 60 * 1000; // 1 hour from now
  }

  // Check if user exceeded limit
  if (userAttempts.count >= 3) {
    const minutesLeft = Math.ceil((userAttempts.resetAt - now) / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many OTP requests for this email. Please try again in ${minutesLeft} minutes`,
    });
  }

  // Increment counter
  userAttempts.count += 1;
  otpAttemptStore.set(email, userAttempts);

  next();
};

/**
 * Clean up old entries from OTP attempt store (run periodically)
 */
setInterval(() => {
  const now = Date.now();
  for (const [email, attempts] of otpAttemptStore.entries()) {
    if (now > attempts.resetAt) {
      otpAttemptStore.delete(email);
    }
  }
}, 10 * 60 * 1000); // Clean up every 10 minutes