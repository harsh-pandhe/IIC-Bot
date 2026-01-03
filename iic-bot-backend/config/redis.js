// config/redis.js
const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const connectRedis = () => {
    try {
        // Try to connect to Redis if available
        const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';

        redisClient = new Redis(redisURL, {
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('⚠️ Redis unavailable - caching disabled');
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 3000);
            },
            maxRetriesPerRequest: 3,
        });

        redisClient.on('connect', () => {
            logger.info('✅ Redis Connected - Smart caching enabled');
        });

        redisClient.on('error', (err) => {
            logger.warn('⚠️ Redis error - falling back to no caching:', err.message);
        });

        return redisClient;
    } catch (error) {
        logger.warn('⚠️ Redis connection failed - continuing without cache');
        return null;
    }
};

// Cache helper functions
const cache = {
    async get(key) {
        if (!redisClient) return null;
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Cache get error:', error.message);
            return null;
        }
    },

    async set(key, value, expirySeconds = 3600) {
        if (!redisClient) return;
        try {
            await redisClient.setex(key, expirySeconds, JSON.stringify(value));
        } catch (error) {
            logger.error('Cache set error:', error.message);
        }
    },

    async del(key) {
        if (!redisClient) return;
        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error('Cache delete error:', error.message);
        }
    },

    async flush() {
        if (!redisClient) return;
        try {
            await redisClient.flushall();
            logger.info('Cache flushed successfully');
        } catch (error) {
            logger.error('Cache flush error:', error.message);
        }
    }
};

module.exports = { connectRedis, cache, redisClient };
