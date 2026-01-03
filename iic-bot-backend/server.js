// server.js - IIC Compliance Bot Backend v3.0.0
require('dotenv').config();

// Global error handlers MUST be set up before any async operations
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message, error.stack);
    process.exit(1);
});

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
const { ChatGroq } = require('@langchain/groq');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const { Document } = require("@langchain/core/documents");

// Import configurations
const validateEnvironment = require('./config/env-validator');
const connectDB = require('./config/database');
const { connectRedis, cache } = require('./config/redis');
const logger = require('./config/logger');

// Import models
const User = require('./models/User');
const ChatHistory = require('./models/ChatHistory');
const Analytics = require('./models/Analytics');
const LearnedContent = require('./models/LearnedContent');

// Import middleware
const { auth, optionalAuth, adminOnly } = require('./middleware/auth');
const { chatLimiter, loginLimiter, learnLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { loginValidation, chatValidation, ratingValidation } = require('./middleware/validator');
const { notFound, errorHandler, asyncHandler } = require('./middleware/errorHandler');

// Validate environment variables
validateEnvironment();

const app = express();
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// CORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check whitelist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow vercel.app domains only if FRONTEND_URL is vercel
        if (origin.endsWith('.vercel.app') && process.env.FRONTEND_URL?.includes('vercel.app')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

connectDB().catch(err => {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
});
connectRedis();

// ═══════════════════════════════════════════════════════════════════════════════
// AI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

let pinecone, pineconeIndex, embeddings, model;

try {
    console.log('[STARTUP] Initializing Pinecone...');
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
    console.log('[STARTUP] ✅ Pinecone initialized');

    console.log('[STARTUP] Initializing embeddings...');
    embeddings = new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HUGGINGFACEHUB_API_TOKEN,
        model: "BAAI/bge-base-en-v1.5"
    });
    console.log('[STARTUP] ✅ Embeddings initialized');

    console.log('[STARTUP] Initializing Groq model...');
    model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        maxTokens: 500,
    });
    console.log('[STARTUP] ✅ Groq model initialized');

    logger.info('✅ AI models initialized successfully');
    console.log('[STARTUP] About to set up routes...');
} catch (error) {
    logger.error('❌ AI model initialization failed:', error.message);
    console.error('[STARTUP] Detailed error:', error);
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

const COMPLIANCE_PROMPT = `You are the IIC Operations Enforcer. You are strict, concise, and direct.

CHAT HISTORY:
{chat_history}

CONTEXT FROM SOPs:
{context}

USER QUESTION: 
{question}

INSTRUCTIONS:
1. Use History: Reference the CHAT HISTORY to understand pronouns and follow-up questions.
2. Be Concise: Answer in fewer than 150 words. No essays.
3. Summarize: Do not copy-paste long paragraphs from SOPs. Summarize the key point.
4. Structure: Use bullet points for lists (max 5 items).
5. Directness: If asked "Who is responsible?", start with the Role Name immediately.
6. Unknown: If not in context, say "I don't have information about this in the SOPs."

YOUR RESPONSE:`;

const promptTemplate = PromptTemplate.fromTemplate(COMPLIANCE_PROMPT);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function extractSources(results) {
    const sources = [...new Set(results.map(r => {
        const meta = r.metadata || {};
        return meta.source || meta.fileName || meta.pdf || meta.file || null;
    }).filter(Boolean))];
    return sources;
}

function generateFollowUps(question, context) {
    const followUpTemplates = [
        "What are the penalties for non-compliance?",
        "Who is responsible for this task?",
        "What is the documentation process?",
        "What is the timeline for this?",
        "Are there any exceptions to this rule?",
    ];

    const keywords = question.toLowerCase();
    const relevantFollowUps = [];

    if (keywords.includes("president") || keywords.includes("head")) {
        relevantFollowUps.push("What are their key responsibilities?");
    }
    if (keywords.includes("event") || keywords.includes("planning")) {
        relevantFollowUps.push("What is the event approval process?");
    }
    if (keywords.includes("penalty") || keywords.includes("violation")) {
        relevantFollowUps.push("How can penalties be appealed?");
    }

    const shuffled = followUpTemplates.sort(() => 0.5 - Math.random());
    return [...relevantFollowUps, ...shuffled].slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
    });
});

/**
 * User registration (admin only in production)
 */
app.post('/register', apiLimiter, asyncHandler(async (req, res) => {
    const { username, password, email, name, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    // Create user
    const user = new User({
        username,
        password,
        email,
        name,
        role: role || 'Club Member',
        permissions: role === 'Administrator'
            ? ['analytics', 'all-sops', 'teach-bot', 'manage-users']
            : ['member-sops']
    });

    await user.save();

    logger.info(`New user registered: ${username}`);

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: user.toJSON()
    });
}));

/**
 * User login with JWT
 */
app.post('/login', loginLimiter, loginValidation, asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    logger.info(`Login successful: ${username} (${user.role})`);

    res.json({
        success: true,
        token,
        user: user.toJSON()
    });
}));

/**
 * Standard chat endpoint with caching
 */
app.post('/chat', chatLimiter, optionalAuth, chatValidation, asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { question, history, sessionId } = req.body;
    const userId = req.userId;
    const userRole = req.userRole || 'guest';

    // ═══════════════════════════════════════════════════════════════
    // CHECK CACHE FIRST
    // ═══════════════════════════════════════════════════════════════
    const cacheKey = `chat:${question.toLowerCase().trim()}`;
    const cachedResponse = await cache.get(cacheKey);

    if (cachedResponse) {
        logger.info(`Cache hit for question: "${question.substring(0, 50)}..."`);
        return res.json({
            ...cachedResponse,
            cached: true,
            responseTime: Date.now() - startTime
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // LEARNING COMMAND
    // ═══════════════════════════════════════════════════════════════
    if (question.startsWith("/learn ")) {
        if (!req.user || req.user.role !== 'Administrator') {
            return res.status(403).json({ error: 'Only administrators can teach the bot' });
        }

        const newFact = question.replace("/learn ", "").trim();
        if (!newFact) {
            return res.status(400).json({ error: "Please provide information to learn" });
        }

        const doc = new Document({
            pageContent: newFact,
            metadata: {
                source: "User_taught_memory.txt",
                timestamp: new Date().toISOString(),
                taughtBy: req.user._id.toString()
            }
        });

        const result = await PineconeStore.fromDocuments([doc], embeddings, {
            pineconeIndex,
            maxConcurrency: 5,
        });

        // Store in MongoDB for tracking
        await LearnedContent.create({
            content: newFact,
            vectorId: `learned_${Date.now()}`,
            taughtBy: req.user._id,
            taughtByName: req.user.name
        });

        logger.info(`New fact learned by ${req.user.name}: "${newFact.substring(0, 50)}..."`);

        return res.json({
            answer: "✅ **Memory Updated!** I have stored this information in my knowledge base.",
            sources: ["User Input"],
            followUps: ["What did you just learn?", "Can you explain that to me?"],
            responseTime: Date.now() - startTime
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UNLEARN COMMAND (NEW!)
    // ═══════════════════════════════════════════════════════════════
    if (question.startsWith("/unlearn ")) {
        if (!req.user || req.user.role !== 'Administrator') {
            return res.status(403).json({ error: 'Only administrators can unlearn content' });
        }

        const searchTerm = question.replace("/unlearn ", "").trim();

        // Find matching learned content
        const learned = await LearnedContent.find({
            content: { $regex: searchTerm, $options: 'i' },
            isActive: true
        }).limit(10);

        if (learned.length === 0) {
            return res.json({
                answer: "❌ No matching learned content found.",
                suggestions: "Try a different search term or use /list-learned to see all learned content."
            });
        }

        // Mark as inactive
        await LearnedContent.updateMany(
            { _id: { $in: learned.map(l => l._id) } },
            { isActive: false }
        );

        // TODO: Ideally delete from Pinecone as well (requires storing vector IDs)

        logger.info(`Content unlearned by ${req.user.name}: ${learned.length} items`);

        return res.json({
            answer: `✅ Successfully removed ${learned.length} learned item(s).`,
            removed: learned.map(l => l.content.substring(0, 100)),
            responseTime: Date.now() - startTime
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // NORMAL CHAT
    // ═══════════════════════════════════════════════════════════════
    logger.info(`Question from ${userRole}: "${question.substring(0, 50)}..."`);

    // Query vector store
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
    const results = await vectorStore.similaritySearch(question, 4);

    const context = results.map(r => r.pageContent).join('\n\n');
    const sources = extractSources(results);
    const chatHistory = history || "No previous conversation.";

    // Generate response
    const chain = RunnableSequence.from([promptTemplate, model, new StringOutputParser()]);
    const answer = await chain.invoke({ context, question, chat_history: chatHistory });

    const followUps = generateFollowUps(question, context);
    const responseTime = Date.now() - startTime;

    // Store analytics
    const analyticsDoc = await Analytics.create({
        questionId: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        question,
        userId,
        userRole,
        sources,
        responseTime
    });

    // Store chat history if user is logged in
    if (userId && sessionId) {
        await ChatHistory.findOneAndUpdate(
            { userId, sessionId },
            {
                $push: {
                    messages: [
                        { role: 'user', content: question },
                        { role: 'bot', content: answer, sources }
                    ]
                }
            },
            { upsert: true, new: true }
        );
    }

    const response = {
        answer,
        sources,
        followUps,
        responseTime,
        questionId: analyticsDoc.questionId
    };

    // Cache the response (1 hour)
    await cache.set(cacheKey, response, 3600);

    logger.info(`Response generated in ${responseTime}ms`);
    res.json(response);
}));

/**
 * Streaming chat endpoint (SSE)
 */
app.post('/chat/stream', chatLimiter, optionalAuth, chatValidation, asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { question, history, sessionId } = req.body;
    const userId = req.userId;
    const userRole = req.userRole || 'guest';

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
        // Handle /learn command
        if (question.startsWith("/learn ")) {
            if (!req.user || req.user.role !== 'Administrator') {
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Admin access required' })}\n\n`);
                return res.end();
            }

            const newFact = question.replace("/learn ", "").trim();
            const doc = new Document({
                pageContent: newFact,
                metadata: {
                    source: "User_taught_memory.txt",
                    timestamp: new Date().toISOString(),
                    taughtBy: req.user._id.toString()
                }
            });

            await PineconeStore.fromDocuments([doc], embeddings, {
                pineconeIndex,
                maxConcurrency: 5
            });

            await LearnedContent.create({
                content: newFact,
                vectorId: `learned_${Date.now()}`,
                taughtBy: req.user._id,
                taughtByName: req.user.name
            });

            res.write(`data: ${JSON.stringify({ type: 'content', content: '✅ **Memory Updated!**' })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'done', responseTime: Date.now() - startTime })}\n\n`);
            return res.end();
        }

        // Normal streaming
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
        const results = await vectorStore.similaritySearch(question, 4);

        const context = results.map(r => r.pageContent).join('\n\n');
        const sources = extractSources(results);
        const chatHistory = history || "No previous conversation.";

        res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

        const chain = RunnableSequence.from([promptTemplate, model, new StringOutputParser()]);
        const stream = await chain.stream({ context, question, chat_history: chatHistory });

        let fullContent = '';
        for await (const chunk of stream) {
            fullContent += chunk;
            res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
        }

        const followUps = generateFollowUps(question, context);
        res.write(`data: ${JSON.stringify({ type: 'followUps', followUps })}\n\n`);

        const responseTime = Date.now() - startTime;
        res.write(`data: ${JSON.stringify({ type: 'done', responseTime })}\n\n`);

        // Store analytics
        await Analytics.create({
            questionId: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            question,
            userId,
            userRole,
            sources,
            responseTime
        });

        logger.info(`Stream completed in ${responseTime}ms`);

    } catch (error) {
        logger.error('Stream error:', error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing request' })}\n\n`);
    }

    res.end();
}));

/**
 * Submit rating
 */
app.post('/rate', apiLimiter, ratingValidation, asyncHandler(async (req, res) => {
    const { questionId, rating, feedback } = req.body;

    await Analytics.findOneAndUpdate(
        { questionId },
        { rating, feedback },
        { new: true }
    );

    logger.info(`Rating received: ${rating}/5 for question ${questionId}`);
    res.json({ success: true });
}));

/**
 * Get analytics dashboard data
 */
app.get('/analytics', auth, adminOnly, asyncHandler(async (req, res) => {
    const [
        totalQuestions,
        ratingsData,
        topQuestionsData,
        roleStats,
        sourceStats,
        recentQuestions
    ] = await Promise.all([
        Analytics.countDocuments(),
        Analytics.aggregate([
            { $match: { rating: { $exists: true } } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]),
        Analytics.aggregate([
            { $group: { _id: '$question', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),
        Analytics.aggregate([
            { $group: { _id: '$userRole', count: { $sum: 1 } } }
        ]),
        Analytics.aggregate([
            { $unwind: '$sources' },
            { $group: { _id: '$sources', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),
        Analytics.find().sort({ timestamp: -1 }).limit(20)
    ]);

    const avgRating = ratingsData[0]?.avgRating?.toFixed(1) || 'N/A';
    const totalRatings = ratingsData[0]?.count || 0;

    const avgResponseTime = await Analytics.aggregate([
        { $group: { _id: null, avg: { $avg: '$responseTime' } } }
    ]);

    res.json({
        totalQuestions,
        totalRatings,
        averageRating: avgRating,
        avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0),
        topQuestions: topQuestionsData.map(q => ({ question: q._id, count: q.count })),
        topSources: sourceStats.map(s => ({ source: s._id, count: s.count })),
        byRole: Object.fromEntries(roleStats.map(r => [r._id, r.count])),
        recentQuestions
    });
}));

/**
 * Get learned content list (admin only)
 */
app.get('/learned', auth, adminOnly, asyncHandler(async (req, res) => {
    const learned = await LearnedContent.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('taughtBy', 'name username');

    res.json({
        count: learned.length,
        items: learned
    });
}));

/**
 * Get chat history (with optional sessionId)
 */
app.get('/history', auth, asyncHandler(async (req, res) => {
    const { sessionId } = req.query;

    const query = { userId: req.userId };
    if (sessionId) {
        query.sessionId = sessionId;
    }

    const history = await ChatHistory.find(query)
        .sort({ updatedAt: -1 })
        .limit(50);

    res.json({ history });
}));

/**
 * Clear cache (admin only)
 */
app.post('/cache/clear', auth, adminOnly, asyncHandler(async (req, res) => {
    await cache.flush();
    logger.info(`Cache cleared by ${req.user.name}`);
    res.json({ success: true, message: 'Cache cleared successfully' });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

app.use(notFound);
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Wait for database connection
        await new Promise(resolve => setTimeout(resolve, 1500));

        logger.info('🚀 Starting server...');

        const server = app.listen(PORT, () => {
            logger.info(`
╔══════════════════════════════════════════════════════════════╗
║           🛡️  IIC Compliance Bot Server v3.0.0  🛡️            ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    Running ✅                                       ║
║  Port:      ${PORT}                                              ║
║  Mode:      ${process.env.NODE_ENV || 'development'}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Features:  ✅ JWT Auth  ✅ MongoDB  ✅ Redis  ✅ Rate Limit  ║
╠══════════════════════════════════════════════════════════════╣
║  Ready to accept requests!                                   ║
╚══════════════════════════════════════════════════════════════╝
        `);
        });

        // Error handling for server
        server.on('error', (error) => {
            logger.error('Server error:', error.message);
            if (error.code === 'EADDRINUSE') {
                logger.error(`❌ Port ${PORT} is already in use`);
            }
            process.exit(1);
        });

    } catch (error) {
        logger.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start server after a short delay to ensure DB connection
logger.info('⏳ Waiting for database connection...');
setTimeout(startServer, 2500);

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('🛑 Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('🛑 Server interrupted...');
    process.exit(0);
});
