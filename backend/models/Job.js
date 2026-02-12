import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['job', 'notice'],
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
  telegramMessageId: {
    type: Number,
    required: true
  },
  groupId: {
    type: Number,
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

// TTL index - only for jobs (notices don't expire)
jobSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { type: 'job', expiresAt: { $ne: null } }
  }
);

// Index for sorting by creation date (descending)
jobSchema.index({ createdAt: -1 });

// Index for type-based queries
jobSchema.index({ type: 1, createdAt: -1 });

// Pre-save hook to set expiresAt for jobs only
jobSchema.pre('save', function (next) {
  if (this.type === 'job' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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
