'use strict';
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, index: true },
    success: { type: Boolean, required: true, index: true },
    reason: { type: String, default: 'OK', maxlength: 60 },
    isAdminLogin: { type: Boolean, default: false },
    ip: { type: String, default: '', index: true },
    userAgent: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

loginLogSchema.index({ createdAt: -1 });
loginLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
