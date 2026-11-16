/**
 * db.js
 * Centralized MongoDB Connection Module using Mongoose.
 * 
 * Manages connection pooling, lifecycle event listeners, graceful process shutdowns,
 * and isolated test database connections.
 */

const mongoose = require('mongoose');

const connectDB = async (customUri = null) => {
  const uri = customUri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'it_ticket_db';

  const options = {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} at ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed successfully.');
  } catch (error) {
    console.error(`[MongoDB] Error closing connection: ${error.message}`);
  }
};

// Mongoose Connection Event Listeners
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Event] Mongoose connected to DB cluster.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB Event] Connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Event] Mongoose disconnected from DB.');
});

// Process termination hooks
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB
};
