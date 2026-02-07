const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // npm install bcryptjs

const SALT_ROUNDS = 12; // 2025–2026 recommendation: 12–14 is good balance

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,                    // creates unique index
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,                   // never included in queries by default
      minlength: [8, 'Password must be at least 8 characters'],
    },

    role: {
      type: String,
      enum: ['freelancer', 'customer'],
      default: 'customer',
      required: true,
    },

    // ────────────────────────────────────────────────
    // Profile fields (mostly optional)
    // ────────────────────────────────────────────────
    bio: { type: String, default: '', maxlength: 1600 },
    skills: [{ type: String, trim: true }],
    location: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    whatsappNumber: { type: String, default: '', trim: true },
    website: {
      type: String,
      default: '',
      match: [/^https?:\/\//, 'Website must start with http:// or https://'],
    },
    avatar: { type: String, default: '' },

    // Stats & trust signals
    rating: { type: Number, default: 0, min: 0, max: 5 },
    earned: { type: Number, default: 0, min: 0 },
    completedProjects: { type: Number, default: 0, min: 0 },
    successRate: { type: String, default: '0%' }, // consider changing to Number later
    responseTime: { type: String, default: 'Within 24 hours' },

    hourlyRate: { type: String, default: '' }, // consider Number + currency

    // Location details (optional – can be JSON later if needed)
    country: { type: String, default: 'Nepal', trim: true },
    currency: { type: String, default: 'NPR', trim: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    zipCode: { type: String, default: '', trim: true },

    // Portfolio & reviews (embedded – good for now, consider separate collection later)
    portfolio: [
      {
        title: String,
        category: String,
        url: { type: String, match: [/^https?:\/\//, 'Invalid URL'] },
      },
    ],

    reviews: [
      {
        client: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        date: { type: Date, default: Date.now },
      },
    ],

    // ────────────────────────────────────────────────
    // Security & favorites
    // ────────────────────────────────────────────────
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],

    // Future-proof security fields (add when implementing)
    // isEmailVerified: { type: Boolean, default: false },
    // emailVerificationToken: String,
    // emailVerificationExpires: Date,
    // passwordResetToken: String,
    // passwordResetExpires: Date,
    // lastLogin: Date,
    // failedLoginAttempts: { type: Number, default: 0 },
    // accountLockedUntil: Date,
  },
  {
    timestamps: true,                    // adds createdAt & updatedAt automatically
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;         // never return hash in JSON
        delete ret.__v;                  // remove mongoose version key
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ────────────────────────────────────────────────
// Important: Hash password before save (only when modified)
// ────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────────────
// Compare password method
// ────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);