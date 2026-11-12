'use strict';
const mongoose = require('mongoose');

function sessions() {
  return mongoose.connection.db.collection('sessions');
}

/** Delete all stored sessions of a user, optionally keeping one session id. Returns deleted count. */
async function revokeUserSessions(userId, exceptSid = null) {
  const filter = { 'session.userId': String(userId) };
  if (exceptSid) filter._id = { $ne: exceptSid };
  const res = await sessions().deleteMany(filter);
  return res.deletedCount || 0;
}

async function countUserSessions(userId) {
  return sessions().countDocuments({ 'session.userId': String(userId), expires: { $gt: new Date() } });
}

module.exports = { revokeUserSessions, countUserSessions };
