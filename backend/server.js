import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { initWebSocket, getClientCount } from './websocket.js';
import { startTelegramListener, stopTelegramListener } from './telegramListener.js';
import { logger } from './utils/logger.js';
import Job from './models/Job.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS headers for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Rate limiting for /jobs endpoint (10 requests per minute per IP)
const jobsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Health check endpoint (for Render keep-alive)
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Placement Alert System',
        timestamp: new Date().toISOString(),
        connectedClients: getClientCount()
    });
});

// Get all active jobs (with rate limiting)
app.get('/jobs', jobsLimiter, async (req, res) => {
    try {
        const now = new Date();
        const jobs = await Job.find({
            type: 'job',
            expiresAt: { $gt: now }
        }).sort({ createdAt: -1 });

        logger.info(`Jobs endpoint accessed (${jobs.length} active jobs)`);

        res.json({
            success: true,
            count: jobs.length,
            jobs: jobs
        });
    } catch (error) {
        logger.error('Error fetching jobs:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch jobs'
        });
    }
});

// Get last 7 notices
app.get('/notices', async (req, res) => {
    try {
        const notices = await Job.find({
            type: 'notice'
        }).sort({ createdAt: -1 }).limit(7);

        logger.info(`Notices endpoint accessed (${notices.length} notices)`);

        res.json({
            success: true,
            count: notices.length,
            notices: notices
        });
    } catch (error) {
        logger.error('Error fetching notices:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notices'
        });
    }
});

// Get job statistics
app.get('/stats', async (req, res) => {
    try {
        const now = new Date();
        const activeCount = await Job.countDocuments({ expiresAt: { $gt: now } });
        const totalCount = await Job.countDocuments();

        res.json({
            success: true,
            stats: {
                activeJobs: activeCount,
                totalJobs: totalCount,
                connectedClients: getClientCount()
            }
        });
    } catch (error) {
        logger.error('Error fetching stats:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
initWebSocket(server);

// Validate environment variables
function validateEnvironment() {
    const required = ['API_ID', 'API_HASH', 'SESSION_STRING', 'TELEGRAM_GROUP_ID', 'MONGODB_URI'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }

    // Validate TELEGRAM_GROUP_ID
    const groupId = Number(process.env.TELEGRAM_GROUP_ID);
    if (isNaN(groupId)) {
        logger.error(`Invalid TELEGRAM_GROUP_ID: ${process.env.TELEGRAM_GROUP_ID}. Must be a valid number.`);
        process.exit(1);
    }

    logger.success('Environment variables validated');
}

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.success('Connected to MongoDB');
    } catch (error) {
        logger.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
}

// Start all services
async function startServer() {
    try {
        // Validate environment
        validateEnvironment();

        // Connect to database
        await connectDB();

        // Start Telegram listener (don't await - let it retry in background)
        startTelegramListener().catch(error => {
            logger.error('Telegram listener failed to start:', error.message);
            logger.info('Telegram will retry connection in background...');
        });

        // Start HTTP server
        server.listen(PORT, () => {
            logger.success(`Server running on port ${PORT}`);
            logger.info(`Health check: http://localhost:${PORT}/`);
            logger.info(`Jobs endpoint: http://localhost:${PORT}/jobs`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
    logger.info(`${signal} received, shutting down gracefully...`);

    try {
        await stopTelegramListener();
        await mongoose.connection.close();

        server.close(() => {
            logger.success('Server closed');
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    } catch (error) {
        logger.error('Error during shutdown:', error.message);
        process.exit(1);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error.message);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
