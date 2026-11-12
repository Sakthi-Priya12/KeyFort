'use strict';
const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  await mongoose.connect(config.MONGODB_URI, {
    dbName: config.DB_NAME,
    serverSelectionTimeoutMS: 8000,
  });
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };
