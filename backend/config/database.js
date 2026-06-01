const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI || '';
    // Redact password in URI for logging
    const redactedUri = rawUri.replace(/:([^:@]+)@/, ':******@');
    console.log(`[Database] Attempting to connect to: ${redactedUri || '(not set)'}`);

    if (!rawUri) {
      throw new Error('MONGODB_URI environment variable is not defined!');
    }

    const conn = await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 5000, // Timeout connection attempts after 5 seconds instead of 30 seconds
      socketTimeoutMS: 45000,         // Keep sockets open for 45s of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    // Drop legacy unique index on applications for shared ownerId sync
    try {
      await mongoose.connection.collection('applications').dropIndex('ownerId_1');
      console.log('🗑️ Legacy unique index on applications.ownerId dropped');
    } catch (e) {
      // Index likely doesn't exist or was already dropped
    }

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    // Print a helpful troubleshooting hint for Railway/Atlas users
    console.error(
      '[Database Help] If this is a timeout, check that: \n' +
      '  1. Your MongoDB Atlas cluster is active and not paused.\n' +
      '  2. Your MongoDB Atlas Network Access has Whitelisted "0.0.0.0/0" (allow from anywhere), since Railway dynamic server IPs change regularly.\n' +
      '  3. Your MONGODB_URI environment variable in the Railway dashboard is set and correct.'
    );
    process.exit(1);
  }
};

module.exports = connectDB;
