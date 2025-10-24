import nodemailer from 'nodemailer';

/**
 * Create nodemailer transporter
 * @returns {Object} - Nodemailer transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Use Gmail service
    auth: {
      user: process.env.EMAIL_USER,      // your Gmail address
      pass: process.env.EMAIL_PASSWORD,  // app password (see below)
    },
  });
};

/**
 * Send email (with test mode support)
 * @param {Object} mailOptions - Email options
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (mailOptions) => {
  const isTestMode = process.env.EMAIL_TEST_MODE === 'true';

  if (isTestMode) {
    console.log('\n📧 ===== EMAIL TEST MODE =====');
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    console.log('Content:', mailOptions.text || 'HTML content (check html field)');
    console.log('============================\n');
    return { messageId: 'test-mode-' + Date.now() };
  }

  const transporter = createTransporter();
  return await transporter.sendMail(mailOptions);
};

/**
 * Send OTP verification email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} - Send result
 */
export const sendOTPEmail = async (email, name, otp) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Civic Report <noreply@civicreport.com>',
    to: email,
    subject: 'Verify Your Email - Civic Report System',
    text: `Hello ${name},\n\nYour OTP for email verification is: ${otp}\n\nThis OTP will expire in ${expiryMinutes} minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
            .otp { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏛️ Civic Report System</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${name}! 👋</h2>
              <p>Thank you for registering with Civic Report System. To complete your registration, please verify your email address using the OTP below:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code</p>
                <p class="otp">${otp}</p>
              </div>

              <div class="alternative-link">
                <p>If the OTP above does not work, please use the following link to verify your email:</p>
                <p><a href="${process.env.FRONTEND_URL}/api/auth/verify-otp/${encodeURIComponent(email)}/${otp}">Verify My Email</a></p>
              </div>

              <div class="warning">
                <strong>⏰ Important:</strong> This OTP will expire in ${expiryMinutes} minutes.
              </div>

              <p><strong>Security Tips:</strong></p>
              <ul>
                <li>Never share this OTP with anyone</li>
                <li>We will never ask for your OTP via phone or email</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>

              <p style="margin-top: 30px;">Best regards,<br><strong>Civic Report Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Civic Report System. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const result = await sendEmail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send welcome email after successful verification
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @returns {Promise<Object>} - Send result
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Civic Report <noreply@civicreport.com>',
    to: email,
    subject: '✅ Email Verified - Welcome to Civic Report!',
    text: `Hello ${name},\n\nYour email has been successfully verified! You can now start reporting civic issues and help improve our community.\n\nThank you for joining us!\n\nBest regards,\nCivic Report Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Verified Successfully!</h1>
            </div>
            <div class="content">
              <div class="success-icon">🎉</div>
              <h2>Welcome aboard, ${name}!</h2>
              <p>Your email has been successfully verified. You're now part of the Civic Report community!</p>
              
              <p><strong>What you can do now:</strong></p>
              <ul>
                <li>📸 Report civic issues with photos and location</li>
                <li>🗺️ View reported issues on an interactive map</li>
                <li>📊 Track the status of your reports</li>
                <li>🔔 Receive updates on issue resolutions</li>
              </ul>

              <center>
                <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
              </center>

              <p style="margin-top: 30px;">Thank you for being an engaged citizen!</p>
              <p>Best regards,<br><strong>Civic Report Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Civic Report System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const result = await sendEmail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Welcome email send failed:', error.message);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset OTP (for future use)
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} - Send result
 */
export const sendPasswordResetOTP = async (email, name, otp) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Civic Report <noreply@civicreport.com>',
    to: email,
    subject: 'Password Reset Request - Civic Report System',
    text: `Hello ${name},\n\nYou requested to reset your password. Your OTP is: ${otp}\n\nThis OTP will expire in ${expiryMinutes} minutes.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #ef4444; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
            .otp { font-size: 48px; font-weight: bold; color: #ef4444; letter-spacing: 8px; margin: 0; }
            .warning { background: #fee; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello, ${name}!</h2>
              <p>We received a request to reset your password. Use the OTP below to proceed:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Password Reset Code</p>
                <p class="otp">${otp}</p>
              </div>

              <div class="warning">
                <strong>⏰ Important:</strong> This OTP will expire in ${expiryMinutes} minutes.
              </div>

              <p><strong>Security Alert:</strong></p>
              <ul>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged</li>
                <li>Never share this OTP with anyone</li>
              </ul>

              <p style="margin-top: 30px;">Best regards,<br><strong>Civic Report Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Civic Report System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const result = await sendEmail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Password reset email send failed:', error.message);
    throw new Error('Failed to send password reset email');
  }
};