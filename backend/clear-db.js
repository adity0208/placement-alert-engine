import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Job from './models/Job.js';
import { logger } from './utils/logger.js';

dotenv.config();

async function clearDatabase() {
    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        logger.success('Connected to MongoDB');

        // Get counts before deletion
        const totalBefore = await Job.countDocuments();
        const jobsBefore = await Job.countDocuments({ type: 'job' });
        const noticesBefore = await Job.countDocuments({ type: 'notice' });

        logger.info(`Current data: ${totalBefore} total (${jobsBefore} jobs, ${noticesBefore} notices)`);

        // Delete all documents
        const result = await Job.deleteMany({});
        logger.success(`Deleted ${result.deletedCount} documents`);

        await mongoose.connection.close();
        logger.info('Database cleared successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error clearing database:', error.message);
        process.exit(1);
    }
}

clearDatabase();
