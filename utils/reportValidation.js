/**
 * Validate report creation data
 * @param {Object} data - Request body data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export const validateReportData = (data) => {
  const errors = [];

  // Title validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required');
  } else {
    if (data.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }
    if (data.title.trim().length > 100) {
      errors.push('Title cannot exceed 100 characters');
    }
  }

  // Description validation (REQUIRED)
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else {
    if (data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    if (data.description.trim().length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }
  }

  // Category validation
  const validCategories = ['sanitation', 'public_works', 'transportation', 'parks_recreation', 'water_sewer', 'other'];
  if (!data.category) {
    errors.push('Category is required');
  } else if (!validCategories.includes(data.category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  // Severity validation
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!data.severity) {
    errors.push('Severity is required');
  } else if (!validSeverities.includes(data.severity)) {
    errors.push(`Severity must be one of: ${validSeverities.join(', ')}`);
  }

  // Location validation
  if (!data.location) {
    errors.push('Location is required');
  } else {
    // Parse location if it's a string (from multipart/form-data)
    let location = data.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        errors.push('Location must be valid JSON');
        return { valid: false, errors };
      }
    }

    // Validate coordinates
    if (!location.coordinates || !Array.isArray(location.coordinates)) {
      errors.push('Location coordinates are required');
    } else {
      if (location.coordinates.length !== 2) {
        errors.push('Coordinates must be [longitude, latitude]');
      } else {
        const [lng, lat] = location.coordinates;
        if (typeof lng !== 'number' || typeof lat !== 'number') {
          errors.push('Coordinates must be numbers');
        } else {
          if (lng < -180 || lng > 180) {
            errors.push('Longitude must be between -180 and 180');
          }
          if (lat < -90 || lat > 90) {
            errors.push('Latitude must be between -90 and 90');
          }
        }
      }
    }

    // Validate location name
    if (!location.name || typeof location.name !== 'string') {
      errors.push('Location name is required');
    } else {
      if (location.name.trim().length < 3) {
        errors.push('Location name must be at least 3 characters');
      }
      if (location.name.trim().length > 200) {
        errors.push('Location name cannot exceed 200 characters');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Middleware to validate report creation request
 */
export const validateCreateReport = (req, res, next) => {
  const validation = validateReportData(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  // Parse location if string
  if (typeof req.body.location === 'string') {
    try {
      req.body.location = JSON.parse(req.body.location);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location format',
      });
    }
  }

  next();
};

/**
 * Validate query parameters for nearby reports
 * @param {Object} query - Request query params
 * @returns {Object} - { valid: boolean, errors: Array, data: Object }
 */
export const validateNearbyQuery = (query) => {
  const errors = [];
  const data = {};

  // Latitude validation
  if (!query.lat) {
    errors.push('Latitude (lat) is required');
  } else {
    const lat = parseFloat(query.lat);
    if (isNaN(lat)) {
      errors.push('Latitude must be a number');
    } else if (lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    } else {
      data.lat = lat;
    }
  }

  // Longitude validation
  if (!query.lng) {
    errors.push('Longitude (lng) is required');
  } else {
    const lng = parseFloat(query.lng);
    if (isNaN(lng)) {
      errors.push('Longitude must be a number');
    } else if (lng < -180 || lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    } else {
      data.lng = lng;
    }
  }

  // Radius validation (optional, default 5000m)
  if (query.radius) {
    const radius = parseInt(query.radius);
    if (isNaN(radius)) {
      errors.push('Radius must be a number');
    } else if (radius < 100 || radius > 50000) {
      errors.push('Radius must be between 100 and 50000 meters');
    } else {
      data.radius = radius;
    }
  } else {
    data.radius = 5000; // Default 5km
  }

  // Max results (optional, default 100)
  if (query.limit) {
    const limit = parseInt(query.limit);
    if (isNaN(limit)) {
      errors.push('Limit must be a number');
    } else if (limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      data.limit = limit;
    }
  } else {
    data.limit = 100;
  }

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
};