import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';

dotenv.config();

async function testMongoDB() {
    try {
        logger.info('Testing MongoDB connection...');
        await mongoose.connect(process.env.MONGODB_URI);
        logger.success('MongoDB connected successfully!');

        // Keep alive for 5 seconds
        setTimeout(async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');
            process.exit(0);
        }, 5000);

    } catch (error) {
        logger.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

testMongoDB();
