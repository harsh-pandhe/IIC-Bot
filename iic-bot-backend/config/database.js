// config/database.js
const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iic-bot';

        await mongoose.connect(mongoURI);
    } catch (error) {
        logger.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
});

module.exports = connectDB;
