//(input validation)
/**
 * Validation middleware using manual validation
 * For production, consider using express-validator or Joi
 */

/**
 * Validate registration input
 */
export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
      errors.push('Password cannot exceed 128 characters');
    }
    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one letter');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validate login input
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validate OTP input
 */
export const validateOTP = (req, res, next) => {
  const { email, otp } = req.body;
  const errors = [];

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // OTP validation
  if (!otp || typeof otp !== 'string') {
    errors.push('OTP is required');
  } else {
    // OTP must be exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {
      errors.push('OTP must be a 6-digit number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validate email input (for resend OTP)
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validate refresh token input
 */
export const validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;
  const errors = [];

  if (!refreshToken || typeof refreshToken !== 'string') {
    errors.push('Refresh token is required');
  } else if (refreshToken.trim().length === 0) {
    errors.push('Refresh token cannot be empty');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Sanitize input - Remove extra whitespace and potential XSS
 */
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        // Trim whitespace
        req.body[key] = req.body[key].trim();
        
        // Basic XSS prevention - remove script tags
        req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove HTML tags for certain fields
        if (['name', 'email'].includes(key)) {
          req.body[key] = req.body[key].replace(/<[^>]*>/g, '');
        }
      }
    });
  }
  next();
};