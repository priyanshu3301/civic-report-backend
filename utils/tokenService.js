import jwt from 'jsonwebtoken';

/**
 * Generate Access Token (long-lived)
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role (user/admin)
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (userId, email, role) => {
  const payload = {
    id: userId,
    email,
    role,
    type: 'access',
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};


/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @param {string} expectedType - Expected token type (access/refresh)
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token invalid or wrong type
 */
export const verifyToken = (token, expectedType = 'access') => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify token type matches expected
    if (decoded.type !== expectedType) {
      throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiry date or null
 */
export const getTokenExpiry = (token) => {
  const decoded = decodeToken(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
};