// server.js - IIC Compliance Bot Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
const { ChatGroq } = require('@langchain/groq');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const { Document } = require("@langchain/core/documents");

const app = express();
app.use(express.json());

// CORS configuration for production and development
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL // Add your Vercel URL here
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_TOKEN,
    model: "BAAI/bge-base-en-v1.5" // 768 dimensions
});

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    maxTokens: 500, // Reduced to enforce concise responses
});

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY DATA STORES
// ═══════════════════════════════════════════════════════════════════════════════

const users = {
    admin: { password: "admin123", role: "Administrator", name: "Admin", permissions: ["analytics", "all-sops", "teach-bot"] },
    user: { password: "user123", role: "Club Member", name: "IIC Member", permissions: ["member-sops"] },
};

const analytics = {
    questions: [],
    ratings: [],
    sessions: [],
};

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
1. Use History: Reference the CHAT HISTORY to understand pronouns ("he", "it", "they") and follow-up questions.
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

/**
 * Extract source filenames from Pinecone results
 */
function extractSources(results) {
    const sources = [...new Set(results.map(r => {
        const meta = r.metadata || {};
        return meta.source || meta.fileName || meta.pdf || meta.file || null;
    }).filter(Boolean))];

    console.log("📄 Extracted sources:", sources);
    return sources;
}

/**
 * Generate follow-up questions based on context
 */
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
    if (keywords.includes("duties") || keywords.includes("responsibilities")) {
        relevantFollowUps.push("What are the reporting requirements?");
    }

    // Add some general follow-ups
    const shuffled = followUpTemplates.sort(() => 0.5 - Math.random());
    return [...relevantFollowUps, ...shuffled].slice(0, 3);
}

/**
 * Log analytics data
 */
function logQuestion(question, userRole, sources, responseTime) {
    analytics.questions.push({
        id: Date.now().toString(),
        question,
        userRole: userRole || "guest",
        sources,
        timestamp: new Date().toISOString(),
        responseTime,
    });

    // Keep only last 1000 questions
    if (analytics.questions.length > 1000) {
        analytics.questions = analytics.questions.slice(-1000);
    }
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
        version: '2.0.0'
    });
});

/**
 * User authentication
 */
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password required" });
    }

    const user = users[username];
    if (user && user.password === password) {
        console.log(`✅ Login successful: ${username} (${user.role})`);
        return res.json({
            success: true,
            user: {
                username,
                role: user.role,
                name: user.name,
                permissions: user.permissions,
            }
        });
    }

    console.log(`❌ Login failed: ${username}`);
    res.status(401).json({ success: false, error: "Invalid credentials" });
});

/**
 * Standard chat endpoint (non-streaming)
 */
app.post('/chat', async (req, res) => {
    const startTime = Date.now();

    try {
        const { question, userRole, history } = req.body;

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ error: "Question is required" });
        }

        // ═══════════════════════════════════════════════════════════════
        // CHECK FOR LEARNING COMMAND
        // ═══════════════════════════════════════════════════════════════
        if (question.startsWith("/learn ")) {
            const newFact = question.replace("/learn ", "").trim();

            if (!newFact) {
                return res.status(400).json({ error: "Please provide information to learn after /learn" });
            }

            console.log(`🧠 Learning new fact: "${newFact}"`);

            try {
                // 1. Create a Document from the text
                const doc = new Document({
                    pageContent: newFact,
                    metadata: {
                        source: "User_taught_memory.txt",
                        timestamp: new Date().toISOString(),
                        userRole: userRole || "guest"
                    }
                });

                // 2. Upload to Pinecone immediately
                await PineconeStore.fromDocuments(
                    [doc],
                    embeddings,
                    {
                        pineconeIndex,
                        maxConcurrency: 5,
                    }
                );

                console.log(`✅ New fact stored in vector database`);

                return res.json({
                    answer: "✅ **Memory Updated!** I have processed and stored this new information in my knowledge base. You can now ask me about it.",
                    sources: ["User Input"],
                    followUps: [
                        "What did you just learn?",
                        "Can you explain that to me?",
                        "What else should you know?"
                    ],
                    responseTime: Date.now() - startTime
                });

            } catch (learnError) {
                console.error("❌ Learning error:", learnError.message);
                return res.status(500).json({
                    error: "Failed to store new information",
                    details: process.env.NODE_ENV === 'development' ? learnError.message : undefined
                });
            }
        }
        // ═══════════════════════════════════════════════════════════════

        console.log(`\n📨 Question: "${question.substring(0, 50)}..." | Role: ${userRole || "guest"}`);

        // Query vector store
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
        const results = await vectorStore.similaritySearch(question, 4);

        const context = results.map(r => r.pageContent).join('\n\n');
        const sources = extractSources(results);

        // Format chat history (keep last 6 messages for context)
        const chatHistory = history || "No previous conversation.";

        // Generate response with history
        const chain = RunnableSequence.from([promptTemplate, model, new StringOutputParser()]);
        const answer = await chain.invoke({ context, question, chat_history: chatHistory });

        // Generate follow-up questions
        const followUps = generateFollowUps(question, context);

        // Log analytics
        const responseTime = Date.now() - startTime;
        logQuestion(question, userRole, sources, responseTime);

        console.log(`✅ Response generated in ${responseTime}ms`);

        res.json({
            answer,
            sources,
            followUps,
            responseTime,
        });

    } catch (error) {
        console.error("❌ Chat error:", error.message);
        res.status(500).json({
            error: "Error processing your request",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Streaming chat endpoint (Server-Sent Events)
 */
app.post('/chat/stream', async (req, res) => {
    const startTime = Date.now();

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
        const { question, userRole, history } = req.body;

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Question is required' })}\n\n`);
            return res.end();
        }

        // ═══════════════════════════════════════════════════════════════
        // CHECK FOR LEARNING COMMAND
        // ═══════════════════════════════════════════════════════════════
        if (question.startsWith("/learn ")) {
            const newFact = question.replace("/learn ", "").trim();

            if (!newFact) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Please provide information to learn after /learn' })}\n\n`);
                return res.end();
            }

            console.log(`🧠 Learning new fact (stream): "${newFact}"`);

            try {
                const doc = new Document({
                    pageContent: newFact,
                    metadata: {
                        source: "User_taught_memory.txt",
                        timestamp: new Date().toISOString(),
                        userRole: userRole || "guest"
                    }
                });

                await PineconeStore.fromDocuments([doc], embeddings, {
                    pineconeIndex,
                    maxConcurrency: 5
                });

                res.write(`data: ${JSON.stringify({ type: 'content', content: '✅ **Memory Updated!** I have processed and stored this new information in my knowledge base. You can now ask me about it.' })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'sources', sources: ['User Input'] })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'followUps', followUps: ['What did you just learn?', 'Can you explain that to me?', 'What else should you know?'] })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'done', responseTime: Date.now() - startTime })}\n\n`);

                console.log(`✅ New fact stored in vector database (stream)`);
            } catch (learnError) {
                console.error("❌ Learning error (stream):", learnError.message);
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to store new information' })}\n\n`);
            }

            return res.end();
        }
        // ═══════════════════════════════════════════════════════════════

        console.log(`\n🔄 Streaming: "${question.substring(0, 50)}..." | Role: ${userRole || "guest"}`);

        // Query vector store
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
        const results = await vectorStore.similaritySearch(question, 4);

        const context = results.map(r => r.pageContent).join('\n\n');
        const sources = extractSources(results);

        // Format chat history (keep last 6 messages for context)
        const chatHistory = history || "No previous conversation.";

        // Send sources first
        res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

        // Generate and stream response with history
        const chain = RunnableSequence.from([promptTemplate, model, new StringOutputParser()]);
        const stream = await chain.stream({ context, question, chat_history: chatHistory });

        let fullContent = '';
        for await (const chunk of stream) {
            fullContent += chunk;
            res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
        }

        // Generate and send follow-ups
        const followUps = generateFollowUps(question, context);
        res.write(`data: ${JSON.stringify({ type: 'followUps', followUps })}\n\n`);

        // Send completion signal
        const responseTime = Date.now() - startTime;
        res.write(`data: ${JSON.stringify({ type: 'done', responseTime })}\n\n`);

        // Log analytics
        logQuestion(question, userRole, sources, responseTime);

        console.log(`✅ Stream completed in ${responseTime}ms`);

    } catch (error) {
        console.error("❌ Stream error:", error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing request' })}\n\n`);
    }

    res.end();
});

/**
 * Submit rating for an answer
 */
app.post('/rate', (req, res) => {
    const { questionId, rating, feedback } = req.body;

    if (!questionId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Valid questionId and rating (1-5) required" });
    }

    analytics.ratings.push({
        questionId,
        rating,
        feedback: feedback || null,
        timestamp: new Date().toISOString(),
    });

    console.log(`⭐ Rating received: ${rating}/5 for question ${questionId}`);
    res.json({ success: true });
});

/**
 * Get analytics dashboard data
 */
app.get('/analytics', (req, res) => {
    const totalQuestions = analytics.questions.length;
    const totalRatings = analytics.ratings.length;
    const averageRating = totalRatings > 0
        ? (analytics.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
        : "N/A";

    // Get top questions (most asked similar topics)
    const questionCounts = {};
    analytics.questions.forEach(q => {
        const key = q.question.toLowerCase().substring(0, 50);
        questionCounts[key] = (questionCounts[key] || 0) + 1;
    });

    const topQuestions = Object.entries(questionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([question, count]) => ({ question, count }));

    // Get questions by role
    const byRole = {};
    analytics.questions.forEach(q => {
        byRole[q.userRole] = (byRole[q.userRole] || 0) + 1;
    });

    // Average response time
    const avgResponseTime = analytics.questions.length > 0
        ? Math.round(analytics.questions.reduce((sum, q) => sum + (q.responseTime || 0), 0) / analytics.questions.length)
        : 0;

    // Most used sources
    const sourceCounts = {};
    analytics.questions.forEach(q => {
        (q.sources || []).forEach(s => {
            sourceCounts[s] = (sourceCounts[s] || 0) + 1;
        });
    });
    const topSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }));

    res.json({
        totalQuestions,
        totalRatings,
        averageRating,
        avgResponseTime,
        topQuestions,
        topSources,
        byRole,
        recentQuestions: analytics.questions.slice(-20).reverse(),
    });
});

/**
 * Get available SOPs (for role-based access)
 */
app.get('/sops', (req, res) => {
    res.json({
        sops: [
            { id: "president", name: "Student President SOP", roles: ["admin", "president"] },
            { id: "vp", name: "Vice President SOP", roles: ["admin", "president", "vp"] },
            { id: "technical", name: "Technical Head SOP", roles: ["admin", "president", "head"] },
            { id: "social", name: "Social Media Head SOP", roles: ["admin", "president", "head"] },
            { id: "general", name: "General Guidelines", roles: ["admin", "president", "vp", "head", "member"] },
        ]
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🛡️  IIC Compliance Bot Server v2.0.0  🛡️            ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    Running                                          ║
║  Port:      ${PORT}                                              ║
║  Mode:      ${process.env.NODE_ENV || 'development'}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║  • POST /chat          Standard chat                         ║
║  • POST /chat/stream   Streaming chat (SSE)                  ║
║  • POST /login         User authentication                   ║
║  • POST /rate          Submit rating                         ║
║  • GET  /analytics     Dashboard data                        ║
║  • GET  /health        Health check                          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server interrupted...');
    process.exit(0);
});
