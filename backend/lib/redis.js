import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on('connect', () => logger.success('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error:', err.message));
    redisClient.on('close', () => logger.warn('Redis connection closed'));
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // Ignore error if socket was already closed
    }
    redisClient = null;
    logger.info('Redis client closed');
  }
}

export default getRedisClient;
