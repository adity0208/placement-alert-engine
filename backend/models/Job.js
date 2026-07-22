import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['job', 'hackathon'],
    default: 'job',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: null
  },
  companyName: {
    type: String,
    default: null
  },
  jobRole: {
    type: String,
    default: null
  },
  deadline: {
    type: String,
    default: null
  },
  applyLink: {
    type: String,
    default: null
  },
  eligibility: {
    type: String,
    default: null
  },
  experience: {
    type: String,
    default: null
  },
  targetBatch: {
    type: String,
    default: null
  },
  organizer: {
    type: String,
    default: null
  },
  prizePool: {
    type: String,
    default: null
  },
  sourceName: {
    type: String,
    default: null
  },
  isAIParsed: {
    type: Boolean,
    default: false
  },
  telegramMessageId: {
    type: Number,
    required: true
  },
  groupId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: null
  }
});

// Compound unique index to prevent duplicate messages from same group
jobSchema.index({ telegramMessageId: 1, groupId: 1 }, { unique: true });

// TTL index - for both jobs and hackathons (automatically expire in 3 days)
jobSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $ne: null } }
  }
);

// Index for fast applyLink lookups (for cross-group duplicate check)
jobSchema.index({ applyLink: 1 }, { sparse: true });

// Index for sorting by creation date (descending)
jobSchema.index({ createdAt: -1 });

// Index for type-based queries
jobSchema.index({ type: 1, createdAt: -1 });

// Pre-save hook to set expiresAt to 3 days (72 hours) for both jobs and hackathons
jobSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
  }
  next();
});

// Virtual for time remaining
jobSchema.virtual('timeRemaining').get(function () {
  if (!this.expiresAt) return null;
  return Math.max(0, this.expiresAt - Date.now());
});

// Include virtuals in JSON output
jobSchema.set('toJSON', { virtuals: true });

const Job = mongoose.model('Job', jobSchema);

export default Job;
