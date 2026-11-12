'use strict';
const mongoose = require('mongoose');

const TYPES = [
  'REGISTER', 'ACCOUNT_LOCKED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED', 'PASSWORD_RESET_FAILED', 'ACCOUNT_DEACTIVATED',
  'ACCOUNT_ACTIVATED', 'ACCOUNT_UNLOCKED', 'ADMIN_LOGIN', 'UNAUTHORIZED_ACCESS',
  'RATE_LIMIT_HIT', 'SESSIONS_REVOKED', 'PROFILE_UPDATED', 'LOGOUT',
];

const securityLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TYPES, required: true, index: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 300 },
    details: { type: String, default: '', maxlength: 300 },
    reviewed: { type: Boolean, default: false, index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

securityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
module.exports.TYPES = TYPES;
