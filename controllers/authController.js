import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateOTP, hashOTP, verifyOTP, isOTPExpired, getOTPExpiry } from '../utils/otpService.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenService.js';
import { sendOTPEmail, sendWelcomeEmail } from '../utils/emailService.js';

/**
 * @desc    Register new user and send OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // If user exists but not verified, allow resending OTP
      if (!existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered but not verified. Please verify your email or request a new OTP.',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      verificationOTP: hashedOTP,
      verificationOTPExpires: getOTPExpiry(),
      otpRequestCount: 1,
      otpRequestResetAt: new Date(Date.now() + 60 * 60 * 1000), // Reset after 1 hour
      isVerified: false,
      provider: 'local',
    });

    // Send OTP email
    try {
      await sendOTPEmail(email, name, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Delete user if email fails (optional - you can choose to keep user)
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for OTP verification.',
      data: {
        userId: user._id,
        email: user.email,
        otpExpiresIn: process.env.OTP_EXPIRY_MINUTES || 10, // in minutes
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Verify OTP and activate account (auto-login)
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const VerifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified. Please login.',
      });
    }

    // Check if account is locked due to too many failed attempts
    if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
      const minutesLeft = Math.ceil((user.otpLockedUntil - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    // Check if OTP exists
    if (!user.verificationOTP) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new OTP.',
      });
    }

    // Check if OTP expired
    if (isOTPExpired(user.verificationOTPExpires)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
        code: 'OTP_EXPIRED',
      });
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, user.verificationOTP);

    if (!isValid) {
      // Increment failed attempts
      user.otpAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.otpAttempts >= 5) {
        user.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        user.otpAttempts = 0; // Reset counter
        await user.save();

        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Account locked for 15 minutes.',
        });
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`,
      });
    }

    // OTP is valid - Verify account
    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.otpAttempts = 0;
    user.otpLockedUntil = null;

    // Generate tokens (auto-login)
    const accessToken = generateAccessToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in database
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    });

    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified. Please login.',
      });
    }

    // Check OTP request limit (3 per hour)
    const now = new Date();
    if (user.otpRequestResetAt && now < user.otpRequestResetAt) {
      if (user.otpRequestCount >= 3) {
        const minutesLeft = Math.ceil((user.otpRequestResetAt - now) / 60000);
        return res.status(429).json({
          success: false,
          message: `Too many OTP requests. Please try again in ${minutesLeft} minutes.`,
        });
      }
    } else {
      // Reset counter after 1 hour
      user.otpRequestCount = 0;
      user.otpRequestResetAt = new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);

    // Update user
    user.verificationOTP = hashedOTP;
    user.verificationOTPExpires = getOTPExpiry();
    user.otpAttempts = 0; // Reset failed attempts
    user.otpLockedUntil = null; // Unlock account
    user.otpRequestCount += 1;

    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, user.name, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email.',
      data: {
        email: user.email,
        otpExpiresIn: process.env.OTP_EXPIRY_MINUTES || 10,
      },
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in database
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    });

    // Clean up expired refresh tokens
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => new Date(rt.expiresAt) > new Date()
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // User is already attached by protect middleware
    const user = await User.findById(req.user._id).select('-password -refreshTokens');

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile',
    });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (but requires valid refresh token)
 */
export const refreshAccessToken = async (req, res) => {
  try {
    // User and refreshToken are attached by verifyRefreshToken middleware
    const user = req.user;
    const oldRefreshToken = req.refreshToken;

    // Generate new access token
    const accessToken = generateAccessToken(user._id, user.email, user.role);

    // Optionally rotate refresh token (more secure)
    const newRefreshToken = generateRefreshToken(user._id);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== oldRefreshToken);
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: refreshTokenExpiry,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing token',
    });
  }
};

/**
 * @desc    Logout user (revoke refresh token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      // Remove specific refresh token
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    } else {
      // Remove all refresh tokens (logout from all devices)
      user.refreshTokens = [];
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};