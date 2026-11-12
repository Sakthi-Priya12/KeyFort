'use strict';
// Verifies the MongoDB configuration. Exit code 0 = OK, 1 = problem (with a helpful message).
const config = require('../config/env');
const mongoose = require('mongoose');

const isAtlas = config.MONGODB_URI.startsWith('mongodb+srv://') || config.MONGODB_URI.includes('mongodb.net');
const safeUri = config.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

(async () => {
  console.log(`Checking database: ${safeUri}`);
  try {
    await mongoose.connect(config.MONGODB_URI, { dbName: config.DB_NAME, serverSelectionTimeoutMS: 7000 });
    await mongoose.connection.db.admin().ping();
    console.log(`Database OK (database name: ${config.DB_NAME}).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    const m = String(err.message || err);
    console.error('\n[X] Could not connect to MongoDB.');
    console.error(`    Reason: ${m.split('\n')[0]}\n`);
    if (isAtlas) {
      console.error('    You are using MongoDB Atlas. Check:');
      console.error('      - The username/password in the connection string (special characters must be URL-encoded).');
      console.error('      - Atlas > Network Access: add your current IP address (or 0.0.0.0/0 for testing).');
      console.error('      - Your internet connection.');
    } else {
      console.error('    You are using a LOCAL MongoDB. Check:');
      console.error('      - MongoDB Community Server is installed: https://www.mongodb.com/try/download/community');
      console.error('      - The service is running. Open "Command Prompt as Administrator" and run:  net start MongoDB');
      console.error('        (or open Services > MongoDB Server > Start).');
      console.error('      - No MongoDB installed? Use free MongoDB Atlas instead: delete backend\\.env and run START-KEYFORT.bat again, choose option 2.');
    }
    process.exit(1);
  }
})();
