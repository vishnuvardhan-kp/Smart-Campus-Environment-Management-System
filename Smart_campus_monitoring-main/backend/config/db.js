const mongoose = require('mongoose');

const connectDB = async () => {
    const primaryUri = process.env.MONGO_URI;
    const localUri = 'mongodb://127.0.0.1:27017/smart_campus';

    if (primaryUri) {
        try {
            console.log('[Database] Connecting to primary MongoDB...');
            const conn = await mongoose.connect(primaryUri, {
                serverSelectionTimeoutMS: 2500,
                connectTimeoutMS: 2500
            });
            console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            console.warn(`[Database] Primary MongoDB connection failed (${error.message}). Falling back to local MongoDB...`);
        }
    }

    try {
        const localConn = await mongoose.connect(localUri, {
            serverSelectionTimeoutMS: 2500,
            connectTimeoutMS: 2500
        });
        console.log(`[Database] Connected successfully to local MongoDB: ${localConn.connection.host}`);
        return localConn;
    } catch (fallbackError) {
        console.error(`[Database] Local MongoDB Connection Error: ${fallbackError.message}`);
    }
};

module.exports = connectDB;

