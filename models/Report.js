import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // --- Core Info ---
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['reported', 'acknowledged', 'in_progress', 'resolved'],
      default: 'reported',
    },

    // --- Relationships ---
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Allows guest submissions
    },
    department: {
      type: String,
      enum: [
        'sanitation',
        'public_works',
        'transportation',
        'parks_recreation',
        'water_sewer',
        'other',
      ],
      required: [true, 'Department is required'],
    },

    // --- Location & Media ---
    location: {
      name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true,
        maxlength: [200, 'Location name cannot exceed 200 characters'],
      },
      coordinates: {
        latitude: {
          type: Number,
          required: [true, 'Latitude is required'],
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90'],
        },
        longitude: {
          type: Number,
          required: [true, 'Longitude is required'],
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180'],
        },
      },
    },
    media: [
      {
        type: {
          type: String,
          enum: ['image', 'video'],
          required: true,
        },
        url: {
          type: String,
          required: [true, 'Media URL is required'],
        },
      },
    ],

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: [true, 'Severity is required'],
    },

    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date, // added this since you indexed it later
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },

    upvotes: {
      type: Number,
      default: 0,
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // --- Unique ID ---
    reportId: {
      type: String,
      //required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- Pre-save middleware to generate a 10-digit reportId ---
reportSchema.pre('save', async function (next) {
  if (this.isNew && !this.reportId) {
    let unique = false;
    let newId;
    while (!unique) {
      newId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const existing = await this.constructor.findOne({ reportId: newId });
      if (!existing) unique = true;
    }
    this.reportId = newId;
  }
  next();
});

// --- Indexes ---
reportSchema.index({ 'location.coordinates': '2dsphere' });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ user: 1 }); // fixed: was 'userId' (not defined)
reportSchema.index({ status: 1 });
reportSchema.index({ severity: 1 });
reportSchema.index({ approvedAt: 1 });
reportSchema.index({ rejectedAt: 1 });
reportSchema.index({ upvotes: -1 });

export default mongoose.model('Report', reportSchema);
