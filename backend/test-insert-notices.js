import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Job from './models/Job.js';
import { logger } from './utils/logger.js';

dotenv.config();

const testNotices = [
    "Dear Student, Newgen Software Results are flashed on the CR Wall. Please Check.",
    "Beingzero shortlisted students kindly report M31 lab for online test.",
    "This is a reminder for Codevita Season 13 Interview, It is mandatory for all the students whose interview is schedule tomorrow( 11th Feb 2026 ) to appear for the same without fail.",
    "Dear students, AIHI Fusion Technologies meeting will start at 10:30am. Please make sure you join the meeting at least 5 minutes prior.",
    "Dear Students, Kindly apply on the above for Moglix placement drive",
    "Important: Campus recruitment drive scheduled for next week. All eligible students must register.",
    "Reminder: Submit your internship reports by Friday 5 PM without fail."
];

async function insertTestNotices() {
    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        logger.success('Connected to MongoDB');

        logger.info('Inserting test notices...');

        for (let i = 0; i < testNotices.length; i++) {
            const notice = new Job({
                type: 'notice',
                title: testNotices[i].substring(0, 100) + (testNotices[i].length > 100 ? '...' : ''),
                message: testNotices[i],
                link: null,
                telegramMessageId: 9000 + i,
                groupId: 1002258271899,
                expiresAt: null
            });

            try {
                await notice.save();
                logger.success(`Notice ${i + 1}/7 inserted`);
            } catch (error) {
                if (error.code === 11000) {
                    logger.warn(`Notice ${i + 1} already exists, skipping...`);
                } else {
                    throw error;
                }
            }
        }

        logger.success(`\\n✅ Test notices inserted successfully!`);
        logger.info('You can now check http://localhost:5173 to see notices in the frontend');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('Error inserting test notices:', error.message);
        process.exit(1);
    }
}

insertTestNotices();
