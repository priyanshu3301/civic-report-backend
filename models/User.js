import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() { return !this.googleId; },
    minlength: [8, 'Password must be at least 8 characters long']
  },
  googleId: {
    type: String,
    default: undefined, // Changed from null to undefined for sparse unique index
    unique: true,
    sparse: true
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  isVerified: {
    type: Boolean,
    default: false
  },

// OTP fields (replace verificationToken fields)
verificationOTP: {
  type: String,
  default: null
},
verificationOTPExpires: {
  type: Date,
  default: null
},
otpAttempts: {
  type: Number,
  default: 0
},
otpLockedUntil: {
  type: Date,
  default: null
},
otpRequestCount: {
  type: Number,
  default: 0
},
otpRequestResetAt: {
  type: Date,
  default: null
},

// Password reset fields
  passwordResetOTP: {
    type: String,
    default: null
  },
  passwordResetOTPExpires: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hasSeenTour: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);