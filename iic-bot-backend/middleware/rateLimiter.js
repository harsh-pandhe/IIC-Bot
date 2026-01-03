// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Chat endpoint rate limiter
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Login rate limiter (stricter)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 login attempts per 15 minutes
    message: {
        error: 'Too many login attempts, please try again later',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
});

// Learning rate limiter (admin only, but still limit)
const learnLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 learn commands per hour
    message: {
        error: 'Too many learning requests, please try again later'
    },
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 minutes
    message: {
        error: 'Rate limit exceeded'
    },
});

module.exports = {
    chatLimiter,
    loginLimiter,
    learnLimiter,
    apiLimiter
};
