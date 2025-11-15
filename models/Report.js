import mongoose from 'mongoose';


// --- Constants for reuse ---
const STATUS_ENUM = ["reported", "acknowledged", "in_progress", "resolved", "closed", "rejected"];
const CATEGORY_ENUM = [
  'sanitation',
  'public_works',
  'transportation',
  'parks_recreation',
  'water_sewer',
  'other',
];
const MEDIA_TYPE_ENUM = ['image', 'video', 'audio'];
const SEVERITY_ENUM = ['low', 'medium', 'high', 'critical'];

// Add this before reportSchema
const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: MEDIA_TYPE_ENUM,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnail: { // <-- THE FIX FOR THE THUMBNAIL BUG
    type: String,
  },
}, {
  id: false, // <-- OPTIONAL: This removes the virtual 'id' field
  _id: true  // This ensures the subdocument still gets a unique _id
});


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
      enum: STATUS_ENUM,
      default: 'reported',
    },

    // --- Relationships ---
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Allows guest submissions
    },
    category: {
      type: String,
      enum: CATEGORY_ENUM,
      required: [true, 'Category is required'],
    },

    // --- Location & Media ---
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
      name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true,
        maxlength: [200, 'Location name cannot exceed 200 characters'],
      },
    },
    media: [
      mediaSchema,
    ],
    severity: {
      type: String,
      enum: SEVERITY_ENUM,
      required: [true, 'Severity is required'],
    },

    // --- History ---
    history: [
      {
        status: {
          type: String,
          enum: STATUS_ENUM,
          required: true,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: [500, 'History notes cannot exceed 500 characters'],
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // --- Rejection Reason ---
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      validate: {
        validator: function (v) {
          if (v && this.status !== 'rejected') return false;
          return true;
        },
        message: 'Rejection reason can only be set if status is "rejected"',
      },
    },

    // --- Interactions ---
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes for performance ---
reportSchema.index({ status: 1, category: 1 });
reportSchema.index({ severity: -1, createdAt: -1 });
reportSchema.index({ location: '2dsphere' });

// --- Virtuals ---
reportSchema.virtual('coordinateArray').get(function () {
  return this.location?.coordinates || [];
});

// --- Pre-save hook to track status changes and rejectionReason ---
reportSchema.pre('save', function (next) {
  const updatedBy = this._updatingUser || null;

  if (this.isNew) {
    // Initial history entry
    this.history.push({
      status: this.status,
      notes: 'Report created',
      updatedBy,
    });

    // If created as rejected (rare case), add rejection reason
    if (this.status === 'rejected' && this.rejectionReason) {
      this.history.push({
        status: 'rejected',
        notes: `Rejection reason: ${this.rejectionReason}`,
        updatedBy,
      });
    }
  } else {
    // Status change tracking
    if (this.isModified('status')) {
      // Add ONE entry for status change
      const notes = this.status === 'rejected' && this.rejectionReason
        ? `Rejected: ${this.rejectionReason}`  // Include reason in status change note
        : `Status changed to ${this.status}`;
      
      this.history.push({
        status: this.status,
        notes,
        updatedBy,
      });
    } 
    // REMOVED: Separate rejectionReason tracking to avoid duplicates
    // The rejection reason is now included in the status change note above
  }

  next();
});

// --- Method to set the user performing update ---
reportSchema.methods.setUpdatingUser = function (userId) {
  this._updatingUser = userId;
};

export default mongoose.model('Report', reportSchema);
