'use strict';
const mongoose = require('mongoose');

// Only the SHA-256 hash of the token is stored. The raw token exists only in the reset link.
const passwordResetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestIp: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB removes expired documents automatically (TTL index).
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
