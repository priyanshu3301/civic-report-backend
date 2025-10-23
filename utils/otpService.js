import bcrypt from 'bcryptjs';

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP as string
 */
export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};

/**
 * Hash OTP before storing in database
 * @param {string} otp - Plain text OTP
 * @returns {Promise<string>} - Hashed OTP
 */
export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

/**
 * Verify OTP against hashed version
 * @param {string} inputOTP - User provided OTP
 * @param {string} hashedOTP - Stored hashed OTP
 * @returns {Promise<boolean>} - True if match
 */
export const verifyOTP = async (inputOTP, hashedOTP) => {
  return await bcrypt.compare(inputOTP, hashedOTP);
};

/**
 * Check if OTP has expired
 * @param {Date} expiryDate - OTP expiry timestamp
 * @returns {boolean} - True if expired
 */
export const isOTPExpired = (expiryDate) => {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
};

/**
 * Get OTP expiry time (10 minutes from now)
 * @returns {Date} - Expiry timestamp
 */
export const getOTPExpiry = () => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};