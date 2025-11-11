/**
 * Admin-specific validation middleware
 */

/**
 * Validate update status request
 */
export const validateUpdateStatus = (req, res, next) => {
  const { status, notes } = req.body;
  const errors = [];

  // Status validation
  const validStatuses = [
    'reported',
    'acknowledged',
    'in_progress',
    'resolved',
    'closed',
    'rejected',
  ];

  if (!status) {
    errors.push('Status is required');
  } else if (!validStatuses.includes(status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Notes validation (optional)
  if (notes !== undefined) {
    if (typeof notes !== 'string') {
      errors.push('Notes must be a string');
    } else if (notes.trim().length > 500) {
      errors.push('Notes cannot exceed 500 characters');
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
 * Validate reject report request
 */
export const validateRejectReport = (req, res, next) => {
  const { reason } = req.body;
  const errors = [];

  // Reason validation
  if (!reason) {
    errors.push('Rejection reason is required');
  } else if (typeof reason !== 'string') {
    errors.push('Rejection reason must be a string');
  } else {
    if (reason.trim().length < 10) {
      errors.push('Rejection reason must be at least 10 characters');
    }
    if (reason.trim().length > 500) {
      errors.push('Rejection reason cannot exceed 500 characters');
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
 * Validate update user status request
 */
export const validateUpdateUserStatus = (req, res, next) => {
  const { isActive } = req.body;
  const errors = [];

  // isActive validation
  if (isActive === undefined) {
    errors.push('isActive is required');
  } else if (typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean value (true or false)');
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
 * Validate update user role request
 */
export const validateUpdateUserRole = (req, res, next) => {
  const { role } = req.body;
  const errors = [];

  // Role validation
  const validRoles = ['user', 'admin'];

  if (!role) {
    errors.push('Role is required');
  } else if (!validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
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
 * Sanitize admin input
 */
export const sanitizeAdminInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        // Trim whitespace
        req.body[key] = req.body[key].trim();
        
        // Basic XSS prevention for text fields
        if (['notes', 'reason'].includes(key)) {
          req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
      }
    });
  }
  next();
};