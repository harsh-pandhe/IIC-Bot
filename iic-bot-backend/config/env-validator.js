// config/env-validator.js
const logger = require('./logger');

const requiredEnvVars = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX',
    'HUGGINGFACEHUB_API_TOKEN',
    'GROQ_API_KEY',
    'JWT_SECRET',
    'MONGODB_URI'
];

const optionalEnvVars = [
    'REDIS_URL',
    'FRONTEND_URL',
    'PORT',
    'NODE_ENV'
];

function validateEnvironment() {
    const missing = [];
    const warnings = [];

    // Check required variables
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    // Check optional variables
    optionalEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            warnings.push(varName);
        }
    });

    if (missing.length > 0) {
        logger.error('❌ Missing required environment variables:');
        missing.forEach(v => logger.error(`   - ${v}`));
        logger.error('\nPlease check your .env file!');
        process.exit(1);
    }

    if (warnings.length > 0) {
        logger.warn('⚠️  Optional environment variables not set:');
        warnings.forEach(v => logger.warn(`   - ${v} (using defaults)`));
    }

    logger.info('✅ Environment variables validated');
}

module.exports = validateEnvironment;
