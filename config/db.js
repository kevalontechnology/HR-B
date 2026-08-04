require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kevalon_crm';
  try {
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log(`[MongoDB Atlas] Connected successfully to host: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[MongoDB] Atlas connection warning (${err.message}). Activating built-in MongoDB engine fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log(`[MongoDB Memory Engine] Connected successfully: ${uri}`);
    } catch (memErr) {
      console.error(`[MongoDB Error] ${memErr.message}`);
    }
  }
};

module.exports = connectDB;
